// 행사 포스터 → 포토부스 인화 프레임(1200x1800 투명 PNG) 1장.
// 이미지 AI 는 테두리 그림만 그린다 — 사진 창·하단 행사 문구 자리는 여기서 도려내 투명하게 만든다.
// 모델이 가운데에 무엇을 그리든 사진·문구를 가리지 않는다(아래 FRAME_GEOMETRY, 검사: scripts/verify-photobooth-frames.mjs).
// 전용 키 OPENROUTER_SCREEN_API_KEY 만 쓴다(배경 만들기와 같은 키·같은 비용 기록).

import sharp from 'sharp'
import { OPENROUTER_IMAGE_MODEL } from '@/lib/gemini/client'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { call, generatorConfigured, posterDataUrl, type Content } from './generate'
import { uploadPublicImage, writeScreenEvent } from './store'
import type { ScreenEvent } from './types'

/** 인화 원판 기준 투명하게 비울 자리 — compose.ts 의 PRINT(여백 36·간격 18·푸터 200·모서리 24)와 맞춘다 */
export const FRAME_GEOMETRY = {
  W: 1200,
  H: 1800,
  /** 사진 창: 좌우 100px 띠, 위 120px 띠, 아래는 푸터 위 18px 틈까지 */
  window: { x: 100, y: 120, w: 1000, h: 1564 - 18 - 120, r: 24 },
  /** 하단 행사 문구(drawEventFooter) 자리 */
  footer: { x: 36, y: 1564, w: 1128, h: 200, r: 24 },
} as const

const roundRect = ({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`

/** 그림 → 인화 프레임: 크기 맞추고, 사진 창·푸터를 투명하게, 창 가장자리에 가는 선 */
export async function applyFrameMask(painting: Buffer, lineColor = '#ffffff'): Promise<Buffer> {
  const { W, H, window: win, footer } = FRAME_GEOMETRY
  const keep = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path fill="#fff" fill-rule="evenodd" d="M0 0H${W}V${H}H0Z ${roundRect(win)} ${roundRect(footer)}"/></svg>`)
  const line = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="${roundRect(win)}" fill="none" stroke="${lineColor}" stroke-opacity="0.85" stroke-width="6"/></svg>`)
  const sized = await sharp(painting).resize(W, H, { fit: 'cover' }).ensureAlpha().png().toBuffer()
  const masked = await sharp(sized).composite([{ input: keep, blend: 'dest-in' }]).png().toBuffer()
  return sharp(masked).composite([{ input: line, blend: 'over' }]).png({ compressionLevel: 9 }).toBuffer()
}

export async function paintFrame(poster: string, event: ScreenEvent) {
  const colors = event.analysis ? ` Palette hint from the poster: base ${event.analysis.base}, accent ${event.analysis.accent}.` : ''
  const prompt = `Design a decorative PHOTO-BOOTH PRINT FRAME (portrait 2:3, 4x6 inch print) for a K-pop birthday cafe event "${event.title}".
Use the attached event poster ONLY as a style reference: reuse its colour palette, patterns and graphic motifs.${colors}
Layout rules (very important):
- Put ALL decoration in a border band around the edges: about 8% of the width on the left and right, about 7% of the height at the top, and a thin band at the bottom.
- The whole inside of that border must be ONE flat plain colour with no pattern — a photo will be placed there.
- Make the border rich and cute: repeated small motifs, ribbons, stickers or patterns in the poster's style, balanced on all four sides and corners.
- Absolutely NO text, letters, numbers, logos, watermarks, people or faces.
Clean, flat, high quality print illustration.`
  const data = await call({
    model: OPENROUTER_IMAGE_MODEL, modalities: ['image', 'text'], image_config: { aspect_ratio: '2:3' },
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: poster } }] as Content[] }],
  })
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url?.startsWith('data:image/')) throw new BackgroundError('프레임 이미지를 받지 못했습니다. 다시 시도해주세요.', 502)
  return { painting: Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'), cost: data.usage?.cost ?? 0 }
}

/** AI 프레임 1장을 만들어 이 행사에 묶어 등록한다 — 부스에는 행사가 적용 중일 때 맨 앞에 나온다 */
export async function generateEventFrame(event: ScreenEvent): Promise<{ frame: { id: string; title: string; image_url: string }; event: ScreenEvent }> {
  if (!generatorConfigured()) throw new BackgroundError('이미지 AI 전용 키(OPENROUTER_SCREEN_API_KEY)가 아직 설정되지 않았습니다.', 503)
  if (!event.poster) throw new BackgroundError('포스터를 먼저 올려주세요.')
  const client = createServiceRoleClient()
  const { count } = await client.from('photobooth_assets').select('id', { count: 'exact', head: true }).eq('screen_event_id', event.id)
  const { painting, cost } = await paintFrame(await posterDataUrl(event.poster), event)
  const png = await applyFrameMask(painting, event.analysis?.base ?? '#ffffff')
  const image_url = await uploadPublicImage(`photobooth/frames/event-${event.id}-${Date.now().toString(36)}.png`, png, 'image/png')
  const title = `${event.title} AI 프레임 ${(count ?? 0) + 1}`.slice(0, 100)
  const { data, error } = await client.from('photobooth_assets')
    .insert({ kind: 'frame', title, image_url, display_order: 0, is_active: true, screen_event_id: event.id })
    .select('id, title, image_url').single()
  if (error || !data) throw new BackgroundError('만든 프레임을 등록하지 못했습니다.', 503)
  // 배경 만들기와 같은 누적 비용에 더한다
  const next = await writeScreenEvent({ ...event, generation_cost: Math.round(((event.generation_cost ?? 0) + cost) * 10000) / 10000 })
  return { frame: data, event: next }
}
