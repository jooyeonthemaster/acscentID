import type { Metadata } from 'next'
import { KioskDemoLanding } from '../KioskDemoLanding'
import { DEMO_CLEAN_KEY_PARAM } from '@/lib/demo-clean'
import { readCleanDemoKey } from '@/lib/demo-clean-server'

// 워터마크 없는 데모 랜딩 — 관리자 비밀번호로 만든 기간 있는 서명(?k=…)이 맞을 때만 워터마크 없는 데모 주소(demo=clean&k=…)로 연다.
// 서명이 없거나 지났으면 기본판(워터마크)으로 보여 주고 알린다(2026-11-11 — 예전에는 이 주소만 알면 워터마크가 빠졌다). src/lib/demo-clean.ts
// 주소를 받은 사람만 본다(검색 노출 금지). 워터마크 있는 기본판은 /kiosk-demo.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'NEANDER 키오스크 데모',
  description: '세로형 터치 키오스크의 체험 프로그램 31가지를 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default async function KioskDemoPageClean({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = (await searchParams)[DEMO_CLEAN_KEY_PARAM]
  const valid = typeof key === 'string' && readCleanDemoKey(key) !== null
  return <KioskDemoLanding cleanKey={valid ? key : undefined} cleanRejected={!valid} />
}
