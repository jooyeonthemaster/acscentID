'use client'

// 영상판 공용 화면 부품 — 대사판(유리) · 도착 알림. 대사 · 버튼은 길잡이가 도착(인사 조각이 그려진 때)한 뒤에만 띄우고,
// 떠날 때는 떠나기 직전 대사판을 한 번 더 그려 가라앉히며 지운다(kiosk-video-flow references/player.md '도착 알리기').

import { useCallback, useState, type ReactNode } from 'react'

/** 장면 도착 — moving: 가야 할 장면에 아직 안 닿음(마저 틀기 + 이동 중). said: 떠나기 직전 단계(가라앉히며 지울 대사판) */
export function useVideoSettle<S extends string>(scene: string, step: S) {
  const [settled, setSettled] = useState<string | null>(null)
  const moving = settled !== scene
  const [said, setSaid] = useState<S | null>(null)
  if (!moving && said !== step) setSaid(step)
  const onSettle = useCallback((at: string) => setSettled(at), [])
  return { moving, said, onSettle }
}

/** 대사판 — line 은 단어씩 떠오른다. children: 선택지 · 카메라 · 결과 등 */
export function VideoTalk({ who, line, note, leave = false, wait = false, children, wide = false, light = false }: {
  who: string; line: string; note?: ReactNode; leave?: boolean; wait?: boolean; children?: ReactNode
  /** 대사판을 아래로 길게(편집 도구처럼 내용이 많은 단계) */
  wide?: boolean
  /** 밝은 유리판 — 밝은 바탕용으로 만든 기존 도구(메이크업 편집)를 그대로 올릴 때 */
  light?: boolean
}) {
  const words = line.split(' ')
  return (
    <section className="kv-talk" data-leave={leave || undefined} data-wide={wide || undefined} data-light={light || undefined} aria-live="polite">
      <span className="kv-who">{who}</span>
      <p className="kv-line">{words.map((w, i) => <span key={i} style={{ animationDelay: `${leave ? 0 : 120 + i * 60}ms` }}>{w}{i < words.length - 1 ? ' ' : ''}</span>)}</p>
      {note && <p className="kv-note">{note}</p>}
      {wait && <span className="kv-wait" aria-label="기다리는 중"><i /><i /><i /></span>}
      {children && <div className="kv-body" inert={leave || undefined}>{children}</div>}
    </section>
  )
}
