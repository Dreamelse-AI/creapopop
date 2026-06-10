import { arcaPost } from './apiClient'
import type { Character } from '@/types/character'

/**
 * 对应 arca.api (dev): 角色草稿箱 + 已发布角色 CRUD
 *
 * 草稿：POST /character/save_draft, /character/list_drafts, /character/delete_draft, /character/submit_draft
 * 已发布：POST /character/list_my_characters, /character/detail, /character/delete
 */

// ========== Arca 契约类型（严格对齐 arca.api dev 分支）==========

interface ArcaUserUploadImage {
  name?: string
  image_type: 'aigc' | 'upload'
  url: string
  is_main_pic: boolean
}

interface ArcaCustomizedSetting {
  icon: string
  content: string
}

interface ArcaCharacterCreateForm {
  images?: ArcaUserUploadImage[]
  name?: string
  tags?: string[]
  species?: string
  gender?: string
  voice?: { voice_id: string; name?: string } | null
  profile?: string
  disposition?: string
  anonymous_tags?: string[]
  visibility?: string
  customized_settings?: Record<string, ArcaCustomizedSetting>
  opening_prologue?: string[]
}

interface ArcaDraftItem {
  draft_id: string
  target_character_id?: string
  character_create_form: ArcaCharacterCreateForm
  updated_at: number
}

interface SaveDraftResp {
  draft_id: string
  updated_at: number
}

interface ListDraftsResp {
  drafts: ArcaDraftItem[]
}

interface SubmitDraftResp {
  character_id: string
}

// ========== 字段映射：前端 Character ↔ Arca CharacterCreateForm ==========

function toArcaForm(c: Partial<Character>): ArcaCharacterCreateForm {
  return {
    name: c.name || undefined,
    tags: c.tags?.length ? c.tags : undefined,
    species: c.species || undefined,
    gender: c.gender === 'unknown' ? 'other' : c.gender || undefined,
    voice: c.voiceId ? { voice_id: c.voiceId } : undefined,
    profile: c.intro || undefined,
    disposition: c.personality || undefined,
    anonymous_tags: c.anonymousTags?.length ? c.anonymousTags : undefined,
    visibility: c.visibility || undefined,
    customized_settings: c.details && Object.keys(c.details).length
      ? Object.fromEntries(
          Object.entries(c.details).map(([k, v]) => [k, { icon: '', content: v }]),
        )
      : undefined,
    opening_prologue: c.greetings?.length ? c.greetings : undefined,
    images: c.images?.length
      ? c.images.map((img) => ({
          name: '',
          image_type: img.source === 'ai' ? 'aigc' as const : 'upload' as const,
          url: img.url,
          is_main_pic: img.id === c.primaryImageId,
        }))
      : undefined,
  }
}

function fromArcaDraft(d: ArcaDraftItem): Character {
  const f = d.character_create_form
  return {
    id: d.draft_id,
    ownerEmail: '',
    status: 'draft',
    name: f.name || '',
    tags: f.tags || [],
    species: (f.species as Character['species']) || 'human',
    gender: f.gender === 'other' ? 'unknown' : (f.gender as Character['gender']) || 'unknown',
    voiceId: f.voice?.voice_id || null,
    intro: f.profile || '',
    personality: f.disposition || '',
    visibility: (f.visibility as Character['visibility']) || 'private',
    anonymousTags: f.anonymous_tags || [],
    images: (f.images || []).map((img, i) => ({
      id: `img_${i}`,
      url: img.url,
      source: img.image_type === 'aigc' ? 'ai' as const : 'upload' as const,
    })),
    primaryImageId: (f.images || []).find((img) => img.is_main_pic)
      ? `img_${(f.images || []).findIndex((img) => img.is_main_pic)}`
      : null,
    details: f.customized_settings
      ? Object.fromEntries(
          Object.entries(f.customized_settings).map(([k, v]) => [k, v.content]),
        )
      : {},
    greetings: f.opening_prologue || [],
    introPage: { template: 'none', visibleSections: ['name', 'tags', 'intro'] },
    dynamics: [],
    createdAt: d.updated_at * 1000,
    updatedAt: d.updated_at * 1000,
  }
}

// ========== 公开 API（供 CreationListPage / CharacterFormPage / useAutoSave 使用）==========

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

interface ArcaCharacterPageBasicInfo {
  basic_info: {
    character_id: string
    name?: string
    aka?: string
    image?: { url: string }
    like_count?: number
  }
  character_status?: { character_state?: string }
}

interface ListMyCharsResp {
  characters: ArcaCharacterPageBasicInfo[]
  max_characters: number
}

function fromPublishedChar(info: ArcaCharacterPageBasicInfo): Character {
  const b = info.basic_info
  return {
    id: b.character_id,
    ownerEmail: '',
    status: 'published',
    name: b.name || '',
    tags: [],
    species: 'human',
    gender: 'unknown',
    voiceId: null,
    intro: '',
    personality: '',
    visibility: 'public',
    anonymousTags: [],
    images: b.image?.url ? [{ id: 'main', url: b.image.url, source: 'upload' as const }] : [],
    primaryImageId: b.image?.url ? 'main' : null,
    details: {},
    greetings: [],
    introPage: { template: 'none', visibleSections: ['name', 'tags', 'intro'] },
    dynamics: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

export async function listCharacters(status?: 'draft' | 'published'): Promise<ListResp> {
  if (status === 'draft') {
    const resp = await arcaPost<ListDraftsResp>('/character/list_drafts', {})
    return { success: true, characters: (resp.drafts || []).map(fromArcaDraft) }
  }
  const resp = await arcaPost<ListMyCharsResp>('/character/list_my_characters', { limit: 50 })
  return { success: true, characters: (resp.characters || []).map(fromPublishedChar) }
}

export async function getCharacter(id: string): Promise<GetResp> {
  // id 可能是 draft_id，先尝试从草稿列表拿
  const resp = await arcaPost<ListDraftsResp>('/character/list_drafts', {})
  const draft = (resp.drafts || []).find((d) => d.draft_id === id)
  if (draft) {
    return { success: true, character: fromArcaDraft(draft) }
  }
  return { success: true, character: null }
}

export async function saveCharacter(character: Partial<Character>): Promise<SaveResp> {
  const form = toArcaForm(character)
  const resp = await arcaPost<SaveDraftResp>('/character/save_draft', {
    draft_id: character.id || undefined,
    character_create_form: form,
  })
  // 返回更新后的 character（用 draft_id 替换 id）
  const saved: Character = {
    ...(character as Character),
    id: resp.draft_id,
    updatedAt: resp.updated_at * 1000,
  }
  return { success: true, character: saved }
}

export async function deleteCharacter(id: string): Promise<{ success: boolean }> {
  await arcaPost('/character/delete_draft', { draft_id: id })
  return { success: true }
}

export async function publishCharacter(id: string): Promise<SaveResp> {
  const resp = await arcaPost<SubmitDraftResp>('/character/submit_draft', { draft_id: id })
  return {
    success: true,
    character: { id: resp.character_id } as Character,
  }
}
