'use client'

// 명함 디자이너(CARD!) — 이름·직업·연락처(선택) + 원하는 느낌(고르거나 직접 적기, 원하면 얼굴 사진) → AI 가 바탕을 그리고
// 그 위에 내 정보를 올린다 → 앞뒤 편집(글자 위치·색·서체) → 완성, 휴대폰으로 받기 · 영수증. 목업 02-business-card-designer.
// 바탕 그림만 서버의 이미지 생성이 그린다(건당 비용 — 한 번에 세 장까지). 글자는 화면이 또렷하게 올린다(design.ts):
// 화면의 미리보기와 받는 파일이 같은 함수로 그려진다. AI 없이 기본 템플릿으로도 만들 수 있다.
// 디지털 결과물이다: 명함 프린터·주문·결제는 없다. 사진은 그리는 데만 쓰고 저장하지 않는다.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Camera, Check, FileText, PenLine, Printer, RefreshCw, Sparkles, UserRound, X } from 'lucide-react'
import { CARD_MOODS, CARD_MOOD_MAX, type CardMood } from '@/lib/kiosk/card-moods'
import { KX_IDLE, KxActions, KxCamView, KxFoot, KxKeyboard, KxLang, KxPage, KxReceiptSheet, KxSaveSheet, KxSpinner, KxStart, KxTop, useKx, useKxCamera, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import type { KxReceipt } from '../kx-receipt'
import { canvasBlob, fontsReady, kxFontFamily, loadImage, makeCanvas } from '../kx-canvas'
import {
  CARD_ALIGNS, CARD_COLORS, CARD_SWATCH, CARD_TEMPLATES, CARD_TONES, drawCard, imagesToPdf, measureArt,
  type CardAlign, type CardArt, type CardColor, type CardFont, type CardSide, type CardSpec, type CardTemplate,
} from './design'
import { CARD_TEXT } from './text'
import './card.css'

type Step = 'start' | 'info' | 'face' | 'making' | 'edit' | 'result'
type Field = 'name' | 'role' | 'contact'
const FIELD_MAX: Record<Field, number> = { name: 12, role: 16, contact: 28 }
/** 바탕을 그릴 때마다 생성 비용이 든다 — 한 번(처음으로 돌아가기 전)에 이만큼 */
const MAX_ART = 3
const MOOD_COLOR: Record<CardMood, string> = { minimal: '#d9d6cf', pastel: '#f3c9dc', nature: '#8dbf8b', night: '#3b2f8f', luxury: '#1c1a17', retro: '#f08a3c', space: '#4b3fae', paint: '#8fc3e8' }

/** 명함 한 면 미리보기 — 부모 폭에 맞춰 선명하게(기기 배율만큼 크게) 그린다 */
function CardView({ spec, side, art = null, className }: { spec: CardSpec; side: CardSide; art?: CardArt | null; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let alive = true
    const family = kxFontFamily()
    const paint = () => {
      if (!alive) return
      const width = Math.max(120, Math.round(canvas.clientWidth * Math.min(3, window.devicePixelRatio || 1)))
      canvas.width = width
      canvas.height = Math.round(width * 5 / 9)
      const ctx = canvas.getContext('2d')
      if (ctx) drawCard(ctx, canvas.width, canvas.height, spec, side, family, art)
    }
    paint()
    // 글꼴이 늦게 내려오면 한 번 더(첫 그림이 기본 글꼴로 남지 않게)
    void fontsReady(`800 40px ${family}`).then(paint)
    return () => { alive = false }
  }, [spec, side, art])
  return <canvas ref={ref} className={`crd-card${className ? ` ${className}` : ''}`} role="img" aria-label={`${spec.name} ${spec.role}`} />
}

export default function CardMode() {
  const { lang, t: k, c, home } = useKx()
  const t = kxText(CARD_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [spec, setSpec] = useState<CardSpec>({ template: 'editorial', font: 'sans', color: 'blue', align: 'left', name: '', role: '', contact: '' })
  const [typing, setTyping] = useState<Field | 'mood' | null>(null)
  const [side, setSide] = useState<CardSide>('front')
  /** 원하는 느낌 — 고른 것과 직접 적은 말(둘 다 있으면 함께 쓴다) */
  const [mood, setMood] = useState<CardMood | null>('minimal')
  const [custom, setCustom] = useState('')
  /** 명함에 넣을 얼굴 사진(선택) */
  const [face, setFace] = useState<string | null>(null)
  const [art, setArt] = useState<CardArt | null>(null)
  const [artCount, setArtCount] = useState(0)
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState(0)
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const cam = useKxCamera(step === 'face')
  const request = useRef<AbortController | null>(null)
  const set = <K extends keyof CardSpec>(key: K, value: CardSpec[K]) => setSpec((prev) => ({ ...prev, [key]: value }))
  const ai = Boolean(spec.ai && art)

  useKxScreen(step === 'start' ? 'start' : step === 'making' || cam.countdown !== null ? 'busy' : saving || printing ? KX_IDLE.save : step === 'face' ? KX_IDLE.camera : step === 'result' ? KX_IDLE.result : KX_IDLE.edit)
  // 화면을 떠나면 기다리던 그림은 버린다
  useEffect(() => () => request.current?.abort(), [])
  // 그리는 동안 안내 문구가 차례로 바뀐다
  useEffect(() => {
    if (step !== 'making') return
    const timer = window.setInterval(() => setStage((n) => Math.min(2, n + 1)), 3500)
    return () => window.clearInterval(timer)
  }, [step])

  /** AI 바탕을 그려 받아 편집으로 — 실패하면 정보 화면으로 돌아가 알린다 */
  const makeArt = useCallback(async () => {
    if (artCount >= MAX_ART) return
    setFailed(false)
    setStage(0)
    setStep('making')
    const ctrl = new AbortController()
    request.current = ctrl
    try {
      const response = await fetch('/api/kiosk/experience/card-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, custom, photo: face }),
        signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(130_000)]),
      })
      const result = await response.json().catch(() => null)
      if (ctrl.signal.aborted) return
      if (!response.ok || typeof result?.image !== 'string') throw new Error(result?.error || 'card art failed')
      const image = await loadImage(result.image)
      if (ctrl.signal.aborted) return
      setArt(measureArt(image))
      setArtCount((n) => n + 1)
      setSpec((prev) => ({ ...prev, ai: prev.ai ?? { side: 'left', tone: 'auto' } }))
      setSide('front')
      setStep('edit')
    } catch (error) {
      if (ctrl.signal.aborted) return
      console.error('[kiosk] 명함 바탕을 받지 못했습니다:', error)
      setFailed(true)
      setStep('info')
    }
  }, [artCount, mood, custom, face])

  const render = useCallback((which: CardSide, width: number) => {
    const [canvas, ctx] = makeCanvas(width, Math.round(width * 5 / 9))
    drawCard(ctx, canvas.width, canvas.height, spec, which, kxFontFamily(), art)
    return canvas
  }, [spec, art])
  const build = useCallback(async (): Promise<KxShareFile[]> => {
    const family = kxFontFamily()
    await fontsReady(`800 80px ${family}`, `600 40px ${family}`)
    const front = render('front', 1800), back = render('back', 1800)
    const jpeg = async (canvas: HTMLCanvasElement) => ({ jpeg: new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', 0.95)).arrayBuffer()), width: canvas.width, height: canvas.height })
    // AI 바탕은 사진처럼 색이 많아 PNG 가 크다 — 받는 그림은 JPEG 로(합쳐 3MB 를 넘지 않게)
    const picture = async (canvas: HTMLCanvasElement, name: string, label: string): Promise<KxShareFile> => (spec.ai && art
      ? { name: `${name}.jpg`, type: 'image/jpeg', label, blob: await canvasBlob(canvas, 'image/jpeg', 0.93) }
      : { name: `${name}.png`, type: 'image/png', label, blob: await canvasBlob(canvas, 'image/png') })
    return [
      await picture(front, 'card-front', spec.ai && art ? t.frontLabel.replace('PNG', 'JPG') : t.frontLabel),
      await picture(back, 'card-back', spec.ai && art ? t.backLabel.replace('PNG', 'JPG') : t.backLabel),
      { name: 'card.pdf', type: 'application/pdf', label: t.pdfLabel, blob: imagesToPdf([await jpeg(front), await jpeg(back)], 90, 50) },
    ]
  }, [spec, art, t, render])
  const receipt = useCallback(async (): Promise<KxReceipt> => {
    const family = kxFontFamily()
    await fontsReady(`800 80px ${family}`, `600 40px ${family}`)
    return {
      tag: 'CARD!',
      title: [spec.name.trim(), spec.role.trim()].filter(Boolean).join(' · '),
      blocks: [
        { kind: 'image', src: render('front', 900).toDataURL('image/png'), width: 440, frame: true, caption: t.front },
        { kind: 'image', src: render('back', 900).toDataURL('image/png'), width: 440, frame: true, caption: t.back },
      ],
      foot: t.foot,
    }
  }, [spec, t, render])

  if (step === 'start') {
    const sample: CardSpec = { template: 'editorial', font: 'sans', color: 'blue', align: 'left', ...t.sample }
    return (
      <KxStart
        brand={t.brand}
        wordmark="CARD!"
        headline={<>{t.headline[0]}<br />{t.headline[1]}</>}
        art={<><CardView spec={sample} side="front" className="crd-hero crd-hero--front" /><CardView spec={sample} side="back" className="crd-hero crd-hero--back" /></>}
        cta={t.cta}
        onStart={() => setStep('info')}
        foot={t.foot}
      >
        <p>{t.sub}</p>
      </KxStart>
    )
  }

  const stepIndex = step === 'info' || step === 'face' ? 0 : step === 'result' ? 2 : 1
  const top = (
    <KxTop
      left={<span className="kx-mark">CARD!</span>}
      center={<ol className="crd-steps">{t.steps.map((label, i) => <li key={label} data-state={i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'todo'}><i aria-hidden="true" />{label}</li>)}</ol>}
      right={<KxLang />}
    />
  )

  if (step === 'info') {
    const fields: { id: Field; label: string; placeholder: string; hint: string }[] = [
      { id: 'name', label: t.name, placeholder: t.namePh, hint: t.nameHint },
      { id: 'role', label: t.role, placeholder: t.rolePh, hint: t.roleHint },
      { id: 'contact', label: t.contact, placeholder: t.contactPh, hint: t.contactHint },
    ]
    const left = MAX_ART - artCount
    return (
      <KxPage name="card-info">
        {top}
        <h1 className="kx-title crd-title" data-compact>{typing === 'mood' ? t.customMoodTitle : t.infoTitle}</h1>
        {typing !== 'mood' && (
          <div className="crd-fields" data-compact={!typing || undefined}>
            {fields.filter((field) => !typing || typing === field.id).map((field) => (
              <button key={field.id} type="button" className="crd-field" data-empty={!spec[field.id] || undefined} data-active={typing === field.id || undefined} onClick={() => setTyping(field.id)}>
                <em>{field.label}</em>
                <span>{spec[field.id] || field.placeholder}</span>
              </button>
            ))}
          </div>
        )}
        {typing === 'mood' && <p className="crd-mood-typing" data-empty={!custom || undefined}>{custom || t.customMoodPh}</p>}
        {!typing && (
          <>
            <h2 className="crd-h2"><Sparkles size={22} strokeWidth={2} aria-hidden="true" />{t.moodTitle}</h2>
            <div className="crd-moods" role="radiogroup" aria-label={t.moodTitle}>
              {CARD_MOODS.map((id, i) => (
                <button key={id} type="button" role="radio" aria-checked={mood === id} data-on={mood === id || undefined} style={{ '--i': i } as CSSProperties} onClick={() => setMood(mood === id && custom ? null : id)}>
                  <i style={{ background: MOOD_COLOR[id] }} aria-hidden="true" />{t.moods[id]}
                </button>
              ))}
            </div>
            <div className="crd-extras">
              <button type="button" data-on={Boolean(custom) || undefined} onClick={() => setTyping('mood')}>
                <PenLine size={20} strokeWidth={2} aria-hidden="true" /><span>{custom || t.customMood}</span>
              </button>
              <button type="button" data-on={Boolean(face) || undefined} onClick={() => (face ? setFace(null) : setStep('face'))}>
                {face
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={face} alt="" draggable={false} />
                  : <UserRound size={20} strokeWidth={2} aria-hidden="true" />}
                <span>{face ? t.withFaceOn : t.withFace}</span>
                {face && <i aria-hidden="true"><X size={16} strokeWidth={2.4} /></i>}
              </button>
            </div>
            {failed && <p className="crd-alert" role="alert"><b>{t.artFailed[0]}</b>{t.artFailed[1]}</p>}
          </>
        )}
        <div className="kx-spacer" />
        {typing === 'mood' ? (
          <KxKeyboard key="mood" value={custom} onChange={setCustom} onClose={() => { setCustom((value) => value.trim()); setTyping(null) }} maxLength={CARD_MOOD_MAX} hint={t.customMoodPh} />
        ) : typing ? (
          <KxKeyboard
            key={typing}
            value={spec[typing]}
            onChange={(value) => set(typing, value)}
            onClose={() => setTyping(null)}
            maxLength={FIELD_MAX[typing]}
            hint={fields.find((field) => field.id === typing)?.hint}
            mode={typing === 'contact' ? 'en' : undefined}
          />
        ) : (
          <>
            <button type="button" className="crd-basic" disabled={!spec.name.trim()} onClick={() => { setSpec((prev) => ({ ...prev, ai: undefined })); setSide('front'); setStep('edit') }}>{t.basic}</button>
            <KxActions>
              <button type="button" className="kx-btn" onClick={() => setStep('start')}>{k.prev}</button>
              <button type="button" className="kx-btn kx-btn--primary" disabled={!spec.name.trim() || left <= 0 || (!mood && !custom)} onClick={() => void makeArt()}><Sparkles size={24} strokeWidth={2} aria-hidden="true" />{left > 0 ? t.toAi : t.redrawLimit}</button>
            </KxActions>
          </>
        )}
        {!typing && <KxFoot>{t.foot}</KxFoot>}
      </KxPage>
    )
  }

  if (step === 'face') {
    return (
      <KxPage name="card-face">
        {top}
        <h1 className="kx-title crd-title crd-title--center" data-compact>{t.faceTitle}</h1>
        <p className="kx-desc">{t.faceDesc}</p>
        <div className="kx-cam-slot">
          <KxCamView cam={cam}>
            <svg className="crd-face-guide" viewBox="0 0 300 400" aria-hidden="true"><ellipse cx="150" cy="182" rx="94" ry="126" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeDasharray="7 7" /></svg>
          </KxCamView>
        </div>
        <KxActions>
          <button type="button" className="kx-btn" disabled={cam.countdown !== null} onClick={() => setStep('info')}>{t.faceSkip}</button>
          <button type="button" className="kx-btn kx-btn--primary" disabled={cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((shot) => { setFace(shot); setStep('info') })}><Camera size={26} strokeWidth={2} aria-hidden="true" />{t.faceShoot}</button>
        </KxActions>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (step === 'making') {
    return (
      <KxPage name="card-making">
        {top}
        <h1 className="kx-title crd-title crd-title--center">{t.makingTitle}</h1>
        <div className="crd-making" aria-hidden="true">
          <div><i /></div>
          <div><i /></div>
        </div>
        <p className="crd-progress" role="status"><KxSpinner size={26} /><b key={stage}>{t.makingSteps[stage]}</b></p>
        <p className="kx-desc">{t.makingNote}</p>
        <div className="kx-spacer" />
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (step === 'edit') {
    const left = MAX_ART - artCount
    return (
      <KxPage name="card-edit">
        {top}
        <h1 className="kx-title crd-title crd-title--center">{t.editTitle}</h1>
        <div className="crd-sides" role="tablist">
          {(['front', 'back'] as CardSide[]).map((id) => <button key={id} type="button" role="tab" aria-selected={side === id} data-on={side === id || undefined} onClick={() => setSide(id)}>{t[id]}</button>)}
        </div>
        <div className="crd-stack" data-side={side}>
          <figure data-which="front" onClick={() => setSide('front')}><CardView spec={spec} side="front" art={art} /><figcaption>{t.frontPreview}</figcaption></figure>
          <figure data-which="back" onClick={() => setSide('back')}><CardView spec={spec} side="back" art={art} /><figcaption>{t.backPreview}</figcaption></figure>
        </div>
        <div className="crd-options">
          {ai ? (
            <>
              <div className="crd-option">
                <b>{t.textSide}</b>
                <div role="radiogroup" aria-label={t.textSide}>
                  {(['left', 'right'] as const).map((id) => <button key={id} type="button" role="radio" aria-checked={spec.ai!.side === id} data-on={spec.ai!.side === id || undefined} onClick={() => set('ai', { ...spec.ai!, side: id })}>{t.sides[id]}</button>)}
                </div>
              </div>
              <div className="crd-option">
                <b>{t.tone}</b>
                <div role="radiogroup" aria-label={t.tone}>
                  {CARD_TONES.map((id) => <button key={id} type="button" role="radio" aria-checked={spec.ai!.tone === id} data-on={spec.ai!.tone === id || undefined} onClick={() => set('ai', { ...spec.ai!, tone: id })}>{t.tones[id]}</button>)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="crd-option">
                <b>{t.templateTitle}</b>
                <div role="radiogroup" aria-label={t.templateTitle}>
                  {CARD_TEMPLATES.map((id: CardTemplate) => <button key={id} type="button" role="radio" aria-checked={spec.template === id} data-on={spec.template === id || undefined} onClick={() => set('template', id)}>{t.templates[id]}</button>)}
                </div>
              </div>
              <div className="crd-option">
                <b>{t.color}</b>
                <div role="radiogroup" aria-label={t.color} className="crd-colors">
                  {CARD_COLORS.map((id: CardColor) => <button key={id} type="button" role="radio" aria-checked={spec.color === id} aria-label={t.colors[id]} data-on={spec.color === id || undefined} style={{ background: CARD_SWATCH[id] }} onClick={() => set('color', id)} />)}
                </div>
              </div>
              <div className="crd-option">
                <b>{t.align}</b>
                <div role="radiogroup" aria-label={t.align}>
                  {CARD_ALIGNS.map((id: CardAlign) => <button key={id} type="button" role="radio" aria-checked={spec.align === id} data-on={spec.align === id || undefined} onClick={() => set('align', id)}>{t.aligns[id]}</button>)}
                </div>
              </div>
            </>
          )}
          <div className="crd-option">
            <b>{t.font}</b>
            <div role="radiogroup" aria-label={t.font}>
              {(['sans', 'serif'] as CardFont[]).map((id) => <button key={id} type="button" role="radio" aria-checked={spec.font === id} data-on={spec.font === id || undefined} onClick={() => set('font', id)}>{t.fonts[id]}</button>)}
            </div>
          </div>
        </div>
        {ai && (
          <p className="crd-redraw">
            <button type="button" disabled={left <= 0} onClick={() => void makeArt()}><RefreshCw size={18} strokeWidth={2.2} aria-hidden="true" />{t.redraw}</button>
            <span>{left > 0 ? t.redrawLeft.replace('{n}', String(left)) : t.redrawLimit}</span>
          </p>
        )}
        <div className="kx-spacer" />
        <KxActions>
          <button type="button" className="kx-btn" onClick={() => setStep('info')}>{k.prev}</button>
          <button type="button" className="kx-btn kx-btn--primary" onClick={() => setStep('result')}>{t.toResult}<ArrowRight size={24} strokeWidth={2.2} aria-hidden="true" /></button>
        </KxActions>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  const shareKey = `${lang}|${JSON.stringify(spec)}|${ai ? artCount : 0}`
  return (
    <KxPage name="card-result">
      {top}
      <p className="crd-done" aria-hidden="true"><Check size={26} strokeWidth={3} /></p>
      <h1 className="kx-title crd-title crd-title--center crd-title--result">{t.resultTitle[0]}<br /><b>{t.resultTitle[1]}</b></h1>
      <div className="crd-final">
        <figure><figcaption>{t.front}</figcaption><CardView spec={spec} side="front" art={art} /></figure>
        <figure><figcaption>{t.back}</figcaption><CardView spec={spec} side="back" art={art} /></figure>
      </div>
      <section className="crd-file">
        <FileText size={40} strokeWidth={1.4} aria-hidden="true" />
        <div><b>{t.fileTitle}</b><span>{ai ? t.aiNote : t.fileDesc}</span></div>
      </section>
      <div className="kx-spacer" />
      <div className="crd-pair">
        <button type="button" className="kx-btn crd-edit" onClick={() => setStep('edit')}>{t.edit}</button>
        <button type="button" className="kx-btn crd-edit" onClick={() => setPrinting(true)}><Printer size={20} strokeWidth={2} aria-hidden="true" />{c.receipt}</button>
      </div>
      <button type="button" className="kx-btn kx-btn--primary kx-btn--wide crd-phone" onClick={() => setSaving(true)}>{t.toPhone}<ArrowRight size={26} strokeWidth={2.3} aria-hidden="true" /></button>
      <button type="button" className="crd-home" onClick={home}>{k.home}</button>
      <KxSaveSheet open={saving} cacheKey={shareKey} build={build} onClose={() => setSaving(false)} title={t.toPhone} />
      <KxReceiptSheet open={printing} cacheKey={shareKey} build={build} receipt={receipt} onClose={() => setPrinting(false)} />
    </KxPage>
  )
}
