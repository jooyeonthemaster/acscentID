import type { Metadata } from 'next'
import { FungroundColor } from './FungroundColor'

// 펀그라운드 별내 B안 퍼스널 컬러(COLOR!) — /booth-demo/funground/color?demo=1
// 사진 한 장 → 기기 안에서 피부 · 머리카락 색을 재고(사람 분리 모델) 숫자 규칙으로 8유형 중 하나 → 미리 쓴 결과.
// 외부 AI 서비스 · /api 를 부르지 않는다. 사진은 화면 메모리에만 있다가 처음으로 돌아가면 지운다.
export const metadata: Metadata = { title: 'COLOR! 퍼스널 컬러', robots: { index: false, follow: false } }

export default function FungroundColorPage() {
  return <FungroundColor />
}
