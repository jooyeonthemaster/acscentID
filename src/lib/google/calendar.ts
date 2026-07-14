// Google Calendar 저수준 클라이언트 (서버사이드 전용)
// googleapis SDK 없이 서비스 계정 JWT(RS256)를 Node 내장 crypto로 직접 서명해
// access token을 교환하고 freeBusy / events REST API를 호출한다.
// (src/lib/notion/client.ts 와 동일한 "SDK 없이 fetch" 철학)

import { createSign } from 'crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const SCOPE = 'https://www.googleapis.com/auth/calendar'

export interface GoogleCalendarConfig {
  clientEmail: string
  privateKey: string
  calendarId: string
}

// 환경변수가 갖춰졌을 때만 설정 객체를 반환한다. (미설정이면 null → 호출측에서 503/스킵)
export function getGoogleCalendarConfig(): GoogleCalendarConfig | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!clientEmail || !privateKey || !calendarId) {
    return null
  }
  return {
    clientEmail,
    // Vercel env에는 \n 이 이스케이프되어 저장되므로 복원
    privateKey: privateKey.replace(/\\n/g, '\n'),
    calendarId,
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

// 모듈 스코프 토큰 캐시 (서버리스 웜 인스턴스 간 재사용)
let cachedToken: { token: string; expiresAtMs: number } | null = null

export async function getAccessToken(config: GoogleCalendarConfig): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAtMs - 60_000 > now) {
    return cachedToken.token
  }

  const iat = Math.floor(now / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat,
      exp: iat + 3600,
    })
  )
  const signingInput = `${header}.${claims}`
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(config.privateKey)
  const assertion = `${signingInput}.${base64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const data = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    | null

  if (!res.ok || !data?.access_token) {
    throw new Error(
      `[GoogleCalendar] token exchange failed (${res.status}): ${data?.error || ''} ${data?.error_description || ''}`
    )
  }

  cachedToken = {
    token: data.access_token,
    expiresAtMs: now + (data.expires_in ?? 3600) * 1000,
  }
  return data.access_token
}

export interface BusyInterval {
  start: string
  end: string
}

/** 캘린더의 busy 구간 조회. 실패 시 throw (호출측에서 처리). */
export async function queryFreeBusy(
  config: GoogleCalendarConfig,
  timeMinIso: string,
  timeMaxIso: string
): Promise<BusyInterval[]> {
  const token = await getAccessToken(config)
  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      timeZone: 'Asia/Seoul',
      items: [{ id: config.calendarId }],
    }),
  })

  const data = (await res.json().catch(() => null)) as {
    calendars?: Record<string, { busy?: BusyInterval[]; errors?: unknown[] }>
  } | null

  if (!res.ok || !data?.calendars) {
    throw new Error(`[GoogleCalendar] freeBusy failed (${res.status}): ${JSON.stringify(data)}`)
  }

  const calendar = data.calendars[config.calendarId]
  if (!calendar || (calendar.errors && calendar.errors.length > 0)) {
    throw new Error(`[GoogleCalendar] freeBusy calendar error: ${JSON.stringify(calendar?.errors)}`)
  }
  return calendar.busy ?? []
}

/**
 * 캘린더 이벤트 생성 → 이벤트 ID 반환.
 * 서비스 계정은 attendee 초대가 불가(DWD 필요)하므로 고객 정보는 description에 기록한다.
 */
export async function insertEvent(
  config: GoogleCalendarConfig,
  event: { summary: string; description: string; startIso: string; endIso: string }
): Promise<string> {
  const token = await getAccessToken(config)
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(config.calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startIso, timeZone: 'Asia/Seoul' },
        end: { dateTime: event.endIso, timeZone: 'Asia/Seoul' },
      }),
    }
  )

  const data = (await res.json().catch(() => null)) as { id?: string } | null
  if (!res.ok || !data?.id) {
    throw new Error(`[GoogleCalendar] insertEvent failed (${res.status}): ${JSON.stringify(data)}`)
  }
  return data.id
}

/** 이벤트 삭제 (취소 동선 대비). 실패해도 throw 하지 않고 false 반환. */
export async function deleteEvent(config: GoogleCalendarConfig, eventId: string): Promise<boolean> {
  try {
    const token = await getAccessToken(config)
    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    // 410 = 이미 삭제됨 → 성공으로 간주
    return res.ok || res.status === 410
  } catch (err) {
    console.error('[GoogleCalendar] deleteEvent error:', err)
    return false
  }
}
