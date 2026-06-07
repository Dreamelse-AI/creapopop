import { getJson } from './apiClient'

export interface Voice {
  id: string
  name: string
  gender: string
  previewUrl: string
}
export interface Music {
  id: string
  name: string
  tags: string[]
  previewUrl: string
}

export function listVoices(): Promise<{ voices: Voice[] }> {
  return getJson<{ voices: Voice[] }>('/api/mock/voices')
}

export function listMusic(): Promise<{ music: Music[] }> {
  return getJson<{ music: Music[] }>('/api/mock/music')
}
