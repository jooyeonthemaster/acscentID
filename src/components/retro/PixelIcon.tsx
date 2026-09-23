// 픽셀 아이콘 — 격자 문자열을 SVG 사각형으로 그린다. 같은 색이 가로로 이어지면 한 칸으로 합친다.
// 장식이 기본이라 aria-hidden 이고 포인터를 받지 않는다(버튼 안에 넣으면 버튼이 받는다).

import { memo } from 'react'
import { PIXEL_ICONS, PIXEL_PALETTE, type PixelIconName } from './pixel-icons'

const rectCache = new Map<PixelIconName, { x: number; y: number; w: number; fill: string }[]>()

function rectsFor(name: PixelIconName) {
  const cached = rectCache.get(name)
  if (cached) return cached
  const rects: { x: number; y: number; w: number; fill: string }[] = []
  PIXEL_ICONS[name].forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.') {
        x += 1
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === ch) end += 1
      rects.push({ x, y, w: end - x, fill: PIXEL_PALETTE[ch] })
      x = end
    }
  })
  rectCache.set(name, rects)
  return rects
}

interface Props {
  name: PixelIconName
  /** 한 변 CSS px — 16의 배수면 칸이 가장 또렷하다 */
  size?: number
  className?: string
  /** 의미가 있는 아이콘(글자 없이 아이콘만 있는 곳)일 때만 준다 */
  label?: string
}

export const PixelIcon = memo(function PixelIcon({ name, size = 32, className, label }: Props) {
  return (
    <svg
      className={className ? `rt-icon ${className}` : 'rt-icon'}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {rectsFor(name).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
})
