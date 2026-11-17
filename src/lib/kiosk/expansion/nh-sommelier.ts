// 연말 시상식 AI 소믈리에(studio-sommelier-nh) — 기존 소믈리에(preferences.ts wineResults)와 같은 구조:
// 손님 답(단맛 · 산미 · 바디 · 종류) + 사진(표정 · 옷 색) → 로컬 규칙이 시음 와인 10병(nh-wines.ts)에 점수를 매겨 위 4병을 후보로 → AI 가 그중 한 병을 고른다.
// 결과는 와인 '스타일'이 아니라 실제 병 하나 — 현장 직원이 번호를 보고 따른다. 후보 밖 와인은 AI 응답 검사(ai.ts)가 거절한다.
//
// 재고 고르게 쓰기: 같은 맛 답이 몰리면(대부분 손님이 슬라이더를 3에 둔다) 한 병만 동난다.
//   - 키오스크마다 오늘 추천한 병 수를 세고(화면 쪽 localStorage), 맛 점수가 비슷한 병(1등과 12점 안)끼리 견줘 더 많이 나간 병에서 점수를 뺀다(balancePenalties).
//     빼는 점수는 맛 차이 한 칸 반(12점)까지만 — 취향과 먼 병을 억지로 고르지 않는다.
//   - AI 에는 '뚜렷한 까닭이 없으면 첫 후보'를 고르라고 한다(ai.ts MODE) — 규칙의 균형이 AI 를 거쳐도 유지된다.
// 이 파일은 계산만 한다(DOM 없음 · 시험 가능).

import { expression, outfitLook, PHOTO_PLANS, readingLine, type ColorFamily, type PhotoReading } from './photo'
import type { ExperienceResult, ResultSection } from './types'
import { NH_WINES, type NhWine, type NhWineKind } from './nh-wines'

export const NH_KIND_LABEL: Record<NhWineKind, string> = { sparkling: '스파클링', white: '화이트', rose: '로제', red: '레드' }
/** 종류 색 — 화면 배지 · 병 그림 */
export const NH_KIND_COLOR: Record<NhWineKind, string> = { sparkling: '#C9A84A', white: '#B8B061', rose: '#D9818F', red: '#7A1F35' }

export type NhKindChoice = 'any' | NhWineKind
export interface NhAnswers { sweet: number; acid: number; body: number; kind: NhKindChoice }
export const NH_DEFAULT_ANSWERS: NhAnswers = { sweet: 3, acid: 3, body: 3, kind: 'any' }

export const NH_SCALES = [
  { key: 'sweet', title: '단맛', note: '1 드라이 · 5 달콤하게' },
  { key: 'acid', title: '산미', note: '1 부드럽게 · 5 상큼하게' },
  { key: 'body', title: '바디감', note: '1 가볍게 · 5 묵직하게' },
] as const
export const NH_KINDS: { id: NhKindChoice; label: string; note: string }[] = [
  { id: 'any', label: '모두 좋아요', note: '맛 취향으로만 골라요' },
  { id: 'sparkling', label: '스파클링', note: '톡 터지는 기포' },
  { id: 'white', label: '화이트', note: '맑고 산뜻하게' },
  { id: 'rose', label: '로제', note: '분홍빛 과일 향' },
  { id: 'red', label: '레드', note: '붉은 과일 · 깊은 맛' },
]

/** 맛 한 칸 차이의 점수 */
const W = { sweet: 8, acid: 7, body: 8 }
/** 맛 점수가 비슷한 병들(1등과 BALANCE_MAX 점 안) 사이에서 한 번 더 나간 병마다 빼는 점수 · 최대 */
export const BALANCE_STEP = 4
export const BALANCE_MAX = 12
/** 사진이 한 병에 더하는 점수의 최대 — 맛 답이 먼저다 */
const PHOTO_MAX = 10

export const nhWineId = (w: Pick<NhWine, 'no'>) => `nh-wine-${w.no}`
export const findNhWine = (id: string | null | undefined) => NH_WINES.find((w) => nhWineId(w) === id) ?? null

/** 오늘 이 키오스크에서 병마다 추천한 수 — 번호 → 횟수 */
export type PourCounts = Record<number, number>

/**
 * 재고 균형 점수 — 맛 점수가 1등과 BALANCE_MAX 점 안인 병들(비슷하게 어울리는 병)끼리만 견준다.
 * 그중 가장 덜 나간 병보다 많이 나간 만큼 STEP 점씩 빼되 MAX 까지만 — 그래서 MAX 점보다 맛이 먼 병은 아무리 덜 나가도 앞서지 못한다.
 */
export function balancePenalties(scores: { no: number; score: number }[], counts: PourCounts | null | undefined): Map<number, number> {
  const out = new Map<number, number>()
  if (!counts || !scores.length) return out
  const top = Math.max(...scores.map((x) => x.score))
  const near = scores.filter((x) => x.score >= top - BALANCE_MAX)
  const least = Math.min(...near.map((x) => counts[x.no] ?? 0))
  for (const x of scores) out.set(x.no, Math.min(BALANCE_MAX, Math.max(0, ((counts[x.no] ?? 0) - least) * BALANCE_STEP)))
  return out
}

/** 옷 색이 떠올리게 하는 와인 종류 — 무채색 · 파랑 계열은 어느 쪽도 아니다 */
const KIND_OF: Partial<Record<ColorFamily, NhWineKind>> = { red: 'red', burgundy: 'red', brown: 'red', purple: 'red', pink: 'rose', coral: 'rose', lavender: 'rose', white: 'white', beige: 'white', khaki: 'white', green: 'white', mint: 'white', yellow: 'sparkling', orange: 'sparkling' }

function photoBoost(w: NhWine, photo: PhotoReading): { points: number; reasons: string[] } {
  const face = expression(photo), look = outfitLook(photo)
  const reasons: string[] = []
  let points = 0
  const add = (n: number, why: string) => { if (points + n > PHOTO_MAX) n = PHOTO_MAX - points; if (n > 0) { points += n; reasons.push(`${why} +${n}점`) } }
  if (face?.bright && (w.sweet >= 3 || w.kind === 'sparkling')) add(4, `${face.label} → 과일향 · 기포가 즐거운 와인`)
  if (face?.calm && w.body >= 4) add(4, `${face.label} → 차분하고 깊은 와인`)
  if (face && !face.bright && !face.calm && w.acid >= 4) add(3, `${face.label} → 산뜻한 와인`)
  if (look?.depth === 'dark' && w.body >= 4) add(4, `짙은 옷 색(${look.main.name}) → 묵직한 바디`)
  if (look?.depth === 'light' && w.body <= 2) add(4, `밝은 옷 색(${look.main.name}) → 가벼운 바디`)
  if (look && KIND_OF[look.main.family] === w.kind) add(3, `옷 색 ${look.main.name} → ${NH_KIND_LABEL[w.kind]}`)
  return { points, reasons }
}

const metrics = (w: NhWine) => [
  { label: '단맛', value: w.sweet, max: 5 },
  { label: '산미', value: w.acid, max: 5 },
  { label: '바디', value: w.body, max: 5 },
  ...(w.tannin != null ? [{ label: '타닌', value: w.tannin, max: 5 }] : []),
]

/** 내 답과 이 병의 맛 차이를 사람 말로 */
function compareLine(w: NhWine, a: NhAnswers): string {
  const parts: string[] = []
  const say = (label: string, mine: number, its: number, more: string, less: string) => {
    if (mine === its) parts.push(`${label}은 고른 그대로(${its})`)
    else parts.push(`${label}은 ${its > mine ? more : less}(${its})`)
  }
  say('단맛', a.sweet, w.sweet, '조금 더 달고', '조금 더 드라이하고')
  say('산미', a.acid, w.acid, '조금 더 상큼하고', '조금 더 부드럽고')
  say('바디', a.body, w.body, '조금 더 묵직해요', '조금 더 가벼워요')
  return `${parts.join(', ')}.`
}

export const NH_FOOTNOTE = '성인을 위한 와인 시음 안내예요. 적당히 즐기시고, 운전하실 분은 마시지 않아요. 맛 점수는 시음 목록 카탈로그 기준이에요.'

export interface NhRanked { wine: NhWine; score: number; result: ExperienceResult }

/** 10병에 점수를 매겨 높은 순으로 — 종류를 고르면 그 종류만(로제를 고르면 로제 한 병) */
export function rankNhWines(a: NhAnswers, photo: PhotoReading | null = null, counts: PourCounts | null = null): NhRanked[] {
  const pool = a.kind === 'any' ? NH_WINES : NH_WINES.filter((w) => w.kind === a.kind)
  const raw = pool.map((w) => {
    const taste = 100 - W.sweet * Math.abs(w.sweet - a.sweet) - W.acid * Math.abs(w.acid - a.acid) - W.body * Math.abs(w.body - a.body)
    const boost = photo ? photoBoost(w, photo) : null
    return { w, boost, score: taste + (boost?.points ?? 0) }
  })
  const penalties = balancePenalties(raw.map((x) => ({ no: x.w.no, score: x.score })), counts)
  const ranked = raw.map(({ w, boost, score }) => {
    const sections: ResultSection[] = [
      { title: '나의 취향과 비교', body: `고른 값: 단맛 ${a.sweet} · 산미 ${a.acid} · 바디 ${a.body}${a.kind === 'any' ? '' : ` · ${NH_KIND_LABEL[a.kind]}`}. 이 와인은 ${compareLine(w, a)}` },
      ...(photo && boost ? [{ title: '사진에서 읽은 것', body: `${readingLine(photo, PHOTO_PLANS['sommelier-nh'])}. 기기에서 잰 값으로 더한 점수예요.`, items: boost.reasons.length ? boost.reasons : ['이 와인에는 사진으로 더한 점수가 없어요. 답변으로 고른 와인이에요.'] }] : []),
    ]
    const result: ExperienceResult = {
      id: nhWineId(w),
      title: `${w.no}번 · ${w.name}`,
      subtitle: `${NH_KIND_LABEL[w.kind]} · ${w.region}`,
      summary: `${w.line} · 품종 ${w.grapes}`,
      tags: [NH_KIND_LABEL[w.kind], w.grapes, w.region.split(' ')[0]],
      metrics: metrics(w),
      sections,
      footnote: NH_FOOTNOTE,
      pour: { no: w.no, name: w.name, en: w.en, kind: NH_KIND_LABEL[w.kind], color: NH_KIND_COLOR[w.kind], bottle: w.bottle },
    }
    return { wine: w, score: score - (penalties.get(w.no) ?? 0), result }
  })
  // 점수가 같으면 오늘 덜 나간 병 → 번호 순
  return ranked.sort((p, q) => q.score - p.score || (counts?.[p.wine.no] ?? 0) - (counts?.[q.wine.no] ?? 0) || p.wine.no - q.wine.no)
}

export interface NhBundle { primary: ExperienceResult; alternatives: ExperienceResult[]; answers: { label: string; value: string }[] }

export function recommendNhWine(a: NhAnswers, photo: PhotoReading | null = null, counts: PourCounts | null = null): NhBundle {
  for (const key of ['sweet', 'acid', 'body'] as const) if (!Number.isInteger(a[key]) || a[key] < 1 || a[key] > 5) throw new Error('맛 점수는 1~5 사이로 골라 주세요.')
  if (!NH_KINDS.some((k) => k.id === a.kind)) throw new Error('와인 종류를 골라 주세요.')
  const ranked = rankNhWines(a, photo, counts).slice(0, 4).map((r) => r.result)
  return {
    primary: ranked[0], alternatives: ranked.slice(1),
    answers: [
      { label: '단맛', value: `${a.sweet} / 5` }, { label: '산미', value: `${a.acid} / 5` }, { label: '바디', value: `${a.body} / 5` },
      { label: '좋아하는 종류', value: NH_KINDS.find((k) => k.id === a.kind)!.label },
    ],
  }
}

/** AI 후보 설명 — 이름 · 종류 · 산지 · 품종 · 점수 · 한 줄(지어낼 거리가 없게 전부 넘긴다) */
export const nhCandidateSummary = (w: NhWine) =>
  `${w.no}번 · ${NH_KIND_LABEL[w.kind]} · ${w.region} · 품종 ${w.grapes} · 단맛 ${w.sweet} 산미 ${w.acid} 바디 ${w.body}${w.tannin != null ? ` 타닌 ${w.tannin}` : ''} · ${w.line}`

/** 와인을 가리키지 않는 흔한 말 — 품종 · 종류 이름은 다른 병에도 나오므로 브랜드 낱말에서 뺀다 */
const COMMON = ['샤또', '샤토', '와인', '셀렉티드', '빈야드', '로제', '루즈', '블랑', '레드', '화이트', '스파클링', '초이스', '버블스', '밸리', '더']
/** 이름에서 그 병만 가리키는 낱말 — '샤또 몽페라 루즈' → ['몽페라']. 품종(다른 병의 품종 포함)은 뺀다 */
export function brandWords(w: NhWine): string[] {
  const grapes = NH_WINES.map((x) => x.grapes).join(' ')
  return w.name.split(' ').filter((x) => x.length >= 2 && !COMMON.includes(x) && !grapes.includes(x))
}

/**
 * AI 글에 후보가 아닌 시음 와인이 나오면 거절 — 후보 4병 밖의 병을 권하지 못하게(기존 '후보 밖 pick 거절'에 더해 본문까지).
 * 돌려주는 값: 문제가 된 와인 이름(없으면 null)
 */
export function outsideWineMention(text: string, candidateIds: string[]): string | null {
  for (const w of NH_WINES) {
    if (candidateIds.includes(nhWineId(w))) continue
    const hit = brandWords(w).find((word) => text.includes(word))
    if (hit) return `${w.no}번 ${w.name}(${hit})`
  }
  return null
}
