import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** 지금 배포된 버전 — 매장 부스 화면이 새 배포를 알아채고 손님이 없을 때 새로고침한다 */
export function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'dev' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
