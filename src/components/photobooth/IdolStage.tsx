'use client'

// 포토부스 행사 모드(K-WAVE) — AI 아이돌 컨셉 사진 화면 부품.
// - IdolConceptPicker: 첫 화면 컨셉 고르기(음방 엔딩요정·앨범 재킷·무대 직캠·뮤비 스틸)
// - useIdolStage: 찍은 한 컷 → 얼굴 수 확인 → /api/photobooth/idol 생성 → 결과 그림(다시 만들기 포함)
// - IdolStagePanel: 편집 화면 옆 — 만드는 중(경과 초) / 완성(다시 만들기) / 못 만듦(찍은 원본으로 인화)
// - IdolDesignPicker: 편집 화면 옆 — 컨셉별 인화 디자인 4종(src/lib/booth/idol-layouts.ts)을 실제 사진으로 그린 미리보기로 고르기
// 개념·프롬프트는 src/lib/booth/idol-concepts.ts, 서버는 src/lib/booth/idol-generate.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IDOL_CONCEPTS, IDOL_MAX_PEOPLE, findIdolConcept } from '@/lib/booth/idol-concepts'
import { findStageLook } from '@/lib/booth/stage-makeup'
import { countFaces, faceRectsInCell } from '@/lib/booth/face-makeup'
import { drawIdolDesign, idolDesigns, type Picture } from '@/lib/booth/idol-layouts'

// ───────────────────────── 컨셉 고르기 ─────────────────────────

export function IdolConceptPicker({ value, onChange, variant }: {
  value: string
  onChange: (id: string) => void
  variant: 'retro' | 'classic'
}) {
  const retro = variant === 'retro'
  const current = findIdolConcept(value)
  return (
    <div className={retro ? 'bth-look-picker bth-look-picker--home' : 'flex w-full flex-col gap-3 text-center'}>
      <div className={retro ? 'bth-look-grid bth-look-grid--2' : 'grid grid-cols-2 gap-3 text-left'} role="radiogroup" aria-label="아이돌 컨셉 · Idol concept">
        {IDOL_CONCEPTS.map((concept) => {
          const on = concept.id === value
          const swatch = findStageLook(concept.lookId)?.swatch ?? ['#ffffff', '#d9dde6']
          return (
            <button
              key={concept.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-on={on ? 'true' : 'false'}
              onClick={() => onChange(concept.id)}
              className={retro
                ? 'rt-choice bth-look-btn'
                : `flex min-h-24 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${on ? 'border-current ring-2 ring-current' : 'border-[color:color-mix(in_srgb,currentColor_22%,transparent)]'}`}
            >
              <span className={retro ? 'bth-look-swatch' : 'h-12 w-12 shrink-0 rounded-full border border-black/10 shadow-inner'}
                style={{ background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})` }} aria-hidden="true" />
              <span className={retro ? 'bth-look-name' : 'flex min-w-0 flex-col leading-tight'}>
                <b className={retro ? undefined : 'line-clamp-2 break-keep text-lg font-bold'}>{concept.name.ko}</b>
                <em className={retro ? undefined : 'truncate text-sm not-italic opacity-70'}>{concept.name.en}</em>
              </span>
            </button>
          )
        })}
      </div>
      <p className={retro ? 'bth-group-text bth-look-desc' : 'text-lg leading-snug opacity-75'} aria-live="polite">
        {current && <>{current.desc.ko}<br /><span>{current.desc.en}</span></>}
      </p>
    </div>
  )
}

/** 첫 화면 동의 문구 — 사진이 외부 AI 로 간다는 것을 촬영 전에 알린다 */
export const IDOL_CONSENT = {
  ko: '찍은 사진은 AI 아이돌 사진을 만드는 데만 AI 서비스(Google)로 보내지고, 저장하지 않아요.',
  en: 'Your photo is sent to an AI service only to create your idol photo, and is not stored.',
}

// ───────────────────────── 생성 흐름 ─────────────────────────

export type IdolStatus = 'off' | 'checking' | 'generating' | 'done' | 'failed' | 'skipped'

type Box = { x: number; y: number; w: number; h: number }

/** 원본의 box 부분을 w×h JPEG 로 */
function cropJpeg(img: HTMLImageElement, box: Box, w: number, h: number, quality = 0.92) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, w, h)
  return c.toDataURL('image/jpeg', quality)
}

/**
 * AI 에 보낼 사진 — 얼굴이 작고 흐리면 모델이 얼굴을 새로 그려 '다른 사람'이 된다(가로 원판 전체를 1280 으로 줄여 보내던 때).
 * - 본 사진: 손님이 촬영 화면에서 본 세로 2:3 구도, 얼굴이 작으면 상반신이 차도록 얼굴 쪽으로 당겨 1024×1536
 * - 얼굴 참고: 사람마다 얼굴 클로즈업 512×512(최대 IDOL_MAX_PEOPLE 장) — 서버가 '정체성 참고용'으로 함께 보낸다
 */
async function idolInputs(img: HTMLImageElement) {
  const W = img.naturalWidth, H = img.naturalHeight
  // 촬영 화면(2:3 cover)과 같은 가운데 세로 구도
  const baseH = Math.min(H, W * 1.5), baseW = baseH / 1.5
  let crop: Box = { x: (W - baseW) / 2, y: (H - baseH) / 2, w: baseW, h: baseH }
  const faces = (await faceRectsInCell(img, 0, 0, W, H)).filter((f) => f.w > 0 && f.h > 0)
  if (faces.length) {
    const x0 = Math.min(...faces.map((f) => f.x)), x1 = Math.max(...faces.map((f) => f.x + f.w))
    const y0 = Math.min(...faces.map((f) => f.y)), y1 = Math.max(...faces.map((f) => f.y + f.h))
    // 머리가 세로의 약 1/4(상반신) — 여럿이면 모두 들어가게 가로 여유
    const h = Math.min(baseH, Math.max((y1 - y0) / 0.26, ((x1 - x0) * 1.5) * 1.5))
    const w = h / 1.5
    const cx = (x0 + x1) / 2
    const x = Math.min(Math.max(cx - w / 2, 0), W - w)
    const y = Math.min(Math.max(y0 - h * 0.14, 0), H - h)
    crop = { x, y, w, h }
  }
  const photo = cropJpeg(img, crop, 1024, 1536)
  const faceRefs = faces.slice(0, IDOL_MAX_PEOPLE)
    .sort((a, b) => a.x - b.x)
    .map((f) => {
      const side = Math.min(Math.max(f.w, f.h) * 1.35, W, H)
      const x = Math.min(Math.max(f.x + f.w / 2 - side / 2, 0), W - side)
      const y = Math.min(Math.max(f.y + f.h / 2 - side / 2, 0), H - side)
      return cropJpeg(img, { x, y, w: side, h: side }, 512, 512)
    })
  return { photo, faces: faceRefs }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 읽지 못했어요'))
    img.src = src
  })
}

/** 한 이용권(표)으로 만들 수 있는 횟수 — 서버 IDOL_TICKET_USES 와 같게 */
const MAX_TRIES = 3

export function useIdolStage({ active, shot, conceptId, ticket, getImage }: {
  /** 행사 모드 + 동의 + 키 설정 + 편집·결과 단계 */
  active: boolean
  /** 찍은 한 컷(주소) — 바뀌면 처음부터 */
  shot: string | null
  conceptId: string
  ticket: string | null
  getImage: (src: string) => Promise<HTMLImageElement>
}) {
  const [status, setStatus] = useState<IdolStatus>('off')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [message, setMessage] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [tries, setTries] = useState(0)
  const runRef = useRef(0)
  const startedFor = useRef<string | null>(null)

  const run = useCallback(async () => {
    if (!shot) return
    const token = ++runRef.current
    const concept = findIdolConcept(conceptId)
    setImage(null)
    setMessage('')
    setElapsed(0)
    if (!concept || !ticket) {
      setStatus('failed')
      setMessage(!ticket ? '이용권 확인 정보가 없어 찍은 사진 그대로 인화해요.' : '컨셉을 찾지 못했어요.')
      return
    }
    try {
      setStatus('checking')
      const original = await getImage(shot)
      const people = await countFaces(original)
      if (token !== runRef.current) return
      if (people === 0 || people > IDOL_MAX_PEOPLE) {
        setStatus('skipped')
        setMessage(people === 0
          ? '얼굴을 찾지 못해 찍은 사진 그대로 인화해요. 카메라 가까이 서면 AI 사진을 만들 수 있어요.'
          : `AI 사진은 ${IDOL_MAX_PEOPLE}명까지예요. ${people}명이라 찍은 사진 그대로 인화해요.`)
        return
      }
      const input = await idolInputs(original)
      if (token !== runRef.current) return
      setStatus('generating')
      setTries((n) => n + 1)
      const res = await fetch('/api/photobooth/idol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 얼굴 인식을 못 쓰는 기기(-1)면 1명으로 보고 만든다
        body: JSON.stringify({ ticket, concept: concept.id, people: Math.max(1, people), photo: input.photo, faces: input.faces }),
      })
      const data = await res.json().catch(() => ({}))
      if (token !== runRef.current) return
      if (!res.ok || typeof data.image !== 'string') throw new Error(data.error || 'AI 사진을 만들지 못했어요.')
      const made = await loadImage(data.image)
      if (token !== runRef.current) return
      setImage(made)
      setStatus('done')
    } catch (error) {
      if (token !== runRef.current) return
      setStatus('failed')
      setMessage(`${error instanceof Error ? error.message : 'AI 사진을 만들지 못했어요.'} 찍은 사진 그대로 인화해요.`)
    }
  }, [shot, conceptId, ticket, getImage])

  // 편집 화면에 들어오면 한 번 자동으로 시작, 사진이 바뀌거나 꺼지면 처음으로
  useEffect(() => {
    if (!active || !shot) {
      if (!shot) {
        runRef.current++
        startedFor.current = null
        setStatus('off')
        setImage(null)
        setTries(0)
      }
      return
    }
    if (startedFor.current === shot) return
    startedFor.current = shot
    void run()
  }, [active, shot, run])

  // 만드는 중 경과 초
  useEffect(() => {
    if (status !== 'generating') return
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500)
    return () => window.clearInterval(timer)
  }, [status])

  const busy = status === 'checking' || status === 'generating'
  return {
    status,
    /** 인화에 쓸 AI 사진(완성일 때만) */
    image: status === 'done' ? image : null,
    message,
    elapsed,
    busy,
    canRetry: !busy && status !== 'skipped' && tries < MAX_TRIES && !!ticket,
    retriesLeft: Math.max(0, MAX_TRIES - tries),
    retry: () => { void run() },
  }
}

// ───────────────────────── 편집 화면 안내 ─────────────────────────

const WAIT_LINES = [
  ['무대 조명 켜는 중…', 'Turning on the stage lights…'],
  ['헤어·메이크업 받는 중…', 'Hair and makeup in progress…'],
  ['무대 의상 갈아입는 중…', 'Changing into the stage outfit…'],
  ['카메라 리허설 중…', 'Camera rehearsal…'],
  ['곧 데뷔합니다!', 'Debut coming up!'],
] as const

export function IdolStagePanel({ stage, conceptId, variant }: {
  stage: ReturnType<typeof useIdolStage>
  conceptId: string
  variant: 'retro' | 'classic'
}) {
  const retro = variant === 'retro'
  const concept = findIdolConcept(conceptId)
  const line = WAIT_LINES[Math.min(WAIT_LINES.length - 1, Math.floor(stage.elapsed / 5))]
  const text = retro ? 'bth-group-text' : 'text-sm leading-snug opacity-80'
  const button = retro ? 'rt-btn rt-btn--block' : 'rounded-full border px-5 py-3 text-base font-bold transition-opacity hover:opacity-80 disabled:opacity-40'
  return (
    <div className={retro ? 'bth-idol-panel' : 'flex flex-col gap-2'} role="status" aria-live="polite">
      {concept && <p className={retro ? 'bth-idol-concept' : 'text-lg font-bold'}>{concept.name.ko} · {concept.name.en}</p>}
      {stage.busy && (
        <>
          <p className={retro ? 'bth-idol-wait' : 'text-base font-bold'}>
            {stage.status === 'checking' ? '얼굴 확인 중… · Checking faces…' : `${line[0]} · ${line[1]}`}
          </p>
          <div className={retro ? 'bth-idol-bar' : 'h-2 w-full overflow-hidden rounded-full bg-current/15'} aria-hidden="true">
            <span className={retro ? undefined : 'block h-full rounded-full bg-current transition-[width] duration-500'}
              style={{ width: `${Math.min(95, 8 + stage.elapsed * 3.2)}%` }} />
          </div>
          <p className={text}>AI 아이돌 사진을 만들고 있어요 (보통 20~40초) · {stage.elapsed}s</p>
        </>
      )}
      {stage.status === 'done' && (
        <p className={text}>완성! 아래에서 인화 디자인을 골라 주세요 · Pick a print design below</p>
      )}
      {(stage.status === 'failed' || stage.status === 'skipped') && <p className={text}>{stage.message}</p>}
      {stage.canRetry && (stage.status === 'done' || stage.status === 'failed') && (
        <button type="button" className={button} onClick={stage.retry}>
          {stage.status === 'done' ? '다시 만들기 · Try again' : 'AI 사진 다시 시도 · Retry'} ({stage.retriesLeft})
        </button>
      )}
    </div>
  )
}

// ───────────────────────── 인화 디자인 고르기 ─────────────────────────

const THUMB = 0.2

/** 컨셉별 인화 디자인 4종 — 손님 사진으로 그린 작은 미리보기(인화와 같은 그리기 함수) */
export function IdolDesignPicker({ conceptId, value, onChange, main, before, event, variant }: {
  conceptId: string
  value: string | null
  onChange: (id: string) => void
  /** 큰 사진(AI 사진, 아직 없으면 찍은 원본) */
  main: Picture | null
  before: Picture | null
  event: string
  variant: 'retro' | 'classic'
}) {
  const retro = variant === 'retro'
  const concept = findIdolConcept(conceptId)
  const designs = useMemo(() => (concept ? idolDesigns(concept) : []), [concept])
  const selected = designs.find((d) => d.id === value)?.id ?? designs[0]?.id
  const canvases = useRef<(HTMLCanvasElement | null)[]>([])

  useEffect(() => {
    if (!concept || !main) return
    designs.forEach((design, i) => {
      const canvas = canvases.current[i]
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.setTransform(THUMB, 0, 0, THUMB, 0, 0)
      drawIdolDesign(ctx, concept, design.id, { main, before }, event)
    })
  }, [concept, designs, main, before, event])

  if (!concept) return null
  return (
    <div className={retro ? 'bth-look-grid bth-look-grid--2' : 'grid grid-cols-2 gap-3'} role="radiogroup" aria-label="인화 디자인 · Print design">
      {designs.map((design, i) => {
        const on = design.id === selected
        return (
          <button
            key={design.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-on={on ? 'true' : 'false'}
            onClick={() => onChange(design.id)}
            className={retro
              ? 'rt-choice flex flex-col items-center gap-1 p-2'
              : `flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-colors ${on ? 'border-current ring-2 ring-current' : 'border-[color:color-mix(in_srgb,currentColor_22%,transparent)]'}`}
          >
            <canvas
              ref={(node) => { canvases.current[i] = node }}
              width={1200 * THUMB}
              height={1800 * THUMB}
              className="block aspect-[2/3] w-full rounded-md bg-black/10"
            />
            <b className="text-sm leading-tight">{design.name.ko}</b>
            <em className="text-xs not-italic opacity-70">{design.name.en}</em>
          </button>
        )
      })}
    </div>
  )
}
