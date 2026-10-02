// 키오스크 분석 실패 분류 — 손님에게 '무엇 때문인지'를 맞게 알리려고 나눈다.
// network: 기기→서버 요청 자체가 실패(인터넷 끊김·DNS). timeout: 기다리다 포기(서버가 느림).
// server: 서버가 답했지만 결과를 못 만듦(500 ANALYZE_FAILED 등). 예전엔 셋 다 '서버에 연결할 수 없음'이었다.

export type AnalyzeErrorKind = 'network' | 'timeout' | 'server'

/** fetch 가 응답 없이 실패했을 때 */
export function classifyFetchError(error: unknown): AnalyzeErrorKind {
  const name = error instanceof Error ? error.name : ''
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network'
  // 응답을 받았으나 본문이 JSON 이 아님(게이트웨이 오류 페이지 등) — 서버 쪽 문제
  if (error instanceof SyntaxError) return 'server'
  return 'network'
}
