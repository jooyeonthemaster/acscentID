'use client'

// 포토부스 행사 모드(K-WAVE) — AI 아이돌 컨셉 사진 화면 부품.
// - IdolConceptPicker: 첫 화면 컨셉 고르기(음방 엔딩요정·앨범 재킷·무대 직캠·뮤비 스틸)
// - useIdolStage: 찍은 한 컷 → 얼굴 수 확인 → /api/photobooth/idol 생성 → 결과 그림(다시 만들기 포함)
// - IdolStagePanel: 편집 화면 옆 — 만드는 중(경과 초) / 완성(다시 만들기) / 못 만듦(메이크업 사진으로 대신)
// 개념·프롬프트는 src/lib/booth/idol-concepts.ts, 서버는 src/lib/booth/idol-generate.ts

import { useCallback, useEffect, useRef, useState } from 'react'
import { IDOL_CONCEPTS, IDOL_MAX_PEOPLE, findIdolConcept } from '@/lib/booth/idol-concepts'
import { findStageLook } from '@/lib/booth/stage-makeup'
import { countFaces } from '@/lib/booth/face-makeup'

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

/** 원본 사진 → 긴 변 1280 JPEG(업로드 4.5MB 제한 안쪽, 얼굴은 충분히 또렷) */
function toJpeg(img: HTMLImageElement) {
  const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k)
  c.height = Math.round(img.naturalHeight * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.9)
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
      setMessage(!ticket ? '이용권 확인 정보가 없어 메이크업 사진으로 만들었어요.' : '컨셉을 찾지 못했어요.')
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
          ? '얼굴을 찾지 못해 메이크업 사진으로 만들었어요. 카메라 가까이 서면 AI 사진을 만들 수 있어요.'
          : `AI 사진은 ${IDOL_MAX_PEOPLE}명까지예요. ${people}명이라 메이크업 사진으로 만들었어요.`)
        return
      }
      setStatus('generating')
      setTries((n) => n + 1)
      const res = await fetch('/api/photobooth/idol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 얼굴 인식을 못 쓰는 기기(-1)면 1명으로 보고 만든다
        body: JSON.stringify({ ticket, concept: concept.id, people: Math.max(1, people), photo: toJpeg(original) }),
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
      setMessage(`${error instanceof Error ? error.message : 'AI 사진을 만들지 못했어요.'} 메이크업 사진으로 대신했어요.`)
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
        <p className={text}>BEFORE(실물)와 ON STAGE(AI) 두 장이 함께 인화돼요 · Printed as BEFORE / ON STAGE</p>
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
