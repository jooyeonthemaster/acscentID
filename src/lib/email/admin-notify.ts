import { getResendClient, getAdminEmails, FROM_EMAIL } from './client'
import { newMemberTemplate, newOrderTemplate, cancelRequestTemplate } from './templates'

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
}) {
  sendAdminNotification(newOrderTemplate({
    ...data,
    createdAt: getKoreanTime()
  })).catch(console.error)
}

export function notifyCancelRequest(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  finalPrice: number
}) {
  sendAdminNotification(cancelRequestTemplate({
    ...data,
    requestedAt: getKoreanTime()
  })).catch(console.error)
}
