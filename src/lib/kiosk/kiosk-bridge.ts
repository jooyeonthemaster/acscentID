// 키오스크 네이티브 브리지 계약 — JIMFF AI조향사 셸(window.kiosk)과 동일한 표면.
// window.kiosk가 없으면 순수 웹으로 동작한다(미리보기/다운로드 폴백). Electron 이식 시 코드 변경 없음.

export interface KioskPrintResult {
  success: boolean
  ticket?: string
  bytes?: number
  error?: string
}

export interface KioskSaveResult {
  success: boolean
  dir?: string
  error?: string
}

export interface KioskBridge {
  isElectron: true
  locked: boolean
  autoPrint: boolean
  hasPrinter: boolean
  receiptMode: 'text' | 'image'
  receiptDetail: 'full' | 'compact'
  version: string
  /** data.receiptImageBase64(순수 base64 PNG)가 있으면 프린터는 그 이미지만 찍는다.
   *  data.ticket(4자리 이상 숫자)이 있으면 재인쇄로 간주해 번호를 유지한다. */
  printReceipt(data: Record<string, unknown>): Promise<KioskPrintResult>
  /** 선채번 — 인쇄 전에 티켓 번호를 미리 받아 영수증 캔버스에 그려 넣는다.
   *  (JIMFF 셸에는 없던 확장: 없으면 첫 장은 번호 없이 인쇄되고 응답 번호로 재인쇄분만 갱신된다) */
  nextTicket?(): Promise<{ success: boolean; ticket?: string }>
  saveResult(data: Record<string, unknown>): Promise<KioskSaveResult>
  quitApp(): Promise<void>
}

declare global {
  interface Window {
    kiosk?: KioskBridge
  }
}

export function getKioskBridge(): KioskBridge | undefined {
  if (typeof window === 'undefined') return undefined
  return window.kiosk
}

export function isKioskShell(): boolean {
  return Boolean(getKioskBridge()?.isElectron)
}
