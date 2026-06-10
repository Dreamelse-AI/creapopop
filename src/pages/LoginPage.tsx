import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { Spinner } from '@/components/ui/primitives'

interface LocationState {
  from?: string
}

const RESEND_SECONDS = 60

// 登录页 — 严格对齐 Figma 设计稿 1863:70828（邮箱 + 邮箱验证码 + 登录按钮）。
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

  const canSend = emailValid && countdown === 0 && !sending

  return (
    <div className="flex size-full flex-col items-center justify-center gap-10 bg-[#fbf2d8]">
      {/* logo 168.302 × 130.204 */}
      <img src="/logo.svg" alt="POPOP" className="h-[130.204px] w-[168.302px] shrink-0" />

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-10">
        {/* 操作面板 w-390 px-24 py-16 gap-12 */}
        <div className="flex w-[390px] flex-col items-center justify-end gap-3 px-6 py-4">
          {/* 登录账号 */}
          <div className="flex w-[366px] flex-col items-start gap-3">
            <div className="flex w-full items-center px-2">
              <span className="font-misans-medium text-center text-[14px] text-[rgba(0,0,0,0.5)]">
                📧 登录账号
              </span>
            </div>
            <div className="flex h-[60px] w-full items-center overflow-clip rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-white p-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入你的电子邮箱..."
                className="font-misans-medium min-w-px flex-1 bg-transparent text-[16px] text-black outline-none placeholder:text-[rgba(0,0,0,0.2)]"
              />
            </div>
          </div>

          {/* 邮箱验证码 */}
          <div className="flex w-[366px] flex-col items-start gap-3">
            <div className="flex w-full items-center px-2">
              <span className="font-misans-medium text-center text-[14px] text-[rgba(0,0,0,0.5)]">
                🔒 邮箱验证码
              </span>
            </div>
            <div className="flex h-[60px] w-full items-center gap-2 overflow-clip rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-white p-3">
              <input
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入邮件验证码..."
                className="font-misans-medium min-w-px flex-1 bg-transparent text-[16px] text-black outline-none placeholder:text-[rgba(0,0,0,0.2)]"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!canSend}
                className={`flex shrink-0 items-center justify-center rounded-[100px] border border-black px-3 py-2 ${
                  canSend ? 'opacity-100' : 'opacity-20'
                }`}
              >
                <span className="font-misans-bold text-[16px] whitespace-nowrap text-black">
                  {countdown > 0 ? (
                    `${countdown}s`
                  ) : sending ? (
                    <span className="flex items-center gap-1.5">
                      <Spinner size={14} />
                      发送中
                    </span>
                  ) : (
                    '发送验证码'
                  )}
                </span>
              </button>
            </div>
          </div>

          {error && <p className="font-misans-medium w-[366px] px-2 text-[14px] text-red-500">{error}</p>}
        </div>

        {/* 登录按钮 w-390 p-12，按钮 h-60 rounded-20 */}
        <div className="flex w-[390px] items-end justify-center p-3">
          <button
            type="submit"
            disabled={loading || !emailValid || !code}
            className="flex h-[60px] min-w-px flex-1 items-center justify-center gap-1 rounded-[20px] bg-black px-5 py-4 transition hover:opacity-90 disabled:opacity-40"
          >
            <span className="font-misans-semibold text-[18px] leading-6 text-white">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size={18} />
                  登录中…
                </span>
              ) : (
                '登录'
              )}
            </span>
          </button>
        </div>
      </form>
    </div>
  )
}
