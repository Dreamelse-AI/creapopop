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

/**
 * Arca 正式后端 baseURL。
 * 开发期 /api（vite proxy → i18n-api.imaginewithu.com），生产构建直接用域名。
 * 对齐 popop-fe 的 api-client 方案。
 */
const ARCA_BASE = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'https://i18n-api.imaginewithu.com')

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
  // 临时后端接口走 /local-api（vite proxy → localhost:9527）
  const localPath = path.replace(/^\/api\//, '/local-api/')
  return _base ? _base + localPath : localPath
}

/**
 * 拼接 Arca baseURL，所有 Arca 接口共用。
 * 开发期 /api（vite proxy → i18n-api.imaginewithu.com），生产构建用 VITE_API_BASE_URL。
 */
export function arcaUrl(path: string): string {
  return ARCA_BASE + path
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

/**
 * Arca 统一响应封装：{ code: number, msg: string, data: T }
 * code=0 为成功，非 0 为业务错误。
 */
interface ArcaResp<T> {
  code: number
  msg: string
  data: T
}

function parseArcaResp<T>(text: string, path: string): T {
  const resp = parseJson<ArcaResp<T>>(text, path)
  if (resp.code !== 0) {
    throw new ApiError(resp.code, resp.msg || 'Arca 业务错误')
  }
  return resp.data
}

/**
 * Arca 后端 POST 封装（大部分 Arca 接口是 POST）。
 * 对应 arca.api 的鉴权 @server(jwt: Auth, authType: apiKey)。
 * Authorization: Bearer <jwt_token>
 */
export async function arcaPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(arcaUrl(path), {
    method: 'POST',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return parseArcaResp<T>(text, path)
}

/**
 * Arca 后端 GET 封装（少数接口如 /character/page_config）。
 */
export async function arcaGet<T>(path: string): Promise<T> {
  const res = await fetch(arcaUrl(path), { headers: authHeaders() })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return parseArcaResp<T>(text, path)
}
