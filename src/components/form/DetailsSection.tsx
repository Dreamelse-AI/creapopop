import { useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { DETAIL_FIELDS, MAX_DETAIL_LEN } from '@/data/constants'
import { SectionTitle } from '@/components/ui/primitives'

// 更多细节：单行卡片(emoji+标签+右箭头/已填值)，点击弹窗编辑。
export function DetailsSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const [editing, setEditing] = useState<(typeof DETAIL_FIELDS)[number] | null>(null)
  const [draft, setDraft] = useState('')

  const open = (field: (typeof DETAIL_FIELDS)[number]) => {
    setEditing(field)
    setDraft(data.details[field.key] || '')
  }

  const confirm = () => {
    if (!editing) return
    patch({ details: { ...data.details, [editing.key]: draft.trim() } })
    setEditing(null)
  }

  const removeValue = () => {
    if (!editing) return
    const next = { ...data.details }
    delete next[editing.key]
    patch({ details: next })
    setEditing(null)
  }

  return (
    <div className="flex w-[600px] flex-col gap-2">
      <SectionTitle>角色更多细节</SectionTitle>

      {DETAIL_FIELDS.map((f) => {
        const value = data.details[f.key]
        return (
          <button
            key={f.key}
            onClick={() => open(f)}
            className="flex w-full items-center gap-3 rounded-[16px] bg-white p-3 text-left"
          >
            <div className="flex flex-1 flex-col gap-1 overflow-hidden">
              <span className="flex items-center gap-1 truncate font-misans-medium text-[16px]">
                <span>{f.emoji}</span>
                <span className="text-black/50">{f.label}</span>
              </span>
              {value && (
                <span className="font-misans-medium truncate text-[16px] text-black">{value}</span>
              )}
            </div>
            <img src="/assets/icon-arrow-right.svg" alt="" className="size-6 shrink-0 opacity-30" />
          </button>
        )
      })}

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 py-10">
          <div className="flex w-[422px] flex-col rounded-[30px] bg-[#f7f7f7] py-4">
            <div className="relative flex flex-col gap-0.5 px-4 py-2">
              <p className="font-misans-heavy text-[24px] text-black">
                {editing.emoji} {editing.label}
              </p>
              <button
                onClick={() => setEditing(null)}
                className="absolute right-4 top-1 flex size-6 items-center justify-center"
                aria-label="关闭"
              >
                <img src="/assets/icon-field-clear.svg" alt="关闭" className="size-full" />
              </button>
            </div>
            <div className="px-4 py-2">
              <div className="flex flex-col gap-2 rounded-[20px] border border-black/[0.06] bg-white px-4 pb-4 pt-3">
                <textarea
                  value={draft}
                  maxLength={MAX_DETAIL_LEN}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`请输入${editing.label}...`}
                  rows={3}
                  className="resize-none bg-transparent font-misans-medium text-[16px] text-black outline-none placeholder:text-black/20"
                />
                <span className="text-right font-misans text-[12px] text-black/30">
                  {draft.length}/{MAX_DETAIL_LEN}
                </span>
              </div>
            </div>
            <div className="flex gap-2 p-3">
              <button
                onClick={removeValue}
                className="flex h-[60px] flex-1 items-center justify-center rounded-[20px] border border-black/[0.06] bg-white font-misans-medium text-[16px] text-black"
              >
                删除
              </button>
              <button
                onClick={confirm}
                className="flex h-[60px] flex-1 items-center justify-center rounded-[20px] bg-black font-misans-semibold text-[16px] text-white"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
