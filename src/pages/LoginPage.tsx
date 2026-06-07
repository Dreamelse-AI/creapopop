import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'

interface LocationState {
  from?: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await login(email.trim(), password)
    if (ok) {
      const from = (location.state as LocationState)?.from || '/'
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-[360px] rounded-2xl border border-[#2a2a32] bg-[#1a1a20] p-8"
      >
        <h1 className="mb-6 text-xl font-semibold">登录 POPOP 创作</h1>

        <label className="mb-1 block text-sm text-[#9a9aa5]">邮箱</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mb-4 w-full rounded-lg border border-[#2a2a32] bg-[#0f0f12] px-3 py-2 outline-none focus:border-[#7c6cff]"
        />

        <label className="mb-1 block text-sm text-[#9a9aa5]">密码</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="默认 123456"
          className="mb-4 w-full rounded-lg border border-[#2a2a32] bg-[#0f0f12] px-3 py-2 outline-none focus:border-[#7c6cff]"
        />

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7c6cff] py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  )
}
