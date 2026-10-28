'use client'

// 노트북 가로 화면 맞추기 — 화면은 1280×780 CSS 픽셀을 기준으로 그리고, 창 크기에 맞춰 통째로 키우거나 줄인다(CSS zoom).
// 노트북마다 배율(125%·150%)과 브라우저 머리 높이가 달라 글자·버튼 크기가 들쭉날쭉하지 않게 — 세로 키오스크가
// 560px 폭으로 그리고 셸이 zoom≈1.93 으로 키우는 것과 같은 방식이다.
// 높이가 기준보다 모자라면 높이에 맞추고(그만큼 폭이 넓어진다), 폭이 모자라면 폭에 맞춘다.

import { useEffect, useState, type CSSProperties } from 'react'

export const PC_BASE_WIDTH = 1280
export const PC_BASE_HEIGHT = 780
const MIN_ZOOM = 0.6
const MAX_ZOOM = 1.7

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight })

/** 루트 요소에 줄 크기·zoom — 꺼져 있으면 undefined(세로 키오스크는 그대로) */
export function usePcFit(on: boolean): CSSProperties | undefined {
  const [size, setSize] = useState(viewport)
  useEffect(() => {
    if (!on) return
    const update = () => setSize(viewport())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [on])
  if (!on) return undefined
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(size.w / PC_BASE_WIDTH, size.h / PC_BASE_HEIGHT)))
  // inset 대신 크기를 직접 준다 — zoom 이 걸린 요소의 크기는 zoom 전 단위라 창 크기를 zoom 으로 나눠야 꼭 맞는다
  return { zoom, top: 0, left: 0, right: 'auto', bottom: 'auto', width: size.w / zoom, height: size.h / zoom }
}
