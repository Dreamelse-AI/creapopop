import { useRef } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { MAX_IMAGES } from '@/data/constants'
import type { CharacterImage } from '@/types/character'

// 形象：本地上传（P0，转 dataURL 暂存）。AI 生图在 P1 接入。
// 已上传图片构成虚拟形象库，可设为基础形象/删除。
export function ImageSection() {
  const data = useDraftStore((s) => s.data)!
  const patch = useDraftStore((s) => s.patch)
  const fileRef = useRef<HTMLInputElement>(null)

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
    <div className="flex w-[600px] flex-col gap-3">
      <div className="px-3 py-1.5">
        <h2 className="text-base font-semibold text-black/30">角色形象（必填）</h2>
      </div>

      {data.images.length === 0 && (
        <p className="px-3 text-sm text-black/40">上传角色形象图，至少一张。最多 {MAX_IMAGES} 张。</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {data.images.map((img) => {
          const isPrimary = img.id === data.primaryImageId
          return (
            <div
              key={img.id}
              className={`relative aspect-square overflow-hidden rounded-[16px] border-2 ${
                isPrimary ? 'border-black' : 'border-transparent'
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 px-2 py-1">
                <button
                  onClick={() => patch({ primaryImageId: img.id })}
                  className="text-xs text-white"
                >
                  {isPrimary ? '基础形象' : '设为基础'}
                </button>
                <button onClick={() => remove(img.id)} className="text-xs text-white">
                  删除
                </button>
              </div>
            </div>
          )
        })}

        {data.images.length < MAX_IMAGES && (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-[16px] border border-dashed border-black/20 text-black/40 hover:bg-black/5"
          >
            + 上传
          </button>
        )}
      </div>

      <p className="px-3 text-xs text-black/30">AI 生图将在 P1 接入。</p>

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
