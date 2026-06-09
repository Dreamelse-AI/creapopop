import { useRef, useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { INTRO_CONTENT_FIELDS, INTRO_TEMPLATES, DETAIL_FIELDS, MAX_IMAGES } from '@/data/constants'
import { generateIntroPageHtml } from '@/services/aiIntroPage'
import { uploadImage } from '@/services/upload'
import { SectionTitle } from '@/components/ui/primitives'
import type { Character, CharacterImage, IntroTemplate } from '@/types/character'

// 介绍页美化：三栏布局 — 模版缩略图(左) + Agent 生成卡片(中) + 选择展示内容(右)。
// 严格对照设计稿 1836:44562。
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

  // 主图轮换：点击切换到下一张图作为主图
  const cyclePrimary = () => {
    if (data.images.length < 2) return
    const idx = data.images.findIndex((i) => i.id === data.primaryImageId)
    const next = data.images[(idx + 1) % data.images.length]
    patch({ primaryImageId: next.id })
  }

  // 新增图片：上传后加入形象库，无主图时设为主图
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
        // 忽略单张失败
      }
    }
    if (!added.length) return
    const images = [...data.images, ...added]
    patch({ images, primaryImageId: data.primaryImageId || images[0].id })
  }

  return (
    <div className="flex h-full w-full justify-center gap-4 overflow-hidden">
      {/* 左：模版缩略图竖向列表 */}
      <div className="flex shrink-0 flex-col gap-4 overflow-auto pb-[30px]">
        {INTRO_TEMPLATES.map((t) => {
          const active = introPage.template === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTemplate(t.value)}
              className={`relative flex h-[200px] w-[150px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[20px] bg-white ${
                active ? 'border-[3px] border-black' : 'border border-black/[0.06]'
              }`}
            >
              <span className="text-center font-misans text-[16px] text-black/30">{t.label}</span>
              {t.value === 'none' && (
                <>
                  <span className="text-center font-misans text-[16px] text-black/30">模版占位</span>
                  <span className="mt-1 text-center font-misans text-[10px] text-black/30">
                    （包含最低标准基础规则）
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* 中：Agent 生成卡片 */}
      <AgentCard
        keywords={introPage.keywords ?? []}
        vibe={vibe}
        setVibe={setVibe}
        generating={generating}
        error={error}
        hasHtml={!!introPage.customHtml}
        onGenerate={runGenerate}
        onClear={() => patch({ introPage: { ...introPage, customHtml: undefined, keywords: [] } })}
      />

      {/* 右：选择展示内容 */}
      <div className="flex w-[284px] shrink-0 flex-col gap-2 overflow-auto pb-[30px]">
        <SectionTitle className="px-0">选择展示内容</SectionTitle>

        {/* 主图（可替换/上传） + 新增图片位（有主图后才出现） */}
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

          {/* 第二个新增位：仅在已有主图时出现 */}
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

        {/* 可勾选字段：基础字段(7项默认选中锁定 + 开场白可取消) + 更多细节(填了才可选) */}
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
    </div>
  )
}

// 勾选行四态：
//  locked  默认选中、不可取消（名字~性格 7项）：勾选圈 10% 不透明度（区分可取消项），点击无效
//  checked 选中可取消（开场白 / 已填的细节）：黑底白勾 100%
//  普通未选：浅灰空心圈
//  disabled 未填写内容：整行 20% 置灰、不可点
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

// 中间 Agent 卡片：顶部渐变(关键词+生成) + 分隔 + agent气泡 + 分隔 + 输入栏
function AgentCard({
  keywords,
  vibe,
  setVibe,
  generating,
  error,
  hasHtml,
  onGenerate,
  onClear,
}: {
  keywords: string[]
  vibe: string
  setVibe: (v: string) => void
  generating: boolean
  error: string | null
  hasHtml: boolean
  onGenerate: () => void
  onClear: () => void
}) {
  // 附件 UI（占位）：收集用户选择的文件，展示为可移除 chip。
  // 真正「把附件内容喂给 Claude」需后端做文件解析，见 docs/SPEC.md 联调待办，本期仅前端入口。
  const fileRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    setAttachments((prev) => [...prev, ...Array.from(files)].slice(0, 10))
  }
  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  return (
    <div className="flex h-full min-w-[300px] flex-1 flex-col justify-between rounded-t-[30px] border border-black/[0.06] bg-white pb-4">
      {/* 顶部渐变：关键词 + 生成按钮 */}
      <div className="flex flex-col rounded-t-[30px] bg-gradient-to-b from-[#fff0c4] to-[#fff8e4]">
        <div className="flex items-center gap-9 p-[18px]">
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="shrink-0 font-misans-medium text-[16px] leading-[22px] text-black/90">
              关键词：
            </span>
            <div className="flex gap-2 overflow-hidden">
              {keywords.length > 0 ? (
                keywords.map((t) => (
                  <span
                    key={t}
                    className="shrink-0 rounded-[100px] bg-black/[0.04] px-2 py-1.5 font-misans-semibold text-[14px] text-black/50"
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
            <span className="font-misans-medium text-[16px] text-white">
              {generating ? '生成中' : '生成'}
            </span>
          </button>
        </div>
        <div className="h-px w-full bg-black/[0.06]" />
      </div>

      {/* agent 气泡 */}
      <div className="flex flex-1 items-start p-4">
        <div className="relative max-w-[80%]">
          <div className="rounded-[24px] rounded-bl-[4px] bg-black/[0.04] px-4 py-2.5">
            <p className="font-misans-medium text-[16px] leading-[22px] text-black/90">
              {generating ? 'Claude 正在生成介绍页…' : hasHtml ? '已生成，可在右侧预览查看，或继续调整描述。' : '你可以告诉我你想要的效果'}
            </p>
          </div>
          <img
            src="/assets/chat-tail-white.svg"
            alt=""
            className="absolute bottom-0 left-0 h-[8.5px] w-[18.75px] opacity-40"
          />
        </div>
      </div>

      {error && <p className="px-4 pb-2 font-misans text-[14px] text-red-500">{error}</p>}
      {hasHtml && !generating && (
        <button onClick={onClear} className="px-4 pb-1 text-left font-misans text-[14px] text-black/40">
          清除，恢复模版
        </button>
      )}

      {/* 底部输入栏 */}
      <div className="flex flex-col gap-2.5">
        <div className="h-px w-full bg-black/[0.06]" />

        {/* 已选附件列表（占位，待后端解析喂给 Claude） */}
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

        <div className="flex items-end gap-3 p-[18px]">
          {/* 附件入口：图片/txt/doc/pdf/音乐 */}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.txt,.doc,.docx,.pdf,audio/*"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={generating}
            title="添加附件（图片 / txt / doc / pdf / 音乐）"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] disabled:opacity-50"
          >
            <img src="/assets/icon-plus.svg" alt="添加附件" className="size-5" />
          </button>
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onGenerate()
              }
            }}
            placeholder="描述你想要的介绍页风格，如：暗黑哥特风、暖色治愈系…"
            rows={1}
            disabled={generating}
            className="flex-1 resize-none bg-transparent font-misans-medium text-[16px] leading-[22px] text-black outline-none placeholder:text-black/20 disabled:opacity-50"
          />
          <button onClick={onGenerate} disabled={generating || !vibe.trim()} className="shrink-0">
            <img
              src="/assets/chat-send.svg"
              alt="发送"
              className={`size-5 transition ${vibe.trim() ? 'opacity-100' : 'opacity-20'}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

function primaryUrl(data: Character): string {
  return (
    data.images.find((i) => i.id === data.primaryImageId)?.url ||
    data.images[0]?.url ||
    ''
  )
}
