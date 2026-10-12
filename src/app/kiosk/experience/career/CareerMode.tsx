'use client'

// 미래 직업 탐색(NEXT!) — 좋아하는 활동(여러 개) + 상황 질문 다섯 개 → 탐색해 볼 직업 세 가지와 작은 첫 도전. 목업 06-future-career.
// 관심사 기반 탐색이다(data.ts). 적성·미래를 단정하지 않는다 — 문구도 '탐색해 볼'·'첫 도전'으로 쓴다.

import { useCallback, useMemo, useState, type ComponentType } from 'react'
import {
  ArrowRight, CalendarDays, Check, Download, Ear, Gift, Hammer, HeartHandshake, Image as ImageIcon, Lightbulb, Megaphone, MessagesSquare, Palette, Presentation, Puzzle, Search, Sparkles, Users, X,
} from 'lucide-react'
import { KX_IDLE, KxFoot, KxHome, KxLang, KxPage, KxSaveSheet, KxStart, KxSteps, KxTop, useKx, useKxScreen, type KxShareFile } from '../kx'
import { kxText } from '../kx-i18n'
import { canvasBlob, fillLines, fontsReady, kxFontFamily, makeCanvas, roundRect, wrapLines } from '../kx-canvas'
import { CAREERS, CAREER_AXES, CAREER_QUESTIONS, CAREER_TOTAL, exploreCareers, type CareerAxis, type CareerResult } from './data'
import { CAREER_TEXT, type CareerText } from './text'
import './career.css'

type IconType = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>
const ICONS: Record<string, IconType> = {
  palette: Palette, puzzle: Puzzle, chat: MessagesSquare, search: Search, team: Users, present: Presentation, poster: ImageIcon, plan: CalendarDays,
  megaphone: Megaphone, ear: Ear, bulb: Lightbulb, gift: Gift, hammer: Hammer, heart: HeartHandshake, spark: Sparkles,
}
const axisArt = (axis: CareerAxis) => `/assets/kiosk-experiences/career-${axis}.webp`

/** 저장용 탐색 가이드 한 장 */
async function drawGuideCard(t: CareerText, result: CareerResult): Promise<Blob> {
  const family = kxFontFamily()
  await fontsReady(`800 40px ${family}`, `500 30px ${family}`)
  const W = 1080, pad = 80
  const ink = '#10358f', soft = '#4a5f8f', accent = '#1946cd', orange = '#f2702a'
  const measure = makeCanvas(W, 10)[1]
  measure.font = `500 31px ${family}`
  const cards = result.careers.map((id) => ({ id, lines: wrapLines(measure, t.careers[id].desc, W - pad * 2 - 80) }))
  const top = result.careers[0]
  const guide = t.guides[CAREERS[top].primary]
  measure.font = `700 36px ${family}`
  const firstLines = wrapLines(measure, t.careers[top].first, W - pad * 2 - 80)
  measure.font = `500 30px ${family}`
  const guideLines = guide.map((line) => wrapLines(measure, line, W - pad * 2 - 150))
  const H = 400 + cards.reduce((sum, card) => sum + 150 + card.lines.length * 44, 0) + 150 + firstLines.length * 50 + guideLines.reduce((sum, lines) => sum + lines.length * 42 + 22, 0) + 190
  const [canvas, ctx] = makeCanvas(W, H)
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#dff0fe')
  sky.addColorStop(0.5, '#f4faff')
  sky.addColorStop(1, '#ffffff')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'
  ctx.fillStyle = accent
  ctx.font = `900 64px Impact, ${family}`
  ctx.fillText('NEXT!', pad, 70)
  ctx.fillStyle = ink
  ctx.font = `900 74px ${family}`
  ctx.fillText(t.resultTitle, pad, 160)
  ctx.fillStyle = soft
  ctx.font = `500 32px ${family}`
  ctx.fillText(t.resultSub, pad, 258)
  ctx.font = `700 30px ${family}`
  let tx = pad
  result.axes.slice(0, 2).forEach((axis) => {
    const label = `#${t.axes[axis]}`
    const w = ctx.measureText(label).width + 44
    ctx.fillStyle = '#dfeafd'
    roundRect(ctx, tx, 318, w, 54, 27)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillText(label, tx + 22, 329)
    tx += w + 14
  })
  let y = 410
  cards.forEach((card, index) => {
    const h = 122 + card.lines.length * 44
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, pad - 20, y, W - (pad - 20) * 2, h, 28)
    ctx.fill()
    ctx.fillStyle = index === 0 ? orange : accent
    ctx.font = `900 34px ${family}`
    ctx.fillText(String(index + 1).padStart(2, '0'), pad + 16, y + 34)
    ctx.fillStyle = ink
    ctx.font = `900 46px ${family}`
    ctx.fillText(t.careers[card.id].name, pad + 86, y + 26)
    ctx.fillStyle = soft
    ctx.font = `500 31px ${family}`
    fillLines(ctx, card.lines, pad + 86, y + 92, 44)
    y += h + 20
  })
  // 작은 첫 도전
  y += 14
  ctx.fillStyle = orange
  ctx.font = `800 32px ${family}`
  ctx.fillText(t.firstLabel, pad, y)
  ctx.fillStyle = ink
  ctx.font = `700 36px ${family}`
  y = fillLines(ctx, firstLines, pad, y + 50, 50) + 22
  guideLines.forEach((lines, i) => {
    ctx.fillStyle = '#dfeafd'
    ctx.beginPath()
    ctx.arc(pad + 24, y + 22, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.font = `800 26px ${family}`
    ctx.textAlign = 'center'
    ctx.fillText(String(i + 1), pad + 24, y + 8)
    ctx.textAlign = 'left'
    ctx.fillStyle = soft
    ctx.font = `500 30px ${family}`
    y = fillLines(ctx, lines, pad + 70, y + 4, 42) + 22
  })
  ctx.fillStyle = soft
  ctx.font = `500 25px ${family}`
  ctx.fillText(t.resultFoot, pad, H - 90)
  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

export default function CareerMode() {
  const { lang } = useKx()
  const t = kxText(CAREER_TEXT, lang)
  const [step, setStep] = useState<'start' | 'ask' | 'result'>('start')
  /** 0 = 첫 질문(여러 개), 1~5 = 상황 질문 */
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<CareerAxis[]>([])
  const [answers, setAnswers] = useState<(number | null)[]>(() => CAREER_QUESTIONS.map(() => null))
  const [guideOpen, setGuideOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useKxScreen(step === 'start' ? 'start' : saving || guideOpen ? KX_IDLE.save : step === 'result' ? KX_IDLE.result : KX_IDLE.step)

  const result = useMemo(() => (step === 'result' ? exploreCareers(picks, answers.map((a) => a ?? 0)) : null), [step, picks, answers])
  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!result) throw new Error('결과가 없습니다')
    return [{ name: 'career-guide.jpg', type: 'image/jpeg', label: t.cardLabel, blob: await drawGuideCard(t, result) }]
  }, [result, t])

  if (step === 'start') {
    return (
      <KxStart
        brand={<KxHome />}
        wordmark="NEXT!"
        headline={t.headline}
        // eslint-disable-next-line @next/next/no-img-element
        art={<img className="kx-art-blend" src="/assets/kiosk-experiences/career-hero.webp" alt="" draggable={false} />}
        cta={t.cta}
        onStart={() => { setIndex(0); setStep('ask') }}
        foot={t.foot}
      >
        <p className="crr-sub">{t.sub}</p>
        <p className="crr-note">{t.note}</p>
      </KxStart>
    )
  }

  const top = <KxTop left={<KxHome />} center={<p className="crr-mark"><b>NEXT!</b><span>{t.tagline}</span></p>} right={<KxLang />} />

  if (step === 'ask') {
    const first = index === 0
    const question = first ? null : CAREER_QUESTIONS[index - 1]
    const text = first ? null : t.questions[index - 1]
    const answered = first ? picks.length > 0 : answers[index - 1] !== null
    const next = () => { if (index + 1 >= CAREER_TOTAL) setStep('result'); else setIndex(index + 1) }
    return (
      <KxPage name="career-ask">
        {top}
        <KxSteps labels={Array.from({ length: CAREER_TOTAL }, () => '')} current={index} compact />
        {/* 질문이 바뀔 때마다 새로 올라온다 */}
        <div className="crr-question" key={index}>
          <p className="crr-count"><b>{index + 1}</b> / {CAREER_TOTAL}</p>
          <h1 className="kx-title">{first ? t.q1Title : text!.title.map((line, i) => <span key={i}>{line}</span>)}</h1>
          <p className="kx-desc">{first ? t.q1Sub : t.qSub}</p>
          {first ? (
            <div className="crr-tiles" role="group" aria-label={t.q1Title}>
              {CAREER_AXES.map((axis) => {
                const on = picks.includes(axis)
                return (
                  <button key={axis} type="button" aria-pressed={on} className="kx-tile crr-tile" data-on={on || undefined}
                    onClick={() => setPicks((list) => (on ? list.filter((a) => a !== axis) : [...list, axis]))}>
                    {on && <i className="crr-check" aria-hidden="true"><Check size={22} strokeWidth={3} /></i>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={axisArt(axis)} alt="" draggable={false} />
                    <span>{t.axes[axis]}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="crr-options" role="radiogroup" aria-label={text!.title.join(' ')}>
              {question!.options.map((_, i) => {
                const Icon = ICONS[question!.icons[i]]
                const on = answers[index - 1] === i
                return (
                  <button key={i} type="button" role="radio" aria-checked={on} className="kx-tile crr-option" data-on={on || undefined}
                    onClick={() => setAnswers((list) => list.map((value, at) => (at === index - 1 ? i : value)))}>
                    <span className="crr-option-icon"><Icon size={40} strokeWidth={1.6} aria-hidden="true" /></span>
                    <b>{text!.options[i]}</b>
                    <i className="crr-radio" aria-hidden="true">{on && <Check size={20} strokeWidth={3} />}</i>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="kx-spacer" />
        {first
          ? <p className="crr-pill" aria-live="polite">{t.picked(picks.length)}</p>
          : <button type="button" className="crr-pill crr-pill--btn" onClick={() => setIndex(index - 1)}>{t.prevQ}</button>}
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide crr-next" disabled={!answered} onClick={next}>
          {index + 1 >= CAREER_TOTAL ? t.seeResult : t.nextQ}<ArrowRight size={28} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (!result) return null
  const topCareer = result.careers[0]
  return (
    <KxPage name="career-result">
      {top}
      <p className="crr-done"><i aria-hidden="true"><Check size={16} strokeWidth={3} /></i>{t.done}</p>
      <h1 className="kx-title crr-result-title">{t.resultTitle}</h1>
      <p className="kx-desc">{t.resultSub}</p>
      <p className="crr-tags">{result.axes.slice(0, 2).map((axis) => <span key={axis}>#{t.axes[axis]}</span>)}</p>
      <ol className="crr-careers">
        {result.careers.map((id) => {
          const career = CAREERS[id]
          return (
            <li key={id} className="crr-career">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={axisArt(career.primary)} alt="" draggable={false} />
              <div>
                <b>{t.careers[id].name}</b>
                <span>{t.careers[id].desc}</span>
                <p className="crr-tags">{[career.primary, career.secondary].filter((axis): axis is CareerAxis => Boolean(axis)).map((axis) => <span key={axis}>#{t.axes[axis]}</span>)}</p>
              </div>
            </li>
          )
        })}
      </ol>
      <section className="crr-first">
        <Lightbulb size={38} strokeWidth={1.6} aria-hidden="true" />
        <div>
          <em>{t.firstLabel}</em>
          <b>{t.careers[topCareer].first}</b>
          <span>{t.firstNote}</span>
        </div>
        <button type="button" onClick={() => setGuideOpen(true)}>{t.guide}<ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" /></button>
      </section>
      <div className="kx-spacer" />
      <button type="button" className="kx-btn kx-btn--primary kx-btn--wide crr-next" onClick={() => setSaving(true)}>
        <Download size={26} strokeWidth={2.2} aria-hidden="true" />{t.save}
      </button>
      <KxFoot>{t.resultFoot}</KxFoot>
      {guideOpen && (
        <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={t.guideTitle} onPointerDown={(event) => { if (event.target === event.currentTarget) setGuideOpen(false) }}>
          <div className="kx-sheet-card crr-guide">
            <button type="button" className="kx-sheet-x" aria-label="close" onClick={() => setGuideOpen(false)}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
            <h2>{t.guideTitle}</h2>
            <p className="kx-sheet-desc">{t.careers[topCareer].first}</p>
            <ol>{t.guides[CAREERS[topCareer].primary].map((line, i) => <li key={i}><b>{i + 1}</b><span>{line}</span></li>)}</ol>
            <button type="button" className="kx-btn kx-btn--primary" onClick={() => setGuideOpen(false)}>OK</button>
          </div>
        </div>
      )}
      <KxSaveSheet open={saving} cacheKey={`${lang}|${result.careers.join()}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
    </KxPage>
  )
}
