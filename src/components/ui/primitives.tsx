import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

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
