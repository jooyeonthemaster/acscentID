'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleHelp, Home, Loader2, RefreshCw, Smartphone, X } from 'lucide-react'
import { EXPANSION_META, type ExpansionId, type ExperienceResult } from '@/lib/kiosk/expansion/types'
import { useKx, useKxScreen } from '../kx'
import type { KxShare } from '../kx-share'
import { canvasBlob, drawCover, fontsReady, kxFontFamily, loadImage, makeCanvas, wrapLines } from '../kx-canvas'

export function PrimaryButton({ children, onClick, disabled, secondary }: { children: ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean }) {
  return <button type="button" className={`ex-button${secondary ? ' ex-button--secondary' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const list = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,[tabindex="0"]') ?? [])
      const first = list[0], last = list.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  return <div className="ex-overlay"><div ref={ref} className="ex-dialog" role="dialog" aria-modal="true" aria-label={title}>
    <div className="ex-dialog-head"><h2>{title}</h2><button type="button" className="ex-icon" aria-label="닫기" onClick={onClose}><X /></button></div>{children}
  </div></div>
}

export function ExpansionFrame({ title, subtitle, onBack, children, actions, busy, screen = 100 }: { title: string; subtitle?: string; onBack?: () => void; children: ReactNode; actions?: ReactNode; busy?: boolean; screen?: 'start' | 'busy' | number }) {
  const { id, home } = useKx()
  const meta = EXPANSION_META[id as ExpansionId]
  const [dialog, setDialog] = useState<'help' | 'home' | null>(null)
  const body = useRef<HTMLDivElement>(null)
  useKxScreen(busy ? 'busy' : dialog ? 180 : screen)
  useEffect(() => { body.current?.scrollTo(0, 0) }, [title])
  return <section className="ex-frame" data-page={title}>
    <header className="ex-top">
      <button type="button" className="ex-nav" onClick={onBack ?? (() => setDialog('home'))} disabled={busy} aria-label={onBack ? '이전' : '처음으로'}>{onBack ? <ArrowLeft size={20} /> : <Home size={19} />}<span>{onBack ? '이전' : '처음으로'}</span></button>
      <b className="ex-mark">{meta.tag}</b>
      <div className="ex-top-tools">{onBack && <button type="button" className="ex-nav" onClick={() => setDialog('home')} disabled={busy} aria-label="처음으로"><Home size={20} /></button>}<button type="button" className="ex-nav" onClick={() => setDialog('help')} aria-label="도움말"><CircleHelp size={21} /></button></div>
    </header>
    <div ref={body} className="ex-body" tabIndex={-1}>
      <div className="ex-heading"><p className="ex-eyebrow">{meta.name}</p><h1 className="ex-title">{title}</h1>{subtitle && <p className="ex-subtitle">{subtitle}</p>}</div>
      {children}
    </div>
    {actions && <footer className="ex-actions">{actions}</footer>}
    {dialog === 'home' && <Dialog title="처음으로 돌아갈까요?" onClose={() => setDialog(null)}><p>현재 입력과 촬영 사진이 지워집니다. 결과가 필요하다면 먼저 휴대폰으로 받아 주세요.</p><div className="ex-stack"><PrimaryButton onClick={() => setDialog(null)}>계속 체험하기</PrimaryButton><PrimaryButton secondary onClick={home}>입력 지우고 처음으로</PrimaryButton></div></Dialog>}
    {dialog === 'help' && <Dialog title="편하게 체험해 보세요" onClose={() => setDialog(null)}><ol className="ex-guide"><li><b>직접 선택해요</b><span>마음에 드는 카드를 누르세요. 선택한 항목에는 체크가 표시됩니다.</span></li><li><b>언제든 바꿀 수 있어요</b><span>이전 버튼으로 돌아가 답을 수정하면 결과에도 반영됩니다.</span></li><li><b>내 휴대폰으로 가져가요</b><span>완성한 결과는 QR로 받을 수 있습니다. 저장 링크는 24시간 동안 열립니다.</span></li></ol><p className="ex-note">카메라·인터넷·전시 연결이 되지 않으면 현장 운영자에게 알려 주세요. 이 체험은 한국어로 제공됩니다.</p><PrimaryButton onClick={() => setDialog(null)}>알겠어요</PrimaryButton></Dialog>}
  </section>
}

export function ExpansionStart({ id, headline, description, onStart }: { id: ExpansionId; headline?: string; description?: string; onStart: () => void }) {
  useKxScreen('start')
  const meta = EXPANSION_META[id]
  return <section className="ex-start" data-page="start">
    <header className="ex-start-top"><span>{meta.category} · INTERACTIVE EXPERIENCE</span><span>한국어</span></header>
    <h1 className="ex-wordmark" data-long={meta.tag.length > 6}>{meta.tag}</h1>
    <h2>{headline ?? meta.name}</h2>
    <div className="ex-hero">
      {/* Artwork contains no interface text; every control is a real element. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.hero} alt="" fetchPriority="high" />
    </div>
    <p className="ex-start-copy">{description ?? meta.note}</p>
    <div className="ex-start-steps"><span>01. 체험하기</span><span>02. 내 결과 보기</span><span>03. 휴대폰 저장</span></div>
    <PrimaryButton onClick={onStart}>체험 시작하기 <ArrowRight size={25} /></PrimaryButton>
    <p className="ex-start-foot">화면을 터치해 나만의 이야기를 찾아보세요</p>
  </section>
}

export function ChoiceTile({ label, note, selected, onClick, color, children }: { label: string; note?: string; selected: boolean; onClick: () => void; color?: string; children?: ReactNode }) {
  return <button type="button" className="ex-choice" aria-pressed={selected} onClick={onClick} data-selected={selected || undefined}>
    {color && <span className="ex-swatch" style={{ background: color }} aria-hidden="true" />}{children}
    <span className="ex-choice-text"><b>{label}</b>{note && <small>{note}</small>}</span><span className="ex-choice-check" aria-hidden="true">{selected && <Check size={16} />}</span>
  </button>
}

function MetricChart({ result }: { result: ExperienceResult }) {
  const metrics = result.metrics ?? []
  if (metrics.length < 3 || metrics.some(m => m.max !== metrics[0].max)) return null
  const point = (i: number, radius: number) => { const a = (i / metrics.length * Math.PI * 2) - Math.PI / 2; return [150 + Math.cos(a) * radius, 140 + Math.sin(a) * radius] }
  const polygon = (r: number) => metrics.map((_, i) => point(i, r).join(',')).join(' ')
  return <svg className="ex-radar" viewBox="0 0 300 280" role="img" aria-label={metrics.map(m => `${m.label} ${m.value}/${m.max}`).join(', ')}>
    {[1, .75, .5, .25].map((n) => <polygon key={n} points={polygon(88 * n)} fill="none" stroke="var(--kx-line)" />)}
    {metrics.map((m, i) => { const [x, y] = point(i, 88), [tx, ty] = point(i, 112); return <g key={m.label}><path d={`M150,140 L${x},${y}`} stroke="var(--kx-line)" /><text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle">{m.label}</text></g> })}
    <polygon points={metrics.map((m, i) => point(i, Math.max(0, Math.min(1, m.value / Math.max(1, m.max))) * 88).join(',')).join(' ')} fill="var(--kx-accent-soft)" stroke="var(--kx-accent)" strokeWidth="2" />
  </svg>
}

export function ResultPanel({ result }: { result: ExperienceResult }) {
  return <article className="ex-result" data-result={result.id}>
    <div className="ex-result-intro"><p className="ex-eyebrow">MY EXPERIENCE CARD</p>{result.subtitle && <p className="ex-result-sub">{result.subtitle}</p>}<h2>{result.title}</h2><p>{result.summary}</p><div className="ex-tags">{result.tags.map((tag, i) => <span key={`${tag}-${i}`}>{tag}</span>)}</div></div>
    {!!result.palette?.length && <div className="ex-palette">{result.palette.map((color, i) => <div key={`${color}-${i}`}><span style={{ background: color }} /><small>{color}</small></div>)}</div>}
    {!!result.metrics?.length && <div className="ex-panel ex-metrics"><MetricChart result={result} /><div className="ex-stack">{result.metrics.map(m => <div key={m.label} className="ex-metric"><span>{m.label}<b>{m.value}<small> / {m.max}</small></b></span><meter min={0} max={m.max} value={m.value} style={{ accentColor: m.color }}>{m.value}</meter></div>)}</div></div>}
    {result.sections.map((section, i) => <section className="ex-panel" key={`${section.title}-${i}`}><h3>{section.title}</h3><p>{section.body}</p>{section.items?.length ? <ul className="ex-detail-list">{section.items.map((item, n) => <li key={n}>{item}</li>)}</ul> : null}</section>)}
    {result.footnote && <p className="ex-note">{result.footnote}</p>}
  </article>
}

/** Export all result text (including sections below the viewport), with measured line heights. */
export async function renderExperienceCard(id: ExpansionId, result: ExperienceResult) {
  const meta = EXPANSION_META[id], family = kxFontFamily()
  await fontsReady(`500 28px ${family}`, `800 44px ${family}`)
  const [, measure] = makeCanvas(900, 100)
  const blocks: { text: string; size: number; weight: number; color: string; gap: number }[] = [
    { text: meta.tag + '  /  ' + meta.name, size: 26, weight: 800, color: meta.color, gap: 20 },
    { text: result.title, size: 48, weight: 800, color: meta.color, gap: 14 },
    ...(result.subtitle ? [{ text: result.subtitle, size: 26, weight: 600, color: '#625C61', gap: 16 }] : []),
    { text: result.summary, size: 28, weight: 500, color: '#302E32', gap: 20 },
    { text: result.tags.map(x => '#'+x).join('  '), size: 23, weight: 600, color: meta.color, gap: 24 },
    ...(result.metrics ?? []).map(m => ({ text: `${m.label}   ${m.value} / ${m.max}`, size: 26, weight: 600, color: '#302E32', gap: 10 })),
    ...result.sections.flatMap(s => [
      { text: s.title, size: 32, weight: 800, color: meta.color, gap: 10 },
      { text: [s.body, ...(s.items ?? []).map(x => '• '+x)].join('\n'), size: 26, weight: 500, color: '#302E32', gap: 28 },
    ]),
    ...(result.footnote ? [{ text: result.footnote, size: 22, weight: 500, color: '#625C61', gap: 18 }] : []),
    { text: '나의 체험 가이드 · '+new Date().toLocaleDateString('ko-KR'), size: 21, weight: 500, color: '#625C61', gap: 0 },
  ]
  const laid = blocks.map(b => { measure.font = `${b.weight} ${b.size}px ${family}`; const lines = wrapLines(measure, b.text, 756); return { ...b, lines, height: lines.length * b.size * 1.55 + b.gap } })
  const paletteHeight = result.palette?.length ? 86 : 0
  const art = await loadImage(meta.hero).catch(() => null)
  const artHeight = art ? 330 : 0
  const height = Math.ceil(144 + artHeight + paletteHeight + laid.reduce((n, b) => n + b.height, 0))
  const [canvas, ctx] = makeCanvas(900, height)
  ctx.fillStyle = '#F9F6EF'; ctx.fillRect(0, 0, 900, height)
  ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; ctx.strokeRect(25, 25, 850, height - 50)
  let y = 70
  if (art) { drawCover(ctx, art, 72, y, 756, 300); y += artHeight }
  ctx.textBaseline = 'top'
  for (let i = 0; i < laid.length; i++) {
    const b = laid[i]; ctx.font = `${b.weight} ${b.size}px ${family}`; ctx.fillStyle = b.color
    b.lines.forEach((line, n) => ctx.fillText(line, 72, y + n * b.size * 1.55)); y += b.height
    if (i === 1 && result.palette?.length) { const w = 756 / result.palette.length; result.palette.forEach((c, n) => { ctx.fillStyle = c; ctx.fillRect(72 + n * w, y, w, 58) }); y += paletteHeight }
  }
  return canvasBlob(canvas, 'image/jpeg', .88)
}

export function ExpansionSave({ result, onBack, onComplete }: { result: ExperienceResult; onBack: () => void; onComplete: () => void }) {
  const { id, share } = useKx()
  const [status, setStatus] = useState<'confirm' | 'loading' | 'ready' | 'error'>('confirm')
  const [file, setFile] = useState<KxShare | null>(null)
  const [now, setNow] = useState(Date.now)
  const request = useRef(0)
  const mounted = useRef(true)
  const nonce = useRef(0)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const expired = !!file && file.expiresAt <= now
  const upload = async () => {
    if (status === 'loading') return
    const ticket = ++request.current
    setStatus('loading'); setFile(null)
    try {
      // The complete content, not only result.id, is part of the cache identity.
      const key = `expansion:${id}:${JSON.stringify(result)}:${nonce.current}`
      const made = await share(key, async () => [{ name: 'experience-card.jpg', type: 'image/jpeg', label: result.title, blob: await renderExperienceCard(id as ExpansionId, result) }])
      if (!mounted.current || request.current !== ticket) return
      setFile(made); setNow(Date.now()); setStatus('ready')
    } catch { if (mounted.current && request.current === ticket) setStatus('error') }
  }
  return <ExpansionFrame title="내 휴대폰으로 가져가요" subtitle="나만의 체험 카드가 오래 기억되도록" onBack={onBack} screen={180} actions={status === 'ready' && !expired ? <PrimaryButton onClick={onComplete}>저장했어요 <Check size={22} /></PrimaryButton> : <PrimaryButton secondary onClick={onBack}>결과로 돌아가기</PrimaryButton>}>
    <div className="ex-save-card">
      {status === 'confirm' && <><Smartphone size={56} /><h2>{result.title}</h2><p>체험 결과를 이미지로 준비해 QR로 받아요.</p><p className="ex-note">QR을 만들면 결과 카드만 서버에 24시간 보관됩니다. 촬영한 얼굴·손 사진은 포함되지 않습니다.</p><PrimaryButton onClick={() => void upload()}>저장용 QR 만들기</PrimaryButton></>}
      {status === 'loading' && <div role="status" className="ex-stack ex-center"><Loader2 className="kx-spin" size={48} /><h2>카드를 준비하고 있어요</h2><p>결과 이미지를 안전하게 올리는 중이에요.</p></div>}
      {status === 'error' && <div role="alert" className="ex-stack"><h2>저장 링크를 만들지 못했어요</h2><p>입력과 결과는 그대로 있어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p><PrimaryButton onClick={() => void upload()}><RefreshCw size={22} />다시 시도하기</PrimaryButton></div>}
      {status === 'ready' && file && (expired ? <div role="status" className="ex-stack"><h2>QR 유효시간이 지났어요</h2><p>새로운 저장 링크를 만들 수 있어요.</p><PrimaryButton onClick={() => { nonce.current++; void upload() }}>새 QR 만들기</PrimaryButton></div> : <>
        <p className="ex-eyebrow">SCAN & KEEP</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ex-qr" src={file.qr} alt="체험 결과 저장 링크 QR 코드" />
        <h2>휴대폰 카메라로 비춰 주세요</h2><p>링크를 열고 ‘다운로드’를 누르면<br />결과 카드를 저장할 수 있어요.</p><p className="ex-note">유효시간: {new Date(file.expiresAt).toLocaleString('ko-KR')}까지</p>
        <a className="ex-save-link" href={file.url} target="_blank" rel="noopener noreferrer">저장 페이지 열기 ↗</a>
      </>)}
    </div>
  </ExpansionFrame>
}

export function Completion({ title = '오늘의 체험을 간직하세요', onBack }: { title?: string; onBack?: () => void }) {
  const { home } = useKx()
  const [left, setLeft] = useState(15)
  useEffect(() => { const timer = window.setInterval(() => setLeft(n => Math.max(0, n - 1)), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { if (!left) home() }, [left, home])
  return <ExpansionFrame title="체험이 끝났어요" screen={30} onBack={onBack} actions={<PrimaryButton onClick={home}>입력 지우고 처음으로 <Home size={21} /></PrimaryButton>}><div className="ex-complete"><span><Check size={60} /></span><h2>{title}</h2><p>다음 체험자를 위해<br />{left}초 뒤 입력과 사진을 지워요.</p>{onBack && <PrimaryButton secondary onClick={onBack}>결과 다시 보기</PrimaryButton>}</div></ExpansionFrame>
}
