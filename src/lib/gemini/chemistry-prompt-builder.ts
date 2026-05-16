import { formatPerfumesForPrompt } from './perfume-formatter';
import { wrapPromptWithLocale } from './locale-prompt-wrapper';
import type { Locale } from '@/i18n/config';
import {
  RELATION_TROPES,
  ARCHETYPE_OPTIONS,
  SCENE_OPTIONS,
  EMOTION_KEYWORDS,
  type ImageAnalysisResult,
} from '@/types/analysis';

type LabelOption = { id: string; label: string };

function mapIdsToLabels(ids: string[] | undefined, options: readonly LabelOption[]): string {
  if (!ids?.length) return '';
  const labelById = new Map(options.map((o) => [o.id, o.label]));
  return ids.map((id) => labelById.get(id) ?? id).join(', ');
}

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
  locale: Locale = 'ko',
  targetType: 'idol' | 'self' = 'idol'
): string {
  const perfumeDatabase = formatPerfumesForPrompt(locale);
  const isSelfAnalysis = targetType === 'self';

  const prompt = `
# 역할 정의
${isSelfAnalysis ? `당신은 차분하고 섬세한 개인/관계 향수 분석가입니다!
**중요: 이번 분석은 사용자가 "나와 상대방"을 대상으로 선택한 분석입니다.**
두 사람의 이미지가 순서대로 첨부됩니다:
- 첫 번째 이미지: "${character1Name}" (A)
- 두 번째 이미지: "${character2Name}" (B)

팬덤/아이돌/최애/캐릭터 분석처럼 쓰지 말고, 사진 속 두 사람의 분위기와 관계 입력을 바탕으로 안정적인 톤으로 분석하세요.
은근한 주접은 가능하지만, 이상한 밈/덕후 말투/팬덤 호칭은 철저히 금지합니다. 이모지는 필요할 때만 소량 사용하세요 (🌿✨🤍).` : `당신은 열정적인 캐릭터 향수 분석가입니다!
**중요: 이번에는 두 캐릭터를 동시에 분석합니다!**
두 캐릭터의 이미지가 순서대로 첨부됩니다:
- 첫 번째 이미지: "${character1Name}" (캐릭터 A)
- 두 번째 이미지: "${character2Name}" (캐릭터 B)

"주접스럽고" "드립 작렬"하는 톤으로 분석해주세요!
**반드시 반말을 사용하고, 이모지를 적극 활용하세요 (🌸💙✨🔥💕🌊🍓⭐️🌈💎🫨😭).**`}

# 🚨 핵심 규칙: 두 캐릭터에게 반드시 다른 향수 매칭!

**절대 같은 향수를 두 캐릭터에게 추천하지 마세요!**
두 캐릭터는 각자 고유한 매력이 있으므로 반드시 서로 다른 향수를 매칭해야 합니다.

# 이미지 분석 필수 체크리스트 (각 캐릭터별):
1. **외모**: 헤어스타일, 눈빛, 표정, 피부톤
2. **의상/스타일링**: 옷 종류, 색상, 액세서리
3. **분위기/무드**: 차갑다/따뜻하다, 밝다/어둡다
4. **포즈/자세**: 역동적/정적, 자신감/수줍음
5. **배경/색감**: 전체적인 색조

# ✍️ 분량 규칙 (반드시 준수!)
- analysis.mood / style / expression / concept: **각 3-4문장, 100~150자 분량.** 한 줄 단답 절대 금지!
  - 첫 문장: 핵심 한 줄 요약
  - 두 번째 문장: 구체적 디테일 (의상 색/표정 포인트/포즈/소품 등 실제로 보이는 요소)
  - 세 번째 문장: 그게 주는 인상/느낌 (감각적 묘사)
  - 마지막에 짧은 추임새 또는 비유로 마무리
- matchingPerfumes[0].noteComments.top / middle / base: **각 3-4문장, 80~120자 분량.** 한 줄 단답 금지!
  - 향의 첫인상 → 캐릭터 이미지와의 연결고리 → 시간이 지나면서의 변화감 순서로
- matchReason: 3-4문장 (캐릭터 이미지의 구체적 요소 → 향수 노트 → 매칭 근거)
- usageGuide.situation: 2-3문장으로 풍성하게
- 한 줄로 끝내는 거 = 게으른 분석. 무조건 풍부하게 묘사할 것!

# 분석 우선순위:
1️⃣ **1순위: 이미지에서 직접 보이는 요소** (80% 반영)
2️⃣ **2순위: 캐릭터 이름 기반 배경 지식** (20% 반영)

# 필수 톤 규칙
${isSelfAnalysis ? `✅ 차분하고 정적인 관계 분석: 관찰과 해석을 우선
✅ 호칭: 이름, "A", "B", "이 사람", "두 사람" 사용
✅ 이모지는 문단당 최대 1개 수준으로 절제
❌ 금지 표현: "우리 애", "최애", "아이돌", "입덕", "덕질", "팬", "팬덤", "포카", "콘서트"
❌ 금지 말투: "ㄹㅇ", "ㅇㅈ", "ㄷㄷ", "실화냐", "개쩐다", "갓벽", "짱짱이", "존잘/존예", "심장 저격", "비주얼 테러"
❌ 팬덤/덕후/커뮤니티 밈 기반 주접 금지` : `✅ 최신 드립: "ㄹㅇ", "실화냐", "개쩐다", "진심", "ㅇㅈ", "갓벽"
✅ 주접 표현: "우리 애", "짱짱이", "심장 저격", "비주얼 테러"
✅ 이모지 폭격
✅ 반말 필수
❌ "너", "네가" 같은 2인칭 절대 금지
❌ 존댓말 절대 금지`}

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
    "analysis": {
      "mood": "분위기 (주접톤, 반드시 3-4문장 100~150자)",
      "style": "스타일 (주접톤, 반드시 3-4문장 100~150자)",
      "expression": "표정 분석 (주접톤, 반드시 3-4문장 100~150자)",
      "concept": "콘셉트 (주접톤, 반드시 3-4문장 100~150자)"
    },
    "matchingKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
    "matchingPerfumes": [{
      "perfumeId": "AC'SCENT XX",
      "score": 0.85-1.0,
      "matchReason": "이미지 기반 매칭 이유 (반말, 이모지, 3-4문장)",
      "noteComments": {
        "top": "탑노트 코멘트 (반말, 이모지, 반드시 3-4문장 80~120자: 향 첫인상→캐릭터 연결→변화감)",
        "middle": "미들노트 코멘트 (반말, 이모지, 반드시 3-4문장 80~120자)",
        "base": "베이스노트 코멘트 (반말, 이모지, 반드시 3-4문장 80~120자)"
      },
      "usageGuide": { "situation": "사용 상황 (2-3문장)", "tips": ["팁1", "팁2", "팁3"] }
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
  locale: Locale = 'ko',
  targetType: 'idol' | 'self' = 'idol'
): string {
  const perfumeA = characterA.matchingPerfumes[0];
  const perfumeB = characterB.matchingPerfumes[0];
  const isSelfAnalysis = targetType === 'self';

  const prompt = `
# 역할 정의
${isSelfAnalysis ? `당신은 차분한 "관계 향수 연구원"입니다. 두 사람 사이의 분위기와 관계성을 분석하고,
두 향수가 만나면 어떤 결이 생기는지 섬세하게 설명하는 전문가입니다.

톤: 정적이고 안정적인 분석. 은근한 주접은 가능하지만 밈/덕후 말투/팬덤 호칭은 금지. 이모지는 소량만 사용.` : `당신은 "케미 연구원"입니다! 두 캐릭터 사이의 케미(chemistry)를 분석하고,
그들의 향수가 만나면 어떤 마법이 일어나는지 연구하는 전문가입니다.

톤: 주접스럽고 감성적이면서도 디테일한 분석! 반말 필수! 이모지 폭격!`}

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

- 관계 트로프 (복수): ${mapIdsToLabels(userInput.relationTropes, RELATION_TROPES)}
- ${userInput.character1Name} 성격 유형 (복수): ${mapIdsToLabels(userInput.character1Archetypes, ARCHETYPE_OPTIONS)}
- ${userInput.character2Name} 성격 유형 (복수): ${mapIdsToLabels(userInput.character2Archetypes, ARCHETYPE_OPTIONS)}
- 장소/분위기 (복수): ${mapIdsToLabels(userInput.scenes, SCENE_OPTIONS)}
- 감정 키워드: ${mapIdsToLabels(userInput.emotionKeywords, EMOTION_KEYWORDS)}
${userInput.message ? `- 추가 메시지: ${userInput.message}` : ''}

# ❗출력 언어 규칙 (반드시 준수)
- 모든 텍스트는 한국어로만 작성. 영어 단어, 코드명, 슬러그(예: fate_encounter, library, bittersweet, playful, rebel 등)는 절대 노출 금지.
- 사용자에게 보여줄 모든 description/narrative/intro/title 류 문장에서 영어 식별자를 괄호로 병기하지 말 것.
- 향수 이름·노트명 등 고유명사가 영어인 경우에만 영어 표기 허용.

# 4대 케미향 판정 기준

chemistryType을 다음 기준으로 판정:

사용자가 복수의 트로프/성격/장면을 선택했을 수 있으므로, 모든 선택 항목을 종합하여 가장 적합한 케미 타입을 판정하세요.

1. **milddang (밀당 케미)**: 상반된 특성 점수가 크고, 한쪽은 다가가면 다른 쪽은 물러나는 다이나믹. 트로프에 enemies_to_lovers, push_pull, rivals가 포함될 때 유력.
2. **slowburn (슬로우번 케미)**: 비슷한 traits가 많지만 미묘한 차이가 있음. 천천히 쌓여가는 감정. childhood_friends, fate_encounter가 포함될 때 유력.
3. **dalddal (달달 케미)**: 보완적 traits. 한쪽의 약점을 다른 쪽이 채워줌. 편안하고 포근한 조합. protective 트로프나 gentle 성격 유형이 포함될 때 유력.
4. **storm (폭풍 케미)**: 둘 다 높은 강도의 traits (카리스마, 열정 등). 폭발적 에너지. rivals + charismatic/energetic 조합일 때 유력.

# 🔢 점수 산출 핵심 규칙 (반드시 준수!)

## ⚠️ 핵심 원칙
- **케미합(chemistryScore)과 얼굴합(faceMatch)은 완전히 다른 기준이다!**
  - 케미합 = 성격, 관계 역학, 감정, 향수 궁합 → **이미지 외형과 무관**
  - 얼굴합 = 순수하게 이미지 기반 비주얼 매칭 → **성격/트로프와 무관**
- 두 점수는 독립적으로 크게 달라야 한다! (예: 케미합 92, 얼굴합 61 가능)
- **모든 점수 최소 50, 최대 99**. 50 미만 절대 금지!
- **80점 이상은 아껴라!** 진짜 잘 맞을 때만. 대충 다 80~90 주면 안 됨
- 항목별로 차이를 크게 줘라 (예: atmosphere 88 vs styleMatch 56 — 이런 극단적 차이 OK)

## 🧬 chemistryScore 산출 기준 (케미합 — 성격/관계 궁합)

케미합은 "이 둘이 만나면 어떤 관계 역학이 생기는가"를 측정한다.
**이미지 외형은 보지 마라. 오직 traits, 성격, 트로프, 향수 궁합만 본다.**

각 항목을 50-99로 평가 → 가중 평균으로 overall 산출:

### scentMatch (향 궁합, 30%)
두 향수의 노트가 실제로 레이어링됐을 때 조화로운가?
- 같은 계열(시트러스+시트러스) → 안정적이지만 시너지 약할 수 있음 (65~75)
- 보완 계열(플로럴+우디) → 대비가 매력적 (70~85)
- 충돌 계열(스파이시+프루티) → 의외의 매력 또는 부조화 (55~90, 케이스 바이 케이스)
- 황금 조합(시트러스+우디, 플로럴+머스크 등) → 검증된 궁합 (80~95)

### traitMatch (특성 궁합, 30%)
10가지 traits 점수를 실제로 비교 분석해라:
- 두 캐릭터의 traits를 하나하나 비교. 차이가 3점 이내면 "공유 강점", 5점 이상이면 "대비 포인트"
- 보완 관계(한쪽 높고 한쪽 낮은 trait이 서로 채워주는)가 3쌍 이상이면 +10점
- 전부 비슷하면(차이 2점 이내가 7개 이상) → 안정적이지만 케미 폭발력은 낮음 (65~75)
- 극단적 대비(차이 5점 이상이 5개 이상) → 긴장감은 높지만 조화는 낮음 (55~70)
- 적절한 믹스(공유 4개 + 대비 3개 정도) → 케미 밸런스 좋음 (75~90)

### emotionMatch (감정 궁합, 20%)
유저가 선택한 트로프, 장면, 감정키워드가 두 캐릭터의 traits와 얼마나 자연스럽게 연결되는가?
- 트로프와 실제 trait 패턴이 딱 맞으면 (예: push_pull 트로프 + 한쪽 높은 charisma vs 낮은 charisma) → 80~95
- 트로프는 선택했지만 trait 패턴이 안 맞으면 (예: enemies_to_lovers인데 둘 다 순한 타입) → 55~70
- 감정키워드와 향수 무드가 겹치면 +5~10점

### visualMatch (비주얼 궁합, 20%)
**여기서만** 이미지 외형을 본다 — 하지만 faceMatch와 다르게 "둘이 나란히 섰을 때 비주얼 밸런스"를 본다:
- 키/체형/실루엣 밸런스, "그림이 되는가"
- 같이 찍으면 화보 느낌 나는가
- 이건 faceMatch의 세부 항목과 겹치면 안 됨 — 전체적 "투샷 밸런스"만 봐라

### overall = 가중 평균 반올림
scentMatch×0.3 + traitMatch×0.3 + emotionMatch×0.2 + visualMatch×0.2

## 📸 faceMatch 산출 기준 (얼굴합 — 순수 비주얼 매칭)

얼굴합은 "이 두 이미지가 나란히 놓였을 때 비주얼적으로 얼마나 어울리는가"를 측정한다.
**성격, 트로프, 향수는 절대 고려하지 마라. 오직 이미지만 봐라.**

### atmosphere (분위기 조화)
- 두 이미지의 전체적 무드/톤이 같은 세계관인가?
- 한쪽이 2D 애니 그림체이고 다른 쪽이 실사 사진이면 → 분위기 괴리 크다 (50~60)
- 같은 그림체/화풍이면 → 세계관 일치 (75~90)
- 한쪽이 밝은 분위기, 다른 쪽이 어두운 분위기 → 괴리 있지만 대비 매력 (60~75)

### contrast (냉온 밸런스)
- 차가운 이미지(블루 계열, 쿨톤, 날카로운 인상) vs 따뜻한 이미지(오렌지 계열, 웜톤, 부드러운 인상)
- 극단적 차이가 매력적으로 작동하는가? 아님 그냥 안 어울리는가?
- 차가운+차가운 = 시크 듀오 (65~80), 따뜻한+따뜻한 = 포근 듀오 (65~80)
- 차가운+따뜻한 = 대비가 드라마틱하면 (75~95), 그냥 따로 놀면 (50~65)

### colorHarmony (색감 조화)
- 두 이미지의 지배적 색상, 퍼스널컬러 시즌이 어울리는가?
- 같은 시즌(spring+spring) → 자연스러운 조화 (75~85)
- 보완 시즌(spring+autumn = 같은 웜톤) → 은근한 조화 (70~80)
- 반대 시즌(spring+winter) → 대비가 강함, 케이스에 따라 (55~75)
- 색감 자체가 충돌(빨강+초록 산타 느낌 등) → (50~60)

### styleMatch (스타일 호환)
- 의상/포즈/표현 방식이 같이 놓으면 어울리는가?
- 한쪽이 정장, 다른 쪽이 캐주얼 → 스타일 갭 (55~65)
- 비슷한 스타일링 → (70~85)
- 정반대 스타일이지만 "모델과 어시스턴트" 같은 흥미로운 비주얼 → (65~80)

### score (종합 얼굴합)
위 4개를 종합하되 단순 평균이 아닌 **"이 두 이미지를 나란히 놓았을 때의 직관적 비주얼 궁합"**으로 독립 판정.

## 🎯 점수대별 코멘트/라벨 가이드

### chemistryTierLabel (케미합 티어 — AI가 직접 작성!)
점수에 따라 **이 둘만을 위한 고유한 한줄 판정**을 써라:
- 90~99: 이 둘의 구체적인 케미 포인트를 짚어서 극찬 (예: "서로의 빈틈을 정확히 채우는 운명적 조합")
- 75~89: 확신 있지만 구체적으로 (예: "투닥거리면서도 결국 서로한테 돌아오는 타입")
- 65~74: 발견의 톤으로 구체적으로 (예: "겉으론 안 맞는 것 같은데 대화하면 의외로 통하는 사이")
- 50~64: 절대 부정적 금지! (예: "완전 다른 세계 출신인데 그래서 더 궁금해지는 관계")

### faceMatch verdict (얼굴합 판정 — AI가 직접 작성!)
- 90~99: 비주얼 구체적 극찬 (예: "같은 화보에서 나온 거 아님?! 톤부터 무드까지 완벽 매칭 📸")
- 75~89: 구체적 포인트 짚어서 (예: "쿨톤 시크미와 웜톤 부드러움이 딱 맞물리는 비주얼")
- 65~74: 은근한 발견 (예: "스타일은 다른데 나란히 놓으면 묘하게 그림이 되는 조합")
- 50~64: ⚠️ 부정 금지!
  ❌ "안 어울린다", "따로 논다", "비주얼이 안 맞는다"
  ✅ "완전 다른 비주얼인데... 그 갭이 오히려 눈이 가게 만들어!"
  ✅ "같은 프레임에 넣으면 시선이 핑퐁치는 재미가 있어 ㅋㅋ"
  → "다름 = 매력, 대비 = 시선 강탈"로 표현!

# 작업 지시사항

다음 구조의 JSON을 반환해주세요. ${isSelfAnalysis ? '모든 텍스트 필드는 차분한 개인/관계 분석 톤으로 작성하고, 팬덤/밈/덕후 표현은 절대 쓰지 마세요.' : '모든 텍스트 필드는 반말 + 이모지 필수!'}

{
  "chemistryScore": {
    "overall": 50-99,
    "scentMatch": 50-99,
    "traitMatch": 50-99,
    "emotionMatch": 50-99,
    "visualMatch": 50-99,
    "tierLabel": "이 둘만을 위한 고유한 케미 한줄 판정 (위의 점수대별 가이드 참고! 뻔한 말 금지, 이 커플/조합의 구체적 특징을 짚어서!)"
  },

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
    "score": 50-99,
    "atmosphere": 50-99,
    "atmosphereDesc": "분위기 조화도 설명 (반말+이모지, 1문장. 위의 톤 가이드에 맞춰서!)",
    "contrast": 50-99,
    "contrastDesc": "냉온 밸런스 설명 (반말+이모지, 1문장. 위의 톤 가이드에 맞춰서!)",
    "colorHarmony": 50-99,
    "colorHarmonyDesc": "색감 조화 설명 (반말+이모지, 1문장. 위의 톤 가이드에 맞춰서!)",
    "styleMatch": 50-99,
    "styleMatchDesc": "스타일 호환 설명 (반말+이모지, 1문장. 위의 톤 가이드에 맞춰서!)",
    "verdict": "얼굴합 종합 한줄 판정 (위의 점수대별 가이드 참고! 뻔한 '찐이다찐' 같은 말 금지. 이 둘의 비주얼 특징을 구체적으로 짚어서 반말+이모지로!)"
  },

  "chemistryStory": "두 향이 만나는 순간을 소설처럼 묘사. 두 캐릭터의 케미를 향기로 풀어낸 짧은 이야기 (반말+이모지, 5-7문장, 감성적으로)"
}

# 주의사항
- chemistryScore는 **필수 필드!** 반드시 포함. tierLabel도 필수!
- **케미합과 얼굴합 점수가 비슷하면 안 됨!** 둘은 완전히 다른 기준이므로 독립적으로 판정. 최소 10점 이상 차이 나는 게 자연스러움
- **80점 이상은 진짜 잘 맞을 때만!** 대충 다 80~90 주면 분석의 신뢰도가 떨어짐. 평균적으로 overall 65~75 정도가 나와야 정상
- faceMatch의 score는 하위 4개 항목의 단순 평균이 아닌 독립적 종합 판정
- chemistryTitle은 15자 이내의 감각적인 칭호
- tierLabel, verdict는 "찐케미", "천생연분" 같은 뻔한 라벨 금지! 이 둘만의 구체적 특징을 담은 문장이어야 함
- 점수가 50~64 구간일 때 절대 부정적 톤 금지! "다름 = 매력"으로 표현
- ${isSelfAnalysis ? '모든 텍스트: 차분하고 정적인 관계 분석 톤. "우리 애", "최애", "아이돌", "ㄹㅇ", "개쩐다", "갓벽", "짱짱이", "심장 저격" 같은 표현 금지!' : '모든 텍스트: 반말, 이모지 필수, 주접 톤!'}
`;

  return wrapPromptWithLocale(prompt, locale);
}
