// 키오스크 캐리커처 생성(서버 전용) — 손님이 찍은 한 컷 + 스타일·과장 정도 → 같은 사람의 손그림 캐리커처.
// 키는 전용 OPENROUTER_KIOSK_IMAGE_API_KEY 가 있으면 그것을, 없으면 키오스크 분석이 쓰는 OPENROUTER_API_KEY 를 쓴다.
// 모델은 OPENROUTER_CARICATURE_MODEL 로 바꿀 수 있다(기본: 빠르고 싼 Gemini 2.5 Flash Image, 장당 약 $0.04).
// 손님 사진은 생성에만 쓰고 저장하지 않는다 — 요청·응답을 기록하지 않는다.

import sharp from 'sharp'
import { OPENROUTER_IMAGE_MODEL } from '@/lib/gemini/client'

export const CARICATURE_STYLES = ['line', 'water', 'comic'] as const
export type CaricatureStyle = (typeof CARICATURE_STYLES)[number]
export const CARICATURE_LEVELS = ['soft', 'fun'] as const
export type CaricatureLevel = (typeof CARICATURE_LEVELS)[number]

const DEFAULT_MODEL = 'google/gemini-2.5-flash-image'

function apiKey() {
  return process.env.OPENROUTER_KIOSK_IMAGE_API_KEY || process.env.OPENROUTER_API_KEY || ''
}

export function caricatureConfigured() {
  return !!apiKey()
}

export class CaricatureError extends Error {
  constructor(message: string, public status = 500) { super(message) }
}

const STYLE_PROMPT: Record<CaricatureStyle, string> = {
  line: 'STYLE — LINE ART: confident black ink pen lines on paper, light cross-hatching for shadow, almost no color (at most a faint warm gray wash). It should look like a quick, skilled street-artist pen sketch.',
  water: 'STYLE — WATERCOLOR: loose pencil outlines with soft translucent watercolor washes in gentle pastel tones, visible paper grain, a few color blooms bleeding past the lines.',
  comic: 'STYLE — COMIC: lively cartoon illustration with bold dark outlines, flat warm colors and simple cel shading, a few red crayon accent strokes around the figure.',
}

const LEVEL_PROMPT: Record<CaricatureLevel, string> = {
  soft: 'EXAGGERATION — SUBTLE: keep proportions close to the photo. Only a slightly larger head and eyes (about 10%), so it reads as a warm portrait sketch more than a caricature.',
  fun: 'EXAGGERATION — PLAYFUL: a clearly bigger head on a smaller body (head about 1.5× the natural proportion), a wider smile and brighter eyes, and the most charming distinctive features (hairstyle, glasses, dimples, accessories) emphasized.',
}

export function buildCaricaturePrompt(style: CaricatureStyle, level: CaricatureLevel): string {
  return [
    'Redraw the person (or people) in this photo as a hand-drawn caricature portrait.',
    'LIKENESS: each person must stay clearly recognizable — keep their face shape, hairstyle (same parting, fringe and length — do not add bangs or restyle the hair) and hair color, glasses and accessories, expression, and clothing colors from the photo. Draw exactly the people in the photo; do not add or remove anyone.',
    STYLE_PROMPT[style],
    LEVEL_PROMPT[level],
    'TONE: kind and flattering, the way a friendly artist would draw a guest. Never mocking. Do not exaggerate skin tone, ethnicity-related features, body weight, age, blemishes or anything that could feel insulting.',
    'COMPOSITION: vertical 3:4 bust portrait, head and shoulders centered with some space around, on a clean off-white paper background. No photo background, no frame, no border.',
    'Do not write any text, letters, signature, logo or watermark anywhere in the image.',
  ].join('\n')
}

/** 기기 한 대가 몰아 누르는 일 막기 — 서버 인스턴스 안에서 1분에 이만큼, 하루에 이만큼(과금 폭주 방지) */
const PER_MINUTE = 6
const PER_DAY = Number(process.env.KIOSK_CARICATURE_DAILY_LIMIT) || 300
let minuteStart = 0
let minuteCount = 0
let dayStart = 0
let dayCount = 0

interface Completion {
  choices?: { message?: { content?: string | null; images?: { image_url?: { url?: string } }[] } }[]
  error?: { message?: string }
}

/** 이미지 한 장 요청 — 실패·시간 초과면 null(기록만 남기고 다음 시도로) */
async function requestImage(model: string, timeout: number, prompt: string, photo: string): Promise<string | null> {
  const started = Date.now()
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', 'X-Title': "AC'SCENT kiosk caricature" },
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        image_config: { aspect_ratio: '3:4' },
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: photo } }] }],
      }),
      signal: AbortSignal.timeout(timeout),
    })
    const raw = await res.text()
    if (!res.ok) {
      console.error('[caricature] 생성 호출 실패', model, res.status, raw.slice(0, 300))
      return null
    }
    const data = JSON.parse(raw) as Completion
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
    if (data.error || !url?.startsWith('data:image/')) {
      console.error('[caricature] 이미지 없음', model, data.error?.message ?? data.choices?.[0]?.message?.content?.slice(0, 200))
      return null
    }
    return url
  } catch (error) {
    console.error('[caricature] 생성 중단', model, `${Math.round((Date.now() - started) / 1000)}s`, error instanceof Error ? error.message : error)
    return null
  }
}

/** 캐리커처 한 장(JPEG data: 주소). 사진은 data:image/jpeg|png|webp, 약 1.5MB 이하 */
export async function generateCaricature(photo: string, style: CaricatureStyle, level: CaricatureLevel): Promise<string> {
  if (!caricatureConfigured()) throw new CaricatureError('그림 그리기 설정이 아직 없어요.', 503)
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo) || photo.length > 2_000_000) throw new CaricatureError('사진 형식이 올바르지 않아요.', 400)

  const now = Date.now()
  if (now - minuteStart > 60_000) { minuteStart = now; minuteCount = 0 }
  if (now - dayStart > 86_400_000) { dayStart = now; dayCount = 0 }
  if (minuteCount >= PER_MINUTE || dayCount >= PER_DAY) throw new CaricatureError('잠시 후 다시 시도해 주세요.', 429)
  minuteCount++
  dayCount++

  // 첫 시도가 늦거나 실패하면 더 나은(느리고 비싼) 모델로 한 번 더 — 손님이 빈손으로 돌아가지 않게
  const primary = process.env.OPENROUTER_CARICATURE_MODEL || DEFAULT_MODEL
  const attempts: [string, number][] = [[primary, 45_000], [primary === OPENROUTER_IMAGE_MODEL ? DEFAULT_MODEL : OPENROUTER_IMAGE_MODEL, 60_000]]
  const prompt = buildCaricaturePrompt(style, level)
  let url: string | null = null
  for (const [model, timeout] of attempts) {
    url = await requestImage(model, timeout, prompt, photo)
    if (url) break
  }
  if (!url) throw new CaricatureError('그림을 완성하지 못했어요.', 502)
  // 화면·휴대폰 전송에 맞게 JPEG 로 — 긴 변 1400 이하
  const jpeg = await sharp(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer()
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}
