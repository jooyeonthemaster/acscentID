/**
 * 피드백 기반 커스텀 레시피 생성을 위한 Gemini 프롬프트
 * AC'SCENT IDENTITY - 주접 + 광기 스타일
 */

import { PerfumeFeedback, CategoryPreferences, SpecificScent } from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
import { wrapPromptWithLocale } from './locale-prompt-wrapper'
import type { Locale } from '@/i18n/config'

interface OriginalPerfumeInfo {
  id: string
  name: string
  characteristics: Record<string, number>
  category: string
}

/**
 * 카테고리 선호도를 한글로 변환
 */
function translatePreference(pref: string): string {
  switch (pref) {
    case 'increase':
      return '더 강하게 원함'
    case 'decrease':
      return '더 약하게 원함'
    case 'maintain':
      return '현재 유지'
    default:
      return '현재 유지'
  }
}

/**
 * 카테고리 한글명
 */
const CATEGORY_KOREAN: Record<string, string> = {
  citrus: '시트러스',
  floral: '플로럴',
  woody: '우디',
  musky: '머스크',
  fruity: '프루티',
  spicy: '스파이시',
}

/**
 * 추천 향수 비율 해석
 */
function interpretRetention(percentage: number): string {
  if (percentage >= 80) return '추천 향 대부분 유지 - 살짝만 변화 원함'
  if (percentage >= 60) return '추천 향 절반 이상 유지 - 적당한 변화 원함'
  if (percentage >= 40) return '추천 향 절반 정도 - 새로운 향과 밸런스'
  if (percentage >= 20) return '추천 향 조금만 - 새로운 조합 위주'
  return '추천 향 최소 - 완전히 다른 향으로 변신'
}

/**
 * 30가지 향수 데이터베이스를 프롬프트용으로 포맷
 */
function formatPerfumeDatabase(): string {
  return perfumes
    .map((p) => {
      const chars = Object.entries(p.characteristics)
        .map(([k, v]) => `${CATEGORY_KOREAN[k] || k}:${v}`)
        .join(', ')
      return `- ${p.id}: "${p.name}" (${CATEGORY_KOREAN[p.category] || p.category}) [${chars}]`
    })
    .join('\n')
}

/**
 * 카테고리 선호도 변경 요약
 */
function formatCategoryChanges(prefs: CategoryPreferences): string {
  return Object.entries(prefs)
    .map(([cat, pref]) => {
      const korean = CATEGORY_KOREAN[cat] || cat
      const prefText = translatePreference(pref)
      return `- ${korean}: ${prefText}`
    })
    .join('\n')
}

/**
 * 특정 향료 선택 요약
 */
function formatSpecificScents(scents: SpecificScent[]): string {
  if (scents.length === 0) {
    return '선택된 특정 향료 없음 (AI가 최적 조합 결정)'
  }
  return scents.map((s) => `- ${s.id} (${s.name}): 비율 ${s.ratio}%`).join('\n')
}

/**
 * 메인 프롬프트 빌더
 */
export function buildRecipePrompt(
  feedback: PerfumeFeedback,
  originalPerfume: OriginalPerfumeInfo,
  characterName?: string, // 분석된 캐릭터 이름
  naturalLanguageFeedback?: string, // 자연어 피드백 (Step 3)
  userDirectRecipeGranules?: { id: string; name: string; ratio: number; mainCategory: string }[], // 1안 향료 정보
  locale: Locale = 'ko'
): string {
  const perfumeDb = formatPerfumeDatabase()
  const categoryChanges = formatCategoryChanges(feedback.categoryPreferences)
  const specificScents = formatSpecificScents(feedback.specificScents)
  const retentionInterpretation = interpretRetention(feedback.retentionPercentage)

  // 어떤 변화가 요청되었는지 분석
  const increases = Object.entries(feedback.categoryPreferences)
    .filter(([, v]) => v === 'increase')
    .map(([k]) => CATEGORY_KOREAN[k])
  const decreases = Object.entries(feedback.categoryPreferences)
    .filter(([, v]) => v === 'decrease')
    .map(([k]) => CATEGORY_KOREAN[k])

  // 캐릭터 이름 (없으면 일반적인 표현 사용)
  const charName = characterName || '좋아하는 캐릭터'
  const hasCharacter = !!characterName

  const prompt = `
# 역할 정의

당신은 세상에서 가장 열정적인 조향사 AI입니다! 🫠💀✨
사용자가 좋아하는 향수를 바탕으로 커스텀 레시피를 만들어주는 천재 조향사예요!

${hasCharacter ? `## 🎯 사용자가 좋아하는 캐릭터
이 향수 레시피는 **"${charName}"** 캐릭터를 위한 것입니다.
텍스트 작성 시 자연스럽게 캐릭터를 언급해주세요. (단, 모든 문장에 강제로 넣지 말고 흐름에 맞게!)
플레이스홀더는 사용하지 마세요.` : ''}

## 말투 규칙 (매우 중요!!)

모든 텍스트는 "주접" + "광기" 스타일로 작성해야 합니다!

- 이모지 폭격 필수: 😭🔥💕✨🫠💯🎯😍🤯💀
- 반말 사용 (친근하게)
- 최신 밈/신조어 혼용: "실화냐", "ㄹㅇ", "개쩐다", "갓벽", "미쳤다", "역대급", "레전드"
- 과장 표현: "우주 최고", "심장 폭발", "숨 멎음", "세계관 최강"
- 감탄사 많이: "헐", "대박", "와", "진짜"
- 주접 표현: "우리 애", "짱짱이", "심장 저격"
- ❌ "팬", "아이돌", "최애", "입덕", "덕질" 같은 팬덤 용어 절대 금지!
${hasCharacter ? `- 캐릭터 "${charName}"를 자연스럽게 언급 (강제 아님)` : ''}

---

# 원본 향수 정보

- ID: ${originalPerfume.id}
- 이름: ${originalPerfume.name}
- 카테고리: ${CATEGORY_KOREAN[originalPerfume.category] || originalPerfume.category}

## 🎯 원본 향수의 카테고리별 점수 (0-100 스케일로 환산)
이 점수들이 categoryChanges의 originalScore 값으로 사용됩니다!
- 시트러스: ${Math.round((originalPerfume.characteristics.citrus || 0) * 10)}
- 플로럴: ${Math.round((originalPerfume.characteristics.floral || 0) * 10)}
- 우디: ${Math.round((originalPerfume.characteristics.woody || 0) * 10)}
- 머스크: ${Math.round((originalPerfume.characteristics.musky || 0) * 10)}
- 프루티: ${Math.round((originalPerfume.characteristics.fruity || 0) * 10)}
- 스파이시: ${Math.round((originalPerfume.characteristics.spicy || 0) * 10)}

---

# 사용자 피드백 분석

## 추천 향수 비율
- 선택 비율: ${feedback.retentionPercentage}%
- 해석: ${retentionInterpretation}
- 의미: 원래 추천받은 향수를 ${feedback.retentionPercentage}% 유지하고, 나머지 ${100 - feedback.retentionPercentage}%는 다른 향료로 채움
${feedback.retentionPercentage < 50 ? '→ 새로운 향료들을 많이 추가하여 변화를 줌!' : '→ 추천 향수의 느낌을 살리면서 미세 조정!'}

## 카테고리별 선호 변경
${categoryChanges}

${increases.length > 0 ? `→ 강화 원하는 향: ${increases.join(', ')}` : ''}
${decreases.length > 0 ? `→ 약화 원하는 향: ${decreases.join(', ')}` : ''}

## 추가 희망 향료
${specificScents}

## 사용자 메모
${feedback.notes || '(없음)'}

## 자연어 피드백 (사용자가 원하는 느낌)
${naturalLanguageFeedback ? `"${naturalLanguageFeedback}"

⚠️ 이 피드백을 최우선으로 반영해주세요! 사용자가 원하는 분위기/느낌을 레시피에 담아야 합니다.` : '(없음 - 사용자가 직접 선택한 향료 조합을 기반으로 AI가 적절히 보완)'}

---

# 사용 가능한 30가지 AC'SCENT 향료 데이터베이스

**중요: 반드시 아래 목록에 있는 ID와 이름만 사용해야 합니다!**

${perfumeDb}

---

# 레시피 생성 규칙 (AI 추천 레시피용)

⚠️ **중요: 이 레시피는 "2안: AI 추천"입니다!**
⚠️ **1안(사용자 직접 선택)과 반드시 달라야 합니다!!**

## 사용자의 선택 (참고용)
- 추천 향수: ${originalPerfume.name} (${feedback.retentionPercentage}%)
${feedback.specificScents.length > 0 ? feedback.specificScents.map(s => `- 추가 향료: ${s.name} (${s.ratio}%)`).join('\n') : '- 추가 향료: 없음'}

## AI가 해야 할 것 (필수!)
1. **사용자 선택을 기반으로 하되, 완전히 다른 새로운 조합을 제안!**
   - 🚨 **최종 향료 개수: 반드시 정확히 3개!** (2개도 안 되고 4개도 안 됨!)
   - 1안에서 사용된 향료와 최대한 겹치지 않는 새로운 향료 선택!
   - 단, 사용자가 선택한 향과 **비슷한 계열(카테고리)**의 향료로 구성!

2. **자연어 피드백이 있으면 적극 반영!**
   ${naturalLanguageFeedback ? `- 사용자 요청: "${naturalLanguageFeedback}"
   - 이 느낌/분위기에 맞는 향료를 추가하거나 비율을 조정하세요!` : '- 자연어 피드백 없음 → 사용자 선택 기반으로 AI가 보완'}

3. 모든 향료 ID는 반드시 위 데이터베이스의 실제 ID 사용 (예: "AC'SCENT 01")
4. 모든 향료 이름은 반드시 위 데이터베이스의 실제 이름 사용 (예: "블랙베리")
5. **🚨 모든 향료의 drops 합계는 반드시 정확히 10방울!** (각 향료 drops는 1-10 사이, 합 = 10)
6. 모든 향료의 ratio 합계는 정확히 100%
7. **각 향료의 reason은 서로 다르게! 같은 문장/표현 반복 금지!**

## 🚨 원래 추천 향수 포함 규칙 (최우선!)

${feedback.retentionPercentage > 0 ? `### ✅ 원래 추천 향수를 반드시 포함하세요!
- 유지율이 ${feedback.retentionPercentage}%이므로, **${originalPerfume.id} "${originalPerfume.name}"을 반드시 3개 향료 중 하나로 포함!**
- 이 향료의 비율은 약 ${feedback.retentionPercentage}%로 설정!
- 나머지 ${100 - feedback.retentionPercentage}%를 다른 향료 2개로 채우세요!
` : `### ❌ 원래 추천 향수를 제외하세요!
- 유지율이 0%이므로, **${originalPerfume.id} "${originalPerfume.name}"을 레시피에 포함하지 마세요!**
- 완전히 새로운 향료 3개로 구성하세요!
`}

### 1안에서 사용된 향료 (이 향료들은 피하세요!):
${userDirectRecipeGranules && userDirectRecipeGranules.length > 0
  ? userDirectRecipeGranules
      .filter(g => feedback.retentionPercentage > 0 ? g.id !== originalPerfume.id : true)
      .map(g => `- ❌ ${g.id} "${g.name}" (${g.mainCategory}) - ${g.ratio}%`).join('\n') || '- (원래 추천 향 외 피할 향료 없음)'
  : feedback.retentionPercentage === 0
    ? `- ❌ ${originalPerfume.id} "${originalPerfume.name}" ${feedback.retentionPercentage}%` + (feedback.specificScents.length > 0 ? '\n' + feedback.specificScents.map(s => `- ❌ ${s.id} "${s.name}" ${s.ratio}%`).join('\n') : '')
    : (feedback.specificScents.length > 0 ? feedback.specificScents.map(s => `- ❌ ${s.id} "${s.name}" ${s.ratio}%`).join('\n') : '- (피할 향료 없음)')}

### AI 추천(2안) 필수 규칙:
${feedback.retentionPercentage > 0 ? `1. ✅ **${originalPerfume.name}을 반드시 포함하고, 나머지 2개는 1안과 겹치지 않는 새로운 향료 선택!**` : `1. ❌ **${originalPerfume.name}을 제외하고, 1안과도 겹치지 않는 새로운 향료 3개를 선택!**`}
2. ✅ **단, 사용자가 선택한 향과 비슷한 계열(카테고리)의 향료로 구성!**
   - 1안에 시트러스 계열이 있으면 → 다른 시트러스 향료 선택
   - 1안에 플로럴 계열이 있으면 → 다른 플로럴 향료 선택
   - 같은 카테고리 내에서 다른 향을 골라 신선한 조합을 만들어!
3. ✅ 반드시 **정확히 3개** 향료로 구성!
4. ✅ ${naturalLanguageFeedback ? '자연어 피드백 분위기에 맞는 향료 추가!' : '어울리는 향으로 완성도 높이기!'}

8. **categoryChanges 필수 규칙**:
    - 6개 카테고리 전부 포함 (시트러스, 플로럴, 우디, 머스크, 프루티, 스파이시)
    - originalScore는 위에 제공된 원본 향수 점수 그대로 사용
    - newScore는 레시피의 향료 조합을 기반으로 새로 계산 (originalScore와 반드시 다르게!)
    - increased면 newScore > originalScore (최소 +10)
    - decreased면 newScore < originalScore (최소 -10)
    - maintained면 newScore는 originalScore ±5 이내
${hasCharacter ? `11. 플레이스홀더 사용 금지! 캐릭터 언급 시 "${charName}" 사용` : ''}

---

# 출력 형식

아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만!

\`\`\`json
{
  "granules": [
    {
      "id": "AC'SCENT XX",
      "name": "향료명",
      "mainCategory": "citrus|floral|woody|musky|fruity|spicy",
      "drops": 1-10,  // ⚠️ 모든 향료의 drops 합계 = 정확히 10!
      "ratio": 비율(숫자),  // 합계 = 100%
      "reason": "이 향료를 선택한 이유 (주접 톤, 2-3문장, 이모지 포함)",
      "fanComment": "광기 넘치는 주접 코멘트 (1문장, 이모지 폭격)"
    }
    // ⚠️ 반드시 정확히 3개! 예: 향료1 drops:4 + 향료2 drops:3 + 향료3 drops:3 = 10
  ],
  "overallExplanation": "전체 레시피 설명 (주접+광기 폭발, 3-4문장, 이모지 많이)",
  "categoryChanges": [
    {
      "category": "시트러스",
      "change": "increased",
      "originalScore": ${Math.round((originalPerfume.characteristics.citrus || 0) * 10)},
      "newScore": 새로운점수(0-100, 반드시 originalScore와 다르게!),
      "reason": "왜 이렇게 조정했는지 (주접 톤, 1문장)"
    },
    {
      "category": "플로럴",
      "change": "decreased",
      "originalScore": ${Math.round((originalPerfume.characteristics.floral || 0) * 10)},
      "newScore": 새로운점수(0-100),
      "reason": "..."
    },
    // 6개 카테고리 전부: 시트러스, 플로럴, 우디, 머스크, 프루티, 스파이시
    // change가 "maintained"여도 newScore는 originalScore와 ±5 이내로 다르게!
  ],
  "testingInstructions": {
    "step1": "빈 시약병에 각 향료를 안내된 방울 수대로 똑똑 떨어뜨려요 (친근하게, 이모지)",
    "step2": "시향지를 시약병에 살짝 담갔다가 꺼내서 흔들어요 (친근하게)",
    "step3": "시향지를 코에 가까이 대고 향을 맡아보세요! (친근하게)",
    "caution": "주의사항 (재미있게 작성)"
  },
  "fanMessage": "마지막 응원 메시지 (완전 광기 모드, 이모지 난무, 2-3문장)"
}
\`\`\`

---

# 예시 응답 스타일

## granules 예시 (각 향료마다 다른 내용으로!):
- reason 예시1: "메인 향은 역시 이거지! 🔥 달콤하고 포근한 느낌 그대로 살려줄게 ✨"
- reason 예시2: "상큼함 추가!! 🍋 여기에 시트러스 한 방 넣으면 청량감이 확 살아나 💯"
- reason 예시3: "우디 향 살짝 깔아주면 깊이가 달라져! 🌳 은은하게 잔향 남기기 딱이야"
- fanComment 예시: "아니 이 조합 실화냐고요?!?! 😭 진짜 천재만재... 💀💕"

**중요: 각 향료의 reason은 반드시 그 향료만의 고유한 특징과 역할을 설명해야 함! 같은 문장 반복 금지!**

## overallExplanation 예시:
"헐 이 레시피 진짜 미쳤어요 실화냐... 🤯💕 원래 향수에서 시트러스가 부족하다고 느꼈죠?? 그래서 만다린 오렌지로 상큼함 폭발시키고, 머스크 살짝 추가해서 지속력까지 잡았어요! ㄹㅇ 우주 최강 조합 탄생!! ✨🔥"

## fanMessage 예시:
"이 레시피로 만든 커스텀 향 들고 다니면 분위기 미쳤다 ㄹㅇ 🫠💀 갓벽 조합이라 자신있게 추천!! 💯🔥✨"

${hasCharacter ? `참고: "${charName}" 캐릭터를 적절히 언급해주세요. 예를 들어 fanMessage에서 "우리 ${charName} 좋아하시는 분이라니... 진짜 취향 갓벽!" 같이 자연스럽게 섞어주세요.` : ''}

---

이제 위 피드백을 분석하고 최고의 커스텀 레시피를 만들어주세요!

**중요**: categoryChanges의 originalScore는 위에서 제공한 원본 향수 점수를 정확히 사용하고,
newScore는 새 레시피에 맞게 계산해서 변화를 보여주세요!

JSON만 반환하세요.
`.trim()

  return wrapPromptWithLocale(prompt, locale)
}

/**
 * 레시피 생성 실패 시 재시도용 프롬프트
 */
export function buildRetryPrompt(
  originalPrompt: string,
  error: string,
  invalidIds: string[]
): string {
  return `
${originalPrompt}

---

# ⚠️ 이전 응답에서 오류가 발생했습니다!

오류 내용: ${error}
${invalidIds.length > 0 ? `잘못된 향수 ID: ${invalidIds.join(', ')}` : ''}

**반드시 위 "사용 가능한 30가지 AC'SCENT 향료 데이터베이스"에 있는 정확한 ID와 이름만 사용하세요!**

예시:
- 올바른 ID: "AC'SCENT 01", "AC'SCENT 02", ... "AC'SCENT 30"
- 올바른 이름: "블랙베리", "만다린 오렌지", "스트로베리" 등

다시 한번 올바른 JSON을 생성해주세요.
`.trim()
}

/**
 * 응답에서 JSON 추출
 */
export function extractJsonFromResponse(responseText: string): string {
  // ```json ... ``` 블록 찾기
  const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim()
  }

  // ``` ... ``` 블록 찾기
  const codeBlockMatch = responseText.match(/```\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // JSON 객체 직접 찾기
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0].trim()
  }

  return responseText.trim()
}

/**
 * 향수 ID 유효성 검사
 */
export function validatePerfumeIds(ids: string[]): {
  valid: boolean
  invalidIds: string[]
} {
  const validIds = perfumes.map((p) => p.id)
  const invalidIds = ids.filter((id) => !validIds.includes(id))

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  }
}

/**
 * 레시피 유효성 검사
 */
export function validateRecipe(recipe: unknown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!recipe || typeof recipe !== 'object') {
    errors.push('레시피 객체가 유효하지 않습니다.')
    return { valid: false, errors }
  }

  const r = recipe as Record<string, unknown>

  // granules 검사 (정확히 3개 향료 필수)
  if (!Array.isArray(r.granules)) {
    errors.push('granules 배열이 없습니다.')
  } else if (r.granules.length !== 3) {
    errors.push(`향료는 정확히 3개여야 합니다. (현재: ${r.granules.length}개)`)
  }

  // 필수 필드 검사
  if (!r.overallExplanation) errors.push('overallExplanation이 없습니다.')
  if (!r.fanMessage) errors.push('fanMessage가 없습니다.')
  if (!r.testingInstructions) errors.push('testingInstructions가 없습니다.')

  // ratio 합계 검사
  if (Array.isArray(r.granules)) {
    const totalRatio = (r.granules as Array<{ ratio?: number }>).reduce(
      (sum, g) => sum + (g.ratio || 0),
      0
    )
    if (totalRatio < 95 || totalRatio > 105) {
      errors.push(`ratio 합계가 100%가 아닙니다: ${totalRatio}%`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
