// K-POP 아이돌 컨셉 사진 생성(서버 전용) — 부스에서 찍은 한 컷 + 컨셉 → 같은 얼굴의 아이돌 컨셉 사진.
// 전용 키 OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY(이태원 K-WAVE 행사용, 옛 이름 OPENROUTER_PHOTOBOOTH_API_KEY 도 읽음)만 쓴다
// — 사이트 분석 메인 키·화면 배경 키와 비용을 섞지 않는다.
// 모델은 OPENROUTER_PHOTOBOOTH_MODEL 로 바꿀 수 있다(기본: 얼굴 유지가 가장 나은 Gemini 이미지 모델).
// 손님 사진은 생성에만 쓰고 저장하지 않는다 — 사진은 기록하지 않고, 모델·컨셉·인원·걸린 시간과 실패 이유만 로그에 남긴다.

import { createHmac, timingSafeEqual } from 'crypto'
import sharp from 'sharp'
import { OPENROUTER_IMAGE_MODEL } from '@/lib/gemini/client'
import { buildIdolPrompt, idolFaceLabel, type IdolConcept } from './idol-concepts'

function apiKey() {
  return process.env.OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY || process.env.OPENROUTER_PHOTOBOOTH_API_KEY || ''
}

export function idolConfigured() {
  return !!apiKey()
}

export class IdolError extends Error {
  constructor(message: string, public status = 500) { super(message) }
}

// ───────────────────────── 생성 이용권(ticket) ─────────────────────────
// 이용권 번호가 확인된 부스만 생성할 수 있게, /api/photobooth/pass 가 짧게 쓰는 서명 표를 준다.
// 표 하나로 IDOL_TICKET_USES 번까지 — 서버 인스턴스 안에서 센다(여럿이면 조금 느슨).
// '다시 만들기'는 없앴다(2026-10-02, 비용) — 2번 = 첫 생성 + 네트워크 재시도나 '다시 찍기' 한 번. 넘으면 찍은 사진 그대로 인화

const TICKET_MS = 15 * 60 * 1000
export const IDOL_TICKET_USES = 2

function secret() {
  const value = process.env.SCREEN_BACKGROUND_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new IdolError('서버 설정이 없습니다.', 500)
  return value
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(`booth-idol:${payload}`).digest('hex')
}

/** pass: 사용 처리한 이용권 id(마스터 번호는 'master') */
export function issueIdolTicket(pass: string, now = Date.now()) {
  const payload = `${now + TICKET_MS}.${pass}.${Math.random().toString(36).slice(2, 10)}`
  return `${payload}.${sign(payload)}`
}

const uses = new Map<string, number>()

/** 표가 서명·기한이 맞으면 표의 주인(사용 처리한 이용권 id, 'free', 'demo' 등)을 돌려준다 — 횟수는 쓰지 않는다 */
export function readIdolTicket(ticket: unknown): { payload: string; pass: string } {
  if (typeof ticket !== 'string' || ticket.length > 300) throw new IdolError('이용권을 먼저 확인해 주세요.', 401)
  const cut = ticket.lastIndexOf('.')
  const payload = ticket.slice(0, cut), signed = ticket.slice(cut + 1)
  const expected = sign(payload)
  const ok = signed.length === expected.length && timingSafeEqual(Buffer.from(signed), Buffer.from(expected))
  const expires = Number(payload.split('.')[0])
  if (!ok || !Number.isFinite(expires)) throw new IdolError('이용권을 먼저 확인해 주세요.', 401)
  if (expires < Date.now()) throw new IdolError('시간이 지났어요. 처음부터 다시 해 주세요.', 401)
  return { payload, pass: payload.split('.')[1] ?? '' }
}

/** 표가 맞고 기한·횟수가 남았으면 1회 쓰고 표의 주인을 돌려준다 */
export function spendIdolTicket(ticket: unknown): string {
  const { payload, pass } = readIdolTicket(ticket)
  const used = uses.get(payload) ?? 0
  if (used >= IDOL_TICKET_USES) throw new IdolError('이번 이용권으로 만들 수 있는 횟수를 다 썼어요.', 429)
  uses.set(payload, used + 1)
  if (uses.size > 2000) for (const key of [...uses.keys()].slice(0, 1000)) uses.delete(key)
  return pass
}

// ───────────────────────── 생성 ─────────────────────────

/** 부스 한 대가 몰아 누르는 일 막기 — 인스턴스 안에서 1분에 이만큼 */
const PER_MINUTE = 20
let windowStart = 0
let windowCount = 0

interface Completion {
  id?: string
  provider?: string
  choices?: {
    finish_reason?: string | null
    native_finish_reason?: string | null
    error?: { message?: string }
    message?: { content?: string | null; refusal?: string | null; images?: { image_url?: { url?: string } }[] }
  }[]
  error?: { message?: string }
}

/** 첫 모델이 늦거나 실패할 때 다시 시도하는 더 빠른 이미지 모델 */
const FALLBACK_MODEL = 'google/gemini-2.5-flash-image'

/** 생성 모양 — 기본은 인화 원판(4×6 세로 2:3)에 맞춘 2K. 2×6 사진 네 컷(ANSAN 타임캡슐)은 가로 3:2 칸이 작아 1K 로 빨리 */
export interface BoothImageOptions {
  aspectRatio?: '2:3' | '3:2'
  imageSize?: '1K' | '2K'
  /** 첫 모델 · 예비 모델 기다리는 시간(ms) — 앞에 다른 호출이 있는 경로가 함수 시간(maxDuration) 안에 끝나게 */
  timeouts?: [number, number]
  /** 단체 사진은 여러 사람의 얼굴 유지를 위해 같은 모델로 재시도한다. 기본은 빠른 예비 모델. */
  retryModel?: 'fast' | 'primary'
  /** 이 호출만 다른 키로(LATER! 일반판 — timecapsule-server.ts stripKey). 없으면 부스 전용 키 */
  key?: string
}

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

/**
 * 이미지 한 장 요청 — 실패·시간 초과면 null(기록만 남기고 다음 시도로)
 * content: 프롬프트 + 본 사진 + 추가 사진(아이돌 단체사진은 얼굴마다 이름표를 붙인다)
 * label: 기록에 남길 요청 요약(컨셉·인원 — 사진은 남기지 않는다)
 */
async function requestImage(model: string, timeout: number, content: Part[], label: string, options: BoothImageOptions = {}): Promise<string | null> {
  const started = Date.now()
  const took = () => `${Math.round((Date.now() - started) / 1000)}s`
  const aspect = options.aspectRatio ?? '2:3'
  const imageSize = options.imageSize ?? '2K'
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.key || apiKey()}`,
        'Content-Type': 'application/json',
        'X-Title': "AC'SCENT photobooth",
      },
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        // 기본 크기는 848x1264 라 인화 원판(1200x1800)보다 작아 늘려 찍으면 흐렸다 — Gemini 3 Pro Image 는 2K(1696x2528)를
        // 같은 값에 준다(2026-10-02 시험: 장당 약 $0.137 동일, +5초). 예비 모델(2.5 Flash)은 이 값을 모르니 기본 크기로
        image_config: model.includes('gemini-3') && imageSize === '2K' ? { aspect_ratio: aspect, image_size: '2K' } : { aspect_ratio: aspect },
        messages: [{ role: 'user', content }],
      }),
      signal: AbortSignal.timeout(timeout),
    })
    const raw = await res.text()
    if (!res.ok) {
      console.error('[idol] 생성 호출 실패', model, label, took(), res.status, raw.slice(0, 300))
      return null
    }
    const data = JSON.parse(raw) as Completion
    const choice = data.choices?.[0]
    const url = choice?.message?.images?.[0]?.image_url?.url
    if (data.error || !url?.startsWith('data:image/')) {
      // 오류도 글도 없이 이미지만 빠져 오는 일이 있다(2026-10-03 현장, 같은 손님은 다시 찍어도 같았다) — 끝난 이유를 남겨 원인을 가린다
      console.error('[idol] 이미지 없음', model, label, took(), JSON.stringify({
        finish: choice?.finish_reason,
        native: choice?.native_finish_reason,
        error: data.error?.message ?? choice?.error?.message,
        text: (choice?.message?.refusal ?? choice?.message?.content)?.slice(0, 200),
        choices: data.choices?.length ?? 0,
        provider: data.provider,
        id: data.id,
      }))
      return null
    }
    console.log('[idol] 생성', model, label, took())
    return url
  } catch (error) {
    console.error('[idol] 생성 중단', model, label, took(), error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * 사진을 보고 글(JSON)로 답을 받는다 — 같은 부스 전용 키(사이트 분석 메인 키와 비용을 섞지 않는다).
 * ANSAN 타임캡슐이 생성 전에 사람 수·나이·얼굴 자리를 읽는 데 쓴다. 실패·시간 초과면 null
 */
export async function askBoothVision(model: string, timeout: number, prompt: string, images: string[], key?: string): Promise<string | null> {
  if (!key && !idolConfigured()) return null
  const started = Date.now()
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key || apiKey()}`, 'Content-Type': 'application/json', 'X-Title': "AC'SCENT photobooth" },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))] }],
      }),
      signal: AbortSignal.timeout(timeout),
    })
    const raw = await res.text()
    if (!res.ok) {
      console.error('[booth-vision] 호출 실패', model, res.status, raw.slice(0, 300))
      return null
    }
    const data = JSON.parse(raw) as Completion
    const text = data.choices?.[0]?.message?.content
    return typeof text === 'string' && text.trim() ? text : null
  } catch (error) {
    console.error('[booth-vision] 중단', model, `${Math.round((Date.now() - started) / 1000)}s`, error instanceof Error ? error.message : error)
    return null
  }
}

export async function generateIdolPhoto(photo: string, concept: IdolConcept, people: number, faces: string[] = []): Promise<string> {
  const isImage = (value: string, max: number) => /^data:image\/(jpeg|png|webp);base64,/.test(value) && value.length <= max
  // 얼굴 참고 사진(부스가 자른 클로즈업) — 사람 수까지만, 형식이 틀리면 빼고 본 사진만으로
  const valid = faces.filter((face) => isImage(face, 600_000)).slice(0, people)
  // 여럿이면 사람마다 한 장씩 다 있을 때만 쓴다 — 한 장이 빠지면 이름표(왼쪽·가운데·오른쪽)가 밀려 얼굴이 뒤바뀐다
  const many = people > 1
  const refs = many && valid.length !== people ? [] : valid

  // 본 사진(IMAGE 1) 다음에 얼굴 클로즈업을 왼쪽 사람부터 — 여럿이면 클로즈업마다 누구 얼굴인지 이름표를 붙인다
  const content: Part[] = [
    { type: 'text', text: buildIdolPrompt(concept, people, refs.length) },
    { type: 'image_url', image_url: { url: photo } },
    ...refs.flatMap((url, index): Part[] => [
      ...(many ? [{ type: 'text' as const, text: idolFaceLabel(index, people) }] : []),
      { type: 'image_url', image_url: { url } },
    ]),
  ]
  // 여럿이면 예비 모델로 넘기지 않고 같은 모델로 한 번 더 — 작은 모델은 여러 사람 얼굴을 한꺼번에 지키기 어렵다
  // (60+50초 — 라우트 maxDuration 120초 안)
  const options: BoothImageOptions = many ? { retryModel: 'primary', timeouts: [60_000, 50_000] } : {}
  return generateImage(content, `${concept.id} ${people}명 얼굴${refs.length}`, options)
}

/**
 * 부스 이미지 생성 공통(AI 아이돌·포토부스 프로그램 14종) — 프롬프트 + 본 사진(+ 다른 사진들) → 2:3 JPEG data URL.
 * 같은 전용 키·같은 1분 상한·같은 모델 순서(60초 → 예비 모델 45초)를 쓴다.
 */
export async function generateBoothImage(prompt: string, photo: string, more: string[] = [], options: BoothImageOptions = {}): Promise<string> {
  const content: Part[] = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: photo } },
    ...more.map((url): Part => ({ type: 'image_url', image_url: { url } })),
  ]
  return generateImage(content, 'photobooth', options)
}

/** 검증·횟수 제한·모델 재시도·JPEG 변환을 두 생성 경로가 함께 쓴다. */
async function generateImage(content: Part[], label: string, options: BoothImageOptions = {}): Promise<string> {
  if (!options.key && !idolConfigured()) throw new IdolError('AI 사진 전용 키가 아직 설정되지 않았어요.', 503)
  const isImage = (value: string) => /^data:image\/(jpeg|png|webp);base64,/.test(value) && value.length <= 3_000_000
  if (content.some((part) => part.type === 'image_url' && !isImage(part.image_url.url))) {
    throw new IdolError('사진 형식이 올바르지 않아요.', 400)
  }

  const now = Date.now()
  if (now - windowStart > 60_000) { windowStart = now; windowCount = 0 }
  if (++windowCount > PER_MINUTE) throw new IdolError('잠시 후 다시 시도해 주세요.', 429)

  // 가끔 이미지 모델이 한참 멈춘다(운영에서 110초 넘게 걸린 적) — 손님이 오래 서 있지 않게 첫 시도는 짧게 끊고,
  // 한 번 더 시도한다. 둘 다 안 되면 호출한 화면에서 실패를 처리한다.
  const primary = process.env.OPENROUTER_PHOTOBOOTH_MODEL || OPENROUTER_IMAGE_MODEL
  // 2K 출력은 보통 25~35초(2026-10-02) — 첫 시도는 60초까지 기다린다
  const [firstWait, fallbackWait] = options.timeouts ?? [60_000, 45_000]
  const attempts: [string, number][] = [[primary, firstWait], [options.retryModel === 'primary' ? primary : FALLBACK_MODEL, fallbackWait]]
  let url: string | null = null
  for (const [model, timeout] of attempts) {
    url = await requestImage(model, timeout, content, label, options)
    if (url) break
  }
  if (!url) throw new IdolError('AI 사진을 만들지 못했어요.', 502)
  // 응답 크기(4.5MB 제한)와 부스 전송을 줄이려 JPEG 로 — 긴 변 1800 이하
  const jpeg = await sharp(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))
    .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer()
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}
