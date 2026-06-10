import { useRef, useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { uploadImage } from '@/services/upload'
import { listMusic } from '@/services/mockData'
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
    <div className="flex w-[600px] flex-col gap-4">
      <div className="flex flex-col gap-0.5 px-3 py-1.5">
        <h2 className="font-misans text-[16px] text-black/30">新建动态</h2>
        <p className="font-misans-medium text-[14px] text-black/30">
          发布动态同时也会发布角色。为角色发布图片和文案，让粉丝看到更多内容。
        </p>
      </div>

      {/* 图片上传区 */}
      <div className="flex flex-col gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="group relative size-[138px] shrink-0">
              <img
                src={url}
                alt=""
                className="size-full rounded-[16px] object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-[12px] text-white opacity-0 transition group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
          {images.length < MAX_DYNAMIC_IMAGES && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex size-[138px] shrink-0 items-center justify-center rounded-[16px] border border-dashed border-black/[0.12] bg-black/[0.02] transition hover:bg-black/[0.04] disabled:opacity-40"
            >
              {uploading ? (
                <span className="font-misans text-[14px] text-black/30">上传中…</span>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <img src="/assets/icon-plus.svg" alt="添加" className="size-6 opacity-30" />
                  <span className="font-misans text-[12px] text-black/30">上传图片</span>
                </div>
              )}
            </button>
          )}
        </div>
        {images.length > 0 && (
          <p className="font-misans text-[12px] text-black/30">
            {images.length}/{MAX_DYNAMIC_IMAGES} 张图片
          </p>
        )}
      </div>

      {/* 文案输入 */}
      <div className="flex flex-col gap-2 rounded-[20px] border border-black/[0.06] bg-white p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
          placeholder="写点什么吧，可以是角色日常、心情、自拍文案..."
          rows={5}
          className="w-full resize-none bg-transparent font-misans-medium text-[16px] text-black outline-none placeholder:text-black/20"
        />
        <div className="flex items-center justify-between">
          <span className="font-misans text-[12px] text-black/30">
            {text.length}/{MAX_TEXT_LENGTH}
          </span>
        </div>
      </div>

      {/* 音乐选择（简化版，展示已选 / 添加入口） */}
      <MusicPicker musicId={musicId} onChange={setMusicId} />

      {/* 发布按钮 */}
      <button
        onClick={publish}
        disabled={!canPublish || publishing}
        className="flex h-[60px] w-full items-center justify-center rounded-[20px] bg-black font-misans-semibold text-[18px] text-white transition hover:opacity-90 disabled:opacity-30"
      >
        {publishing ? '发布中…' : '发布'}
      </button>

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
      <div className="flex items-center gap-2 rounded-[20px] border border-black/[0.06] bg-white px-4 py-3">
        <span className="text-[16px]">🎵</span>
        {selected ? (
          <div className="flex flex-1 items-center gap-2">
            <span className="font-misans-medium text-[14px] text-black">{selected.name}</span>
            <button
              onClick={() => onChange(null)}
              className="font-misans text-[12px] text-black/40 hover:text-black/70"
            >
              移除
            </button>
          </div>
        ) : (
          <button
            onClick={loadMusic}
            disabled={loading}
            className="font-misans-medium text-[14px] text-black/40 hover:text-black/70"
          >
            {loading ? '加载中…' : '添加背景音乐（可选）'}
          </button>
        )}
      </div>

      {open && (
        <div className="flex max-h-[200px] flex-col gap-1 overflow-auto rounded-[16px] border border-black/[0.06] bg-white p-3">
          {musicList.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onChange(m.id)
                setOpen(false)
              }}
              className={`flex items-center gap-2 rounded-[12px] px-3 py-2 text-left transition hover:bg-black/[0.03] ${
                m.id === musicId ? 'bg-black/[0.05]' : ''
              }`}
            >
              <span className="font-misans-medium text-[14px] text-black">{m.name}</span>
              <span className="font-misans text-[12px] text-black/30">
                {m.tags.join(' · ')}
              </span>
            </button>
          ))}
          {musicList.length === 0 && (
            <p className="py-4 text-center font-misans text-[14px] text-black/30">暂无音乐</p>
          )}
        </div>
      )}
    </div>
  )
}
