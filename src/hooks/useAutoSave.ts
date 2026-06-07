import { useEffect, useRef } from 'react'
import { useDraftStore } from '@/store/draftStore'
import { saveCharacter } from '@/services/characterApi'
import type { Character } from '@/types/character'

const DEBOUNCE_MS = 1200

// 防抖自动保存：data 变化后停顿 1.2s 自动存全量。
// 跳过首次加载（初始 setData 不触发保存）。
export function useAutoSave() {
  const data = useDraftStore((s) => s.data)
  const setSaveStatus = useDraftStore((s) => s.setSaveStatus)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')
  const skipNext = useRef(true)

  useEffect(() => {
    if (!data) return
    const snapshot = JSON.stringify(stripVolatile(data))

    // 首次（加载完成）记录基线，不触发保存
    if (skipNext.current) {
      skipNext.current = false
      lastSaved.current = snapshot
      return
    }
    if (snapshot === lastSaved.current) return

    if (timer.current) clearTimeout(timer.current)
    setSaveStatus('saving')
    timer.current = setTimeout(async () => {
      try {
        await saveCharacter(data)
        lastSaved.current = snapshot
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [data, setSaveStatus])
}

// 去掉每次都会变的字段，避免无意义保存
function stripVolatile(data: Character) {
  const { updatedAt: _u, createdAt: _c, ...rest } = data
  return rest
}
