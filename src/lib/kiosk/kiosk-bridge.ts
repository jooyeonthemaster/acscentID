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
  /** 관리자 PIN을 기기(셸 config.json)에서 확인한다 — 인터넷이 끊겨 서버 확인이 안 될 때
   *  앱 종료만이라도 열어 주기 위한 것. PIN이 공개되는 웹 코드에 들어가지 않는다.
   *  (2026-09 셸 패치로 추가 — 없는 셸이면 오프라인 종료는 불가) */
  checkAdminPin?(pin: string): Promise<boolean>
  /** 'qr' — 프린터 없는 기기(안드로이드 키오스크 앱): 영수증을 인쇄하는 대신 휴대폰 QR 로 받게 한다.
   *  없으면 예전처럼 hasPrinter 로 인쇄 · 미리보기를 고른다 */
  receiptDelivery?: 'qr'
  /** 기기 앱이 정한 기본 운영 모드 — 관리자 창에서 이 기기 모드를 따로 고르지 않았을 때(device-mode.ts) */
  defaultMode?: string
}

/** 안드로이드 키오스크 앱(tools/kiosk-android)이 웹뷰에 거는 객체 — 동기 호출이고 값은 문자열 · 불리언만 오간다 */
interface AndroidKioskHost {
  info(): string
  nextTicket(): string
  quitApp(): void
  checkAdminPin(pin: string): boolean
  reload(): void
}

declare global {
  interface Window {
    kiosk?: KioskBridge
    AcscentAndroid?: AndroidKioskHost
  }
}

/**
 * 안드로이드 키오스크 앱 — 프린터가 없는 기기(SUNMI TOSS_Front 등). 결과는 휴대폰 QR 로 받는다(receiptDelivery 'qr').
 * 발권 번호는 앱이 그날 0001 부터 매긴다 — 손님 휴대폰의 결과에 찍혀 직원이 보고 조향한다.
 * isElectron 은 "매장 기기 앱 안"이라는 뜻으로 true(DEMO 워터마크 · 관리자 창의 앱 종료가 이 값을 본다).
 */
function androidBridge(host: AndroidKioskHost): KioskBridge {
  let info: { version?: string; defaultMode?: string } = {}
  try { info = JSON.parse(host.info()) } catch { /* 예전 앱 — 기본값 */ }
  return {
    isElectron: true,
    locked: true,
    autoPrint: false,
    hasPrinter: false,
    receiptMode: 'image',
    receiptDetail: 'full',
    receiptDelivery: 'qr',
    defaultMode: info.defaultMode || undefined,
    version: `android-${info.version ?? '?'}`,
    async printReceipt() {
      return { success: false, error: '이 기기에는 프린터가 없습니다' }
    },
    async nextTicket() {
      try {
        const ticket = host.nextTicket()
        return ticket ? { success: true, ticket } : { success: false }
      } catch {
        return { success: false }
      }
    },
    async saveResult() {
      return { success: true }
    },
    async quitApp() {
      host.quitApp()
    },
    async checkAdminPin(pin) {
      try { return host.checkAdminPin(pin) } catch { return false }
    },
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
  if (window.AcscentAndroid) {
    if (!cachedBridge) cachedBridge = androidBridge(window.AcscentAndroid)
    return cachedBridge
  }

  const url = printBridgeUrl()
  if (!url) return undefined
  // 매 렌더마다 새 객체를 만들면 이펙트 의존성이 계속 바뀐다
  if (!cachedBridge) cachedBridge = localPrintBridge(url)
  return cachedBridge
}

export function isKioskShell(): boolean {
  return Boolean(getKioskBridge()?.isElectron)
}

/** 결과를 인쇄 대신 휴대폰 QR 로 주는 기기인가(안드로이드 키오스크 앱) */
export function receiptByQr(bridge: KioskBridge | undefined = getKioskBridge()): boolean {
  return bridge?.receiptDelivery === 'qr'
}
