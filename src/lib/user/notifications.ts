// 인앱 알림 (user_profiles.preferences.notifications 에 저장 — 마이그레이션 불필요)
// 이 파일은 클라이언트/서버 공용. 서비스 롤을 쓰는 헬퍼는 notifications.server.ts 에 둔다.

export type NotificationType = 'shipping' | 'refund' | 'order' | 'general'

export interface UserNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  link?: string
  created_at: string // ISO
  read: boolean
}

// 사용자당 보관 최대 개수
export const MAX_NOTIFICATIONS = 50

// 상대 시간 표기 (locale 자동) — "방금 전", "3분 전" 등
export function formatRelativeTime(iso: string, locale = 'ko'): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = then - Date.now()
  const absSec = Math.abs(diffMs) / 1000

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  for (const [unit, sec] of units) {
    if (absSec >= sec) {
      return rtf.format(Math.round(diffMs / 1000 / sec), unit)
    }
  }
  return rtf.format(Math.round(diffMs / 1000), 'second')
}
