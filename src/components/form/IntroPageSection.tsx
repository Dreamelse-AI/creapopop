import { useEffect, useRef, useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { INTRO_CONTENT_FIELDS, INTRO_TEMPLATES, DETAIL_FIELDS, MAX_IMAGES } from '@/data/constants'
import { generateIntroPageHtml } from '@/services/aiIntroPage'
import { uploadImage } from '@/services/upload'
import { SectionTitle } from '@/components/ui/primitives'
import type { Character, CharacterImage, IntroTemplate } from '@/types/character'

// 介绍页美化 — 严格对照设计稿 2219:8492 / 2228:13817。
// 三栏：左=选择展示内容(主图+新增位+勾选列表) | 中=Agent 卡片(关键词/生成 + 横排模板 + 对话 + 输入) | 右=rail(PreviewPanel)
export function IntroPageSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const [vibe, setVibe] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const runGenerate = async () => {
    const prompt = vibe.trim()
    if (!prompt || generating) return
    setGenerating(true)
    setError(null)
    try {
      const { keywords, html } = await generateIntroPageHtml(data, prompt)
      patch({ introPage: { ...introPage, customHtml: html, keywords } })
      setVibe('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const cyclePrimary = () => {
    if (data.images.length < 2) return
    const idx = data.images.findIndex((i) => i.id === data.primaryImageId)
    const next = data.images[(idx + 1) % data.images.length]
    patch({ primaryImageId: next.id })
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

        {/* 主图 + 新增位 */}
        <div className="flex gap-2">
          {primaryUrl(data) ? (
            <div className="relative size-[138px] shrink-0 overflow-hidden rounded-[20px] border border-black/[0.06] bg-white">
              <img src={primaryUrl(data)} alt="" className="size-full object-cover" />
              <span className="pointer-events-none absolute left-1 top-1 rounded-[100px] bg-[rgba(48,48,48,0.9)] px-2 py-1 font-misans-bold text-[12px] text-white">
                主图
              </span>
              {data.images.length > 1 && (
                <button
                  onClick={cyclePrimary}
                  title="替换主图"
                  className="absolute bottom-1 right-1 flex size-7 items-center justify-center"
                >
                  <img src="/assets/intro-change.svg" alt="替换" className="size-7" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              title="上传主图"
              className="relative flex size-[138px] shrink-0 items-center justify-center rounded-[20px] border border-black/[0.06] bg-white transition hover:bg-black/[0.02]"
            >
              <img src="/assets/icon-plus.svg" alt="上传" className="size-8" />
              <span className="pointer-events-none absolute left-1 top-1 rounded-[100px] bg-[rgba(48,48,48,0.9)] px-2 py-1 font-misans-bold text-[12px] text-white">
                主图
              </span>
            </button>
          )}

          {primaryUrl(data) && data.images.length < MAX_IMAGES && (
            <button
              onClick={() => fileRef.current?.click()}
              title="新增图片"
              className="flex size-[138px] shrink-0 items-center justify-center rounded-[20px] border border-black/[0.06] bg-black/[0.03] transition hover:bg-black/[0.06]"
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
        generating={generating}
        error={error}
        hasHtml={!!introPage.customHtml}
        onGenerate={runGenerate}
        onClear={() => patch({ introPage: { ...introPage, customHtml: undefined, keywords: [] } })}
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

function primaryUrl(data: Character): string {
  return (
    data.images.find((i) => i.id === data.primaryImageId)?.url ||
    data.images[0]?.url ||
    ''
  )
}

// 中栏 Agent 卡片：顶部黄色渐变(关键词chips + 生成按钮 + 横排模板缩略图) → 对话气泡 → 底部输入栏
function AgentCard({
  keywords,
  template,
  onPickTemplate,
  vibe,
  setVibe,
  generating,
  error,
  hasHtml,
  onGenerate,
  onClear,
}: {
  keywords: string[]
  template: IntroTemplate
  onPickTemplate: (t: IntroTemplate) => void
  vibe: string
  setVibe: (v: string) => void
  generating: boolean
  error: string | null
  hasHtml: boolean
  onGenerate: () => void
  onClear: () => void
}) {
  const attachRef = useRef<HTMLInputElement>(null)
  const [attachAccept, setAttachAccept] = useState('image/*')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const [attachments, setAttachments] = useState<File[]>([])

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
      {/* 顶部黄色渐变：关键词 + 生成 + 横排模板缩略图 */}
      <div className="flex flex-col gap-0 rounded-t-[30px] bg-gradient-to-b from-[#fff0c4] to-[#fff8e4]">
        <div className="flex items-center gap-9 p-[18px]">
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
            disabled={generating}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-[100px] bg-black px-6 py-2.5 disabled:opacity-40"
          >
            <img src="/assets/intro-star.svg" alt="" className="size-5 brightness-0 invert" />
            <span className="font-misans-medium text-[16px] text-white">{generating ? '生成中' : '生成'}</span>
          </button>
        </div>

        {/* 横排模板缩略图：首个为默认占位(选中带黑边)，其余预设 */}
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
      </div>

      {/* 对话气泡区 */}
      <div className="flex flex-1 items-start overflow-y-auto p-[18px]">
        <div className="relative max-w-[80%]">
          <div className="rounded-[24px] rounded-bl-[4px] bg-black/[0.04] px-4 py-2.5">
            <p className="font-misans-medium text-[16px] leading-[22px] text-black/90">
              {generating
                ? 'Claude 正在生成介绍页…'
                : hasHtml
                  ? '已生成，可在右侧预览查看，或继续调整描述。'
                  : '你可以告诉我你想要的效果'}
            </p>
          </div>
          <img
            src="/assets/chat-tail-white.svg"
            alt=""
            className="absolute bottom-0 left-0 h-[8.5px] w-[18.75px] opacity-40"
          />
        </div>
      </div>

      {error && <p className="px-[18px] pb-2 font-misans text-[14px] text-red-500">{error}</p>}
      {hasHtml && !generating && (
        <button onClick={onClear} className="px-[18px] pb-1 text-left font-misans text-[14px] text-black/40">
          清除，恢复模版
        </button>
      )}

      {/* 底部输入栏 */}
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

        <div className="flex items-center gap-[18px] p-[18px]">
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
          {/* 附件入口：点击在右上方弹菜单（添加图片/添加音乐/上传文档） */}
          <div className="relative shrink-0" ref={menuWrapRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              disabled={generating}
              title="添加附件"
              className="flex size-9 items-center justify-center rounded-full bg-black/[0.04] disabled:opacity-50"
            >
              <img src="/assets/icon-plus.svg" alt="添加附件" className="size-5" />
            </button>
            {menuOpen && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-30 flex flex-col rounded-[20px] bg-white px-4 py-3 shadow-[0px_10px_30px_rgba(0,0,0,0.1)]">
                <button
                  onClick={() => pickType('image/*')}
                  className="flex h-10 w-[128px] items-center gap-2 rounded-[12px] py-1.5"
                >
                  <img src="/assets/icon-gallery.svg" alt="" className="size-6" />
                  <span className="font-misans-heavy text-[16px] text-black">添加图片</span>
                </button>
                <div className="my-1 h-px w-full bg-black/10" />
                <button
                  onClick={() => pickType('audio/*')}
                  className="flex h-10 w-[128px] items-center gap-2 rounded-[12px] py-1.5"
                >
                  <span className="flex size-6 items-center justify-center text-[16px]">🎵</span>
                  <span className="font-misans-heavy text-[16px] text-black">添加音乐</span>
                </button>
                <div className="my-1 h-px w-full bg-black/10" />
                <button
                  onClick={() => pickType('.txt,.doc,.docx,.pdf')}
                  className="flex h-10 w-[128px] items-center gap-2 rounded-[12px] py-1.5"
                >
                  <span className="flex size-6 items-center justify-center text-[16px]">📄</span>
                  <span className="font-misans-heavy text-[16px] text-black">上传文档</span>
                </button>
              </div>
            )}
          </div>

          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onGenerate()
              }
            }}
            placeholder="请输入你想要的效果..."
            rows={1}
            disabled={generating}
            className="flex-1 resize-none bg-transparent font-misans-medium text-[16px] leading-[22px] text-black outline-none placeholder:text-black/20 disabled:opacity-50"
          />
          <button onClick={onGenerate} disabled={generating || !vibe.trim()} className="shrink-0">
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
