'use client'

// POST! 우체통 「한통」의 손 — 화면 좌우 가장자리에서 들어오는 남색 소매 + 흰 장갑.
// 포즈 그림(public/assets/post/hands/*.webp)은 왼쪽에서 들어오는 팔로 그렸고(소매 끝이 그림 왼쪽 가장자리에서 잘림),
// 오른쪽 손은 좌우를 뒤집어 쓴다. 팔은 「손끝(grip)을 무대의 어디에 둘지」로 놓는다 — 소매가 늘 화면 밖으로 이어지게.
// grip = 물건을 쥐는(가리키는) 자리, 그림 크기에 대한 비율. 그림을 다시 만들면 이 값을 다시 잰다(손그림_원본/key.py).
import type { CSSProperties, ReactNode } from 'react'

export type Pose = 'hold' | 'fan' | 'point_up' | 'point_down' | 'wave' | 'cup' | 'stamp' | 'pen' | 'phone' | 'salute'

export const POSES: Record<Pose, { w: number; h: number; grip: [number, number] }> = {
  hold: { w: 900, h: 369, grip: [0.749, 0.503] },
  fan: { w: 900, h: 464, grip: [0.928, 0.424] },
  point_up: { w: 900, h: 1118, grip: [0.81, 0.003] },
  point_down: { w: 900, h: 630, grip: [0.974, 0.995] },
  wave: { w: 900, h: 1005, grip: [0.799, 0.003] },
  cup: { w: 900, h: 1022, grip: [0.894, 0.002] },
  stamp: { w: 900, h: 488, grip: [0.714, 0.995] },
  pen: { w: 900, h: 429, grip: [0.996, 0.991] },
  phone: { w: 900, h: 901, grip: [0.805, 0.2] },
  salute: { w: 900, h: 409, grip: [0.91, 0.006] },
}

export const STAGE_W = 1280

/** 팔 하나 — 손끝(gx, gy · 무대 좌표)과 그림 높이 h(px). 오른쪽 손은 gx 를 무대 좌표 그대로 준다 */
export function Arm({ side, pose, gx, gy, h, rot = 0, className, style }: { side: 'l' | 'r'; pose: Pose; gx: number; gy: number; h: number; rot?: number; className?: string; style?: CSSProperties }) {
  const p = POSES[pose]
  const w = (h * p.w) / p.h
  const gxl = side === 'l' ? gx : STAGE_W - gx // 왼쪽 팔이라고 치고 계산한 손끝
  const xl = gxl - p.grip[0] * w
  // 오른쪽: 손끝을 기준점으로 좌우를 뒤집으면 그림이 (2·grip−1)·w 만큼 밀리므로 미리 되돌려 놓는다
  const x = side === 'l' ? xl : STAGE_W - xl - w + w * (2 * p.grip[0] - 1)
  const y = gy - p.grip[1] * h
  const ox = side === 'l' ? p.grip[0] : 1 - p.grip[0]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/assets/post/hands/${pose}.webp`}
      alt=""
      draggable={false}
      className={`po-arm ${className ?? ''}`}
      data-pose={pose}
      style={{
        left: x, top: y, width: w, height: h,
        transform: `${side === 'r' ? 'scaleX(-1) ' : ''}rotate(${rot}deg)`,
        transformOrigin: `${ox * 100}% ${p.grip[1] * 100}%`,
        ...style,
      }}
    />
  )
}

/** 한쪽 손과 그 손이 든 것 — 장면이 바뀌면 화면 끝에서 미끄러져 들어온다 */
export function Side({ side, children, k }: { side: 'l' | 'r'; children: ReactNode; k: string }) {
  return <div key={k} className={`po-side po-side--${side}`}>{children}</div>
}
