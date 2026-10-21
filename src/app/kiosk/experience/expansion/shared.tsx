'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleHelp, Home, Printer, Smartphone, X } from 'lucide-react'
import { PHOTO_PLANS } from '@/lib/kiosk/expansion/photo'
import { expansionReceipt } from '@/lib/kiosk/expansion/receipt'
import { EXPANSION_META, type ExpansionId, type ExperienceResult } from '@/lib/kiosk/expansion/types'
import { NO_PHOTO_IDS } from '@/lib/kiosk/expansion/housing'
import { FAMILY_KO, noteAmount, noteDetail, noteGrams, noteLabel, RECIPE_COUNTER, type ScentRecipe } from '@/lib/kiosk/expansion/recipe'
import { KxReceiptSheet, KxSaveSheet, useKx, useKxScreen } from '../kx'
import type { KxShareFile } from '../kx-share'
import { canvasBlob, drawCover, fontsReady, kxFontFamily, loadImage, makeCanvas, wrapLines } from '../kx-canvas'
import { preloadVision } from '../kx-vision'
import './camera-social.css'

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
      {/* 제목이 없는 화면(그림 대기)은 머리 글자를 그리지 않는다 */}
      {title && <div className="ex-heading"><p className="ex-eyebrow">{meta.name}</p><h1 className="ex-title">{title}</h1>{subtitle && <p className="ex-subtitle">{subtitle}</p>}</div>}
      {children}
    </div>
    {actions && <footer className="ex-actions">{actions}</footer>}
    {dialog === 'home' && <Dialog title="처음으로 돌아갈까요?" onClose={() => setDialog(null)}><p>현재 입력과 사진에서 읽은 값이 지워집니다. 결과가 필요하다면 먼저 영수증이나 휴대폰으로 받아 주세요.</p><div className="ex-stack"><PrimaryButton onClick={() => setDialog(null)}>계속 체험하기</PrimaryButton><PrimaryButton secondary onClick={home}>입력 지우고 처음으로</PrimaryButton></div></Dialog>}
    {dialog === 'help' && <Dialog title="편하게 체험해 보세요" onClose={() => setDialog(null)}><ol className="ex-guide">{noPhoto(id) ? <li><b>질문 몇 가지에 답해요</b><span>사진은 찍지 않아요. 답변으로 결과를 만들고 AI가 쉬운 말로 풀어 줘요. 입력한 내용은 저장하지 않아요.</span></li> : <li><b>사진 한 장으로 시작해요</b><span>사진과 답변을 AI가 함께 보고 결과를 만들어요. 사진은 분석·합성에만 쓰고 저장하지 않아요.</span></li>}<li><b>직접 선택해요</b><span>마음에 드는 카드를 누르세요. 이전 버튼으로 돌아가 답을 바꾸면 결과에도 반영됩니다.</span></li><li><b>인쇄하기 한 번이면 끝</b><span>결과 화면에서 인쇄하기를 누르면 바로 영수증이 나와요. 휴대폰으로 받기도 있어요(저장 링크는 24시간).</span></li></ol><p className="ex-note">카메라·인터넷·전시 연결이 되지 않으면 현장 운영자에게 알려 주세요. 이 체험은 한국어로 제공됩니다.</p><PrimaryButton onClick={() => setDialog(null)}>알겠어요</PrimaryButton></Dialog>}
  </section>
}

/** 사진을 쓰지 않는 체험(주거복지 내비게이터·성향 테스트) — 시작·도움말 문구와 사진 도구 미리 받기가 다르다 */
const noPhoto = (id: string) => (NO_PHOTO_IDS as readonly string[]).includes(id)

export function ExpansionStart({ id, headline, description, onStart, steps }: { id: ExpansionId; headline?: string; description?: string; onStart: () => void; steps?: [string, string, string] }) {
  useKxScreen('start')
  const meta = EXPANSION_META[id]
  // 손님이 없는 첫 화면에서 사진을 읽을 도구를 천천히 받아 둔다(손님이 시작하면 멈추고, 필요한 순간에 이어 받는다)
  useEffect(() => {
    if (noPhoto(id)) return
    const plan = PHOTO_PLANS[id]
    const stops = [preloadVision(plan.subject === 'hand' ? 'hand' : 'faces'), ...(plan.outfit ? [preloadVision('hair')] : [])]
    return () => stops.forEach((stop) => stop())
  }, [id])
  return <section className="ex-start" data-page="start" data-housing={id.startsWith('housing-') || undefined}>
    <header className="ex-start-top"><span>{meta.category} · INTERACTIVE EXPERIENCE</span><span>한국어</span></header>
    <h1 className="ex-wordmark" data-long={meta.tag.length > 6}>{meta.tag}</h1>
    <h2>{headline ?? meta.name}</h2>
    <div className="ex-hero">
      {/* Artwork contains no interface text; every control is a real element. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.hero} alt="" fetchPriority="high" />
    </div>
    <p className="ex-start-copy">{description ?? meta.note}</p>
    <div className="ex-start-steps">{(steps ?? ['사진 한 장', 'AI 분석', '바로 인쇄']).map((step, i) => <span key={step}>{`0${i + 1}. ${step}`}</span>)}</div>
    <PrimaryButton onClick={onStart}>체험 시작하기 <ArrowRight size={25} /></PrimaryButton>
    <p className="ex-start-foot">화면을 터치해 나만의 이야기를 찾아보세요</p>
  </section>
}

/** image — 카드 위쪽 그림(주거복지대전 3종의 선택지 그림). 있으면 그림 위·글자 아래의 세로 카드가 된다 */
export function ChoiceTile({ label, note, selected, onClick, color, image, children }: { label: string; note?: string; selected: boolean; onClick: () => void; color?: string; image?: string; children?: ReactNode }) {
  return <button type="button" className={image ? 'ex-choice ex-choice--art' : 'ex-choice'} aria-pressed={selected} onClick={onClick} data-selected={selected || undefined}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {image && <span className="ex-choice-art" aria-hidden="true"><img src={image} alt="" loading="eager" decoding="async" /></span>}
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

/** 조향 레시피 칸 — 향료 셋(번호 · 이름 · 비율 막대 · 용량 · 넣은 이유) + 베이스 */
function RecipePanel({ recipe }: { recipe: ScentRecipe }) {
  return <section className="ex-panel ex-recipe" aria-label="조향 레시피">
    <p className="ex-eyebrow">SCENT RECIPE · {recipe.product}{recipe.ai ? '' : ' · 기본 레시피'}</p>
    <h3>{recipe.name}</h3>
    <ul className="ex-recipe-list">{recipe.notes.map((n) => <li key={n.id}>
      <span className="ex-recipe-name"><b>{noteLabel(n)}</b><small>{FAMILY_KO[n.family]}</small></span>
      <span className="ex-recipe-amount"><b>{noteGrams(n)}</b><small>{noteDetail(n)}</small></span>
      <span className="ex-recipe-bar" aria-hidden="true"><i style={{ width: `${n.ratio}%` }} /></span>
      <span className="ex-recipe-why">{n.reason}</span>
    </li>)}</ul>
    <p className="ex-recipe-base">+ 퍼퓸 베이스 {recipe.baseMl}ml</p>
    <p className="ex-note">{RECIPE_COUNTER}</p>
  </section>
}

export function ResultPanel({ result }: { result: ExperienceResult }) {
  return <article className="ex-result" data-result={result.id}>
    {result.art && <figure className="ex-result-art" data-wide={result.art.wide || undefined}>
      {/* 준비된 결과 그림(성향 캐릭터 등) — 글자 없는 그림 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={result.art.src} alt="" /><figcaption><b>{result.title}</b><span>{result.art.caption}</span></figcaption>
    </figure>}
    <div className="ex-result-intro"><p className="ex-eyebrow">MY EXPERIENCE CARD</p>{/* 대표 그림이 있으면 이름·한 줄은 그림 옆에 이미 있다 */}{!result.art && result.subtitle && <p className="ex-result-sub">{result.subtitle}</p>}{!result.art && <h2>{result.title}</h2>}<p>{result.summary}</p><div className="ex-tags">{result.tags.map((tag, i) => <span key={`${tag}-${i}`}>{tag}</span>)}</div></div>
    {result.recipe && <RecipePanel recipe={result.recipe} />}
    {!!result.palette?.length && <div className="ex-palette">{result.palette.map((color, i) => <div key={`${color}-${i}`}><span style={{ background: color }} /><small>{color}</small></div>)}</div>}
    {!!result.metrics?.length && <div className="ex-panel ex-metrics"><MetricChart result={result} /><div className="ex-stack">{result.metrics.map(m => <div key={m.label} className="ex-metric"><span>{m.label}<b>{m.value}<small> / {m.max}</small></b></span><meter min={0} max={m.max} value={m.value} style={{ accentColor: m.color }}>{m.value}</meter></div>)}</div></div>}
    {result.sections.map((section, i) => <section className="ex-panel" key={`${section.title}-${i}`}><h3>{section.title}</h3><p>{section.body}</p>{section.stamps ? <div className="ex-stamps" aria-label={`도장 칸 ${section.stamps}개`}>{Array.from({ length: section.stamps }, (_, n) => <span key={n} />)}</div> : section.items?.length ? <ul className="ex-detail-list">{section.items.map((item, n) => <li key={n}>{item}</li>)}</ul> : null}</section>)}
    {result.footnote && <p className="ex-note">{result.footnote}</p>}
  </article>
}

/** Export all result text (including sections below the viewport), with measured line heights. art — AI 합성 그림(없으면 체험 대표 그림) */
export async function renderExperienceCard(id: ExpansionId, result: ExperienceResult, art: string | null = null) {
  const meta = EXPANSION_META[id], family = kxFontFamily()
  await fontsReady(`500 28px ${family}`, `800 44px ${family}`)
  const [, measure] = makeCanvas(900, 100)
  const blocks: { text: string; size: number; weight: number; color: string; gap: number }[] = [
    { text: meta.tag + '  /  ' + meta.name, size: 26, weight: 800, color: meta.color, gap: 20 },
    { text: result.title, size: 48, weight: 800, color: meta.color, gap: 14 },
    ...(result.subtitle ? [{ text: result.subtitle, size: 26, weight: 600, color: '#625C61', gap: 16 }] : []),
    { text: result.summary, size: 28, weight: 500, color: '#302E32', gap: 20 },
    { text: result.tags.map(x => '#'+x).join('  '), size: 23, weight: 600, color: meta.color, gap: 24 },
    ...(result.recipe ? [
      { text: `조향 레시피 · ${result.recipe.name}`, size: 32, weight: 800, color: meta.color, gap: 10 },
      { text: [...result.recipe.notes.map(n => `${noteLabel(n)}   ${noteAmount(n)}\n   ${n.reason}`), `퍼퓸 베이스   ${result.recipe.baseMl}ml`, `${result.recipe.product}${result.recipe.ai ? '' : ' · 기본 레시피'}`].join('\n'), size: 26, weight: 600, color: '#302E32', gap: 28 },
    ] : []),
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
  const picture = await loadImage(art ?? meta.hero).catch(() => null)
  // 합성 그림은 잘리지 않게 제 비율로(세로 그림은 높게), 대표 그림은 띠로
  const artHeight = picture ? (art ? Math.round(756 * picture.naturalHeight / picture.naturalWidth) + 30 : 330) : 0
  const height = Math.ceil(144 + artHeight + paletteHeight + laid.reduce((n, b) => n + b.height, 0))
  const [canvas, ctx] = makeCanvas(900, height)
  ctx.fillStyle = '#F9F6EF'; ctx.fillRect(0, 0, 900, height)
  ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; ctx.strokeRect(25, 25, 850, height - 50)
  let y = 70
  if (picture) { drawCover(ctx, picture, 72, y, 756, artHeight - 30); y += artHeight }
  ctx.textBaseline = 'top'
  for (let i = 0; i < laid.length; i++) {
    const b = laid[i]; ctx.font = `${b.weight} ${b.size}px ${family}`; ctx.fillStyle = b.color
    b.lines.forEach((line, n) => ctx.fillText(line, 72, y + n * b.size * 1.55)); y += b.height
    if (i === 1 && result.palette?.length) { const w = 756 / result.palette.length; result.palette.forEach((c, n) => { ctx.fillStyle = c; ctx.fillRect(72 + n * w, y, w, 58) }); y += paletteHeight }
  }
  return canvasBlob(canvas, 'image/jpeg', .88)
}

/**
 * 결과 화면의 바닥 버튼 — 인쇄하기(누르면 바로 영수증, QR 이 같이 찍힌다) · 휴대폰으로 받기. 기존 체험과 같은 창(KxReceiptSheet · KxSaveSheet)을 쓴다.
 * 둘은 같은 결과 카드(+ AI 합성 그림) 업로드 한 번을 같이 쓴다. 촬영 사진은 어느 쪽에도 들어가지 않는다.
 */
export function TakeActions({ result, image = null, imageLabel = 'AI 합성 이미지' }: { result: ExperienceResult; image?: string | null; imageLabel?: string }) {
  const { id } = useKx()
  const [printing, setPrinting] = useState(false)
  const [saving, setSaving] = useState(false)
  // The complete content, not only result.id, is part of the cache identity.
  const cacheKey = `expansion:${id}:${JSON.stringify(result)}:${image?.length ?? 0}`
  const build = useCallback(async (): Promise<KxShareFile[]> => [
    { name: 'experience-card.jpg', type: 'image/jpeg', label: result.title, blob: await renderExperienceCard(id as ExpansionId, result, image) },
    ...(image ? [{ name: 'ai-image.jpg', type: 'image/jpeg' as const, label: imageLabel, blob: await (await fetch(image)).blob() }] : []),
  ], [id, result, image, imageLabel])
  const receipt = useCallback(() => expansionReceipt(id as ExpansionId, result, image ? { src: image, caption: imageLabel } : null), [id, result, image, imageLabel])
  return <>
    <PrimaryButton secondary onClick={() => setSaving(true)}><Smartphone size={21} />휴대폰으로 받기</PrimaryButton>
    <PrimaryButton onClick={() => setPrinting(true)}><Printer size={22} />인쇄하기</PrimaryButton>
    <KxSaveSheet open={saving} cacheKey={cacheKey} build={build} onClose={() => setSaving(false)} />
    <KxReceiptSheet open={printing} cacheKey={cacheKey} build={build} receipt={receipt} onClose={() => setPrinting(false)} />
  </>
}
