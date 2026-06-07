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
      visibleSections: ['basic', 'image'],
    },
    dynamics: [],
    createdAt: now,
    updatedAt: now,
  }
}
