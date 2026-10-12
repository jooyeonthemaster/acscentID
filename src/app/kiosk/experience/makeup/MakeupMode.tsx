'use client'

// 버추얼 메이크업(MAKEUP!) — 정면 사진 → 립·블러셔·섀도·아이라인·속눈썹·눈썹·얼굴형·헤어 → 전후 비교·컬러 레시피·저장. 목업 07-virtual-makeup.
// 색조·선·얼굴형 보정·머리 색은 기기 안에서 사진 위에 올린다(engine.ts). 머리 '모양'을 바꾸는 것만 서버의 이미지 생성을 쓴다
// (건당 비용 — 사진 한 장에 두 번까지). 사진은 그때만 쓰고 저장하지 않으며, 받기를 누른 결과만 올라간다.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, Brush, Camera, Check, ChevronsLeftRight, Download, Home, RotateCcw, Scissors, Sun, Undo2, UserRound, X } from 'lucide-react'
import { HAIR_STYLES, type HairStyle } from '@/lib/kiosk/hair-styles'
import { KX_IDLE, KxActions, KxCamView, KxFoot, KxPage, KxSaveSheet, KxSpinner, KxStart, KxTop, useKx, useKxCamera, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import { canvasBlob, drawCover, fontsReady, kxFontFamily, loadImage, makeCanvas, roundRect } from '../kx-canvas'
import { loadVision, photoCanvas, preloadVision } from '../kx-vision'
import { beautify, findFaceMarks, findHair, renderMakeup, shapeOf, type FaceShape, type MakeupLook } from './engine'
import { MAKEUP_TEXT, type MakeupExtra, type MakeupPart, type MakeupText, type MakeupTool } from './text'
import './makeup.css'

type Step = 'start' | 'capture' | 'finding' | 'edit' | 'result'
interface Point { x: number; y: number }
const PARTS: MakeupPart[] = ['lip', 'blush', 'eye']
const TOOLS: MakeupTool[] = ['lip', 'blush', 'eye', 'liner', 'lash', 'brow', 'shape', 'hair']
const PALETTE: Record<MakeupPart, string[]> = {
  lip: ['#d98b78', '#d9788a', '#e0635e', '#c8364a', '#8e3a5e'],
  blush: ['#f2a48f', '#f08f7c', '#e98aa0', '#f3a6c0', '#c98ba8'],
  eye: ['#d8b89a', '#b07a72', '#b59ac6', '#9c6f8a', '#7a5546'],
}
/** 아이라인 — 브라운 · 블랙 · 눈꼬리를 뺀 블랙 */
const LINERS = [{ color: '#4a3026', wing: false }, { color: '#1c1917', wing: false }, { color: '#1c1917', wing: true }]
const BROWS = ['#8a6a55', '#5b4336', '#6f6a66', '#2b2523']
const HAIRS = ['#2a2320', '#5a3d2b', '#8a6b52', '#a35a3a', '#d58aa8', '#e8c9a0']
/** 견본이 있는 도구의 색 목록 */
const swatches = (tool: MakeupTool): string[] => (tool === 'liner' ? LINERS.map((item) => item.color) : tool === 'brow' ? BROWS : tool === 'hair' ? HAIRS : tool === 'lash' || tool === 'shape' ? [] : PALETTE[tool])
/** 머리 모양 바꾸기는 그릴 때마다 생성 비용이 든다 — 사진 한 장에 이만큼 */
const MAX_HAIR_AI = 2
type Picks = Record<Exclude<MakeupTool, 'lash' | 'shape'>, number>
type Levels = Record<MakeupTool, number>
const START_PICKS: Picks = { lip: 2, blush: 0, eye: 2, liner: 0, brow: 0, hair: 1 }
/** 처음 보이는 룩 — 색조에 은은한 선과 보정. 머리 색은 손님이 켠다 */
const START_LEVELS: Levels = { lip: 60, blush: 55, eye: 50, liner: 45, lash: 45, brow: 35, shape: 35, hair: 0 }

/** 저장용 한 장 — 전후 사진과 이 룩의 색 */
async function drawLookCard(t: MakeupText, before: string, after: string, lookName: string, picks: Picks, extras: string[]): Promise<Blob> {
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
  ctx.fillText(t.paletteTitle, W / 2, cardTop + 30)
  PARTS.forEach((part, i) => {
    const cx = 70 + (W - 140) * (i + 0.5) / 3
    ctx.fillStyle = '#7a5674'
    ctx.font = `600 26px ${family}`
    ctx.fillText(t.parts[part], cx, cardTop + 92)
    ctx.fillStyle = PALETTE[part][picks[part]]
    ctx.beginPath()
    ctx.arc(cx, cardTop + 184, 54, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#4b2447'
    ctx.font = `700 28px ${family}`
    ctx.fillText(t.colors[part][picks[part]], cx, cardTop + 254)
  })
  ctx.fillStyle = '#4b2447'
  ctx.font = `700 25px ${family}`
  if (extras.length) ctx.fillText(`${t.extrasTitle} · ${extras.join(' · ')}`, W / 2, cardTop + 308)
  ctx.fillStyle = '#7a5674'
  ctx.font = `500 23px ${family}`
  ctx.fillText(t.colorNote, W / 2, cardTop + 350)
  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

/** 서버로 보낼 사진 — 긴 변 1024 */
function shrink(canvas: HTMLCanvasElement): string {
  const scale = Math.min(1, 1024 / Math.max(canvas.width, canvas.height))
  const [small, ctx] = makeCanvas(Math.round(canvas.width * scale), Math.round(canvas.height * scale))
  ctx.drawImage(canvas, 0, 0, small.width, small.height)
  return small.toDataURL('image/jpeg', 0.88)
}

export default function MakeupMode() {
  const { lang, home, t: k } = useKx()
  const t = kxText(MAKEUP_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [photo, setPhoto] = useState<string | null>(null)
  /** 화장을 올릴 사진과 그 얼굴의 특징점 — 머리 모양을 바꾸면 새 사진으로 갈아 끼운다(first 는 처음 찍은 것) */
  const [scene, setScene] = useState<{ base: HTMLCanvasElement; marks: Point[]; first: { base: HTMLCanvasElement; marks: Point[] } } | null>(null)
  /** 얼굴형 보정을 입힌 사진 — 보정 정도가 바뀔 때만 다시 만든다 */
  const [stage, setStage] = useState<{ canvas: HTMLCanvasElement; face: FaceShape; of: HTMLCanvasElement; level: number } | null>(null)
  const [noFace, setNoFace] = useState(false)
  const [tool, setTool] = useState<MakeupTool>('lip')
  const [picks, setPicks] = useState<Picks>(START_PICKS)
  const [levels, setLevels] = useState<Levels>(START_LEVELS)
  /** 머리카락 자리 — 헤어 탭을 열 때 찾는다 */
  const [hair, setHair] = useState<{ of: HTMLCanvasElement; mask: HTMLCanvasElement | null } | null>(null)
  const [hairSheet, setHairSheet] = useState(false)
  const [hairBusy, setHairBusy] = useState<HairStyle | null>(null)
  const [hairFail, setHairFail] = useState(false)
  const [hairUsed, setHairUsed] = useState(0)
  /** 비교선 자리(0~1) — 왼쪽이 원본, 오른쪽이 적용 */
  const [split, setSplit] = useState(0.5)
  const [final, setFinal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cam = useKxCamera(step === 'capture')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const compareRef = useRef<HTMLDivElement>(null)

  useKxScreen(step === 'start' ? 'start' : step === 'finding' || hairBusy || cam.countdown !== null ? 'busy' : saving || hairSheet ? KX_IDLE.save : step === 'capture' ? KX_IDLE.camera : step === 'edit' ? KX_IDLE.edit : KX_IDLE.result)

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
      const marks = await findFaceMarks(base)
      if (!marks) { setNoFace(true); setPhoto(null); setStep('capture'); return }
      setScene({ base, marks, first: { base, marks } })
      setStage(null)
      setHair(null)
      setHairUsed(0)
      setPicks(START_PICKS)
      setLevels(START_LEVELS)
      setTool('lip')
      setNoFace(false)
      setSplit(0.5)
      setStep('edit')
    } catch (error) {
      console.error('[kiosk] 얼굴을 찾지 못했습니다:', error)
      setNoFace(true); setPhoto(null); setStep('capture')
    }
  }, [])

  // 얼굴형 보정 — 픽셀을 옮기는 일이라 정도가 바뀔 때만, 다음 프레임에 한 번
  const shapeLevel = levels.shape
  useEffect(() => {
    if (step !== 'edit' || !scene) return
    if (stage && stage.of === scene.base && stage.level === shapeLevel) return
    const frame = requestAnimationFrame(() => {
      const made = beautify(scene.base, scene.marks, shapeLevel / 100)
      setStage({ canvas: made.canvas, face: shapeOf(made.marks), of: scene.base, level: shapeLevel })
    })
    return () => cancelAnimationFrame(frame)
  }, [step, scene, shapeLevel, stage])

  // 머리카락 자리 — 헤어 탭을 처음 열 때(모델이 커서 그때 받는다)
  const wantHair = step === 'edit' && Boolean(scene) && (tool === 'hair' || levels.hair > 0)
  const hairReady = Boolean(scene && hair && hair.of === scene.base)
  useEffect(() => {
    if (!wantHair || !scene || hairReady) return
    let alive = true
    const base = scene.base
    findHair(base)
      .then((mask) => { if (alive) setHair({ of: base, mask }) })
      .catch((error) => { console.error('[kiosk] 머리카락을 찾지 못했습니다:', error); if (alive) setHair({ of: base, mask: null }) })
    return () => { alive = false }
  }, [wantHair, scene, hairReady])
  const hairMask = scene && hair && hair.of === scene.base ? hair.mask : null

  const look: MakeupLook = {
    lip: { color: PALETTE.lip[picks.lip], level: levels.lip / 100 },
    blush: { color: PALETTE.blush[picks.blush], level: levels.blush / 100 },
    eye: { color: PALETTE.eye[picks.eye], level: levels.eye / 100 },
    brow: { color: BROWS[picks.brow], level: levels.brow / 100 },
    liner: { ...LINERS[picks.liner], level: levels.liner / 100 },
    lash: { level: levels.lash / 100 },
    hair: { color: HAIRS[picks.hair], level: levels.hair / 100 },
  }
  const lookKey = `${Object.values(picks).join('')}|${Object.values(levels).join(',')}`
  // 색·농도가 바뀌면 다음 프레임에 한 번만 다시 그린다(농도를 미는 동안 밀리지 않게)
  useEffect(() => {
    if (step !== 'edit' || !stage || !canvasRef.current) return
    const frame = requestAnimationFrame(() => { if (canvasRef.current) renderMakeup(canvasRef.current, stage.canvas, stage.face, look, hairMask) })
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stage, lookKey, hairMask])

  /** 머리 모양 바꾸기 — 처음 찍은 사진을 보내 머리만 바꾼 사진을 받아, 그 사진을 새 바탕으로 삼는다 */
  const restyle = useCallback(async (style: HairStyle) => {
    if (!scene || hairBusy) return
    setHairSheet(false)
    setHairFail(false)
    setHairBusy(style)
    try {
      const response = await fetch('/api/kiosk/experience/hairstyle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: shrink(scene.first.base), style }),
        signal: AbortSignal.timeout(130_000),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || typeof result?.image !== 'string') throw new Error(result?.error || 'hairstyle failed')
      const base = await photoCanvas(result.image, 1080)
      const marks = await findFaceMarks(base)
      if (!marks) throw new Error('no face in result')
      setScene({ base, marks, first: scene.first })
      setHairUsed((n) => n + 1)
    } catch (error) {
      console.error('[kiosk] 머리 모양을 바꾸지 못했습니다:', error)
      setHairFail(true)
    } finally {
      setHairBusy(null)
    }
  }, [scene, hairBusy])

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = compareRef.current?.getBoundingClientRect()
    if (!box || (event.type === 'pointermove' && !event.currentTarget.hasPointerCapture(event.pointerId))) return
    if (event.type === 'pointerdown') event.currentTarget.setPointerCapture(event.pointerId)
    setSplit(Math.min(0.94, Math.max(0.06, (event.clientX - box.left) / box.width)))
  }
  const finish = () => {
    if (!stage) return
    // 화면에 그려 둔 그림이 아니라 지금 고른 값으로 한 번 더 그려 남긴다
    const [canvas] = makeCanvas(stage.canvas.width, stage.canvas.height)
    renderMakeup(canvas, stage.canvas, stage.face, look, hairMask)
    setFinal(canvas.toDataURL('image/jpeg', 0.92))
    setStep('result')
  }
  const lookName = t.looks[picks.lip]
  const extras = (['liner', 'lash', 'brow', 'shape', 'hair'] as MakeupExtra[]).filter((id) => levels[id] > 0 && (id !== 'hair' || hairMask)).map((id) => t.tools[id])
  if (scene && scene.base !== scene.first.base && !extras.includes(t.tools.hair)) extras.push(t.tools.hair)
  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!photo || !final) throw new Error('결과가 없습니다')
    return [{ name: 'makeup-look.jpg', type: 'image/jpeg', label: t.cardLabel, blob: await drawLookCard(t, photo, final, lookName, picks, extras) }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, final, t, lookName, lookKey])

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

  if (step === 'edit' && photo && scene) {
    const colors = swatches(tool)
    const picked = tool === 'lash' || tool === 'shape' ? 0 : picks[tool]
    const colorName = tool === 'liner' ? t.liners[picked] : tool === 'brow' ? t.brows[picked] : tool === 'hair' ? t.hairs[picked] : tool === 'lash' ? t.lashHint : tool === 'shape' ? t.shapeHint : t.colors[tool][picked]
    const restyled = scene.base !== scene.first.base
    const hairLeft = MAX_HAIR_AI - hairUsed
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
            {hairBusy && <p className="mku-working" role="status"><KxSpinner size={30} /><span>{t.hairAiWorking}</span></p>}
          </div>
        </div>
        <div className="mku-tabs" role="tablist">
          {TOOLS.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tool === id} data-on={tool === id || undefined} data-off={levels[id] === 0 || undefined} onClick={() => setTool(id)}>
              {id === 'lip' || id === 'blush' || id === 'eye' ? t.parts[id] : t.tools[id]}
            </button>
          ))}
        </div>
        {/* 도구를 바꾸면 색 견본이 새로 올라온다 */}
        <div className="mku-swatches" role="radiogroup" aria-label={colorName} key={tool} data-empty={colors.length === 0 || undefined}>
          {colors.map((hex, i) => (
            <button key={`${hex}${i}`} type="button" role="radio" aria-checked={picked === i} aria-label={tool === 'liner' ? t.liners[i] : tool === 'brow' ? t.brows[i] : tool === 'hair' ? t.hairs[i] : t.colors[tool as MakeupPart][i]} data-on={picked === i || undefined} data-wing={(tool === 'liner' && LINERS[i].wing) || undefined} style={{ background: hex, '--i': i } as CSSProperties}
              onClick={() => { setPicks((prev) => ({ ...prev, [tool]: i })); if (levels[tool] === 0) setLevels((prev) => ({ ...prev, [tool]: tool === 'hair' ? 70 : 50 })) }}>
              {picked === i && <Check size={22} strokeWidth={2.6} aria-hidden="true" />}
            </button>
          ))}
          {tool === 'hair' && (
            <button type="button" className="mku-ai" disabled={Boolean(hairBusy)} onClick={() => setHairSheet(true)}><Scissors size={20} strokeWidth={2} aria-hidden="true" />{t.hairAi}</button>
          )}
        </div>
        <p className="mku-color-name" key={`${tool}${picked}${hairFail}`} data-alert={(tool === 'hair' && hairFail) || undefined}>
          {tool === 'hair' && hairFail ? `${t.hairAiFailed[0]} ${t.hairAiFailed[1]}` : tool === 'hair' && wantHair && !hairReady ? t.hairFinding : tool === 'hair' && hairReady && !hairMask ? t.hairNone : colorName}
        </p>
        <label className="mku-level">
          <b>{t.level}</b>
          <input type="range" min={0} max={100} step={5} value={levels[tool]} style={{ '--v': `${levels[tool]}%` } as CSSProperties} onChange={(event) => setLevels((prev) => ({ ...prev, [tool]: Number(event.target.value) }))} />
          <output>{levels[tool]}%</output>
        </label>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide mku-shoot" disabled={Boolean(hairBusy) || !stage} onClick={finish}>{t.toResult}<ArrowRight size={26} strokeWidth={2.2} aria-hidden="true" /></button>
        <KxFoot>{t.foot}</KxFoot>
        {hairSheet && (
          <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={t.hairAiTitle} onPointerDown={(event) => { if (event.target === event.currentTarget) setHairSheet(false) }}>
            <div className="kx-sheet-card mku-hair-sheet">
              <button type="button" className="kx-sheet-x" aria-label={k.close} onClick={() => setHairSheet(false)}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
              <h2>{t.hairAiTitle}</h2>
              <p className="kx-sheet-desc">{hairLeft > 0 ? t.hairAiNote.replace('{n}', String(hairLeft)) : t.hairAiLimit}</p>
              <div className="mku-hair-grid">
                {HAIR_STYLES.map((style) => <button key={style} type="button" disabled={hairLeft <= 0} onClick={() => void restyle(style)}><Scissors size={20} strokeWidth={1.8} aria-hidden="true" />{t.hairStyles[style]}</button>)}
              </div>
              {restyled && <button type="button" className="kx-btn kx-btn--ghost" onClick={() => { setScene({ ...scene.first, first: scene.first }); setHairSheet(false) }}><Undo2 size={20} strokeWidth={2} aria-hidden="true" />{t.hairBack}</button>}
              <p className="kx-sheet-keep">{t.hairAiPrivacy}</p>
            </div>
          </div>
        )}
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
        {extras.length > 0 && <p className="mku-extras"><em>{t.extrasTitle}</em>{extras.map((name) => <span key={name}>{name}</span>)}</p>}
        <p><b>{t.keepFace}</b>{t.colorNote}</p>
      </section>
      <div className="kx-spacer" />
      <KxActions>
        <button type="button" className="kx-btn" onClick={() => setStep('edit')}><RotateCcw size={22} strokeWidth={2} aria-hidden="true" />{t.again}</button>
        <button type="button" className="kx-btn kx-btn--primary" onClick={() => setSaving(true)}><Download size={24} strokeWidth={2.1} aria-hidden="true" />{t.save}</button>
      </KxActions>
      <KxFoot>{t.foot}</KxFoot>
      <KxSaveSheet open={saving} cacheKey={`${lang}|${lookKey}|${final.length}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
    </KxPage>
  )
}
