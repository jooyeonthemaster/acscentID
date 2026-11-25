import { redirect } from 'next/navigation'

// 예전 키오스크 영상판 데모 랜딩(/kiosk-demo/video) — 2026-11-25 사용자 지시로 영상판 카드를 키오스크 · 포토부스 랜딩의 기본판 옆으로 옮겼다.
// 이미 나간 링크가 있어 키오스크 랜딩으로 넘긴다(워터마크 없는 판은 /kiosk-demo/video/clean → /kiosk-demo/clean)
export default function KioskVideoDemoPage() {
  redirect('/kiosk-demo')
}
