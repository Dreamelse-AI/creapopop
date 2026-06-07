import { getJson, postJson } from './apiClient'
import type { Character } from '@/types/character'

interface ListResp {
  success: boolean
  characters: Character[]
}
interface SaveResp {
  success: boolean
  character: Character
}
interface GetResp {
  success: boolean
  character: Character | null
}

export function listCharacters(status?: 'draft' | 'published'): Promise<ListResp> {
  const q = status ? `?status=${status}` : ''
  return getJson<ListResp>(`/api/character/list${q}`)
}

export function getCharacter(id: string): Promise<GetResp> {
  return getJson<GetResp>(`/api/character/get?id=${encodeURIComponent(id)}`)
}

export function saveCharacter(character: Partial<Character>): Promise<SaveResp> {
  return postJson<SaveResp>('/api/character/save', character)
}

export function deleteCharacter(id: string): Promise<{ success: boolean }> {
  return postJson('/api/character/delete', { id })
}

export function publishCharacter(id: string): Promise<SaveResp> {
  return postJson<SaveResp>('/api/character/publish', { id })
}
