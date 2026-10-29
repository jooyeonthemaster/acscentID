'use client'

// SCENT! AI 조향사 — 화면마다 같이 쓰는 부품: 머리띠(워드마크·홈·언어), 단계 점, 단계 이름, 고정 하단 버튼, 안내창.

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight, ChevronDown, House } from 'lucide-react'
import { KIOSK_LANGS } from '@/lib/kiosk/i18n'
import type { PerfumerCtx, PfStep } from './types'

/** 세리프 SCENT! — 느낌표만 코발트 */
export function Wordmark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <span className="pf-wordmark" data-size={size} aria-label="SCENT!">
      SCENT<em>!</em>
    </span>
  )
}

export function TopBar({ ctx, onLanguage }: { ctx: PerfumerCtx; onLanguage: () => void }) {
  const langLabel = KIOSK_LANGS.find((l) => l.id === ctx.lang)?.label ?? ''
  return (
    <header className="pf-top">
      <div className="pf-top-brand">
        <Wordmark />
        <span>{ctx.p.brandSub}</span>
      </div>
      <div className="pf-top-tools">
        <button type="button" className="pf-icon-btn" aria-label={ctx.p.homeAria} onClick={ctx.home}>
          <House size={24} strokeWidth={1.6} aria-hidden="true" />
        </button>
        {ctx.langLocked ? (
          <span className="pf-lang-btn" data-locked="true">{langLabel}</span>
        ) : (
          <button type="button" className="pf-lang-btn" aria-haspopup="dialog" aria-label={ctx.t.langMenuLabel} onClick={onLanguage}>
            <span lang={KIOSK_LANGS.find((l) => l.id === ctx.lang)?.htmlLang}>{langLabel}</span>
            <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  )
}

/** 입력 다섯 단계 — 지금 단계는 코발트, 지난 단계는 옅은 코발트 */
export function StepDots({ ctx }: { ctx: PerfumerCtx }) {
  const index = ctx.inputSteps.indexOf(ctx.step)
  if (index < 0) return null
  return (
    <ol className="pf-dots" aria-label={`${index + 1} / ${ctx.inputSteps.length}`}>
      {ctx.inputSteps.map((step, i) => (
        <li key={step} data-state={i < index ? 'done' : i === index ? 'now' : 'todo'} />
      ))}
    </ol>
  )
}

/** '02 / 05  스타일' */
export function StepHead({ ctx, step }: { ctx: PerfumerCtx; step: Exclude<PfStep, 'attract' | 'analyzing' | 'result'> }) {
  const index = ctx.inputSteps.indexOf(step)
  return (
    <p className="pf-stephead">
      <b>{String(index + 1).padStart(2, '0')}</b>
      <span> / {String(ctx.inputSteps.length).padStart(2, '0')}</span>
      <em>{ctx.p.stepNames[step]}</em>
    </p>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'text'
  icon?: ReactNode
  arrow?: boolean
  wide?: boolean
}

export function Btn({ variant = 'ghost', icon, arrow, wide, className, children, type = 'button', ...rest }: BtnProps) {
  return (
    <button type={type} className={`pf-btn${className ? ` ${className}` : ''}`} data-variant={variant} data-wide={wide || undefined} {...rest}>
      {icon}
      <span>{children}</span>
      {arrow && <ArrowRight className="pf-btn-arrow" size={22} strokeWidth={1.8} aria-hidden="true" />}
    </button>
  )
}

/** 화면 맨 아래 고정 버튼 줄 — 내용이 길어도 가려지지 않는다 */
export function BottomBar({ children, single }: { children: ReactNode; single?: boolean }) {
  return <div className="pf-bottom" data-single={single || undefined}>{children}</div>
}

/** 화면 위 안내창(언어·무입력·QR 만료·출력 실패) — 뒤 화면은 흐리게 */
export function Dialog({ labelId, children, onBackdrop, role = 'dialog' }: {
  labelId: string
  children: ReactNode
  onBackdrop?: () => void
  role?: 'dialog' | 'alertdialog'
}) {
  return (
    <div className="pf-dialog-layer">
      <button type="button" className="pf-dialog-backdrop" tabIndex={-1} aria-hidden="true" onClick={onBackdrop} />
      <div className="pf-dialog" role={role} aria-modal="true" aria-labelledby={labelId}>
        {children}
      </div>
    </div>
  )
}

/** 줄바꿈(\n)이 든 제목 */
export function Lines({ text }: { text: string }) {
  const parts = text.split('\n')
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}
