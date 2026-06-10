import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { INTRO_CONTENT_FIELDS, INTRO_TEMPLATES, DETAIL_FIELDS, MAX_IMAGES } from '@/data/constants'
import { generateIntroPageHtml, chatIntroStyle } from '@/services/aiIntroPage'
import type { IntroChatMessage } from '@/services/aiIntroPage'
import { uploadImage } from '@/services/upload'
import { SectionTitle, Spinner } from '@/components/ui/primitives'
import type { CharacterImage, IntroTemplate } from '@/types/character'

// 介绍页美化 — 严格对照设计稿 2219:8492 / 2228:13817。
// 三栏：左=选择展示内容(主图+新增位+勾选列表) | 中=Agent 卡片(关键词/生成 + 横排模板 + 对话 + 输入) | 右=rail(PreviewPanel)
export function IntroPageSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const [vibe, setVibe] = useState('')
  const [chatting, setChatting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 与模型的对话历史（仅本地，用于上下文与气泡展示）
  const [messages, setMessages] = useState<IntroChatMessage[]>([])
  // 模型整理出的风格说明，点「生成」时作为产出 HTML 的依据
  const [styleBrief, setStyleBrief] = useState('')

  const introPage = data.introPage

  const setTemplate = (template: IntroTemplate) =>
    patch({ introPage: { ...introPage, template } })

  const toggleField = (key: string) => {
    const field = INTRO_CONTENT_FIELDS.find((f) => f.key === key)
    if (field?.locked) return
    const has = introPage.visibleSections.includes(key)
    const visibleSections = has
      ? introPage.visibleSections.filter((s) => s !== key)
      : [...introPage.visibleSections, key]
    patch({ introPage: { ...introPage, visibleSections } })
  }

  // 发送 = 与模型对话：模型整理需求 → 回复 + 关键词 + 风格说明（不产出 HTML）
  const sendMessage = async () => {
    const text = vibe.trim()
    if (!text || chatting || generating) return
    const next: IntroChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setVibe('')
    setChatting(true)
    setError(null)
    try {
      const turn = await chatIntroStyle(data, next)
      setMessages([...next, { role: 'assistant', content: turn.reply }])
      if (turn.keywords.length) patch({ introPage: { ...introPage, keywords: turn.keywords } })
      if (turn.styleBrief) setStyleBrief(turn.styleBrief)
    } catch (e) {
      setError(e instanceof Error ? e.message : '对话失败')
    } finally {
      setChatting(false)
    }
  }

  // 生成 = 根据已沟通的风格说明产出 HTML（右上角按钮，独立于发送）
  const runGenerate = async () => {
    if (generating || chatting) return
    // 优先用模型整理的风格说明；没有就退回最近一次用户输入或当前输入框
    const brief =
      styleBrief.trim() ||
      [...messages].reverse().find((m) => m.role === 'user')?.content ||
      vibe.trim()
    if (!brief) {
      setError('请先在下方描述你想要的风格')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const { keywords, html } = await generateIntroPageHtml(data, brief)
      patch({
        introPage: {
          ...introPage,
          customHtml: html,
          keywords: keywords.length ? keywords : introPage.keywords,
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const onAddImages = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_IMAGES - data.images.length
    const picked = Array.from(files).slice(0, room)
    const added: CharacterImage[] = []
    for (const f of picked) {
      try {
        const { url } = await uploadImage(f)
        added.push({ id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, url, source: 'upload' })
      } catch {
        // 单张失败忽略
      }
    }
    if (!added.length) return
    const images = [...data.images, ...added]
    patch({ images, primaryImageId: data.primaryImageId || images[0].id })
  }

  return (
    <div className="flex h-full w-full gap-4 overflow-hidden">
      {/* 左栏：选择展示内容 */}
      <div className="flex w-[284px] shrink-0 flex-col gap-2 overflow-y-auto pb-[30px]">
        <SectionTitle className="px-0">选择展示内容</SectionTitle>

        {/* 展示图网格：每张图一个 tile（主图带角标 + 更换），末尾为新增位 */}
        <div className="grid grid-cols-2 gap-2">
          {data.images.map((img) => {
            const isPrimary = img.id === (data.primaryImageId || data.images[0]?.id)
            return (
              <div
                key={img.id}
                className="relative aspect-square overflow-hidden rounded-[20px] border border-black/[0.06] bg-white"
              >
                <img src={img.url} alt="" className="size-full object-cover" />
                {isPrimary && (
                  <span className="pointer-events-none absolute left-1 top-1 rounded-[100px] bg-[rgba(48,48,48,0.9)] px-2 py-1 font-misans-bold text-[12px] text-white">
                    主图
                  </span>
                )}
                {!isPrimary && (
                  <button
                    onClick={() => patch({ primaryImageId: img.id })}
                    title="设为主图"
                    className="absolute bottom-1 right-1 flex size-7 items-center justify-center rounded-full bg-[rgba(48,48,48,0.85)]"
                  >
                    <img src="/assets/intro-change.svg" alt="设为主图" className="size-4 brightness-0 invert" />
                  </button>
                )}
              </div>
            )
          })}

          {/* 新增图片位：始终可用 */}
          {data.images.length < MAX_IMAGES && (
            <button
              onClick={() => fileRef.current?.click()}
              title={data.images.length ? '新增图片' : '上传主图'}
              className="flex aspect-square items-center justify-center rounded-[20px] border border-black/[0.06] bg-black/[0.03] transition hover:bg-black/[0.06]"
            >
              <img src="/assets/icon-plus.svg" alt="新增" className="size-8" />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onAddImages(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {/* 勾选列表：基础字段(7项锁定 + 开场白可取消) + 更多细节(已填可选) */}
        {INTRO_CONTENT_FIELDS.map((f) => (
          <CheckRow
            key={f.key}
            label={f.label}
            checked={f.locked || introPage.visibleSections.includes(f.key)}
            locked={f.locked}
            onToggle={() => toggleField(f.key)}
          />
        ))}
        {DETAIL_FIELDS.map((f) => {
          const filled = !!data.details[f.key]
          return (
            <CheckRow
              key={f.key}
              emoji={f.emoji}
              label={f.label}
              checked={introPage.visibleSections.includes(f.key)}
              disabled={!filled}
              onToggle={() => filled && toggleField(f.key)}
            />
          )
        })}
      </div>

      {/* 中栏：Agent 卡片 */}
      <AgentCard
        keywords={introPage.keywords ?? []}
        template={introPage.template}
        onPickTemplate={setTemplate}
        vibe={vibe}
        setVibe={setVibe}
        chatting={chatting}
        generating={generating}
        error={error}
        messages={messages}
        hasHtml={!!introPage.customHtml}
        onSend={sendMessage}
        onGenerate={runGenerate}
        onClear={() => patch({ introPage: { ...introPage, customHtml: undefined } })}
      />
    </div>
  )
}

// 勾选行四态：locked(10%圈)/checked(实心)/未选(空心)/disabled(整行20%)
function CheckRow({
  emoji,
  label,
  checked,
  locked = false,
  disabled = false,
  onToggle,
}: {
  emoji?: string
  label: string
  checked: boolean
  locked?: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled || locked}
      className={`flex h-12 w-[284px] shrink-0 items-center gap-3 rounded-[16px] bg-white pl-3 pr-1.5 ${
        disabled ? 'opacity-20' : ''
      }`}
    >
      <span className="flex items-center justify-center p-1.5">
        <span
          className={`flex size-5 items-center justify-center rounded-full ${
            checked ? 'bg-black' : 'border border-black/15 bg-transparent'
          } ${locked ? 'opacity-10' : ''}`}
        >
          {checked && (
            <img src="/assets/intro-check.svg" alt="" className="h-[7px] w-[9px] brightness-0 invert" />
          )}
        </span>
      </span>
      <span className="flex items-center gap-1 truncate font-misans-medium text-[16px]">
        {emoji && <span>{emoji}</span>}
        <span className="text-black/50">{label}</span>
      </span>
    </button>
  )
}

// 中栏 Agent 卡片：顶部黄色渐变(关键词chips + 生成按钮 + 可收起的横排模板) → 对话气泡 → 底部输入栏
function AgentCard({
  keywords,
  template,
  onPickTemplate,
  vibe,
  setVibe,
  chatting,
  generating,
  error,
  messages,
  hasHtml,
  onSend,
  onGenerate,
  onClear,
}: {
  keywords: string[]
  template: IntroTemplate
  onPickTemplate: (t: IntroTemplate) => void
  vibe: string
  setVibe: (v: string) => void
  chatting: boolean
  generating: boolean
  error: string | null
  messages: IntroChatMessage[]
  hasHtml: boolean
  onSend: () => void
  onGenerate: () => void
  onClear: () => void
}) {
  const attachRef = useRef<HTMLInputElement>(null)
  const [attachAccept, setAttachAccept] = useState('image/*')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [tplOpen, setTplOpen] = useState(true)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const pickType = (accept: string) => {
    setAttachAccept(accept)
    setMenuOpen(false)
    setTimeout(() => attachRef.current?.click(), 0)
  }
  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx))

  return (
    <div className="flex h-full min-w-px flex-1 flex-col overflow-hidden rounded-t-[30px] border border-black/[0.06] bg-white pb-4">
      {/* 顶部黄色渐变：关键词 + 生成 + 可收起的横排模板缩略图 */}
      <div className="flex flex-col gap-0 rounded-t-[30px] bg-gradient-to-b from-[#fff0c4] to-[#fff8e4]">
        <div className="flex items-center gap-9 p-[18px]">
          <button
            onClick={() => setTplOpen((v) => !v)}
            title={tplOpen ? '收起模版' : '展开模版'}
            className="flex size-9 shrink-0 items-center justify-center"
          >
            <img
              src="/assets/icon-arrow-right.svg"
              alt=""
              className={`size-5 transition-transform ${tplOpen ? '-rotate-90' : 'rotate-90'}`}
            />
          </button>
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="shrink-0 font-misans-medium text-[16px] leading-[22px] text-black/90">关键词：</span>
            <div className="flex gap-2 overflow-hidden">
              {keywords.length > 0 ? (
                keywords.map((t) => (
                  <span
                    key={t}
                    className="shrink-0 rounded-[100px] bg-white px-4 py-2 font-misans-semibold text-[16px] text-black/50"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="font-misans text-[14px] text-black/30">生成后展示风格关键词</span>
              )}
            </div>
          </div>
          <button
            onClick={onGenerate}
            disabled={generating || chatting}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-[100px] bg-black px-6 py-2.5 disabled:opacity-40"
          >
            {generating ? (
              <Spinner size={20} className="text-white" />
            ) : (
              <img src="/assets/intro-star.svg" alt="" className="size-5 brightness-0 invert" />
            )}
            <span className="font-misans-medium text-[16px] text-white">{generating ? '生成中' : '生成'}</span>
          </button>
        </div>

        {/* 横排模板缩略图：可收起；首个为默认占位(选中带黑边)，其余预设 */}
        {tplOpen && (
          <div className="flex gap-4 overflow-x-auto px-[18px] pb-[18px]">
            {INTRO_TEMPLATES.map((t) => {
              const active = template === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => onPickTemplate(t.value)}
                  className={`relative flex h-[200px] w-[150px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[20px] bg-white ${
                    active ? 'border-[3px] border-black' : 'border border-black/[0.06]'
                  }`}
                >
                  {t.value === 'none' ? (
                    <>
                      <span className="text-center font-misans text-[16px] text-black/30">默认简约风<br />模版占位</span>
                      <span className="mt-1 px-3 text-center font-misans text-[10px] text-black/30">（包含最低标准基础规则）</span>
                    </>
                  ) : (
                    <span className="text-center font-misans text-[16px] text-black/30">{t.label}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 对话气泡区：默认引导语 + 历史对话 */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-[18px]">
        <Bubble side="left">你可以告诉我你想要的效果</Bubble>
        {messages.map((m, i) =>
          m.role === 'assistant' ? (
            <Bubble key={i} side="left">{m.content}</Bubble>
          ) : (
            <Bubble key={i} side="right">{m.content}</Bubble>
          ),
        )}
        {chatting && (
          <Bubble side="left">
            <span className="flex items-center gap-2">
              <Spinner size={14} className="text-black/40" />
              正在整理你的需求…
            </span>
          </Bubble>
        )}
        {generating && (
          <Bubble side="left">
            <span className="flex items-center gap-2">
              <Spinner size={14} className="text-black/40" />
              正在生成介绍页，请稍候…
            </span>
          </Bubble>
        )}
        {hasHtml && !generating && (
          <Bubble side="left">已生成，可在右侧预览查看，或继续调整描述后再次生成。</Bubble>
        )}
      </div>

      {error && <p className="px-[18px] pb-2 font-misans text-[14px] text-red-500">{error}</p>}
      {hasHtml && !generating && (
        <button onClick={onClear} className="px-[18px] pb-1 text-left font-misans text-[14px] text-black/40">
          清除，恢复模版
        </button>
      )}

      {/* 底部输入栏：占位填充，右侧依次 附件+(弹菜单) / 发送 */}
      <div className="flex flex-col gap-2.5">
        <div className="h-px w-full bg-black/[0.06]" />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-[18px]">
            {attachments.map((f, i) => (
              <span
                key={`${f.name}_${i}`}
                className="flex max-w-[180px] items-center gap-1.5 rounded-[10px] bg-black/[0.04] py-1.5 pl-2.5 pr-1.5"
                title={f.name}
              >
                <span className="truncate font-misans-medium text-[13px] text-black/60">{f.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="flex size-4 shrink-0 items-center justify-center rounded-full bg-black/10 text-[10px] leading-none text-black/50"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-[18px] px-[18px] py-2.5">
          <input
            ref={attachRef}
            type="file"
            multiple
            accept={attachAccept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                setAttachments((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 10))
              }
              e.target.value = ''
            }}
          />

          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            placeholder="请输入你想要的效果..."
            rows={1}
            disabled={generating}
            className="flex-1 resize-none bg-transparent font-misans-medium text-[16px] leading-[22px] text-black outline-none placeholder:text-black/20 disabled:opacity-50"
          />

          {/* 附件入口：点击在上方弹菜单（添加图片/添加音乐/上传文档） */}
          <div className="relative shrink-0" ref={menuWrapRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              disabled={generating}
              title="添加附件"
              className="flex size-6 items-center justify-center disabled:opacity-50"
            >
              <img
                src="/assets/icon-plus.svg"
                alt="添加附件"
                className={`size-6 transition ${menuOpen ? 'opacity-100' : 'opacity-20'}`}
              />
            </button>
            {menuOpen && (
              <div className="absolute bottom-[calc(100%+12px)] right-0 z-30 flex w-[160px] flex-col rounded-[20px] bg-white px-4 py-3 shadow-[0px_10px_30px_rgba(0,0,0,0.1)]">
                <button
                  onClick={() => pickType('image/*')}
                  className="flex h-10 items-center gap-2 rounded-[12px]"
                >
                  <img src="/assets/menu-gallery.svg" alt="" className="size-6" />
                  <span className="font-misans-heavy text-[16px] text-black">添加图片</span>
                </button>
                <div className="my-1 h-px w-full bg-black/10" />
                <button
                  onClick={() => pickType('audio/*')}
                  className="flex h-10 items-center gap-2 rounded-[12px]"
                >
                  <img src="/assets/menu-music.svg" alt="" className="size-6" />
                  <span className="font-misans-heavy text-[16px] text-black">添加音乐</span>
                </button>
                <div className="my-1 h-px w-full bg-black/10" />
                <button
                  onClick={() => pickType('.txt,.doc,.docx,.pdf')}
                  className="flex h-10 items-center gap-2 rounded-[12px]"
                >
                  <img src="/assets/menu-doc.svg" alt="" className="size-6" />
                  <span className="font-misans-heavy text-[16px] text-black">上传文档</span>
                </button>
              </div>
            )}
          </div>

          <button onClick={onSend} disabled={generating || chatting || !vibe.trim()} className="shrink-0">
            <img
              src="/assets/chat-send.svg"
              alt="发送"
              className={`size-6 transition ${vibe.trim() ? 'opacity-100' : 'opacity-20'}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

// 对话气泡：left=助手(灰底，左下尾巴) / right=用户(黄底，右下尾巴)
function Bubble({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  const isLeft = side === 'left'
  return (
    <div className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
      <div className="relative max-w-[80%]">
        <div
          className={`px-4 py-2.5 ${
            isLeft
              ? 'rounded-[24px] rounded-bl-[4px] bg-black/[0.04]'
              : 'rounded-[24px] rounded-br-[4px] bg-[#ffe9a8]'
          }`}
        >
          <p className="whitespace-pre-wrap font-misans-medium text-[16px] leading-[22px] text-black/90">
            {children}
          </p>
        </div>
        <img
          src={isLeft ? '/assets/chat-tail-white.svg' : '/assets/chat-tail-yellow.svg'}
          alt=""
          className={`absolute bottom-0 h-[8.5px] w-[18.75px] ${isLeft ? 'left-0 opacity-40' : 'right-0'}`}
        />
      </div>
    </div>
  )
}
