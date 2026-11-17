import type { Metadata } from 'next'
import { NhLanding } from '../NhLanding'
import { DEMO_CLEAN_KEY_PARAM } from '@/lib/demo-clean'
import { readCleanDemoKey } from '@/lib/demo-clean-server'

// 워터마크 없는 연말 시상식 데모 랜딩 — 관리자 비밀번호로 만든 기간 있는 서명(?k=…)이 맞을 때만 demo=clean&k=… 로 연다(/booth-demo/clean 과 같은 규칙).
// 서명이 없거나 지났으면 워터마크 판으로 보여 주고 알린다. src/lib/demo-clean.ts
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: '연말 시상식 AI 체험존 데모',
  description: 'AI 소믈리에 키오스크와 포토부스 새해 이야기(관상 · 사주 · 손금)를 직접 해 보고 고르는 데모입니다.',
  robots: { index: false, follow: false },
}

export default async function NhDemoPageClean({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = (await searchParams)[DEMO_CLEAN_KEY_PARAM]
  const valid = typeof key === 'string' && readCleanDemoKey(key) !== null
  return <NhLanding cleanKey={valid ? key : undefined} cleanRejected={!valid} />
}
