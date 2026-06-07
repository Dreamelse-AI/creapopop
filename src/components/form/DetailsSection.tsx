import { useDraftStore } from '@/store/draftStore'
import { FieldCard } from '@/components/form/FieldCard'
import { DETAIL_FIELDS } from '@/data/constants'

export function DetailsSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)

  const setDetail = (key: string, value: string) => {
    patch({ details: { ...data.details, [key]: value } })
  }

  return (
    <div className="flex w-[600px] flex-col gap-2">
      <div className="px-3 py-1.5">
        <h2 className="text-base font-semibold text-black/30">更多细节（选填）</h2>
      </div>
      {DETAIL_FIELDS.map((f) => (
        <FieldCard key={f.key} label={f.label}>
          <textarea
            value={data.details[f.key] || ''}
            onChange={(e) => setDetail(f.key, e.target.value)}
            placeholder={`请输入${f.label}...`}
            rows={2}
            className="w-full resize-none bg-transparent text-base text-black outline-none placeholder:text-black/20"
          />
        </FieldCard>
      ))}
    </div>
  )
}
