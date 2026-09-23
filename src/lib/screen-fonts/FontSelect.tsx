import { SCREEN_FONT_CATEGORIES, SCREEN_FONTS, type ScreenFontCategory } from './catalog'

/** 기기·관리자 화면 공용 글꼴 목록 — 종류별로 묶는다. 빈 값은 '기본 글꼴' */
export function ScreenFontSelect({ value, onChange, disabled, className, defaultLabel = '기본 글꼴' }: {
  value: string | null
  onChange: (font: string | null) => void
  disabled?: boolean
  className?: string
  defaultLabel?: string
}) {
  return (
    <select aria-label="화면 글꼴" value={value ?? ''} disabled={disabled} className={className} onChange={event => onChange(event.target.value || null)}>
      <option value="">{defaultLabel}</option>
      {(Object.keys(SCREEN_FONT_CATEGORIES) as ScreenFontCategory[]).map(category => (
        <optgroup key={category} label={SCREEN_FONT_CATEGORIES[category]}>
          {SCREEN_FONTS.filter(font => font.category === category).map(font => <option key={font.id} value={font.id}>{font.label}</option>)}
        </optgroup>
      ))}
    </select>
  )
}
