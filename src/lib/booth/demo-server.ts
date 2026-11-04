// 영업용 포토부스 데모(/booth-demo)의 서버 쪽 — 데모 표와 생성 상한(서버 전용).
// 데모는 링크를 받은 누구나 쓰므로 AI 아이돌 사진(장당 약 $0.14)에 상한을 둔다: 1분 3장 · 하루(KST) 40장.
// 하루 수는 서버 인스턴스가 여러 개여도 맞게 저장소(비공개 버킷)에 날짜별로 적는다. 동시에 몰리면 한두 장 넘을 수 있다.
// 데모 표는 생성 표(issueIdolTicket)와 같은 서명이고 주인이 'demo' — 폰으로 받기(사진 올리기)도 이 표로 한다(촬영 기록 없이).

import { createServiceRoleClient } from '@/lib/supabase/service'
import { IdolError, issueIdolTicket, readIdolTicket } from './idol-generate'

export const DEMO_TICKET_OWNER = 'demo'
export const DEMO_DAILY_LIMIT = 40
const DEMO_PER_MINUTE = 3

const BUCKET = 'screen-background-settings'
const usagePath = (day: string) => `booth-demo/usage-${day}.json`
const kstDay = (now = Date.now()) => new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

export function issueDemoTicket(): string {
  return issueIdolTicket(DEMO_TICKET_OWNER)
}

/** 데모 표인지(서명·기한 확인) */
export function isDemoTicket(ticket: unknown): boolean {
  try {
    return readIdolTicket(ticket).pass === DEMO_TICKET_OWNER
  } catch {
    return false
  }
}

let windowStart = 0
let windowCount = 0

/** 데모 생성 한 장을 쓴다 — 상한을 넘으면 IdolError(429) */
export async function takeDemoGeneration(now = Date.now()): Promise<void> {
  if (now - windowStart > 60_000) { windowStart = now; windowCount = 0 }
  if (++windowCount > DEMO_PER_MINUTE) throw new IdolError('데모 사용이 몰려 있어요. 1분 뒤에 다시 해 주세요.', 429)
  const bucket = createServiceRoleClient().storage.from(BUCKET)
  const path = usagePath(kstDay(now))
  let count = 0
  const { data } = await bucket.download(`${path}?t=${now}`)
  if (data) {
    try { count = Number(JSON.parse(await data.text())?.count) || 0 } catch { count = 0 }
  }
  if (count >= DEMO_DAILY_LIMIT) throw new IdolError('오늘 데모 횟수를 다 썼어요. 찍은 사진으로 인화 디자인을 보여 드려요.', 429)
  const body = new Blob([JSON.stringify({ count: count + 1, updatedAt: new Date(now).toISOString() })], { type: 'application/json' })
  const { error } = await bucket.upload(path, body, { upsert: true, contentType: 'application/json' })
  if (error) console.error('[booth-demo] 사용량 기록 실패:', error.message)
}
