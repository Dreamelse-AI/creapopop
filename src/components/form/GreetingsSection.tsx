import { useDraftStore } from '@/store/draftStore'

// 开场白：聊天气泡形式（圆角药丸 + 左下尾巴）。
// 已填气泡可编辑/清空(×)，末尾空气泡用于新增(+)。
export function GreetingsSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)

  const update = (i: number, value: string) => {
    const next = [...data.greetings]
    next[i] = value
    patch({ greetings: next })
  }
  const add = (value: string) => {
    if (!value.trim()) return
    patch({ greetings: [...data.greetings, value.trim()] })
  }
  const remove = (i: number) =>
    patch({ greetings: data.greetings.filter((_, idx) => idx !== i) })

  return (
    <div className="flex w-[600px] flex-col gap-2">
      <div className="px-3 py-1.5">
        <h2 className="font-misans-semibold text-[16px] text-black/30">角色开场白</h2>
      </div>

      {data.greetings.map((g, i) => (
        <Bubble key={i}>
          <input
            value={g}
            onChange={(e) => update(i, e.target.value)}
            placeholder="请输入开场白..."
            className="flex-1 bg-transparent font-misans-medium text-[16px] text-black outline-none placeholder:text-black/20"
          />
          <button onClick={() => remove(i)} className="size-6 shrink-0" title="清空">
            <img src="/assets/icon-field-clear.svg" alt="清空" className="size-full" />
          </button>
        </Bubble>
      ))}

      {/* 新增气泡：回车或点击 + 添加 */}
      <AddBubble onAdd={add} />
    </div>
  )
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full">
      <div className="flex h-12 items-center justify-between gap-2 rounded-[100px] bg-white px-4 py-2.5">
        {children}
      </div>
      <img
        src="/assets/bubble-tail.svg"
        alt=""
        className="pointer-events-none absolute -bottom-[2px] left-0 h-[9.8px] w-[21.6px]"
      />
    </div>
  )
}

function AddBubble({ onAdd }: { onAdd: (v: string) => void }) {
  let value = ''
  return (
    <Bubble>
      <input
        defaultValue=""
        onChange={(e) => (value = e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onAdd(value)
            ;(e.target as HTMLInputElement).value = ''
            value = ''
          }
        }}
        placeholder="请输入角色打招呼的第一句话..."
        className="flex-1 bg-transparent font-misans-medium text-[16px] text-black outline-none placeholder:text-black/20"
      />
      <button
        onClick={(e) => {
          const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
          onAdd(input.value)
          input.value = ''
          value = ''
        }}
        className="size-6 shrink-0"
        title="添加"
      >
        <img src="/assets/icon-plus.svg" alt="添加" className="size-full" />
      </button>
    </Bubble>
  )
}
