import type { BackgroundPalette, ScreenBackground } from './types'

const wanted = 'var(--font-wanted), "Wanted Sans", sans-serif'
const score = 'var(--font-score-dream), "Apple SD Gothic Neo", sans-serif'
const fonts: Record<BackgroundPalette, { display: string; body: string; weight: number; tracking: string; label: string }> = {
  wanted: { display: wanted, body: wanted, weight: 800, tracking: '-0.04em', label: 'Wanted Sans' },
  jua: { display: 'var(--font-jua), "Jua", sans-serif', body: score, weight: 400, tracking: '-0.035em', label: 'Jua' },
  kirang: { display: 'var(--font-kirang), "Kirang Haerang", cursive', body: wanted, weight: 400, tracking: '0.01em', label: 'Kirang Haerang' },
  serif: { display: 'var(--font-noto-serif-kr), "Noto Serif KR", serif', body: score, weight: 600, tracking: '-0.035em', label: 'Noto Serif KR' },
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
