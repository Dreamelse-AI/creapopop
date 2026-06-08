import { useRef, useState } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { MAX_IMAGES } from '@/data/constants'
import type { CharacterImage } from '@/types/character'
import { generateImage, type ImageTaskStatus } from '@/services/aiImage'

// 形象：本地上传（P0，转 dataURL 暂存）。AI 生图在 P1 接入。
// 已上传图片构成虚拟形象库，可设为基础形象/删除。
export function ImageSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const fileRef = useRef<HTMLInputElement>(null)
  const [prompt, setPrompt] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [genStatus, setGenStatus] = useState<ImageTaskStatus | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  const generating = genStatus?.status === 'queued' || genStatus?.status === 'running'

  const addImage = (url: string, source: CharacterImage['source']) => {
    const img: CharacterImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url,
      source,
    }
    const images = [...data.images, img]
    patch({ images, primaryImageId: data.primaryImageId || img.id })
  }

  const runGenerate = async () => {
    if (!prompt.trim() || generating || data.images.length >= MAX_IMAGES) return
    setGenError(null)
    const result = await generateImage({
      prompt: prompt.trim(),
      aspect: '9:16',
      onUpdate: setGenStatus,
    })
    if (result.status === 'done' && result.imageUrl) {
      addImage(result.imageUrl, 'ai')
      setPrompt('')
      setGenStatus(null)
      setAiOpen(false)
    } else {
      setGenError(result.error || '生成失败')
      setGenStatus(null)
    }
  }

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const room = MAX_IMAGES - data.images.length
    const picked = Array.from(files).slice(0, room)
    const newImgs: CharacterImage[] = []
    for (const f of picked) {
      const url = await fileToDataUrl(f)
      newImgs.push({ id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, url, source: 'upload' })
    }
    const images = [...data.images, ...newImgs]
    patch({
      images,
      primaryImageId: data.primaryImageId || images[0]?.id || null,
    })
  }

  const remove = (id: string) => {
    const images = data.images.filter((i) => i.id !== id)
    patch({
      images,
      primaryImageId:
        data.primaryImageId === id ? images[0]?.id || null : data.primaryImageId,
    })
  }

  return (
    <div className="flex w-[600px] flex-col gap-4">
      <div className="flex flex-col gap-0.5 px-3 py-1.5">
        <h2 className="text-base font-semibold text-black/30">角色形象</h2>
        <p className="text-sm font-medium text-black/30">
          上传的图片不会直接对用户可见，图片打完标签后将在角色日常中被使用。
        </p>
      </div>

      <div className="flex flex-wrap content-start gap-2">
        {/* 上传 / 生成入口 */}
        {data.images.length < MAX_IMAGES && (
          <div className="flex size-[138px] shrink-0 flex-col gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center rounded-[20px] border border-black/[0.06] bg-black/[0.03] text-black/30 hover:bg-black/[0.06]"
              title="上传图片"
            >
              <span className="text-2xl font-light">+</span>
            </button>
          </div>
        )}

        {data.images.map((img) => {
          const isPrimary = img.id === data.primaryImageId
          return (
            <div
              key={img.id}
              className="group relative size-[138px] shrink-0 overflow-hidden rounded-[20px] border border-black/[0.06]"
            >
              <img src={img.url} alt="" className="size-full object-cover" />
              {isPrimary && (
                <span className="absolute right-1 top-1 rounded-[100px] bg-[rgba(48,48,48,0.9)] px-2 py-1 text-xs font-bold text-white">
                  基本图像
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 px-2 py-1 opacity-0 transition group-hover:opacity-100">
                {!isPrimary && (
                  <button
                    onClick={() => patch({ primaryImageId: img.id })}
                    className="text-xs text-white"
                  >
                    设为基础
                  </button>
                )}
                <button onClick={() => remove(img.id)} className="ml-auto text-xs text-white">
                  删除
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* AI 生图入口按钮 */}
      <button
        onClick={() => setAiOpen(true)}
        disabled={data.images.length >= MAX_IMAGES}
        className="flex h-[60px] items-center justify-center gap-1 rounded-[20px] bg-black text-[18px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        ✨ AI 生图
      </button>

      {/* AI 生图弹窗 */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 py-10">
          <div className="flex w-[422px] flex-col rounded-[30px] bg-[#f7f7f7] py-4">
            <div className="flex items-start justify-between px-4 py-2">
              <p className="text-2xl font-black text-black">AI生图</p>
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
                  disabled={generating}
                  className="flex-1 resize-none bg-transparent text-base text-black outline-none placeholder:text-black/20 disabled:opacity-50"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/30">
                    {generating
                      ? genStatus?.status === 'queued'
                        ? '排队中…'
                        : `生成中…${genStatus?.progress ? Math.round(genStatus.progress * 100) + '%' : ''}`
                      : `${data.images.length}/${MAX_IMAGES}`}
                  </span>
                </div>
                {genError && (
                  <div className="flex items-center justify-between rounded-[12px] bg-red-50 px-3 py-2">
                    <span className="text-sm text-red-500">{genError}</span>
                    <button onClick={runGenerate} className="text-sm text-red-500 underline">
                      重试
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-end justify-center p-3">
                <button
                  onClick={runGenerate}
                  disabled={generating || !prompt.trim() || data.images.length >= MAX_IMAGES}
                  className="flex h-[60px] flex-1 items-center justify-center rounded-[20px] bg-black text-[18px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {generating ? '生成中…' : '生成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
