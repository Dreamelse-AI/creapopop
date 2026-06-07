import { useDraftStore } from '@/store/draftStore'

export function GreetingsSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)

  const update = (i: number, value: string) => {
    const next = [...data.greetings]
    next[i] = value
    patch({ greetings: next })
  }
  const add = () => patch({ greetings: [...data.greetings, ''] })
  const remove = (i: number) =>
    patch({ greetings: data.greetings.filter((_, idx) => idx !== i) })

  return (
    <div className="flex w-[600px] flex-col gap-2">
      <div className="px-3 py-1.5">
        <h2 className="text-base font-semibold text-black/30">开场白（可添加多条）</h2>
      </div>

      {data.greetings.length === 0 && (
        <p className="px-3 text-sm text-black/40">还没有开场白，添加一条让角色主动开口。</p>
      )}

      {data.greetings.map((g, i) => (
        <div
          key={i}
          className="flex w-full flex-col gap-2 rounded-[20px] border border-black/[0.06] bg-white p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-black/50">开场白 {i + 1}</span>
            <button onClick={() => remove(i)} className="text-sm text-black/40 hover:text-black">
              删除
            </button>
          </div>
          <textarea
            value={g}
            onChange={(e) => update(i, e.target.value)}
            placeholder="请输入开场白..."
            rows={2}
            className="w-full resize-none bg-transparent text-base text-black outline-none placeholder:text-black/20"
          />
        </div>
      ))}

      <button
        onClick={add}
        className="self-start rounded-[100px] border border-black/15 px-4 py-1.5 text-sm hover:bg-black/5"
      >
        + 添加开场白
      </button>
    </div>
  )
}
