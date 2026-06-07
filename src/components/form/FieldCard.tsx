import type { ReactNode } from 'react'

// 字段卡片：圆角 20px 白卡 + 标签 + 内容，对齐设计稿
export function FieldCard({
  label,
  children,
  className = '',
}: {
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex w-full flex-col gap-2 rounded-[20px] border border-black/[0.06] bg-white p-3 ${className}`}
    >
      <span className="text-base font-medium text-black/50">{label}</span>
      {children}
    </div>
  )
}

// 计数器（如 12/200）
export function CharCount({ value, max }: { value: number; max: number }) {
  return (
    <span className={`text-xs ${value > max ? 'text-red-500' : 'text-black/30'}`}>
      {value}/{max}
    </span>
  )
}
