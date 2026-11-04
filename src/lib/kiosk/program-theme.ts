import type { CSSProperties } from 'react'

export type KioskProgramTheme = 'color' | 'tarot'

/** 운영 모드에만 붙는 표시 테마. 공유 배경 설정을 저장하거나 덮어쓰지 않는다. */
export function kioskProgramTheme(modeId: string): KioskProgramTheme | undefined {
  if (modeId === 'ai-color') return 'color'
  if (modeId === 'ai-tarot') return 'tarot'
  return undefined
}

export function kioskProgramThemeVars(theme: KioskProgramTheme | undefined, localeFont?: string): CSSProperties {
  if (!theme) return {}
  const color = theme === 'color'
  const paper = color ? '#fff8e8' : '#f7f2e8'
  const ink = color ? '#272f73' : '#343a30'
  const accent = color ? '#272f73' : '#59436e'
  const soft = color ? '#586180' : '#656354'
  const line = color ? '#c4c7d9' : '#c8c1b3'
  const font = localeFont ?? 'var(--font-heading-serif), var(--font-wanted), sans-serif'
  return {
    '--paper': paper, '--ink': ink, '--ink-soft': soft, '--line': line,
    '--accent': accent, '--on-accent': '#ffffff', '--accent-soft': color ? '#ecebf4' : '#e2d9ee',
    '--surface': paper, '--surface-strong': paper,
    '--ksk-radius': color ? '4px' : '18px', '--ksk-shadow': 'none',
    '--ksk-body-font': font, '--ksk-display-font': font, '--ksk-display-tracking': '-.035em',
    '--ksk-background-image': 'none', '--rt-wallpaper': 'none', '--rt-desk-base': paper,
    '--rt-body-font': font, '--rt-display-font': font, '--rt-font-body': font,
    '--rt-font-display': font, '--rt-font-pixel': font, '--rt-display-weight': '800',
    '--rt-display-tracking': '-.035em', '--rt-ink': ink, '--rt-ink-soft': soft,
    '--rt-ink-faint': soft, '--rt-face': paper, '--rt-face-alt': paper,
    '--rt-paper': color ? '#fdfdfc' : '#fbf8f1', '--rt-blue-600': accent,
    '--rt-blue-700': accent, '--rt-focus': accent, '--rt-edge': line, '--rt-lo': line,
    '--rt-raised': 'none', '--rt-sunken': 'none', '--rt-drop': 'none',
    '--rt-title-bg': paper, '--rt-title-ink': ink,
  } as CSSProperties
}
