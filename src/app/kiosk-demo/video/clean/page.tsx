import { redirect } from 'next/navigation'
import { DEMO_CLEAN_KEY_PARAM } from '@/lib/demo-clean'

// 예전 워터마크 없는 영상판 데모 랜딩 — 서명(?k=)을 그대로 붙여 /kiosk-demo/clean 으로 넘긴다(../page.tsx 참고)
export const dynamic = 'force-dynamic'

export default async function KioskVideoDemoPageClean({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = (await searchParams)[DEMO_CLEAN_KEY_PARAM]
  redirect(typeof key === 'string' ? `/kiosk-demo/clean?${DEMO_CLEAN_KEY_PARAM}=${encodeURIComponent(key)}` : '/kiosk-demo/clean')
}
