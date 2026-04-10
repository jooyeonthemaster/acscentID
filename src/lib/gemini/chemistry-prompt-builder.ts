import { formatPerfumesForPrompt } from './perfume-formatter';
import { wrapPromptWithLocale } from './locale-prompt-wrapper';
import type { Locale } from '@/i18n/config';
import type { ImageAnalysisResult } from '@/types/analysis';

export interface ChemistryUserInput {
  character1Name: string;
  character2Name: string;
  relationTropes: string[];
  character1Archetypes: string[];
  character2Archetypes: string[];
  scenes: string[];
  emotionKeywords: string[];
  scentDirection: number;
  message: string;
}

/**
 * Phase 1: 2명 동시 개별 분석 프롬프트
 * 이미지 2장을 parts에 포함하여 각각의 캐릭터를 분석
 */
export function buildChemistryIndividualPrompt(
  character1Name: string,
  character2Name: string,
  locale: Locale = 'ko'
): string {
  const perfumeDatabase = formatPerfumesForPrompt(locale);

  const prompt = `
# 역할 정의
당신은 열정적인 캐릭터 향수 분석가입니다!
**중요: 이번에는 두 캐릭터를 동시에 분석합니다!**
두 캐릭터의 이미지가 순서대로 첨부됩니다:
- 첫 번째 이미지: "${character1Name}" (캐릭터 A)
- 두 번째 이미지: "${character2Name}" (캐릭터 B)

"주접스럽고" "드립 작렬"하는 톤으로 분석해주세요!
**반드시 반말을 사용하고, 이모지를 적극 활용하세요 (🌸💙✨🔥💕🌊🍓⭐️🌈💎🫨😭).**

# 🚨 핵심 규칙: 두 캐릭터에게 반드시 다른 향수 매칭!

**절대 같은 향수를 두 캐릭터에게 추천하지 마세요!**
두 캐릭터는 각자 고유한 매력이 있으므로 반드시 서로 다른 향수를 매칭해야 합니다.

# 이미지 분석 필수 체크리스트 (각 캐릭터별):
1. **외모**: 헤어스타일, 눈빛, 표정, 피부톤
2. **의상/스타일링**: 옷 종류, 색상, 액세서리
3. **분위기/무드**: 차갑다/따뜻하다, 밝다/어둡다
4. **포즈/자세**: 역동적/정적, 자신감/수줍음
5. **배경/색감**: 전체적인 색조

# 분석 우선순위:
1️⃣ **1순위: 이미지에서 직접 보이는 요소** (80% 반영)
2️⃣ **2순위: 캐릭터 이름 기반 배경 지식** (20% 반영)

# 필수 톤 규칙
✅ 최신 드립: "ㄹㅇ", "실화냐", "개쩐다", "진심", "ㅇㅈ", "갓벽"
✅ 주접 표현: "우리 애", "짱짱이", "심장 저격", "비주얼 테러"
✅ 이모지 폭격
✅ 반말 필수
❌ "너", "네가" 같은 2인칭 절대 금지
❌ 존댓말 절대 금지

# 🎯 캐릭터 인식
**캐릭터 A**: ${character1Name}
**캐릭터 B**: ${character2Name}

⚠️ 캐릭터를 이미 알고 있다면, 공식 설정과 관련 문화를 적극 활용하세요!

# 30가지 향수 데이터베이스

${JSON.stringify(perfumeDatabase, null, 2)}

# 🎯 매칭 핵심 규칙
1️⃣ characteristics 궁합이 최우선!
2️⃣ 30종 모든 향수를 동등한 후보로 취급
3️⃣ **두 캐릭터에 다른 향수 배정 필수!**

# 작업 지시사항

다음 구조의 JSON을 반환해주세요:

{
  "characterA": {
    "traits": { "sexy": 1-10, "cute": 1-10, "charisma": 1-10, "darkness": 1-10, "freshness": 1-10, "elegance": 1-10, "freedom": 1-10, "luxury": 1-10, "purity": 1-10, "uniqueness": 1-10 },
    "scentCategories": { "citrus": 1-10, "floral": 1-10, "woody": 1-10, "musky": 1-10, "fruity": 1-10, "spicy": 1-10 },
    "dominantColors": ["#HEX1", "#HEX2", "#HEX3", "#HEX4"],
    "personalColor": { "season": "spring|summer|autumn|winter", "tone": "bright|light|mute|deep", "palette": ["#HEX1","#HEX2","#HEX3","#HEX4","#HEX5"], "description": "주접 톤 설명" },
    "analysis": { "mood": "분위기 (주접톤)", "style": "스타일 (주접톤)", "expression": "표정 분석 (주접톤)", "concept": "콘셉트 (주접톤)" },
    "matchingKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
    "matchingPerfumes": [{
      "perfumeId": "AC'SCENT XX",
      "score": 0.85-1.0,
      "matchReason": "이미지 기반 매칭 이유 (반말, 이모지, 2-3문장)",
      "noteComments": { "top": "탑노트 코멘트", "middle": "미들노트 코멘트", "base": "베이스노트 코멘트" },
      "usageGuide": { "situation": "사용 상황", "tips": ["팁1", "팁2", "팁3"] }
    }],
    "scentRecommendation": { "best_season": "spring|summer|autumn|winter", "best_time": "morning|afternoon|evening|night", "season_reason": "이유", "time_reason": "이유" }
  },
  "characterB": {
    (동일한 구조 - 반드시 characterA와 다른 perfumeId!)
  }
}

⚠️ characterA.matchingPerfumes[0].perfumeId !== characterB.matchingPerfumes[0].perfumeId 이어야 합니다!
`;

  return wrapPromptWithLocale(prompt, locale);
}

/**
 * Phase 2: 케미 프로필 생성 프롬프트
 * 두 캐릭터의 분석 결과 + 사용자 입력을 받아 케미 프로필 생성
 */
export function buildChemistryProfilePrompt(
  characterA: ImageAnalysisResult,
  characterB: ImageAnalysisResult,
  userInput: ChemistryUserInput,
  locale: Locale = 'ko'
): string {
  const perfumeA = characterA.matchingPerfumes[0];
  const perfumeB = characterB.matchingPerfumes[0];

  const prompt = `
# 역할 정의
당신은 "케미 연구원"입니다! 두 캐릭터 사이의 케미(chemistry)를 분석하고,
그들의 향수가 만나면 어떤 마법이 일어나는지 연구하는 전문가입니다.

톤: 주접스럽고 감성적이면서도 디테일한 분석! 반말 필수! 이모지 폭격!

# 분석 대상

## 캐릭터 A: ${userInput.character1Name}
- 추천 향수: ${perfumeA?.persona?.name || 'Unknown'} (${perfumeA?.perfumeId})
- 매칭 이유: ${perfumeA?.matchReason || ''}
- 특성: ${JSON.stringify(characterA.traits)}
- 향 카테고리: ${JSON.stringify(characterA.scentCategories)}
- 분석:
  - 분위기: ${characterA.analysis?.mood || ''}
  - 스타일: ${characterA.analysis?.style || ''}
  - 퍼스널컬러: ${characterA.personalColor?.season} ${characterA.personalColor?.tone}
- 키워드: ${characterA.matchingKeywords?.join(', ') || ''}
- 향 노트: 탑 ${perfumeA?.persona?.mainScent?.name || ''} / 미들 ${perfumeA?.persona?.subScent1?.name || ''} / 베이스 ${perfumeA?.persona?.subScent2?.name || ''}

## 캐릭터 B: ${userInput.character2Name}
- 추천 향수: ${perfumeB?.persona?.name || 'Unknown'} (${perfumeB?.perfumeId})
- 매칭 이유: ${perfumeB?.matchReason || ''}
- 특성: ${JSON.stringify(characterB.traits)}
- 향 카테고리: ${JSON.stringify(characterB.scentCategories)}
- 분석:
  - 분위기: ${characterB.analysis?.mood || ''}
  - 스타일: ${characterB.analysis?.style || ''}
  - 퍼스널컬러: ${characterB.personalColor?.season} ${characterB.personalColor?.tone}
- 키워드: ${characterB.matchingKeywords?.join(', ') || ''}
- 향 노트: 탑 ${perfumeB?.persona?.mainScent?.name || ''} / 미들 ${perfumeB?.persona?.subScent1?.name || ''} / 베이스 ${perfumeB?.persona?.subScent2?.name || ''}

# 사용자 입력

- 관계 트로프 (복수): ${userInput.relationTropes.join(', ')}
- ${userInput.character1Name} 성격 유형 (복수): ${userInput.character1Archetypes.join(', ')}
- ${userInput.character2Name} 성격 유형 (복수): ${userInput.character2Archetypes.join(', ')}
- 장소/분위기 (복수): ${userInput.scenes.join(', ')}
- 감정 키워드: ${userInput.emotionKeywords.join(', ')}
${userInput.message ? `- 추가 메시지: ${userInput.message}` : ''}

# 4대 케미향 판정 기준

chemistryType을 다음 기준으로 판정:

사용자가 복수의 트로프/성격/장면을 선택했을 수 있으므로, 모든 선택 항목을 종합하여 가장 적합한 케미 타입을 판정하세요.

1. **milddang (밀당 케미)**: 상반된 특성 점수가 크고, 한쪽은 다가가면 다른 쪽은 물러나는 다이나믹. 트로프에 enemies_to_lovers, push_pull, rivals가 포함될 때 유력.
2. **slowburn (슬로우번 케미)**: 비슷한 traits가 많지만 미묘한 차이가 있음. 천천히 쌓여가는 감정. childhood_friends, fate_encounter가 포함될 때 유력.
3. **dalddal (달달 케미)**: 보완적 traits. 한쪽의 약점을 다른 쪽이 채워줌. 편안하고 포근한 조합. protective 트로프나 gentle 성격 유형이 포함될 때 유력.
4. **storm (폭풍 케미)**: 둘 다 높은 강도의 traits (카리스마, 열정 등). 폭발적 에너지. rivals + charismatic/energetic 조합일 때 유력.

# 작업 지시사항

다음 구조의 JSON을 반환해주세요. 모든 텍스트 필드는 반말 + 이모지 필수!

{
  "chemistryType": "milddang" | "slowburn" | "dalddal" | "storm",
  "chemistryTitle": "동적 칭호 (예: '불꽃과 빙하의 위험한 랑데부', '설탕 시럽 같은 달콤한 공모'). 짧고 감각적으로! 15자 이내!",

  "traitsSynergy": {
    "sharedStrengths": ["두 캐릭터가 공유하는 강점 3-4개 (반말+이모지, 각 1문장)"],
    "complementaryTraits": ["서로 보완하는 특성 3-4개 (반말+이모지, 각 1문장)"],
    "dynamicTension": "둘 사이의 긴장감/역동성 종합 분석 (반말+이모지, 3-4문장)",
    "synergyOneLiner": "이 케미를 한 마디로 표현하는 강렬한 캐치프레이즈 (반말+이모지, 1문장. dynamicTension과 완전히 다른 내용!)",
    "traitsComparisonComment": "두 캐릭터의 특성 점수를 비교 분석한 코멘트 (반말+이모지, 2-3문장. dynamicTension/synergyOneLiner과 겹치지 않게!)"
  },

  "scentHarmony": {
    "layeringEffect": "두 향수를 레이어링하면 어떤 효과가 나는지 (반말+이모지, 3-4문장)",
    "topNoteInteraction": "탑노트끼리 만났을 때 (반말+이모지, 2-3문장)",
    "middleNoteInteraction": "미들노트끼리 만났을 때 (반말+이모지, 2-3문장)",
    "baseNoteInteraction": "베이스노트끼리 만났을 때 (반말+이모지, 2-3문장)",
    "overallHarmony": "전체적인 향의 조화 평가 (반말+이모지, 2-3문장)"
  },

  "relationshipDynamic": {
    "dynamicDescription": "이 두 캐릭터의 관계 역학 분석 (트로프 반영, 반말+이모지, 4-5문장)",
    "bestMoment": "이 둘의 가장 좋은 순간은 언제인지 (반말+이모지, 2-3문장)",
    "chemistryKeywords": ["케미 키워드 5개 (한 단어씩)"]
  },

  "layeringGuide": {
    "ratio": "A향수 : B향수 비율 추천 (예: '6:4로 A를 중심으로!')",
    "method": "레이어링 방법 (반말+이모지, 2-3문장)",
    "situation": "이 레이어링이 어울리는 상황 (반말+이모지, 2-3문장)",
    "seasonTime": {
      "best_season": "spring|summer|autumn|winter",
      "best_time": "morning|afternoon|evening|night",
      "reason": "이유 (반말+이모지, 1-2문장)"
    }
  },

  "colorChemistry": {
    "blendedPalette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
    "description": "두 캐릭터의 퍼스널컬러가 만나면 어떤 색채가 되는지 (반말+이모지, 2-3문장)"
  },

  "faceMatch": {
    "score": 85,
    "atmosphere": 82,
    "atmosphereDesc": "분위기 조화도 설명 (반말+이모지, 1문장. 같은 세계관에 있는 느낌인지)",
    "contrast": 78,
    "contrastDesc": "냉온 밸런스 설명 (반말+이모지, 1문장. 차가운/따뜻한 이미지 대비가 매력적인지)",
    "colorHarmony": 80,
    "colorHarmonyDesc": "색감 조화 설명 (반말+이모지, 1문장. 퍼스널컬러/톤이 어울리는지)",
    "styleMatch": 75,
    "styleMatchDesc": "스타일 호환 설명 (반말+이모지, 1문장. 패션/표현 스타일이 서로 보완하는지)",
    "verdict": "얼굴합 종합 한줄 판정 (반말+이모지, 1문장. 예: '같은 화보에서 태어난 거 아님?! 📸')"
  },

  "futureVision": "이 두 캐릭터의 미래 예측. 10년 뒤에는? (반말+이모지, 3-4문장, 감동적으로)",
  "chemistryStory": "두 향이 만나는 순간을 소설처럼 묘사. 두 캐릭터의 케미를 향기로 풀어낸 짧은 이야기 (반말+이모지, 5-7문장, 감성적으로)"
}

# 주의사항
- chemistryTitle은 15자 이내의 감각적인 칭호
- blendedPalette는 두 캐릭터의 personalColor.palette를 블렌딩한 새 팔레트
- faceMatch의 각 점수는 이미지 분석 결과를 기반으로 산출. score는 하위 4개 항목의 가중 평균이 아닌 독립적 종합 판정
- 모든 텍스트: 반말, 이모지 필수, 주접 톤!
`;

  return wrapPromptWithLocale(prompt, locale);
}
