import type { Metadata } from 'next'
import { BoothDemoLanding } from '../BoothDemoLanding'
import { DEMO_CLEAN_KEY_PARAM } from '@/lib/demo-clean'
import { readCleanDemoKey } from '@/lib/demo-clean-server'

// 워터마크 없는 데모 랜딩 — 관리자 비밀번호로 만든 기간 있는 서명(?k=…)이 맞을 때만 워터마크 없는 데모 주소(demo=clean&k=…)로 연다.
// 서명이 없거나 지났으면 기본판(워터마크)으로 보여 주고 알린다(2026-11-11 — 예전에는 이 주소만 알면 워터마크가 빠졌다). src/lib/demo-clean.ts
// 주소를 받은 사람만 본다(검색 노출 금지). 워터마크 있는 기본판은 /booth-demo.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'NEANDER 포토부스 데모',
  description: 'AI 아이돌·런웨이·한복·웨딩 등 AI 사진 프로그램과 뮤직비디오·추억 무비 영상을 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default async function BoothDemoPageClean({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = (await searchParams)[DEMO_CLEAN_KEY_PARAM]
  const valid = typeof key === 'string' && readCleanDemoKey(key) !== null
  return <BoothDemoLanding cleanKey={valid ? key : undefined} cleanRejected={!valid} />
}
