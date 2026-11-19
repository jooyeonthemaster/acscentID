'use client'
/* eslint-disable @next/next/no-img-element -- 방금 찍은 data: 사진 */

// COLOR! 영상판(/kiosk?mode=ai-color&lab=video, 2026-11-18) — 컬러리스트 「서하」의 아틀리에 영상 위에서 AI 퍼스널 컬러 진단을 그대로 한다.
// 진단 요청(/api/kiosk/analyze/color · 옷 · 배경을 지운 진단용 사진 colorFocusFor)은 기본 화면(KioskClient)과 같다. 결과는 세로로 늘어뜨린 영수증 한 장(자세한 결과지 · 색 견본 없음). 기본 화면은 그대로다.
// 장면: start 아틀리에 입구 → info 상담 탁자(이름 · 성별) → capture · confirm 북쪽 창가 → analyzing 드레이프(천을 대 보며 AI 진단) → result 거울(내 사진) · 결과지 자세히.
// 체험 화면 틀(ExperienceApp) 밖이라 카메라 화면 부품이 쓰는 문맥(언어 · 문구 · 처음으로)만 여기서 채운다. 영상 · 계획: plans.ts 의 color.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Camera, Printer, RefreshCw } from 'lucide-react'
import { KIOSK_LANGS, kioskText, type KioskLang } from '@/lib/kiosk/i18n'
import { programText } from '@/lib/kiosk/program-i18n'
import { programUiText } from '@/lib/kiosk/program-ui-i18n'
import { colorFocusFor, releaseGarment } from '@/lib/kiosk/garment-recolor'
import { buildReceiptColor } from '@/lib/kiosk/extra-receipt'
import type { ColorAnalysisResult } from '@/types/analysis'
import { KX_COMMON } from '@/app/kiosk/experience/kx-i18n'
import { KxCamView, KxContext, KxKeyboard, KxLang, KxReceiptSheet, useKxCamera, type KxContextValue } from '@/app/kiosk/experience/kx'
import { uploadShare, type KxShare, type KxShareFile } from '@/app/kiosk/experience/kx-share'
import { drawColorCard } from '@/app/kiosk/pc/color-card'
import { KxVideoStage, preloadPlan, rectStyle, type KxRect } from './stage'
import { renderKxReceipt } from '@/app/kiosk/experience/kx-receipt'
import { VIDEO_PROGRAMS } from './plans'
import { TITLE_TAG, VideoArrive, VideoTalk, VideoTitle, VideoTop, useVideoSettle } from './ui'
import { useVideoStamp, videoReceipt } from './video-receipt'
import { KIOSK_FONT_CLASS } from '../fonts'
import '@/app/kiosk/experience/experience.css'
import './stage.css'

const PROGRAM = VIDEO_PROGRAMS.color
/** 결과 장면의 영수증 — 서하 옆 거울 앞에 세로로 크게(2026-11-18 사용자 지시: 거울 속 사진 대신 영수증을 소개하듯, 11-19 더 길게). 720×1280 기준, 영수증 출력 버튼 위까지 */
const SLIP: KxRect = { x: 300, y: 112, w: 400, h: 830 }
/** 화면 영수증이 도장 그림을 기다리는 시간 — 넘으면 기본 도장으로 먼저 보이고, 인쇄는 다시 기다린다 */
const SLIP_STAMP_MS = 15_000
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
  // 올린 결과(영수증 QR) — 같은 결과는 한 번만 올린다. 처음으로 돌아가면 비운다(ExperienceApp 과 같은 규칙)
  const [shares] = useState(() => new Map<string, KxShare>())
  const home = useCallback(() => { releaseGarment(); shares.clear(); setLang('ko'); setSession((n) => n + 1) }, [shares])
  const share = useCallback(async (cacheKey: string, build: () => Promise<KxShareFile[]>) => {
    const kept = shares.get(cacheKey)
    if (kept && kept.expiresAt > Date.now() + 60000) return kept
    const made = await uploadShare('color', lang, await build())
    shares.set(cacheKey, made)
    return made
  }, [lang, shares])
  const context = useMemo<KxContextValue>(() => ({
    // 체험 id 는 카메라 화면 부품에 쓰이지 않는다 — 영수증 QR 은 퍼스널 컬러 결과 카드(share 'color')로 올린다
    id: 'card', lang, setLang, t: kioskText(lang), c: KX_COMMON[lang], home, setScreen: () => {}, pc: false, share,
  }), [lang, home, share])
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
  const [printing, setPrinting] = useState(false)
  // 시작 화면(SIP! 처럼) — 누르면 서하의 인사. 결과에서 처음으로 가면(누르거나 오래 두면) 다시 시작 화면
  const [titled, setTitled] = useState(false)
  const cam = useKxCamera(step === 'capture')
  const scene = SCENE[step]
  const { moving, said, onSettle } = useVideoSettle(scene, step)
  const request = useRef<AbortController | null>(null)
  useEffect(() => { preloadPlan(PROGRAM.plan) }, [])
  useEffect(() => () => request.current?.abort(), [])
  const who = lang === 'ko' ? PROGRAM.guideName : 'Seoha'
  // 영수증 맨 위 도장 — 진단을 시작할 때 같이 그리기 시작해(진단 20초 남짓과 겹친다) 영수증을 열 때 받는다
  const stampOf = useVideoStamp('color', photo, step === 'analyzing' || step === 'result')

  // 진단하는 동안 서하의 대사가 차례로 바뀐다
  useEffect(() => {
    if (step !== 'analyzing' || error) return
    const timer = window.setInterval(() => setStatus((n) => (n + 1) % tx.statusLines.length), 2600)
    return () => window.clearInterval(timer)
  }, [step, error, tx.statusLines.length])

  // 아무도 없으면 처음으로 — 결과에서는 서하가 입구로 걸어 돌아가고, 다른 단계는 새로 시작
  useEffect(() => {
    const s = IDLE_S[step]
    if (!s || typing || printing) return
    let last = Date.now()
    const bump = () => { last = Date.now() }
    window.addEventListener('pointerdown', bump, true)
    const timer = window.setInterval(() => { if (Date.now() - last > s * 1000) { if (step === 'result') { setPrinting(false); setStep('start'); setTitled(false) } else home() } }, 1000)
    return () => { window.removeEventListener('pointerdown', bump, true); window.clearInterval(timer) }
  }, [step, typing, printing, home])

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

  const restart = () => { if (step === 'result') { setPrinting(false); setStep('start'); setTitled(false) } else home() }

  // 영수증 — 맨 위 '아틀리에에 선 나' 도장, 유형 · 톤 눈금 · 어울리는 색 · 스타일링 · 서하의 한마디, 휴대폰으로 받기 QR(결과 카드), 서하의 사인
  const receiptWith = useCallback((stamp: string | null) => {
    if (!result) throw new Error('결과가 없습니다')
    const rc = buildReceiptColor(result, px)
    return videoReceipt({
      program: 'color', lang, stamp, sections: [
        { kind: 'big', label: 'YOUR COLOR', title: rc.typeName, sub: rc.nickname, pill: rc.undertone },
        { kind: 'scales', label: 'YOUR TONE', rows: rc.gauges.map((g) => ({ title: g.label, lo: g.low, hi: g.high, v: 1 + g.value / 25 })) },
        { kind: 'rows', label: 'COLORS', rows: [[rc.bestLabel, rc.bestNames.join(' · ')], [rc.avoidLabel, rc.avoidNames.join(' · ')]] },
        { kind: 'rows', label: 'STYLING', rows: rc.styling.map((s) => [s.label, s.text] as [string, string]) },
        { kind: 'note', label: "SEOHA'S NOTE", text: rc.summary },
      ],
    })
  }, [result, px, lang])
  const receipt = useCallback(async () => receiptWith(await stampOf()), [receiptWith, stampOf])

  // 결과 장면 영수증 그림 — 도착하면 한 번 그린다(QR 은 인쇄할 때만 올려 만들므로 화면 것은 QR 없이)
  const [slip, setSlip] = useState<{ of: ColorAnalysisResult; url: string } | null>(null)
  const arrived = step === 'result' && !moving
  useEffect(() => {
    if (!arrived || !result || slip?.of === result) return
    let alive = true
    void (async () => {
      const locale = KIOSK_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'
      const when = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
      const made = await renderKxReceipt(receiptWith(await stampOf(SLIP_STAMP_MS)), null, when).catch(() => null)
      if (alive && made) setSlip({ of: result, url: made.dataUrl })
    })()
    return () => { alive = false }
  }, [arrived, result, slip, lang, receiptWith, stampOf])
  const buildCard = useCallback(async (): Promise<KxShareFile[]> => {
    if (!result) throw new Error('결과가 없습니다')
    const date = new Intl.DateTimeFormat(KIOSK_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
    return [{ name: 'personal-color.jpg', type: 'image/jpeg', label: tx.receipt.title, blob: await drawColorCard({ result, px, ui: pu, name: name.trim(), photo, date }) }]
  }, [result, px, pu, name, photo, lang, tx.receipt.title])
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
    // 결과 — 색 견본 · 자세히 보기는 빼고(2026-11-19 사용자 지시) 영수증 출력 하나만. 내용은 위에 늘어뜨린 영수증이 보여 준다
    if (view === 'result' && diag) return (
      <button type="button" className="kv-go" onClick={() => setPrinting(true)}><Printer size={22} aria-hidden="true" />{KX_COMMON[lang].receipt}</button>
    )
    return null
  }

  return (
    <div className={`kx-root ${KIOSK_FONT_CLASS}`} style={{ background: '#000' }}>
    <div className="kv kv--page" style={{ '--kv-tone': PROGRAM.tone, '--kv-tone-light': PROGRAM.toneLight, '--kx-accent': PROGRAM.tone } as CSSProperties}>
      <KxVideoStage plan={PROGRAM.plan} scene={scene} onSettle={onSettle} />
      {/* 결과 — 거울 앞에 영수증이 프린터 입구에서 세로로 내려온다(서하가 옆에서 소개). 길면 손으로 올려 본다 */}
      {arrived && result && (
        <figure className="kv-slip" style={rectStyle(SLIP)} aria-label={KX_COMMON[lang].receipt}>
          <i className="kv-slip-slot" aria-hidden="true" />
          <div className="kv-slip-paper">
            {slip?.of === result
              ? <div className="kv-slip-roll"><img src={slip.url} alt="" draggable={false} /></div>
              : <span className="kv-slip-wait" aria-hidden="true"><i /><i /><i /></span>}
          </div>
        </figure>
      )}
      {/* 촬영 — 창가에서 서하가 반사판을 든 옆에 카메라 카드 */}
      {step === 'capture' && !moving && (
        <figure className="kv-cam-card kv-cam-card--right"><KxCamView cam={cam} /></figure>
      )}
      <i className="kv-shade" aria-hidden="true" />
      {!titled && <VideoTitle mark="COLOR!" tag={TITLE_TAG.color[lang]} lang={lang} onStart={() => setTitled(true)} corner={<KxLang />} />}
      {titled && <>
      <VideoTop mark="COLOR!" place={moving ? null : PROGRAM.placesKo[scene]} onHome={restart} homeLabel={t.home} start={step === 'start' ? <KxLang /> : undefined} />
      {!moving && scene !== 'mirror' && <VideoArrive key={`a-${scene}`} en={PROGRAM.places[scene]} ko={PROGRAM.placesKo[scene]} />}
      {view && line && (
        <VideoTalk key={moving ? `leave-${said}` : `${step}-${error ?? ''}`} who={who} role={PROGRAM.guideRole} line={line} note={note} leave={moving} wait={view === 'analyzing' && !error}>
          {body()}
        </VideoTalk>
      )}
      </>}
      {result && <KxReceiptSheet open={printing} cacheKey={`color|${lang}|${result.colorDiagnosis.typeId}|${result.colorDiagnosis.title}|${name.trim()}|${photo?.length ?? 0}`} build={buildCard} receipt={receipt} onClose={() => setPrinting(false)} />}
    </div>
    </div>
  )
}
