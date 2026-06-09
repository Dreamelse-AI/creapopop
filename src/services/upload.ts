import { apiUrl, arcaPost, getToken } from './apiClient'

/**
 * 文件上传 — 对齐 Arca 存储范式。
 *
 * 对应 arca.api: POST /file/tos_credential (GetTosUploadCredentialReq) → GetTosUploadCredentialResp
 * 流程：1) 向 Arca 拿火山 TOS 临时凭证 → 2) 客户端直传 TOS → 3) 业务数据只存 url
 *
 * Arca 不可用时回退临时后端 POST /api/file/upload（base64 落盘）。
 * 调用方（ImageSection）不需要改动，接口签名保持不变。
 */
export interface UploadedMedia {
  url: string
  width?: number
  height?: number
}

interface TosCredential {
  access_key_id: string
  secret_access_key: string
  session_token: string
  bucket: string
  region: string
  endpoint: string
  expires_in: number
}

let _cachedCred: TosCredential | null = null
let _credExpiresAt = 0

async function getTosCredential(): Promise<TosCredential> {
  const now = Date.now()
  if (_cachedCred && _credExpiresAt > now + 60_000) {
    return _cachedCred
  }
  const cred = await arcaPost<TosCredential>('/file/tos_credential', {})
  _cachedCred = cred
  _credExpiresAt = now + cred.expires_in * 1000
  return cred
}

function generateObjectKey(file: File): string {
  const ext = file.name.split('.').pop() || 'png'
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 10)
  return `creapopop/uploads/${ts}_${rand}.${ext}`
}

/**
 * 直传文件到火山 TOS（S3 兼容 PUT），使用 STS 临时凭证。
 * TOS S3 兼容接口：PUT https://{bucket}.{endpoint}/{objectKey}
 */
async function putToTos(cred: TosCredential, objectKey: string, file: File): Promise<string> {
  const url = `https://${cred.bucket}.${cred.endpoint}/${objectKey}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-amz-security-token': cred.session_token,
      'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
    },
    body: file,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`TOS 上传失败 (${res.status}): ${text.slice(0, 200)}`)
  }
  return url
}

/** 回退：临时后端 base64 上传 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadViaLocalServer(file: File): Promise<UploadedMedia> {
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

export async function uploadImage(file: File): Promise<UploadedMedia> {
  // 优先 Arca TOS 直传，失败回退临时后端
  try {
    const cred = await getTosCredential()
    const objectKey = generateObjectKey(file)
    const url = await putToTos(cred, objectKey, file)
    return { url }
  } catch {
    return uploadViaLocalServer(file)
  }
}
