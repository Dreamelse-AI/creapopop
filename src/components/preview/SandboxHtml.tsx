import { useEffect, useState } from 'react'
import { FullscreenLoading } from '@/components/ui/primitives'

// iframe 沙箱渲染 Claude 生成的 HTML。sandbox 不含 allow-same-origin/scripts，
// 隔离外部页面与用户数据，防注入。与 newcreation CharacterShowcaseSheet 一致。
// 渲染完成（onLoad）前盖一层转圈，避免内容多时短暂白屏。
export function SandboxHtml({ html, className = '' }: { html: string; className?: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style></head><body>${html}</body></html>`
  const [loaded, setLoaded] = useState(false)

  // html 变化（重新生成）时重置为加载态
  useEffect(() => setLoaded(false), [html])

  return (
    <div className="relative h-full w-full">
      <iframe
        title="介绍页预览"
        sandbox=""
        srcDoc={doc}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full border-0 ${className}`}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-white">
          <FullscreenLoading />
        </div>
      )}
    </div>
  )
}
