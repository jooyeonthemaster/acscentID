import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-user'
import {
  getUserNotifications,
  markNotificationsRead,
  clearUserNotifications,
} from '@/lib/user/notifications.server'

// GET /api/user/notifications - 내 알림 목록 + 안 읽은 개수
export async function GET() {
  const authUser = await requireAuthenticatedUser()
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  const notifications = await getUserNotifications(authUser.id)
  const unreadCount = notifications.filter((n) => !n.read).length
  return NextResponse.json({ notifications, unreadCount })
}

// PATCH /api/user/notifications - 읽음 처리 (ids 미지정 시 전체)
export async function PATCH(request: NextRequest) {
  const authUser = await requireAuthenticatedUser()
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : undefined
  await markNotificationsRead(authUser.id, ids)
  return NextResponse.json({ ok: true })
}

// DELETE /api/user/notifications - 전체 삭제
export async function DELETE() {
  const authUser = await requireAuthenticatedUser()
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  await clearUserNotifications(authUser.id)
  return NextResponse.json({ ok: true })
}
