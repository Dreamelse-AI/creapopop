import { apiUrl, getToken } from './apiClient'

/**
 * 文件上传 — 把本地选中的图片传到后端，业务数据只保存返回的短 url。
 *
 * 对齐 Arca 存储范式（arca.api: POST /file/tos_credential → 直传 TOS → Media.url）。
 * 当前走临时后端 /api/file/upload；后续接专业后端时，仅替换本文件实现为
 * 「拿 TOS 凭证 + 直传对象存储」，调用方（ImageSection）无需改动。
 */
export interface UploadedMedia {
  url: string
  width?: number
  height?: number
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadImage(file: File): Promise<UploadedMedia> {
  const dataUrl = await fileToDataUrl(file)
  const res = await fetch(apiUrl('/api/file/upload'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: JSON.stringify({ dataUrl }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `上传失败 (${res.status})`)
  if (!json.url) throw new Error('上传未返回 url')
  return { url: json.url as string, width: json.width, height: json.height }
}
