// 바탕화면 장식 — 레퍼런스의 세로 아이콘 줄과 창 가장자리에 걸친 픽셀 하트.
// 전부 장식이라 aria-hidden, pointer-events:none — 터치·포커스를 가로채지 않는다.

import { PixelIcon } from './PixelIcon'
import type { PixelIconName } from './pixel-icons'

export function RetroDesktopIcons({
  items,
  className,
}: {
  items: { icon: PixelIconName; label: string }[]
  className?: string
}) {
  return (
    <ul className={`rt-desk${className ? ` ${className}` : ''}`} aria-hidden="true">
      {items.map((item) => (
        <li key={item.label} className="rt-desk-icon">
          <PixelIcon name={item.icon} size={64} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

/** 창 모서리에 걸쳐 놓는 작은 장식(하트·반짝이) — 좌표는 부모 기준 % */
export function RetroStickers({
  items,
}: {
  items: { icon: PixelIconName; top: string; left: string; size?: number; tilt?: number }[]
}) {
  return (
    <div className="rt-stickers" aria-hidden="true">
      {items.map((item, i) => (
        <span
          key={i}
          className="rt-sticker"
          style={{ top: item.top, left: item.left, transform: item.tilt ? `rotate(${item.tilt}deg)` : undefined }}
        >
          <PixelIcon name={item.icon} size={item.size ?? 32} />
        </span>
      ))}
    </div>
  )
}
