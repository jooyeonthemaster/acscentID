import type { BackgroundSnapshot, ScreenBackground, ScreenTarget } from './types'
import { isScreenTarget, resolveSelected } from './types'
import { validateBackground } from './validation'

export type BackgroundRecord =
  | { kind: 'background'; background: ScreenBackground }
  | { kind: 'deleted'; id: string }
  | { kind: 'selection'; target: ScreenTarget; id: string }

/** Tombstones must override bundled defaults, including after deployment or refresh. */
export function mergeBackgroundRecords(bundled: ScreenBackground[], records: BackgroundRecord[]): BackgroundSnapshot {
  const merged = new Map(bundled.map(background => [background.id, background]))
  const selected: Partial<Record<ScreenTarget, string>> = {}
  for (const record of records) {
    if (record.kind === 'background' && validateBackground(record.background)) {
      merged.set(record.background.id, record.background)
    } else if (record.kind === 'deleted' && /^[a-zA-Z0-9_-]{1,100}$/.test(record.id)) {
      merged.delete(record.id)
    } else if (record.kind === 'selection' && isScreenTarget(record.target) && typeof record.id === 'string') {
      selected[record.target] = record.id
    } else {
      // Never silently resurrect a hidden/deleted preset on damaged remote configuration.
      throw new Error('배경 설정 파일이 올바르지 않습니다. 관리자에게 문의해주세요.')
    }
  }
  const backgrounds = [...merged.values()].sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
  return { backgrounds, selected: resolveSelected(backgrounds, selected) }
}
