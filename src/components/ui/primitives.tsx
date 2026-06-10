import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

// 通用转圈 loading：纯 CSS，无外部资源。颜色跟随 currentColor，按场景用 className 调色。
// 用法：按钮内传 text-white；浅底区域传 text-black/30。
export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="加载中"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

// 胶囊按钮（圆角 100px），对齐设计稿
export function PillButton({
  children,
  variant = 'solid',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline'
  children: ReactNode
}) {
  const base =
    'inline-flex items-center justify-center rounded-[100px] px-5 py-2 text-base font-medium transition disabled:opacity-40'
  const styles =
    variant === 'solid'
      ? 'bg-black text-white hover:opacity-90'
      : 'border border-black/20 text-black hover:bg-black/5'
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  )
}

// 大圆角输入框（圆角 24px，高 60px），对齐设计稿
export function RoundedInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-[60px] w-full rounded-[24px] border border-black/[0.06] bg-white px-3 text-base text-black outline-none placeholder:text-black/20 focus:border-black/20 ${className}`}
      {...props}
    />
  )
}

// 白色卡片
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[16px] border border-black/[0.06] bg-white ${className}`}>
      {children}
    </div>
  )
}

// 统一小标题（各表单分区/列表分组标题）。样式集中在此，后续单独调参数只改这里。
export function SectionTitle({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center px-3 py-1.5 ${className}`}>
      <h2 className="font-misans text-[16px] text-black/30">{children}</h2>
    </div>
  )
}
