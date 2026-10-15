'use client'

// 포토부스 프로그램 전용 화면(14종) — 운영 모드가 프로그램이면(매장) 또는 /booth?mode=<id>&demo=1(영업용 데모)이면 BoothScreen 이 싣는다.
// 1280×720 기준 화면을 모니터 크기에 맞춰 키운다(1280×720·1366×768·1920×1080 모두 같은 배치, 누르는 곳 56px 이상).
// 손님 한 명 = 한 세션: 처음으로 가면 흐름을 통째로 새로 싣는다(카메라·마이크·타이머·영상 주소·받은 사진 정리는 각 흐름의 정리 코드).
//
// 매장: 이용권 정책(src/lib/booth/pass-policy.ts)대로 이용권 번호를 받고, 촬영 통계를 남기고, 오른쪽 아래를 길게 누르면 STORE ADMIN(운영 모드).
// 데모: 이용권·통계·관리자 없이, 데모 표(1분 3장·하루 40장 — 모든 데모 생성이 함께 센다)로만 생성·저장한다. 기기 설정을 바꾸지 않는다.

import { Camera, CircleHelp, Home, Image as ImageIcon, Loader2, Lock, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { findProgram, type ProgramDef, type ProgramId } from '@/lib/booth/programs/catalog'
import { boothPassRequired, requestFreeIdolTicket } from '@/lib/booth/pass-policy'
import { requestDemoTicket } from '@/lib/booth/demo'
import { useScreenBackgrounds } from '@/lib/screen-backgrounds/use-screen-backgrounds'
import { BoothModeControls } from '@/components/screen/BoothModeControls'
import { BoothWatermark } from '@/components/photobooth/BoothWatermark'
import { FONT_VARS } from './fonts'
import { logProgramShot, markProgramShot } from './save'
import type { FlowCtx } from './flow'
import { PhotoFlow } from './PhotoFlow'
import { MvFlow } from './MvFlow'
import { MovieFlow } from './MovieFlow'
import { Modal, Wordmark } from './ui'
import './programs.css'

const BASE_W = 1280
const BASE_H = 720
/** 손님 손이 멈춘 뒤 확인 창까지 / 확인 창에서 처음으로까지 */
const IDLE_MS = 45_000
const IDLE_PROMPT_S = 30
const ADMIN_HOLD_MS = 1500

type Screen = 'start' | 'pass' | 'flow'

function useStageScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

export function ProgramApp({ id, demo }: { id: ProgramId; demo: boolean }) {
  const program = findProgram(id)!
  const scale = useStageScale()
  const screenSettings = useScreenBackgrounds('booth')
  const { baseSettings, synced } = screenSettings
  const passRequired = !demo && boothPassRequired(baseSettings)
  const [screen, setScreen] = useState<Screen>('start')
  const [session, setSession] = useState(0)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [idlePrompt, setIdlePrompt] = useState(false)
  const [help, setHelp] = useState(false)
  const [admin, setAdmin] = useState(false)
  const ticketRef = useRef<string | null>(null)
  const shotRef = useRef<string | null>(null)
  const lastInput = useRef(0)

  // 문서 언어·제목
  useEffect(() => {
    document.title = `${program.wordmark} ${program.name}`
  }, [program])

  /** 다음 손님 — 흐름을 새로 싣고 표·기록을 버린다 */
  const home = useCallback(() => {
    setScreen('start'); setSession((n) => n + 1); setStep(1)
    setBusy(false); setDirty(false); setConfirmExit(false); setIdlePrompt(false); setHelp(false)
    ticketRef.current = null; shotRef.current = null
  }, [])
  const requestHome = useCallback(() => {
    if (dirty || busy) setConfirmExit(true)
    else home()
  }, [dirty, busy, home])

  // 매장 운영 모드가 다른 것으로 바뀌면(STORE ADMIN) 손님이 없을 때 새로고침 — BoothScreen 이 다시 고른다
  useEffect(() => {
    if (demo || !synced || screen !== 'start' || admin) return
    if ((baseSettings.mode ?? null) !== id) window.location.reload()
  }, [demo, synced, screen, admin, baseSettings.mode, id])

  /** 생성·저장 표 — 데모는 데모 표, 매장은 이용권 확인 때 받은 표, 이용권 없는 모드는 무료 표 */
  const getTicket = useCallback(async () => {
    if (ticketRef.current) return ticketRef.current
    const ticket = demo ? await requestDemoTicket() : passRequired ? null : await requestFreeIdolTicket()
    if (!ticket) throw new Error(demo ? '데모 이용이 잠시 몰려 있어요. 잠시 후 다시 해 주세요.' : passRequired ? '이용권을 먼저 확인해 주세요.' : '잠시 후 다시 시도해 주세요.')
    ticketRef.current = ticket
    return ticket
  }, [demo, passRequired])

  const onResult = useCallback(() => {
    if (demo || shotRef.current) return
    void logProgramShot(program.id).then((shot) => { shotRef.current = shot })
  }, [demo, program.id])
  const markShot = useCallback((patch: { printed?: boolean; downloaded?: boolean }) => { if (!demo) markProgramShot(shotRef.current, patch) }, [demo])

  const ctx = useMemo<FlowCtx>(() => ({
    program, demo, getTicket, home, requestHome, setBusy, setDirty, setStep, onResult, markShot,
  }), [program, demo, getTicket, home, requestHome, onResult, markShot])

  // 무입력 — 진행 화면에서 45초 손이 없으면 확인 창(30초 뒤 처음으로). 생성·녹화·업로드 중에는 묻지 않는다
  useEffect(() => {
    const touch = () => { lastInput.current = Date.now() }
    window.addEventListener('pointerdown', touch)
    window.addEventListener('keydown', touch)
    return () => { window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch) }
  }, [])
  useEffect(() => {
    if (screen === 'start' || busy || idlePrompt || admin) return
    lastInput.current = Date.now()
    const timer = window.setInterval(() => {
      if (Date.now() - lastInput.current > IDLE_MS) setIdlePrompt(true)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [screen, busy, idlePrompt, admin])

  const start = () => {
    if (passRequired) setScreen('pass')
    else setScreen('flow')
  }

  return (
    <div className={`pg ${FONT_VARS}`} data-program={program.id} data-kind={program.kind}>
      <div className="pg-stage" style={{ '--pg-scale': scale } as CSSProperties}>
        <TopBar program={program} screen={screen} step={step} onHome={requestHome} onHelp={() => setHelp(true)} />
        <main className="pg-body">
          {screen === 'start' && <StartScreen program={program} onStart={start} />}
          {screen === 'pass' && <PassScreen onBack={home} onTicket={(t) => { ticketRef.current = t; setScreen('flow') }} />}
          {screen === 'flow' && (
            program.kind === 'photo' ? <PhotoFlow key={session} ctx={ctx} />
              : program.kind === 'mv' ? <MvFlow key={session} ctx={ctx} />
                : <MovieFlow key={session} ctx={ctx} />
          )}
        </main>
        {!demo && screen === 'start' && <AdminHold onOpen={() => setAdmin(true)} />}

        {confirmExit && (
          <Modal label="체험을 마칠까요?" onClose={() => setConfirmExit(false)}>
            <h3>체험을 마칠까요?</h3>
            <p>{busy ? '지금 만드는 중이에요. 마치면 진행 중인 결과는 사라져요.' : '저장하지 않은 결과는 다시 볼 수 없어요.'}</p>
            <div className="pg-actions">
              <button type="button" className="pg-btn pg-btn--line pg-btn--grow" onClick={() => setConfirmExit(false)}>계속 체험하기</button>
              <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={home}>체험 마치기</button>
            </div>
          </Modal>
        )}
        {idlePrompt && <IdlePrompt onStay={() => { lastInput.current = Date.now(); setIdlePrompt(false) }} onHome={home} />}
        {help && (
          <Modal label="도움말" onClose={() => setHelp(false)}>
            <h3>도움말</h3>
            <ul className="pg-help">
              <li><Camera size={22} />화면의 가이드 안에 얼굴이 들어오게 서 주세요. 타이머가 끝나면 찍혀요.</li>
              <li><ImageIcon size={22} />카메라가 안 되면 휴대폰 사진으로도 할 수 있어요.</li>
              <li><Sparkles size={22} />{program.kind === 'photo' ? 'AI 사진은 보통 20~40초 걸려요. 실패해도 찍은 사진과 옵션은 그대로예요.' : '영상은 길이만큼 시간이 걸려요. 완성되면 QR로 휴대폰에 받아요.'}</li>
              <li><CircleHelp size={22} />문제가 계속되면 매장 직원에게 말씀해 주세요.</li>
            </ul>
            <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={() => setHelp(false)}>닫기</button>
          </Modal>
        )}
        {admin && <AdminPanel settings={screenSettings} onClose={() => setAdmin(false)} />}
      </div>
      {demo && <BoothWatermark />}
    </div>
  )
}

function TopBar({ program, screen, step, onHome, onHelp }: { program: ProgramDef; screen: Screen; step: 1 | 2 | 3; onHome: () => void; onHelp: () => void }) {
  return (
    <header className="pg-top">
      <button type="button" className="pg-icon-btn" onClick={onHome} aria-label="처음으로"><Home size={24} /><span>처음으로</span></button>
      <div className="pg-top-mid">
        <Wordmark program={program} size="sm" />
        <span className="pg-top-name">{program.name}</span>
      </div>
      {screen === 'flow' && (
        <ol className="pg-dots" aria-label={`${step} / 3 단계`}>
          {program.steps.map((label, i) => (
            <li key={label} data-state={i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'todo'}><i>{i + 1}</i><span>{label}</span></li>
          ))}
        </ol>
      )}
      <button type="button" className="pg-icon-btn" onClick={onHelp} aria-label="도움말"><CircleHelp size={24} /><span>도움말</span></button>
    </header>
  )
}

function StartScreen({ program, onStart }: { program: ProgramDef; onStart: () => void }) {
  return (
    <div className="pg-split pg-start">
      <div className="pg-visual">
        <figure className="pg-intro">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={program.intro} alt={`${program.name} 예시`} />
          <figcaption>예시 이미지</figcaption>
        </figure>
        <p className="pg-script" aria-hidden="true">{program.script}</p>
      </div>
      <div className="pg-panel">
        <p className="pg-kicker">{program.name}</p>
        <Wordmark program={program} size="xl" />
        <h1 className="pg-headline">{program.headline.split('\n').map((l, i) => <span key={i}>{l}</span>)}</h1>
        <p className="pg-lead">{program.lead}</p>
        <ol className="pg-flow-steps">
          {program.steps.map((s, i) => <li key={s}><i>{i + 1}</i><span>{s}</span></li>)}
        </ol>
        {program.creative && <p className="pg-creative">{program.creative}</p>}
        <button type="button" className="pg-btn pg-btn--accent pg-btn--hero" onClick={onStart}>{program.startCta}<span aria-hidden="true">→</span></button>
      </div>
    </div>
  )
}

/** 이용권 번호 6자리 — 매장 이용권 정책이 '입력해야 촬영'일 때. 확인되면 생성 표를 받는다 */
function PassScreen({ onBack, onTicket }: { onBack: () => void; onTicket: (ticket: string) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  // 연달아 빨리 눌러도 빠지지 않게 지금 값을 ref 로
  const codeRef = useRef('')
  const press = async (key: string) => {
    if (checking) return
    const next = key === 'back' ? codeRef.current.slice(0, -1) : (codeRef.current + key).slice(0, 6)
    codeRef.current = next
    setCode(next); setError(null)
    if (next.length !== 6) return
    setChecking(true)
    try {
      const res = await fetch('/api/photobooth/pass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: next }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.idolTicket !== 'string') throw new Error(data.error || '이용권을 확인하지 못했어요.')
      onTicket(data.idolTicket)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '이용권을 확인하지 못했어요.')
      setCode(''); codeRef.current = ''
    } finally {
      setChecking(false)
    }
  }
  return (
    <div className="pg-split pg-pass">
      <div className="pg-visual pg-pass-visual"><Lock size={96} aria-hidden="true" /><p>카운터에서 받은 이용권 번호를 입력해 주세요</p></div>
      <div className="pg-panel">
        <header className="pg-head"><h2><span>이용권 번호 6자리</span></h2><p>번호를 넣으면 바로 시작해요</p></header>
        <div className="pg-pin" aria-label={`${code.length}자리 입력됨`}>{Array.from({ length: 6 }, (_, i) => <i key={i} data-filled={i < code.length || undefined} />)}</div>
        {error && <p className="pg-error-text" role="alert">{error}</p>}
        <div className="pg-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0'].map((k) => (
            <button key={k} type="button" onClick={() => void press(k)} disabled={checking} aria-label={k === 'back' ? '지우기' : k}>{k === 'back' ? '←' : k}</button>
          ))}
          <button type="button" onClick={onBack} aria-label="처음으로"><X size={24} /></button>
        </div>
        {checking && <p className="pg-muted"><Loader2 className="pg-spin" size={16} />확인 중…</p>}
      </div>
    </div>
  )
}

function IdlePrompt({ onStay, onHome }: { onStay: () => void; onHome: () => void }) {
  const [left, setLeft] = useState(IDLE_PROMPT_S)
  useEffect(() => {
    const started = Date.now()
    const timer = window.setInterval(() => {
      const next = IDLE_PROMPT_S - Math.floor((Date.now() - started) / 1000)
      setLeft(next)
      if (next <= 0) { window.clearInterval(timer); onHome() }
    }, 250)
    return () => window.clearInterval(timer)
  }, [onHome])
  return (
    <Modal label="계속 이용하고 계신가요?">
      <h3>계속 이용하고 계신가요?</h3>
      <div className="pg-idle-ring" style={{ '--left': left / IDLE_PROMPT_S } as CSSProperties}><b>{Math.max(0, left)}</b></div>
      <p>{Math.max(0, left)}초 뒤 처음 화면으로 돌아가요.</p>
      <div className="pg-stack">
        <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={onStay}>계속 이용하기</button>
        <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={onHome}>처음으로</button>
      </div>
    </Modal>
  )
}

/** 오른쪽 아래 빈 곳을 1.5초 누르면 STORE ADMIN(매장만) */
function AdminHold({ onOpen }: { onOpen: () => void }) {
  const timer = useRef<number | undefined>(undefined)
  const cancel = () => { window.clearTimeout(timer.current); timer.current = undefined }
  return (
    <button
      type="button" className="pg-admin-hold" aria-label="매장 관리자"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); cancel(); timer.current = window.setTimeout(onOpen, ADMIN_HOLD_MS) }}
      onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
    />
  )
}

function AdminPanel({ settings, onClose }: { settings: ReturnType<typeof useScreenBackgrounds>; onClose: () => void }) {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const pinRef = useRef('')
  const press = async (key: string) => {
    if (checking) return
    const next = key === 'back' ? pinRef.current.slice(0, -1) : (pinRef.current + key).slice(0, 6)
    pinRef.current = next
    setPin(next); setError(null)
    if (next.length !== 6) return
    setChecking(true)
    try {
      const ok = await settings.unlock(next)
      if (ok) setUnlocked(true)
      else { setError('비밀번호가 맞지 않아요.'); setPin(''); pinRef.current = '' }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '확인하지 못했어요.'); setPin(''); pinRef.current = ''
    } finally {
      setChecking(false)
    }
  }
  return (
    <Modal label="STORE ADMIN" onClose={onClose}>
      <div className="pg-admin">
        <header><b>STORE ADMIN</b><button type="button" className="pg-icon-btn" onClick={onClose} aria-label="닫기"><X size={24} /></button></header>
        {!unlocked ? (
          <>
            <p>관리자 비밀번호 6자리</p>
            <div className="pg-pin">{Array.from({ length: 6 }, (_, i) => <i key={i} data-filled={i < pin.length || undefined} />)}</div>
            {error && <p className="pg-error-text" role="alert">{error}</p>}
            <div className="pg-keypad pg-keypad--sm">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0'].map((k) => (
                <button key={k} type="button" onClick={() => void press(k)} disabled={checking}>{k === 'back' ? '←' : k}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="pg-admin-body">
            <BoothModeControls value={settings.baseSettings.mode} pass={settings.baseSettings.pass} onSave={settings.saveSettings} onSelectBackground={settings.selectBackground} />
            <p className="pg-muted">다른 모드를 고르면 닫을 때 그 화면으로 바뀝니다.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
