'use client'

// SIP!(연말 시상식 소믈리에) 와인 소품 — 코드로 그린 잔 · 병(그림 파일 없음). 색은 nh-sommelier.ts NH_KIND_COLOR.
//   WineGlass  — 잔(스파클링은 플루트). on 이면 와인이 차오르고 물결이 흔들린다(종류 선택지)
//   WineBottle — 결과 카드의 병
//   useWineDrop — 버튼을 누른 자리에 와인 방울이 번진다(이벤트 위임 — 감싼 요소의 onPointerDown 에 단다)
// 움직임은 짧게(0.4~0.9초). 매장 POS 는 prefers-reduced-motion 이 켜져 있어(kiosk-reduced-motion-trap) 그 설정에 묶지 않는다.

import { useCallback, useId, type PointerEvent } from 'react'
import { NH_KIND_COLOR } from '@/lib/kiosk/expansion/nh-sommelier'
import type { NhKindChoice } from '@/lib/kiosk/expansion/nh-sommelier'

const BOWL = 'M14 6 H46 C47 24 44 42 30 50 C16 42 13 24 14 6 Z'
const FLUTE = 'M23 4 H37 C38 24 37 46 30 56 C23 46 22 24 23 4 Z'

export function WineGlass({ kind, on, level = 0.62, size = 64 }: { kind: NhKindChoice; on: boolean; level?: number; size?: number }) {
  const id = useId().replace(/:/g, '')
  if (kind === 'any') return <Grapes on={on} size={size} />
  const flute = kind === 'sparkling'
  const bowl = flute ? FLUTE : BOWL
  const color = NH_KIND_COLOR[kind]
  const top = flute ? 4 : 6, bottom = flute ? 56 : 50
  const surface = bottom - (bottom - top) * level
  return <svg className="ex-nh-glass" data-on={on || undefined} viewBox="0 0 60 100" width={size} height={size * 100 / 60} aria-hidden="true" style={{ ['--wine' as string]: color }}>
    <defs><clipPath id={`b${id}`}><path d={bowl} /></clipPath></defs>
    <g clipPath={`url(#b${id})`}>
      <g className="ex-nh-liquid" style={{ ['--surface' as string]: `${surface}px` }}>
        <path className="ex-nh-wave" d={`M-30 ${surface} q7.5 -3 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 V${bottom + 4} H-30 Z`} fill="var(--wine)" />
        {flute && [0, 1, 2, 3].map((n) => <circle key={n} className="ex-nh-bubble" cx={26 + (n % 2) * 6 + n} cy={bottom - 4} r={1.1} style={{ animationDelay: `${n * 0.35}s` }} />)}
      </g>
    </g>
    <path d={bowl} fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d={`M30 ${bottom} V86 M20 88 H40`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </svg>
}

/** 모두 좋아요 — 포도송이(고르면 알이 차례로 물든다) */
function Grapes({ on, size }: { on: boolean; size: number }) {
  const dots = [[30, 30], [22, 36], [38, 36], [30, 42], [18, 44], [42, 44], [26, 50], [34, 50], [30, 58]]
  return <svg className="ex-nh-glass ex-nh-grapes" data-on={on || undefined} viewBox="0 0 60 100" width={size} height={size * 100 / 60} aria-hidden="true">
    <path d="M30 26 C30 18 34 14 40 12 M30 22 C26 16 20 16 16 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5.6" stroke="currentColor" strokeWidth="1.4" style={{ transitionDelay: `${i * 45}ms` }} />)}
  </svg>
}

/** 병 — 결과 카드 오른쪽. 처음 한 번 기울였다 선다 */
export function WineBottle({ color }: { color: string }) {
  return <svg className="ex-nh-bottle" viewBox="0 0 40 120" aria-hidden="true">
    <path d="M15 4h10v30c0 6 10 12 10 26v54c0 2-2 4-4 4H9c-2 0-4-2-4-4V60c0-14 10-20 10-26z" fill={color} />
    <rect x="8" y="66" width="24" height="28" rx="1.5" fill="#f6f3ec" />
    <path d="M12 76h16M12 82h11" stroke={color} strokeWidth="1.6" />
  </svg>
}

/** 누른 자리에 와인 방울 — 버튼 · 고르기 카드만 */
export function useWineDrop() {
  return useCallback((e: PointerEvent<HTMLElement>) => {
    const target = (e.target as HTMLElement).closest('button')
    if (!target || target.disabled) return
    const box = target.getBoundingClientRect()
    // 키오스크는 화면을 CSS 배율로 키운다 — 화면 좌표를 요소 좌표로 바꾼다
    const sx = target.offsetWidth ? box.width / target.offsetWidth : 1
    const drop = document.createElement('span')
    drop.className = 'ex-nh-drop'
    const r = Math.max(target.offsetWidth, target.offsetHeight)
    drop.style.width = drop.style.height = `${r * 2}px`
    drop.style.left = `${(e.clientX - box.left) / sx - r}px`
    drop.style.top = `${(e.clientY - box.top) / sx - r}px`
    target.appendChild(drop)
    drop.addEventListener('animationend', () => drop.remove(), { once: true })
  }, [])
}
