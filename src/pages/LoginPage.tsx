import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { PillButton, RoundedInput } from '@/components/ui/primitives'

interface LocationState {
  from?: string
}

// 登录页：暖米色背景 + 居中面板（390px）。
// 设计稿为「邮箱 + 验证码」，这一期 mock：邮箱 + 密码(123456)，验证码后续接入。
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
    <div className="flex h-full flex-col items-center justify-center gap-10 bg-[#fbf2d8] px-6">
      <h1 className="text-3xl font-bold tracking-wide text-black">POPOP</h1>

      <form onSubmit={handleSubmit} className="flex w-[390px] flex-col gap-3 px-6 py-4">
        <label className="px-2 text-sm text-black/50">📧 登录账号</label>
        <RoundedInput
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="请输入你的电子邮箱..."
        />

        <label className="mt-2 px-2 text-sm text-black/50">🔒 密码</label>
        <RoundedInput
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="默认密码 123456"
        />

        {error && <p className="px-2 text-sm text-red-500">{error}</p>}

        <PillButton type="submit" disabled={loading} className="mt-4 h-[52px] w-full">
          {loading ? '登录中…' : '登录'}
        </PillButton>
      </form>
    </div>
  )
}
