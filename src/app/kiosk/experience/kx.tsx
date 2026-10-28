'use client'

// 체험 모드 공용 부품 — 일곱 모드(네일·명함·스킨케어·캐리커처·보이스·직업 탐색·메이크업)가 같이 쓴다.
// 화면 틀(ExperienceApp)이 언어·처음으로·무입력·관리자 창을 맡고, 모드는 이 문맥(useKx)으로 그것들을 쓴다.
// 모양은 experience.css(공통) + 모드별 CSS. 글자·버튼은 모두 실제 부품이다(목업 이미지를 깔지 않는다).

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, CameraOff, Check, Download, Home, Loader2, Printer, RefreshCw, X } from 'lucide-react'
import type { ExperienceId } from '@/lib/kiosk/experience'
import { KIOSK_LANGS, type KioskLang, type KioskText } from '@/lib/kiosk/i18n'
import { getKioskBridge } from '@/lib/kiosk/kiosk-bridge'
import { OnScreenKeyboard } from '../classic/OnScreenKeyboard'
import type { KxCommonText } from './kx-i18n'
import { renderKxReceipt, type KxReceipt } from './kx-receipt'
import type { KxShare, KxShareFile } from './kx-share'

export type { KxShareFile } from './kx-share'

// ───────────────────────── 문맥 ─────────────────────────

/** 지금 화면의 성격 — 'start'(첫 화면) · 'busy'(처리·카운트다운 중: 무입력 멈춤, 관리자 핫스팟 숨김) · 숫자(무입력 허용 초) */
export type KxScreenKind = 'start' | 'busy' | number

export interface KxContextValue {
  id: ExperienceId
  lang: KioskLang
  setLang: (lang: KioskLang) => void
  /** 키오스크 공용 문구(이전·다음·처음으로·촬영·무입력 안내·키보드) */
  t: KioskText
  /** 체험 모드 공용 문구 */
  c: KxCommonText
  /** 처음으로 — 모드 상태와 언어를 모두 비운다 */
  home: () => void
  setScreen: (kind: KxScreenKind) => void
  /** 결과 올리기 — 휴대폰으로 받기 창과 영수증의 QR 이 같이 쓴다. 같은 결과(cacheKey)는 한 번만 올린다 */
  share: (cacheKey: string, build: () => Promise<KxShareFile[]>) => Promise<KxShare>
  /** 노트북 가로 화면(/kiosk/pc/…) — 영수증 프린터가 없어 결과는 휴대폰 QR 로만 받는다 */
  pc: boolean
}

export const KxContext = createContext<KxContextValue | null>(null)

export function useKx(): KxContextValue {
  const value = useContext(KxContext)
  if (!value) throw new Error('KxContext 밖에서 쓰였습니다')
  return value
}

/** 모드가 단계마다 부른다 — 화면 틀이 무입력 시간과 관리자 핫스팟을 맞춘다 */
export function useKxScreen(kind: KxScreenKind) {
  const { setScreen } = useKx()
  useEffect(() => { setScreen(kind) }, [kind, setScreen])
}

/** 일반 단계의 무입력 허용 시간(초) — 그 뒤 10초 안내 */
export const KX_IDLE = { step: 40, camera: 60, edit: 70, result: 80, save: 150 } as const

// ───────────────────────── 언어 · 머리 ─────────────────────────

export function KxLang() {
  const { lang, setLang, c } = useKx()
  const [open, setOpen] = useState(false)
  return (
    <div className="kx-lang" data-open={open || undefined}>
      <button type="button" className="kx-lang-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={c.langLabel} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
        <span>{KIOSK_LANGS.find((l) => l.id === lang)?.code}</span>
      </button>
      {open && (
        <>
          <button type="button" className="kx-lang-scrim" aria-label={c.langClose} onClick={() => setOpen(false)} />
          <ul className="kx-lang-menu" role="listbox" aria-label={c.langLabel}>
            {KIOSK_LANGS.map((option) => (
              <li key={option.id}>
                <button type="button" role="option" aria-selected={option.id === lang} data-on={option.id === lang || undefined} lang={option.htmlLang} onClick={() => { setLang(option.id); setOpen(false) }}>
                  <span>{option.label}</span>
                  {option.id === lang && <Check size={18} strokeWidth={2.2} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function KxHome({ label, icon = true }: { label?: string; icon?: boolean }) {
  const { home, c } = useKx()
  return (
    <button type="button" className="kx-home" onClick={home}>
      {icon && <Home size={20} strokeWidth={1.9} aria-hidden="true" />}<span>{label ?? c.home}</span>
    </button>
  )
}

export function KxBack({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="kx-home" onClick={onClick}><ArrowLeft size={20} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span></button>
}

/** 머리 한 줄 — 왼쪽·가운데·오른쪽 */
export function KxTop({ left, center, right }: { left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <header className="kx-top">
      <div className="kx-top-side">{left}</div>
      {center && <div className="kx-top-center">{center}</div>}
      <div className="kx-top-side" data-end>{right}</div>
    </header>
  )
}

/** 단계 표시 — 번호 동그라미와 이름. 지난 단계는 체크 */
export function KxSteps({ labels, current, pad = false, compact = false }: { labels: string[]; current: number; pad?: boolean; compact?: boolean }) {
  return (
    <ol className="kx-steps" data-compact={compact || undefined} aria-label={`${current + 1} / ${labels.length}`}>
      {labels.map((label, i) => (
        <li key={i} data-state={i < current ? 'done' : i === current ? 'now' : 'todo'}>
          <span className="kx-step-dot" aria-hidden="true">{i < current ? <Check size={15} strokeWidth={2.6} /> : pad ? String(i + 1).padStart(2, '0') : i + 1}</span>
          {label && <span className="kx-step-label">{label}</span>}
        </li>
      ))}
    </ol>
  )
}

// ───────────────────────── 첫 화면 ─────────────────────────

/** 첫 화면의 공통 뼈대 — 큰 글자, 한 줄 소개, 그림, 설명, 시작 버튼. 모드마다 색·글꼴·그림만 다르다 */
export function KxStart({ brand, wordmark, headline, art, children, cta, onStart, foot }: {
  /** 왼쪽 위 작은 이름(VIRTUAL NAIL STUDIO) */
  brand: ReactNode
  wordmark: ReactNode
  headline: ReactNode
  art: ReactNode
  /** 그림 아래 — 한 줄 설명·칩·단계 */
  children?: ReactNode
  cta: string
  onStart: () => void
  foot?: string
}) {
  useKxScreen('start')
  return (
    <section className="kx-start">
      <header className="kx-start-bar"><span className="kx-start-brand">{brand}</span><KxLang /></header>
      <h1 className="kx-wordmark">{wordmark}</h1>
      <p className="kx-headline">{headline}</p>
      <div className="kx-start-art" aria-hidden="true">{art}</div>
      {children && <div className="kx-start-info">{children}</div>}
      <button type="button" className="kx-btn kx-btn--primary kx-cta" onClick={onStart}>
        <span>{cta}</span><ArrowRight size={30} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {foot && <p className="kx-foot">{foot}</p>}
    </section>
  )
}

/** 안쪽 화면 뼈대 — 머리(children 앞부분)와 본문, 바닥 버튼 줄 */
export function KxPage({ name, children }: { name: string; children: ReactNode }) {
  return <section className="kx-page" data-page={name}>{children}</section>
}
export function KxActions({ children }: { children: ReactNode }) {
  return <div className="kx-actions">{children}</div>
}
export function KxFoot({ children }: { children: ReactNode }) {
  return <p className="kx-foot">{children}</p>
}

// ───────────────────────── 카메라 ─────────────────────────

export interface KxCamera {
  state: 'starting' | 'ready' | 'error'
  /** <video ref> */
  attach: (el: HTMLVideoElement | null) => void
  countdown: number | null
  /** 3 · 2 · 1 뒤에 찍는다 */
  shoot: (onPhoto: (photo: string) => void) => void
  /** 지금 미리보기 영상 — 찍기 전에 화면을 읽어 안내할 때(네일의 손 안내) */
  element: () => HTMLVideoElement | null
}

/** 찍히는 사진의 비율(가로/세로) — 액자도 같은 비율이어야 미리보기에 보이던 그대로 찍힌다 */
export const KX_PHOTO_RATIO = 3 / 4
const PHOTO_LONG_EDGE = 1280
/** 손톱처럼 작은 것을 볼 때(sharp) — 카메라가 주는 가장 큰 영상으로 받아 더 크게 찍는다 */
const SHARP_LONG_EDGE = 1600
const SHARP_VIDEO = { width: { ideal: 2560 }, height: { ideal: 1440 } }
const USUAL_VIDEO = { width: { ideal: 1280 }, height: { ideal: 960 } }

/**
 * 카메라 켜기·끄기와 촬영. active 가 꺼지면 장치를 놓는다.
 * sharp: 큰 영상으로 받는다. 매장 PC 가 그 영상을 못 따라가면(초당 10장 미만) 평소 크기로 내린다.
 */
export function useKxCamera(active: boolean, { sharp = false, ratio = KX_PHOTO_RATIO }: { sharp?: boolean; /** 찍는 비율(가로/세로) — 여럿이 찍을 때는 가로로 */ ratio?: number } = {}): KxCamera {
  const [state, setState] = useState<KxCamera['state']>('starting')
  const [countdown, setCountdown] = useState<number | null>(null)
  const video = useRef<HTMLVideoElement | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const play = useCallback(() => {
    const el = video.current
    if (!el || !stream.current) return
    if (el.srcObject !== stream.current) el.srcObject = stream.current
    void el.play().catch(() => { /* 다음 attach 때 다시 */ })
  }, [])

  useEffect(() => {
    if (!active) return
    let alive = true
    let retry: number | undefined
    let rate: number | undefined
    const start = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', ...(sharp ? SHARP_VIDEO : USUAL_VIDEO) }, audio: false })
        if (!alive) { media.getTracks().forEach((track) => track.stop()); return }
        stream.current = media
        setState('ready')
        play()
        // 큰 영상이 버거운 기기인지 잠깐 재 본다 — 실제로 화면에 나온 장수로(설정값이 아니라)
        if (sharp) rate = window.setTimeout(() => {
          const el = video.current
          const before = el?.getVideoPlaybackQuality?.().totalVideoFrames
          if (!el || before === undefined) return
          rate = window.setTimeout(() => {
            const shown = el.getVideoPlaybackQuality().totalVideoFrames - before
            if (shown < 25) void media.getVideoTracks()[0]?.applyConstraints(USUAL_VIDEO).catch(() => { /* 그대로 쓴다 */ })
          }, 2500)
        }, 900)
      } catch {
        if (!alive) return
        setState('error')
        // 선이 잠깐 빠졌다 돌아오는 일이 있다 — 손님이 화면에 머무는 동안 계속 다시 본다
        retry = window.setTimeout(start, 3000)
      }
    }
    void start()
    return () => {
      alive = false
      window.clearTimeout(retry)
      window.clearTimeout(rate)
      window.clearInterval(timer.current)
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      setCountdown(null)
      setState('starting')
    }
  }, [active, play, sharp])

  const attach = useCallback((el: HTMLVideoElement | null) => {
    video.current = el
    if (el) play()
  }, [play])

  const capture = useCallback((): string | null => {
    const el = video.current
    if (!el || !el.videoWidth) return null
    // 가운데에서 비율(기본 3:4)대로 자른다. 거울처럼 보이던 그대로(좌우 반전) 찍는다
    const sw = Math.min(el.videoWidth, el.videoHeight * ratio)
    const sh = sw / ratio
    const scale = Math.min(1, (sharp ? SHARP_LONG_EDGE : PHOTO_LONG_EDGE) / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw * scale)
    canvas.height = Math.round(sh * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(el, (el.videoWidth - sw) / 2, (el.videoHeight - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.9)
  }, [sharp, ratio])

  const shoot = useCallback((onPhoto: (photo: string) => void) => {
    if (timer.current !== undefined || state !== 'ready') return
    let left = 3
    setCountdown(left)
    timer.current = window.setInterval(() => {
      left -= 1
      if (left > 0) { setCountdown(left); return }
      window.clearInterval(timer.current)
      timer.current = undefined
      setCountdown(null)
      const photo = capture()
      if (photo) onPhoto(photo)
    }, 1000)
  }, [capture, state])

  const element = useCallback(() => video.current, [])

  return { state, attach, countdown, shoot, element }
}

/** 카메라 액자 — 미리보기 위에 안내선(children)·카운트다운·오류를 겹친다. photo 가 있으면 그 사진을 보여 준다 */
export function KxCamView({ cam, photo, children, badge, flash }: {
  cam: KxCamera | null
  photo?: string | null
  children?: ReactNode
  /** 오른쪽 위 작은 표시(원본 사진 · 촬영 완료) */
  badge?: ReactNode
  /** 방금 찍힌 사진 — 흰 빛이 한 번 지나간다 */
  flash?: boolean
}) {
  const { c, t } = useKx()
  const state = cam?.state ?? null
  const countdown = cam?.countdown ?? null
  const attach = cam?.attach
  return (
    <div className="kx-cam" data-flash={flash || undefined} data-error={(state === 'error' && !photo) || undefined}>
      {photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo} alt="" />
        : attach && <video ref={attach} playsInline muted />}
      {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => <i key={pos} className="kx-cam-corner" data-pos={pos} aria-hidden="true" />)}
      {!photo && state === 'ready' && children}
      {photo && children}
      {badge && <span className="kx-cam-badge">{badge}</span>}
      {countdown !== null && <div key={countdown} className="kx-cam-count" aria-live="assertive">{countdown}</div>}
      {!photo && state === 'error' && (
        <div className="kx-cam-error" role="alert">
          <CameraOff size={52} strokeWidth={1.4} aria-hidden="true" />
          <p><b>{c.cameraOff}</b><span>{c.cameraChecking}</span></p>
          <span>{t.callStaff}</span>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── 휴대폰으로 받기 ─────────────────────────

/**
 * 휴대폰으로 받기 창 — 열리면 결과 파일을 만들어 올리고 QR 을 보여 준다.
 * 손님이 받기를 눌렀을 때만 서버에 올라간다(24시간 보관).
 */
export function KxSaveSheet({ open, cacheKey, build, onClose, title, desc }: {
  open: boolean
  /** 결과가 바뀌면 달라지는 값 — 같으면 다시 올리지 않는다 */
  cacheKey: string
  build: () => Promise<KxShareFile[]>
  onClose: () => void
  title?: string
  desc?: string
}) {
  const { c, t, share } = useKx()
  // 결과는 '어느 요청의 것인지'와 함께 둔다 — 요청이 바뀌면(다른 결과·다시 시도) 그 순간부터 준비 중으로 보인다
  const [done, setDone] = useState<{ run: string; qr: string | null } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const builder = useRef(build)
  useEffect(() => { builder.current = build }, [build])
  const run = `${cacheKey}#${attempt}`

  useEffect(() => {
    if (!open) return
    let alive = true
    share(cacheKey, () => builder.current())
      .then((made) => { if (alive) setDone({ run, qr: made.qr }) })
      .catch((error) => { console.error('[kiosk] 결과를 올리지 못했습니다:', error); if (alive) setDone({ run, qr: null }) })
    return () => { alive = false }
  }, [open, cacheKey, run, share])

  if (!open) return null
  const state: { phase: 'preparing' } | { phase: 'ready'; qr: string } | { phase: 'failed' } = done?.run !== run ? { phase: 'preparing' } : done.qr ? { phase: 'ready', qr: done.qr } : { phase: 'failed' }
  return (
    <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={title ?? c.saveTitle}>
      <div className="kx-sheet-card">
        <button type="button" className="kx-sheet-x" aria-label={t.close} onClick={onClose}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
        <h2>{title ?? c.saveTitle}</h2>
        <p className="kx-sheet-desc">{desc ?? c.saveDesc}</p>
        <div className="kx-sheet-qr" data-phase={state.phase}>
          {state.phase === 'preparing' && <p role="status"><Loader2 className="kx-spin" size={34} strokeWidth={1.8} aria-hidden="true" />{c.savePreparing}</p>}
          {state.phase === 'ready' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.qr} alt={title ?? c.saveTitle} />
          )}
          {state.phase === 'failed' && (
            <p role="alert">{c.saveFailed}<button type="button" className="kx-btn kx-btn--ghost" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={20} strokeWidth={1.9} aria-hidden="true" />{c.saveRetry}</button></p>
          )}
        </div>
        <p className="kx-sheet-keep">{c.saveKeep}</p>
        <button type="button" className="kx-btn kx-btn--primary" onClick={onClose}>{state.phase === 'ready' ? c.saveDone : t.close}</button>
      </div>
    </div>
  )
}

/**
 * 영수증 창 — 열리면 결과를 올려 QR 을 만들고, 미리보기와 함께 바로 인쇄한다(프린터가 있는 기기).
 * 올리지 못하면 QR 없이 찍는다. 프린터가 없는 웹 초안에서는 미리보기와 PNG 저장만.
 */
export function KxReceiptSheet({ open, cacheKey, build, receipt, onClose }: {
  open: boolean
  cacheKey: string
  build: () => Promise<KxShareFile[]>
  /** 영수증에 찍을 내용 — 창이 열릴 때 한 번 부른다 */
  receipt: () => KxReceipt | Promise<KxReceipt>
  onClose: () => void
}) {
  const { c, t, share, lang } = useKx()
  const [made, setMade] = useState<{ run: string; dataUrl: string; base64: string } | null>(null)
  const [print, setPrint] = useState<{ run: string; phase: 'printing' | 'printed' | 'failed' } | null>(null)
  const latest = useRef({ build, receipt })
  useEffect(() => { latest.current = { build, receipt } }, [build, receipt])
  const run = `${cacheKey}|${lang}`
  const kiosk = typeof window !== 'undefined' ? getKioskBridge() : undefined
  const hasPrinter = Boolean(kiosk?.hasPrinter)

  const send = useCallback(async (base64: string, key: string) => {
    if (!kiosk?.hasPrinter) return
    setPrint({ run: key, phase: 'printing' })
    try {
      const result = await kiosk.printReceipt({ receiptImageBase64: base64 })
      setPrint({ run: key, phase: result.success ? 'printed' : 'failed' })
    } catch (error) {
      console.error('[kiosk] 영수증을 찍지 못했습니다:', error)
      setPrint({ run: key, phase: 'failed' })
    }
  }, [kiosk])

  useEffect(() => {
    if (!open) return
    let alive = true
    void (async () => {
      const locale = KIOSK_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'
      const when = (value: number | Date) => new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(value)
      // 올리지 못해도(연결 문제) 영수증은 QR 없이 찍는다
      const shared = await share(cacheKey, () => latest.current.build()).catch((error) => { console.error('[kiosk] 결과를 올리지 못했습니다:', error); return null })
      const content = await latest.current.receipt()
      const image = await renderKxReceipt(content, shared ? { url: shared.url, title: c.receiptQrTitle, desc: c.receiptQrDesc, until: c.receiptUntil.replace('{date}', when(shared.expiresAt)) } : null, when(new Date()))
      if (!alive) return
      setMade({ run, ...image })
      void send(image.base64, run)
    })().catch((error) => console.error('[kiosk] 영수증을 만들지 못했습니다:', error))
    return () => { alive = false }
  }, [open, cacheKey, run, lang, share, c, send])

  if (!open) return null
  const ready = made?.run === run ? made : null
  const phase = !ready ? 'preparing' : !hasPrinter ? 'preview' : print?.run === run ? print.phase : 'printing'
  return (
    <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={c.receiptTitle}>
      <div className="kx-sheet-card kx-receipt">
        <button type="button" className="kx-sheet-x" aria-label={t.close} onClick={onClose}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
        <h2>{c.receiptTitle}</h2>
        <p className="kx-sheet-desc" role="status" data-phase={phase}>
          {phase === 'preparing' && <><Loader2 className="kx-spin" size={20} strokeWidth={2} aria-hidden="true" />{c.receiptPreparing}</>}
          {phase === 'printing' && <><Loader2 className="kx-spin" size={20} strokeWidth={2} aria-hidden="true" />{c.receiptPrinting}</>}
          {phase === 'printed' && <><Check size={20} strokeWidth={2.6} aria-hidden="true" />{c.receiptPrinted}</>}
          {phase === 'failed' && c.receiptFailed}
          {phase === 'preview' && c.receiptNoPrinter}
        </p>
        <div className="kx-receipt-paper">
          {ready
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={ready.dataUrl} alt={c.receiptTitle} />
            : <span aria-hidden="true" />}
        </div>
        <div className="kx-receipt-actions">
          {ready && hasPrinter && (phase === 'printed' || phase === 'failed') && (
            <button type="button" className="kx-btn kx-btn--ghost" onClick={() => void send(ready.base64, run)}><Printer size={20} strokeWidth={1.9} aria-hidden="true" />{phase === 'failed' ? c.saveRetry : c.receiptAgain}</button>
          )}
          {ready && !hasPrinter && (
            <a className="kx-btn kx-btn--ghost" href={ready.dataUrl} download="acscent-receipt.png"><Download size={20} strokeWidth={1.9} aria-hidden="true" />PNG</a>
          )}
          <button type="button" className="kx-btn kx-btn--primary" onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── 터치 키보드 · 작은 것들 ─────────────────────────

const oskMode = (lang: KioskLang) => (lang === 'ko' ? 'ko' : lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : 'zh')

export function KxKeyboard({ value, onChange, onClose, maxLength, hint, mode }: {
  value: string
  onChange: (value: string) => void
  onClose: () => void
  maxLength: number
  hint?: string
  /** 연락처처럼 영문·숫자를 치는 칸은 그 자판으로 시작한다 */
  mode?: 'en' | 'num'
}) {
  const { t, lang } = useKx()
  return (
    <OnScreenKeyboard
      value={value}
      onChange={onChange}
      onClose={onClose}
      maxLength={maxLength}
      hint={hint}
      labels={{ aria: t.oskAria, placeholder: t.oskPlaceholder, space: t.oskSpace, done: t.oskDone }}
      initialMode={mode ?? oskMode(lang)}
      traditional={lang === 'zh-Hant'}
    />
  )
}

export function KxSpinner({ size = 30 }: { size?: number }) {
  return <Loader2 className="kx-spin" size={size} strokeWidth={1.8} aria-hidden="true" />
}

/** 무입력 안내 — 화면 어디를 눌러도(pointerdown) 시간이 다시 채워지고 닫힌다(화면 틀이 맡는다) */
export function KxIdleDialog({ left, total }: { left: number; total: number }) {
  const { t } = useKx()
  return (
    <div className="kx-idle" role="alertdialog" aria-live="assertive" aria-label={t.idleTitle}>
      <div className="kx-idle-card">
        <span className="kx-idle-count" style={{ '--p': left / total } as React.CSSProperties}><b key={left}>{left}</b></span>
        <h2>{t.idleTitle}</h2>
        <p>{t.idleDesc}</p>
        <button type="button" className="kx-btn kx-btn--primary">{t.idleContinue}</button>
      </div>
    </div>
  )
}
