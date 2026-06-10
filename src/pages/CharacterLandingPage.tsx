import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCharacterForPage } from '@/services/characterApi'
import { DETAIL_FIELDS } from '@/data/constants'
import { SandboxHtml } from '@/components/preview/SandboxHtml'
import { FullscreenLoading } from '@/components/ui/primitives'
import type { Character } from '@/types/character'

// 角色落地页：中间固定 390px（移动端宽度）展示介绍页，
// 两侧用「关联色」填充——取角色主图的代表色做柔和渐变铺底。
export function CharacterLandingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const query = useQuery({
    queryKey: ['character-page', id],
    queryFn: () => getCharacterForPage(id!),
    enabled: !!id,
  })

  const character = query.data?.character ?? null
  const cover =
    character?.images.find((i) => i.id === character.primaryImageId)?.url ||
    character?.images[0]?.url ||
    ''
  const bg = useAccentColor(cover, character?.id || '')

  return (
    <div
      className="relative flex h-full w-full items-stretch justify-center overflow-hidden transition-[background] duration-500"
      style={{ background: bg }}
    >
      {/* 返回 */}
      <button
        onClick={() => navigate('/')}
        className="absolute left-5 top-5 z-10 flex size-10 items-center justify-center rounded-full bg-white/70 backdrop-blur transition hover:bg-white"
        title="返回"
      >
        <img src="/assets/icon-back.svg" alt="返回" className="h-2 w-3.5 rotate-90" />
      </button>

      {/* 中间 390 区域 */}
      <div className="h-full w-[390px] shrink-0 overflow-y-auto bg-white shadow-[0_0_60px_rgba(0,0,0,0.12)]">
        {query.isLoading ? (
          <FullscreenLoading />
        ) : !character ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-black/40">
            <p className="font-misans text-[16px]">角色不存在或已删除</p>
            <button
              onClick={() => navigate('/')}
              className="rounded-[100px] bg-black px-5 py-2 font-misans-medium text-[14px] text-white"
            >
              返回首页
            </button>
          </div>
        ) : (
          <LandingContent character={character} />
        )}
      </div>
    </div>
  )
}

// 介绍页正文：有 customHtml 走 iframe 沙箱，否则按模板渲染（与右侧预览一致）。
function LandingContent({ character }: { character: Character }) {
  const cover =
    character.images.find((i) => i.id === character.primaryImageId)?.url ||
    character.images[0]?.url ||
    ''
  const sections = character.introPage.visibleSections

  if (character.introPage.customHtml) {
    return <SandboxHtml html={character.introPage.customHtml} />
  }

  return (
    <div className="flex flex-col">
      <div className="aspect-[3/4] w-full overflow-hidden bg-[#f0f0f0]">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center text-black/20">暂无形象</div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-misans-semibold text-[20px]">{character.name || '未命名角色'}</h3>
        {sections.includes('tags') && character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {character.tags.map((t) => (
              <span key={t} className="rounded-[100px] bg-black/5 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        )}
        {sections.includes('intro') && character.intro && (
          <p className="text-sm text-black/70">{character.intro}</p>
        )}
        {sections.includes('personality') && character.personality && (
          <div>
            <p className="text-xs font-medium text-black/40">性格</p>
            <p className="text-sm text-black/70">{character.personality}</p>
          </div>
        )}
        {DETAIL_FIELDS.filter((f) => sections.includes(f.key) && character.details[f.key]).map((f) => (
          <div key={f.key}>
            <p className="text-xs font-medium text-black/40">{f.label}</p>
            <p className="text-sm text-black/70">{character.details[f.key]}</p>
          </div>
        ))}
        {sections.includes('greetings') && character.greetings.filter(Boolean).length > 0 && (
          <div>
            <p className="text-xs font-medium text-black/40">开场白</p>
            {character.greetings.filter(Boolean).map((g, i) => (
              <p key={i} className="text-sm text-black/70">
                {g}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 关联色：从主图采样代表色，做对称柔和渐变铺两侧背景。
// 采样失败（跨域 canvas 污染 / 图片未加载）时回退到基于角色 id 的稳定中性渐变。
function useAccentColor(coverUrl: string, seed: string): string {
  const fallback = seedGradient(seed)
  const [bg, setBg] = useState(fallback)

  useEffect(() => {
    setBg(seedGradient(seed))
    if (!coverUrl) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        const w = (canvas.width = 24)
        const h = (canvas.height = 24)
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          n++
        }
        if (!n) return
        const r2 = Math.round(r / n)
        const g2 = Math.round(g / n)
        const b2 = Math.round(b / n)
        // 关联色：保留主图色调，仅做轻微提亮/压暗形成对称渐变，不过度柔化
        const lighten = (c: number) => Math.round(c * 0.82 + 255 * 0.18)
        const darken = (c: number) => Math.round(c * 0.92)
        const c1 = `rgb(${lighten(r2)}, ${lighten(g2)}, ${lighten(b2)})`
        const c2 = `rgb(${darken(r2)}, ${darken(g2)}, ${darken(b2)})`
        setBg(`linear-gradient(160deg, ${c1} 0%, ${c2} 100%)`)
      } catch {
        // canvas 被跨域污染：保持 seed 回退
      }
    }
    img.src = coverUrl
    return () => {
      cancelled = true
    }
  }, [coverUrl, seed])

  return bg
}

function seedGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const hue = hash % 360
  const c1 = `hsl(${hue}, 30%, 88%)`
  const c2 = `hsl(${(hue + 40) % 360}, 24%, 82%)`
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
}
