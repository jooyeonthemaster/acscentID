'use client'

// 포토부스 행사 모드(K-WAVE) — AI 아이돌 컨셉 사진 화면 부품.
// - IdolConceptPicker: 첫 화면 컨셉 고르기(음방 엔딩요정·앨범 재킷·무대 직캠·뮤비 스틸)
// - useIdolStage: 찍은 한 컷 → 얼굴 수 확인 → /api/photobooth/idol 생성 → 결과 그림(다시 만들기 포함)
// - IdolStagePanel: 편집 화면 옆 — 만드는 중(경과 초) / 완성(다시 만들기) / 못 만듦(찍은 원본으로 인화)
// - IdolDesignPicker: 편집 화면 옆 — 컨셉별 인화 디자인 4종(src/lib/booth/idol-layouts.ts)을 실제 사진으로 그린 미리보기로 고르기
// 개념·프롬프트는 src/lib/booth/idol-concepts.ts, 서버는 src/lib/booth/idol-generate.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IDOL_CONCEPTS, IDOL_MAX_PEOPLE, findIdolConcept } from '@/lib/booth/idol-concepts'
import { countFaces, faceRectsInCell } from '@/lib/booth/face-detect'
import { designNeedsAi, drawIdolDesign, idolDesigns, type Picture } from '@/lib/booth/idol-layouts'
import { boothText, conceptText, designName, type BoothLang, type BoothText } from '@/lib/booth/i18n'

// ───────────────────────── 컨셉 고르기 ─────────────────────────

export function IdolConceptPicker({ value, onChange, variant, lang }: {
  value: string
  onChange: (id: string) => void
  variant: 'retro' | 'classic'
  /** 화면 언어 — 이름·설명은 src/lib/booth/i18n.ts 에서 id 로 찾는다 */
  lang: BoothLang
}) {
  const retro = variant === 'retro'
  const t = boothText(lang)
  const current = findIdolConcept(value)
  // 컨셉마다 예시 사진 썸네일(같은 예시 인물로 실제 부스 파이프라인에서 만든 결과 — design-review/kwave-idol-examples-4)
  // 4열 1행으로 가로로 쭉 — 한눈에 비교하고 고르게
  return (
    <div className={retro ? 'bth-concept-picker' : 'flex w-full flex-col gap-3 text-center'}>
      <div className={retro ? 'bth-concept-grid' : 'grid w-full grid-cols-4 gap-3'} role="radiogroup" aria-label={t.conceptAria}>
        {IDOL_CONCEPTS.map((concept) => {
          const on = concept.id === value
          const text = conceptText(t, concept)
          return (
            <button
              key={concept.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-on={on ? 'true' : 'false'}
              onClick={() => onChange(concept.id)}
              className={retro
                ? 'rt-choice bth-concept-card'
                : `flex flex-col items-stretch gap-2 rounded-2xl border-2 p-2 transition-colors ${on ? 'border-current ring-2 ring-current' : 'border-[color:color-mix(in_srgb,currentColor_22%,transparent)]'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/assets/photobooth/idol-concepts/${concept.id}.webp`}
                alt=""
                draggable={false}
                className={retro ? 'bth-concept-thumb' : 'block aspect-square w-full rounded-xl object-cover'}
              />
              <b className={retro ? 'bth-concept-name' : 'line-clamp-2 break-keep text-center text-base font-bold leading-tight'}>{text.name}</b>
            </button>
          )
        })}
      </div>
      <p className={retro ? 'bth-group-text bth-concept-desc' : 'text-base leading-snug opacity-75'} aria-live="polite">
        {current && conceptText(t, current).desc}
      </p>
    </div>
  )
}

// 첫 화면 동의 문구(사진이 외부 AI 로 간다는 것을 촬영 전에 알린다)는 사전 idolConsent

// ───────────────────────── 생성 흐름 ─────────────────────────

export type IdolStatus = 'off' | 'checking' | 'generating' | 'done' | 'failed' | 'skipped'

/** 못 만든 이유 — 문구는 화면 언어로 그때그때 만든다(도중에 언어를 바꿔도 따라간다) */
type IdolNote =
  | { kind: 'noTicket' | 'noConcept' | 'noFace' }
  | { kind: 'tooMany'; people: number }
  | { kind: 'failed'; detail: string | null }

function idolNoteText(t: BoothText, lang: BoothLang, note: IdolNote): string {
  switch (note.kind) {
    case 'noTicket': return t.idolNoTicket
    case 'noConcept': return t.idolNoConcept
    case 'noFace': return t.idolNoFace
    case 'tooMany': return t.idolTooMany(IDOL_MAX_PEOPLE, note.people)
    // 서버·기기 오류 문구는 한국어라 한국어 화면에서만 그대로 보여 준다
    case 'failed': return `${lang === 'ko' && note.detail ? note.detail : t.idolFailed} ${t.idolFallback}`
  }
}

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
 *   (둘레 여백을 두고 줄여 보내 봤더니 얼굴이 작아진 대신 다른 사람처럼 나왔다 — 2026-10-01 되돌림)
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

export function useIdolStage({ active, shot, conceptId, ticket, getImage, lang }: {
  /** 행사 모드 + 동의 + 키 설정 + 편집·결과 단계 */
  active: boolean
  /** 찍은 한 컷(주소) — 바뀌면 처음부터 */
  shot: string | null
  conceptId: string
  ticket: string | null
  getImage: (src: string) => Promise<HTMLImageElement>
  /** 화면 언어 — 안내 문구(message) */
  lang: BoothLang
}) {
  const [status, setStatus] = useState<IdolStatus>('off')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [note, setNote] = useState<IdolNote | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [tries, setTries] = useState(0)
  /** 네트워크 오류로 한 번 더 보내는 중 */
  const [retrying, setRetrying] = useState(false)
  const runRef = useRef(0)
  const startedFor = useRef<string | null>(null)

  const run = useCallback(async () => {
    if (!shot) return
    const token = ++runRef.current
    const concept = findIdolConcept(conceptId)
    setImage(null)
    setNote(null)
    setElapsed(0)
    if (!concept || !ticket) {
      setStatus('failed')
      setNote({ kind: !ticket ? 'noTicket' : 'noConcept' })
      return
    }
    try {
      setStatus('checking')
      const original = await getImage(shot)
      const people = await countFaces(original)
      if (token !== runRef.current) return
      if (people === 0 || people > IDOL_MAX_PEOPLE) {
        setStatus('skipped')
        setNote(people === 0 ? { kind: 'noFace' } : { kind: 'tooMany', people })
        return
      }
      const input = await idolInputs(original)
      if (token !== runRef.current) return
      setStatus('generating')
      setTries((n) => n + 1)
      // 얼굴 인식을 못 쓰는 기기(-1)면 1명으로 보고 만든다
      const body = JSON.stringify({ ticket, concept: concept.id, people: Math.max(1, people), photo: input.photo, faces: input.faces })
      const send = () => fetch('/api/photobooth/idol', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      let res: Response
      try {
        res = await send()
      } catch {
        // 네트워크가 잠깐 끊긴 것(서버 응답 없음)만 한 번 더 — 서버가 실패로 답한 것(5xx 등)은 다시 보내지 않는다
        if (token !== runRef.current) return
        setRetrying(true)
        await new Promise((r) => setTimeout(r, 1500))
        if (token !== runRef.current) return
        res = await send()
      } finally {
        setRetrying(false)
      }
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
      setNote({ kind: 'failed', detail: error instanceof Error ? error.message : null })
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
    message: note ? idolNoteText(boothText(lang), lang, note) : '',
    elapsed,
    busy,
    retrying,
    canRetry: !busy && status !== 'skipped' && tries < MAX_TRIES && !!ticket,
    retriesLeft: Math.max(0, MAX_TRIES - tries),
    retry: () => { void run() },
  }
}

// ───────────────────────── 편집 화면 안내 ─────────────────────────

// 만드는 중 안내(5초마다 다음 줄)는 사전 idolWait

export function IdolStagePanel({ stage, conceptId, variant, lang }: {
  stage: ReturnType<typeof useIdolStage>
  conceptId: string
  variant: 'retro' | 'classic'
  lang: BoothLang
}) {
  const retro = variant === 'retro'
  const t = boothText(lang)
  const concept = findIdolConcept(conceptId)
  const line = t.idolWait[Math.min(t.idolWait.length - 1, Math.floor(stage.elapsed / 5))]
  const text = retro ? 'bth-group-text' : 'text-sm leading-snug opacity-80'
  const button = retro ? 'rt-btn rt-btn--block' : 'rounded-full border px-5 py-3 text-base font-bold transition-opacity hover:opacity-80 disabled:opacity-40'
  return (
    <div className={retro ? 'bth-idol-panel' : 'flex flex-col gap-2'} role="status" aria-live="polite">
      {concept && <p className={retro ? 'bth-idol-concept' : 'text-lg font-bold'}>{conceptText(t, concept).name}</p>}
      {stage.busy && (
        <>
          <p className={retro ? 'bth-idol-wait' : 'text-base font-bold'}>
            {stage.status === 'checking' ? t.idolChecking : line}
          </p>
          <div className={retro ? 'bth-idol-bar' : 'h-2 w-full overflow-hidden rounded-full bg-current/15'} aria-hidden="true">
            <span className={retro ? undefined : 'block h-full rounded-full bg-current transition-[width] duration-500'}
              style={{ width: `${Math.min(95, 8 + stage.elapsed * 3.2)}%` }} />
          </div>
          <p className={text}>{stage.retrying ? t.idolNetworkRetry : t.idolMaking(stage.elapsed)}</p>
        </>
      )}
      {stage.status === 'done' && (
        <p className={text}>{t.idolDone}</p>
      )}
      {(stage.status === 'failed' || stage.status === 'skipped') && <p className={text}>{stage.message}</p>}
      {stage.canRetry && (stage.status === 'done' || stage.status === 'failed') && (
        <>
          <button type="button" className={button} onClick={stage.retry}>
            {stage.status === 'done' ? t.idolRetryDone : t.idolRetryFailed} ({stage.retriesLeft})
          </button>
          {/* 처음 쓰는 손님이 '다시 찍기'와 헷갈리지 않게 */}
          <p className={text}>{t.retryHint}</p>
        </>
      )}
    </div>
  )
}

// ───────────────────────── 인화 디자인 고르기 ─────────────────────────

const THUMB = 0.2

/** 컨셉별 인화 디자인 4종 — 손님 사진으로 그린 작은 미리보기(인화와 같은 그리기 함수) */
export function IdolDesignPicker({ conceptId, value, onChange, main, before, event, variant, lang }: {
  conceptId: string
  value: string | null
  onChange: (id: string) => void
  /** 큰 사진(AI 사진, 아직 없으면 찍은 원본) */
  main: Picture | null
  before: Picture | null
  event: string
  variant: 'retro' | 'classic'
  /** 화면 언어 — 디자인 이름만(미리보기 그림은 인화물과 같이 한국어·영어) */
  lang: BoothLang
}) {
  const retro = variant === 'retro'
  const t = boothText(lang)
  const concept = findIdolConcept(conceptId)
  const designs = useMemo(() => (concept ? idolDesigns(concept) : []), [concept])
  // AI 사진이 없으면(before 없음) 비포·애프터는 못 고른다 — 골라 둔 상태면 첫 디자인이 선택된 것으로
  const usable = (d: (typeof designs)[number]) => !!before || !designNeedsAi(d)
  const picked = designs.find((d) => d.id === value)
  const selected = (picked && usable(picked) ? picked : designs[0])?.id
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
    <div className={retro ? 'bth-look-grid bth-look-grid--2' : 'grid grid-cols-2 gap-3'} role="radiogroup" aria-label={t.designAria}>
      {designs.map((design, i) => {
        const on = design.id === selected
        const off = !usable(design)
        return (
          <button
            key={design.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={off}
            disabled={off}
            title={off ? t.designNeedsAi : undefined}
            data-on={on ? 'true' : 'false'}
            onClick={() => onChange(design.id)}
            className={retro
              ? 'rt-choice bth-design-btn flex flex-col items-center gap-1 p-2'
              : `bth-design-btn flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-colors ${on ? 'border-current ring-2 ring-current' : 'border-[color:color-mix(in_srgb,currentColor_22%,transparent)]'}`}
          >
            <canvas
              ref={(node) => { canvases.current[i] = node }}
              width={1200 * THUMB}
              height={1800 * THUMB}
              className="block aspect-[2/3] w-full rounded-md bg-black/10"
            />
            <b className="bth-design-name leading-tight">{designName(t, design)}</b>
            {off && <em className="text-xs not-italic leading-tight opacity-70">{t.designNeedsAi}</em>}
          </button>
        )
      })}
    </div>
  )
}
