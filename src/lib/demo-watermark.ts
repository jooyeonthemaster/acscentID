'use client'

// 데모 워터마크 끄기 상태 — 관리자 비밀번호를 맞히면 그 브라우저(같은 사이트의 모든 탭)에서 NEANDER 워터마크를 걷는다.
// 무단 사용 방지 표시일 뿐이라 브라우저 저장소(localStorage)에 둔다. 저장소를 못 쓰면 늘 깔린 상태(기본값)로 둔다.

const KEY = 'acscent-demo-watermark-off'
const EVENT = 'acscent-demo-watermark'

export function watermarkUnlocked(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** 다른 탭(storage 이벤트)과 같은 탭(EVENT)의 변경을 함께 듣는다 */
export function subscribeWatermark(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) onChange() }
  window.addEventListener('storage', onStorage)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(EVENT, onChange)
  }
}

function set(off: boolean) {
  try {
    if (off) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch {
    /* 저장소를 못 쓰면 바꾸지 않는다 */
  }
  window.dispatchEvent(new Event(EVENT))
}

/** 비밀번호 확인 → 성공하면 끈다. 실패 이유를 문장으로 돌려준다 */
export async function unlockWatermark(pin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/demo/watermark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }), cache: 'no-store' })
    if (res.ok) {
      set(true)
      return { ok: true }
    }
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    return { ok: false, error: data?.error ?? '확인하지 못했습니다.' }
  } catch {
    return { ok: false, error: '인터넷 연결을 확인해 주세요.' }
  }
}

export function relockWatermark() {
  set(false)
}
