'use client'

// 네일 디자이너(NAIL!) — 손 사진 → 패턴·베이스 컬러·마감 → 완성 디자인·색상표·저장. 목업 01-nail-designer.
// 손 모양은 그대로 두고 손톱 자리에만 색 층을 올린다(engine.ts). 사진은 기기 안에서만 쓰고, 받기를 누른 결과만 올라간다.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Camera, Check, Download, Eye, Hand, Heart, Minus, Plus, RotateCcw, Sparkles, Sun } from 'lucide-react'
import { KX_IDLE, KxCamView, KxFoot, KxHome, KxPage, KxSaveSheet, KxSpinner, KxStart, KxSteps, KxTop, useKx, useKxCamera, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import { canvasBlob, fontsReady, kxFontFamily, loadImage, makeCanvas, roundRect } from '../kx-canvas'
import { loadVision, photoCanvas, preloadVision } from '../kx-vision'
import { drawNailSample, findNails, NAIL_VIEW_RATIO, renderNails, type HandShape, type NailDesign, type NailPattern } from './engine'
import { fillNames, NAIL_TEXT, type NailColor, type NailText } from './text'
import './nail.css'

type Step = 'start' | 'capture' | 'finding' | 'edit' | 'result'
const PATTERNS: NailPattern[] = ['solid', 'french', 'ombre', 'glitter']
const COLOR_IDS: NailColor[] = ['rose', 'burgundy', 'cream', 'nude']
const COLORS: Record<NailColor, string> = { rose: '#d4758c', burgundy: '#6f1d35', cream: '#f3e6d6', nude: '#e6b5a2' }
/** 베이스에 어울리는 포인트 색 — 손님은 베이스만 고른다 */
const POINT: Record<NailColor, NailColor> = { rose: 'burgundy', burgundy: 'cream', cream: 'burgundy', nude: 'rose' }
const GOLD = '#e3c184'
const SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.3]
/** 손톱이 이만큼은 보여야 디자인을 입힌다 */
const MIN_NAILS = 3

/** 작은 손톱 견본 — 고른 색·패턴 그대로 */
function NailSample({ design, size = 26 }: { design: NailDesign; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { pattern, base, point, glossy } = design
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ratio = 2
    canvas.width = Math.round(size * 1.24 * ratio)
    canvas.height = Math.round(size * 1.74 * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawNailSample(ctx, canvas.width / 2, canvas.height / 2, size * ratio, { pattern, base, point, glossy, scale: 1 })
  }, [pattern, base, point, glossy, size])
  return <canvas ref={ref} className="nl-sample" style={{ width: size * 1.24, height: size * 1.74 }} aria-hidden="true" />
}

/** 저장용 한 장 — 디자인을 입힌 손 사진, 이름, 색상표, 손톱 견본 */
async function drawNailCard(t: NailText, image: string, names: { name: string; desc: string; base: string; point: string | null; pattern: string; finish: string }, design: NailDesign, pointHex: string | null): Promise<Blob> {
  const family = kxFontFamily()
  await fontsReady(`900 60px ${family}`, `600 30px ${family}`)
  const photo = await loadImage(image)
  const W = 1080, H = 1350
  const [canvas, ctx] = makeCanvas(W, H)
  ctx.fillStyle = '#fdf7ed'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#b98a94'
  ctx.lineWidth = 2
  ctx.strokeRect(28, 28, W - 56, H - 56)
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#6c1f31'
  ctx.font = `900 84px Impact, ${family}`
  ctx.fillText('NAIL!', 70, 66)
  ctx.textAlign = 'right'
  ctx.font = `800 46px ${family}`
  ctx.fillText(names.name, W - 70, 72)
  ctx.fillStyle = '#8a5361'
  ctx.font = `500 26px ${family}`
  ctx.fillText(names.desc, W - 70, 132)
  ctx.textAlign = 'left'
  // 손 사진(5:4)
  const pw = W - 140, ph = pw / NAIL_VIEW_RATIO, top = 196
  ctx.save()
  roundRect(ctx, 70, top, pw, ph, 20)
  ctx.clip()
  ctx.drawImage(photo, 70, top, pw, ph)
  ctx.restore()
  // 손톱 견본 다섯 개 + 색상표
  const cardTop = top + ph + 34, cardH = H - cardTop - 70
  ctx.fillStyle = '#fffaf3'
  roundRect(ctx, 70, cardTop, pw, cardH, 20)
  ctx.fill()
  ctx.strokeStyle = '#e3c9cd'
  ctx.stroke()
  const sampleW = 62
  for (let i = 0; i < 5; i++) drawNailSample(ctx, 150 + i * 92, cardTop + cardH / 2 - 8, sampleW * (i === 0 || i === 4 ? 0.86 : 1), design, i)
  ctx.fillStyle = '#8a5361'
  ctx.font = `600 24px ${family}`
  ctx.textAlign = 'center'
  ctx.fillText(`${names.pattern} · ${names.finish}`, 150 + 2 * 92, cardTop + cardH - 54)
  ctx.textAlign = 'left'
  const swatches: [string, string][] = [[design.base, `${t.baseTag} · ${names.base}`]]
  if (pointHex && names.point) swatches.push([pointHex, `${t.pointTag} · ${names.point}`])
  swatches.forEach(([hex, label], i) => {
    const y = cardTop + cardH / 2 + (i - (swatches.length - 1) / 2) * 96
    ctx.fillStyle = hex
    ctx.beginPath()
    ctx.arc(660, y, 36, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(108,31,49,0.25)'
    ctx.stroke()
    ctx.fillStyle = '#5e1a2c'
    ctx.font = `700 30px ${family}`
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 716, y + 2)
    ctx.textBaseline = 'top'
  })
  ctx.fillStyle = '#8a5361'
  ctx.font = `500 22px ${family}`
  ctx.textAlign = 'center'
  ctx.fillText(t.colorNote, W / 2, H - 62)
  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

export default function NailMode() {
  const { lang } = useKx()
  const t = kxText(NAIL_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [photo, setPhoto] = useState<string | null>(null)
  const [scene, setScene] = useState<{ base: HTMLCanvasElement; hand: HandShape } | null>(null)
  const [problem, setProblem] = useState<'noHand' | 'fewNails' | null>(null)
  const [pattern, setPattern] = useState<NailPattern>('french')
  const [color, setColor] = useState<NailColor>('rose')
  const [glossy, setGlossy] = useState(true)
  const [scale, setScale] = useState(1)
  const [showOriginal, setShowOriginal] = useState(false)
  const [final, setFinal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cam = useKxCamera(step === 'capture')
  const viewRef = useRef<HTMLCanvasElement>(null)
  const originalRef = useRef<HTMLCanvasElement>(null)
  /** 사진 전체 크기의 작업용 그림 — 화면에는 손 둘레만 잘라 보여 준다 */
  const work = useRef<HTMLCanvasElement | null>(null)

  useKxScreen(step === 'start' ? 'start' : step === 'finding' || cam.countdown !== null ? 'busy' : saving ? KX_IDLE.save : step === 'capture' ? KX_IDLE.camera : step === 'edit' ? KX_IDLE.edit : KX_IDLE.result)

  // 첫 화면 — 손님이 없는 동안 인식 도구를 받아 둔다. 떠나면 멈춘다
  useEffect(() => {
    if (step !== 'start') return
    let stop = () => {}
    const timer = window.setTimeout(() => { stop = preloadVision('hand') }, 2500)
    return () => { window.clearTimeout(timer); stop() }
  }, [step])
  // 촬영 화면에 들어오면 엔진을 준비해 둔다(손을 올리는 동안)
  useEffect(() => { if (step === 'capture') void loadVision('hand').catch(() => {}) }, [step])

  const analyze = useCallback(async (shot: string) => {
    setPhoto(shot)
    setStep('finding')
    const retry = (reason: 'noHand' | 'fewNails') => { setProblem(reason); setPhoto(null); setStep('capture') }
    try {
      const base = await photoCanvas(shot, 1280)
      const hand = await findNails(base)
      if (!hand) return retry('noHand')
      if (hand.nails.length < MIN_NAILS) return retry('fewNails')
      setScene({ base, hand })
      setProblem(null)
      setScale(1)
      setShowOriginal(false)
      setStep('edit')
    } catch (error) {
      console.error('[kiosk] 손을 찾지 못했습니다:', error)
      retry('noHand')
    }
  }, [])

  const point = pattern === 'solid' ? null : pattern === 'glitter' ? null : POINT[color]
  const design: NailDesign = { pattern, base: COLORS[color], point: COLORS[POINT[color]], glossy, scale }
  const designKey = `${pattern}|${color}|${glossy ? 1 : 0}|${scale}`

  /** 지금 고른 디자인으로 그려, 손 둘레만 잘라 target 에 담는다 */
  const paint = useCallback((target: HTMLCanvasElement, withDesign: boolean) => {
    if (!scene) return
    const { base, hand } = scene
    const { view } = hand
    const width = Math.round(Math.min(view.w, 1100)), height = Math.round(width / NAIL_VIEW_RATIO)
    if (target.width !== width) target.width = width
    if (target.height !== height) target.height = height
    let source = base
    if (withDesign) {
      work.current ??= document.createElement('canvas')
      renderNails(work.current, base, hand, design)
      source = work.current
    }
    target.getContext('2d')!.drawImage(source, view.x, view.y, view.w, view.h, 0, 0, width, height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, designKey])

  // 원본은 사진이 바뀔 때 한 번, 디자인은 고른 값이 바뀔 때마다 다음 프레임에 한 번
  useEffect(() => { if (step === 'edit' && originalRef.current) paint(originalRef.current, false) }, [step, scene, paint])
  useEffect(() => {
    if (step !== 'edit' || !viewRef.current) return
    const frame = requestAnimationFrame(() => { if (viewRef.current) paint(viewRef.current, true) })
    return () => cancelAnimationFrame(frame)
  }, [step, paint])

  const finish = () => {
    if (!scene) return
    const [canvas] = makeCanvas(10, 10)
    paint(canvas, true)
    setFinal(canvas.toDataURL('image/jpeg', 0.92))
    setStep('result')
  }

  const names = {
    name: fillNames(t.name, { base: t.colors[color], pattern: t.patterns[pattern] }),
    combo: fillNames(t.combo[pattern], { base: t.colors[color], point: t.colors[POINT[color]] }),
    desc: fillNames(t.desc[pattern], { base: t.colors[color], point: t.colors[POINT[color]] }),
    base: t.colors[color],
    point: pattern === 'glitter' ? t.glitterTag : point ? t.colors[point] : null,
    pattern: t.patterns[pattern],
    finish: glossy ? t.finishes.glossy : t.finishes.matte,
  }
  const pointHex = pattern === 'glitter' ? GOLD : point ? COLORS[point] : null
  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!final) throw new Error('결과가 없습니다')
    return [{ name: 'nail-design.jpg', type: 'image/jpeg', label: t.cardLabel, blob: await drawNailCard(t, final, names, design, pointHex) }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [final, t, designKey])

  if (step === 'start') {
    return (
      <KxStart
        brand={t.brand}
        wordmark="NAIL!"
        headline={t.headline}
        // eslint-disable-next-line @next/next/no-img-element
        art={<img className="kx-art-blend" src="/assets/kiosk-experiences/nail-hero.webp" alt="" draggable={false} />}
        cta={t.cta}
        onStart={() => { setProblem(null); setStep('capture') }}
        foot={t.foot}
      >
        <p>{t.sub}</p>
        <p className="kx-chips">{t.chips.map((chip) => <span key={chip} className="kx-chip">{chip}</span>)}</p>
      </KxStart>
    )
  }

  const head = (
    <>
      <KxTop left={<span className="kx-mark">NAIL!</span>} right={<KxHome />} />
      <KxSteps labels={t.steps} current={step === 'capture' || step === 'finding' ? 0 : step === 'edit' ? 1 : 2} />
    </>
  )
  const corners = (['tl', 'tr', 'bl', 'br'] as const).map((pos) => <i key={pos} className="kx-cam-corner" data-pos={pos} aria-hidden="true" />)

  if (step === 'capture' || step === 'finding') {
    return (
      <KxPage name="nail-capture">
        {head}
        <h1 className="kx-title">{t.captureTitle}</h1>
        <p className="kx-desc">{t.captureDesc}</p>
        <div className="kx-cam-slot">
          <KxCamView cam={step === 'capture' ? cam : null} photo={step === 'finding' ? photo : null} flash={step === 'finding'}>
            {step === 'capture' && (
              <Hand className="nl-guide" strokeWidth={0.42} aria-hidden="true" />
            )}
            {step === 'finding' && <p className="nl-finding" role="status"><KxSpinner size={28} />{t.finding}</p>}
          </KxCamView>
        </div>
        {problem && step === 'capture'
          ? <p className="nl-alert" role="alert"><b>{t[problem][0]}</b>{t[problem][1]}</p>
          : (
            <p className="kx-chips nl-tips">
              <span className="kx-chip"><Hand size={18} strokeWidth={1.8} aria-hidden="true" />{t.tips[0]}</span>
              <span className="kx-chip"><Sun size={18} strokeWidth={1.8} aria-hidden="true" />{t.tips[1]}</span>
              <span className="kx-chip"><Heart size={18} strokeWidth={1.8} aria-hidden="true" />{t.tips[2]}</span>
            </p>
          )}
        <p className="nl-note"><i aria-hidden="true" />{t.captureNote}<i aria-hidden="true" /></p>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide nl-go" disabled={step !== 'capture' || cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((shot) => void analyze(shot))}>
          <Camera size={30} strokeWidth={1.9} aria-hidden="true" />{t.shoot}
        </button>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (step === 'edit' && scene) {
    const scaleIndex = SCALES.indexOf(scale)
    return (
      <KxPage name="nail-edit">
        {head}
        <h1 className="kx-title">{t.editTitle}</h1>
        <p className="nl-name" key={names.combo}>{names.combo}</p>
        <div className="nl-view-slot">
          <div className="nl-view">
            <canvas ref={originalRef} />
            <canvas ref={viewRef} data-hidden={showOriginal || undefined} />
            {/* 디자인이 바뀔 때마다 빛이 한 번 지나간다 */}
            {!showOriginal && <i key={designKey} className="nl-sweep" aria-hidden="true" />}
            {corners}
            <button type="button" className="nl-toggle" aria-pressed={showOriginal} onClick={() => setShowOriginal((v) => !v)}>
              <Eye size={17} strokeWidth={2} aria-hidden="true" />{showOriginal ? t.showDesign : t.showOriginal}
            </button>
          </div>
        </div>
        <p className="nl-caption">
          <span data-warn={scene.hand.palm || undefined}>{scene.hand.palm ? t.palmHint : t.editNote}</span>
          <button type="button" onClick={() => { setPhoto(null); setStep('capture') }}><RotateCcw size={15} strokeWidth={2.2} aria-hidden="true" />{t.retake}</button>
        </p>
        <div className="nl-patterns" role="radiogroup" aria-label={t.patternLabel}>
          {PATTERNS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={pattern === id} data-on={pattern === id || undefined} onClick={() => setPattern(id)}>
              <NailSample design={{ ...design, pattern: id }} size={15} />{t.patterns[id]}
            </button>
          ))}
        </div>
        <p className="nl-label"><b>{t.baseLabel}</b><i aria-hidden="true" /></p>
        <div className="nl-colors" role="radiogroup" aria-label={t.baseLabel}>
          {COLOR_IDS.map((id, i) => (
            <button key={id} type="button" role="radio" aria-checked={color === id} data-on={color === id || undefined} style={{ '--i': i } as CSSProperties} onClick={() => setColor(id)}>
              <span style={{ background: COLORS[id] }} data-light={id === 'cream' || id === 'nude' || undefined}>{color === id && <Check size={24} strokeWidth={2.6} aria-hidden="true" />}</span>
              {t.colors[id]}
            </button>
          ))}
        </div>
        <div className="nl-options">
          <div className="nl-seg" role="radiogroup" aria-label={t.finishLabel}>
            <em>{t.finishLabel}</em>
            <button type="button" role="radio" aria-checked={glossy} data-on={glossy || undefined} onClick={() => setGlossy(true)}>{t.finishes.glossy}</button>
            <button type="button" role="radio" aria-checked={!glossy} data-on={!glossy || undefined} onClick={() => setGlossy(false)}>{t.finishes.matte}</button>
          </div>
          <div className="nl-size">
            <em>{t.sizeLabel}</em>
            <button type="button" aria-label={t.sizeDown} disabled={scaleIndex <= 0} onClick={() => setScale(SCALES[scaleIndex - 1])}><Minus size={20} strokeWidth={2.4} aria-hidden="true" /></button>
            <button type="button" aria-label={t.sizeUp} disabled={scaleIndex >= SCALES.length - 1} onClick={() => setScale(SCALES[scaleIndex + 1])}><Plus size={20} strokeWidth={2.4} aria-hidden="true" /></button>
          </div>
        </div>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide nl-go" onClick={finish}>{t.toResult}<ArrowRight size={26} strokeWidth={2.2} aria-hidden="true" /></button>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (!final) return null
  return (
    <KxPage name="nail-result">
      {head}
      <h1 className="kx-title">{t.resultTitle}</h1>
      <p className="nl-name" data-big>{names.name}</p>
      <p className="kx-desc">{names.desc}</p>
      <div className="nl-view-slot">
        <div className="nl-view" data-result>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={final} alt="" draggable={false} />
          {corners}
        </div>
      </div>
      <section className="nl-info">
        <h2><b>{t.selectedTitle}</b><i aria-hidden="true" /></h2>
        <ul>
          <li><NailSample design={design} size={20} /><span><em>{t.patternLabel}</em><b>{names.pattern}</b></span></li>
          <li><Sparkles size={26} strokeWidth={1.6} aria-hidden="true" /><span><em>{t.finishLabel}</em><b>{names.finish}</b></span></li>
        </ul>
      </section>
      <section className="nl-info">
        <h2><b>{t.paletteTitle}</b><i aria-hidden="true" /></h2>
        <ul data-palette>
          <li><i style={{ background: COLORS[color] }} /><span><em>{t.baseTag}</em><b>{names.base}</b></span></li>
          {pointHex && names.point && <li><i style={{ background: pointHex }} /><span><em>{t.pointTag}</em><b>{names.point}</b></span></li>}
        </ul>
        <p>{t.colorNote}</p>
      </section>
      <button type="button" className="kx-btn kx-btn--wide nl-again" onClick={() => setStep('edit')}>{t.again}</button>
      <button type="button" className="kx-btn kx-btn--primary kx-btn--wide nl-go" onClick={() => setSaving(true)}><Download size={26} strokeWidth={2.1} aria-hidden="true" />{t.save}</button>
      <KxFoot>{t.foot}</KxFoot>
      <KxSaveSheet open={saving} cacheKey={`${lang}|${designKey}|${final.length}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
    </KxPage>
  )
}
