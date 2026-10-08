'use client'

// AC'SCENT 키오스크 — 매장/행사 무인 기기용 향 분석 플로우 (웹 초안).
// 사이트의 /input 5스텝 분석 플로우를 터치 스크린 흐름으로 옮긴 것:
// 어트랙트 → 이름·성별 → 스타일 → 성격 → 매력 → 제품 → 촬영 → 분석 → 결과 → 영수증 출력.
// 손님은 출력된 영수증을 카운터에 제출하고, 스태프가 적힌 레시피대로 제품을 준비한다.
// 현재 AC'SCENT WOW 운영 기준 — PROGRAMS의 enabled로 프로그램을 켜고 끈다.
// window.kiosk(Electron 셸)가 있으면 감열 프린터로 인쇄, 없으면 미리보기/다운로드로 동작한다.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { STYLES, PERSONALITIES, CHARM_POINTS, GENDER_OPTIONS } from '@/app/[locale]/input/constants'
import {
  SajuAnalysisResult,
  KioskAnalysisResult,
  TRAIT_LABELS,
  TraitScores,
  SEASON_LABELS,
  TONE_LABELS,
  type SajuPurpose,
} from '@/types/analysis'
import { PRODUCT_TYPES, ProductType } from '@/types/feedback'
import { renderKioskReceipt, ReceiptData } from '@/lib/kiosk/receipt-canvas'
import { idleWindowFor } from '@/lib/kiosk/idle'
import { classifyFetchError, type AnalyzeErrorKind } from '@/lib/kiosk/analyze-error'
import { PosterTitle } from '../PosterTitle'
import { getKioskBridge } from '@/lib/kiosk/kiosk-bridge'
import { kioskText, KIOSK_LANGS, isCjkLang, type KioskLang } from '@/lib/kiosk/i18n'
import { KIOSK_FONT_CLASS, CJK_FONT_STACK, hanjaFontVar } from '../fonts'
import { OnScreenKeyboard } from './OnScreenKeyboard'
import {
  SajuPurposeGrid, SajuBirthPad, SajuHourGrid, SajuRelationGrid,
  digitsToBirth, validateBirthDigits,
} from '../SajuInput'
import {
  ChapterScent, ChapterProfile, ChapterReading,
  perfumeNoFromId, scentCategoryEn,
} from './ResultView'
import './kiosk-classic.css'
import { useScreenBackgrounds } from '@/lib/screen-backgrounds/use-screen-backgrounds'
import { toKioskTheme } from '@/lib/screen-backgrounds/theme'
import { useScreenUiSwitch } from '@/lib/screen-backgrounds/ui-switch'
import { findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { DeviceDesignControls } from '@/components/screen/DeviceDesignControls'
import { DeviceAdminTools } from '@/components/screen/DeviceAdminTools'
import { useQuitConfirm } from '@/components/screen/QuitConfirm'
import { KioskModeControls } from '@/components/screen/KioskModeControls'
import { findKioskMode, modeAttract, modeCounterNotice, modeEventLines, KIOSK_MODE_IDS, type KioskProgramId } from '@/lib/kiosk/modes'
import { sajuLocale, sajuText } from '@/lib/kiosk/saju-i18n'
import { buildReceiptSaju } from '@/lib/kiosk/saju-receipt'
import { programText } from '@/lib/kiosk/program-i18n'
import { buildReceiptColor, buildReceiptTarot, extraAnalysisText, extraRecordDetail, isColorResult, isTarotResult, scentResultOf } from '@/lib/kiosk/extra-receipt'
import { ColorCaptureTips, ColorReportView } from '../ColorReport'
import { TarotReportView } from '../TarotReport'
import { TarotSteps, useTarotSession } from '../TarotSteps'
import { SajuChartView, SajuOnePageView, SajuPrescriptionView, SajuPurposeView, SajuReadingView } from '../SajuReport'

/** 화면 언어에 맞는 첫 자판 — 손님이 모드를 찾아 누르지 않아도 바로 자기 언어로 쓴다 */
function oskModeFor(lang: KioskLang): 'ko' | 'en' | 'ja' | 'zh' {
  if (lang === 'ko') return 'ko'
  if (lang === 'ja') return 'ja'
  if (lang === 'zh-Hans' || lang === 'zh-Hant') return 'zh'
  return 'en'
}

/** 사이트의 세 분석 프로그램을 키오스크로 옮긴 것 */
export type Program = KioskProgramId

/**
 * enabled = 매장에서 실제로 운영하는 프로그램.
 * AC'SCENT WOW는 '최애 이미지 분석'만 돌리므로 나머지는 코드를 지우지 않고 false로 내려둔다.
 * 다시 true로 올리면 프로그램 선택 화면까지 자동으로 되살아난다.
 */
const PROGRAMS: {
  id: Program
  hanja: string
  title: string
  desc: string
  note: string
  enabled: boolean
}[] = [
  { id: 'personal', hanja: '我', title: '내 이미지 분석', desc: '사진 속 나의 분위기에서 향을 찾습니다', note: '사진 필요', enabled: false },
  { id: 'idol', hanja: '愛', title: '최애 이미지 분석', desc: '좋아하는 사람의 사진에서 향을 찾습니다', note: '사진 필요', enabled: true },
  { id: 'saju', hanja: '命', title: '사주 향 분석', desc: '태어난 시각의 기운으로 향을 처방합니다', note: '생년월일시 필요', enabled: false },
  // 화면에 보이는 이름·설명은 program-i18n.ts(5개 언어)에서 온다 — 여기 문구는 목록을 읽는 사람용
  { id: 'color', hanja: '色', title: 'AI 퍼스널 컬러 진단', desc: '얼굴빛에 어울리는 색과 향을 찾습니다', note: '촬영 필요', enabled: false },
  { id: 'tarot', hanja: '占', title: 'AI 타로', desc: '카드 세 장의 흐름에서 향을 찾습니다', note: '카드 3장', enabled: false },
]

const DEFAULT_PROGRAM: Program = 'idol'

type Step =
  | 'attract'
  | 'program'
  | 'info'
  | 'style'
  | 'personality'
  | 'charm'
  | 'purpose'
  | 'birth'
  | 'hour'
  | 'partner'
  | 'wish'
  | 'topic'
  | 'question'
  | 'cards'
  | 'product'
  | 'capture'
  | 'analyzing'
  | 'result'

/** 어트랙트에서 터치했을 때 들어갈 첫 단계 */


/**
 * 촬영 단계의 기본 입력. 최애 이미지 분석은 손님 폰 갤러리에 있는 사진을 쓰므로
 * QR 업로드를 먼저 띄우고, 키오스크 카메라는 선택지로 남긴다.
 */
const DEFAULT_PHOTO_SOURCE: 'camera' | 'qr' = 'qr'

const IMAGE_STEPS: Step[] = ['info', 'style', 'personality', 'charm', 'product', 'capture']
const SAJU_STEPS: Step[] = ['info', 'purpose', 'birth', 'hour', 'wish', 'product']
const SAJU_STEPS_COMPAT: Step[] = ['info', 'purpose', 'birth', 'hour', 'partner', 'wish', 'product']
// 퍼스널 컬러 — 얼굴을 찍으면 바로 진단. 타로 — 카드를 펼치면 바로 풀이.
// 둘 다 향을 추천하지 않으므로 제품 고르기 단계가 없다(진단서 · 리딩만 인쇄)
const COLOR_STEPS: Step[] = ['info', 'capture']
const TAROT_STEPS: Step[] = ['info', 'topic', 'question', 'cards']

const STEP_LABELS: Record<string, string> = {
  info: 'PROFILE',
  style: 'STYLE',
  personality: 'PERSONALITY',
  charm: 'CHARM',
  purpose: 'PURPOSE',
  birth: 'BIRTH',
  hour: 'HOUR',
  partner: 'PARTNER',
  wish: 'WISH',
  topic: 'TOPIC',
  question: 'QUESTION',
  cards: 'CARDS',
  product: 'PRODUCT',
  capture: 'PHOTO',
}

const MAX_PICK = 3
const FRAGRANCE_DENSITY = 0.9 // g/ml — types/feedback.ts calculateGranuleAmounts와 동일 계수

// 무입력 타임아웃 값·규칙은 src/lib/kiosk/idle.ts (포토부스와 같은 30초 + 10초 안내)

function toggleIn(list: string[], value: string, max: number): string[] {
  if (list.includes(value)) return list.filter((v) => v !== value)
  if (list.length >= max) return list
  return [...list, value]
}

function isMockRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('mock') === '1'
}

/**
 * 미리보기용 — /kiosk?mode=ai-lab 처럼 열면 기기 설정(모든 키오스크가 따라가는 운영 모드)을 건드리지 않고
 * 그 모드로 본다. 매장 기기는 셸이 여는 주소가 고정이라 영향이 없다.
 */
function previewModeId(): string | null {
  if (typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('mode')
  // 없는 모드 이름이면 무시하고 기기 설정을 따른다(예전엔 매장 기본 모드로 떨어졌다)
  return id && KIOSK_MODE_IDS.includes(id) ? id : null
}

/** 사주 결과 → 영수증 명식/처방 데이터 */

function isSajuResult(r: KioskAnalysisResult | null): r is SajuAnalysisResult {
  return Boolean(r && 'sajuChart' in r)
}

export function KioskClassic() {
  const [step, setStep] = useState<Step>('attract')
  const [program, setProgram] = useState<Program>(DEFAULT_PROGRAM)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [styles, setStyles] = useState<string[]>([])
  const [personalities, setPersonalities] = useState<string[]>([])
  const [charms, setCharms] = useState<string[]>([])
  const [productType, setProductType] = useState<ProductType>('perfume_10ml')
  const [photo, setPhoto] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [camError, setCamError] = useState(false)
  const [progress, setProgress] = useState(0)
  /** 분석 실패 — 분석 화면에 남는 오류 카드(다시 시도·처음으로). null 이면 진행 중 */
  const [analyzeError, setAnalyzeError] = useState<AnalyzeErrorKind | null>(null)
  /** 촬영 화면에 남는 안내(퍼스널 컬러에서 얼굴을 못 찾았을 때) — 2.6초 토스트는 다시 찍는 화면에서 이미 사라져 있었다 */
  const [captureNotice, setCaptureNotice] = useState<string | null>(null)
  const [statusIdx, setStatusIdx] = useState(0)
  const [result, setResult] = useState<KioskAnalysisResult | null>(null)
  const [mocked, setMocked] = useState(false)
  const [chapterIdx, setChapterIdx] = useState(0)
  // 사주 입력
  const [purpose, setPurpose] = useState<SajuPurpose | null>(null)
  const [birthDigits, setBirthDigits] = useState('')
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [isLeapMonth, setIsLeapMonth] = useState(false)
  const [hourIndex, setHourIndex] = useState<number | 'unknown' | null>(null)
  const [wish, setWish] = useState('')
  const [wishOpen, setWishOpen] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [partnerGender, setPartnerGender] = useState('')
  const [partnerRelation, setPartnerRelation] = useState('lover')
  const [partnerDigits, setPartnerDigits] = useState('')
  const [partnerCalendar, setPartnerCalendar] = useState<'solar' | 'lunar'>('solar')
  const [partnerLeap, setPartnerLeap] = useState(false)
  const [partnerOskOpen, setPartnerOskOpen] = useState(false)
  // AI 타로 — 주제·질문·섞은 덱·뽑은 카드
  const tarot = useTarotSession()
  const resetTarot = tarot.reset
  const [receipt, setReceipt] = useState<{ dataUrl: string; base64: string } | null>(null)
  const [printing, setPrinting] = useState(false)
  // 실제로 한 번 뽑았는지 — 선채번 때문에 ticketRef 유무로는 판단할 수 없다
  const [printedOnce, setPrintedOnce] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [idleLeft, setIdleLeft] = useState<number | null>(null)
  const [oskOpen, setOskOpen] = useState(false)
  // 폰 QR 업로드
  const [photoSource, setPhotoSource] = useState<'camera' | 'qr'>(DEFAULT_PHOTO_SOURCE)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrState, setQrState] = useState<'idle' | 'creating' | 'waiting' | 'expired' | 'failed'>('idle')
  const [qrUnreachable, setQrUnreachable] = useState(false)
  // 화면 언어 — 손님이 우상단에서 고른다. 분석을 시작하면 그 언어로 고정되고,
  // 처음 화면으로 돌아갈 때(다음 손님) 한국어로 되돌아간다.
  const [lang, setLang] = useState<KioskLang>('ko')
  const [langOpen, setLangOpen] = useState(false)
  const {
    backgrounds,
    activeBackground: backgroundRecord,
    selectedId: backgroundId,
    loading: backgroundsLoading,
    error: backgroundsError,
    refresh: refreshBackgrounds,
    liveEvent: screenLiveEvent,
    baseSettings: deviceBaseSettings,
    selectBackground,
    settings: deviceSettings,
    saveSettings,
    synced: backgroundsSynced,
    unlock: unlockBackgroundAdmin,
  } = useScreenBackgrounds('kiosk')
  // 운영 모드 — 켜는 프로그램·첫 화면 문구·영수증 머리말 (STORE ADMIN 에서 고른다, src/lib/kiosk/modes.ts)
  const kioskMode = findKioskMode(previewModeId() ?? deviceSettings.mode)
  // 문서 언어 — 화면 낭독기·자동 번역·글꼴 선택이 화면 언어를 따르게(키오스크 경로는 로케일 레이아웃 밖이라 비어 있었다)
  const htmlLang = KIOSK_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'
  useEffect(() => {
    const root = document.documentElement
    const prev = root.lang
    root.lang = htmlLang
    return () => {
      root.lang = prev
    }
  }, [htmlLang])
  const activePrograms = useMemo(() => PROGRAMS.filter((p) => kioskMode.programs.includes(p.id)), [kioskMode])
  const showProgramStep = activePrograms.length > 1
  /** 프로그램을 정한다 — 퍼스널 컬러는 본인 얼굴이 필요하므로 폰 사진(QR) 대신 키오스크 카메라가 먼저 */
  const pickProgram = useCallback((id: Program) => {
    setProgram(id)
    setPhotoSource(id === 'color' ? 'camera' : DEFAULT_PHOTO_SOURCE)
    // 디퓨저는 매장 이미지 분석에서만 고를 수 있다 — 다른 프로그램으로 옮기면 고른 제품을 향수로 되돌린다
    if (id !== 'idol' && id !== 'personal') setProductType((cur) => (cur.startsWith('diffuser') ? 'perfume_10ml' : cur))
  }, [])
  const startSession = useCallback(() => {
    pickProgram(activePrograms[0]?.id ?? DEFAULT_PROGRAM)
    setStep(showProgramStep ? 'program' : 'info')
  }, [activePrograms, showProgramStep, pickProgram])
  const [backgroundAdminOpen, setBackgroundAdminOpen] = useState(false)
  const [backgroundAdminUnlocked, setBackgroundAdminUnlocked] = useState(false)
  /** 인터넷이 끊겨 기기에서만 PIN을 확인한 상태 — 앱 종료만 연다 */
  const [backgroundAdminOffline, setBackgroundAdminOffline] = useState(false)
  const [backgroundPassword, setBackgroundPassword] = useState('')
  const [backgroundPasswordError, setBackgroundPasswordError] = useState('')
  const [backgroundUnlocking, setBackgroundUnlocking] = useState(false)
  const [backgroundSaving, setBackgroundSaving] = useState<string | null>(null)
  const [backgroundActionError, setBackgroundActionError] = useState('')
  const backgroundAuthRequest = useRef(0)
  const backgroundDialogRef = useRef<HTMLDivElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const ticketRef = useRef<string | null>(null)
  const idleDeadline = useRef<number>(0)
  const savedRef = useRef(false)
  // DB 기록(kiosk_analyses) 한 건의 id — 영수증 출력 시 printed 갱신에 쓴다
  const recordIdRef = useRef<string | null>(null)
  const recordedRef = useRef(false)
  const countdownTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)
  const qrGeneration = useRef(0)

  const kiosk = typeof window !== 'undefined' ? getKioskBridge() : undefined
  const t = kioskText(lang)
  const sx = sajuText(lang)
  const px = programText(lang)
  const attract = modeAttract(kioskMode, lang, {
    ticket: 'FOR YOUR BIAS · HONGDAE', wordmark: 'WOW!', sub: t.attractSub, cardNo: '01 PHOTO → 01 SCENT',
    title1: t.attractTitle1, title2: t.attractTitle2, body1: t.attractBody1, body2: t.attractBody2, tags: t.attractTags,
  })
  const themeBackground = toKioskTheme(backgroundRecord)
  // 관리자가 기기 글꼴을 고르면 배경의 글꼴 조합보다 우선한다
  const deviceFont = screenFontFamily(deviceSettings.font)
  const activeBackground = deviceFont ? { ...themeBackground, displayFont: deviceFont, bodyFont: deviceFont } : themeBackground

  const chooseBackground = useCallback(async (id: string) => {
    if (!backgroundAdminUnlocked || backgroundSaving) return
    setBackgroundSaving(id)
    setBackgroundActionError('')
    try {
      await selectBackground(id)
    } catch (error) {
      setBackgroundActionError(error instanceof Error ? error.message : '배경을 저장하지 못했습니다. 다시 시도해주세요.')
    } finally {
      setBackgroundSaving(null)
    }
  }, [backgroundAdminUnlocked, backgroundSaving, selectBackground])

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const clearCountdown = useCallback(() => {
    if (countdownTimer.current) {
      window.clearInterval(countdownTimer.current)
      countdownTimer.current = undefined
    }
    setCountdown(null)
  }, [])

  // ── 전체 초기화 ────────────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const resetAll = useCallback(() => {
    clearCountdown()
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(null)
    setStep('attract')
    setAnalyzeError(null)
    setCaptureNotice(null)
    setProgram(DEFAULT_PROGRAM)
    setName('')
    setGender('')
    setStyles([])
    setPersonalities([])
    setCharms([])
    setChapterIdx(0)
    setPurpose(null)
    setBirthDigits('')
    setCalendar('solar')
    setIsLeapMonth(false)
    setHourIndex(null)
    setWish('')
    setWishOpen(false)
    setPartnerName('')
    setPartnerGender('')
    setPartnerRelation('lover')
    setPartnerDigits('')
    setPartnerCalendar('solar')
    setPartnerLeap(false)
    setPartnerOskOpen(false)
    resetTarot()
    setProductType('perfume_10ml')
    setPhoto(null)
    setProgress(0)
    setResult(null)
    setMocked(false)
    setReceipt(null)
    setIdleLeft(null)
    setOskOpen(false)
    setPhotoSource(DEFAULT_PHOTO_SOURCE)
    setQrState('idle')
    setQrDataUrl(null)
    setQrCode(null)
    ticketRef.current = null
    savedRef.current = false
    recordIdRef.current = null
    recordedRef.current = false
    setPrintedOnce(false)
    setLang('ko')
    setLangOpen(false)
    // Electron 셸에선 다음 손님을 위해 카메라 스트림 유지, 웹에선 해제
    if (!kiosk) stopStream()
  }, [kiosk, stopStream, clearCountdown, resetTarot])

  useEffect(() => () => stopStream(), [stopStream])

  // capture 스텝 이탈/언마운트 시 카운트다운 정리 (고아 interval이 상태를 재오염시키는 것 방지)
  useEffect(() => {
    if (step !== 'capture') clearCountdown()
    return clearCountdown
  }, [step, clearCountdown])

  // ── 유휴 리셋 ─────────────────────────────────────────────
  const receiptOpen = Boolean(receipt)

  const idleWin = idleWindowFor({
    step,
    receiptOpen,
    qrWaiting: step === 'capture' && photoSource === 'qr',
    analyzeFailed: analyzeError !== null,
  })
  const idleSilent = idleWin?.silent ?? 0
  const idleWarn = idleWin?.warn ?? 0

  useEffect(() => {
    const limit = idleSilent + idleWarn
    if (!limit || backgroundAdminOpen) {
      setIdleLeft(null)
      return
    }
    idleDeadline.current = Date.now() + limit * 1000
    const bump = () => {
      idleDeadline.current = Date.now() + limit * 1000
      setIdleLeft(null)
    }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    const timer = window.setInterval(() => {
      // 인쇄 중에는 기다리는 게 정상이다 — 세지 않는다
      if (printing) {
        idleDeadline.current = Date.now() + limit * 1000
        setIdleLeft(null)
        return
      }
      const left = Math.ceil((idleDeadline.current - Date.now()) / 1000)
      if (left <= 0) {
        resetAll()
      } else {
        setIdleLeft(left <= idleWarn ? left : null)
      }
    }, 1000)
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      window.clearInterval(timer)
      setIdleLeft(null)
    }
  }, [step, idleSilent, idleWarn, resetAll, printing, backgroundAdminOpen])

  // ── 카메라 ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'capture' || photo || photoSource === 'qr') return
    let cancelled = false
    let retry: number | undefined

    const attach = async () => {
      try {
        const hasLive = streamRef.current?.getVideoTracks().some((t) => t.readyState === 'live')
        if (!hasLive) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
            audio: false,
          })
          // 대기 중 이펙트가 정리됐거나(cancelled) 경합으로 다른 스트림이 먼저 붙었으면
          // 새 스트림을 즉시 반납 — 참조를 잃은 live 스트림(카메라 영구 점유)을 만들지 않는다
          const nowLive = streamRef.current?.getVideoTracks().some((t) => t.readyState === 'live')
          if (cancelled || nowLive) {
            stream.getTracks().forEach((t) => t.stop())
            if (cancelled) return
          } else {
            streamRef.current = stream
          }
        }
        if (cancelled) return
        setCamError(false)
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        if (cancelled) return
        setCamError(true)
        retry = window.setTimeout(attach, 4000)
      }
    }
    attach()
    return () => {
      cancelled = true
      if (retry) window.clearTimeout(retry)
    }
  }, [step, photo, photoSource])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      // 스트림이 아직 준비 전 — countdown을 고착시키지 않고 재시도 안내
      setCountdown(null)
      showToast(t.toastCamNotReady)
      return
    }
    // 미리보기(3:4 cover)와 동일한 중앙 크롭 + 좌우반전, 최대 720x960 JPEG
    const vw = video.videoWidth
    const vh = video.videoHeight
    const targetRatio = 3 / 4
    let cw = vw
    let ch = vh
    if (vw / vh > targetRatio) cw = Math.round(vh * targetRatio)
    else ch = Math.round(vw / targetRatio)
    const sx = Math.round((vw - cw) / 2)
    const sy = Math.round((vh - ch) / 2)
    const outH = Math.min(960, ch)
    const outW = Math.round(outH * targetRatio)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')!
    ctx.translate(outW, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, outW, outH)
    setPhoto(canvas.toDataURL('image/jpeg', 0.8))
    setCountdown(null)
  }, [showToast, t])

  const startCountdown = useCallback(() => {
    if (countdownTimer.current) window.clearInterval(countdownTimer.current)
    let n = 3
    setCountdown(n)
    countdownTimer.current = window.setInterval(() => {
      n -= 1
      if (n <= 0) {
        if (countdownTimer.current) window.clearInterval(countdownTimer.current)
        countdownTimer.current = undefined
        capturePhoto()
      } else {
        setCountdown(n)
      }
    }, 1000)
  }, [capturePhoto])

  // ── 폰 QR 업로드 ──────────────────────────────────────────
  const startQrSession = useCallback(async () => {
    // 연타/재발급 시 이전 요청의 늦은 응답이 새 세션을 덮어쓰지 않도록 세대 번호로 무효화
    const gen = ++qrGeneration.current
    setPhotoSource('qr')
    setQrState('creating')
    setQrDataUrl(null)
    setQrCode(null)
    try {
      const res = await fetch('/api/photobooth/session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.code) throw new Error(data.error || '세션 생성 실패')
      // QR은 고객 폰이 접속하는 주소다 — 키오스크의 로컬 주소로는 폰이 닿을 수 없으므로
      // 배포된 사이트 주소(NEXT_PUBLIC_SITE_URL)를 쓴다. 웹 초안에서는 현재 주소로 폴백.
      const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      // 손님 폰도 키오스크와 같은 언어로 열리게 한다
      const url = `${origin.replace(/\/$/, '')}/kiosk/upload/${data.code}?lang=${lang}`
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 1 })
      if (gen !== qrGeneration.current) return
      setQrDataUrl(dataUrl)
      setQrCode(data.code)
      // 로컬 주소가 박힌 QR은 폰에서 절대 열리지 않는다 — 현장에서 조용히 실패하지 않도록 표시
      setQrUnreachable(/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(new URL(url).hostname))
      setQrState('waiting')
    } catch (e) {
      if (gen !== qrGeneration.current) return
      console.error('[kiosk] QR 세션 생성 실패:', e)
      setQrState('failed')
    }
  }, [lang])

  /** 진행 중인 QR 세션만 버린다 (입력 소스는 그대로) — 늦게 도착한 응답은 세대 번호로 무효화 */
  const clearQr = useCallback(() => {
    qrGeneration.current++
    setQrState('idle')
    setQrDataUrl(null)
    setQrCode(null)
    setQrUnreachable(false)
  }, [])

  /** 손님이 QR 대신 키오스크 카메라를 고른 경우 */
  const useCamera = useCallback(() => {
    clearQr()
    setPhotoSource('camera')
  }, [clearQr])

  // 촬영 단계에 들어오면 기본 소스(QR)의 세션을 바로 만들어 둔다 —
  // 손님이 버튼을 한 번 더 누르지 않아도 QR이 떠 있게.
  useEffect(() => {
    if (step !== 'capture' || photo || photoSource !== 'qr' || qrState !== 'idle') return
    startQrSession()
  }, [step, photo, photoSource, qrState, startQrSession])

  // 업로드 폴링 (2.5초) — 서버 중계로 받아 촬영본과 같은 dataURL 규격으로 맞춘다
  useEffect(() => {
    if (step !== 'capture' || photo || photoSource !== 'qr' || qrState !== 'waiting' || !qrCode) return
    let cancelled = false
    let inFlight = false // tick이 await 중일 때 다음 tick이 겹쳐 들어오는 것을 막는다
    let failures = 0 // 매장 와이파이 순단 한 번에 플로우가 죽지 않도록 연속 실패만 집계
    const MAX_FAILURES = 4

    const timer = window.setInterval(async () => {
      if (inFlight) return
      inFlight = true
      try {
        const res = await fetch(`/api/photobooth/session?code=${qrCode}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`세션 조회 실패 (${res.status})`)
        const data = await res.json()
        if (cancelled) return
        failures = 0

        if (data.status === 'expired') {
          window.clearInterval(timer)
          setQrState('expired')
          return
        }
        if (data.status !== 'uploaded') return

        const imgRes = await fetch(`/api/kiosk/photo?code=${qrCode}`, { cache: 'no-store' })
        if (!imgRes.ok) throw new Error(`사진 수신 실패 (${imgRes.status})`)
        const blob = await imgRes.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        })
        if (cancelled) return

        // 사진을 받은 시점에 세션은 소진됐다. QR 상태를 완전히 닫아
        // (분석 실패로 이 화면에 되돌아와도) 폴링이 다시 무장되지 않게 한다.
        window.clearInterval(timer)
        setPhoto(dataUrl)
        setPhotoSource(DEFAULT_PHOTO_SOURCE)
        setQrState('idle')
        setQrCode(null)
        setQrDataUrl(null)
        setQrUnreachable(false)
        showToast(t.toastPhotoReceived)
      } catch (e) {
        if (cancelled) return
        failures += 1
        console.error(`[kiosk] QR 폴링 실패 (${failures}/${MAX_FAILURES}):`, e)
        if (failures >= MAX_FAILURES) {
          window.clearInterval(timer)
          setQrState('failed')
        }
      } finally {
        inFlight = false
      }
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [step, photo, photoSource, qrState, qrCode, showToast, t])

  const onUploadFallback = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 960 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        setPhoto(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }, [])

  // 새 사진이 생기면 '얼굴을 찾지 못했습니다' 안내는 물린다
  useEffect(() => {
    if (photo) setCaptureNotice(null)
  }, [photo])

  // ── 분석 ─────────────────────────────────────────────────
  // 분석 대기 문구 — 프로그램마다 다르다
  const statusLines = program === 'saju' ? sx.statusLines : program === 'color' ? px.color.statusLines : program === 'tarot' ? px.tarot.statusLines : t.statusLines
  const analyzingEta = program === 'saju' ? sx.eta : program === 'color' ? px.color.eta : program === 'tarot' ? px.tarot.eta : t.analyzingEta
  const startAnalysis = useCallback(async () => {
    const isSaju = program === 'saju'
    setStep('analyzing')
    setProgress(0)
    setAnalyzeError(null)
    setChapterIdx(0)

    // 가짜 진행률: 사주는 서사가 길어 응답이 더 느리다(시상수를 늘림)
    const started = Date.now()
    const tau = isSaju ? 22000 : 12000
    const lines = statusLines
    const progTimer = window.setInterval(() => {
      const elapsed = (Date.now() - started) / tau
      setProgress(Math.min(90, Math.round(90 * (1 - Math.exp(-elapsed)))))
    }, 400)
    const statusTimer = window.setInterval(() => {
      setStatusIdx((i) => (i + 1) % lines.length)
    }, 2600)

    // 실패가 확정되면 진행률을 그 자리에서 멈추고 오류 카드를 띄운다(입력은 그대로 두어 '다시 시도'가 바로 된다)
    const fail = (kind: AnalyzeErrorKind, detail: unknown) => {
      console.error(`[kiosk] 분석 실패(${kind}):`, detail)
      window.clearInterval(progTimer)
      window.clearInterval(statusTimer)
      setAnalyzeError(kind)
    }
    try {
      const url = isSaju ? '/api/kiosk/analyze/saju'
        : program === 'color' ? '/api/kiosk/analyze/color'
        : program === 'tarot' ? '/api/kiosk/analyze/tarot'
        : '/api/kiosk/analyze'
      const body = isSaju
        ? {
          name: name.trim() || t.guest,
          gender: gender || '',
          targetType: 'self' as const,
          purpose,
          // 화면 언어로 해석문을 받는다(행사장 외국인 손님)
          locale: sajuLocale(lang),
          birth: digitsToBirth(birthDigits, calendar, isLeapMonth, hourIndex === 'unknown' ? null : hourIndex),
          ...(purpose === 'compatibility'
            ? {
              partner: {
                name: partnerName.trim() || sx.partnerDefault,
                gender: partnerGender || '',
                relation: partnerRelation,
                birth: digitsToBirth(partnerDigits, partnerCalendar, partnerLeap, null),
              },
            }
            : {}),
          ...(wish.trim() ? { wish: wish.trim() } : {}),
          mock: isMockRequested(),
        }
        : program === 'color'
        ? { name: name.trim() || t.guest, gender, imageBase64: photo, lang, mock: isMockRequested() }
        : program === 'tarot'
        ? {
          name: name.trim() || t.guest,
          gender,
          topic: tarot.topic,
          ...(tarot.question.trim() ? { question: tarot.question.trim() } : {}),
          // 화면에서 뽑은 세 장(과거·현재·미래) — 서버는 검증만 하고 해석한다
          cards: tarot.draws,
          lang,
          mock: isMockRequested(),
        }
        : {
          formData: {
            name: name.trim() || t.guest,
            gender: gender || 'Other',
            // 최애 분석은 사이트와 동일하게 idol 톤으로 간다
            targetType: program === 'idol' ? 'idol' : 'self',
            styles,
            customStyle: '',
            personalities,
            customPersonality: '',
            charmPoints: charms,
            customCharm: '',
          },
          imageBase64: photo,
          mock: isMockRequested(),
          lang,
        }

      let res: Response
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 무인 기기: 네트워크가 행 걸려도 반드시 끝난다 (사주는 서사가 길어 더 준다 — 서버는 92초 안에 답한다)
          signal: AbortSignal.timeout(program === 'idol' || program === 'personal' ? 75_000 : 110_000),
          body: JSON.stringify(body),
        })
      } catch (e) {
        fail(classifyFetchError(e), e)
        return
      }
      let json: { success?: boolean; data?: unknown; error?: string; mocked?: boolean }
      try {
        json = await res.json()
      } catch (e) {
        fail('server', e)
        return
      }
      // 실패 시 가짜 결과로 진행하지 않는다 — 랜덤 레시피가 실물로 제조되면 안 되기 때문
      // 얼굴을 못 찾은 사진(퍼스널 컬러) — 다시 보내도 같으니 사진을 물리고 다시 찍게 한다
      if (json.error === 'NO_FACE') {
        setCaptureNotice(px.color.noFace)
        setPhoto(null)
        setStep('capture')
        return
      }
      if (!res.ok || !json.success || !json.data) {
        fail('server', `${res.status} ${json.error ?? ''}`)
        return
      }
      setResult(json.data as KioskAnalysisResult)
      setMocked(Boolean(json.mocked))
    } finally {
      window.clearInterval(progTimer)
      window.clearInterval(statusTimer)
    }

    setProgress(100)
    window.setTimeout(() => setStep('result'), 450)
  }, [
    program, name, gender, styles, personalities, charms, photo,
    purpose, birthDigits, calendar, isLeapMonth, hourIndex, wish,
    partnerName, partnerGender, partnerRelation, partnerDigits, partnerCalendar, partnerLeap,
    t, lang, sx, statusLines, px.color.noFace, tarot.topic, tarot.question, tarot.draws,
  ])

  // ── 프로그램별 단계 / 결과 장 ───────────────────────────────
  const steps = useMemo<Step[]>(() => {
    if (program === 'color') return COLOR_STEPS
    if (program === 'tarot') return TAROT_STEPS
    if (program !== 'saju') return IMAGE_STEPS
    return purpose === 'compatibility' ? SAJU_STEPS_COMPAT : SAJU_STEPS
  }, [program, purpose])

  /** 단계 표시 — '번호 · 이름'을 단계 순서에서 계산한다(예전엔 01·05·06만 손으로 적혀 6단계가 '05 · PRODUCT'였다) */
  const stepPill = (s: Step) => `${String(steps.indexOf(s) + 1).padStart(2, '0')} · ${STEP_LABELS[s]}`

  const goNext = useCallback(() => {
    const i = steps.indexOf(step)
    if (i < 0) return
    if (i === steps.length - 1) startAnalysis()
    else setStep(steps[i + 1])
  }, [steps, step, startAnalysis])

  const goPrev = useCallback(() => {
    const i = steps.indexOf(step)
    if (i <= 0) {
      if (showProgramStep) setStep('program')
      else resetAll()
    } else setStep(steps[i - 1])
  }, [steps, step, resetAll, showProgramStep])

  /* scroll: true 인 장은 글이 길다. 한 화면에 욱여넣으려고 축소하면 글씨가 읽을 수
     없을 만큼 작아지므로, 원래 크기로 두고 스크롤한다 (들어오면 힌트 애니메이션이 돈다). */
  const chapters = useMemo(() => {
    if (!result) return []
    // 퍼스널 컬러·타로 — 한 화면 스크롤
    if (isColorResult(result)) {
      return [{ label: px.color.chapter, render: () => <ColorReportView result={result} photo={photo} px={px} scrollMore={sx.scrollMore} />, scroll: true }]
    }
    if (isTarotResult(result)) {
      return [{ label: px.tarot.chapter, render: () => <TarotReportView result={result} px={px} lang={lang} scrollMore={sx.scrollMore} />, scroll: true }]
    }
    if (isSajuResult(result)) {
      // 행사 모드 — 4장을 한 화면 스크롤로(장 넘기느라 줄이 길어지지 않게)
      if (kioskMode.resultOnePage) {
        return [{ label: 'SAJU REPORT', render: () => <SajuOnePageView result={result} tx={sx} />, scroll: true }]
      }
      // 그림·카드 중심 결과(SajuReport) — 모든 장이 길 수 있어 스크롤로 둔다
      return [
        { label: sx.chapters[0], render: () => <SajuChartView result={result} tx={sx} />, scroll: true },
        { label: sx.chapters[1], render: () => <SajuReadingView result={result} tx={sx} />, scroll: true },
        { label: sx.chapters[2], render: () => <SajuPurposeView result={result} tx={sx} />, scroll: true },
        { label: sx.chapters[3], render: () => <SajuPrescriptionView result={result} tx={sx} />, scroll: true },
      ]
    }
    return [
      { label: t.chapterScent, render: () => <ChapterScent result={result} />, scroll: false },
      { label: t.chapterProfile, render: () => <ChapterProfile result={result} t={t} />, scroll: false },
      { label: t.chapterReading, render: () => <ChapterReading result={result} t={t} />, scroll: true },
    ]
  }, [result, t, sx, px, photo, lang, kioskMode.resultOnePage])

  const scrollChapter = step === 'result' && Boolean(chapters[chapterIdx]?.scroll)

  // ── 결과 파생 데이터 ───────────────────────────────────────
  // 향이 있는 결과(이미지 분석·사주)만 향·레시피를 가진다 — 퍼스널 컬러·타로는 null
  const scentResult = scentResultOf(result)
  const match = scentResult?.matchingPerfumes?.[0]
  const persona = match?.persona
  const productInfo = PRODUCT_TYPES.find((p) => p.id === productType)!

  const topTraits = useMemo(() => {
    if (!scentResult) return []
    return (Object.entries(scentResult.traits) as [keyof TraitScores, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key, value]) => ({ label: t.traits[key] ?? TRAIT_LABELS[key], value }))
  }, [scentResult, t])

  const recipeRows = useMemo(() => {
    if (!persona) return []
    // 초안 레시피 = 매칭 향 100% (비율→용량 환산은 types/feedback.ts calculateGranuleAmounts와 동일 공식)
    const ml = productInfo.fragranceVolumeMl
    return [
      {
        id: persona.id,
        name: persona.name,
        ratio: 100,
        amountMl: Math.round(ml * 100) / 100,
        amountG: Math.round(ml * FRAGRANCE_DENSITY * 100) / 100,
      },
    ]
  }, [persona, productInfo])

  // ── 결과 아카이브 (Electron 셸에서만) ─────────────────────────
  useEffect(() => {
    if (step !== 'result' || !result || !kiosk || savedRef.current) return
    savedRef.current = true
    kiosk
      .saveResult({
        program: 'acscent-analysis',
        name: name.trim() || '게스트',
        productType,
        perfumeId: persona?.id,
        result,
        // 셸은 순수 base64를 기대한다 (Buffer.from(photoBase64, 'base64')) — dataURL 접두어 제거.
        // 퍼스널 컬러는 본인 얼굴 사진이고 화면에 '저장하지 않습니다'라고 안내한다 — 기기 아카이브에 넘기지 않는다
        // (셸은 받은 사진을 output/<시각>/photo.jpg 로 남긴다)
        photoBase64: photo && !isColorResult(result) ? photo.split(',')[1] : null,
      })
      .catch(() => {})
  }, [step, result, kiosk, name, productType, persona, photo])

  // ── 분석 기록 (관리자 /admin/kiosk) ─────────────────────────
  // 결과 화면에 도달한 건만 남긴다. 실패해도 손님 플로우는 그대로 진행한다 —
  // 기록은 운영 통계용이지 손님이 기다릴 이유가 없다.
  useEffect(() => {
    if (step !== 'result' || !result || recordedRef.current) return
    // 향이 있는 프로그램은 향 정보가 준비된 뒤에 남긴다. 퍼스널 컬러·타로는 향·제품 칸을 비워 남긴다
    if (scentResult && (!persona || !match)) return
    recordedRef.current = true

    const saju = isSajuResult(result) ? buildReceiptSaju(result, sx, lang === 'ko', gender ? ((t.gender as Record<string, string>)[gender] ?? gender) : '') : null
    fetch('/api/kiosk/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program,
        customer_name: name.trim() || '게스트',
        gender,
        // 사주는 사진을 쓰지 않는다
        photo_source: isSajuResult(result) || isTarotResult(result) ? null : photoSource,
        product_type: scentResult ? productType : null,
        product_label: scentResult ? productInfo.label : null,
        perfume_id: persona?.id ?? null,
        perfume_no: persona ? perfumeNoFromId(persona.id) : null,
        perfume_name: persona?.name ?? null,
        category_en: persona ? scentCategoryEn(persona.id) : null,
        match_score: match?.score ?? null,
        keywords: scentResult
          ? (scentResult.matchingKeywords?.length ? scentResult.matchingKeywords : persona?.keywords)?.slice(0, 5)
          : isColorResult(result) || isTarotResult(result) ? result.keywords.slice(0, 5) : null,
        traits: scentResult ? topTraits : null,
        personal_color: isColorResult(result)
          ? px.color.typeNames[result.colorDiagnosis.typeId]
          : scentResult?.personalColor
            ? `${SEASON_LABELS[scentResult.personalColor.season]} ${TONE_LABELS[scentResult.personalColor.tone]}`
            : null,
        analysis_text: extraAnalysisText(result) ?? [scentResult?.analysis?.mood, scentResult?.analysis?.style].filter(Boolean).join(' '),
        recipe: scentResult ? recipeRows : null,
        saju,
        // 퍼스널 컬러·타로 요약(유형·눈금 / 주제·뽑힌 카드) — 다른 프로그램은 null
        detail: extraRecordDetail(result),
        ticket: ticketRef.current,
        mocked,
        device: kiosk ? `shell ${kiosk.version}` : 'web',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.id) recordIdRef.current = data.id
      })
      .catch((e) => console.error('[kiosk] 분석 기록 실패:', e))
  }, [
    step, result, scentResult, persona, match, program, name, gender, photoSource, productType,
    productInfo, topTraits, recipeRows, mocked, kiosk, lang, sx, px,
  t.gender,
  ])

  // ── 영수증 ────────────────────────────────────────────────
  const buildReceipt = useCallback(async (): Promise<{ dataUrl: string; base64: string } | null> => {
    if (!result) return null
    const now = new Date()
    const two = (n: number) => String(n).padStart(2, '0')
    const stamp = {
      date: `${now.getFullYear()}.${two(now.getMonth() + 1)}.${two(now.getDate())}`,
      time: `${two(now.getHours())}:${two(now.getMinutes())}`,
      customerName: name.trim() || t.guest,
      gender,
    }
    let data: ReceiptData
    if (isColorResult(result) || isTarotResult(result)) {
      // 퍼스널 컬러 · 타로 — 진단서/리딩만. 향·제품·레시피·발권 번호가 없다(영수증 렌더러가 그 구역을 찍지 않는다)
      data = {
        ...stamp,
        ticket: null,
        productLabel: '', perfumeNo: '', perfumeName: '', categoryEn: '', score: 0,
        keywords: result.keywords.slice(0, 5),
        notes: { top: '', middle: '', base: '' },
        analysisText: '', personalColorText: '', palette: [], signals: [], recipeRows: [], baseText: '', steps: [],
        footerLines: [
          ...(mocked ? [px.demoNote] : []),
          isColorResult(result) ? px.color.disclaimer : px.tarot.disclaimer,
          "AC'SCENT · www.acscent.co.kr",
        ],
        ...(isColorResult(result) ? { color: buildReceiptColor(result, px) } : { tarot: buildReceiptTarot(result, px, lang) }),
      }
    } else {
      if (!persona || !match) return null
      const baseMl = productInfo.totalVolumeMl - productInfo.fragranceVolumeMl
      const categoryEn = scentCategoryEn(persona.id)
      data = {
        ...stamp,
        ticket: ticketRef.current,
        productLabel: t.products[productInfo.id]?.label ?? productInfo.label,
        perfumeNo: perfumeNoFromId(persona.id),
        perfumeName: persona.name,
        categoryEn,
        score: match.score,
        keywords: (result.matchingKeywords?.length ? result.matchingKeywords : persona.keywords).slice(0, 5),
        notes: {
          top: persona.mainScent?.name ?? '-',
          middle: persona.subScent1?.name ?? '-',
          base: persona.subScent2?.name ?? '-',
        },
        analysisText: [result.analysis?.mood, result.analysis?.style].filter(Boolean).join(' '),
        personalColorText: result.personalColor
          ? t.personalColor(
              t.seasons[result.personalColor.season] ?? SEASON_LABELS[result.personalColor.season],
              t.tones[result.personalColor.tone] ?? TONE_LABELS[result.personalColor.tone]
            )
          : '',
        palette: result.personalColor?.palette?.slice(0, 4) ?? [],
        signals: topTraits,
        recipeRows,
        baseText: baseMl > 0 ? t.receipt.baseText(baseMl.toFixed(1)) : t.receipt.baseNone,
        steps: t.receipt.steps,
        // 손님이 읽어야 하는 안내 — 향 번호와 같은 크기로 크게 찍힌다
        counterNotice: modeCounterNotice(kioskMode, lang, t.receipt.counterNotice),
        recipeTitle: t.receipt.recipeTitle(t.products[productInfo.id]?.label ?? productInfo.label),
        precautions: t.receipt.precautions,
        footerLines: [
          ...(mocked ? [t.receipt.demoNote] : []),
          "AC'SCENT · www.acscent.co.kr",
        ],
        ...(isSajuResult(result) ? { saju: buildReceiptSaju(result, sx, lang === 'ko', gender ? ((t.gender as Record<string, string>)[gender] ?? gender) : '') } : {}),
      }
    }
    // 사주는 사진을 쓰지 않는다 (생년월일시만으로 보는 프로그램)
    const rendered = await renderKioskReceipt(data, {
      photoSrc: isSajuResult(result) || isColorResult(result) || isTarotResult(result) ? null : photo,
      lang,
      brand: {
        ...kioskMode.receipt, eventLines: modeEventLines(kioskMode, lang), theme: isSajuResult(result) ? 'saju' : 'scent',
        // 퍼스널 컬러·타로는 프로그램이 제 머리말을 쓴다(한 모드에 두 프로그램이 같이 있어서)
        ...(isColorResult(result) ? { subtitle: px.color.receipt.subtitle } : isTarotResult(result) ? { subtitle: px.tarot.receipt.subtitle } : {}),
        // STORE ADMIN 에서 고른 사주 영수증 양식·한자 글꼴(되돌리기용)
        receiptStyle: deviceBaseSettings.receiptStyle ?? 'sheet', hanjaFont: deviceBaseSettings.hanjaFont ?? 'kaishu',
      },
    })
    return { dataUrl: rendered.dataUrl, base64: rendered.base64 }
  }, [result, persona, match, productInfo, name, gender, topTraits, recipeRows, photo, mocked, t, lang, kioskMode, sx, px, deviceBaseSettings.receiptStyle, deviceBaseSettings.hanjaFont])

  const openReceipt = useCallback(async () => {
    try {
      // 선채번: 셸이 nextTicket을 지원하면 인쇄 전에 번호를 받아 원판에 그려 넣는다
      // 퍼스널 컬러·타로는 만들 제품이 없어 발권 번호를 쓰지 않는다
      if (kiosk?.hasPrinter && !ticketRef.current && kiosk.nextTicket && scentResult) {
        const t = await kiosk.nextTicket().catch(() => null)
        if (t?.success && t.ticket) ticketRef.current = t.ticket
      }
      const r = await buildReceipt()
      if (r) setReceipt(r)
    } catch (e) {
      console.error('[kiosk] 영수증 렌더 실패:', e)
      showToast(t.toastReceiptFailed)
    }
  }, [buildReceipt, kiosk, showToast, t, scentResult])

  const printReceipt = useCallback(async () => {
    if (!receipt) return
    if (!kiosk?.hasPrinter) {
      // 웹 초안: PNG 다운로드로 대체
      const a = document.createElement('a')
      a.href = receipt.dataUrl
      a.download = `acscent-receipt-${Date.now()}.png`
      a.click()
      showToast(t.toastPngSaved)
      return
    }
    setPrinting(true)
    try {
      const res = await kiosk.printReceipt({
        receiptImageBase64: receipt.base64,
        ticket: ticketRef.current ?? undefined,
      })
      if (res.success) {
        setPrintedOnce(true)
        // 출력 성공을 기록에 반영 — 분석만 하고 안 받아간 건과 구분된다
        if (recordIdRef.current) {
          fetch('/api/kiosk/record', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: recordIdRef.current,
              printed: true,
              ticket: res.ticket ?? ticketRef.current,
            }),
          }).catch((e) => console.error('[kiosk] 출력 기록 실패:', e))
        }
        if (!scentResult) {
          // 퍼스널 컬러·타로 — 발권 번호가 없는 영수증
          showToast(px.printed)
        } else {
          if (res.ticket && !ticketRef.current) {
            ticketRef.current = res.ticket
            // 구형 셸(선채번 미지원) 경로: 채번된 번호를 반영해 재인쇄용 원판만 갱신
            const again = await buildReceipt()
            if (again) setReceipt(again)
          }
          showToast(t.toastTicketIssued(res.ticket ?? ''))
        }
      } else {
        showToast(t.toastPrintFailed(res.error ?? t.printerError))
      }
    } catch (e) {
      console.error('[kiosk] 인쇄 실패:', e)
      showToast(t.toastPrintFailedStaff)
    } finally {
      setPrinting(false)
    }
  }, [receipt, kiosk, buildReceipt, showToast, t, scentResult, px.printed])

  // ── 관리자 핫스팟 (짧게 누르기 / 1.5초 홀드 모두 서버 인증 후 설정) ────
  const exitHold = useRef<number | undefined>(undefined)
  const exitTriggered = useRef(false)
  const openBackgroundAdmin = useCallback(() => {
    backgroundAuthRequest.current += 1
    setBackgroundAdminOpen(true)
    setBackgroundAdminUnlocked(false)
    setBackgroundAdminOffline(false)
    setBackgroundPassword('')
    setBackgroundPasswordError('')
    setBackgroundActionError('')
    setBackgroundUnlocking(false)
    void refreshBackgrounds()
  }, [refreshBackgrounds])
  const closeBackgroundAdmin = useCallback(() => {
    backgroundAuthRequest.current += 1
    setBackgroundAdminOpen(false)
    setBackgroundAdminUnlocked(false)
    setBackgroundAdminOffline(false)
    setBackgroundPassword('')
    setBackgroundPasswordError('')
    setBackgroundUnlocking(false)
  }, [])
  const quitKioskApp = useCallback(() => {
    if (kiosk) void kiosk.quitApp()
    else {
      closeBackgroundAdmin()
      showToast('키오스크 앱에서만 종료할 수 있습니다')
    }
  }, [kiosk, closeBackgroundAdmin, showToast])
  // 앱 종료는 한 번 더 묻는다(QuitConfirm)
  const [askQuitKiosk, quitConfirmNode] = useQuitConfirm(quitKioskApp)
  const onExitDown = useCallback(() => {
    exitTriggered.current = false
    if (exitHold.current) window.clearTimeout(exitHold.current)
    exitHold.current = window.setTimeout(() => {
      // 홀드로 열렸으면 손을 뗄 때 따라오는 click 은 무시한다
      exitTriggered.current = true
      openBackgroundAdmin()
    }, 1500)
  }, [openBackgroundAdmin])
  const onExitUp = useCallback(() => {
    if (exitHold.current) window.clearTimeout(exitHold.current)
    exitHold.current = undefined
  }, [])

  const pressBackgroundAdminKey = useCallback(async (key: string) => {
    if (backgroundUnlocking) return
    setBackgroundPasswordError('')
    if (key === '지우기') {
      setBackgroundPassword((value) => value.slice(0, -1))
      return
    }
    // 6자리가 차면 확인 버튼 없이 바로 인증한다(포토부스와 같은 방식). 확인 버튼은 다시 시도용으로 남겨 둔다
    let pin = backgroundPassword
    if (key !== '확인') {
      if (backgroundPassword.length >= 6) return
      pin = `${backgroundPassword}${key}`.slice(0, 6)
      setBackgroundPassword(pin)
      if (pin.length < 6) return
    }
    if (pin.length !== 6) return
    setBackgroundUnlocking(true)
    const requestId = ++backgroundAuthRequest.current

    /* 서버에 닿지 못하면 기기(셸)에 PIN을 확인받아 앱 종료만 연다.
       배경 선택은 서버가 있어야 하니 열지 않는다. 처리했으면 true. */
    const unlockOffline = async () => {
      if (!kiosk?.checkAdminPin) return false
      const ok = await kiosk.checkAdminPin(pin).catch(() => false)
      if (requestId !== backgroundAuthRequest.current) return true
      setBackgroundPassword('')
      if (ok) setBackgroundAdminOffline(true)
      else setBackgroundPasswordError('비밀번호가 올바르지 않습니다.')
      return true
    }

    try {
      // 끊긴 게 확실하면 서버 응답(최대 12초)을 기다리지 않는다
      if (navigator.onLine === false && (await unlockOffline())) return
      const unlocked = await unlockBackgroundAdmin(pin)
      if (requestId !== backgroundAuthRequest.current) return
      setBackgroundPassword('')
      if (unlocked) setBackgroundAdminUnlocked(true)
      else setBackgroundPasswordError('비밀번호가 올바르지 않습니다.')
    } catch (error) {
      if (requestId === backgroundAuthRequest.current && !(await unlockOffline())) {
        setBackgroundPassword('')
        // fetch 자체가 실패하면 브라우저 원문('Failed to fetch')이 오므로 안내 문구로 바꾼다
        const unreachable = error instanceof TypeError || navigator.onLine === false
        setBackgroundPasswordError(
          unreachable
            ? '인터넷에 연결되어 있지 않습니다. 연결을 확인해주세요.'
            : error instanceof Error ? error.message : '관리자 인증에 실패했습니다. 연결을 확인해주세요.'
        )
      }
    } finally {
      if (requestId === backgroundAuthRequest.current) setBackgroundUnlocking(false)
    }
  }, [backgroundPassword, backgroundUnlocking, unlockBackgroundAdmin, kiosk])

  useEffect(() => {
    if (!backgroundAdminOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeBackgroundAdmin()
      } else if (!backgroundAdminUnlocked && !backgroundAdminOffline && (/^[0-9]$/.test(event.key) || event.key === 'Backspace' || event.key === 'Enter')) {
        event.preventDefault()
        void pressBackgroundAdminKey(event.key === 'Backspace' ? '지우기' : event.key === 'Enter' ? '확인' : event.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backgroundAdminOpen, backgroundAdminUnlocked, backgroundAdminOffline, pressBackgroundAdminKey, closeBackgroundAdmin])

  useEffect(() => {
    if (!backgroundAdminOpen) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = backgroundDialogRef.current
    dialog?.querySelector<HTMLButtonElement>('button')?.focus()
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog) return
      const controls = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    dialog?.addEventListener('keydown', keepFocus)
    return () => {
      dialog?.removeEventListener('keydown', keepFocus)
      previous?.focus()
    }
  }, [backgroundAdminOpen])

  useEffect(() => () => {
    if (exitHold.current) window.clearTimeout(exitHold.current)
    backgroundAuthRequest.current += 1
  }, [])

  /* ── 한 화면에 맞추기 ──────────────────────────────────────
     터치 키오스크에서 스크롤은 손님이 알아채기 어렵다(스크롤바도 숨겼다).
     내용이 넘치면 그만큼 zoom 을 내려 항상 한 눈에 들어오게 한다.
     영수증 미리보기(.ksk-modal-paper)는 원판을 원래 크기로 봐야 하므로 제외. */
  useEffect(() => {
    // 실기(1080x1920)에서는 1.0 근처다. 하한은 세로가 짧은 임시 모니터 대비용.
    const MIN_FIT = 0.5
    const fit = () => {
      const body = document.querySelector<HTMLElement>('.ksk-body')
      if (!body) return
      body.style.setProperty('--ksk-fit', '1')
      // 글이 긴 장은 축소 대신 스크롤 — 줄이면 읽을 수 없는 크기가 된다
      if (scrollChapter) return
      // scrollHeight 를 읽는 순간 레이아웃이 확정된다 (zoom 1 기준 실측)
      const avail = body.clientHeight
      const content = body.scrollHeight
      if (!avail || !content) return
      // 내림으로 잡아야 반올림 때문에 1px 넘치는 일이 없다
      const ratio = content > avail + 1 ? Math.max(MIN_FIT, Math.floor((avail / content) * 1000) / 1000) : 1
      body.style.setProperty('--ksk-fit', String(ratio))
    }

    fit()
    // 폰트·이미지가 늦게 올라오면 높이가 바뀐다 — 두 번 더 재본다
    const t1 = window.setTimeout(fit, 150)
    const t2 = window.setTimeout(fit, 600)
    window.addEventListener('resize', fit)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', fit)
    }
  }, [step, chapterIdx, oskOpen, wishOpen, partnerOskOpen, photo, result, qrState, camError, styles, personalities, charms, scrollChapter, tarot.questionOpen, tarot.picks.length, tarot.revealed, tarot.deck.length])

  /* ── 스크롤 힌트 ──────────────────────────────────────────
     스크롤바를 숨겨 둔 터치 화면에서는 "아래에 더 있다"를 알 방법이 없다.
     들어온 지 3초 뒤 살짝 내려갔다 돌아와서 움직일 수 있다는 걸 보여준다.
     손님이 이미 스크롤했다면 건드리지 않는다. */
  useEffect(() => {
    if (!scrollChapter) return
    const body = document.querySelector<HTMLElement>('.ksk-body')
    if (!body) return

    /* 내려갔다 올라오는 걸 한 번의 연속 곡선으로 그린다 — 네이티브 smooth 스크롤을
       두 번 이어 붙이면 꼭짓점에서 멈칫한다. 구간마다 속도가 0에서 시작해 0으로
       끝나므로(ease-in-out) 이음매가 없다: 내려감 → 잠깐 머묾 → 되돌아옴. */
    const DURATION = 1900
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const curve = (t: number) => {
      if (t < 0.42) return ease(t / 0.42)
      if (t < 0.56) return 1
      return 1 - ease((t - 0.56) / 0.44)
    }

    let raf = 0
    let running = false
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const hint = window.setTimeout(() => {
      if (body.scrollTop > 4) return // 이미 스스로 내려 봤다
      const room = body.scrollHeight - body.clientHeight
      if (room < 40) return
      const depth = Math.min(140, room)
      const prevBehavior = body.style.scrollBehavior
      body.style.scrollBehavior = 'auto' // CSS smooth 가 매 프레임 값을 또 보간하면 끊긴다
      const start = performance.now()
      running = true
      const frame = (now: number) => {
        if (!running) return
        const t = Math.min(1, (now - start) / DURATION)
        body.scrollTop = depth * curve(t)
        if (t < 1) raf = requestAnimationFrame(frame)
        else {
          running = false
          body.style.scrollBehavior = prevBehavior
        }
      }
      raf = requestAnimationFrame(frame)
    }, 3000)

    // 손님이 만지는 순간 힌트는 물러난다 — 손가락과 스크롤을 두고 다투지 않게
    const interrupt = () => stop()
    body.addEventListener('pointerdown', interrupt)
    body.addEventListener('wheel', interrupt, { passive: true })
    body.addEventListener('touchstart', interrupt, { passive: true })

    return () => {
      window.clearTimeout(hint)
      stop()
      body.removeEventListener('pointerdown', interrupt)
      body.removeEventListener('wheel', interrupt)
      body.removeEventListener('touchstart', interrupt)
    }
  }, [scrollChapter, chapterIdx])

  // ── 렌더 ─────────────────────────────────────────────────
  const stepIdx = steps.indexOf(step)
  const showHeader = stepIdx >= 0
  useScreenUiSwitch('classic', deviceSettings, backgroundsSynced, step === 'attract' || backgroundAdminOpen)

  return (
    <div
      className={`ksk-root ${KIOSK_FONT_CLASS}`}
      data-background={activeBackground.id}
      data-lang={lang}
      lang={KIOSK_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'}
      style={{
        '--ksk-background-image': `url("${activeBackground.image}")`,
        // 테마 글꼴은 한국어 전용이라 한자권에서는 글리프가 없다 — 그 언어 글꼴로 바꾼다
        '--ksk-display-font': isCjkLang(lang) ? CJK_FONT_STACK[lang] : activeBackground.displayFont,
        '--ksk-hanja-font': hanjaFontVar(deviceBaseSettings.hanjaFont),
        '--ksk-body-font': isCjkLang(lang) ? CJK_FONT_STACK[lang] : activeBackground.bodyFont,
        '--ksk-display-tracking': activeBackground.tracking,
        '--paper': activeBackground.paper,
        '--ink': activeBackground.ink,
        '--ink-soft': activeBackground.inkSoft,
        '--line': activeBackground.line,
        '--accent': activeBackground.accent,
        '--on-accent': activeBackground.onAccent,
        '--accent-soft': activeBackground.accentSoft,
        '--surface': activeBackground.surface,
        '--surface-strong': activeBackground.surfaceStrong,
        '--ksk-shadow': activeBackground.shadow,
        '--ksk-radius': activeBackground.radius,
      } as CSSProperties}
    >
      {quitConfirmNode}
      <ScreenFontFace ids={[deviceSettings.font, ...(backgroundAdminOpen ? backgrounds.map((b) => b.font) : [])]} />
      <div className="ksk-stage" data-step={step}>
        {/* 언어 전환 — 분석을 시작하면 결과 문장이 그 언어로 만들어지므로 그 전까지만 연다 */}
        {step !== 'analyzing' && step !== 'result' && !backgroundAdminOpen && (
          <div className="ksk-lang" data-open={langOpen}>
            <button
              type="button"
              className="ksk-lang-btn"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={t.langMenuLabel}
              onClick={() => setLangOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.6 2.6 2.6 15 0 18M12 3c-2.6 2.6-2.6 15 0 18" />
              </svg>
              {KIOSK_LANGS.find((l) => l.id === lang)?.code}
            </button>
            {langOpen && (
              <>
                <button
                  type="button"
                  className="ksk-lang-scrim"
                  aria-label={t.close}
                  onClick={() => setLangOpen(false)}
                />
                <ul className="ksk-lang-menu" role="listbox" aria-label={t.langMenuLabel}>
                  {KIOSK_LANGS.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={option.id === lang}
                        data-on={option.id === lang}
                        lang={option.htmlLang}
                        onClick={() => {
                          setLang(option.id)
                          setLangOpen(false)
                        }}
                      >
                        <span>{option.label}</span>
                        {option.id === lang && <em>✓</em>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {showHeader && (
          <header>
            <div className="ksk-top">
              <span className="ksk-top-brand">{kioskMode.brandName}</span>
              <span className="ksk-top-step ksk-mono">
                STEP {String(stepIdx + 1).padStart(2, '0')}/{String(steps.length).padStart(2, '0')} ·{' '}
                {STEP_LABELS[step]}
              </span>
            </div>
            <div className="ksk-progress">
              <i style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }} />
            </div>
          </header>
        )}

        {step === 'program' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">PROGRAM</p>
            <h1 className="ksk-title">{px.pickTitle}</h1>
            <p className="ksk-desc">{px.pickDesc}</p>
            <div className="ksk-programs">
              {activePrograms.map((p) => (
                <button
                  key={p.id}
                  className="ksk-program"
                  onClick={() => {
                    pickProgram(p.id)
                    setStep('info')
                  }}
                >
                  <span className="ksk-program-hanja">{p.hanja}</span>
                  <span className="ksk-program-body">
                    <b>{px.programs[p.id].title}</b>
                    <span>{px.programs[p.id].desc}</span>
                  </span>
                  <em className="ksk-mono">{px.programs[p.id].note}</em>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={resetAll}>
                {t.home}
              </button>
            </div>
          </div>
        )}

        {(step === 'topic' || step === 'question' || step === 'cards') && (
          <TarotSteps
            step={step}
            session={tarot}
            tx={px.tarot}
            labels={{ prev: t.prev, next: t.next }}
            lang={lang}
            pill={stepPill}
            onPrev={goPrev}
            onNext={goNext}
            keyboard={(props) => (
              <OnScreenKeyboard
                {...props}
                labels={{ aria: t.oskAria, placeholder: t.oskPlaceholder, space: t.oskSpace, done: t.oskDone }}
                initialMode={oskModeFor(lang)}
                traditional={lang === 'zh-Hant'}
              />
            )}
          />
        )}

        {step === 'purpose' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('purpose')}</p>
            <h1 className="ksk-title">{sx.purposeTitle}</h1>
            <p className="ksk-desc">{sx.purposeDesc}</p>
            <SajuPurposeGrid value={purpose} onChange={setPurpose} tx={sx} />
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                {t.prev}
              </button>
              <button className="ksk-btn ksk-btn-primary" disabled={!purpose} onClick={goNext}>
                {t.next}
              </button>
            </div>
          </div>
        )}

        {step === 'birth' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('birth')}</p>
            <h1 className="ksk-title">{sx.birthTitle}</h1>
            <SajuBirthPad
              digits={birthDigits}
              onDigits={setBirthDigits}
              calendar={calendar}
              onCalendar={setCalendar}
              isLeapMonth={isLeapMonth}
              onLeapMonth={setIsLeapMonth}
              tx={sx}
            />
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                {t.prev}
              </button>
              <button
                className="ksk-btn ksk-btn-primary"
                disabled={birthDigits.length !== 8 || Boolean(validateBirthDigits(birthDigits, calendar))}
                onClick={goNext}
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {step === 'hour' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('hour')}</p>
            <h1 className="ksk-title">{sx.hourTitle}</h1>
            <p className="ksk-desc">{sx.hourDesc}</p>
            <SajuHourGrid value={hourIndex} onChange={setHourIndex} tx={sx} />
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                {t.prev}
              </button>
              <button className="ksk-btn ksk-btn-primary" disabled={hourIndex === null} onClick={goNext}>
                {t.next}
              </button>
            </div>
          </div>
        )}

        {step === 'partner' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('partner')}</p>
            <h1 className="ksk-title">{sx.partnerTitle}</h1>
            <label className="ksk-field-label ksk-mono">{sx.relation}</label>
            <SajuRelationGrid value={partnerRelation} onChange={setPartnerRelation} tx={sx} />
            <label className="ksk-field-label ksk-mono">{sx.partnerName}</label>
            <button className="ksk-input" data-empty={!partnerName} onClick={() => setPartnerOskOpen(true)}>
              {partnerName || sx.partnerNamePh}
            </button>
            <label className="ksk-field-label ksk-mono">{sx.partnerGender}</label>
            <div className="ksk-chips" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  className="ksk-chip"
                  data-on={partnerGender === g.key}
                  onClick={() => setPartnerGender(g.key)}
                >
                  {t.gender[g.key] ?? g.label}
                </button>
              ))}
            </div>
            <label className="ksk-field-label ksk-mono">{sx.partnerBirth}</label>
            <SajuBirthPad
              digits={partnerDigits}
              onDigits={setPartnerDigits}
              calendar={partnerCalendar}
              onCalendar={setPartnerCalendar}
              isLeapMonth={partnerLeap}
              onLeapMonth={setPartnerLeap}
              label={sx.partnerBirth}
              tx={sx}
            />
            <div style={{ flex: 1 }} />
            {partnerOskOpen ? (
              <OnScreenKeyboard
                value={partnerName}
                onChange={setPartnerName}
                onClose={() => setPartnerOskOpen(false)}
                maxLength={12}
                hint={sx.partnerName}
                // 화면 언어 자판·라벨 — 이름 칸과 같게(예전엔 고민·상대 이름 칸이 언어와 상관없이 한글 자판)
                labels={{ aria: t.oskAria, placeholder: t.oskPlaceholder, space: t.oskSpace, done: t.oskDone }}
                initialMode={oskModeFor(lang)}
                traditional={lang === 'zh-Hant'}
              />
            ) : (
              <div className="ksk-actions">
                <button className="ksk-btn" onClick={goPrev}>
                  {t.prev}
                </button>
                <button
                  className="ksk-btn ksk-btn-primary"
                  disabled={
                    !partnerGender ||
                    partnerDigits.length !== 8 ||
                    Boolean(validateBirthDigits(partnerDigits, partnerCalendar))
                  }
                  onClick={goNext}
                >
                  {t.next}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'wish' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('wish')}</p>
            <h1 className="ksk-title">{sx.wishTitle}</h1>
            <p className="ksk-desc">{sx.wishDesc}</p>
            <button className="ksk-input ksk-input-tall" data-empty={!wish} onClick={() => setWishOpen(true)}>
              {wish || sx.wishPh}
            </button>
            <div style={{ flex: 1 }} />
            {wishOpen ? (
              <OnScreenKeyboard
                value={wish}
                onChange={setWish}
                onClose={() => setWishOpen(false)}
                maxLength={40}
                hint={sx.wishHint}
                // 화면 언어 자판·라벨 — 이름 칸과 같게(예전엔 고민·상대 이름 칸이 언어와 상관없이 한글 자판)
                labels={{ aria: t.oskAria, placeholder: t.oskPlaceholder, space: t.oskSpace, done: t.oskDone }}
                initialMode={oskModeFor(lang)}
                traditional={lang === 'zh-Hant'}
              />
            ) : (
              <div className="ksk-actions">
                <button className="ksk-btn" onClick={goPrev}>
                  {t.prev}
                </button>
                <button className="ksk-btn ksk-btn-primary" onClick={goNext}>
                  {wish.trim() ? t.next : sx.skip}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'info' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('info')}</p>
            <h1 className="ksk-title">
              {program === 'idol' ? t.infoTitleIdol : t.infoTitleSelf}
            </h1>
            <p className="ksk-desc">{t.infoDesc}</p>
            <label className="ksk-field-label">{t.nameLabel} {t.nameOptional}</label>
            {/* 터치 전용: 네이티브 키보드를 띄우지 않고 자체 OSK를 연다 */}
            <button className="ksk-input" data-empty={!name} onClick={() => setOskOpen(true)}>
              {name || t.namePlaceholder}
            </button>
            <label className="ksk-field-label">{t.genderLabel}</label>
            <div className="ksk-chips" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {GENDER_OPTIONS.map((g) => (
                <button key={g.key} className="ksk-chip" data-on={gender === g.key} onClick={() => setGender(g.key)}>
                  {t.gender[g.key] ?? g.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            {oskOpen ? (
              <OnScreenKeyboard
                value={name}
                onChange={setName}
                onClose={() => setOskOpen(false)}
                maxLength={12}
                hint={t.namePlaceholder}
                labels={{ aria: t.oskAria, placeholder: t.oskPlaceholder, space: t.oskSpace, done: t.oskDone }}
                initialMode={oskModeFor(lang)}
                traditional={lang === 'zh-Hant'}
              />
            ) : (
              <div className="ksk-actions">
                <button className="ksk-btn" onClick={resetAll}>
                  {t.home}
                </button>
                <button className="ksk-btn ksk-btn-primary" disabled={!gender} onClick={goNext}>
                  {t.next}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'style' && (
          <SelectScreen
            eyebrow="02 · STYLE"
            title={t.styleTitle}
            desc={t.pickUpTo(MAX_PICK)}
            labels={t.styles}
            prevLabel={t.prev}
            nextLabel={t.next}
            options={[...STYLES]}
            selected={styles}
            onToggle={(v) => setStyles((s) => toggleIn(s, v, MAX_PICK))}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}

        {step === 'personality' && (
          <SelectScreen
            eyebrow="03 · PERSONALITY"
            title={t.personalityTitle}
            desc={t.pickUpTo(MAX_PICK)}
            labels={t.personalities}
            prevLabel={t.prev}
            nextLabel={t.next}
            options={[...PERSONALITIES]}
            selected={personalities}
            onToggle={(v) => setPersonalities((s) => toggleIn(s, v, MAX_PICK))}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}

        {step === 'charm' && (
          <SelectScreen
            eyebrow="04 · CHARM"
            title={t.charmTitle}
            desc={t.pickUpTo(MAX_PICK)}
            labels={t.charms}
            prevLabel={t.prev}
            nextLabel={t.next}
            options={[...CHARM_POINTS]}
            selected={charms}
            onToggle={(v) => setCharms((s) => toggleIn(s, v, MAX_PICK))}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}

        {step === 'product' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('product')}</p>
            <h1 className="ksk-title">{t.productTitle}</h1>
            <p className="ksk-desc">{t.productDesc}</p>
            <div className="ksk-products">
              {/* 디퓨저 5ml 는 매장 이미지 분석에서만 — 사주·퍼스널 컬러·타로는 향수만 */}
              {PRODUCT_TYPES.filter((p) => program === 'idol' || program === 'personal' || !p.id.startsWith('diffuser')).map((p) => (
                <button
                  key={p.id}
                  className="ksk-product"
                  data-on={productType === p.id}
                  onClick={() => setProductType(p.id)}
                >
                  <span>
                    <b>{t.products[p.id]?.label ?? p.label}</b>
                    <span>{t.products[p.id]?.description ?? p.description}</span>
                  </span>
                  <em className="ksk-mono">{t.fragranceMl(p.fragranceVolumeMl)}</em>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            {/* 결과 화면에는 언어 버튼이 없다 — 분석 전에 어떤 언어로 나오는지 알린다 */}
            <p className="ksk-result-lang">{t.resultLangNote}</p>
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                {t.prev}
              </button>
              <button className="ksk-btn ksk-btn-primary" onClick={goNext}>
                {program === 'saju' ? t.analyzeStart : t.next}
              </button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{stepPill('capture')}</p>
            <h1 className="ksk-title">
              {photo
                ? program === 'color' ? px.color.confirmTitle : t.captureConfirm
                : photoSource === 'qr' ? t.captureQrTitle : program === 'color' ? px.color.captureTitle : t.captureCamTitle}
            </h1>
            <p className="ksk-desc">
              {!photo && photoSource === 'qr' ? t.captureQrDesc : program === 'color' ? px.color.captureDesc : t.captureCamDesc}
            </p>

            {!photo && photoSource === 'qr' ? (
              <div className="ksk-qr">
                {qrState === 'creating' && <p className="ksk-qr-msg">{t.qrCreating}</p>}
                {qrState === 'failed' && (
                  <p className="ksk-qr-msg">
                    {t.qrFailed[0]}
                    <br />
                    {t.qrFailed[1]}
                  </p>
                )}
                {qrState === 'expired' && (
                  <p className="ksk-qr-msg">
                    {t.qrExpired[0]}
                    <br />
                    {t.qrExpired[1]}
                  </p>
                )}
                {qrState === 'waiting' && qrDataUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ksk-qr-img" src={qrDataUrl} alt={t.qrAlt} />
                    <p className="ksk-qr-code ksk-mono">{qrCode}</p>
                    {qrUnreachable && (
                      <p className="ksk-qr-warn">
                        설정 오류: QR이 이 기기의 로컬 주소를 가리켜 폰에서 열리지 않습니다.
                        <br />
                        NEXT_PUBLIC_SITE_URL을 설정해 주세요. (직원 확인 필요)
                      </p>
                    )}
                    <ol className="ksk-qr-steps">
                      {t.qrSteps.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            ) : (
              <div className="ksk-cam">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={t.selectedPhotoAlt} />
                ) : (
                  <video ref={videoRef} playsInline muted />
                )}
              <i className="ksk-cam-corner" />
              <i className="ksk-cam-corner" />
              <i className="ksk-cam-corner" />
              <i className="ksk-cam-corner" />
              {countdown !== null && <div className="ksk-cam-count">{countdown}</div>}
              {camError && !photo && (
                <div className="ksk-cam-nocam">
                  <span>{t.camNotFound}</span>
                  {/* 파일 선택은 OS 탐색기를 연다 — 잠긴 키오스크에서는 노출하지 않는다 */}
                  {kiosk ? (
                    <span>{t.callStaff}</span>
                  ) : (
                    <label className="ksk-btn" style={{ borderColor: '#fff', color: '#fff' }}>
                      {t.useFile}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => e.target.files?.[0] && onUploadFallback(e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              )}
              </div>
            )}
            {/* 퍼스널 컬러 — 조명·가림에 민감해서 찍기 전에 안내한다 */}
            {captureNotice && !photo && <p className="clr-notice" role="alert">{captureNotice}</p>}
            {program === 'color' && !photo && photoSource === 'camera' && <ColorCaptureTips tx={px.color} />}
            <div style={{ flex: 1 }} />
            {photo ? (
              <div className="ksk-actions">
                <button
                  className="ksk-btn"
                  onClick={() => {
                    setPhoto(null)
                    // QR로 받은 사진을 물리면 세션이 이미 소진됐다 — 버리고 새 QR을 받는다
                    if (photoSource === 'qr') clearQr()
                  }}
                >
                  {t.retake}
                </button>
                <button className="ksk-btn ksk-btn-primary" onClick={startAnalysis}>
                  {t.analyzeStart}
                </button>
              </div>
            ) : photoSource === 'qr' ? (
              <>
                <button
                  className="ksk-alt"
                  onClick={() => {
                    clearQr()
                    setStep('product')
                  }}
                >
                  {t.backStep}
                </button>
                <div className="ksk-actions">
                  <button className="ksk-btn" onClick={useCamera}>
                    {t.useCamera}
                  </button>
                  <button
                    className="ksk-btn"
                    disabled={qrState === 'creating'}
                    onClick={startQrSession}
                  >
                    {t.regenQr}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button className="ksk-alt" onClick={startQrSession} disabled={countdown !== null}>
                  {t.useQr}
                </button>
                <div className="ksk-actions">
                  <button className="ksk-btn" onClick={() => setStep('product')}>
                    {t.prev}
                  </button>
                  <button
                    className="ksk-btn ksk-btn-primary"
                    disabled={camError || countdown !== null}
                    onClick={startCountdown}
                  >
                    {countdown !== null ? t.shooting : t.shoot}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'analyzing' && analyzeError && (
          <div className="ksk-body">
            <div className="ksk-analyze-error" role="alert">
              <p className="ksk-eyebrow ksk-mono">{analyzeError === 'network' ? 'OFFLINE' : 'ERROR'}</p>
              <h2 className="ksk-analyze-error-title">{t.analyzeError[`${analyzeError}Title`]}</h2>
              <p className="ksk-analyze-error-desc">{t.analyzeError[`${analyzeError}Desc`]}</p>
              <div className="ksk-actions">
                <button className="ksk-btn" onClick={resetAll}>{t.analyzeError.home}</button>
                <button className="ksk-btn ksk-btn-primary" onClick={startAnalysis}>{t.analyzeError.retry}</button>
              </div>
              {/* 퍼스널 컬러 — 사진이 원인이면 같은 사진으로 다시 보내도 또 실패한다. 다시 찍는 길을 준다 */}
              {program === 'color' && (
                <button className="ksk-alt" onClick={() => { setPhoto(null); setAnalyzeError(null); setStep('capture') }}>{px.color.retake}</button>
              )}
            </div>
          </div>
        )}

        {step === 'analyzing' && !analyzeError && (
          <div className="ksk-body">
            <div className="ksk-analyzing">
              <p className="ksk-eyebrow ksk-mono">ANALYZING</p>
              <div className="ksk-analyzing-pct ksk-mono">{progress}%</div>
              <div className="ksk-analyzing-bar">
                <i style={{ width: `${progress}%` }} />
              </div>
              <p className="ksk-analyzing-status">
                {statusLines[statusIdx % statusLines.length]}
              </p>
              <p className="ksk-desc">
                {analyzingEta}
              </p>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="ksk-body">
            <div className="ksk-result">
              <div className="ksk-chapter-head">
                <p className="ksk-eyebrow ksk-mono">
                  {chapters[chapterIdx]?.label ?? 'RESULT'}
                  {mocked ? ' · DEMO DATA' : ''}
                </p>
                {chapters.length > 1 && (
                  <span className="ksk-chapter-count ksk-mono">
                    {chapterIdx + 1} / {chapters.length}
                  </span>
                )}
              </div>
              {chapters.length > 1 && (
                <div className="ksk-chapter-dots">
                  {chapters.map((c, i) => (
                    <i key={c.label} data-on={i <= chapterIdx} />
                  ))}
                </div>
              )}

              {chapters[chapterIdx]?.render()}

              <div className="ksk-actions" style={{ paddingBottom: 6 }}>
                <button
                  className="ksk-btn"
                  onClick={() => (chapterIdx > 0 ? setChapterIdx((i) => i - 1) : resetAll())}
                >
                  {chapterIdx > 0 ? t.prev : t.home}
                </button>
                {chapterIdx < chapters.length - 1 ? (
                  <button className="ksk-btn ksk-btn-primary" onClick={() => setChapterIdx((i) => i + 1)}>
                    {t.next}
                  </button>
                ) : (
                  <button className="ksk-btn ksk-btn-primary" onClick={openReceipt}>
                    {kiosk?.hasPrinter ? t.receiptPrint : t.receiptPreview}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'attract' && (
          <div
            className="ksk-attract"
            role="button"
            tabIndex={0}
            // 낭독기가 제목 글자를 'SAJ U!'처럼 쪼개 읽지 않게 시작 영역 전체에 이름을 붙인다
            aria-label={kioskMode.poster ? `SAJU! ${kioskMode.poster.main} — ${t.attractCta}` : t.attractCta}
            onClick={startSession}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') startSession()
            }}
          >
            <div className={kioskMode.poster ? 'ksk-attract-head ksk-attract-head--poster' : 'ksk-attract-head'}>
              {kioskMode.poster ? (
                // 행사 모드 — 홍보 배너와 같은 제목(SAJU! / 사주로 찾는 나만의 향, / AI 조향사)
                <PosterTitle poster={kioskMode.poster} line={lang === 'ko' ? undefined : attract.sub} />
              ) : (
                <>
                  <span className="ksk-attract-ticket">{attract.ticket}</span>
                  <div className="ksk-attract-wordmark">
                    <span>AC&rsquo;SCENT</span>
                    <strong>{attract.wordmark}</strong>
                  </div>
                  <p className="ksk-attract-sub">{attract.sub}</p>
                </>
              )}
            </div>
            <div className="ksk-attract-card">
              <span className="ksk-attract-card-no">{attract.cardNo}</span>
              <p className="ksk-attract-mid">
                <strong>{attract.title1}</strong>
                <br />
                {attract.title2}
              </p>
              <p className="ksk-attract-detail">
                {attract.body1}
                <br />
                {attract.body2}
              </p>
              <div className="ksk-attract-tags">
                {attract.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="ksk-attract-cta"><span>✦</span> {t.attractCta} <span>✦</span></div>
          </div>
        )}
      </div>

      {backgroundAdminOpen && (
        <div
          className="ksk-admin-modal"
          role="dialog"
          aria-modal="true"
          aria-label="키오스크 배경 관리"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeBackgroundAdmin()
          }}
        >
          <div className="ksk-admin-panel" ref={backgroundDialogRef}>
            <div className="ksk-admin-head">
              <div>
                <p>AC&rsquo;SCENT WOW · STORE ADMIN</p>
                <h2>키오스크 배경 설정</h2>
              </div>
              <button type="button" aria-label="닫기" onClick={closeBackgroundAdmin}>×</button>
            </div>

            {backgroundAdminOffline ? (
              <div className="ksk-admin-offline">
                <p>
                  인터넷에 연결되어 있지 않아 배경은 바꿀 수 없습니다.
                  <br />
                  연결이 돌아오면 다시 열어 주세요. 앱 종료는 지금 할 수 있습니다.
                </p>
                <div className="ksk-admin-actions">
                  <button type="button" className="ksk-admin-apply" onClick={closeBackgroundAdmin}>
                    닫기
                  </button>
                  <button type="button" className="ksk-admin-quit" onClick={askQuitKiosk}>
                    앱 종료
                  </button>
                </div>
              </div>
            ) : !backgroundAdminUnlocked ? (
              <div className="ksk-admin-lock">
                <p>관리자 비밀번호 6자리를 입력해주세요.</p>
                <div className="ksk-admin-dots" aria-label={`${backgroundPassword.length}자리 입력됨`}>
                  {Array.from({ length: 6 }, (_, index) => (
                    <i key={index} data-filled={index < backgroundPassword.length} />
                  ))}
                </div>
                <strong role="status">{backgroundUnlocking ? '인증 확인 중…' : backgroundPasswordError}</strong>
                <div className="ksk-admin-pad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '지우기', '0', '확인'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      data-action={key === '확인' || key === '지우기'}
                      disabled={backgroundUnlocking || (key === '확인' && backgroundPassword.length !== 6)}
                      onClick={() => void pressBackgroundAdminKey(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ksk-admin-themes">
                <p>배경과 글꼴은 모든 단계에 적용됩니다. 관리자 페이지와 같은 목록·선택을 사용하며 수정·삭제한 사항도 자동 반영됩니다.</p>
                <KioskModeControls value={deviceSettings.mode} settings={deviceBaseSettings} onSave={saveSettings} onSelectBackground={selectBackground} disabled={!!backgroundSaving} />
                <DeviceDesignControls settings={deviceBaseSettings} onSave={saveSettings} disabled={!!backgroundSaving} sample="오늘의 최애, 어떤 향으로 기억할까요?" eventFont={screenLiveEvent?.font ? { title: screenLiveEvent.title, font: screenLiveEvent.font } : null} />
                <DeviceAdminTools target="kiosk" onApplied={() => void refreshBackgrounds()} liveTitle={screenLiveEvent?.title} />
                <div className="ksk-admin-toolbar">
                  <b>화면 배경 · {backgrounds.length}개</b>
                  <button type="button" disabled={backgroundsLoading || !!backgroundSaving} onClick={() => void refreshBackgrounds()}>
                    {backgroundsLoading ? '불러오는 중…' : '새로고침'}
                  </button>
                </div>
                {(backgroundActionError || backgroundsError) && (
                  <p className="ksk-admin-error" role="alert">{backgroundActionError || backgroundsError}</p>
                )}
                <p className="ksk-admin-status" role="status">
                  {backgroundSaving ? '서버에 배경을 저장하고 있습니다…' : backgroundsLoading ? '배경 목록을 불러오고 있습니다…' : ''}
                </p>
                <div className="ksk-admin-grid">
                  {backgrounds.map((record) => {
                    const background = toKioskTheme(record)
                    return (
                    <button
                      key={background.id}
                      type="button"
                      data-selected={background.id === backgroundId}
                      aria-pressed={background.id === backgroundId}
                      disabled={!!backgroundSaving}
                      onClick={() => void chooseBackground(background.id)}
                    >
                      <span className="ksk-admin-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={record.thumbnail_url || background.image} alt="" loading="lazy" decoding="async" />
                        <b style={{ fontFamily: screenFontFamily(record.font) ?? background.displayFont, color: background.ink }}>오늘의 최애향</b>
                      </span>
                      <span className="ksk-admin-theme-name">
                        <b>{background.title}</b>
                        <em>{background.id === backgroundId ? '✓ 적용 중' : findScreenFont(record.font)?.label ? `글꼴 · ${findScreenFont(record.font)?.label}` : '선택'}</em>
                      </span>
                    </button>
                  )})}
                </div>
                <div className="ksk-admin-actions">
                  <button type="button" className="ksk-admin-apply" onClick={closeBackgroundAdmin}>
                    닫기
                  </button>
                  {/* 앱 종료 — 비밀번호를 이미 통과한 뒤라 여기서 바로 내릴 수 있다 */}
                  <button type="button" className="ksk-admin-quit" onClick={askQuitKiosk}>
                    앱 종료
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {receipt && (
        <div className="ksk-modal">
          <div className="ksk-modal-paper" style={{ width: 'min(420px, 86%)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receipt.dataUrl} alt={t.receiptAlt} />
          </div>
          <p className="ksk-modal-note">{t.receiptNote}</p>
          <div className="ksk-modal-actions">
            <button className="ksk-btn" onClick={() => setReceipt(null)}>
              {t.close}
            </button>
            <button className="ksk-btn ksk-btn-primary" disabled={printing} onClick={printReceipt}>
              {printing ? t.printing : kiosk?.hasPrinter ? (printedOnce ? t.printAgain : t.print) : t.savePng}
            </button>
          </div>
          {/* 손님이 떠난 자리를 다음 손님이 바로 쓸 수 있게 — 발권 여부와 무관하게 항상 */}
          <button className="ksk-modal-home" onClick={resetAll}>
            {t.home}
          </button>
        </div>
      )}

      {toast && <div className="ksk-toast">{toast}</div>}
      {idleLeft !== null && (
        // 무입력 안내 — 어느 단계든 화면 가운데 10초 안내창. 어디를 눌러도(pointerdown) 시간이 다시 채워지고 닫힌다
        <div className="ksk-idle-popup" role="alertdialog" aria-live="assertive" aria-label={t.idleTitle}>
          <div className="ksk-idle-card">
            <span className="ksk-idle-count ksk-mono">{idleLeft}</span>
            <h2>{t.idleTitle}</h2>
            <p>{t.idleDesc}</p>
            <button type="button" className="ksk-btn ksk-btn-primary">
              {t.idleContinue}
            </button>
          </div>
        </div>
      )}
      {/* 안전한 모든 단계의 우하단에서 동일한 관리자 인증창을 연다. */}
      {!backgroundAdminOpen && step !== 'analyzing' && countdown === null && !printing && !receipt && (
        <button
          type="button"
          aria-label="매장 관리자 설정 열기"
          className="ksk-exit-hotspot"
          onPointerDown={onExitDown}
          onPointerUp={onExitUp}
          onPointerLeave={onExitUp}
          onPointerCancel={onExitUp}
          onClick={() => {
            if (!exitTriggered.current) openBackgroundAdmin()
            exitTriggered.current = false
          }}
        />
      )}
    </div>
  )
}

// ── 하위 컴포넌트/헬퍼 ─────────────────────────────────────────

function SelectScreen(props: {
  eyebrow: string
  title: string
  desc: string
  options: string[]
  /** 표시용 번역 — 값 자체는 한국어 원본을 유지한다(분석 프롬프트 입력) */
  labels: Record<string, string>
  selected: string[]
  prevLabel: string
  nextLabel: string
  onToggle: (v: string) => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="ksk-body">
      <p className="ksk-eyebrow ksk-mono">{props.eyebrow}</p>
      <h1 className="ksk-title">{props.title}</h1>
      <p className="ksk-desc">
        {props.desc}
        <span className="ksk-count ksk-mono" data-full={props.selected.length >= MAX_PICK}>
          {props.selected.length} / {MAX_PICK}
        </span>
      </p>
      <div className="ksk-chips">
        {props.options.map((o) => {
          const on = props.selected.includes(o)
          return (
            <button
              key={o}
              className="ksk-chip"
              data-on={on}
              // 3개를 채운 뒤 새 항목을 누르면 아무 일도 안 일어난다 — 눌러도 되는지 눈으로 보이게
              data-muted={!on && props.selected.length >= MAX_PICK}
              onClick={() => props.onToggle(o)}
            >
              {props.labels[o] ?? o}
            </button>
          )
        })}
      </div>
      <div style={{ flex: 1 }} />
      <div className="ksk-actions">
        <button className="ksk-btn" onClick={props.onPrev}>
          {props.prevLabel}
        </button>
        <button className="ksk-btn ksk-btn-primary" disabled={props.selected.length === 0} onClick={props.onNext}>
          {props.nextLabel}
        </button>
      </div>
    </div>
  )
}
