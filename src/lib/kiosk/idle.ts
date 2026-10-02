// 키오스크 무입력 타임아웃 — 포토부스와 같은 규칙(30초 조용 → 화면 가운데 10초 안내창 '계속' → 처음으로).
// 처음으로 돌아가면 언어는 한국어(기본)로 돌아간다(resetAll). 값은 여기만 고친다 — 기존·레트로·맥 공통.

export interface IdleWindow {
  /** 아무 입력 없이 이만큼(초) 지나면 안내창을 띄운다 */
  silent: number
  /** 안내창이 떠 있는 시간(초) — 끝나면 처음으로 */
  warn: number
}

export const IDLE_SILENT_S = 30
export const IDLE_WARN_S = 10

/** 결과 화면 — 읽을 거리가 많다(한 장 스크롤이면 6화면 분량). 총 90초 */
export const RESULT_IDLE_SILENT_S = 80

/** 영수증 미리보기·발권 뒤 — 손님은 볼일을 마쳤다 */
export const RECEIPT_IDLE_SILENT_S = 20

/** 폰으로 QR 을 찍고 갤러리를 뒤지는 동안은 화면 터치가 없다(최애 사진 받기) — 총 7분 */
export const QR_IDLE_SILENT_S = 410

/** 카메라 앞에서 포즈를 잡는 동안도 터치가 없다(최애 분석 촬영) */
export const CAPTURE_IDLE_SILENT_S = 60

interface IdleContext {
  step: string
  receiptOpen: boolean
  qrWaiting: boolean
  /** 분석 실패 카드가 떠 있다 — 분석 중이 아니라 손님 선택을 기다리는 화면 */
  analyzeFailed: boolean
}

/** 지금 화면의 무입력 규칙. null 이면 세지 않는다(대기 화면·분석 중) */
export function idleWindowFor({ step, receiptOpen, qrWaiting, analyzeFailed }: IdleContext): IdleWindow | null {
  if (receiptOpen) return { silent: RECEIPT_IDLE_SILENT_S, warn: IDLE_WARN_S }
  if (step === 'attract') return null
  // 분석 중에는 멈춘다 — 서버는 92초, 기기는 110초 안에 반드시 끝나므로 잠길 일이 없다
  if (step === 'analyzing') return analyzeFailed ? { silent: IDLE_SILENT_S, warn: IDLE_WARN_S } : null
  if (step === 'result') return { silent: RESULT_IDLE_SILENT_S, warn: IDLE_WARN_S }
  if (step === 'capture') return { silent: qrWaiting ? QR_IDLE_SILENT_S : CAPTURE_IDLE_SILENT_S, warn: IDLE_WARN_S }
  return { silent: IDLE_SILENT_S, warn: IDLE_WARN_S }
}
