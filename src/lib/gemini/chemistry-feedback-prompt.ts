/**
 * 케미 취향 반영 레시피 생성 프롬프트
 */

import { perfumes } from '@/data/perfumes'
import { wrapPromptWithLocale } from './locale-prompt-wrapper'
import type { Locale } from '@/i18n/config'
import type { ChemistryTasteData } from '@/types/feedback'

interface PerfumeInfo {
  id: string
  name: string
  characteristics: Record<string, number>
}

type TasteWithMeta = ChemistryTasteData & { satisfied?: boolean; retention?: number }

// retention → drops 변환 (10방울 기준)
function retentionToDrops(retention: number): number {
  // 10~90% 범위로 클램프 후 10방울 기준으로 반올림
  const clamped = Math.max(10, Math.min(90, retention))
  return Math.max(1, Math.min(9, Math.round(clamped / 10)))
}

export function buildChemistryTastePrompt(
  tasteA: TasteWithMeta,
  tasteB: TasteWithMeta,
  perfumeA: PerfumeInfo,
  perfumeB: PerfumeInfo,
  characterAName: string,
  characterBName: string,
  locale: Locale = 'ko'
): string {
  // 존재감 해석
  const describeIntensity = (i: string) =>
    i === 'subtle' ? '은은하게 스치는 가벼운 향' :
    i === 'bold' ? '강렬하고 깊은 존재감의 향' :
    '적당한 존재감의 자연스러운 향'

  // retention → drops
  const retentionA = typeof tasteA.retention === 'number' ? tasteA.retention : 70
  const retentionB = typeof tasteB.retention === 'number' ? tasteB.retention : 70
  const dropsA = retentionToDrops(retentionA)
  const dropsB = retentionToDrops(retentionB)
  const remainingDropsA = 10 - dropsA
  const remainingDropsB = 10 - dropsB

  // 30개 향 DB
  const fragranceDB = perfumes.map(p =>
    `${p.id} "${p.name}" - ${p.category} | citrus:${p.characteristics.citrus} floral:${p.characteristics.floral} woody:${p.characteristics.woody} musky:${p.characteristics.musky} fruity:${p.characteristics.fruity} spicy:${p.characteristics.spicy}`
  ).join('\n')

  const prompt = `
# 역할
너는 AC'SCENT IDENTITY의 수석 조향사 AI야.
레이어링 퍼퓸 세트의 커스텀 테스팅 레시피를 만들어줘.
스타일: 주접 + 광기 모드! 이모지 필수! 반말 필수!

# 향료 DB (30종)
${fragranceDB}

# 원본 추천 향수

## 향수 A (${characterAName})
- ${perfumeA.id} "${perfumeA.name}"
- 특성: ${JSON.stringify(perfumeA.characteristics)}

## 향수 B (${characterBName})
- ${perfumeB.id} "${perfumeB.name}"
- 특성: ${JSON.stringify(perfumeB.characteristics)}

# 사용자 취향

## ${characterAName} (향수 A)
- 원본 유지율: ${retentionA}% → **원본 향수 ${perfumeA.id}를 반드시 ${dropsA}방울 사용!**
- 추가 향료로 사용할 drops: 총 ${remainingDropsA}방울
- 존재감: ${describeIntensity(tasteA.intensity)}
- 추가 요청: ${tasteA.freeText || '없음'}

## ${characterBName} (향수 B)
- 원본 유지율: ${retentionB}% → **원본 향수 ${perfumeB.id}를 반드시 ${dropsB}방울 사용!**
- 추가 향료로 사용할 drops: 총 ${remainingDropsB}방울
- 존재감: ${describeIntensity(tasteB.intensity)}
- 추가 요청: ${tasteB.freeText || '없음'}

# 🎯 생성 규칙 (반드시 준수!)

## 1. 레시피 구조
- 각 향수(A, B)에 대해 **2가지 서로 다른 개성의 레시피**를 생성 (1안, 2안)
- 각 레시피는 정확히 3개 향료, drops 합계 = 10, ratio 합계 = 100%

## 2. ⚠️ 원본 유지율 절대 준수!
- 향수 A의 1안, 2안 모두 **원본 "${perfumeA.id}"를 정확히 ${dropsA}방울** 포함 (ratio ${retentionA}%)
- 향수 B의 1안, 2안 모두 **원본 "${perfumeB.id}"를 정확히 ${dropsB}방울** 포함 (ratio ${retentionB}%)
- 이 방울 수는 사용자가 선택한 값! 절대 바꾸지 마!

## 3. ⚠️ 1안 vs 2안은 반드시 "다른 향료 조합"
- 1안: 원본 + 2가지 추가 향료 (조합 X) — 예: 밝고 상큼한 방향
- 2안: 원본 + 2가지 **다른** 추가 향료 (조합 Y) — 예: 깊고 포근한 방향
- 원본을 제외한 나머지 2개 향료는 1안과 2안이 **완전히 달라야 함**
- 두 안은 서로 다른 무드/컨셉을 지향 (단순히 비율만 다르면 안 됨!)

## 4. 추가 향료 drops 분배
- 향수 A 추가 향료 2개의 drops 합계 = ${remainingDropsA} (예: ${Math.ceil(remainingDropsA/2)}방울 + ${Math.floor(remainingDropsA/2)}방울)
- 향수 B 추가 향료 2개의 drops 합계 = ${remainingDropsB} (예: ${Math.ceil(remainingDropsB/2)}방울 + ${Math.floor(remainingDropsB/2)}방울)
- 존재감 설정(subtle/moderate/bold)에 따라 두 추가 향료 중 어느 쪽이 강할지 조정

## 5. 사용자 요청 반영
- freeText의 요청사항을 추가 향료 선택에 반영

## 6. 레이어링 조화
- 향수 A와 B의 레시피들이 나란히 사용됐을 때 조화로워야 함

## 7. categoryChanges 계산
- 각 레시피의 3개 향료 특성(citrus/floral/woody/musky/fruity/spicy)을 ratio 비율대로 합산해서 newScore 계산
- originalScore는 원본 향수의 characteristics 값
- change는 newScore와 originalScore 차이에 따라 'increased'(>+5) | 'decreased'(<-5) | 'maintained'(±5 이내)

# 응답 (JSON ONLY)

{
  "recipeA1": {
    "granules": [
      { "id": "${perfumeA.id}", "name": "${perfumeA.name}", "mainCategory": "카테고리", "drops": ${dropsA}, "ratio": ${retentionA}, "reason": "원본이라 유지! 주접톤", "fanComment": "광기톤" },
      { "id": "AC'SCENT XX", "name": "향이름", "mainCategory": "카테고리", "drops": 숫자, "ratio": 숫자, "reason": "선택 이유 주접톤", "fanComment": "광기톤" },
      { "id": "AC'SCENT YY", "name": "향이름", "mainCategory": "카테고리", "drops": 숫자, "ratio": 숫자, "reason": "선택 이유 주접톤", "fanComment": "광기톤" }
    ],
    "overallExplanation": "1안의 컨셉/무드 설명 (주접+광기, 2문장)",
    "categoryChanges": [
      { "category": "citrus", "change": "increased|decreased|maintained", "originalScore": 숫자, "newScore": 숫자, "reason": "주접톤" },
      { "category": "floral", ... },
      { "category": "woody", ... },
      { "category": "musky", ... },
      { "category": "fruity", ... },
      { "category": "spicy", ... }
    ],
    "testingInstructions": {
      "step1": "깨끗한 테스팅 스트립/블랑 베이스에 향료를 준비해",
      "step2": "비율대로 섞어 — 원본 ${dropsA}방울 + 추가 향료들 총 ${remainingDropsA}방울 (총 10방울)",
      "step3": "손목이나 스트립에 찍어서 10분 후 맡아봐",
      "caution": "주의사항 (반말)"
    },
    "fanMessage": "응원 (광기)",
    "totalDrops": 10,
    "estimatedStrength": "light|medium|strong"
  },
  "recipeA2": { ...1안과 다른 방향성 & 다른 추가 향료 2개... },
  "recipeB1": { ...원본 ${perfumeB.id} ${dropsB}방울 고정... },
  "recipeB2": { ...1안과 다른 방향성 & 다른 추가 향료 2개... },
  "layeringNote": "A와 B 레이어링 가이드 (반말+이모지, 2문장)",
  "pairExplanation": "이 페어가 왜 좋은지 (반말+이모지, 3문장)"
}

# ⚠️ 최종 체크리스트
- [ ] 각 레시피 granules = 정확히 3개
- [ ] 각 레시피 drops 합계 = 10, ratio 합계 = 100
- [ ] recipeA1, recipeA2 모두 원본 "${perfumeA.id}" ${dropsA}방울 포함
- [ ] recipeB1, recipeB2 모두 원본 "${perfumeB.id}" ${dropsB}방울 포함
- [ ] A1과 A2는 원본 제외 2개 향료가 완전히 다름
- [ ] B1과 B2는 원본 제외 2개 향료가 완전히 다름
- [ ] categoryChanges 6개 카테고리(citrus/floral/woody/musky/fruity/spicy) 모두 포함
- [ ] 모든 텍스트: 반말+이모지+주접/광기 톤!
`

  return wrapPromptWithLocale(prompt, locale)
}
