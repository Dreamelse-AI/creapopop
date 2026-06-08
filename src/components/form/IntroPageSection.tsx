import { useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { INTRO_CONTENT_FIELDS, INTRO_TEMPLATES, DETAIL_FIELDS } from '@/data/constants'
import { generateIntroPageHtml } from '@/services/aiIntroPage'
import type { Character, IntroTemplate } from '@/types/character'

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
    const has = introPage.visibleSections.includes(key)
    const visibleSections = has
      ? introPage.visibleSections.filter((s) => s !== key)
      : [...introPage.visibleSections, key]
    patch({ introPage: { ...introPage, visibleSections } })
  }

  const runGenerate = async () => {
    const prompt = vibe.trim() || data.tags.join('、')
    if (!prompt || generating) return
    setGenerating(true)
    setError(null)
    try {
      const html = await generateIntroPageHtml(data, prompt)
      patch({ introPage: { ...introPage, customHtml: html } })
      setVibe('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenerating(false)
    }
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
        tags={data.tags}
        vibe={vibe}
        setVibe={setVibe}
        generating={generating}
        error={error}
        hasHtml={!!introPage.customHtml}
        onGenerate={runGenerate}
        onClear={() => patch({ introPage: { ...introPage, customHtml: undefined } })}
      />

      {/* 右：选择展示内容 */}
      <div className="flex w-[284px] shrink-0 flex-col gap-2 overflow-auto pb-[30px]">
        <p className="font-misans-semibold text-[14px] text-black/30">选择展示内容</p>

        {/* 主图（固定） + 占位 */}
        <div className="flex gap-2">
          <div className="relative size-[138px] shrink-0 overflow-hidden rounded-[20px] border border-black/[0.06] bg-white">
            {primaryUrl(data) ? (
              <img src={primaryUrl(data)} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-black/20">
                <span className="text-3xl font-light">+</span>
              </div>
            )}
            <span className="pointer-events-none absolute left-1 top-1 rounded-[100px] bg-[rgba(48,48,48,0.9)] px-2 py-1 font-misans-bold text-[12px] text-white">
              主图
            </span>
          </div>
        </div>

        {/* 可勾选字段：基础字段 + 更多细节 */}
        {INTRO_CONTENT_FIELDS.map((f) => (
          <CheckRow
            key={f.key}
            label={f.label}
            checked={introPage.visibleSections.includes(f.key)}
            onToggle={() => toggleField(f.key)}
          />
        ))}
        {DETAIL_FIELDS.map((f) => {
          const filled = !!data.details[f.key]
          return (
            <CheckRow
              key={f.key}
              label={`${f.emoji} ${f.label}`}
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

// 勾选行：选中=黑底白勾，未选=浅灰，禁用(未填)=20% 透明
function CheckRow({
  label,
  checked,
  disabled = false,
  onToggle,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="flex h-12 w-[284px] shrink-0 items-center gap-3 rounded-[16px] bg-white pl-3 pr-1.5"
    >
      <span className="flex items-center justify-center p-1.5">
        <span
          className={`flex size-5 items-center justify-center rounded-full ${
            checked ? 'bg-black' : 'bg-black/10'
          }`}
        >
          {checked && (
            <img src="/assets/intro-check.svg" alt="" className="h-[7px] w-[9px] brightness-0 invert" />
          )}
        </span>
      </span>
      <span
        className={`font-misans-medium truncate text-[16px] ${
          disabled ? 'text-black/20' : 'text-black/50'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

// 中间 Agent 卡片：顶部渐变(关键词+生成) + 分隔 + agent气泡 + 分隔 + 输入栏
function AgentCard({
  tags,
  vibe,
  setVibe,
  generating,
  error,
  hasHtml,
  onGenerate,
  onClear,
}: {
  tags: string[]
  vibe: string
  setVibe: (v: string) => void
  generating: boolean
  error: string | null
  hasHtml: boolean
  onGenerate: () => void
  onClear: () => void
}) {
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
              {tags.length > 0 ? (
                tags.map((t) => (
                  <span
                    key={t}
                    className="shrink-0 rounded-[100px] bg-black/[0.04] px-2 py-1.5 font-misans-semibold text-[14px] text-black/50"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="font-misans text-[14px] text-black/30">暂无标签</span>
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
        <div className="flex items-end gap-9 p-[18px]">
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
              className={`size-6 transition ${vibe.trim() ? 'opacity-100' : 'opacity-20'}`}
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
