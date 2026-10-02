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

import '@/components/mac/mac.css'
import { macFontVars } from '@/components/mac/theme'
import { FramePicker } from '@/components/photobooth/FramePicker'
import { IdolConceptPicker, IdolDesignPicker, IdolStagePanel, useIdolStage } from '@/components/photobooth/IdolStage'
import { drawIdolDesign } from '@/lib/booth/idol-layouts'
import { DEFAULT_IDOL_CONCEPT, findIdolConcept } from '@/lib/booth/idol-concepts'
import { preloadFaceDetect } from '@/lib/booth/face-detect'
import { BoothModeControls } from '@/components/screen/BoothModeControls'
import { BoothLangSwitcher } from '@/components/photobooth/BoothLangSwitcher'
import { IdolPosterTitle } from '@/components/photobooth/IdolPosterTitle'
import { attractHeadline, boothText, conceptText, guestError, passErrorText, withBoothLang, BOOTH_LANGS, isCjkLang, type BoothLang } from '@/lib/booth/i18n'
import { KIOSK_FONT_CLASS, CJK_FONT_STACK } from '@/app/kiosk/fonts'
import { findBoothMode } from '@/lib/booth/modes'
import { boothPassRequired, requestFreeIdolTicket } from '@/lib/booth/pass-policy'
import { useLiveBoothConfig } from '@/hooks/useLiveBoothConfig'
import { DEFAULT_FRAMES } from '@/lib/photobooth/frame-catalog'
import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import QRCode from 'qrcode'
import { createQrReader, parsePassQr, type QrReader } from '@/lib/photobooth/qr-scan'
import {
  BUNDLED_TEMPLATES,
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
import { cutoutPerson, warmupSegmentation } from '@/lib/photobooth/segmentation'
import { parseCardCode, CARD_CODE_LENGTH, CARD_ALPHABET } from '@/lib/photobooth/card-code'
import { probeDslrBridge, fetchDslrFrame, captureDslrStill, autofocusDslr } from '@/lib/photobooth/dslr-bridge'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import {
  useLayerGestures,
  clamp,
  wrapAngle,
  LAYER_SCALE_MIN,
  LAYER_SCALE_MAX,
  FIT_ZOOM_MIN,
  FIT_ZOOM_MAX,
  type GestureDelta,
} from '@/lib/photobooth/use-layer-gestures'
import { RESULT_PHOTO_TTL_HOURS } from '@/lib/photobooth/result-photo'
import { useScreenBackgrounds } from '@/lib/screen-backgrounds/use-screen-backgrounds'
import { mixColor, toBoothTheme, toRetroDesktop, retroDesktopVars } from '@/lib/screen-backgrounds/theme'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { useScreenUiSwitch } from '@/lib/screen-backgrounds/ui-switch'
import { DeviceDesignControls } from '@/components/screen/DeviceDesignControls'
import { DeviceAdminTools } from '@/components/screen/DeviceAdminTools'
import { useQuitConfirm } from '@/components/screen/QuitConfirm'
import {
  PixelIcon,
  RetroProgress,
  RetroWindow,
  RetroDesktopIcons,
  RetroStickers,
  RETRO_FONT_CLASS,
  type PixelIconName,
} from '@/components/retro'
import '@/components/retro/retro.css'
import './booth.css'

// 4x6인치 @300dpi (세로)
const CANVAS_W = PRINT.W
const CANVAS_H = PRINT.H

const POLL_INTERVAL_MS = 2500
/** 같은 이용권 QR 을 다시 확인하기까지 (쓴 번호를 계속 대고 있을 때) */
const PASS_QR_RETRY_MS = 8000
/** 이용권 화면에서 DSLR 초점을 다시 잡는 간격 (AF 자체가 약 1.2초) */
const DSLR_QR_AF_MS = 2500
/** 관리자 핫스팟을 이만큼 눌러야 열린다 — 손님이 모서리를 스쳐도 안 열리게 */
const ADMIN_HOLD_MS = 1500
/** 부스 앱 화면 배율 선택지 — 큰 모니터일수록 키운다 (매장 1920x1080 모니터는 150%) */
const SCREEN_ZOOM_OPTIONS = [1, 1.25, 1.5, 1.75] as const

/** 타이틀바 — 단계마다 다른 프로그램 창을 연 것처럼(아이콘 + 짧은 영문 이름) */
const BOOTH_STEP_META: Record<Step, { icon: PixelIconName; label: string }> = {
  home: { icon: 'window', label: 'SELECT' },
  pass: { icon: 'file', label: 'TICKET' },
  qr: { icon: 'phone', label: 'UPLOAD' },
  scan: { icon: 'qr', label: 'CARD SCAN' },
  template: { icon: 'folder', label: 'CUTS' },
  camera: { icon: 'camera', label: 'CAMERA' },
  compose: { icon: 'palette', label: 'EDIT' },
  result: { icon: 'printer', label: 'PRINT' },
}

/** 바탕화면 아이콘 줄 — 장식(터치를 받지 않는다) */
const BOOTH_DESK_ITEMS: { icon: PixelIconName; label: string }[] = [
  { icon: 'camera', label: 'PHOTO' },
  { icon: 'folder', label: 'FRAMES' },
  { icon: 'printer', label: 'PRINT' },
  { icon: 'heart', label: 'BIAS' },
  { icon: 'computer', label: 'WOW PC' },
]
/* 처음 화면 복귀 — 키오스크(/kiosk)와 같은 규칙: 30초 조용하면 10초 안내 팝업, 그래도 없으면 처음으로.
   두 기기가 한 공간에 있어 손님이 같은 방식으로 겪게 한다. */
const IDLE_SILENT_S = 30
const IDLE_WARN_S = 10
/** 편집·결과 화면 — AI 사진(비용이 든다)을 보고 디자인을 고르는 동안이라 길게. 30초로 두었더니 완성된 사진이 사라졌다(2026-10-02 점검) */
const EDIT_IDLE_SILENT_S = 80
/** 폰으로 QR 을 찍고 사진을 고르는 동안은 부스를 만지지 않는다 — 한도를 길게 */
const QR_IDLE_SILENT_S = 120
/** [이미지 저장] QR 을 폰으로 찍는 동안도 부스를 안 만진다 */
const SAVE_QR_IDLE_SILENT_S = 60
/** 폰 사진을 받은 뒤 오려내기를 기다리는 최대 시간 — 넘으면 카메라를 먼저 열고 끝나는 대로 얹는다 */
const CUTOUT_WAIT_MS = 20_000
/** 인쇄를 보낸 뒤 사진이 실제로 나올 때까지 (DS-RX1 4x6 한 장 ≈ 20초, 넉넉히) — 이 동안은 처음으로 돌아가지 않는다 */
const PRINT_WAIT_S = 30


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
/** 매장 DSLR(카메라 브리지) 또는 브라우저 웹캠 */
type CameraSource = 'probing' | 'dslr' | 'webcam'

interface BoothAsset {
  id: string
  kind: 'frame' | 'template'
  title: string
  image_url: string
  foreground_url?: string | null
  display_order: number
  event_id: string | null
  /** 기본 카탈로그 프레임의 분류·썸네일 (업로드 소재에는 없다) */
  category?: string
  thumbnail_url?: string
  /** 매장 행사(화면 이벤트)에 묶인 프레임 — 행사 운영 모드에서는 빼고 보여 준다 */
  screen_event_id?: string | null
}

/** 설정 API 를 받기 전·못 받을 때의 프레임 목록 — 기본 카탈로그 (관리자 숨김은 첫 응답에서 반영된다) */
const FALLBACK_FRAMES: BoothAsset[] = DEFAULT_FRAMES.filter((frame) => frame.is_active).map((frame) => ({
  id: frame.id,
  kind: 'frame',
  title: frame.title,
  image_url: frame.image_url,
  display_order: frame.display_order,
  event_id: frame.event_id,
  category: frame.category,
  thumbnail_url: frame.thumbnail_url,
}))

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
  /** 좌우 반전 */
  flip: boolean
}

const DEFAULT_GUEST_LAYER: GuestLayer = { x: 850, y: 1300, scale: 0.42, rotation: -6, flip: false }

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
    flip: false,
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
  img: HTMLImageElement | HTMLCanvasElement,
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

/** 라이브 카메라 소스 — 웹캠 video 또는 DSLR 라이브뷰를 그린 캔버스 */
type LiveSource = HTMLVideoElement | HTMLCanvasElement

/** 미리보기(거울 모드)와 같게 좌우를 뒤집어 JPEG 로 뜬다 */
function mirroredJpeg(src: CanvasImageSource, width: number, height: number): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.translate(width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.92)
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
export function BoothClient({ design = 'retro' }: { design?: 'retro' | 'mac' }) {
  const [step, setStep] = useState<Step>('home')
  const [mode, setMode] = useState<Mode>('solo')

  // 이벤트 + 관리자 소재
  const [event, setEvent] = useState<BoothEvent | null>(null)
  const [frames, setFrames] = useState<BoothAsset[]>(FALLBACK_FRAMES)
  /** 설정 갱신 콜백에서 지금 단계를 읽기 위한 값 (아래 step 선언 뒤에 채운다) */
  const stepRef = useRef<Step>('home')
  useEffect(() => {
    stepRef.current = step
  }, [step])
  const [templates, setTemplates] = useState<BoothAsset[]>(BUNDLED_TEMPLATES)

  // 이용권 (상품 구매 특전)
  const [passVerified, setPassVerified] = useState(false)
  const [pendingMode, setPendingMode] = useState<Mode | null>(null)
  const [passDigits, setPassDigits] = useState('')
  const [passError, setPassError] = useState('')
  /** 이용권을 못 쓸 때 화면 가운데 팝업 (쓴 번호·시간 지남·취소·없는 번호) — 키패드 아래 글씨만으로는 못 보고 지나친다 */
  const [passAlert, setPassAlert] = useState<{ title: string; message: string } | null>(null)
  const passAlertRef = useRef(false)
  passAlertRef.current = passAlert !== null
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
  /**
   * 촬영 소스 — 매장 PC 에 카메라 브리지가 떠 있으면 DSLR, 없으면 웹캠.
   * 부스 진입 시 한 번 확인하고, DSLR 이 끊기면 다음 촬영 화면 진입 때 다시 확인한다.
   */
  const [cameraSource, setCameraSource] = useState<CameraSource>('probing')
  /** DSLR 라이브뷰를 그리는 캔버스 — video 대신 이 캔버스가 미리보기·QR·합성의 소스가 된다 */
  const dslrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [dslrLive, setDslrLive] = useState(false)
  /** DSLR 은 셔터 후 원본이 넘어오기까지 몇 초 걸린다 — 그동안 포즈 유지 안내 */
  const [capturing, setCapturing] = useState(false)
  const capturingRef = useRef(false)
  /** 촬영 중 잠깐 띄우는 안내 (재촬영 등) */
  const [shotNotice, setShotNotice] = useState<string | null>(null)
  /** 지금 화면에 보이는 카메라 소스 — DSLR 캔버스 또는 웹캠 video (준비 전이면 null) */
  const getLiveSource = useCallback((): LiveSource | null => {
    const canvas = dslrCanvasRef.current
    if (canvas && canvas.dataset.live === '1') return canvas
    const video = videoRef.current
    if (video && video.videoWidth) return video
    return null
  }, [])

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
  /** 촬영 화면에서 실시간으로 겹쳐 보여줄 누끼 이미지 */
  const [cutoutPreviewUrl, setCutoutPreviewUrl] = useState<string | null>(null)
  const [cutoutStatus, setCutoutStatus] = useState<CutoutStatus>('idle')
  const [useCutout, setUseCutout] = useState(true)
  // 매장 포토카드 스캔
  const [scannedCard, setScannedCard] = useState<ScannedCard | null>(null)
  const [scanError, setScanError] = useState('')
  const [scanBusy, setScanBusy] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const renderTokenRef = useRef(0)

  // 결과
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  /** 부스 앱(exe)에서의 인쇄 진행 — 브라우저에서는 인쇄 대화상자가 대신한다 */
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'sent' | 'failed'>('idle')
  /** 처음 화면 복귀까지 남은 초 (안내 팝업이 떠 있을 때만 숫자) */
  const [idleLeft, setIdleLeft] = useState<number | null>(null)
  /** 인쇄를 보냈다 = 이번 손님은 끝났다 → 기다리지 않고 바로 10초 안내 */
  const [sessionDone, setSessionDone] = useState(false)
  /** 사진이 나오기까지 남은 초 (인쇄 중에는 처음 화면으로 돌아가지 않는다) */
  const [printWaitLeft, setPrintWaitLeft] = useState<number | null>(null)
  const idleDeadlineRef = useRef(0)
  /** [이미지 저장] — 완성 사진을 올리고 폰으로 받는 QR. 같은 사진은 다시 올리지 않는다 */
  const [saveQr, setSaveQr] = useState<{ url: string; qrDataUrl: string } | null>(null)
  const [saveQrOpen, setSaveQrOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'uploading' | 'failed'>('idle')
  const [isAttract, setIsAttract] = useState(false)
  const [flash, setFlash] = useState(false)
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
  } = useScreenBackgrounds('booth')
  // 운영 모드(매장 ↔ 행사, src/lib/booth/modes.ts) — 행사 모드면 첫 화면 문구·제목줄·편집 화면 무대 메이크업이 바뀐다
  const boothMode = findBoothMode(deviceBaseSettings.mode)
  /** 이 운영 모드에서 이용권 번호를 받는가 — 스토어 어드민 '운영 모드 · 이용권 번호'(src/lib/booth/pass-policy.ts) */
  const passRequired = boothPassRequired(deviceBaseSettings)
  const stageMakeup = boothMode.stageMakeup ?? null
  // 행사 모드 AI 아이돌 사진 — 첫 화면 컨셉(짝 메이크업 룩도 같이 바뀜), 동의 여부, 이용권 확인 때 받은 생성 표, 서버 키 설정 여부
  const [stageConceptId, setStageConceptId] = useState(DEFAULT_IDOL_CONCEPT.id)
  /** 화면 언어(우측 상단 버튼) — 손님마다 한국어에서 시작한다. 사전은 src/lib/booth/i18n.ts */
  const [lang, setLang] = useState<BoothLang>('ko')
  const t = boothText(lang)
  // 화면 낭독기·번역기가 알도록 문서 언어도 맞춘다(부스 화면에 있는 동안만)
  useEffect(() => {
    const root = document.documentElement
    const prev = root.lang
    root.lang = BOOTH_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'
    return () => { root.lang = prev }
  }, [lang])
  // 콜백·효과 안에서 쓰는 언어·사전 — 언어를 바꿔도 스캔·촬영 흐름을 다시 시작하지 않게 ref 로 읽는다
  const langRef = useRef(lang)
  langRef.current = lang
  const tRef = useRef(t)
  tRef.current = t
  const [idolConsent, setIdolConsent] = useState(false)
  const [idolTicket, setIdolTicket] = useState<string | null>(null)
  /** AI 아이돌 사진 인화 디자인(컨셉별 4종 — src/lib/booth/idol-layouts.ts). null 이면 그 컨셉의 첫 디자인 */
  const [idolDesignId, setIdolDesignId] = useState<string | null>(null)
  const pickConcept = useCallback((id: string) => {
    setStageConceptId(id)
    setIdolDesignId(null)
  }, [])
  // 행사 모드는 늘 AI 아이돌 사진(메이크업만 촬영은 없앴다) — AI 키가 없거나 못 만들면 찍은 원본을 인화 디자인에
  const idolOn = !!stageMakeup && idolConsent
  // 행사 모드 첫 화면에서 얼굴 인식 모델을 미리 불러 둔다(첫 손님이 기다리지 않게)
  useEffect(() => {
    if (stageMakeup) preloadFaceDetect()
  }, [stageMakeup])
  // 행사 모드는 매장 이벤트를 무시한다 — 와우 생카에 묶인 프레임도 목록에서 뺀다(배경·글꼴과 같은 규칙)
  const modeFrames = useMemo(() => (boothMode.storeEvents ? frames : frames.filter((f) => !f.screen_event_id)), [frames, boothMode.storeEvents])
  const [backgroundAdminOpen, setBackgroundAdminOpen] = useState(false)
  const [backgroundAdminUnlocked, setBackgroundAdminUnlocked] = useState(false)
  const [backgroundPassword, setBackgroundPassword] = useState('')
  const [backgroundPasswordError, setBackgroundPasswordError] = useState('')
  const [backgroundUnlocking, setBackgroundUnlocking] = useState(false)
  const [backgroundSaving, setBackgroundSaving] = useState<string | null>(null)
  const [backgroundActionError, setBackgroundActionError] = useState('')
  const backgroundAuthRequest = useRef(0)
  const backgroundDialogRef = useRef<HTMLDivElement>(null)
  const [adminHolding, setAdminHolding] = useState(false)
  const adminHoldRef = useRef<number | undefined>(undefined)
  const adminHoldTriggered = useRef(false)
  const [exitNotice, setExitNotice] = useState<string | null>(null)
  /** 부스 앱의 현재 화면 배율 (브라우저에서 열면 null — 선택지를 숨긴다) */
  const [screenZoom, setScreenZoom] = useState<number | null>(null)

  /** 손님이 위치·크기를 조정할 오버레이가 있는가 (카드 모드에서 조정이 아예 막혀 있었다) */
  const overlayAdjustable =
    (mode === 'together' && !!guestPhotoUrl) || (mode === 'card' && !!cutout)
  const activeBackground = toBoothTheme(backgroundRecord)
  // 레트로 UI에서 배경은 바탕화면·장식색·제목 글꼴만 맡는다 (창·버튼 색은 retro.css 고정).
  // 이벤트 색은 장식에만 싣고, 사진 합성·인화 캔버스의 이벤트 색은 별도로 유지한다.
  const retroDesk = toRetroDesktop(backgroundRecord, deviceSettings.font)
  const accent = event?.theme_color || activeBackground.accent
  /** 촬영 화면에 오려낸 인물을 겹쳐 보여주고 옮길 수 있는가 */
  const showLiveCutout = !!cutoutPreviewUrl && useCutout && overlayAdjustable

  // ---------- 설정(이벤트 + 소재) 로드 ----------
  const loadConfig = useLiveBoothConfig<{
    event: BoothEvent | null
    frames: BoothAsset[]
    templates: BoothAsset[]
    idolStage?: boolean
  }>((data) => {
    setEvent(data.event ?? null)
    setFrames(data.frames)
    // 편집·결과 화면에서는 손님이 고른 프레임을 그대로 둔다 — 관리자가 그 사이 숨기거나 지워도
    // 진행 중인 사진이 바뀌지 않게. 목록에서는 바로 빠지고, 다음 손님부터 보이지 않는다.
    if (stepRef.current !== 'compose' && stepRef.current !== 'result') {
      setSelectedFrame((current) => (current ? data.frames.find((frame) => frame.id === current.id) ?? null : null))
    }
    setTemplates([...data.templates, ...BUNDLED_TEMPLATES])
  })

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

  // ---------- 매장 관리자 (우하단 길게 누르기 → 비밀번호 → 배경·앱 종료) ----------
  const openAdmin = useCallback(() => {
    backgroundAuthRequest.current += 1
    setIsAttract(false)
    setBackgroundAdminOpen(true)
    setBackgroundAdminUnlocked(false)
    setBackgroundPassword('')
    setBackgroundPasswordError('')
    setBackgroundActionError('')
    setBackgroundUnlocking(false)
    setExitNotice(null)
    void refreshBackgrounds()
  }, [refreshBackgrounds])

  const closeAdmin = useCallback(() => {
    backgroundAuthRequest.current += 1
    setBackgroundAdminOpen(false)
    setBackgroundAdminUnlocked(false)
    setBackgroundPassword('')
    setBackgroundPasswordError('')
    setBackgroundUnlocking(false)
    setExitNotice(null)
  }, [])

  const cancelAdminHold = useCallback(() => {
    if (adminHoldRef.current) window.clearTimeout(adminHoldRef.current)
    adminHoldRef.current = undefined
    setAdminHolding(false)
  }, [])

  const startAdminHold = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      // 손가락이 조금 움직여도 취소되지 않게 포인터를 붙잡는다
      event.currentTarget.setPointerCapture?.(event.pointerId)
      cancelAdminHold()
      adminHoldTriggered.current = false
      setAdminHolding(true)
      adminHoldRef.current = window.setTimeout(() => {
        adminHoldRef.current = undefined
        setAdminHolding(false)
        adminHoldTriggered.current = true
        openAdmin()
      }, ADMIN_HOLD_MS)
    },
    [cancelAdminHold, openAdmin]
  )

  /** 비밀번호 키패드 — 터치 부스엔 물리 키보드가 없다. 6자리가 차면 바로 확인 */
  const pressAdminKey = useCallback(
    async (key: string) => {
      if (backgroundUnlocking) return
      const next =
        key === 'back' ? backgroundPassword.slice(0, -1) : (backgroundPassword + key).slice(0, 6)
      if (next.length < 6) {
        setBackgroundPassword(next)
        setBackgroundPasswordError('')
        return
      }
      setBackgroundPassword('')
      setBackgroundUnlocking(true)
      const requestId = ++backgroundAuthRequest.current
      try {
        const unlocked = await unlockBackgroundAdmin(next)
        if (requestId !== backgroundAuthRequest.current) return
        if (unlocked) {
          setBackgroundAdminUnlocked(true)
          setBackgroundPasswordError('')
          getBoothShell()
            ?.info()
            .then((info) => setScreenZoom(info.zoomFactor ?? 1))
            .catch(() => setScreenZoom(null))
        } else {
          setBackgroundPasswordError('비밀번호가 올바르지 않습니다')
        }
      } catch (error) {
        if (requestId === backgroundAuthRequest.current) {
          setBackgroundPasswordError(error instanceof Error ? error.message : '관리자 인증에 실패했습니다. 연결을 확인해주세요.')
        }
      } finally {
        if (requestId === backgroundAuthRequest.current) setBackgroundUnlocking(false)
      }
    },
    [backgroundPassword, backgroundUnlocking, unlockBackgroundAdmin]
  )

  // 키보드가 꽂혀 있으면 숫자키로도 입력
  useEffect(() => {
    if (!backgroundAdminOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAdmin()
      } else if (!backgroundAdminUnlocked && (/^[0-9]$/.test(event.key) || event.key === 'Backspace')) {
        event.preventDefault()
        void pressAdminKey(event.key === 'Backspace' ? 'back' : event.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backgroundAdminOpen, backgroundAdminUnlocked, pressAdminKey, closeAdmin])

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
    if (adminHoldRef.current) window.clearTimeout(adminHoldRef.current)
    backgroundAuthRequest.current += 1
  }, [])

  const selectScreenZoom = useCallback(async (factor: number) => {
    const shell = getBoothShell()
    if (!shell) return
    const result = await shell.setZoom(factor).catch(() => null)
    if (result?.ok) setScreenZoom(result.zoomFactor)
  }, [])

  /** 앱 종료 — 부스 앱(exe)은 카메라를 놓고 꺼진다. 브라우저는 스스로 닫을 수 없는 경우가 많다 */
  const quitBooth = useCallback(async () => {
    const shell = getBoothShell()
    if (shell) {
      setExitNotice('카메라 연결을 풀고 종료합니다')
      await shell.quit().catch(() => {})
      return
    }
    window.close()
    window.setTimeout(
      () => setExitNotice('브라우저에서는 여기서 닫을 수 없어요. 키보드 Alt+F4 로 닫아주세요'),
      400
    )
  }, [])
  // 앱 종료는 한 번 더 묻는다(QuitConfirm)
  const [askQuitBooth, quitConfirmNode] = useQuitConfirm(quitBooth)

  // 첫 화면 밖으로 나가면 대기 화면을 닫는다 — 대기 화면으로 가는 건 아래 무입력 규칙(안내 후 처음으로)이 맡는다
  useEffect(() => {
    if (step !== 'home') setIsAttract(false)
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
    // 앞 손님이 고른 프레임을 다음 손님에게 넘기지 않는다 (편집 화면에서 다시 기본값으로 잡힌다)
    setSelectedFrame(null)
    setStageConceptId(DEFAULT_IDOL_CONCEPT.id)
    setLang('ko')
    setIdolDesignId(null)
    setIdolConsent(false)
    setIdolTicket(null)
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
    setCutoutPreviewUrl(null)
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
    setPrintStatus('idle')
    setPrintWaitLeft(null)
    setSessionDone(false)
    setSaveQr(null)
    setSaveQrOpen(false)
    setSaveStatus('idle')
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

  // 인쇄 대기 — 다 나오면 그때부터 복귀 안내(10초)를 센다
  const printing = printWaitLeft !== null
  useEffect(() => {
    if (!printing) return
    const timer = window.setInterval(() => {
      setPrintWaitLeft((left) => {
        if (left === null) return null
        if (left <= 1) {
          setSessionDone(true)
          return null
        }
        return left - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [printing])

  // 행사 모드 AI 아이돌 사진 — 한 컷을 찍고 편집 화면에 오면 만든다(못 만들면 얼굴 인식 메이크업 사진)
  const idolShot = idolOn && shots.length === 1 ? shots[0] : null
  const idol = useIdolStage({
    active: idolOn && (step === 'compose' || step === 'result'),
    shot: idolShot,
    conceptId: stageConceptId,
    ticket: idolTicket,
    getImage,
    lang,
  })
  const idolImage = idol.image
  /** 찍은 한 컷(인화 디자인 미리보기의 BEFORE·AI 사진 전 큰 사진) */
  const [idolShotImage, setIdolShotImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!idolShot) { setIdolShotImage(null); return }
    let live = true
    void getImage(idolShot).then((img) => { if (live) setIdolShotImage(img) }).catch(() => {})
    return () => { live = false }
  }, [idolShot, getImage])
  const idolBusy = idol.busy

  // ---------- 처음 화면 복귀 (첫 화면 제외 모든 단계) ----------
  // 촬영 카운트다운·인쇄 전송·결과 만들기 중에는 기다리는 게 정상이라 세지 않는다.
  // 관리자 팝업이 열려 있을 때도 멈춘다 (직원이 설정 중).
  // 첫 화면(컨셉·체험 고르기)도 같은 규칙 — 예전엔 안내 없이 60초 뒤 대기 화면으로 가고 언어도 남았다
  const idlePaused =
    (step === 'home' && isAttract) ||
    shooting ||
    finishing ||
    passLoading ||
    scanBusy ||
    printStatus === 'printing' ||
    saveStatus === 'uploading' ||
    printing ||
    idolBusy ||
    (step === 'qr' && !!guestPhotoUrl) ||
    backgroundAdminOpen
  useEffect(() => {
    if (idlePaused) return
    const silent =
      step === 'qr' ? QR_IDLE_SILENT_S
        : saveQrOpen ? SAVE_QR_IDLE_SILENT_S
          : step === 'compose' || step === 'result' ? EDIT_IDLE_SILENT_S
            : IDLE_SILENT_S
    const full = (silent + IDLE_WARN_S) * 1000
    idleDeadlineRef.current = Date.now() + (sessionDone ? IDLE_WARN_S * 1000 : full)
    // 화면 어디를 눌러도 시간이 다시 채워지고 안내 팝업은 닫힌다 (키오스크와 동일)
    const bump = () => {
      idleDeadlineRef.current = Date.now() + full
      setIdleLeft(null)
      setSessionDone(false)
    }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    const timer = window.setInterval(() => {
      const left = Math.ceil((idleDeadlineRef.current - Date.now()) / 1000)
      if (left <= 0) {
        // 처음으로(언어도 한국어로) + 다음 손님을 기다리는 대기 화면
        resetAll()
        setIsAttract(true)
      } else setIdleLeft(left <= IDLE_WARN_S ? left : null)
    }, 250)
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      window.clearInterval(timer)
      setIdleLeft(null)
    }
  }, [idlePaused, step, sessionDone, saveQrOpen, resetAll])

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
      const uploadUrl = withBoothLang(`${window.location.origin}/booth/upload/${data.code}`, langRef.current)
      const qr = await QRCode.toDataURL(uploadUrl, { width: 480, margin: 1 })
      setQrDataUrl(qr)
    } catch (error) {
      console.error('업로드 세션 생성 실패:', error)
      setSessionExpired(true)
    }
  }, [])

  const startMode = useCallback(
    (nextMode: Mode) => {
      if (passVerified || !passRequired) {
        // 이용권 없이 쓰는 운영 모드 — 행사 모드면 AI 사진 생성 표만 따로 받는다(못 받으면 메이크업 사진으로)
        if (!passVerified && stageMakeup && !idolTicket) void requestFreeIdolTicket().then(setIdolTicket)
        proceedToMode(nextMode)
        return
      }
      // 이용권 입력 게이트 (상품 구매 특전)
      setPendingMode(nextMode)
      setPassDigits('')
      setPassError('')
      setStep('pass')
    },
    [passVerified, passRequired, stageMakeup, idolTicket, proceedToMode]
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
      let title = tRef.current.passFailTitle
      try {
        const res = await fetch('/api/photobooth/pass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const data = await res.json()
        if (!res.ok) {
          // 한국어는 서버 문구 그대로, 다른 언어는 실패 종류별 번역 문구
          const failure = passErrorText(langRef.current, res.status, data)
          title = failure.title
          throw new Error(failure.message)
        }
        setPassVerified(true)
        setIdolTicket(typeof data.idolTicket === 'string' ? data.idolTicket : null)
        const next = pendingMode ?? 'solo'
        setPendingMode(null)
        proceedToMode(next)
      } catch (error) {
        const message = guestError(langRef.current, error instanceof Error ? error.message : null, tRef.current.passFailMessage)
        setPassError(message)
        setPassDigits('')
        setPassAlert({ title, message })
      } finally {
        setPassLoading(false)
      }
    },
    [pendingMode, proceedToMode]
  )

  // 이용권 안내 팝업은 8초 뒤 닫히고, 이용권 화면을 떠나면 바로 닫힌다
  useEffect(() => {
    if (!passAlert) return
    if (step !== 'pass') {
      setPassAlert(null)
      return
    }
    const timer = window.setTimeout(() => setPassAlert(null), 8000)
    return () => window.clearTimeout(timer)
  }, [passAlert, step])

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

  // 손님이 폰으로 사진을 고르는 동안 오려내기 모델을 올려 둔다 (사진이 오면 추론만 남는다)
  useEffect(() => {
    if (step !== 'qr') return
    warmupSegmentation().catch(() => {})
  }, [step])

  // ---------- 폰 업로드 폴링 ----------
  useEffect(() => {
    if (step !== 'qr' || !sessionCode || sessionExpired || guestPhotoUrl) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/photobooth/session?code=${sessionCode}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok) return
        if (data.status === 'uploaded' && data.photoUrl) {
          // 카메라는 인물 오려내기가 끝난 뒤 연다 — 먼저 열면 몇 초 뒤에 인물이 불쑥 나타난다
          setGuestPhotoUrl(data.photoUrl)
        } else if (data.status === 'expired') {
          setSessionExpired(true)
        }
      } catch {
        // 네트워크 일시 오류는 다음 폴링에서 재시도
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [step, sessionCode, sessionExpired, guestPhotoUrl])

  // ---------- 매장 포토카드 ----------
  /** 코드 해석 → 미리 따둔 누끼를 불러와 바로 촬영으로 (런타임 세그멘테이션 없음) */
  const applyCardCode = useCallback(
    async (rawCode: string) => {
      const code = parseCardCode(rawCode)
      if (!code) {
        setScanError(tRef.current.cardCodeUnreadable)
        return false
      }
      setScanBusy(true)
      setScanError('')
      try {
        const res = await fetch(`/api/photobooth/card?code=${code}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || tRef.current.cardCheckFailed)

        const img = await getImage(data.card.cutoutUrl)
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(tRef.current.cardImageFailed)
        ctx.drawImage(img, 0, 0)

        setScannedCard({ code: data.card.code, title: data.card.title, cutoutUrl: data.card.cutoutUrl })
        setCutout(canvas)
        setCutoutPreviewUrl(data.card.cutoutUrl)
        setCutoutStatus('done')
        setUseCutout(true)
        setGuestLayer(cutoutLayerFor(canvas))
        setStep('camera')
        return true
      } catch (error) {
        console.error('[photobooth] 카드 적용 실패:', error)
        setScanError(guestError(langRef.current, error instanceof Error ? error.message : null, tRef.current.cardCheckFailed))
        return false
      } finally {
        setScanBusy(false)
      }
    },
    [getImage]
  )

  /** 카드 번호 한 글자 입력 — 5자가 차면 자동으로 확인한다 */
  const pressCardKey = useCallback(
    (key: string) => {
      if (scanBusy) return
      setScanError('')
      setManualCode((prev) => {
        if (key === 'back') return prev.slice(0, -1)
        if (prev.length >= CARD_CODE_LENGTH) return prev
        const next = prev + key
        if (next.length === CARD_CODE_LENGTH) applyCardCode(next)
        return next
      })
    },
    [scanBusy, applyCardCode]
  )

  // 물리 키보드로도 입력 가능하게 (USB 키보드가 붙은 부스 대응)
  useEffect(() => {
    if (step !== 'scan' || backgroundAdminOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        pressCardKey('back')
        return
      }
      const ch = e.key.toUpperCase()
      if (ch.length === 1 && CARD_ALPHABET.includes(ch)) pressCardKey(ch)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, pressCardKey, backgroundAdminOpen])

  /**
   * 부스 카메라로 QR 읽기 — 카드 스캔 화면은 포토카드 QR, 이용권 화면은 카운터 쪽지 QR (src/lib/photobooth/qr-scan.ts).
   */
  useEffect(() => {
    if (step !== 'scan' && step !== 'pass') return
    let stopped = false
    // 쓴 이용권을 계속 대고 있으면 같은 오류만 반복되니 한 번 확인한 번호는 잠시 다시 보내지 않는다
    let lastPass = ''
    let lastPassAt = 0

    const start = async () => {
      let reader: QrReader
      try {
        reader = await createQrReader()
      } catch (error) {
        console.error('[photobooth] QR 인식기 로드 실패:', error)
        if (step === 'scan') setScanError(tRef.current.cardAutoUnavailable)
        return
      }

      const tick = async () => {
        if (stopped) return
        const source = getLiveSource()
        if (source) {
          try {
            const value = await reader.read(source)
            if (value && !stopped) {
              if (step === 'scan') {
                stopped = true
                await applyCardCode(value)
                return
              }
              const code = parsePassQr(value)
              // 안내 팝업이 떠 있는 동안에는 같은 쪽지를 계속 대고 있어도 다시 보내지 않는다
              if (code && passAlertRef.current) {
                if (code === lastPass) lastPassAt = Date.now()
              } else if (code && (code !== lastPass || Date.now() - lastPassAt > PASS_QR_RETRY_MS)) {
                lastPass = code
                lastPassAt = Date.now()
                setPassDigits(code)
                await submitPass(code)
              }
            }
          } catch {
            // 인식 실패는 다음 프레임에서 재시도
          }
        }
        if (!stopped) window.setTimeout(tick, reader.intervalMs)
      }
      tick()
    }

    start()
    return () => {
      stopped = true
    }
  }, [step, applyCardCode, submitPass, getLiveSource])

  // ---------- 업로드 사진 인물 오려내기 ----------
  // 사진이 도착하자마자 한 번만 돌린다(촬영하는 동안 끝나므로 손님은 대기를 못 느낀다).
  // 실패하면 기존 폴라로이드 합성으로 조용히 폴백한다 — 부스가 멈추면 안 된다.
  useEffect(() => {
    if (!guestPhotoUrl) {
      setCutout(null)
      setCutoutPreviewUrl(null)
      setCutoutStatus('idle')
      return
    }
    let cancelled = false
    setCutout(null)
    setCutoutPreviewUrl(null)
    setCutoutStatus('processing')
    // QR 화면에서 기다리던 중이면 카메라로 넘어간다 (다른 단계에 있으면 그대로)
    const openCamera = () => setStep((current) => (current === 'qr' ? 'camera' : current))
    const guard = window.setTimeout(openCamera, CUTOUT_WAIT_MS)
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
        setCutoutPreviewUrl(result.canvas.toDataURL('image/png'))
        setCutoutStatus('done')
        setGuestLayer(cutoutLayerFor(result.canvas))
      } catch (error) {
        if (cancelled) return
        console.error('[photobooth] 인물 오려내기 실패:', error)
        setCutoutStatus('failed')
      }
      window.clearTimeout(guard)
      openCamera()
    })()
    return () => {
      cancelled = true
      window.clearTimeout(guard)
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

  // 촬영 화면에 들어올 때마다 DSLR 브리지를 확인한다 — 행사용 앱에 카메라를 넘겨줬다가
  // 다시 켜는 경우가 있어 한 번 정하고 끝내지 않는다.
  const [cameraProbe, setCameraProbe] = useState(0)
  useEffect(() => {
    if (step !== 'camera' && step !== 'scan' && step !== 'pass') return
    let cancelled = false
    let timer = 0
    setCameraSource('probing')
    setCameraError(null)
    setDslrLive(false)
    const probe = async () => {
      const health = await probeDslrBridge()
      if (cancelled) return
      if (health.connected) {
        setCameraError(null)
        setCameraSource('dslr')
      } else if (health.reachable) {
        // 브리지는 있는데 카메라가 안 잡힘(전원 꺼짐·다른 앱 사용 중) — 웹캠으로 넘어가지 않고 기다린다
        setCameraError(tRef.current.cameraConnecting)
        timer = window.setTimeout(probe, 2500)
      } else {
        setCameraSource('webcam')
      }
    }
    probe()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [step, cameraProbe])

  // DSLR 초점 — 이용권 화면에서는 가까이 댄 QR 에 몇 초마다 다시 맞추고, 촬영 화면에 들어오면 손님에게 한 번 되돌린다
  useEffect(() => {
    if (cameraSource !== 'dslr' || !dslrLive) return
    if (step === 'camera') {
      void autofocusDslr()
      return
    }
    if (step !== 'pass') return
    let stopped = false
    ;(async () => {
      while (!stopped) {
        await autofocusDslr()
        await sleep(DSLR_QR_AF_MS)
      }
    })()
    return () => {
      stopped = true
    }
  }, [step, cameraSource, dslrLive])

  // DSLR 라이브뷰 — 프레임을 하나씩 받아 캔버스에 그린다(앞 프레임을 다 그린 뒤 다음 요청)
  useEffect(() => {
    if ((step !== 'camera' && step !== 'scan' && step !== 'pass') || cameraSource !== 'dslr') return
    let stopped = false
    let failures = 0
    ;(async () => {
      while (!stopped) {
        // 셔터 후 원본을 받는 동안 브리지는 라이브뷰를 멈춘다 — 그 사이 요청은 헛돈다
        if (capturingRef.current) {
          await sleep(150)
          continue
        }
        try {
          const frame = await fetchDslrFrame()
          failures = 0
          if (stopped) {
            frame?.close()
            break
          }
          const canvas = dslrCanvasRef.current
          if (frame && canvas) {
            if (canvas.width !== frame.width || canvas.height !== frame.height) {
              canvas.width = frame.width
              canvas.height = frame.height
            }
            canvas.getContext('2d')?.drawImage(frame, 0, 0)
            if (canvas.dataset.live !== '1') {
              canvas.dataset.live = '1'
              setDslrLive(true)
            }
          }
          frame?.close()
          if (!frame) await sleep(120)
        } catch {
          // 한두 번은 전환 중 흔들림 — 계속 실패하면 카메라가 빠진 것이니 처음부터 다시 확인
          failures++
          if (failures >= 8) {
            if (!stopped) setCameraProbe((n) => n + 1)
            break
          }
          await sleep(300)
        }
      }
    })()
    return () => {
      stopped = true
    }
  }, [step, cameraSource])

  useEffect(() => {
    if ((step !== 'camera' && step !== 'scan' && step !== 'pass') || cameraSource !== 'webcam') return
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
        setCameraError(tRef.current.cameraUnavailable)
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [step, cameraSource, bindStream])

  // ---------- 최애와 찍기: 라이브 합성 프리뷰 ----------
  const liveComposeReady = step === 'camera' && mode === 'template' && !!templateGeometry
  // 행사 모드 — 촬영 화면은 필터·메이크업 없이 실제 모습 그대로 보여 주고, 고른 컨셉(룩) 이름만 적는다
  // (메이크업은 찍은 뒤 결과에만 입힌다. AI 아이돌 사진은 원본 한 컷으로 만든다)
  const liveConcept = findIdolConcept(stageConceptId)
  const liveLookName = stageMakeup && liveConcept ? conceptText(t, liveConcept).name : null
  useEffect(() => {
    if (!liveComposeReady) return
    const canvas = livePreviewNode
    const templateImg = templateImgRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !templateImg || !ctx || !templateGeometry) return

    let raf = 0
    const loop = () => {
      const video = getLiveSource()
      if (video) {
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
  }, [liveComposeReady, livePreviewNode, templateGeometry, guestFit, keying, getLiveSource])

  /** 한 컷 촬영 — DSLR 은 셔터를 눌러 원본을 받고(수 초), 웹캠은 현재 프레임을 뜬다 */
  const captureShot = useCallback(async (): Promise<string | null> => {
    if (cameraSource === 'dslr') {
      const still = await captureDslrStill()
      try {
        return mirroredJpeg(still, still.width, still.height)
      } finally {
        still.close()
      }
    }
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    return mirroredJpeg(video, video.videoWidth, video.videoHeight)
  }, [cameraSource])

  const startShooting = useCallback(async () => {
    if (shooting) return
    setShooting(true)
    setShots([])
    // 최애와 찍기는 합성 컷 + 단독 컷 2장으로 인화지 한 장을 채운다
    const total = mode === 'template' ? 2 : cutCount
    const collected: string[] = []
    let attempts = 0
    try {
      for (let shot = 1; shot <= total; shot++) {
        activeShotRef.current = shot
        setShotProgress(total > 1 ? { current: shot, total } : null)
        for (let n = 3; n >= 1; n--) {
          setCountdown(n)
          await sleep(1000)
        }
        setCountdown(null)
        let dataUrl: string | null = null
        let failed = false
        let failReason = ''
        capturingRef.current = true
        setCapturing(true)
        try {
          dataUrl = await captureShot()
        } catch (error) {
          console.error('[photobooth] 촬영 실패:', error)
          failed = true
          failReason = error instanceof Error ? error.message : ''
        } finally {
          capturingRef.current = false
          setCapturing(false)
        }
        if (failed) {
          // 초점을 못 잡는 등 셔터가 안 눌린 경우 — 같은 컷을 다시 찍는다.
          // 카메라 설정 문제(전원 스위치가 동영상 칸 등)는 다시 찍어도 같다 — 바로 멈추고 이유를 보여 준다(직원용)
          const settingProblem = /동영상 모드/.test(failReason)
          attempts++
          if (attempts <= 2 && !settingProblem) {
            setShotNotice(tRef.current.retakeNotice)
            await sleep(1200)
            setShotNotice(null)
            shot--
            continue
          }
          setShotNotice(settingProblem ? tRef.current.tellStaff(failReason) : tRef.current.cameraNoResponse)
          window.setTimeout(() => setShotNotice(null), settingProblem ? 10000 : 4000)
          collected.length = 0
          break
        }
        attempts = 0
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
      capturingRef.current = false
      setCapturing(false)
      setCountdown(null)
      setShotProgress(null)
      setShooting(false)
    }
    if (collected.length === 0) return
    setShots(collected)
    // 행사 모드(무대 메이크업)는 프레임 없이 시작 — 룩 스티커·하단 띠와 겹치지 않게(손님이 골라 올릴 수는 있다)
    setSelectedFrame((prev) => prev ?? (mode === 'template' || stageMakeup ? null : modeFrames[0] ?? null))
    setStep('compose')
  }, [shooting, mode, cutCount, captureShot, modeFrames, stageMakeup])

  // ---------- 카메라 미리보기 ----------
  const liveReady = cameraSource === 'webcam' || (cameraSource === 'dslr' && dslrLive)

  /** DSLR 이면 라이브뷰 캔버스, 웹캠이면 video — 둘 다 거울 모드로 보인다 */
  const renderLiveView = (className: string, style?: CSSProperties) =>
    cameraSource === 'dslr' ? (
      <canvas ref={dslrCanvasRef} className={className} style={style} />
    ) : cameraSource === 'webcam' ? (
      <video ref={attachVideo} autoPlay playsInline muted className={className} style={style} />
    ) : (
      <div className={className} />
    )

  /** 카메라 준비 · DSLR 원본 수신 · 재촬영 안내 */
  const renderCameraStatus = () => (
    <>
      {!liveReady && !cameraError && (
        <div className="bth-overlay-center bth-overlay-dim">
          <RetroWindow className="bth-mini" icon="camera" title="CAMERA">
            <span>{t.cameraPreparing}</span>
            <RetroProgress label={t.cameraPreparing} />
          </RetroWindow>
        </div>
      )}
      {capturing && cameraSource === 'dslr' && (
        <div className="bth-live-toast rt-toast" role="status">
          <PixelIcon name="camera" size={28} />
          {t.captureHold}
        </div>
      )}
      {shotNotice && (
        <div className="bth-overlay-center">
          <p className="rt-toast bth-notice" role="status">
            <PixelIcon name="warning" size={32} />
            {shotNotice}
          </p>
        </div>
      )}
    </>
  )

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
        // AI 아이돌 사진(행사 모드 + 동의) — 메이크업·스티커 없이 고른 인화 디자인으로. AI 사진이 오기 전·못 만들었으면 찍은 원본 그대로
        const idolConcept = findIdolConcept(stageConceptId)
        if (stageMakeup && idolOn && idolConcept && shotImages.length === 1) {
          drawIdolDesign(ctx, idolConcept, idolDesignId,
            idolImage ? { main: idolImage, before: shotImages[0] } : { main: shotImages[0], before: null },
            stageMakeup.eventLines[0])
          return
        }

        const photos: HTMLImageElement[] = shotImages

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        const photoH = CANVAS_H

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
          if (!stageMakeup) drawEventFooter(ctx, x, footerY, contentW, PRINT.footerH, {
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
          const cellH = photoH / 2
          for (let i = 0; i < 4; i++) {
            const col = i % 2
            const row = Math.floor(i / 2)
            drawCover(ctx, photos[i], col * cellW, row * cellH, cellW, cellH)
          }
        } else {
          drawCover(ctx, photos[0], 0, 0, CANVAS_W, photoH)
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
            { toneColor: averageColor(shotImages[0]), flip: guestLayer.flip }
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
          if (guestLayer.flip) ctx.scale(-1, 1)
          ctx.drawImage(guest, -w / 2, -h / 2, w, h)
          ctx.restore()
        }

        if (frame) {
          ctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H)
        }

      } catch (error) {
        console.error('합성 렌더 실패:', error)
        if (renderTokenRef.current === token) {
          setComposeError(tRef.current.composeFailed)
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
    stageMakeup,
    stageConceptId,
    idolImage,
    idolOn,
    idolDesignId,
  ])

  // ---------- 캔버스 드래그 ----------
  /**
   * 편집·촬영 화면의 손가락 조작 — 한 손가락은 옮기기, 두 손가락은 크기·각도.
   * (폰에서 사진 다루듯. 슬라이더로도 같은 값을 바꿀 수 있다)
   */
  const applyLayerGesture = useCallback(
    (gesture: GestureDelta) => {
      // 미리보기는 인화 캔버스와 같은 비율 — 화면에서 움직인 만큼을 캔버스 좌표로 바꾼다
      const factor = CANVAS_W / gesture.width

      if (mode === 'template') {
        setGuestFit((prev) => ({
          ...prev,
          zoom: clamp(prev.zoom * gesture.scale, FIT_ZOOM_MIN, FIT_ZOOM_MAX),
          // 사진을 끄는 방향과 반대로 크롭 기준점이 움직여야 직관적이다
          focalX: clamp(prev.focalX - (gesture.dx * factor) / TEMPLATE_LAYOUT.contentW, 0, 1),
          focalY: clamp(prev.focalY - (gesture.dy * factor) / TEMPLATE_LAYOUT.togetherH, 0, 1),
        }))
        return
      }

      setGuestLayer((prev) => ({
        ...prev,
        x: clamp(prev.x + gesture.dx * factor, 0, CANVAS_W),
        y: clamp(prev.y + gesture.dy * factor, 0, CANVAS_H),
        scale: clamp(prev.scale * gesture.scale, LAYER_SCALE_MIN, LAYER_SCALE_MAX),
        rotation: wrapAngle(prev.rotation + gesture.rotation),
      }))
    },
    [mode]
  )
  const composeGestures = useLayerGestures(applyLayerGesture, overlayAdjustable || mode === 'template')
  const liveGestures = useLayerGestures(applyLayerGesture, showLiveCutout && !shooting)

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
      setPrintStatus('idle')
      setSaveQr(null)
      setSaveStatus('idle')
      setStep('result')
      logShot()
    } catch (error) {
      // 외부 이미지 CORS 문제 등으로 캔버스가 오염된 경우
      console.error('결과 생성 실패:', error)
      setComposeError(tRef.current.resultFailed)
    } finally {
      setFinishing(false)
    }
  }, [logShot])

  const handlePrint = useCallback(async () => {
    if (printStatus === 'printing') return
    markShot({ printed: true })
    const shell = getBoothShell()
    if (!shell) {
      window.print()
      setPrintStatus('sent')
      setPrintWaitLeft(PRINT_WAIT_S)
      return
    }
    // 매장 부스 앱 — 대화상자 없이 바로 프린터로
    setPrintStatus('printing')
    try {
      const result = await shell.print(resultUrl ?? undefined)
      setPrintStatus(result.ok ? 'sent' : 'failed')
      // 사진이 다 나올 때까지 기다린 뒤에 복귀 안내를 띄운다
      if (result.ok) setPrintWaitLeft(PRINT_WAIT_S)
      if (!result.ok) console.error('[photobooth] 인쇄 실패:', result.error)
    } catch (error) {
      console.error('[photobooth] 인쇄 실패:', error)
      setPrintStatus('failed')
    }
  }, [markShot, printStatus, resultUrl])

  /**
   * [이미지 저장] — 부스 PC 에 파일로 받아 봐야 손님에겐 아무 일도 안 일어난다.
   * 완성 사진을 올리고 고유 QR 을 띄워 손님 폰에서 갤러리로 저장하게 한다.
   */
  const handleDownload = useCallback(async () => {
    if (!resultUrl || saveStatus === 'uploading') return
    if (saveQr) {
      setSaveQrOpen(true)
      return
    }
    setSaveStatus('uploading')
    try {
      // 촬영 기록이 아직 안 만들어졌으면(네트워크 지연) 먼저 만든다 — 서버가 기록으로 요청을 확인한다
      if (!shotIdRef.current) await logShot()
      const res = await fetch('/api/photobooth/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shotIdRef.current, imageBase64: resultUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.path) throw new Error(data.error || `업로드 실패 (${res.status})`)
      const url = withBoothLang(`${window.location.origin}${data.path}`, langRef.current)
      const qrDataUrl = await QRCode.toDataURL(url, { width: 640, margin: 1 })
      setSaveQr({ url, qrDataUrl })
      setSaveQrOpen(true)
      setSaveStatus('idle')
    } catch (error) {
      console.error('[photobooth] 사진 QR 만들기 실패:', error)
      setSaveStatus('failed')
    }
  }, [resultUrl, saveStatus, saveQr, logShot])

  const eventPeriod = event ? formatPeriod(event) : null
  const templateLabel = event?.artist ? t.tileTemplateWith(event.artist) : t.tileTemplate
  const standSideText =
    templateGeometry?.freeSide === 'left' ? t.standLeft : t.standRight

  // ======================
  // Render
  // ======================
  useScreenUiSwitch(design, deviceSettings, backgroundsSynced, step === 'home' || backgroundAdminOpen)
  const stepMeta = BOOTH_STEP_META[step]
  // 이벤트 색이 있으면 장식(겹친 창 테두리 등)에만 싣는다 — 기능 UI는 레트로 토큰 고정
  // 테마 글꼴은 한국어 전용이라 한자권 언어에서는 글리프가 없다 — 그 언어 글꼴로 바꾼다(키오스크와 같은 글꼴)
  const cjkFont = isCjkLang(lang) ? CJK_FONT_STACK[lang] : undefined
  const deskVars = retroDesktopVars(
    event?.theme_color ? { ...retroDesk, deco: accent, decoSoft: mixColor(accent, '#ffffff', 0.78) } : retroDesk,
    cjkFont ? { display: cjkFont, body: cjkFont } : undefined
  )
  const startAttract = () => setIsAttract(false)

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={`bth-root rt rt--booth rt-desktop ${RETRO_FONT_CLASS} ${KIOSK_FONT_CLASS}`}
      data-ui={design}
      data-lang={lang}
      lang={BOOTH_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'}
      data-background={activeBackground.id}
      data-tone={retroDesk.tone}
      style={{ ...deskVars, ...(design === 'mac' ? macFontVars(cjkFont ?? (deviceSettings.font ? retroDesk.bodyFont : undefined)) : {}) } as React.CSSProperties}
    >
      {quitConfirmNode}
      <ScreenFontFace ids={[retroDesk.fontId]} />
      {/* 4x6 인쇄 전용 영역 */}
      <style>{`
        @font-face {
          font-family: 'Pretendard';
          src: url('/fonts/pretendard/PretendardVariable.woff2') format('woff2');
          font-weight: 100 900;
          font-display: swap;
        }
        .booth-print-area { display: none; }
        @media print {
          @page { size: 4in 6in; margin: 0; }
          /* 페이지 바탕은 흰색으로 — 사이트 배경색이 용지에 깔리면 여백이 새까맣게 나온다 */
          html, body { background: #ffffff !important; }
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
      <div className="bth-wallpaper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeBackground.image} alt="" />
      </div>
      <RetroDesktopIcons items={BOOTH_DESK_ITEMS} className="bth-desk" />

      <AnimatePresence>
        {isAttract && (
          <motion.div
            role="button"
            tabIndex={0}
            aria-label={t.attractAria}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={startAttract}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') startAttract()
            }}
            className="bth-attract"
          >
            <motion.img
              src={activeBackground.image}
              alt=""
              className="bth-attract-wall"
              animate={{ scale: [1, 1.045, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <RetroDesktopIcons items={BOOTH_DESK_ITEMS} className="bth-desk" />
            <div className="bth-attract-stage">
              <div className="bth-attract-group">
                <RetroWindow ghosts icon="heart" title="WELCOME" bodyClassName="bth-attract-body">
                  {boothMode.attract?.poster ? (
                    // 행사 모드 — 홍보 배너와 같은 제목(IDOL! / 오늘, 나도 K-POP 아이돌 / AI 포토부스)
                    <IdolPosterTitle poster={boothMode.attract.poster} />
                  ) : boothMode.attract ? (
                    // 행사 모드 — 제목은 화면 언어로. 한국어 화면일 때만 외국인 손님을 위해 영어 한 줄을 곁들인다
                    <>
                      <div className="bth-wordmark rt-pixel" aria-label={`${boothMode.attract.wordmark} ${boothMode.attract.sub}`}>
                        <b>{boothMode.attract.wordmark}</b>
                        <span>{boothMode.attract.sub}</span>
                      </div>
                      <span className="bth-attract-tag rt-tag rt-pixel">{boothMode.attract.badge}</span>
                      <h1 className="bth-display bth-h1 bth-attract-h1">{attractHeadline(t, lang, boothMode)}</h1>
                      {lang === 'ko' && boothMode.attract.headlineEn && <p className="bth-hashtag-text">{boothMode.attract.headlineEn}</p>}
                    </>
                  ) : (
                    <>
                      <div className="bth-wordmark rt-pixel" aria-label="AC'SCENT WOW PHOTO">
                        <b>AC&apos;SCENT WOW</b>
                        <span>PHOTO</span>
                      </div>
                      <span className="bth-attract-tag rt-tag rt-pixel">4×6 PHOTO BENEFIT</span>
                      <h1 className="bth-display bth-h1 bth-attract-h1">{event?.greeting || t.attractDefault}</h1>
                      {event?.hashtag && <p className="bth-hashtag-text">{event.hashtag}</p>}
                    </>
                  )}
                </RetroWindow>
                <div className="bth-attract-start">
                  <RetroWindow icon="sparkle" title="START">
                    <span className="bth-attract-cta rt-btn rt-btn--pink rt-btn--block">
                      <PixelIcon name="camera" size={48} />
                      <span>{t.attractTouch}</span>
                    </span>
                  </RetroWindow>
                  <RetroStickers
                    items={[
                      { icon: 'heart', top: 'calc(100% - 26px)', left: '-30px', size: 48, tilt: -8 },
                      { icon: 'heart', top: 'calc(100% - 4px)', left: '26px', size: 36, tilt: 8 },
                    ]}
                  />
                </div>
                <RetroStickers
                  items={[
                    { icon: 'sparkle', top: '-22px', left: 'calc(100% - 40px)', size: 48 },
                    { icon: 'heart', top: '38%', left: '-30px', size: 44, tilt: -10 },
                  ]}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {resultUrl && (
        <div className="booth-print-area">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt={t.printAlt} />
        </div>
      )}

      {/* 대기 화면이 떠 있으면 뒤 화면은 Tab·화면 낭독기에서 뺀다 */}
      <div className="bth-frame rt-stack" inert={isAttract}>
        <span className="rt-ghost rt-ghost-1" aria-hidden="true" />
        <span className="rt-ghost rt-ghost-2" aria-hidden="true" />
        <section className="bth-window rt-win">
          <header className="rt-win-title">
            <PixelIcon name={stepMeta.icon} size={24} className="rt-win-title-icon" />
            <span className="rt-win-title-text">AC&apos;SCENT PHOTO</span>
            <span className="rt-win-title-extra">{stepMeta.label}</span>
          </header>

          {/* 도구줄 — 뒤로·처음으로는 늘 같은 자리 */}
          <div className="bth-toolbar">
            <div className="bth-toolbar-side">
              {step !== 'home' ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={shooting || passLoading || finishing}
                  aria-label={t.backAria}
                  className="rt-btn bth-tool-btn"
                >
                  <PixelIcon name="arrowLeft" size={32} />
                  <span>{t.back}</span>
                </button>
              ) : (
                <span className="bth-toolbar-brand rt-pixel">{boothMode.brandLine}</span>
              )}
            </div>
            {event && (
              <span className="bth-event-tag rt-tag">
                <PixelIcon name="sparkle" size={20} />
                {event.title}
              </span>
            )}
            <div className="bth-toolbar-side bth-toolbar-end">
              <BoothLangSwitcher lang={lang} onChange={setLang} variant="retro" disabled={shooting || printing} />
              {step !== 'home' && (
                <button type="button" onClick={resetAll} className="rt-btn bth-tool-btn">
                  <PixelIcon name="home" size={32} />
                  <span>{t.home}</span>
                </button>
              )}
            </div>
          </div>

          <div className="bth-body rt-scroll">
      <AnimatePresence mode="wait">
      <motion.main
        key={step}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="bth-main"
      >
        {/* ---------- 홈: 이벤트 배너 + 체험 선택 ---------- */}
        {/* ---------- 홈(행사 무대 메이크업 모드): 촬영 방식 없이 룩부터 고르고 바로 촬영 ---------- */}
        {step === 'home' && stageMakeup && (
          <div className="bth-home bth-home--stage">
            <div className="bth-heading">
              <h1 className="bth-display bth-h1">{t.stageTitleIdol}</h1>
              <p className="bth-sub">{t.stageSubIdol}</p>
            </div>
            <RetroWindow className="bth-panel bth-stage-pick" icon="sparkle" title="IDOL CONCEPT">
              <IdolConceptPicker value={stageConceptId} onChange={pickConcept} variant="retro" lang={lang} />
            </RetroWindow>
            <p className="bth-idol-consent">{t.idolConsent}</p>
            <div className="bth-stage-actions">
              <button type="button" onClick={() => { setIdolConsent(true); startMode('solo') }} className="rt-btn rt-btn--primary rt-btn--lg bth-stage-start">
                <PixelIcon name="sparkle" size={40} /> {t.idolAgreeStart}
              </button>
            </div>
          </div>
        )}

        {step === 'home' && !stageMakeup && (
          <div className="bth-home">
            {event ? (
              <div className="bth-event">
                {event.cover_image_url && (
                  <div className="rt-viewer bth-event-cover">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.cover_image_url} alt={event.title} />
                  </div>
                )}
                <p className="bth-event-label rt-tag">
                  <PixelIcon name="sparkle" size={20} />
                  Birthday Cafe{eventPeriod ? ` · ${eventPeriod}` : ''}
                </p>
                <h1 className="bth-display bth-h1">{event.greeting || event.title}</h1>
                <p className="bth-sub bth-event-by">
                  {event.artist && (
                    <>
                      with <b>{event.artist}</b>
                    </>
                  )}
                  {event.artist && event.organizer && ' · '}
                  {event.organizer && <>hosted by {event.organizer}</>}
                </p>
              </div>
            ) : (
              <div className="bth-heading">
                <h1 className="bth-display bth-h1">{t.homeTitle}</h1>
                <p className="bth-sub">{t.homeSub}</p>
              </div>
            )}

            <div className="bth-tiles">
              <button type="button" onClick={() => startMode('card')} className="bth-tile">
                <span className="bth-tile-icon">
                  <PixelIcon name="qr" size={80} />
                </span>
                <span className="bth-display bth-tile-name">{t.tileCard}</span>
                <span className="bth-tile-desc">
                  {t.tileCardDesc[0]}
                  <br />
                  {t.tileCardDesc[1]}
                </span>
              </button>
              <button
                type="button"
                onClick={() => startMode('template')}
                disabled={templates.length === 0}
                className="bth-tile"
              >
                <span className="bth-tile-icon">
                  <PixelIcon name="duo" size={80} />
                </span>
                <span className="bth-display bth-tile-name">{templateLabel}</span>
                <span className="bth-tile-desc">
                  {t.tileTemplateDesc[0]}
                  <br />
                  {t.tileTemplateDesc[1]}
                </span>
              </button>
              <button type="button" onClick={() => startMode('together')} className="bth-tile">
                <span className="bth-tile-icon">
                  <PixelIcon name="phone" size={80} />
                </span>
                <span className="bth-display bth-tile-name">{event ? t.tileTogetherEvent : t.tileTogether}</span>
                <span className="bth-tile-desc">
                  {t.tileTogetherDesc[0]}
                  <br />
                  {t.tileTogetherDesc[1]}
                </span>
              </button>
              <button type="button" onClick={() => startMode('solo')} className="bth-tile">
                <span className="bth-tile-icon">
                  <PixelIcon name="camera" size={80} />
                </span>
                <span className="bth-display bth-tile-name">{t.tileSolo}</span>
                <span className="bth-tile-desc">
                  {t.tileSoloDesc[0]}
                  <br />
                  {t.tileSoloDesc[1]}
                </span>
              </button>
            </div>

            <p className="bth-note">
              <PixelIcon name="file" size={28} />
              {t.passNote}
            </p>
          </div>
        )}

        {/* ---------- 이용권: 쪽지 QR 을 카메라에 대거나 번호 입력 ---------- */}
        {step === 'pass' && (
          <div className="bth-split">
            <div className="bth-split-main">
              <div className="bth-viewport">
                {cameraError ? (
                  <div className="bth-empty">
                    <PixelIcon name="warning" size={96} />
                    <p className="bth-error">{cameraError}</p>
                  </div>
                ) : (
                  <div className="rt-viewer bth-live bth-live--wide">
                    {renderLiveView('bth-live-media bth-mirror')}
                    {renderCameraStatus()}
                    <div className="bth-aim" aria-hidden="true">
                      <span />
                    </div>
                    {passLoading && (
                      <div className="bth-overlay-center">
                        <RetroWindow className="bth-mini" icon="file" title="TICKET">
                          <RetroProgress label={t.passChecking} />
                        </RetroWindow>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bth-split-side">
              <h2 className="bth-display bth-h2">{t.passTitle}</h2>
              <p className="bth-sub bth-scan-sub">{t.passSub}</p>
              <div className="rt-group bth-manual">
                <span className="rt-group-label">{t.passManual}</span>
                <div className="bth-code">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bth-code-cell rt-field"
                      data-current={i === passDigits.length && !passLoading}
                    >
                      {passDigits[i] ?? ''}
                    </div>
                  ))}
                </div>
                <div className="bth-keypad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => pressKeypad(digit)}
                      disabled={passLoading}
                      className="rt-btn"
                    >
                      {digit}
                    </button>
                  ))}
                  <div />
                  <button type="button" onClick={() => pressKeypad('0')} disabled={passLoading} className="rt-btn">
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => pressKeypad('back')}
                    disabled={passLoading}
                    aria-label={t.keypadDelete}
                    className="rt-btn"
                  >
                    <PixelIcon name="backspace" size={40} />
                  </button>
                </div>
                <p className="bth-error" role="alert">
                  {passError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------- QR: 폰 사진 업로드 대기 ---------- */}
        {step === 'qr' && (
          <div className="bth-split">
            <div className="bth-split-main">
              <div className="bth-viewport">
                {guestPhotoUrl ? (
                  <div className="rt-viewer bth-photo-view">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={guestPhotoUrl} alt={t.receivedPhotoAlt} />
                  </div>
                ) : sessionExpired ? (
                  <div className="bth-empty">
                    <PixelIcon name="hourglass" size={96} />
                    <p className="bth-error">{t.sessionExpired}</p>
                  </div>
                ) : qrDataUrl ? (
                  <div className="bth-qr rt-field">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt={t.uploadQrAlt} />
                  </div>
                ) : (
                  <div className="bth-empty">
                    <RetroProgress label={t.qrPreparing} className="bth-inline-busy" />
                  </div>
                )}
              </div>
            </div>
            <div className="bth-split-side">
              <h2 className="bth-display bth-h2">{guestPhotoUrl ? t.qrReceived : t.qrTitle}</h2>
              <p className="bth-sub">
                {guestPhotoUrl
                  ? t.qrCuttingSub
                  : t.qrSub}
              </p>
              {guestPhotoUrl ? (
                <div className="bth-status" role="status">
                  <RetroProgress label={t.cuttingOut} />
                  <p>{t.cuttingOutLong}</p>
                </div>
              ) : sessionExpired ? (
                <div className="bth-side-actions">
                  <button
                    type="button"
                    onClick={() => proceedToMode('together')}
                    className="rt-btn rt-btn--primary rt-btn--lg rt-btn--block"
                  >
                    <PixelIcon name="qr" size={40} /> {t.qrRemake}
                  </button>
                </div>
              ) : qrDataUrl ? (
                <>
                  <p className="bth-session rt-pixel">{sessionCode}</p>
                  <div className="bth-status" role="status">
                    <RetroProgress label={t.waitingUpload} />
                    <p>{t.waitingUpload}...</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* ---------- 매장 포토카드 스캔 ---------- */}
        {step === 'scan' && (
          // 키오스크라 스크롤이 생기면 안 된다. 카메라와 키패드를 좌우로 나눠 한 화면에 담는다
          <div className="bth-split">
            <div className="bth-split-main">
              <div className="bth-viewport">
                {cameraError ? (
                  <div className="bth-empty">
                    <PixelIcon name="warning" size={96} />
                    <p className="bth-error">{cameraError}</p>
                  </div>
                ) : (
                  <div className="rt-viewer bth-live bth-live--wide">
                    {renderLiveView('bth-live-media bth-mirror')}
                    {renderCameraStatus()}
                    {/* 조준 가이드 */}
                    <div className="bth-aim" aria-hidden="true">
                      <span />
                    </div>
                    {scanBusy && (
                      <div className="bth-overlay-center">
                        <RetroWindow className="bth-mini" icon="qr" title="SCANNING">
                          <RetroProgress label={t.cardChecking} />
                        </RetroWindow>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* QR이 안 읽힐 때 — 카드에 인쇄된 번호로 진행.
                부스는 터치스크린이라 물리 키보드가 없을 수 있어 화면 키패드를 제공한다. */}
            <div className="bth-split-side">
              <h2 className="bth-display bth-h2">{t.scanTitle}</h2>
              <p className="bth-sub bth-scan-sub">{t.scanSub}</p>
              <div className="rt-group bth-manual">
                <span className="rt-group-label">{t.scanManual}</span>
                {/* 입력 칸 — 몇 자 들어갔는지 한눈에 보이게 */}
                <div className="bth-code">
                  {Array.from({ length: CARD_CODE_LENGTH }).map((_, i) => (
                    <div
                      key={i}
                      className="bth-code-cell rt-field"
                      data-current={i === manualCode.length && !scanBusy}
                    >
                      {manualCode[i] ?? ''}
                    </div>
                  ))}
                </div>
                {/* 화면 키패드 */}
                <div className="bth-alpha">
                  {CARD_ALPHABET.split('').map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => pressCardKey(ch)}
                      disabled={scanBusy}
                      className="rt-btn"
                    >
                      {ch}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => pressCardKey('back')}
                    disabled={scanBusy}
                    aria-label={t.keypadDelete}
                    className="rt-btn"
                  >
                    <PixelIcon name="backspace" size={32} />
                  </button>
                </div>
                <p className="bth-error" role="alert">
                  {scanError}
                </p>
              </div>
              <div className="bth-side-actions">
                <button type="button" onClick={resetAll} className="rt-btn rt-btn--block">
                  <PixelIcon name="arrowLeft" size={32} /> {t.back}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 템플릿(최애 컷) 선택 ---------- */}
        {step === 'template' && (
          <div className="bth-templates">
            <div className="bth-heading">
              <h2 className="bth-display bth-h2">{t.templateTitle}</h2>
              <p className="bth-sub">{t.templateSub}</p>
            </div>
            <div className="bth-files">
              {templates.map((tpl) => (
                <button key={tpl.id} type="button" onClick={() => selectTemplate(tpl)} className="bth-file">
                  <span className="rt-viewer bth-file-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tpl.image_url} alt={tpl.title} />
                  </span>
                  <span className="bth-file-name">
                    <PixelIcon name="photo" size={28} />
                    {tpl.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- 카메라 촬영 ---------- */}
        {/* 가로 모니터: 미리보기는 남는 높이를 꽉 채우고, 안내·버튼은 오른쪽 열 */}
        {step === 'camera' && (
          <div className="bth-split">
            <div className="bth-split-main">
              <div className="bth-viewport">
                {cameraError ? (
                  <div className="bth-empty">
                    <PixelIcon name="warning" size={96} />
                    <p className="bth-error">{cameraError}</p>
                  </div>
                ) : (
                  <div
                    className={`rt-viewer bth-live ${liveComposeReady ? 'bth-live--compose' : 'bth-live--print'}`}
                    {...liveGestures}
                    style={{ touchAction: 'none' }}
                  >
                    {/* 최애와 찍기는 합성 결과를, 나머지는 인화 비율(2:3) 그대로 보여준다 */}
                    {renderLiveView(
                      liveComposeReady
                        ? 'absolute opacity-0 pointer-events-none w-px h-px'
                        : 'bth-live-media bth-mirror'
                    )}
                    {/* 오려낸 인물을 실시간으로 겹쳐 보여준다 — 촬영 전에 손가락으로 끌어 자리를 잡는다.
                        위치는 편집 화면과 같은 guestLayer 라 찍은 뒤에도 그대로 이어진다 */}
                    {showLiveCutout && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cutoutPreviewUrl ?? undefined}
                        alt={t.cutoutPersonAlt}
                        draggable={false}
                        className="absolute drop-shadow-2xl select-none pointer-events-none"
                        style={{
                          left: `${(guestLayer.x / CANVAS_W) * 100}%`,
                          top: `${(guestLayer.y / CANVAS_H) * 100}%`,
                          width: `${guestLayer.scale * 100}%`,
                          transform: `translate(-50%, -50%) rotate(${guestLayer.rotation}deg)${guestLayer.flip ? ' scaleX(-1)' : ''}`,
                        }}
                      />
                    )}
                    {liveComposeReady && (
                      <canvas
                        ref={attachLivePreview}
                        width={PREVIEW_W}
                        height={PREVIEW_H}
                        className="bth-live-media"
                      />
                    )}
                    {mode === 'template' && !templateGeometry && (
                      <div className="bth-overlay-center bth-overlay-dim">
                        <RetroWindow className="bth-mini" icon="folder" title="LOADING">
                          <RetroProgress label={t.cutPreparing} />
                        </RetroWindow>
                      </div>
                    )}
                    {countdown !== null && (
                      <div className="bth-overlay-center">
                        <motion.span
                          key={countdown}
                          initial={{ scale: 1.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bth-count"
                        >
                          {countdown}
                        </motion.span>
                      </div>
                    )}
                    {renderCameraStatus()}
                    {flash && <div className="bth-flash" />}
                    {shotProgress && (
                      <div className="bth-live-tag bth-live-tag--left rt-pixel">
                        {shotProgress.current} / {shotProgress.total}
                      </div>
                    )}
                    {mode === 'card' && scannedCard && (
                      <div className="bth-live-tag bth-live-tag--right">{scannedCard.title}</div>
                    )}
                    {mode === 'together' && guestPhotoUrl && (
                      <div className="bth-guest-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={guestPhotoUrl} alt={t.uploadedPhotoAlt} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bth-split-side">
              <h2 className="bth-display bth-h2">
                {mode === 'together'
                  ? t.camTogether
                  : mode === 'template'
                    ? shotProgress?.current === 2
                      ? t.camLastSolo
                      : standSideText
                    : t.camLook}
              </h2>
              {liveLookName && (
                <p className="bth-sub">
                  {liveLookName}
                </p>
              )}
              {idolOn && <p className="bth-sub">{t.cameraHint}</p>}
              {mode === 'template' && shotProgress?.current !== 2 && (
                <p className="bth-sub">{t.printAsSeen}</p>
              )}

              {/* 컷 수 선택 (일반 촬영만 — 행사 AI 아이돌 사진은 한 컷) */}
              {mode === 'solo' && !idolOn && (
                <div className="bth-seg" role="group" aria-label={t.cutCountAria}>
                  {([1, 4] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setCutCount(count)}
                      disabled={shooting}
                      aria-pressed={cutCount === count}
                      className="rt-choice"
                    >
                      {count === 1 ? t.cutOne : t.cutFour}
                    </button>
                  ))}
                </div>
              )}

              {shooting && shots.length > 0 && (
                <div className="bth-shots">
                  {shots.map((shot, index) => (
                    <motion.img
                      key={shot}
                      initial={{ opacity: 0, scale: 0.7, rotate: -5 }}
                      animate={{ opacity: 1, scale: 1, rotate: index % 2 ? 3 : -2 }}
                      src={shot}
                      alt={t.shotAlt(index + 1)}
                      className="bth-shot"
                    />
                  ))}
                </div>
              )}

              {showLiveCutout && !shooting && (
                <div className="bth-adjust">
                  <p className="bth-sub">
                    {t.dragHint}
                  </p>
                  <label className="bth-range-label">
                    {t.personSize}
                    <input
                      type="range"
                      min={LAYER_SCALE_MIN}
                      max={LAYER_SCALE_MAX}
                      step={0.01}
                      value={guestLayer.scale}
                      onChange={(e) => setGuestLayer((prev) => ({ ...prev, scale: Number(e.target.value) }))}
                      className="rt-range"
                    />
                  </label>
                  <button
                    type="button"
                    className="rt-choice bth-flip"
                    aria-pressed={guestLayer.flip}
                    onClick={() => setGuestLayer((prev) => ({ ...prev, flip: !prev.flip }))}
                  >
                    {t.flip}
                  </button>
                </div>
              )}

              <div className="bth-side-actions">
                <button
                  type="button"
                  onClick={startShooting}
                  disabled={!!cameraError || shooting || !liveReady}
                  className="rt-btn rt-btn--primary rt-btn--lg rt-btn--block"
                >
                  <PixelIcon name="camera" size={44} />
                  {mode === 'template'
                    ? t.shootTemplate
                    : cutCount === 4
                      ? t.shootFour
                      : t.shoot}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 합성 · 프레임 편집 ---------- */}
        {step === 'compose' && (
          // AI 아이돌 사진은 3단(왼쪽 인화 디자인 4종 · 가운데 미리보기 · 오른쪽 진행·버튼) — 스크롤 없이 한눈에
          <div className={idolOn && idolShot ? 'bth-split bth-split--3' : 'bth-split'}>
            {idolOn && idolShot && (
              <div className="bth-split-left">
                <div className="rt-group">
                  <span className="rt-group-label">{t.groupDesign}</span>
                  <IdolDesignPicker conceptId={stageConceptId} value={idolDesignId} onChange={setIdolDesignId}
                    main={idolImage ?? idolShotImage} before={idolImage ? idolShotImage : null}
                    event={stageMakeup?.eventLines[0] ?? ''} variant="retro" lang={lang} />
                </div>
              </div>
            )}
            <div className="bth-split-main">
              <div className="bth-viewport">
                <div className="rt-viewer bth-canvas-wrap">
                  <canvas
                    ref={attachComposeCanvas}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    {...composeGestures}
                    className="bth-canvas"
                    style={{ touchAction: 'none' }}
                  />
                </div>
              </div>
              {(overlayAdjustable || mode === 'template') && (
                <p className="bth-hint">
                  {mode === 'template' ? t.dragHintPhoto : t.dragHintPerson}
                </p>
              )}
              {composeError && (
                <p className="bth-error" role="alert">
                  {composeError}
                </p>
              )}
            </div>

            <div className="bth-split-side">
              {/* 행사 모드: AI 아이돌 사진(만드는 중·완성·다시 만들기) */}
              {idolOn && idolShot && (
                <div className="rt-group">
                  <span className="rt-group-label">{t.groupIdol(findIdolConcept(stageConceptId)?.tag ?? 'ON STAGE')}</span>
                  <IdolStagePanel stage={idol} conceptId={stageConceptId} variant="retro" lang={lang} />
                </div>
              )}
              {/* 프레임 선택(AI 아이돌 사진은 왼쪽 열의 인화 디자인으로 대신) */}
              {!(idolOn && idolShot) && (
              <div className="rt-group">
                <span className="rt-group-label">{t.groupFrame}</span>
                <FramePicker frames={modeFrames} selected={selectedFrame} onSelect={setSelectedFrame} variant="retro" lang={lang} />
                {modeFrames.length === 0 && (
                  <p className="bth-group-text">{t.noFrames}</p>
                )}
              </div>
              )}

              {/* 최애와 찍기: 합성 위치·크기 */}
              {mode === 'template' && templateGeometry && (
                <div className="bth-stack">
                  {selectedTemplate?.foreground_url ? (
                    <div className="rt-group">
                      <span className="rt-group-label">{t.sameSpace}</span>
                      <p className="bth-group-text">{t.sameSpaceDesc}</p>
                    </div>
                  ) : (
                    <div className="rt-group">
                      <label className="bth-toggle">
                        <span>{t.keyingToggle}</span>
                        <input
                          type="checkbox"
                          checked={keying.enabled}
                          onChange={(e) => setKeying((prev) => ({ ...prev, enabled: e.target.checked }))}
                          className="rt-checkbox"
                        />
                      </label>
                      <p className="bth-group-text">
                        {t.keyingDesc}
                      </p>
                      {keying.enabled && (
                        <label className="bth-range-label">
                          {t.keyingStrength}
                          <input
                            type="range"
                            min={0.08}
                            max={0.45}
                            step={0.01}
                            value={keying.tolerance}
                            onChange={(e) => setKeying((prev) => ({ ...prev, tolerance: Number(e.target.value) }))}
                            className="rt-range"
                          />
                        </label>
                      )}
                    </div>
                  )}
                  {/* 슬라이더는 가로로 나란히 — 줌 150% 에서 아래 버튼이 화면 밖으로 밀리지 않게 */}
                  <div className="bth-sliders">
                    <label className="bth-range-label">
                      {t.zoom}
                      <input
                        type="range"
                        min={FIT_ZOOM_MIN}
                        max={FIT_ZOOM_MAX}
                        step={0.01}
                        value={guestFit.zoom}
                        onChange={(e) => setGuestFit((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
                        className="rt-range"
                      />
                    </label>
                    <label className="bth-range-label">
                      {t.posX}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={guestFit.focalX}
                        onChange={(e) => setGuestFit((prev) => ({ ...prev, focalX: Number(e.target.value) }))}
                        className="rt-range"
                      />
                    </label>
                    <label className="bth-range-label">
                      {t.posY}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={guestFit.focalY}
                        onChange={(e) => setGuestFit((prev) => ({ ...prev, focalY: Number(e.target.value) }))}
                        className="rt-range"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* 포카·직찍 합성: 배경 지우기 + 크기·기울기 */}
              {overlayAdjustable && (
                <div className="bth-stack">
                  {mode === 'together' && (
                    <div className="rt-group">
                      <label className="bth-toggle">
                        <span>{t.cutoutToggle}</span>
                        <input
                          type="checkbox"
                          checked={useCutout && cutoutStatus === 'done'}
                          disabled={cutoutStatus !== 'done'}
                          onChange={(e) => setUseCutout(e.target.checked)}
                          className="rt-checkbox"
                        />
                      </label>
                      <p className="bth-group-text">
                        {cutoutStatus === 'processing' && t.cutoutProcessing}
                        {cutoutStatus === 'done' && t.cutoutDone}
                        {cutoutStatus === 'failed' && t.cutoutFailed}
                        {cutoutStatus === 'idle' && t.cutoutIdle}
                      </p>
                      {cutoutStatus === 'processing' && <RetroProgress label={t.cutoutFinding} />}
                    </div>
                  )}
                  <div className="bth-sliders bth-sliders--2">
                    <label className="bth-range-label">
                      {useCutout && cutoutStatus === 'done' ? t.personSize : t.photoSize}
                      <input
                        type="range"
                        min={LAYER_SCALE_MIN}
                        max={LAYER_SCALE_MAX}
                        step={0.01}
                        value={guestLayer.scale}
                        onChange={(e) => setGuestLayer((prev) => ({ ...prev, scale: Number(e.target.value) }))}
                        className="rt-range"
                      />
                    </label>
                    <label className="bth-range-label">
                      {t.tilt}
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={guestLayer.rotation}
                        onChange={(e) => setGuestLayer((prev) => ({ ...prev, rotation: Number(e.target.value) }))}
                        className="rt-range"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="rt-choice bth-flip"
                    aria-pressed={guestLayer.flip}
                    onClick={() => setGuestLayer((prev) => ({ ...prev, flip: !prev.flip }))}
                  >
                    {t.flip}
                  </button>
                </div>
              )}

              <div className="bth-side-actions">
                {finishing && <RetroProgress label={t.making} />}
                <button
                  type="button"
                  onClick={finishCompose}
                  disabled={finishing || idolBusy}
                  className="rt-btn rt-btn--primary rt-btn--lg rt-btn--block"
                >
                  <PixelIcon name="check" size={44} /> {idolBusy ? t.waitingAi : t.finish}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShots([])
                    setStep('camera')
                  }}
                  className="rt-btn rt-btn--block"
                >
                  <PixelIcon name="camera" size={32} /> {t.retake}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 결과 ---------- */}
        {step === 'result' && resultUrl && (
          <div className="bth-split">
            {/* 사진 칸은 남는 높이만큼 — aspect 로 자리를 미리 잡아 둬야 큰 사진을 늦게 그려도 옆 버튼이 밀리지 않는다 */}
            <div className="bth-split-main">
              <div className="bth-viewport">
                <div className="rt-viewer bth-result-view">
                  <motion.img
                    src={resultUrl}
                    alt={t.resultAlt}
                    className="bth-result-img"
                    initial={{ opacity: 0, y: 80, rotate: -4, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 110, damping: 14 }}
                  />
                </div>
              </div>
              {event?.organizer && <p className="bth-hint">AC&apos;SCENT WOW × {event.organizer}</p>}
            </div>
            <div className="bth-split-side">
              <div className="bth-side-actions bth-side-actions--top">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={printStatus === 'printing'}
                  className="rt-btn rt-btn--primary rt-btn--lg rt-btn--block"
                >
                  <PixelIcon name={printStatus === 'printing' ? 'hourglass' : 'printer'} size={44} />
                  {printStatus === 'printing' ? t.printSending : t.print}
                </button>
                {printStatus === 'printing' && <RetroProgress label={t.printSending} />}
                {printStatus === 'sent' && (
                  <div className="bth-print-status" role="status">
                    <p>
                      <PixelIcon name="printer" size={32} />
                      {printWaitLeft !== null
                        ? t.printComing(printWaitLeft)
                        : t.printPickup}
                    </p>
                    {printWaitLeft !== null && <RetroProgress label={t.printInProgress} />}
                  </div>
                )}
                {printStatus === 'failed' && (
                  <p className="bth-error" role="alert">
                    <PixelIcon name="warning" size={28} /> {t.printFailed}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={saveStatus === 'uploading'}
                  className="rt-btn rt-btn--block"
                >
                  <PixelIcon name={saveStatus === 'uploading' ? 'hourglass' : 'floppy'} size={32} />
                  {saveStatus === 'uploading' ? t.qrMaking : t.saveImage}
                </button>
                {saveStatus === 'uploading' && <RetroProgress label={t.qrMaking} />}
                {saveStatus === 'failed' && (
                  <p className="bth-error" role="alert">
                    {t.qrFailed}
                  </p>
                )}
                <button type="button" onClick={() => setStep('compose')} className="rt-btn rt-btn--block">
                  <PixelIcon name="palette" size={32} /> {t.reEdit}
                </button>

                {/* 생카 인증 문화: 해시태그 안내 */}
                {event?.hashtag && (
                  <div className="rt-group bth-hashtag">
                    <p>{t.hashtagLabel}</p>
                    <b>{event.hashtag}</b>
                  </div>
                )}
              </div>
              <div className="bth-side-actions">
                <button type="button" onClick={resetAll} className="rt-btn rt-btn--block">
                  <PixelIcon name="home" size={32} /> {t.backHome}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.main>
      </AnimatePresence>
          </div>

          <footer className="rt-win-status">
            <span className="rt-status-cell rt-status-cell--grow rt-pixel">{boothMode.brandLine.replace(' · ', ' — ')}</span>
            {eventPeriod && <span className="rt-status-cell">{eventPeriod}</span>}
            <span className="rt-status-cell rt-pixel">{stepMeta.label}</span>
          </footer>
        </section>
      </div>

      {/* [이미지 저장] QR — 손님이 폰으로 찍어 갤러리에 저장한다 */}
      <AnimatePresence>
        {saveQrOpen && saveQr && step === 'result' && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.saveQrAria}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rt-scrim"
            style={{ zIndex: 62 }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setSaveQrOpen(false)
            }}
          >
            <motion.div initial={{ y: 16 }} animate={{ y: 0 }} className="bth-dialog bth-dialog--wide">
              <RetroWindow icon="phone" title="SAVE TO PHONE" onClose={() => setSaveQrOpen(false)} closeLabel={t.close}>
                <div className="bth-saveqr">
                  <div className="bth-qr rt-field">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={saveQr.qrDataUrl} alt={t.saveQrAlt} />
                  </div>
                  <div className="bth-saveqr-text">
                    <h2 className="bth-h2">{t.saveQrTitle}</h2>
                    <ol className="bth-steps">
                      <li>{t.saveQrStep1}</li>
                      <li>
                        {t.saveQrStep2[0]}<b>{t.photoSave}</b>{t.saveQrStep2[1]}
                      </li>
                    </ol>
                    <p className="bth-sub">{t.photoAutoDelete(RESULT_PHOTO_TTL_HOURS)}</p>
                    <button
                      type="button"
                      onClick={() => setSaveQrOpen(false)}
                      className="rt-btn rt-btn--primary rt-btn--block"
                    >
                      {t.close}
                    </button>
                  </div>
                </div>
              </RetroWindow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 이용권을 못 쓸 때 — 이유를 크게 보여 준다(8초 뒤 저절로 닫힘) */}
      <AnimatePresence>
        {passAlert && (
          <motion.div
            role="alertdialog"
            aria-live="assertive"
            aria-label={passAlert.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rt-scrim"
            style={{ zIndex: 64 }}
            onClick={() => setPassAlert(null)}
          >
            <motion.div initial={{ y: 16 }} animate={{ y: 0 }} className="bth-dialog" onClick={(event) => event.stopPropagation()}>
              <RetroWindow icon="warning" title="TICKET">
                <div className="bth-idle">
                  <PixelIcon name="warning" size={72} />
                  <h2 className="bth-h2">{passAlert.title}</h2>
                  <p className="bth-sub">{passAlert.message}</p>
                  <div className="bth-idle-actions">
                    <button type="button" onClick={() => setPassAlert(null)} className="rt-btn rt-btn--primary">
                      {t.confirm}
                    </button>
                  </div>
                </div>
              </RetroWindow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 처음 화면 복귀 안내 — 키오스크와 같은 형태. 화면 어디를 눌러도 닫히고 시간이 다시 채워진다 */}
      <AnimatePresence>
        {idleLeft !== null && (
          <motion.div
            role="alertdialog"
            aria-live="assertive"
            aria-label={t.idleTitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rt-scrim"
            style={{ zIndex: 65 }}
          >
            <motion.div initial={{ y: 16 }} animate={{ y: 0 }} className="bth-dialog">
              <RetroWindow icon="hourglass" title="STANDBY">
                <div className="bth-idle">
                  <span className="bth-idle-count rt-pixel">{idleLeft}</span>
                  <RetroProgress value={idleLeft / IDLE_WARN_S} blocks={IDLE_WARN_S} label={t.idleRemaining} />
                  <h2 className="bth-h2">{sessionDone ? t.idleDoneTitle : t.idleTitle}</h2>
                  <p className="bth-sub">
                    {sessionDone ? (
                      <>
                        {t.idleDoneLines[0]}
                        <br />
                        {t.idleDoneLines[1]}
                      </>
                    ) : (
                      t.idleTouch
                    )}
                  </p>
                  {sessionDone ? (
                    <div className="bth-idle-actions">
                      {/* 누르는 순간(pointerdown) 팝업이 닫히며 결과 화면에 남는다 */}
                      <button type="button" className="rt-btn">
                        {t.keepViewing}
                      </button>
                      <button
                        type="button"
                        // 이 버튼만은 '시간 채우기'로 삼키지 않고 바로 처음으로 보낸다
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={resetAll}
                        className="rt-btn rt-btn--primary"
                      >
                        {t.home}
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="rt-btn rt-btn--primary rt-btn--block">
                      {t.continue}
                    </button>
                  )}
                </div>
              </RetroWindow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 매장 관리자용 숨김 핫스팟 — 누르거나 1.5초 길게 누르면 동일한 인증창 */}
      <button
        type="button"
        aria-label="매장 관리자 설정 열기"
        disabled={shooting || finishing || passLoading || printStatus === 'printing'}
        onPointerDown={startAdminHold}
        onPointerUp={cancelAdminHold}
        onPointerCancel={cancelAdminHold}
        onClick={() => {
          if (!adminHoldTriggered.current) openAdmin()
          adminHoldTriggered.current = false
        }}
        onContextMenu={(event) => event.preventDefault()}
        className="fixed bottom-0 right-0 z-[60] h-20 w-20 select-none opacity-0 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-pink-300 [touch-action:none] [-webkit-touch-callout:none]"
      />
      {adminHolding && (
        <div className="pointer-events-none fixed bottom-3 right-3 z-[61] h-14 w-14">
          <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
            <circle cx="28" cy="28" r="23" fill="rgba(28,36,85,0.55)" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
            <motion.circle
              cx="28"
              cy="28"
              r="23"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="square"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: ADMIN_HOLD_MS / 1000, ease: 'linear' }}
            />
          </svg>
        </div>
      )}

      <AnimatePresence>
        {backgroundAdminOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="포토부스 매장 관리자"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rt-scrim"
            style={{ zIndex: 70 }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closeAdmin()
            }}
          >
            <motion.div
              ref={backgroundDialogRef}
              initial={{ y: 24 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className={`bth-dialog ${backgroundAdminUnlocked ? 'bth-dialog--admin' : ''}`}
            >
              <RetroWindow
                icon="lock"
                title="STORE ADMIN"
                onClose={closeAdmin}
                closeLabel="닫기"
                bodyClassName="bth-admin-body"
              >
                {/* 잠금 해제 후엔 창 제목(STORE ADMIN)으로 충분 — 제목 줄 높이를 목록에 준다 */}
                <h2 className={backgroundAdminUnlocked ? 'sr-only' : 'bth-h2'}>{backgroundAdminUnlocked ? '부스 설정' : '비밀번호 입력'}</h2>

                {!backgroundAdminUnlocked ? (
                  <div className="bth-pin">
                    <p className="bth-sub">관리자 비밀번호 6자리를 눌러주세요</p>
                    <div
                      className="bth-pin-dots rt-field"
                      aria-label={`${backgroundPassword.length}자리 입력됨`}
                      style={{ marginTop: 14 }}
                    >
                      {Array.from({ length: 6 }, (_, i) => (
                        <i key={i} data-filled={i < backgroundPassword.length} />
                      ))}
                    </div>
                    <p className="bth-error" role="status">
                      {backgroundUnlocking ? '인증 확인 중…' : backgroundPasswordError}
                    </p>
                    <div className="bth-keypad">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          disabled={backgroundUnlocking}
                          onClick={() => pressAdminKey(digit)}
                          className="rt-btn"
                        >
                          {digit}
                        </button>
                      ))}
                      <div />
                      <button
                        type="button"
                        disabled={backgroundUnlocking}
                        onClick={() => pressAdminKey('0')}
                        className="rt-btn"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        aria-label="지우기"
                        disabled={backgroundUnlocking}
                        onClick={() => pressAdminKey('back')}
                        className="rt-btn"
                      >
                        <PixelIcon name="backspace" size={40} />
                      </button>
                    </div>
                  </div>
                ) : (
                  // 가로 화면이라 좌우 2분할 — 왼쪽: 화면 크기·디자인(넘치면 스크롤) + 앱 종료·닫기(항상 보임),
                  // 오른쪽: 화면 배경 제목 줄(이벤트 배경·포토카드 QR·새로고침) + 목록이 창 높이를 다 쓴다(줌 150~175% 에서 위아래로 쌓으면 목록이 한 줄도 안 보였다)
                  <div className="bth-admin-split">
                  <div className="bth-admin-main">
                  <div className="bth-admin-settings rt-scroll">
                    <BoothModeControls value={deviceBaseSettings.mode} pass={deviceBaseSettings.pass} onSave={saveSettings} onSelectBackground={selectBackground} disabled={!!backgroundSaving} />
                    {screenZoom !== null && (
                      <div className="bth-zoom">
                        <b>화면 크기</b>
                        <div className="bth-zoom-opts">
                          {SCREEN_ZOOM_OPTIONS.map((factor) => (
                            <button
                              key={factor}
                              type="button"
                              onClick={() => selectScreenZoom(factor)}
                              aria-pressed={Math.abs(screenZoom - factor) < 0.01}
                              className="rt-choice"
                            >
                              {Math.round(factor * 100)}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <DeviceDesignControls
                      settings={deviceBaseSettings}
                      onSave={saveSettings}
                      disabled={!!backgroundSaving}
                      sample="어떤 사진을 찍을까요? ACSCENT PHOTO"
                      compact
                      eventFont={screenLiveEvent?.font ? { title: screenLiveEvent.title, font: screenLiveEvent.font } : null}
                    />
                  </div>
                    <div className="bth-admin-actions">
                      <button type="button" onClick={askQuitBooth} className="rt-btn rt-btn--danger">
                        <PixelIcon name="close" size={28} /> 앱 종료
                      </button>
                      <button type="button" onClick={closeAdmin} className="rt-btn rt-btn--primary">
                        닫기
                      </button>
                    </div>
                    {exitNotice && <p className="bth-admin-note" role="status">{exitNotice}</p>}
                  </div>
                  <section className="bth-admin-bgs" aria-label="화면 배경">
                    <div className="bth-admin-toolbar">
                      <b>
                        화면 배경 · {backgrounds.length}개
                        <em role="status">
                          {backgroundSaving ? '서버에 저장하는 중…' : backgroundsLoading ? '불러오는 중…' : ''}
                        </em>
                      </b>
                      {/* 이벤트 배경·포토카드 QR — 제목과 새로고침 사이 */}
                      <DeviceAdminTools target="booth" onApplied={() => void refreshBackgrounds()} liveTitle={screenLiveEvent?.title} />
                      <button
                        type="button"
                        className="rt-btn"
                        disabled={backgroundsLoading || !!backgroundSaving}
                        onClick={() => void refreshBackgrounds()}
                      >
                        새로고침
                      </button>
                    </div>
                    {(backgroundActionError || backgroundsError) && (
                      <p role="alert" className="bth-admin-error">
                        {backgroundActionError || backgroundsError}
                      </p>
                    )}
                    <div className="bth-bg-grid rt-scroll">
                      {backgrounds.map((record) => {
                        const background = toBoothTheme(record)
                        return (
                          <button
                            key={background.id}
                            type="button"
                            disabled={!!backgroundSaving}
                            aria-pressed={backgroundId === background.id}
                            onClick={() => void chooseBackground(background.id)}
                            className="rt-choice bth-bg-tile"
                          >
                            <span className="bth-bg-thumb">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={record.thumbnail_url || background.image}
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                              <span
                                className="bth-bg-sample"
                                style={{
                                  fontFamily: retroDesk.displayFont,
                                  fontWeight: retroDesk.displayWeight,
                                  letterSpacing: retroDesk.displayTracking,
                                }}
                              >
                                어떤 사진을 찍을까요?
                              </span>
                            </span>
                            <span className="bth-bg-name">
                              <b>{background.title}</b>
                              <em>{background.id === backgroundId ? '적용 중' : '선택'}</em>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                  </div>
                )}
              </RetroWindow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  )
}
