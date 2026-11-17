'use client'

// 펀그라운드 별내 B안 퍼스널 컬러(COLOR!) — 1920×1080 가로 화면(FgStage, 32인치 가로 터치스크린 · 가로 카메라). 시작 → 카메라(가이드 · 3초) → 기기 안 분석 → 결과 / 다시 찍기.
// 「FUN GROUND Editorial」 테마(2026-11-16 목업 color_1~3 — FgStage program="color", 강조색 라임 #C8FF2E · 글자 검정):
//   01 시작(왼쪽 꽉 찬 사진 · 오른쪽 COLOR! · 나에게 어울리는 색) · 02 촬영 · 분석 · 다시 찍기 · 03 결과(왼쪽 사진 · 오른쪽 유형 · 색 12 한 줄).
//   촬영부터 결과까지 왼쪽 칸은 찍히는 사진과 같은 3:4(738×984) — 화면에 보이는 그대로 찍히고, 결과도 같은 자리 · 같은 크기로 보인다.
// 키오스크 ai-color 를 건드리지 않으려고 화면은 따로 두고, 기기 안 부품은 그대로 가져다 쓴다:
//   - 사람 분리 · 색 재기: src/lib/kiosk/garment-recolor.ts(MediaPipe SelfieMulticlass, 웹 워커 — public/models · public/mediapipe 자체 호스팅)
//     → measureColors(얼굴 피부 · 머리카락 Lab). 같은 분리 결과로 사진 속 옷 색을 바꿔 보여 준다(옷이 안 잡히면 얼굴 아래 천 드레이프).
//   - 판정: src/lib/kiosk/color-rules.ts diagnoseFromMeasure(키오스크와 같은 숫자 규칙) — 유형까지 못 정하면 결과를 지어내지 않고 다시 찍는다.
//   - 결과 문장: src/lib/funground/color-texts.ts(청소년용으로 미리 쓴 8유형 표). AI 가 쓴 글이 아니다.
// 외부 AI 서비스를 부르지 않는다. 사진은 이 화면의 메모리에만 있다가 처음으로 · 다시 찍기 · 무입력이면 지운다.
// 결과의 「인쇄하기 · QR로 받기」(FgResultButtons): 4×6 퍼스널 컬러 카드(color-print.ts — 사진 포함)를 미리보기로 띄우고, 그 창을 연 때만
//   카드 그림 한 장을 우리 서버(/api/kiosk/share, 24시간)에 올려 QR 로 휴대폰에 받게 한다(2026-11-14 사용자 결정 — B안 결과도 QR 로 받기).
// 9~19세 체험 — 점수 · 순위 · 외모 평가 없이 「어울리는 색」만 보여 준다.

import { CameraOff, Check, Lock, RotateCcw, ScanFace, Shirt } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { FgResultButtons, type FgPrintable } from '@/components/funground/FgResultSheet'
import { FgStage, useFgHome } from '@/components/funground/FgStage'
import { FG_COLOR_DISCLAIMER, FG_COLOR_TEXTS, UNDERTONE_LABEL } from '@/lib/funground/color-texts'
import { FG_RETAKE_STAFF, FG_RETAKE_TEXTS, judgeColor, type FgRetakeReason } from '@/lib/funground/color-judge'
import {
  preloadGarmentModel, prepareGarment, releaseGarment, setGarmentDownloadFast, warmGarmentEngine, type GarmentPrep,
} from '@/lib/kiosk/garment-recolor'
import type { PersonalColorTypeId } from '@/types/analysis'
import { drawColorPrint } from './color-print'
import './fg-color.css'

/** 강조색(라임) — 인쇄 카드도 같은 색 */
const ACCENT = '#C8FF2E'
/** 분석 화면을 이만큼은 보여 준다 — 너무 빨리 넘어가면 무엇을 했는지 모른다 */
const MIN_ANALYZE_MS = 2600
/** 처음 한 번 모델 파일(약 26MB)을 받는 동안 기다리는 한도 */
const MODEL_WAIT_MS = 120_000
/** 아무도 누르지 않으면 처음으로 */
const IDLE_CAMERA_MS = 60_000
const IDLE_RESULT_MS = 90_000
/** 분석 화면의 단계 글 — 실제 계산 순서(얼굴 · 머리카락 분리 → 색 재기 → 규칙으로 유형) */
const ANALYZE_STEPS = ['얼굴 · 머리카락 찾기', '피부 색 재기', '머리카락 색 재기', '어울리는 색 고르기']

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

/** 가로 카메라에서 쓰는 가운데 칸 비율(4:3) — 이 높이 전체를 쓴다(16:9 · 4:3 카메라 모두 영상 높이 그대로) */
const CAM_BOX = 4 / 3
/** 찍히는 사진 비율(세로 3:4) — 화면의 카메라 칸(738×984)과 같다. 얼굴 · 머리카락 · 어깨가 크게 들어와 색 재기 · 옷 칠하기에 좋다 */
const SHOT = 3 / 4

/**
 * 키오스크 촬영과 같은 방식 — 영상 높이 그대로, 가운데 3:4 창만 잘라 좌우 반전, 최대 720×960 JPEG(메모리에만).
 * 가로 카메라(16:9 · 4:3)면 영상 높이 전체를 쓴다(1920×1080 → 가운데 810×1080) — 3:4 카메라 칸(object-fit cover)에 보이는 곳과 같다.
 */
function grabFrame(video: HTMLVideoElement): string | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  const ch = Math.min(vh, Math.round(vw / CAM_BOX))
  const cw = Math.round(ch * SHOT)
  const outH = Math.min(960, ch)
  const outW = Math.round(outH * SHOT)
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
  /** 4×6 인쇄 카드 — 고른 색(옷 · 천)마다 한 번만 그린다(사진이 바뀌면 비운다) */
  const [cards, setCards] = useState<Record<string, FgPrintable>>({})

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
    setCards({})
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

  // ── 카메라 — 촬영 화면에서만 켜고, 떠나면 끈다. 가로 카메라에 1080p 를 달라고 해야 가운데 3:4 창이 720×960 으로 넉넉하다(720p 면 540×720) ──
  useEffect(() => {
    if (phase !== 'camera') return
    let cancelled = false
    let stream: MediaStream | null = null
    warmGarmentEngine()
    const media = navigator.mediaDevices
    const request = media?.getUserMedia
      ? media.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
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

  // ── 인쇄 카드 — 지금 고른 색으로 칠한 사진으로 그린다(옷 그림은 위와 같은 캐시라 다시 계산하지 않는다). 그리는 동안은 단추를 잠근다 ──
  const cardKey = `${selected}${garmentReady ? ':clothes' : ':cape'}`
  const cardDone = Boolean(cards[cardKey])
  useEffect(() => {
    if (phase !== 'result' || !typeId || !photo || !selected || cardDone) return
    let alive = true
    const text = FG_COLOR_TEXTS[typeId]
    const picked = text.colors.find((c) => c.hex === selected) ?? text.colors[0]
    void (async () => {
      const prep = prepRef.current
      const overlayUrl = garmentReady && prep ? await prep.render(selected).catch(() => null) : null
      if (!alive) return
      const image = await drawColorPrint({ text, photo, overlay: overlayUrl, picked, tone: ACCENT, date: new Date() })
      if (!alive) return
      const card: FgPrintable = { image, label: '퍼스널 컬러 카드', fileName: 'funground-color', printer: 'photo' }
      setCards((prev) => ({ ...prev, [cardKey]: card }))
    })().catch((cause) => { if (process.env.NODE_ENV !== 'production') console.error('[fg-color] 인쇄 카드', cause) })
    return () => { alive = false }
  }, [phase, typeId, photo, selected, garmentReady, cardKey, cardDone])

  // ───────────────────────── 화면 ─────────────────────────

  if (phase === 'intro') {
    return (
      <FgStage className="fcl fcl--intro" program="color" step={1} onHome={home}>
        <div className="fge-split">
          <div className="fge-hero fcl-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/booth-programs/funground-editorial/color-hero.webp" alt="" />
          </div>
          <section className="fge-panel fcl-intro">
            <div className="fge-labelrow"><span className="fge-label">퍼스널 컬러 · AI 인식 기반</span></div>
            <h1 className="fge-title">COLOR!</h1>
            <p className="fge-head"><u>나에게 어울리는 색</u></p>
            <p className="fge-lead">사진 한 장으로 8가지 유형 중 내 색을 찾아요</p>
            <button type="button" className="fge-btn fge-btn--wide fcl-go" onClick={toCamera}>
              시작하기<Arrow />
            </button>
            <p className="fcl-privacy"><Lock size={28} strokeWidth={1.5} aria-hidden="true" />판정은 이 기기 안에서 · 인쇄 · QR을 누를 때만 결과 카드를 24시간 보관해요</p>
          </section>
        </div>
      </FgStage>
    )
  }

  if (phase === 'camera') {
    return (
      <FgStage className="fcl fcl--camera" program="color" step={2} onHome={home}>
        <div className="fge-split fcl-split">
          {/* 카메라 칸 = 찍히는 3:4 창(grabFrame) — 보이는 그대로 찍힌다 */}
          <div className="fge-cam fcl-cam" data-error={camError ? true : undefined}>
            <video ref={videoRef} playsInline muted />
            {!camError && (
              <>
                <span className="fge-camtag">밝은 곳에서 정면으로 · 한 명씩</span>
                <div className="fge-brackets fcl-brackets" aria-hidden="true"><span /><span /><span /><span /></div>
              </>
            )}
            {camError && (
              <div className="fcl-nocam" role="alert">
                <CameraOff size={112} strokeWidth={1.25} aria-hidden="true" />
                <b>카메라를 켜지 못했어요</b>
                <span>{camError}</span>
                <button type="button" className="fge-btn fcl-recam" onClick={() => { setCamError(null); setCamTry((n) => n + 1) }}>다시 연결</button>
              </div>
            )}
          </div>
          <section className="fge-panel fcl-side">
            <span className="fge-steplabel">02 / 촬영</span>
            <h1 className="fge-head"><u>얼굴을 가운데 맞춰 주세요</u></h1>
            <p className="fge-lead">모자는 잠깐 벗고, 머리카락도 보이게!</p>
            <p className="fge-count fcl-count" data-on={countdown !== null || undefined} aria-live="assertive">{countdown ?? 3}</p>
            <button type="button" className="fge-btn fge-btn--wide fcl-shoot" onClick={shoot} disabled={Boolean(camError) || countdown !== null}>
              {countdown !== null ? '찍는 중…' : '찍기'}<Arrow />
            </button>
          </section>
        </div>
      </FgStage>
    )
  }

  if (phase === 'analyzing') {
    return (
      <FgStage className="fcl fcl--analyzing" program="color" step={2}>
        <div className="fge-split fcl-split">
          {/* 카메라 칸과 같은 자리 · 같은 크기에 찍은 사진을 두고 훑는다 */}
          <div className="fge-cam fcl-cam fcl-scan">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo && <img src={photo} alt="" />}
            <div className="fge-brackets fcl-brackets" aria-hidden="true"><span /><span /><span /><span /></div>
            <i className="fcl-scanline" aria-hidden="true" />
          </div>
          <section className="fge-panel fcl-side">
            <span className="fge-steplabel">02 / 분석</span>
            <h1 className="fge-head"><u>어울리는 색을 찾고 있어요</u></h1>
            <div className="fge-wait">
              <div className="fge-bar" aria-hidden="true"><i /></div>
              <p className="fge-lead">{preparing ? '처음 한 번, 색 재는 도구를 준비하고 있어요' : '이 기기 안에서만 계산해요 — 외부로 보내지 않아요'}</p>
            </div>
            <ol className="fge-rows fcl-steps" aria-live="polite">
              {ANALYZE_STEPS.map((label, i) => (
                <li key={label} data-state={i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'wait'}>
                  <i>{`0${i + 1}`}</i><b>{label}</b>
                  <span>{i < stepIndex ? <Check size={40} strokeWidth={1.5} aria-label="끝" /> : null}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </FgStage>
    )
  }

  if (phase === 'retake' || phase === 'error') {
    const text = phase === 'error'
      ? { title: '잠깐 문제가 생겼어요', desc: '색 재는 도구를 준비하지 못했어요. 한 번 더 해 볼까요?', tips: ['계속 안 되면 직원에게 알려 주세요'] }
      : { ...FG_RETAKE_TEXTS[reason], tips: fails >= 2 ? [...FG_RETAKE_TEXTS[reason].tips, FG_RETAKE_STAFF] : FG_RETAKE_TEXTS[reason].tips }
    return (
      <FgStage className="fcl fcl--retake" program="color" step={2} onHome={home}>
        <div className="fge-split fcl-split">
          <div className="fge-cam fcl-cam fcl-retake-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt="" /> : <ScanFace size={200} strokeWidth={1.25} aria-hidden="true" />}
            <span className="fge-camtag">한 번만 다시 찍어 볼까요?</span>
          </div>
          <section className="fge-panel fcl-side">
            <span className="fge-steplabel">{phase === 'error' ? '02 / 다시 해 보기' : '02 / 다시 찍기'}</span>
            <h1 className="fge-head"><u>{text.title}</u></h1>
            <p className="fge-lead">{text.desc}</p>
            <ol className="fge-rows fcl-tips">
              {text.tips.map((tip, i) => <li key={tip}><i>{`0${i + 1}`}</i><span>{tip}</span></li>)}
            </ol>
            {phase === 'error' ? (
              <button type="button" className="fge-btn fge-btn--wide" onClick={() => { releaseGarment(); setPhase('analyzing') }}>
                다시 해 보기<RotateCcw size={56} strokeWidth={1.5} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="fge-btn fge-btn--wide" onClick={toCamera}>
                다시 찍기<Arrow />
              </button>
            )}
          </section>
        </div>
      </FgStage>
    )
  }

  // 결과
  if (!typeId || !photo) return null
  const t = FG_COLOR_TEXTS[typeId]
  const pickedIndex = Math.max(0, t.colors.findIndex((c) => c.hex === selected))
  const picked = t.colors[pickedIndex]
  // 한 줄 설명 = 요약의 첫 문장(「…색이 잘 어울리는 타입이에요.」), 나머지 문장은 아래 줄에
  const cut = t.summary.indexOf('. ')
  const lead = cut > 0 ? t.summary.slice(0, cut + 1) : t.summary
  const rest = cut > 0 ? t.summary.slice(cut + 2) : ''
  return (
    <FgStage className="fcl fcl--result" program="color" step={3} onHome={home}>
      <div className="fge-split fcl-split">
        {/* 왼쪽 — 찍은 사진(오른쪽 색을 누르면 사진 속 옷 색이 바뀐다) */}
        <figure className="fge-hero fcl-cam fcl-photo" style={{ '--fcl-drape': picked.hex } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="찍은 사진" />
          {/* 옷 부분만 칠한 투명 그림 — 얼굴 · 머리카락 · 배경은 아래 원본 그대로 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {garmentReady && overlay && <img key={overlay} className="fcl-overlay" src={overlay} alt="" />}
          {!garmentReady && <span className="fcl-cape" aria-hidden="true" />}
          <button type="button" className="fge-camtag fcl-again" onClick={toCamera}><RotateCcw size={30} strokeWidth={1.5} aria-hidden="true" />다시 찍기</button>
          <figcaption className="fcl-picked">
            <i style={{ background: picked.hex }} aria-hidden="true" />
            <b>{picked.name}</b>
            <span>{garmentReady ? <><Shirt size={26} strokeWidth={1.5} aria-hidden="true" />색을 누르면 옷 색이 바뀌어요</> : '색을 누르면 얼굴 아래 색이 바뀌어요'}</span>
          </figcaption>
        </figure>

        {/* 오른쪽 — 유형 · 한 줄 · 색 12 한 줄 · 입는 법(넘치면 이 칸 안에서만 밀어 올린다) · 단추는 늘 아래 */}
        <section className="fge-panel fcl-side fcl-res">
          <div className="fge-labelrow fcl-res-label">
            <span className="fge-label">나의 퍼스널 컬러</span>
            <small>AI 인식 기반 · 기기 안 판정</small>
          </div>
          <h1 className="fge-head fge-head--xl fcl-type"><u>{t.name}</u><em>{UNDERTONE_LABEL[t.undertone]}</em></h1>
          <p className="fge-lead fcl-lead">{lead}</p>

          <div className="fcl-palette" role="group" aria-label="어울리는 색 12 — 누르면 사진 속 옷 색이 바뀌어요">
            {t.colors.map((c) => (
              <button
                key={c.hex}
                type="button"
                className="fcl-sw"
                style={{ background: c.hex }}
                aria-pressed={c.hex === picked.hex}
                aria-label={c.name}
                onClick={() => setSelected(c.hex)}
              />
            ))}
          </div>

          <div className="fcl-scroll">
            <ol className="fge-rows fcl-advice">
              {t.tips.slice(0, 3).map((tip, i) => <li key={tip}><i>{`0${i + 1}`}</i><span>{tip}</span></li>)}
            </ol>
            <p className="fcl-more"><b>“{t.nickname}”</b> {rest}</p>
            <p className="fcl-more">{t.features.join(' · ')}. 머리핀 · 시계 · 단추 같은 소품은 <b>{t.metal}</b>이 잘 어울려요.</p>
            <p className="fcl-more fcl-fun">{FG_COLOR_DISCLAIMER}</p>
          </div>
          <FgResultButtons printable={cards[cardKey] ?? null} />
        </section>
      </div>
    </FgStage>
  )
}

/** 단추 오른쪽 가는 화살표(목업 그대로 — 긴 선 + 작은 머리) */
function Arrow() {
  return (
    <svg className="fge-arrow" viewBox="0 0 96 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h86M74 6l16 14-16 14" />
    </svg>
  )
}
