import type { Metadata } from 'next'
import { FungroundLanding } from '../FungroundLanding'
import { DEMO_CLEAN_KEY_PARAM } from '@/lib/demo-clean'
import { readCleanDemoKey } from '@/lib/demo-clean-server'

// 워터마크 없는 펀그라운드 데모 랜딩 — 관리자 비밀번호로 만든 기간 있는 서명(?k=…)이 맞을 때만 demo=clean&k=… 로 연다(/booth-demo/clean 과 같은 규칙).
// 서명이 없거나 지났으면 워터마크 판으로 보여 주고 알린다. src/lib/demo-clean.ts
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: '펀그라운드 별내 체험 부스 데모',
  description: '펀그라운드 별내 상설 체험기 견적(A안 AI 생성형 · B안 기기 안 처리형)의 프로그램을 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default async function FungroundDemoPageClean({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = (await searchParams)[DEMO_CLEAN_KEY_PARAM]
  const valid = typeof key === 'string' && readCleanDemoKey(key) !== null
  return <FungroundLanding cleanKey={valid ? key : undefined} cleanRejected={!valid} />
}
