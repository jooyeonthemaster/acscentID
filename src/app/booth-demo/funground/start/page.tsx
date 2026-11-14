import type { Metadata } from 'next'
import { FungroundStart } from './FungroundStart'

// 펀그라운드 체험기 시작 화면(가로)(프로그램 고르기) — /booth-demo/funground/start?plan=a|b&demo=1
export const metadata: Metadata = { title: 'FUN GROUND 체험 부스', robots: { index: false, follow: false } }

export default function FungroundStartPage() {
  return <FungroundStart />
}
