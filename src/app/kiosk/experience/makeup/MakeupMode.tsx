'use client'

// 버추얼 메이크업(MAKEUP!) — 정면 사진 → 립·블러셔·아이 색과 농도 → 전후 비교·컬러 레시피·저장. 목업 07-virtual-makeup.
// 얼굴은 그대로 두고 입술·볼·눈두덩에 색 층만 올린다(engine.ts). 사진은 기기 안에서만 쓰고, 받기를 누른 결과만 올라간다.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, Brush, Camera, Check, ChevronsLeftRight, Download, Home, RotateCcw, Sun, UserRound } from 'lucide-react'
import { KX_IDLE, KxActions, KxCamView, KxFoot, KxPage, KxSaveSheet, KxSpinner, KxStart, KxTop, useKx, useKxCamera, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import { canvasBlob, drawCover, fontsReady, kxFontFamily, loadImage, makeCanvas, roundRect } from '../kx-canvas'
import { loadVision, photoCanvas, preloadVision } from '../kx-vision'
import { findFace, renderMakeup, type FaceShape, type MakeupLook } from './engine'
import { MAKEUP_TEXT, type MakeupPart, type MakeupText } from './text'
import './makeup.css'

type Step = 'start' | 'capture' | 'finding' | 'edit' | 'result'
const PARTS: MakeupPart[] = ['lip', 'blush', 'eye']
const PALETTE: Record<MakeupPart, string[]> = {
  lip: ['#d98b78', '#d9788a', '#e0635e', '#c8364a', '#8e3a5e'],
  blush: ['#f2a48f', '#f08f7c', '#e98aa0', '#f3a6c0', '#c98ba8'],
  eye: ['#d8b89a', '#b07a72', '#b59ac6', '#9c6f8a', '#7a5546'],
}

/** 저장용 한 장 — 전후 사진과 이 룩의 색 */
async function drawLookCard(t: MakeupText, before: string, after: string, lookName: string, picks: Record<MakeupPart, number>): Promise<Blob> {
  const family = kxFontFamily()
  await fontsReady(`900 60px ${family}`, `600 30px ${family}`)
  const [a, b] = await Promise.all([loadImage(before), loadImage(after)])
  const W = 1080, H = 1350
  const [canvas, ctx] = makeCanvas(W, H)
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#fbe4da')
  bg.addColorStop(1, '#efdff0')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#4b2447'
  ctx.font = `900 76px Impact, ${family}`
  ctx.fillText('MAKEUP!', 70, 62)
  ctx.font = `800 40px ${family}`
  ctx.textAlign = 'right'
  ctx.fillText(lookName, W - 70, 84)
  ctx.textAlign = 'left'
  const pw = 455, ph = 607, top = 180
  ;[a, b].forEach((image, i) => {
    const x = 70 + i * (pw + 30)
    ctx.save()
    roundRect(ctx, x, top, pw, ph, 18)
    ctx.clip()
    drawCover(ctx, image, x, top, pw, ph, 0.3)
    ctx.restore()
    const label = i === 0 ? t.original : t.applied
    ctx.font = `700 26px ${family}`
    const w = ctx.measureText(label).width + 36
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    roundRect(ctx, x + 16, top + 16, w, 44, 22)
    ctx.fill()
    ctx.fillStyle = '#4b2447'
    ctx.fillText(label, x + 34, top + 25)
  })
  // 이 룩의 컬러
  const cardTop = top + ph + 40
  ctx.fillStyle = 'rgba(255,250,248,0.9)'
  roundRect(ctx, 70, cardTop, W - 140, 400, 24)
  ctx.fill()
  ctx.fillStyle = '#4b2447'
  ctx.font = `800 36px ${family}`
  ctx.textAlign = 'center'
  ctx.fillText(t.paletteTitle, W / 2, cardTop + 34)
  PARTS.forEach((part, i) => {
    const cx = 70 + (W - 140) * (i + 0.5) / 3
    ctx.fillStyle = '#7a5674'
    ctx.font = `600 26px ${family}`
    ctx.fillText(t.parts[part], cx, cardTop + 100)
    ctx.fillStyle = PALETTE[part][picks[part]]
    ctx.beginPath()
    ctx.arc(cx, cardTop + 200, 58, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#4b2447'
    ctx.font = `700 28px ${family}`
    ctx.fillText(t.colors[part][picks[part]], cx, cardTop + 280)
  })
  ctx.fillStyle = '#7a5674'
  ctx.font = `500 24px ${family}`
  ctx.fillText(t.colorNote, W / 2, cardTop + 340)
  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

export default function MakeupMode() {
  const { lang, home } = useKx()
  const t = kxText(MAKEUP_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [photo, setPhoto] = useState<string | null>(null)
  const [scene, setScene] = useState<{ base: HTMLCanvasElement; face: FaceShape } | null>(null)
  const [noFace, setNoFace] = useState(false)
  const [part, setPart] = useState<MakeupPart>('lip')
  const [picks, setPicks] = useState<Record<MakeupPart, number>>({ lip: 2, blush: 0, eye: 2 })
  const [levels, setLevels] = useState<Record<MakeupPart, number>>({ lip: 60, blush: 55, eye: 50 })
  /** 비교선 자리(0~1) — 왼쪽이 원본, 오른쪽이 적용 */
  const [split, setSplit] = useState(0.5)
  const [final, setFinal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cam = useKxCamera(step === 'capture')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const compareRef = useRef<HTMLDivElement>(null)

  useKxScreen(step === 'start' ? 'start' : step === 'finding' || cam.countdown !== null ? 'busy' : saving ? KX_IDLE.save : step === 'capture' ? KX_IDLE.camera : step === 'edit' ? KX_IDLE.edit : KX_IDLE.result)

  // 첫 화면 — 손님이 없는 동안 인식 도구를 받아 둔다. 떠나면 멈춘다
  useEffect(() => {
    if (step !== 'start') return
    let stop = () => {}
    const timer = window.setTimeout(() => { stop = preloadVision('face') }, 2500)
    return () => { window.clearTimeout(timer); stop() }
  }, [step])
  // 촬영 화면에 들어오면 엔진을 준비해 둔다(포즈를 잡는 동안)
  useEffect(() => { if (step === 'capture') void loadVision('face').catch(() => {}) }, [step])

  const analyze = useCallback(async (shot: string) => {
    setPhoto(shot)
    setStep('finding')
    try {
      const base = await photoCanvas(shot, 1080)
      const face = await findFace(base)
      if (!face) { setNoFace(true); setPhoto(null); setStep('capture'); return }
      setScene({ base, face })
      setNoFace(false)
      setSplit(0.5)
      setStep('edit')
    } catch (error) {
      console.error('[kiosk] 얼굴을 찾지 못했습니다:', error)
      setNoFace(true); setPhoto(null); setStep('capture')
    }
  }, [])

  const look: MakeupLook = {
    lip: { color: PALETTE.lip[picks.lip], level: levels.lip / 100 },
    blush: { color: PALETTE.blush[picks.blush], level: levels.blush / 100 },
    eye: { color: PALETTE.eye[picks.eye], level: levels.eye / 100 },
  }
  const lookKey = `${picks.lip}${picks.blush}${picks.eye}|${levels.lip}|${levels.blush}|${levels.eye}`
  // 색·농도가 바뀌면 다음 프레임에 한 번만 다시 그린다(농도를 미는 동안 밀리지 않게)
  useEffect(() => {
    if (step !== 'edit' || !scene || !canvasRef.current) return
    const frame = requestAnimationFrame(() => { if (canvasRef.current) renderMakeup(canvasRef.current, scene.base, scene.face, look) })
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, scene, lookKey])

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = compareRef.current?.getBoundingClientRect()
    if (!box || (event.type === 'pointermove' && !event.currentTarget.hasPointerCapture(event.pointerId))) return
    if (event.type === 'pointerdown') event.currentTarget.setPointerCapture(event.pointerId)
    setSplit(Math.min(0.94, Math.max(0.06, (event.clientX - box.left) / box.width)))
  }
  const finish = () => {
    if (!scene) return
    // 화면에 그려 둔 그림이 아니라 지금 고른 값으로 한 번 더 그려 남긴다
    const [canvas] = makeCanvas(scene.base.width, scene.base.height)
    renderMakeup(canvas, scene.base, scene.face, look)
    setFinal(canvas.toDataURL('image/jpeg', 0.92))
    setStep('result')
  }
  const lookName = t.looks[picks.lip]
  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!photo || !final) throw new Error('결과가 없습니다')
    return [{ name: 'makeup-look.jpg', type: 'image/jpeg', label: t.cardLabel, blob: await drawLookCard(t, photo, final, lookName, picks) }]
  }, [photo, final, t, lookName, picks])

  if (step === 'start') {
    return (
      <KxStart
        brand={t.brand}
        wordmark="MAKEUP!"
        headline={t.headline}
        // eslint-disable-next-line @next/next/no-img-element
        art={<img className="kx-art-blend" src="/assets/kiosk-experiences/makeup-hero.webp" alt="" draggable={false} />}
        cta={t.cta}
        onStart={() => { setNoFace(false); setStep('capture') }}
        foot={t.foot}
      >
        <p>{t.sub}</p>
        <p className="kx-chips">{t.chips.map((chip) => <span key={chip} className="kx-chip">{chip}</span>)}</p>
      </KxStart>
    )
  }

  const stepIndex = step === 'capture' || step === 'finding' ? 0 : step === 'edit' ? 1 : 2
  const head = (
    <>
      <KxTop left={<><span className="kx-mark">MAKEUP!</span><i className="mku-rule" aria-hidden="true" /></>} right={<button type="button" className="mku-home" onClick={home}><Home size={20} strokeWidth={1.9} aria-hidden="true" />{t.home}</button>} />
      <ol className="mku-steps">
        {([Camera, Brush, Download] as const).map((Icon, i) => (
          <li key={i} data-state={i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'todo'}><span><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>{t.steps[i]}</li>
        ))}
      </ol>
    </>
  )

  if (step === 'capture' || step === 'finding') {
    return (
      <KxPage name="makeup-capture">
        {head}
        <h1 className="kx-title">{t.captureTitle}</h1>
        <p className="kx-desc">{t.captureDesc}</p>
        <div className="kx-cam-slot">
          <KxCamView cam={step === 'capture' ? cam : null} photo={step === 'finding' ? photo : null} flash={step === 'finding'}>
            {step === 'capture' && <svg className="kx-cam-guide" viewBox="0 0 300 400" aria-hidden="true"><ellipse cx="150" cy="178" rx="92" ry="124" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeDasharray="7 7" /></svg>}
            {step === 'finding' && <p className="mku-finding" role="status"><KxSpinner size={28} />{t.finding}</p>}
          </KxCamView>
        </div>
        {noFace && step === 'capture'
          ? <p className="mku-alert" role="alert"><b>{t.noFace[0]}</b>{t.noFace[1]}</p>
          : <p className="kx-chips mku-tips"><span className="kx-chip"><UserRound size={18} strokeWidth={1.8} aria-hidden="true" />{t.tips[0]}</span><span className="kx-chip"><Sun size={18} strokeWidth={1.8} aria-hidden="true" />{t.tips[1]}</span></p>}
        <p className="mku-note">{t.captureNote}</p>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide mku-shoot" disabled={step !== 'capture' || cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((shot) => void analyze(shot))}>
          <Camera size={28} strokeWidth={1.9} aria-hidden="true" />{t.shoot}
        </button>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (step === 'edit' && photo) {
    return (
      <KxPage name="makeup-edit">
        {head}
        <h1 className="kx-title">{t.editTitle}</h1>
        <div className="kx-cam-slot">
          <div ref={compareRef} className="mku-compare" style={{ '--split': `${split * 100}%` } as CSSProperties} onPointerDown={drag} onPointerMove={drag}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" draggable={false} />
            <canvas ref={canvasRef} />
            <span className="mku-tag" data-side="left">{t.original}</span>
            <span className="mku-tag" data-side="right">{t.applied}</span>
            <i className="mku-divider" aria-hidden="true"><b><ChevronsLeftRight size={20} strokeWidth={2.2} /></b></i>
          </div>
        </div>
        <p className="mku-caption">{t.editNote}</p>
        <div className="mku-tabs" role="tablist">
          {PARTS.map((id) => <button key={id} type="button" role="tab" aria-selected={part === id} data-on={part === id || undefined} onClick={() => setPart(id)}>{t.parts[id]}</button>)}
        </div>
        {/* 부위를 바꾸면 색 견본이 새로 올라온다 */}
        <div className="mku-swatches" role="radiogroup" aria-label={t.parts[part]} key={part}>
          {PALETTE[part].map((hex, i) => (
            <button key={hex} type="button" role="radio" aria-checked={picks[part] === i} aria-label={t.colors[part][i]} data-on={picks[part] === i || undefined} style={{ background: hex, '--i': i } as CSSProperties}
              onClick={() => setPicks((prev) => ({ ...prev, [part]: i }))}>
              {picks[part] === i && <Check size={24} strokeWidth={2.6} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <p className="mku-color-name" key={`${part}${picks[part]}`}>{t.colors[part][picks[part]]}</p>
        <label className="mku-level">
          <b>{t.level}</b>
          <input type="range" min={0} max={100} step={5} value={levels[part]} style={{ '--v': `${levels[part]}%` } as CSSProperties} onChange={(event) => setLevels((prev) => ({ ...prev, [part]: Number(event.target.value) }))} />
          <output>{levels[part]}%</output>
          <span><em>{t.levelLow}</em><em>{t.levelHigh}</em></span>
        </label>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide mku-shoot" onClick={finish}>{t.toResult}<ArrowRight size={26} strokeWidth={2.2} aria-hidden="true" /></button>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (!photo || !final) return null
  return (
    <KxPage name="makeup-result">
      {head}
      <h1 className="kx-title">{t.resultTitle}</h1>
      <p className="mku-look">{lookName}</p>
      <div className="mku-pair">
        {[photo, final].map((src, i) => (
          <figure key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} />
            <span className="mku-tag" data-side={i === 0 ? 'left' : 'right'}>{i === 0 ? t.original : t.applied}</span>
          </figure>
        ))}
      </div>
      <p className="mku-caption">{t.resultNote}</p>
      <section className="kx-card mku-recipe">
        <h2><i aria-hidden="true" />{t.paletteTitle}<i aria-hidden="true" /></h2>
        <ul>
          {PARTS.map((id) => <li key={id}><em>{t.parts[id]}</em><span style={{ background: PALETTE[id][picks[id]] }} /><b>{t.colors[id][picks[id]]}</b></li>)}
        </ul>
        <p><b>{t.keepFace}</b>{t.colorNote}</p>
      </section>
      <div className="kx-spacer" />
      <KxActions>
        <button type="button" className="kx-btn" onClick={() => setStep('edit')}><RotateCcw size={22} strokeWidth={2} aria-hidden="true" />{t.again}</button>
        <button type="button" className="kx-btn kx-btn--primary" onClick={() => setSaving(true)}><Download size={24} strokeWidth={2.1} aria-hidden="true" />{t.save}</button>
      </KxActions>
      <KxFoot>{t.foot}</KxFoot>
      <KxSaveSheet open={saving} cacheKey={`${lang}|${lookKey}|${photo.length}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
    </KxPage>
  )
}
