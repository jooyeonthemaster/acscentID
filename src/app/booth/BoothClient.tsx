'use client'

/**
 * 매장 포토부스 부스 화면 — 생카(생일카페) 팬덤 이벤트 특화 (웹 초안)
 *
 * 흐름: 체험 선택 → 이용권 코드 입력(상품 구매 특전) →
 *      (포카·직찍: 폰 QR 업로드 수신 / 최애와 찍기: 템플릿 선택) → 웹캠 촬영(1컷/4컷)
 *      → 합성·프레임 편집 → 4x6인치(1200x1800px, 300dpi) 인쇄/저장
 *
 * 최애와 찍기는 템플릿의 빈 배경에 손님을 페더 블렌딩해 "옆에 같이 선" 한 장을 만든다.
 * 촬영 화면의 라이브 프리뷰와 최종 인화가 같은 합성 함수를 쓰므로 본 그대로 인화된다.
 *
 * - 진행 중 생카 이벤트(주인공·테마색·해시태그·주최 크레딧)와 프레임/템플릿은
 *   /api/photobooth/config — 관리자 페이지에서 갱신하면 부스 새 세션마다 반영
 * - 이용권은 직원이 결제 시 발급한 6자리 코드 (photobooth_passes)
 * - 폰 업로드는 photobooth_sessions 폴링 (2.5초 간격)
 * - 추후 Electron 등 앱 전환을 고려해 이 라우트는 독립적으로 동작 (로그인·로케일 무관)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'qrcode'
import {
  Camera,
  Smartphone,
  Sparkles,
  RefreshCw,
  Printer,
  Download,
  ChevronLeft,
  Loader2,
  Check,
  X,
  Delete,
  Ticket,
  Users,
  QrCode,
} from 'lucide-react'
import {
  BUNDLED_TEMPLATES,
  BUNDLED_FRAMES,
  resolveTemplateGeometry,
  type TemplateGeometry,
} from '@/lib/photobooth/templates'
import {
  PRINT,
  TEMPLATE_LAYOUT,
  renderTogetherBand,
  drawPhotoCard,
  drawEventFooter,
  drawCoverFocal,
  drawCutoutPerson,
  averageColor,
  type FitOptions,
} from '@/lib/photobooth/compose'
import { cutoutPerson } from '@/lib/photobooth/segmentation'
import { parseCardCode, CARD_CODE_LENGTH } from '@/lib/photobooth/card-code'

/** 브라우저 내장 QR 인식 API (지원하지 않는 환경이 있어 직접 좁게 선언) */
type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}

// 4x6인치 @300dpi (세로)
const CANVAS_W = PRINT.W
const CANVAS_H = PRINT.H

const POLL_INTERVAL_MS = 2500
const DEFAULT_ACCENT = '#f5d76e'
const BACKGROUND_STORAGE_KEY = 'acscent-booth-background'
const BACKGROUND_ADMIN_PASSWORD = '110619'

const BOOTH_BACKGROUNDS = [
  {
    id: 'graphite',
    title: '그래파이트 갤러리',
    image: '/assets/photobooth/attract/graphite-gallery.png',
    tone: 'dark',
    displayFont: 'var(--font-wanted), "Wanted Sans", sans-serif',
    bodyFont: 'var(--font-wanted), "Wanted Sans", sans-serif',
    displayWeight: 800,
    displayTracking: '-0.04em',
    fontLabel: 'Wanted Sans',
  },
  {
    id: 'gingham',
    title: '파스텔 깅엄',
    image: '/assets/photobooth/concepts/01-gingham-stationery.png',
    tone: 'light',
    displayFont: 'var(--font-noto-serif-kr), "Noto Serif KR", serif',
    bodyFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    displayWeight: 600,
    displayTracking: '-0.035em',
    fontLabel: 'Noto Serif KR',
  },
  {
    id: 'scrapbook',
    title: '스크랩북 티켓',
    image: '/assets/photobooth/concepts/02-scrapbook-ticket.png',
    tone: 'light',
    displayFont: 'var(--font-kirang), "Kirang Haerang", cursive',
    bodyFont: 'var(--font-wanted), "Wanted Sans", sans-serif',
    displayWeight: 400,
    displayTracking: '0.01em',
    fontLabel: 'Kirang Haerang',
  },
  {
    id: 'airy',
    title: '에어리 그라데이션',
    image: '/assets/photobooth/concepts/03-airy-gradient.png',
    tone: 'light',
    displayFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    bodyFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    displayWeight: 300,
    displayTracking: '-0.025em',
    fontLabel: 'S-Core Dream Light',
  },
  {
    id: 'retro',
    title: '레트로 체크',
    image: '/assets/photobooth/concepts/04-retro-check.png',
    tone: 'light',
    displayFont: 'var(--font-jua), "Jua", "Apple SD Gothic Neo", sans-serif',
    bodyFont: 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif',
    displayWeight: 400,
    displayTracking: '-0.045em',
    fontLabel: 'Jua',
  },
] as const

type BoothBackgroundId = (typeof BOOTH_BACKGROUNDS)[number]['id']

// 라이브 합성 프리뷰 해상도 (인화 원판의 절반)
const PREVIEW_W = Math.round(TEMPLATE_LAYOUT.contentW / 2)
const PREVIEW_H = Math.round(TEMPLATE_LAYOUT.togetherH / 2)

type Mode = 'solo' | 'together' | 'template' | 'card'
/** 업로드 사진 인물 오려내기 상태 — 실패해도 폴라로이드 합성으로 계속 진행한다 */
type CutoutStatus = 'idle' | 'processing' | 'done' | 'failed'

interface ScannedCard {
  code: string
  title: string
  cutoutUrl: string
}
type Step = 'home' | 'pass' | 'qr' | 'scan' | 'template' | 'camera' | 'compose' | 'result'
type CutCount = 1 | 4

interface BoothAsset {
  id: string
  kind: 'frame' | 'template'
  title: string
  image_url: string
  foreground_url?: string | null
  display_order: number
  event_id: string | null
}

interface BoothEvent {
  id: string
  title: string
  artist: string | null
  organizer: string | null
  hashtag: string | null
  greeting: string | null
  theme_color: string | null
  cover_image_url: string | null
  starts_on: string | null
  ends_on: string | null
}

interface GuestLayer {
  x: number
  y: number
  scale: number // 캔버스 너비 대비 비율
  rotation: number // degree
}

const DEFAULT_GUEST_LAYER: GuestLayer = { x: 850, y: 1300, scale: 0.42, rotation: -6 }

/**
 * 오려낸 인물의 기본 배치.
 *
 * 폴라로이드가 아니라 "옆에 선 사람"이므로 기울이지 않는다. 원본 사진 아래쪽에서 잘린
 * 단면이 인화지 안에 직선으로 드러나지 않도록, 인물의 발치를 인화지 바깥으로 살짝 빼고
 * 키가 인화지 높이의 약 2/3가 되게 맞춘다.
 */
function cutoutLayerFor(canvas: HTMLCanvasElement): GuestLayer {
  const aspect = canvas.height / canvas.width
  const targetH = PRINT.H * 0.66
  const width = targetH / aspect
  const scale = Math.min(0.85, Math.max(0.28, width / PRINT.W))
  const drawnH = scale * PRINT.W * aspect
  return {
    x: Math.round(PRINT.W * 0.7),
    y: Math.round(PRINT.H - drawnH / 2 + drawnH * 0.05),
    scale,
    rotation: 0,
  }
}
// 템플릿 인물과 얼굴 크기가 크게 벌어지지 않도록 기본값만 살짝 확대한다.
// 이후 편집 화면에서 손님이 슬라이더로 다시 조절할 수 있다.
const DEFAULT_FIT: Required<Pick<FitOptions, 'focalX' | 'focalY' | 'zoom'>> = {
  focalX: 0.5,
  focalY: 0.4,
  zoom: 1.08,
}

// 배경 제거는 단색 배경지가 있어야 의미가 있으므로 기본은 꺼둔다 (부스에서 켜면 저장됨)
const KEYING_STORAGE_KEY = 'acscent-booth-keying'
const DEFAULT_KEYING = { enabled: false, tolerance: 0.22, softness: 0.1 }

// ======================
// Helpers
// ======================
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:') && !src.startsWith('/')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`이미지를 불러올 수 없습니다: ${src}`))
    img.src = src
  })
}

/** 대상 영역을 비율 유지로 가득 채우기 (cover) */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  drawCoverFocal(ctx, img, dx, dy, dw, dh)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 이벤트 기간 표시 (예: 9.20 – 9.22) */
function formatPeriod(event: BoothEvent): string | null {
  const fmt = (d: string) => {
    const [, m, day] = d.split('-')
    return `${Number(m)}.${Number(day)}`
  }
  if (event.starts_on && event.ends_on) return `${fmt(event.starts_on)} – ${fmt(event.ends_on)}`
  if (event.ends_on) return `~ ${fmt(event.ends_on)}`
  if (event.starts_on) return `${fmt(event.starts_on)} ~`
  return null
}

// ======================
// Component
// ======================
export function BoothClient() {
  const [step, setStep] = useState<Step>('home')
  const [mode, setMode] = useState<Mode>('solo')

  // 이벤트 + 관리자 소재
  const [event, setEvent] = useState<BoothEvent | null>(null)
  const [frames, setFrames] = useState<BoothAsset[]>(BUNDLED_FRAMES)
  const [templates, setTemplates] = useState<BoothAsset[]>(BUNDLED_TEMPLATES)

  // 이용권 (상품 구매 특전)
  const [passVerified, setPassVerified] = useState(false)
  const [pendingMode, setPendingMode] = useState<Mode | null>(null)
  const [passDigits, setPassDigits] = useState('')
  const [passError, setPassError] = useState('')
  const [passLoading, setPassLoading] = useState(false)

  // 같이 찍기 세션
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [guestPhotoUrl, setGuestPhotoUrl] = useState<string | null>(null)

  // 템플릿 (최애와 찍기)
  const [selectedTemplate, setSelectedTemplate] = useState<BoothAsset | null>(null)
  const [templateGeometry, setTemplateGeometry] = useState<TemplateGeometry | null>(null)
  const [guestFit, setGuestFit] = useState(DEFAULT_FIT)
  // 매장 배경지 제거 — 그린/블루 스크린 앞에서 찍으면 인물만 남아 진짜 옆에 선 것처럼 된다.
  // 매장마다 배경지 유무가 다르므로 설정은 이 부스에 저장해 세션이 바뀌어도 유지한다.
  const [keying, setKeying] = useState(DEFAULT_KEYING)
  const templateImgRef = useRef<HTMLImageElement | null>(null)
  const templateForegroundRef = useRef<HTMLImageElement | null>(null)

  // 카메라
  const videoRef = useRef<HTMLVideoElement>(null)
  const livePreviewRef = useRef<HTMLCanvasElement>(null)
  // 단계 전환에 AnimatePresence mode="wait" 를 쓰기 때문에 새 화면의 canvas 는
  // 이전 화면 exit 이 끝난 뒤에야 마운트된다. effect 가 그 시점을 놓치지 않도록
  // ref 대신 state 로도 노드를 들고 있다가 마운트되면 렌더를 다시 돌린다.
  const [livePreviewNode, setLivePreviewNode] = useState<HTMLCanvasElement | null>(null)
  const attachLivePreview = useCallback((node: HTMLCanvasElement | null) => {
    livePreviewRef.current = node
    setLivePreviewNode(node)
  }, [])
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [shooting, setShooting] = useState(false)
  const [shotProgress, setShotProgress] = useState<{ current: number; total: number } | null>(null)
  const [cutCount, setCutCount] = useState<CutCount>(1)
  const [shots, setShots] = useState<string[]>([])
  const activeShotRef = useRef(1)
  /** 이번 촬영의 기록 id — 인쇄·저장 시 같은 건을 갱신한다 */
  const shotIdRef = useRef<string | null>(null)

  // 합성
  const composeCanvasRef = useRef<HTMLCanvasElement>(null)
  const [composeCanvasNode, setComposeCanvasNode] = useState<HTMLCanvasElement | null>(null)
  const attachComposeCanvas = useCallback((node: HTMLCanvasElement | null) => {
    composeCanvasRef.current = node
    setComposeCanvasNode(node)
  }, [])
  const [selectedFrame, setSelectedFrame] = useState<BoothAsset | null>(null)
  const [guestLayer, setGuestLayer] = useState<GuestLayer>(DEFAULT_GUEST_LAYER)
  const [composeError, setComposeError] = useState<string | null>(null)
  // 업로드 사진 인물 오려내기 (MediaPipe) — 배경을 지워 "같이 찍은 것처럼" 합성
  const [cutout, setCutout] = useState<HTMLCanvasElement | null>(null)
  const [cutoutStatus, setCutoutStatus] = useState<CutoutStatus>('idle')
  const [useCutout, setUseCutout] = useState(true)
  // 매장 포토카드 스캔
  const [scannedCard, setScannedCard] = useState<ScannedCard | null>(null)
  const [scanError, setScanError] = useState('')
  const [scanBusy, setScanBusy] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const renderTokenRef = useRef(0)
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null)

  // 결과
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [isAttract, setIsAttract] = useState(false)
  const [flash, setFlash] = useState(false)
  const [backgroundId, setBackgroundId] = useState<BoothBackgroundId>('graphite')
  const [backgroundAdminOpen, setBackgroundAdminOpen] = useState(false)
  const [backgroundAdminUnlocked, setBackgroundAdminUnlocked] = useState(false)
  const [backgroundPassword, setBackgroundPassword] = useState('')
  const [backgroundPasswordError, setBackgroundPasswordError] = useState('')

  const accent = event?.theme_color || DEFAULT_ACCENT
  const activeBackground =
    BOOTH_BACKGROUNDS.find((background) => background.id === backgroundId) ??
    BOOTH_BACKGROUNDS[0]
  const lightHome = activeBackground.tone === 'light'

  // ---------- 설정(이벤트 + 소재) 로드 ----------
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/photobooth/config', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setEvent(data.event ?? null)
        setFrames([...(data.frames ?? []), ...BUNDLED_FRAMES])
        const remoteTemplates = data.templates ?? []
        // 관리자 템플릿이 있으면 앞에, 번들 상시 템플릿은 뒤에 붙여 항상 선택지가 있게
        setTemplates([...remoteTemplates, ...BUNDLED_TEMPLATES])
      }
    } catch (error) {
      console.error('부스 설정 로드 실패:', error)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BACKGROUND_STORAGE_KEY)
      if (BOOTH_BACKGROUNDS.some((background) => background.id === saved)) {
        setBackgroundId(saved as BoothBackgroundId)
      }
    } catch {
      // 저장소 접근 불가 시 기본 배경 유지
    }
  }, [])

  const selectBackground = useCallback((id: BoothBackgroundId) => {
    setBackgroundId(id)
    try {
      window.localStorage.setItem(BACKGROUND_STORAGE_KEY, id)
    } catch {
      // 저장 실패 시 현재 세션에는 선택값 유지
    }
  }, [])

  // 홈에서 60초간 입력이 없으면 매장 어트랙트 화면으로 전환
  useEffect(() => {
    if (step !== 'home') {
      setIsAttract(false)
      return
    }
    let timer = window.setTimeout(() => setIsAttract(true), 60_000)
    const reset = () => {
      setIsAttract(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIsAttract(true), 60_000)
    }
    window.addEventListener('pointerdown', reset)
    window.addEventListener('keydown', reset)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [step])

  // 배경 제거 설정은 이 부스 기기에 저장 (매장이 한 번만 맞추면 됨)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEYING_STORAGE_KEY)
      if (saved) setKeying({ ...DEFAULT_KEYING, ...JSON.parse(saved) })
    } catch {
      // 저장소 접근 불가 시 기본값 유지
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(KEYING_STORAGE_KEY, JSON.stringify(keying))
    } catch {
      // 저장 실패는 무시 (동작에는 영향 없음)
    }
  }, [keying])

  const getImage = useCallback(async (src: string) => {
    const cached = imageCacheRef.current.get(src)
    if (cached) return cached
    const img = await loadImage(src)
    imageCacheRef.current.set(src, img)
    return img
  }, [])

  // ---------- 처음으로 ----------
  const resetAll = useCallback(() => {
    setStep('home')
    setPassVerified(false)
    setPendingMode(null)
    setPassDigits('')
    setPassError('')
    setSessionCode(null)
    setQrDataUrl(null)
    setSessionExpired(false)
    setGuestPhotoUrl(null)
    setUseCutout(true)
    setScannedCard(null)
    setScanError('')
    setManualCode('')
    setSelectedTemplate(null)
    setTemplateGeometry(null)
    templateImgRef.current = null
    templateForegroundRef.current = null
    setGuestFit(DEFAULT_FIT)
    setShots([])
    setCutCount(1)
    shotIdRef.current = null
    setResultUrl(null)
    setComposeError(null)
    setCameraError(null)
    setGuestLayer(DEFAULT_GUEST_LAYER)
    loadConfig() // 관리자 변경사항 새 세션마다 반영
  }, [loadConfig])

  // ---------- 이전 단계 ----------
  // 이용권은 검증 즉시 사용 처리될 수 있으므로, 검증 이후 선택 화면에서 홈으로
  // 돌아갈 때는 인증 상태를 유지한다. 촬영 이후에는 실제 직전 작업 단계로 이동한다.
  const goBack = useCallback(() => {
    setPassError('')

    if (step === 'result') {
      setStep('compose')
      return
    }

    if (step === 'compose') {
      setShots([])
      setComposeError(null)
      setStep('camera')
      return
    }

    if (step === 'camera' && mode === 'template') {
      setShots([])
      setCameraError(null)
      setStep('template')
      return
    }

    if (step === 'qr' || (step === 'camera' && mode === 'together')) {
      setSessionCode(null)
      setQrDataUrl(null)
      setSessionExpired(false)
      setGuestPhotoUrl(null)
    }

    if (step === 'pass') {
      setPendingMode(null)
      setPassDigits('')
    }

    setShots([])
    setCameraError(null)
    setStep('home')
  }, [mode, step])

  // ---------- 체험 흐름 시작 ----------
  const proceedToMode = useCallback(async (nextMode: Mode) => {
    setMode(nextMode)
    if (nextMode === 'solo') {
      setStep('camera')
      return
    }
    if (nextMode === 'template') {
      setStep('template')
      return
    }
    if (nextMode === 'card') {
      // 매장 포토카드 — 폰도 업로드도 없이 카드를 카메라에 보여주면 끝
      setScanError('')
      setManualCode('')
      setStep('scan')
      return
    }
    // together — 업로드 세션 생성 + QR
    setStep('qr')
    setSessionExpired(false)
    setQrDataUrl(null)
    try {
      const res = await fetch('/api/photobooth/session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.code) throw new Error(data.error || '세션 생성 실패')
      setSessionCode(data.code)
      const uploadUrl = `${window.location.origin}/booth/upload/${data.code}`
      const qr = await QRCode.toDataURL(uploadUrl, { width: 480, margin: 1 })
      setQrDataUrl(qr)
    } catch (error) {
      console.error('업로드 세션 생성 실패:', error)
      setSessionExpired(true)
    }
  }, [])

  const startMode = useCallback(
    (nextMode: Mode) => {
      if (passVerified) {
        proceedToMode(nextMode)
        return
      }
      // 이용권 입력 게이트 (상품 구매 특전)
      setPendingMode(nextMode)
      setPassDigits('')
      setPassError('')
      setStep('pass')
    },
    [passVerified, proceedToMode]
  )

  // ---------- 템플릿 선택 → 빈 영역 기하 계산 ----------
  const selectTemplate = useCallback(
    async (tpl: BoothAsset) => {
      setSelectedTemplate(tpl)
      setGuestFit(DEFAULT_FIT)
      setTemplateGeometry(null)
      templateImgRef.current = null
      templateForegroundRef.current = null
      setStep('camera')
      try {
        const [img, foreground] = await Promise.all([
          getImage(tpl.image_url),
          tpl.foreground_url ? getImage(tpl.foreground_url) : Promise.resolve(null),
        ])
        templateImgRef.current = img
        templateForegroundRef.current = foreground
        setTemplateGeometry(resolveTemplateGeometry(tpl.id, img))
      } catch (error) {
        console.error('템플릿 로드 실패:', error)
      }
    },
    [getImage]
  )

  // ---------- 이용권 코드 ----------
  const submitPass = useCallback(
    async (code: string) => {
      setPassLoading(true)
      setPassError('')
      try {
        const res = await fetch('/api/photobooth/pass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '이용권 확인에 실패했어요')
        setPassVerified(true)
        const next = pendingMode ?? 'solo'
        setPendingMode(null)
        proceedToMode(next)
      } catch (error) {
        setPassError(error instanceof Error ? error.message : '이용권 확인에 실패했어요')
        setPassDigits('')
      } finally {
        setPassLoading(false)
      }
    },
    [pendingMode, proceedToMode]
  )

  const pressKeypad = useCallback(
    (digit: string) => {
      if (passLoading) return
      setPassError('')
      setPassDigits((prev) => {
        if (digit === 'back') return prev.slice(0, -1)
        if (prev.length >= 6) return prev
        const next = prev + digit
        if (next.length === 6) submitPass(next)
        return next
      })
    },
    [passLoading, submitPass]
  )

  // ---------- 폰 업로드 폴링 ----------
  useEffect(() => {
    if (step !== 'qr' || !sessionCode || sessionExpired) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/photobooth/session?code=${sessionCode}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok) return
        if (data.status === 'uploaded' && data.photoUrl) {
          setGuestPhotoUrl(data.photoUrl)
          setStep('camera')
        } else if (data.status === 'expired') {
          setSessionExpired(true)
        }
      } catch {
        // 네트워크 일시 오류는 다음 폴링에서 재시도
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [step, sessionCode, sessionExpired])

  // ---------- 매장 포토카드 ----------
  /** 코드 해석 → 미리 따둔 누끼를 불러와 바로 촬영으로 (런타임 세그멘테이션 없음) */
  const applyCardCode = useCallback(
    async (rawCode: string) => {
      const code = parseCardCode(rawCode)
      if (!code) {
        setScanError('카드 번호를 읽지 못했어요')
        return false
      }
      setScanBusy(true)
      setScanError('')
      try {
        const res = await fetch(`/api/photobooth/card?code=${code}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '카드를 확인하지 못했어요')

        const img = await getImage(data.card.cutoutUrl)
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('카드 이미지를 준비하지 못했어요')
        ctx.drawImage(img, 0, 0)

        setScannedCard({ code: data.card.code, title: data.card.title, cutoutUrl: data.card.cutoutUrl })
        setCutout(canvas)
        setCutoutStatus('done')
        setUseCutout(true)
        setGuestLayer(cutoutLayerFor(canvas))
        setStep('camera')
        return true
      } catch (error) {
        console.error('[photobooth] 카드 적용 실패:', error)
        setScanError(error instanceof Error ? error.message : '카드를 확인하지 못했어요')
        return false
      } finally {
        setScanBusy(false)
      }
    },
    [getImage]
  )

  // 부스 카메라로 카드 QR 읽기 — 브라우저 내장 BarcodeDetector 사용
  useEffect(() => {
    if (step !== 'scan') return
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorLike }).BarcodeDetector
    if (!Detector) {
      // 윈도우 등 미지원 환경: 번호 직접 입력으로 안내
      setScanError('이 기기에서는 자동 인식을 지원하지 않아요. 카드의 번호를 입력해주세요')
      return
    }

    let detector: { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> }
    try {
      detector = new Detector({ formats: ['qr_code'] })
    } catch {
      setScanError('카드 인식을 시작하지 못했어요. 번호를 입력해주세요')
      return
    }

    let stopped = false
    const tick = async () => {
      if (stopped) return
      const video = videoRef.current
      if (video && video.videoWidth) {
        try {
          const found = await detector.detect(video)
          if (found.length > 0 && !stopped) {
            stopped = true
            await applyCardCode(found[0].rawValue)
            return
          }
        } catch {
          // 인식 실패는 다음 프레임에서 재시도
        }
      }
      if (!stopped) window.setTimeout(tick, 350)
    }
    tick()
    return () => {
      stopped = true
    }
  }, [step, applyCardCode])

  // ---------- 업로드 사진 인물 오려내기 ----------
  // 사진이 도착하자마자 한 번만 돌린다(촬영하는 동안 끝나므로 손님은 대기를 못 느낀다).
  // 실패하면 기존 폴라로이드 합성으로 조용히 폴백한다 — 부스가 멈추면 안 된다.
  useEffect(() => {
    if (!guestPhotoUrl) {
      setCutout(null)
      setCutoutStatus('idle')
      return
    }
    let cancelled = false
    setCutout(null)
    setCutoutStatus('processing')
    ;(async () => {
      try {
        const img = await getImage(guestPhotoUrl)
        const result = await cutoutPerson(img)
        if (cancelled) return
        // 인물이 거의 안 잡혔거나 화면 전체가 인물로 잡히면 실패로 본다
        if (result.coverage < 0.02 || result.coverage > 0.97) {
          throw new Error(`인물 영역이 비정상입니다 (coverage ${result.coverage.toFixed(2)})`)
        }
        setCutout(result.canvas)
        setCutoutStatus('done')
        setGuestLayer(cutoutLayerFor(result.canvas))
      } catch (error) {
        if (cancelled) return
        console.error('[photobooth] 인물 오려내기 실패:', error)
        setCutoutStatus('failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [guestPhotoUrl, getImage])

  // ---------- 카메라 ----------
  /**
   * video 엘리먼트에 스트림을 연결한다.
   *
   * 단계 전환에 AnimatePresence mode="wait" 를 쓰기 때문에 새 화면은 이전 화면의
   * exit 애니메이션(약 0.28초)이 끝난 뒤에야 마운트된다. 권한이 이미 허용된 상태면
   * getUserMedia 가 그보다 빨리 resolve 하므로, 그 시점엔 videoRef 가 아직 null 이다.
   * 그래서 "스트림 도착"과 "엘리먼트 마운트" 양쪽에서 모두 연결을 시도한다.
   */
  const bindStream = useCallback((node: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!node || !stream) return
    if (node.srcObject !== stream) node.srcObject = stream
    // autoplay 정책에 막히는 경우를 대비해 명시적으로 재생
    node.play().catch(() => {})
  }, [])

  const attachVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node
      bindStream(node, streamRef.current)
    },
    [bindStream]
  )

  useEffect(() => {
    if (step !== 'camera' && step !== 'scan') return
    let cancelled = false
    setCameraError(null)
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        // video 엘리먼트가 이미 붙어 있으면 지금 연결하고, 아직이면 attachVideo가 마운트 시 연결한다
        bindStream(videoRef.current, stream)
      })
      .catch((error) => {
        console.error('카메라 접근 실패:', error)
        setCameraError('카메라를 사용할 수 없습니다. 브라우저 카메라 권한을 확인해주세요.')
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [step, bindStream])

  // ---------- 최애와 찍기: 라이브 합성 프리뷰 ----------
  const liveComposeReady = step === 'camera' && mode === 'template' && !!templateGeometry
  useEffect(() => {
    if (!liveComposeReady) return
    const canvas = livePreviewNode
    const templateImg = templateImgRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !templateImg || !ctx || !templateGeometry) return

    let raf = 0
    const loop = () => {
      const video = videoRef.current
      if (video && video.videoWidth) {
        if (activeShotRef.current >= 2) {
          // 2컷째는 단독 컷이라 합성 없이 거울 프리뷰
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          drawCoverFocal(ctx, video, 0, 0, canvas.width, canvas.height, { mirror: true })
        } else {
          renderTogetherBand(ctx, 0, 0, canvas.width, canvas.height, {
            templateImg,
            foregroundImg: templateForegroundRef.current,
            guest: video,
            geometry: templateGeometry,
            radius: 0,
            mirror: true,
            keying,
            ...guestFit,
          })
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [liveComposeReady, livePreviewNode, templateGeometry, guestFit, keying])

  const captureShot = useCallback((): string | null => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // 프리뷰(거울모드)와 동일하게 좌우 반전 캡처
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.92)
  }, [])

  const startShooting = useCallback(async () => {
    if (shooting) return
    setShooting(true)
    setShots([])
    // 최애와 찍기는 합성 컷 + 단독 컷 2장으로 인화지 한 장을 채운다
    const total = mode === 'template' ? 2 : cutCount
    const collected: string[] = []
    try {
      for (let shot = 1; shot <= total; shot++) {
        activeShotRef.current = shot
        setShotProgress(total > 1 ? { current: shot, total } : null)
        for (let n = 3; n >= 1; n--) {
          setCountdown(n)
          await sleep(1000)
        }
        setCountdown(null)
        const dataUrl = captureShot()
        if (dataUrl) {
          collected.push(dataUrl)
          setShots([...collected])
          setFlash(true)
          window.setTimeout(() => setFlash(false), 180)
        }
        if (shot < total) await sleep(700) // 컷 사이 포즈 전환 시간
      }
    } finally {
      activeShotRef.current = 1
      setCountdown(null)
      setShotProgress(null)
      setShooting(false)
    }
    if (collected.length === 0) return
    setShots(collected)
    setSelectedFrame((prev) => prev ?? (mode === 'template' ? null : frames[0] ?? null))
    setStep('compose')
  }, [shooting, mode, cutCount, captureShot, frames])

  // ---------- 합성 렌더 ----------
  useEffect(() => {
    if (step !== 'compose' || shots.length === 0) return
    const canvas = composeCanvasNode
    if (!canvas) return
    const token = ++renderTokenRef.current

    const render = async () => {
      try {
        setComposeError(null)
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        await document.fonts.ready
        const shotImages = await Promise.all(shots.map((s) => getImage(s)))
        const templateImg =
          mode === 'template' && selectedTemplate
            ? await getImage(selectedTemplate.image_url)
            : null
        const templateForeground =
          mode === 'template' && selectedTemplate?.foreground_url
            ? await getImage(selectedTemplate.foreground_url)
            : null
        const guest =
          mode === 'together' && guestPhotoUrl ? await getImage(guestPhotoUrl) : null
        const frame = selectedFrame ? await getImage(selectedFrame.image_url) : null

        if (renderTokenRef.current !== token) return

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

        if (templateImg && templateGeometry) {
          // 최애와 찍기 — 위: 카메라 배경을 공유하는 아티스트 합성 컷, 아래: 단독 컷, 맨 아래: 이벤트 밴드
          const { x, contentW, togetherY, togetherH, soloY, soloH, footerY } = TEMPLATE_LAYOUT

          renderTogetherBand(ctx, x, togetherY, contentW, togetherH, {
            templateImg,
            foregroundImg: templateForeground,
            guest: shotImages[0],
            geometry: templateGeometry,
            keying,
            ...guestFit,
          })

          drawPhotoCard(ctx, shotImages[1] ?? shotImages[0], x, soloY, contentW, soloH)

          const dateText = new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          drawEventFooter(ctx, x, footerY, contentW, PRINT.footerH, {
            bgColor: event?.theme_color || templateGeometry.bgColor,
            title: event?.greeting || event?.title || "AC'SCENT WOW",
            subtitle: [event?.artist, event?.organizer && `주최 ${event.organizer}`]
              .filter(Boolean)
              .join('  ·  '),
            hashtag: event?.hashtag ?? null,
            date: dateText,
          })
        } else if (templateImg) {
          // 기하 정보를 못 구한 경우의 안전한 대체 배치 (위/아래 반반)
          drawCover(ctx, templateImg, 0, 0, CANVAS_W, CANVAS_H / 2)
          drawCover(ctx, shotImages[0], 0, CANVAS_H / 2, CANVAS_W, CANVAS_H / 2)
        } else if (shotImages.length >= 4) {
          // 4컷: 2x2 그리드 (인생네컷 감성)
          const cellW = CANVAS_W / 2
          const cellH = CANVAS_H / 2
          for (let i = 0; i < 4; i++) {
            const col = i % 2
            const row = Math.floor(i / 2)
            drawCover(ctx, shotImages[i], col * cellW, row * cellH, cellW, cellH)
          }
        } else {
          drawCover(ctx, shotImages[0], 0, 0, CANVAS_W, CANVAS_H)
        }

        if ((mode === 'together' || mode === 'card') && useCutout && cutout) {
          // 배경을 지운 인물만 올려 "같이 찍은 것처럼" — 톤 매칭 + 그림자로 스티커 느낌을 없앤다
          drawCutoutPerson(
            ctx,
            cutout,
            guestLayer.x,
            guestLayer.y,
            guestLayer.scale * CANVAS_W,
            guestLayer.rotation,
            { toneColor: averageColor(shotImages[0]) }
          )
        } else if (guest) {
          // 폴백(오려내기 실패·끄기): 폰 사진을 폴라로이드 스타일로 올림
          const w = guestLayer.scale * CANVAS_W
          const h = w * (guest.height / guest.width)
          const border = Math.max(10, w * 0.035)
          ctx.save()
          ctx.translate(guestLayer.x, guestLayer.y)
          ctx.rotate((guestLayer.rotation * Math.PI) / 180)
          ctx.shadowColor = 'rgba(0,0,0,0.35)'
          ctx.shadowBlur = 30
          ctx.shadowOffsetY = 10
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(-w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2)
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetY = 0
          ctx.drawImage(guest, -w / 2, -h / 2, w, h)
          ctx.restore()
        }

        if (frame) {
          ctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H)
        }
      } catch (error) {
        console.error('합성 렌더 실패:', error)
        if (renderTokenRef.current === token) {
          setComposeError('이미지 합성에 실패했습니다. 다시 시도해주세요.')
        }
      }
    }
    render()
  }, [
    step,
    composeCanvasNode,
    cutout,
    useCutout,
    mode,
    shots,
    guestPhotoUrl,
    selectedTemplate,
    templateGeometry,
    guestFit,
    keying,
    selectedFrame,
    guestLayer,
    event,
    getImage,
  ])

  // ---------- 캔버스 드래그 ----------
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (mode !== 'together' && mode !== 'template') return
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY }
    },
    [mode]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const canvas = e.currentTarget
      const factor = CANVAS_W / canvas.clientWidth
      const dx = (e.clientX - drag.lastX) * factor
      const dy = (e.clientY - drag.lastY) * factor
      drag.lastX = e.clientX
      drag.lastY = e.clientY

      if (mode === 'template') {
        // 사진을 끄는 방향과 반대로 크롭 기준점이 움직여야 직관적이다
        setGuestFit((prev) => ({
          ...prev,
          focalX: Math.min(1, Math.max(0, prev.focalX - dx / TEMPLATE_LAYOUT.contentW)),
          focalY: Math.min(1, Math.max(0, prev.focalY - dy / TEMPLATE_LAYOUT.togetherH)),
        }))
        return
      }

      setGuestLayer((prev) => ({
        ...prev,
        x: Math.min(CANVAS_W, Math.max(0, prev.x + dx)),
        y: Math.min(CANVAS_H, Math.max(0, prev.y + dy)),
      }))
    },
    [mode]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null
  }, [])

  // ---------- 완료 / 인쇄 ----------
  /** 촬영 내역 기록 — 사진은 보내지 않고 메타데이터만. 실패해도 손님 흐름을 막지 않는다 */
  const logShot = useCallback(async () => {
    try {
      const res = await fetch('/api/photobooth/shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          cut_count: mode === 'template' ? 2 : cutCount,
          card_code: scannedCard?.code ?? null,
          frame_title: selectedFrame?.title ?? null,
          template_title: selectedTemplate?.title ?? null,
          cutout_used: useCutout && !!cutout,
        }),
      })
      const data = await res.json()
      if (res.ok && data.id) shotIdRef.current = data.id
    } catch (error) {
      console.error('[photobooth] 촬영 기록 실패:', error)
    }
  }, [mode, cutCount, scannedCard, selectedFrame, selectedTemplate, useCutout, cutout])

  const markShot = useCallback(async (payload: { printed?: boolean; downloaded?: boolean }) => {
    if (!shotIdRef.current) return
    try {
      await fetch('/api/photobooth/shot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shotIdRef.current, ...payload }),
      })
    } catch (error) {
      console.error('[photobooth] 촬영 기록 갱신 실패:', error)
    }
  }, [])

  const finishCompose = useCallback(() => {
    const canvas = composeCanvasRef.current
    if (!canvas) return
    setFinishing(true)
    try {
      setResultUrl(canvas.toDataURL('image/jpeg', 0.95))
      setStep('result')
      logShot()
    } catch (error) {
      // 외부 이미지 CORS 문제 등으로 캔버스가 오염된 경우
      console.error('결과 생성 실패:', error)
      setComposeError('결과 이미지를 만들 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setFinishing(false)
    }
  }, [logShot])

  const handlePrint = useCallback(() => {
    markShot({ printed: true })
    window.print()
  }, [markShot])

  const handleDownload = useCallback(() => {
    if (!resultUrl) return
    markShot({ downloaded: true })
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `acscent-photo-${Date.now()}.jpg`
    link.click()
  }, [resultUrl, markShot])

  const eventPeriod = event ? formatPeriod(event) : null
  const templateLabel = event?.artist ? `${event.artist}와 찍기` : '최애와 찍기'
  const standSideText =
    templateGeometry?.freeSide === 'left' ? '왼쪽' : '오른쪽'

  // ======================
  // Render
  // ======================
  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-neutral-950 text-white flex flex-col select-none ${lightHome ? 'booth-tone-light' : 'booth-tone-dark'}`}
      style={{
        fontFamily: activeBackground.bodyFont,
        '--booth-display-font': activeBackground.displayFont,
        '--booth-display-weight': String(activeBackground.displayWeight),
        '--booth-display-tracking': activeBackground.displayTracking,
      } as React.CSSProperties}
    >
      {/* 4x6 인쇄 전용 영역 */}
      <style>{`
        @font-face {
          font-family: 'Pretendard';
          src: url('/fonts/pretendard/PretendardVariable.woff2') format('woff2');
          font-weight: 100 900;
          font-display: swap;
        }
        .booth-display {
          font-family: var(--booth-display-font);
          font-weight: var(--booth-display-weight);
          letter-spacing: var(--booth-display-tracking);
          word-break: keep-all;
        }
        .booth-tone-light .booth-stage-ui {
          color: #173a5e;
        }
        .booth-tone-light .booth-stage-ui [class~="text-white"] {
          color: #173a5e;
        }
        .booth-tone-light .booth-stage-ui [class~="text-white/25"],
        .booth-tone-light .booth-stage-ui [class~="text-white/30"],
        .booth-tone-light .booth-stage-ui [class~="text-white/35"],
        .booth-tone-light .booth-stage-ui [class~="text-white/40"],
        .booth-tone-light .booth-stage-ui [class~="text-white/45"] {
          color: rgb(23 58 94 / 0.52);
        }
        .booth-tone-light .booth-stage-ui [class~="text-white/50"],
        .booth-tone-light .booth-stage-ui [class~="text-white/55"],
        .booth-tone-light .booth-stage-ui [class~="text-white/60"] {
          color: rgb(23 58 94 / 0.66);
        }
        .booth-tone-light .booth-stage-ui [class~="text-white/65"],
        .booth-tone-light .booth-stage-ui [class~="text-white/70"],
        .booth-tone-light .booth-stage-ui [class~="text-white/80"] {
          color: rgb(23 58 94 / 0.82);
        }
        .booth-tone-light .booth-stage-ui [class~="border-white"],
        .booth-tone-light .booth-stage-ui [class~="hover:border-white"]:hover {
          border-color: #173a5e;
        }
        .booth-tone-light .booth-stage-ui [class~="border-white/10"],
        .booth-tone-light .booth-stage-ui [class~="border-white/15"],
        .booth-tone-light .booth-stage-ui [class~="border-white/20"],
        .booth-tone-light .booth-stage-ui [class~="border-white/25"] {
          border-color: rgb(23 58 94 / 0.22);
        }
        .booth-tone-light .booth-stage-ui [class~="border-white/40"],
        .booth-tone-light .booth-stage-ui [class~="border-white/50"],
        .booth-tone-light .booth-stage-ui [class~="border-white/60"] {
          border-color: rgb(23 58 94 / 0.5);
        }
        .booth-tone-light .booth-stage-ui [class~="hover:text-white"]:hover {
          color: #173a5e;
        }
        .booth-tone-light .booth-stage-ui [class~="accent-white"] {
          accent-color: #173a5e;
        }
        .booth-print-area { display: none; }
        @media print {
          @page { size: 4in 6in; margin: 0; }
          body { visibility: hidden; }
          .booth-print-area {
            display: block;
            visibility: visible;
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: #fff;
          }
          .booth-print-area img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeBackground.image}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <AnimatePresence>
        {isAttract && (
          <motion.button
            type="button"
            aria-label="포토부스 시작하기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAttract(false)}
            className={`fixed inset-0 z-50 overflow-hidden ${lightHome ? 'bg-[#f8f2e7] text-[#173a5e]' : 'bg-[#0b0b0a] text-white'}`}
          >
            <motion.img
              src={activeBackground.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              animate={{ scale: [1, 1.045, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-10 text-center"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/photobooth/decor/wordmark.svg" alt="AC'SCENT WOW PHOTO" className={`mb-12 w-80 max-w-[55vw] ${lightHome ? 'invert' : ''}`} />
              <p className={`mb-5 text-xl font-bold tracking-[0.32em] ${lightHome ? 'text-[#173a5e]/70' : 'text-white/70'}`}>4×6 PHOTO BENEFIT</p>
              <h1 className="booth-display max-w-4xl text-5xl leading-tight md:text-7xl">
                {event?.greeting || '오늘의 최애와, 한 장에'}
              </h1>
              {event?.hashtag && <p className="mt-6 text-2xl font-bold" style={{ color: accent }}>{event.hashtag}</p>}
              <motion.span
                className={`mt-16 rounded-full px-10 py-5 text-xl font-bold backdrop-blur-md ${lightHome ? 'border border-[#173a5e]/25 bg-white/65' : 'border border-white/40 bg-black/25'}`}
                animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,.15)', '0 0 0 16px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0)'] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              >
                화면을 터치해 시작하기
              </motion.span>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
      {resultUrl && (
        <div className="booth-print-area">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="인쇄용 사진" />
        </div>
      )}

      {/* 헤더 */}
      <header className={`booth-stage-ui relative z-10 flex min-h-20 items-center justify-between gap-5 border-b px-8 py-4 backdrop-blur-sm ${lightHome ? 'border-[#173a5e]/15 bg-white/35 text-[#173a5e]' : 'border-white/10'}`}>
        <div className="flex min-w-0 items-center gap-5">
          {step !== 'home' && (
            <button
              type="button"
              onClick={goBack}
              disabled={shooting || passLoading || finishing}
              aria-label="이전 단계로 돌아가기"
              className="flex min-h-12 min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-base font-bold shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40"
              style={{
                backgroundColor: lightHome ? '#173a5e' : '#ffffff',
                color: lightHome ? '#ffffff' : '#171717',
              }}
            >
              <ChevronLeft className="h-5 w-5" />
              뒤로
            </button>
          )}
          <button
            onClick={resetAll}
            className={`booth-display truncate text-lg tracking-[0.25em] transition-opacity hover:opacity-70 ${step === 'home' ? '' : 'hidden sm:block'}`}
          >
            AC&apos;SCENT PHOTO
          </button>
        </div>
        <div className="flex items-center gap-5">
          {event && (
            <span
              className="hidden sm:inline text-xs font-semibold tracking-widest uppercase"
              style={{ color: accent }}
            >
              {event.title}
            </span>
          )}
          {step !== 'home' && (
            <button
              onClick={resetAll}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" /> 처음으로
            </button>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
      <motion.main
        key={step}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="booth-stage-ui relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8"
      >
        {/* ---------- 홈: 이벤트 배너 + 체험 선택 ---------- */}
        {step === 'home' && (
          <div className={`w-full max-w-4xl ${lightHome ? 'text-[#173a5e]' : ''}`}>
            {event ? (
              <div className="mb-10 text-center">
                {event.cover_image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-full max-h-44 object-cover rounded-3xl mb-6 border"
                    style={{ borderColor: accent }}
                  />
                )}
                <p
                  className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.3em] uppercase rounded-full border px-4 py-1.5 mb-4"
                  style={{ color: accent, borderColor: accent }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Birthday Cafe{eventPeriod ? ` · ${eventPeriod}` : ''}
                </p>
                <h1 className="booth-display text-3xl md:text-5xl leading-tight">
                  {event.greeting || event.title}
                </h1>
                <p className="mt-3 text-white/50 text-sm">
                  {event.artist && (
                    <>
                      with <span style={{ color: accent }}>{event.artist}</span>
                    </>
                  )}
                  {event.artist && event.organizer && ' · '}
                  {event.organizer && <>hosted by {event.organizer}</>}
                </p>
              </div>
            ) : (
              <div className="mb-10 text-center">
                <h1 className="booth-display text-3xl md:text-4xl mb-2">어떤 사진을 찍을까요?</h1>
                <p className={lightHome ? 'text-[#173a5e]/65' : 'text-white/50'}>4x6인치 인화 사진으로 출력됩니다</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              <button
                onClick={() => startMode('card')}
                className={`group min-h-60 rounded-3xl p-8 text-left text-lg transition-all ${lightHome ? 'border border-[#173a5e]/15 bg-white/75 shadow-[0_16px_45px_rgba(43,67,86,.10)] hover:-translate-y-1 hover:bg-white' : 'border border-white/15 bg-white/5 hover:bg-white hover:text-neutral-950'}`}
              >
                <QrCode className="w-10 h-10 mb-6" />
                <p className="booth-display text-xl mb-2">포토카드로 찍기</p>
                <p className="text-lg opacity-60 leading-relaxed">
                  매장 포토카드를
                  <br />
                  카메라에 보여주세요
                </p>
              </button>
              <button
                onClick={() => startMode('template')}
                disabled={templates.length === 0}
                className={`group min-h-60 rounded-3xl p-8 text-left text-lg transition-all disabled:opacity-30 ${lightHome ? 'border border-[#173a5e]/15 bg-white/75 shadow-[0_16px_45px_rgba(43,67,86,.10)] hover:-translate-y-1 hover:bg-white' : 'border border-white/15 bg-white/5 hover:bg-white hover:text-neutral-950 disabled:hover:bg-white/5 disabled:hover:text-white'}`}
              >
                <Users className="w-10 h-10 mb-6" />
                <p className="booth-display text-xl mb-2">{templateLabel}</p>
                <p className="text-lg opacity-60 leading-relaxed">
                  준비된 컷의 빈자리에
                  <br />
                  옆에 선 것처럼 합성돼요
                </p>
              </button>
              <button
                onClick={() => startMode('together')}
                className={`group min-h-60 rounded-3xl p-8 text-left transition-all ${lightHome ? 'border border-[#173a5e]/15 bg-white/75 shadow-[0_16px_45px_rgba(43,67,86,.10)] hover:-translate-y-1 hover:bg-white' : 'border border-white/15 bg-white/5 hover:bg-white hover:text-neutral-950'}`}
              >
                <Smartphone className="w-10 h-10 mb-6" />
                <p className="booth-display text-xl mb-2">
                  {event ? '내 포카·직찍과 찍기' : '같이 찍기'}
                </p>
                <p className="text-lg opacity-60 leading-relaxed">
                  폰 속 사진을 올려서
                  <br />
                  함께 찍은 것처럼 합성해요
                </p>
              </button>
              <button
                onClick={() => startMode('solo')}
                className={`group min-h-60 rounded-3xl p-8 text-left transition-all ${lightHome ? 'border border-[#173a5e]/15 bg-white/75 shadow-[0_16px_45px_rgba(43,67,86,.10)] hover:-translate-y-1 hover:bg-white' : 'border border-white/15 bg-white/5 hover:bg-white hover:text-neutral-950'}`}
              >
                <Camera className="w-10 h-10 mb-6" />
                <p className="booth-display text-xl mb-2">일반 촬영</p>
                <p className="text-lg opacity-60 leading-relaxed">
                  1컷 또는 네컷으로
                  <br />
                  지금 이 순간을 담아요
                </p>
              </button>
            </div>

            <p className={`mt-8 text-center text-base flex items-center justify-center gap-1.5 ${lightHome ? 'text-[#173a5e]/55' : 'text-white/35'}`}>
              <Ticket className="w-3.5 h-3.5" />
              포토부스는 상품 구매 시 드리는 이용권으로 이용할 수 있어요
            </p>
          </div>
        )}

        {/* ---------- 이용권 코드 입력 ---------- */}
        {step === 'pass' && (
          <div className="w-full max-w-sm text-center">
            <Ticket className="w-10 h-10 mx-auto mb-4" style={{ color: accent }} />
            <h2 className="booth-display text-2xl md:text-3xl mb-2">이용권 번호 입력</h2>
            <p className="text-white/50 text-sm mb-8">
              상품 구매 시 받은 6자리 번호를 입력해주세요
            </p>

            {/* 코드 표시 */}
            <div className="flex justify-center gap-2.5 mb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-11 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold"
                  style={{
                    borderColor:
                      i === passDigits.length && !passLoading
                        ? accent
                        : lightHome
                          ? 'rgba(23,58,94,0.22)'
                          : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {passLoading && i === 5 ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                  ) : (
                    passDigits[i] ?? ''
                  )}
                </div>
              ))}
            </div>
            <p className="h-5 text-sm text-red-400 mb-4">{passError}</p>

            {/* 키패드 */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => pressKeypad(digit)}
                  disabled={passLoading}
                  className="h-16 rounded-2xl bg-white/5 border border-white/10 text-2xl font-bold hover:bg-white/15 active:bg-white/25 transition-colors disabled:opacity-40"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                onClick={() => pressKeypad('0')}
                disabled={passLoading}
                className="h-16 rounded-2xl bg-white/5 border border-white/10 text-2xl font-bold hover:bg-white/15 active:bg-white/25 transition-colors disabled:opacity-40"
              >
                0
              </button>
              <button
                onClick={() => pressKeypad('back')}
                disabled={passLoading}
                className="h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 active:bg-white/25 transition-colors disabled:opacity-40"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

          </div>
        )}

        {/* ---------- QR: 폰 사진 업로드 대기 ---------- */}
        {step === 'qr' && (
          <div className="text-center">
            <h2 className="booth-display text-2xl md:text-3xl mb-2">폰으로 사진 올리기</h2>
            <p className="text-white/50 mb-8">
              QR을 스캔해 합성할 포카·직찍 한 장을 올려주세요
            </p>
            {sessionExpired ? (
              <div className="flex flex-col items-center gap-5">
                <p className="text-red-400">세션이 만료되었어요</p>
                <button
                  onClick={() => proceedToMode('together')}
                  className="flex items-center gap-2 rounded-full bg-white text-neutral-950 px-6 py-3 font-semibold hover:opacity-80 transition-opacity"
                >
                  <RefreshCw className="w-4 h-4" /> QR 다시 만들기
                </button>
              </div>
            ) : qrDataUrl ? (
              <div className="flex flex-col items-center gap-6">
                <div className="bg-white rounded-3xl p-5 border-4" style={{ borderColor: accent }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="사진 업로드 QR" className="w-56 h-56 md:w-64 md:h-64" />
                </div>
                <p className="font-mono text-white/40 tracking-widest">{sessionCode}</p>
                <p className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin" /> 업로드를 기다리는 중...
                </p>
              </div>
            ) : (
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-white/40" />
            )}
          </div>
        )}

        {/* ---------- 매장 포토카드 스캔 ---------- */}
        {step === 'scan' && (
          <div className="w-full max-w-3xl flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">카드를 카메라에 보여주세요</h2>
            <p className="text-white/45 text-sm mb-5">
              포토카드 뒷면의 QR을 화면 쪽으로 향하게 해주세요
            </p>

            {cameraError ? (
              <p className="text-red-400 text-center py-16">{cameraError}</p>
            ) : (
              <div className="relative w-full rounded-3xl overflow-hidden bg-black">
                <video
                  ref={attachVideo}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-video object-cover scale-x-[-1]"
                />
                {/* 조준 가이드 */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-48 h-48 rounded-2xl border-4"
                    style={{ borderColor: accent, opacity: 0.85 }}
                  />
                </div>
                {scanBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: accent }} />
                  </div>
                )}
              </div>
            )}

            <p className="h-5 mt-4 text-sm text-red-400">{scanError}</p>

            {/* QR이 안 읽힐 때 — 카드에 함께 인쇄된 번호로 진행 */}
            <div className="mt-2 flex items-center gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, CARD_CODE_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCode.length === CARD_CODE_LENGTH) {
                    applyCardCode(manualCode)
                  }
                }}
                placeholder={`카드 번호 ${CARD_CODE_LENGTH}자`}
                className="w-44 rounded-xl bg-white/5 border border-white/20 px-4 py-3 text-center text-lg font-mono tracking-[0.3em] focus:outline-none focus:border-white"
              />
              <button
                onClick={() => applyCardCode(manualCode)}
                disabled={manualCode.length !== CARD_CODE_LENGTH || scanBusy}
                className="rounded-xl bg-white text-neutral-950 px-6 py-3 font-bold disabled:opacity-30"
              >
                확인
              </button>
            </div>

            <button
              onClick={resetAll}
              className="mt-8 flex items-center gap-1 mx-auto text-sm text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> 뒤로
            </button>
          </div>
        )}

        {/* ---------- 템플릿(최애 컷) 선택 ---------- */}
        {step === 'template' && (
          <div className="w-full max-w-5xl">
            <h2 className="booth-display text-center text-2xl md:text-3xl mb-2">
              함께 찍을 컷을 골라주세요
            </h2>
            <p className="text-center text-white/50 text-sm mb-8">
              빈 자리에 손님이 합성돼 옆에 선 한 장이 됩니다
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  className="group rounded-2xl overflow-hidden border-2 border-white/15 hover:border-white transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tpl.image_url}
                    alt={tpl.title}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <p className="py-2.5 text-sm font-medium bg-white/5">{tpl.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- 카메라 촬영 ---------- */}
        {step === 'camera' && (
          <div className="w-full max-w-3xl flex flex-col items-center">
            <h2 className="booth-display text-2xl md:text-3xl mb-2">
              {mode === 'together'
                ? '이제 현장 사진을 찍어요'
                : mode === 'template'
                  ? shotProgress?.current === 2
                    ? '마지막으로 단독 컷 한 장!'
                    : `${standSideText}에 서주세요`
                  : '카메라를 봐주세요'}
            </h2>
            <p className="text-white/45 text-sm mb-5 h-5">
              {mode === 'template' && shotProgress?.current !== 2
                ? '화면에 보이는 그대로 인화됩니다'
                : ''}
            </p>

            {/* 컷 수 선택 (일반 촬영만) */}
            {mode === 'solo' && (
              <div className="flex gap-2 mb-5">
                {([1, 4] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => setCutCount(count)}
                    disabled={shooting}
                    className={`rounded-full px-5 py-2 text-sm font-bold border-2 transition-colors ${
                      cutCount === count
                        ? 'bg-white text-neutral-950 border-white'
                        : 'border-white/25 text-white/60 hover:border-white/60'
                    }`}
                  >
                    {count === 1 ? '1컷' : '네컷'}
                  </button>
                ))}
              </div>
            )}

            {cameraError ? (
              <p className="text-red-400 text-center py-16">{cameraError}</p>
            ) : (
              <div className="relative w-full rounded-3xl overflow-hidden bg-black">
                {/* 최애와 찍기는 합성 결과를 실시간으로 보여준다 */}
                <video
                  ref={attachVideo}
                  autoPlay
                  playsInline
                  muted
                  className={
                    liveComposeReady
                      ? 'absolute opacity-0 pointer-events-none w-px h-px'
                      : 'w-full aspect-video object-cover scale-x-[-1]'
                  }
                />
                {liveComposeReady && (
                  <canvas
                    ref={attachLivePreview}
                    width={PREVIEW_W}
                    height={PREVIEW_H}
                    className="w-full aspect-[4/3] bg-black"
                  />
                )}
                {mode === 'template' && !templateGeometry && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="w-8 h-8 animate-spin text-white/60" />
                  </div>
                )}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <motion.span
                      key={countdown}
                      initial={{ scale: 1.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-9xl font-black drop-shadow-lg"
                      style={{ color: accent }}
                    >
                      {countdown}
                    </motion.span>
                  </div>
                )}
                {flash && <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} className="pointer-events-none absolute inset-0 bg-white" />}
                {shotProgress && (
                  <div className="absolute top-4 left-4 rounded-full bg-black/60 px-4 py-1.5 text-sm font-bold">
                    {shotProgress.current} / {shotProgress.total}
                  </div>
                )}
                {mode === 'card' && scannedCard && (
                  <div
                    className="absolute top-4 right-4 rounded-full bg-black/60 px-4 py-1.5 text-sm font-bold"
                    style={{ color: accent }}
                  >
                    {scannedCard.title}
                  </div>
                )}
                {mode === 'together' && guestPhotoUrl && (
                  <div className="absolute top-4 right-4 w-20 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={guestPhotoUrl} alt="업로드된 사진" className="w-full" />
                  </div>
                )}
              </div>
            )}
            {shooting && shots.length > 0 && (
              <div className="mt-5 flex min-h-20 gap-3">
                {shots.map((shot, index) => (
                  <motion.img
                    key={shot}
                    initial={{ opacity: 0, scale: 0.7, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, rotate: index % 2 ? 3 : -2 }}
                    src={shot}
                    alt={`촬영된 ${index + 1}번째 컷`}
                    className="h-20 w-24 rounded-lg border-4 border-white object-cover shadow-xl"
                  />
                ))}
              </div>
            )}
            <button
              onClick={startShooting}
              disabled={!!cameraError || shooting}
              className="mt-8 flex items-center gap-3 rounded-full bg-white text-neutral-950 px-10 py-4 text-lg font-bold hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              <Camera className="w-5 h-5" />
              {mode === 'template'
                ? '촬영 시작 (2컷)'
                : cutCount === 4
                  ? '네컷 촬영 시작'
                  : '촬영하기'}
            </button>
          </div>
        )}

        {/* ---------- 합성 · 프레임 편집 ---------- */}
        {step === 'compose' && (
          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
            <div className="flex flex-col items-center">
              <canvas
                ref={attachComposeCanvas}
                width={CANVAS_W}
                height={CANVAS_H}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-[min(70vw,320px)] md:w-[360px] rounded-xl shadow-2xl bg-white touch-none"
                style={{ touchAction: 'none' }}
              />
              {(mode === 'together' || mode === 'template') && (
                <p className="mt-3 text-xs text-white/40">
                  사진을 드래그해 위치를 옮길 수 있어요
                </p>
              )}
              {composeError && <p className="mt-3 text-sm text-red-400">{composeError}</p>}
            </div>

            <div className="w-full max-w-sm flex flex-col gap-6">
              {/* 프레임 선택 */}
              <div>
                <p className="text-sm font-semibold text-white/60 mb-3">프레임</p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setSelectedFrame(null)}
                    className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center text-xs transition-colors ${
                      selectedFrame === null
                        ? 'border-white bg-white/10'
                        : 'border-white/20 text-white/40 hover:border-white/50'
                    }`}
                  >
                    없음
                  </button>
                  {frames.map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => setSelectedFrame(frame)}
                      title={frame.title}
                      className="w-16 h-24 rounded-lg border-2 overflow-hidden bg-white/5 transition-colors"
                      style={{
                        borderColor:
                          selectedFrame?.id === frame.id
                            ? frame.event_id
                              ? accent
                              : lightHome
                                ? '#173a5e'
                                : '#ffffff'
                            : lightHome
                              ? 'rgba(23,58,94,0.22)'
                              : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={frame.image_url}
                        alt={frame.title}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                {frames.length === 0 && (
                  <p className="mt-2 text-xs text-white/30">
                    등록된 프레임이 없어요 (관리자 페이지에서 추가)
                  </p>
                )}
              </div>

              {/* 최애와 찍기: 합성 위치·크기 */}
              {mode === 'template' && templateGeometry && (
                <div className="flex flex-col gap-4">
                  {selectedTemplate?.foreground_url ? (
                    <div className="rounded-2xl border border-white/15 p-4">
                      <p className="text-sm font-semibold">같은 공간 합성</p>
                      <p className="mt-1.5 text-xs text-white/45 leading-relaxed">
                        카메라 배경 전체 위에 아티스트가 자연스럽게 합성됩니다
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/15 p-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm font-semibold">배경 지우기</span>
                        <input
                          type="checkbox"
                          checked={keying.enabled}
                          onChange={(e) =>
                            setKeying((prev) => ({ ...prev, enabled: e.target.checked }))
                          }
                          className="w-5 h-5 accent-white"
                        />
                      </label>
                      <p className="mt-1.5 text-xs text-white/35 leading-relaxed">
                        그린·블루 배경지 앞에서 찍을 때 켜세요. 설정은 이 부스에 저장됩니다
                      </p>
                      {keying.enabled && (
                        <label className="block mt-3 text-xs text-white/50">
                          지우는 정도
                          <input
                            type="range"
                            min={0.08}
                            max={0.45}
                            step={0.01}
                            value={keying.tolerance}
                            onChange={(e) =>
                              setKeying((prev) => ({ ...prev, tolerance: Number(e.target.value) }))
                            }
                            className="w-full mt-2 accent-white"
                          />
                        </label>
                      )}
                    </div>
                  )}
                  <label className="text-sm text-white/60">
                    확대
                    <input
                      type="range"
                      min={1}
                      max={2}
                      step={0.01}
                      value={guestFit.zoom}
                      onChange={(e) =>
                        setGuestFit((prev) => ({ ...prev, zoom: Number(e.target.value) }))
                      }
                      className="w-full mt-2 accent-white"
                    />
                  </label>
                  <label className="text-sm text-white/60">
                    좌우 위치
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={guestFit.focalX}
                      onChange={(e) =>
                        setGuestFit((prev) => ({ ...prev, focalX: Number(e.target.value) }))
                      }
                      className="w-full mt-2 accent-white"
                    />
                  </label>
                  <label className="text-sm text-white/60">
                    상하 위치
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={guestFit.focalY}
                      onChange={(e) =>
                        setGuestFit((prev) => ({ ...prev, focalY: Number(e.target.value) }))
                      }
                      className="w-full mt-2 accent-white"
                    />
                  </label>
                </div>
              )}

              {/* 포카·직찍 합성: 배경 지우기 + 크기·기울기 */}
              {mode === 'together' && guestPhotoUrl && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-white/15 p-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-semibold">인물만 오려내기</span>
                      <input
                        type="checkbox"
                        checked={useCutout && cutoutStatus === 'done'}
                        disabled={cutoutStatus !== 'done'}
                        onChange={(e) => setUseCutout(e.target.checked)}
                        className="w-5 h-5 accent-white disabled:opacity-30"
                      />
                    </label>
                    <p className="mt-1.5 text-xs text-white/35 leading-relaxed">
                      {cutoutStatus === 'processing' && '올린 사진에서 인물을 찾는 중...'}
                      {cutoutStatus === 'done' &&
                        '배경을 지우고 옆에 함께 선 것처럼 합성했어요'}
                      {cutoutStatus === 'failed' &&
                        '인물을 찾지 못해 사진 그대로 올렸어요 (인물이 크게 나온 사진일수록 잘 돼요)'}
                      {cutoutStatus === 'idle' && '사진을 올리면 배경을 지워드려요'}
                    </p>
                  </div>
                  <label className="text-sm text-white/60">
                    {useCutout && cutoutStatus === 'done' ? '인물 크기' : '사진 크기'}
                    <input
                      type="range"
                      min={0.15}
                      max={0.9}
                      step={0.01}
                      value={guestLayer.scale}
                      onChange={(e) =>
                        setGuestLayer((prev) => ({ ...prev, scale: Number(e.target.value) }))
                      }
                      className="w-full mt-2 accent-white"
                    />
                  </label>
                  <label className="text-sm text-white/60">
                    기울기
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      step={1}
                      value={guestLayer.rotation}
                      onChange={(e) =>
                        setGuestLayer((prev) => ({ ...prev, rotation: Number(e.target.value) }))
                      }
                      className="w-full mt-2 accent-white"
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-2">
                <button
                  onClick={finishCompose}
                  disabled={finishing}
                  className="flex items-center justify-center gap-2 rounded-full bg-white text-neutral-950 px-8 py-4 text-lg font-bold hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  <Check className="w-5 h-5" /> 완성하기
                </button>
                <button
                  onClick={() => {
                    setShots([])
                    setStep('camera')
                  }}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-3.5 font-semibold text-white/80 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> 다시 찍기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 결과 ---------- */}
        {step === 'result' && resultUrl && (
          <div className="flex flex-col lg:flex-row gap-10 items-center justify-center">
            <div className="flex flex-col items-center">
              <motion.img
                src={resultUrl}
                alt="완성된 사진"
                className="w-[min(70vw,320px)] md:w-[360px] rounded-xl shadow-2xl"
                initial={{ opacity: 0, y: 80, rotate: -4, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, rotate: -1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 110, damping: 14 }}
              />
              {event?.organizer && (
                <p className="mt-3 text-xs text-white/35">
                  AC&apos;SCENT WOW × {event.organizer}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-full bg-white text-neutral-950 px-8 py-4 text-lg font-bold hover:opacity-80 transition-opacity"
              >
                <Printer className="w-5 h-5" /> 인쇄하기
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-3.5 font-semibold text-white/80 hover:bg-white/10 transition-colors"
              >
                <Download className="w-4 h-4" /> 이미지 저장
              </button>
              <button
                onClick={() => setStep('compose')}
                className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-3.5 font-semibold text-white/80 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> 다시 편집
              </button>

              {/* 생카 인증 문화: 해시태그 안내 */}
              {event?.hashtag && (
                <div
                  className="mt-3 rounded-2xl border p-4 text-center"
                  style={{ borderColor: accent }}
                >
                  <p className="text-xs text-white/50 mb-1">X(트위터) 인증 태그</p>
                  <p className="font-bold text-lg" style={{ color: accent }}>
                    {event.hashtag}
                  </p>
                </div>
              )}

              <button
                onClick={resetAll}
                className="mt-2 text-sm text-white/40 hover:text-white transition-colors"
              >
                처음으로 돌아가기
              </button>
            </div>
          </div>
        )}
      </motion.main>
      </AnimatePresence>

      {/* 매장 관리자용 숨김 핫스팟 — 화면 우측 하단 모서리를 터치 */}
      <button
        type="button"
        aria-label="배경 관리자 열기"
        onClick={() => {
          setIsAttract(false)
          setBackgroundAdminOpen(true)
          setBackgroundPasswordError('')
        }}
        className="fixed bottom-0 right-0 z-[60] h-16 w-16 opacity-0 focus:opacity-20"
      />

      <AnimatePresence>
        {backgroundAdminOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="포토부스 배경 관리"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setBackgroundAdminOpen(false)
                setBackgroundAdminUnlocked(false)
                setBackgroundPassword('')
              }
            }}
          >
            <motion.div
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.97 }}
              className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-neutral-950 p-7 text-white shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold tracking-[0.18em] text-white/40">매장 관리자</p>
                  <h2 className="mt-1 text-2xl font-black">첫 화면 배경 설정</h2>
                </div>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => {
                    setBackgroundAdminOpen(false)
                    setBackgroundAdminUnlocked(false)
                    setBackgroundPassword('')
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-white/65 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {!backgroundAdminUnlocked ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (backgroundPassword === BACKGROUND_ADMIN_PASSWORD) {
                      setBackgroundAdminUnlocked(true)
                      setBackgroundPassword('')
                      setBackgroundPasswordError('')
                    } else {
                      setBackgroundPasswordError('비밀번호가 올바르지 않습니다.')
                      setBackgroundPassword('')
                    }
                  }}
                  className="mx-auto max-w-sm py-8 text-center"
                >
                  <p className="mb-6 text-lg text-white/60">관리자 비밀번호 6자리를 입력해주세요.</p>
                  <input
                    autoFocus
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={backgroundPassword}
                    onChange={(event) => {
                      setBackgroundPassword(event.target.value.replace(/\D/g, '').slice(0, 6))
                      setBackgroundPasswordError('')
                    }}
                    className="h-16 w-full rounded-2xl border-2 border-white/20 bg-white/5 px-5 text-center font-mono text-3xl tracking-[0.45em] outline-none focus:border-white"
                    aria-label="관리자 비밀번호"
                  />
                  {backgroundPasswordError && (
                    <p className="mt-3 text-base font-semibold text-red-400">{backgroundPasswordError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={backgroundPassword.length !== 6}
                    className="mt-6 min-h-14 w-full rounded-2xl bg-white px-6 text-lg font-black text-neutral-950 disabled:opacity-30"
                  >
                    확인
                  </button>
                </form>
              ) : (
                <div>
                  <p className="mb-5 text-base text-white/55">
                    선택 즉시 첫 화면과 60초 대기 화면에 적용되며 이 부스 기기에 저장됩니다.
                  </p>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {BOOTH_BACKGROUNDS.map((background) => (
                      <button
                        key={background.id}
                        type="button"
                        onClick={() => selectBackground(background.id)}
                        className={`overflow-hidden rounded-2xl border-2 text-left transition-all ${
                          backgroundId === background.id
                            ? 'border-yellow-300 ring-4 ring-yellow-300/15'
                            : 'border-white/15 hover:border-white/45'
                        }`}
                      >
                        <span className="relative block aspect-video overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={background.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <span
                            className={`absolute inset-x-3 bottom-3 line-clamp-2 text-lg leading-tight drop-shadow-sm ${background.tone === 'light' ? 'text-[#173a5e]' : 'text-white'}`}
                            style={{
                              fontFamily: background.displayFont,
                              fontWeight: background.displayWeight,
                              letterSpacing: background.displayTracking,
                            }}
                          >
                            어떤 사진을 찍을까요?
                          </span>
                        </span>
                        <span className="flex min-h-16 items-center justify-between gap-2 bg-white/5 px-4">
                          <span>
                            <span className="block text-base font-bold">{background.title}</span>
                            <span className="mt-0.5 block text-[11px] tracking-wide text-white/40">
                              {background.fontLabel}
                            </span>
                          </span>
                          {backgroundId === background.id && (
                            <Check className="h-5 w-5 shrink-0 text-yellow-300" />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBackgroundAdminOpen(false)
                      setBackgroundAdminUnlocked(false)
                    }}
                    className="mt-7 min-h-14 w-full rounded-2xl bg-white px-6 text-lg font-black text-neutral-950"
                  >
                    적용하고 닫기
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className={`booth-stage-ui relative z-10 px-8 py-4 text-center text-xs border-t backdrop-blur-sm ${lightHome ? 'border-[#173a5e]/15 bg-white/30 text-[#173a5e]/45' : 'border-white/10 text-white/25'}`}>
        AC&apos;SCENT WOW — 4x6 PHOTO BOOTH
      </footer>
    </div>
  )
}
