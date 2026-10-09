'use client'

// 키오스크 현장 관리자 창 — 고객 화면 우측 상단 모서리 → 6자리 PIN 으로 연다. 기존·레트로·맥 셸이 같이 쓴다.
// 설정을 작업별 탭으로 나눈다: 홈(지금 상태) · 운영 모드 · 화면·글꼴 · 평소 배경 · 행사 배경. 앱 종료는 따로 확인한다.
// (목업 ~/Downloads/Kiosk-Admin-Redesign-20261010 · docs/kiosk-admin.md)
//
// 지켜야 하는 동작(예전 관리자 창과 같다):
//  · 고르는 즉시 서버에 저장한다 — 전체 저장/취소 단계가 없다. 창을 닫아도 저장한 것은 되돌아가지 않는다.
//  · 운영 모드는 다음 손님부터 적용된다. 설정은 같은 종류의 키오스크가 모두 따라간다(target=kiosk).
//  · 모드를 바꾸며 전용 배경까지 고르는 모드는 두 번 저장한다 — 모드는 됐는데 배경만 실패할 수 있다(전체 실패가 아니다).
//  · 화면 디자인을 바꾸면 저장 뒤 페이지가 새로 열린다(useScreenUiSwitch) — 관리자 창도 닫힌다.
//  · 컬러·타로 모드는 전용 디자인을 쓴다 — 일반 디자인·글꼴·평소 배경은 매장·사주 모드에서 보인다.
//  · 인증은 10분. 끝나면 저장이 403 으로 거절된다 — 다시 비밀번호를 받는다.
//  · 인터넷이 끊기면 기기(셸)가 PIN 을 확인해 '앱 종료'만 연다.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleAlert, FlaskConical, GalleryHorizontalEnd, ImageIcon, Info, LockKeyhole as Lock,
  MoonStar, Palette, Power, RefreshCw, Settings, Store, Type, WifiOff, X,
} from 'lucide-react'
import { KIOSK_FONT_CLASS, hanjaFontVar } from '@/app/kiosk/fonts'
import type { KioskBridge } from '@/lib/kiosk/kiosk-bridge'
import { KIOSK_MODES, findKioskMode, type KioskMode } from '@/lib/kiosk/modes'
import { kioskProgramTheme } from '@/lib/kiosk/program-theme'
import { SCREEN_UI_LABELS, type DeviceSettings, type ScreenBackground, type ScreenUi } from '@/lib/screen-backgrounds/types'
import type { LiveEventOverride } from '@/lib/screen-events/types'
import { MAC_SYSTEM_FONT } from '@/components/mac/theme'
import { DEFAULT_RETRO_FONT, findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { AdminEvents } from './AdminEvents'
import { AdminFontPicker } from './AdminFontPicker'
import { AdminLayerProvider, AdminModal, Notice, Spinner, errorStatus, errorText, isAuthError, useAdminLayerRoot, useFocusTrap, type NoticeTone } from './admin-ui'
import './kiosk-admin.css'

/** useScreenBackgrounds('kiosk') 가 주는 것 중 관리자 창이 쓰는 몫 */
export interface KioskAdminScreen {
  backgrounds: ScreenBackground[]
  /** 지금 화면에 깔린 배경(행사 배경이 우선) */
  activeBackground: ScreenBackground
  /** 평소 배경으로 고른 것 */
  selectedId: string
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  liveEvent: LiveEventOverride | null
  /** 저장된 기기 설정(행사 글꼴을 덮어쓰기 전 값) */
  baseSettings: DeviceSettings
  selectBackground: (id: string) => Promise<void>
  saveSettings: (patch: Partial<DeviceSettings>) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
}

type Tab = 'home' | 'mode' | 'look' | 'backgrounds' | 'events'
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '홈' }, { id: 'mode', label: '운영 모드' }, { id: 'look', label: '화면·글꼴' }, { id: 'backgrounds', label: '평소 배경' }, { id: 'events', label: '행사 배경' },
]

/** 관리자 창에서 부르는 모드 이름과 두 줄 설명 — 목록에 없는 모드(새 행사)는 modes.ts 의 이름·설명을 그대로 쓴다 */
const MODE_COPY: Record<string, { name: string; lines: [string, string]; Icon: typeof Store }> = {
  wow: { name: '매장 기본', lines: ['최애 이미지 분석', '사진으로 찾는 나만의 향'], Icon: Store },
  'kwave-2026': { name: 'K-WAVE 사주', lines: ['사주 분석', '전용 배경으로 함께 변경'], Icon: MoonStar },
  'ai-color': { name: 'AI 퍼스널 컬러', lines: ['사진 한 장으로 컬러 진단', '컬러 전용 디자인 사용'], Icon: Palette },
  'ai-tarot': { name: 'AI 타로', lines: ['과거 · 현재 · 미래 리딩', '타로 전용 디자인 사용'], Icon: GalleryHorizontalEnd },
}
const modeCopy = (mode: KioskMode) => MODE_COPY[mode.id] ?? { name: mode.label, lines: [mode.note, mode.defaultBackground ? '전용 배경으로 함께 변경' : ''] as [string, string], Icon: Settings }

const FONT_SAMPLE = '오늘의 최애, 어떤 향으로 기억할까요?'
const defaultFontLabel = (ui: ScreenUi) => (ui === 'retro' ? '기본 (에스코어드림)' : ui === 'mac' ? '기본 (시스템 글꼴)' : '기본 (배경의 글꼴 조합)')
const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지우기', '0', '확인'] as const

export function KioskAdminPanel({ open, onClose, screen, kiosk }: {
  open: boolean
  onClose: () => void
  screen: KioskAdminScreen
  kiosk: KioskBridge | undefined
}) {
  if (!open || typeof document === 'undefined') return null
  // 고객 화면의 테마 CSS·zoom 이 닿지 않게 body 에 띄운다
  return createPortal(<AdminWindow onClose={onClose} screen={screen} kiosk={kiosk} />, document.body)
}

function AdminWindow({ onClose, screen, kiosk }: { onClose: () => void; screen: KioskAdminScreen; kiosk: KioskBridge | undefined }) {
  /** pin: 비밀번호 받는 중 · ok: 인증됨 · offline: 인터넷 없이 기기에서만 확인(앱 종료만) */
  const [auth, setAuth] = useState<'pin' | 'ok' | 'offline'>('pin')
  /** 인증 10분이 끝나 저장이 거절됐다 — 다시 인증하면 보던 탭으로 돌아간다 */
  const [expired, setExpired] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const [eventId, setEventId] = useState<string | null>(null)
  const [quit, setQuit] = useState<'ask' | 'browser' | null>(null)
  const [flash, setFlash] = useState('')
  const layers = useAdminLayerRoot(true, onClose)
  const { ref: panelRef, onKeyDown: trapKeyDown } = useFocusTrap<HTMLDivElement>(true, `${auth}-${expired}-${tab}`)
  const bodyRef = useRef<HTMLDivElement>(null)

  const settings = screen.baseSettings
  const mode = findKioskMode(settings.mode)
  const copy = modeCopy(mode)
  const programTheme = kioskProgramTheme(mode.id)
  const onAuthExpired = useCallback(() => setExpired(true), [])
  const go = useCallback((next: Tab) => { setTab(next); setEventId(null); setFlash('') }, [])
  // 탭을 바꾸면 본문을 맨 위로
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }) }, [tab, eventId])

  const askQuit = () => setQuit(kiosk?.isElectron ? 'ask' : 'browser')

  const shell = (content: ReactNode, small = false) => (
    <AdminLayerProvider value={layers}>
      <div className={`kadm ${KIOSK_FONT_CLASS}`} onPointerDown={(event) => { if (event.target === event.currentTarget) layers.dismiss() }}>
        <div ref={panelRef} className="kadm-panel" data-small={small || undefined} role="dialog" aria-modal="true" aria-label="관리자 설정" tabIndex={-1} onKeyDown={trapKeyDown}>
          {content}
          {quit === 'ask' && (
            <AdminModal label="앱 종료" onClose={() => setQuit(null)} className="kadm-quit">
              <Power className="kadm-gen-icon" data-tone="danger" size={52} strokeWidth={1.7} aria-hidden="true" />
              <h3>앱을 종료할까요?</h3>
              <p>종료하면 손님이 이용할 수 없어요.<br />다시 켜려면 바탕화면의 바로가기를 눌러 주세요.</p>
              <div className="kadm-modal-actions">
                <button type="button" className="kadm-btn" data-autofocus onClick={() => { setQuit(null); setFlash('관리자 화면으로 돌아왔어요.') }}>계속 운영</button>
                <button type="button" className="kadm-btn kadm-btn--danger" onClick={() => { setQuit(null); void kiosk?.quitApp() }}>앱 종료</button>
              </div>
            </AdminModal>
          )}
          {quit === 'browser' && (
            <AdminModal label="앱 종료" onClose={() => setQuit(null)} className="kadm-quit">
              <Info className="kadm-gen-icon" data-tone="info" size={52} strokeWidth={1.7} aria-hidden="true" />
              <h3>브라우저에서 실행 중이에요</h3>
              <p>이 환경에서는 앱을 종료할 수 없어요.<br />키오스크 앱에서만 종료할 수 있어요. 브라우저는 창을 닫아 주세요.</p>
              <div className="kadm-modal-actions"><button type="button" className="kadm-btn kadm-btn--primary" data-autofocus onClick={() => setQuit(null)}>확인</button></div>
            </AdminModal>
          )}
        </div>
      </div>
    </AdminLayerProvider>
  )

  // ── 인증 ──
  if (auth === 'pin') {
    return shell(
      <PinPad kiosk={kiosk} unlock={screen.unlock} reauth={expired} onClose={onClose}
        onUnlocked={() => { setAuth('ok'); setExpired(false) }} onOffline={() => setAuth('offline')} />, true,
    )
  }

  const header = (
    <header className="kadm-head">
      <h1><Lock size={30} strokeWidth={1.9} aria-hidden="true" />관리자 설정</h1>
      <button type="button" className="kadm-chip-btn" onClick={onClose}>운영 화면으로 <X size={18} strokeWidth={2} aria-hidden="true" /></button>
    </header>
  )
  const tabs = (disabled: boolean) => (
    <nav className="kadm-tabs" role="tablist" aria-label="관리자 설정">
      {TABS.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={!disabled && tab === item.id} disabled={disabled} onClick={() => go(item.id)}>{item.label}</button>
      ))}
    </nav>
  )

  // ── 인터넷 없이 열린 창 — 설정은 못 바꾸고 앱 종료만 ──
  if (auth === 'offline') {
    return shell(
      <>
        {header}{tabs(true)}
        <div className="kadm-body">
          <div className="kadm-empty kadm-empty--page">
            <i><WifiOff size={48} strokeWidth={1.6} aria-hidden="true" /></i>
            <b>인터넷 연결을 확인해 주세요</b>
            <span>지금은 설정을 바꿀 수 없어요.<br />앱 종료는 가능합니다. 연결이 돌아오면 다시 열어 주세요.</span>
          </div>
        </div>
        <footer className="kadm-foot">
          <button type="button" className="kadm-btn kadm-btn--quit" onClick={askQuit}><Power size={24} strokeWidth={2} aria-hidden="true" />앱 종료</button>
          <button type="button" className="kadm-btn kadm-btn--primary" onClick={onClose}>운영 화면으로</button>
        </footer>
      </>,
    )
  }

  // ── 인증 시간이 끝났다 ──
  if (expired) {
    return shell(
      <>
        {header}{tabs(true)}
        <div className="kadm-body">
          <div className="kadm-empty kadm-empty--page">
            <i><Lock size={48} strokeWidth={1.6} aria-hidden="true" /></i>
            <b>관리자 인증이 필요해요</b>
            <span>인증 후 10분이 지났어요.<br />다시 비밀번호를 입력해 주세요. 방금 누른 설정은 저장되지 않았어요.</span>
          </div>
        </div>
        <footer className="kadm-foot kadm-foot--even">
          <button type="button" className="kadm-btn" onClick={onClose}>닫기</button>
          <button type="button" className="kadm-btn kadm-btn--primary" data-autofocus onClick={() => setAuth('pin')}>다시 인증</button>
        </footer>
      </>,
    )
  }

  return shell(
    <>
      {header}{tabs(false)}
      <div className="kadm-body" ref={bodyRef} role="tabpanel" aria-label={TABS.find((item) => item.id === tab)?.label}>
        {tab === 'home' && <HomeTab screen={screen} mode={mode} flash={flash} go={go} />}
        {tab === 'mode' && <ModeTab screen={screen} onAuthExpired={onAuthExpired} />}
        {tab === 'look' && <LookTab screen={screen} onAuthExpired={onAuthExpired} go={go} />}
        {tab === 'backgrounds' && <BackgroundsTab screen={screen} onAuthExpired={onAuthExpired} />}
        {tab === 'events' && (
          <AdminEvents modeName={copy.name} storeEvents={mode.storeEvents && !programTheme} detailId={eventId} onDetail={setEventId}
            onApplied={() => void screen.refresh()} onAuthExpired={onAuthExpired} onHome={() => go('home')} />
        )}
      </div>
      <footer className="kadm-foot">
        {tab === 'events' && eventId
          ? <button type="button" className="kadm-btn" onClick={() => setEventId(null)}><ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />행사 목록으로</button>
          : <button type="button" className="kadm-btn kadm-btn--quit" onClick={askQuit}><Power size={24} strokeWidth={2} aria-hidden="true" />앱 종료</button>}
        <button type="button" className="kadm-btn kadm-btn--primary" onClick={onClose}>운영 화면으로 돌아가기</button>
      </footer>
    </>,
  )
}

// ───────────────────────── 인증(PIN) ─────────────────────────

function PinPad({ kiosk, unlock, reauth, onUnlocked, onOffline, onClose }: {
  kiosk: KioskBridge | undefined
  unlock: (pin: string) => Promise<boolean>
  /** 인증 시간이 끝나 다시 받는 중 */
  reauth: boolean
  onUnlocked: () => void
  onOffline: () => void
  onClose: () => void
}) {
  const [pin, setPin] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<{ title: string; text: string } | null>(null)
  /** 입력이 너무 많아 서버가 1분간 막았다(429) */
  const [limited, setLimited] = useState(false)
  const request = useRef(0)
  useEffect(() => () => { request.current += 1 }, [])
  useEffect(() => {
    if (!limited) return
    const timer = window.setTimeout(() => setLimited(false), 60_000)
    return () => window.clearTimeout(timer)
  }, [limited])

  const press = useCallback(async (key: string) => {
    if (checking || limited) return
    setError(null)
    if (key === '지우기') { setPin((value) => value.slice(0, -1)); return }
    // 6자리가 차면 확인 버튼 없이 바로 인증한다. 확인 버튼은 다시 시도용
    let next = pin
    if (key !== '확인') {
      if (pin.length >= 6) return
      next = `${pin}${key}`.slice(0, 6)
      setPin(next)
      if (next.length < 6) return
    }
    if (next.length !== 6) return
    setChecking(true)
    const id = ++request.current
    const wrong = () => setError({ title: '비밀번호가 올바르지 않습니다.', text: '다시 입력해 주세요.' })
    /* 서버에 닿지 못하면 기기(셸)에 PIN 을 확인받아 앱 종료만 연다. 처리했으면 true */
    const offline = async () => {
      if (!kiosk?.checkAdminPin) return false
      const ok = await kiosk.checkAdminPin(next).catch(() => false)
      if (id !== request.current) return true
      setPin('')
      if (ok) onOffline()
      else wrong()
      return true
    }
    try {
      // 끊긴 게 확실하면 서버 응답(최대 12초)을 기다리지 않는다
      if (navigator.onLine === false && (await offline())) return
      const ok = await unlock(next)
      if (id !== request.current) return
      setPin('')
      if (ok) onUnlocked()
      else wrong()
    } catch (cause) {
      if (id !== request.current) return
      if (errorStatus(cause) === 429) { setPin(''); setLimited(true); return }
      if (await offline()) return
      setPin('')
      const unreachable = cause instanceof TypeError || navigator.onLine === false || (cause instanceof DOMException && cause.name === 'TimeoutError')
      setError(unreachable
        ? { title: '인터넷에 연결되어 있지 않습니다.', text: '연결을 확인한 뒤 다시 입력해 주세요.' }
        : { title: '인증하지 못했어요.', text: errorText(cause, '연결을 확인한 뒤 다시 입력해 주세요.') })
    } finally {
      if (id === request.current) setChecking(false)
    }
  }, [pin, checking, limited, kiosk, unlock, onUnlocked, onOffline])

  // 실제 키보드 — 숫자 · Backspace · Enter
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!/^[0-9]$/.test(event.key) && event.key !== 'Backspace' && event.key !== 'Enter') return
      event.preventDefault()
      void press(event.key === 'Backspace' ? '지우기' : event.key === 'Enter' ? '확인' : event.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  const cancelCheck = () => { request.current += 1; setChecking(false); setPin('') }
  return (
    <div className="kadm-pin">
      <h1><Lock size={34} strokeWidth={1.9} aria-hidden="true" />{limited ? '잠시 후 다시 시도해 주세요' : '관리자 인증'}</h1>
      <p className="kadm-pin-sub">
        {limited ? '입력이 너무 많았어요. 1분 후 다시 입력할 수 있어요.' : reauth ? '인증 후 10분이 지났어요. 관리자 비밀번호 6자리를 다시 입력해 주세요.' : '관리자 비밀번호 6자리를 입력해 주세요.'}
      </p>
      <div className="kadm-pin-dots" role="img" aria-label={`${pin.length}자리 입력됨`}>
        {Array.from({ length: 6 }, (_, index) => <i key={index} data-filled={index < pin.length || undefined} />)}
      </div>
      <div className="kadm-pin-status" aria-live="polite">
        {checking && <div className="kadm-pin-checking"><Spinner size={30} />인증 확인 중…</div>}
        {!checking && limited && <div className="kadm-pin-wait">입력 대기</div>}
        {!checking && !limited && error && (
          <div className="kadm-pin-error" role="alert"><CircleAlert size={34} strokeWidth={1.9} aria-hidden="true" /><span><b>{error.title}</b>{error.text}</span></div>
        )}
      </div>
      <div className="kadm-pin-pad">
        {PIN_KEYS.map((key) => (
          <button key={key} type="button" data-action={key === '확인' || key === '지우기' || undefined}
            disabled={checking || limited || (key === '확인' && pin.length !== 6)} onClick={() => void press(key)}>
            {key}
          </button>
        ))}
      </div>
      {checking
        ? <button type="button" className="kadm-btn kadm-btn--soft" onClick={cancelCheck}>취소</button>
        : <button type="button" className="kadm-btn kadm-btn--soft" data-autofocus onClick={onClose}>운영 화면으로 돌아가기</button>}
    </div>
  )
}

// ───────────────────────── 홈 ─────────────────────────

function modeArt(mode: KioskMode, background: ScreenBackground): { src: string; cover: boolean } {
  const theme = kioskProgramTheme(mode.id)
  if (theme === 'color') return { src: '/assets/kiosk-programs/color-archive-fan.webp', cover: false }
  if (theme === 'tarot') return { src: '/assets/kiosk-programs/moonlit-tarot-fan.webp', cover: false }
  return { src: background.thumbnail_url || background.image_url, cover: true }
}

function HomeTab({ screen, mode, flash, go }: { screen: KioskAdminScreen; mode: KioskMode; flash: string; go: (tab: Tab) => void }) {
  const copy = modeCopy(mode)
  const theme = kioskProgramTheme(mode.id)
  const art = modeArt(mode, screen.activeBackground)
  const ui = screen.baseSettings.ui
  const design = theme === 'color' ? '컬러 전용 디자인' : theme === 'tarot' ? '타로 전용 디자인' : `${SCREEN_UI_LABELS[ui]} · ${findScreenFont(screen.liveEvent?.font ?? screen.baseSettings.font)?.label ?? '기본 글꼴'}`
  const event = theme || !mode.storeEvents ? '이 모드에서는 사용 안 함' : screen.liveEvent ? `${screen.liveEvent.title} 적용 중` : '적용 중인 행사 없음'
  const links: { tab: Tab; title: string; text: string; Icon: typeof Settings }[] = [
    { tab: 'mode', title: '운영 모드', text: '손님에게 보여줄 서비스', Icon: Settings },
    { tab: 'look', title: '화면·글꼴', text: '기본 디자인과 글씨', Icon: Type },
    { tab: 'backgrounds', title: '평소 배경', text: '행사가 없을 때의 배경', Icon: ImageIcon },
    { tab: 'events', title: '행사 배경', text: '지금 적용 · 기간 예약', Icon: CalendarDays },
  ]
  return (
    <div className="kadm-pane">
      {flash && <Notice tone="ok" compact>{flash}</Notice>}
      <div>
        <h2 className="kadm-h1">지금 운영 상태</h2>
        <p className="kadm-sub">설정은 이 매장의 모든 키오스크에 공유돼요.</p>
      </div>
      <section className="kadm-status">
        <span className="kadm-status-art" data-cover={art.cover || undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art.src} alt="" />
        </span>
        <div>
          <p className="kadm-status-name"><b>{copy.name}</b><span className="kadm-pill" data-tone="ok">현재 운영 중</span></p>
          <dl>
            <div><dt>화면</dt><dd>{design}</dd></div>
            <div><dt>행사 배경</dt><dd>{event}</dd></div>
          </dl>
        </div>
      </section>
      <h3 className="kadm-h2">무엇을 바꿀까요?</h3>
      <div className="kadm-links">
        {links.map(({ tab, title, text, Icon }) => (
          <button key={tab} type="button" onClick={() => go(tab)}>
            <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
            <ChevronRight size={24} strokeWidth={1.8} aria-hidden="true" />
            <b>{title}</b>
            <span>{text}</span>
          </button>
        ))}
      </div>
      <Notice title="선택한 설정은 즉시 저장돼요.">운영 모드는 다음 손님부터 적용됩니다.</Notice>
    </div>
  )
}

// ───────────────────────── 운영 모드 ─────────────────────────

type ModeSave =
  | { phase: 'saving'; id: string }
  | { phase: 'saved'; id: string }
  | { phase: 'failed'; id: string; message: string }
  /** 모드는 저장됐는데 전용 배경만 못 바꿨다 */
  | { phase: 'partial'; id: string; background: string; retrying?: boolean }

function ModeTab({ screen, onAuthExpired }: { screen: KioskAdminScreen; onAuthExpired: () => void }) {
  const [save, setSave] = useState<ModeSave | null>(null)
  const [sajuBusy, setSajuBusy] = useState<string | null>(null)
  const [sajuNotice, setSajuNotice] = useState<{ tone: NoticeTone; text: string } | null>(null)
  const settings = screen.baseSettings
  const current = findKioskMode(settings.mode)
  const busy = save?.phase === 'saving' || (save?.phase === 'partial' && save.retrying) || Boolean(sajuBusy)
  const theme = kioskProgramTheme(current.id)
  const name = (id: string) => modeCopy(findKioskMode(id)).name

  const applyBackground = async (id: string, background: string) => {
    try {
      await screen.selectBackground(background)
      setSave({ phase: 'saved', id })
    } catch (error) {
      if (isAuthError(error)) { setSave(null); onAuthExpired(); return }
      setSave({ phase: 'partial', id, background })
    }
  }
  const pick = async (id: string) => {
    if (busy || id === current.id) return
    setSave({ phase: 'saving', id }); setSajuNotice(null)
    try {
      await screen.saveSettings({ mode: id === KIOSK_MODES[0].id ? null : id })
    } catch (error) {
      if (isAuthError(error)) { setSave(null); onAuthExpired(); return }
      setSave({ phase: 'failed', id, message: errorText(error, '저장하지 못했어요.') })
      return
    }
    // 전용 배경이 있는 모드는 배경도 같이 고른다 — 여기서 실패해도 모드는 이미 바뀌었다
    const background = findKioskMode(id).defaultBackground
    if (background) await applyBackground(id, background)
    else setSave({ phase: 'saved', id })
  }
  const saveSaju = async (key: 'hanjaFont' | 'receiptStyle', value: string, label: string) => {
    if (busy) return
    setSajuBusy(key); setSajuNotice(null); setSave(null)
    try {
      await screen.saveSettings({ [key]: value } as Partial<DeviceSettings>)
      setSajuNotice({ tone: 'ok', text: `${label}(으)로 저장했어요.` })
    } catch (error) {
      if (isAuthError(error)) onAuthExpired()
      else setSajuNotice({ tone: 'error', text: `${errorText(error, '저장하지 못했어요.')} 이전 설정을 유지했어요.` })
    } finally { setSajuBusy(null) }
  }
  const hanja = settings.hanjaFont ?? 'kaishu'
  const receipt = settings.receiptStyle ?? 'sheet'

  return (
    <div className="kadm-pane">
      <div>
        <h2 className="kadm-h1">운영 모드</h2>
        <p className="kadm-sub">선택하면 바로 저장돼요.<br />이 매장의 모든 키오스크에 공유됩니다.</p>
      </div>
      {save?.phase === 'saving' && <Notice tone="busy" title="저장 중">{name(save.id)} 모드로 바꾸고 있어요. 잠시만 기다려 주세요.</Notice>}
      {save?.phase === 'saved' && (
        <Notice tone="ok" title="저장 완료">
          {name(save.id)} 모드를 저장했어요. 다음 손님부터 적용됩니다.
          {findKioskMode(save.id).defaultBackground ? ' 전용 배경도 함께 바꿨어요.' : kioskProgramTheme(save.id) ? ` ${kioskProgramTheme(save.id) === 'color' ? '컬러' : '타로'} 전용 디자인으로 보여요.` : ''}
        </Notice>
      )}
      {save?.phase === 'failed' && (
        <Notice tone="error" title="저장 실패" action={<button type="button" className="kadm-btn kadm-btn--small kadm-btn--danger" onClick={() => void pick(save.id)}>다시 시도</button>}>
          {name(save.id)} 모드로 바꾸지 못했어요. 현재 운영 모드({modeCopy(current).name})는 그대로 유지됩니다. {save.message}
        </Notice>
      )}
      {save?.phase === 'partial' && (
        <Notice tone="warn" title={`${name(save.id)} 모드는 저장됐지만, 전용 배경은 바꾸지 못했어요.`}
          action={<button type="button" className="kadm-btn kadm-btn--small kadm-btn--warn" disabled={save.retrying} onClick={() => { setSave({ ...save, retrying: true }); void applyBackground(save.id, save.background) }}>{save.retrying ? '적용 중…' : '전용 배경 다시 적용'}</button>}>
          현재 배경을 유지합니다. 배경만 다시 적용해 주세요.
        </Notice>
      )}
      <div className="kadm-modes" role="radiogroup" aria-label="운영 모드">
        {KIOSK_MODES.map((mode) => {
          const item = modeCopy(mode)
          const on = current.id === mode.id
          const saving = save?.phase === 'saving' && save.id === mode.id
          return (
            <button key={mode.id} type="button" role="radio" aria-checked={on} className="kadm-mode" data-on={on || undefined} data-saving={saving || undefined} disabled={busy} onClick={() => void pick(mode.id)}>
              <item.Icon size={52} strokeWidth={1.3} aria-hidden="true" />
              <span>
                <b>{item.name}{on && <span className="kadm-pill" data-tone="ok">현재 운영 중</span>}{saving && <span className="kadm-pill" data-tone="plan">저장 중</span>}</b>
                <em>{item.lines[0]}</em>
                {item.lines[1] && <em>{item.lines[1]}</em>}
              </span>
              <span className="kadm-radio kadm-radio--dot" data-on={on || undefined} aria-hidden="true" />
            </button>
          )
        })}
      </div>

      {current.programs.includes('saju') && (
        <section className="kadm-block">
          <h2 className="kadm-h1">사주 표시 설정</h2>
          <Notice compact>사주 모드에서만 표시됩니다. 이 매장의 모든 키오스크에 공유돼요.</Notice>
          {sajuNotice && <Notice tone={sajuNotice.tone} compact>{sajuNotice.text}</Notice>}
          <h3 className="kadm-h2">한자 글꼴</h3>
          <p className="kadm-sub">화면과 영수증의 명식 한자에 적용돼요.</p>
          <div className="kadm-pair" role="radiogroup" aria-label="한자 글꼴">
            {([['kaishu', '해서'], ['gothic', '고딕']] as const).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={hanja === id} data-on={hanja === id || undefined} disabled={busy || hanja === id} onClick={() => void saveSaju('hanjaFont', id, `한자 글꼴을 ${label}`)}>
                <span className="kadm-pair-head"><span className="kadm-radio kadm-radio--dot" data-on={hanja === id || undefined} aria-hidden="true" />{label}</span>
                <span className="kadm-hanja" lang="zh-Hant" style={{ fontFamily: hanjaFontVar(id) }}>甲子 乙丑<br />丙寅 丁卯</span>
              </button>
            ))}
          </div>
          <h3 className="kadm-h2">영수증 양식</h3>
          <p className="kadm-sub">같은 내용을 다른 구성으로 인쇄해요. 아래는 구성만 보여 주는 약도예요.</p>
          <div className="kadm-pair" role="radiogroup" aria-label="영수증 양식">
            {([['sheet', '감정서형'], ['prescription', '처방전형']] as const).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={receipt === id} data-on={receipt === id || undefined} disabled={busy || receipt === id} onClick={() => void saveSaju('receiptStyle', id, `영수증 양식을 ${label}`)}>
                <span className="kadm-pair-head"><span className="kadm-radio kadm-radio--dot" data-on={receipt === id || undefined} aria-hidden="true" />{label}</span>
                <ReceiptSketch style={id} hanja={hanja} />
              </button>
            ))}
          </div>
        </section>
      )}
      <Notice title="운영 모드는 다음 손님부터 적용됩니다.">
        {theme
          ? `지금은 ${theme === 'color' ? '컬러' : '타로'} 전용 디자인으로 운영돼요. 화면·글꼴과 평소 배경에서 고른 것은 매장·사주 모드에서 보여요.`
          : '선택한 설정은 즉시 저장돼요.'}
      </Notice>
    </div>
  )
}

/** 사주 영수증 두 양식의 구성 — 실제 인쇄물(receipt-canvas)의 차이만 옮긴 약도. 감정서형은 명식 격자표·오행 칸·인장, 처방전형은 큰 한자 제목의 이전 양식 */
function ReceiptSketch({ style, hanja }: { style: 'sheet' | 'prescription'; hanja: 'kaishu' | 'gothic' }) {
  const font: CSSProperties = { fontFamily: hanjaFontVar(hanja) }
  return style === 'sheet' ? (
    <span className="kadm-receipt" aria-hidden="true">
      <b lang="zh-Hant" style={font}>四柱鑑定書</b>
      <em>사주 향 감정서</em>
      <span className="kadm-receipt-grid">
        {['時', '日', '月', '年'].map((label) => <i key={label} lang="zh-Hant" style={font}>{label}</i>)}
        {['丁卯', '丙寅', '乙丑', '甲子'].map((text) => <i key={text} lang="zh-Hant" style={font}>{text}</i>)}
      </span>
      <span className="kadm-receipt-row">
        <span className="kadm-receipt-boxes">{['木', '火', '土', '金', '水'].map((text) => <i key={text} lang="zh-Hant" style={font}>{text}</i>)}</span>
        <i className="kadm-receipt-seal" lang="zh-Hant" style={font}>印</i>
      </span>
      <small>명식 격자표 · 오행 칸 · 인장</small>
    </span>
  ) : (
    <span className="kadm-receipt" data-style="prescription" aria-hidden="true">
      <b lang="zh-Hant" style={font}>四柱香 處方箋</b>
      <em>사주 향 처방전</em>
      <span className="kadm-receipt-plain" lang="zh-Hant" style={font}>甲子 乙丑 丙寅 丁卯</span>
      <span className="kadm-receipt-line">命과 香 · 처방의 연유</span>
      <span className="kadm-receipt-line">處方 香 · 처방 향</span>
      <small>큰 한자 제목 · 이전 양식</small>
    </span>
  )
}

// ───────────────────────── 화면·글꼴 ─────────────────────────

const DESIGNS: ScreenUi[] = ['classic', 'retro', 'mac']

function LookTab({ screen, onAuthExpired, go }: { screen: KioskAdminScreen; onAuthExpired: () => void; go: (tab: Tab) => void }) {
  const [uiSave, setUiSave] = useState<{ phase: 'saving' | 'failed'; ui: ScreenUi; message?: string } | null>(null)
  const [fontSave, setFontSave] = useState<{ phase: 'saving' | 'saved' | 'failed'; message?: string } | null>(null)
  const [picker, setPicker] = useState(false)
  const settings = screen.baseSettings
  const mode = findKioskMode(settings.mode)
  const theme = kioskProgramTheme(mode.id)
  const eventFont = !theme && screen.liveEvent?.font ? screen.liveEvent : null
  const busy = uiSave?.phase === 'saving' || fontSave?.phase === 'saving'
  const previewFont = settings.font ?? (settings.ui === 'retro' ? DEFAULT_RETRO_FONT : null)
  const fontLabel = findScreenFont(settings.font)?.label ?? defaultFontLabel(settings.ui)

  const pickUi = async (ui: ScreenUi) => {
    if (busy || ui === settings.ui) return
    setUiSave({ phase: 'saving', ui }); setFontSave(null)
    try {
      // 저장되면 셸이 페이지를 새로 연다(useScreenUiSwitch) — 이 창도 같이 닫힌다
      await screen.saveSettings({ ui })
    } catch (error) {
      if (isAuthError(error)) { setUiSave(null); onAuthExpired(); return }
      setUiSave({ phase: 'failed', ui, message: errorText(error, '저장하지 못했어요.') })
    }
  }
  const pickFont = async (font: string | null) => {
    setPicker(false)
    if (busy || font === settings.font) return
    setFontSave({ phase: 'saving' }); setUiSave(null)
    try {
      await screen.saveSettings({ font })
      setFontSave({ phase: 'saved' })
    } catch (error) {
      if (isAuthError(error)) { setFontSave(null); onAuthExpired(); return }
      setFontSave({ phase: 'failed', message: errorText(error, '저장하지 못했어요.') })
    }
  }

  return (
    <div className="kadm-pane">
      <ScreenFontFace ids={[previewFont, eventFont?.font ?? null]} />
      <div className="kadm-pane-head">
        <div>
          <h2 className="kadm-h1">화면·글꼴</h2>
          <p className="kadm-sub">매장·사주 모드의 기본 화면과 글씨를 바꿔요.</p>
        </div>
        <span className="kadm-pill" data-tone="plan">{modeCopy(mode).name}</span>
      </div>

      {theme && (
        <>
          <div className="kadm-callout">
            <Palette size={46} strokeWidth={1.5} aria-hidden="true" />
            <div><b>전용 디자인 사용 중</b><span>퍼스널 컬러와 타로는 각 서비스의 전용 디자인을 사용해요.</span></div>
          </div>
          <Notice compact>지금 화면에는 {theme === 'color' ? '컬러' : '타로'} 전용 디자인이 보여요. 아래 화면 디자인·글꼴과 평소 배경은 저장되지만 매장·사주 모드에서만 보입니다.</Notice>
        </>
      )}
      {eventFont && (
        <>
          <div className="kadm-callout">
            <Type size={46} strokeWidth={1.5} aria-hidden="true" />
            <div><b>행사 글꼴 우선 적용</b><span>‘{eventFont.title}’ 행사가 적용되는 동안 행사 배경의 글꼴을 사용해요.</span></div>
          </div>
          <dl className="kadm-facts kadm-facts--card">
            <div><dt>평소 선택한 글꼴</dt><dd><b>{fontLabel}</b><em>행사 후 돌아갈 기본값</em></dd></div>
            <div><dt>지금 적용된 글꼴</dt><dd><b style={{ fontFamily: screenFontFamily(eventFont.font) }}>{findScreenFont(eventFont.font)?.label ?? eventFont.font}</b><span className="kadm-pill" data-tone="ok">행사 적용 중</span></dd></div>
          </dl>
          <Notice compact>아래에서 글꼴을 바꾸면 저장되지만, 화면에는 행사가 끝나거나 해제된 뒤에 보여요.</Notice>
          <button type="button" className="kadm-linkrow" onClick={() => go('events')}>
            <Settings size={30} strokeWidth={1.5} aria-hidden="true" /><span><b>행사 배경 설정 보기</b></span><ArrowRight size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </>
      )}

      <h3 className="kadm-h2">화면 디자인</h3>
      {uiSave?.phase === 'failed' && (
        <Notice tone="error" title="화면 디자인을 바꾸지 못했어요." action={<button type="button" className="kadm-btn kadm-btn--small kadm-btn--danger" onClick={() => void pickUi(uiSave.ui)}>다시 시도</button>}>
          {SCREEN_UI_LABELS[settings.ui]} 디자인을 그대로 유지했어요. {uiSave.message}
        </Notice>
      )}
      <div className="kadm-designs" role="radiogroup" aria-label="화면 디자인">
        {DESIGNS.map((ui) => {
          const on = settings.ui === ui
          return (
            <button key={ui} type="button" role="radio" aria-checked={on} data-on={on || undefined} disabled={busy || on} onClick={() => void pickUi(ui)}>
              {on && <span className="kadm-check" aria-hidden="true"><Check size={20} strokeWidth={3} /></span>}
              <span className="kadm-design" data-ui={ui} aria-hidden="true">
                <i className="kadm-design-bar" />
                <FlaskConical size={34} strokeWidth={1.5} />
                <b>나의 향 찾기</b>
                <em>시작하기</em>
              </span>
              <b>{SCREEN_UI_LABELS[ui]}</b>
              {on && <span className="kadm-pill" data-tone="plan">현재 선택</span>}
            </button>
          )
        })}
      </div>
      <p className="kadm-hint"><CircleAlert size={22} strokeWidth={1.8} aria-hidden="true" />디자인을 바꾸면 화면이 새로 열려 고객 시작 화면으로 돌아가고, 관리자 창도 닫혀요.</p>

      <h3 className="kadm-h2">글꼴</h3>
      {fontSave?.phase === 'saving' && <Notice tone="busy" compact>글꼴을 저장하고 있어요…</Notice>}
      {fontSave?.phase === 'saved' && <Notice tone="ok" compact>{eventFont ? '글꼴을 저장했어요. 지금은 행사 글꼴이 보이고, 행사가 끝나면 이 글꼴이 보여요.' : theme ? '글꼴을 저장했어요. 매장·사주 모드에서 보여요.' : '글꼴을 저장했어요. 화면에 바로 적용됩니다.'}</Notice>}
      {fontSave?.phase === 'failed' && <Notice tone="error" title="글꼴을 바꾸지 못했어요.">이전 글꼴을 그대로 유지했어요. {fontSave.message}</Notice>}
      <section className="kadm-fontcard">
        <div className="kadm-fontcard-head">
          <div><span>{eventFont ? '평소 선택한 글꼴' : '현재 글꼴'}</span><b>{fontLabel}</b></div>
          <button type="button" className="kadm-btn kadm-btn--small" disabled={busy} onClick={() => setPicker(true)}>글꼴 고르기 <ArrowRight size={20} strokeWidth={2} aria-hidden="true" /></button>
        </div>
        <div className="kadm-fontcard-sample" style={{ fontFamily: settings.ui === 'mac' && !settings.font ? MAC_SYSTEM_FONT : screenFontFamily(previewFont) }}>
          <span>글꼴 미리보기</span>
          <b>{FONT_SAMPLE}</b>
          <em>가나다 ABC 123</em>
        </div>
      </section>
      <Notice tone="ok" title="선택하면 바로 저장돼요.">별도의 저장 버튼은 필요 없어요. 같은 종류의 키오스크에 모두 적용됩니다.</Notice>

      {picker && (
        <AdminFontPicker value={settings.font} defaultLabel={defaultFontLabel(settings.ui)} defaultNote="화면 디자인의 기본 글꼴" defaultFont={settings.ui === 'retro' ? DEFAULT_RETRO_FONT : null}
          onPick={(font) => void pickFont(font)} onClose={() => setPicker(false)} />
      )}
      {uiSave?.phase === 'saving' && (
        <AdminModal label="화면 디자인 바꾸는 중" onClose={null} className="kadm-switching">
          <Spinner size={46} />
          <h3>화면 디자인을 바꾸고 있어요</h3>
          <p>{SCREEN_UI_LABELS[settings.ui]} → <b>{SCREEN_UI_LABELS[uiSave.ui]}</b></p>
          <p>저장되면 새 디자인으로 고객 시작 화면이 다시 열려요.<br />관리자 창은 곧 닫혀요.</p>
        </AdminModal>
      )}
    </div>
  )
}

// ───────────────────────── 평소 배경 ─────────────────────────

type BackgroundSave =
  | { phase: 'saving'; id: string }
  | { phase: 'saved'; id: string; font: string | null }
  | { phase: 'failed'; id: string; message: string }
  /** 목록에는 있지만 지워졌거나 꺼진 배경(409) */
  | { phase: 'gone'; id: string }

function BackgroundsTab({ screen, onAuthExpired }: { screen: KioskAdminScreen; onAuthExpired: () => void }) {
  const [save, setSave] = useState<BackgroundSave | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const settings = screen.baseSettings
  const mode = findKioskMode(settings.mode)
  const theme = kioskProgramTheme(mode.id)
  const saving = save?.phase === 'saving'
  const title = (id: string) => screen.backgrounds.find((item) => item.id === id)?.title ?? '고른 배경'
  // 지금 고른 배경을 맨 앞에 — 탭을 연 때 기준이라 고르는 동안에는 순서가 바뀌지 않는다
  const [firstId] = useState(screen.selectedId)
  const list = useMemo(() => [...screen.backgrounds].sort((x, y) => Number(y.id === firstId) - Number(x.id === firstId)), [screen.backgrounds, firstId])

  const refresh = async () => {
    if (refreshing || saving) return
    setRefreshing(true)
    try { await screen.refresh() } finally { setRefreshing(false) }
  }
  const pick = async (id: string) => {
    if (saving || refreshing || id === screen.selectedId) return
    setSave({ phase: 'saving', id })
    try {
      await screen.selectBackground(id)
      setSave({ phase: 'saved', id, font: screen.backgrounds.find((item) => item.id === id)?.font ?? null })
    } catch (error) {
      if (isAuthError(error)) { setSave(null); onAuthExpired(); return }
      setSave(errorStatus(error) === 409 ? { phase: 'gone', id } : { phase: 'failed', id, message: errorText(error, '저장하지 못했어요.') })
    }
  }
  const showing = theme
    ? `지금 화면에는 ${theme === 'color' ? '컬러' : '타로'} 전용 디자인이 보여요. 여기서 고른 배경은 저장되고 매장·사주 모드에서 보여요.`
    : screen.liveEvent
      ? `지금 화면에는 ‘${screen.liveEvent.title}’ 행사 배경이 보여요. 여기서 고른 배경은 저장되고, 적용 중인 행사가 없을 때 보여요.`
      : ''

  return (
    <div className="kadm-pane">
      <ScreenFontFace ids={screen.backgrounds.map((item) => item.font ?? null)} />
      <div className="kadm-pane-head">
        <div>
          <h2 className="kadm-h1">평소 배경 <span className="kadm-pill">{modeCopy(mode).name}</span></h2>
          <p className="kadm-sub">행사가 없을 때 보여줄 배경이에요. · {screen.backgrounds.length}개</p>
        </div>
        <button type="button" className="kadm-btn kadm-btn--small" disabled={refreshing || saving || screen.loading} onClick={() => void refresh()}>
          새로고침 <RefreshCw className={refreshing ? 'kadm-rotating' : undefined} size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* 목록 아래쪽에서 눌러도 결과가 보이게 위에 붙여 둔다 */}
      {save && (
        <div className="kadm-sticky">
          {save.phase === 'saving' && <Notice tone="busy" title="배경을 저장하는 중이에요.">잠시만 기다려 주세요.</Notice>}
          {save.phase === 'saved' && (
            <Notice tone="ok" title="배경이 변경됐어요.">
              {save.font && findScreenFont(save.font) ? `추천 글꼴 ${findScreenFont(save.font)?.label}도 함께 적용됐어요.` : `${title(save.id)} 배경으로 저장했어요.`}
            </Notice>
          )}
          {save.phase === 'failed' && (
            <Notice tone="error" title="배경을 바꾸지 못했어요." action={<button type="button" className="kadm-btn kadm-btn--small kadm-btn--danger" onClick={() => void pick(save.id)}>다시 시도</button>}>
              이전 배경과 글꼴을 그대로 유지했어요. {save.message}
            </Notice>
          )}
          {save.phase === 'gone' && (
            <Notice tone="error" title="이 배경은 더 이상 사용할 수 없어요" action={<button type="button" className="kadm-btn kadm-btn--small kadm-btn--primary" disabled={refreshing} onClick={() => { setSave(null); void refresh() }}>새로고침</button>}>
              목록을 새로고침해 다른 배경을 골라 주세요. 기존 배경과 글꼴은 유지돼요.
            </Notice>
          )}
        </div>
      )}
      {!save && screen.error && (
        <Notice tone="warn" title="배경 목록을 불러오지 못했어요." action={<button type="button" className="kadm-btn kadm-btn--small" disabled={refreshing} onClick={() => void refresh()}>다시 불러오기</button>}>
          마지막으로 받은 목록이에요. 연결을 확인한 뒤 다시 눌러 주세요.
        </Notice>
      )}
      {!save && !screen.error && <Notice title="배경을 고르면 바로 저장돼요.">배경에 추천 글꼴이 있으면 화면 글꼴도 함께 바뀝니다.</Notice>}
      {showing && <Notice tone="warn" compact>{showing}</Notice>}

      {refreshing || (screen.loading && !screen.backgrounds.length) ? (
        <div className="kadm-empty"><Spinner size={34} /><b>배경 목록을 새로 불러오는 중이에요.</b><span>현재 적용된 배경은 유지돼요.</span></div>
      ) : !screen.backgrounds.length ? (
        <div className="kadm-empty"><ImageIcon size={40} strokeWidth={1.4} aria-hidden="true" /><b>고를 수 있는 배경이 없어요.</b><span>배경은 관리자 웹에서 등록해 주세요.</span></div>
      ) : (
        <div className="kadm-backgrounds">
          {list.map((item) => {
            const on = item.id === screen.selectedId
            const mine = saving && save.id === item.id
            const font = findScreenFont(item.font)
            return (
              <button key={item.id} type="button" aria-pressed={on} data-on={on || undefined} data-saving={mine || undefined} data-dim={(saving && !mine) || undefined} disabled={saving} onClick={() => void pick(item.id)}>
                <span className="kadm-bg-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnail_url || item.image_url} alt="" loading="lazy" decoding="async" />
                  <b style={{ fontFamily: screenFontFamily(item.font), color: item.ink }}>오늘의 최애향</b>
                  {on && <span className="kadm-check" aria-hidden="true"><Check size={20} strokeWidth={3} /></span>}
                  {on && <span className="kadm-bg-now">현재 선택</span>}
                  {mine && <span className="kadm-bg-busy"><Spinner size={30} />저장하는 중…</span>}
                </span>
                <b>{item.title}</b>
                <em>{font ? `추천 글꼴 · ${font.label}` : '추천 글꼴 없음'}</em>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
