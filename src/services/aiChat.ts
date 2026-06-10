import { apiUrl, arcaPost, getToken } from './apiClient'
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

export function buildSystemPrompt(c: Character, locale: PromptLocale = 'ko'): string {
  return buildChatPrompt(c, locale)
}

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

// ========== Arca 链路：character/chat_with_character ==========

interface ArcaChatResp {
  current_messages: { msg_type: string; text?: { text: string } }[]
  character_messages: { msg_type: string; text?: { text: string } }[]
}

async function arcaChat(characterId: string, userText: string): Promise<string> {
  const resp = await arcaPost<ArcaChatResp>('/character/chat_with_character', {
    character_id: characterId,
    chat_scene: 2,
    messages: [{ msg_type: 'text', text: { text: userText } }],
  })
  const texts = (resp.character_messages || [])
    .filter((m) => m.msg_type === 'text' && m.text?.text)
    .map((m) => m.text!.text)
  return texts.join('\n') || ''
}

// ========== 临时后端链路（fallback）==========

async function localChat(
  character: Character,
  history: ChatMessage[],
  locale: PromptLocale,
): Promise<string> {
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
  return json.text || ''
}

// ========== 公开 API：优先 Arca，失败 fallback 临时后端 ==========

export async function sendChatMessage(
  character: Character,
  history: ChatMessage[],
  locale: PromptLocale = 'ko',
): Promise<{ text: string; items: MessageItem[] }> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user')?.content || ''

  // 优先 Arca（需要有效的 character_id）
  if (character.id && lastUserMsg) {
    try {
      const text = await arcaChat(character.id, lastUserMsg)
      if (text) {
        console.info('[AI试聊] ✅ 走 Arca 后端 (chat_with_character)')
        return { text, items: parseAIResponse(text) }
      }
      console.warn('[AI试聊] ⚠️ Arca 返回空，回退临时后端 (Gemini)')
    } catch (e) {
      console.warn('[AI试聊] ⚠️ Arca 失败，回退临时后端 (Gemini)。原因：', e)
    }
  } else {
    console.info('[AI试聊] ℹ️ 无 character_id 或无消息，走临时后端 (Gemini)')
  }

  // Fallback：临时后端 Gemini
  const raw = await localChat(character, history, locale)
  return { text: raw, items: parseAIResponse(raw) }
}
