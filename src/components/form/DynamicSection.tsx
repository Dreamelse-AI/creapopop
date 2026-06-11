import { useRef, useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { uploadImage } from '@/services/upload'
import { listMusic } from '@/services/mockData'
import { Spinner } from '@/components/ui/primitives'
import type { CharacterDynamic } from '@/types/character'

const MAX_DYNAMIC_IMAGES = 9
const MAX_TEXT_LENGTH = 500

export function DynamicSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const fileRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [musicId, setMusicId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const canPublish = text.trim().length > 0 || images.length > 0

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const room = MAX_DYNAMIC_IMAGES - images.length
    const picked = Array.from(files).slice(0, room)
    if (!picked.length) return
    setUploading(true)
    const urls: string[] = []
    for (const f of picked) {
      try {
        const { url } = await uploadImage(f)
        urls.push(url)
      } catch {
        // skip failed
      }
    }
    setImages((prev) => [...prev, ...urls])
    setUploading(false)
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const publish = async () => {
    if (!canPublish || publishing) return
    setPublishing(true)
    const dynamic: CharacterDynamic = {
      id: `dyn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      images,
      musicId,
      createdAt: Date.now(),
    }
    patch({ dynamics: [...data.dynamics, dynamic] })
    setText('')
    setImages([])
    setMusicId(null)
    setPublishing(false)
  }

  return (
    <div className="flex w-[600px] flex-col gap-2">
      {/* 标题 + 计数徽标 */}
      <div className="flex items-center gap-1 px-3 py-1.5">
        <h2 className="font-misans-medium text-[16px] text-black/30">发布动态</h2>
        {images.length > 0 && (
          <span className="rounded-[100px] bg-black/20 px-1.5 py-0.5 font-misans-semibold text-[12px] text-white">
            图片 {images.length}/{MAX_DYNAMIC_IMAGES}
          </span>
        )}
      </div>

      {/* 图片网格 */}
      <div className="flex flex-wrap content-start gap-2">
        {images.map((url, i) => (
          <div key={i} className="group relative size-[144px] shrink-0 rounded-[20px] border border-black/[0.06]">
            <img src={url} alt="" className="size-full rounded-[20px] object-cover" />
            <button
              onClick={() => removeImage(i)}
              className="absolute -right-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full bg-black/70 text-[12px] text-white opacity-0 transition group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < MAX_DYNAMIC_IMAGES && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex size-[144px] shrink-0 items-center justify-center rounded-[20px] border border-black/[0.06] bg-white transition hover:bg-black/[0.02] disabled:opacity-40"
          >
            {uploading ? (
              <Spinner size={20} className="text-black/30" />
            ) : (
              <img src="/assets/icon-plus.svg" alt="添加" className="size-12 opacity-30" />
            )}
          </button>
        )}
      </div>

      {/* 文案输入 */}
      <div className="rounded-[20px] border border-black/[0.06] bg-white px-4 pb-4 pt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
          placeholder="캐릭터 설명을 입력해 주세요..."
          rows={3}
          className="w-full resize-none bg-transparent font-misans-medium text-[14px] text-black outline-none placeholder:text-black/20"
        />
      </div>

      {/* 音乐选择栏 */}
      <MusicPicker musicId={musicId} onChange={setMusicId} />

      {/* 发布按钮 */}
      <div className="flex items-end justify-center p-3">
        <button
          onClick={publish}
          disabled={!canPublish || publishing}
          className={`flex h-[60px] flex-1 items-center justify-center gap-1 rounded-[20px] bg-black px-5 py-4 transition ${
            canPublish ? '' : 'opacity-20'
          } disabled:pointer-events-none`}
        >
          {publishing && <Spinner size={18} className="text-white" />}
          <span className="font-misans-semibold text-[18px] text-white">
            {publishing ? '发布中…' : '发布'}
          </span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  )
}

function MusicPicker({
  musicId,
  onChange,
}: {
  musicId: string | null
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [musicList, setMusicList] = useState<{ id: string; name: string; tags: string[] }[]>([])
  const [loading, setLoading] = useState(false)

  const loadMusic = async () => {
    if (musicList.length > 0) {
      setOpen(true)
      return
    }
    setLoading(true)
    try {
      const { music } = await listMusic()
      setMusicList(music)
      setOpen(true)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const selected = musicList.find((m) => m.id === musicId)

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={selected ? () => onChange(null) : loadMusic}
        disabled={loading}
        className="flex h-[60px] items-center justify-between rounded-[20px] border border-black/[0.06] bg-white px-3 backdrop-blur-[25px]"
      >
        <div className="flex items-center gap-1">
          <span className="text-[16px]">🎵</span>
          <span className="font-misans-medium text-[16px] text-black/50">
            {loading ? '加载中…' : selected ? selected.name : '음악을 선택하세요'}
          </span>
        </div>
        {selected ? (
          <span className="font-misans text-[12px] text-black/30">移除</span>
        ) : (
          <img src="/assets/icon-chevron-right.svg" alt="" className="size-6 opacity-50" />
        )}
      </button>

      {open && !selected && (
        <div className="flex max-h-[200px] flex-col gap-1 overflow-auto rounded-[20px] border border-black/[0.06] bg-white p-3">
          {musicList.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onChange(m.id)
                setOpen(false)
              }}
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-left transition hover:bg-black/[0.03]"
            >
              <span className="font-misans-medium text-[14px] text-black">{m.name}</span>
              <span className="font-misans text-[12px] text-black/30">{m.tags.join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
