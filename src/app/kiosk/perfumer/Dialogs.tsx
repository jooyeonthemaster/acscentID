'use client'

// SCENT! AI 조향사 — 화면 위 안내창: 언어 선택 · 무입력 안내 · QR 만료 · 출력 실패 (목업 07)

import { useState } from 'react'
import { Check, Clock, Printer, QrCode } from 'lucide-react'
import { KIOSK_LANGS, type KioskLang } from '@/lib/kiosk/i18n'
import { Btn, Dialog, Lines } from './ui'
import type { PerfumerCtx } from './types'

export function LanguageDialog({ ctx, onClose }: { ctx: PerfumerCtx; onClose: () => void }) {
  const { p } = ctx
  // 고른 뒤 '선택 완료'로 바꾼다 — 목록을 누르는 순간 화면 전체 글자가 바뀌면 다른 줄을 잘못 누르기 쉽다
  const [pending, setPending] = useState<KioskLang>(ctx.lang)
  return (
    <Dialog labelId="pf-lang-title" onBackdrop={onClose}>
      <h2 id="pf-lang-title" className="pf-dialog-title">{p.langTitle}</h2>
      <p className="pf-dialog-sub">{p.langSub}</p>
      <ul className="pf-langs" role="radiogroup" aria-labelledby="pf-lang-title">
        {KIOSK_LANGS.map((option) => {
          const on = option.id === pending
          return (
            <li key={option.id}>
              <button type="button" role="radio" aria-checked={on} data-on={on || undefined} lang={option.htmlLang} onClick={() => setPending(option.id)}>
                <span className="pf-radio" aria-hidden="true">{on && <Check size={16} strokeWidth={3} />}</span>
                {option.label}
              </button>
            </li>
          )
        })}
      </ul>
      <Btn variant="primary" wide arrow onClick={() => { ctx.setLang(pending); onClose() }}>{p.langDone}</Btn>
    </Dialog>
  )
}

/** 무입력 안내 — 어디를 눌러도(셸의 pointerdown) 시간이 다시 채워지고 닫힌다. '처음으로'는 바로 처음 화면으로 */
export function IdleDialog({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  const left = ctx.idleLeft ?? 0
  const R = 52
  const C = 2 * Math.PI * R
  return (
    <Dialog labelId="pf-idle-title" role="alertdialog">
      <h2 id="pf-idle-title" className="pf-dialog-title">{p.idleTitle}</h2>
      <div className="pf-idle-ring" role="timer" aria-live="assertive">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={R} className="pf-idle-track" />
          <circle cx="60" cy="60" r={R} className="pf-idle-arc" strokeDasharray={C} strokeDashoffset={C * (1 - left / ctx.idleTotal)} />
        </svg>
        <span>{left}</span>
      </div>
      <p className="pf-dialog-desc">{p.idleDesc}</p>
      <Btn variant="primary" wide>{t.idleContinue}</Btn>
      <Btn variant="ghost" wide onClick={ctx.home}>{t.home}</Btn>
    </Dialog>
  )
}

export function QrExpiredDialog({ ctx }: { ctx: PerfumerCtx }) {
  const { p, t } = ctx
  return (
    <Dialog labelId="pf-qr-expired" role="alertdialog">
      <h2 id="pf-qr-expired" className="pf-dialog-title">{p.qrExpiredTitle}</h2>
      <span className="pf-dialog-icon pf-dialog-icon--qr" aria-hidden="true">
        <QrCode size={78} strokeWidth={1} />
        <Clock size={36} strokeWidth={1.6} />
      </span>
      <p className="pf-dialog-desc">{p.qrExpiredDesc}</p>
      <p className="pf-dialog-sub pf-dialog-sub--blue">{p.keptChoices}</p>
      <Btn variant="primary" wide onClick={ctx.regenQr}>{t.regenQr}</Btn>
      <Btn variant="ghost" wide onClick={ctx.useCamera}>{t.useCamera}</Btn>
    </Dialog>
  )
}

export function PrintFailDialog({ ctx }: { ctx: PerfumerCtx }) {
  const { p } = ctx
  const persona = ctx.result?.matchingPerfumes?.[0]?.persona
  const name = ctx.name.trim()
  return (
    <Dialog labelId="pf-print-fail" role="alertdialog">
      <h2 id="pf-print-fail" className="pf-dialog-title"><Lines text={p.printFailTitle} /></h2>
      <span className="pf-dialog-icon" aria-hidden="true"><Printer size={70} strokeWidth={1.1} /></span>
      <div className="pf-dialog-card">
        <b>{[ctx.ticket ? `#${ctx.ticket}` : null, name || null].filter(Boolean).join(' · ') || p.receiptTitle}</b>
        <span>{[persona?.name, ctx.product.label].filter(Boolean).join(' · ')}</span>
      </div>
      <p className="pf-dialog-desc">{p.printFailDesc}</p>
      {ctx.printError && <p className="pf-dialog-sub">{ctx.printError}</p>}
      <Btn variant="primary" wide onClick={ctx.printAgain}>{p.printRetry}</Btn>
      <Btn variant="ghost" wide onClick={() => { ctx.dismissPrintError(); ctx.closeReceipt() }}>{p.backToResult}</Btn>
    </Dialog>
  )
}

