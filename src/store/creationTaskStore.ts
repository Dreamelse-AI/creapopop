import { create } from 'zustand'
import { useDraftStore } from './draftStore'
import { generateImage } from '@/services/aiImage'
import { uploadImage } from '@/services/upload'
import { generateIntroPageHtml, chatIntroStyle, type IntroChatMessage } from '@/services/aiIntroPage'
import { sendChatMessage, type ChatMessage } from '@/services/aiChat'
import { MAX_IMAGES } from '@/data/constants'
import type { CharacterImage } from '@/types/character'

// 进行中的生图任务：在网格里占一个「生成中」图块，完成后替换为真实图片。
export interface PendingGen {
  id: string
  status: 'queued' | 'running' | 'error'
  error?: string
}

interface CreationTaskState {
  // 当前任务归属的角色 id；切到不同角色才整体重置
  scopeId: string | null

  // —— 形象：AI 生图 ——
  pendingGen: PendingGen | null
  genError: string | null
  // —— 形象：本地上传 ——
  uploadingImage: boolean
  uploadError: string | null

  // —— 介绍页：Agent 对话 + 生成 ——
  introMessages: IntroChatMessage[]
  introStyleBrief: string
  introChatting: boolean
  introGenerating: boolean
  introError: string | null

  // —— 预览：试聊 ——
  chatMessages: ChatMessage[]
  chatLoading: boolean
  chatError: string | null

  // 切换角色作用域：同角色不动，不同角色清空所有 transient 任务态
  ensureScope: (id: string | null) => void

  // 形象
  generateAppearance: (prompt: string) => Promise<void>
  dismissGen: () => void
  uploadImages: (files: File[]) => Promise<void>

  // 介绍页
  sendIntroMessage: (text: string) => Promise<void>
  generateIntro: () => Promise<void>
  setIntroError: (msg: string | null) => void

  // 试聊
  sendChat: (text: string) => Promise<void>
}

const INITIAL = {
  pendingGen: null,
  genError: null,
  uploadingImage: false,
  uploadError: null,
  introMessages: [] as IntroChatMessage[],
  introStyleBrief: '',
  introChatting: false,
  introGenerating: false,
  introError: null,
  chatMessages: [] as ChatMessage[],
  chatLoading: false,
  chatError: null,
}

// 进行中任务的全局状态与执行。脱离组件生命周期：左侧导航切换/预览收起
// 不会卸载这些状态，后台 promise 继续跑，结果通过 draftStore.patch 落地。
export const useCreationTaskStore = create<CreationTaskState>((set, get) => ({
  scopeId: null,
  ...INITIAL,

  ensureScope: (id) => {
    if (get().scopeId === id) return
    set({ scopeId: id, ...INITIAL })
  },

  // —— 形象：AI 生图 ——
  generateAppearance: async (prompt) => {
    const p = prompt.trim()
    const draft = useDraftStore.getState().data
    if (!p || get().pendingGen || !draft || draft.images.length >= MAX_IMAGES) return

    const genId = `gen_${Date.now()}`
    set({ pendingGen: { id: genId, status: 'queued' }, genError: null })

    let result
    try {
      result = await generateImage({
        prompt: p,
        aspect: '9:16',
        onUpdate: (s) => {
          if (s.status === 'queued' || s.status === 'running') {
            const st = s.status
            set((cur) =>
              cur.pendingGen && cur.pendingGen.id === genId
                ? { pendingGen: { ...cur.pendingGen, status: st } }
                : cur,
            )
          }
        },
      })
    } catch (e) {
      if (get().pendingGen?.id !== genId) return
      set({ pendingGen: { id: genId, status: 'error', error: e instanceof Error ? e.message : '生成失败' } })
      return
    }

    // 任务可能在执行期间被 dismiss / 切角色，确认仍是当前任务再落地
    if (get().pendingGen?.id !== genId) return

    if (result.status === 'done' && result.imageUrl) {
      addImageToDraft(result.imageUrl, 'ai')
      set({ pendingGen: null })
    } else {
      set({ pendingGen: { id: genId, status: 'error', error: result.error || '生成失败' } })
    }
  },

  dismissGen: () => set({ pendingGen: null, genError: null }),

  uploadImages: async (files) => {
    const draft = useDraftStore.getState().data
    if (!draft || !files.length) return
    const room = MAX_IMAGES - draft.images.length
    const picked = files.slice(0, room)
    if (!picked.length) return

    set({ uploadingImage: true, uploadError: null })
    const newImgs: CharacterImage[] = []
    for (const f of picked) {
      try {
        const { url } = await uploadImage(f)
        newImgs.push({ id: makeImageId(), url, source: 'upload' })
      } catch (e) {
        set({ uploadError: e instanceof Error ? e.message : '上传失败' })
      }
    }
    set({ uploadingImage: false })
    if (!newImgs.length) return
    const cur = useDraftStore.getState().data
    if (!cur) return
    const images = [...cur.images, ...newImgs]
    useDraftStore.getState().patch({
      images,
      primaryImageId: cur.primaryImageId || images[0]?.id || null,
    })
  },

  // —— 介绍页：对话 ——
  sendIntroMessage: async (text) => {
    const t = text.trim()
    const draft = useDraftStore.getState().data
    if (!t || get().introChatting || get().introGenerating || !draft) return

    const next: IntroChatMessage[] = [...get().introMessages, { role: 'user', content: t }]
    set({ introMessages: next, introChatting: true, introError: null })
    try {
      const turn = await chatIntroStyle(draft, next)
      set({ introMessages: [...next, { role: 'assistant', content: turn.reply }] })
      if (turn.keywords.length) patchIntro({ keywords: turn.keywords })
      if (turn.styleBrief) set({ introStyleBrief: turn.styleBrief })
    } catch (e) {
      set({ introError: e instanceof Error ? e.message : '对话失败' })
    } finally {
      set({ introChatting: false })
    }
  },

  // —— 介绍页：生成 HTML ——
  generateIntro: async () => {
    const draft = useDraftStore.getState().data
    if (get().introGenerating || get().introChatting || !draft) return

    const brief =
      get().introStyleBrief.trim() ||
      [...get().introMessages].reverse().find((m) => m.role === 'user')?.content ||
      ''
    if (!brief) {
      set({ introError: '请先在下方描述你想要的风格' })
      return
    }
    set({ introGenerating: true, introError: null })
    try {
      const { keywords, html } = await generateIntroPageHtml(draft, brief)
      const introPage = useDraftStore.getState().data?.introPage
      patchIntro({
        customHtml: html,
        keywords: keywords.length ? keywords : introPage?.keywords,
      })
    } catch (e) {
      set({ introError: e instanceof Error ? e.message : '生成失败' })
    } finally {
      set({ introGenerating: false })
    }
  },

  setIntroError: (msg) => set({ introError: msg }),

  // —— 预览：试聊 ——
  sendChat: async (text) => {
    const t = text.trim()
    const draft = useDraftStore.getState().data
    if (!t || get().chatLoading || !draft) return

    const next: ChatMessage[] = [...get().chatMessages, { role: 'user', content: t }]
    set({ chatMessages: next, chatLoading: true, chatError: null })
    try {
      const { text: raw, items } = await sendChatMessage(draft, next)
      set({ chatMessages: [...next, { role: 'assistant', content: raw, items }] })
    } catch (e) {
      set({ chatError: e instanceof Error ? e.message : '对话失败' })
    } finally {
      set({ chatLoading: false })
    }
  },
}))

function makeImageId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function addImageToDraft(url: string, source: CharacterImage['source']) {
  const cur = useDraftStore.getState().data
  if (!cur) return
  const img: CharacterImage = { id: makeImageId(), url, source }
  useDraftStore.getState().patch({
    images: [...cur.images, img],
    primaryImageId: cur.primaryImageId || img.id,
  })
}

function patchIntro(partial: Partial<import('@/types/character').IntroPage>) {
  const cur = useDraftStore.getState().data
  if (!cur) return
  useDraftStore.getState().patch({ introPage: { ...cur.introPage, ...partial } })
}
