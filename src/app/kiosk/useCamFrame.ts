'use client'

// 키오스크 촬영 액자의 크기 — 기존·레트로 두 화면이 같이 쓴다.
// 찍히는 사진은 3:4 다(capturePhoto). 액자도 3:4 여야 미리보기에 보이던 그대로 찍힌 것으로 보인다.
// 예전엔 폭만 100% 로 두어서, 화면에 자리가 모자라면 높이만 줄어 넓적한 액자가 됐다 — 넓게 보이던 미리보기가
// 찍는 순간 3:4 로 잘리고, 안내 문구가 사라져 액자까지 커지면서 사진이 1.3~1.5배 확대되어 보였다.

import { useCallback, useLayoutEffect, useState, type SyntheticEvent } from 'react'

/** 카메라 액자 — capturePhoto 가 자르는 비율과 같아야 한다 */
const CAMERA_RATIO = 3 / 4
/** 폰에서 온 사진이 지나치게 길쭉해도 액자가 실처럼 가늘어지지 않게 */
const MIN_RATIO = 0.5
const MAX_RATIO = 2

export interface CamFrameSize {
  width: number
  height: number
}

/**
 * 액자 자리(.ksk-cam-slot) 안에서 비율을 지키는 가장 큰 액자 크기를 잰다.
 * - frozen: 카메라로 찍은 사진을 확인하는 중 — 마지막 크기를 그대로 둔다. 찍기 전 안내가 사라져 자리가 넓어져도
 *   액자가 따라 커지지 않게(다시 찍으면 다시 잰다).
 * - fitPhoto: 폰으로 받은 사진 — 3:4 가 아닐 수 있으니 액자를 그 사진의 비율에 맞춘다(잘리지도, 띠가 생기지도 않게).
 *   비율은 <img onLoad={onPhotoLoad}> 로 받는다.
 */
export function useCamFrame({ frozen, fitPhoto }: { frozen: boolean; fitPhoto: boolean }) {
  // 자리가 화면에 붙고 떨어질 때마다 다시 재야 해서 ref 대신 state 로 받는다
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  const [size, setSize] = useState<CamFrameSize | null>(null)
  const [photoRatio, setPhotoRatio] = useState<number | null>(null)
  const ratio = fitPhoto && photoRatio ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, photoRatio)) : CAMERA_RATIO

  useLayoutEffect(() => {
    if (!slot || frozen) return
    const measure = () => {
      const w = slot.clientWidth
      const h = slot.clientHeight
      if (w <= 0 || h <= 0) return
      const width = Math.floor(Math.min(w, h * ratio))
      const height = Math.floor(width / ratio)
      setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(slot)
    return () => observer.disconnect()
  }, [slot, frozen, ratio])

  const onPhotoLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget
    if (naturalWidth > 0 && naturalHeight > 0) setPhotoRatio(naturalWidth / naturalHeight)
  }, [])

  return { slotRef: setSlot, size, onPhotoLoad }
}
