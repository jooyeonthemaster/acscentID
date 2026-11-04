// SCENT! AI 조향사 화면 ↔ 기존(classic) 셸의 약속.
// 상태와 동작(분석·촬영·QR·영수증·인쇄·기록·무입력)은 전부 셸(KioskClassic)이 들고, 이 화면은 그리기만 한다 —
// 디자인을 바꾸려고 흐름을 따로 만들지 않는다(docs/kiosk-modes.md 'AI 조향사 전용 화면').

import type { ReactNode, SyntheticEvent } from 'react'
import type { ImageAnalysisResult } from '@/types/analysis'
import type { KioskLang, KioskText } from '@/lib/kiosk/i18n'
import type { PerfumerText } from '@/lib/kiosk/perfumer-i18n'
import type { AnalyzeErrorKind } from '@/lib/kiosk/analyze-error'
import type { CamFrameSize } from '../useCamFrame'

export type PfStep = 'attract' | 'info' | 'style' | 'personality' | 'charm' | 'capture' | 'analyzing' | 'result'
export type PfPickKind = 'style' | 'personality' | 'charm'
export type PfQrState = 'idle' | 'creating' | 'waiting' | 'expired' | 'failed'

export interface PerfumerCtx {
  step: PfStep
  /** 입력 단계(이름·성별 → 스타일 → 성격 → 매력 → 사진) — 점 표시와 '01 / 05' */
  inputSteps: PfStep[]
  lang: KioskLang
  setLang: (lang: KioskLang) => void
  /** 분석을 시작하면 결과 문장이 그 언어로 만들어지므로 언어를 바꾸지 않는다 */
  langLocked: boolean
  t: KioskText
  p: PerfumerText
  attractTitle: [string, string]
  maxPick: number

  // ── 입력 ──
  name: string
  gender: string
  setGender: (gender: string) => void
  keyboardOpen: boolean
  openKeyboard: () => void
  /** 셸의 터치 키보드(한글·영문·가나·병음) — 열려 있을 때만 */
  keyboard: ReactNode
  picks: Record<PfPickKind, string[]>
  /** 표시용 번역 — 값은 한국어 원본(분석 입력) */
  pickLabels: Record<PfPickKind, Record<string, string>>
  pickOptions: Record<PfPickKind, string[]>
  togglePick: (kind: PfPickKind, value: string) => void
  start: () => void
  next: () => void
  prev: () => void
  /** 체험 마치기·처음으로 — 이름·사진·결과·영수증을 모두 지운다 */
  home: () => void

  // ── 촬영 · 휴대폰 사진 ──
  photo: string | null
  photoSource: 'camera' | 'qr'
  /** 카메라 영상 요소를 셸의 videoRef 에 건다(콜백 ref — 렌더 중에 ref 를 읽지 않게) */
  videoRef: (el: HTMLVideoElement | null) => void
  frame: {
    slotRef: (el: HTMLDivElement | null) => void
    size: CamFrameSize | null
    onPhotoLoad: (event: SyntheticEvent<HTMLImageElement>) => void
  }
  camReady: boolean
  camError: null | 'denied' | 'unavailable'
  countdown: number | null
  /** 매장 키오스크 앱 안 — 파일 선택(OS 탐색기)을 열지 않는다 */
  inShell: boolean
  onFile: (file: File) => void
  shoot: () => void
  retake: () => void
  useCamera: () => void
  useQr: () => void
  regenQr: () => void
  backFromQr: () => void
  qr: { state: PfQrState; dataUrl: string | null; code: string | null; unreachable: boolean }
  analyze: () => void

  // ── 분석 ──
  analyzeError: AnalyzeErrorKind | null
  statusLines: string[]
  statusIdx: number
  eta: string

  // ── 결과 ──
  result: ImageAnalysisResult | null
  mocked: boolean
  product: { label: string; fragranceMl: number; baseMl: number }

  // ── 영수증 · 인쇄 ──
  receipt: { dataUrl: string } | null
  /** 영수증 원판을 만드는 중(발권 번호를 받고 그리는 동안) */
  receiptBusy: boolean
  printing: boolean
  printedOnce: boolean
  /** 프린터가 실패를 알렸다 — 성공으로 보이지 않게 따로 띄운다 */
  printError: string | null
  hasPrinter: boolean
  ticket: string | null
  openReceipt: () => void
  printAgain: () => void
  savePng: () => void
  closeReceipt: () => void
  dismissPrintError: () => void

  // ── 안내 ──
  idleLeft: number | null
  idleTotal: number
  toast: string | null
  adminHotspot: ReactNode
  adminPanel: ReactNode
}
