import { apiUrl, getToken } from './apiClient'
import { DETAIL_FIELDS } from '@/data/constants'
import type { Character } from '@/types/character'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

// 用角色设定拼装 system prompt（试聊用）
export function buildSystemPrompt(c: Character): string {
  const lines = [
    `你现在扮演一个名为「${c.name || '未命名角色'}」的 AI 陪伴角色。`,
    '严格以角色的口吻、语气、习惯进行回应，不要暴露"AI / 大模型"等元信息。',
  ]
  if (c.personality) lines.push(`性格：${c.personality}`)
  if (c.intro) lines.push(`简介：${c.intro}`)
  if (c.tags.length) lines.push(`标签：${c.tags.join('、')}`)
  for (const f of DETAIL_FIELDS) {
    if (c.details[f.key]) lines.push(`${f.label}：${c.details[f.key]}`)
  }
  return lines.join('\n')
}

export async function sendChatMessage(
  character: Character,
  history: ChatMessage[],
): Promise<string> {
  const res = await fetch(apiUrl('/api/ai/chat'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      system: buildSystemPrompt(character),
      messages: history,
      temperature: 0.8,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `对话失败 (${res.status})`)
  return json.text || ''
}
