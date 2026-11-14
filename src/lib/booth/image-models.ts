// 부스 AI 사진 모델 표 · 프로그램별 첫 모델 · OpenRouter images API 요청(서버 전용).
// 2026-11-14 모델 비교 시험(펀그라운드 별내 PJ-2612-09, 지금 부스 지시문 × 36 입력 × 3 모델 — 메모: seedream-booth-test-2026-11):
//   - Seedream 5.0 Flash: 장당 약 $0.018 · 평균 15초 · 1366×2048 · 실패 0/36 · 사진형(옷 · 배경만 바꿈) 얼굴 유사도 0.87(Gemini 0.69)
//   - 나이 들기(타임캡슐 · ANSAN) · 캐리커처 · 수채는 약해서 Gemini 를 그대로 쓴다
// 그래서 지금은 펀그라운드 데모(주소 site=funground)의 옷 · 배경만 바꾸는 6종에만 Seedream 을 먼저 쓴다. 매장 · 행사 · 다른 데모는 그대로
// (src/lib/booth/idol-generate.ts — Gemini 3 Pro Image → 2.5 Flash Image). 아이 얼굴(0~17세) 시험 전에는 운영 기본을 바꾸지 않는다.
//
// 키: 펀그라운드 전용 OPENROUTER_FUNGROUND_API_KEY 만 쓴다(사용자가 정한 키 — ~/.claude/CLAUDE.md 키 규칙). 없으면 503.
// 손님 사진은 생성에만 쓰고 저장 · 기록하지 않는다 — 로그에는 모델 · 프로그램 · 인원 · 걸린 시간 · usage.cost 만 남긴다.

import sharp from 'sharp'
import type { ProgramId } from './programs/catalog'
import { IdolError } from './idol-generate'

export type ImageApi = 'images' | 'chat'

export interface ImageModel {
  /** OpenRouter 모델 id */
  id: string
  /** images: POST /api/v1/images(+ input_references) · chat: POST /api/v1/chat/completions(modalities image) */
  api: ImageApi
  /** 2026-11-14 시험의 장당 비용(USD, 참고) */
  usdPerImage: number
}

export const IMAGE_MODELS = {
  'seedream-5-flash': { id: 'bytedance-seed/seedream-5-0-flash', api: 'images', usdPerImage: 0.018 },
  'gemini-3-pro-image': { id: 'google/gemini-3-pro-image-preview', api: 'chat', usdPerImage: 0.139 },
  // 2026-11-14 가상 어린이 5건 비교(타임캡슐 지시문): 얼굴 유사도 0.61~0.81(Gemini 3 Pro 0.55~0.75) · 나이 반영도 더 크다 · 1024×1536 · 23~41초
  'gpt-image-2.6-sunburst': { id: 'openai/gpt-image-2.6-sunburst', api: 'images', usdPerImage: 0.045 },
  'gemini-2.5-flash-image': { id: 'google/gemini-2.5-flash-image', api: 'chat', usdPerImage: 0.039 },
} as const satisfies Record<string, ImageModel>
export type ImageModelKey = keyof typeof IMAGE_MODELS

/** 첫 모델이 실패 · 시간 초과면 넘기는 예비 모델 — 부스 공통 예비 모델(idol-generate.ts FALLBACK_MODEL)과 같다 */
export const FALLBACK_IMAGE_MODEL: ImageModelKey = 'gemini-2.5-flash-image'

/**
 * 펀그라운드 데모의 프로그램별 첫 모델 — 여기 있는 프로그램만 펀그라운드 생성(이 파일)으로 간다.
 * 옷 · 배경만 바꾸는 사진형 6종(A안 AI 포토). 나이 들기 · 캐리커처는 넣지 않는다(시험에서 약했다)
 */
export const FUNGROUND_PRIMARY: Partial<Record<ProgramId, ImageModelKey>> = {
  // A안 LATER! 타임캡슐 — 2026-11-14 사용자 결정: Gemini 3 Pro Image($0.138) → GPT Image 2.6 Sunburst(약 $0.045).
  // 같은 날 가상 어린이 비교에서 얼굴 유사도 · 나이 반영 모두 Gemini 3 Pro 보다 나았다. Seedream 은 나이를 거의 안 바꾸고 남매 중 한 명을 뺐다
  timecapsule: 'gpt-image-2.6-sunburst',
  // 아래는 데모 목록에서 뺀 프로그램(주소로만 열린다)
  'idol-makeup': 'seedream-5-flash',
  'fashion-time': 'seedream-5-flash',
  graduation: 'seedream-5-flash',
  'fan-card': 'seedream-5-flash',
  quest: 'seedream-5-flash',
  mvp: 'seedream-5-flash',
}

const fungroundKey = () => process.env.OPENROUTER_FUNGROUND_API_KEY || ''
export const fungroundImageConfigured = () => Boolean(fungroundKey())

interface ImageReply {
  /** data:image/… URL */
  url: string | null
  /** OpenRouter usage.cost(USD) — 응답에 없으면 null */
  cost: number | null
  error?: string
}

const isDataImage = (value: string) => /^data:image\/(jpeg|png|webp);base64,/.test(value)

/** OpenRouter images API — Seedream 등. 받은 그림이 주소면 내려받아 data URL 로 */
async function requestImagesApi(model: string, prompt: string, refs: string[], aspect: string, timeout: number): Promise<ImageReply> {
  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fungroundKey()}`, 'Content-Type': 'application/json', 'X-Title': "AC'SCENT photobooth funground" },
    body: JSON.stringify({ model, prompt, aspect_ratio: aspect, input_references: refs.map((url) => ({ type: 'image_url', image_url: { url } })) }),
    signal: AbortSignal.timeout(timeout),
  })
  const raw = await res.text()
  let data: { data?: { b64_json?: string; url?: string }[]; usage?: { cost?: number }; error?: { message?: string } }
  try { data = JSON.parse(raw) } catch { return { url: null, cost: null, error: `HTTP ${res.status} ${raw.slice(0, 200)}` } }
  const cost = typeof data.usage?.cost === 'number' ? data.usage.cost : null
  const item = data.data?.[0]
  if (!res.ok || data.error || !item) return { url: null, cost, error: `HTTP ${res.status} ${data.error?.message ?? raw.slice(0, 200)}` }
  if (item.b64_json) return { url: `data:image/png;base64,${item.b64_json}`, cost }
  const href = item.url ?? ''
  if (isDataImage(href)) return { url: href, cost }
  if (!/^https:\/\//.test(href)) return { url: null, cost, error: 'no image in reply' }
  const img = await fetch(href, { signal: AbortSignal.timeout(30_000) })
  if (!img.ok) return { url: null, cost, error: `download ${img.status}` }
  const type = img.headers.get('content-type')?.split(';')[0] || 'image/png'
  return { url: `data:${type};base64,${Buffer.from(await img.arrayBuffer()).toString('base64')}`, cost }
}

/** OpenRouter chat completions(이미지 출력) — Gemini 이미지 모델. 부스 공통 요청(idol-generate.ts requestImage)과 같은 모양 */
async function requestChatImage(model: string, prompt: string, refs: string[], aspect: string, timeout: number): Promise<ImageReply> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fungroundKey()}`, 'Content-Type': 'application/json', 'X-Title': "AC'SCENT photobooth funground" },
    body: JSON.stringify({
      model,
      modalities: ['image', 'text'],
      // Gemini 3 Pro Image 는 2K(1696×2528)를 같은 값에 준다 — 인화 원판(1200×1800)보다 크게(idol-generate.ts 와 같은 규칙)
      image_config: model.includes('gemini-3') ? { aspect_ratio: aspect, image_size: '2K' } : { aspect_ratio: aspect },
      usage: { include: true },
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...refs.map((url) => ({ type: 'image_url', image_url: { url } }))] }],
    }),
    signal: AbortSignal.timeout(timeout),
  })
  const raw = await res.text()
  let data: { choices?: { finish_reason?: string; message?: { images?: { image_url?: { url?: string } }[] } }[]; usage?: { cost?: number }; error?: { message?: string } }
  try { data = JSON.parse(raw) } catch { return { url: null, cost: null, error: `HTTP ${res.status} ${raw.slice(0, 200)}` } }
  const cost = typeof data.usage?.cost === 'number' ? data.usage.cost : null
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!res.ok || data.error || !url || !isDataImage(url)) {
    return { url: null, cost, error: `HTTP ${res.status} ${data.error?.message ?? `finish=${data.choices?.[0]?.finish_reason ?? '-'}`}` }
  }
  return { url, cost }
}

export interface GeneratedImage {
  /** 인화 원판용 JPEG data URL(긴 변 1800 이하) */
  image: string
  model: string
  /** 이 사진에 든 비용 합(실패한 시도 포함, USD) — 응답에 없으면 null */
  cost: number | null
  seconds: number
}

/**
 * 펀그라운드 데모 AI 사진 한 장 — 프로그램의 첫 모델(Seedream) → 실패 · 시간 초과면 예비 모델(Gemini 2.5 Flash Image).
 * 첫 시도 60초 · 예비 45초(라우트 maxDuration 120초 안). 데모 상한(하루 · 1분)은 부르는 쪽(라우트)이 먼저 센다.
 */
export async function generateFungroundImage(programId: ProgramId, prompt: string, photos: string[], label: string): Promise<GeneratedImage> {
  if (!fungroundImageConfigured()) throw new IdolError('펀그라운드 데모용 AI 키가 아직 설정되지 않았어요.', 503)
  if (!photos.length || photos.some((p) => !isDataImage(p) || p.length > 3_000_000)) throw new IdolError('사진 형식이 올바르지 않아요.', 400)
  const primary = FUNGROUND_PRIMARY[programId] ?? FALLBACK_IMAGE_MODEL
  const attempts: [ImageModelKey, number][] = [[primary, 60_000], [FALLBACK_IMAGE_MODEL, 45_000]]
  const started = Date.now()
  let spent = 0
  let anyCost = false
  for (const [key, timeout] of attempts) {
    const model = IMAGE_MODELS[key]
    const t0 = Date.now()
    let reply: ImageReply
    try {
      reply = model.api === 'images'
        ? await requestImagesApi(model.id, prompt, photos, '2:3', timeout)
        : await requestChatImage(model.id, prompt, photos, '2:3', timeout)
    } catch (error) {
      reply = { url: null, cost: null, error: error instanceof Error ? error.message : String(error) }
    }
    if (reply.cost !== null) { spent += reply.cost; anyCost = true }
    const took = `${Math.round((Date.now() - t0) / 1000)}s`
    if (!reply.url) {
      console.error('[funground-image] 실패', model.id, label, took, `cost=${reply.cost ?? '-'}`, reply.error?.slice(0, 200))
      continue
    }
    // 응답 크기(4.5MB 제한)와 부스 전송을 줄이려 JPEG 로 — 긴 변 1800 이하(부스 공통과 같다)
    const jpeg = await sharp(Buffer.from(reply.url.slice(reply.url.indexOf(',') + 1), 'base64'))
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer()
    const seconds = Math.round((Date.now() - started) / 100) / 10
    const cost = anyCost ? Math.round(spent * 100000) / 100000 : null
    console.log('[funground-image] 생성', model.id, label, took, `cost=${cost ?? '-'}`)
    return { image: `data:image/jpeg;base64,${jpeg.toString('base64')}`, model: model.id, cost, seconds }
  }
  throw new IdolError('AI 사진을 만들지 못했어요.', 502)
}
