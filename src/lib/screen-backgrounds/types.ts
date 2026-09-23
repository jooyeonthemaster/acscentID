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

/** 기기 화면 디자인 — 레트로 컴퓨터 UI 또는 레트로 이전의 기존 UI. 관리자가 기기 종류별로 고른다 */
export const SCREEN_UIS = ['retro', 'classic'] as const
export type ScreenUi = (typeof SCREEN_UIS)[number]

export interface DeviceSettings {
  ui: ScreenUi
  /** src/lib/screen-fonts/catalog.ts 의 id. null 이면 화면 디자인의 기본 글꼴 */
  font: string | null
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = { ui: 'retro', font: null }

export function isScreenUi(value: unknown): value is ScreenUi {
  return value === 'retro' || value === 'classic'
}

export function isFontId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9-]{1,40}$/.test(value)
}

export interface BackgroundSnapshot {
  backgrounds: ScreenBackground[]
  selected: Record<ScreenTarget, string | null>
  settings: Record<ScreenTarget, DeviceSettings>
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
