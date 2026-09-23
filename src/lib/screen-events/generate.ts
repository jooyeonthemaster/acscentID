// 포스터 → 분석(색·분위기·추천 글꼴 3개) 1번 + 배경 이미지 2장(키오스크 세로·부스 가로).
// 전용 키 OPENROUTER_SCREEN_API_KEY 만 쓴다 — 사이트 분석용 메인 키와 비용을 섞지 않는다.

import sharp from 'sharp'
import { OPENROUTER_IMAGE_MODEL, OPENROUTER_TEXT_MODEL } from '@/lib/gemini/client'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import type { ScreenBackground, ScreenTarget } from '@/lib/screen-backgrounds/types'
import { validateBackground } from '@/lib/screen-backgrounds/validation'
import { SCREEN_FONTS, SCREEN_FONT_CATEGORIES } from '@/lib/screen-fonts/catalog'
import { uploadPublicImage, writeScreenEvent } from './store'
import type { EventAnalysis, FontSuggestion, ScreenEvent } from './types'

export function generatorConfigured() { return !!process.env.OPENROUTER_SCREEN_API_KEY }

const SIZE: Record<ScreenTarget, { width: number; height: number; ratio: string; label: string }> = {
  kiosk: { width: 1080, height: 1920, ratio: '9:16', label: 'tall portrait kiosk screen (9:16)' },
  booth: { width: 1920, height: 1080, ratio: '16:9', label: 'wide landscape photo-booth screen (16:9)' },
}

type Content = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
interface Completion {
  choices?: { message?: { content?: string | null; images?: { image_url?: { url?: string } }[] } }[]
  usage?: { cost?: number }
  error?: { message?: string }
}

async function call(body: Record<string, unknown>): Promise<Completion> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_SCREEN_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': "AC'SCENT screen events" },
    body: JSON.stringify({ ...body, usage: { include: true } }),
    signal: AbortSignal.timeout(150_000),
  })
  const raw = await res.text()
  if (!res.ok) throw new BackgroundError(`이미지 AI 호출 실패 (${res.status}): ${raw.slice(0, 200)}`, 502)
  const data = JSON.parse(raw) as Completion
  if (data.error) throw new BackgroundError(`이미지 AI 오류: ${data.error.message}`, 502)
  return data
}

const HEX = /^#[0-9a-f]{6}$/i

async function analyze(poster: string, title: string) {
  const fonts = SCREEN_FONTS.map(f => `${f.id} — ${f.label} (${SCREEN_FONT_CATEGORIES[f.category]})`).join('\n')
  const prompt = `You are the art director of a K-pop fan "birthday cafe" event shop (AC'SCENT). The attached image is the event poster for "${title}".
Analyse it and answer ONLY with JSON:
{
 "mood": "한국어 한 문장 — 포스터의 분위기",
 "tone": "light" | "dark",            // overall brightness of a screen background in this style
 "base": "#rrggbb",                   // calm background colour taken from the poster
 "ink": "#rrggbb",                    // readable text colour on base
 "accent": "#rrggbb",                 // most characteristic highlight colour
 "motifs": "English, 1-2 sentences: colours, patterns, objects and graphic style to reuse for decorative wallpaper (no people, no text)",
 "fonts": [ {"id": "<font id>", "reason": "한국어 한 문장 — 왜 이 포스터에 어울리는지"} ]  // exactly 3, best first
}
Choose the 3 fonts ONLY from this list (Korean UI fonts, id — name (category)). Prefer fonts that match the poster lettering style and stay readable for short Korean titles on a kiosk:
${fonts}`
  const data = await call({
    model: OPENROUTER_TEXT_MODEL, temperature: 0.4, response_format: { type: 'json_object' }, max_tokens: 1500,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: poster } }] as Content[] }],
  })
  let json: Record<string, unknown>
  try { json = JSON.parse(String(data.choices?.[0]?.message?.content ?? '').replace(/^```json|```$/g, '')) } catch { throw new BackgroundError('포스터 분석 결과를 읽지 못했습니다. 다시 시도해주세요.', 502) }
  const ids = new Set(SCREEN_FONTS.map(f => f.id))
  const suggestions: FontSuggestion[] = (Array.isArray(json.fonts) ? json.fonts : [])
    .filter((f): f is { id: string; reason?: string } => !!f && ids.has((f as { id: string }).id))
    .slice(0, 3).map(f => ({ id: f.id, reason: String(f.reason ?? '').slice(0, 120) }))
  const color = (value: unknown, fallback: string) => typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : fallback
  const analysis: EventAnalysis = {
    mood: String(json.mood ?? '').slice(0, 160),
    tone: json.tone === 'dark' ? 'dark' : 'light',
    base: color(json.base, '#f8f6f1'), ink: color(json.ink, '#263949'), accent: color(json.accent, '#315b77'),
  }
  return { analysis, suggestions, motifs: String(json.motifs ?? '').slice(0, 600), cost: data.usage?.cost ?? 0 }
}

async function paint(target: ScreenTarget, poster: string, title: string, motifs: string) {
  const size = SIZE[target]
  const prompt = `Create a decorative wallpaper for a ${size.label} at a K-pop birthday cafe event for "${title}".
Use the attached event poster ONLY as a style reference: reuse its colour palette, patterns and graphic motifs (${motifs}).
Rules: absolutely NO text, letters, numbers, logos or watermarks. NO people, faces or portraits. Keep the central 60% calm and uncluttered
(plain or very soft texture) because app windows and buttons will be placed on top; put the richer decoration near the edges and corners.
Flat, clean, high quality, print-like illustration.`
  const data = await call({
    model: OPENROUTER_IMAGE_MODEL, modalities: ['image', 'text'], image_config: { aspect_ratio: size.ratio },
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: poster } }] as Content[] }],
  })
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url?.startsWith('data:image/')) throw new BackgroundError('배경 이미지를 받지 못했습니다. 다시 시도해주세요.', 502)
  const source = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
  const image = await sharp(source).resize(size.width, size.height, { fit: 'cover' }).webp({ quality: 84 }).toBuffer()
  const thumb = await sharp(image).resize(target === 'kiosk' ? 270 : 480).webp({ quality: 78 }).toBuffer()
  return { image, thumb, cost: data.usage?.cost ?? 0 }
}

/** 포스터를 작게 줄여 data URL 로 — 원본(최대 1600px)을 그대로 보내면 토큰이 많이 든다 */
async function posterDataUrl(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new BackgroundError('포스터 이미지를 불러오지 못했습니다.', 502)
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 1024, height: 1024, fit: 'inside' }).jpeg({ quality: 84 }).toBuffer()
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}

export async function generateEventScreens(event: ScreenEvent): Promise<ScreenEvent> {
  if (!generatorConfigured()) throw new BackgroundError('이미지 AI 전용 키(OPENROUTER_SCREEN_API_KEY)가 아직 설정되지 않았습니다.', 503)
  if (!event.poster) throw new BackgroundError('포스터를 먼저 올려주세요.')
  const poster = await posterDataUrl(event.poster)
  const { analysis, suggestions, motifs, cost } = await analyze(poster, event.title)
  const stamp = Date.now().toString(36)
  const [kiosk, booth] = await Promise.all((['kiosk', 'booth'] as const).map(async target => {
    const painted = await paint(target, poster, event.title, motifs)
    const base = `screen-events/${event.id}/${target}-${stamp}`
    const background: ScreenBackground = {
      id: `event-${event.id}-${target}`.slice(0, 100), target, title: `${event.title} 이벤트`.slice(0, 80),
      image_url: await uploadPublicImage(`${base}.webp`, painted.image, 'image/webp'),
      thumbnail_url: await uploadPublicImage(`${base}-thumb.webp`, painted.thumb, 'image/webp'),
      collection: 'event', palette: 'soft', tone: analysis.tone, ink: analysis.ink, accent: analysis.accent, base: analysis.base,
      display_order: 0, is_active: true,
    }
    if (!validateBackground(background)) throw new BackgroundError('만든 배경 정보가 올바르지 않습니다.', 502)
    return { background, cost: painted.cost }
  }))
  return writeScreenEvent({
    ...event,
    backgrounds: { kiosk: kiosk.background, booth: booth.background },
    analysis, font_suggestions: suggestions,
    font: event.font ?? suggestions[0]?.id ?? null,
    generated_at: new Date().toISOString(),
    generation_cost: Math.round(((event.generation_cost ?? 0) + cost + kiosk.cost + booth.cost) * 10000) / 10000,
  })
}
