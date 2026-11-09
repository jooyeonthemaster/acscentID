import { getResendClient, getAdminEmails, FROM_EMAIL } from './client'
import { newMemberTemplate, newOrderTemplate, cancelRequestTemplate, bankDepositTemplate } from './templates'
import { reservationAdminTemplate } from './reservation-templates'
import { createOrderInNotion } from '../notion/admin-notify'
import { createReservationInNotion } from '../notion/reservation-notify'

// 비동기 알림 전송 (실패해도 메인 로직에 영향 없음)
async function sendAdminNotification(
  template: { subject: string; html: string }
): Promise<boolean> {
  try {
    const resend = getResendClient()
    if (!resend) {
      console.log('[Email] Skipping notification - Resend not configured')
      return false
    }

    const adminEmails = getAdminEmails()
    if (adminEmails.length === 0) {
      console.log('[Email] Skipping notification - No admin emails configured')
      return false
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails,
      subject: template.subject,
      html: template.html,
    })

    if (error) {
      console.error('[Email] Send failed:', error)
      return false
    }

    console.log('[Email] Notification sent successfully:', template.subject)
    return true
  } catch (err) {
    console.error('[Email] Unexpected error:', err)
    return false
  }
}

// 한국 시간 포맷
function getKoreanTime(): string {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// === 알림 함수들 (fire-and-forget 방식) ===

export function notifyNewMember(data: {
  memberName: string
  provider: 'google' | 'kakao'
  email: string | null
}) {
  // 비동기로 실행하되 기다리지 않음
  sendAdminNotification(newMemberTemplate({
    ...data,
    createdAt: getKoreanTime()
  })).catch(console.error)
}

export function notifyNewOrder(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  finalPrice: number
  productType: string
  itemCount?: number
  // 노션 전용 추가 필드 (선택) — 이메일 템플릿에는 영향 없음
  paymentMethod?: string
  status?: string
  orderId?: string
}) {
  // 1) 이메일 알림 (Resend) — 기존 동작 유지
  sendAdminNotification(newOrderTemplate({
    ...data,
    createdAt: getKoreanTime()
  })).catch(console.error)

  // 2) 노션 알림 (DB 행 추가 + 모바일 푸시) — fire-and-forget
  createOrderInNotion({
    ...data,
    createdAtIso: new Date().toISOString(),
  }).catch(console.error)
}

export function notifyNewReservation(data: {
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
}) {
  // 1) 관리자 이메일 알림 (Resend)
  sendAdminNotification(reservationAdminTemplate({
    ...data,
    createdAt: getKoreanTime()
  })).catch(console.error)

  // 2) 노션 알림 (예약 DB 행 추가 + 모바일 푸시) — fire-and-forget
  createReservationInNotion(data).catch(console.error)
}

export function notifyCancelRequest(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  finalPrice: number
  reason: string
}) {
  sendAdminNotification(cancelRequestTemplate({
    ...data,
    requestedAt: getKoreanTime()
  })).catch(console.error)
}

/**
 * 무통장 입금 문자 처리 결과 알림(이메일). 입금 문자 라우트가 응답 전에 await 한다 —
 * 서버리스 함수가 응답 뒤 멈춰 메일이 안 나가는 일을 막으려고. 실패해도 throw 하지 않는다.
 */
export function notifyBankDeposit(data: {
  kind: 'confirmed' | 'review'
  amount: number
  depositorName: string | null
  orderNumber?: string | null
  note?: string | null
}): Promise<boolean> {
  return sendAdminNotification(bankDepositTemplate({ ...data, receivedAt: getKoreanTime() }))
}
