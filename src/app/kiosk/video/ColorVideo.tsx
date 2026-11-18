'use client'
/* eslint-disable @next/next/no-img-element -- 방금 찍은 data: 사진 */

// COLOR! 영상판(/kiosk?mode=ai-color&lab=video, 2026-11-18) — 컬러리스트 「서하」의 아틀리에 영상 위에서 AI 퍼스널 컬러 진단을 그대로 한다.
// 진단 요청(/api/kiosk/analyze/color · 옷 · 배경을 지운 진단용 사진 colorFocusFor) · 결과지(ColorReportView)는 기본 화면(KioskClient)과 같다. 기본 화면은 그대로다.
// 장면: start 아틀리에 입구 → info 상담 탁자(이름 · 성별) → capture · confirm 북쪽 창가 → analyzing 드레이프(천을 대 보며 AI 진단) → result 거울(내 사진) · 결과지 자세히.
// 체험 화면 틀(ExperienceApp) 밖이라 카메라 화면 부품이 쓰는 문맥(언어 · 문구 · 처음으로)만 여기서 채운다. 영상 · 계획: plans.ts 의 color.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Camera, Home, RefreshCw, X } from 'lucide-react'
import { kioskText, type KioskLang } from '@/lib/kiosk/i18n'
import { programText } from '@/lib/kiosk/program-i18n'
import { programUiText } from '@/lib/kiosk/program-ui-i18n'
import { personalColorType } from '@/lib/kiosk/color-types'
import { colorFocusFor, releaseGarment } from '@/lib/kiosk/garment-recolor'
import type { ColorAnalysisResult } from '@/types/analysis'
import { KX_COMMON } from '@/app/kiosk/experience/kx-i18n'
import { KxCamView, KxContext, KxKeyboard, KxLang, useKxCamera, type KxContextValue } from '@/app/kiosk/experience/kx'
import { ColorReportView } from '@/app/kiosk/ColorReport'
import { KxVideoStage, preloadPlan } from './stage'
import { VIDEO_PROGRAMS } from './plans'
import { VideoTalk, useVideoSettle } from './ui'
import { KIOSK_FONT_CLASS } from '../fonts'
import '@/app/kiosk/experience/experience.css'
import './stage.css'

const PROGRAM = VIDEO_PROGRAMS.color
type Step = 'start' | 'info' | 'capture' | 'confirm' | 'analyzing' | 'result'
const SCENE: Record<Step, string> = { start: 'door', info: 'desk', capture: 'window', confirm: 'window', analyzing: 'drape', result: 'mirror' }
type Gender = 'Female' | 'Male' | 'Other'
/** 아무도 누르지 않으면 처음으로(초) — 결과는 길게 */
const IDLE_S: Partial<Record<Step, number>> = { info: 60, capture: 60, confirm: 60, result: 120 }

const GREET: Record<KioskLang, [string, string]> = {
  ko: ['어서 오세요! 오늘 당신한테 어울리는 색을 찾아 드릴게요.', '시작하기'],
  en: ['Welcome! Let me find the colors that suit you today.', 'Start'],
  ja: ['ようこそ！今日はあなたに似合う色を見つけますね。', 'はじめる'],
  'zh-Hans': ['欢迎！今天来帮你找到最适合你的颜色。', '开始'],
  'zh-Hant': ['歡迎！今天來幫你找到最適合你的顏色。', '開始'],
}

/** 화면 틀 — 언어 · 처음으로(새로 시작) · 카메라 화면 부품의 문맥 */
export default function ColorVideo() {
  const [lang, setLang] = useState<KioskLang>('ko')
  const [session, setSession] = useState(0)
  const home = useCallback(() => { releaseGarment(); setLang('ko'); setSession((n) => n + 1) }, [])
  const context = useMemo<KxContextValue>(() => ({
    // 체험 id 는 카메라 화면 부품에 쓰이지 않는다 — 휴대폰으로 받기(share)를 쓰지 않는 화면이라 자리만 채운다
    id: 'card', lang, setLang, t: kioskText(lang), c: KX_COMMON[lang], home, setScreen: () => {}, pc: false,
    share: () => Promise.reject(new Error('COLOR! 영상판은 휴대폰으로 받기를 쓰지 않는다')),
  }), [lang, home])
  return (
    <KxContext.Provider value={context}>
      <ColorFlow key={session} lang={lang} home={home} />
    </KxContext.Provider>
  )
}

function ColorFlow({ lang, home }: { lang: KioskLang; home: () => void }) {
  const t = kioskText(lang)
  const px = programText(lang)
  const pu = programUiText(lang)
  const tx = px.color
  const [step, setStep] = useState<Step>('start')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [typing, setTyping] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [result, setResult] = useState<ColorAnalysisResult | null>(null)
  const [error, setError] = useState<'network' | 'timeout' | 'server' | 'noFace' | null>(null)
  const [status, setStatus] = useState(0)
  const [report, setReport] = useState(false)
  const cam = useKxCamera(step === 'capture')
  const scene = SCENE[step]
  const { moving, said, onSettle } = useVideoSettle(scene, step)
  const request = useRef<AbortController | null>(null)
  useEffect(() => { preloadPlan(PROGRAM.plan) }, [])
  useEffect(() => () => request.current?.abort(), [])
  const who = lang === 'ko' ? PROGRAM.guide : 'SEOHA · colorist'

  // 진단하는 동안 서하의 대사가 차례로 바뀐다
  useEffect(() => {
    if (step !== 'analyzing' || error) return
    const timer = window.setInterval(() => setStatus((n) => (n + 1) % tx.statusLines.length), 2600)
    return () => window.clearInterval(timer)
  }, [step, error, tx.statusLines.length])

  // 아무도 없으면 처음으로 — 결과에서는 서하가 입구로 걸어 돌아가고, 다른 단계는 새로 시작
  useEffect(() => {
    const s = IDLE_S[step]
    if (!s || report || typing) return
    let last = Date.now()
    const bump = () => { last = Date.now() }
    window.addEventListener('pointerdown', bump, true)
    const timer = window.setInterval(() => { if (Date.now() - last > s * 1000) { if (step === 'result') setStep('start'); else home() } }, 1000)
    return () => { window.removeEventListener('pointerdown', bump, true); window.clearInterval(timer) }
  }, [step, report, typing, home])

  const analyze = useCallback(async (shot: string) => {
    request.current?.abort()
    const ctrl = new AbortController()
    request.current = ctrl
    setError(null); setStatus(0); setStep('analyzing')
    try {
      const focus = await colorFocusFor(shot)
      const res = await fetch('/api/kiosk/analyze/color', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(110_000)]),
        body: JSON.stringify({ name: name.trim() || t.guest, gender, imageBase64: shot, ...(focus ? { focusImage: focus.image, measure: focus.measure } : {}), lang, mock: new URLSearchParams(window.location.search).get('mock') === '1' }),
      })
      const json = await res.json().catch(() => ({})) as { success?: boolean; data?: unknown; error?: string }
      if (ctrl.signal.aborted) return
      if (json.error === 'NO_FACE') { setError('noFace'); setPhoto(null); setStep('capture'); return }
      if (!res.ok || !json.success || !json.data) { setError('server'); return }
      setResult(json.data as ColorAnalysisResult)
      setStep('result')
    } catch (e) {
      if (ctrl.signal.aborted && !(e instanceof DOMException && e.name === 'TimeoutError')) return
      setError(e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'network')
    }
  }, [name, gender, lang, t.guest])

  const restart = () => { if (step === 'result') { setReport(false); setStep('start') } else home() }
  const view = moving ? said : step
  const diag = result?.colorDiagnosis
  const line = view === 'start' ? GREET[lang][0] : view === 'info' ? t.infoTitleSelf : view === 'capture' ? tx.captureTitle : view === 'confirm' ? tx.confirmTitle
    : view === 'analyzing' ? (error && error !== 'noFace' ? t.analyzeError[`${error}Title`] : tx.statusLines[status]) : view === 'result' && diag ? `${tx.typeNames[diag.typeId]} — ${diag.title}` : ''
  const note = view === 'info' ? t.infoDesc : view === 'capture' ? (error === 'noFace' ? tx.noFace : `${tx.tips[0]} · ${tx.tips[1]}`) : view === 'confirm' ? tx.captureDesc
    : view === 'analyzing' ? (error && error !== 'noFace' ? t.analyzeError[`${error}Desc`] : tx.eta) : view === 'result' ? tx.disclaimer : undefined

  const body = () => {
    if (view === 'start') return <button type="button" className="kv-go" onClick={() => setStep('info')}>{GREET[lang][1]}<ArrowRight size={24} aria-hidden="true" /></button>
    // 이름 — 화면 키보드는 다른 체험처럼 페이지 아래에 끼우는 블록이라, 영상 위에서는 대사판 안에 띄운다(밖에 두면 영상 뒤에 깔린다)
    if (view === 'info' && typing) return <KxKeyboard value={name} onChange={setName} onClose={() => { setName((v) => v.trim()); setTyping(false) }} maxLength={12} hint={t.namePlaceholder} />
    if (view === 'info') return <>
      <button type="button" className="kv-field" onClick={() => setTyping(true)}>
        <small>{t.nameLabel} {t.nameOptional}</small>{name || <i>{t.namePlaceholder}</i>}
      </button>
      <div className="kv-seg" role="radiogroup" aria-label={t.genderLabel}>
        {(['Female', 'Male', 'Other'] as const).map((g) => <button key={g} type="button" role="radio" aria-checked={gender === g} data-on={gender === g || undefined} onClick={() => setGender(g)}>{t.gender[g]}</button>)}
      </div>
      <button type="button" className="kv-go" onClick={() => { setError(null); setStep('capture') }}>{t.next}<ArrowRight size={22} aria-hidden="true" /></button>
    </>
    if (view === 'capture') return (
      <button type="button" className="kv-go" disabled={cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((shot) => { setPhoto(shot); setError(null); setStep('confirm') })}>
        <Camera size={24} aria-hidden="true" />{t.shoot}
      </button>
    )
    if (view === 'confirm' && photo) return <>
      <div className="kv-thumb"><img src={photo} alt="" /></div>
      <div className="kv-row">
        <button type="button" className="kv-ghost" onClick={() => { setPhoto(null); setStep('capture') }}><RefreshCw size={20} aria-hidden="true" />{tx.retake}</button>
        <button type="button" className="kv-go" onClick={() => void analyze(photo)}>{t.next}<ArrowRight size={22} aria-hidden="true" /></button>
      </div>
    </>
    if (view === 'analyzing' && error && error !== 'noFace' && photo) return (
      <div className="kv-row">
        <button type="button" className="kv-ghost" onClick={() => { setPhoto(null); setError(null); setStep('capture') }}><RefreshCw size={20} aria-hidden="true" />{tx.retake}</button>
        <button type="button" className="kv-go" onClick={() => void analyze(photo)}>{t.analyzeError.retry}</button>
      </div>
    )
    if (view === 'result' && diag) return <>
      <ul className="kv-swatch-row" aria-label={tx.best}>
        {personalColorType(diag.typeId).best.map((hex, i) => <li key={hex} style={{ background: hex }} title={diag.bestColorNames[i]} />)}
      </ul>
      <button type="button" className="kv-go" onClick={() => setReport(true)}>{px.more}<ArrowRight size={22} aria-hidden="true" /></button>
    </>
    return null
  }

  return (
    <div className={`kx-root ${KIOSK_FONT_CLASS}`} style={{ background: '#000' }}>
    <div className="kv kv--page" style={{ '--kv-tone': PROGRAM.tone, '--kv-tone-light': PROGRAM.toneLight, '--kx-accent': PROGRAM.tone } as CSSProperties}>
      <KxVideoStage plan={PROGRAM.plan} scene={scene} onSettle={onSettle} art={step === 'result' && !moving ? photo : null} fit="top" />
      {/* 촬영 — 창가에서 서하가 반사판을 든 옆에 카메라 카드 */}
      {step === 'capture' && !moving && (
        <figure className="kv-cam-card kv-cam-card--right"><KxCamView cam={cam} /></figure>
      )}
      <div className="kv-top">
        <span className="kv-tag">COLOR!</span>
        {!moving && <span key={scene} className="kv-place">{PROGRAM.places[scene]}</span>}
        {step === 'start' ? <KxLang /> : <button type="button" className="kv-home" onClick={restart}><Home size={18} aria-hidden="true" />{t.home}</button>}
      </div>
      {view && line && (
        <VideoTalk key={moving ? `leave-${said}` : `${step}-${error ?? ''}`} who={who} line={line} note={note} leave={moving} wait={view === 'analyzing' && !error}>
          {body()}
        </VideoTalk>
      )}
      {report && result && (
        <div className="kv-report" role="dialog" aria-modal="true" aria-label={tx.chapter}>
          <button type="button" className="kv-report-x" aria-label={t.close ?? 'close'} onClick={() => setReport(false)}><X size={26} aria-hidden="true" /></button>
          <div className="kv-report-body"><ColorReportView result={result} photo={photo} px={px} ui={pu} name={name.trim()} /></div>
        </div>
      )}
    </div>
    </div>
  )
}
