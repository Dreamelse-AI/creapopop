// iframe 沙箱渲染 Claude 生成的 HTML。sandbox 不含 allow-same-origin/scripts，
// 隔离外部页面与用户数据，防注入。与 newcreation CharacterShowcaseSheet 一致。
export function SandboxHtml({ html, className = '' }: { html: string; className?: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style></head><body>${html}</body></html>`
  return (
    <iframe
      title="介绍页预览"
      sandbox=""
      srcDoc={doc}
      className={`h-full w-full border-0 ${className}`}
    />
  )
}
