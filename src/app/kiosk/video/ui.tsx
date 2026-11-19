'use client'

// 영상판 공용 화면 부품 — SIP! 영상판(SipGameMode · sip-game.css)과 같은 짜임(2026-11-18 사용자 지시: COLOR! · DRAW! · MAKEUP! 도 SIP! 기준으로).
//   위 띠(둥근 처음으로 · 가운데 「— 장소」 · 오른쪽 세리프 표시) · 도착하면 가운데 큰 장소 제목 · 유리 대사판(이름 줄 + 타자 효과 대사) ·
//   선택지는 대사판 위에 따로 쌓인 유리 버튼(대사를 다 친 뒤에 떠오른다).
// 대사 · 버튼은 길잡이가 도착(인사 조각이 그려진 때)한 뒤에만 띄우고, 떠날 때는 떠나기 직전 대사판을 한 번 더 그려 가라앉히며 지운다.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Home } from 'lucide-react'
import type { KioskLang } from '@/lib/kiosk/i18n'

/** 장면 도착 — moving: 가야 할 장면에 아직 안 닿음(마저 틀기 + 이동 중). said: 떠나기 직전 단계(가라앉히며 지울 대사판) */
export function useVideoSettle<S extends string>(scene: string, step: S) {
  const [settled, setSettled] = useState<string | null>(null)
  const moving = settled !== scene
  const [said, setSaid] = useState<S | null>(null)
  if (!moving && said !== step) setSaid(step)
  const onSettle = useCallback((at: string) => setSettled(at), [])
  return { moving, said, onSettle }
}

// ───────── 타자 효과(SIP! 와 같은 규칙) — 한글은 자모가 모이는 단계까지(ㅇ → 어 → 어서), 문장 부호 뒤에서 잠깐 쉰다 ─────────
const JAMO_L = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
function strokes(ch: string): string[] {
  const c = ch.charCodeAt(0) - 0xac00
  if (c < 0 || c > 11171) return [ch]
  const l = Math.floor(c / 588), v = Math.floor((c % 588) / 28), t = c % 28
  const lv = String.fromCharCode(0xac00 + l * 588 + v * 28)
  return t ? [JAMO_L[l], lv, ch] : [JAMO_L[l], ch]
}
const TYPE_MS = 26
const SPACE_MS = 60
const PAUSE_MS = 260
/** 키보드로 치듯 — instant 면 바로 전체(떠나는 대사판). 문장이 바뀌면(기다리는 동안 바뀌는 안내) 처음부터 다시 친다 */
export function useTyping(text: string, instant = false) {
  const frames = useMemo(() => {
    const out: [string, number][] = []
    let shown = ''
    for (const ch of text) {
      const st = strokes(ch)
      st.forEach((part, i) => out.push([shown + part, i < st.length - 1 ? TYPE_MS : /[.,!?…~]/.test(ch) ? PAUSE_MS : ch === ' ' ? SPACE_MS : TYPE_MS + 14]))
      shown += ch
    }
    return out
  }, [text])
  const [st, setSt] = useState({ text, n: instant ? Infinity : 0 })
  if (st.text !== text) setSt({ text, n: instant ? Infinity : 0 })
  const n = Math.min(st.n, frames.length)
  const done = n >= frames.length
  // 다음 한 타
  useEffect(() => {
    if (done) return
    const t = window.setTimeout(() => setSt((x) => (x.text === text ? { ...x, n: Math.min(x.n, frames.length) + 1 } : x)), n === 0 ? 260 : frames[n - 1][1])
    return () => window.clearTimeout(t)
  }, [n, done, frames, text])
  return { shown: done ? text : n ? frames[n - 1][0] : '', done, finish: () => setSt({ text, n: Infinity }) }
}

/** 위 띠 — 왼쪽 처음으로(첫 화면에서는 언어 고르기), 가운데 지금 장소, 오른쪽 프로그램 표시 */
export function VideoTop({ mark, place, onHome, homeLabel, start }: { mark: string; place?: string | null; onHome: () => void; homeLabel: string; /** 첫 화면 왼쪽(언어 고르기) */ start?: ReactNode }) {
  return (
    <header className="kv-bar">
      {start ?? <button type="button" className="kv-icon" onClick={onHome} aria-label={homeLabel}><Home size={24} /></button>}
      {place ? <span key={place} className="kv-where">{place}</span> : <span />}
      <span className="kv-mark">{mark}</span>
    </header>
  )
}

/** 바로 앞에 띄운 장소 — 같은 곳 안에서 자세만 바뀔 때(언덕 위 화실: 액자 → 재기) 제목을 다시 띄우지 않는다 */
let lastPlace: string | null = null
/** 도착 — 화면 가운데 큰 장소 제목(떠올랐다 사라진다). 카메라 카드가 떠 있으면 숨긴다(stage.css) */
export function VideoArrive({ en, ko }: { en: string; ko: string }) {
  const [show] = useState(() => lastPlace !== ko)
  useEffect(() => { lastPlace = ko }, [ko])
  if (!show) return null
  return <div className="kv-arrive" aria-hidden="true"><small>{en}</small><b>{ko}</b><i /></div>
}

/**
 * 대사판 — 이름 줄(이름 · 영문 역할) + 타자 효과 대사. children(선택지 · 카메라 · 결과)은 대사를 다 친 뒤 대사판 위에 떠오른다.
 * inside: 도구가 많은 단계(메이크업 편집)는 대사판 안에 — 거울을 가리지 않게
 */
export function VideoTalk({ who, role, line, note, leave = false, wait = false, children, wide = false, light = false, inside = false }: {
  who: string; role?: string; line: string; note?: ReactNode; leave?: boolean; wait?: boolean; children?: ReactNode
  /** 대사판을 아래로 길게(편집 도구처럼 내용이 많은 단계) */
  wide?: boolean
  /** 밝은 유리판 — 밝은 바탕용으로 만든 기존 도구(메이크업 편집)를 그대로 올릴 때 */
  light?: boolean
  inside?: boolean
}) {
  const { shown, done, finish } = useTyping(line, leave)
  const body = children ? <div className="kv-body" inert={leave || undefined}>{children}</div> : null
  return (
    <section className="kv-talk" data-leave={leave || undefined} data-wide={wide || undefined} data-light={light || undefined} aria-live="polite">
      {!inside && done && body}
      <div className="kv-box" onClick={finish}>
        <p className="kv-who"><b>{who}</b>{role && <small>{role}</small>}</p>
        <p className="kv-line" aria-label={line}>{shown}{!done && <i className="kv-caret" />}{wait && done && <span className="kv-wait" aria-label="기다리는 중"><i /><i /><i /></span>}</p>
        {note && done && <p className="kv-note">{note}</p>}
        {inside && body}
      </div>
    </section>
  )
}

// ───────── 시작 화면(SIP! 과 같은 짜임, 2026-11-18 사용자 지시) — 첫 장면 영상 위에 큰 세리프 표시 · 한 줄 소개 · 「터치하여 시작」 ─────────
const PRESS: Record<KioskLang, string> = { ko: '터치하여 시작', en: 'Touch to start', ja: 'タッチしてスタート', 'zh-Hans': '触摸开始', 'zh-Hant': '觸摸開始' }

/** 시작 화면 한 줄 소개 — 프로그램마다 */
export const TITLE_TAG: Record<'color' | 'draw' | 'makeup', Record<KioskLang, string>> = {
  color: { ko: '색의 아틀리에에서, 나의 색 찾기', en: 'Find your colors at the atelier', ja: 'アトリエで、わたしの色さがし', 'zh-Hans': '在色彩工作室，找到你的颜色', 'zh-Hant': '在色彩工作室，找到你的顏色' },
  draw: { ko: '언덕 위 화실의 캐리커처', en: 'A caricature from the hilltop studio', ja: '丘の上のアトリエのカリカチュア', 'zh-Hans': '山丘画室的漫画肖像', 'zh-Hant': '山丘畫室的漫畫肖像' },
  makeup: { ko: '백스테이지에서, 오늘의 룩', en: "Today's look, backstage", ja: 'バックステージで、今日のルック', 'zh-Hans': '在后台，完成今天的妆容', 'zh-Hant': '在後台，完成今天的妝容' },
}

/** 화면 어디를 눌러도 시작. corner: 왼쪽 위(언어 고르기) — 버튼 안에 버튼을 둘 수 없어 따로 띄운다 */
export function VideoTitle({ mark, tag, lang, onStart, corner }: { mark: string; tag: string; lang: KioskLang; onStart: () => void; corner?: ReactNode }) {
  return <>
    <button type="button" className="kv-title" onClick={onStart} aria-label={PRESS[lang]}>
      <span className="kv-title-logo">{mark}</span>
      <span className="kv-title-tag">{tag}</span>
      <span className="kv-title-press">{PRESS[lang]}</span>
    </button>
    {corner && <div className="kv-bar kv-bar--title">{corner}</div>}
  </>
}
