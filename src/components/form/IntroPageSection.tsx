import { useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { INTRO_SECTIONS } from '@/data/constants'
import { generateIntroPageHtml } from '@/services/aiIntroPage'
import { SandboxHtml } from '@/components/preview/SandboxHtml'
import type { IntroTemplate } from '@/types/character'

const TEMPLATES: { value: IntroTemplate; label: string }[] = [
  { value: 'none', label: '无模版（默认）' },
  { value: 'tpl1', label: '模版 1' },
  { value: 'tpl2', label: '模版 2' },
]

export function IntroPageSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const [vibe, setVibe] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const introPage = data.introPage

  const setTemplate = (template: IntroTemplate) =>
    patch({ introPage: { ...introPage, template } })

  const toggleSection = (key: string, locked: boolean) => {
    if (locked) return
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
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex w-[600px] flex-col gap-3">
      <div className="px-3 py-1.5">
        <h2 className="text-base font-semibold text-black/30">介绍页 UI 美化</h2>
      </div>

      {/* UI 模版 */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-black/[0.06] bg-white p-3">
        <span className="text-sm font-medium text-black/50">UI 模版</span>
        <div className="flex gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTemplate(t.value)}
              className={`rounded-[100px] px-4 py-1.5 text-sm ${
                introPage.template === t.value ? 'bg-black text-white' : 'border border-black/15'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* agent 对话生成（Claude） */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-black/[0.06] bg-white p-3">
        <span className="text-sm font-medium text-black/50">AI 生成介绍页（描述想要的风格）</span>
        <textarea
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="如：暗黑哥特风、暖色治愈系、赛博朋克霓虹…"
          rows={2}
          disabled={generating}
          className="w-full resize-none rounded-[12px] bg-[#f7f7f7] p-2.5 text-base outline-none placeholder:text-black/20 disabled:opacity-50"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-black/30">{generating ? 'Claude 生成中…' : ''}</span>
          <button
            onClick={runGenerate}
            disabled={generating || !vibe.trim()}
            className="rounded-[100px] bg-black px-4 py-1.5 text-sm text-white disabled:opacity-40"
          >
            {generating ? '生成中…' : introPage.customHtml ? '重新生成' : '生成介绍页'}
          </button>
        </div>
        {error && (
          <div className="flex items-center justify-between rounded-[12px] bg-red-50 px-3 py-2">
            <span className="text-sm text-red-500">{error}</span>
            <button onClick={runGenerate} className="text-sm text-red-500 underline">
              重试
            </button>
          </div>
        )}
        {introPage.customHtml && !generating && (
          <div className="mt-2 overflow-hidden rounded-[12px] border border-black/[0.06]">
            <div className="aspect-[9/16] max-h-[400px] w-full">
              <SandboxHtml html={introPage.customHtml} />
            </div>
            <button
              onClick={() => patch({ introPage: { ...introPage, customHtml: undefined } })}
              className="w-full border-t border-black/[0.06] py-2 text-sm text-black/50 hover:bg-black/5"
            >
              清除，恢复模版
            </button>
          </div>
        )}
      </div>

      {/* 选择展示内容 */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-black/[0.06] bg-white p-3">
        <span className="text-sm font-medium text-black/50">选择展示内容</span>
        <div className="flex flex-wrap gap-2">
          {INTRO_SECTIONS.map((s) => {
            const active = introPage.visibleSections.includes(s.key)
            return (
              <button
                key={s.key}
                onClick={() => toggleSection(s.key, s.locked)}
                disabled={s.locked}
                className={`rounded-[100px] px-4 py-1.5 text-sm ${
                  active ? 'bg-black text-white' : 'border border-black/15'
                } ${s.locked ? 'opacity-60' : ''}`}
              >
                {s.label}
                {s.locked && ' 🔒'}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
