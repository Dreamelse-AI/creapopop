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

// 全屏/大区域加载：🌀 60px 转圈动画，居中。用于整页/面板/预览渲染/AI生图大图等大场景。
// 只转圈、无文案。需要铺满父容器时父级给定高度即可（组件本身 h-full w-full 居中）。
export function FullscreenLoading({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="加载中"
      className={`flex h-full w-full items-center justify-center ${className}`}
    >
      <span className="inline-block animate-spin text-[60px] leading-none">🌀</span>
    </div>
  )
}


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

// 白色卡片。radius 变体：card=16px（默认）/ field=20px（表单字段卡）
export function Card({
  children,
  className = '',
  radius = 'card',
}: {
  children: ReactNode
  className?: string
  radius?: 'card' | 'field'
}) {
  const r = radius === 'field' ? 'rounded-[20px]' : 'rounded-[16px]'
  return (
    <div className={`${r} border border-black/[0.06] bg-white ${className}`}>
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
      <h2 className="font-misans-medium text-[16px] text-black/30">{children}</h2>
    </div>
  )
}
