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

// ===== AWS SigV4（S3 兼容）签名工具：用于火山 TOS S3 协议直传 =====
// 火山 TOS S3 兼容：算法 AWS4-HMAC-SHA256，service=s3，header x-amz-*，VirtualHostStyle。

async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const buf: ArrayBuffer = typeof data === 'string' ? toAB(new TextEncoder().encode(data)) : data
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmac(key: ArrayBuffer, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg))
}

// 把 Uint8Array 转为独立的 ArrayBuffer（规避 SharedArrayBuffer 类型不兼容）
function toAB(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer
}

/**
 * 直传文件到火山 TOS（S3 兼容 PUT + AWS SigV4 签名），使用 STS 临时凭证。
 * VirtualHostStyle：PUT https://{bucket}.{s3-host}/{objectKey}
 */
async function putToTos(cred: TosCredential, objectKey: string, file: File): Promise<string> {
  const region = cred.region
  // endpoint 规整为纯 host；确保是 S3 协议域名（tos-s3-*），否则按 region 兜底推导
  let host = cred.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!host.includes('tos-s3')) {
    host = `tos-s3-${region}.volces.com`
  }
  const vhost = `${cred.bucket}.${host}`
  const url = `https://${vhost}/${objectKey}`

  const body = await file.arrayBuffer()
  const payloadHash = await sha256Hex(body)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '') // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8) // YYYYMMDD
  const contentType = file.type || 'application/octet-stream'

  // 规范请求：header 必须按 key 字母序，且与 signedHeaders 一致
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${vhost}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-security-token:${cred.session_token}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token'
  const canonicalRequest = `PUT\n/${objectKey}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

  const algorithm = 'AWS4-HMAC-SHA256'
  const scope = `${dateStamp}/${region}/s3/request`
  const stringToSign = `${algorithm}\n${amzDate}\n${scope}\n${await sha256Hex(canonicalRequest)}`

  // 派生签名密钥
  const kDate = await hmac(toAB(new TextEncoder().encode(`AWS4${cred.secret_access_key}`)), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, 's3')
  const kSigning = await hmac(kService, 'request')
  const sigBuf = await hmac(kSigning, stringToSign)
  const signature = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, '0')).join('')

  const authorization =
    `${algorithm} Credential=${cred.access_key_id}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'x-amz-security-token': cred.session_token,
      Authorization: authorization,
    },
    body,
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
  // 优先 Arca TOS 直传（返回 bucket url），失败再回退临时后端兜底
  try {
    const cred = await getTosCredential()
    const objectKey = generateObjectKey(file)
    const url = await putToTos(cred, objectKey, file)
    return { url }
  } catch (e) {
    console.error('[upload] TOS 直传失败，回退临时后端：', e)
    return uploadViaLocalServer(file)
  }
}
