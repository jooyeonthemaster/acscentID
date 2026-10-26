'use client'

// 미래 직업 탐색(NEXT!) — 좋아하는 활동(8개 중 여럿) → MBTI(선택) → 상황 질문 다섯 개 → 관상(선택) → 탐색해 볼 직업 세 가지와 작은 첫 도전.
// 목업 06-future-career. 관심사가 중심이고, MBTI·관상은 재미로 곁들이는 단서다(data.ts · face.ts).
// 적성·미래를 단정하지 않는다 — 문구도 '탐색해 볼'·'첫 도전'·'재미로 보는'으로 쓴다.
// 2026-10-26 주거복지대전 제안서(질문 → 관상 찍기(AI 분석) → 사진 인화): 직업은 규칙이 고르고, AI(/api/kiosk/experience/career)가 사진·답을 보고 풀이를 쓴다.
// 관상 사진은 AI 분석에만 보내고 저장하지 않는다. 결과는 영수증 인쇄(KxReceiptSheet)와 휴대폰 저장(KxSaveSheet) 둘 다.

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  ArrowRight, CalendarDays, Check, Download, Printer, Ear, FlaskConical, Gift, GraduationCap, Hammer, HeartHandshake, Image as ImageIcon, Lightbulb, Megaphone, MessagesSquare, Palette, Presentation, Puzzle, ScanFace,
  Search, Sparkles, Users, X,
} from 'lucide-react'
import { KX_IDLE, KxCamView, KxFoot, KxHome, KxLang, KxPage, KxReceiptSheet, KxSaveSheet, KxSpinner, KxStart, KxSteps, KxTop, useKx, useKxCamera, useKxScreen, type KxShareFile } from '../kx'
import type { KxReceipt } from '../kx-receipt'
import type { CareerAiAnalysis } from '@/lib/kiosk/career-ai'
import { kxText } from '../kx-i18n'
import { canvasBlob, fillLines, fontsReady, kxFontFamily, makeCanvas, roundRect, wrapLines } from '../kx-canvas'
import { loadVision, photoCanvas, preloadVision } from '../kx-vision'
import { CAREERS, CAREER_INTERESTS, CAREER_QUESTIONS, CAREER_TOTAL, MBTI_TYPES, exploreCareers, mbtiLetters, type CareerAxis, type CareerInterest, type CareerResult, type FaceTrait, type MbtiType } from './data'
import { readFace, type FaceReading } from './face'
import { CAREER_TEXT, type CareerText } from './text'
import './career.css'

type IconType = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>
const ICONS: Record<string, IconType> = {
  palette: Palette, puzzle: Puzzle, chat: MessagesSquare, search: Search, team: Users, present: Presentation, poster: ImageIcon, plan: CalendarDays,
  megaphone: Megaphone, ear: Ear, bulb: Lightbulb, gift: Gift, hammer: Hammer, heart: HeartHandshake, spark: Sparkles, flask: FlaskConical, cap: GraduationCap,
}
const axisArt = (axis: CareerAxis) => `/assets/kiosk-experiences/career-${axis}.webp`

/** 저장용 탐색 가이드 한 장 */
async function drawGuideCard(t: CareerText, result: CareerResult, clues: string[]): Promise<Blob> {
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
  // 관심 축 둘 + 곁들인 단서(MBTI · 관상에서 가장 눈에 띈 인상) — 넘치면 거기서 멈춘다
  const tags: [string, boolean][] = [...result.axes.slice(0, 2).map((axis): [string, boolean] => [`#${t.axes[axis]}`, false]), ...clues.map((clue): [string, boolean] => [clue, true])]
  for (const [label, soft] of tags) {
    const w = ctx.measureText(label).width + 44
    if (tx + w > W - pad) break
    ctx.fillStyle = soft ? '#fde9dc' : '#dfeafd'
    roundRect(ctx, tx, 318, w, 54, 27)
    ctx.fill()
    ctx.fillStyle = soft ? orange : accent
    ctx.fillText(label, tx + 22, 329)
    tx += w + 14
  }
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

/** 관상을 읽는 동안 — 사진 위에 얼굴 윤곽과 특징점을 찍어 보인다 */
function FaceScan({ photo, reading }: { photo: string; reading: FaceReading | null }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !reading) return
    const image = new Image()
    image.onload = () => {
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const unit = canvas.width / 360
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.6 * unit
      ctx.beginPath()
      reading.outline.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)))
      ctx.closePath()
      ctx.stroke()
      ctx.fillStyle = '#ffb347'
      for (const point of reading.points) { ctx.beginPath(); ctx.arc(point.x, point.y, 2.4 * unit, 0, Math.PI * 2); ctx.fill() }
    }
    image.src = photo
  }, [photo, reading])
  return (
    <div className="crr-scan">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" draggable={false} />
      <canvas ref={ref} data-on={reading ? '' : undefined} />
      <i aria-hidden="true" />
    </div>
  )
}

export default function CareerMode() {
  const { lang, t: k } = useKx()
  const t = kxText(CAREER_TEXT, lang)
  const [step, setStep] = useState<'start' | 'ask' | 'face' | 'ai' | 'result'>('start')
  /** 0 = 활동 고르기(여러 개) · 1 = MBTI · 2~6 = 상황 질문 */
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<CareerInterest[]>([])
  const [mbti, setMbti] = useState<MbtiType | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(() => CAREER_QUESTIONS.map(() => null))
  /** 관상 — 찍은 사진(읽는 동안만 쓴다)과 읽은 결과 */
  const [shot, setShot] = useState<string | null>(null)
  const [reading, setReading] = useState<FaceReading | null>(null)
  const [traits, setTraits] = useState<FaceTrait[]>([])
  const [noFace, setNoFace] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [cluesOpen, setCluesOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  /** AI 분석 — 결과에 붙는 풀이(실패·건너뛰기면 null) */
  const [analysis, setAnalysis] = useState<CareerAiAnalysis | null>(null)
  const aiRun = useRef(0)
  const cam = useKxCamera(step === 'face' && !shot)
  const QUESTIONS_FROM = 2
  const lastAsk = QUESTIONS_FROM + CAREER_QUESTIONS.length - 1

  useKxScreen(step === 'start' ? 'start' : step === 'ai' || shot || cam.countdown !== null ? 'busy' : saving || guideOpen || cluesOpen ? KX_IDLE.save : step === 'result' ? KX_IDLE.result : step === 'face' ? KX_IDLE.camera : KX_IDLE.step)

  // 질문에 답하는 동안 얼굴 인식 도구를 조금씩 받아 둔다(관상 단계에서 기다리지 않게)
  useEffect(() => {
    if (step !== 'ask') return
    return preloadVision('face')
  }, [step])
  useEffect(() => { if (step === 'face') void loadVision('face').catch(() => {}) }, [step])

  const result = useMemo(() => (step === 'result' ? exploreCareers(picks, answers.map((a) => a ?? 0), mbti, traits) : null), [step, picks, answers, mbti, traits])
  const clueTags = useMemo(() => [...(mbti ? [mbti] : []), ...(traits[0] ? [t.traits[traits[0]][0]] : [])], [mbti, traits, t])
  const build = useCallback(async (): Promise<KxShareFile[]> => {
    if (!result) throw new Error('결과가 없습니다')
    return [{ name: 'career-guide.jpg', type: 'image/jpeg', label: t.cardLabel, blob: await drawGuideCard(t, result, clueTags) }]
  }, [result, t, clueTags])

  /** AI 분석 — 규칙이 고른 직업 셋과 답·관상 사진(있으면)을 보내 풀이를 받는다. 실패하거나 건너뛰면 풀이 없이 결과로 */
  const analyze = useCallback(async (photo: string | null, faceTraits: FaceTrait[]) => {
    const run = ++aiRun.current
    setAnalysis(null)
    setStep('ai')
    const r = exploreCareers(picks, answers.map((a) => a ?? 0), mbti, faceTraits)
    try {
      const small = photo ? (await photoCanvas(photo, 768)).toDataURL('image/jpeg', 0.85) : null
      const res = await fetch('/api/kiosk/experience/career', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(100_000),
        body: JSON.stringify({
          lang, photo: small, mbti,
          interests: picks.map((id) => t.interests[id]),
          answers: CAREER_QUESTIONS.map((_, i) => ({ label: t.questions[i].title.join(' '), value: answers[i] === null ? '' : t.questions[i].options[answers[i]!] })),
          careers: r.careers.map((id) => ({ name: t.careers[id].name, desc: t.careers[id].desc })),
          traits: faceTraits.map((trait) => t.traits[trait][0]),
        }),
      })
      const data = await res.json().catch(() => null)
      if (run === aiRun.current && res.ok && data?.analysis) setAnalysis(data.analysis as CareerAiAnalysis)
    } catch (error) {
      console.error('[kiosk] 직업 탐색 AI 분석 실패:', error)
    }
    if (run === aiRun.current) setStep('result')
  }, [picks, answers, mbti, lang, t])

  /** 관상 — 찍은 사진에서 인상을 읽는다. 읽는 동안 특징점이 찍히는 것을 잠깐 보여 준 뒤 AI 분석으로 */
  const read = useCallback(async (photo: string) => {
    setShot(photo)
    setReading(null)
    try {
      const found = await readFace(await photoCanvas(photo, 960))
      if (!found) { setNoFace(true); setShot(null); return }
      setNoFace(false)
      setReading(found)
      setTraits(found.traits)
      window.setTimeout(() => { setShot(null); void analyze(photo, found.traits) }, 2400)
    } catch (error) {
      console.error('[kiosk] 얼굴을 읽지 못했습니다:', error)
      setNoFace(true)
      setShot(null)
    }
  }, [analyze])

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
  const dots = (current: number) => <KxSteps labels={Array.from({ length: CAREER_TOTAL }, () => '')} current={current} compact />

  if (step === 'ask') {
    const kind = index === 0 ? 'interests' : index === 1 ? 'mbti' : 'question'
    const at = index - QUESTIONS_FROM
    const question = kind === 'question' ? CAREER_QUESTIONS[at] : null
    const text = kind === 'question' ? t.questions[at] : null
    const answered = kind === 'interests' ? picks.length > 0 : kind === 'mbti' ? true : answers[at] !== null
    const next = () => { if (index >= lastAsk) { setNoFace(false); setStep('face') } else setIndex(index + 1) }
    return (
      <KxPage name="career-ask">
        {top}
        {dots(index)}
        {/* 질문이 바뀔 때마다 새로 올라온다 */}
        <div className="crr-question" key={index}>
          <p className="crr-count"><b>{index + 1}</b> / {CAREER_TOTAL}</p>
          <h1 className="kx-title">{kind === 'interests' ? t.q1Title : kind === 'mbti' ? t.mbtiTitle : text!.title.map((line, i) => <span key={i}>{line}</span>)}</h1>
          <p className="kx-desc">{kind === 'interests' ? t.q1Sub : kind === 'mbti' ? t.mbtiSub : t.qSub}</p>
          {kind === 'interests' && (
            <div className="crr-tiles" role="group" aria-label={t.q1Title}>
              {CAREER_INTERESTS.map(({ id, icon }, i) => {
                const Icon = ICONS[icon]
                const on = picks.includes(id)
                return (
                  <button key={id} type="button" aria-pressed={on} className="kx-tile crr-tile" data-on={on || undefined} data-tone={i % 4 === 1 || i % 4 === 2 ? 'warm' : undefined}
                    onClick={() => setPicks((list) => (on ? list.filter((a) => a !== id) : [...list, id]))}>
                    {on && <i className="crr-check" aria-hidden="true"><Check size={18} strokeWidth={3} /></i>}
                    <span className="crr-tile-icon"><Icon size={38} strokeWidth={1.6} aria-hidden="true" /></span>
                    <b>{t.interests[id]}</b>
                  </button>
                )
              })}
            </div>
          )}
          {kind === 'mbti' && (
            <div className="crr-mbti" role="radiogroup" aria-label={t.mbtiTitle}>
              {MBTI_TYPES.map((type) => (
                <button key={type} type="button" role="radio" aria-checked={mbti === type} data-on={mbti === type || undefined} onClick={() => setMbti(mbti === type ? null : type)}>{type}</button>
              ))}
            </div>
          )}
          {kind === 'mbti' && <p className="crr-mbti-note" key={mbti ?? 'none'}>{mbti ? mbtiLetters(mbti).slice(0, 2).map((letter) => t.mbtiLetters[letter]).join(' · ') : t.mbtiSkip}</p>}
          {kind === 'question' && (
            <div className="crr-options" role="radiogroup" aria-label={text!.title.join(' ')}>
              {question!.options.map((_, i) => {
                const Icon = ICONS[question!.icons[i]]
                const on = answers[at] === i
                return (
                  <button key={i} type="button" role="radio" aria-checked={on} className="kx-tile crr-option" data-on={on || undefined}
                    onClick={() => setAnswers((list) => list.map((value, n) => (n === at ? i : value)))}>
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
        {kind === 'interests'
          ? <p className="crr-pill" aria-live="polite">{t.picked(picks.length)}</p>
          : <button type="button" className="crr-pill crr-pill--btn" onClick={() => setIndex(index - 1)}>{t.prevQ}</button>}
        <button type="button" className="kx-btn kx-btn--primary kx-btn--wide crr-next" disabled={!answered} onClick={next}>
          {kind === 'mbti' && !mbti ? t.mbtiSkip : t.nextQ}<ArrowRight size={28} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <KxFoot>{t.foot}</KxFoot>
      </KxPage>
    )
  }

  if (step === 'face') {
    return (
      <KxPage name="career-face">
        {top}
        {dots(CAREER_TOTAL - 1)}
        <h1 className="kx-title crr-face-title">{t.faceTitle.map((line, i) => <span key={i}>{line}</span>)}</h1>
        <p className="kx-desc">{t.faceSub}</p>
        <div className="kx-cam-slot">
          {shot
            ? <FaceScan photo={shot} reading={reading} />
            : (
              <KxCamView cam={cam}>
                <svg className="crr-face-guide" viewBox="0 0 300 400" aria-hidden="true"><ellipse cx="150" cy="182" rx="94" ry="126" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeDasharray="7 7" /></svg>
              </KxCamView>
            )}
        </div>
        {shot
          ? <p className="crr-reading" role="status"><KxSpinner size={24} />{t.faceReading}</p>
          : noFace
            ? <p className="crr-alert" role="alert"><b>{t.faceFail[0]}</b>{t.faceFail[1]}</p>
            : <p className="crr-privacy">{t.facePrivacy}</p>}
        <div className="crr-face-actions">
          <button type="button" className="kx-btn" disabled={Boolean(shot) || cam.countdown !== null} onClick={() => { setTraits([]); void analyze(null, []) }}>{t.faceSkip}</button>
          <button type="button" className="kx-btn kx-btn--primary" disabled={Boolean(shot) || cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((photo) => void read(photo))}>
            <ScanFace size={26} strokeWidth={2} aria-hidden="true" />{t.faceShoot}
          </button>
        </div>
        <KxFoot>{t.faceDisclaimer}</KxFoot>
      </KxPage>
    )
  }

  if (step === 'ai') {
    return (
      <KxPage name="career-ai">
        {top}
        <div className="crr-ai-wait" role="status" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/kiosk-experiences/career-hero.webp" alt="" draggable={false} />
          <KxSpinner size={40} />
          <h1 className="kx-title">{t.aiWait}</h1>
          <p className="kx-desc">{t.aiWaitSub}</p>
        </div>
        <div className="kx-spacer" />
        <button type="button" className="kx-btn kx-btn--wide" onClick={() => { aiRun.current++; setStep('result') }}>{t.aiSkip}</button>
        <KxFoot>{t.faceDisclaimer}</KxFoot>
      </KxPage>
    )
  }

  if (!result) return null
  const topCareer = result.careers[0]
  /** 영수증 — 탐색해 볼 직업 셋 · AI 풀이 · 작은 첫 도전(QR 은 영수증 창이 붙인다) */
  const receipt = (): KxReceipt => ({
    tag: 'NEXT!', title: t.resultTitle, subtitle: t.tagline,
    blocks: [
      { kind: 'image', src: axisArt(CAREERS[topCareer].primary), width: 300, tone: 160 },
      { kind: 'text', text: [...result.axes.slice(0, 2).map((axis) => `#${t.axes[axis]}`), ...clueTags.map((clue) => `#${clue}`)].join('  '), small: true, bold: true, center: true },
      { kind: 'rule' }, { kind: 'heading', text: t.receiptCareers },
      { kind: 'list', items: result.careers.map((id) => `${t.careers[id].name} — ${t.careers[id].desc}`) },
      ...(analysis ? [{ kind: 'rule' as const }, { kind: 'heading' as const, text: `${t.aiTitle} · ${analysis.headline}` }, { kind: 'text' as const, text: analysis.insight }, { kind: 'list' as const, items: [...analysis.photo, ...analysis.tips] }] : []),
      { kind: 'rule' }, { kind: 'heading', text: t.firstLabel }, { kind: 'text', text: t.careers[topCareer].first, bold: true },
      { kind: 'list', items: t.guides[CAREERS[topCareer].primary] },
      { kind: 'text', text: t.resultFoot, small: true, center: true },
    ],
    foot: t.facePrivacy,
  })
  const hasClues = Boolean(mbti) || traits.length > 0
  return (
    <KxPage name="career-result">
      {top}
      <p className="crr-done"><i aria-hidden="true"><Check size={16} strokeWidth={3} /></i>{t.done}</p>
      <h1 className="kx-title crr-result-title">{t.resultTitle}</h1>
      <p className="kx-desc">{t.resultSub}</p>
      <p className="crr-tags">
        {result.axes.slice(0, 2).map((axis) => <span key={axis}>#{t.axes[axis]}</span>)}
        {clueTags.map((clue) => <span key={clue} data-clue>{clue}</span>)}
      </p>
      {analysis && (
        <section className="crr-ai" aria-label={t.aiTitle}>
          <em><Sparkles size={16} strokeWidth={2} aria-hidden="true" />{t.aiTitle}</em>
          <b>{analysis.headline}</b>
          <p>{analysis.insight}</p>
          {analysis.photo.length + analysis.tips.length > 0 && <ul>{[...analysis.photo, ...analysis.tips].map((line, i) => <li key={i}>{line}</li>)}</ul>}
        </section>
      )}
      <ol className="crr-careers" data-tight={hasClues || Boolean(analysis) || undefined}>
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
      {hasClues && (
        <button type="button" className="crr-clues" onClick={() => setCluesOpen(true)}>
          <ScanFace size={30} strokeWidth={1.7} aria-hidden="true" />
          <span><em>{t.clues}</em><b>{[mbti, ...traits.slice(0, 2).map((trait) => t.traits[trait][0])].filter(Boolean).join(' · ')}</b></span>
          <i>{t.cluesOpen}<ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" /></i>
        </button>
      )}
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
      <div className="crr-take">
        <button type="button" className="kx-btn crr-next" onClick={() => setSaving(true)}>
          <Download size={24} strokeWidth={2.2} aria-hidden="true" />{t.save}
        </button>
        <button type="button" className="kx-btn kx-btn--primary crr-next" onClick={() => setPrinting(true)}>
          <Printer size={24} strokeWidth={2.2} aria-hidden="true" />{t.print}
        </button>
      </div>
      <KxFoot>{t.resultFoot}</KxFoot>
      {guideOpen && (
        <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={t.guideTitle} onPointerDown={(event) => { if (event.target === event.currentTarget) setGuideOpen(false) }}>
          <div className="kx-sheet-card crr-guide">
            <button type="button" className="kx-sheet-x" aria-label={k.close} onClick={() => setGuideOpen(false)}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
            <h2>{t.guideTitle}</h2>
            <p className="kx-sheet-desc">{t.careers[topCareer].first}</p>
            <ol>{t.guides[CAREERS[topCareer].primary].map((line, i) => <li key={i}><b>{i + 1}</b><span>{line}</span></li>)}</ol>
            <button type="button" className="kx-btn kx-btn--primary" onClick={() => setGuideOpen(false)}>OK</button>
          </div>
        </div>
      )}
      {cluesOpen && (
        <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={t.clues} onPointerDown={(event) => { if (event.target === event.currentTarget) setCluesOpen(false) }}>
          <div className="kx-sheet-card crr-guide crr-clue-sheet">
            <button type="button" className="kx-sheet-x" aria-label={k.close} onClick={() => setCluesOpen(false)}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
            <h2>{t.clues}</h2>
            {mbti && (
              <>
                <h3>MBTI · {mbti}</h3>
                <ul>{mbtiLetters(mbti).map((letter) => <li key={letter}><b>{letter}</b><span>{t.mbtiLetters[letter]}</span></li>)}</ul>
              </>
            )}
            {traits.length > 0 && (
              <>
                <h3>{t.faceSheetTitle}</h3>
                <ul>{traits.map((trait) => <li key={trait}><b><ScanFace size={18} strokeWidth={2} aria-hidden="true" /></b><span><strong>{t.traits[trait][0]}</strong>{t.traits[trait][1]}</span></li>)}</ul>
              </>
            )}
            <p className="kx-sheet-keep">{t.faceDisclaimer}</p>
            <button type="button" className="kx-btn kx-btn--primary" onClick={() => setCluesOpen(false)}>OK</button>
          </div>
        </div>
      )}
      <KxSaveSheet open={saving} cacheKey={`${lang}|${result.careers.join()}|${clueTags.join()}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
      <KxReceiptSheet open={printing} cacheKey={`${lang}|${result.careers.join()}|${clueTags.join()}`} build={build} receipt={receipt} onClose={() => setPrinting(false)} />
    </KxPage>
  )
}
