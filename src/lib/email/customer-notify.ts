import { getResendClient, FROM_EMAIL } from './client'
import { refundCompletedTemplate } from './templates'

/**
 * 고객 개별 이메일 발송 (fire-and-forget).
 * 수신자 이메일이 없거나 Resend 설정이 없으면 조용히 스킵한다.
 */
async function sendCustomerEmail(
  to: string,
  template: { subject: string; html: string }
): Promise<boolean> {
  try {
    if (!to || !/.+@.+\..+/.test(to)) {
      console.log('[Email/customer] skip — invalid recipient')
      return false
    }

    const resend = getResendClient()
    if (!resend) {
      console.log('[Email/customer] skip — Resend not configured')
      return false
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: template.subject,
      html: template.html,
    })

    if (error) {
      console.error('[Email/customer] send failed:', error)
      return false
    }

    console.log('[Email/customer] sent:', template.subject, 'to', to)
    return true
  } catch (err) {
    console.error('[Email/customer] unexpected error:', err)
    return false
  }
}

function getKoreanTime(): string {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// 환불 완료 알림 — 고객에게 발송
export function notifyCustomerRefundCompleted(data: {
  customerEmail: string | null | undefined
  orderNumber: string
  recipientName: string
  perfumeName: string
  refundAmount: number
  paymentMethod: string
  reason?: string
  refundedAt?: string
}) {
  if (!data.customerEmail) {
    console.log('[Email/customer] refund notification skipped — no email')
    return
  }

  const tpl = refundCompletedTemplate({
    orderNumber: data.orderNumber,
    recipientName: data.recipientName,
    perfumeName: data.perfumeName,
    refundAmount: data.refundAmount,
    paymentMethod: data.paymentMethod,
    refundedAt: data.refundedAt
      ? new Date(data.refundedAt).toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : getKoreanTime(),
    reason: data.reason,
  })

  sendCustomerEmail(data.customerEmail, tpl).catch(console.error)
}
