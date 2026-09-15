import { KioskClient } from './KioskClient'

// 오프라인 키오스크 화면 — 매장/행사 무인 기기 전용, 로케일 라우팅 제외, 검색 노출 금지.
// 웹 초안 단계: 브라우저에서 그대로 동작하며(영수증은 미리보기/다운로드),
// Electron 셸(window.kiosk)에 올리면 감열 프린터 인쇄·결과 아카이브가 활성화된다.
export const metadata = {
  title: "AC'SCENT WOW AI 조향사",
  robots: { index: false, follow: false },
}

export default function KioskPage() {
  return <KioskClient />
}
