import { BoothClient } from './BoothClient'

// 매장 포토부스 화면 — 매장 태블릿/PC 전용, 로케일 라우팅 제외(미들웨어 skip), 검색 노출 금지
export const metadata = {
  title: "포토부스 | AC'SCENT IDENTITY",
  robots: { index: false, follow: false },
}

export default function BoothPage() {
  return <BoothClient />
}
