import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDraftStore } from '@/store/draftStore'
import { FieldCard, CharCount } from '@/components/form/FieldCard'
import { listVoices } from '@/services/mockData'
import {
  SPECIES_OPTIONS,
  GENDER_OPTIONS,
  PRESET_TAGS,
  MAX_TAGS,
  MAX_NAME_LEN,
  MAX_INTRO_LEN,
  MAX_PERSONALITY_LEN,
} from '@/data/constants'
import type { Gender, Species, Visibility } from '@/types/character'

export function BasicInfoSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const [tagPanelOpen, setTagPanelOpen] = useState(false)

  const toggleTag = (tag: string) => {
    const has = data.tags.includes(tag)
    if (has) {
      patch({ tags: data.tags.filter((t) => t !== tag) })
    } else {
      // 超过上限时，依次取消最早的（对齐框架图：超过后可继续选择，依次取消最早）
      const next = [...data.tags, tag]
      patch({ tags: next.slice(-MAX_TAGS) })
    }
  }

  return (
    <div className="flex w-[600px] flex-col gap-2">
      <SectionTitle>角色基本信息</SectionTitle>

      {/* 名字 */}
      <FieldCard label="名字">
        <input
          value={data.name}
          maxLength={MAX_NAME_LEN}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="请输入角色名称..."
          className="w-full bg-transparent text-2xl font-semibold text-black outline-none placeholder:text-black/20"
        />
        <div className="self-end">
          <CharCount value={data.name.length} max={MAX_NAME_LEN} />
        </div>
      </FieldCard>

      {/* 标签 */}
      <FieldCard label={`标签（最多${MAX_TAGS}个）`}>
        <div className="flex flex-wrap gap-2">
          {data.tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-[100px] bg-black/5 px-3 py-1 text-sm"
            >
              {t}
              <button onClick={() => toggleTag(t)} className="text-black/40">
                ×
              </button>
            </span>
          ))}
          <button
            onClick={() => setTagPanelOpen((v) => !v)}
            className="rounded-[100px] border border-black/15 px-3 py-1 text-sm hover:bg-black/5"
          >
            + 选择标签
          </button>
        </div>
        {tagPanelOpen && (
          <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-auto rounded-[16px] bg-black/[0.03] p-3">
            {PRESET_TAGS.map((t) => {
              const active = data.tags.includes(t)
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-[100px] px-3 py-1 text-sm ${
                    active ? 'bg-black text-white' : 'bg-white hover:bg-black/5'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        )}
      </FieldCard>

      {/* 物种 + 性别 */}
      <div className="flex w-full gap-2">
        <SelectField<Species>
          label="物种"
          value={data.species}
          options={SPECIES_OPTIONS}
          onChange={(v) => patch({ species: v })}
        />
        <SelectField<Gender>
          label="性别"
          value={data.gender}
          options={GENDER_OPTIONS}
          onChange={(v) => patch({ gender: v })}
        />
      </div>

      {/* 音色（mock 库 + 选择） */}
      <FieldCard label="音色">
        <VoiceSelect value={data.voiceId} onChange={(id) => patch({ voiceId: id })} />
      </FieldCard>

      {/* 简介 */}
      <FieldCard label="简介">
        <textarea
          value={data.intro}
          maxLength={MAX_INTRO_LEN}
          onChange={(e) => patch({ intro: e.target.value })}
          placeholder="请输入角色简介..."
          rows={3}
          className="w-full resize-none bg-transparent text-base text-black outline-none placeholder:text-black/20"
        />
        <div className="self-end">
          <CharCount value={data.intro.length} max={MAX_INTRO_LEN} />
        </div>
      </FieldCard>

      {/* 性格 */}
      <FieldCard label="性格">
        <textarea
          value={data.personality}
          maxLength={MAX_PERSONALITY_LEN}
          onChange={(e) => patch({ personality: e.target.value })}
          placeholder="请输入性格描述..."
          rows={3}
          className="w-full resize-none bg-transparent text-base text-black outline-none placeholder:text-black/20"
        />
        <div className="self-end">
          <CharCount value={data.personality.length} max={MAX_PERSONALITY_LEN} />
        </div>
      </FieldCard>

      {/* 匿名身份标签 */}
      <FieldCard label="🎭 匿名身份标签">
        <AnonymousTags
          tags={data.anonymousTags}
          onChange={(tags) => patch({ anonymousTags: tags })}
        />
      </FieldCard>

      {/* 可见性 */}
      <FieldCard label="🔒 可见性">
        <div className="flex gap-2">
          {(['private', 'public'] as Visibility[]).map((v) => (
            <button
              key={v}
              onClick={() => patch({ visibility: v })}
              className={`rounded-[100px] px-4 py-1.5 text-sm ${
                data.visibility === v ? 'bg-black text-white' : 'border border-black/15'
              }`}
            >
              {v === 'private' ? '私密' : '公开'}
            </button>
          ))}
        </div>
      </FieldCard>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5">
      <h2 className="text-base font-semibold text-black/30">{children}</h2>
    </div>
  )
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[20px] border border-black/[0.06] bg-white p-3"
      >
        <span className="flex flex-col items-start gap-2">
          <span className="text-base font-medium text-black/50">{label}</span>
          <span className="text-base text-black">{current?.label ?? '请选择'}</span>
        </span>
        <span className="text-black/30">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-[16px] border border-black/[0.06] bg-white shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className="block w-full px-4 py-2.5 text-left text-base hover:bg-black/5"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VoiceSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string) => void
}) {
  const { data, isLoading } = useQuery({ queryKey: ['voices'], queryFn: listVoices })
  if (isLoading) return <span className="text-base text-black/30">加载音色…</span>
  const voices = data?.voices ?? []
  return (
    <div className="flex flex-wrap gap-2">
      {voices.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`flex items-center gap-1 rounded-[100px] px-3 py-1.5 text-sm ${
            value === v.id ? 'bg-black text-white' : 'border border-black/15'
          }`}
        >
          🔊 {v.name}
        </button>
      ))}
    </div>
  )
}

function AnonymousTags({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (!v || tags.includes(v) || tags.length >= 3) return
    onChange([...tags, v])
    setInput('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-[100px] bg-black/5 px-3 py-1 text-sm">
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-black/40">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-[16px] bg-[#f7f7f7] p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="请输入标签短语"
          disabled={tags.length >= 3}
          className="flex-1 bg-transparent text-base outline-none placeholder:text-black/20"
        />
        <button onClick={add} className="text-black/40">
          +
        </button>
      </div>
    </div>
  )
}
