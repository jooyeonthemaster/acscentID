// 키오스크 체험 모드의 이미지 생성(서버 전용) — 캐리커처 · 헤어 스타일 · 명함 바탕이 같이 쓴다.
// 키는 전용 OPENROUTER_KIOSK_IMAGE_API_KEY 가 있으면 그것을, 없으면 키오스크 분석이 쓰는 OPENROUTER_API_KEY 를 쓴다.
// 모델은 OPENROUTER_KIOSK_IMAGE_MODEL(옛 이름 OPENROUTER_CARICATURE_MODEL)로 바꿀 수 있다
// (기본: 빠르고 싼 Gemini 2.5 Flash Image, 장당 약 $0.04·9초). 실패하면 OPENROUTER_IMAGE_MODEL 로 한 번 더.
// 손님 사진은 생성에만 쓰고 저장하지 않는다 — 요청·응답을 기록하지 않는다.

import sharp from 'sharp'
import { OPENROUTER_IMAGE_MODEL } from '@/lib/gemini/client'

const DEFAULT_MODEL = 'google/gemini-2.5-flash-image'

function apiKey() {
  return process.env.OPENROUTER_KIOSK_IMAGE_API_KEY || process.env.OPENROUTER_API_KEY || ''
}

export function kioskImageConfigured() {
  return !!apiKey()
}

export class KioskImageError extends Error {
  constructor(message: string, public status = 500) { super(message) }
}

/** data: 주소의 사진인가(약 1.5MB 이하) */
export const isKioskPhoto = (value: unknown): value is string => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value) && value.length <= 2_000_000

/** 기기 한 대가 몰아 누르는 일 막기 — 서버 인스턴스 안에서 1분에 이만큼, 하루에 이만큼(과금 폭주 방지). 세 기능이 함께 센다 */
const PER_MINUTE = 8
const PER_DAY = Number(process.env.KIOSK_IMAGE_DAILY_LIMIT || process.env.KIOSK_CARICATURE_DAILY_LIMIT) || 400
let minuteStart = 0
let minuteCount = 0
let dayStart = 0
let dayCount = 0

interface Completion {
  choices?: { message?: { content?: string | null; images?: { image_url?: { url?: string } }[] } }[]
  error?: { message?: string }
}

/** 이미지 한 장 요청 — 실패·시간 초과면 null(기록만 남기고 다음 시도로) */
async function requestImage(tag: string, model: string, timeout: number, prompt: string, photos: string[], aspect: string): Promise<string | null> {
  const started = Date.now()
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', 'X-Title': `AC'SCENT kiosk ${tag}` },
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        image_config: { aspect_ratio: aspect },
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...photos.map((url) => ({ type: 'image_url', image_url: { url } }))] }],
      }),
      signal: AbortSignal.timeout(timeout),
    })
    const raw = await res.text()
    if (!res.ok) {
      console.error(`[${tag}] 생성 호출 실패`, model, res.status, raw.slice(0, 300))
      return null
    }
    const data = JSON.parse(raw) as Completion
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
    if (data.error || !url?.startsWith('data:image/')) {
      console.error(`[${tag}] 이미지 없음`, model, data.error?.message ?? data.choices?.[0]?.message?.content?.slice(0, 200))
      return null
    }
    return url
  } catch (error) {
    console.error(`[${tag}] 생성 중단`, model, `${Math.round((Date.now() - started) / 1000)}s`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * 그림 둘레에 같은 색 여백이 붙어 왔으면 잘라 낸다 — 바탕 위에 놓인 카드처럼 그려 온 것(네 변)이나 위아래·좌우 띠(레터박스).
 * 마주 보는 두 변이 함께 비어 있을 때만 그 방향을 자른다: 한쪽만 빈 것은 그림의 일부(차분한 글자 자리)다.
 */
async function trimFrame(source: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(source).metadata()
    const { info } = await sharp(source).trim({ threshold: 24 }).toBuffer({ resolveWithObject: true })
    if (!meta.width || !meta.height) return source
    const W = meta.width, H = meta.height
    const left = -(info.trimOffsetLeft ?? 0), top = -(info.trimOffsetTop ?? 0)
    const right = W - left - info.width, bottom = H - top - info.height
    const sides = left >= W * 0.025 && right >= W * 0.025
    const bars = top >= H * 0.025 && bottom >= H * 0.025
    if (!sides && !bars) return source
    const box = { left: sides ? left : 0, top: bars ? top : 0, width: sides ? info.width : W, height: bars ? info.height : H }
    // 너무 많이 잘리면(그림이 거의 한 색) 건드리지 않는다
    if (box.width < W * 0.5 || box.height < H * 0.4) return source
    return await sharp(source).extract(box).toBuffer()
  } catch {
    return source
  }
}

/**
 * 그림 한 장(JPEG data: 주소). photos 는 참고 사진(없으면 글만으로), aspect 는 '3:4'·'4:3'·'16:9' 같은 비율.
 * tag 는 기록에 남는 이름(caricature · hairstyle · card).
 */
export async function generateKioskImage({ tag, prompt, photos = [], aspect, longEdge = 1400, unframe = false }: { tag: string; prompt: string; photos?: string[]; aspect: string; longEdge?: number; /** 네 변에 같은 색 여백(액자·목업 바탕)이 있으면 잘라 낸다 */ unframe?: boolean }): Promise<string> {
  if (!kioskImageConfigured()) throw new KioskImageError('그림 그리기 설정이 아직 없어요.', 503)
  if (!photos.every(isKioskPhoto)) throw new KioskImageError('사진 형식이 올바르지 않아요.', 400)

  const now = Date.now()
  if (now - minuteStart > 60_000) { minuteStart = now; minuteCount = 0 }
  if (now - dayStart > 86_400_000) { dayStart = now; dayCount = 0 }
  if (minuteCount >= PER_MINUTE || dayCount >= PER_DAY) throw new KioskImageError('잠시 후 다시 시도해 주세요.', 429)
  minuteCount++
  dayCount++

  // 첫 시도가 늦거나 실패하면 더 나은(느리고 비싼) 모델로 한 번 더 — 손님이 빈손으로 돌아가지 않게
  const primary = process.env.OPENROUTER_KIOSK_IMAGE_MODEL || process.env.OPENROUTER_CARICATURE_MODEL || DEFAULT_MODEL
  const attempts: [string, number][] = [[primary, 45_000], [primary === OPENROUTER_IMAGE_MODEL ? DEFAULT_MODEL : OPENROUTER_IMAGE_MODEL, 60_000]]
  let url: string | null = null
  for (const [model, timeout] of attempts) {
    url = await requestImage(tag, model, timeout, prompt, photos, aspect)
    if (url) break
  }
  if (!url) throw new KioskImageError('그림을 완성하지 못했어요.', 502)
  let source: Buffer = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
  if (unframe) source = await trimFrame(source)
  // 화면·휴대폰 전송에 맞게 JPEG 로
  const jpeg = await sharp(source)
    .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer()
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}
