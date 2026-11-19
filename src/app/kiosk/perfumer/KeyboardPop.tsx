'use client'

// 영상판 · 하린 루트 자판 말풍선 — 대화판을 늘리지 않고 이름 칸 위에 뜬다(모양: scent-motion.css .scv-kb).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * 영상판 자판 — 대화판을 늘리지 않고 이름 칸 바로 위에 말풍선으로 뜬다(2026-11-18 사용자 지시). 꼬리가 이름 칸을 가리킨다.
 * 자리는 이름 칸 위치와 자판 높이(언어마다 후보 줄이 붙어 달라진다)로 잰다 — 재기 전에는 숨겨 둔다.
 */
export function KeyboardPop({ children, anchor = '.pf-main:not([data-leave]) .pf-field' }: { children: ReactNode; /** 꼬리가 가리킬 이름 칸 */ anchor?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<{ top: number; tail: number } | null>(null)
  useLayoutEffect(() => {
    const pop = ref.current
    if (!pop) return
    const place = () => {
      const field = document.querySelector(anchor)
      if (!field) return
      const f = field.getBoundingClientRect()
      const box = pop.getBoundingClientRect()
      const gap = parseFloat(getComputedStyle(pop).getPropertyValue('--gap')) || 12
      setAt({ top: Math.max(8, f.top - box.height - gap), tail: Math.max(24, f.left - box.left + 44) })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(pop)
    window.addEventListener('resize', place)
    return () => { ro.disconnect(); window.removeEventListener('resize', place) }
  }, [anchor])
  return (
    <div ref={ref} className="scv-kb" style={at ? { top: at.top, '--tail': `${at.tail}px` } as CSSProperties : { visibility: 'hidden' }}>
      {children}
      <i className="scv-kb-tail" aria-hidden="true" />
    </div>
  )
}
