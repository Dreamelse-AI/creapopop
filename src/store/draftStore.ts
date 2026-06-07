import { create } from 'zustand'
import type { Character } from '@/types/character'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface DraftState {
  data: Character | null
  saveStatus: SaveStatus
  setData: (data: Character) => void
  patch: (partial: Partial<Character>) => void
  setSaveStatus: (status: SaveStatus) => void
  reset: () => void
}

// 当前编辑中的角色草稿。表单各字段读写此 store，自动保存 hook 监听 data 变化。
export const useDraftStore = create<DraftState>((set) => ({
  data: null,
  saveStatus: 'idle',
  setData: (data) => set({ data }),
  patch: (partial) =>
    set((s) => (s.data ? { data: { ...s.data, ...partial } } : s)),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  reset: () => set({ data: null, saveStatus: 'idle' }),
}))
