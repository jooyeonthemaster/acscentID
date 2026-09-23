import type { BackgroundPalette, ScreenBackground } from './types'
import { DEFAULT_RETRO_FONT, findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'

const wanted = 'var(--font-wanted), "Wanted Sans", sans-serif'
const score = 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif'
const fonts: Record<BackgroundPalette, { display: string; body: string; weight: number; tracking: string; label: string }> = {
  wanted: { display: wanted, body: wanted, weight: 800, tracking: '-0.04em', label: 'Wanted Sans' },
  jua: { display: 'var(--font-jua), "Jua", sans-serif', body: score, weight: 400, tracking: '-0.035em', label: 'Jua' },
  kirang: { display: 'var(--font-kirang), "Kirang Haerang", cursive', body: wanted, weight: 400, tracking: '0.01em', label: 'Kirang Haerang' },
  // 'serif'는 옛 명조 조합의 저장값 — 명조를 쓰지 않기로 해 굵은 고딕으로 바꿔 보여준다(저장값은 호환용으로 유지)
  serif: { display: score, body: score, weight: 700, tracking: '-0.035em', label: 'S-Core Dream Bold' },
  soft: { display: score, body: score, weight: 500, tracking: '-0.025em', label: 'S-Core Dream' },
}
const channels = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16))
export function mixColor(first: string, second: string, amount: number) {
  const a = channels(first), b = channels(second)
  return '#' + a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount).toString(16).padStart(2, '0')).join('')
}
function luminance(hex: string) {
  return channels(hex).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
}
export function contrast(first: string, second: string) {
  const a = luminance(first), b = luminance(second)
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}
function readable(color: string, base: string, ink: string) {
  for (let i = 0; i <= 10; i++) {
    const candidate = mixColor(color, ink, i / 10)
    if (contrast(candidate, base) >= 4.5) return candidate
  }
  return ink
}
export function toBoothTheme(background: ScreenBackground) {
  const font = fonts[background.palette] || fonts.wanted
  const { ink, accent, onAccent } = toKioskTheme(background)
  return {
    ...background, ink, accent, onAccent, image: background.image_url, displayFont: font.display, bodyFont: font.body,
    displayWeight: font.weight, displayTracking: font.tracking, fontLabel: font.label,
  }
}
export function toKioskTheme(background: ScreenBackground) {
  const font = fonts[background.palette] || fonts.wanted
  const dark = background.tone === 'dark'
  const fallbackInk = contrast(background.base, '#ffffff') >= contrast(background.base, '#000000') ? '#ffffff' : '#000000'
  const ink = readable(background.ink, background.base, fallbackInk)
  const accent = readable(background.accent, background.base, ink)
  return {
    id: background.id, title: background.title, image: background.image_url,
    displayFont: font.display, bodyFont: font.body, tracking: font.tracking,
    paper: background.base, ink, inkSoft: readable(mixColor(background.base, ink, .65), background.base, ink),
    line: mixColor(background.base, ink, .25), accent,
    onAccent: contrast(accent, '#ffffff') >= contrast(accent, '#18222d') ? '#ffffff' : '#18222d',
    accentSoft: mixColor(background.base, background.accent, .24),
    surface: mixColor(background.base, dark ? '#000000' : '#ffffff', .1),
    surfaceStrong: mixColor(background.base, dark ? '#000000' : '#ffffff', .15),
    shadow: '0 16px 46px rgba(20, 30, 40, 0.12)',
    radius: background.palette === 'kirang' ? '12px' : '24px',
  }
}

/**
 * 레트로 UI(/booth·/kiosk)에서 배경이 맡는 몫.
 *
 * 창·버튼·입력란·진행 표시 같은 기능 UI의 색은 src/components/retro/retro.css 토큰으로 고정한다.
 * 관리자가 고른 배경이 어떤 그림이든 기능 UI의 대비가 같아야 하기 때문이다. 배경 설정은 이렇게만 쓰인다:
 *   image_url → 바탕화면 그림          base  → 그림이 뜨기 전·빈 곳의 바탕색, 바탕화면 글자 받침
 *   ink       → 바탕화면에 바로 놓인 글자(아이콘 이름) — base 대비 4.5:1 로 보정
 *   accent    → 장식색: 창 뒤 겹친 창 테두리 등 (기능 UI에는 쓰지 않는다)
 *   (글꼴은 배경의 palette 가 아니라 기기 설정 settings.font — 없으면 고딕 에스코어드림. 픽셀체는 짧은 영문·숫자 전용)
 *   tone      → 바탕화면 글자 받침의 밝기
 */
export function toRetroDesktop(background: ScreenBackground, fontId?: string | null) {
  const fontKey = findScreenFont(fontId) ? fontId! : DEFAULT_RETRO_FONT
  const family = screenFontFamily(fontKey)!
  const { ink } = toKioskTheme(background)
  return {
    id: background.id,
    title: background.title,
    image: background.image_url,
    tone: background.tone,
    deskBase: background.base,
    deskInk: ink,
    deco: background.accent,
    decoSoft: mixColor(background.accent, '#ffffff', 0.78),
    fontId: fontKey,
    displayFont: family,
    bodyFont: family,
    displayWeight: 700,
    displayTracking: '-0.03em',
    fontLabel: findScreenFont(fontKey)!.label,
  }
}

/** toRetroDesktop 결과를 .rt 루트에 거는 CSS 변수로 — 두 기기가 같은 이름을 쓴다 */
export function retroDesktopVars(desk: ReturnType<typeof toRetroDesktop>, fontOverride?: { display?: string; body?: string }) {
  return {
    '--rt-wallpaper': desk.image ? `url("${desk.image}")` : undefined,
    '--rt-desk-base': desk.deskBase,
    '--rt-desk-ink': desk.deskInk,
    '--rt-deco': desk.deco,
    '--rt-deco-soft': desk.decoSoft,
    '--rt-display-font': fontOverride?.display ?? desk.displayFont,
    '--rt-body-font': fontOverride?.body ?? desk.bodyFont,
    '--rt-display-weight': String(desk.displayWeight),
    '--rt-display-tracking': desk.displayTracking,
  } as Record<string, string | undefined>
}
