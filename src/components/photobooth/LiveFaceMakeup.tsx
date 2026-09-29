'use client'

// 촬영 화면 실시간 무대 메이크업 — 카메라 화면 위에 같은 크기·같은 반전으로 겹쳐, 프레임마다 얼굴을 찾아 룩을 입혀 보여준다.
// (인화물은 찍은 원본에 다시 입힌다 — src/lib/booth/face-makeup.ts makeupShot)
// 부스 PC 가 느리면 해상도를 낮추고, 그래도 느리면 띄엄띄엄 그린다. 모델을 못 불러오면 조용히 빠진다(카메라 화면은 그대로).

import { useEffect, useRef } from 'react'
import { paintLiveFrame } from '@/lib/booth/face-makeup'
import type { StageLook } from '@/lib/booth/stage-makeup'

export function LiveFaceMakeup({ getSource, look, className, style }: {
  getSource: () => HTMLCanvasElement | HTMLVideoElement | null
  look: StageLook | null
  className?: string
  style?: React.CSSProperties
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lookRef = useRef(look)
  useEffect(() => {
    lookRef.current = look
  }, [look])

  // 룩이 있고 없음이 바뀔 때만 루프를 새로 돈다(룩끼리 바꿀 때는 lookRef 로 이어서)
  const active = !!look
  useEffect(() => {
    if (!active) return
    let stopped = false
    let edge = 720
    let slow = 0
    const canvas = canvasRef.current
    const run = async () => {
      while (!stopped) {
        const source = getSource()
        const current = lookRef.current
        if (!source || !canvas || !current) { await new Promise((r) => setTimeout(r, 200)); continue }
        const started = performance.now()
        try {
          await paintLiveFrame(source, canvas, current, edge)
          canvas.style.visibility = 'visible'
        } catch (error) {
          console.warn('[booth] 실시간 메이크업 중단:', error)
          canvas.style.visibility = 'hidden'
          return
        }
        const spent = performance.now() - started
        // 한 장에 0.12초 넘게 걸리는 일이 잦으면 해상도를 낮춘다
        slow = spent > 120 ? slow + 1 : Math.max(0, slow - 1)
        if (slow > 6 && edge > 480) { edge = 480; slow = 0 }
        await new Promise((r) => setTimeout(r, Math.max(16, 66 - spent)))
      }
    }
    void run()
    return () => { stopped = true }
  }, [active, getSource])

  if (!look) return null
  return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ visibility: 'hidden', ...style }} />
}
