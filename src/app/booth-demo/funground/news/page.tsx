import type { Metadata } from 'next'
import { FungroundNews } from './FungroundNews'

// 펀그라운드 별내 「FUTURE NEWS! 2046 별내 신문」 — /booth-demo/funground/news?engine=ai|local&demo=1
//   오늘 찍은 사진(기기 안에서 사람만 오려 냄 · 얼굴은 그대로) + 질문 셋(꿈 · 좋아하는 것 · 해 보고 싶은 일) → 20년 뒤 신문 1면(4×6).
//   engine=local(B안): 기사도 기기 안 — 미리 쓴 틀(src/lib/funground/news-template.ts)에서 대답대로 채운다. /api 를 부르지 않는다.
//   engine=ai(A안): 대답 셋만 /api/funground/news 로 보내 AI 기자가 기사를 쓴다(사진은 보내지 않는다). 실패하면 B안 기사로 대신한다.
export const metadata: Metadata = { title: 'FUTURE NEWS! 2046 별내 신문 · FUN GROUND', robots: { index: false, follow: false } }

export default function FungroundNewsPage() {
  return <FungroundNews />
}
