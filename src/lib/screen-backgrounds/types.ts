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
  /** 추천 글꼴(src/lib/screen-fonts/catalog.ts id) — 이 배경을 고르면 기기 글꼴도 이것으로 바뀐다. 이후 기기에서 다시 바꿀 수 있다 */
  font?: string | null
}

/** 기기 화면 디자인 — 기존·레트로·맥 스타일. 관리자가 기기 종류별로 고른다 */
export const SCREEN_UIS = ['retro', 'classic', 'mac'] as const
export type ScreenUi = (typeof SCREEN_UIS)[number]
export const SCREEN_UI_LABELS: Record<ScreenUi, string> = { classic: '기존', retro: '레트로', mac: '맥' }

export interface DeviceSettings {
  ui: ScreenUi
  /** src/lib/screen-fonts/catalog.ts 의 id. null 이면 화면 디자인의 기본 글꼴 */
  font: string | null
  /** 운영 모드 — 키오스크 src/lib/kiosk/modes.ts, 포토부스 src/lib/booth/modes.ts. 없으면 매장 기본 */
  mode?: string | null
  /** 키오스크 사주 한자 글꼴 — 'kaishu'(霞鶩文楷 해서, 기본) · 'gothic'(Noto Sans TC, 이전) */
  hanjaFont?: 'kaishu' | 'gothic'
  /** 키오스크 사주 영수증 — 'sheet'(사주 감정서형, 기본) · 'prescription'(이전 처방전형) */
  receiptStyle?: 'sheet' | 'prescription'
  /** 포토부스 운영 모드별 이용권 필요 여부 (모드 id → true/false). 없는 모드는 기본값 — src/lib/booth/pass-policy.ts */
  pass?: Record<string, boolean>
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = { ui: 'retro', font: null }

export function isScreenUi(value: unknown): value is ScreenUi {
  return value === 'retro' || value === 'classic' || value === 'mac'
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
