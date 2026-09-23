import type { BackgroundSnapshot, DeviceSettings, ScreenBackground, ScreenTarget } from './types'
import { DEFAULT_DEVICE_SETTINGS, isFontId, isScreenTarget, isScreenUi, resolveSelected, SCREEN_TARGETS } from './types'
import { validateBackground } from './validation'

export type BackgroundRecord =
  | { kind: 'background'; background: ScreenBackground }
  | { kind: 'deleted'; id: string }
  | { kind: 'selection'; target: ScreenTarget; id: string }
  | { kind: 'settings'; target: ScreenTarget; ui: DeviceSettings['ui']; font: string | null }

/** Tombstones must override bundled defaults, including after deployment or refresh. */
export function mergeBackgroundRecords(bundled: ScreenBackground[], records: BackgroundRecord[]): BackgroundSnapshot {
  const merged = new Map(bundled.map(background => [background.id, background]))
  const selected: Partial<Record<ScreenTarget, string>> = {}
  const settings = Object.fromEntries(SCREEN_TARGETS.map(target => [target, { ...DEFAULT_DEVICE_SETTINGS }])) as Record<ScreenTarget, DeviceSettings>
  for (const record of records) {
    if (record.kind === 'background' && validateBackground(record.background)) {
      merged.set(record.background.id, record.background)
    } else if (record.kind === 'deleted' && /^[a-zA-Z0-9_-]{1,100}$/.test(record.id)) {
      merged.delete(record.id)
    } else if (record.kind === 'selection' && isScreenTarget(record.target) && typeof record.id === 'string') {
      selected[record.target] = record.id
    } else if (record.kind === 'settings' && isScreenTarget(record.target) && isScreenUi(record.ui)
      && (record.font === null || isFontId(record.font))) {
      settings[record.target] = { ui: record.ui, font: record.font }
    } else {
      // Never silently resurrect a hidden/deleted preset on damaged remote configuration.
      throw new Error('배경 설정 파일이 올바르지 않습니다. 관리자에게 문의해주세요.')
    }
  }
  const backgrounds = [...merged.values()].sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
  return { backgrounds, selected: resolveSelected(backgrounds, selected), settings }
}
