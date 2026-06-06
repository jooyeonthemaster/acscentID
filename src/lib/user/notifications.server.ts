import { randomUUID } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { MAX_NOTIFICATIONS, type UserNotification, type NotificationType } from './notifications'

interface NewNotificationInput {
  type: NotificationType
  title: string
  body: string
  link?: string
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>

async function loadPreferences(service: ServiceClient, userId: string): Promise<Record<string, unknown>> {
  const { data } = await service
    .from('user_profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle()
  return (data?.preferences ?? {}) as Record<string, unknown>
}

function readList(prefs: Record<string, unknown>): UserNotification[] {
  return Array.isArray(prefs.notifications) ? (prefs.notifications as UserNotification[]) : []
}

/**
 * 사용자에게 인앱 알림 추가. 이메일 발송과 함께 호출하면 알림함에 쌓인다.
 * 실패해도 호출측 흐름(주문/배송 처리)을 막지 않도록 예외를 삼킨다.
 */
export async function addUserNotification(
  userId: string | null | undefined,
  input: NewNotificationInput,
): Promise<void> {
  if (!userId) return
  try {
    const service = createServiceRoleClient()
    const prefs = await loadPreferences(service, userId)
    const list = readList(prefs)

    const notif: UserNotification = {
      id: randomUUID(),
      type: input.type,
      title: input.title,
      body: input.body,
      ...(input.link ? { link: input.link } : {}),
      created_at: new Date().toISOString(),
      read: false,
    }

    prefs.notifications = [notif, ...list].slice(0, MAX_NOTIFICATIONS)

    await service.from('user_profiles').upsert(
      { id: userId, preferences: prefs, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
  } catch (err) {
    console.error('[notifications] add failed:', err)
  }
}

export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  const service = createServiceRoleClient()
  const prefs = await loadPreferences(service, userId)
  return readList(prefs)
}

/**
 * 알림 읽음 처리. ids 미지정 시 전체 읽음.
 */
export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const service = createServiceRoleClient()
  const prefs = await loadPreferences(service, userId)
  const list = readList(prefs)
  prefs.notifications = list.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n))
  await service
    .from('user_profiles')
    .update({ preferences: prefs, updated_at: new Date().toISOString() })
    .eq('id', userId)
}

export async function clearUserNotifications(userId: string): Promise<void> {
  const service = createServiceRoleClient()
  const prefs = await loadPreferences(service, userId)
  delete prefs.notifications
  await service
    .from('user_profiles')
    .update({ preferences: prefs, updated_at: new Date().toISOString() })
    .eq('id', userId)
}
