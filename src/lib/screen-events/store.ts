// 이벤트 기록 저장소 — 배경 설정과 같은 비공개 버킷, 이벤트 하나당 파일 하나(events-v1/<id>.json).
// 배경 저장소(store.ts)처럼 목록의 eTag 를 주소에 붙여 CDN 의 옛 내용을 피한다.

import { createServiceRoleClient } from '@/lib/supabase/service'
import { BackgroundError } from '@/lib/screen-backgrounds/store'
import { validateScreenEvent, type ScreenEvent } from './types'

const BUCKET = 'screen-background-settings'
const PREFIX = 'events-v1'

export async function readScreenEvents(): Promise<ScreenEvent[]> {
  const bucket = createServiceRoleClient().storage.from(BUCKET)
  const entries: { name: string; version: string }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(PREFIX, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new BackgroundError('이벤트 목록을 읽지 못했습니다.', 503)
    for (const entry of data ?? []) if (entry.name.endsWith('.json')) entries.push({ name: entry.name, version: String(entry.metadata?.eTag ?? entry.updated_at ?? '') })
    if ((data?.length ?? 0) < 1000) break
  }
  const events = await Promise.all(entries.map(async ({ name, version }) => {
    const { data, error } = await bucket.download(`${PREFIX}/${name}${version ? `?v=${encodeURIComponent(version)}` : ''}`)
    if (error || !data) throw new BackgroundError('이벤트 목록을 읽지 못했습니다.', 503)
    try {
      const event = JSON.parse(await data.text())
      return validateScreenEvent(event) ? event : null
    } catch { return null }
  }))
  // 손상된 한 건 때문에 전체 화면이 멈추지 않게 건너뛴다(배경과 달리 되살아날 기본값이 없다)
  return events.filter((event): event is ScreenEvent => !!event).sort((a, b) => a.starts_on.localeCompare(b.starts_on) || a.title.localeCompare(b.title))
}

export async function writeScreenEvent(event: ScreenEvent): Promise<ScreenEvent> {
  const next = { ...event, updated_at: new Date().toISOString() }
  if (!validateScreenEvent(next)) throw new BackgroundError('이벤트 정보를 확인해주세요(이름·기간·포스터).')
  const { error } = await createServiceRoleClient().storage.from(BUCKET).upload(`${PREFIX}/${next.id}.json`,
    Buffer.from(JSON.stringify(next)), { upsert: true, contentType: 'application/json', cacheControl: '0' })
  if (error) throw new BackgroundError('이벤트를 저장하지 못했습니다.', 503)
  return next
}

/** 공개 이미지 버킷(admin-content)에 올리고 주소를 돌려준다 */
export async function uploadPublicImage(path: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = createServiceRoleClient().storage.from('admin-content')
  const { error } = await bucket.upload(path, body, { contentType, cacheControl: '31536000', upsert: true })
  if (error) throw new BackgroundError(`이미지를 저장하지 못했습니다: ${error.message}`, 503)
  return bucket.getPublicUrl(path).data.publicUrl
}
