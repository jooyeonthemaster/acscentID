'use client'

// 펀그라운드 체험기 시작 화면(프로그램 고르기) — 설치 기기(32인치 가로 터치스크린 1대, 2026-11-14 가로로 바뀜)의 첫 화면.
// 고른 프로그램은 이 화면 위, 같은 16:9 화면 칸에 띄워 연다(iframe — 부스 프로그램 · 노트북판 진단 · 펀그라운드 전용 화면 모두 가로).
// 위 왼쪽 「프로그램 고르기」로 돌아온다. 펀그라운드 전용 화면은 제 「처음으로」를 누르면 이 화면으로 돌아온다(postMessage 'fg:home').

import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { FG_H, FG_W, FgStage, useFgScale, useSearch } from '@/components/funground/FgStage'
import { DEMO_CLEAN_KEY_PARAM, DEMO_CLEAN_VALUE } from '@/lib/demo-clean'
import {
  PLAN_INFO, fungroundPlanPrograms, fungroundStartHref, fungroundTargetHref,
  type FungroundPlan, type FungroundProgram, type FungroundTarget,
} from '@/lib/funground/demo'
import './start.css'

interface Opened { program: FungroundProgram; target: FungroundTarget; src: string }

function readQuery(search: string) {
  const q = new URLSearchParams(search)
  const plan: FungroundPlan = q.get('plan') === 'b' ? 'b' : 'a'
  const key = q.get('demo') === DEMO_CLEAN_VALUE ? q.get(DEMO_CLEAN_KEY_PARAM) ?? undefined : undefined
  return { plan, cleanKey: key }
}

/** 시작 화면 타일 아래 한 줄 — AI 표기 규칙: B안은 테마 포토(AI 인물 인식) · 퍼스널 컬러(AI 인식 기반)만 'AI' */
const kindLine = (p: FungroundProgram) => p.badges[0]

export function FungroundStart() {
  const search = useSearch()
  const state = useMemo(() => (search ? readQuery(search) : null), [search])
  const [opened, setOpened] = useState<Opened | null>(null)
  const scale = useFgScale()

  const close = useCallback(() => setOpened(null), [])
  // 띄운 화면에도 제 DEMO 워터마크가 있다 — 이 화면 것은 그동안 숨겨 두 겹으로 깔리지 않게(start.css body.fgs-open)
  useEffect(() => {
    document.body.classList.toggle('fgs-open', Boolean(opened))
    return () => document.body.classList.remove('fgs-open')
  }, [opened])
  // 펀그라운드 전용 화면의 「처음으로」 → 이 시작 화면으로
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data === 'fg:home') close()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [close])

  const programs = useMemo(() => (state ? fungroundPlanPrograms(state.plan) : []), [state])
  if (!state) return null
  const open = (program: FungroundProgram, target: FungroundTarget) => {
    const src = fungroundTargetHref(target, state.cleanKey)
    // 전용 화면은 시작 화면에서 열렸음을 알린다(처음으로 → 시작 화면)
    setOpened({ program, target, src: target.kind === 'screen' ? `${src}&from=start` : src })
  }

  // 모든 프로그램을 시작 화면과 같은 자리 · 크기(16:9 화면 칸)에
  const frame: CSSProperties = { width: FG_W * scale, height: FG_H * scale, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  // 「프로그램 고르기」 — 화면 칸 위에 빈 띠가 있으면(16:10 노트북 등) 그 띠에, 없으면 화면 칸 왼쪽 아래 구석에(프로그램의 「처음으로」를 가리지 않게)
  const gap = typeof window === 'undefined' ? 0 : (window.innerHeight - FG_H * scale) / 2
  const back: CSSProperties = gap >= 44 ? { top: Math.max(2, gap / 2 - 20), left: `max(8px, calc(50% - ${(FG_W * scale) / 2}px))` } : { bottom: 8, left: 8 }

  return (
    <>
      <FgStage className="fgs" tone={state.plan === 'a' ? '#ff6b2c' : '#18a874'}>
        <section className="fgs-hero">
          <p className="fg-kicker">{state.plan === 'a' ? 'AI PHOTO · AI TEST' : 'PHOTO · PLAY · TEST'}</p>
          <h1 className="fg-title">오늘은 뭐 하고<br />놀아 볼까?</h1>
          <p className="fg-lead">하고 싶은 체험을 눌러 주세요</p>
        </section>
        <ul className="fgs-grid" data-count={programs.length}>
          {programs.map((p) => (
            <li key={p.key} style={{ '--fgs-tone': p.color } as CSSProperties}>
              {p.targets.length === 1 ? (
                <button type="button" className="fgs-tile" onClick={() => open(p, p.targets[0])}>
                  <span className="fgs-tag">{p.tag}</span>
                  <b>{p.name}</b>
                  <span className="fgs-kind">{kindLine(p)}</span>
                </button>
              ) : (
                <div className="fgs-tile fgs-tile--pick">
                  <span className="fgs-tag">{p.tag}</span>
                  <b>{p.name}</b>
                  <span className="fgs-kind">{p.note}</span>
                  <span className="fgs-picks">
                    {p.targets.map((t) => <button key={t.id} type="button" onClick={() => open(p, t)}>{t.label}</button>)}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <footer className="fgs-foot">
          <span>{PLAN_INFO[state.plan].title} · {PLAN_INFO[state.plan].quote}</span>
          <a href={fungroundStartHref(state.plan === 'a' ? 'b' : 'a', state.cleanKey)}>{state.plan === 'a' ? 'B안' : 'A안'} 시작 화면 보기</a>
        </footer>
      </FgStage>

      {opened && (
        <div className="fgs-overlay">
          <iframe
            key={opened.src}
            src={opened.src}
            title={opened.program.name}
            style={frame}
            allow="camera; microphone; fullscreen; clipboard-write"
          />
          {/* 펀그라운드 전용 화면은 제 「처음으로」가 이 화면으로 돌아온다 — 머리의 로고를 가리지 않게 단추를 따로 두지 않는다 */}
          {opened.target.kind !== 'screen' && (
            <button type="button" className="fgs-back" style={back} onClick={close}>
              <ArrowLeft size={20} strokeWidth={2.6} aria-hidden="true" />프로그램 고르기
            </button>
          )}
        </div>
      )}
    </>
  )
}
