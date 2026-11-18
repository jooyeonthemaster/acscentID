import { VIDEO_DEMO_META, VideoDemoLanding } from './VideoDemoLanding'

// 키오스크 영상판 데모 랜딩(/kiosk-demo/video) — 워터마크 없는 판은 /kiosk-demo/video/clean?k=…
export const metadata = VIDEO_DEMO_META

export default function KioskVideoDemoPage() {
  return <VideoDemoLanding />
}
