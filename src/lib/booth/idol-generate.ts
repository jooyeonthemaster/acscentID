// K-POP 아이돌 컨셉 사진 생성(서버 전용) — 부스에서 찍은 한 컷 + 컨셉 → 같은 얼굴의 아이돌 컨셉 사진.
// 전용 키 OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY(이태원 K-WAVE 행사용, 옛 이름 OPENROUTER_PHOTOBOOTH_API_KEY 도 읽음)만 쓴다
// — 사이트 분석 메인 키·화면 배경 키와 비용을 섞지 않는다.
// 모델은 OPENROUTER_PHOTOBOOTH_MODEL 로 바꿀 수 있다(기본: 얼굴 유지가 가장 나은 Gemini 이미지 모델).
// 손님 사진은 생성에만 쓰고 저장하지 않는다 — 요청·응답을 기록하지 않는다.

import { createHmac, timingSafeEqual } from 'crypto'
import sharp from 'sharp'
import { OPENROUTER_IMAGE_MODEL } from '@/lib/gemini/client'
import { buildIdolPrompt, type IdolConcept } from './idol-concepts'

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
// 표 하나로 IDOL_TICKET_USES 번(첫 생성 + 다시 만들기)까지 — 서버 인스턴스 안에서 센다(여럿이면 조금 느슨).

const TICKET_MS = 15 * 60 * 1000
export const IDOL_TICKET_USES = 3

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

/** 표가 맞고 기한·횟수가 남았으면 1회 쓴다 */
export function spendIdolTicket(ticket: unknown): void {
  if (typeof ticket !== 'string' || ticket.length > 300) throw new IdolError('이용권을 먼저 확인해 주세요.', 401)
  const cut = ticket.lastIndexOf('.')
  const payload = ticket.slice(0, cut), signed = ticket.slice(cut + 1)
  const expected = sign(payload)
  const ok = signed.length === expected.length && timingSafeEqual(Buffer.from(signed), Buffer.from(expected))
  const expires = Number(payload.split('.')[0])
  if (!ok || !Number.isFinite(expires)) throw new IdolError('이용권을 먼저 확인해 주세요.', 401)
  if (expires < Date.now()) throw new IdolError('시간이 지났어요. 처음부터 다시 해 주세요.', 401)
  const used = uses.get(payload) ?? 0
  if (used >= IDOL_TICKET_USES) throw new IdolError('이번 이용권으로 만들 수 있는 횟수를 다 썼어요.', 429)
  uses.set(payload, used + 1)
  if (uses.size > 2000) for (const key of [...uses.keys()].slice(0, 1000)) uses.delete(key)
}

// ───────────────────────── 생성 ─────────────────────────

/** 부스 한 대가 몰아 누르는 일 막기 — 인스턴스 안에서 1분에 이만큼 */
const PER_MINUTE = 20
let windowStart = 0
let windowCount = 0

interface Completion {
  choices?: { message?: { content?: string | null; images?: { image_url?: { url?: string } }[] } }[]
  error?: { message?: string }
}

export async function generateIdolPhoto(photo: string, concept: IdolConcept, people: number): Promise<string> {
  if (!idolConfigured()) throw new IdolError('AI 사진 전용 키가 아직 설정되지 않았어요.', 503)
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo) || photo.length > 3_000_000) throw new IdolError('사진 형식이 올바르지 않아요.', 400)

  const now = Date.now()
  if (now - windowStart > 60_000) { windowStart = now; windowCount = 0 }
  if (++windowCount > PER_MINUTE) throw new IdolError('잠시 후 다시 시도해 주세요.', 429)

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      'X-Title': "AC'SCENT photobooth",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_PHOTOBOOTH_MODEL || OPENROUTER_IMAGE_MODEL,
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: '2:3' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: buildIdolPrompt(concept, people) },
          { type: 'image_url', image_url: { url: photo } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(110_000),
  })
  const raw = await res.text()
  if (!res.ok) {
    console.error('[idol] 생성 호출 실패', res.status, raw.slice(0, 300))
    throw new IdolError('AI 사진을 만들지 못했어요.', 502)
  }
  const data = JSON.parse(raw) as Completion
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (data.error || !url?.startsWith('data:image/')) {
    console.error('[idol] 이미지 없음', data.error?.message ?? data.choices?.[0]?.message?.content?.slice(0, 200))
    throw new IdolError('AI 사진을 만들지 못했어요.', 502)
  }
  // 응답 크기(4.5MB 제한)와 부스 전송을 줄이려 JPEG 로 — 긴 변 1800 이하
  const jpeg = await sharp(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))
    .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer()
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}
