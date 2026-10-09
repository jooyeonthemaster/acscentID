'use client'

// 키오스크 AI 퍼스널 컬러 결과 — 한 장 스크롤(목업 C08 → C09 → C10, 옷 색 미리보기 C18 · C19).
// ① 유형 · 웜/쿨 · 한 줄  ② 옷 색 미리보기(촬영한 사람의 상의만 고른 색으로) — 안 되면 얼굴 옆 드레이프
// ③ 추천 8색 · 피할 4색  ④ 톤 분석 · AI가 본 것  ⑤ 스타일 가이드.
// 팔레트는 유형별 고정값(color-types.ts), 문장은 서버가 손님 언어로 쓴 것. 향 추천은 없다.
// 진단에는 원본 사진만 쓴다 — 옷 색 미리보기는 화면에서만 원본 위에 덧그린다(garment-recolor.ts).

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowLeft, Columns2, Eye, Gem, Paintbrush, RefreshCw, Scissors, Shirt, Smile, Snowflake, Sun, Waves } from 'lucide-react'
import { personalColorType, readableInk } from '@/lib/kiosk/color-types'
import { prepareGarment, releaseGarment, type GarmentPrep, type GarmentStatus } from '@/lib/kiosk/garment-recolor'
import type { ColorGaugeKey, ProgramText } from '@/lib/kiosk/program-i18n'
import type { ProgramUiText } from '@/lib/kiosk/program-ui-i18n'
import type { ColorAnalysisResult } from '@/types/analysis'
import { Brief } from './SajuReport'
import './saju-report.css'
import './programs.css'
import './color-archive.css'

const GAUGE_KEYS: ColorGaugeKey[] = ['warmth', 'brightness', 'clarity', 'contrast']
/** 글을 접지 않고 처음부터 다 보여 준다('자세히 보기' 버튼 없음) */
const FULL = Number.POSITIVE_INFINITY
/** 스타일 가이드 견본 — 머리색·금속은 진단 데이터에 없어 웜/쿨로 나눈 고정 견본 */
const HAIR_CHIPS = { warm: ['#B07A52', '#8A5A3B'], cool: ['#5A4A48', '#2F2A2B'] } as const
const METAL_CHIPS = { gold: '#C9A45C', silver: '#B8BCC4', 'rose-gold': '#D4A08C' } as const

function sentences(text: string): string[] {
  return (text.match(/[^.!?。！？]+[.!?。！？]+["'”」)]*|[^.!?。！？]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean)
}

type TryOnState = 'loading' | GarmentStatus

/**
 * 사진 한 장의 옷 마스크를 한 번 만들고(prepareGarment — 첫 화면에서 미리 받아 둔 모델로만) 색마다 덧그림을 받는다.
 * 고른 색이 바뀌면 그 색만 계산하고, 준비가 끝나면 나머지 색도 뒤에서 미리 만들어 둔다.
 */
function useGarmentTryOn(photo: string | null, hex: string, palette: string[]) {
  const [state, setState] = useState<TryOnState>(photo ? 'loading' : 'failed')
  const [prep, setPrep] = useState<GarmentPrep | null>(null)
  const [overlays, setOverlays] = useState<Record<string, string>>({})
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!photo) return
    let alive = true
    setState('loading')
    setPrep(null)
    setOverlays({})
    prepareGarment(photo).then((p) => {
      if (!alive) return
      setPrep(p)
      setState(p.status)
    })
    return () => { alive = false }
  }, [photo, attempt])

  useEffect(() => {
    if (!prep || prep.status !== 'ready') return
    let alive = true
    prep.render(hex)
      .then((url) => { if (alive) setOverlays((o) => ({ ...o, [hex]: url })) })
      .catch(() => { if (alive) setState('failed') })
    return () => { alive = false }
  }, [prep, hex])

  // 나머지 색 미리 만들기 — 화면을 막지 않게 한 색씩 띄엄띄엄
  const paletteKey = palette.join(',')
  useEffect(() => {
    if (!prep || prep.status !== 'ready') return
    let alive = true
    let i = 0
    const list = paletteKey.split(',')
    const step = () => {
      if (!alive || i >= list.length) return
      const color = list[i++]
      prep.render(color)
        .then((url) => { if (alive) setOverlays((o) => (o[color] ? o : { ...o, [color]: url })) })
        .catch(() => {})
        .finally(() => { if (alive) window.setTimeout(step, 90) })
    }
    const timer = window.setTimeout(step, 300)
    return () => { alive = false; window.clearTimeout(timer) }
  }, [prep, paletteKey])

  const retry = () => {
    releaseGarment()
    setAttempt((a) => a + 1)
  }
  return { state, overlay: overlays[hex] ?? null, overlays, retry }
}

export function ColorReportView({ result, photo, px, ui, name }: {
  result: ColorAnalysisResult
  /** 원본 사진(진단에 쓴 그것) — 없으면 드레이프만 */
  photo: string | null
  px: ProgramText
  ui: ProgramUiText
  name: string
  /** 예전 호출 호환 — 이 화면은 '더 보기' 버튼으로 스크롤한다 */
  scrollMore?: string
}) {
  const tx = px.color
  const u = ui.color
  const d = result.colorDiagnosis
  const type = personalColorType(d.typeId)
  const [selected, setSelected] = useState(type.best[0])
  const [view, setView] = useState<'preview' | 'original' | 'compare'>('preview')
  const tryOn = useGarmentTryOn(photo, selected, [...type.best, ...type.avoid])
  const toneRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)

  // 팔레트와 이름 개수가 일치할 때만 견본마다 이름을 붙인다. 다르면 HEX 를 손님에게 보이지 않고 이름 목록으로만
  const avoiding = type.avoid.includes(selected)
  const namesMatch = (avoid: boolean) => (avoid ? d.avoidColorNames.length === type.avoid.length : d.bestColorNames.length === type.best.length)
  const colorName = (hex: string, avoid: boolean): string | null => {
    if (!namesMatch(avoid)) return null
    const names = avoid ? d.avoidColorNames : d.bestColorNames
    return names[(avoid ? type.avoid : type.best).indexOf(hex)]?.trim() || null
  }
  const selectedName = colorName(selected, avoiding)
  const groupLabel = avoiding ? tx.avoid : tx.best
  const nameList = (avoid: boolean) => {
    const names = avoid ? d.avoidColorNames : d.bestColorNames
    return !namesMatch(avoid) && names.length > 0 ? <p className="clr-names">{names.join(' · ')}</p> : null
  }
  const pick = (hex: string) => {
    setSelected(hex)
    if (view === 'original') setView('preview')
  }

  const garment = tryOn.state === 'ready' && Boolean(photo)
  const swatches = (colors: string[], avoid: boolean) => (
    <div className="clr-swatches" data-avoid={avoid || undefined} role="group" aria-label={avoid ? tx.avoid : tx.best}>
      {colors.map((hex) => {
        const label = colorName(hex, avoid)
        return (
          <button
            key={hex}
            type="button"
            className="clr-swatch"
            data-on={selected === hex || undefined}
            aria-label={`${avoid ? tx.avoid : tx.best} · ${label ?? hex}`}
            aria-pressed={selected === hex}
            style={{ background: hex, color: readableInk(hex) }}
            onClick={() => pick(hex)}
          >
            {selected === hex && (
              <svg className="clr-swatch-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
  const frame = (overlay: string | null, caption: string, key: string) => (
    <figure className="clr2-frame" key={key}>
      <div className="clr2-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo ?? ''} alt="" />
        {/* 덧그림은 옷 부분만 담긴 투명 이미지 — 얼굴·피부·배경은 아래 원본이 그대로 보인다 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {overlay && <img className="clr2-overlay" src={overlay} alt="" />}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
  const [first, ...rest] = sentences(d.summary)

  return (
    <div className="sjr clr clr2">
      <header className="clr2-head">
        <p className="clr2-kicker">{u.resultKicker(name)}</p>
        <div className="clr2-type">
          <h2>{tx.typeNames[d.typeId]}</h2>
          <span className="clr2-badge" data-tone={d.undertone}>{tx.undertone[d.undertone]}</span>
        </div>
        <p className="clr2-tagline">{d.title}</p>
      </header>

      {garment ? (
        <section className="clr2-try" data-view={view}>
          <h3 className="clr2-h3">{view === 'compare' ? u.compareTitle : u.tryOnTitle}</h3>
          <p className="clr2-sub">{view === 'compare' ? u.compareDesc : u.tryOnDesc}</p>
          {view === 'compare' ? (
            <>
              <div className="clr2-compare">
                {frame(null, u.captionOriginal, 'orig')}
                {frame(tryOn.overlay, u.captionPreview(selectedName ?? groupLabel), 'prev')}
              </div>
              <p className="clr2-selected">
                <span>{u.selectedColor}</span>
                <i style={{ background: selected }} aria-hidden="true" />
                <b>{selectedName ?? groupLabel}</b>
              </p>
              <button type="button" className="ksk-btn ksk-btn-primary clr2-back" onClick={() => setView('preview')}>
                <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" /><span>{u.backToPreview}</span>
              </button>
            </>
          ) : (
            <>
              <div className="clr2-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={view === 'preview'} data-on={view === 'preview' || undefined} onClick={() => setView('preview')}>{u.tabPreview}</button>
                <button type="button" role="tab" aria-selected={view === 'original'} data-on={view === 'original' || undefined} onClick={() => setView('original')}>{u.tabOriginal}</button>
              </div>
              {frame(view === 'preview' ? tryOn.overlay : null, view === 'preview' ? `${u.selectedColor} · ${selectedName ?? groupLabel}` : u.captionOriginal, 'single')}
              <button type="button" className="ksk-alt clr2-compare-btn" onClick={() => setView('compare')}>
                <Columns2 size={20} strokeWidth={1.7} aria-hidden="true" /><span>{u.compare}</span>
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="clr-drape clr2-drape" style={{ '--clr-drape': selected, '--clr-ink': readableInk(selected) } as CSSProperties}>
          <div className="clr-portrait" data-photo={Boolean(photo) || undefined}>
            {photo && (
              <div className="clr-face">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" />
              </div>
            )}
            {tryOn.state === 'loading' && photo && <span className="clr2-scan" aria-hidden="true" />}
          </div>
          <p className="clr-drape-color" data-avoid={avoiding || undefined} aria-live="polite" aria-atomic="true">
            <span>{groupLabel}</span>
            {selectedName && <strong>{selectedName}</strong>}
          </p>
          {photo && tryOn.state === 'loading' && <p className="clr2-status" role="status"><RefreshCw className="pg-spin" size={18} strokeWidth={1.8} aria-hidden="true" />{u.tryOnPreparing}</p>}
          {photo && tryOn.state === 'no-garment' && <p className="clr2-status">{u.tryOnNoGarment}</p>}
          {photo && tryOn.state === 'failed' && (
            <p className="clr2-status">
              <span>{u.tryOnFailed}</span>
              <button type="button" className="clr2-retry" onClick={tryOn.retry}><RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />{u.retryTryOn}</button>
            </p>
          )}
        </section>
      )}

      <section className="sjr-card clr-palette">
        {!garment && <p className="sjr-kicker">{tx.drapeTitle}</p>}
        <p className="clr-hint">{garment ? u.paletteHint : u.drapeHint}</p>
        <p className="clr-swatch-label">{tx.best}</p>
        {swatches(type.best, false)}
        {nameList(false)}
        <p className="clr-swatch-label">{tx.avoid}</p>
        {swatches(type.avoid, true)}
        {nameList(true)}
      </section>

      <button type="button" className="clr2-more" onClick={() => toneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
        <span>{u.moreTone}</span><ArrowDown size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <div className="clr2-section" ref={toneRef}>
        <p className="clr2-mini">{u.resultKicker(name)} · <b>{tx.typeNames[d.typeId]} · {tx.undertone[d.undertone]}</b></p>
        <h3 className="clr2-h2">{tx.gaugeTitle}</h3>
        <div className="clr2-callout">
          {d.undertone === 'warm' ? <Sun size={34} strokeWidth={1.4} aria-hidden="true" /> : <Snowflake size={34} strokeWidth={1.4} aria-hidden="true" />}
          <p>{first}</p>
        </div>
        {rest.length > 0 && <Brief text={rest.join(' ')} n={FULL} tx={px} />}
        {d.confidence === 'low' && <p className="xpr-note xpr-note--warn">{tx.lowConfidence}</p>}
        <div className="clr-gauges">
          {GAUGE_KEYS.map((key) => (
            <div key={key} className="clr-gauge">
              <b>{tx.gauges[key].label}</b>
              <span>{tx.gauges[key].low}</span>
              <span className="clr-gauge-track"><i style={{ left: `${d.scores[key]}%` }} /></span>
              <span>{tx.gauges[key].high}</span>
            </div>
          ))}
        </div>
        <h3 className="clr2-h2">{tx.observeTitle}</h3>
        <ul className="clr2-observe">
          {([['skin', Smile], ['hair', Waves], ['eyes', Eye]] as const).map(([key, Icon]) => (
            <li key={key}><Icon size={22} strokeWidth={1.5} aria-hidden="true" /><b>{tx.observe[key]}</b><span>{d.observation[key]}</span></li>
          ))}
        </ul>
        <p className="xpr-note">{tx.disclaimer}</p>
        <button type="button" className="clr2-more clr2-more--box" onClick={() => styleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{u.moreStyle}</span><ArrowDown size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <div className="clr2-section" ref={styleRef}>
        <h3 className="clr2-h2">{tx.stylingTitle}</h3>
        <p className="clr2-sub">{u.styleSub}</p>
        <div className="clr2-styles">
          {([
            ['makeup', Paintbrush, type.best.slice(1, 3), 'round'],
            ['hair', Scissors, [...HAIR_CHIPS[d.undertone]], 'round'],
            ['fashion', Shirt, type.best.slice(3, 7), 'square'],
            ['accessory', Gem, [METAL_CHIPS[d.metal]], 'round'],
          ] as const).map(([key, Icon, chips, shape]) => (
            <section key={key} className="clr2-style">
              <div>
                <p className="clr2-style-title">{tx.styling[key]}{key === 'accessory' ? ` · ${tx.metal[d.metal]}` : ''}</p>
                <Brief text={d.styling[key]} n={FULL} tx={px} />
                <div className="clr2-chips" data-shape={shape}>{chips.map((hex) => <i key={hex} style={{ background: hex }} />)}</div>
              </div>
              <Icon className="clr2-style-icon" size={56} strokeWidth={1} aria-hidden="true" />
            </section>
          ))}
        </div>
        {result.keywords.length > 0 && (
          <div className="sjr-chips clr-keywords">
            {result.keywords.map((k) => <span key={k} className="sjr-chip">#{k}</span>)}
          </div>
        )}
        <p className="xpr-note">{tx.disclaimer}</p>
      </div>
    </div>
  )
}
