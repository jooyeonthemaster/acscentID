'use client'

// 이 데모 화면을 워터마크 없이 보여도 되는지(화면 쪽) — 주소가 demo=clean 이고 서명(k)이 서버 확인(/api/demo/clean)을 통과했을 때만 true.
// 확인 전 · 실패 · 서명 없음은 false(워터마크를 깐다). 확인 결과는 이 탭에 잠시(최대 6시간, 링크 만료 전까지) 기억해 화면을 다시 열 때 묻지 않는다.
// KioskWatermark · BoothWatermark 가 쓴다. 설명: src/lib/demo-clean.ts

import { useSyncExternalStore } from 'react'
import { DEMO_CLEAN_KEY_PARAM, DEMO_CLEAN_VALUE } from './demo-clean'

const CACHE_KEY = 'neander-demo-clean-v1'
const CACHE_MS = 6 * 60 * 60 * 1000
let verified = false
let started = false
const listeners = new Set<() => void>()

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  const query = new URLSearchParams(window.location.search)
  const key = query.get(DEMO_CLEAN_KEY_PARAM)
  if (query.get('demo') !== DEMO_CLEAN_VALUE || !key) return
  try {
    const kept = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null') as { key?: string; until?: number } | null
    if (kept?.key === key && typeof kept.until === 'number' && kept.until > Date.now()) { verified = true; return }
  } catch { /* 저장소를 못 쓰면 서버에 묻는다 */ }
  fetch(`/api/demo/clean?${DEMO_CLEAN_KEY_PARAM}=${encodeURIComponent(key)}`, { cache: 'no-store' })
    .then((response) => response.json())
    .then((data: { ok?: boolean; expiresAt?: number }) => {
      if (!data?.ok || typeof data.expiresAt !== 'number') return
      verified = true
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ key, until: Math.min(data.expiresAt, Date.now() + CACHE_MS) })) } catch { /* 기억 못 해도 지금 화면은 깨끗하게 */ }
      listeners.forEach((notify) => notify())
    })
    .catch(() => { /* 확인 못 하면 워터마크를 그대로 둔다 */ })
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  start()
  return () => { listeners.delete(notify) }
}

export function useCleanDemo(): boolean {
  return useSyncExternalStore(subscribe, () => verified, () => false)
}
