import { randomUUID } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service'
import catalog from './catalog.json'
import { mergeBackgroundRecords, type BackgroundRecord } from './merge'
import { EDITABLE_BACKGROUND_FIELDS, validateBackground } from './validation'
import type { BackgroundSnapshot, DeviceSettings, ScreenBackground, ScreenTarget } from './types'
import { isScreenUi } from './types'
import { SCREEN_FONT_IDS } from '@/lib/screen-fonts/catalog'
import { KIOSK_MODE_IDS } from '@/lib/kiosk/modes'
import { BOOTH_MODE_IDS } from '@/lib/booth/modes'

// Private server-only configuration bucket; no manual SQL migration or device-local metadata.
// One object per background avoids overwriting unrelated edits from another administrator.
const PREFIX = 'config-v1'
const BUCKET = 'screen-background-settings'
export class BackgroundError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export async function readBackgroundSnapshot(): Promise<BackgroundSnapshot> {
  const bucket = createServiceRoleClient().storage.from(BUCKET)
  const entries: { name: string; version: string }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(PREFIX, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new BackgroundError('중앙 배경 설정을 읽지 못했습니다. 잠시 후 다시 시도해주세요.', 503)
    for (const entry of data ?? []) {
      if (!entry.name.endsWith('.json')) continue
      entries.push({ name: entry.name, version: String(entry.metadata?.eTag ?? entry.updated_at ?? '') })
    }
    if ((data?.length ?? 0) < 1000) break
  }
  const records = await Promise.all(entries.map(async ({ name, version }) => {
    // Supabase CDN은 같은 주소의 파일을 덮어써도 한동안 옛 내용을 준다(실측: 저장 직후 수 분간).
    // 목록(list)은 매번 새로 오므로 거기 실린 버전(eTag)을 주소에 붙인다 — 바뀐 파일만 새 주소가
    // 되어 즉시 새 내용을 받고, 안 바뀐 파일은 계속 캐시를 탄다.
    const { data, error } = await bucket.download(`${PREFIX}/${name}${version ? `?v=${encodeURIComponent(version)}` : ''}`)
    if (error || !data) throw new BackgroundError('중앙 배경 설정을 읽지 못했습니다.', 503)
    try { return JSON.parse(await data.text()) as BackgroundRecord }
    catch { throw new BackgroundError('중앙 배경 설정이 손상되었습니다. 관리자에게 문의해주세요.', 503) }
  }))
  return mergeBackgroundRecords(catalog as ScreenBackground[], records)
}

async function writeRecord(name: string, record: BackgroundRecord) {
  const { error } = await createServiceRoleClient().storage.from(BUCKET).upload(`${PREFIX}/${name}.json`,
    Buffer.from(JSON.stringify(record)), { upsert: true, contentType: 'application/json', cacheControl: '0' })
  if (error) throw new BackgroundError('배경 설정을 저장하지 못했습니다. 변경되지 않았습니다.', 503)
}

export async function saveBackground(body: Record<string, unknown>, create: boolean) {
  const snapshot = await readBackgroundSnapshot()
  const existing = create ? undefined : snapshot.backgrounds.find(item => item.id === body.id)
  if (!create && !existing) throw new BackgroundError('배경을 찾을 수 없습니다. 목록을 새로고침해주세요.', 404)
  const background = { ...(existing ?? {
    id: `custom-${randomUUID()}`, target: body.target, title: '', image_url: '', thumbnail_url: '',
    collection: 'custom', palette: 'wanted', tone: 'light', ink: '#263949', accent: '#315b77',
    base: '#f8f6f1', display_order: 0, is_active: true,
  }) } as ScreenBackground
  for (const key of EDITABLE_BACKGROUND_FIELDS) if (Object.hasOwn(body, key)) Object.assign(background, { [key]: body[key] })
  if (typeof background.title === 'string') background.title = background.title.trim()
  if (!background.thumbnail_url) background.thumbnail_url = background.image_url
  if (!validateBackground(background)) throw new BackgroundError('배경 이름·이미지 주소·색상·순서를 확인해주세요.')
  if (background.font && !SCREEN_FONT_IDS.includes(background.font)) throw new BackgroundError('추천 글꼴을 찾을 수 없습니다.')
  // A replacement image without an explicit new thumbnail must not keep the old picture.
  if (existing && existing.image_url !== background.image_url && !Object.hasOwn(body, 'thumbnail_url')) background.thumbnail_url = background.image_url
  await writeRecord(background.id, { kind: 'background', background })
  return background
}

export async function deleteBackground(id: string) {
  const snapshot = await readBackgroundSnapshot()
  if (!snapshot.backgrounds.some(background => background.id === id)) throw new BackgroundError('배경을 찾을 수 없습니다.', 404)
  // Keep source images recoverable; deleting a preset removes it from every screen catalogue.
  await writeRecord(id, { kind: 'deleted', id })
}

export async function selectSharedBackground(target: ScreenTarget, id: string) {
  const snapshot = await readBackgroundSnapshot()
  const background = snapshot.backgrounds.find(item => item.id === id && item.target === target && item.is_active)
  if (!background) throw new BackgroundError('선택할 수 없는 배경입니다. 목록을 새로고침해주세요.', 409)
  await writeRecord(`selection-${target}`, { kind: 'selection', target, id })
  // 배경의 추천 글꼴이 있으면 기기 글꼴도 함께 — 이후 기기·관리자 화면에서 다시 바꿀 수 있다
  if (background.font && SCREEN_FONT_IDS.includes(background.font)) await saveDeviceSettings(target, { font: background.font })
}

/** 기기 화면 디자인·글꼴 — 기기 종류별로 하나. 바꾸지 않은 항목은 그대로 둔다 */
export async function saveDeviceSettings(target: ScreenTarget, patch: Partial<DeviceSettings>) {
  const snapshot = await readBackgroundSnapshot()
  const next: DeviceSettings = { ...snapshot.settings[target] }
  if (Object.hasOwn(patch, 'ui')) {
    if (!isScreenUi(patch.ui)) throw new BackgroundError('화면 디자인을 확인해주세요.')
    next.ui = patch.ui
  }
  if (Object.hasOwn(patch, 'font')) {
    if (patch.font !== null && !SCREEN_FONT_IDS.includes(patch.font as string)) throw new BackgroundError('글꼴을 찾을 수 없습니다.')
    next.font = patch.font ?? null
  }
  if (Object.hasOwn(patch, 'mode')) {
    // 기기 종류마다 모드 목록이 따로 — 키오스크 src/lib/kiosk/modes.ts, 포토부스 src/lib/booth/modes.ts
    const modeIds = target === 'kiosk' ? KIOSK_MODE_IDS : BOOTH_MODE_IDS
    if (patch.mode !== null && !modeIds.includes(patch.mode as string)) throw new BackgroundError('운영 모드를 확인해주세요.')
    next.mode = patch.mode ?? null
  }
  if (Object.hasOwn(patch, 'hanjaFont')) {
    if (target !== 'kiosk' || (patch.hanjaFont !== 'kaishu' && patch.hanjaFont !== 'gothic')) throw new BackgroundError('한자 글꼴을 확인해주세요.')
    next.hanjaFont = patch.hanjaFont
  }
  if (Object.hasOwn(patch, 'receiptStyle')) {
    if (target !== 'kiosk' || (patch.receiptStyle !== 'sheet' && patch.receiptStyle !== 'prescription')) throw new BackgroundError('영수증 양식을 확인해주세요.')
    next.receiptStyle = patch.receiptStyle
  }
  await writeRecord(`settings-${target}`, {
    kind: 'settings', target, ui: next.ui, font: next.font, ...(next.mode ? { mode: next.mode } : {}),
    ...(next.hanjaFont ? { hanjaFont: next.hanjaFont } : {}), ...(next.receiptStyle ? { receiptStyle: next.receiptStyle } : {}),
  })
  return next
}
