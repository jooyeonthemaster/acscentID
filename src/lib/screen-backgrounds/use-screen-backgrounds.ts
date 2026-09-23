'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import catalog from './catalog.json'
import { DEFAULT_DEVICE_SETTINGS, isFontId, isScreenUi, neutralBackground, resolveSelected, type BackgroundSnapshot, type DeviceSettings, type ScreenBackground, type ScreenTarget } from './types'
import { validateBackground } from './validation'
import { kstToday, type LiveEventOverride } from '@/lib/screen-events/types'

const POLL_MS = 15000
function initialSnapshot(target: ScreenTarget): BackgroundSnapshot {
  const backgrounds = (catalog as ScreenBackground[]).filter(item => item.target === target)
  return { backgrounds, selected: resolveSelected(backgrounds, {}), settings: { booth: DEFAULT_DEVICE_SETTINGS, kiosk: DEFAULT_DEVICE_SETTINGS } }
}
/** 예전 서버·캐시에는 settings 가 없다 — 없거나 이상하면 기본값(레트로·기본 글꼴) */
function parseSettings(value: unknown): DeviceSettings {
  const raw = (value ?? {}) as Partial<DeviceSettings>
  return { ui: isScreenUi(raw.ui) ? raw.ui : DEFAULT_DEVICE_SETTINGS.ui, font: isFontId(raw.font) ? raw.font : null }
}
function parseSnapshot(value: unknown, target: ScreenTarget): BackgroundSnapshot {
  const snapshot = value as BackgroundSnapshot
  if (!snapshot || !Array.isArray(snapshot.backgrounds) || !snapshot.backgrounds.every(validateBackground) || !snapshot.selected) throw new Error('배경 설정을 읽지 못했습니다.')
  const backgrounds = snapshot.backgrounds.filter(item => item.target === target && item.is_active)
  const settings = snapshot.settings as Partial<Record<ScreenTarget, unknown>> | undefined
  return { backgrounds, selected: resolveSelected(backgrounds, snapshot.selected), settings: { booth: parseSettings(settings?.booth), kiosk: parseSettings(settings?.kiosk) } }
}
/** 이벤트 기간 배경·글꼴(서버가 계산) — 이상하면 없는 것으로 */
function parseLive(value: unknown, target: ScreenTarget): LiveEventOverride | null {
  const live = value as LiveEventOverride | null
  if (!live || typeof live !== 'object' || !validateBackground(live.background) || live.background.target !== target) return null
  if (typeof live.ends_on !== 'string' || typeof live.title !== 'string') return null
  return { event_id: String(live.event_id), title: live.title, ends_on: live.ends_on, background: live.background, font: isFontId(live.font) ? live.font : null }
}
async function readResponse(response: Response) {
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || '서버에 연결하지 못했습니다.')
  return result
}

export function useScreenBackgrounds(target: ScreenTarget) {
  const [snapshot, setSnapshot] = useState<BackgroundSnapshot>(() => initialSnapshot(target))
  const [loading, setLoading] = useState(true)
  /** 서버에서 한 번이라도 받았는가 — 화면 디자인 전환은 서버 값으로만 한다 */
  const [synced, setSynced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)
  const alive = useRef(false)
  const cacheKey = `acscent-shared-backgrounds-v1-${target}`
  const liveKey = `acscent-screen-event-live-v1-${target}`
  const [live, setLive] = useState<LiveEventOverride | null>(null)

  const refresh = useCallback(async () => {
    const current = ++sequence.current
    try {
      const response = await fetch(`/api/screen-backgrounds?target=${target}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      const raw = await readResponse(response)
      const next = parseSnapshot(raw, target)
      const nextLive = parseLive(raw?.live, target)
      if (!alive.current || current !== sequence.current) return
      setSnapshot(next)
      setLive(nextLive)
      try { localStorage.setItem(liveKey, JSON.stringify(nextLive)) } catch { /* optional */ }
      setSynced(true)
      setError(null)
      try { localStorage.setItem(cacheKey, JSON.stringify(next)) } catch { /* offline cache is optional */ }
    } catch (cause) {
      if (alive.current && current === sequence.current) setError(cause instanceof Error ? cause.message : '배경을 새로고침하지 못했습니다.')
      // Keep last successful snapshot. Never restore deleted bundled presets on network error.
    } finally {
      if (alive.current && current === sequence.current) setLoading(false)
    }
  }, [target, cacheKey, liveKey])

  useEffect(() => {
    alive.current = true
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) setSnapshot(parseSnapshot(JSON.parse(cached), target))
      // 인터넷이 끊긴 채 켜져도 이벤트 기간이면 이벤트 화면으로(끝난 이벤트는 아래에서 날짜로 거른다)
      const cachedLive = localStorage.getItem(liveKey)
      if (cachedLive) setLive(parseLive(JSON.parse(cachedLive), target))
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
  }, [cacheKey, liveKey, target, refresh])

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

  const saveSettings = useCallback(async (patch: Partial<DeviceSettings>) => {
    sequence.current++
    try {
      await readResponse(await fetch('/api/screen-backgrounds', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, ...patch }),
        signal: AbortSignal.timeout(12000),
      }))
      await refresh()
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : '화면 설정을 저장하지 못했습니다.')
      throw cause
    }
  }, [target, refresh])

  const selectedId = snapshot.selected[target] || ''
  // 이벤트 기간이면 이벤트 배경·글꼴이 평소 선택보다 우선한다(docs/screen-events.md). 끝나면 저절로 평소 설정.
  const liveEvent = live && kstToday() <= live.ends_on ? live : null
  const selectedBackground = useMemo(() => snapshot.backgrounds.find(item => item.id === selectedId) || neutralBackground(target), [snapshot.backgrounds, selectedId, target])
  const activeBackground = liveEvent?.background ?? selectedBackground
  const baseSettings = snapshot.settings[target]
  const settings = useMemo(() => liveEvent?.font ? { ...baseSettings, font: liveEvent.font } : baseSettings, [baseSettings, liveEvent?.font])
  return { backgrounds: snapshot.backgrounds, activeBackground, selectedId, settings, liveEvent, synced, loading, error, refresh, selectBackground, saveSettings, unlock }
}
