import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDraftStore } from '@/store/draftStore'
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

// 基本信息表单 — 严格对齐 Figma 框架（卡片式字段，点击触发交互），尺寸弹性。
export function BasicInfoSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)

  return (
    <div className="flex w-[600px] flex-col gap-2">
      <SectionTitle>角色基本信息</SectionTitle>
      <NameCard value={data.name} onChange={(name) => patch({ name })} />
      <TagsCard tags={data.tags} onChange={(tags) => patch({ tags })} />
      <div className="flex w-full gap-2">
        <SpeciesCard value={data.species} onChange={(species) => patch({ species })} />
        <GenderCard value={data.gender} onChange={(gender) => patch({ gender })} />
      </div>
      <VoiceCard value={data.voiceId} onChange={(voiceId) => patch({ voiceId })} />
      <TextAreaCard
        label="简介"
        value={data.intro}
        max={MAX_INTRO_LEN}
        placeholder="请输入角色简介..."
        onChange={(intro) => patch({ intro })}
      />
      <TextAreaCard
        label="性格"
        value={data.personality}
        max={MAX_PERSONALITY_LEN}
        placeholder="请输入性格描述..."
        onChange={(personality) => patch({ personality })}
      />
      <AnonymousCard
        tags={data.anonymousTags}
        onChange={(anonymousTags) => patch({ anonymousTags })}
      />
      <VisibilityCard value={data.visibility} onChange={(visibility) => patch({ visibility })} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-3 py-1.5">
      <h2 className="font-misans text-[16px] text-black/30">{children}</h2>
    </div>
  )
}

// 卡片外框（白底，圆角20，边框）
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`w-full rounded-[20px] border border-black/[0.06] bg-white p-3 ${className}`}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-misans-medium text-[16px] text-black/50">{children}</p>
}

// 名字：label + 大字输入（展示式）
function NameCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <FieldLabel>名字</FieldLabel>
        <input
          value={value}
          maxLength={MAX_NAME_LEN}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入角色名称..."
          className="font-misans-medium w-full bg-transparent text-[24px] text-black outline-none placeholder:text-black/20"
        />
      </div>
    </Card>
  )
}

// 标签：单行卡，label + 已选 pill + 右侧编辑图标，点击图标弹选择面板
function TagsCard({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const toggle = (tag: string) => {
    if (tags.includes(tag)) onChange(tags.filter((t) => t !== tag))
    else onChange([...tags, tag].slice(-MAX_TAGS))
  }

  return (
    <div className="relative w-full" ref={ref}>
      <Card className="flex min-h-[60px] items-center gap-2">
        <FieldLabel>标签</FieldLabel>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="font-misans-semibold rounded-[100px] bg-black/[0.04] px-2 py-1.5 text-[14px] text-black/50"
            >
              {t}
            </span>
          ))}
        </div>
        <button onClick={() => setOpen((v) => !v)} className="size-4 shrink-0" title="编辑标签">
          <img src="/assets/icon-tag-edit.svg" alt="" className="size-full" />
        </button>
      </Card>
      {open && (
        <div className="absolute z-20 mt-1 flex max-h-[280px] w-full flex-wrap gap-2 overflow-auto rounded-[16px] border border-black/[0.06] bg-white p-3 shadow-lg">
          {PRESET_TAGS.map((t) => {
            const active = tags.includes(t)
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                className={`font-misans-medium rounded-[100px] px-3 py-1.5 text-[14px] ${
                  active ? 'bg-black text-white' : 'bg-black/[0.04] text-black/60 hover:bg-black/[0.08]'
                }`}
              >
                {t}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// 选择卡（物种/性别）：label + 值/请选择 + 下拉箭头，点击弹 emoji 菜单
function SelectCard<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string; emoji: string }[]
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[20px] border border-black/[0.06] bg-white p-3"
      >
        <span className="flex flex-col items-start gap-2">
          <span className="font-misans-medium text-[16px] text-black/50">{label}</span>
          <span className={`font-misans-medium text-[16px] ${current ? 'text-black' : 'text-black/30'}`}>
            {current ? `${current.emoji} ${current.label}` : '请选择'}
          </span>
        </span>
        <img src="/assets/icon-arrow-right.svg" alt="" className="size-6 shrink-0 opacity-30" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 flex min-w-[175px] flex-col rounded-[20px] bg-white px-4 py-3 shadow-[0px_10px_30px_rgba(0,0,0,0.1)]">
          {options.map((o, i) => (
            <div key={o.value} className="flex flex-col">
              {i > 0 && <div className="h-px w-full bg-black/10" />}
              <button
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className="font-misans-heavy flex h-[52px] w-full items-center gap-3 text-black"
              >
                <span className="text-[24px] leading-none">{o.emoji}</span>
                <span className="whitespace-nowrap text-[16px]">{o.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SpeciesCard({ value, onChange }: { value: Species; onChange: (v: Species) => void }) {
  return <SelectCard label="物种" value={value} options={SPECIES_OPTIONS} onChange={onChange} />
}

function GenderCard({ value, onChange }: { value: Gender; onChange: (v: Gender) => void }) {
  return <SelectCard label="性别" value={value} options={GENDER_OPTIONS} onChange={onChange} />
}

// 音色：整行卡，label + 值/请选择 + 箭头，点击弹音色列表
function VoiceCard({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useQuery({ queryKey: ['voices'], queryFn: listVoices })
  const voices = data?.voices ?? []
  const current = voices.find((v) => v.id === value)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[20px] border border-black/[0.06] bg-white p-3"
      >
        <span className="flex flex-col items-start gap-2">
          <span className="font-misans-medium text-[16px] text-black/50">音色</span>
          <span className={`font-misans-medium text-[16px] ${current ? 'text-black' : 'text-black/30'}`}>
            {current ? current.name : '请选择'}
          </span>
        </span>
        <img src="/assets/icon-arrow-right.svg" alt="" className="size-6 shrink-0 opacity-30" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-[260px] w-full overflow-auto rounded-[16px] border border-black/[0.06] bg-white p-2 shadow-lg">
          {voices.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                onChange(v.id)
                setOpen(false)
              }}
              className="font-misans-medium flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-[16px] hover:bg-black/[0.04]"
            >
              🔊 {v.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 多行文本卡（简介/性格）
function TextAreaCard({
  label,
  value,
  max,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  max: number
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <FieldLabel>{label}</FieldLabel>
        <textarea
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="font-misans-medium w-full resize-none bg-transparent text-[16px] text-black outline-none placeholder:text-black/20"
        />
      </div>
    </Card>
  )
}

// 匿名身份标签：label + 内部灰底输入行
function AnonymousCard({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (!v || tags.includes(v) || tags.length >= 3) return
    onChange([...tags, v])
    setInput('')
  }
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <FieldLabel>🎭 匿名身份标签</FieldLabel>
        {tags.map((t, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[16px] bg-[#f7f7f7] p-3">
            <span className="font-misans-medium flex-1 text-[16px] text-black">{t}</span>
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="size-6 text-black/40">
              ×
            </button>
          </div>
        ))}
        {tags.length < 3 && (
          <div className="flex items-center gap-3 rounded-[16px] bg-[#f7f7f7] p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="请输入标签短语"
              className="font-misans-medium flex-1 bg-transparent text-[16px] text-black outline-none placeholder:text-black/20"
            />
            <button onClick={add} className="size-6 shrink-0" title="添加">
              <img src="/assets/icon-plus.svg" alt="添加" className="size-full" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

// 可见性：label + 值 + 箭头，点击切换 私密/公开
function VisibilityCard({
  value,
  onChange,
}: {
  value: Visibility
  onChange: (v: Visibility) => void
}) {
  return (
    <button
      onClick={() => onChange(value === 'private' ? 'public' : 'private')}
      className="flex w-full items-center justify-between rounded-[20px] border border-black/[0.06] bg-white p-3"
    >
      <span className="flex flex-col items-start gap-2">
        <span className="font-misans-medium text-[16px] text-black/50">🔒 可见性</span>
        <span className="font-misans-medium text-[16px] text-black">
          {value === 'private' ? '私密' : '公开'}
        </span>
      </span>
      <img src="/assets/icon-arrow-right.svg" alt="" className="size-6 shrink-0 opacity-30" />
    </button>
  )
}
