// 사주 응답 파서 단위 테스트 — 키오스크 K-WAVE(외국어 손님) 실패 재발 방지
// 실행: npm run test:saju-parser   (esbuild 로 묶어 node:test 로 돌린다 — 별도 테스트 의존성 없음)
//
// 실제 응답 모양: 사주 프롬프트(saju-prompt-builder.ts)의 출력 스키마 + 외국어 응답에서 보던 어긋남
// (enum 번역 "秋"/"ミュート", 곡선 따옴표 perfumeId, "92%" 점수, 문자열 숫자, keyInsights 4개, 코드펜스, 객체 하나로 온 matchingPerfumes)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSajuGeminiResponse, normalizePerfumeId } from '../saju-response-parser'
import type { Locale } from '@/i18n/config'
import type { SajuPurpose } from '@/types/analysis'

type Lang = 'en' | 'ja' | 'zh' | 'zh-Hant'
const LANGS: Lang[] = ['en', 'ja', 'zh', 'zh-Hant']
const PURPOSES: SajuPurpose[] = ['general', 'love', 'wealth', 'career', 'compatibility']

const T: Record<Lang, { s: string; title: string; season: unknown; tone: unknown }> = {
  en: { s: 'Your chart opens with the steady warmth of Byeong fire (丙火).', title: 'The midday sun', season: 'summer', tone: 'bright' },
  ja: { s: 'あなたの命式は丙火（丙火）の穏やかな温もりから始まります。', title: '真昼の太陽', season: '秋', tone: 'ミュート' },
  zh: { s: '你的命式以丙火（丙火）温暖而稳定的力量展开。', title: '正午的太阳', season: '秋天', tone: '柔和' },
  'zh-Hant': { s: '你的命式以丙火（丙火）溫暖而穩定的力量展開。', title: '正午的太陽', season: 'Winter (冬)', tone: '深色' },
}

/** 서로 다른 문장 n개 — 실제 서사처럼 문장마다 다르게(keyInsights 가 모자랄 때 풀이 문장으로 채우는지 보려면 필요) */
function para(lang: Lang, n = 3) {
  return Array.from({ length: n }, (_, i) => T[lang].s.replace(/([.。])$/, ` (${i + 1})$1`)).join(' ')
}

/** 언어별로 실제에서 보던 어긋남을 섞은 응답 */
function fixture(lang: Lang, purpose: SajuPurpose, threePillar: boolean) {
  const t = T[lang]
  const tm = { title: t.title, meaning: para(lang, 2) }
  const perfume: Record<string, unknown> = {
    perfumeId: lang === 'ja' ? 'AC’SCENT 7' : lang === 'zh' ? 'ＡＣ\'ＳＣＥＮＴ 07' : "AC'SCENT 07",
    score: lang === 'ja' ? '92%' : lang === 'zh-Hant' ? 92 : 0.92,
    matchReason: para(lang, 4),
    noteComments: { top: para(lang, 1), middle: para(lang, 1), base: para(lang, 1) },
    usageGuide: { situation: para(lang, 1), tips: [t.s, t.s, t.s] },
  }
  const keyInsights = lang === 'ja' ? [t.s, t.s, t.s, t.s] : lang === 'zh-Hant' ? [t.s, t.s] : [t.s, t.s, t.s]
  return {
    traits: lang === 'ja'
      ? { sexy: '6', cute: '5', charisma: '8', darkness: '4', freshness: '7', elegance: '7', freedom: '6', luxury: '5', purity: '6', uniqueness: '8' }
      : { sexy: 6, cute: 5, charisma: 8, darkness: 4, freshness: 7, elegance: 7, freedom: 6, luxury: 5, purity: 6, uniqueness: 8 },
    scentCategories: { citrus: 6, floral: 5, woody: 7, musky: 6, fruity: 4, spicy: lang === 'zh' ? 0 : 5 },
    dominantColors: ['#C0392B', '#E2604E', '#B8B8B0', '#F5EFE2'],
    personalColor: { season: t.season, tone: t.tone, palette: ['#C0392B', '#E2604E', '#B8B8B0', '#F5EFE2', '#C9A227'], description: para(lang, 1) },
    analysis: { mood: para(lang, 1), style: para(lang, 1), expression: para(lang, 1), concept: para(lang, 1) },
    matchingKeywords: [t.title, t.title, t.title, t.title, t.title],
    matchingPerfumes: lang === 'zh' ? perfume : [perfume],
    scentRecommendation: { best_season: 'summer', best_time: 'evening', season_reason: t.s, time_reason: t.s },
    sajuAnalysis: {
      dayMasterReading: { archetypeTitle: t.title, hanja: '丙火', natureMetaphor: t.s, narrative: para(lang, 8) },
      pillarsReading: {
        year: tm, month: tm, day: tm,
        // 삼주인데 AI 가 시주를 지어낸 경우도 섞는다(파서가 버려야 한다)
        hour: threePillar ? (lang === 'en' ? tm : null) : tm,
      },
      elementFlow: { dominantNarrative: para(lang), lackingNarrative: para(lang), yongsinNarrative: para(lang) },
      purposeReading: { purpose, title: t.title, narrative: para(lang, 10), keyInsights, timingAdvice: t.s },
      ...(purpose === 'compatibility'
        ? {
          compatibilityReading: {
            score: '78', title: t.title, dynamicNarrative: para(lang, 8),
            harmonyPoints: [t.s, t.s], frictionPoints: [t.s], adviceNarrative: para(lang), sharedScentNarrative: para(lang),
          },
        }
        : {}),
      scentDestiny: {
        whyNarrative: para(lang, 6), elementBridge: t.title, topMeaning: t.s, middleMeaning: t.s,
        baseMeaning: t.s, ritualGuide: t.s, wearingMoment: t.s,
      },
      yearlyFlow: { yearTitle: '2026 丙午', narrative: para(lang) },
    },
  }
}

function render(lang: Lang, obj: unknown) {
  const json = JSON.stringify(obj, null, 2)
  // zh 는 코드펜스로, ja 는 앞뒤 설명문을 붙여 온 응답
  if (lang === 'zh') return '```json\n' + json + '\n```'
  if (lang === 'ja') return 'こちらが結果です。\n' + json + '\n以上です。'
  return json
}

const toLocale = (lang: Lang): Locale => (lang === 'zh-Hant' ? 'zh' : lang)

for (const lang of LANGS) {
  for (const purpose of PURPOSES) {
    for (const threePillar of [true, false]) {
      test(`${lang} × ${purpose} × ${threePillar ? '삼주' : '사주'}`, () => {
        const out = parseSajuGeminiResponse(render(lang, fixture(lang, purpose, threePillar)), {
          locale: toLocale(lang),
          purpose,
          isThreePillar: threePillar,
          requireCompatibility: purpose === 'compatibility',
        })
        assert.equal(out.sajuAnalysis.purposeReading.purpose, purpose)
        assert.equal(out.sajuAnalysis.purposeReading.keyInsights.length, 3)
        if (threePillar) assert.equal(out.sajuAnalysis.pillarsReading.hour, null)
        else assert.ok(out.sajuAnalysis.pillarsReading.hour?.meaning)
        assert.equal(out.core.matchingPerfumes.length, 1)
        assert.equal(out.core.matchingPerfumes[0].perfumeId, "AC'SCENT 07")
        assert.ok(out.core.matchingPerfumes[0].score >= 0.85 && out.core.matchingPerfumes[0].score <= 1)
        assert.ok(['spring', 'summer', 'autumn', 'winter'].includes(out.core.personalColor.season))
        assert.ok(['bright', 'light', 'mute', 'deep'].includes(out.core.personalColor.tone))
        for (const v of Object.values(out.core.traits)) assert.ok(Number.isInteger(v) && v >= 1 && v <= 10)
        for (const v of Object.values(out.core.scentCategories)) assert.ok(Number.isInteger(v) && v >= 1 && v <= 10)
        if (purpose === 'compatibility') assert.ok(out.sajuAnalysis.compatibilityReading?.dynamicNarrative)
        else assert.equal(out.sajuAnalysis.compatibilityReading, undefined)
      })
    }
  }
}

test('enum 번역을 원래 값으로 — 秋→autumn, ミュート→mute, Winter (冬)→winter, 深色→deep', () => {
  const opts = { locale: 'ja' as Locale, purpose: 'love' as SajuPurpose, isThreePillar: true, requireCompatibility: false }
  assert.equal(parseSajuGeminiResponse(render('ja', fixture('ja', 'love', true)), opts).core.personalColor.season, 'autumn')
  assert.equal(parseSajuGeminiResponse(render('ja', fixture('ja', 'love', true)), opts).core.personalColor.tone, 'mute')
  const hant = parseSajuGeminiResponse(render('zh-Hant', fixture('zh-Hant', 'love', true)), { ...opts, locale: 'zh' })
  assert.equal(hant.core.personalColor.season, 'winter')
  assert.equal(hant.core.personalColor.tone, 'deep')
})

test('perfumeId 정규화', () => {
  assert.equal(normalizePerfumeId('AC’SCENT 7'), "AC'SCENT 07")
  assert.equal(normalizePerfumeId('ＡＣ\'ＳＣＥＮＴ 07'), "AC'SCENT 07")
  assert.equal(normalizePerfumeId('AC SCENT-12'), "AC'SCENT 12")
  assert.equal(normalizePerfumeId("AC'SCENT 01"), "AC'SCENT 01")
})

test('잘린 JSON 은 원인이 드러나는 오류로 거부', () => {
  const text = render('en', fixture('en', 'love', true)).slice(0, 1500)
  assert.throws(
    () => parseSajuGeminiResponse(text, { locale: 'en', purpose: 'love', isThreePillar: true, requireCompatibility: false }),
    /괄호 짝/,
  )
})

test('코어 검증 실패는 실제 원인을 담는다(재시도 프롬프트·로그용)', () => {
  const bad = fixture('en', 'general', true) as Record<string, unknown>
  bad.matchingPerfumes = [{ perfumeId: 'NOT-A-PERFUME', score: 0.9, matchReason: 'x' }]
  assert.throws(
    () => parseSajuGeminiResponse(JSON.stringify(bad), { locale: 'en', purpose: 'general', isThreePillar: true, requireCompatibility: false }),
    /Invalid perfume ID: NOT-A-PERFUME/,
  )
})

test('sajuAnalysis 블록이 없으면 거부', () => {
  const bad = fixture('ja', 'love', true) as Record<string, unknown>
  delete bad.sajuAnalysis
  assert.throws(
    () => parseSajuGeminiResponse(JSON.stringify(bad), { locale: 'ja', purpose: 'love', isThreePillar: true, requireCompatibility: false }),
    /sajuAnalysis 객체가 누락/,
  )
})

test('궁합인데 compatibilityReading 이 없으면 거부', () => {
  const bad = fixture('zh', 'compatibility', false) as { sajuAnalysis: Record<string, unknown> }
  delete bad.sajuAnalysis.compatibilityReading
  assert.throws(
    () => parseSajuGeminiResponse(JSON.stringify(bad), { locale: 'zh', purpose: 'compatibility', isThreePillar: false, requireCompatibility: true }),
    /compatibilityReading/,
  )
})
