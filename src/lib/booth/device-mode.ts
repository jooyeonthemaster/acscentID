// 이 포토부스에만 켜는 운영 모드 — 기기(localStorage)에 모드와 서버 증표를 함께 저장한다(키오스크 체험 모드 device-mode.ts 와 같은 방식).
// 운영 모드는 원래 서버의 기기 설정(settings-booth.mode) 하나라 모든 부스가 함께 따라갔다. 행사장 부스(ANSAN 등)와 매장 부스를
// 동시에 다른 모드로 돌리려고, 관리자 창에서 '이 부스만'으로 고르면 그 기기에만 적는다. 값이 있으면 서버 값보다 먼저다
// (useScreenBackgrounds 가 합치고, 첫 화면을 고르는 BoothScreen 도 이 값을 먼저 본다).
// 증표: 무료 AI 생성 표는 비용이 들어 서버가 모드를 확인한다 — 고를 때 관리자 세션으로 서버 서명을 받아 두고(device-mode-token.ts)
// 표를 받을 때 낸다(requestFreeIdolTicket). 서버 라우트(무료 표)도 pass-policy 를 통해 이 파일을 싣기 때문에 React 훅을 두지 않는다
// — 화면은 useScreenBackgrounds 가 subscribeDeviceBoothMode 로 구독한다(서버 라우트에서 훅을 import 하면 빌드가 막힌다).

import { BOOTH_MODE_IDS } from './modes'

const KEY = 'acscent-booth-device-mode-v1'
const listeners = new Set<() => void>()

interface Stored { mode: string; token: string }

function readStored(): Stored | null {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<Stored> | null
    return value && typeof value.mode === 'string' && BOOTH_MODE_IDS.includes(value.mode) && typeof value.token === 'string' ? { mode: value.mode, token: value.token } : null
  } catch { return null }
}

/** 이 부스에 따로 고른 운영 모드 — 없거나 없어진 모드면 null(모든 부스 공통 운영 모드를 따른다) */
export function readDeviceBoothMode(): string | null {
  return readStored()?.mode ?? null
}

/** 무료 AI 생성 표를 받을 때 내는 서버 증표 */
export function readDeviceBoothToken(): string | null {
  return readStored()?.token ?? null
}

function notify() { listeners.forEach((fn) => fn()) }

/**
 * 이 부스의 운영 모드를 바꾼다(null = 따로 고른 것을 지우고 공통 운영 모드로).
 * 모드를 고를 때는 서버 증표가 필요해 관리자 세션(10분)이 살아 있어야 한다 — 끝났으면 status 403 인 Error
 */
export async function writeDeviceBoothMode(mode: string | null): Promise<void> {
  if (mode === null) {
    try { localStorage.removeItem(KEY) } catch { throw new Error('이 부스에 저장하지 못했어요.') }
    notify()
    return
  }
  const response = await fetch('/api/screen-backgrounds/device-mode', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }), signal: AbortSignal.timeout(12000),
  })
  const data = await response.json().catch(() => null) as { token?: unknown; error?: unknown } | null
  if (!response.ok || typeof data?.token !== 'string') {
    throw Object.assign(new Error(typeof data?.error === 'string' ? data.error : '이 부스의 운영 모드를 저장하지 못했어요.'), { status: response.status })
  }
  try { localStorage.setItem(KEY, JSON.stringify({ mode, token: data.token } satisfies Stored)) } catch { /* 아래에서 확인 */ }
  if (readDeviceBoothMode() !== mode) throw new Error('이 부스에 저장하지 못했어요.')
  notify()
}

/** useSyncExternalStore 구독 — 같은 화면의 여러 곳(부스 화면·관리자 창)이 함께 바뀐다 */
export function subscribeDeviceBoothMode(fn: () => void) {
  listeners.add(fn)
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) fn() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage) }
}
