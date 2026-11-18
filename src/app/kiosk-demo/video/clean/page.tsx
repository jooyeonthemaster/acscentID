import { DEMO_CLEAN_KEY_PARAM } from '@/lib/demo-clean'
import { readCleanDemoKey } from '@/lib/demo-clean-server'
import { VIDEO_DEMO_META, VideoDemoLanding } from '../VideoDemoLanding'

// 워터마크 없는 영상판 데모 랜딩 — 관리자 비밀번호로 만든 기간 있는 서명(?k=…)이 맞을 때만 demo=clean&k=… 로 연다(/kiosk-demo/clean 과 같은 규칙, src/lib/demo-clean.ts).
// 기본 랜딩 맨 위 탭(DemoTabs)이 서명을 이어 이리로 보낸다
export const dynamic = 'force-dynamic'
export const metadata = VIDEO_DEMO_META

export default async function KioskVideoDemoPageClean({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = (await searchParams)[DEMO_CLEAN_KEY_PARAM]
  const valid = typeof key === 'string' && readCleanDemoKey(key) !== null
  return <VideoDemoLanding cleanKey={valid ? key : undefined} cleanRejected={!valid} />
}
