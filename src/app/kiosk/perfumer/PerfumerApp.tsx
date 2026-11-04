'use client'

// SCENT! AI 조향사(ai-perfumer) 전용 화면 — 목업 docs/design-mockups/scent-ai-perfumer-redesign-20261028(01–08).
// 기존(classic) 셸이 모든 상태·동작을 들고 이 화면에 넘긴다(types.ts PerfumerCtx). 이 모드는 기기의 화면 디자인
// 설정(기존·레트로·맥)과 상관없이 늘 이 화면으로 돈다(KioskScreen → KioskClassic design="perfumer").

import { useEffect, useState } from 'react'
import { preloadPerfumerArt } from '@/lib/kiosk/perfumer-art'
import { KIOSK_LANGS, isCjkLang } from '@/lib/kiosk/i18n'
import { CJK_FONT_STACK } from '../fonts'
import { AttractScreen, InfoScreen, PickScreen } from './InputScreens'
import { CaptureScreen } from './CaptureScreens'
import { AnalyzeErrorScreen, AnalyzingScreen } from './AnalyzeScreens'
import { ResultScreen } from './ResultScreen'
import { ReceiptScreen, receiptPhaseOf } from './ReceiptScreens'
import { IdleDialog, LanguageDialog, PrintFailDialog, QrExpiredDialog } from './Dialogs'
import { TopBar } from './ui'
import type { PerfumerCtx } from './types'
import './perfumer.css'

export function PerfumerApp({ ctx }: { ctx: PerfumerCtx }) {
  // 언어 창은 연 화면에서만 — 다음 단계·다음 손님 화면에 남지 않게 연 단계를 함께 적는다
  const [langOpenAt, setLangOpenAt] = useState<string | null>(null)
  // 결과 탭은 그 결과에만 — 새 결과(다음 손님)는 첫 탭부터
  const [tabState, setTabState] = useState<{ result: unknown; tab: number }>({ result: null, tab: 0 })
  const { step } = ctx
  const tab = tabState.result === ctx.result ? tabState.tab : 0
  const setTab = (next: number) => setTabState({ result: ctx.result, tab: next })
  const langOpen = langOpenAt === step && !ctx.langLocked

  // 첫 화면(손님 없음)에서 단계 그림을 미리 받아 둔다 — 손님이 진행하는 동안 큰 파일을 받지 않게
  useEffect(() => {
    if (step === 'attract') preloadPerfumerArt()
  }, [step])


  const receiptPhase = step === 'result' ? receiptPhaseOf(ctx) : null
  const qrExpired = step === 'capture' && !ctx.photo && ctx.photoSource === 'qr' && ctx.qr.state === 'expired'
  const font = isCjkLang(ctx.lang) ? CJK_FONT_STACK[ctx.lang] : undefined

  let screen: React.ReactNode = null
  if (step === 'attract') screen = <AttractScreen ctx={ctx} />
  else if (step === 'info') screen = <InfoScreen ctx={ctx} />
  else if (step === 'style' || step === 'personality' || step === 'charm') screen = <PickScreen ctx={ctx} kind={step} key={step} />
  else if (step === 'capture') screen = <CaptureScreen ctx={ctx} />
  else if (step === 'analyzing') screen = ctx.analyzeError ? <AnalyzeErrorScreen ctx={ctx} /> : <AnalyzingScreen ctx={ctx} />
  else if (step === 'result') screen = receiptPhase ? <ReceiptScreen ctx={ctx} phase={receiptPhase} /> : <ResultScreen ctx={ctx} tab={tab} onTab={setTab} />

  return (
    <div
      className="pf-root"
      data-step={step}
      data-receipt={receiptPhase ?? undefined}
      data-lang={ctx.lang}
      lang={KIOSK_LANGS.find((l) => l.id === ctx.lang)?.htmlLang ?? 'ko'}
      style={font ? ({ '--pf-font': font } as React.CSSProperties) : undefined}
    >
      <TopBar ctx={ctx} onLanguage={() => setLangOpenAt(step)} />
      <main className="pf-main" key={`${step}-${receiptPhase ?? ''}`}>{screen}</main>

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
