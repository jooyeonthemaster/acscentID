import type { Metadata } from 'next'
import { FungroundCareer } from './FungroundCareer'

// 펀그라운드 별내 B안 미래 직업 탐색(NEXT!) — /booth-demo/funground/career?demo=1
// 질문 여덟 개 → 탐색해 볼 직업 셋 + 미리 쓴 축 조합 풀이. 카메라 · 외부 서비스를 쓰지 않는다.
export const metadata: Metadata = { title: 'NEXT! 미래 직업 탐색', robots: { index: false, follow: false } }

export default function FungroundCareerPage() {
  return <FungroundCareer />
}
