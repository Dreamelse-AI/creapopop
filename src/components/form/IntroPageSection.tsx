import { useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { INTRO_CONTENT_FIELDS, INTRO_TEMPLATES } from '@/data/constants'
import { generateIntroPageHtml } from '@/services/aiIntroPage'
import { SandboxHtml } from '@/components/preview/SandboxHtml'
import type { IntroTemplate } from '@/types/character'

// 介绍页美化：模版选择(左缩略图) + Agent 对话生成(中) + 选择展示内容(右清单)。
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
    if (!vibe.trim() || generating) return
    setGenerating(true)
    setError(null)
    try {
      const html = await generateIntroPageHtml(data, vibe)
      patch({ introPage: { ...introPage, customHtml: html } })
      setVibe('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex w-[600px] flex-col gap-4">
      <div className="px-3 py-1.5">
        <h2 className="font-misans-semibold text-[16px] text-black/30">介绍页美化</h2>
      </div>

      {/* 模版缩略图横向选择 */}
      <div className="flex flex-col gap-2">
        <p className="px-1 font-misans-semibold text-[14px] text-black/30">UI 模版</p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {INTRO_TEMPLATES.map((t) => {
            const active = introPage.template === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTemplate(t.value)}
                className={`relative flex h-[200px] w-[150px] shrink-0 flex-col items-center justify-center rounded-[20px] border bg-white p-2 ${
                  active ? 'border-[3px] border-black' : 'border border-black/[0.06]'
                }`}
              >
                <span className="text-center font-misans text-[16px] text-black/30">
                  {t.label}
                </span>
                {t.value === 'none' && (
                  <span className="mt-1 text-center font-misans text-[10px] text-black/30">
                    （包含最低标准基础规则）
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Agent 对话生成区（顶部预览 + 底部输入） */}
      <div className="flex flex-col overflow-hidden rounded-[20px] border border-black/[0.06] bg-white">
        {/* 实时结果预览 */}
        <div className="aspect-[9/16] max-h-[420px] w-full bg-gradient-to-b from-[#fff0c4] to-[#fff8e4]">
          {introPage.customHtml && !generating ? (
            <SandboxHtml html={introPage.customHtml} />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="max-w-[280px] rounded-[24px] bg-black/[0.04] px-4 py-2.5">
                <p className="font-misans-medium text-[16px] text-black/90">
                  {generating ? 'Claude 生成中…' : '你可以告诉我你想要的效果'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 对话输入栏 */}
        <div className="border-t border-black/[0.06] p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="描述你想要的介绍页风格，如：暗黑哥特风、暖色治愈系…"
              rows={2}
              disabled={generating}
              className="flex-1 resize-none bg-transparent font-misans-medium text-[16px] text-black outline-none placeholder:text-black/20 disabled:opacity-50"
            />
            <button
              onClick={runGenerate}
              disabled={generating || !vibe.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white disabled:opacity-30"
              title="发送"
            >
              ↑
            </button>
          </div>
          {error && (
            <div className="mt-2 flex items-center justify-between rounded-[12px] bg-red-50 px-3 py-2">
              <span className="font-misans text-[14px] text-red-500">{error}</span>
              <button onClick={runGenerate} className="font-misans text-[14px] text-red-500 underline">
                重试
              </button>
            </div>
          )}
          {introPage.customHtml && !generating && (
            <button
              onClick={() => patch({ introPage: { ...introPage, customHtml: undefined } })}
              className="mt-2 font-misans text-[14px] text-black/40 hover:text-black"
            >
              清除，恢复模版
            </button>
          )}
        </div>
      </div>

      {/* 选择展示内容 */}
      <div className="flex flex-col gap-2">
        <p className="px-1 font-misans-semibold text-[14px] text-black/30">选择展示内容</p>

        {/* 主图（固定展示） */}
        <div className="flex flex-wrap gap-2">
          <div className="relative size-[138px] shrink-0 overflow-hidden rounded-[20px] border border-black/[0.06] bg-black/[0.03]">
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

        {/* 可勾选字段 */}
        <div className="flex flex-col gap-2">
          {INTRO_CONTENT_FIELDS.map((f) => {
            const active = introPage.visibleSections.includes(f.key)
            return (
              <button
                key={f.key}
                onClick={() => toggleField(f.key)}
                className="flex h-12 w-[284px] items-center gap-3 rounded-[16px] bg-white pl-3 pr-1.5"
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full ${
                    active ? 'bg-black text-white' : 'bg-black/10 text-transparent'
                  }`}
                >
                  <span className="text-[12px] leading-none">✓</span>
                </span>
                <span className="font-misans-medium text-[16px] text-black/50">{f.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function primaryUrl(data: ReturnType<typeof useDraftStore.getState>['data']): string {
  if (!data) return ''
  return (
    data.images.find((i) => i.id === data.primaryImageId)?.url ||
    data.images[0]?.url ||
    ''
  )
}
