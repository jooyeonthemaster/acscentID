import { notionRequest } from './client'
import { RESERVATION_PROGRAM_LABELS_KO } from '@/lib/email/reservation-templates'

// 예약 전용 노션 설정 — 주문 DB(NOTION_ORDERS_DATABASE_ID)와 별도 DB를 사용한다.
interface ReservationNotionConfig {
  apiKey: string
  databaseId: string
  adminUserId: string | null
}

function getReservationNotionConfig(): ReservationNotionConfig | null {
  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_RESERVATIONS_DATABASE_ID
  if (!apiKey || !databaseId) {
    return null
  }
  return {
    apiKey,
    databaseId,
    adminUserId: process.env.NOTION_ADMIN_USER_ID || null,
  }
}

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
  es: 'Español',
}

export interface NotionReservationData {
  reservationCode: string
  name: string
  email: string
  phone: string | null
  program: string
  partySize: number
  slotStartIso: string
  slotEndIso: string
  notes: string | null
  locale: string
  calendarRegistered: boolean
}

/**
 * 새 방문 예약을 노션 데이터베이스에 한 행(페이지)으로 추가한다.
 * NOTION_ADMIN_USER_ID가 설정돼 있으면 본문에 관리자를 @멘션하여
 * 노션 모바일 푸시 알림이 발송되도록 한다.
 *
 * 실패해도 예약 흐름에는 영향이 없도록 절대 throw 하지 않는다.
 */
export async function createReservationInNotion(data: NotionReservationData): Promise<boolean> {
  const config = getReservationNotionConfig()
  if (!config) {
    console.log('[Notion] Skipping - NOTION_API_KEY / NOTION_RESERVATIONS_DATABASE_ID not configured')
    return false
  }

  const programLabel = RESERVATION_PROGRAM_LABELS_KO[data.program] || data.program

  // 데이터베이스 속성(컬럼) 매핑 — 노션에 아래 이름/타입으로 속성을 만들어 두어야 한다.
  const properties: Record<string, unknown> = {
    예약번호: { title: [{ text: { content: data.reservationCode } }] },
    이름: { rich_text: [{ text: { content: data.name } }] },
    이메일: { email: data.email },
    전화: { phone_number: data.phone || null },
    프로그램: { select: { name: programLabel } },
    인원: { number: data.partySize },
    예약일시: { date: { start: data.slotStartIso, end: data.slotEndIso } },
    요청사항: { rich_text: [{ text: { content: data.notes || '' } }] },
    언어: { select: { name: LOCALE_LABELS[data.locale] || data.locale } },
    상태: { select: { name: '확정' } },
    캘린더등록: { checkbox: data.calendarRegistered },
  }

  // 본문: 관리자 @멘션(푸시 알림 트리거) — admin-notify.ts 패턴과 동일
  const richText: unknown[] = config.adminUserId
    ? [
        { type: 'text', text: { content: '🔔 새 방문 예약 확인 필요  ' } },
        { type: 'mention', mention: { type: 'user', user: { id: config.adminUserId } } },
      ]
    : [{ type: 'text', text: { content: '📅 새 방문 예약' } }]

  if (!data.calendarRegistered) {
    richText.push({
      type: 'text',
      text: { content: '   ⚠️ 구글 캘린더 등록 실패 — 수동 입력 필요' },
      annotations: { bold: true, color: 'red' },
    })
  }

  const children = [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: richText },
    },
  ]

  try {
    const { ok, status, data: resData } = await notionRequest(config.apiKey, '/pages', {
      parent: { database_id: config.databaseId },
      properties,
      children,
    })

    if (!ok) {
      console.error('[Notion] Create reservation page failed:', status, JSON.stringify(resData))
      return false
    }

    console.log('[Notion] Reservation page created:', data.reservationCode)
    return true
  } catch (err) {
    console.error('[Notion] Unexpected error:', err)
    return false
  }
}
