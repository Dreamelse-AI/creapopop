import { create } from 'zustand'
import { clearToken, getToken, postJson, setToken } from '@/services/apiClient'

interface LoginResponse {
  token: string
  email: string
}

interface AuthState {
  email: string | null
  isAuthed: boolean
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const EMAIL_KEY = 'creapopop_email'

export const useAuthStore = create<AuthState>((set) => ({
  email: typeof localStorage !== 'undefined' ? localStorage.getItem(EMAIL_KEY) : null,
  isAuthed: !!getToken(),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await postJson<LoginResponse>('/api/auth/login', { email, password })
      setToken(res.token)
      localStorage.setItem(EMAIL_KEY, res.email)
      set({ email: res.email, isAuthed: true, loading: false })
      return true
    } catch {
      set({ loading: false, error: '邮箱或密码错误', isAuthed: false })
      return false
    }
  },

  logout: () => {
    clearToken()
    localStorage.removeItem(EMAIL_KEY)
    set({ email: null, isAuthed: false })
  },
}))
