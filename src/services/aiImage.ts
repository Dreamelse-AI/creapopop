import { apiUrl, getToken } from './apiClient'

export type ImageAspect = '16:9' | '9:16' | '1:1'

export interface ImageTaskStatus {
  taskId: string
  status: 'queued' | 'running' | 'done' | 'error'
  progress?: number
  imageUrl?: string
  error?: string
}

const ASPECT_TO_SIZE: Record<ImageAspect, string> = {
  '16:9': '1536x864',
  '9:16': '864x1536',
  '1:1': '1024x1024',
}

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

function pickSubmitTaskId(resp: Record<string, unknown>): string | undefined {
  if (resp.id) return resp.id as string
  if (resp.task_id) return resp.task_id as string
  const d = resp.data as unknown
  if (Array.isArray(d)) return (d[0]?.task_id || d[0]?.id) as string | undefined
  if (d && typeof d === 'object') {
    const o = d as Record<string, unknown>
    return (o.task_id || o.id) as string | undefined
  }
  return undefined
}

function normalizeStatus(raw?: string): ImageTaskStatus['status'] {
  switch ((raw || '').toLowerCase()) {
    case 'submitted':
    case 'pending':
    case 'queued':
      return 'queued'
    case 'succeeded':
    case 'completed':
    case 'success':
    case 'done':
      return 'done'
    case 'failed':
    case 'error':
      return 'error'
    default:
      return 'running'
  }
}

function pickImageUrl(resp: Record<string, unknown>): string | undefined {
  const data = resp.data as Record<string, unknown> | undefined
  const inner = data && !Array.isArray(data) ? data : undefined
  const result = (inner?.result || resp.result) as { images?: { url?: string | string[] }[] } | undefined
  const first = result?.images?.[0]?.url
  return Array.isArray(first) ? first[0] : first
}

function pickStatus(resp: Record<string, unknown>): { status?: string; progress?: number } {
  if (resp.status) return { status: resp.status as string, progress: resp.progress as number }
  const d = resp.data as Record<string, unknown> | undefined
  if (d && !Array.isArray(d)) return { status: d.status as string, progress: d.progress as number }
  return {}
}

async function submitTask(prompt: string, aspect: ImageAspect, referenceImages?: string[]): Promise<string> {
  const body: Record<string, unknown> = {
    model: 'gpt-image-2',
    prompt,
    size: ASPECT_TO_SIZE[aspect],
    n: 1,
  }
  if (referenceImages?.length) {
    body.image = referenceImages.slice(0, 16)
    body.image_urls = referenceImages.slice(0, 16)
  }
  const res = await fetch(apiUrl('/api/ai/image/submit'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `提交失败 (${res.status})`)
  const taskId = pickSubmitTaskId(json)
  if (!taskId) throw new Error('未返回任务 ID')
  return taskId
}

async function pollTask(taskId: string): Promise<ImageTaskStatus> {
  const res = await fetch(apiUrl(`/api/ai/image/task/${encodeURIComponent(taskId)}`), {
    headers: headers(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { taskId, status: 'error', error: json.error || `查询失败 (${res.status})` }
  const { status: raw, progress } = pickStatus(json)
  const status = normalizeStatus(raw)
  if (status === 'done') {
    const imageUrl = pickImageUrl(json)
    if (!imageUrl) return { taskId, status: 'error', error: '完成但无图片 URL' }
    return { taskId, status: 'done', progress: 1, imageUrl }
  }
  if (status === 'error') return { taskId, status: 'error', error: '生成失败' }
  return { taskId, status, progress: typeof progress === 'number' ? progress : undefined }
}

// 提交 + 轮询直到完成/失败/超时
export async function generateImage(opts: {
  prompt: string
  aspect?: ImageAspect
  referenceImages?: string[]
  onUpdate?: (s: ImageTaskStatus) => void
  timeoutMs?: number
}): Promise<ImageTaskStatus> {
  const taskId = await submitTask(opts.prompt, opts.aspect || '9:16', opts.referenceImages)
  opts.onUpdate?.({ taskId, status: 'queued' })
  const deadline = Date.now() + (opts.timeoutMs ?? 180_000)
  while (Date.now() < deadline) {
    const s = await pollTask(taskId)
    opts.onUpdate?.(s)
    if (s.status === 'done' || s.status === 'error') return s
    await new Promise((r) => setTimeout(r, 2500))
  }
  return { taskId, status: 'error', error: '生成超时' }
}
