import { useDraftStore } from '@/store/draftStore'
import { useCreationTaskStore } from '@/store/creationTaskStore'
import { SectionTitle } from '@/components/ui/primitives'
import type { CharacterDynamic } from '@/types/character'

export function DynamicHistorySection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const selectedId = useCreationTaskStore((s) => s.selectedDynamicId)
  const setSelectedId = useCreationTaskStore((s) => s.setSelectedDynamicId)

  const dynamics = [...data.dynamics].sort((a, b) => b.createdAt - a.createdAt)

  const handleDelete = (id: string) => {
    if (!confirm('确定删除该动态？')) return
    patch({ dynamics: data.dynamics.filter((d) => d.id !== id) })
    if (selectedId === id) setSelectedId(null)
  }

  if (dynamics.length === 0) {
    return (
      <div className="flex w-[600px] flex-col gap-2">
        <SectionTitle>历史动态</SectionTitle>
        <div className="flex flex-col items-center justify-center gap-2 py-20">
          <p className="font-misans text-[14px] text-black/30">暂无动态</p>
          <p className="font-misans text-[12px] text-black/20">
            在「新建动态」中发布内容后会在这里展示
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-[600px] flex-col gap-2">
      <div className="flex items-center gap-1 px-3 py-1.5">
        <h2 className="font-misans-medium text-[16px] text-black/30">历史动态</h2>
        <span className="rounded-[100px] bg-black/20 px-1.5 py-0.5 font-misans-semibold text-[12px] text-white">
          {dynamics.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {dynamics.map((dyn) => (
          <DynamicCard
            key={dyn.id}
            dynamic={dyn}
            isSelected={selectedId === dyn.id}
            onSelect={() => setSelectedId(dyn.id)}
            onDelete={() => handleDelete(dyn.id)}
          />
        ))}
      </div>
    </div>
  )
}

function DynamicCard({
  dynamic,
  isSelected,
  onSelect,
  onDelete,
}: {
  dynamic: CharacterDynamic
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const dateStr = formatDate(dynamic.createdAt)

  return (
    <button
      onClick={onSelect}
      className={`flex gap-3 rounded-[20px] border bg-white p-3 text-left transition hover:shadow-sm ${
        isSelected ? 'border-black/20 shadow-sm' : 'border-black/[0.06]'
      }`}
    >
      {/* 文案和元信息 */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {dynamic.text && (
          <p className="line-clamp-3 font-misans-medium text-[14px] leading-[20px] text-black/80">
            {dynamic.text}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="font-misans text-[12px] text-black/30">{dateStr}</span>
          {dynamic.musicId && (
            <span className="font-misans text-[12px] text-black/30">🎵</span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="self-start font-misans text-[12px] text-[#ff3c00]/60 hover:text-[#ff3c00]"
        >
          删除
        </button>
      </div>

      {/* 图片预览网格 */}
      {dynamic.images.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1" style={{ width: dynamic.images.length === 1 ? '144px' : '140px' }}>
          {dynamic.images.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-[12px]"
              style={{
                width: dynamic.images.length === 1 ? '144px' : '66px',
                height: dynamic.images.length === 1 ? '144px' : '66px',
              }}
            >
              <img src={url} alt="" className="size-full object-cover" />
              {i === 3 && dynamic.images.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="font-misans-semibold text-[14px] text-white">
                    +{dynamic.images.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}
