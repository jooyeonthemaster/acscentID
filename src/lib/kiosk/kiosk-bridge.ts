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
  /** 네이티브 셸(Electron)인지 — 로컬 인쇄 브리지로 붙은 경우 false */
  isElectron: boolean
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

/**
 * 로컬 인쇄 브리지 — Electron 셸 없이 매장 PC에서 영수증을 뽑기 위한 경로.
 * 같은 PC에서 tools/kiosk-print-bridge/server.mjs 를 띄우고,
 * NEXT_PUBLIC_KIOSK_PRINT_BRIDGE=http://127.0.0.1:9110 로 주소를 알려주면 켜진다.
 * (일회성 테스트는 주소창에 ?printer=http://127.0.0.1:9110 을 붙여도 된다)
 *
 * 셸(window.kiosk)이 있으면 항상 그쪽이 우선이다.
 */
function localPrintBridge(baseUrl: string): KioskBridge {
  const url = baseUrl.replace(/\/$/, '')

  const post = async (pathname: string, body?: unknown) => {
    const res = await fetch(`${url}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    return res.json()
  }

  return {
    isElectron: false,
    locked: false,
    autoPrint: false,
    hasPrinter: true,
    receiptMode: 'image',
    receiptDetail: 'full',
    version: 'print-bridge',
    async printReceipt(data) {
      try {
        return await post('/print', {
          receiptImageBase64: data.receiptImageBase64,
          ticket: data.ticket,
        })
      } catch (error) {
        // 서비스가 꺼져 있으면 여기로 온다 — 화면은 '인쇄 실패' 토스트를 띄운다
        console.error('[kiosk] 인쇄 브리지 연결 실패:', error)
        return { success: false, error: '인쇄 서비스에 연결할 수 없습니다' }
      }
    },
    async nextTicket() {
      try {
        return await post('/ticket')
      } catch {
        return { success: false }
      }
    },
    // 결과 아카이브·종료는 셸 기능이라 브리지에서는 하는 일이 없다
    async saveResult() {
      return { success: true }
    },
    async quitApp() {
      /* no-op */
    },
  }
}

function printBridgeUrl(): string | null {
  const fromQuery =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('printer') : null
  const url = fromQuery || process.env.NEXT_PUBLIC_KIOSK_PRINT_BRIDGE || ''
  return url.startsWith('http') ? url : null
}

let cachedBridge: KioskBridge | undefined

export function getKioskBridge(): KioskBridge | undefined {
  if (typeof window === 'undefined') return undefined
  if (window.kiosk) return window.kiosk

  const url = printBridgeUrl()
  if (!url) return undefined
  // 매 렌더마다 새 객체를 만들면 이펙트 의존성이 계속 바뀐다
  if (!cachedBridge) cachedBridge = localPrintBridge(url)
  return cachedBridge
}

export function isKioskShell(): boolean {
  return Boolean(getKioskBridge()?.isElectron)
}
