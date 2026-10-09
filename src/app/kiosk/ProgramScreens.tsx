'use client'

// 퍼스널 컬러(Chromatic Archive) · 타로(Moonlit Garden) 전용 화면 부품 — 목업 C01–C19 · T01–T20.
// 기존(classic)·레트로·맥 셸이 모두 이 부품을 그대로 쓴다(셸마다 따로 그리면 실제 배포 화면인 classic 에만 빠지기 쉽다).
// 상태와 동작은 셸이 들고 있고 여기는 그리기만 한다. 터치 키보드처럼 셸마다 다른 부품은 ReactNode 로 받는다.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import {
  ArrowRight, Camera, CameraOff, Check, CircleAlert, Glasses, Lock, Pencil, RefreshCw, RotateCcw,
  ScanFace, Smartphone, Unlink, UserRound,
} from 'lucide-react'
import { GENDER_OPTIONS } from '@/app/[locale]/input/constants'
import { KIOSK_LANGS, type KioskLang, type KioskText } from '@/lib/kiosk/i18n'
import type { AnalyzeErrorKind } from '@/lib/kiosk/analyze-error'
import type { KioskProgramTheme } from '@/lib/kiosk/program-theme'
import { warmGarmentEngine } from '@/lib/kiosk/garment-recolor'
import type { ProgramUiText } from '@/lib/kiosk/program-ui-i18n'
import { TAROT_DECK, tarotArtSrc } from '@/lib/kiosk/tarot-deck'
import './program-screens.css'

/** 목업의 색 견본 띠 — 장식(진단 결과와 무관한 고정 8색) */
const SAMPLE_STRIP = ['#D9625A', '#F2B8A2', '#F2C44E', '#A6BE8C', '#8EC5E8', '#C9B3E3', '#F0C8B4', '#CEC3E2']

// ───────────────────────── 언어 · 머리띠 ─────────────────────────

export function ProgramLangMenu({ lang, open, onToggle, onPick, label, closeLabel }: {
  lang: KioskLang
  open: boolean
  onToggle: () => void
  onPick: (lang: KioskLang) => void
  label: string
  closeLabel: string
}) {
  return (
    <div className="pg-lang" data-open={open || undefined}>
      <button type="button" className="pg-lang-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={onToggle}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
        <span>{KIOSK_LANGS.find((l) => l.id === lang)?.code}</span>
      </button>
      {open && (
        <>
          <button type="button" className="pg-lang-scrim" aria-label={closeLabel} onClick={onToggle} />
          <ul className="pg-lang-menu" role="listbox" aria-label={label}>
            {KIOSK_LANGS.map((option) => (
              <li key={option.id}>
                <button type="button" role="option" aria-selected={option.id === lang} data-on={option.id === lang || undefined} lang={option.htmlLang} onClick={() => onPick(option.id)}>
                  <span>{option.label}</span>
                  {option.id === lang && <Check size={18} strokeWidth={2} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export type ProgramProgress =
  | { kind: 'stepper'; current: 0 | 1; labels: [string, string] }
  | { kind: 'bar'; index: number; total: number; label: string }
  | null

/** 화면 맨 위 — 작은 브랜드 줄 + 언어 버튼, 그 아래 단계 표시(컬러: 두 단계 / 타로: 진행 막대) */
export function ProgramTopBar({ brand, langMenu, progress }: { brand: string; langMenu: ReactNode; progress: ProgramProgress }) {
  return (
    <header className="pg-top">
      <div className="pg-brand">
        <span>{brand}</span>
        {langMenu}
      </div>
      {progress?.kind === 'stepper' && (
        <ol className="pg-stepper" aria-label={`${progress.current + 1} / 2`}>
          {progress.labels.map((label, i) => (
            <li key={label} data-state={i < progress.current ? 'done' : i === progress.current ? 'now' : 'todo'}>
              <span className="pg-stepper-dot" aria-hidden="true">{i < progress.current ? <Check size={14} strokeWidth={2.4} /> : i + 1}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      )}
      {progress?.kind === 'bar' && (
        <div className="pg-bar">
          <span>STEP {String(progress.index + 1).padStart(2, '0')}/{String(progress.total).padStart(2, '0')} · {progress.label}</span>
          <i><b style={{ width: `${((progress.index + 1) / progress.total) * 100}%` }} /></i>
        </div>
      )}
    </header>
  )
}

// ───────────────────────── 고객 정보 ─────────────────────────

export function ProgramInfoStep({ theme, t, ui, eyebrow, name, gender, onGender, onOpenKeyboard, keyboard, onHome, onNext }: {
  theme: KioskProgramTheme
  t: KioskText
  ui: ProgramUiText
  /** 타로의 '01 · PROFILE' */
  eyebrow?: string
  name: string
  gender: string
  onGender: (key: string) => void
  onOpenKeyboard: () => void
  /** 열려 있으면 셸의 터치 키보드 */
  keyboard: ReactNode | null
  onHome: () => void
  onNext: () => void
}) {
  const color = theme === 'color'
  const typing = Boolean(keyboard)
  return (
    <div className="ksk-body pg-body pg-info" data-typing={typing || undefined}>
      {!color && eyebrow && <p className="pg-eyebrow">{eyebrow}</p>}
      <h1 className="pg-title" data-center={color || undefined}>{color && typing ? ui.color.typingTitle : t.infoTitleSelf}</h1>
      <p className="pg-desc" data-center={color || undefined}>{color ? (typing ? ui.color.typingDesc : ui.color.infoDesc) : t.infoDesc}</p>
      <div className={color ? 'pg-card pg-info-card' : 'pg-info-card'}>
        <p className="pg-label">{color ? ui.color.nameLabel : t.nameLabel} <em>{t.nameOptional}</em></p>
        <button type="button" className="pg-input" data-empty={!name || undefined} data-active={typing || undefined} onClick={onOpenKeyboard}>
          <span>{name || t.namePlaceholder}</span>
          {color && !typing && <Pencil size={22} strokeWidth={1.6} aria-hidden="true" />}
        </button>
        <p className="pg-label">{color ? ui.color.genderLabel : t.genderLabel}</p>
        <div className="pg-choices">
          {GENDER_OPTIONS.map((g) => (
            <button key={g.key} type="button" className="pg-choice" data-on={gender === g.key || undefined} aria-pressed={gender === g.key} onClick={() => onGender(g.key)}>
              <span>{t.gender[g.key] ?? g.label}</span>
              {color && gender === g.key && <span className="pg-choice-check" aria-hidden="true"><Check size={14} strokeWidth={2.6} /></span>}
            </button>
          ))}
        </div>
      </div>
      {color && !typing && (
        <div className="pg-info-art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/kiosk-programs/color-archive-fan.webp" alt="" />
          <p>{ui.color.intro}</p>
        </div>
      )}
      <div className="pg-spacer" />
      {keyboard ?? (
        <div className="ksk-actions pg-actions">
          <button type="button" className="ksk-btn" onClick={onHome}>{t.home}</button>
          <button type="button" className="ksk-btn ksk-btn-primary" disabled={!gender} onClick={onNext}>
            <span>{t.next}</span>{color && <ArrowRight size={22} strokeWidth={2} aria-hidden="true" />}
          </button>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── 퍼스널 컬러 촬영 ─────────────────────────

export interface ColorCaptureProps {
  t: KioskText
  ui: ProgramUiText
  /** program-i18n 의 촬영·확인 제목 */
  titles: { capture: string; confirm: string }
  photo: string | null
  photoSource: 'camera' | 'qr'
  videoRef: RefObject<HTMLVideoElement | null>
  /** 3:4 액자 자리(useCamFrame) — 자리 요소를 받아 크기를 잰다 */
  frameRef: (el: HTMLDivElement | null) => void
  frameSize: { width: number; height: number } | null
  onPhotoLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void
  countdown: number | null
  camError: boolean
  /** 셸(Electron) 안이면 파일 선택(OS 탐색기)을 열지 않는다 */
  inShell: boolean
  onFile: (file: File) => void
  /** 얼굴을 못 찾은 사진 — 흐리게 보여 주고 다시 찍게 한다 */
  noFacePhoto: string | null
  qrState: 'idle' | 'creating' | 'waiting' | 'expired' | 'failed'
  qrDataUrl: string | null
  qrCode: string | null
  qrUnreachable: boolean
  onRetake: () => void
  onStart: () => void
  onUseCamera: () => void
  onUseQr: () => void
  onRegenQr: () => void
  onBackFromQr: () => void
  onPrev: () => void
  onShoot: () => void
}

const TIP_ICONS = [Glasses, UserRound, ScanFace]

export function ColorCaptureStep({
  t, ui, titles, photo, photoSource, videoRef, frameRef, frameSize, onPhotoLoad, countdown, camError, inShell, onFile, noFacePhoto, qrState, qrDataUrl, qrCode, qrUnreachable, onRetake, onStart, onUseCamera, onUseQr, onRegenQr, onBackFromQr, onPrev, onShoot,
}: ColorCaptureProps) {
  const c = ui.color
  // 진단용 얼굴 사진을 만드는 엔진을 사진 찍는 동안 깨워 둔다(파일을 받아 둔 기기에서만 — 망을 쓰지 않는다)
  useEffect(() => warmGarmentEngine(), [])

  // C05 · C15 — 폰으로 올리기(QR)
  if (!photo && photoSource === 'qr') {
    const failed = qrState === 'failed' || qrState === 'expired'
    return (
      <div className="ksk-body pg-body pg-capture" data-view="qr">
        <h1 className="pg-title">{c.qrTitle}</h1>
        <p className="pg-desc">{c.qrDesc}</p>
        <div className="pg-card pg-qr" data-state={qrState}>
          {(qrState === 'creating' || qrState === 'idle') && (
            <p className="pg-qr-msg" role="status"><RefreshCw className="pg-spin" size={30} strokeWidth={1.6} aria-hidden="true" />{c.qrCreating}</p>
          )}
          {failed && (
            <div className="pg-qr-msg" role="alert">
              <Unlink size={72} strokeWidth={1.2} aria-hidden="true" />
              <p>{(qrState === 'expired' ? c.qrExpired : c.qrFailed).split('\n').map((line) => <span key={line}>{line}</span>)}</p>
            </div>
          )}
          {qrState === 'waiting' && qrDataUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pg-qr-img" src={qrDataUrl} alt={t.qrAlt} />
              <p className="pg-qr-caption">{c.qrCaption} · {qrCode}</p>
              {qrUnreachable && (
                <p className="pg-qr-warn">설정 오류: QR이 이 기기의 로컬 주소를 가리켜 폰에서 열리지 않습니다. NEXT_PUBLIC_SITE_URL을 설정해 주세요. (직원 확인 필요)</p>
              )}
              <ol className="pg-qr-steps">
                {c.qrSteps.map((line, i) => <li key={line}><b>{i + 1}</b><span>{line}</span></li>)}
              </ol>
            </>
          )}
        </div>
        {!failed && <p className="pg-note"><Lock size={20} strokeWidth={1.6} aria-hidden="true" />{c.qrPrivacy}</p>}
        <div className="pg-spacer" />
        <button type="button" className="ksk-alt pg-wide" onClick={onBackFromQr}>{c.qrBack}</button>
        <div className="ksk-actions pg-actions">
          <button type="button" className="ksk-btn" onClick={onUseCamera}><Camera size={22} strokeWidth={1.6} aria-hidden="true" /><span>{c.useCamera}</span></button>
          <button type="button" className="ksk-btn ksk-btn-primary" disabled={qrState === 'creating'} onClick={onRegenQr}><RefreshCw size={22} strokeWidth={1.8} aria-hidden="true" /><span>{c.regenQr}</span></button>
        </div>
      </div>
    )
  }

  // C06 — 찍은(받은) 사진 확인
  if (photo) {
    return (
      <div className="ksk-body pg-body pg-capture" data-view="confirm">
        <h1 className="pg-title">{titles.confirm}</h1>
        <p className="pg-desc">{c.confirmDesc}</p>
        <div className="ksk-cam-slot pg-cam-slot" ref={frameRef}>
          <div className="ksk-cam pg-cam" style={frameSize ?? undefined} data-fit={photoSource !== 'camera' ? 'contain' : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={t.selectedPhotoAlt} onLoad={onPhotoLoad} />
          </div>
        </div>
        <div className="pg-strip" aria-hidden="true">{SAMPLE_STRIP.map((hex) => <i key={hex} style={{ background: hex }} />)}</div>
        <p className="pg-check"><span aria-hidden="true"><Check size={16} strokeWidth={2.4} /></span>{c.confirmCheck}</p>
        <p className="pg-note pg-note--small">{c.privacy}</p>
        <div className="ksk-actions pg-actions">
          <button type="button" className="ksk-btn" onClick={onRetake}><RotateCcw size={22} strokeWidth={1.8} aria-hidden="true" /><span>{c.retake}</span></button>
          <button type="button" className="ksk-btn ksk-btn-primary" onClick={onStart}><span>{c.start}</span><ArrowRight size={22} strokeWidth={2} aria-hidden="true" /></button>
        </div>
      </div>
    )
  }

  // C04 · C12 · C13 — 촬영(카운트다운 · 카메라 없음 · 얼굴 못 찾음은 같은 자리에 겹친다)
  return (
    <div className="ksk-body pg-body pg-capture" data-view="camera">
      <h1 className="pg-title">{titles.capture}</h1>
      <p className="pg-desc">{c.captureDesc}</p>
      <div className="ksk-cam-slot pg-cam-slot" ref={frameRef}>
        <div className="ksk-cam pg-cam" style={frameSize ?? undefined} data-error={camError || undefined}>
          {/* 카메라는 늘 붙여 둔다 — 얼굴 못 찾음 사진을 덮어 보여 주는 동안에도 다음 촬영이 바로 되게 */}
          <video ref={videoRef} playsInline muted />
          {noFacePhoto && !camError && (
            <div className="pg-noface" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={noFacePhoto} alt="" />
              <i />
            </div>
          )}
          {!noFacePhoto && !camError && <span className="pg-guide" aria-hidden="true"><i /><b /></span>}
          {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => <i key={pos} className="pg-corner" data-pos={pos} aria-hidden="true" />)}
          {countdown !== null && <div className="pg-count" aria-live="assertive">{countdown}</div>}
          {camError && (
            <div className="pg-nocam" role="alert">
              <CameraOff size={56} strokeWidth={1.4} aria-hidden="true" />
              <p><b>{c.camOff}</b><span>{c.camChecking}</span></p>
              {inShell ? <span>{t.callStaff}</span> : (
                <label className="pg-file">
                  {c.useFile}
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                </label>
              )}
            </div>
          )}
        </div>
      </div>
      {noFacePhoto && !camError && (
        <p className="pg-alert" role="alert"><CircleAlert size={30} strokeWidth={1.7} aria-hidden="true" /><span><b>{c.noFace[0]}</b>{c.noFace[1]}</span></p>
      )}
      <ul className="pg-tips">
        {c.tips.map((tip, i) => {
          const Icon = TIP_ICONS[i]
          return <li key={tip}><Icon size={24} strokeWidth={1.5} aria-hidden="true" /><span>{tip}</span></li>
        })}
      </ul>
      <div className="pg-spacer" />
      <button type="button" className="ksk-alt pg-wide" disabled={countdown !== null} onClick={onUseQr}><Smartphone size={22} strokeWidth={1.6} aria-hidden="true" /><span>{c.useQr}</span></button>
      <div className="ksk-actions pg-actions">
        <button type="button" className="ksk-btn" onClick={onPrev}>{t.prev}</button>
        <button type="button" className="ksk-btn ksk-btn-primary" disabled={camError || countdown !== null} onClick={onShoot}>
          <Camera size={22} strokeWidth={1.8} aria-hidden="true" /><span>{countdown !== null ? t.shooting : t.shoot}</span>
        </button>
      </div>
    </div>
  )
}

// ───────────────────────── 분석 대기 ─────────────────────────

/** 응답 한 번으로 끝나는 요청이라 진행률을 모른다 — 시간에 따라 90% 까지 천천히 차고, 끝나면 100% */
function useSoftProgress(done: boolean, tau: number) {
  const [progress, setProgress] = useState(4)
  useEffect(() => {
    if (done) return
    const started = Date.now()
    const timer = window.setInterval(() => setProgress(Math.max(4, Math.min(90, Math.round(90 * (1 - Math.exp(-(Date.now() - started) / tau)))))), 300)
    return () => window.clearInterval(timer)
  }, [done, tau])
  return done ? 100 : progress
}

export function ProgramAnalyzing({ theme, ui, name, statusLines, eta, done, cards = [] }: {
  theme: KioskProgramTheme
  ui: ProgramUiText
  name: string
  statusLines: string[]
  eta: string
  done: boolean
  /** 타로 — 뽑은 세 장(뒤에 흐리게 깐다) */
  cards?: number[]
}) {
  const progress = useSoftProgress(done, theme === 'color' ? 9000 : 11000)
  const [line, setLine] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setLine((i) => i + 1), 2600)
    return () => window.clearInterval(timer)
  }, [])

  if (theme === 'color') {
    const c = ui.color
    const stage = progress < 34 ? 0 : progress < 70 ? 1 : 2
    return (
      <div className="ksk-body pg-body pg-analyzing" data-theme="color" role="status" aria-live="polite">
        <h1 className="pg-title pg-title--hero" data-center>{c.analyzingTitle(name).split('\n').map((l) => <span key={l}>{l}</span>)}</h1>
        <p className="pg-desc" data-center>{c.analyzingDesc}</p>
        <div className="pg-analyzing-art" aria-hidden="true">
          <svg className="pg-ring" viewBox="0 0 200 200">
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i / 36) * Math.PI * 2 - Math.PI / 2
              const on = i / 36 < progress / 100
              return <circle key={i} cx={100 + 92 * Math.cos(a)} cy={100 + 92 * Math.sin(a)} r={on ? 2.6 : 1.7} data-on={on || undefined} />
            })}
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/kiosk-programs/color-archive-fan.webp" alt="" />
        </div>
        <ol className="pg-card pg-checklist">
          {c.analyzingSteps.map((step, i) => (
            <li key={step} data-state={i < stage || done ? 'done' : i === stage ? 'now' : 'todo'}>
              <span aria-hidden="true">{i < stage || done ? <Check size={16} strokeWidth={2.6} /> : null}</span>
              {step}
            </li>
          ))}
        </ol>
        <div className="pg-segments" aria-label={`${progress}%`}>
          {[0, 1, 2].map((i) => <i key={i}><b style={{ width: `${Math.max(0, Math.min(1, progress / 100 * 3 - i)) * 100}%` }} /></i>)}
        </div>
        <p className="pg-wait">{c.analyzingWait}</p>
        <div className="pg-spacer" />
        <p className="pg-foot">{c.privacy}</p>
      </div>
    )
  }

  return (
    <div className="ksk-body pg-body pg-analyzing" data-theme="tarot" role="status" aria-live="polite">
      <div className="pg-moon" aria-hidden="true"><span>☾</span><span>✦</span></div>
      <p className="pg-kicker">ANALYZING</p>
      <p className="pg-percent">{progress}%</p>
      <i className="pg-progress"><b style={{ width: `${progress}%` }} /></i>
      <p className="pg-status">{statusLines.length ? statusLines[line % statusLines.length] : ui.tarot.analyzingTitle}</p>
      <p className="pg-eta">{eta}</p>
      <div className="pg-ghost-cards" aria-hidden="true">
        {cards.slice(0, 3).map((id, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${id}-${i}`} src={tarotArtSrc(id)} alt="" style={{ '--i': i } as CSSProperties} title={TAROT_DECK[id]?.names.en} />
        ))}
      </div>
    </div>
  )
}

// ───────────────────────── 분석 오류 ─────────────────────────

export function ProgramAnalyzeError({ theme, t, ui, kind, onHome, onRetry, onRetake }: {
  theme: KioskProgramTheme
  t: KioskText
  ui: ProgramUiText
  kind: AnalyzeErrorKind
  onHome: () => void
  onRetry: () => void
  /** 퍼스널 컬러 — 사진이 원인일 수 있어 다시 찍는 길을 준다 */
  onRetake?: () => void
}) {
  return (
    <div className="ksk-body pg-body pg-error-wrap" data-theme={theme}>
      <div className="pg-spacer" />
      <section className="pg-card pg-error" role="alert">
        {theme === 'tarot' && <p className="pg-error-moon" aria-hidden="true"><i />☾<i /></p>}
        {theme === 'color' && <CircleAlert size={44} strokeWidth={1.5} aria-hidden="true" />}
        <p className="pg-error-label">{kind === 'network' ? 'OFFLINE' : ui.error.label}</p>
        <h1 className="pg-title">{t.analyzeError[`${kind}Title`]}</h1>
        <p className="pg-desc">{t.analyzeError[`${kind}Desc`]}</p>
        <div className="pg-error-actions">
          <button type="button" className="ksk-btn" onClick={onHome}>{t.analyzeError.home}</button>
          <button type="button" className="ksk-btn ksk-btn-primary" onClick={onRetry}>{t.analyzeError.retry}</button>
        </div>
        {onRetake && <button type="button" className="ksk-alt pg-wide" onClick={onRetake}>{ui.error.retake}</button>}
      </section>
      <div className="pg-spacer" />
    </div>
  )
}

// ───────────────────────── 무입력 안내 · 영수증 미리보기 ─────────────────────────

export function ProgramIdleDialog({ t, left, total }: { t: KioskText; left: number; total: number }) {
  return (
    // 화면 어디를 눌러도(pointerdown) 시간이 다시 채워지고 닫힌다 — 셸의 무입력 타이머가 맡는다
    <div className="pg-idle" role="alertdialog" aria-live="assertive" aria-label={t.idleTitle}>
      <div className="pg-idle-card">
        <span className="pg-idle-count" style={{ '--p': left / total } as CSSProperties}><b>{left}</b></span>
        <h2>{t.idleTitle}</h2>
        <p>{t.idleDesc}</p>
        <button type="button" className="ksk-btn ksk-btn-primary">{t.idleContinue}</button>
      </div>
    </div>
  )
}

export function ProgramReceiptModal({ t, title, desc, dataUrl, primaryLabel, busy, onClose, onPrimary, onHome }: {
  t: KioskText
  title?: string
  desc?: string
  dataUrl: string
  primaryLabel: string
  busy: boolean
  onClose: () => void
  onPrimary: () => void
  onHome: () => void
}) {
  const paper = useRef<HTMLDivElement>(null)
  useEffect(() => { paper.current?.scrollTo({ top: 0 }) }, [dataUrl])
  return (
    <div className="pg-receipt" role="dialog" aria-modal="true" aria-label={title ?? t.receiptAlt}>
      {title && <h2 className="pg-receipt-title">{title}</h2>}
      {desc && <p className="pg-receipt-desc">{desc}</p>}
      <div className="pg-receipt-paper" ref={paper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={t.receiptAlt} />
      </div>
      <p className="pg-receipt-note">{t.receiptNote}</p>
      <div className="pg-receipt-actions">
        <button type="button" className="ksk-btn" onClick={onClose}>{t.close}</button>
        <button type="button" className="ksk-btn ksk-btn-primary" disabled={busy} onClick={onPrimary}>{busy ? t.printing : primaryLabel}</button>
      </div>
      <button type="button" className="ksk-btn pg-receipt-home" onClick={onHome}>{t.home}</button>
    </div>
  )
}
