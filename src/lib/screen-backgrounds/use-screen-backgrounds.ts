'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import catalog from './catalog.json'
import { neutralBackground, resolveSelected, type BackgroundSnapshot, type ScreenBackground, type ScreenTarget } from './types'
import { validateBackground } from './validation'

const POLL_MS = 15000
function initialSnapshot(target: ScreenTarget): BackgroundSnapshot {
  const backgrounds = (catalog as ScreenBackground[]).filter(item => item.target === target)
  return { backgrounds, selected: resolveSelected(backgrounds, {}) }
}
function parseSnapshot(value: unknown, target: ScreenTarget): BackgroundSnapshot {
  const snapshot = value as BackgroundSnapshot
  if (!snapshot || !Array.isArray(snapshot.backgrounds) || !snapshot.backgrounds.every(validateBackground) || !snapshot.selected) throw new Error('배경 설정을 읽지 못했습니다.')
  const backgrounds = snapshot.backgrounds.filter(item => item.target === target && item.is_active)
  return { backgrounds, selected: resolveSelected(backgrounds, snapshot.selected) }
}
async function readResponse(response: Response) {
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || '서버에 연결하지 못했습니다.')
  return result
}

export function useScreenBackgrounds(target: ScreenTarget) {
  const [snapshot, setSnapshot] = useState<BackgroundSnapshot>(() => initialSnapshot(target))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)
  const alive = useRef(false)
  const cacheKey = `acscent-shared-backgrounds-v1-${target}`

  const refresh = useCallback(async () => {
    const current = ++sequence.current
    try {
      const response = await fetch(`/api/screen-backgrounds?target=${target}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      const next = parseSnapshot(await readResponse(response), target)
      if (!alive.current || current !== sequence.current) return
      setSnapshot(next)
      setError(null)
      try { localStorage.setItem(cacheKey, JSON.stringify(next)) } catch { /* offline cache is optional */ }
    } catch (cause) {
      if (alive.current && current === sequence.current) setError(cause instanceof Error ? cause.message : '배경을 새로고침하지 못했습니다.')
      // Keep last successful snapshot. Never restore deleted bundled presets on network error.
    } finally {
      if (alive.current && current === sequence.current) setLoading(false)
    }
  }, [target, cacheKey])

  useEffect(() => {
    alive.current = true
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) setSnapshot(parseSnapshot(JSON.parse(cached), target))
    } catch { /* invalid caches are replaced by the server snapshot */ }
    void refresh()
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, POLL_MS)
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      alive.current = false
      // Invalidate the latest request, not the generation captured when this effect mounted.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [cacheKey, target, refresh])

  const unlock = useCallback(async (pin: string) => {
    const response = await fetch('/api/screen-backgrounds/unlock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
      signal: AbortSignal.timeout(12000),
    })
    if (response.status === 401) return false
    await readResponse(response)
    await refresh()
    return true
  }, [refresh])

  const selectBackground = useCallback(async (id: string) => {
    sequence.current++ // Discard a GET started before this write.
    try {
      await readResponse(await fetch('/api/screen-backgrounds', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, id }),
        signal: AbortSignal.timeout(12000),
      }))
      // Read the same authoritative view used by the admin page (also resolves deletions).
      await refresh()
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : '배경을 저장하지 못했습니다.')
      throw cause
    }
  }, [target, refresh])

  const selectedId = snapshot.selected[target] || ''
  const activeBackground = useMemo(() => snapshot.backgrounds.find(item => item.id === selectedId) || neutralBackground(target), [snapshot.backgrounds, selectedId, target])
  return { backgrounds: snapshot.backgrounds, activeBackground, selectedId, loading, error, refresh, selectBackground, unlock }
}
