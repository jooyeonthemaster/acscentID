// 키오스크 AI 퍼스널 컬러 진단 — 프롬프트 · 응답 검증 · 데모 결과 (서버 전용).
// AI는 사진을 보고 8유형 중 하나와 관찰·스타일 문장을 쓴다. 팔레트(color-types.ts)와 향 후보(scent-affinity.ts)는 코드가 정한다.

import type { ColorAnalysisResult, ColorDiagnosis, PersonalColorTypeId } from '@/types/analysis'
import { PERSONAL_COLOR_TYPES, normalizeColorTypeId, personalColorType } from './color-types'
import type { KioskLang } from './i18n'
import {
  assertNoHangul, buildProgramCore, candidateLines, extractJsonObject, parseScentPick,
  requireRecord, requireText, textList, outputLanguageRule, type ScentPick,
} from './program-core'
import { colorScentCandidates } from './scent-affinity'

const TYPE_GUIDE: Record<PersonalColorTypeId, string> = {
  'spring-light': '웜 · 명도 높음 · 맑고 부드러움 · 대비 낮음 — 복숭앗빛이 돌고 머리·눈동자가 밝은 갈색',
  'spring-bright': '웜 · 명도 중간~높음 · 선명함 · 대비 중간~높음 — 윤기 있는 피부와 또렷하게 반짝이는 눈동자',
  'summer-light': '쿨 · 명도 높음 · 맑고 부드러움 · 대비 낮음 — 분홍빛이 도는 피부와 부드러운 회갈색 머리',
  'summer-mute': '쿨 · 명도 중간 · 탁하고 차분함 · 대비 낮음 — 회색 기가 도는 피부와 애쉬 브라운',
  'autumn-mute': '웜 · 명도 중간 · 탁하고 차분함 · 대비 낮음 — 노란 기가 도는 매트한 피부와 부드러운 갈색',
  'autumn-deep': '웜 · 명도 낮음 · 깊고 진함 · 대비 중간~높음 — 황갈색이 깊은 피부와 짙은 갈색 머리·눈동자',
  'winter-bright': '쿨 · 명도 중간~높음 · 선명함 · 대비 높음 — 푸른 기가 도는 맑은 피부와 새까만 머리, 또렷한 흰자위',
  'winter-deep': '쿨 · 명도 낮음 · 깊고 진함 · 대비 높음 — 차갑고 깊은 피부와 짙은 흑발',
}

export function buildColorPrompt(input: { name: string; gender: string; lang: KioskLang }): string {
  const types = PERSONAL_COLOR_TYPES.map((t) => `- ${t.id}: ${TYPE_GUIDE[t.id]}`).join('\n')
  const candidates = PERSONAL_COLOR_TYPES
    .map((t) => `## ${t.id}\n${candidateLines(colorScentCandidates(t.id), input.lang)}`)
    .join('\n\n')
  const palettes = PERSONAL_COLOR_TYPES
    .map((t) => `- ${t.id}: best [${t.best.join(', ')}] / avoid [${t.avoid.join(', ')}]`)
    .join('\n')

  return `# 역할
당신은 경력 10년의 퍼스널 컬러 컨설턴트이자 조향사입니다. 첨부된 정면 사진 한 장으로 퍼스널 컬러를 진단하고, 그 톤에 어울리는 향을 고릅니다.
- 차분하고 다정한 존댓말 — "~해 보세요", "~입니다" 체. 명령조("~하십시오")와 과장 감탄, 밈, 이모지 금지.
- 색에 대한 관찰만 씁니다. 외모의 우열, 나이, 인종, 체형, 피부 상태(잡티·주름)는 언급하지 않습니다.
- 사진 속 사람이 누구인지 추정하지 않습니다.
- 피부를 밝게 만들라는 조언(미백·톤업 권유)은 하지 않습니다.

# 손님
- 이름: ${input.name} / 성별: ${input.gender || '밝히지 않음'}

# 진단 순서
1. **조명 빼기**: 실내 키오스크 조명입니다. 흰자위·치아·옷이나 배경의 흰 부분을 기준으로 조명의 노란 기·푸른 기를 머릿속에서 빼고 판단하십시오.
2. **관찰**: 피부 언더톤(노랑·복숭아 = 웜 / 분홍·푸름 = 쿨), 머리카락 색(염색이면 눈썹·뿌리를 참고), 눈동자 색과 흰자위의 대비, 얼굴 전체의 대비감.
3. **네 축 점수(0-100 정수)**: warmth(0 매우 쿨 ↔ 100 매우 웜), brightness(0 깊음 ↔ 100 밝음), clarity(0 탁하고 부드러움 ↔ 100 맑고 선명함), contrast(0 은은함 ↔ 100 또렷함).
4. **8유형 중 하나**를 고릅니다. 피부가 밝은지 어두운지(인종)가 아니라 언더톤·선명도·대비로 가르십시오 — 어두운 피부도 네 계절 모두 될 수 있습니다.
${types}
5. 점수와 유형은 서로 맞아야 합니다(웜 유형이면 warmth 55 이상, 쿨 유형이면 45 이하).
6. 조명이 심하게 치우쳤거나 화장·필터·가림으로 확신이 낮으면 confidence 를 "low" 로.
7. 사진에 사람 얼굴이 없거나 거의 가려져 판단할 수 없으면 {"faceFound": false} 만 출력하십시오.

# 유형별 팔레트 — 색 견본은 이미 정해져 있습니다. 진단한 유형의 색에 이름만 붙이십시오
${palettes}

# 유형별 향 후보 — 반드시 진단한 유형의 후보 중 하나만 고를 것
${candidates}

향 연결은 "톤의 온도·무게를 향의 온도·무게로 옮긴다"는 한 가지 논리로 씁니다. 예: 맑고 가벼운 웜톤 → 과즙처럼 가볍고 밝은 향, 깊은 쿨톤 → 서늘하고 묵직한 향.

# 출력 — JSON 하나만 (코드펜스·설명 금지)
{
  "faceFound": true,
  "typeId": "8유형 id 중 하나",
  "confidence": "high" | "medium" | "low",
  "title": "이 사람의 톤을 그린 한 줄 별명 (20자 이내, 유형 이름을 그대로 반복하지 말 것)",
  "summary": "어떤 관찰 때문에 이 유형인지 3-4문장",
  "scores": { "warmth": 0-100, "brightness": 0-100, "clarity": 0-100, "contrast": 0-100 },
  "observation": { "skin": "피부에서 본 색 1문장", "hair": "머리카락 1문장", "eyes": "눈동자 1문장" },
  "bestColorNames": ["진단한 유형의 best 팔레트 8색에 순서대로 붙인 이름 8개 — 일상에서 쓰는 색 이름(코랄 핑크, 아이보리…)"],
  "avoidColorNames": ["같은 유형의 avoid 팔레트 4색에 순서대로 붙인 이름 4개"],
  "styling": {
    "makeup": "립·블러셔·섀도 색 방향 1-2문장",
    "hair": "어울리는 머리색 방향 1-2문장",
    "fashion": "옷 색 조합 1-2문장",
    "accessory": "금속·소재 1문장"
  },
  "metal": "gold" | "silver" | "rose-gold",
  "keywords": ["이 톤의 인상을 담은 긍정 키워드 5개 — 각각 명사 한 단어(예: 온기, 생기, 차분함)"],
  "scent": {
    "perfumeId": "진단한 유형의 후보 id 중 하나 (예: AC'SCENT 03)",
    "score": 0.85-0.99,
    "bridge": "톤에서 향으로 건너가는 한 줄 (40자 이내)",
    "why": "왜 이 톤에 이 향인지 3-5문장 — 톤의 온도·무게와 향의 노트를 짝지어서",
    "notes": { "top": "후보 표의 top 노트가 이 톤과 만나는 지점 1문장", "middle": "표의 middle 노트 1문장", "base": "표의 base 노트 1문장" },
    "situation": "이 향이 가장 잘 어울리는 순간 1-2문장",
    "tips": ["뿌리는 법 팁 3개, 각 1문장"]
  }
}${outputLanguageRule(input.lang)}`
}

interface ParsedColor {
  diagnosis: ColorDiagnosis
  pick: ScentPick
  keywords: string[]
}

const clamp100 = (value: unknown, fallback: number) => {
  const n = Number(value)
  return Math.round(Math.max(0, Math.min(100, Number.isFinite(n) ? n : fallback)))
}

/** 얼굴을 못 찾았으면 null — 다시 받아도 같으니 재시도하지 않고 손님에게 다시 찍게 한다 */
export function parseColorResponse(responseText: string, lang: KioskLang): ParsedColor | null {
  const raw = extractJsonObject(responseText)
  if (raw.faceFound === false) return null

  const typeId = normalizeColorTypeId(raw.typeId, raw.season, raw.tone)
  if (!typeId) throw new Error(`typeId 가 8유형 중 하나가 아닙니다: ${String(raw.typeId)}`)
  const type = personalColorType(typeId)
  const scores = requireRecord(raw.scores, 'scores')
  const observation = requireRecord(raw.observation, 'observation')
  const styling = requireRecord(raw.styling, 'styling')
  const warmth = clamp100(scores.warmth, type.undertone === 'warm' ? 70 : 30)

  const diagnosis: ColorDiagnosis = {
    typeId,
    undertone: type.undertone,
    title: requireText(raw.title, 'title', 60),
    summary: requireText(raw.summary, 'summary', 700),
    scores: {
      // 유형과 온도 눈금이 어긋나 보이지 않게 — 웜 유형은 가운데 오른쪽, 쿨 유형은 왼쪽에 둔다
      warmth: type.undertone === 'warm' ? Math.max(55, warmth) : Math.min(45, warmth),
      brightness: clamp100(scores.brightness, 50),
      clarity: clamp100(scores.clarity, 50),
      contrast: clamp100(scores.contrast, 50),
    },
    observation: {
      skin: requireText(observation.skin, 'observation.skin', 240),
      hair: requireText(observation.hair, 'observation.hair', 240),
      eyes: requireText(observation.eyes, 'observation.eyes', 240),
    },
    // 팔레트와 개수가 같으면 화면이 견본마다 이름을 붙인다. 모자라게 와도 받는다(그때는 목록으로만 보인다)
    bestColorNames: textList(raw.bestColorNames, 'bestColorNames', 3, type.best.length, 30),
    avoidColorNames: textList(raw.avoidColorNames, 'avoidColorNames', 2, type.avoid.length, 30),
    styling: {
      makeup: requireText(styling.makeup, 'styling.makeup', 320),
      hair: requireText(styling.hair, 'styling.hair', 320),
      fashion: requireText(styling.fashion, 'styling.fashion', 320),
      accessory: requireText(styling.accessory, 'styling.accessory', 240),
    },
    metal: raw.metal === 'silver' || raw.metal === 'rose-gold' || raw.metal === 'gold' ? raw.metal : type.undertone === 'warm' ? 'gold' : 'silver',
    scentBridge: '',
    scentWhy: '',
    confidence: raw.confidence === 'low' || raw.confidence === 'medium' ? raw.confidence : 'high',
  }
  const pick = parseScentPick(raw.scent, colorScentCandidates(typeId))
  diagnosis.scentBridge = pick.bridge
  diagnosis.scentWhy = pick.why
  const keywords = textList(raw.keywords, 'keywords', 3, 5, 24)
  assertNoHangul(lang, [diagnosis, pick.notes, pick.situation, pick.tips, keywords])
  return { diagnosis, pick, keywords }
}

export function toColorResult(parsed: ParsedColor, lang: KioskLang): ColorAnalysisResult {
  const { diagnosis, pick, keywords } = parsed
  const type = personalColorType(diagnosis.typeId)
  const core = buildProgramCore({
    lang,
    pick,
    keywords,
    dominantColors: type.best.slice(0, 4),
    personalColor: { season: type.season, tone: type.tone, palette: type.best, description: diagnosis.summary },
    analysis: {
      mood: diagnosis.summary,
      style: diagnosis.styling.fashion,
      expression: diagnosis.observation.skin,
      concept: diagnosis.title,
    },
  })
  return { ...core, colorDiagnosis: diagnosis }
}

/** 데모 결과 — 키가 없거나 ?mock=1 일 때. 유형만 바뀌고 문장은 고정(한국어) */
export function buildColorDemo(lang: KioskLang): ColorAnalysisResult {
  const type = PERSONAL_COLOR_TYPES[Math.floor(Math.random() * PERSONAL_COLOR_TYPES.length)]
  const warm = type.undertone === 'warm'
  const light = type.tone === 'light' || type.tone === 'bright'
  const clear = type.tone === 'bright' || type.tone === 'deep'
  const diagnosis: ColorDiagnosis = {
    typeId: type.id,
    undertone: type.undertone,
    title: warm ? '햇살이 머무는 따뜻한 결' : '새벽 공기처럼 맑은 결',
    summary: `피부에 ${warm ? '노란 기와 복숭앗빛' : '분홍 기와 푸른 기'}이 돌고, 머리카락과 눈동자의 대비가 ${clear ? '또렷한' : '부드러운'} 편입니다. 그래서 ${warm ? '따뜻하고' : '서늘하고'} ${light ? '밝은' : '깊은'} 색이 얼굴빛을 살립니다. (데모 문구이며 실제 진단이 아닙니다.)`,
    scores: { warmth: warm ? 72 : 28, brightness: light ? 74 : 34, clarity: clear ? 76 : 36, contrast: clear ? 70 : 32 },
    observation: {
      skin: `${warm ? '노란 기' : '분홍 기'}가 은은하게 도는 피부입니다. (데모)`,
      hair: `${light ? '밝은 갈색' : '짙은 색'}에 가까운 머리카락입니다. (데모)`,
      eyes: `눈동자와 흰자위의 대비가 ${clear ? '또렷합니다' : '부드럽습니다'}. (데모)`,
    },
    bestColorNames: warm ? ['코랄', '피치', '아이보리', '카멜', '올리브'] : ['라벤더', '스카이 블루', '로즈 핑크', '네이비', '쿨 그레이'],
    avoidColorNames: warm ? ['차가운 회색', '푸른빛 핑크', '새까만 검정'] : ['머스터드', '오렌지 브라운', '카키'],
    styling: {
      makeup: `${warm ? '코랄·피치' : '로즈·모브'} 계열 립과 블러셔가 자연스럽게 어울립니다. (데모)`,
      hair: `${warm ? '따뜻한 브라운' : '애쉬 브라운이나 흑발'} 계열이 얼굴빛을 정돈합니다. (데모)`,
      fashion: `${warm ? '아이보리와 카멜' : '화이트와 네이비'}를 바탕으로 팔레트의 색을 한 가지씩 더해 보세요. (데모)`,
      accessory: `${warm ? '골드' : '실버'} 계열 금속이 피부 위에서 깨끗하게 보입니다. (데모)`,
    },
    metal: warm ? 'gold' : 'silver',
    scentBridge: `${warm ? '따뜻한' : '서늘한'} 톤 — ${light ? '가볍고 밝은' : '깊고 묵직한'} 향`,
    scentWhy: `톤의 온도와 무게를 향으로 옮기면 ${light ? '가볍게 번지는' : '천천히 가라앉는'} 향이 됩니다. 실제 분석에서는 이 자리에 톤과 노트를 짝지은 설명이 들어갑니다. (데모)`,
    confidence: 'medium',
  }
  const perfume = colorScentCandidates(type.id)[0]
  return toColorResult({
    diagnosis,
    keywords: warm ? ['온기', '생기', '부드러움', '햇살', '자연스러움'] : ['맑음', '차분함', '투명함', '세련됨', '고요'],
    pick: {
      perfume,
      score: 0.92,
      bridge: diagnosis.scentBridge,
      why: diagnosis.scentWhy,
      notes: { top: '첫 향이 톤의 온도와 맞닿습니다. (데모)', middle: '중심에서 톤의 결을 받칩니다. (데모)', base: '잔향이 톤의 깊이를 남깁니다. (데모)' },
      situation: '하루를 여는 자리에서 가볍게 두세 번 뿌려 보세요. (데모)',
      tips: ['손목과 귀 뒤에 소량', '문지르지 말고 자연 건조', '옷보다 피부에 직접'],
    },
  }, lang)
}
