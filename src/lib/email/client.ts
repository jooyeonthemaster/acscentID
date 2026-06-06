import { Resend } from 'resend'

// Resend 클라이언트 (서버사이드 전용)
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured')
    return null
  }
  return new Resend(apiKey)
}

// 관리자 이메일 목록 가져오기
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0)
}

// 발신 이메일 주소
// 운영에서는 Resend에서 인증한 도메인의 주소를 RESEND_FROM_EMAIL에 설정한다.
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ACSCENT <no-reply@acscent.co.kr>'
