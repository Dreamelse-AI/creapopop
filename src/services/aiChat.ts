import { apiUrl, getToken } from './apiClient'
import type { Character } from '@/types/character'
import { buildChatPrompt } from '@/prompts'
import type { PromptLocale, MessageItem } from '@/prompts/types'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  items?: MessageItem[]
}

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

/**
 * 兼容旧调用：用新模板系统构建 system prompt
 */
export function buildSystemPrompt(c: Character, locale: PromptLocale = 'ko'): string {
  return buildChatPrompt(c, locale)
}

/**
 * 解析模型返回的 JSON 数组为 MessageItem[]
 * 如果解析失败则回退为单条 text
 */
export function parseAIResponse(raw: string): MessageItem[] {
  try {
    const trimmed = raw.trim()
    if (trimmed.startsWith('[')) {
      const items = JSON.parse(trimmed) as MessageItem[]
      if (Array.isArray(items) && items.length > 0) return items
    }
  } catch { /* fall through */ }
  return [{ type: 'text', data: { content: raw } }]
}

export async function sendChatMessage(
  character: Character,
  history: ChatMessage[],
  locale: PromptLocale = 'ko',
): Promise<{ text: string; items: MessageItem[] }> {
  const res = await fetch(apiUrl('/api/ai/chat'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      system: buildSystemPrompt(character, locale),
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.8,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `对话失败 (${res.status})`)
  const raw = json.text || ''
  return { text: raw, items: parseAIResponse(raw) }
}
