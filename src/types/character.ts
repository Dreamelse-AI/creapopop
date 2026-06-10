export type CharacterStatus = 'draft' | 'reviewing' | 'published'
export type Species = 'human' | 'elf' | 'beast' | 'animal' | 'other'
export type Gender = 'male' | 'female' | 'unknown'
export type Visibility = 'private' | 'public'
export type IntroTemplate = 'none' | 'tpl1' | 'tpl2'
export type ImageSource = 'upload' | 'ai'

export interface CharacterImage {
  id: string
  url: string
  source: ImageSource
}

export interface IntroPage {
  template: IntroTemplate
  customHtml?: string
  keywords?: string[]
  visibleSections: string[]
}

export interface CharacterDynamic {
  id: string
  text: string
  images: string[]
  musicId: string | null
  createdAt: number
}

export interface Character {
  id: string
  ownerEmail: string
  status: CharacterStatus
  name: string
  tags: string[]
  species: Species
  gender: Gender
  voiceId: string | null
  intro: string
  personality: string
  visibility: Visibility
  anonymousTags: string[]
  images: CharacterImage[]
  primaryImageId: string | null
  details: Record<string, string>
  greetings: string[]
  introPage: IntroPage
  dynamics: CharacterDynamic[]
  createdAt: number
  updatedAt: number
}

// 发布必填校验：基本信息（角色名）+ 至少一张形象。
// 与表单 tab 星号、卡片发布按钮高亮共用同一判断，避免口径不一致。
export function isPublishable(c: Pick<Character, 'name' | 'images'>): boolean {
  return c.name.trim().length > 0 && c.images.length > 0
}

export function createEmptyCharacter(id: string, ownerEmail: string): Character {
  const now = Date.now()
  return {
    id,
    ownerEmail,
    status: 'draft',
    name: '',
    tags: [],
    species: 'human',
    gender: 'unknown',
    voiceId: null,
    intro: '',
    personality: '',
    visibility: 'private',
    anonymousTags: [],
    images: [],
    primaryImageId: null,
    details: {},
    greetings: [],
    introPage: {
      template: 'none',
      visibleSections: ['name', 'tags', 'species', 'gender', 'voice', 'intro', 'personality', 'greetings'],
    },
    dynamics: [],
    createdAt: now,
    updatedAt: now,
  }
}
