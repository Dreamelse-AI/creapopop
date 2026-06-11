import { useState, useEffect } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { useCreationTaskStore } from '@/store/creationTaskStore'
import { DETAIL_FIELDS } from '@/data/constants'
import { SandboxHtml } from './SandboxHtml'
import { type ChatMessage } from '@/services/aiChat'
import type { MessageItem } from '@/prompts/types'
import { Spinner } from '@/components/ui/primitives'

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
  const selectedDynamicId = useCreationTaskStore((s) => s.selectedDynamicId)

  // 当从历史动态列表选中某条时，自动切到动态 tab 并展开预览
  useEffect(() => {
    if (selectedDynamicId) {
      setTab('dynamics')
      setCollapsed(false)
    }
  }, [selectedDynamicId])

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

      {/* 预览区：贴右侧边，移动端比例(390:844)自适应，无手机外壳，纯白底 */}
      {!collapsed && (
        <div className="flex h-full items-stretch overflow-hidden">
          <div className="aspect-[390/844] h-full overflow-hidden bg-white">
            {tab === 'intro' && <IntroPreview />}
            {tab === 'chat' && <ChatPreview />}
            {tab === 'dynamics' && <DynamicsPreview />}
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

  // 空态：无封面、无名字、无简介/性格/标签等核心内容时，纯白 + 占位文字
  const hasContent =
    !!cover ||
    !!data.name ||
    !!data.intro ||
    !!data.personality ||
    data.tags.length > 0
  if (!hasContent) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-white">
        <p className="font-misans text-[14px] text-black/30">填写角色信息后在此预览介绍页</p>
      </div>
    )
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

function DynamicsPreview() {
  const data = useDraftStore((s) => s.data)!
  const dynamics = [...data.dynamics].sort((a, b) => b.createdAt - a.createdAt)
  const cover =
    data.images.find((i) => i.id === data.primaryImageId)?.url || data.images[0]?.url || ''
  const selectedId = useCreationTaskStore((s) => s.selectedDynamicId)
  const setSelectedId = useCreationTaskStore((s) => s.setSelectedDynamicId)

  const selectedDynamic = selectedId ? data.dynamics.find((d) => d.id === selectedId) : null

  if (selectedDynamic) {
    return <DynamicDetailView dynamic={selectedDynamic} cover={cover} onBack={() => setSelectedId(null)} />
  }

  if (dynamics.length === 0) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 bg-white">
        <p className="font-misans text-[14px] text-black/30">暂无动态</p>
        <p className="font-misans text-[12px] text-black/20">发布动态后将在此展示</p>
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col overflow-auto bg-[#091627]">
      <div className="flex items-center gap-2 px-3 pt-4 pb-3">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
          {cover ? (
            <img src={cover} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-[10px] text-white/40">角色</span>
          )}
        </div>
        <span className="font-black-han text-[20px] text-white">
          {data.name || '未命名角色'}
        </span>
      </div>
      <div className="flex flex-col gap-6 px-3 pb-4">
        {dynamics.map((dyn) => (
          <button
            key={dyn.id}
            onClick={() => setSelectedId(dyn.id)}
            className="flex flex-col gap-2 text-left"
          >
            {dyn.images.length > 0 && (
              <div className="w-full overflow-hidden rounded-[30px]">
                <img
                  src={dyn.images[0]}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
            )}
            {dyn.text && (
              <p className="line-clamp-2 font-misans-medium text-[14px] leading-[20px] text-white/80">
                {dyn.text}
              </p>
            )}
            <span className="font-misans text-[11px] text-white/30">
              {formatDynDate(dyn.createdAt)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function DynamicDetailView({
  dynamic,
  cover,
  onBack,
}: {
  dynamic: import('@/types/character').CharacterDynamic
  cover: string
  onBack: () => void
}) {
  const data = useDraftStore((s) => s.data)!
  const [imgIdx, setImgIdx] = useState(0)

  const nextImg = () => setImgIdx((i) => Math.min(i + 1, dynamic.images.length - 1))
  const prevImg = () => setImgIdx((i) => Math.max(i - 1, 0))

  return (
    <div className="relative flex size-full flex-col bg-[#091627]">
      {/* 主图区：居中 rounded-[30px] */}
      {dynamic.images.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[480px] w-[360px] overflow-hidden rounded-[30px]">
            <img
              src={dynamic.images[imgIdx]}
              alt=""
              className="size-full object-cover"
            />
            {dynamic.images.length > 1 && imgIdx > 0 && (
              <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40">
                <img src="/assets/icon-back.svg" alt="" className="h-2 w-3 rotate-90 invert" />
              </button>
            )}
            {dynamic.images.length > 1 && imgIdx < dynamic.images.length - 1 && (
              <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40">
                <img src="/assets/icon-back.svg" alt="" className="h-2 w-3 -rotate-90 invert" />
              </button>
            )}
          </div>
          {/* 背景模糊层 */}
          <img
            src={dynamic.images[imgIdx]}
            alt=""
            className="pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-30 blur-[20px]"
          />
        </div>
      )}

      {/* 顶部栏：头像 + 名字 + 时间 */}
      <div className="relative z-10 flex items-center justify-between px-3 py-1.5 pt-4">
        <div className="flex items-center gap-1.5">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
            {cover ? (
              <img src={cover} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-[10px] text-white/40">角色</span>
            )}
          </div>
          <span className="font-black-han text-[20px] text-white">
            {data.name || '未命名角色'}
          </span>
        </div>
        <span className="font-misans text-[12px] text-white/50">
          {formatDynDate(dynamic.createdAt)}
        </span>
      </div>

      {/* 文案 */}
      {dynamic.text && (
        <div className="relative z-10 px-3 py-1.5">
          <p className="line-clamp-2 font-misans-medium text-[14px] leading-[20px] text-white opacity-80">
            {dynamic.text}
          </p>
        </div>
      )}

      {/* 返回按钮（左上） */}
      <button
        onClick={onBack}
        className="absolute left-3 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-black/30"
      >
        <img src="/assets/icon-back.svg" alt="返回" className="h-2 w-3 rotate-90 invert" />
      </button>

      {/* 底部音乐栏 */}
      {dynamic.musicId && (
        <div className="absolute bottom-3 right-3 z-10 flex h-9 items-center gap-3 rounded-[100px] bg-[rgba(48,48,48,0.9)] px-2.5 py-2">
          <div className="flex items-center gap-0.5">
            <span className="text-[12px]">🎵</span>
            <span className="max-w-[70px] truncate font-misans-medium text-[14px] text-white/80">
              背景音乐
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDynDate(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${h}:${m}`
}

// 聊天试聊：用角色设定做 system prompt，与角色多轮对话（Gemini）。
// 样式对齐设计稿：奶黄底 #fbf2d8，对方=头像+白气泡(尾巴)，我方=黄气泡 #fdeab3，底部 mic+发送。
function ChatPreview() {
  const data = useDraftStore((s) => s.data)!
  const cover =
    data.images.find((i) => i.id === data.primaryImageId)?.url || data.images[0]?.url || ''
  const messages = useCreationTaskStore((s) => s.chatMessages)
  const loading = useCreationTaskStore((s) => s.chatLoading)
  const error = useCreationTaskStore((s) => s.chatError)
  const sendChat = useCreationTaskStore((s) => s.sendChat)
  const [input, setInput] = useState('')

  const firstGreeting = data.greetings.filter(Boolean)[0]
  const display: ChatMessage[] =
    messages.length === 0 && firstGreeting
      ? [{ role: 'assistant', content: firstGreeting, items: [{ type: 'text', data: { content: firstGreeting } }] }]
      : messages

  const send = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    void sendChat(text)
  }

  return (
    <div className="flex size-full flex-col bg-[#fbf2d8]">
      <div className="flex flex-1 flex-col gap-3 overflow-auto py-4">
        {display.map((m, i) =>
          m.role === 'assistant' ? (
            <AssistantBubbles key={i} items={m.items} fallback={m.content} cover={cover} />
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

        {loading && (
          <p className="flex items-center gap-2 px-4 font-misans text-[14px] text-black/40">
            <Spinner size={14} className="text-black/40" />
            对方正在输入…
          </p>
        )}
        {error && <p className="px-4 font-misans text-[14px] text-red-500">{error}</p>}
      </div>

      <div className="px-4 pb-4">
        <div className="flex h-[60px] items-center gap-2 rounded-[24px] bg-white px-[18px]">
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

// 多气泡渲染：解析 JSON 数组后的多条消息
function AssistantBubbles({
  items,
  fallback,
  cover,
}: {
  items?: MessageItem[]
  fallback: string
  cover: string
}) {
  const bubbles = items && items.length > 0 ? items : [{ type: 'text' as const, data: { content: fallback } }]

  return (
    <div className="flex flex-col gap-2">
      {bubbles.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 px-4">
          {idx === 0 && <Avatar cover={cover} />}
          {idx !== 0 && <div className="w-12 shrink-0" />}
          <div className="relative max-w-[240px]">
            <BubbleContent item={item} />
            {idx === bubbles.length - 1 && (
              <img
                src="/assets/chat-tail-white.svg"
                alt=""
                className="absolute bottom-0 left-0 h-[8.5px] w-[18.75px]"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function BubbleContent({ item }: { item: MessageItem }) {
  switch (item.type) {
    case 'text':
      return (
        <div className="rounded-[24px] rounded-bl-[4px] bg-white px-4 py-2.5">
          <p className="font-misans-medium text-[16px] leading-[22px] text-black/90">
            {item.data.content}
          </p>
        </div>
      )
    case 'voice':
      return (
        <div className="flex items-center gap-2 rounded-[24px] rounded-bl-[4px] bg-white px-4 py-2.5">
          <span className="text-[14px]">🎤</span>
          <p className="font-misans-medium text-[14px] leading-[20px] text-black/70 italic">
            {item.data.content}
          </p>
        </div>
      )
    case 'sticker':
      return (
        <div className="flex items-center gap-1 rounded-[24px] rounded-bl-[4px] bg-white px-4 py-2.5">
          <span className="text-[24px]">😊</span>
          <p className="font-misans text-[12px] text-black/50">{item.data.emotion}</p>
        </div>
      )
    case 'image':
      return (
        <div className="rounded-[16px] bg-white p-2">
          <div className="flex h-[120px] w-full items-center justify-center rounded-[12px] bg-black/5">
            <span className="text-[12px] text-black/40">
              [{item.data.category === 'selfie' ? '自拍' : '照片'}] {item.data.description}
            </span>
          </div>
        </div>
      )
    case 'state_update':
      return (
        <div className="rounded-[16px] bg-purple-50 px-3 py-2">
          <p className="font-misans text-[12px] text-purple-600">
            {item.data.emotion} · {item.data.status}
          </p>
        </div>
      )
    case 'html_file':
      return (
        <div className="rounded-[16px] bg-white px-4 py-3">
          <p className="font-misans-medium text-[14px] text-black/90">{item.data.file_name}</p>
          <p className="font-misans text-[12px] text-black/50">{item.data.description}</p>
        </div>
      )
    default:
      return (
        <div className="rounded-[24px] rounded-bl-[4px] bg-white px-4 py-2.5">
          <p className="font-misans-medium text-[16px] leading-[22px] text-black/90">
            {item.data.content || JSON.stringify(item.data)}
          </p>
        </div>
      )
  }
}
