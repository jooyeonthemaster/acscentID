'use client'

/**
 * 부스 화면의 손가락 조작 — 한 손가락은 옮기기, 두 손가락은 크기·각도.
 *
 * 매장 부스는 터치 화면이라 손님이 폰에서 하듯 집어서 키우고 돌리려 한다.
 * 슬라이더만 있으면 "왜 안 되지?" 하고 화면을 문지르다 포기한다.
 *
 * 이 훅은 화면 좌표의 변화량만 알려주고, 그 값을 무엇에 쓸지는 화면이 정한다
 * (편집 화면의 인물 레이어, 최애와 찍기의 크롭 기준점 등).
 * 요소에 `touch-action: none` 이 있어야 브라우저가 스크롤·확대로 가로채지 않는다.
 */

import { useCallback, useRef } from 'react'

export interface GestureDelta {
  /** 중심점 이동량 (요소 화면 좌표, px) */
  dx: number
  dy: number
  /** 배율 변화 (1 = 그대로) */
  scale: number
  /** 회전 변화 (도) */
  rotation: number
  /** 두 손가락 이상인가 */
  pinch: boolean
  /** 기준 요소 크기 — 화면 px 를 캔버스 좌표로 바꿀 때 쓴다 */
  width: number
  height: number
}

interface Anchor {
  cx: number
  cy: number
  distance: number
  angle: number
}

function anchorOf(points: { x: number; y: number }[]): Anchor {
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length
  if (points.length < 2) return { cx, cy, distance: 0, angle: 0 }
  const [a, b] = points
  return {
    cx,
    cy,
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  }
}

/** 두 각도 차이를 -180~180 으로 (359° → 1° 처럼 한 바퀴 튀는 걸 막는다) */
function angleDelta(next: number, prev: number): number {
  let delta = next - prev
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  return delta
}

export function useLayerGestures(onGesture: (delta: GestureDelta) => void, enabled = true) {
  const points = useRef(new Map<number, { x: number; y: number }>())
  const anchor = useRef<Anchor | null>(null)
  const sizeRef = useRef({ width: 1, height: 1 })

  const sync = useCallback(() => {
    const list = [...points.current.values()]
    anchor.current = list.length ? anchorOf(list) : null
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<Element>) => {
      if (!enabled) return
      const box = event.currentTarget.getBoundingClientRect()
      sizeRef.current = { width: box.width || 1, height: box.height || 1 }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      sync()
    },
    [enabled, sync]
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<Element>) => {
      if (!points.current.has(event.pointerId)) return
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const list = [...points.current.values()]
      const next = anchorOf(list)
      const prev = anchor.current
      anchor.current = next
      if (!prev) return
      const pinch = list.length >= 2 && prev.distance > 0 && next.distance > 0
      onGesture({
        dx: next.cx - prev.cx,
        dy: next.cy - prev.cy,
        scale: pinch ? next.distance / prev.distance : 1,
        rotation: pinch ? angleDelta(next.angle, prev.angle) : 0,
        pinch,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
      })
    },
    [onGesture]
  )

  const release = useCallback(
    (event: React.PointerEvent<Element>) => {
      if (!points.current.delete(event.pointerId)) return
      // 손가락 하나를 떼면 남은 손가락 기준으로 다시 잡는다 — 안 그러면 화면이 툭 튄다
      sync()
    },
    [sync]
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
  }
}

/** 인물·사진 레이어 배율 한계 — 얼굴만 크게 담거나 작게 넣는 것까지 손님이 고를 수 있게 넉넉히 */
export const LAYER_SCALE_MIN = 0.05
export const LAYER_SCALE_MAX = 3
/** 최애와 찍기(현장 컷 크롭) 확대 한계 — 2400px 원본이라 3배까지는 인화에서 버틴다 */
export const FIT_ZOOM_MIN = 1
export const FIT_ZOOM_MAX = 3

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** 회전은 한 바퀴 안쪽으로 유지 (슬라이더와 값이 어긋나지 않게) */
export function wrapAngle(value: number): number {
  let angle = value
  while (angle > 180) angle -= 360
  while (angle < -180) angle += 360
  return angle
}
