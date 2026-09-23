'use client'

// 키오스크 결과 화면 — 사이트 결과 페이지가 보여주는 정보를 세로 터치 화면에 맞게 옮긴 것.
// 정보량이 많아 한 화면에 다 넣지 않고 장(chapter)으로 나눠 넘긴다.

import { useMemo } from 'react'
import {
  ImageAnalysisResult,
  SajuAnalysisResult,
  TraitScores,
  ScentCategoryScores,
  TRAIT_LABELS,
  CATEGORY_INFO,
  SEASON_LABELS,
  TONE_LABELS,
  BEST_SEASON_LABELS,
  BEST_TIME_LABELS,
  SAJU_ELEMENT_INFO,
  SAJU_PURPOSES,
  type SajuElement,
} from '@/types/analysis'
import { getPerfumeById } from '@/data/perfumes'
import type { KioskText } from '@/lib/kiosk/i18n'
import { PixelIcon, RetroProgress } from '@/components/retro'

export function perfumeNoFromId(id: string): string {
  const m = id.match(/(\d+)\s*$/)
  return m ? m[1].padStart(2, '0') : '--'
}

export function scentCategoryEn(perfumeId: string): string {
  return (getPerfumeById(perfumeId)?.category ?? 'scent').toUpperCase()
}

// ── 공용 프리미티브 ────────────────────────────────────────
export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="ksk-sec">
      <p className="ksk-section-label ksk-mono">{label}</p>
      {children}
    </section>
  )
}

/** 점수 막대 — 실제 점수(0~max)라 칸 수 그대로 채운다 */
function Bar({ label, value, max = 10, top = false }: { label: string; value: number; max?: number; top?: boolean }) {
  return (
    <div className="ksk-trait" data-top={top}>
      <span className="ksk-trait-label">
        {top && <PixelIcon name="star" size={20} />}
        {label}
      </span>
      <RetroProgress className="ksk-trait-bar" value={value / max} blocks={max} label={`${label} ${value}/${max}`} />
      <span className="ksk-trait-value rt-pixel">{value}</span>
    </div>
  )
}

// ── 이미지 분석 결과 장들 ──────────────────────────────────
export function ScentCard({ result }: { result: ImageAnalysisResult }) {
  const match = result.matchingPerfumes[0]
  const persona = match?.persona
  if (!persona) return null
  return (
    <div className="ksk-scent-card" style={{ ['--scent-color' as string]: persona.primaryColor }}>
      <div className="ksk-scent-no ksk-mono">AC&rsquo;SCENT No. {perfumeNoFromId(persona.id)}</div>
      <h2 className="ksk-scent-name">{persona.name}</h2>
      <div className="ksk-scent-meta ksk-mono">
        {scentCategoryEn(persona.id)} · MATCH {(match.score * 100).toFixed(0)}%
      </div>
    </div>
  )
}

export function ChapterScent({ result }: { result: ImageAnalysisResult }) {
  const match = result.matchingPerfumes[0]
  const persona = match?.persona
  if (!persona) return null
  const keywords = (result.matchingKeywords?.length ? result.matchingKeywords : persona.keywords).slice(0, 5)

  return (
    <>
      <ScentCard result={result} />

      {match.matchReason && (
        <Section label="WHY THIS SCENT">
          <p className="ksk-analysis-text">{match.matchReason}</p>
        </Section>
      )}

      <div className="ksk-keywords">
        {keywords.map((k) => (
          <span key={k} className="ksk-keyword">#{k}</span>
        ))}
      </div>

      <Section label="NOTES">
        <div className="ksk-notes">
          {([
            ['TOP', persona.mainScent],
            ['MIDDLE', persona.subScent1],
            ['BASE', persona.subScent2],
          ] as const).map(([tier, note]) => (
            <div key={tier} className="ksk-note-block">
              <b>
                {tier} · {note?.name}
              </b>
              {note?.fanComment && <span>{note.fanComment}</span>}
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

export function ChapterProfile({ result, t }: { result: ImageAnalysisResult; t: KioskText }) {
  const traits = useMemo(
    () =>
      (Object.entries(result.traits) as [keyof TraitScores, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => ({ label: t.traits[key] ?? TRAIT_LABELS[key], value })),
    [result.traits, t]
  )
  const categories = useMemo(
    () =>
      (Object.entries(result.scentCategories) as [keyof ScentCategoryScores, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => ({ label: t.categories[key] ?? CATEGORY_INFO[key]?.name ?? key, value })),
    [result.scentCategories, t]
  )

  return (
    <>
      <Section label={t.signalsLabel}>
        {traits.map((t) => (
          <Bar key={t.label} label={t.label} value={t.value} />
        ))}
      </Section>

      <Section label={t.scentProfileLabel}>
        {categories.map((c, i) => (
          <Bar key={c.label} label={c.label} value={c.value} top={i === 0} />
        ))}
      </Section>

      {result.personalColor && (
        <Section label="PERSONAL COLOR">
          <p className="ksk-color-name">
            {t.personalColor(
              t.seasons[result.personalColor.season] ?? SEASON_LABELS[result.personalColor.season],
              t.tones[result.personalColor.tone] ?? TONE_LABELS[result.personalColor.tone]
            )}
          </p>
          <div className="ksk-palette">
            {result.personalColor.palette?.slice(0, 5).map((c) => (
              <span key={c} className="ksk-swatch">
                <i style={{ background: c }} />
                <em className="ksk-mono">{c.toUpperCase()}</em>
              </span>
            ))}
          </div>
          <p className="ksk-analysis-text">{result.personalColor.description}</p>
        </Section>
      )}
    </>
  )
}

export function ChapterReading({ result, t }: { result: ImageAnalysisResult; t: KioskText }) {
  const a = result.analysis
  const guide = result.matchingPerfumes[0]?.persona?.usageGuide
  const rec = result.scentRecommendation

  return (
    <>
      {a && (
        <Section label="ANALYSIS">
          {([
            [t.analysisKeys.mood, a.mood],
            [t.analysisKeys.style, a.style],
            [t.analysisKeys.expression, a.expression],
            [t.analysisKeys.concept, a.concept],
          ] as const)
            .filter(([, v]) => Boolean(v))
            .map(([k, v]) => (
              <div key={k} className="ksk-kv">
                <b>{k}</b>
                <p>{v}</p>
              </div>
            ))}
        </Section>
      )}

      {guide && (
        <Section label="USAGE GUIDE">
          <p className="ksk-analysis-text">{guide.situation}</p>
          <ol className="ksk-steps">
            {guide.tips?.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </Section>
      )}

      {rec && (
        <Section label="BEST MOMENT">
          {/* 아이콘은 이모지라 영수증에서 뭉개지므로 화면에서도 라벨만 쓴다 */}
          <div className="ksk-kv">
            <b>
              {t.bestSeason} · {t.seasons[rec.best_season] ?? BEST_SEASON_LABELS[rec.best_season]?.label ?? rec.best_season}
            </b>
            {rec.season_reason && <p>{rec.season_reason}</p>}
          </div>
          <div className="ksk-kv">
            <b>
              {t.bestTime} · {t.times[rec.best_time] ?? BEST_TIME_LABELS[rec.best_time]?.label ?? rec.best_time}
            </b>
            {rec.time_reason && <p>{rec.time_reason}</p>}
          </div>
        </Section>
      )}

      {result.comparisonAnalysis && (
        <Section label={t.comparisonLabel}>
          <div className="ksk-kv">
            <b>{t.comparisonAi}</b>
            <p>{result.comparisonAnalysis.imageInterpretation}</p>
          </div>
          <div className="ksk-kv">
            <b>{t.comparisonMine}</b>
            <p>{result.comparisonAnalysis.userInputSummary}</p>
          </div>
        </Section>
      )}
    </>
  )
}

// ── 사주 결과 장들 ────────────────────────────────────────
const PILLAR_ORDER = ['hour', 'day', 'month', 'year'] as const
const PILLAR_LABEL: Record<(typeof PILLAR_ORDER)[number], string> = {
  hour: '時柱', day: '日柱', month: '月柱', year: '年柱',
}

export function ChapterMyeongsik({ result }: { result: SajuAnalysisResult }) {
  const chart = result.sajuChart
  const purpose = SAJU_PURPOSES.find((p) => p.id === result.sajuPurpose)

  return (
    <>
      <div className="ksk-saju-head">
        <span className="ksk-mono">四柱命式</span>
        {purpose && (
          <span className="ksk-saju-purpose">
            {purpose.hanja} · {purpose.label}
          </span>
        )}
      </div>

      <div className="ksk-pillars">
        {PILLAR_ORDER.map((key) => {
          const pillar = chart.pillars[key]
          const isDay = key === 'day'
          return (
            <div key={key} className="ksk-pillar" data-day={isDay}>
              <div className="ksk-pillar-head">{PILLAR_LABEL[key]}</div>
              {pillar ? (
                <>
                  <div className="ksk-pillar-tile">
                    <em>{SAJU_ELEMENT_INFO[pillar.ganElement]?.hanja}</em>
                    <span className="ksk-pillar-hanja">{pillar.ganHanja}</span>
                    <span className="ksk-pillar-read">{pillar.gan}</span>
                  </div>
                  <div className="ksk-pillar-tile">
                    <em>{SAJU_ELEMENT_INFO[pillar.jiElement]?.hanja}</em>
                    <span className="ksk-pillar-hanja">{pillar.jiHanja}</span>
                    <span className="ksk-pillar-read">
                      {pillar.ji}
                      {pillar.jiAnimal ? ` · ${pillar.jiAnimal}` : ''}
                    </span>
                  </div>
                </>
              ) : (
                <div className="ksk-pillar-tile ksk-pillar-unknown">
                  <span className="ksk-pillar-hanja">—</span>
                  <span className="ksk-pillar-read">시 미상</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="ksk-saju-facts">
        <div className="ksk-kv">
          <b>일간</b>
          <p>
            {chart.dayMaster.gan}({chart.dayMaster.hanja}) · {chart.dayMaster.element} ·{' '}
            {chart.dayMaster.yinYang} · {chart.dayMaster.strength}
          </p>
        </div>
        <div className="ksk-kv">
          <b>용신</b>
          <p>
            {chart.yongsin.element}({SAJU_ELEMENT_INFO[chart.yongsin.element]?.hanja}) —{' '}
            {SAJU_ELEMENT_INFO[chart.yongsin.element]?.noteFamily}
          </p>
        </div>
        <div className="ksk-kv">
          <b>생시</b>
          <p>
            {chart.birthDisplay.solarDate}
            {chart.birthDisplay.calendar === 'lunar' ? ' (음력 입력)' : ''}
            {chart.birthDisplay.sijin ? ` · ${chart.birthDisplay.sijin}` : ' · 시 미상'}
          </p>
        </div>
      </div>

      <Section label="오행 분포">
        {(Object.entries(chart.elementCount) as [SajuElement, number][]).map(([el, n]) => (
          <div key={el} className="ksk-trait" data-yongsin={el === chart.yongsin.element}>
            <span>
              {el} ({SAJU_ELEMENT_INFO[el]?.hanja}){el === chart.yongsin.element ? ' ◀' : ''}
            </span>
            <span className="ksk-trait-bar">
              <i style={{ width: `${Math.min(100, (n / 8) * 100)}%` }} />
            </span>
            <span className="ksk-mono">{n}</span>
          </div>
        ))}
      </Section>
    </>
  )
}

export function ChapterSajuReading({ result }: { result: SajuAnalysisResult }) {
  const s = result.sajuAnalysis
  return (
    <>
      <Section label="일간 · 타고난 결">
        <p className="ksk-chapter-title">
          {s.dayMasterReading.archetypeTitle} <em className="ksk-mono">{s.dayMasterReading.hanja}</em>
        </p>
        <p className="ksk-analysis-text">{s.dayMasterReading.natureMetaphor}</p>
        <p className="ksk-analysis-text">{s.dayMasterReading.narrative}</p>
      </Section>

      <Section label="네 기둥이 말하는 것">
        {([
          ['년주', s.pillarsReading.year],
          ['월주', s.pillarsReading.month],
          ['일주', s.pillarsReading.day],
          ['시주', s.pillarsReading.hour],
        ] as const)
          .filter(([, v]) => Boolean(v))
          .map(([k, v]) => (
            <div key={k} className="ksk-kv">
              <b>
                {k} · {v!.title}
              </b>
              <p>{v!.meaning}</p>
            </div>
          ))}
      </Section>

      <Section label="기운의 흐름">
        <p className="ksk-analysis-text">{s.elementFlow.dominantNarrative}</p>
        <p className="ksk-analysis-text">{s.elementFlow.lackingNarrative}</p>
        <p className="ksk-analysis-text">{s.elementFlow.yongsinNarrative}</p>
      </Section>
    </>
  )
}

export function ChapterPurpose({ result }: { result: SajuAnalysisResult }) {
  const p = result.sajuAnalysis.purposeReading
  const c = result.sajuAnalysis.compatibilityReading
  const comp = result.sajuCompatibility

  return (
    <>
      <Section label={SAJU_PURPOSES.find((x) => x.id === p.purpose)?.label ?? '해석'}>
        <p className="ksk-chapter-title">{p.title}</p>
        <p className="ksk-analysis-text">{p.narrative}</p>
        <ol className="ksk-steps">
          {p.keyInsights?.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ol>
        <div className="ksk-kv">
          <b>시기</b>
          <p>{p.timingAdvice}</p>
        </div>
      </Section>

      {c && (
        <Section label="궁합">
          <p className="ksk-chapter-title">
            {c.title} <em className="ksk-mono">{c.score}점</em>
          </p>
          {comp && (
            <p className="ksk-analysis-text">
              {comp.partnerName} · {SAJU_RELATION_LABEL[comp.relation] ?? comp.relation} · 오행 상보{' '}
              {comp.complementScore}
            </p>
          )}
          <p className="ksk-analysis-text">{c.dynamicNarrative}</p>
          {c.harmonyPoints?.length > 0 && (
            <div className="ksk-kv">
              <b>맞물리는 자리</b>
              <p>{c.harmonyPoints.join(' / ')}</p>
            </div>
          )}
          {c.frictionPoints?.length > 0 && (
            <div className="ksk-kv">
              <b>흔들어 깨우는 자리</b>
              <p>{c.frictionPoints.join(' / ')}</p>
            </div>
          )}
          <p className="ksk-analysis-text">{c.adviceNarrative}</p>
          <p className="ksk-analysis-text">{c.sharedScentNarrative}</p>
        </Section>
      )}

      {result.sajuAnalysis.yearlyFlow && (
        <Section label={result.sajuAnalysis.yearlyFlow.yearTitle}>
          <p className="ksk-analysis-text">{result.sajuAnalysis.yearlyFlow.narrative}</p>
        </Section>
      )}
    </>
  )
}

const SAJU_RELATION_LABEL: Record<string, string> = {
  lover: '연인', crush: '썸 · 짝사랑', spouse: '부부', friend: '친구', colleague: '동료', bias: '최애',
}

export function ChapterPrescription({ result }: { result: SajuAnalysisResult }) {
  const d = result.sajuAnalysis.scentDestiny
  const persona = result.matchingPerfumes[0]?.persona
  return (
    <>
      <ScentCard result={result} />
      <Section label="命과 香">
        <p className="ksk-chapter-title">{d.elementBridge}</p>
        <p className="ksk-analysis-text">{d.whyNarrative}</p>
      </Section>

      {persona && (
        <Section label="세 겹의 기운">
          {([
            ['겉향', persona.mainScent?.name, d.topMeaning],
            ['중심향', persona.subScent1?.name, d.middleMeaning],
            ['잔향', persona.subScent2?.name, d.baseMeaning],
          ] as const).map(([tier, name, meaning]) => (
            <div key={tier} className="ksk-kv">
              <b>
                {tier} · {name}
              </b>
              <p>{meaning}</p>
            </div>
          ))}
        </Section>
      )}

      <Section label="처방">
        <p className="ksk-analysis-text">{d.ritualGuide}</p>
        <p className="ksk-analysis-text">{d.wearingMoment}</p>
      </Section>
    </>
  )
}
