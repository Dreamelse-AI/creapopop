import { useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import type { CharacterDynamic } from '@/types/character'

export function DynamicHistorySection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const [selected, setSelected] = useState<CharacterDynamic | null>(null)

  const dynamics = [...data.dynamics].sort((a, b) => b.createdAt - a.createdAt)

  const handleDelete = (id: string) => {
    if (!confirm('确定删除该动态？')) return
    patch({ dynamics: data.dynamics.filter((d) => d.id !== id) })
    if (selected?.id === id) setSelected(null)
  }

  if (dynamics.length === 0) {
    return (
      <div className="flex w-[600px] flex-col gap-4">
        <div className="flex flex-col gap-0.5 px-3 py-1.5">
          <h2 className="font-misans text-[16px] text-black/30">历史动态</h2>
        </div>
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
    <div className="flex w-full gap-4">
      {/* 左侧：动态列表 */}
      <div className="flex w-[600px] shrink-0 flex-col gap-4">
        <div className="flex flex-col gap-0.5 px-3 py-1.5">
          <h2 className="font-misans text-[16px] text-black/30">历史动态</h2>
          <p className="font-misans-medium text-[14px] text-black/30">
            共 {dynamics.length} 条动态
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {dynamics.map((dyn) => (
            <DynamicCard
              key={dyn.id}
              dynamic={dyn}
              isSelected={selected?.id === dyn.id}
              onSelect={() => setSelected(dyn)}
              onDelete={() => handleDelete(dyn.id)}
            />
          ))}
        </div>
      </div>

      {/* 右侧：详情面板 */}
      {selected && (
        <DynamicDetailPanel
          dynamic={selected}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected.id)}
        />
      )}
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
      className={`flex gap-3 rounded-[20px] border bg-white p-4 text-left transition hover:shadow-sm ${
        isSelected ? 'border-black/20 shadow-sm' : 'border-black/[0.06]'
      }`}
    >
      {/* 图片预览网格 */}
      {dynamic.images.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1" style={{ width: '138px' }}>
          {dynamic.images.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-[8px]"
              style={{
                width: dynamic.images.length === 1 ? '138px' : '66px',
                height: dynamic.images.length === 1 ? '138px' : '66px',
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
            <span className="font-misans text-[12px] text-black/30">🎵 有背景音乐</span>
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
    </button>
  )
}

function DynamicDetailPanel({
  dynamic,
  onClose,
  onDelete,
}: {
  dynamic: CharacterDynamic
  onClose: () => void
  onDelete: () => void
}) {
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const dateStr = formatDate(dynamic.createdAt)

  return (
    <div className="sticky top-0 flex w-[340px] shrink-0 flex-col rounded-[20px] border border-black/[0.06] bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
        <span className="font-misans-semibold text-[16px] text-black">动态详情</span>
        <button
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full text-[18px] text-black/40 hover:bg-black/5"
        >
          ×
        </button>
      </div>

      {/* 内容 */}
      <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
        {/* 图片 */}
        {dynamic.images.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dynamic.images.map((url, i) => (
              <button
                key={i}
                onClick={() => setViewingImage(url)}
                className="overflow-hidden rounded-[12px]"
                style={{
                  width: dynamic.images.length === 1 ? '100%' : 'calc(50% - 3px)',
                  aspectRatio: dynamic.images.length === 1 ? '4/5' : '1',
                }}
              >
                <img src={url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* 文案 */}
        {dynamic.text && (
          <p className="font-misans-medium text-[14px] leading-[22px] text-black/80 whitespace-pre-wrap">
            {dynamic.text}
          </p>
        )}

        {/* 元信息 */}
        <div className="flex items-center gap-2 pt-2">
          <span className="font-misans text-[12px] text-black/30">{dateStr}</span>
          {dynamic.musicId && (
            <span className="font-misans text-[12px] text-black/30">🎵 含背景音乐</span>
          )}
        </div>

        {/* 删除 */}
        <button
          onClick={onDelete}
          className="mt-4 flex h-[40px] w-full items-center justify-center rounded-[12px] border border-[#ff3c00]/20 font-misans-medium text-[14px] text-[#ff3c00] transition hover:bg-[#ff3c00]/5"
        >
          删除动态
        </button>
      </div>

      {/* 图片全屏查看 */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setViewingImage(null)}
        >
          <img
            src={viewingImage}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-[12px] object-contain"
          />
        </div>
      )}
    </div>
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
