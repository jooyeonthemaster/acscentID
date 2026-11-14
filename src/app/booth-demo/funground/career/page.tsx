import type { Metadata } from 'next'
import { FungroundCareer } from './FungroundCareer'

// 펀그라운드 별내 B안 미래 직업 탐색(NEXT!) — /booth-demo/funground/career?demo=1
// 사진 한 장(결과 카드용 · 얼굴 분석 없음) → 질문 여덟 개 → 탐색해 볼 직업 셋 + 미리 쓴 축 조합 풀이 · 4×6 카드 인쇄.
// AI · 외부 서비스를 쓰지 않는다(인쇄 창의 휴대폰 받기 QR 만 카드 그림을 우리 서버에 24시간 올린다).
export const metadata: Metadata = { title: 'NEXT! 미래 직업 탐색', robots: { index: false, follow: false } }

export default function FungroundCareerPage() {
  return <FungroundCareer />
}
