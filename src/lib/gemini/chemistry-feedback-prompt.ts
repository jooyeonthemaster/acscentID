/**
 * 케미 취향 반영 레시피 생성 프롬프트
 */

import { perfumes } from '@/data/perfumes'
import { wrapPromptWithLocale } from './locale-prompt-wrapper'
import type { Locale } from '@/i18n/config'
import { SCENT_FAMILIES, type ChemistryTasteData } from '@/types/feedback'

interface PerfumeInfo {
  id: string
  name: string
  characteristics: Record<string, number>
}

export function buildChemistryTastePrompt(
  taste: ChemistryTasteData,
  perfumeA: PerfumeInfo,
  perfumeB: PerfumeInfo,
  characterAName: string,
  characterBName: string,
  locale: Locale = 'ko'
): string {
  // 향 계열 선호 해석
  const likes = SCENT_FAMILIES.filter(f => taste.scentPreferences[f.id] === 'like').map(f => f.label)
  const dislikes = SCENT_FAMILIES.filter(f => taste.scentPreferences[f.id] === 'dislike').map(f => f.label)

  // 온도감 해석
  const warmthDesc = taste.warmth <= 30 ? '시원하고 청량한 향 선호' :
    taste.warmth <= 70 ? '온도감 중립 (밸런스)' : '따뜻하고 포근한 향 선호'

  // 존재감 해석
  const intensityDesc = taste.intensity === 'subtle' ? '은은하게 스치는 가벼운 향' :
    taste.intensity === 'bold' ? '강렬하고 깊은 존재감의 향' : '적당한 존재감의 자연스러운 향'

  // 30개 향 DB
  const fragranceDB = perfumes.map(p =>
    `${p.id} "${p.name}" - ${p.category} | citrus:${p.characteristics.citrus} floral:${p.characteristics.floral} woody:${p.characteristics.woody} musky:${p.characteristics.musky} fruity:${p.characteristics.fruity} spicy:${p.characteristics.spicy}`
  ).join('\n')

  const prompt = `
# 역할
너는 AC'SCENT IDENTITY의 수석 조향사 AI야.
케미 향수 세트의 커스텀 레시피를 만들어줘.
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

## 끌리는 향 계열
${likes.length > 0 ? likes.join(', ') : '특별히 선택하지 않음'}

## 피하고 싶은 향 계열
${dislikes.length > 0 ? dislikes.join(', ') : '없음'}

## 향의 온도
${warmthDesc} (수치: ${taste.warmth}/100)

## 향의 존재감
${intensityDesc}

## 추가 요청
${taste.freeText || '없음'}

# 생성 규칙

1. 각 향수(A, B)에 대해 **2가지 대안 레시피**를 생성 (1안, 2안)
2. **1안과 2안은 동일한 3개 향료를 사용**하되, **방울 수(drops)와 비율(ratio)만 다르게** 구성
3. 예: 1안 = 4:3:3 비율, 2안 = 6:2:2 비율 (같은 향료, 다른 밸런스)
4. 각 레시피는 3개 향료, drops 합계=10, ratio 합계=100%
5. 원본 향수는 최소 1개 레시피에 포함
6. 사용자가 "싫어요"한 향 계열은 최대한 피하기
7. 사용자가 "좋아요"한 향 계열을 적극 반영
8. 온도감과 존재감 설정을 레시피 구성에 반영
9. 두 향수는 레이어링했을 때 조화롭게 설계

# 응답 (JSON ONLY)

{
  "recipeA1": {
    "granules": [
      { "id": "AC'SCENT XX", "name": "향이름", "mainCategory": "카테고리", "drops": 숫자, "ratio": 숫자, "reason": "주접톤 선택 이유", "fanComment": "광기톤 코멘트" }
    ],
    "overallExplanation": "1안 설명 (주접+광기, 2문장)",
    "categoryChanges": [
      { "category": "citrus", "change": "increased|decreased|maintained", "originalScore": 숫자, "newScore": 숫자, "reason": "주접톤" }
    ],
    "testingInstructions": { "step1": "", "step2": "", "step3": "", "caution": "" },
    "fanMessage": "응원 (광기)",
    "totalDrops": 10,
    "estimatedStrength": "light|medium|strong"
  },
  "recipeA2": { ... 1안과 확실히 다른 개성 ... },
  "recipeB1": { ... },
  "recipeB2": { ... },
  "layeringNote": "레이어링 가이드 (반말+이모지, 2문장)",
  "pairExplanation": "이 페어가 왜 좋은지 (반말+이모지, 3문장)"
}

# 주의
- granules 반드시 각 3개, drops=10, ratio=100
- categoryChanges는 6개 카테고리 모두
- 1안과 2안은 반드시 같은 3개 향료, 비율만 다르게!
- 싫어요 향 계열의 향료는 사용 금지
- 모든 텍스트: 반말+이모지+주접/광기 톤!
`

  return wrapPromptWithLocale(prompt, locale)
}
