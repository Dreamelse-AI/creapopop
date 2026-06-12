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

export function buildSystemPrompt(c: Character, locale: PromptLocale = 'zh'): string {
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
// 契约(最新) ChatWithCharacterReq：
//   character_id(必填) / chat_scene(1|2|3) / messages
//   friendship_id(optional)：不带则开启「非好友聊天模式」（仅 debug/试聊），
//   因此已发布角色即便未加好友也可用此接口试聊。草稿无 character_id，仍走本地 Gemini。

interface ArcaChatResp {
  current_messages: { msg_type: string; text?: { text: string } }[]
  character_messages: { msg_type: string; text?: { text: string } }[]
}

async function arcaChat(characterId: string, userText: string): Promise<string> {
  const resp = await arcaPost<ArcaChatResp>('/character/chat_with_character', {
    character_id: characterId,
    chat_scene: 2,
    // 不传 friendship_id → 非好友试聊模式
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
  locale: PromptLocale = 'zh',
): Promise<{ text: string; items: MessageItem[] }> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user')?.content || ''

  // Arca 的 chat_with_character 要求角色已发布且已加好友；草稿/审核中角色调用会被
  // 拒绝（提示"添加好友才能用"）。预览试聊本质是创作期试聊，应直接走本地 Gemini，
  // 用角色设定即时生成 system prompt，不依赖 Arca character_id / 好友关系。
  const canUseArca = character.status === 'published' && !!character.id && !!lastUserMsg

  if (canUseArca) {
    try {
      const text = await arcaChat(character.id, lastUserMsg)
      if (text) {
        console.info('[AI试聊] ✅ 走 Arca 后端 (chat_with_character)')
        return { text, items: parseAIResponse(text) }
      }
      console.warn('[AI试聊] ⚠️ Arca 返回空，回退本地试聊 (Gemini)')
    } catch (e) {
      console.warn('[AI试聊] ⚠️ Arca 失败，回退本地试聊 (Gemini)。原因：', e)
    }
  } else {
    console.info('[AI试聊] ℹ️ 草稿/未发布角色，走本地试聊 (Gemini)，无需 character_id')
  }

  // 本地 Gemini 试聊：草稿态主链路，也是已发布角色的兜底
  const raw = await localChat(character, history, locale)
  return { text: raw, items: parseAIResponse(raw) }
}
