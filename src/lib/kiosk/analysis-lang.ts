// 키오스크 분석 결과의 언어 처리 — 번체(繁體中文) 전용 보정.
// 사이트 분석 파이프라인은 ko/en/ja/zh(간체)까지만 안다. 번체는 zh 경로로 돌리되
// ① 프롬프트의 간체 지시를 번체로 바꿔 AI가 처음부터 번체로 쓰게 하고
// ② AI가 아니라 로컬 데이터에서 오는 향수 텍스트(이름·노트·키워드)는 번체 표로 덮는다.

import type { ImageAnalysisResult } from '@/types/analysis'
import { PERFUMES_ZH_HANT } from './perfumes-zh-hant'

const HANT_OVERRIDE = `

# 🚨 最終語言規則（優先於以上所有指示）
- 所有文字值必須使用**繁體中文（台灣正體字、台灣用語）**，禁止出現任何簡體字。
- 例：用「這」不用「这」、用「們」不用「们」、用「氣」不用「气」、用「體」不用「体」、用「專」不用「专」。
- 用詞採台灣習慣：列印（非打印）、螢幕（非屏幕）、相簿（非相册）。
- JSON 鍵名維持英文不變。`

/** zh(간체) 프롬프트를 번체 출력 지시로 바꾼다 */
export function toTraditionalChinesePrompt(prompt: string): string {
  return prompt.replace(/简体中文/g, '繁體中文（台灣正體字）') + HANT_OVERRIDE
}

/** 결과의 향수(persona) 로컬 텍스트를 번체로 덮는다 — AI가 쓴 코멘트·가이드는 그대로 둔다 */
export function applyTraditionalPersona(result: ImageAnalysisResult): ImageAnalysisResult {
  const [first, ...rest] = result.matchingPerfumes ?? []
  const persona = first?.persona
  if (!persona) return result
  const hant = PERFUMES_ZH_HANT[persona.id]
  if (!hant) return result

  return {
    ...result,
    matchingPerfumes: [
      {
        ...first,
        persona: {
          ...persona,
          name: hant.name,
          description: hant.description,
          keywords: hant.keywords,
          mood: hant.mood,
          personality: hant.personality,
          mainScent: { ...persona.mainScent, name: hant.mainScent },
          subScent1: { ...persona.subScent1, name: hant.subScent1 },
          subScent2: { ...persona.subScent2, name: hant.subScent2 },
          // AI가 쓴 사용 상황이 있으면 그걸(이미 번체), 없으면 로컬 추천 문구
          recommendation: persona.usageGuide?.situation || hant.recommendation,
        },
      },
      ...rest,
    ],
  }
}
