export const SCREEN_TARGETS = ['booth', 'kiosk'] as const
export type ScreenTarget = (typeof SCREEN_TARGETS)[number]
export const BACKGROUND_PALETTES = ['wanted', 'jua', 'kirang', 'serif', 'soft'] as const
export type BackgroundPalette = (typeof BACKGROUND_PALETTES)[number]

export interface ScreenBackground {
  id: string
  target: ScreenTarget
  title: string
  image_url: string
  thumbnail_url: string
  collection: string
  palette: BackgroundPalette
  tone: 'light' | 'dark'
  ink: string
  accent: string
  base: string
  display_order: number
  is_active: boolean
}

export interface BackgroundSnapshot {
  backgrounds: ScreenBackground[]
  selected: Record<ScreenTarget, string | null>
}

export function isScreenTarget(value: unknown): value is ScreenTarget {
  return value === 'booth' || value === 'kiosk'
}

export function neutralBackground(target: ScreenTarget): ScreenBackground {
  return {
    id: `${target}-empty`, target, title: '배경 없음',
    image_url: '/assets/screen-backgrounds/empty.svg',
    thumbnail_url: '/assets/screen-backgrounds/empty.svg',
    collection: 'system', palette: 'wanted', tone: 'light',
    ink: '#263949', accent: '#315b77', base: '#f8f6f1', display_order: 0, is_active: true,
  }
}

export function resolveSelected(backgrounds: ScreenBackground[], requested: Partial<Record<ScreenTarget, string | null>>) {
  return Object.fromEntries(SCREEN_TARGETS.map(target => {
    const available = backgrounds.filter(item => item.target === target && item.is_active)
    return [target, available.find(item => item.id === requested[target])?.id ?? available[0]?.id ?? null]
  })) as Record<ScreenTarget, string | null>
}
