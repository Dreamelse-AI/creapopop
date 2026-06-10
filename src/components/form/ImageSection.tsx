import { useEffect, useRef, useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { MAX_IMAGES } from '@/data/constants'
import type { CharacterImage } from '@/types/character'
import { generateImage } from '@/services/aiImage'
import { uploadImage } from '@/services/upload'
import { Spinner } from '@/components/ui/primitives'

// 形象：上传/AI生图构成虚拟形象库，可设为基础形象/删除。
// 框架对齐 Figma：头部(标题+计数+批量删除) + 138 网格(上传位弹方式菜单 + 图片悬浮操作)。

// 进行中的生图任务：在网格里占一个「生成中」的图块，完成后替换为真实图片。
interface PendingGen {
  id: string
  status: 'queued' | 'running' | 'error'
  error?: string
}

export function ImageSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const fileRef = useRef<HTMLInputElement>(null)
  const [prompt, setPrompt] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [methodOpen, setMethodOpen] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<PendingGen | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const count = data.images.length

  const addImage = (url: string, source: CharacterImage['source']) => {
    const img: CharacterImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url,
      source,
    }
    const images = [...data.images, img]
    patch({ images, primaryImageId: data.primaryImageId || img.id })
  }

  // 点「生成」：立刻关闭弹窗 + 在网格插入「生成中」图块，生图在后台跑，完成后替换。
  const runGenerate = async () => {
    const p = prompt.trim()
    if (!p || pending || count >= MAX_IMAGES) return
    setGenError(null)
    const genId = `gen_${Date.now()}`
    setPending({ id: genId, status: 'queued' })
    setPrompt('')
    setAiOpen(false)

    const result = await generateImage({
      prompt: p,
      aspect: '9:16',
      onUpdate: (s) => {
        if (s.status === 'queued' || s.status === 'running') {
          const st = s.status
          setPending((prev) => (prev && prev.id === genId ? { ...prev, status: st } : prev))
        }
      },
    })

    if (result.status === 'done' && result.imageUrl) {
      addImage(result.imageUrl, 'ai')
      setPending(null)
      setViewerOpen(false)
    } else {
      setPending({ id: genId, status: 'error', error: result.error || '生成失败' })
    }
  }

  const retryGenerate = () => {
    setPending(null)
    setViewerOpen(false)
    setAiOpen(true)
  }

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const room = MAX_IMAGES - count
    const picked = Array.from(files).slice(0, room)
    if (!picked.length) return
    setUploading(true)
    const newImgs: CharacterImage[] = []
    for (const f of picked) {
      try {
        const { url } = await uploadImage(f)
        newImgs.push({ id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, url, source: 'upload' })
      } catch (e) {
        setGenError(e instanceof Error ? e.message : '上传失败')
      }
    }
    setUploading(false)
    if (!newImgs.length) return
    const images = [...data.images, ...newImgs]
    patch({ images, primaryImageId: data.primaryImageId || images[0]?.id || null })
  }

  const remove = (ids: string[]) => {
    const idSet = new Set(ids)
    const images = data.images.filter((i) => !idSet.has(i.id))
    patch({
      images,
      primaryImageId: idSet.has(data.primaryImageId ?? '')
        ? images[0]?.id || null
        : data.primaryImageId,
    })
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitBatch = () => {
    setBatchMode(false)
    setSelected(new Set())
  }

  return (
    <div className="flex w-[600px] flex-col gap-4">
      {/* 头部：标题 + 计数徽标 + 说明 / 批量删除 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-0.5 px-3 py-1.5">
          <div className="flex items-center gap-1">
            <h2 className="font-misans text-[16px] text-black/30">角色形象</h2>
            <span className="rounded-[100px] bg-black/20 px-1.5 py-0.5 font-misans-semibold text-[12px] text-white">
              {count}/{MAX_IMAGES}
            </span>
          </div>
          <p className="font-misans-medium text-[14px] text-black/30">
            上传的图片不会直接对用户可见，图片打完标签后将在角色日常中被使用。
          </p>
        </div>
        {count > 0 &&
          (batchMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selected.size) remove([...selected])
                  exitBatch()
                }}
                disabled={selected.size === 0}
                className="flex h-9 items-center justify-center rounded-[100px] bg-[#ff3c00] px-4 font-misans-medium text-[16px] text-white disabled:opacity-30"
              >
                删除{selected.size > 0 ? ` ${selected.size}` : ''}
              </button>
              <button
                onClick={exitBatch}
                className="flex h-9 items-center justify-center rounded-[100px] border border-black/[0.06] bg-white px-4 font-misans-medium text-[16px] text-black"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setBatchMode(true)}
              className="flex h-9 items-center justify-center rounded-[100px] border border-black/[0.06] bg-white px-4 font-misans-medium text-[16px] text-black"
            >
              批量删除
            </button>
          ))}
      </div>

      {/* 网格 */}
      <div className="flex flex-wrap content-start gap-2">
        {/* 上传位：点击弹出方式菜单 */}
        {!batchMode && count < MAX_IMAGES && (
          <div className="relative size-[138px] shrink-0">
            <button
              onClick={() => setMethodOpen((v) => !v)}
              disabled={uploading}
              className="flex size-full flex-col items-center justify-center gap-1 rounded-[20px] border border-black/[0.06] bg-black/[0.03] transition hover:bg-black/[0.06] disabled:opacity-60"
              title="添加形象"
            >
              {uploading ? (
                <>
                  <Spinner size={24} className="text-black/30" />
                  <span className="font-misans text-[12px] text-black/30">上传中…</span>
                </>
              ) : (
                <img src="/assets/icon-plus.svg" alt="添加" className="size-8" />
              )}
            </button>
            {methodOpen && (
              <UploadMethodMenu
                onClose={() => setMethodOpen(false)}
                onLocal={() => {
                  setMethodOpen(false)
                  fileRef.current?.click()
                }}
                onAi={() => {
                  setMethodOpen(false)
                  setAiOpen(true)
                }}
              />
            )}
          </div>
        )}

        {data.images.map((img) => (
          <ImageTile
            key={img.id}
            image={img}
            isPrimary={img.id === data.primaryImageId}
            batchMode={batchMode}
            checked={selected.has(img.id)}
            onToggleSelect={() => toggleSelect(img.id)}
            onSetPrimary={() => patch({ primaryImageId: img.id })}
            onDelete={() => remove([img.id])}
          />
        ))}

        {/* 生成中 / 生成失败的占位图块 */}
        {pending && (
          <GeneratingTile
            status={pending.status}
            onClick={() => setViewerOpen(true)}
            onRetry={retryGenerate}
            onDismiss={() => setPending(null)}
          />
        )}
      </div>

      {/* 生成中大图蒙层 */}
      {viewerOpen && pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute left-5 top-5 flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label="关闭"
          >
            <CloseIcon />
          </button>
          <div className="flex h-[80vh] max-h-[720px] w-[min(420px,90vw)] flex-col items-center justify-center gap-4 rounded-[24px] bg-white/[0.06]">
            {pending.status === 'error' ? (
              <div className="flex flex-col items-center gap-4">
                <p className="font-misans text-[16px] text-white/70">{pending.error || '生成失败'}</p>
                <button
                  onClick={retryGenerate}
                  className="rounded-[100px] bg-white px-6 py-2.5 font-misans-semibold text-[16px] text-black"
                >
                  重试
                </button>
              </div>
            ) : (
              <>
                <Spinner size={48} className="text-white/70" />
                <p className="font-misans text-[16px] text-white/70">生成中…</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI 生图弹窗 */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 py-10">
          <div className="flex w-[422px] flex-col rounded-[30px] bg-[#f7f7f7] py-4">
            <div className="flex items-start justify-between px-4 py-2">
              <p className="font-black-han text-[24px] text-black">AI生图</p>
              <button onClick={() => setAiOpen(false)} className="text-2xl leading-none text-black/40">
                ×
              </button>
            </div>
            <div className="flex h-[400px] flex-col px-4 py-2">
              <div className="flex flex-1 flex-col gap-3 rounded-[20px] border border-black/[0.06] bg-white px-4 pb-4 pt-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入角色形象描述"
                  className="flex-1 resize-none bg-transparent font-misans text-[16px] text-black outline-none placeholder:text-black/20"
                />
                <div className="flex items-center justify-between">
                  <span className="font-misans text-[12px] text-black/30">
                    {count}/{MAX_IMAGES}
                  </span>
                </div>
                {genError && (
                  <div className="flex items-center justify-between rounded-[12px] bg-red-50 px-3 py-2">
                    <span className="font-misans text-[14px] text-red-500">{genError}</span>
                    <button onClick={runGenerate} className="font-misans text-[14px] text-red-500 underline">
                      重试
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-end justify-center p-3">
                <button
                  onClick={runGenerate}
                  disabled={!prompt.trim() || count >= MAX_IMAGES || !!pending}
                  className="flex h-[60px] flex-1 items-center justify-center rounded-[20px] bg-black font-misans-semibold text-[18px] text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  生成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
    </div>
  )
}

// 关闭图标（内联 SVG）
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// 生成中 / 失败的占位图块
function GeneratingTile({
  status,
  onClick,
  onRetry,
  onDismiss,
}: {
  status: 'queued' | 'running' | 'error'
  onClick: () => void
  onRetry: () => void
  onDismiss: () => void
}) {
  if (status === 'error') {
    return (
      <div className="relative flex size-[138px] shrink-0 flex-col items-center justify-center gap-2 rounded-[20px] border border-black/[0.06] bg-black/[0.03]">
        <span className="font-misans text-[13px] text-black/40">生成失败</span>
        <div className="flex items-center gap-2">
          <button onClick={onRetry} className="font-misans-medium text-[13px] text-black underline">
            重试
          </button>
          <button onClick={onDismiss} className="font-misans-medium text-[13px] text-black/30">
            移除
          </button>
        </div>
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      className="flex size-[138px] shrink-0 flex-col items-center justify-center gap-2 rounded-[20px] border border-black/[0.06] bg-black/[0.03] transition hover:bg-black/[0.06]"
      title="查看大图"
    >
      <Spinner size={28} className="text-black/30" />
      <span className="font-misans text-[12px] text-black/40">
        {status === 'queued' ? '排队中…' : '生成中…'}
      </span>
    </button>
  )
}


function UploadMethodMenu({
  onClose,
  onLocal,
  onAi,
}: {
  onClose: () => void
  onLocal: () => void
  onAi: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-[142px] z-20 flex w-[175px] flex-col rounded-[20px] bg-white px-4 py-3 shadow-[0px_10px_30px_rgba(0,0,0,0.1)]"
    >
      <button onClick={onLocal} className="flex h-10 items-center gap-2 rounded-[12px] py-1.5">
        <img src="/assets/icon-gallery.svg" alt="" className="size-6" />
        <span className="font-misans-heavy text-[16px] text-black">从本地上传</span>
      </button>
      <div className="my-1 h-px w-full bg-black/10" />
      <button onClick={onAi} className="flex h-10 items-center gap-2 rounded-[12px] py-1.5">
        <span className="flex size-6 items-center justify-center text-[16px]">✨</span>
        <span className="font-misans-heavy text-[16px] text-black">AI生图</span>
      </button>
    </div>
  )
}

// 单个图片格子：悬浮操作菜单(设为基础形象/删除)，批量模式显示勾选。
function ImageTile({
  image,
  isPrimary,
  batchMode,
  checked,
  onToggleSelect,
  onSetPrimary,
  onDelete,
}: {
  image: CharacterImage
  isPrimary: boolean
  batchMode: boolean
  checked: boolean
  onToggleSelect: () => void
  onSetPrimary: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={ref} className="relative size-[138px] shrink-0">
      <button
        onClick={() => (batchMode ? onToggleSelect() : setMenuOpen((v) => !v))}
        className="block size-full overflow-hidden rounded-[20px] border border-black/[0.06]"
      >
        <img src={image.url} alt="" className="size-full object-cover" />
      </button>

      {isPrimary && (
        <span className="pointer-events-none absolute left-1 top-1 rounded-[100px] bg-[rgba(48,48,48,0.9)] px-2 py-1 font-misans-bold text-[12px] text-white">
          基本图像
        </span>
      )}

      {batchMode && (
        <span
          className={`pointer-events-none absolute right-2 top-2 flex size-5 items-center justify-center rounded-full border-2 ${
            checked ? 'border-[#ff3c00] bg-[#ff3c00] text-white' : 'border-white bg-black/20'
          }`}
        >
          {checked && <span className="text-[12px] leading-none">✓</span>}
        </span>
      )}

      {!batchMode && menuOpen && (
        <div className="absolute left-0 top-[142px] z-20 flex w-[175px] flex-col rounded-[20px] bg-white px-4 py-3 shadow-[0px_10px_30px_rgba(0,0,0,0.1)]">
          {!isPrimary && (
            <>
              <button
                onClick={() => {
                  onSetPrimary()
                  setMenuOpen(false)
                }}
                className="flex h-10 items-center gap-2 rounded-[12px] py-1.5"
              >
                <img src="/assets/icon-user.svg" alt="" className="size-6" />
                <span className="font-misans-medium text-[16px] text-black">设为基础形象</span>
              </button>
              <div className="my-1 h-px w-full bg-black/10" />
            </>
          )}
          <button
            onClick={() => {
              onDelete()
              setMenuOpen(false)
            }}
            className="flex h-10 items-center gap-2 rounded-[12px] py-1.5"
          >
            <img src="/assets/icon-delete-dark.svg" alt="" className="size-6" />
            <span className="font-misans-medium text-[16px] text-[#ff3c00]">删除</span>
          </button>
        </div>
      )}
    </div>
  )
}
