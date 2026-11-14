'use client'
/* eslint-disable @next/next/no-img-element -- 화면의 그림은 모두 기기 안에서 만든 data: 그림이라 next/image 를 거치지 않는다 */

// 펀그라운드 B안 1. 타임캡슐 포토 「LATER!」 — 가로 1920×1080 화면(32인치 가로 터치스크린 · 가로 카메라).
// A안 LATER!(AI 가 10 · 20년 뒤 얼굴을 그림)를 B안(외부 AI 0)으로 — 얼굴은 바꾸지 않고, 오늘의 나를 미래 장면에 넣어
// 미래의 나에게 한마디 · 「20XX년 X월 X일에 다시 열어 보세요」를 적은 4×6 사진으로 준다.
// 화면마다 왼쪽 큰 그림 · 고르기 / 오른쪽 제목 · 고른 것 · 단추 — THEME!(../theme) 과 같은 짜임. 인화만 세로 4×6.
// 시작 → 언제(10년 · 20년 뒤) → 미래 장면(3) → 한마디(6 중 1) → 카메라(1~4명, 3-2-1, 다시 찍기) → 기기 안 합성 → 4×6 결과 → 인쇄 / 처음으로.
// 사람 분리는 THEME! · FUTURE NEWS! 와 같은 cutoutWebcamPerson(MediaPipe 다중 클래스 + MODNet, src/lib/funground/cutout.ts — 모델 · WASM 은 우리 public/). 외부 AI · 이미지 서비스는 부르지 않는다.
// 사진은 이 화면 메모리에만 있다. 예외: 브라우저 데모에서 「사진 인쇄하기」를 누르면 그 4×6 한 장만 QR 받기용으로 우리 서버에 올린다(FgPrintButton, 24시간).
//
// 카메라: 데모는 웹캠. 설치 기기는 주소에 camera=dslr 를 붙이면 DSLR 브리지를 먼저 찾는다(THEME! 과 같음).
// 인쇄: 부스 앱(설치 기기)이면 boothShell.print 로 4×6 프린터에 바로, 브라우저면 FgPrintButton(미리보기 + QR).

import {
  CalendarClock, Camera, CameraOff, Check, Home, Loader2, LockKeyhole, MessageCircleHeart, Printer, RefreshCw, RotateCcw,
  ScanFace, ShieldCheck, Sparkles, Timer, Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FgPrintButton, type FgPrintable } from '@/components/funground/FgResultSheet'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { useCamera } from '@/app/booth/programs/use-camera'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import { cutoutWebcamPerson, warmupWebcamCutout } from '@/lib/funground/cutout'
import { loadThemeFont } from '@/lib/funground/theme-photo'
import {
  LATER_MESSAGES, LATER_SCENES, LATER_SCENE_BY_ID, LATER_TONE, LATER_YEARS, composeLaterPhoto, koreanDate, loadLaterArt, openDate,
  renderLaterPreview, type LaterSceneId, type LaterYears,
} from '@/lib/funground/later-photo'
import './later.css'

type Step = 'intro' | 'when' | 'scene' | 'message' | 'camera' | 'review' | 'making' | 'result'
type PrintState = 'idle' | 'sending' | 'sent' | 'failed'

/** 찍는 사진 비율(가로 16:9) — 미리보기에 보인 만큼만 찍는다(THEME! 과 같음, 나란히 선 4명의 양 끝이 잘리지 않게) */
const SHOT_ASPECT = 16 / 9
/** 아무도 만지지 않으면 처음으로(초) */
const IDLE_SECONDS = 90
/** 인물 면적이 이보다 작으면 사람을 못 찾은 것으로 본다 */
const MIN_COVERAGE = 0.02
const STEP_DOTS: Step[] = ['when', 'scene', 'message', 'camera', 'making', 'result']
const PRIVACY = '외부 AI 서비스로 보내지 않아요 · 인쇄 · QR 받기를 누를 때만 결과를 올려 24시간 보관해요'
/** 고르기 전 견본에 쓰는 기본값 */
const SAMPLE_YEARS: LaterYears = 10
const SAMPLE_MESSAGE = LATER_MESSAGES[0]

/** 가운데를 남기고 비율에 맞춰 자른다 */
function cropToAspect(src: HTMLCanvasElement, aspect: number): HTMLCanvasElement {
  const { width: w, height: h } = src
  let cw = w
  let ch = Math.round(w / aspect)
  if (ch > h) { ch = h; cw = Math.round(h * aspect) }
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  out.getContext('2d')!.drawImage(src, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, cw, ch)
  return out
}

export function LaterPhoto({ artReady }: { artReady: LaterSceneId[] }) {
  const [step, setStep] = useState<Step>('intro')
  const [years, setYears] = useState<LaterYears | null>(null)
  const [sceneId, setSceneId] = useState<LaterSceneId | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [font, setFont] = useState<string | null>(null)
  const [arts, setArts] = useState<Partial<Record<LaterSceneId, HTMLImageElement | null>>>({})
  const [thumbs, setThumbs] = useState<Partial<Record<LaterSceneId, string>>>({})
  const [shot, setShot] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const [cutout, setCutout] = useState<HTMLCanvasElement | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [printState, setPrintState] = useState<PrintState>('idle')
  const [allowDslr, setAllowDslr] = useState(false)
  /** 부스 앱(설치 기기)이면 프린터로 바로 — 브라우저면 미리보기 · QR 창 */
  const [hasShell, setHasShell] = useState(false)
  /** 오늘(화면을 연 날) — 서버 그림과 어긋나지 않게 브라우저에서 정한다 */
  const [today, setToday] = useState<Date | null>(null)
  const scene = sceneId ? LATER_SCENE_BY_ID[sceneId] : null

  useEffect(() => {
    setAllowDslr(new URLSearchParams(window.location.search).get('camera') === 'dslr')
    setHasShell(getBoothShell() !== null)
    setToday(new Date())
  }, [])

  const printable = useMemo<FgPrintable | null>(
    () => (result ? { image: result, label: 'LATER! 타임캡슐 사진', fileName: 'funground-later', printer: 'photo' } : null),
    [result],
  )

  const cam = useCamera({ enabled: step === 'camera' || step === 'review', allowDslr })

  // 글꼴 → 미리 만든 배경(있는 것만, 같은 출처)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const family = await loadThemeFont()
      const loaded = Object.fromEntries(await Promise.all(artReady.map(async (id) => [id, await loadLaterArt(id)] as const)))
      if (!alive) return
      setFont(family)
      setArts(loaded)
    })()
    return () => { alive = false }
  }, [artReady])

  // 장면 견본 — 고른 때 · 한마디가 바뀌면 다시(고르기 전에는 기본값으로)
  useEffect(() => {
    if (!font || !today) return
    const next: Partial<Record<LaterSceneId, string>> = {}
    for (const s of LATER_SCENES) {
      next[s.id] = renderLaterPreview({
        scene: s, years: years ?? SAMPLE_YEARS, message: message ?? SAMPLE_MESSAGE, art: arts[s.id] ?? null, font, today, width: 420,
      })
    }
    setThumbs(next)
  }, [font, arts, years, message, today])

  const reset = useCallback(() => {
    setStep('intro'); setYears(null); setSceneId(null); setMessage(null); setShot(null); setCutout(null); setResult(null)
    setError(null); setCount(null); setPrintState('idle')
  }, [])
  const home = useFgHome(reset)

  // 고르기 화면부터 사람 분리 모델을 미리 올린다(찍은 뒤 기다림을 줄인다)
  useEffect(() => {
    if (step === 'when') warmupWebcamCutout().catch(() => undefined)
  }, [step])

  // 무입력이면 처음으로 — 찍는 중 · 합성 중에는 세지 않는다
  useEffect(() => {
    if (step === 'intro' || step === 'making' || count !== null) return
    let timer = window.setTimeout(home, IDLE_SECONDS * 1000)
    const poke = () => { window.clearTimeout(timer); timer = window.setTimeout(home, IDLE_SECONDS * 1000) }
    window.addEventListener('pointerdown', poke)
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', poke) }
  }, [step, count, home])

  // 3-2-1 → 찍기
  const { still: takeStill } = cam
  const capture = useCallback(async () => {
    try {
      const still = await takeStill()
      const canvas = cropToAspect(still, SHOT_ASPECT)
      setShot({ canvas, url: canvas.toDataURL('image/jpeg', 0.9) })
      setStep('review')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 찍지 못했어요.')
    }
  }, [takeStill])
  useEffect(() => {
    if (count === null) return
    if (count === 0) {
      setFlash(true)
      const off = window.setTimeout(() => setFlash(false), 260)
      setCount(null)
      void capture()
      return () => window.clearTimeout(off)
    }
    const t = window.setTimeout(() => setCount(count - 1), 1000)
    return () => window.clearTimeout(t)
  }, [count, capture])

  const compose = useCallback((id: LaterSceneId, person: HTMLCanvasElement) => {
    if (!font || !years || !message || !today) return
    const canvas = composeLaterPhoto({ scene: LATER_SCENE_BY_ID[id], years, message, art: arts[id] ?? null, font, today, cutout: person })
    setResult(canvas.toDataURL('image/jpeg', 0.92))
    setPrintState('idle')
  }, [arts, font, years, message, today])

  // 기기 안 합성 — 사람만 분리 → 미래 장면 + 사람 + 틀 · 카드 · 도장
  const make = useCallback(async () => {
    if (!shot || !sceneId) return
    setStep('making'); setError(null)
    try {
      const { canvas, coverage } = await cutoutWebcamPerson(shot.canvas)
      if (coverage < MIN_COVERAGE) throw new Error('no-person')
      setCutout(canvas)
      compose(sceneId, canvas)
      setStep('result')
    } catch (cause) {
      console.warn('[funground-later] 사람 분리 실패:', cause)
      setError(cause instanceof Error && cause.message === 'no-person'
        ? '사람을 찾지 못했어요. 화면 가운데 점선 안에 서서 다시 찍어 주세요.'
        : '사진을 만들지 못했어요. 다시 찍어 주세요.')
      setStep('review')
    }
  }, [shot, sceneId, compose])

  const switchScene = (id: LaterSceneId) => {
    setSceneId(id)
    if (cutout) compose(id, cutout)
  }

  const retake = () => {
    setShot(null); setCutout(null); setResult(null); setError(null); setPrintState('idle')
    setStep('camera')
  }

  /** 설치 기기(부스 앱)만 — 브라우저는 FgPrintButton 창이 맡는다 */
  const print = async () => {
    const shell = getBoothShell()
    if (!result || !shell || printState === 'sending' || printState === 'sent') return
    setPrintState('sending')
    try {
      const res = await shell.print(result)
      setPrintState(res.ok ? 'sent' : 'failed')
    } catch {
      setPrintState('failed')
    }
  }

  const dots = useMemo(() => {
    const now = step === 'review' ? 'camera' : step
    const at = STEP_DOTS.indexOf(now)
    return STEP_DOTS.map((s, i) => (i < at ? 'done' : s === now ? 'now' : 'todo'))
  }, [step])

  const stepDots = (
    <ol className="fg-steps flt-steps" aria-label="진행 단계">
      {dots.map((state, i) => <li key={i} data-state={state} />)}
    </ol>
  )

  const openYear = (y: LaterYears) => (today ? openDate(y, today).getFullYear() : new Date().getFullYear() + y)
  const openLine = years && today ? `${koreanDate(openDate(years, today))}에 다시 열어 보세요` : ''

  /** 지금까지 고른 것 — 오른쪽 작은 카드 */
  const summary = (withThumb = true) => (
    <div className="flt-summary">
      {withThumb && scene && thumbs[scene.id] && <img src={thumbs[scene.id]} alt="" />}
      <dl>
        {years && <div><dt><CalendarClock size={30} aria-hidden="true" />열어 볼 날</dt><dd>{openYear(years)}년 · {years}년 뒤</dd></div>}
        {scene && <div><dt><Sparkles size={30} aria-hidden="true" />미래 장면</dt><dd>{scene.name}</dd></div>}
        {message && <div><dt><MessageCircleHeart size={30} aria-hidden="true" />한마디</dt><dd>「{message}」</dd></div>}
      </dl>
    </div>
  )

  return (
    <FgStage onHome={home} tone={scene?.color ?? LATER_TONE} className="flt">
      {step === 'intro' && (
        <section className="fg-split flt-intro">
          <div className="flt-fan" aria-hidden="true">
            {LATER_SCENES.map((s, i) => (
              <span key={s.id} style={{ ['--i' as string]: i - 1 }}>
                {thumbs[s.id] && <img src={thumbs[s.id]} alt="" />}
              </span>
            ))}
          </div>
          <div className="fg-panel flt-panel">
            <p className="fg-kicker">B안 · 기기 안 처리형</p>
            <h1 className="flt-hero">LATER!<span>타임캡슐 포토</span></h1>
            <p className="fg-lead">오늘의 나를 찍어 미래 장면에 넣고,{'\n'}미래의 나에게 한마디를 남겨요.{'\n'}얼굴과 옷은 그대로, 1~4명이 함께.</p>
            <ul className="flt-badges">
              <li><Sparkles size={30} aria-hidden="true" />AI 인물 인식</li>
              <li><LockKeyhole size={30} aria-hidden="true" />10년 · 20년 뒤 열어 보기</li>
              <li><Printer size={30} aria-hidden="true" />4×6 인화</li>
            </ul>
            <p className="flt-privacy"><ShieldCheck size={30} aria-hidden="true" />{PRIVACY}</p>
            <button type="button" className="fg-btn fg-btn--primary flt-cta" onClick={() => setStep('when')}>시작하기</button>
          </div>
        </section>
      )}

      {step === 'when' && (
        <section className="fg-split flt-pick">
          <ul className="flt-when">
            {LATER_YEARS.map((y) => (
              <li key={y}>
                <button type="button" className="flt-year" data-on={years === y} onClick={() => setYears(y)} aria-pressed={years === y}>
                  {years === y && <Check className="flt-check" size={44} strokeWidth={3.2} aria-hidden="true" />}
                  <LockKeyhole className="flt-year-icon" size={64} aria-hidden="true" />
                  <b>{y}년 뒤</b>
                  <strong>{openYear(y)}년</strong>
                  <small>{today ? `${today.getMonth() + 1}월 ${today.getDate()}일` : ''}에 열어 보는 사진</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="fg-panel flt-panel">
            {stepDots}
            <h2 className="fg-title fg-title--md">언제의 나에게{'\n'}보낼까요?</h2>
            {years ? (
              <div className="flt-openline">
                <div className="flt-openline-band"><CalendarClock size={40} aria-hidden="true" />{openLine}</div>
                <p className="flt-sub">사진 아래에 이 도장이 찍혀요.{'\n'}그날 다시 꺼내 보세요!</p>
              </div>
            ) : (
              <p className="flt-empty"><span aria-hidden="true">←</span>왼쪽에서 하나를 눌러 보세요.{'\n'}사진에 열어 볼 날이 찍혀요.</p>
            )}
            <button type="button" className="fg-btn fg-btn--primary flt-cta" disabled={!years} onClick={() => setStep('scene')}>
              {years ? '다음 · 미래 장면 고르기' : '먼저 골라 주세요'}
            </button>
          </div>
        </section>
      )}

      {step === 'scene' && (
        <section className="fg-split flt-pick">
          <ul className="flt-scenes">
            {LATER_SCENES.map((s) => (
              <li key={s.id}>
                <button type="button" className="flt-scene" data-on={sceneId === s.id} style={{ ['--t' as string]: s.color }} onClick={() => setSceneId(s.id)} aria-pressed={sceneId === s.id}>
                  <span className="flt-scene-img">
                    {thumbs[s.id] ? <img src={thumbs[s.id]} alt="" /> : <Loader2 className="flt-spin" size={40} />}
                    {sceneId === s.id && <Check className="flt-check" size={44} strokeWidth={3.2} aria-hidden="true" />}
                  </span>
                  <b>{s.name}</b>
                  <small>{s.line}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="fg-panel flt-panel">
            {stepDots}
            <h2 className="fg-title fg-title--md">어떤 미래로{'\n'}갈까요?</h2>
            {scene ? (
              <p className="flt-sub">「{scene.name}」에 사람만 오려 넣어{'\n'}4×6 사진으로 뽑아요.</p>
            ) : (
              <p className="flt-empty"><span aria-hidden="true">←</span>왼쪽에서 장면을 눌러 보세요.</p>
            )}
            {summary(false)}
            <div className="fg-actions fg-actions--row flt-cta">
              <button type="button" className="fg-btn fg-btn--ghost flt-back" onClick={() => setStep('when')}>이전</button>
              <button type="button" className="fg-btn fg-btn--primary" disabled={!sceneId} onClick={() => setStep('message')}>
                {sceneId ? '다음 · 한마디' : '장면을 골라 주세요'}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'message' && scene && (
        <section className="fg-split flt-msg">
          <ul className="flt-lines">
            {LATER_MESSAGES.map((m) => (
              <li key={m}>
                <button type="button" className="flt-line" data-on={message === m} onClick={() => setMessage(m)} aria-pressed={message === m}>
                  <MessageCircleHeart size={44} aria-hidden="true" />
                  <span>{m}</span>
                  {message === m && <Check className="flt-line-check" size={40} strokeWidth={3.2} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="fg-panel flt-panel">
            {stepDots}
            <h2 className="fg-title fg-title--md">미래의 나에게{'\n'}한마디</h2>
            <div className="flt-preview">
              {thumbs[scene.id] && <img src={thumbs[scene.id]} alt={`${scene.name} 견본`} />}
              <p>
                {message ? <>사진 위 편지에{'\n'}이 말이 적혀요.</> : <>왼쪽에서 하나를 골라 주세요.{'\n'}견본에 바로 보여요.</>}
                <small>To. {years ? openYear(years) : ''}년의 나에게</small>
              </p>
            </div>
            <div className="fg-actions fg-actions--row flt-cta">
              <button type="button" className="fg-btn fg-btn--ghost flt-back" onClick={() => setStep('scene')}>이전</button>
              <button type="button" className="fg-btn fg-btn--primary" disabled={!message} onClick={() => setStep('camera')}>
                <Camera size={44} aria-hidden="true" />{message ? '찍으러 가기' : '한마디를 골라 주세요'}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'camera' && scene && (
        <section className="fg-split flt-shot">
          <div className="flt-left">
            <div className="flt-view">
              {cam.source === 'dslr'
                ? <canvas ref={cam.liveRef} className="flt-feed" />
                : <video ref={cam.videoRef} className="flt-feed flt-feed--mirror" muted playsInline autoPlay />}
              {cam.state === 'ready' && <div className="flt-guide" aria-hidden="true"><span>1~4명 · 얼굴이 점선 안에</span></div>}
              {cam.state === 'starting' && <div className="flt-view-msg"><Loader2 className="flt-spin" size={64} />카메라를 켜는 중…</div>}
              {cam.state === 'error' && (
                <div className="flt-view-msg">
                  <CameraOff size={72} aria-hidden="true" />
                  <p>{cam.error}</p>
                  <button type="button" className="fg-btn fg-btn--ghost flt-btn-light" onClick={cam.retry}><RefreshCw size={36} aria-hidden="true" />다시 시도</button>
                </div>
              )}
              {count !== null && count > 0 && <div className="flt-count" key={count}>{count}</div>}
              {flash && <div className="flt-flash" />}
            </div>
            <ul className="flt-tips">
              <li><Users size={30} aria-hidden="true" />1~4명 나란히</li>
              <li><ScanFace size={30} aria-hidden="true" />얼굴이 가려지지 않게</li>
              <li><Timer size={30} aria-hidden="true" />3초 뒤 찰칵</li>
            </ul>
          </div>
          <div className="fg-panel flt-panel">
            {stepDots}
            <h2 className="fg-title fg-title--md">오늘의 나를{'\n'}찍어요</h2>
            <p className="flt-sub"><Users size={34} aria-hidden="true" />점선 안에 1~4명이 함께 서 주세요</p>
            {summary()}
            {error && <div className="flt-error" role="alert">{error}</div>}
            <button type="button" className="fg-btn fg-btn--primary flt-cta" disabled={cam.state !== 'ready' || count !== null} onClick={() => { setError(null); setCount(3) }}>
              <Camera size={44} aria-hidden="true" />{count !== null ? '곧 찍어요!' : '찍기 · 3초 뒤'}
            </button>
          </div>
        </section>
      )}

      {step === 'review' && shot && (
        <section className="fg-split flt-shot">
          <div className="flt-left">
            <div className="flt-view">
              <img src={shot.url} alt="방금 찍은 사진" className="flt-feed" />
            </div>
          </div>
          <div className="fg-panel flt-panel">
            {stepDots}
            <h2 className="fg-title fg-title--md">이 사진으로{'\n'}만들까요?</h2>
            {error
              ? <div className="flt-error" role="alert">{error}</div>
              : <p className="flt-sub">모두의 얼굴이 잘 보이면{'\n'}「만들기」를 눌러 주세요.</p>}
            {summary()}
            <div className="fg-actions flt-cta">
              <button type="button" className="fg-btn fg-btn--primary" onClick={() => void make()} disabled={!font}><Sparkles size={40} aria-hidden="true" />만들기</button>
              <button type="button" className="fg-btn fg-btn--ghost" onClick={retake}><RotateCcw size={40} aria-hidden="true" />다시 찍기</button>
            </div>
          </div>
        </section>
      )}

      {step === 'making' && (
        <section className="fg-split flt-shot" aria-live="polite">
          <div className="flt-left">
            <div className="flt-view flt-view--busy">
              {shot && <img src={shot.url} alt="" className="flt-feed" />}
              <div className="flt-view-msg"><div className="fg-spin" /></div>
            </div>
          </div>
          <div className="fg-panel flt-panel flt-making">
            {stepDots}
            <h2 className="fg-title fg-title--md">타임캡슐에{'\n'}담는 중</h2>
            <p className="fg-lead">AI 인물 인식이 이 기기 안에서 사람을 찾아{'\n'}미래 장면에 앉혀요. 얼굴과 옷은 그대로예요.</p>
            <p className="flt-privacy"><ShieldCheck size={30} aria-hidden="true" />{PRIVACY}</p>
          </div>
        </section>
      )}

      {step === 'result' && result && scene && (
        <section className="fg-split flt-result">
          <div className="flt-print">
            <img src={result} alt={`${scene.name} 타임캡슐 사진`} />
          </div>
          <div className="fg-panel flt-panel">
            {stepDots}
            <h2 className="flt-result-title">완성! <span>4×6 사진</span></h2>
            <div className="flt-openline-band flt-openline-band--sm"><CalendarClock size={34} aria-hidden="true" />{openLine}</div>
            <p className="flt-sub flt-sub--left">다른 미래 장면도 눌러 보세요 — 같은 사진으로 바로 바뀌어요.</p>
            <div className="flt-switch" role="group" aria-label="다른 미래 장면으로 바꿔 보기">
              {LATER_SCENES.map((s) => (
                <button key={s.id} type="button" data-on={s.id === scene.id} style={{ ['--t' as string]: s.color }} onClick={() => switchScene(s.id)} aria-label={s.name} aria-pressed={s.id === scene.id}>
                  <span>{thumbs[s.id] && <img src={thumbs[s.id]} alt="" />}</span>
                  <b aria-hidden="true">{s.name}</b>
                </button>
              ))}
            </div>
            {printState === 'sent' && <p className="flt-sub flt-sub--left" role="status">프린터로 보냈어요. 1분쯤 뒤 출구에서 나와요.</p>}
            {printState === 'failed' && <div className="flt-error" role="alert">지금은 인쇄할 수 없어요. 직원에게 프린터 확인을 요청해 주세요.</div>}
            <div className="flt-result-actions flt-cta">
              {hasShell ? (
                <button type="button" className="fg-btn fg-btn--primary" onClick={() => void print()} disabled={printState === 'sending' || printState === 'sent'}>
                  {printState === 'sending' ? <Loader2 className="flt-spin" size={44} /> : <Printer size={44} aria-hidden="true" />}
                  {printState === 'sent' ? '인쇄 보냄' : '사진 인쇄하기'}
                </button>
              ) : (
                <FgPrintButton printable={printable} label="사진 인쇄하기" />
              )}
              <button type="button" className="fg-btn fg-btn--ghost" onClick={retake}><RotateCcw size={40} aria-hidden="true" />다시 찍기</button>
              <button type="button" className="fg-btn fg-btn--ghost" onClick={home}><Home size={40} aria-hidden="true" />처음으로</button>
            </div>
            <p className="flt-privacy flt-privacy--sm"><ShieldCheck size={26} aria-hidden="true" />{PRIVACY}</p>
          </div>
        </section>
      )}
    </FgStage>
  )
}
