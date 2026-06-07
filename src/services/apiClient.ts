/**
 * 检测部署 base path。创作页未来融入平台时通过子路径挂载，
 * 所有 API 请求需带前缀路由到 creapopop node 代理（参考 newcreation basePath）。
 */
function detectBasePath(): string {
  if (typeof window === 'undefined') return ''
  const path = window.location.pathname
  const idx = path.indexOf('/creapopop')
  if (idx !== -1) return path.slice(0, idx) + '/creapopop'
  return ''
}

const _base = detectBasePath()

const TOKEN_KEY = 'creapopop_token'

export function getToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function apiUrl(path: string): string {
  return _base ? _base + path : path
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return parseJson<T>(text, path)
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { headers: authHeaders() })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return parseJson<T>(text, path)
}

function parseJson<T>(text: string, path: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`${path} bad JSON`)
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}: ${body.slice(0, 200)}`)
    this.name = 'ApiError'
  }
}
