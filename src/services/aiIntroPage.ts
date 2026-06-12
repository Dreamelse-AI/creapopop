import { apiUrl, arcaPost, getToken } from './apiClient'
import { DETAIL_FIELDS } from '@/data/constants'
import type { Character } from '@/types/character'

// 复用 newcreation 的 Claude 介绍页生成逻辑（APImart /v1/messages，Claude Sonnet 4.5）
const DEFAULT_UI_MODEL = 'claude-sonnet-4-5-20250929'

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

function buildCharacterContext(c: Character): string {
  const lines: string[] = [`名字：${c.name || '未命名'}`]
  if (c.tags.length) lines.push(`标签：${c.tags.join('、')}`)
  if (c.intro) lines.push(`简介：${c.intro}`)
  if (c.personality) lines.push(`性格：${c.personality}`)
  for (const f of DETAIL_FIELDS) {
    if (c.details[f.key]) lines.push(`${f.label}：${c.details[f.key]}`)
  }
  if (c.greetings.filter(Boolean).length) {
    lines.push(`开场白：${c.greetings.filter(Boolean).join(' / ')}`)
  }
  return lines.join('\n')
}

function extractHtml(raw: string): string {
  const m = raw.match(/```(?:html)?\s*([\s\S]*?)```/i)
  return m && m[1] ? m[1].trim() : raw.trim()
}

function extractAnthropicText(json: unknown): string {
  if (!json || typeof json !== 'object') return ''
  const data = json as { content?: { type?: string; text?: string }[] }
  if (!Array.isArray(data.content)) return ''
  return data.content
    .filter((c) => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text as string)
    .join('')
    .trim()
}

// 介绍页风格「对话」：用户在输入框里和模型沟通需求，模型整理出
// 一段回复（气泡展示）、风格关键词（顶部 chips）、以及一份用于后续生成 HTML 的风格说明 styleBrief。
// 这一步不产出 HTML —— HTML 只在用户点「生成」时才产出。
export interface IntroStyleTurn {
  reply: string
  keywords: string[]
  styleBrief: string
}

export interface IntroChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatIntroStyle(
  character: Character,
  history: IntroChatMessage[],
): Promise<IntroStyleTurn> {
  const charContext = buildCharacterContext(character)
  const system = [
    '你是一名资深 UI 设计顾问，正在和用户沟通「角色介绍页」的视觉风格。',
    '用户会用自然语言描述想要的效果，你需要：',
    '1. 用一句话友好地回应并复述你的理解（中文，简洁，不要寒暄套话）；',
    '2. 提炼 3~5 个「UI 视觉风格」关键词（如 暗黑、哥特、冷色、极简、赛博）；',
    '3. 整理一份给「生成模型」用的风格说明 styleBrief，描述配色、排版、氛围、重点元素。',
    '严格只输出一个 JSON 对象，不要 markdown 代码块、不要多余文字：',
    '{ "reply": "...", "keywords": ["..."], "styleBrief": "..." }',
    '',
    '角色信息（供你理解，不要直接念出来）：',
    charContext,
  ].join('\n')

  const res = await fetch(apiUrl('/api/ai/chat'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      system,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      // styleBrief 较长，默认 1024 会把 JSON 截断 → 前端解析失败回退成原始文本
      max_tokens: 2048,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `对话失败 (${res.status})`)
  const raw = (json.text || '').trim()
  const jsonText = stripJsonFence(raw)
  try {
    const obj = JSON.parse(jsonText) as { reply?: unknown; keywords?: unknown; styleBrief?: unknown }
    const keywords = Array.isArray(obj.keywords)
      ? obj.keywords.filter((k): k is string => typeof k === 'string').slice(0, 6)
      : []
    return {
      reply: typeof obj.reply === 'string' && obj.reply.trim() ? obj.reply.trim() : '好的，我记下了。',
      keywords,
      styleBrief: typeof obj.styleBrief === 'string' ? obj.styleBrief.trim() : '',
    }
  } catch {
    // 解析失败（多为模型把 JSON 截断）：尽量从残缺文本里抠出 reply / keywords，
    // 绝不把原始 JSON / 代码块直接塞进气泡。
    return salvageTurn(jsonText)
  }
}

// 从截断或不规范的 JSON 文本里救回字段，杜绝原始 JSON 进入对话气泡
function salvageTurn(text: string): IntroStyleTurn {
  const replyMatch = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  const reply = replyMatch ? replyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim() : ''
  const kwBlock = text.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/)
  const keywords = kwBlock
    ? Array.from(kwBlock[1].matchAll(/"((?:[^"\\]|\\.)*)"/g))
        .map((m) => m[1].trim())
        .filter(Boolean)
        .slice(0, 6)
    : []
  const briefMatch = text.match(/"styleBrief"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  const styleBrief = briefMatch ? briefMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim() : reply
  return {
    reply: reply || '好的，我已经记下你的需求，可以点右上角「生成」试试。',
    keywords,
    styleBrief,
  }
}

// 基于角色信息 + vibe 提示词，用 Claude 生成介绍页。
// 返回 { keywords, html }：keywords 为模型根据本次描述提炼的 UI 风格关键词（顶部 chips 展示）。
export interface IntroPageResult {
  keywords: string[]
  html: string
}

export async function generateIntroPageHtml(
  character: Character,
  vibe: string,
): Promise<IntroPageResult> {
  const v = vibe.trim()
  if (!v) throw new Error('请先描述你想要的介绍页风格')

  // 优先尝试 Arca gen_landing_page
  // 契约(最新)：POST /character/gen_landing_page
  //   req:  { character_id?(optional), user_prompt, style_key }
  //   resp: { url }  —— 生成好的 landing page URL（非 html 片段）
  // 前端渲染管线吃的是 html 片段，故拿到 url 后再 fetch 回 html 喂给下游。
  if (character.id) {
    try {
      const resp = await arcaPost<{ url: string }>('/character/gen_landing_page', {
        character_id: character.id,
        user_prompt: v,
        style_key: v,
      })
      if (resp.url) {
        const html = await fetch(resp.url).then((r) => (r.ok ? r.text() : '')).catch(() => '')
        if (html) {
          console.info('[AI介绍页] ✅ 走 Arca 后端 (gen_landing_page)')
          return { keywords: [], html }
        }
        console.warn('[AI介绍页] ⚠️ gen_landing_page 返回 url 但拉取 html 失败，回退临时后端 (Claude)')
      } else {
        console.warn('[AI介绍页] ⚠️ Arca 返回空 url，回退临时后端 (Claude)')
      }
    } catch (e) {
      console.warn('[AI介绍页] ⚠️ Arca 失败，回退临时后端 (Claude)。原因：', e)
    }
  } else {
    console.info('[AI介绍页] ℹ️ 无 character_id，走临时后端 (Claude)')
  }

  // Fallback：临时后端 Claude 生成
  const charContext = buildCharacterContext(character)
  const imageUrls = character.images.map((i) => i.url)
  const imageBlock = imageUrls.length
    ? '可用图片（按需使用）：\n' + imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')
    : '（无可用图片，用 CSS 做占位或纯文字排版）'

  const systemPrompt = [
    '你是资深前端 + UI 设计师，擅长用纯 HTML + 内联 CSS 做精致的角色介绍页。',
    '严格输出一个 JSON 对象（不要包在代码块外加任何解释），结构为：',
    '{ "keywords": ["关键词1","关键词2","关键词3"], "html": "<div class=\\"showcase\\">...</div>" }',
    '- keywords：3~5 个根据用户描述提炼的「UI 视觉风格」关键词（如 暗黑、哥特、冷色、极简），用于界面展示',
    '- html：可直接渲染的 HTML 片段，要求如下：',
    '  · 不要引用任何外部资源（禁止 <script src>、<link rel="stylesheet">、外部字体）',
    '  · 所有样式写在 <style> 块里或内联',
    '  · 以风格关键词为视觉主导，角色信息用于内容填充',
    '  · 移动端竖屏布局（约 420px 宽），在小宽度下也要好看',
    '  · 最外层包在 <div class="showcase"> 里，不要 <html>/<head>/<body>',
    '  · 允许使用 <img src="..."> 引用提供的图片 URL',
    '  · 禁止请求任何外部 API、iframe、WebSocket、localStorage',
    '只返回这个 JSON，不要前言、不要总结、不要 markdown 代码块包裹。',
  ].join('\n')

  const userPrompt = [
    `风格提示词：${v}`,
    '',
    charContext,
    '',
    imageBlock,
    '',
    '请基于以上信息生成介绍页，按要求返回 JSON。',
  ].join('\n')

  const res = await fetch(apiUrl('/api/ai/intro-page'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: DEFAULT_UI_MODEL,
      max_tokens: 4096,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`生成失败 (${res.status}) ${t.slice(0, 120)}`)
  }
  const data = await res.json().catch(() => null)
  const raw = extractAnthropicText(data)
  if (!raw) throw new Error('模型返回为空')
  return parseResult(raw)
}

// 解析模型返回：优先按 JSON 解析 {keywords, html}；失败则兜底当作纯 HTML
function parseResult(raw: string): IntroPageResult {
  const jsonText = stripJsonFence(raw)
  try {
    const obj = JSON.parse(jsonText) as { keywords?: unknown; html?: unknown }
    const keywords = Array.isArray(obj.keywords)
      ? obj.keywords.filter((k): k is string => typeof k === 'string').slice(0, 6)
      : []
    const html = typeof obj.html === 'string' ? obj.html.trim() : ''
    if (html) return { keywords, html }
  } catch {
    // 落入兜底
  }
  return { keywords: [], html: extractHtml(raw) }
}

function stripJsonFence(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (m && m[1] ? m[1] : raw).trim()
}
