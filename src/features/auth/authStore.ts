import { create } from 'zustand'
import { arcaPost, clearToken, getToken, postJson, setToken } from '@/services/apiClient'

/**
 * 对应 arca.api: POST /auth/email/sessions → LoginResp
 */
interface ArcaLoginResp {
  jwt_token: string
  expires_in: number
  is_new: boolean
}

/**
 * 对应 arca.api: POST /auth/email/verification-codes → EmailCodeResp
 */
interface ArcaEmailCodeResp {
  message: string
}

/** 临时后端回退响应 */
interface LocalLoginResp {
  token: string
  email: string
}

interface AuthState {
  email: string | null
  isAuthed: boolean
  loading: boolean
  sending: boolean
  error: string | null
  sendCode: (email: string) => Promise<boolean>
  login: (email: string, code: string) => Promise<boolean>
  logout: () => void
}

const EMAIL_KEY = 'creapopop_email'

export const useAuthStore = create<AuthState>((set) => ({
  email: typeof localStorage !== 'undefined' ? localStorage.getItem(EMAIL_KEY) : null,
  isAuthed: !!getToken(),
  loading: false,
  sending: false,
  error: null,

  sendCode: async (email) => {
    set({ sending: true, error: null })
    try {
      // 优先走 Arca，失败回退临时后端
      try {
        await arcaPost<ArcaEmailCodeResp>('/auth/email/verification-codes', { email })
      } catch {
        await postJson('/api/auth/send-code', { email })
      }
      set({ sending: false })
      return true
    } catch {
      set({ sending: false, error: '验证码发送失败，请检查邮箱' })
      return false
    }
  },

  login: async (email, code) => {
    set({ loading: true, error: null })
    try {
      // 优先走 Arca，失败回退临时后端
      let token: string
      try {
        const res = await arcaPost<ArcaLoginResp>('/auth/email/sessions', { email, code })
        token = res.jwt_token
      } catch {
        const res = await postJson<LocalLoginResp>('/api/auth/login', { email, code })
        token = res.token
      }
      setToken(token)
      localStorage.setItem(EMAIL_KEY, email)
      set({ email, isAuthed: true, loading: false })
      return true
    } catch {
      set({ loading: false, error: '验证码错误或已过期', isAuthed: false })
      return false
    }
  },

  logout: () => {
    clearToken()
    localStorage.removeItem(EMAIL_KEY)
    set({ email: null, isAuthed: false })
  },
}))
