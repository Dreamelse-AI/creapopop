import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'

interface LocationState {
  from?: string
}

const RESEND_SECONDS = 60

// 登录页：暖米色背景 + 居中面板。设计稿为「邮箱 + 邮箱验证码」。
// mock 阶段验证码固定 123456（点发送后任意填 123456 即可登录）。
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sendCode, login, loading, sending, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startCountdown = () => {
    setCountdown(RESEND_SECONDS)
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1 && timerRef.current) {
          clearInterval(timerRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!emailValid || countdown > 0 || sending) return
    const ok = await sendCode(email.trim())
    if (ok) startCountdown()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await login(email.trim(), code.trim())
    if (ok) {
      const from = (location.state as LocationState)?.from || '/'
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 bg-[#fbf2d8] px-6">
      <img src="/logo.svg" alt="POPOP" className="h-[130px] w-[168px]" />

      <form onSubmit={handleSubmit} className="flex w-[390px] flex-col gap-3 px-6 py-4">
        <div className="flex w-[366px] flex-col gap-3">
          <label className="px-2 text-sm font-medium text-black/50">📧 登录账号</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入你的电子邮箱..."
            className="h-[60px] w-full rounded-[24px] border border-black/[0.06] bg-white px-3 text-base text-black outline-none placeholder:text-black/20 focus:border-black/20"
          />
        </div>

        <div className="flex w-[366px] flex-col gap-3">
          <label className="px-2 text-sm font-medium text-black/50">🔒 邮箱验证码</label>
          <div className="flex h-[60px] w-full items-center gap-2 rounded-[24px] border border-black/[0.06] bg-white pl-3 pr-2">
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入邮件验证码..."
              className="h-full flex-1 bg-transparent text-base text-black outline-none placeholder:text-black/20"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!emailValid || countdown > 0 || sending}
              className="shrink-0 rounded-[100px] border border-black px-3 py-2 text-base font-bold text-black transition disabled:opacity-20"
            >
              {countdown > 0 ? `${countdown}s` : sending ? '发送中' : '发送验证码'}
            </button>
          </div>
        </div>

        {error && <p className="px-2 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !emailValid || !code}
          className="mt-4 h-[52px] w-full rounded-[100px] bg-black text-base font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  )
}
