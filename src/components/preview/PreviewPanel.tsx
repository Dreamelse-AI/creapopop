import { useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { DETAIL_FIELDS } from '@/data/constants'
import { SandboxHtml } from './SandboxHtml'
import { sendChatMessage, type ChatMessage } from '@/services/aiChat'

type PreviewTab = 'intro' | 'chat' | 'dynamics'

const TABS: { key: PreviewTab; icon: string; label: string }[] = [
  { key: 'intro', icon: '/assets/rail-intro.svg', label: '介绍页' },
  { key: 'chat', icon: '/assets/rail-chat.svg', label: '聊天页' },
  { key: 'dynamics', icon: '/assets/rail-dynamic.svg', label: '动态页' },
]

// 右侧悬浮预览面板：基于角色信息 + 模板实时展示。
// 右侧竖向 rail（收起按钮 + 三 tab icon）；展开时左侧直接填充移动端比例(390:844)预览区，无手机外壳。
export function PreviewPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<PreviewTab>('intro')

  return (
    <div className="relative flex h-full justify-end">
      {/* 右侧竖向 rail（悬浮在预览区左侧） */}
      <div className="z-10 flex h-full flex-col items-center gap-2 p-4">
        {/* 收起/展开按钮：未选中(收起态)30%，选中(展开态)100% */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex size-12 items-center justify-center rounded-[100px] border border-black/[0.06] bg-white"
          title={collapsed ? '展开预览' : '收起预览'}
        >
          <img
            src="/assets/rail-collapse.svg"
            alt=""
            className={`size-5 transition ${collapsed ? 'rotate-180 opacity-30' : 'opacity-100'}`}
          />
        </button>

        {/* tab 图标药丸 */}
        <div className="flex flex-col rounded-[100px] border border-black/[0.06] bg-white py-3">
          {TABS.map((t) => {
            const active = tab === t.key && !collapsed
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key)
                  setCollapsed(false)
                }}
                className="flex size-12 items-center justify-center"
                title={t.label}
              >
                <img
                  src={t.icon}
                  alt={t.label}
                  className={`size-5 transition ${active ? 'opacity-100' : 'opacity-30'}`}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* 预览区：贴右侧边，移动端比例(390:844)自适应，无手机外壳 */}
      {!collapsed && (
        <div className="flex h-full items-stretch overflow-hidden">
          <div className="aspect-[390/844] h-full overflow-hidden">
            {tab === 'intro' && <IntroPreview />}
            {tab === 'chat' && <ChatPreview />}
            {tab === 'dynamics' && <PlaceholderTab text="动态页将在 P2 接入" />}
          </div>
        </div>
      )}
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
        <h3 className="font-misans-semibold text-[20px]">{data.name || '未命名角色'}</h3>
        {sections.includes('tags') && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span key={t} className="rounded-[100px] bg-black/5 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        )}
        {sections.includes('intro') && data.intro && (
          <p className="text-sm text-black/70">{data.intro}</p>
        )}
        {sections.includes('personality') && data.personality && (
          <div>
            <p className="text-xs font-medium text-black/40">性格</p>
            <p className="text-sm text-black/70">{data.personality}</p>
          </div>
        )}
        {DETAIL_FIELDS.filter((f) => sections.includes(f.key) && data.details[f.key]).map((f) => (
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

// 聊天试聊：用角色设定做 system prompt，与角色多轮对话（Gemini）。
// 样式对齐设计稿：奶黄底 #fbf2d8，对方=头像+白气泡(尾巴)，我方=黄气泡 #fdeab3，底部 mic+发送。
function ChatPreview() {
  const data = useDraftStore((s) => s.data)!
  const cover =
    data.images.find((i) => i.id === data.primaryImageId)?.url || data.images[0]?.url || ''
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 开场白作为对方首条消息预填
  const firstGreeting = data.greetings.filter(Boolean)[0]
  const display: ChatMessage[] =
    messages.length === 0 && firstGreeting
      ? [{ role: 'assistant', content: firstGreeting }]
      : messages

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const reply = await sendChatMessage(data, next)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : '对话失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex size-full flex-col bg-[#fbf2d8]">
      {/* 消息区 */}
      <div className="flex flex-1 flex-col gap-3 overflow-auto py-4">
        <p className="text-center font-misans text-[12px] text-black/30">昨天 23:30</p>

        {display.map((m, i) =>
          m.role === 'assistant' ? (
            <div key={i} className="flex items-start gap-2 px-4">
              <Avatar cover={cover} />
              <div className="relative max-w-[240px]">
                <div className="rounded-[24px] rounded-bl-[4px] bg-white px-4 py-2.5">
                  <p className="font-misans-medium text-[16px] leading-[22px] text-black/90">
                    {m.content}
                  </p>
                </div>
                <img
                  src="/assets/chat-tail-white.svg"
                  alt=""
                  className="absolute bottom-0 left-0 h-[8.5px] w-[18.75px]"
                />
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end px-4">
              <div className="relative max-w-[240px]">
                <div className="rounded-[24px] rounded-br-[4px] bg-[#fdeab3] px-4 py-2.5">
                  <p className="font-misans-medium text-[16px] leading-[22px] text-black/90">
                    {m.content}
                  </p>
                </div>
                <img
                  src="/assets/chat-tail-yellow.svg"
                  alt=""
                  className="absolute bottom-0 right-0 h-[8.5px] w-[18.75px] -scale-x-100"
                />
              </div>
            </div>
          ),
        )}

        {display.length === 0 && (
          <p className="px-6 text-center font-misans text-[14px] text-black/30">
            和「{data.name || '未命名角色'}」试聊一下，验证人设效果。
          </p>
        )}
        {loading && <p className="px-4 font-misans text-[14px] text-black/40">对方正在输入…</p>}
        {error && <p className="px-4 font-misans text-[14px] text-red-500">{error}</p>}
      </div>

      {/* 底部输入栏：mic + 输入 + 发送 */}
      <div className="px-4 py-2">
        <div className="flex h-[60px] items-center gap-2 rounded-[24px] bg-white px-[18px]">
          <img src="/assets/chat-mic.svg" alt="语音" className="size-6 shrink-0 opacity-20" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="说点什么…"
            className="flex-1 bg-transparent font-misans-medium text-[16px] text-black outline-none placeholder:text-black/20"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="shrink-0"
          >
            <img
              src="/assets/chat-send.svg"
              alt="发送"
              className={`size-6 transition ${input.trim() ? 'opacity-100' : 'opacity-20'}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

// 对方头像：有主图用主图，否则默认头像占位
function Avatar({ cover }: { cover: string }) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[100px] bg-black/10">
      {cover ? (
        <img src={cover} alt="" className="size-full object-cover" />
      ) : (
        <img src="/assets/chat-avatar-default.svg" alt="" className="h-[18px] w-[30px] opacity-40" />
      )}
    </div>
  )
}
