import { SAJU_ELEMENT_INFO, type SajuElement } from '@/types/analysis'

interface SajuClickerElementBadgeProps {
  element: SajuElement
  size?: 'compact' | 'default' | 'large'
  showLabel?: boolean
  className?: string
  title?: string
}

function ElementMotif({ element, color }: { element: SajuElement; color: string }) {
  const commonProps = {
    fill: 'none',
    stroke: color,
    strokeWidth: 2.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (element) {
    case '목':
      return (
        <g {...commonProps}>
          <path d="M17 47V41L23 36L32 41L41 36L47 41V47" />
          <path d="M23 47V38M32 49V39M41 47V38" />
        </g>
      )
    case '화':
      return (
        <g {...commonProps}>
          <path d="M32 49C25 47 23 42 27 36C28 40 31 41 31 34C38 39 41 44 36 49" />
          <path d="M32 47C29 44 30 41 32 39C35 42 36 45 32 47Z" />
        </g>
      )
    case '토':
      return (
        <g {...commonProps}>
          <path d="M17 48H47M20 44H44M23 40H41" />
          <path d="M26 40V36H38V40M32 36V32" />
        </g>
      )
    case '금':
      return (
        <g {...commonProps}>
          <path d="M17 48L24 39L31 46L38 36L47 48" />
          <path d="M24 39L27 44M31 46L35 41L38 48" />
        </g>
      )
    case '수':
      return (
        <g {...commonProps}>
          <path d="M17 37C21 33 25 33 29 37C33 41 37 41 41 37C43 35 45 34 47 34" />
          <path d="M17 43C21 39 25 39 29 43C33 47 37 47 41 43C43 41 45 40 47 40" />
          <path d="M20 49C24 46 27 46 31 49C35 52 39 52 44 48" />
        </g>
      )
  }
}

/**
 * 실물 디퓨저 클리커의 정오각형 상판을 축소 재현한 용신 오행 배지.
 * 색은 SAJU_ELEMENT_INFO를 따르고, 한자 아래 문양은 실물 각인을 단순화했다.
 */
export function SajuClickerElementBadge({
  element,
  size = 'default',
  showLabel = true,
  className = '',
  title,
}: SajuClickerElementBadgeProps) {
  const info = SAJU_ELEMENT_INFO[element]
  if (!info) return null

  const isCompact = size === 'compact'
  const faceClass =
    size === 'large'
      ? 'h-16 w-16 lg:h-[72px] lg:w-[72px]'
      : isCompact
        ? 'h-7 w-7'
        : 'h-11 w-11 lg:h-12 lg:w-12'
  const labelClass = isCompact ? 'text-[10px]' : 'text-[11px] lg:text-[13px]'
  const accessibleLabel = `용신 ${element}, 한자 ${info.hanja}`

  return (
    <span
      role="img"
      aria-label={accessibleLabel}
      title={title || accessibleLabel}
      data-testid="saju-clicker-element-badge"
      className={`inline-flex shrink-0 items-center gap-1 align-middle ${className}`}
    >
      <span className={`inline-flex shrink-0 ${faceClass}`} aria-hidden="true">
        <svg
          viewBox="0 0 64 64"
          className="h-full w-full overflow-visible"
          focusable="false"
          style={{ filter: 'drop-shadow(0 3px 2px rgba(0, 0, 0, 0.34))' }}
        >
          {/* 3D 프린트 몸체의 두께 */}
          <polygon
            points="32,8 58,26 50,60 14,60 6,26"
            fill="#050C10"
            stroke="#14242B"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* 어두운 펄 상판과 오행색 이중 림 */}
          <polygon
            points="32,3 57,21 49,55 15,55 7,21"
            fill="#101A1F"
            stroke="#263A43"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon
            points="32,9 51,23 44,49 20,49 13,23"
            fill="#0A1419"
            stroke={info.onDark}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M14 23L32 10L50 23"
            fill="none"
            stroke={info.color}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.72"
          />

          {/* 실물처럼 상단 한자 + 하단 오행별 선각 */}
          <text
            x="32"
            y="28"
            textAnchor="middle"
            fill={info.onDark}
            fontFamily="'Noto Serif KR', 'Noto Serif CJK KR', serif"
            fontSize="17"
            fontWeight="900"
          >
            {info.hanja}
          </text>
          <ElementMotif element={element} color={info.onDark} />
        </svg>
      </span>

      {showLabel && (
        <span
          aria-hidden="true"
          className={`${labelClass} font-black leading-none break-keep`}
          style={{ color: info.onCream }}
        >
          {element}
        </span>
      )}
    </span>
  )
}
