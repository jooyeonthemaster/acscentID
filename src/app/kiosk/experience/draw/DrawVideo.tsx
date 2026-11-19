'use client'
/* eslint-disable @next/next/no-img-element -- 방금 찍은 data: 사진 · 화풍 견본 */

// DRAW! 영상판(/kiosk?mode=studio-draw&lab=video, 2026-11-18) — 거리 화가 「모루」가 언덕 위 화실에서 그려 주는 영상 위에서 DRAW! 를 그대로 한다.
// 사진 · 화풍 · 그림 요청(/api/kiosk/experience/caricature) · 포스터 · 영수증은 기본 화면과 같은 useDrawFlow. 기본 화면(DrawMode)은 그대로다.
// 장면: start 계단 골목 → capture 언덕 화실(손가락 프레임 — 카메라 카드) → confirm 연필로 재기 → style 도구 탁자 → drawing 이젤 뒤 → result 이젤을 돌려 캔버스에 그림.
// 영상 · 계획: src/app/kiosk/video(plans.ts 의 draw), 원리: .claude/skills/kiosk-video-flow. 대사는 기본 화면의 문구(5개 언어)를 그대로 쓴다.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight, Camera, Images, Printer, RefreshCw, UserRound, UsersRound } from 'lucide-react'
import { KxCamView, KxLang, KxReceiptSheet, KxSaveSheet } from '../kx'
import { KxVideoStage, preloadPlan } from '@/app/kiosk/video/stage'
import { VIDEO_PROGRAMS } from '@/app/kiosk/video/plans'
import { TITLE_TAG, VideoArrive, VideoTalk, VideoTitle, VideoTop, useVideoSettle } from '@/app/kiosk/video/ui'
import { VIDEO_NOTE, videoReceipt } from '@/app/kiosk/video/video-receipt'
import '@/app/kiosk/video/stage.css'
import { ASSET, LEVELS, STYLES, comboKey, useDrawFlow } from './DrawMode'

const PROGRAM = VIDEO_PROGRAMS.draw
const SCENE = { start: 'steps', capture: 'frame', confirm: 'measure', style: 'tools', drawing: 'paint', result: 'reveal' } as const

export default function DrawVideo() {
  const f = useDrawFlow()
  const { t, c, lang, pc, step, setStep, photo, group, cam, art, arts, left, combo } = f
  const scene = SCENE[step]
  const { moving, said, onSettle } = useVideoSettle(scene, step)
  useEffect(() => { preloadPlan(PROGRAM.plan) }, [])
  const who = lang === 'ko' ? PROGRAM.guideName : 'Moru'
  // 시작 화면(SIP! 처럼) — 누르면 모루의 인사. 결과에서 처음으로 가면 다시 시작 화면
  const [titled, setTitled] = useState(false)
  // 영수증 — 맨 위 도장은 손님의 캐리커처를 그대로 도장처럼(따로 AI 도장을 만들지 않는다, 사용자 지시), 오늘의 그림 · 모루의 한마디 · QR · 모루의 사인
  const receipt = useCallback(() => {
    if (!art) throw new Error('결과가 없습니다')
    return videoReceipt({
      program: 'draw', lang, stamp: art, sections: [
        { kind: 'big', label: "TODAY'S DRAWING", title: t.styles[f.style], pill: t.levels[f.level] },
        { kind: 'note', label: "MORU'S NOTE", text: VIDEO_NOTE.draw[lang] },
      ],
    })
  }, [art, lang, t, f.style, f.level])

  /** 처음으로 — 결과에서는 모루가 계단 골목으로 걸어 내려간다(이어지는 영상). 다른 단계는 화면 틀의 처음으로(새로 시작) */
  const restart = () => {
    if (step !== 'result') { f.home(); return }
    f.setPhoto(null); f.setArts({}); f.setGroup(false); f.setProblem(null); setStep('start'); setTitled(false)
  }

  // 떠나는 동안 그 전 단계 대사판을 가라앉히며 지운다
  const view = moving ? said : step
  const talk = useMemo(() => {
    if (!view) return null
    if (view === 'start') return { line: `${t.headline[0]} ${t.headline[1]}`, note: t.sub }
    if (view === 'capture') return { line: t.captureTitle, note: group ? t.groupHint : `${t.captureDesc} ${t.hairTip}` }
    if (view === 'confirm') return { line: t.confirmTitle, note: t.confirmDesc }
    if (view === 'style') return { line: t.styleTitle }
    if (view === 'drawing') return { line: t.drawingSteps[f.stage], note: t.drawingNote, wait: true }
    return { line: t.resultTitle, note: f.tag }
  }, [view, t, group, f.stage, f.tag])

  const body = () => {
    if (view === 'start') return (
      <button type="button" className="kv-go" onClick={() => { f.setProblem(null); f.setPhoto(null); f.setArts({}); f.setGroup(false); setStep('capture') }}>{t.cta}<ArrowRight size={24} strokeWidth={2.3} aria-hidden="true" /></button>
    )
    if (view === 'capture') return <>
      <div className="kv-seg" role="radiogroup" aria-label={t.captureTitle}>
        <button type="button" role="radio" aria-checked={!group} data-on={!group || undefined} disabled={cam.countdown !== null} onClick={() => f.setGroup(false)}><UserRound size={20} aria-hidden="true" />{t.solo}</button>
        <button type="button" role="radio" aria-checked={group} data-on={group || undefined} disabled={cam.countdown !== null} onClick={() => f.setGroup(true)}><UsersRound size={20} aria-hidden="true" />{t.group}</button>
      </div>
      <button type="button" className="kv-go" disabled={cam.state !== 'ready' || cam.countdown !== null}
        onClick={() => cam.shoot((shot) => { f.setPhoto(shot); f.setArts({}); f.setProblem(null); setStep('confirm') })}>
        <Camera size={24} strokeWidth={2} aria-hidden="true" />{t.shoot}
      </button>
    </>
    if (view === 'confirm' && photo) return <>
      <div className="kv-thumb"><img src={photo} alt="" data-wide={group || undefined} /></div>
      <div className="kv-row">
        <button type="button" className="kv-ghost" onClick={() => setStep('capture')}><RefreshCw size={20} aria-hidden="true" />{t.retake}</button>
        <button type="button" className="kv-go" onClick={() => setStep('style')}>{t.usePhoto}<ArrowRight size={22} aria-hidden="true" /></button>
      </div>
    </>
    if (view === 'style') {
      const blocked = !art && left <= 0
      return <>
        <div className="kv-cards" role="radiogroup" aria-label={t.steps[1]}>
          {STYLES.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={f.style === id} data-on={f.style === id || undefined} onClick={() => { f.setStyle(id); f.setProblem(null) }}>
              <img src={`${ASSET}/draw-style-${id}.webp`} alt="" draggable={false} />
              {arts[comboKey(id, f.level)] && <em>{t.made}</em>}
              <b>{t.styles[id]}</b>
            </button>
          ))}
        </div>
        <div className="kv-seg" role="radiogroup" aria-label={t.levelLabel}>
          {LEVELS.map((id) => <button key={id} type="button" role="radio" aria-checked={f.level === id} data-on={f.level === id || undefined} onClick={() => { f.setLevel(id); f.setProblem(null) }}>{t.levels[id]}</button>)}
        </div>
        {f.problem
          ? <p className="kv-alert" role="alert"><b>{t[f.problem][0]}</b>{t[f.problem][1]}</p>
          : <p className="kv-fine">{blocked ? t.limit : art ? t.levelNotes[f.level] : `${t.levelNotes[f.level]} · ${t.left.replace('{n}', String(left))}`}</p>}
        <button type="button" className="kv-go" disabled={blocked} onClick={() => void f.draw()}>{art ? t.view : t.draw}<ArrowRight size={22} aria-hidden="true" /></button>
      </>
    }
    if (view === 'result') return <>
      <div className="kv-row">
        <button type="button" className="kv-ghost" onClick={() => setStep('style')}><Images size={20} aria-hidden="true" />{t.again}</button>
        {!pc && <button type="button" className="kv-ghost" onClick={() => f.setPrinting(true)}><Printer size={20} aria-hidden="true" />{c.receipt}</button>}
      </div>
      <button type="button" className="kv-go" onClick={() => f.setSaving(true)}>{t.save}<ArrowRight size={22} aria-hidden="true" /></button>
    </>
    return null
  }

  return (
    <div className="kv" style={{ '--kv-tone': PROGRAM.tone, '--kv-tone-light': PROGRAM.toneLight } as CSSProperties}>
      <KxVideoStage plan={PROGRAM.plan} scene={scene} onSettle={onSettle}
        art={step === 'result' && !moving ? art : null} fit={group ? 'contain' : 'cover'} />
      {/* 촬영 — 화가가 손가락 프레임으로 들여다보는 자리에 카메라 카드 */}
      {step === 'capture' && !moving && (
        <figure className="kv-cam-card" data-wide={group || undefined} key={group ? 'wide' : 'tall'}>
          <KxCamView cam={cam} />
        </figure>
      )}
      <i className="kv-shade" aria-hidden="true" />
      {!titled && <VideoTitle mark="DRAW!" tag={TITLE_TAG.draw[lang]} lang={lang} onStart={() => setTitled(true)} corner={<KxLang />} />}
      {titled && <>
      <VideoTop mark="DRAW!" place={moving ? null : PROGRAM.placesKo[scene]} onHome={restart} homeLabel={c.home} start={step === 'start' ? <KxLang /> : undefined} />
      {!moving && scene !== 'reveal' && <VideoArrive key={`a-${scene}`} en={PROGRAM.places[scene]} ko={PROGRAM.placesKo[scene]} />}
      {/* 열쇠는 단계만 — 화풍 · 세기를 바꿀 때마다 대사판이 새로 떠서(타자 · 버튼 다시 올라옴) 리셋처럼 보였다 */}
      {talk && (
        <VideoTalk key={moving ? `leave-${said}` : step} who={who} role={PROGRAM.guideRole} line={talk.line} note={talk.note} wait={talk.wait} leave={moving}>
          {body()}
        </VideoTalk>
      )}
      </>}
      {art && photo && <>
        <KxSaveSheet open={f.saving} cacheKey={`${lang}|${combo}|${art.length}`} build={f.build} onClose={() => f.setSaving(false)} title={t.saveTitle} />
        <KxReceiptSheet open={f.printing} cacheKey={`${lang}|${combo}|${art.length}`} build={f.build} receipt={receipt} onClose={() => f.setPrinting(false)} />
      </>}
    </div>
  )
}
