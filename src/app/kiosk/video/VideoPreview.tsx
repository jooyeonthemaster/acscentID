'use client'

// 키오스크 영상판 흐름 미리보기(/kiosk/video/<프로그램>, 2026-11-18) — 프로그램 단계를 대사 · 버튼으로 넘기며 길잡이 인물 영상이 끊김 없이 이어지는지 본다.
// 카메라 · AI 는 부르지 않는다(촬영은 버튼, AI 기다림은 정해 둔 시간, 결과는 견본 그림). 실제 프로그램 영상판은 /kiosk-demo/video 에서 연다.

import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'
import { KxVideoStage, preloadPlan } from './stage'
import { VIDEO_PROGRAMS, type KxVideoProgram } from './plans'
import { VideoTalk, useVideoSettle } from './ui'

export function VideoPreview({ id }: { id: KxVideoProgram }) {
  const program = VIDEO_PROGRAMS[id]
  const [step, setStep] = useState(program.first)
  const [pick, setPick] = useState<string | null>(null)
  const cur = program.steps[step]
  const { moving, said, onSettle } = useVideoSettle(cur.scene, step)

  useEffect(() => { preloadPlan(program.plan) }, [program])
  // AI 기다림 — 도착한 뒤부터 잰다(이동 시간이 누른 때에 따라 달라서)
  useEffect(() => {
    if (moving || !cur.wait) return
    const { ms, go } = cur.wait
    const t = window.setTimeout(() => setStep(go), ms)
    return () => window.clearTimeout(t)
  }, [moving, cur])

  const shown = moving ? (said ? program.steps[said] : null) : cur
  const showArt = !moving && cur.scene === program.plan.surface?.scene

  return (
    <main className="kv kv--page" style={{ '--kv-tone': program.tone, '--kv-tone-light': program.toneLight } as CSSProperties}>
      <KxVideoStage plan={program.plan} scene={cur.scene} onSettle={onSettle} art={showArt ? program.art(pick) : null} />
      <div className="kv-top">
        <span className="kv-tag">{program.tag}</span>
        {!moving && <span key={cur.scene} className="kv-place">{program.places[cur.scene]}</span>}
        <Link className="kv-home" href="/kiosk/video">목록</Link>
      </div>
      {shown && (
        <VideoTalk key={moving ? `leave-${said}` : step} who={program.guide} line={shown.line} note={shown.note} leave={moving} wait={Boolean(shown.wait)}>
          {shown.choices && (
            <div className="kv-choices" data-cols={shown.cols}>
              {shown.choices.map((c) => (
                <button key={c.label} type="button" data-main={c.main || undefined} onClick={() => { if (c.pick) setPick(c.pick); setStep(c.go) }}>{c.label}</button>
              ))}
            </div>
          )}
        </VideoTalk>
      )}
    </main>
  )
}
