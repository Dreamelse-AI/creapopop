import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/features/auth/authStore'

// 顶部导航栏（56px），对齐设计稿：浅灰背景，左 logo + 「创作」标题，右账号头像。
export function TopNav() {
  const { email, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="flex h-14 items-center justify-between bg-[#f7f7f7] px-5 py-2.5">
      <div className="flex flex-1 items-center gap-10">
        <img src="/assets/nav-logo.svg" alt="POPOP" className="h-[30px] w-[190px]" />
        <span className="text-2xl leading-none font-black text-black">创作</span>
      </div>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex size-[30px] items-center justify-center overflow-hidden rounded-full"
          title={email || '账号'}
        >
          <img src="/assets/nav-user.svg" alt="账号" className="size-full" />
        </button>
        {open && (
          <div className="absolute right-0 top-[38px] z-20 min-w-[180px] rounded-[12px] border border-black/[0.06] bg-white p-2 shadow-lg">
            <p className="truncate px-3 py-1.5 text-sm text-black/50">{email}</p>
            <button
              onClick={logout}
              className="w-full rounded-[8px] px-3 py-1.5 text-left text-sm text-black hover:bg-black/5"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
