'use client'

// SCENT! AI 조향사 — 결과 세 화면: 나의 향 · 프로필 · 해석 (목업 05)
// 모든 숫자·문장은 실제 분석 응답에서 온다(목업의 이름·번호·매칭률·문장은 견본). 긴 글은 글자를 줄이지 않고 스크롤하고,
// 출력 버튼은 어느 탭에서든 아래 고정 줄에 있다.
// 향 노트(TOP·MIDDLE·BASE)는 향의 인상이지 제조 원료가 아니다 — 제조 레시피는 영수증(향료 + 베이스)에만 있다.

import { useMemo, type ComponentType } from 'react'
import { Flower2, Leaf, Moon, Printer, Snowflake, Sun, Sunrise, Sunset } from 'lucide-react'
import {
  BEST_SEASON_LABELS,
  BEST_TIME_LABELS,
  CATEGORY_INFO,
  SEASON_LABELS,
  TONE_LABELS,
  TRAIT_LABELS,
  type ImageAnalysisResult,
  type ScentCategoryScores,
  type TraitScores,
} from '@/types/analysis'
import { getPerfumeById } from '@/data/perfumes'
import { perfumerFamilyArt } from '@/lib/kiosk/perfumer-art'
import { perfumeNoFromId, scentCategoryEn } from '../classic/ResultView'
import { BottomBar, Btn, Lines } from './ui'
import type { PerfumerCtx } from './types'

type Icon = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>

const SEASON_ICON: Record<string, Icon> = { spring: Flower2, summer: Sun, autumn: Leaf, winter: Snowflake }
const TIME_ICON: Record<string, Icon> = { morning: Sunrise, afternoon: Sun, evening: Sunset, night: Moon }

export function ResultScreen({ ctx, tab, onTab }: { ctx: PerfumerCtx; tab: number; onTab: (tab: number) => void }) {
  const { p, t } = ctx
  const result = ctx.result
  if (!result) return null
  const name = ctx.name.trim()
  const printLabel = ctx.hasPrinter && ctx.printedOnce ? p.receiptTitle : p.printRecipe
  const printIcon = <Printer size={22} strokeWidth={1.6} aria-hidden="true" />

  return (
    <section className="pf-screen pf-result">
      <p className="pf-report">
        {p.reportLabel(name)}
        {ctx.mocked && <span className="pf-demo">{p.demo}</span>}
      </p>
      <div className="pf-tabs" role="tablist" aria-label={p.reportLabel(name)}>
        {p.tabs.map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={tab === i} data-on={tab === i || undefined} onClick={() => onTab(i)}>
            {label}
          </button>
        ))}
      </div>

      {/* key: 탭을 바꾸면 맨 위부터 */}
      <div className="pf-result-body" key={tab} role="tabpanel">
        {tab === 0 && <ScentTab ctx={ctx} result={result} />}
        {tab === 1 && <ProfileTab ctx={ctx} result={result} />}
        {tab === 2 && <ReadingTab ctx={ctx} result={result} />}
      </div>

      <BottomBar>
        {tab < 2 ? (
          <>
            <Btn variant="outline" icon={printIcon} onClick={ctx.openReceipt} disabled={ctx.receiptBusy || ctx.printing}>{printLabel}</Btn>
            <Btn variant="primary" arrow onClick={() => onTab(tab + 1)}>{tab === 0 ? p.viewProfile : p.viewReading}</Btn>
          </>
        ) : (
          <>
            <Btn onClick={() => onTab(1)}>{t.prev}</Btn>
            <Btn variant="primary" icon={printIcon} arrow onClick={ctx.openReceipt} disabled={ctx.receiptBusy || ctx.printing}>{printLabel}</Btn>
          </>
        )}
      </BottomBar>
    </section>
  )
}

function ScentTab({ ctx, result }: { ctx: PerfumerCtx; result: ImageAnalysisResult }) {
  const { p } = ctx
  const match = result.matchingPerfumes?.[0]
  const persona = match?.persona
  if (!match || !persona) return null
  const keywords = (result.matchingKeywords?.length ? result.matchingKeywords : persona.keywords).slice(0, 3)
  const family = getPerfumeById(persona.id)?.category
  return (
    <div className="pf-scent">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pf-scent-art" src={perfumerFamilyArt(family)} alt="" aria-hidden="true" />
      <h1 className="pf-title">{p.scentTitle(ctx.name.trim())}</h1>
      <p className="pf-scent-no">No.{perfumeNoFromId(persona.id)}</p>
      <h2 className="pf-scent-name">{persona.name}</h2>
      <p className="pf-scent-meta">
        {scentCategoryEn(persona.id)}
        <span> · {p.match} </span>
        <b>{Math.round(match.score * 100)}%</b>
      </p>
      {keywords.length > 0 && (
        <ul className="pf-chips">
          {keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
        </ul>
      )}
      {match.matchReason && <p className="pf-scent-reason">{match.matchReason}</p>}
      <dl className="pf-notes">
        {([
          ['TOP', persona.mainScent],
          ['MIDDLE', persona.subScent1],
          ['BASE', persona.subScent2],
        ] as const).map(([tier, note]) => (
          <div key={tier}>
            <dt>{tier}</dt>
            <dd>
              <b>{note?.name ?? '-'}</b>
              {note?.fanComment && <span>{note.fanComment}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  return (
    <ul className="pf-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span>{row.label}</span>
          <i aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(1, row.value / 10)) * 100}%` }} /></i>
          <em>{row.value}</em>
        </li>
      ))}
    </ul>
  )
}

function ProfileTab({ ctx, result }: { ctx: PerfumerCtx; result: ImageAnalysisResult }) {
  const { p, t } = ctx
  const traits = useMemo(
    () => (Object.entries(result.traits ?? {}) as [keyof TraitScores, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ label: t.traits[key] ?? TRAIT_LABELS[key], value })),
    [result.traits, t],
  )
  const families = useMemo(
    () => (Object.entries(result.scentCategories ?? {}) as [keyof ScentCategoryScores, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ label: t.categories[key] ?? CATEGORY_INFO[key]?.name ?? key, value })),
    [result.scentCategories, t],
  )
  const color = result.personalColor
  const half = Math.ceil(traits.length / 2)
  const famHalf = Math.ceil(families.length / 2)
  return (
    <div className="pf-profile">
      <h1 className="pf-title"><Lines text={p.profileTitle} /></h1>
      <section className="pf-sec">
        <h2>{p.myImage}<span>{p.tenTraits}</span></h2>
        <div className="pf-bars-2">
          <Bars rows={traits.slice(0, half)} />
          <Bars rows={traits.slice(half)} />
        </div>
      </section>
      <section className="pf-sec">
        <h2>{p.scentFamily}<span>{p.sixFamilies}</span></h2>
        <div className="pf-bars-2">
          <Bars rows={families.slice(0, famHalf)} />
          <Bars rows={families.slice(famHalf)} />
        </div>
      </section>
      {color && (
        <section className="pf-sec">
          <h2>
            {t.personalColor(t.seasons[color.season] ?? SEASON_LABELS[color.season], t.tones[color.tone] ?? TONE_LABELS[color.tone])}
          </h2>
          <ul className="pf-palette">
            {color.palette?.slice(0, 5).map((hex) => <li key={hex} style={{ background: hex }} title={hex.toUpperCase()} />)}
          </ul>
          {color.description && <p className="pf-text">{color.description}</p>}
        </section>
      )}
    </div>
  )
}

function ReadingTab({ ctx, result }: { ctx: PerfumerCtx; result: ImageAnalysisResult }) {
  const { p, t } = ctx
  const a = result.analysis
  const rec = result.scentRecommendation
  const guide = result.matchingPerfumes?.[0]?.persona?.usageGuide
  const picks = [...ctx.picks.style, ...ctx.picks.personality, ...ctx.picks.charm]
  const labelOf = (value: string) => ctx.pickLabels.style[value] ?? ctx.pickLabels.personality[value] ?? ctx.pickLabels.charm[value] ?? value
  const SeasonIcon = rec ? SEASON_ICON[rec.best_season] ?? Flower2 : Flower2
  const TimeIcon = rec ? TIME_ICON[rec.best_time] ?? Sun : Sun
  return (
    <div className="pf-reading">
      <div className="pf-reading-hero">
        <h1 className="pf-title"><Lines text={p.readingTitle} /></h1>
        {/* 손님 본인 사진 — 목업의 인물 사진 자리 */}
        {ctx.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ctx.photo} alt={t.selectedPhotoAlt} />
        )}
      </div>
      {a && (
        <dl className="pf-rows">
          {([
            [t.analysisKeys.mood, a.mood],
            [t.analysisKeys.style, a.style],
            [t.analysisKeys.expression, a.expression],
            [t.analysisKeys.concept, a.concept],
          ] as const).filter(([, value]) => Boolean(value)).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {rec && (
        <div className="pf-moments">
          <div className="pf-moment" data-season={rec.best_season}>
            <h3>{p.bestSeason} · {t.seasons[rec.best_season] ?? BEST_SEASON_LABELS[rec.best_season]?.label ?? rec.best_season}</h3>
            <span className="pf-moment-art" aria-hidden="true"><SeasonIcon size={34} strokeWidth={1.3} /></span>
            {rec.season_reason && <p>{rec.season_reason}</p>}
          </div>
          <div className="pf-moment" data-time={rec.best_time}>
            <h3>{p.bestTime} · {t.times[rec.best_time] ?? BEST_TIME_LABELS[rec.best_time]?.label ?? rec.best_time}</h3>
            <span className="pf-moment-art" aria-hidden="true"><TimeIcon size={34} strokeWidth={1.3} /></span>
            {rec.time_reason && <p>{rec.time_reason}</p>}
          </div>
        </div>
      )}
      {guide && (guide.situation || guide.tips?.length) && (
        <section className="pf-sec">
          <h2>{p.usageGuide}</h2>
          {guide.situation && <p className="pf-text">{guide.situation}</p>}
          {guide.tips?.length > 0 && (
            <ol className="pf-tips">
              {guide.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ol>
          )}
        </section>
      )}
      <section className="pf-sec pf-compare">
        <div>
          <h3>{p.aiReading}</h3>
          <p className="pf-text">{result.comparisonAnalysis?.imageInterpretation || a?.mood || '-'}</p>
        </div>
        <div>
          <h3>{p.myPicks}</h3>
          <ul className="pf-chips">
            {picks.map((value) => <li key={value}>{labelOf(value)}</li>)}
          </ul>
        </div>
      </section>
    </div>
  )
}
