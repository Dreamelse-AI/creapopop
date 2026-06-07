import { useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { DETAIL_FIELDS } from '@/data/constants'
import { SandboxHtml } from './SandboxHtml'

type PreviewTab = 'intro' | 'chat' | 'dynamics'

// 右侧悬浮预览面板：基于角色信息 + 模板实时展示。
// P0 实现静态介绍页预览；聊天页试聊 / 动态在 P1/P2。
// 可折叠（折叠态为窄条 icon）。
export function PreviewPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<PreviewTab>('intro')

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 p-4">
        <button
          onClick={() => setCollapsed(false)}
          className="flex size-12 items-center justify-center rounded-[100px] bg-white"
          title="展开预览"
        >
          ▸
        </button>
        <div className="flex flex-col gap-2 rounded-[100px] bg-white py-3">
          {(['intro', 'chat', 'dynamics'] as PreviewTab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setCollapsed(false)
              }}
              className="flex size-12 items-center justify-center"
            >
              {t === 'intro' ? '📄' : t === 'chat' ? '💬' : '💭'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[390px] flex-col p-4">
      <div className="flex items-center justify-between pb-3">
        <div className="flex gap-1 rounded-[100px] bg-black/5 p-1">
          {(['intro', 'chat', 'dynamics'] as PreviewTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[100px] px-3 py-1 text-sm ${
                tab === t ? 'bg-white shadow-sm' : 'text-black/50'
              }`}
            >
              {t === 'intro' ? '介绍页' : t === 'chat' ? '聊天页' : '动态页'}
            </button>
          ))}
        </div>
        <button onClick={() => setCollapsed(true)} className="text-black/40" title="收起">
          ◂
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-[20px] border border-black/[0.06] bg-white">
        {tab === 'intro' && <IntroPreview />}
        {tab === 'chat' && <PlaceholderTab text="聊天页试聊将在 P1 接入" />}
        {tab === 'dynamics' && <PlaceholderTab text="动态页将在 P2 接入" />}
      </div>
    </div>
  )
}

// 静态介绍页预览：有 customHtml 走 iframe 沙箱，否则走模板渲染
function IntroPreview() {
  const data = useDraftStore((s) => s.data)!
  const cover =
    data.images.find((i) => i.id === data.primaryImageId)?.url || data.images[0]?.url || ''
  const sections = data.introPage.visibleSections

  if (data.introPage.customHtml) {
    return <SandboxHtml html={data.introPage.customHtml} />
  }

  return (
    <div className="flex flex-col">
      <div className="aspect-[3/4] w-full overflow-hidden bg-[#f0f0f0]">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-black/20">暂无形象</div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-xl font-semibold">{data.name || '未命名角色'}</h3>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span key={t} className="rounded-[100px] bg-black/5 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        )}
        {data.intro && <p className="text-sm text-black/70">{data.intro}</p>}
        {data.personality && (
          <div>
            <p className="text-xs font-medium text-black/40">性格</p>
            <p className="text-sm text-black/70">{data.personality}</p>
          </div>
        )}
        {sections.includes('details') &&
          DETAIL_FIELDS.filter((f) => data.details[f.key]).map((f) => (
            <div key={f.key}>
              <p className="text-xs font-medium text-black/40">{f.label}</p>
              <p className="text-sm text-black/70">{data.details[f.key]}</p>
            </div>
          ))}
        {sections.includes('greetings') && data.greetings.filter(Boolean).length > 0 && (
          <div>
            <p className="text-xs font-medium text-black/40">开场白</p>
            {data.greetings.filter(Boolean).map((g, i) => (
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

function PlaceholderTab({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-black/40">{text}</div>
}
