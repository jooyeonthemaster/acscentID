'use client'

// 캐리커처(DRAW!) — 사진 한 장 → 스타일(라인아트·수채화·코믹)과 과장 정도 → 손그림 캐리커처 포스터·저장. 목업 04-caricature.
// 그림은 서버의 이미지 생성(/api/kiosk/experience/caricature)이 그린다 — 한 장마다 비용이 들어 사진 한 장에 세 장까지,
// 같은 조합은 다시 그리지 않는다. 사진은 그리는 데만 쓰고 저장하지 않으며, 받기를 누른 결과만 올라간다.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, Camera, Check, Images, Pencil, Printer, RefreshCw, UserRound, UsersRound } from 'lucide-react'
import { KX_IDLE, KX_PHOTO_RATIO, KxBack, KxCamView, KxHome, KxPage, KxReceiptSheet, KxSaveSheet, KxStart, KxTop, useKx, useKxCamera, useKxScreen, type KxShareFile } from '../kx'
import type { KxReceipt } from '../kx-receipt'
import { kxText } from '../kx-i18n'
import { canvasBlob, drawCover, fontsReady, kxFontFamily, loadImage, makeCanvas, roundRect } from '../kx-canvas'
import { DRAW_TEXT, type DrawLevel, type DrawStyle, type DrawText } from './text'
import './draw.css'

type Step = 'start' | 'capture' | 'confirm' | 'style' | 'drawing' | 'result'
const STYLES: DrawStyle[] = ['line', 'water', 'comic']
const LEVELS: DrawLevel[] = ['soft', 'fun']
/** 사진 한 장으로 그릴 수 있는 장수 — 그릴 때마다 생성 비용이 든다 */
const MAX_DRAWS = 3
const ASSET = '/assets/kiosk-experiences'
const CORAL = '#f0563c'
const STAR = '#f6c531'
const comboKey = (style: DrawStyle, level: DrawLevel) => `${style}|${level}`
/** 여럿이 찍을 때의 사진 비율(가로/세로) — 서버도 4:3 으로 그린다 */
const GROUP_RATIO = 4 / 3

/** 서버로 보낼 사진 — 긴 변 1024 로 줄인다(생성에는 충분하고 전송이 빠르다) */
async function shrink(photo: string): Promise<string> {
  const image = await loadImage(photo)
  const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight))
  const [canvas, ctx] = makeCanvas(Math.round(image.naturalWidth * scale), Math.round(image.naturalHeight * scale))
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.88)
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, turn: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = turn + (Math.PI * i) / 5, d = i % 2 ? r * 0.46 : r
    ctx.lineTo(cx + Math.sin(a) * d, cy - Math.cos(a) * d)
  }
  ctx.closePath()
  ctx.fill()
}

function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.9)
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.2, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.4)
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.5, cy - s * 0.2, cx, cy + s * 0.9)
  ctx.fill()
}

/** 저장용 포스터 — 노란 바탕, 종이에 붙인 캐리커처, 스타일 꼬리표, 원본 사진 한 장 */
async function drawPoster(t: DrawText, art: string, original: string, tag: string, wide: boolean): Promise<Blob> {
  const family = kxFontFamily()
  await fontsReady(`900 60px ${family}`, `700 30px ${family}`)
  const [drawing, photo, mark] = await Promise.all([loadImage(art), loadImage(original), loadImage(`${ASSET}/draw-wordmark.webp`)])
  const W = 1080, H = 1440
  const [canvas, ctx] = makeCanvas(W, H)
  // 글자 그림의 바탕과 같은 노랑
  ctx.fillStyle = '#fef0aa'
  ctx.fillRect(0, 0, W, H)
  const markW = 400, markH = markW * mark.naturalHeight / mark.naturalWidth
  ctx.drawImage(mark, (W - markW) / 2, 44, markW, markH)
  ctx.fillStyle = STAR
  star(ctx, 104, 330, 46, -0.2)
  star(ctx, 990, 760, 34, 0.3)
  ctx.fillStyle = CORAL
  heart(ctx, 978, 300, 34)
  // 종이
  const paper = (x: number, y: number, w: number, h: number, tilt: number, pad: number, image: HTMLImageElement, focus: number) => {
    ctx.save()
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate(tilt)
    ctx.shadowColor = 'rgba(90, 70, 10, 0.28)'
    ctx.shadowBlur = 26
    ctx.shadowOffsetY = 10
    ctx.fillStyle = '#fffaf0'
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.shadowColor = 'transparent'
    drawCover(ctx, image, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2 - (pad > 20 ? 0 : 44), focus)
    ctx.restore()
  }
  // 여럿이 찍은 가로 그림은 종이도 가로로(사람이 잘리지 않게)
  const main = wide ? { x: 60, y: 330, w: 960, h: 740 } : { x: 150, y: 216, w: 780, h: 1040 }
  const small = wide ? { x: 700, y: 1010, w: 310, h: 276 } : { x: 766, y: 986, w: 230, h: 320 }
  paper(main.x, main.y, main.w, main.h, -0.02, 30, drawing, 0.5)
  paper(small.x, small.y, small.w, small.h, 0.07, 14, photo, 0.3)
  ctx.save()
  ctx.translate(small.x + small.w / 2, small.y + small.h / 2)
  ctx.rotate(0.07)
  ctx.fillStyle = '#1f1d1b'
  ctx.font = `700 26px ${family}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(t.original, 0, small.h / 2 - 28)
  ctx.restore()
  // 꼬리표
  ctx.save()
  ctx.translate(360, wide ? 1150 : 1296)
  ctx.rotate(-0.045)
  ctx.font = `800 40px ${family}`
  const tagW = ctx.measureText(tag).width + 88
  ctx.fillStyle = CORAL
  roundRect(ctx, -tagW / 2, -40, tagW, 80, 14)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(tag, 0, 3)
  ctx.restore()
  return canvasBlob(canvas, 'image/jpeg', 0.9)
}

/** 종이 둘레의 낙서 — 별·하트·웃는 얼굴·튀는 선 */
function Doodles({ text }: { text?: string }) {
  return (
    <div className="drw-doodles" aria-hidden="true">
      <svg data-kind="star" data-at="a" viewBox="0 0 40 40"><path d="M20 2l5 12 13 1-10 9 3 13-11-7-11 7 3-13L2 15l13-1z" /></svg>
      <svg data-kind="star" data-at="b" viewBox="0 0 40 40"><path d="M20 2l5 12 13 1-10 9 3 13-11-7-11 7 3-13L2 15l13-1z" /></svg>
      <svg data-kind="heart" data-at="c" viewBox="0 0 40 40"><path d="M20 35C4 24 4 8 14 8c4 0 6 3 6 5 0-2 2-5 6-5 10 0 10 16-6 27z" /></svg>
      <svg data-kind="smile" data-at="d" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" /><path d="M13 23c3 5 11 5 14 0M14 15v2M26 15v2" /></svg>
      <svg data-kind="rays" data-at="e" viewBox="0 0 40 40"><path d="M6 30l9-7M4 16l11 2M14 4l5 10" /></svg>
      <svg data-kind="rays" data-at="f" viewBox="0 0 40 40"><path d="M34 30l-9-7M36 16l-11 2M26 4l-5 10" /></svg>
      {text && <span>{text}</span>}
    </div>
  )
}

export default function DrawMode() {
  const { lang, home, c } = useKx()
  const t = kxText(DRAW_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [photo, setPhoto] = useState<string | null>(null)
  const [style, setStyle] = useState<DrawStyle>('comic')
  const [level, setLevel] = useState<DrawLevel>('fun')
  /** 이 사진으로 그린 그림 — 스타일|과장 정도 → data: 주소. 같은 조합은 다시 그리지 않는다 */
  const [arts, setArts] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<'failed' | 'busy' | null>(null)
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  /** 여럿이 함께 — 사진을 가로로 찍고 한 장에 모두 그린다 */
  const [group, setGroup] = useState(false)
  const cam = useKxCamera(step === 'capture', { ratio: group ? GROUP_RATIO : KX_PHOTO_RATIO })
  const request = useRef<AbortController | null>(null)

  useKxScreen(step === 'start' ? 'start' : step === 'drawing' || cam.countdown !== null ? 'busy' : saving || printing ? KX_IDLE.save : step === 'capture' ? KX_IDLE.camera : step === 'result' ? KX_IDLE.result : KX_IDLE.edit)
  // 화면을 떠나면 기다리던 그림은 버린다
  useEffect(() => () => request.current?.abort(), [])
  // 그리는 동안 안내 문구가 차례로 바뀐다
  useEffect(() => {
    if (step !== 'drawing') return
    const timer = window.setInterval(() => setStage((n) => Math.min(2, n + 1)), 6000)
    return () => window.clearInterval(timer)
  }, [step])

  const combo = comboKey(style, level)
  const art = arts[combo] ?? null
  const used = Object.keys(arts).length
  const left = MAX_DRAWS - used
  const tag = `${t.styles[style]} · ${t.levels[level]}`

  const draw = useCallback(async () => {
    if (!photo) return
    if (arts[combo]) { setStep('result'); return }
    if (Object.keys(arts).length >= MAX_DRAWS) return
    setProblem(null)
    setStage(0)
    setStep('drawing')
    const ctrl = new AbortController()
    request.current = ctrl
    try {
      const response = await fetch('/api/kiosk/experience/caricature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: await shrink(photo), style, level, group }),
        signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(130_000)]),
      })
      const result = await response.json().catch(() => null)
      if (ctrl.signal.aborted) return
      if (!response.ok || typeof result?.image !== 'string') {
        setProblem(response.status === 429 || response.status === 503 ? 'busy' : 'failed')
        setStep('style')
        return
      }
      // 다 읽힌 뒤에 보여 준다(반쯤 그려진 채로 나타나지 않게)
      await loadImage(result.image)
      if (ctrl.signal.aborted) return
      setArts((prev) => ({ ...prev, [combo]: result.image }))
      setStep('result')
    } catch (error) {
      if (ctrl.signal.aborted) return
      console.error('[kiosk] 캐리커처를 받지 못했습니다:', error)
      setProblem('failed')
      setStep('style')
    }
  }, [photo, arts, combo, style, level, group])

  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!art || !photo) throw new Error('결과가 없습니다')
    return [
      { name: 'caricature-poster.jpg', type: 'image/jpeg', label: t.posterLabel, blob: await drawPoster(t, art, photo, tag, group) },
      { name: 'caricature.jpg', type: 'image/jpeg', label: t.artLabel, blob: await (await fetch(art)).blob() },
    ]
  }, [art, photo, t, tag, group])
  const receipt = useCallback((): KxReceipt => {
    if (!art) throw new Error('결과가 없습니다')
    // 선화는 밝게 찍어야 선이 또렷하다
    return { tag: 'DRAW!', title: t.resultTitle, blocks: [{ kind: 'image', src: art, width: group ? 440 : 400, frame: true, tone: style === 'line' ? 185 : 165, caption: tag }], foot: t.foot }
  }, [art, t, tag, group, style])

  if (step === 'start') {
    return (
      <KxStart
        brand={t.brand}
        // eslint-disable-next-line @next/next/no-img-element
        wordmark={<img className="kx-art-blend" src={`${ASSET}/draw-wordmark.webp`} alt="DRAW!" draggable={false} />}
        headline={<>{t.headline[0]}<br />{t.headline[1]}</>}
        // eslint-disable-next-line @next/next/no-img-element
        art={<img className="kx-art-blend" src={`${ASSET}/draw-hero.webp`} alt="" draggable={false} />}
        cta={t.cta}
        onStart={() => { setProblem(null); setPhoto(null); setArts({}); setGroup(false); setStep('capture') }}
        foot={t.foot}
      >
        <p><span className="drw-underline">{t.sub}</span></p>
      </KxStart>
    )
  }

  const stepIndex = step === 'capture' || step === 'confirm' ? 0 : step === 'result' ? 2 : 1
  const head = (left: ReactNode) => (
    <>
      <KxTop
        left={left}
        // eslint-disable-next-line @next/next/no-img-element
        center={<img className="drw-mark" src={`${ASSET}/draw-wordmark.webp`} alt="DRAW!" draggable={false} />}
        right={step === 'result' ? null : <KxHome icon={false} />}
      />
      <ol className="drw-steps" aria-label={`${stepIndex + 1} / 3`}>
        {t.steps.map((label, i) => <li key={label} data-state={i === stepIndex ? 'now' : i < stepIndex ? 'done' : 'todo'}><i aria-hidden="true" />{label}</li>)}
      </ol>
    </>
  )
  const title = (text: string) => <h1 className="kx-title drw-title"><span>{text}</span></h1>

  if (step === 'capture') {
    return (
      <KxPage name="draw-capture">
        {head(<KxBack label={t.back} onClick={home} />)}
        {title(t.captureTitle)}
        <div className="drw-who" role="radiogroup" aria-label={t.captureTitle}>
          <button type="button" role="radio" aria-checked={!group} data-on={!group || undefined} disabled={cam.countdown !== null} onClick={() => setGroup(false)}><UserRound size={22} strokeWidth={2} aria-hidden="true" />{t.solo}</button>
          <button type="button" role="radio" aria-checked={group} data-on={group || undefined} disabled={cam.countdown !== null} onClick={() => setGroup(true)}><UsersRound size={22} strokeWidth={2} aria-hidden="true" />{t.group}</button>
        </div>
        <div className="drw-stage">
          <div className="drw-paper" data-wide={group || undefined} key={group ? 'wide' : 'tall'}><KxCamView cam={cam} /></div>
          <Doodles />
        </div>
        <p className="drw-note" key={group ? 'g' : 's'}>{group ? t.groupHint : t.captureDesc}<span>{t.hairTip}</span></p>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide drw-go" disabled={cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((shot) => { setPhoto(shot); setArts({}); setProblem(null); setStep('confirm') })}>
          <Camera size={28} strokeWidth={2} aria-hidden="true" />{t.shoot}
        </button>
      </KxPage>
    )
  }

  if (!photo) return null

  if (step === 'confirm') {
    return (
      <KxPage name="draw-confirm">
        {head(<KxBack label={t.back} onClick={() => setStep('capture')} />)}
        {title(t.confirmTitle)}
        <div className="drw-stage">
          <div className="drw-paper" data-wide={group || undefined}>
            <KxCamView cam={null} photo={photo} flash />
            <span className="drw-badge">{t.shotDone}</span>
          </div>
          <Doodles />
        </div>
        <p className="drw-note">{t.confirmDesc}</p>
        <button type="button" className="kx-btn kx-btn--wide drw-ghost" onClick={() => setStep('capture')}><RefreshCw size={22} strokeWidth={2} aria-hidden="true" />{t.retake}</button>
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide drw-go" onClick={() => setStep('style')}>{t.usePhoto}<ArrowRight size={28} strokeWidth={2.3} aria-hidden="true" /></button>
      </KxPage>
    )
  }

  if (step === 'drawing') {
    return (
      <KxPage name="draw-drawing">
        {head(null)}
        {title(t.drawingTitle)}
        <div className="drw-stage">
          <div className="drw-paper" data-drawing data-wide={group || undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="drw-sketch" src={photo} alt="" draggable={false} />
            <i className="drw-pencil" aria-hidden="true"><Pencil size={46} strokeWidth={1.8} /></i>
            <span className="drw-badge" data-plain>{tag}</span>
          </div>
          <Doodles />
        </div>
        <p className="drw-progress" role="status"><b key={stage}>{t.drawingSteps[stage]}</b><i aria-hidden="true"><i /></i></p>
        <p className="drw-note">{t.drawingNote}</p>
      </KxPage>
    )
  }

  if (step === 'style') {
    const blocked = !art && left <= 0
    return (
      <KxPage name="draw-style">
        {head(<KxBack label={t.back} onClick={() => setStep('confirm')} />)}
        {title(t.styleTitle)}
        <div className="drw-stage" data-small>
          <div className="drw-paper" data-wide={group || undefined} key={art ? combo : 'photo'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art ?? photo} alt="" draggable={false} />
            <span className="drw-badge" data-plain>{art ? tag : t.myPhoto}</span>
          </div>
          <Doodles />
        </div>
        <div className="drw-styles" role="radiogroup" aria-label={t.steps[1]}>
          {STYLES.map((id, i) => (
            <button key={id} type="button" role="radio" aria-checked={style === id} data-on={style === id || undefined} style={{ '--i': i } as CSSProperties} onClick={() => { setStyle(id); setProblem(null) }}>
              <span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSET}/draw-style-${id}.webp`} alt="" draggable={false} />
                {style === id && <i className="drw-check" aria-hidden="true"><Check size={17} strokeWidth={3.2} /></i>}
                {arts[comboKey(id, level)] && <em>{t.made}</em>}
              </span>
              <b>{t.styles[id]}</b>
            </button>
          ))}
        </div>
        <p className="drw-sample-note">{t.sampleTag}</p>
        <div className="drw-level">
          <h2>{t.levelLabel}</h2>
          <div role="radiogroup" aria-label={t.levelLabel}>
            {LEVELS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={level === id} data-on={level === id || undefined} onClick={() => { setLevel(id); setProblem(null) }}>
                {t.levels[id]}{level === id && <Check size={20} strokeWidth={3} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p key={level}>{t.levelNotes[level]}</p>
        </div>
        {problem
          ? <p className="drw-alert" role="alert"><b>{t[problem][0]}</b>{t[problem][1]}</p>
          : <p className="drw-fine">{blocked ? t.limit : art ? t.privacy : `${t.left.replace('{n}', String(left))} · ${t.privacy}`}</p>}
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide drw-go" disabled={blocked} onClick={() => void draw()}>
          {art ? t.view : t.draw}<ArrowRight size={28} strokeWidth={2.3} aria-hidden="true" />
        </button>
      </KxPage>
    )
  }

  if (!art) return null
  return (
    <KxPage name="draw-result">
      {head(<KxHome />)}
      {title(t.resultTitle)}
      <div className="drw-stage" data-result>
        <div className="drw-paper" data-wide={group || undefined} key={combo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art} alt="" draggable={false} />
          <span className="drw-tag">{tag}</span>
        </div>
        <figure className="drw-original" data-wide={group || undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" draggable={false} />
          <figcaption>{t.original}</figcaption>
        </figure>
        <Doodles text={t.doodles[1]} />
      </div>
      <div className="drw-pair">
        <button type="button" className="kx-btn drw-ghost" onClick={() => setStep('style')}><Images size={22} strokeWidth={2} aria-hidden="true" />{t.again}</button>
        <button type="button" className="kx-btn drw-ghost" onClick={() => setPrinting(true)}><Printer size={22} strokeWidth={2} aria-hidden="true" />{c.receipt}</button>
      </div>
      <button type="button" className="kx-btn kx-btn--primary kx-btn--wide drw-go" onClick={() => setSaving(true)}>{t.save}<ArrowRight size={28} strokeWidth={2.3} aria-hidden="true" /></button>
      <KxSaveSheet open={saving} cacheKey={`${lang}|${combo}|${art.length}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
      <KxReceiptSheet open={printing} cacheKey={`${lang}|${combo}|${art.length}`} build={build} receipt={receipt} onClose={() => setPrinting(false)} />
    </KxPage>
  )
}
