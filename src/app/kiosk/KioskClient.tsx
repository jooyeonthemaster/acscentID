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
  ImageAnalysisResult,
  SajuAnalysisResult,
  TRAIT_LABELS,
  TraitScores,
  SEASON_LABELS,
  TONE_LABELS,
  SAJU_ELEMENT_INFO,
  type SajuPurpose,
  type SajuElement,
} from '@/types/analysis'
import { PRODUCT_TYPES, ProductType } from '@/types/feedback'
import { renderKioskReceipt, ReceiptData, ReceiptSaju } from '@/lib/kiosk/receipt-canvas'
import { getKioskBridge } from '@/lib/kiosk/kiosk-bridge'
import { OnScreenKeyboard } from './OnScreenKeyboard'
import {
  SajuPurposeGrid, SajuBirthPad, SajuHourGrid, SajuRelationGrid,
  digitsToBirth, validateBirthDigits,
} from './SajuInput'
import {
  ChapterScent, ChapterProfile, ChapterReading,
  ChapterMyeongsik, ChapterSajuReading, ChapterPurpose, ChapterPrescription,
  perfumeNoFromId, scentCategoryEn,
} from './ResultView'
import './kiosk.css'

/** 사이트의 세 분석 프로그램을 키오스크로 옮긴 것 */
export type Program = 'personal' | 'idol' | 'saju'

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
]

const ACTIVE_PROGRAMS = PROGRAMS.filter((p) => p.enabled)
const DEFAULT_PROGRAM: Program = ACTIVE_PROGRAMS[0]?.id ?? 'idol'
/** 운영 프로그램이 하나뿐이면 선택 화면은 탭만 늘리므로 건너뛴다 */
const SHOW_PROGRAM_STEP = ACTIVE_PROGRAMS.length > 1

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
  | 'product'
  | 'capture'
  | 'analyzing'
  | 'result'

/** 어트랙트에서 터치했을 때 들어갈 첫 단계 */
const FIRST_STEP: Step = SHOW_PROGRAM_STEP ? 'program' : 'info'

const KIOSK_BACKGROUND_STORAGE_KEY = 'acscent-wow-kiosk-background'
const KIOSK_BACKGROUND_ADMIN_PASSWORD = '110619'

/** 포토부스와 시각 언어를 공유하되 키오스크 기기에는 별도로 저장되는 생카 테마. */
const KIOSK_BACKGROUNDS = [
  {
    id: 'gingham',
    title: '파스텔 깅엄',
    image: '/assets/photobooth/concepts/01-gingham-stationery.png',
    displayFont: 'var(--font-noto-serif-kr), "Noto Serif KR", serif',
    bodyFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    paper: '#fffaf0',
    ink: '#263d59',
    inkSoft: '#617087',
    line: 'rgba(38, 61, 89, 0.22)',
    accent: '#de665f',
    accentSoft: '#f7c9ce',
    surface: 'rgba(255, 252, 244, 0.91)',
    surfaceStrong: '#fffdf8',
    shadow: '0 18px 50px rgba(68, 86, 110, 0.16)',
    radius: '24px',
    tracking: '-0.035em',
  },
  {
    id: 'scrapbook',
    title: '스크랩북 티켓',
    image: '/assets/photobooth/concepts/02-scrapbook-ticket.png',
    displayFont: 'var(--font-kirang), "Kirang Haerang", cursive',
    bodyFont: 'var(--font-wanted), "Wanted Sans", sans-serif',
    paper: '#f7f0e2',
    ink: '#173e68',
    inkSoft: '#647181',
    line: 'rgba(23, 62, 104, 0.24)',
    accent: '#d94842',
    accentSoft: '#ffd76a',
    surface: 'rgba(255, 251, 240, 0.92)',
    surfaceStrong: '#fffcf4',
    shadow: '8px 9px 0 rgba(23, 62, 104, 0.14)',
    radius: '12px',
    tracking: '0.01em',
  },
  {
    id: 'airy',
    title: '에어리 그라데이션',
    image: '/assets/photobooth/concepts/03-airy-gradient.png',
    displayFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    bodyFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    paper: '#eefaff',
    ink: '#244a68',
    inkSoft: '#557589',
    line: 'rgba(36, 74, 104, 0.2)',
    accent: '#e96e65',
    accentSoft: '#bdefff',
    surface: 'rgba(255, 255, 255, 0.76)',
    surfaceStrong: 'rgba(255, 255, 255, 0.9)',
    shadow: '0 22px 54px rgba(48, 124, 158, 0.17)',
    radius: '28px',
    tracking: '-0.025em',
  },
  {
    id: 'retro',
    title: '레트로 체크',
    image: '/assets/photobooth/concepts/04-retro-check.png',
    displayFont: 'var(--font-jua), "Jua", "Apple SD Gothic Neo", sans-serif',
    bodyFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    paper: '#fff6df',
    ink: '#164b7e',
    inkSoft: '#5f6c78',
    line: 'rgba(22, 75, 126, 0.27)',
    accent: '#dc3d37',
    accentSoft: '#ffd457',
    surface: 'rgba(255, 250, 237, 0.93)',
    surfaceStrong: '#fffaf0',
    shadow: '8px 9px 0 #ffd457',
    radius: '18px',
    tracking: '-0.04em',
  },
] as const

interface KioskBackgroundTheme {
  id: string
  title: string
  image: string
  displayFont: string
  bodyFont: string
  paper: string
  ink: string
  inkSoft: string
  line: string
  accent: string
  accentSoft: string
  surface: string
  surfaceStrong: string
  shadow: string
  radius: string
  tracking: string
}

/** 관리자가 올린 배경 — 이미지만 바뀌고 색·글꼴은 palette 테마를 물려받는다 */
interface UploadedBackground {
  id: string
  title: string
  image_url: string
  palette: string
}

/**
 * 촬영 단계의 기본 입력. 최애 이미지 분석은 손님 폰 갤러리에 있는 사진을 쓰므로
 * QR 업로드를 먼저 띄우고, 키오스크 카메라는 선택지로 남긴다.
 */
const DEFAULT_PHOTO_SOURCE: 'camera' | 'qr' = 'qr'

const IMAGE_STEPS: Step[] = ['info', 'style', 'personality', 'charm', 'product', 'capture']
const SAJU_STEPS: Step[] = ['info', 'purpose', 'birth', 'hour', 'wish', 'product']
const SAJU_STEPS_COMPAT: Step[] = ['info', 'purpose', 'birth', 'hour', 'partner', 'wish', 'product']

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
  product: 'PRODUCT',
  capture: 'PHOTO',
}

const MAX_PICK = 3
const FRAGRANCE_DENSITY = 0.9 // g/ml — types/feedback.ts calculateGranuleAmounts와 동일 계수

const STATUS_LINES = [
  '사진의 분위기를 읽는 중...',
  '컬러 톤을 분석하는 중...',
  '선택한 키워드를 대조하는 중...',
  '30가지 AC’SCENT 향과 비교하는 중...',
  '당신의 향을 고르는 중...',
]

// 폰으로 QR을 찍고 갤러리를 뒤지는 동안은 화면 터치가 없다 — 유휴 한도를 따로 길게 잡는다
const QR_IDLE_LIMIT = 420

/* 영수증 미리보기·발권 후: 손님은 이미 볼일을 마쳤다. 20초 조용하면 10초짜리
   안내 팝업을 띄우고, 그래도 아무도 없으면 처음 화면으로 돌아간다. */
const RECEIPT_IDLE_SILENT = 20
const RECEIPT_IDLE_WARN = 10

const IDLE_LIMIT: Partial<Record<Step, number>> = {
  program: 120,
  info: 120,
  style: 120,
  personality: 120,
  charm: 120,
  purpose: 120,
  birth: 180,
  hour: 150,
  partner: 180,
  wish: 180,
  product: 120,
  capture: 180,
  analyzing: 120, // fetch 타임아웃(75s)의 보험 — 어떤 경우에도 무인 기기가 잠기지 않게
  result: 360, // 장이 여러 개라 읽는 시간이 길다
}

const SAJU_STATUS_LINES = [
  '만세력에서 생시를 찾는 중...',
  '네 기둥을 세우는 중...',
  '오행의 균형을 재는 중...',
  '용신을 정하는 중...',
  '기운에 맞는 향을 고르는 중...',
]

function toggleIn(list: string[], value: string, max: number): string[] {
  if (list.includes(value)) return list.filter((v) => v !== value)
  if (list.length >= max) return list
  return [...list, value]
}

function isMockRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('mock') === '1'
}

const PILLAR_KEYS = ['hour', 'day', 'month', 'year'] as const
const PILLAR_HEADS: Record<(typeof PILLAR_KEYS)[number], string> = {
  hour: '時柱', day: '日柱', month: '月柱', year: '年柱',
}

/** 사주 결과 → 영수증 명식/처방 데이터 */
function buildReceiptSaju(r: SajuAnalysisResult): ReceiptSaju {
  const chart = r.sajuChart
  const d = r.sajuAnalysis.scentDestiny
  const persona = r.matchingPerfumes[0]?.persona
  const el = (e: SajuElement) => `${e}(${SAJU_ELEMENT_INFO[e]?.hanja ?? ''})`

  return {
    pillars: PILLAR_KEYS.map((k) => {
      const p = chart.pillars[k]
      if (!p) return null
      return {
        head: PILLAR_HEADS[k],
        ganHanja: p.ganHanja,
        ganRead: p.gan,
        ganElement: SAJU_ELEMENT_INFO[p.ganElement]?.hanja ?? '',
        jiHanja: p.jiHanja,
        jiRead: p.ji,
        jiElement: SAJU_ELEMENT_INFO[p.jiElement]?.hanja ?? '',
        isDay: k === 'day',
      }
    }),
    dayMaster: `${chart.dayMaster.gan}(${chart.dayMaster.hanja}) · ${chart.dayMaster.strength}`,
    yongsin: `${el(chart.yongsin.element)} · ${SAJU_ELEMENT_INFO[chart.yongsin.element]?.noteFamily ?? ''}`,
    birth: `${chart.birthDisplay.solarDate}${chart.birthDisplay.sijin ? ` ${chart.birthDisplay.sijin}` : ' 시 미상'}`,
    elements: (Object.entries(chart.elementCount) as [SajuElement, number][]).map(([e, v]) => ({
      label: el(e),
      value: Math.round(v * 10) / 10,
      isYongsin: e === chart.yongsin.element,
    })),
    bridge: d.elementBridge,
    why: d.whyNarrative,
    tiers: [
      { tier: '겉향', name: persona?.mainScent?.name ?? '-', meaning: d.topMeaning },
      { tier: '중심향', name: persona?.subScent1?.name ?? '-', meaning: d.middleMeaning },
      { tier: '잔향', name: persona?.subScent2?.name ?? '-', meaning: d.baseMeaning },
    ],
    ritual: d.ritualGuide,
  }
}

function isSajuResult(r: ImageAnalysisResult | SajuAnalysisResult | null): r is SajuAnalysisResult {
  return Boolean(r && 'sajuChart' in r)
}

export function KioskClient() {
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
  const [statusIdx, setStatusIdx] = useState(0)
  const [result, setResult] = useState<ImageAnalysisResult | SajuAnalysisResult | null>(null)
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
  const [backgroundId, setBackgroundId] = useState<string>('retro')
  const [uploadedBackgrounds, setUploadedBackgrounds] = useState<UploadedBackground[]>([])
  const [backgroundAdminOpen, setBackgroundAdminOpen] = useState(false)
  const [backgroundAdminUnlocked, setBackgroundAdminUnlocked] = useState(false)
  const [backgroundPassword, setBackgroundPassword] = useState('')
  const [backgroundPasswordError, setBackgroundPasswordError] = useState('')

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
  /* 내장 배경 + 관리자가 올린 배경. 올린 것은 palette 테마의 색·글꼴을 그대로 쓰고
     배경 이미지만 갈아 끼운다 — 관리자가 색 토큰을 직접 정하면 읽히지 않는 조합이 나온다. */
  const allBackgrounds = useMemo<KioskBackgroundTheme[]>(() => {
    const uploaded = uploadedBackgrounds.map((item) => {
      const base =
        KIOSK_BACKGROUNDS.find((background) => background.id === item.palette) ??
        KIOSK_BACKGROUNDS[KIOSK_BACKGROUNDS.length - 1]
      return { ...base, id: item.id, title: item.title, image: item.image_url }
    })
    return [...uploaded, ...KIOSK_BACKGROUNDS]
  }, [uploadedBackgrounds])

  const activeBackground =
    allBackgrounds.find((background) => background.id === backgroundId) ??
    KIOSK_BACKGROUNDS[KIOSK_BACKGROUNDS.length - 1]

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KIOSK_BACKGROUND_STORAGE_KEY)
      if (saved) setBackgroundId(saved)
    } catch {
      // 저장소에 접근하지 못하면 레트로 체크 기본값을 유지한다.
    }
  }, [])

  // 관리자 페이지에서 올린 배경을 가져온다 (실패해도 내장 배경으로 정상 동작)
  useEffect(() => {
    let cancelled = false
    fetch('/api/kiosk/backgrounds', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.backgrounds)) setUploadedBackgrounds(data.backgrounds)
      })
      .catch((e) => console.error('[kiosk] 배경 목록 조회 실패:', e))
    return () => {
      cancelled = true
    }
  }, [])

  const selectBackground = useCallback((id: string) => {
    setBackgroundId(id)
    try {
      window.localStorage.setItem(KIOSK_BACKGROUND_STORAGE_KEY, id)
    } catch {
      // 저장 실패 시에도 현재 세션에는 선택값을 유지한다.
    }
  }, [])

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
    // Electron 셸에선 다음 손님을 위해 카메라 스트림 유지, 웹에선 해제
    if (!kiosk) stopStream()
  }, [kiosk, stopStream, clearCountdown])

  useEffect(() => () => stopStream(), [stopStream])

  // capture 스텝 이탈/언마운트 시 카운트다운 정리 (고아 interval이 상태를 재오염시키는 것 방지)
  useEffect(() => {
    if (step !== 'capture') clearCountdown()
    return clearCountdown
  }, [step, clearCountdown])

  // ── 유휴 리셋 ─────────────────────────────────────────────
  const receiptOpen = Boolean(receipt)

  useEffect(() => {
    const limit = receiptOpen
      ? RECEIPT_IDLE_SILENT + RECEIPT_IDLE_WARN
      : step === 'capture' && photoSource === 'qr'
        ? QR_IDLE_LIMIT
        : IDLE_LIMIT[step]
    if (!limit) {
      setIdleLeft(null)
      return
    }
    const warnFrom = receiptOpen ? RECEIPT_IDLE_WARN : 15
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
        setIdleLeft(left <= warnFrom ? left : null)
      }
    }, 1000)
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      window.clearInterval(timer)
      setIdleLeft(null)
    }
  }, [step, photoSource, resetAll, receiptOpen, printing])

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
      showToast('카메라 준비 중입니다. 잠시 후 다시 시도해 주세요.')
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
  }, [showToast])

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
      const url = `${origin.replace(/\/$/, '')}/kiosk/upload/${data.code}`
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
  }, [])

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
        showToast('사진을 받았습니다')
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
  }, [step, photo, photoSource, qrState, qrCode, showToast])

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

  // ── 분석 ─────────────────────────────────────────────────
  const startAnalysis = useCallback(async () => {
    const isSaju = program === 'saju'
    setStep('analyzing')
    setProgress(0)
    setChapterIdx(0)

    // 가짜 진행률: 사주는 서사가 길어 응답이 더 느리다(시상수를 늘림)
    const started = Date.now()
    const tau = isSaju ? 22000 : 12000
    const lines = isSaju ? SAJU_STATUS_LINES : STATUS_LINES
    const progTimer = window.setInterval(() => {
      const t = (Date.now() - started) / tau
      setProgress(Math.min(90, Math.round(90 * (1 - Math.exp(-t)))))
    }, 400)
    const statusTimer = window.setInterval(() => {
      setStatusIdx((i) => (i + 1) % lines.length)
    }, 2600)

    const backStep: Step = isSaju ? 'product' : 'capture'
    try {
      const url = isSaju ? '/api/kiosk/analyze/saju' : '/api/kiosk/analyze'
      const body = isSaju
        ? {
          name: name.trim() || '게스트',
          gender: gender || '',
          targetType: 'self' as const,
          purpose,
          birth: digitsToBirth(birthDigits, calendar, isLeapMonth, hourIndex === 'unknown' ? null : hourIndex),
          ...(purpose === 'compatibility'
            ? {
              partner: {
                name: partnerName.trim() || '상대방',
                gender: partnerGender || '',
                relation: partnerRelation,
                birth: digitsToBirth(partnerDigits, partnerCalendar, partnerLeap, null),
              },
            }
            : {}),
          ...(wish.trim() ? { wish: wish.trim() } : {}),
          mock: isMockRequested(),
        }
        : {
          formData: {
            name: name.trim() || '게스트',
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
        }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 무인 기기: 네트워크가 행 걸려도 반드시 입력 화면으로 복귀한다 (사주는 서사가 길어 더 준다)
        signal: AbortSignal.timeout(isSaju ? 110_000 : 75_000),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      // 실패 시 가짜 결과로 진행하지 않는다 — 랜덤 레시피가 실물로 제조되면 안 되기 때문
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || '분석 결과가 비어 있습니다')
      }
      setResult(json.data as ImageAnalysisResult | SajuAnalysisResult)
      setMocked(Boolean(json.mocked))
    } catch (e) {
      console.error('[kiosk] 분석 실패:', e)
      showToast('분석 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      setStep(backStep)
      return
    } finally {
      window.clearInterval(progTimer)
      window.clearInterval(statusTimer)
    }

    setProgress(100)
    window.setTimeout(() => setStep('result'), 450)
  }, [
    program, name, gender, styles, personalities, charms, photo, showToast,
    purpose, birthDigits, calendar, isLeapMonth, hourIndex, wish,
    partnerName, partnerGender, partnerRelation, partnerDigits, partnerCalendar, partnerLeap,
  ])

  // ── 프로그램별 단계 / 결과 장 ───────────────────────────────
  const steps = useMemo<Step[]>(() => {
    if (program !== 'saju') return IMAGE_STEPS
    return purpose === 'compatibility' ? SAJU_STEPS_COMPAT : SAJU_STEPS
  }, [program, purpose])

  const goNext = useCallback(() => {
    const i = steps.indexOf(step)
    if (i < 0) return
    if (i === steps.length - 1) startAnalysis()
    else setStep(steps[i + 1])
  }, [steps, step, startAnalysis])

  const goPrev = useCallback(() => {
    const i = steps.indexOf(step)
    if (i <= 0) {
      if (SHOW_PROGRAM_STEP) setStep('program')
      else resetAll()
    } else setStep(steps[i - 1])
  }, [steps, step, resetAll])

  /* scroll: true 인 장은 글이 길다. 한 화면에 욱여넣으려고 축소하면 글씨가 읽을 수
     없을 만큼 작아지므로, 원래 크기로 두고 스크롤한다 (들어오면 힌트 애니메이션이 돈다). */
  const chapters = useMemo(() => {
    if (!result) return []
    if (isSajuResult(result)) {
      return [
        { label: '命式 · 명식', render: () => <ChapterMyeongsik result={result} />, scroll: false },
        { label: '解 · 풀이', render: () => <ChapterSajuReading result={result} />, scroll: true },
        { label: '望 · 물음', render: () => <ChapterPurpose result={result} />, scroll: true },
        { label: '香 · 처방', render: () => <ChapterPrescription result={result} />, scroll: false },
      ]
    }
    return [
      { label: 'SCENT · 당신의 향', render: () => <ChapterScent result={result} />, scroll: false },
      { label: 'PROFILE · 프로필', render: () => <ChapterProfile result={result} />, scroll: false },
      { label: 'READING · 해석', render: () => <ChapterReading result={result} />, scroll: true },
    ]
  }, [result])

  const scrollChapter = step === 'result' && Boolean(chapters[chapterIdx]?.scroll)

  // ── 결과 파생 데이터 ───────────────────────────────────────
  const match = result?.matchingPerfumes?.[0]
  const persona = match?.persona
  const productInfo = PRODUCT_TYPES.find((p) => p.id === productType)!

  const topTraits = useMemo(() => {
    if (!result) return []
    return (Object.entries(result.traits) as [keyof TraitScores, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key, value]) => ({ label: TRAIT_LABELS[key], value }))
  }, [result])

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
        // 셸은 순수 base64를 기대한다 (Buffer.from(photoBase64, 'base64')) — dataURL 접두어 제거
        photoBase64: photo ? photo.split(',')[1] : null,
      })
      .catch(() => {})
  }, [step, result, kiosk, name, productType, persona, photo])

  // ── 분석 기록 (관리자 /admin/kiosk) ─────────────────────────
  // 결과 화면에 도달한 건만 남긴다. 실패해도 손님 플로우는 그대로 진행한다 —
  // 기록은 운영 통계용이지 손님이 기다릴 이유가 없다.
  useEffect(() => {
    if (step !== 'result' || !result || !persona || !match || recordedRef.current) return
    recordedRef.current = true

    const saju = isSajuResult(result) ? buildReceiptSaju(result) : null
    fetch('/api/kiosk/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program,
        customer_name: name.trim() || '게스트',
        gender,
        // 사주는 사진을 쓰지 않는다
        photo_source: isSajuResult(result) ? null : photoSource,
        product_type: productType,
        product_label: productInfo.label,
        perfume_id: persona.id,
        perfume_no: perfumeNoFromId(persona.id),
        perfume_name: persona.name,
        category_en: scentCategoryEn(persona.id),
        match_score: match.score,
        keywords: (result.matchingKeywords?.length ? result.matchingKeywords : persona.keywords)?.slice(0, 5),
        traits: topTraits,
        personal_color: result.personalColor
          ? `${SEASON_LABELS[result.personalColor.season]} ${TONE_LABELS[result.personalColor.tone]}`
          : null,
        analysis_text: [result.analysis?.mood, result.analysis?.style].filter(Boolean).join(' '),
        recipe: recipeRows,
        saju,
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
    step, result, persona, match, program, name, gender, photoSource, productType,
    productInfo, topTraits, recipeRows, mocked, kiosk,
  ])

  // ── 영수증 ────────────────────────────────────────────────
  const buildReceipt = useCallback(async (): Promise<{ dataUrl: string; base64: string } | null> => {
    if (!result || !persona || !match) return null
    const now = new Date()
    const two = (n: number) => String(n).padStart(2, '0')
    const baseMl = productInfo.totalVolumeMl - productInfo.fragranceVolumeMl
    const categoryEn = scentCategoryEn(persona.id)

    const data: ReceiptData = {
      ticket: ticketRef.current,
      date: `${now.getFullYear()}.${two(now.getMonth() + 1)}.${two(now.getDate())}`,
      time: `${two(now.getHours())}:${two(now.getMinutes())}`,
      customerName: name.trim() || '게스트',
      gender,
      productLabel: productInfo.label,
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
        ? `${SEASON_LABELS[result.personalColor.season]} ${TONE_LABELS[result.personalColor.tone]}`
        : '',
      palette: result.personalColor?.palette?.slice(0, 4) ?? [],
      signals: topTraits,
      recipeRows,
      baseText: baseMl > 0 ? `퍼퓸 베이스 ${baseMl.toFixed(1)}ml` : '디퓨저 원액 (베이스 없음)',
      steps: [
        '레시피의 향료를 순서대로 계량한다.',
        '베이스와 혼합한 뒤 가볍게 흔든다.',
        '어두운 곳에서 24시간 이상 숙성한다.',
      ],
      // 손님이 읽어야 하는 안내 — 향 번호와 같은 크기로 크게 찍힌다
      counterNotice: ['이 영수증을 카운터에 제출해 주세요.', '적힌 레시피 그대로 제품을 준비해 드립니다.'],
      footerLines: [
        ...(mocked ? ['※ 데모 결과입니다 — 실제 제조용이 아닙니다.'] : []),
        "AC'SCENT · www.acscent.co.kr",
      ],
      ...(isSajuResult(result) ? { saju: buildReceiptSaju(result) } : {}),
    }
    // 사주는 사진을 쓰지 않는다 (생년월일시만으로 보는 프로그램)
    const rendered = await renderKioskReceipt(data, {
      photoSrc: isSajuResult(result) ? null : photo,
    })
    return { dataUrl: rendered.dataUrl, base64: rendered.base64 }
  }, [result, persona, match, productInfo, name, gender, topTraits, recipeRows, photo, mocked])

  const openReceipt = useCallback(async () => {
    try {
      // 선채번: 셸이 nextTicket을 지원하면 인쇄 전에 번호를 받아 원판에 그려 넣는다
      if (kiosk?.hasPrinter && !ticketRef.current && kiosk.nextTicket) {
        const t = await kiosk.nextTicket().catch(() => null)
        if (t?.success && t.ticket) ticketRef.current = t.ticket
      }
      const r = await buildReceipt()
      if (r) setReceipt(r)
    } catch (e) {
      console.error('[kiosk] 영수증 렌더 실패:', e)
      showToast('영수증 생성에 실패했습니다. 다시 시도해 주세요.')
    }
  }, [buildReceipt, kiosk, showToast])

  const printReceipt = useCallback(async () => {
    if (!receipt) return
    if (!kiosk?.hasPrinter) {
      // 웹 초안: PNG 다운로드로 대체
      const a = document.createElement('a')
      a.href = receipt.dataUrl
      a.download = `acscent-receipt-${Date.now()}.png`
      a.click()
      showToast('영수증 이미지를 저장했습니다')
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
        if (res.ticket && !ticketRef.current) {
          ticketRef.current = res.ticket
          // 구형 셸(선채번 미지원) 경로: 채번된 번호를 반영해 재인쇄용 원판만 갱신
          const again = await buildReceipt()
          if (again) setReceipt(again)
        }
        showToast(`TICKET #${res.ticket ?? ''} 발권 완료`)
      } else {
        showToast(`인쇄 실패: ${res.error ?? '프린터 오류'}`)
      }
    } catch (e) {
      console.error('[kiosk] 인쇄 실패:', e)
      showToast('인쇄에 실패했습니다. 직원에게 문의해 주세요.')
    } finally {
      setPrinting(false)
    }
  }, [receipt, kiosk, buildReceipt, showToast])

  // ── 관리자 핫스팟 (짧게: 배경 설정 / Electron 3초 홀드: 앱 종료) ────
  const exitHold = useRef<number | undefined>(undefined)
  const exitTriggered = useRef(false)
  const openBackgroundAdmin = useCallback(() => {
    setBackgroundAdminOpen(true)
    setBackgroundAdminUnlocked(false)
    setBackgroundPassword('')
    setBackgroundPasswordError('')
  }, [])
  const closeBackgroundAdmin = useCallback(() => {
    setBackgroundAdminOpen(false)
    setBackgroundAdminUnlocked(false)
    setBackgroundPassword('')
    setBackgroundPasswordError('')
  }, [])
  const onExitDown = useCallback(() => {
    exitTriggered.current = false
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
  }, [step, chapterIdx, oskOpen, wishOpen, partnerOskOpen, photo, result, qrState, camError, styles, personalities, charms, scrollChapter])

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

  return (
    <div
      className="ksk-root"
      data-background={activeBackground.id}
      style={{
        '--ksk-background-image': `url("${activeBackground.image}")`,
        '--ksk-display-font': activeBackground.displayFont,
        '--ksk-body-font': activeBackground.bodyFont,
        '--ksk-display-tracking': activeBackground.tracking,
        '--paper': activeBackground.paper,
        '--ink': activeBackground.ink,
        '--ink-soft': activeBackground.inkSoft,
        '--line': activeBackground.line,
        '--accent': activeBackground.accent,
        '--accent-soft': activeBackground.accentSoft,
        '--surface': activeBackground.surface,
        '--surface-strong': activeBackground.surfaceStrong,
        '--ksk-shadow': activeBackground.shadow,
        '--ksk-radius': activeBackground.radius,
      } as CSSProperties}
    >
      <div className="ksk-stage">
        {showHeader && (
          <header>
            <div className="ksk-top">
              <span className="ksk-top-brand">AC&rsquo;SCENT WOW</span>
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
            <h1 className="ksk-title">어떤 분석을 해볼까요?</h1>
            <p className="ksk-desc">프로그램에 따라 물어보는 것이 달라집니다.</p>
            <div className="ksk-programs">
              {ACTIVE_PROGRAMS.map((p) => (
                <button
                  key={p.id}
                  className="ksk-program"
                  data-on={program === p.id}
                  onClick={() => {
                    setProgram(p.id)
                    setStep('info')
                  }}
                >
                  <span className="ksk-program-hanja">{p.hanja}</span>
                  <span className="ksk-program-body">
                    <b>{p.title}</b>
                    <span>{p.desc}</span>
                  </span>
                  <em className="ksk-mono">{p.note}</em>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={resetAll}>
                처음으로
              </button>
            </div>
          </div>
        )}

        {step === 'purpose' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{STEP_LABELS.purpose}</p>
            <h1 className="ksk-title">무엇이 궁금하세요?</h1>
            <p className="ksk-desc">고르신 주제로 명식을 풀이합니다.</p>
            <SajuPurposeGrid value={purpose} onChange={setPurpose} />
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                이전
              </button>
              <button className="ksk-btn ksk-btn-primary" disabled={!purpose} onClick={goNext}>
                다음
              </button>
            </div>
          </div>
        )}

        {step === 'birth' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{STEP_LABELS.birth}</p>
            <h1 className="ksk-title">언제 태어나셨나요?</h1>
            <SajuBirthPad
              digits={birthDigits}
              onDigits={setBirthDigits}
              calendar={calendar}
              onCalendar={setCalendar}
              isLeapMonth={isLeapMonth}
              onLeapMonth={setIsLeapMonth}
            />
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                이전
              </button>
              <button
                className="ksk-btn ksk-btn-primary"
                disabled={birthDigits.length !== 8 || Boolean(validateBirthDigits(birthDigits, calendar))}
                onClick={goNext}
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === 'hour' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{STEP_LABELS.hour}</p>
            <h1 className="ksk-title">태어난 시간은요?</h1>
            <p className="ksk-desc">시간을 알면 네 기둥이 모두 서고, 모르면 세 기둥으로 봅니다.</p>
            <SajuHourGrid value={hourIndex} onChange={setHourIndex} />
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                이전
              </button>
              <button className="ksk-btn ksk-btn-primary" disabled={hourIndex === null} onClick={goNext}>
                다음
              </button>
            </div>
          </div>
        )}

        {step === 'partner' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{STEP_LABELS.partner}</p>
            <h1 className="ksk-title">누구와의 궁합인가요?</h1>
            <label className="ksk-field-label ksk-mono">관계</label>
            <SajuRelationGrid value={partnerRelation} onChange={setPartnerRelation} />
            <label className="ksk-field-label ksk-mono">상대 이름</label>
            <button className="ksk-input" data-empty={!partnerName} onClick={() => setPartnerOskOpen(true)}>
              {partnerName || '이름 또는 별명'}
            </button>
            <label className="ksk-field-label ksk-mono">상대 성별</label>
            <div className="ksk-chips" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  className="ksk-chip"
                  data-on={partnerGender === g.key}
                  onClick={() => setPartnerGender(g.key)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <label className="ksk-field-label ksk-mono">상대 생년월일</label>
            <SajuBirthPad
              digits={partnerDigits}
              onDigits={setPartnerDigits}
              calendar={partnerCalendar}
              onCalendar={setPartnerCalendar}
              isLeapMonth={partnerLeap}
              onLeapMonth={setPartnerLeap}
              label="상대 생년월일"
            />
            <div style={{ flex: 1 }} />
            {partnerOskOpen ? (
              <OnScreenKeyboard
                value={partnerName}
                onChange={setPartnerName}
                onClose={() => setPartnerOskOpen(false)}
                maxLength={12}
                hint="상대 이름"
              />
            ) : (
              <div className="ksk-actions">
                <button className="ksk-btn" onClick={goPrev}>
                  이전
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
                  다음
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'wish' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">{STEP_LABELS.wish}</p>
            <h1 className="ksk-title">마음에 걸리는 것이 있나요?</h1>
            <p className="ksk-desc">한 줄만 적어주시면 풀이에 함께 엮습니다. 건너뛰어도 됩니다.</p>
            <button className="ksk-input ksk-input-tall" data-empty={!wish} onClick={() => setWishOpen(true)}>
              {wish || '예) 올해 이직을 해도 될까요'}
            </button>
            <div style={{ flex: 1 }} />
            {wishOpen ? (
              <OnScreenKeyboard
                value={wish}
                onChange={setWish}
                onClose={() => setWishOpen(false)}
                maxLength={40}
                hint="고민 한 줄"
              />
            ) : (
              <div className="ksk-actions">
                <button className="ksk-btn" onClick={goPrev}>
                  이전
                </button>
                <button className="ksk-btn ksk-btn-primary" onClick={goNext}>
                  {wish.trim() ? '다음' : '건너뛰기'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'info' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">01 · PROFILE</p>
            <h1 className="ksk-title">
              {program === 'idol' ? '최애를 어떻게 부르세요?' : '어떻게 불러드릴까요?'}
            </h1>
            <p className="ksk-desc">이름은 영수증 리포트에 함께 인쇄됩니다.</p>
            <label className="ksk-field-label ksk-mono">NAME (선택)</label>
            {/* 터치 전용: 네이티브 키보드를 띄우지 않고 자체 OSK를 연다 */}
            <button className="ksk-input" data-empty={!name} onClick={() => setOskOpen(true)}>
              {name || '이름 또는 별명'}
            </button>
            <label className="ksk-field-label ksk-mono">GENDER</label>
            <div className="ksk-chips" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {GENDER_OPTIONS.map((g) => (
                <button key={g.key} className="ksk-chip" data-on={gender === g.key} onClick={() => setGender(g.key)}>
                  {g.label}
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
                hint="이름 또는 별명"
              />
            ) : (
              <div className="ksk-actions">
                <button className="ksk-btn" onClick={resetAll}>
                  처음으로
                </button>
                <button className="ksk-btn ksk-btn-primary" disabled={!gender} onClick={goNext}>
                  다음
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'style' && (
          <SelectScreen
            eyebrow="02 · STYLE"
            title="평소 스타일에 가까운 것은?"
            desc={`최대 ${MAX_PICK}개까지 고를 수 있어요.`}
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
            title="나의 성격과 가까운 것은?"
            desc={`최대 ${MAX_PICK}개까지 고를 수 있어요.`}
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
            title="나만의 매력 포인트는?"
            desc={`최대 ${MAX_PICK}개까지 고를 수 있어요.`}
            options={[...CHARM_POINTS]}
            selected={charms}
            onToggle={(v) => setCharms((s) => toggleIn(s, v, MAX_PICK))}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}

        {step === 'product' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">05 · PRODUCT</p>
            <h1 className="ksk-title">어떤 제품으로 만들까요?</h1>
            <p className="ksk-desc">분석 결과 레시피가 선택한 제품 기준으로 인쇄됩니다.</p>
            <div className="ksk-products">
              {PRODUCT_TYPES.map((p) => (
                <button
                  key={p.id}
                  className="ksk-product"
                  data-on={productType === p.id}
                  onClick={() => setProductType(p.id)}
                >
                  <span>
                    <b>{p.label}</b>
                    <span>{p.description}</span>
                  </span>
                  <em className="ksk-mono">향료 {p.fragranceVolumeMl}ml</em>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div className="ksk-actions">
              <button className="ksk-btn" onClick={goPrev}>
                이전
              </button>
              <button className="ksk-btn ksk-btn-primary" onClick={goNext}>
                {program === 'saju' ? '분석 시작' : '다음'}
              </button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="ksk-body">
            <p className="ksk-eyebrow ksk-mono">06 · PHOTO</p>
            <h1 className="ksk-title">
              {photo
                ? '이 사진으로 분석할까요?'
                : photoSource === 'qr'
                  ? '폰으로 사진을 올려 주세요'
                  : '카메라를 바라봐 주세요'}
            </h1>
            <p className="ksk-desc">
              {!photo && photoSource === 'qr'
                ? '올리신 사진은 이 화면으로 전달된 즉시 서버에서 삭제되며, 향 분석 외의 용도로 쓰이지 않습니다.'
                : '사진은 향 분석을 위해 AI 분석 서버로만 전송되며, 웹 계정에는 저장되지 않습니다.'}
            </p>

            {!photo && photoSource === 'qr' ? (
              <div className="ksk-qr">
                {qrState === 'creating' && <p className="ksk-qr-msg">QR을 만드는 중입니다...</p>}
                {qrState === 'failed' && (
                  <p className="ksk-qr-msg">
                    연결이 불안정해 사진을 받지 못했습니다.
                    <br />
                    QR을 다시 만들거나 카메라로 촬영해 주세요.
                  </p>
                )}
                {qrState === 'expired' && (
                  <p className="ksk-qr-msg">
                    시간이 만료되었습니다.
                    <br />
                    QR을 다시 만들어 주세요.
                  </p>
                )}
                {qrState === 'waiting' && qrDataUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ksk-qr-img" src={qrDataUrl} alt="사진 업로드 QR" />
                    <p className="ksk-qr-code ksk-mono">{qrCode}</p>
                    {qrUnreachable && (
                      <p className="ksk-qr-warn">
                        설정 오류: QR이 이 기기의 로컬 주소를 가리켜 폰에서 열리지 않습니다.
                        <br />
                        NEXT_PUBLIC_SITE_URL을 설정해 주세요. (직원 확인 필요)
                      </p>
                    )}
                    <ol className="ksk-qr-steps">
                      <li>폰 카메라로 QR을 스캔합니다.</li>
                      <li>갤러리에서 사진 한 장을 고릅니다.</li>
                      <li>이 화면에 자동으로 나타납니다.</li>
                    </ol>
                  </>
                )}
              </div>
            ) : (
              <div className="ksk-cam">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="선택된 사진" />
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
                  <span>카메라를 찾을 수 없습니다. 연결을 확인하는 중...</span>
                  {/* 파일 선택은 OS 탐색기를 연다 — 잠긴 키오스크에서는 노출하지 않는다 */}
                  {kiosk ? (
                    <span>계속 반복되면 직원을 불러 주세요.</span>
                  ) : (
                    <label className="ksk-btn" style={{ borderColor: '#fff', color: '#fff' }}>
                      사진 파일로 대신하기
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
                  다시 하기
                </button>
                <button className="ksk-btn ksk-btn-primary" onClick={startAnalysis}>
                  분석 시작
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
                  이전 단계로 돌아가기
                </button>
                <div className="ksk-actions">
                  <button className="ksk-btn" onClick={useCamera}>
                    직접 촬영하기
                  </button>
                  <button
                    className="ksk-btn"
                    disabled={qrState === 'creating'}
                    onClick={startQrSession}
                  >
                    QR 다시 만들기
                  </button>
                </div>
              </>
            ) : (
              <>
                <button className="ksk-alt" onClick={startQrSession} disabled={countdown !== null}>
                  QR로 폰 사진 올리기
                </button>
                <div className="ksk-actions">
                  <button className="ksk-btn" onClick={() => setStep('product')}>
                    이전
                  </button>
                  <button
                    className="ksk-btn ksk-btn-primary"
                    disabled={camError || countdown !== null}
                    onClick={startCountdown}
                  >
                    {countdown !== null ? '촬영 중...' : '촬영하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'analyzing' && (
          <div className="ksk-body">
            <div className="ksk-analyzing">
              <p className="ksk-eyebrow ksk-mono">ANALYZING</p>
              <div className="ksk-analyzing-pct ksk-mono">{progress}%</div>
              <div className="ksk-analyzing-bar">
                <i style={{ width: `${progress}%` }} />
              </div>
              <p className="ksk-analyzing-status">
                {(program === 'saju' ? SAJU_STATUS_LINES : STATUS_LINES)[
                  statusIdx % (program === 'saju' ? SAJU_STATUS_LINES : STATUS_LINES).length
                ]}
              </p>
              <p className="ksk-desc">
                {program === 'saju' ? '명식을 풀이하는 데 40~80초쯤 걸립니다.' : '보통 20~40초 정도 걸립니다.'}
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
                <span className="ksk-chapter-count ksk-mono">
                  {chapterIdx + 1} / {chapters.length}
                </span>
              </div>
              <div className="ksk-chapter-dots">
                {chapters.map((c, i) => (
                  <i key={c.label} data-on={i <= chapterIdx} />
                ))}
              </div>

              {chapters[chapterIdx]?.render()}

              <div className="ksk-actions" style={{ paddingBottom: 6 }}>
                <button
                  className="ksk-btn"
                  onClick={() => (chapterIdx > 0 ? setChapterIdx((i) => i - 1) : resetAll())}
                >
                  {chapterIdx > 0 ? '이전' : '처음으로'}
                </button>
                {chapterIdx < chapters.length - 1 ? (
                  <button className="ksk-btn ksk-btn-primary" onClick={() => setChapterIdx((i) => i + 1)}>
                    다음
                  </button>
                ) : (
                  <button className="ksk-btn ksk-btn-primary" onClick={openReceipt}>
                    {kiosk?.hasPrinter ? '영수증 출력' : '영수증 미리보기'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'attract' && (
          <div
            className="ksk-attract"
            onClick={() => {
              setStep(FIRST_STEP)
            }}
          >
            <div className="ksk-attract-head">
              <span className="ksk-attract-ticket">FOR YOUR BIAS · HONGDAE</span>
              <div className="ksk-attract-wordmark">
                <span>AC&rsquo;SCENT</span>
                <strong>WOW!</strong>
              </div>
              <p className="ksk-attract-sub">최애를 닮은 향을 만드는 AI 조향사</p>
            </div>
            <div className="ksk-attract-card">
              <span className="ksk-attract-card-no">01 PHOTO → 01 SCENT</span>
              <p className="ksk-attract-mid">
                <strong>오늘의 최애,</strong>
                <br />
                어떤 향으로 기억할까요?
              </p>
              <p className="ksk-attract-detail">
                사진 속 분위기를 읽어 어울리는 향을 찾고,
                <br />
                리포트를 영수증으로 뽑아드려요.
              </p>
              <div className="ksk-attract-tags">
                <span>#최애향</span><span>#AI조향</span><span>#홍대생카</span>
              </div>
            </div>
            <div className="ksk-attract-cta"><span>✦</span> 화면을 터치해 시작하기 <span>✦</span></div>
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
          <div className="ksk-admin-panel">
            <div className="ksk-admin-head">
              <div>
                <p>AC&rsquo;SCENT WOW · STORE ADMIN</p>
                <h2>키오스크 배경 설정</h2>
              </div>
              <button type="button" aria-label="닫기" onClick={closeBackgroundAdmin}>×</button>
            </div>

            {!backgroundAdminUnlocked ? (
              <div className="ksk-admin-lock">
                <p>관리자 비밀번호 6자리를 입력해주세요.</p>
                <div className="ksk-admin-dots" aria-label={`${backgroundPassword.length}자리 입력됨`}>
                  {Array.from({ length: 6 }, (_, index) => (
                    <i key={index} data-filled={index < backgroundPassword.length} />
                  ))}
                </div>
                {backgroundPasswordError && <strong>{backgroundPasswordError}</strong>}
                <div className="ksk-admin-pad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '지우기', '0', '확인'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      data-action={key === '확인' || key === '지우기'}
                      disabled={key === '확인' && backgroundPassword.length !== 6}
                      onClick={() => {
                        setBackgroundPasswordError('')
                        if (key === '지우기') {
                          setBackgroundPassword((value) => value.slice(0, -1))
                          return
                        }
                        if (key === '확인') {
                          if (backgroundPassword === KIOSK_BACKGROUND_ADMIN_PASSWORD) {
                            setBackgroundAdminUnlocked(true)
                            setBackgroundPassword('')
                          } else {
                            setBackgroundPassword('')
                            setBackgroundPasswordError('비밀번호가 올바르지 않습니다.')
                          }
                          return
                        }
                        setBackgroundPassword((value) => `${value}${key}`.slice(0, 6))
                      }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ksk-admin-themes">
                <p>선택한 배경과 글꼴은 모든 단계에 적용되고 이 기기에 저장됩니다.</p>
                <div className="ksk-admin-grid">
                  {allBackgrounds.map((background) => (
                    <button
                      key={background.id}
                      type="button"
                      data-selected={background.id === backgroundId}
                      onClick={() => selectBackground(background.id)}
                    >
                      <span className="ksk-admin-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={background.image} alt="" />
                        <b style={{ fontFamily: background.displayFont }}>오늘의 최애향</b>
                      </span>
                      <span className="ksk-admin-theme-name">
                        <b>{background.title}</b>
                        <em>{background.id === backgroundId ? '✓ 적용 중' : '선택'}</em>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="ksk-admin-actions">
                  <button type="button" className="ksk-admin-apply" onClick={closeBackgroundAdmin}>
                    적용하고 닫기
                  </button>
                  {/* 앱 종료 — 비밀번호를 이미 통과한 뒤라 여기서 바로 내릴 수 있다 */}
                  <button
                    type="button"
                    className="ksk-admin-quit"
                    onClick={() => {
                      if (kiosk) kiosk.quitApp()
                      else {
                        closeBackgroundAdmin()
                        showToast('키오스크 앱에서만 종료할 수 있습니다')
                      }
                    }}
                  >
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
            <img src={receipt.dataUrl} alt="영수증 미리보기" />
          </div>
          <p className="ksk-modal-note">
            실제 출력은 80mm 감열지(512dot) 흑백으로 인쇄됩니다 — 이 이미지가 인쇄 원판입니다.
          </p>
          <div className="ksk-modal-actions">
            <button className="ksk-btn" onClick={() => setReceipt(null)}>
              닫기
            </button>
            <button className="ksk-btn ksk-btn-primary" disabled={printing} onClick={printReceipt}>
              {printing ? '인쇄 중...' : kiosk?.hasPrinter ? (printedOnce ? '한 장 더 출력' : '인쇄하기') : 'PNG 저장'}
            </button>
          </div>
          {/* 손님이 떠난 자리를 다음 손님이 바로 쓸 수 있게 — 발권 여부와 무관하게 항상 */}
          <button className="ksk-modal-home" onClick={resetAll}>
            처음으로
          </button>
        </div>
      )}

      {toast && <div className="ksk-toast">{toast}</div>}
      {idleLeft !== null && receiptOpen ? (
        // 화면 어디를 눌러도(pointerdown) 대기 시간이 다시 채워지고 팝업은 닫힌다
        <div className="ksk-idle-popup" role="alertdialog" aria-live="assertive">
          <div className="ksk-idle-card">
            <span className="ksk-idle-count ksk-mono">{idleLeft}</span>
            <h2>잠시 후 처음 화면으로 돌아갑니다</h2>
            <p>계속 보시려면 화면을 터치해 주세요.</p>
            <button type="button" className="ksk-btn ksk-btn-primary">
              계속 보기
            </button>
          </div>
        </div>
      ) : (
        idleLeft !== null && <div className="ksk-idle">{idleLeft}초 후 처음 화면으로 돌아갑니다</div>
      )}
      {/* 어트랙트 우하단: 짧게 누르면 배경 설정, 1.5초 길게 누르면 종료 */}
      {step === 'attract' && !backgroundAdminOpen && (
        <button
          type="button"
          aria-label="관리자 설정 열기 (길게 누르면 종료)"
          className="ksk-exit-hotspot"
          onPointerDown={onExitDown}
          onPointerUp={onExitUp}
          onPointerLeave={onExitUp}
          onPointerCancel={onExitUp}
          onClick={openBackgroundAdmin}
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
  selected: string[]
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
              {o}
            </button>
          )
        })}
      </div>
      <div style={{ flex: 1 }} />
      <div className="ksk-actions">
        <button className="ksk-btn" onClick={props.onPrev}>
          이전
        </button>
        <button className="ksk-btn ksk-btn-primary" disabled={props.selected.length === 0} onClick={props.onNext}>
          다음
        </button>
      </div>
    </div>
  )
}
