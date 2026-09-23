import type { CSSProperties } from 'react'

export const MAC_SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
/** Preserve explicit administrator/language font choices; otherwise use the host system font. */
export function macFontVars(font = MAC_SYSTEM_FONT): CSSProperties {
  return {
    '--rt-body-font': font, '--rt-display-font': font, '--rt-font-pixel': font,
    '--ksk-display-font': font, '--ksk-body-font': font,
    '--rt-display-tracking': '-0.025em', '--ksk-display-tracking': '-0.025em',
  } as CSSProperties
}
