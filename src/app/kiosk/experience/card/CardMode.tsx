'use client'

// 명함 디자이너(CARD!) — 이름·직업·연락처(선택) + 템플릿 → 앞뒤 편집(서체·색·정렬) → 완성, 휴대폰으로 받기. 목업 02-business-card-designer.
// 디지털 결과물이다: 명함 프린터·주문·결제는 없다. 화면의 미리보기와 받는 파일이 같은 함수(design.ts)로 그려진다.

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, FileText } from 'lucide-react'
import { KX_IDLE, KxActions, KxFoot, KxKeyboard, KxLang, KxPage, KxSaveSheet, KxStart, KxTop, useKx, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import { canvasBlob, fontsReady, kxFontFamily, makeCanvas } from '../kx-canvas'
import {
  CARD_ALIGNS, CARD_COLORS, CARD_SWATCH, CARD_TEMPLATES, drawCard, imagesToPdf,
  type CardAlign, type CardColor, type CardFont, type CardSide, type CardSpec, type CardTemplate,
} from './design'
import { CARD_TEXT } from './text'
import './card.css'

type Step = 'start' | 'info' | 'edit' | 'result'
type Field = 'name' | 'role' | 'contact'
const FIELD_MAX: Record<Field, number> = { name: 12, role: 16, contact: 28 }

/** 명함 한 면 미리보기 — 부모 폭에 맞춰 선명하게(기기 배율만큼 크게) 그린다 */
function CardView({ spec, side, className }: { spec: CardSpec; side: CardSide; className?: string }) {
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
      if (ctx) drawCard(ctx, canvas.width, canvas.height, spec, side, family)
    }
    paint()
    // 글꼴이 늦게 내려오면 한 번 더(첫 그림이 기본 글꼴로 남지 않게)
    void fontsReady(`800 40px ${family}`).then(paint)
    return () => { alive = false }
  }, [spec, side])
  return <canvas ref={ref} className={`crd-card${className ? ` ${className}` : ''}`} role="img" aria-label={`${spec.name} ${spec.role}`} />
}

export default function CardMode() {
  const { lang, t: k, home } = useKx()
  const t = kxText(CARD_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [spec, setSpec] = useState<CardSpec>({ template: 'editorial', font: 'sans', color: 'blue', align: 'left', name: '', role: '', contact: '' })
  const [typing, setTyping] = useState<Field | null>(null)
  const [side, setSide] = useState<CardSide>('front')
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof CardSpec>(key: K, value: CardSpec[K]) => setSpec((prev) => ({ ...prev, [key]: value }))

  useKxScreen(step === 'start' ? 'start' : saving ? KX_IDLE.save : step === 'result' ? KX_IDLE.result : KX_IDLE.edit)

  const build = useCallback(async (): Promise<KxShareFile[]> => {
    const family = kxFontFamily()
    await fontsReady(`800 80px ${family}`, `600 40px ${family}`)
    const render = (which: CardSide) => {
      const [canvas, ctx] = makeCanvas(1800, 1000)
      drawCard(ctx, 1800, 1000, spec, which, family)
      return canvas
    }
    const front = render('front'), back = render('back')
    const jpeg = async (canvas: HTMLCanvasElement) => ({ jpeg: new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', 0.95)).arrayBuffer()), width: canvas.width, height: canvas.height })
    return [
      { name: 'card-front.png', type: 'image/png', label: t.frontLabel, blob: await canvasBlob(front, 'image/png') },
      { name: 'card-back.png', type: 'image/png', label: t.backLabel, blob: await canvasBlob(back, 'image/png') },
      { name: 'card.pdf', type: 'application/pdf', label: t.pdfLabel, blob: imagesToPdf([await jpeg(front), await jpeg(back)], 90, 50) },
    ]
  }, [spec, t])

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

  const stepIndex = step === 'info' ? 0 : step === 'edit' ? 1 : 2
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
    return (
      <KxPage name="card-info">
        {top}
        <h1 className="kx-title crd-title">{t.infoTitle}</h1>
        <p className="kx-desc crd-desc">{t.infoDesc}</p>
        <div className="crd-fields">
          {fields.filter((field) => !typing || typing === field.id).map((field) => (
            <button key={field.id} type="button" className="crd-field" data-empty={!spec[field.id] || undefined} data-active={typing === field.id || undefined} onClick={() => setTyping(field.id)}>
              <em>{field.label}</em>
              <span>{spec[field.id] || field.placeholder}</span>
            </button>
          ))}
        </div>
        {!typing && (
          <>
            <h2 className="crd-h2">{t.templateTitle}</h2>
            <div className="crd-templates" role="radiogroup" aria-label={t.templateTitle}>
              {CARD_TEMPLATES.map((id: CardTemplate) => (
                <button key={id} type="button" role="radio" aria-checked={spec.template === id} data-on={spec.template === id || undefined} onClick={() => set('template', id)}>
                  {spec.template === id && <i className="crd-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></i>}
                  <CardView spec={{ ...spec, template: id, name: spec.name || t.sample.name, role: spec.role || t.sample.role, contact: spec.contact || t.sample.contact }} side="front" />
                  <span>{t.templates[id]}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="kx-spacer" />
        {typing ? (
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
          <KxActions>
            <button type="button" className="kx-btn" onClick={() => setStep('start')}>{k.prev}</button>
            <button type="button" className="kx-btn kx-btn--primary" disabled={!spec.name.trim()} onClick={() => { setSide('front'); setStep('edit') }}>{t.toDesign}<ArrowRight size={24} strokeWidth={2.2} aria-hidden="true" /></button>
          </KxActions>
        )}
        {!typing && <KxFoot>{t.foot}</KxFoot>}
      </KxPage>
    )
  }

  if (step === 'edit') {
    return (
      <KxPage name="card-edit">
        {top}
        <h1 className="kx-title crd-title crd-title--center">{t.editTitle}</h1>
        <div className="crd-sides" role="tablist">
          {(['front', 'back'] as CardSide[]).map((id) => <button key={id} type="button" role="tab" aria-selected={side === id} data-on={side === id || undefined} onClick={() => setSide(id)}>{t[id]}</button>)}
        </div>
        <div className="crd-stack" data-side={side}>
          <figure data-which="front" onClick={() => setSide('front')}><CardView spec={spec} side="front" /><figcaption>{t.frontPreview}</figcaption></figure>
          <figure data-which="back" onClick={() => setSide('back')}><CardView spec={spec} side="back" /><figcaption>{t.backPreview}</figcaption></figure>
        </div>
        <div className="crd-options">
          <div className="crd-option">
            <b>{t.font}</b>
            <div role="radiogroup" aria-label={t.font}>
              {(['sans', 'serif'] as CardFont[]).map((id) => <button key={id} type="button" role="radio" aria-checked={spec.font === id} data-on={spec.font === id || undefined} onClick={() => set('font', id)}>{t.fonts[id]}</button>)}
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
        </div>
        <div className="kx-spacer" />
        <KxActions>
          <button type="button" className="kx-btn" onClick={() => setStep('info')}>{k.prev}</button>
          <button type="button" className="kx-btn kx-btn--primary" onClick={() => setStep('result')}>{t.toResult}<ArrowRight size={24} strokeWidth={2.2} aria-hidden="true" /></button>
        </KxActions>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  return (
    <KxPage name="card-result">
      {top}
      <p className="crd-done" aria-hidden="true"><Check size={26} strokeWidth={3} /></p>
      <h1 className="kx-title crd-title crd-title--center crd-title--result">{t.resultTitle[0]}<br /><b>{t.resultTitle[1]}</b></h1>
      <div className="crd-final">
        <figure><figcaption>{t.front}</figcaption><CardView spec={spec} side="front" /></figure>
        <figure><figcaption>{t.back}</figcaption><CardView spec={spec} side="back" /></figure>
      </div>
      <section className="crd-file">
        <FileText size={40} strokeWidth={1.4} aria-hidden="true" />
        <div><b>{t.fileTitle}</b><span>{t.fileDesc}</span></div>
      </section>
      <div className="kx-spacer" />
      <button type="button" className="kx-btn kx-btn--wide crd-edit" onClick={() => setStep('edit')}>{t.edit}</button>
      <button type="button" className="kx-btn kx-btn--primary kx-btn--wide crd-phone" onClick={() => setSaving(true)}>{t.toPhone}<ArrowRight size={26} strokeWidth={2.3} aria-hidden="true" /></button>
      <button type="button" className="crd-home" onClick={home}>{k.home}</button>
      <KxSaveSheet open={saving} cacheKey={`${lang}|${JSON.stringify(spec)}`} build={build} onClose={() => setSaving(false)} title={t.toPhone} />
    </KxPage>
  )
}
