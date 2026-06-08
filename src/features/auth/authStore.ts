import { create } from 'zustand'
import { clearToken, getToken, postJson, setToken } from '@/services/apiClient'

interface LoginResponse {
  token: string
  email: string
}

interface SendCodeResponse {
  success: boolean
  ttl: number
  mockCode?: string
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
      await postJson<SendCodeResponse>('/api/auth/send-code', { email })
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
      const res = await postJson<LoginResponse>('/api/auth/login', { email, code })
      setToken(res.token)
      localStorage.setItem(EMAIL_KEY, res.email)
      set({ email: res.email, isAuthed: true, loading: false })
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
