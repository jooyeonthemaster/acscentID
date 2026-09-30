/** 카운터 발급 이용권 유효 시간(분) — 발급 시각부터. 카운터 화면(클라이언트)과 발급 API 가 같이 쓴다 */
export const COUNTER_VALID_MINUTES = { default: 30, min: 5, max: 24 * 60 } as const

/** 30 → '30분', 90 → '1시간 30분' */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}분`
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`
}
