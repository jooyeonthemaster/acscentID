import { BACKGROUND_PALETTES, isScreenTarget, type ScreenBackground } from './types'

export function validImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || /[\s"'<>\\]/.test(value)) return false
  if (/^\/assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return true
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}

export function validateBackground(value: unknown): value is ScreenBackground {
  if (!value || typeof value !== 'object') return false
  const b = value as ScreenBackground
  return typeof b.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(b.id) &&
    isScreenTarget(b.target) && typeof b.title === 'string' && !!b.title.trim() && b.title.length <= 80 &&
    validImageUrl(b.image_url) && validImageUrl(b.thumbnail_url) &&
    typeof b.collection === 'string' && b.collection.length <= 80 &&
    BACKGROUND_PALETTES.includes(b.palette) && (b.tone === 'light' || b.tone === 'dark') &&
    [b.ink, b.accent, b.base].every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) &&
    Number.isInteger(b.display_order) && Math.abs(b.display_order) <= 100000 && typeof b.is_active === 'boolean'
}

export const EDITABLE_BACKGROUND_FIELDS = ['title', 'image_url', 'thumbnail_url', 'collection', 'palette', 'tone', 'ink', 'accent', 'base', 'display_order', 'is_active'] as const
