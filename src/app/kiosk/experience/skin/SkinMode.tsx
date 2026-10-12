'use client'

// 스킨케어(SKIN!) — 자가 체크 → 루틴 구성 → 데일리 루틴 카드. 목업 03-skincare.
// 사진을 찍거나 피부를 재지 않는다. 손님이 고른 답으로 아침·저녁 관리 순서와 사용감만 정리한다(routine.ts).

import { useCallback, useMemo, useState, type ComponentType } from 'react'
import {
  ArrowLeft, ArrowRight, Bookmark, Check, ChevronRight, ClipboardCheck, Droplet, Droplets, Leaf, Moon, Smartphone, Sparkles, Sun, SunDim, Waves, Wind,
} from 'lucide-react'
import { KX_IDLE, KxActions, KxFoot, KxHome, KxLang, KxPage, KxSaveSheet, KxStart, KxSteps, KxTop, useKx, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import { canvasBlob, fillLines, fontsReady, kxFontFamily, makeCanvas, roundRect, wrapLines } from '../kx-canvas'
import { SKIN_CARES, SKIN_FEELS, buildRoutine, type SkinCare, type SkinFeel, type SkinRoutine, type SkinStep, type SkinTexture, type SkinTime } from './routine'
import { SKIN_TEXT, type SkinText } from './text'
import './skin.css'

type Step = 'start' | 'check' | 'build' | 'result'
type IconType = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>

const FEEL_ICONS: Record<SkinFeel, IconType> = { tight: Droplet, oily: Sparkles, both: SunDim, calm: Leaf }
const CARE_ICONS: Record<SkinCare, IconType> = { moisture: Droplet, simple: Leaf, texture: Wind }
const STEP_ICONS: Record<SkinStep, IconType> = { cleanse: Waves, tone: Sparkles, moisturize: Droplets, sunscreen: Sun, soothe: Leaf }

const tipOf = (t: SkinText, step: SkinStep, feel: SkinFeel, texture: SkinTexture) =>
  step === 'cleanse' ? t.tipCleanse[feel] : step === 'moisturize' ? t.tipMoisturize[texture] : t.tips[step]

/** 저장용 루틴 카드 — 휴대폰 갤러리에 남는 한 장 */
async function drawRoutineCard(t: SkinText, feel: SkinFeel, routine: SkinRoutine): Promise<Blob> {
  const family = kxFontFamily()
  await fontsReady(`800 40px ${family}`, `500 30px ${family}`)
  const W = 1080
  const ink = '#274636', soft = '#5f7366', line = '#cfd6c7', accent = '#2c5340'
  const pad = 84
  // 높이는 내용에 따라 — 먼저 한 번 재고 그린다
  const measure = makeCanvas(W, 100)[1]
  measure.font = `500 30px ${family}`
  const rows = (['am', 'pm'] as SkinTime[]).map((time) => routine.steps[time].map((step) => ({ step, lines: wrapLines(measure, tipOf(t, step, feel, routine.texture[time]), W - pad * 2 - 150) })))
  const sectionHeight = (list: typeof rows[number]) => 96 + list.reduce((sum, row) => sum + 62 + row.lines.length * 42 + 26, 0)
  const H = 420 + sectionHeight(rows[0]) + sectionHeight(rows[1]) + 250
  const [canvas, ctx] = makeCanvas(W, H)
  ctx.fillStyle = '#f7f4ea'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#8fa593'
  ctx.lineWidth = 2
  ctx.strokeRect(24, 24, W - 48, H - 48)
  ctx.textBaseline = 'top'
  ctx.fillStyle = accent
  ctx.font = `700 26px ${family}`
  ctx.fillText('SKIN STUDIO', pad, 78)
  ctx.font = `800 76px ${family}`
  ctx.fillStyle = ink
  ctx.fillText(t.resultTitle, pad, 130)
  ctx.font = `500 32px ${family}`
  ctx.fillStyle = soft
  ctx.fillText(t.resultDesc, pad, 232)
  // 머리표
  const tag = `${t.focus[routine.focus]} · ${routine.simple ? t.pace.simple : t.pace.full}`
  ctx.font = `700 32px ${family}`
  const tagWidth = ctx.measureText(tag).width + 56
  ctx.fillStyle = '#dfe7d9'
  roundRect(ctx, pad, 300, tagWidth, 64, 10)
  ctx.fill()
  ctx.fillStyle = accent
  ctx.fillText(tag, pad + 28, 316)
  let y = 420
  ;(['am', 'pm'] as SkinTime[]).forEach((time, index) => {
    ctx.fillStyle = accent
    ctx.font = `800 44px ${family}`
    ctx.fillText(t[time], pad, y)
    ctx.fillStyle = line
    ctx.fillRect(pad + ctx.measureText(t[time]).width + 24, y + 26, W - pad * 2 - ctx.measureText(t[time]).width - 24, 2)
    y += 96
    rows[index].forEach((row, i) => {
      ctx.fillStyle = '#dfe7d9'
      ctx.beginPath()
      ctx.arc(pad + 32, y + 30, 32, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = accent
      ctx.font = `800 32px ${family}`
      ctx.textAlign = 'center'
      ctx.fillText(String(i + 1), pad + 32, y + 12)
      ctx.textAlign = 'left'
      ctx.fillStyle = ink
      ctx.font = `800 40px ${family}`
      const name = row.step === 'moisturize' ? `${t.stepNames.moisturize} · ${t.textures[routine.texture[time]]}` : t.stepNames[row.step]
      ctx.fillText(name, pad + 96, y + 6)
      ctx.fillStyle = soft
      ctx.font = `500 30px ${family}`
      y = fillLines(ctx, row.lines, pad + 96, y + 62, 42) + 26
    })
  })
  // 내 선택
  ctx.fillStyle = line
  ctx.fillRect(pad, y + 10, W - pad * 2, 2)
  ctx.fillStyle = accent
  ctx.font = `700 30px ${family}`
  ctx.fillText(t.mine, pad, y + 40)
  ctx.fillStyle = ink
  ctx.font = `600 32px ${family}`
  ctx.fillText(`${t.feelShort[feel]} · ${t.textureShort[routine.texture.pm]}`, pad, y + 88)
  ctx.fillStyle = soft
  ctx.font = `500 26px ${family}`
  ctx.fillText(t.resultFoot, pad, H - 96)
  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

export default function SkinMode() {
  const { lang, t: k } = useKx()
  const t = kxText(SKIN_TEXT, lang)
  const [step, setStep] = useState<Step>('start')
  const [feel, setFeel] = useState<SkinFeel | null>(null)
  const [cares, setCares] = useState<SkinCare[]>([])
  const [texture, setTexture] = useState<Record<SkinTime, SkinTexture> | null>(null)
  const [time, setTime] = useState<SkinTime>('am')
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const base = useMemo(() => (feel ? buildRoutine(feel, cares) : null), [feel, cares])
  // 사용감은 손님이 바꾼 값이 먼저
  const routine = useMemo<SkinRoutine | null>(() => (base ? { ...base, texture: texture ?? base.texture } : null), [base, texture])

  useKxScreen(step === 'start' ? 'start' : saving ? KX_IDLE.save : step === 'result' ? KX_IDLE.result : KX_IDLE.step)

  const toggleCare = (care: SkinCare) => { setCares((list) => (list.includes(care) ? list.filter((c) => c !== care) : [...list, care])); setTexture(null) }
  const pickFeel = (next: SkinFeel) => { setFeel(next); setTexture(null) }
  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!feel || !routine) throw new Error('루틴이 없습니다')
    return [{ name: 'skin-routine.jpg', type: 'image/jpeg', label: t.cardLabel, blob: await drawRoutineCard(t, feel, routine) }]
  }, [feel, routine, t])

  if (step === 'start') {
    return (
      <KxStart
        brand={t.brand}
        wordmark="SKIN!"
        headline={<>{t.headline}<span className="kx-headline-sub">{t.sub[0]}<br />{t.sub[1]}</span></>}
        // eslint-disable-next-line @next/next/no-img-element
        art={<img className="kx-art-blend" src="/assets/kiosk-experiences/skin-hero.webp" alt="" draggable={false} />}
        cta={t.cta}
        onStart={() => setStep('check')}
        foot={t.foot}
      >
        <ol className="skn-flow">
          {([ClipboardCheck, Leaf, Bookmark] as IconType[]).map((Icon, i) => (
            <li key={i}><span><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span>{t.steps[i]}</li>
          ))}
        </ol>
      </KxStart>
    )
  }

  const top = <KxTop left={<span className="kx-start-brand">{t.brand}</span>} right={<><KxHome /><i className="skn-bar" aria-hidden="true" /><KxLang /></>} />
  const steps = <KxSteps labels={t.steps} current={step === 'check' ? 0 : step === 'build' ? 1 : 2} pad />

  if (step === 'check') {
    return (
      <KxPage name="skin-check">
        {top}
        {steps}
        <h1 className="kx-title">{t.checkTitle}</h1>
        <p className="kx-desc">{t.checkDesc}</p>
        <section className="kx-card skn-group">
          <h2>{t.feelTitle}</h2>
          <div className="skn-options" role="radiogroup" aria-label={t.feelTitle}>
            {SKIN_FEELS.map((id) => {
              const Icon = FEEL_ICONS[id]
              return (
                <button key={id} type="button" role="radio" aria-checked={feel === id} className="kx-tile skn-option" data-on={feel === id || undefined} onClick={() => pickFeel(id)}>
                  {feel === id && <i className="skn-check" aria-hidden="true"><Check size={15} strokeWidth={2.8} /></i>}
                  <Icon size={34} strokeWidth={1.4} aria-hidden="true" />
                  <span>{t.feels[id]}</span>
                </button>
              )
            })}
          </div>
        </section>
        <section className="kx-card skn-group">
          <h2>{t.careTitle}</h2>
          <div className="skn-options" data-cols="3" role="group" aria-label={t.careTitle}>
            {SKIN_CARES.map((id) => {
              const Icon = CARE_ICONS[id]
              const on = cares.includes(id)
              return (
                <button key={id} type="button" aria-pressed={on} className="kx-tile skn-option" data-on={on || undefined} onClick={() => toggleCare(id)}>
                  {on && <i className="skn-check" aria-hidden="true"><Check size={15} strokeWidth={2.8} /></i>}
                  <Icon size={30} strokeWidth={1.4} aria-hidden="true" />
                  <span>{t.cares[id]}</span>
                </button>
              )
            })}
          </div>
          <p className="skn-note">{t.checkNote}</p>
        </section>
        <div className="skn-deco" aria-hidden="true" />
        <KxActions>
          <button type="button" className="kx-btn" onClick={() => setStep('start')}><ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />{k.prev}</button>
          <button type="button" className="kx-btn kx-btn--primary" disabled={!feel} onClick={() => { setTime('am'); setStep('build') }}>{t.toBuild}<ArrowRight size={24} strokeWidth={2.2} aria-hidden="true" /></button>
        </KxActions>
        <KxFoot>{t.checkFoot}</KxFoot>
      </KxPage>
    )
  }

  if (!feel || !routine) return null
  const chips = (
    <p className="skn-chips">
      <span><Leaf size={18} strokeWidth={1.6} aria-hidden="true" />{t.feelShort[feel]}</span>
      <span><Droplet size={18} strokeWidth={1.6} aria-hidden="true" />{step === 'build' ? t.focus[routine.focus] : t.textureShort[routine.texture.pm]}</span>
    </p>
  )

  if (step === 'build') {
    return (
      <KxPage name="skin-build">
        {top}
        <p className="skn-kicker">SKIN!</p>
        <h1 className="kx-title skn-title-left">{t.buildTitle[0]}<br />{t.buildTitle[1]}</h1>
        {chips}
        {steps}
        <div className="skn-tabs" role="tablist">
          {(['am', 'pm'] as SkinTime[]).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={time === id} data-on={time === id || undefined} onClick={() => setTime(id)}>
              {id === 'am' ? <Sun size={22} strokeWidth={1.7} aria-hidden="true" /> : <Moon size={22} strokeWidth={1.7} aria-hidden="true" />}{t[id]}
            </button>
          ))}
        </div>
        {/* 아침 ↔ 저녁을 바꾸면 줄이 새로 올라온다 */}
        <ol className="skn-list" key={time}>
          {routine.steps[time].map((id, i) => {
            const Icon = STEP_ICONS[id]
            return (
              <li key={id} className="kx-card skn-row">
                <span className="skn-row-icon"><Icon size={30} strokeWidth={1.4} aria-hidden="true" /></span>
                <div>
                  <p><b>{String(i + 1).padStart(2, '0')}</b>{t.stepNames[id]}</p>
                  <span>{t.stepDesc[id]}</span>
                  {id === 'moisturize' && (
                    <div className="skn-texture" role="radiogroup" aria-label={t.textureAsk}>
                      {(['light', 'rich'] as SkinTexture[]).map((value) => (
                        <button key={value} type="button" role="radio" aria-checked={routine.texture[time] === value} data-on={routine.texture[time] === value || undefined}
                          onClick={() => setTexture({ ...routine.texture, [time]: value })}>
                          {routine.texture[time] === value && <Check size={16} strokeWidth={2.6} aria-hidden="true" />}{t.textures[value]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        <p className="skn-note skn-note--leaf"><Leaf size={18} strokeWidth={1.6} aria-hidden="true" />{t.buildNote}</p>
        <div className="kx-spacer" />
        <KxActions>
          <button type="button" className="kx-btn" onClick={() => setStep('check')}>{k.prev}</button>
          <button type="button" className="kx-btn kx-btn--primary" onClick={() => { setOpenRow(null); setStep('result') }}>{t.toResult}<ArrowRight size={24} strokeWidth={2.2} aria-hidden="true" /></button>
        </KxActions>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  return (
    <KxPage name="skin-result">
      {top}
      <p className="skn-kicker">SKIN!</p>
      {steps}
      <h1 className="kx-title skn-title-big">{t.resultTitle}</h1>
      <p className="kx-desc">{t.resultDesc}</p>
      <section className="kx-card skn-routine">
        <p className="skn-tag"><Leaf size={20} strokeWidth={1.6} aria-hidden="true" />{t.focus[routine.focus]} · {routine.simple ? t.pace.simple : t.pace.full}</p>
        {(['am', 'pm'] as SkinTime[]).map((id) => (
          <div key={id} className="skn-day">
            <p className="skn-day-name"><span>{id === 'am' ? <Sun size={34} strokeWidth={1.4} aria-hidden="true" /> : <Moon size={34} strokeWidth={1.4} aria-hidden="true" />}</span>{t[id]}</p>
            <ol>
              {routine.steps[id].map((stepId, i) => {
                const Icon = STEP_ICONS[stepId]
                const key = `${id}-${stepId}`
                const open = openRow === key
                return (
                  <li key={stepId}>
                    <button type="button" className="skn-step" aria-expanded={open} onClick={() => setOpenRow(open ? null : key)}>
                      <b>{i + 1}</b>
                      <Icon size={24} strokeWidth={1.4} aria-hidden="true" />
                      <span>{t.stepNames[stepId]}{stepId === 'moisturize' ? ` · ${t.textures[routine.texture[id]]}` : ''}</span>
                      <ChevronRight className="skn-step-arrow" size={20} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                    {open && <p className="skn-tip">{tipOf(t, stepId, feel, routine.texture[id])}</p>}
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
        <p className="skn-mine"><i aria-hidden="true" /><span><Leaf size={16} strokeWidth={1.6} aria-hidden="true" />{t.mine}</span><i aria-hidden="true" /></p>
        {chips}
        <p className="skn-note">{t.mineNote}</p>
      </section>
      <button type="button" className="kx-card kx-tile skn-phone" onClick={() => setSaving(true)}>
        <span><Smartphone size={28} strokeWidth={1.5} aria-hidden="true" /></span>
        <div><b>{t.toPhone}</b><em>{t.toPhoneSub}</em></div>
        <ChevronRight size={24} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div className="kx-spacer" />
      <KxActions>
        <button type="button" className="kx-btn" onClick={() => setStep('check')}>{t.again}</button>
        <button type="button" className="kx-btn kx-btn--primary" onClick={() => setSaving(true)}>{t.save}<ArrowRight size={24} strokeWidth={2.2} aria-hidden="true" /></button>
      </KxActions>
      <KxFoot>{t.resultFoot}</KxFoot>
      <KxSaveSheet open={saving} cacheKey={`${lang}|${feel}|${routine.steps.am.join()}|${routine.steps.pm.join()}|${routine.texture.am}${routine.texture.pm}`} build={build} onClose={() => setSaving(false)} title={t.toPhone} />
    </KxPage>
  )
}
