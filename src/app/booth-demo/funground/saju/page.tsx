import type { Metadata } from 'next'
import { FungroundSaju } from './FungroundSaju'

// 펀그라운드 별내 사주 — /booth-demo/funground/saju?engine=local|ai&demo=1
//   engine=local: B안 SAJU! 사주(체험 프로그램) — 만세력 계산 · 미리 쓴 풀이 문장 고르기 모두 기기 안. /api 를 부르지 않는다.
//   engine=ai: A안 FORTUNE! AI 포춘 — /api/funground/fortune 이 원국을 계산하고 AI 가 청소년 풀이를 쓴다(실패하면 미리 쓴 풀이로 대신).
export const metadata: Metadata = { title: 'SAJU! 나의 사주', robots: { index: false, follow: false } }

export default function FungroundSajuPage() {
  return <FungroundSaju />
}
