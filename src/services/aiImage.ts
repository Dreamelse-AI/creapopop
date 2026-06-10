import { apiUrl, arcaPost, getToken } from './apiClient'

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

// ========== Arca 链路：gen_appearance + task/get_status ==========

interface ArcaTaskSubmitResp { task_id: string }
interface ArcaTaskStatusResp {
  task_id: string
  status: string
  result?: string
  error_message?: string
}

async function arcaSubmitImage(prompt: string, _aspect: ImageAspect, characterId?: string): Promise<string> {
  const body: Record<string, unknown> = {
    description: prompt,
    style_name: '写实',
  }
  if (characterId) body.character_id = characterId
  const resp = await arcaPost<ArcaTaskSubmitResp>('/character/gen_appearance', body)
  return resp.task_id
}

async function arcaPollTask(taskId: string): Promise<ImageTaskStatus> {
  const resp = await arcaPost<ArcaTaskStatusResp>('/task/get_status', { task_id: taskId })
  const s = resp.status?.toLowerCase()
  if (s === 'ready' || s === 'done' || s === 'succeeded') {
    let imageUrl: string | undefined
    if (resp.result) {
      try {
        const r = JSON.parse(resp.result)
        imageUrl = r.url || r.image_url || r.images?.[0]?.url
      } catch { /* */ }
    }
    if (!imageUrl) return { taskId, status: 'error', error: '完成但无图片 URL' }
    return { taskId, status: 'done', progress: 1, imageUrl }
  }
  if (s === 'failed') return { taskId, status: 'error', error: resp.error_message || '生成失败' }
  return { taskId, status: 'running' }
}

// ========== 临时后端链路（fallback）==========

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
    case 'submitted': case 'pending': case 'queued': return 'queued'
    case 'succeeded': case 'completed': case 'success': case 'done': return 'done'
    case 'failed': case 'error': return 'error'
    default: return 'running'
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

async function localSubmitTask(prompt: string, aspect: ImageAspect, referenceImages?: string[]): Promise<string> {
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

async function localPollTask(taskId: string): Promise<ImageTaskStatus> {
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

// ========== 公开 API：优先 Arca，失败 fallback 临时后端 ==========

export async function generateImage(opts: {
  prompt: string
  aspect?: ImageAspect
  characterId?: string
  referenceImages?: string[]
  onUpdate?: (s: ImageTaskStatus) => void
  timeoutMs?: number
}): Promise<ImageTaskStatus> {
  const aspect = opts.aspect || '9:16'
  let taskId: string
  let useArca = true

  try {
    taskId = await arcaSubmitImage(opts.prompt, aspect, opts.characterId)
    console.info('[AI生图] ✅ 走 Arca 后端 (gen_appearance)')
  } catch (e) {
    useArca = false
    console.warn('[AI生图] ⚠️ Arca 失败，回退临时后端 (APIMart)。原因：', e)
    taskId = await localSubmitTask(opts.prompt, aspect, opts.referenceImages)
  }

  opts.onUpdate?.({ taskId, status: 'queued' })
  const deadline = Date.now() + (opts.timeoutMs ?? 180_000)
  while (Date.now() < deadline) {
    const s = useArca ? await arcaPollTask(taskId) : await localPollTask(taskId)
    opts.onUpdate?.(s)
    if (s.status === 'done' || s.status === 'error') return s
    await new Promise((r) => setTimeout(r, 2500))
  }
  return { taskId, status: 'error', error: '生成超时' }
}
