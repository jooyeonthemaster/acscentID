import collection from './frame-catalog.json'
import { BUNDLED_FRAMES } from './templates'

export interface ManagedFrame {
  id: string
  kind: string
  title: string
  image_url: string
  display_order: number
  event_id: string | null
  is_active: boolean
  category?: string
  thumbnail_url?: string
}

// Fixed UUIDs let the existing assets table store overrides without a schema change.
export const DEFAULT_FRAMES: ManagedFrame[] = [
  ...BUNDLED_FRAMES.map((frame, index) => ({
    ...frame,
    id: `a50f2026-0923-4000-8001-${String(index + 1).padStart(12, '0')}`,
    category: '기존 프레임',
    is_active: true,
  })),
  ...collection,
]
export const FRAME_TOMBSTONE = 'catalog:deleted'
export const getDefaultFrame = (id: string) => DEFAULT_FRAMES.find(frame => frame.id === id)

/** Persisted rows override defaults, including hidden/deleted defaults. Never resurrect them. */
export function mergeFrameCatalog<T extends ManagedFrame>(rows: T[]): (T | ManagedFrame)[] {
  const overrides = new Map(rows.map(row => [row.id, row]))
  return [
    ...DEFAULT_FRAMES.map(frame => ({ ...frame, ...overrides.get(frame.id) })),
    ...rows.filter(row => !getDefaultFrame(row.id)),
  ].filter(frame => frame.image_url !== FRAME_TOMBSTONE)
}

// Only persisted columns: catalog metadata must not be sent to PostgREST.
export function frameOverrideRow(frame: ManagedFrame) {
  return {
    id: frame.id, kind: frame.kind, title: frame.title, image_url: frame.image_url,
    display_order: frame.display_order, event_id: frame.event_id, is_active: frame.is_active,
  }
}
