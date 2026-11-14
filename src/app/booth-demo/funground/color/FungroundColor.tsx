'use client'

// 펀그라운드 별내 B안 퍼스널 컬러(COLOR!) — 1080×1920 세로 화면(FgStage). 시작 → 카메라(가이드 · 3초) → 기기 안 분석 → 결과 / 다시 찍기.
// 키오스크 ai-color 를 건드리지 않으려고 화면은 따로 두고, 기기 안 부품은 그대로 가져다 쓴다:
//   - 사람 분리 · 색 재기: src/lib/kiosk/garment-recolor.ts(MediaPipe SelfieMulticlass, 웹 워커 — public/models · public/mediapipe 자체 호스팅)
//     → measureColors(얼굴 피부 · 머리카락 Lab). 같은 분리 결과로 사진 속 옷 색을 바꿔 보여 준다(옷이 안 잡히면 얼굴 아래 천 드레이프).
//   - 판정: src/lib/kiosk/color-rules.ts diagnoseFromMeasure(키오스크와 같은 숫자 규칙) — 유형까지 못 정하면 결과를 지어내지 않고 다시 찍는다.
//   - 결과 문장: src/lib/funground/color-texts.ts(청소년용으로 미리 쓴 8유형 표). AI 가 쓴 글이 아니다.
// 외부 AI 서비스 · /api 를 부르지 않는다. 사진은 이 화면의 메모리에만 있다가 처음으로 · 다시 찍기 · 무입력이면 지운다(올리지 · 저장하지 않는다).
// 9~19세 체험 — 점수 · 순위 · 외모 평가 없이 「어울리는 색」만 보여 준다.

import { ArrowLeft, Camera, CameraOff, Check, Lock, Palette, RotateCcw, ScanFace, Shirt, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { FG_COLOR_DISCLAIMER, FG_COLOR_TEXTS, UNDERTONE_LABEL } from '@/lib/funground/color-texts'
import { FG_RETAKE_STAFF, FG_RETAKE_TEXTS, judgeColor, type FgRetakeReason } from '@/lib/funground/color-judge'
import { readableInk } from '@/lib/kiosk/color-types'
import {
  preloadGarmentModel, prepareGarment, releaseGarment, setGarmentDownloadFast, warmGarmentEngine, type GarmentPrep,
} from '@/lib/kiosk/garment-recolor'
import type { PersonalColorTypeId } from '@/types/analysis'
import './fg-color.css'

const TONE = '#4b3fd6'
/** 분석 화면을 이만큼은 보여 준다 — 너무 빨리 넘어가면 무엇을 했는지 모른다 */
const MIN_ANALYZE_MS = 2600
/** 처음 한 번 모델 파일(약 26MB)을 받는 동안 기다리는 한도 */
const MODEL_WAIT_MS = 120_000
/** 아무도 누르지 않으면 처음으로 */
const IDLE_CAMERA_MS = 60_000
const IDLE_RESULT_MS = 90_000
/** 분석 화면의 단계 글 — 실제 계산 순서(얼굴 · 머리카락 분리 → 색 재기 → 규칙으로 유형) */
const ANALYZE_STEPS = ['얼굴 · 머리카락 찾기', '피부 색 재기', '머리카락 색 재기', '어울리는 색 고르기']
/** 시작 화면 꾸밈 — 8유형에서 고른 12색 */
const INTRO_RING = ['#FF8C42', '#FFD23F', '#7ED957', '#00C2B8', '#3F7FE0', '#7C3AED', '#E4007C', '#FF5E8A', '#D7C9F0', '#A3B5A6', '#C9A27E', '#8B1E2D']

type Phase = 'intro' | 'camera' | 'analyzing' | 'result' | 'retake' | 'error'

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/** 아무 입력이 없으면 ms 뒤 onIdle — 누를 때마다 다시 센다 */
function useIdle(active: boolean, ms: number, onIdle: () => void) {
  useEffect(() => {
    if (!active) return
    let timer = window.setTimeout(onIdle, ms)
    const poke = () => { window.clearTimeout(timer); timer = window.setTimeout(onIdle, ms) }
    window.addEventListener('pointerdown', poke)
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', poke) }
  }, [active, ms, onIdle])
}

/** 키오스크 촬영과 같은 방식 — 미리보기(3:4 cover)와 같은 가운데 자르기 + 좌우 반전, 최대 720×960 JPEG(메모리에만) */
function grabFrame(video: HTMLVideoElement): string | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  const ratio = 3 / 4
  let cw = vw
  let ch = vh
  if (vw / vh > ratio) cw = Math.round(vh * ratio)
  else ch = Math.round(vw / ratio)
  const outH = Math.min(960, ch)
  const outW = Math.round(outH * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.translate(outW, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, Math.round((vw - cw) / 2), Math.round((vh - ch) / 2), cw, ch, 0, 0, outW, outH)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** 카메라 오류 → 화면 문장(노트북 데모: 권한 · 다른 앱 · 카메라 없음) */
function camErrorText(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return '카메라 권한이 꺼져 있어요. 브라우저 주소창의 카메라 아이콘에서 허용한 뒤 「다시 연결」을 눌러 주세요.'
  if (name === 'NotReadableError') return '다른 프로그램이 카메라를 쓰고 있어요. 그 프로그램을 닫고 「다시 연결」을 눌러 주세요.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '연결된 카메라를 찾지 못했어요.'
  return '카메라를 켜지 못했어요. 「다시 연결」을 눌러 주세요.'
}

export function FungroundColor() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [photo, setPhoto] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  /** 카메라를 못 켠 이유(화면에 그대로) — 노트북 데모에서는 대개 브라우저 권한이다 */
  const [camError, setCamError] = useState<string | null>(null)
  const [camTry, setCamTry] = useState(0)
  const [typeId, setTypeId] = useState<PersonalColorTypeId | null>(null)
  const [reason, setReason] = useState<FgRetakeReason>('no-face')
  const [selected, setSelected] = useState<string>('')
  /** 고른 색으로 칠한 옷(투명 PNG, blob:) — 옷을 못 찾았으면 없고 드레이프로 대신한다 */
  const [overlay, setOverlay] = useState<string | null>(null)
  const [garmentReady, setGarmentReady] = useState(false)
  /** 처음 한 번 모델 파일을 받는 중 */
  const [preparing, setPreparing] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  /** 이번 손님이 다시 찍기로 간 횟수 — 두 번째부터 직원 안내를 덧붙인다 */
  const [fails, setFails] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const prepRef = useRef<GarmentPrep | null>(null)

  // 사람 분리 엔진 · 모델 파일을 첫 화면에서 미리 받는다(같은 기기에서 키오스크 컬러가 받아 둔 보관함이 있으면 망을 쓰지 않는다)
  useEffect(() => {
    setGarmentDownloadFast(true)
    preloadGarmentModel()
    return () => releaseGarment()
  }, [])

  const clearTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = undefined
  }

  /** 사진 · 계산 결과를 지운다 */
  const forget = useCallback(() => {
    clearTimer()
    releaseGarment()
    prepRef.current = null
    setPhoto(null)
    setOverlay(null)
    setGarmentReady(false)
    setTypeId(null)
    setCountdown(null)
    setPreparing(false)
  }, [])
  const reset = useCallback(() => { forget(); setFails(0); setPhase('intro') }, [forget])
  const home = useFgHome(reset)
  const toCamera = useCallback(() => { forget(); setCamError(null); setPhase('camera') }, [forget])
  useIdle(phase !== 'intro' && phase !== 'analyzing', phase === 'camera' ? IDLE_CAMERA_MS : IDLE_RESULT_MS, home)

  // ── 카메라 — 촬영 화면에서만 켜고, 떠나면 끈다 ──
  useEffect(() => {
    if (phase !== 'camera') return
    let cancelled = false
    let stream: MediaStream | null = null
    warmGarmentEngine()
    const media = navigator.mediaDevices
    const request = media?.getUserMedia
      ? media.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      : Promise.reject(new Error('no camera'))
    request
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        const video = videoRef.current
        if (video) {
          video.srcObject = s
          void video.play().catch(() => {})
        }
      })
      .catch((cause) => { if (!cancelled) setCamError(camErrorText(cause)) })
    return () => {
      cancelled = true
      clearTimer()
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [phase, camTry])

  const shoot = () => {
    if (countdown !== null || camError) return
    let n = 3
    setCountdown(n)
    clearTimer()
    timerRef.current = window.setInterval(() => {
      n -= 1
      if (n > 0) { setCountdown(n); return }
      clearTimer()
      setCountdown(null)
      const video = videoRef.current
      const shot = video ? grabFrame(video) : null
      if (!shot) { setCamError('사진을 찍지 못했어요. 카메라를 다시 연결해 주세요.'); return }
      setPhoto(shot)
      setStepIndex(0)
      setPhase('analyzing')
    }, 1000)
  }

  // ── 기기 안 분석 — 사람 분리 → 색 재기 → 숫자 규칙. 외부로 아무것도 보내지 않는다 ──
  useEffect(() => {
    if (phase !== 'analyzing' || !photo) return
    let alive = true
    const started = Date.now()
    const ticker = window.setInterval(() => setStepIndex((i) => Math.min(ANALYZE_STEPS.length - 1, i + 1)), MIN_ANALYZE_MS / ANALYZE_STEPS.length)
    void (async () => {
      let prep = await prepareGarment(photo)
      // 모델 파일을 아직 다 받지 못했다 — 받기를 이어 가며 기다린다(처음 한 번만)
      while (alive && prep.status === 'unavailable' && Date.now() - started < MODEL_WAIT_MS) {
        setPreparing(true)
        preloadGarmentModel()
        await wait(700)
        if (alive) prep = await prepareGarment(photo)
      }
      const rest = MIN_ANALYZE_MS - (Date.now() - started)
      if (rest > 0) await wait(rest)
      if (!alive) return
      setPreparing(false)
      if (prep.status === 'unavailable' || prep.status === 'failed') {
        setPhase('error')
        return
      }
      const measure = prep.focus?.measure ?? null
      const judge = judgeColor(measure)
      if (process.env.NODE_ENV !== 'production') console.info('[fg-color] 측정', JSON.stringify(measure), '→', JSON.stringify(judge), '· 옷', prep.status, prep.coverage.toFixed(3))
      if (!judge.ok) {
        setReason(judge.reason)
        setFails((n) => n + 1)
        setPhase('retake')
        return
      }
      prepRef.current = prep
      setGarmentReady(prep.status === 'ready')
      setTypeId(judge.typeId)
      setSelected(FG_COLOR_TEXTS[judge.typeId].colors[0].hex)
      setPhase('result')
    })()
    return () => { alive = false; window.clearInterval(ticker) }
  }, [phase, photo])

  // ── 결과 — 고른 색으로 사진 속 옷을 칠한다(같은 분리 결과 · 웹 워커). 나머지 색도 뒤에서 차례로 미리 만든다 ──
  useEffect(() => {
    const prep = prepRef.current
    if (phase !== 'result' || !garmentReady || !prep || !selected) return
    let alive = true
    prep.render(selected).then((url) => { if (alive) setOverlay(url) }, () => { if (alive) setGarmentReady(false) })
    return () => { alive = false }
  }, [phase, garmentReady, selected])
  useEffect(() => {
    const prep = prepRef.current
    if (phase !== 'result' || !garmentReady || !prep || !typeId) return
    let alive = true
    const list = FG_COLOR_TEXTS[typeId].colors.map((c) => c.hex)
    void (async () => {
      await wait(600)
      for (const hex of list) {
        if (!alive) return
        await prep.render(hex).catch(() => {})
      }
    })()
    return () => { alive = false }
  }, [phase, garmentReady, typeId])

  // ───────────────────────── 화면 ─────────────────────────

  if (phase === 'intro') {
    return (
      <FgStage className="fcl fcl--intro" tone={TONE} onHome={home}>
        <section className="fcl-intro">
          <p className="fcl-word">COLOR!</p>
          <p className="fg-kicker">퍼스널 컬러 · AI 인식 기반</p>
          <h1 className="fg-title">{'나한테 어울리는\n색은 뭘까?'}</h1>
          <p className="fg-lead">{'사진 한 장으로 피부 · 머리카락 색을 재서\n8가지 유형 중 어울리는 색 12개를 알려 줘요'}</p>
        </section>
        <div className="fcl-ring" aria-hidden="true">
          {INTRO_RING.map((hex, i) => <i key={hex} style={{ background: hex, '--i': i } as CSSProperties} />)}
          <span><ScanFace size={200} strokeWidth={1.2} /></span>
        </div>
        <ol className="fcl-how">
          <li><b>1</b><Camera size={44} strokeWidth={2} aria-hidden="true" /><span>사진 찍기</span></li>
          <li><b>2</b><ScanFace size={44} strokeWidth={2} aria-hidden="true" /><span>기기 안에서{'\n'}색 재기</span></li>
          <li><b>3</b><Palette size={44} strokeWidth={2} aria-hidden="true" /><span>어울리는 색{'\n'}12개 보기</span></li>
        </ol>
        <p className="fcl-privacy"><Lock size={34} strokeWidth={2.2} aria-hidden="true" /><span>사진은 이 기기 밖으로 나가지 않아요. 끝나면 바로 지워져요.</span></p>
        <button type="button" className="fg-btn fg-btn--primary fcl-go" onClick={toCamera}>
          <Camera size={48} strokeWidth={2.4} aria-hidden="true" />시작하기
        </button>
      </FgStage>
    )
  }

  if (phase === 'camera') {
    return (
      <FgStage className="fcl fcl--camera" tone={TONE} onHome={home}>
        <section className="fcl-cam-head">
          <h1 className="fg-title fg-title--md">동그라미에 얼굴을 맞춰 주세요</h1>
          <p className="fg-lead">모자는 잠깐 벗고, 머리카락도 보이게!</p>
        </section>
        <div className="fcl-cam" data-error={camError ? true : undefined}>
          <video ref={videoRef} playsInline muted />
          {!camError && (
            <svg className="fcl-guide" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <mask id="fcl-guide-hole">
                  <rect width="300" height="400" fill="#fff" />
                  <ellipse cx="150" cy="168" rx="92" ry="122" fill="#000" />
                </mask>
              </defs>
              <rect width="300" height="400" fill="rgba(13,18,32,0.45)" mask="url(#fcl-guide-hole)" />
              <ellipse cx="150" cy="168" rx="92" ry="122" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="10 8" />
            </svg>
          )}
          {countdown !== null && <div key={countdown} className="fcl-count" aria-live="assertive">{countdown}</div>}
          {camError && (
            <div className="fcl-nocam" role="alert">
              <CameraOff size={120} strokeWidth={1.4} aria-hidden="true" />
              <b>카메라를 켜지 못했어요</b>
              <span>{camError}</span>
              <button type="button" className="fg-btn fg-btn--primary fcl-recam" onClick={() => { setCamError(null); setCamTry((n) => n + 1) }}>다시 연결</button>
            </div>
          )}
        </div>
        <ul className="fcl-tips">
          <li><Check size={32} strokeWidth={3} aria-hidden="true" />밝은 곳</li>
          <li><Check size={32} strokeWidth={3} aria-hidden="true" />정면 보기</li>
          <li><Check size={32} strokeWidth={3} aria-hidden="true" />한 명씩</li>
        </ul>
        <div className="fg-actions fg-actions--row fcl-actions">
          <button type="button" className="fg-btn fg-btn--ghost fcl-back" onClick={reset} disabled={countdown !== null}>
            <ArrowLeft size={44} strokeWidth={2.4} aria-hidden="true" />뒤로
          </button>
          <button type="button" className="fg-btn fg-btn--primary" onClick={shoot} disabled={Boolean(camError) || countdown !== null}>
            <Camera size={48} strokeWidth={2.4} aria-hidden="true" />{countdown !== null ? '찍는 중…' : '찍기'}
          </button>
        </div>
      </FgStage>
    )
  }

  if (phase === 'analyzing') {
    return (
      <FgStage className="fcl fcl--analyzing" tone={TONE}>
        <section className="fcl-cam-head">
          <h1 className="fg-title fg-title--md">어울리는 색을 찾고 있어요</h1>
          <p className="fg-lead">{preparing ? '처음 한 번, 색 재는 도구를 준비하고 있어요' : '이 기기 안에서만 계산해요'}</p>
        </section>
        <figure className="fcl-scan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img src={photo} alt="" />}
          <i aria-hidden="true" />
        </figure>
        <ol className="fcl-steps" aria-live="polite">
          {ANALYZE_STEPS.map((label, i) => (
            <li key={label} data-state={i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'wait'}>
              <span>{i < stepIndex ? <Check size={30} strokeWidth={3.4} aria-hidden="true" /> : i + 1}</span>{label}
            </li>
          ))}
        </ol>
        <p className="fcl-privacy fcl-privacy--sm"><Lock size={30} strokeWidth={2.2} aria-hidden="true" /><span>사진은 어디에도 보내지 않아요</span></p>
      </FgStage>
    )
  }

  if (phase === 'retake' || phase === 'error') {
    const text = phase === 'error'
      ? { title: '잠깐 문제가 생겼어요', desc: '색 재는 도구를 준비하지 못했어요. 한 번 더 해 볼까요?', tips: ['계속 안 되면 직원에게 알려 주세요'] }
      : { ...FG_RETAKE_TEXTS[reason], tips: fails >= 2 ? [...FG_RETAKE_TEXTS[reason].tips, FG_RETAKE_STAFF] : FG_RETAKE_TEXTS[reason].tips }
    return (
      <FgStage className="fcl fcl--retake" tone={TONE} onHome={home}>
        <section className="fcl-retake">
          {photo && (
            <figure className="fcl-retake-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" />
            </figure>
          )}
          <p className="fg-kicker">한 번만 다시 찍어 볼까요?</p>
          <h1 className="fg-title fg-title--md">{text.title}</h1>
          <p className="fg-lead">{text.desc}</p>
          <ul className="fcl-retake-tips">
            {text.tips.map((tip) => <li key={tip}><Check size={36} strokeWidth={3} aria-hidden="true" /><span>{tip}</span></li>)}
          </ul>
        </section>
        <div className="fg-actions fcl-actions">
          {phase === 'error' ? (
            <button type="button" className="fg-btn fg-btn--primary" onClick={() => { releaseGarment(); setPhase('analyzing') }}>
              <RotateCcw size={46} strokeWidth={2.4} aria-hidden="true" />다시 해 보기
            </button>
          ) : (
            <button type="button" className="fg-btn fg-btn--primary" onClick={toCamera}>
              <Camera size={48} strokeWidth={2.4} aria-hidden="true" />다시 찍기
            </button>
          )}
          <button type="button" className="fg-btn fg-btn--ghost" onClick={home}>처음으로</button>
        </div>
      </FgStage>
    )
  }

  // 결과
  if (!typeId || !photo) return null
  const t = FG_COLOR_TEXTS[typeId]
  const pickedIndex = Math.max(0, t.colors.findIndex((c) => c.hex === selected))
  const picked = t.colors[pickedIndex]
  const swatch = (c: (typeof t.colors)[number]) => (
    <button
      key={c.hex}
      type="button"
      className="fcl-sw"
      data-on={c.hex === picked.hex || undefined}
      aria-pressed={c.hex === picked.hex}
      onClick={() => setSelected(c.hex)}
    >
      <i style={{ background: c.hex, color: readableInk(c.hex) }}>{c.hex === picked.hex && <Check size={44} strokeWidth={3.4} aria-hidden="true" />}</i>
      <span>{c.name}</span>
    </button>
  )
  return (
    <FgStage className="fcl fcl--result" tone={TONE} onHome={home}>
      <div className="fcl-scroll">
        <header className="fcl-res-head">
          <p className="fcl-badges"><span><Sparkles size={26} strokeWidth={2.4} aria-hidden="true" />AI 인식 기반</span><span><Lock size={24} strokeWidth={2.4} aria-hidden="true" />기기 안 판정</span></p>
          <p className="fcl-res-kicker">나에게 어울리는 색은</p>
          <h1 className="fcl-type">{t.name}<em data-tone={t.undertone}>{UNDERTONE_LABEL[t.undertone]}</em></h1>
          <p className="fcl-nick">“{t.nickname}”</p>
        </header>

        <section className="fcl-look" aria-label="어울리는 색 12">
          <div className="fcl-col">{t.colors.slice(0, 6).map(swatch)}</div>
          <figure className="fcl-photo" style={{ '--fcl-drape': picked.hex } as CSSProperties}>
            <div className="fcl-photo-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="찍은 사진" />
              {/* 옷 부분만 칠한 투명 그림 — 얼굴 · 머리카락 · 배경은 아래 원본 그대로 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {garmentReady && overlay && <img key={overlay} className="fcl-overlay" src={overlay} alt="" />}
              {!garmentReady && <span className="fcl-cape" aria-hidden="true" />}
            </div>
            <figcaption>
              <i style={{ background: picked.hex }} aria-hidden="true" />
              <b>{picked.name}</b>
              <span>{garmentReady ? <><Shirt size={26} strokeWidth={2.2} aria-hidden="true" />색을 누르면 옷 색이 바뀌어요</> : '색을 누르면 얼굴 아래 색이 바뀌어요'}</span>
            </figcaption>
          </figure>
          <div className="fcl-col">{t.colors.slice(6).map(swatch)}</div>
        </section>

        <section className="fg-card fcl-card">
          <p className="fcl-summary">{t.summary}</p>
          <ul className="fcl-features">
            {t.features.map((f) => <li key={f}><Palette size={32} strokeWidth={2.2} aria-hidden="true" /><span>{f}</span></li>)}
          </ul>
        </section>

        <section className="fg-card fcl-card">
          <h2 className="fcl-h2"><Shirt size={40} strokeWidth={2.2} aria-hidden="true" />이렇게 입어 보세요</h2>
          <ul className="fcl-advice">
            {t.tips.map((tip) => <li key={tip}>{tip}</li>)}
            <li>머리핀 · 시계 · 단추 같은 소품은 <b>{t.metal}</b>이 잘 어울려요.</li>
          </ul>
        </section>

        <p className="fcl-fun"><span className="fg-fun">{FG_COLOR_DISCLAIMER}</span></p>
      </div>
      <div className="fg-actions fg-actions--row fcl-foot">
        <button type="button" className="fg-btn fg-btn--ghost" onClick={toCamera}><RotateCcw size={44} strokeWidth={2.4} aria-hidden="true" />다시 찍기</button>
        <button type="button" className="fg-btn fg-btn--primary" onClick={home}>처음으로</button>
      </div>
    </FgStage>
  )
}
