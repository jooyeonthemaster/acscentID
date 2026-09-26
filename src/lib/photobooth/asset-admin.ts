// 프레임·템플릿 수정 — 관리자 웹(/api/admin/photobooth)과 매장 기기(/api/screen-backgrounds/frames)가 같이 쓴다.
import type { createServiceRoleClient } from '@/lib/supabase/service'
import { frameOverrideRow, getDefaultFrame } from '@/lib/photobooth/frame-catalog'
import { MISSING_EVENT_COLUMN_MESSAGE, missingEventColumn, parseScreenEventId, screenEventScope } from '@/lib/photobooth/event-scope'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

export interface AssetPatch {
  title?: unknown
  is_active?: unknown
  display_order?: unknown
  event_id?: unknown
  screen_event_id?: unknown
}

/** 행사 id 확인 — 상시(null)는 통과, 모르는 행사는 거절 */
export async function checkScreenEvent(value: unknown): Promise<{ id: string | null } | { error: string }> {
  const id = parseScreenEventId(value)
  if (id === undefined) return { error: '행사를 찾을 수 없습니다.' }
  if (id === null) return { id }
  const scope = await screenEventScope()
  return scope.options.some(o => o.id === id) ? { id } : { error: '행사를 찾을 수 없습니다. 목록을 새로고침해주세요.' }
}

export async function patchBoothAsset(client: ServiceClient, id: string, body: AssetPatch): Promise<{ error?: string; status?: number }> {
  const defaultFrame = getDefaultFrame(id)
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string' && body.title.trim()) payload.title = body.title.trim()
  if (typeof body.is_active === 'boolean') payload.is_active = body.is_active
  if (Number.isInteger(body.display_order)) payload.display_order = body.display_order
  // 기본 프레임은 생카 이벤트(photobooth_events)에 묶지 않는다 — event_id 외래키가 ON DELETE CASCADE 라, 묶인 행사를 지우면
  // 설정 행이 함께 사라져 숨겨 둔 기본 프레임이 상시 노출로 되살아난다. (화면 이벤트 연결은 외래키가 없어 괜찮다)
  if ('event_id' in body && !defaultFrame) {
    payload.event_id = typeof body.event_id === 'string' && body.event_id.trim() ? body.event_id.trim() : null
  }
  if ('screen_event_id' in body) {
    const checked = await checkScreenEvent(body.screen_event_id)
    if ('error' in checked) return { error: checked.error, status: 400 }
    payload.screen_event_id = checked.id
  }

  // Materialize defaults once, without overwriting any existing settings on another admin's save.
  if (defaultFrame) {
    const { error: seedError } = await client.from('photobooth_assets')
      .upsert(frameOverrideRow(defaultFrame), { onConflict: 'id', ignoreDuplicates: true })
    if (seedError) return { error: '프레임 설정 준비에 실패했습니다', status: 500 }
  }
  const { error } = await client.from('photobooth_assets').update(payload).eq('id', id)
  if (error) {
    if (missingEventColumn(error)) return { error: MISSING_EVENT_COLUMN_MESSAGE, status: 409 }
    console.error('Photobooth asset update failed:', error)
    return { error: '수정에 실패했습니다', status: 500 }
  }
  return {}
}
