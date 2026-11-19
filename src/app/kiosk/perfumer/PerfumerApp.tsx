'use client'

// SCENT! AI 조향사(ai-perfumer) 전용 화면 — 목업 docs/design-mockups/scent-ai-perfumer-redesign-20261028(01–08).
// 기존(classic) 셸이 모든 상태·동작을 들고 이 화면에 넘긴다(types.ts PerfumerCtx). 이 모드는 기기의 화면 디자인
// 설정(기존·레트로·맥)과 상관없이 늘 이 화면으로 돈다(KioskScreen → KioskClassic design="perfumer").
// 영상판(모드 ai-perfumer-video · 데모 주소 &lab=video — 셸이 ctx.variant 'video' 로 알린다): 실사 조향사 하린을 따라 향수 하우스 여덟 곳을 걷는 영상을 깔고, 화면은 아래 대화판 안에(scent-plan.ts · 공용 재생기 ../video/stage.tsx · scent-motion.css).

import { useEffect, useState } from 'react'
import { preloadPerfumerArt } from '@/lib/kiosk/perfumer-art'
import { KIOSK_LANGS, isCjkLang } from '@/lib/kiosk/i18n'
import { CJK_FONT_STACK } from '../fonts'
import { AttractScreen, InfoScreen, PickScreen, VideoAttractScreen } from './InputScreens'
import { CaptureScreen } from './CaptureScreens'
import { AnalyzeErrorScreen, AnalyzingScreen } from './AnalyzeScreens'
import { ResultScreen } from './ResultScreen'
import { ReceiptScreen, receiptPhaseOf } from './ReceiptScreens'
import { IdleDialog, LanguageDialog, PrintFailDialog, QrExpiredDialog } from './Dialogs'
import { TopBar } from './ui'
import { KeyboardPop } from './KeyboardPop'
import { KxVideoStage, preloadPlan } from '../video/stage'
import { useVideoSettle } from '../video/ui'
import { GUIDE, SCENE_OF, SCENT_PLAN } from './scent-plan'
import type { PerfumerCtx } from './types'
import './perfumer.css'
import './scent-motion.css'

export function PerfumerApp({ ctx }: { ctx: PerfumerCtx }) {
  // 언어 창은 연 화면에서만 — 다음 단계·다음 손님 화면에 남지 않게 연 단계를 함께 적는다
  const [langOpenAt, setLangOpenAt] = useState<string | null>(null)
  // 결과 탭은 그 결과에만 — 새 결과(다음 손님)는 첫 탭부터
  const [tabState, setTabState] = useState<{ result: unknown; tab: number }>({ result: null, tab: 0 })
  const { step } = ctx
  const tab = tabState.result === ctx.result ? tabState.tab : 0
  const setTab = (next: number) => setTabState({ result: ctx.result, tab: next })
  const langOpen = langOpenAt === step && !ctx.langLocked

  // 영상판 — 운영 모드 ai-perfumer-video, 또는 데모 주소 ai-perfumer + &lab=video(셸 KioskClassic 이 정한다)
  const video = ctx.variant === 'video'
  const scene = SCENE_OF[step]
  /** moving: 하린이 가야 할 장소에 아직 안 닿음(마저 틀기 + 이동 중) — 그동안 대화판을 숨기고, 떠나기 직전 단계(said) 판을 가라앉히며 지운다 */
  const settle = useVideoSettle(scene, step)
  const moving = video && settle.moving
  const shown = moving ? settle.said ?? step : step

  // 첫 화면(손님 없음)에서 단계 그림을 미리 받아 둔다 — 손님이 진행하는 동안 큰 파일을 받지 않게
  useEffect(() => {
    if (step !== 'attract') return
    if (video) preloadPlan(SCENT_PLAN)
    else preloadPerfumerArt()
  }, [step, video])


  const receiptPhase = shown === 'result' ? receiptPhaseOf(ctx) : null
  const qrExpired = step === 'capture' && !ctx.photo && ctx.photoSource === 'qr' && ctx.qr.state === 'expired'
  const font = isCjkLang(ctx.lang) ? CJK_FONT_STACK[ctx.lang] : undefined

  let screen: React.ReactNode = null
  if (shown === 'attract') screen = video ? <VideoAttractScreen ctx={ctx} /> : <AttractScreen ctx={ctx} />
  else if (shown === 'info') screen = <InfoScreen ctx={ctx} keyboardApart={video} />
  else if (shown === 'style' || shown === 'personality' || shown === 'charm') screen = <PickScreen ctx={ctx} kind={shown} key={shown} />
  else if (shown === 'capture') screen = <CaptureScreen ctx={ctx} />
  else if (shown === 'analyzing') screen = ctx.analyzeError ? <AnalyzeErrorScreen ctx={ctx} /> : <AnalyzingScreen ctx={ctx} />
  else if (shown === 'result') screen = receiptPhase ? <ReceiptScreen ctx={ctx} phase={receiptPhase} /> : <ResultScreen ctx={ctx} tab={tab} onTab={setTab} />

  return (
    <div
      className="pf-root"
      data-step={step}
      data-video={video || undefined}
      data-shown={video ? shown : undefined}
      data-receipt={receiptPhase ?? undefined}
      data-lang={ctx.lang}
      lang={KIOSK_LANGS.find((l) => l.id === ctx.lang)?.htmlLang ?? 'ko'}
      style={font ? ({ '--pf-font': font } as React.CSSProperties) : undefined}
    >
      {video && <div className="scv-bg" aria-hidden="true"><KxVideoStage plan={SCENT_PLAN} scene={scene} onSettle={settle.onSettle} /></div>}
      <TopBar ctx={ctx} onLanguage={() => setLangOpenAt(step)} />
      <main className="pf-main" key={`${shown}-${receiptPhase ?? ''}`} data-leave={moving || undefined}>
        {video && shown !== 'attract' && <p className="scv-speaker">{ctx.lang === 'ko' ? GUIDE.ko : GUIDE.other}<span>PERFUMER</span></p>}
        {screen}
      </main>

      {video && !moving && shown === 'info' && ctx.keyboardOpen && <KeyboardPop>{ctx.keyboard}</KeyboardPop>}

      {qrExpired && <QrExpiredDialog ctx={ctx} />}
      {ctx.printError && ctx.receipt && <PrintFailDialog ctx={ctx} />}
      {langOpen && <LanguageDialog ctx={ctx} onClose={() => setLangOpenAt(null)} />}
      {ctx.idleLeft !== null && <IdleDialog ctx={ctx} />}
      {ctx.toast && <div className="pf-toast" role="status">{ctx.toast}</div>}

      {ctx.adminPanel}
      {ctx.adminHotspot}
    </div>
  )
}

