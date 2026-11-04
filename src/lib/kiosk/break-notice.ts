export interface KioskBreakNotice {
  active: boolean
  kind: 'break' | 'closed'
  title: string
  message: string
  resumeTime: string
}

export const DEFAULT_BREAK_NOTICE: KioskBreakNotice = Object.freeze({
  active: false,
  kind: 'break',
  title: '브레이크 타임',
  message: '더 나은 체험을 위해 잠시 쉬어갑니다.\n잠시 후 다시 찾아주세요.',
  resumeTime: '',
})

export const CLOSED_NOTICE: KioskBreakNotice = Object.freeze({
  active: false,
  kind: 'closed',
  title: '운영 종료 안내',
  message: '오늘의 체험 운영이 종료되었습니다.\n함께해 주셔서 감사합니다.',
  resumeTime: '',
})

const STORAGE_KEY = 'acscent-kiosk-break-notice-v1'
const CHANGE_EVENT = 'acscent-kiosk-break-notice-change'
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function noticeText(raw: unknown, max: number, fallback: string): string {
  return typeof raw === 'string' ? raw.trim().slice(0, max) || fallback : fallback
}

export function normalizeBreakNotice(raw: unknown): KioskBreakNotice {
  const value = raw && typeof raw === 'object' ? raw as Partial<KioskBreakNotice> : {}
  // 이전 버전이 저장한 공지에는 kind가 없으므로 기존 브레이크 안내로 읽는다.
  const kind = value.kind === 'closed' ? 'closed' : 'break'
  const defaults = kind === 'closed' ? CLOSED_NOTICE : DEFAULT_BREAK_NOTICE
  const time = typeof value.resumeTime === 'string' ? value.resumeTime.trim() : ''
  return {
    active: value.active === true,
    kind,
    title: noticeText(value.title, 40, defaults.title),
    message: noticeText(value.message, 240, defaults.message),
    resumeTime: kind === 'break' && TIME_PATTERN.test(time) ? time : '',
  }
}

let cachedWindow: Window | undefined
let cachedRaw: string | null | undefined
let cachedSnapshot: KioskBreakNotice = DEFAULT_BREAK_NOTICE

/** useSyncExternalStore의 getSnapshot. 내용이 같으면 같은 객체를 돌려준다. */
export function getBreakNoticeSnapshot(): KioskBreakNotice {
  if (typeof window === 'undefined') return DEFAULT_BREAK_NOTICE
  if (cachedWindow !== window) {
    cachedWindow = window
    cachedRaw = undefined
    cachedSnapshot = DEFAULT_BREAK_NOTICE
  }
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // 이미 켠 안내가 일시적인 읽기 실패 때문에 갑자기 꺼지지 않게 마지막 정상 값을 유지한다.
    return cachedSnapshot
  }
  if (raw === cachedRaw) return cachedSnapshot
  let parsed: unknown
  try { parsed = raw === null ? undefined : JSON.parse(raw) } catch { parsed = undefined }
  const next = normalizeBreakNotice(parsed)
  cachedRaw = raw
  if (
    next.active !== cachedSnapshot.active || next.kind !== cachedSnapshot.kind || next.title !== cachedSnapshot.title ||
    next.message !== cachedSnapshot.message || next.resumeTime !== cachedSnapshot.resumeTime
  ) cachedSnapshot = Object.freeze(next)
  return cachedSnapshot
}

/** SSR의 getServerSnapshot은 항상 같은 inactive 기본 객체다. */
export function getServerBreakNoticeSnapshot(): KioskBreakNotice {
  return DEFAULT_BREAK_NOTICE
}

/** 관리자 입력용 복사본. 구독하는 화면은 stable getBreakNoticeSnapshot을 사용한다. */
export function readBreakNotice(): KioskBreakNotice {
  return { ...getBreakNoticeSnapshot() }
}

/** 이 기기에만 저장한다. 저장 실패 시 메모리 적용이나 변경 알림도 하지 않는다. */
export function saveBreakNotice(value: KioskBreakNotice): boolean {
  if (typeof window === 'undefined') return false
  const serialized = JSON.stringify(normalizeBreakNotice(value))
  try {
    const storage = window.localStorage
    // 읽기가 차단된 상태에서는 저장부터 해 버리지 않는다(실패 안내와 실제 상태가 달라지는 것 방지).
    storage.getItem(STORAGE_KEY)
    storage.setItem(STORAGE_KEY, serialized)
    if (storage.getItem(STORAGE_KEY) !== serialized) return false
  } catch {
    return false
  }
  getBreakNoticeSnapshot()
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  return true
}

/** 같은 창의 관리자·공지와 같은 기기의 다른 탭을 함께 갱신한다. 다른 기기에는 전파하지 않는다. */
export function subscribeBreakNotice(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const target = window
  const onChange = () => listener()
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  target.addEventListener(CHANGE_EVENT, onChange)
  target.addEventListener('storage', onStorage)
  return () => {
    target.removeEventListener(CHANGE_EVENT, onChange)
    target.removeEventListener('storage', onStorage)
  }
}

/** 빠른 재개 시간 설정(10·20·30분 등)은 기기 OS 시간대와 무관하게 한국 시간으로 표시한다. */
export function breakTimeAfter(minutes: number, now = new Date()): string {
  const offset = Number.isFinite(minutes) ? Math.max(0, minutes) : 0
  const date = new Date(now.getTime() + offset * 60_000)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date)
}
