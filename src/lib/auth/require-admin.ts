import { requireAuthenticatedUser, type AuthenticatedUser } from '@/lib/auth/require-user'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export interface AdminUser extends AuthenticatedUser {
  email: string
}

/**
 * 관리자 인증 강제. 인증 실패 또는 화이트리스트 미포함 시 null.
 * API 라우트에서 사용 — 호출 측에서 401/403 응답.
 */
export async function requireAdmin(): Promise<AdminUser | null> {
  const user = await requireAuthenticatedUser()
  if (!user || !user.email) return null
  const email = user.email.toLowerCase()
  if (!ADMIN_EMAILS.includes(email)) return null
  return { ...user, email }
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
