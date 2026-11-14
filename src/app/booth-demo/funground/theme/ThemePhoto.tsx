'use client'
/* eslint-disable @next/next/no-img-element -- 화면의 그림은 모두 기기 안에서 만든 data: 그림이라 next/image 를 거치지 않는다 */

// 펀그라운드 B안 1. 테마 포토 「THEME!」 — 세로 1080×1920 화면.
// 시작 → 테마 고르기(6) → 카메라(1~4명, 3-2-1, 다시 찍기) → 기기 안 합성(사람만 분리 → 테마 배경 + 사람 + 앞 장식) → 4×6 결과 → 인쇄 / 처음으로.
// 외부 AI · 이미지 서비스는 부르지 않는다. 사람 분리는 부스 「같이 찍기」와 같은 cutoutPerson(MediaPipe 다중 클래스 + u2netp, 모델 · WASM 은 우리 public/).
// 사진은 이 화면 메모리에만 있다 — 서버로 올리지 않는다(휴대폰 QR 저장은 이 데모에 없다).
//
// 카메라: 데모는 웹캠. 설치 기기는 DSLR 브리지(src/lib/photobooth/dslr-bridge.ts, 127.0.0.1:9120)를 쓴다 —
// 주소에 camera=dslr 를 붙이면 useCamera 가 브리지를 먼저 찾고(라이브뷰 · 원본 촬영), 없으면 웹캠으로 돌아간다.
// 인쇄: 부스 앱(tools/booth-app)이면 boothShell.print 로 프린터에 바로, 브라우저면 인쇄 창(4×6 한 장만 보이게 theme.css @media print).

import { Camera, Check, Loader2, Printer, RotateCcw, ScanFace, ShieldCheck, Sparkles, Timer, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { useCamera } from '@/app/booth/programs/use-camera'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import { cutoutPerson, warmupSegmentation } from '@/lib/photobooth/segmentation'
import {
  THEMES, THEME_BY_ID, composeThemePhoto, loadThemeArt, loadThemeFont, renderThemeThumb,
  type ThemeId,
} from '@/lib/funground/theme-photo'
import './theme.css'

type Step = 'intro' | 'pick' | 'camera' | 'review' | 'making' | 'result'
type PrintState = 'idle' | 'sending' | 'sent' | 'failed'

/** 카메라 화면 · 찍는 사진 비율(가로 4:3) — 미리보기에 보인 만큼만 찍는다 */
const SHOT_ASPECT = 4 / 3
/** 아무도 만지지 않으면 처음으로(초) */
const IDLE_SECONDS = 90
/** 인물 면적이 이보다 작으면 사람을 못 찾은 것으로 본다(부스 같이 찍기와 같은 기준) */
const MIN_COVERAGE = 0.02
const STEP_DOTS: Step[] = ['pick', 'camera', 'making', 'result']
const REGISTRY_TONE = '#e0466f'

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

/** cutoutPerson 은 그림(img)을 받는다 — 캔버스를 같은 기기 안 blob 주소로 바꿔 넘긴다(밖으로 나가지 않음) */
async function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 읽지 못했어요.'))), 'image/jpeg', 0.95))
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function ThemePhoto({ artReady }: { artReady: ThemeId[] }) {
  const [step, setStep] = useState<Step>('intro')
  const [themeId, setThemeId] = useState<ThemeId | null>(null)
  const [font, setFont] = useState<string | null>(null)
  const [arts, setArts] = useState<Partial<Record<ThemeId, HTMLImageElement | null>>>({})
  const [thumbs, setThumbs] = useState<Partial<Record<ThemeId, string>>>({})
  const [shot, setShot] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const [cutout, setCutout] = useState<HTMLCanvasElement | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [printState, setPrintState] = useState<PrintState>('idle')
  const [allowDslr, setAllowDslr] = useState(false)
  const theme = themeId ? THEME_BY_ID[themeId] : null

  useEffect(() => { setAllowDslr(new URLSearchParams(window.location.search).get('camera') === 'dslr') }, [])

  const cam = useCamera({ enabled: step === 'camera' || step === 'review', allowDslr })

  // 글꼴 → 미리 만든 배경(있는 것만, 같은 출처) → 테마 견본
  useEffect(() => {
    let alive = true
    ;(async () => {
      const family = await loadThemeFont()
      const loaded = Object.fromEntries(await Promise.all(artReady.map(async (id) => [id, await loadThemeArt(id)] as const)))
      if (!alive) return
      setFont(family)
      setArts(loaded)
      const next: Partial<Record<ThemeId, string>> = {}
      for (const t of THEMES) next[t.id] = renderThemeThumb(t, 360, family, loaded[t.id] ?? null)
      setThumbs(next)
    })()
    return () => { alive = false }
  }, [artReady])

  const reset = useCallback(() => {
    setStep('intro'); setThemeId(null); setShot(null); setCutout(null); setResult(null)
    setError(null); setCount(null); setPrintState('idle')
  }, [])
  const home = useFgHome(reset)

  // 고르기 화면부터 사람 분리 모델을 미리 올린다(찍은 뒤 기다림을 줄인다)
  useEffect(() => {
    if (step === 'pick') warmupSegmentation().catch(() => undefined)
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
      // DSLR 원본은 그대로(브리지가 긴 변 2400 으로 줄여 준다), 웹캠은 미리보기와 같은 4:3 가운데
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

  const compose = useCallback((id: ThemeId, person: HTMLCanvasElement) => {
    if (!font) return
    const canvas = composeThemePhoto({ theme: THEME_BY_ID[id], cutout: person, art: arts[id] ?? null, font })
    setResult(canvas.toDataURL('image/jpeg', 0.92))
    setPrintState('idle')
  }, [arts, font])

  // 기기 안 합성 — 사람만 분리 → 테마 배경 + 사람 + 앞 장식
  const make = useCallback(async () => {
    if (!shot || !themeId) return
    setStep('making'); setError(null)
    try {
      const img = await canvasToImage(shot.canvas)
      const { canvas, coverage } = await cutoutPerson(img)
      if (coverage < MIN_COVERAGE) throw new Error('no-person')
      setCutout(canvas)
      compose(themeId, canvas)
      setStep('result')
    } catch (cause) {
      console.warn('[funground-theme] 사람 분리 실패:', cause)
      setError(cause instanceof Error && cause.message === 'no-person'
        ? '사람을 찾지 못했어요. 화면 가운데 점선 안에 서서 다시 찍어 주세요.'
        : '사진을 만들지 못했어요. 다시 찍어 주세요.')
      setStep('review')
    }
  }, [shot, themeId, compose])

  const switchTheme = (id: ThemeId) => {
    setThemeId(id)
    if (cutout) compose(id, cutout)
  }

  const retake = () => {
    setShot(null); setCutout(null); setResult(null); setError(null); setPrintState('idle')
    setStep('camera')
  }

  const print = async () => {
    if (!result || printState === 'sending' || printState === 'sent') return
    setPrintState('sending')
    const shell = getBoothShell()
    if (!shell) {
      // 브라우저(데모) — 인쇄 창. 실제로 뽑혔는지는 알 수 없다
      window.setTimeout(() => { window.print(); setPrintState('sent') }, 50)
      return
    }
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

  return (
    <FgStage onHome={home} tone={theme?.color ?? REGISTRY_TONE} className="fgt">
      {step !== 'intro' && (
        <ol className="fg-steps fgt-steps" aria-label="진행 단계">
          {dots.map((state, i) => <li key={i} data-state={state} />)}
        </ol>
      )}

      {step === 'intro' && (
        <section className="fgt-intro">
          <p className="fg-kicker">B안 · 기기 안 처리형</p>
          <h1 className="fgt-hero">THEME!<span>테마 포토</span></h1>
          <p className="fg-lead">사람만 오려 6가지 테마 배경에 넣어 드려요.{'\n'}옷과 얼굴은 그대로, 1~4명이 함께.</p>
          <div className="fgt-fan" aria-hidden="true">
            {THEMES.map((t, i) => (
              <span key={t.id} style={{ ['--i' as string]: i - 2.5 }}>
                {thumbs[t.id] && <img src={thumbs[t.id]} alt="" />}
              </span>
            ))}
          </div>
          <ul className="fgt-badges">
            <li><Sparkles size={30} aria-hidden="true" />AI 인물 인식</li>
            <li><ShieldCheck size={30} aria-hidden="true" />사진은 기기 밖으로 나가지 않아요</li>
            <li><Printer size={30} aria-hidden="true" />4×6 인화</li>
          </ul>
          <button type="button" className="fg-btn fg-btn--primary fgt-cta" onClick={() => setStep('pick')}>시작하기</button>
        </section>
      )}

      {step === 'pick' && (
        <section className="fgt-pick">
          <h2 className="fg-title fg-title--md">테마를 골라 주세요</h2>
          <ul className="fgt-grid">
            {THEMES.map((t) => (
              <li key={t.id}>
                <button type="button" className="fgt-theme" data-on={themeId === t.id} style={{ ['--t' as string]: t.color }} onClick={() => setThemeId(t.id)} aria-pressed={themeId === t.id}>
                  <span className="fgt-theme-img">
                    {thumbs[t.id] ? <img src={thumbs[t.id]} alt="" /> : <Loader2 className="fgt-spin" size={40} />}
                    {themeId === t.id && <Check className="fgt-theme-check" size={44} strokeWidth={3.2} aria-hidden="true" />}
                  </span>
                  <b>{t.name}</b>
                  <small>{t.line}</small>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="fg-btn fg-btn--primary fgt-cta" disabled={!themeId} onClick={() => setStep('camera')}>
            <Camera size={44} aria-hidden="true" />{theme ? '이 테마로 찍기' : '테마를 먼저 골라 주세요'}
          </button>
        </section>
      )}

      {step === 'camera' && theme && (
        <section className="fgt-camera">
          <h2 className="fg-title fg-title--md">점선 안에 서 주세요</h2>
          <p className="fgt-sub"><Users size={34} aria-hidden="true" />1~4명이 함께 찍을 수 있어요</p>
          <div className="fgt-view">
            {cam.source === 'dslr'
              ? <canvas ref={cam.liveRef} className="fgt-feed" />
              : <video ref={cam.videoRef} className="fgt-feed fgt-feed--mirror" muted playsInline autoPlay />}
            <div className="fgt-guide" aria-hidden="true"><span>얼굴이 점선 안에</span></div>
            {cam.state === 'starting' && <div className="fgt-view-msg"><Loader2 className="fgt-spin" size={64} />카메라를 켜는 중…</div>}
            {cam.state === 'error' && (
              <div className="fgt-view-msg">
                <p>{cam.error}</p>
                <button type="button" className="fg-btn fg-btn--ghost fgt-btn-light" onClick={cam.retry}>다시 시도</button>
              </div>
            )}
            {count !== null && count > 0 && <div className="fgt-count" key={count}>{count}</div>}
            {flash && <div className="fgt-flash" />}
          </div>
          <div className="fgt-chosen">
            {thumbs[theme.id] && <img src={thumbs[theme.id]} alt="" />}
            <p><b>「{theme.name}」</b> 배경에 합성돼요.<br />AI 인물 인식으로 사람만 오려 내요.</p>
            <button type="button" className="fg-btn fg-btn--ghost fgt-small" disabled={count !== null} onClick={() => setStep('pick')}>테마 바꾸기</button>
          </div>
          <ul className="fgt-tips">
            <li><Users size={30} aria-hidden="true" />1~4명</li>
            <li><ScanFace size={30} aria-hidden="true" />얼굴이 가려지지 않게</li>
            <li><Timer size={30} aria-hidden="true" />3초 뒤 찰칵</li>
          </ul>
          {error && <p className="fgt-error" role="alert">{error}</p>}
          <button type="button" className="fg-btn fg-btn--primary fgt-cta" disabled={cam.state !== 'ready' || count !== null} onClick={() => { setError(null); setCount(3) }}>
            <Camera size={44} aria-hidden="true" />{count !== null ? '곧 찍어요!' : '찍기 · 3초 뒤'}
          </button>
        </section>
      )}

      {step === 'review' && shot && (
        <section className="fgt-review">
          <h2 className="fg-title fg-title--md">이 사진으로 만들까요?</h2>
          <div className="fgt-view">
            <img src={shot.url} alt="방금 찍은 사진" className="fgt-feed" />
          </div>
          {error
            ? <p className="fgt-error" role="alert">{error}</p>
            : <p className="fgt-sub">모두의 얼굴이 잘 보이면 「만들기」를 눌러 주세요.</p>}
          {theme && (
            <div className="fgt-chosen">
              {thumbs[theme.id] && <img src={thumbs[theme.id]} alt="" />}
              <p><b>「{theme.name}」</b> 배경에 합성돼요.<br />옷과 얼굴은 그대로, 사람만 오려 넣어요.</p>
            </div>
          )}
          <div className="fg-actions fg-actions--row fgt-row">
            <button type="button" className="fg-btn fg-btn--ghost" onClick={retake}><RotateCcw size={40} aria-hidden="true" />다시 찍기</button>
            <button type="button" className="fg-btn fg-btn--primary" onClick={() => void make()} disabled={!font}><Sparkles size={40} aria-hidden="true" />만들기</button>
          </div>
        </section>
      )}

      {step === 'making' && (
        <section className="fgt-making" aria-live="polite">
          <div className="fg-spin" />
          <h2 className="fg-title fg-title--md">사람만 오려 내는 중</h2>
          <p className="fg-lead">AI 인물 인식이 이 기기 안에서 사람을 찾아{'\n'}테마 배경에 앉혀요. 사진은 밖으로 나가지 않아요.</p>
        </section>
      )}

      {step === 'result' && result && theme && (
        <section className="fgt-result">
          <h2 className="fgt-result-title">완성! <span>4×6 사진</span></h2>
          <div className="fgt-print">
            <img src={result} alt={`${theme.name} 테마 사진`} />
          </div>
          <div className="fgt-switch" role="group" aria-label="다른 테마로 바꿔 보기">
            {THEMES.map((t) => (
              <button key={t.id} type="button" data-on={t.id === theme.id} style={{ ['--t' as string]: t.color }} onClick={() => switchTheme(t.id)} aria-label={t.name} aria-pressed={t.id === theme.id}>
                {thumbs[t.id] && <img src={thumbs[t.id]} alt="" />}
              </button>
            ))}
          </div>
          {printState === 'sent' && <p className="fgt-sub" role="status">{getBoothShell() ? '프린터로 보냈어요. 1분쯤 뒤 출구에서 나와요.' : '인쇄 창을 열었어요. 설치 기기에서는 프린터로 바로 나와요.'}</p>}
          {printState === 'failed' && <p className="fgt-error" role="alert">지금은 인쇄할 수 없어요. 직원에게 프린터 확인을 요청해 주세요.</p>}
          <div className="fg-actions fg-actions--row fgt-row">
            <button type="button" className="fg-btn fg-btn--ghost" onClick={retake}><RotateCcw size={40} aria-hidden="true" />다시 찍기</button>
            <button type="button" className="fg-btn fg-btn--primary" onClick={() => void print()} disabled={printState === 'sending' || printState === 'sent'}>
              {printState === 'sending' ? <Loader2 className="fgt-spin" size={40} /> : <Printer size={40} aria-hidden="true" />}
              {printState === 'sent' ? '인쇄 보냄' : '인쇄하기'}
            </button>
          </div>
        </section>
      )}

      {step === 'result' && result && <PrintArea image={result} />}
    </FgStage>
  )
}

/** 인쇄 창에 보이는 4×6 한 장 — 화면 배율(transform) 밖, body 바로 아래에 둔다(결과 단계는 브라우저에서만 그려진다) */
function PrintArea({ image }: { image: string }) {
  return createPortal(
    <div className="fgt-print-area" aria-hidden="true"><img src={image} alt="" /></div>,
    document.body,
  )
}
