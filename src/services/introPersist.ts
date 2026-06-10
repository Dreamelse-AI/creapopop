import type { IntroPage } from '@/types/character'
import type { IntroChatMessage } from './aiIntroPage'

// 介绍页美化的本地持久化兜底。
// 原因：Arca 的 CharacterCreateForm 契约里没有 introPage / 对话历史字段，
// save_draft 无法往返存储这些状态。在后端补齐前，按角色 id 存 localStorage，
// 保证刷新 / 重进创作页时对话记录与生成结果不丢。
// 联调时若 Arca 补了对应字段，可把读写入口切到后端，调用方无需改动。

const PREFIX = 'creapopop_intro_'

export interface IntroPersistState {
  introPage?: Partial<IntroPage>
  messages?: IntroChatMessage[]
  styleBrief?: string
}

function key(characterId: string): string {
  return `${PREFIX}${characterId}`
}

export function loadIntroState(characterId: string): IntroPersistState | null {
  if (!characterId || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key(characterId))
    if (!raw) return null
    return JSON.parse(raw) as IntroPersistState
  } catch {
    return null
  }
}

export function saveIntroState(characterId: string, state: IntroPersistState): void {
  if (!characterId || typeof localStorage === 'undefined') return
  try {
    const prev = loadIntroState(characterId) || {}
    localStorage.setItem(key(characterId), JSON.stringify({ ...prev, ...state }))
  } catch {
    // 配额溢出 / 隐私模式下静默失败，不影响主流程
  }
}

export function clearIntroState(characterId: string): void {
  if (!characterId || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(key(characterId))
  } catch {
    // ignore
  }
}
