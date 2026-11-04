'use client'

// SCENT! AI 조향사 — 레시피 영수증: 출력 준비 · 인쇄 중 · 출력 완료 / 프린터 없는 웹은 미리보기·PNG 저장 (목업 06 · 07)
// 단계는 실제 프린터 응답으로만 넘어간다(셸의 printReceiptData): 인쇄 요청 중 = printing, 성공 응답 = printedOnce,
// 실패 응답 = printError(안내창). 결과의 출력 버튼을 누르면 첫 장을 바로 인쇄하고 미리보기를 함께 띄운다 —
// 인쇄 확인을 한 번 더 묻지 않는다. 연타는 셸이 막는다(receiptOpeningRef · printBusyRef).
// 화면의 영수증은 실제 인쇄 원판(80mm 흑백 PNG) 그대로다.

import { Check, Download, LoaderCircle, Printer } from 'lucide-react'
import { PERFUMER_ART } from '@/lib/kiosk/perfumer-art'
import { BottomBar, Btn, Lines } from './ui'
import type { PerfumerCtx } from './types'

export type ReceiptPhase = 'preparing' | 'preview' | 'printing' | 'done'

/** 지금 보여 줄 영수증 화면 — null 이면 결과 화면 */
export function receiptPhaseOf(ctx: PerfumerCtx): ReceiptPhase | null {
  if (!ctx.receipt) return ctx.receiptBusy ? 'preparing' : null
  if (ctx.printing) return 'printing'
  if (!ctx.hasPrinter) return 'preview'
  if (ctx.printedOnce) return 'done'
  // 프린터가 있고 아직 한 장도 못 뽑았다 — 곧 인쇄가 시작되거나(출력 준비 중), 실패해서 안내창이 떠 있다
  return 'preparing'
}

function ml(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function Paper({ src, alt, tall }: { src: string | null; alt: string; tall?: boolean }) {
  return (
    <div className="pf-paper" data-tall={tall || undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
      ) : (
        <div className="pf-paper-wait" role="status"><LoaderCircle className="pf-spin" size={36} strokeWidth={1.4} aria-hidden="true" /></div>
      )}
    </div>
  )
}

export function ReceiptScreen({ ctx, phase }: { ctx: PerfumerCtx; phase: ReceiptPhase }) {
  if (phase === 'printing') return <PrintingView ctx={ctx} />
  if (phase === 'done') return <DoneView ctx={ctx} />
  return <PreviewView ctx={ctx} />
}

function PreviewView({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  const name = ctx.name.trim()
  return (
    <section className="pf-screen pf-receipt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pf-qr-bg" src={PERFUMER_ART.qr} alt="" aria-hidden="true" />
      <div className="pf-receipt-head">
        {ctx.hasPrinter && (
          <span className="pf-badge" data-tone={ctx.printError ? 'warn' : undefined}>
            {ctx.printError ? p.printFailTitle.replace('\n', ' ') : p.preparing}
          </span>
        )}
        <h1 className="pf-title pf-title--center">{p.receiptTitle}</h1>
        <p className="pf-desc pf-desc--center">{[ctx.product.label, name].filter(Boolean).join(' · ')}</p>
      </div>
      <Paper src={ctx.receipt?.dataUrl ?? null} alt={t.receiptAlt} />
      {!ctx.hasPrinter && <p className="pf-note pf-note--center">{p.previewNote}</p>}
      {ctx.hasPrinter ? (
        <BottomBar>
          <Btn onClick={ctx.closeReceipt}>{t.close}</Btn>
          {ctx.printError ? (
            <Btn variant="primary" icon={<Printer size={22} strokeWidth={1.6} aria-hidden="true" />} onClick={ctx.printAgain}>{p.printRetry}</Btn>
          ) : (
            <Btn variant="primary" disabled>{p.preparing}</Btn>
          )}
        </BottomBar>
      ) : (
        <>
          <BottomBar>
            <Btn onClick={ctx.closeReceipt}>{p.backToResult}</Btn>
            <Btn variant="primary" icon={<Download size={22} strokeWidth={1.6} aria-hidden="true" />} disabled={!ctx.receipt} onClick={ctx.savePng}>{t.savePng}</Btn>
          </BottomBar>
          <button type="button" className="pf-textlink" onClick={ctx.home}>{p.finish}</button>
        </>
      )}
    </section>
  )
}

function PrintingView({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  return (
    <section className="pf-screen pf-receipt pf-printing" aria-busy="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pf-qr-bg" src={PERFUMER_ART.qr} alt="" aria-hidden="true" />
      <div className="pf-receipt-head">
        <h1 className="pf-title pf-title--center"><Lines text={p.printingTitle} /></h1>
        <p className="pf-desc pf-desc--center pf-printing-sub">{p.printingSub(ctx.ticket, ctx.name.trim())}</p>
        <p className="pf-desc pf-desc--center">{p.printingWait}</p>
      </div>
      {/* 프린터 그림 — 실제 원판이 출력구에서 천천히 올라온다 */}
      <div className="pf-printer" aria-hidden="true">
        <div className="pf-printer-paper">
          {ctx.receipt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ctx.receipt.dataUrl} alt="" />
          )}
        </div>
        <div className="pf-printer-body"><i /></div>
      </div>
      <BottomBar single>
        <Btn variant="primary" wide disabled icon={<LoaderCircle className="pf-spin" size={22} strokeWidth={1.8} aria-hidden="true" />}>{p.printingBtn}</Btn>
      </BottomBar>
      <p className="pf-note pf-note--center pf-printing-foot">{p.printingFoot}</p>
      <span className="pf-sr" role="status">{t.printing}</span>
    </section>
  )
}

function DoneView({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  const product = ctx.product
  return (
    <section className="pf-screen pf-receipt pf-done">
      <div className="pf-receipt-head">
        <span className="pf-done-check" aria-hidden="true"><Check size={46} strokeWidth={2.6} /></span>
        <h1 className="pf-title pf-title--center"><Lines text={p.doneTitle} /></h1>
        <p className="pf-desc pf-desc--center pf-done-desc">{p.doneDesc}</p>
      </div>
      <div className="pf-done-visual">
        <div className="pf-done-receipt">
          {ctx.receipt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ctx.receipt.dataUrl} alt={t.receiptAlt} />
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pf-done-bottle" src={PERFUMER_ART.done} alt="" aria-hidden="true" />
      </div>
      <ul className="pf-spec">
        <li>{product.label}</li>
        <li>{p.fragrance(ml(product.fragranceMl))}</li>
        <li>{p.base(ml(product.baseMl))}</li>
      </ul>
      <Btn variant="outline" wide icon={<Printer size={22} strokeWidth={1.6} aria-hidden="true" />} onClick={ctx.printAgain} disabled={ctx.printing}>{t.printAgain}</Btn>
      <button type="button" className="pf-textlink" onClick={ctx.closeReceipt}>{p.viewResult}</button>
      <BottomBar single>
        <Btn variant="primary" wide arrow onClick={ctx.home}>{p.finish}</Btn>
      </BottomBar>
    </section>
  )
}
