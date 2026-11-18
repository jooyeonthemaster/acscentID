'use client'
/* eslint-disable @next/next/no-img-element -- 방금 찍은 data: 사진 */

// MAKEUP! 영상판(/kiosk?mode=studio-makeup&lab=video, 2026-11-18) — 패션쇼 백스테이지의 메이크업 아티스트 「이안」 영상 위에서 MAKEUP! 를 그대로 한다.
// 촬영 · 얼굴 찾기 · 화장 그리기 · 머리 모양 바꾸기(/api/kiosk/experience/hairstyle) · 저장은 기본 화면과 같은 useMakeupFlow. 기본 화면(MakeupMode)은 그대로다.
// 장면: start 커튼 → capture · edit 화장대(전구 거울 안이 카메라 · 전후 비교 화면) → 머리 모양을 바꾸는 동안 헤어 스테이션 → 화장대로 돌아옴
//       → result 팔레트를 들고 런웨이 입구로(즉석 사진 안에 완성 사진). 다시 꾸미기는 런웨이 → 화장대, 처음으로는 런웨이 → 커튼.
// 영상 · 계획: src/app/kiosk/video(plans.ts 의 makeup), 원리: .claude/skills/kiosk-video-flow. 대사는 기본 화면의 문구(5개 언어)를 그대로 쓴다.

import { useEffect, type CSSProperties } from 'react'
import { ArrowRight, Camera, Check, ChevronsLeftRight, Download, Home, RotateCcw, Scissors, Undo2, X } from 'lucide-react'
import { HAIR_STYLES } from '@/lib/kiosk/hair-styles'
import { KxCamView, KxLang, KxSaveSheet, KxSpinner } from '../kx'
import { KxVideoStage, preloadPlan, rectStyle } from '@/app/kiosk/video/stage'
import { VIDEO_PROGRAMS } from '@/app/kiosk/video/plans'
import { VideoTalk, useVideoSettle } from '@/app/kiosk/video/ui'
import '@/app/kiosk/video/stage.css'
import { LINERS, MAX_HAIR_AI, PALETTE, PARTS, TOOLS, swatches, useMakeupFlow } from './MakeupMode'
import type { MakeupPart } from './text'
import './makeup.css'

const PROGRAM = VIDEO_PROGRAMS.makeup

export default function MakeupVideo() {
  const { t, k, lang, step, setStep, photo, scene: face, cam, hairBusy, tool, picks, levels, analyze, build, canvasRef, compareRef, drag, final, finish, hairFail, hairMask, hairReady, hairSheet, hairUsed, lookKey, lookName, noFace, restyle, saving, setHairSheet, setLevels, setNoFace, setPicks, setSaving, setScene, setTool, split, stage, wantHair, home } = useMakeupFlow()
  const scene = step === 'start' ? 'curtain' : step === 'result' ? 'runway' : hairBusy ? 'hair' : 'vanity'
  const view = hairBusy ? 'hair' : step
  const { moving, said, onSettle } = useVideoSettle(scene, view)
  useEffect(() => { preloadPlan(PROGRAM.plan) }, [])
  const who = lang === 'ko' ? PROGRAM.guide : 'IAN · makeup artist'
  const mirror = PROGRAM.mirror!

  /** 처음으로 — 결과에서는 이안이 커튼으로 걸어 돌아간다(이어지는 영상). 다른 단계는 화면 틀의 처음으로(새로 시작) */
  const restart = () => { if (step === 'result') setStep('start'); else home() }

  const shown = moving ? said : view
  const line = shown === 'start' ? t.headline : shown === 'capture' ? t.captureTitle : shown === 'finding' ? t.finding : shown === 'edit' ? t.editTitle : shown === 'hair' ? t.hairAiWorking : shown === 'result' ? t.resultTitle : ''

  const body = () => {
    if (shown === 'start') return (
      <button type="button" className="kv-go" onClick={() => { setNoFace(false); setStep('capture') }}>{t.cta}<ArrowRight size={24} strokeWidth={2.3} aria-hidden="true" /></button>
    )
    if (shown === 'capture') return <>
      {noFace && <p className="kv-alert" role="alert"><b>{t.noFace[0]}</b>{t.noFace[1]}</p>}
      <button type="button" className="kv-go" disabled={cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((shot) => void analyze(shot))}>
        <Camera size={24} strokeWidth={1.9} aria-hidden="true" />{t.shoot}
      </button>
    </>
    if (shown === 'edit' && face) {
      const colors = swatches(tool)
      const picked = tool === 'lash' || tool === 'shape' ? 0 : picks[tool]
      const colorName = tool === 'liner' ? t.liners[picked] : tool === 'brow' ? t.brows[picked] : tool === 'hair' ? t.hairs[picked] : tool === 'lash' ? t.lashHint : tool === 'shape' ? t.shapeHint : t.colors[tool][picked]
      return <>
        <div className="mku-tabs" role="tablist">
          {TOOLS.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tool === id} data-on={tool === id || undefined} data-off={levels[id] === 0 || undefined} onClick={() => setTool(id)}>
              {id === 'lip' || id === 'blush' || id === 'eye' ? t.parts[id] : t.tools[id]}
            </button>
          ))}
        </div>
        <div className="mku-swatches" role="radiogroup" aria-label={colorName} key={tool} data-empty={colors.length === 0 || undefined}>
          {colors.map((hex, i) => (
            <button key={`${hex}${i}`} type="button" role="radio" aria-checked={picked === i} aria-label={tool === 'liner' ? t.liners[i] : tool === 'brow' ? t.brows[i] : tool === 'hair' ? t.hairs[i] : t.colors[tool as MakeupPart][i]} data-on={picked === i || undefined} data-wing={(tool === 'liner' && LINERS[i].wing) || undefined} style={{ background: hex, '--i': i } as CSSProperties}
              onClick={() => { setPicks((prev) => ({ ...prev, [tool]: i })); if (levels[tool] === 0) setLevels((prev) => ({ ...prev, [tool]: tool === 'hair' ? 70 : 50 })) }}>
              {picked === i && <Check size={22} strokeWidth={2.6} aria-hidden="true" />}
            </button>
          ))}
          {tool === 'hair' && <button type="button" className="mku-ai" disabled={Boolean(hairBusy)} onClick={() => setHairSheet(true)}><Scissors size={20} strokeWidth={2} aria-hidden="true" />{t.hairAi}</button>}
        </div>
        <p className="mku-color-name" key={`${tool}${picked}${hairFail}`} data-alert={(tool === 'hair' && hairFail) || undefined}>
          {tool === 'hair' && hairFail ? `${t.hairAiFailed[0]} ${t.hairAiFailed[1]}` : tool === 'hair' && wantHair && !hairReady ? t.hairFinding : tool === 'hair' && hairReady && !hairMask ? t.hairNone : colorName}
        </p>
        <label className="mku-level">
          <b>{t.level}</b>
          <input type="range" min={0} max={100} step={5} value={levels[tool]} style={{ '--v': `${levels[tool]}%` } as CSSProperties} onChange={(event) => setLevels((prev) => ({ ...prev, [tool]: Number(event.target.value) }))} />
          <output>{levels[tool]}%</output>
        </label>
        <button type="button" className="kv-go" disabled={Boolean(hairBusy) || !stage} onClick={finish}>{t.toResult}<ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" /></button>
      </>
    }
    if (shown === 'result' && final) return <>
      <ul className="kv-recipe">
        {PARTS.map((id) => <li key={id}><i style={{ background: PALETTE[id][picks[id]] }} /><span>{t.parts[id]}<b>{t.colors[id][picks[id]]}</b></span></li>)}
      </ul>
      <div className="kv-row">
        <button type="button" className="kv-ghost" onClick={() => setStep('edit')}><RotateCcw size={20} aria-hidden="true" />{t.again}</button>
        <button type="button" className="kv-go" onClick={() => setSaving(true)}><Download size={22} aria-hidden="true" />{t.save}</button>
      </div>
    </>
    return null
  }

  // 화장대 거울 안 — 촬영은 실시간 카메라, 얼굴 찾는 동안은 방금 찍은 사진, 편집은 전후 비교(왼쪽 원본 · 오른쪽 적용, 가운데 선을 끌어 비교)
  const atVanity = !moving && scene === 'vanity'
  // 이동 중에는 숨기기만 한다 — 빼면 편집 캔버스가 다시 붙을 때 그려지지 않는다(그리기는 값이 바뀔 때만 돈다)
  const inMirror = step === 'capture' || step === 'finding' || step === 'edit' ? (
    <div className="kv-slot kv-mirror" data-hidden={!atVanity || undefined} style={rectStyle(mirror)} key={step === 'edit' ? 'edit' : 'cam'}>
      {step === 'edit' && photo && face ? (
        <div ref={compareRef} className="mku-compare" style={{ '--split': `${split * 100}%` } as CSSProperties} onPointerDown={drag} onPointerMove={drag}>
          <img src={photo} alt="" draggable={false} />
          <canvas ref={canvasRef} />
          <span className="mku-tag" data-side="left">{t.original}</span>
          <span className="mku-tag" data-side="right">{t.applied}</span>
          <i className="mku-divider" aria-hidden="true"><b><ChevronsLeftRight size={20} strokeWidth={2.2} /></b></i>
        </div>
      ) : (
        <KxCamView cam={step === 'capture' ? cam : null} photo={step === 'finding' ? photo : null} flash={step === 'finding'}>
          {step === 'capture' && <svg className="kx-cam-guide" viewBox="0 0 300 400" aria-hidden="true"><ellipse cx="150" cy="178" rx="92" ry="124" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeDasharray="7 7" /></svg>}
          {step === 'finding' && <p className="mku-finding" role="status"><KxSpinner size={28} />{t.finding}</p>}
        </KxCamView>
      )}
    </div>
  ) : null

  const hairLeft = MAX_HAIR_AI - hairUsed
  return (
    <div className="kv" data-program="makeup" style={{ '--kv-tone': PROGRAM.tone, '--kv-tone-light': PROGRAM.toneLight } as CSSProperties}>
      <KxVideoStage plan={PROGRAM.plan} scene={scene} onSettle={onSettle} art={step === 'result' && !moving ? final : null} inside={inMirror} />
      <div className="kv-top">
        <span className="kv-tag">MAKEUP!</span>
        {!moving && <span key={scene} className="kv-place">{PROGRAM.places[scene]}</span>}
        {step === 'start' ? <KxLang /> : <button type="button" className="kv-home" onClick={restart}><Home size={18} aria-hidden="true" />{t.home}</button>}
      </div>
      {shown && line && (
        <VideoTalk key={moving ? `leave-${said}` : view} who={who} line={line} leave={moving} wait={shown === 'finding' || shown === 'hair'}
          note={shown === 'start' ? t.sub : shown === 'capture' && !noFace ? `${t.tips[0]} · ${t.tips[1]}` : shown === 'result' ? lookName : undefined}
          wide={shown === 'edit'} light={shown === 'edit'}>
          {body()}
        </VideoTalk>
      )}
      {hairSheet && face && (
        <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={t.hairAiTitle} onPointerDown={(event) => { if (event.target === event.currentTarget) setHairSheet(false) }}>
          <div className="kx-sheet-card mku-hair-sheet">
            <button type="button" className="kx-sheet-x" aria-label={k.close} onClick={() => setHairSheet(false)}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
            <h2>{t.hairAiTitle}</h2>
            <p className="kx-sheet-desc">{hairLeft > 0 ? t.hairAiNote.replace('{n}', String(hairLeft)) : t.hairAiLimit}</p>
            <div className="mku-hair-grid">
              {HAIR_STYLES.map((style) => <button key={style} type="button" disabled={hairLeft <= 0} onClick={() => void restyle(style)}><Scissors size={20} strokeWidth={1.8} aria-hidden="true" />{t.hairStyles[style]}</button>)}
            </div>
            {face.base !== face.first.base && <button type="button" className="kx-btn kx-btn--ghost" onClick={() => { setScene({ ...face.first, first: face.first }); setHairSheet(false) }}><Undo2 size={20} strokeWidth={2} aria-hidden="true" />{t.hairBack}</button>}
            <p className="kx-sheet-keep">{t.hairAiPrivacy}</p>
          </div>
        </div>
      )}
      {photo && final && <KxSaveSheet open={saving} cacheKey={`${lang}|${lookKey}|${final.length}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />}
    </div>
  )
}
