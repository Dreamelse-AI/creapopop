import { useAuthStore } from '@/features/auth/authStore'

// 顶部导航栏（56px），对齐设计稿：左 logo + 标题，右账号
export function TopNav() {
  const { email, logout } = useAuthStore()
  return (
    <header className="flex h-14 items-center justify-between border-b border-black/[0.06] bg-white px-5">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tracking-wide">POPOP</span>
        <span className="text-sm text-black/40">创作</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-black/50">{email}</span>
        <button
          onClick={logout}
          className="rounded-[100px] border border-black/20 px-3 py-1 text-sm hover:bg-black/5"
        >
          退出
        </button>
      </div>
    </header>
  )
}
