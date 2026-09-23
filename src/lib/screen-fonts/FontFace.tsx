import { screenFontFaceCss } from './catalog'

/** 고른 글꼴의 @font-face 만 싣는다 — 목록 전체(약 11MB)를 내려받지 않게 */
export function ScreenFontFace({ ids }: { ids: (string | null | undefined)[] }) {
  const css = [...new Set(ids)].map(screenFontFaceCss).join('')
  return css ? <style>{css}</style> : null
}
