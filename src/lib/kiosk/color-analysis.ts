// 키오스크 AI 퍼스널 컬러 진단 — 프롬프트 · 응답 검증 · 데모 결과 (서버 전용).
// AI는 사진을 보고 8유형 중 하나와 관찰·스타일 문장을 쓴다. 팔레트(color-types.ts)는 코드가 정한다.
// 향은 추천하지 않는다(2026-10-09 제거) — 결과는 진단서뿐이다.

import type { ColorAnalysisResult, ColorDiagnosis, PersonalColorTypeId } from '@/types/analysis'
import { PERSONAL_COLOR_TYPES, normalizeColorTypeId, personalColorType } from './color-types'
import type { ColorMeasure } from './garment-core'
import type { KioskLang } from './i18n'
import { extractJsonObject, finiteNumber, requireRecord, requireText, textList, outputLanguageRule } from './program-core'

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

/**
 * 기기가 보낸 색 측정값을 읽는다 — 숫자가 아니거나 Lab 범위를 벗어나면 버린다(지시문에 그대로 들어가므로).
 * 측정이 없어도 진단은 된다(예전 기기 · 모델을 아직 못 받은 기기).
 */
export function readColorMeasure(value: unknown): ColorMeasure | null {
  if (!value || typeof value !== 'object') return null
  const lab = (v: unknown) => {
    if (!v || typeof v !== 'object') return null
    const { L, a, b } = v as Record<string, unknown>
    const ok = (n: unknown, lo: number, hi: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi
    return ok(L, 0, 100) && ok(a, -60, 80) && ok(b, -60, 90) ? { L: Math.round(L * 10) / 10, a: Math.round(a * 10) / 10, b: Math.round(b * 10) / 10 } : null
  }
  const raw = value as Record<string, unknown>
  const skin = lab(raw.skin)
  if (!skin) return null
  const share = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0)
  return { skin, hair: lab(raw.hair), skinShare: share(raw.skinShare), hairShare: share(raw.hairShare) }
}

/**
 * 측정값으로 유형을 정하는 경계값 — 모두 어림값이다. 조명(화이트밸런스·노출)에 따라 달라지고, 유형이 확정된 사람들로 맞춘 값이 아니다.
 * 서버 로그의 측정값(`[KIOSK-COLOR-…] 사진 … 피부 L a b`)을 모아 실기 조명에서 여러 사람으로 확인하며 조정할 것.
 *  · 웜/쿨: 피부 색상각(노랑 쪽일수록 큼)
 *  · 딥: 피부가 어두움 / 브라이트: 피부와 머리카락의 명도 차가 큼 / 라이트: 대비가 작고 맑으며 피부가 밝음 / 뮤트: 그 밖
 */
const UNDERTONE_HUE = 55
const DEEP_SKIN_L = 60
const BRIGHT_CONTRAST = 66
const LIGHT_SKIN_L = 68
const LIGHT_CHROMA_MAX = 17

const skinHue = (m: ColorMeasure) => (Math.atan2(m.skin.b, m.skin.a) * 180) / Math.PI
const to100 = (value: number, lo: number, hi: number) => Math.round(Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100)))

/** 측정값으로 정한 진단 — typeId 가 없으면 웜/쿨만 정해졌다(머리카락을 못 잰 사진: 그 안의 4유형은 AI 가 고른다) */
export interface MeasuredDiagnosis {
  undertone: 'warm' | 'cool'
  typeId: PersonalColorTypeId | null
  scores: { warmth: number; brightness: number; clarity: number; contrast: number | null }
  /** 웜·쿨 경계에 가깝다 — 확신을 '높음'으로 내지 않는다 */
  edge: boolean
}

/**
 * 측정값으로 유형을 정한다. AI 가 눈으로 고르면 같은 사람도 사진이 조금만 달라지면 유형이 바뀌었다
 * (같은 조명에서 살짝 다르게 찍은 7장 중 3~4장이 웜↔쿨, 2장이 라이트↔뮤트 — 2026-10-10 실험). 측정값은 7장이 거의 같다.
 * 그래서 유형은 숫자로 정하고 AI 는 그 유형의 설명만 쓴다.
 * 피부로 보기 어려운 값(너무 어둡거나 밝음, 무채색에 가깝거나 지나치게 짙음)은 조명 탓일 수 있어 숫자로 정하지 않는다(null → AI 가 판단).
 */
export function diagnoseFromMeasure(m: ColorMeasure | null | undefined): MeasuredDiagnosis | null {
  if (!m) return null
  const chroma = Math.hypot(m.skin.a, m.skin.b)
  if (m.skin.L < 35 || m.skin.L > 90 || chroma < 8 || chroma > 36 || m.skinShare < 0.02) return null
  const hue = skinHue(m)
  const undertone = hue >= UNDERTONE_HUE ? 'warm' : 'cool'
  const contrast = m.hair ? m.skin.L - m.hair.L : null
  const scores = {
    // 온도 눈금은 유형 쪽에 서게 한다(웜 55 이상 · 쿨 45 이하 — parseColorResponse 와 같은 규칙)
    warmth: undertone === 'warm' ? Math.max(55, to100(hue, 45, 65)) : Math.min(45, to100(hue, 45, 65)),
    brightness: to100(m.skin.L, 50, 85),
    clarity: to100(chroma, 10, 24),
    contrast: contrast === null ? null : to100(contrast, 35, 80),
  }
  let tone: 'light' | 'bright' | 'mute' | 'deep' | null = null
  if (m.skin.L <= DEEP_SKIN_L) tone = 'deep'
  else if (contrast !== null) {
    tone = contrast >= BRIGHT_CONTRAST ? 'bright' : m.skin.L >= LIGHT_SKIN_L && chroma < LIGHT_CHROMA_MAX ? 'light' : 'mute'
  }
  const typeId = tone
    ? (PERSONAL_COLOR_TYPES.find((t) => t.undertone === undertone && t.tone === tone)?.id ?? null)
    : null
  return { undertone, typeId, scores, edge: Math.abs(hue - UNDERTONE_HUE) < 1.5 }
}

function measureLines(m: ColorMeasure): string {
  const hue = skinHue(m)
  const chroma = Math.hypot(m.skin.a, m.skin.b)
  const lines = [
    `- 피부(뺨·이마의 그늘과 번들거림을 뺀 가운데 값): L* ${m.skin.L} · a* ${m.skin.a} · b* ${m.skin.b} → 색상각 ${hue.toFixed(0)}° · 채도 ${chroma.toFixed(0)}`,
  ]
  if (m.hair) lines.push(`- 머리카락: L* ${m.hair.L} · a* ${m.hair.a} · b* ${m.hair.b} → 피부와의 명도 차 ${(m.skin.L - m.hair.L).toFixed(0)}`)
  return lines.join('\n')
}

export function buildColorPrompt(input: { name: string; gender: string; lang: KioskLang; focused?: boolean; measure?: ColorMeasure | null }): string {
  // 측정으로 정해진 만큼만 보여 준다 — 유형까지 정해졌으면 그 유형 하나, 웜/쿨만 정해졌으면 그 4유형
  const measured = diagnoseFromMeasure(input.measure)
  const candidates = PERSONAL_COLOR_TYPES.filter((t) => !measured || (measured.typeId ? t.id === measured.typeId : t.undertone === measured.undertone))
  const types = candidates.map((t) => `- ${t.id}: ${TYPE_GUIDE[t.id]}`).join('\n')
  const palettes = candidates
    .map((t) => `- ${t.id}: best [${t.best.join(', ')}] / avoid [${t.avoid.join(', ')}]`)
    .join('\n')

  return `# 역할
당신은 경력 10년의 퍼스널 컬러 컨설턴트입니다. 첨부된 정면 사진 한 장으로 퍼스널 컬러를 진단합니다.
- 차분하고 다정한 존댓말 — "~해 보세요", "~입니다" 체. 명령조("~하십시오")와 과장 감탄, 밈, 이모지 금지.
- 색에 대한 관찰만 씁니다. 외모의 우열, 나이, 인종, 체형, 피부 상태(잡티·주름)는 언급하지 않습니다.
- 사진 속 사람이 누구인지 추정하지 않습니다.
- 피부를 밝게 만들라는 조언(미백·톤업 권유)은 하지 않습니다.

# 손님
- 이름: ${input.name} / 성별: ${input.gender || '밝히지 않음'}

# 옷·배경은 근거가 아닙니다
- 옷, 배경, 액세서리, 화장품 색은 그 사람이 '지금 걸친' 색이지 그 사람의 색이 아닙니다. 진단 근거로 쓰지 마십시오.
- 같은 사람이 주황 옷을 입든 파란 옷을 입든 검은 옷을 입든 진단은 똑같아야 합니다. 옷 색과 어울려 보이는지로 판단하지 마십시오.
- 근거는 피부(뺨·이마·목), 머리카락(염색이면 눈썹·뿌리), 눈동자와 흰자위뿐입니다. summary 와 observation 에도 옷·배경 이야기는 쓰지 않습니다.
${input.focused ? `- 이 사진은 옷과 배경을 **회색으로 지우고** 얼굴 둘레만 잘라 낸 것입니다. 회색 부분은 지운 자리이니 없는 것으로 보고, 남아 있는 얼굴·머리카락·목만 보십시오. 회색을 그 사람의 색(회색 기·탁함)으로 읽지 마십시오.\n` : ''}${input.measure ? `
# 기기가 사진에서 잰 색 (CIELAB)
${measureLines(input.measure)}
- 읽는 법: 피부 색상각이 클수록(노랑 쪽) 웜, 작을수록(분홍·붉은 쪽) 쿨 쪽입니다. 피부 L* 가 높을수록 brightness 가 높고, 채도가 높을수록 clarity 가 높으며, 피부와 머리카락의 명도 차가 클수록 contrast 가 높습니다.
- 이 숫자는 조명에 따라 조금 달라지지만 옷·배경의 영향을 받지 않습니다.
${measured?.typeId
  ? `- **유형은 측정으로 정해졌습니다: ${measured.typeId}.** typeId 는 반드시 이 값으로 쓰고, 왜 이 유형인지(피부의 노란 기·분홍 기, 밝기, 머리카락과의 대비)를 사진에서 본 것으로 설명하십시오. 다른 유형을 고르지 마십시오.`
  : measured
    ? `- **언더톤은 측정으로 정해졌습니다: ${measured.undertone === 'warm' ? '웜' : '쿨'}.** 아래 4유형 중에서만 고르고, 명도·선명도·대비로 가르십시오.`
    : `- 이 숫자만으로 정하기 어려운 사진입니다. 눈으로 본 것(흰자위·치아에 비친 조명을 뺀 피부의 노란 기·분홍 기, 머리카락·눈동자의 색)과 함께 판단하십시오.`}
` : ''}
# 진단 순서
1. **조명 빼기**: 실내 키오스크 조명입니다. 흰자위·치아를 기준으로 조명의 노란 기·푸른 기를 머릿속에서 빼고 판단하십시오.
2. **관찰**: 피부 언더톤(노랑·복숭아 = 웜 / 분홍·푸름 = 쿨), 머리카락 색(염색이면 눈썹·뿌리를 참고), 눈동자 색과 흰자위의 대비, 얼굴 전체의 대비감.
3. **네 축 점수(0-100 정수)**: warmth(0 매우 쿨 ↔ 100 매우 웜), brightness(0 깊음 ↔ 100 밝음), clarity(0 탁하고 부드러움 ↔ 100 맑고 선명함), contrast(0 은은함 ↔ 100 또렷함).
4. **아래 유형 중 하나**를 고릅니다. 피부가 밝은지 어두운지(인종)가 아니라 언더톤·선명도·대비로 가르십시오 — 어두운 피부도 네 계절 모두 될 수 있습니다.
${types}
5. 점수와 유형은 서로 맞아야 합니다(웜 유형이면 warmth 55 이상, 쿨 유형이면 45 이하).
6. confidence — 조명이 한쪽 색으로 심하게 치우쳤거나(네온·컬러 조명), 흑백·필터 사진이거나, 짙은 화장·가림으로 본래 색을 알기 어려우면 반드시 "low". 조금 애매하면 "medium". 자연스러운 조명의 맨 얼굴에 가까울 때만 "high".
7. 사진에 사람 얼굴이 없거나 거의 가려져 판단할 수 없으면 {"faceFound": false} 만 출력하십시오.

# 유형별 팔레트 — 색 견본은 이미 정해져 있습니다. 진단한 유형의 색에 이름만 붙이십시오
${palettes}

# 출력 — JSON 하나만 (코드펜스·설명 금지)
{
  "faceFound": true,
  "typeId": "위 유형 id 중 하나",
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
  "keywords": ["이 톤의 인상을 담은 긍정 키워드 5개 — 각각 명사 한 단어(예: 온기, 생기, 차분함)"]
}${outputLanguageRule(input.lang)}`
}

const clamp100 = (value: unknown, fallback: number) => Math.round(Math.max(0, Math.min(100, finiteNumber(value) ?? fallback)))

/** 모델이 "LOW" · "Low " 처럼 써도 읽는다. 읽을 수 없으면 '보통' — 확신이 높다고 단정하지 않는다 */
function readConfidence(value: unknown): ColorDiagnosis['confidence'] {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return text === 'high' || text === 'low' ? text : 'medium'
}

/** 얼굴을 못 찾았으면 null — 다시 받아도 같으니 재시도하지 않고 손님에게 다시 찍게 한다 */
export function parseColorResponse(responseText: string, measured: MeasuredDiagnosis | null = null): ColorAnalysisResult | null {
  const raw = extractJsonObject(responseText)
  // false · "false" · 0, 또는 유형 없이 faceFound 만 온 응답도 '얼굴 없음'
  if (raw.faceFound === false || raw.faceFound === 0 || String(raw.faceFound).toLowerCase() === 'false') return null
  if (raw.faceFound !== true && raw.typeId === undefined && raw.scores === undefined) return null

  const typeId = normalizeColorTypeId(raw.typeId, raw.season, raw.tone)
  if (!typeId) throw new Error(`typeId 가 8유형 중 하나가 아닙니다: ${String(raw.typeId)}`)
  const type = personalColorType(typeId)
  if (measured?.typeId && typeId !== measured.typeId) throw new Error(`유형은 측정으로 ${measured.typeId} 로 정해졌는데 ${typeId} 를 골랐습니다. typeId 를 ${measured.typeId} 로 쓰십시오`)
  if (measured && type.undertone !== measured.undertone) throw new Error(`측정으로 정해진 언더톤은 ${measured.undertone} 인데 ${typeId}(${type.undertone}) 를 골랐습니다. ${measured.undertone} 유형 중에서 고르십시오`)
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
      // 측정값이 있으면 눈금도 측정값으로 — 같은 사람은 같은 눈금이 나온다. 없으면 AI 가 준 값
      // 유형과 온도 눈금이 어긋나 보이지 않게 — 웜 유형은 가운데 오른쪽, 쿨 유형은 왼쪽에 둔다
      warmth: measured?.scores.warmth ?? (type.undertone === 'warm' ? Math.max(55, warmth) : Math.min(45, warmth)),
      brightness: measured?.scores.brightness ?? clamp100(scores.brightness, 50),
      clarity: measured?.scores.clarity ?? clamp100(scores.clarity, 50),
      contrast: measured?.scores.contrast ?? clamp100(scores.contrast, 50),
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
    // 웜·쿨 경계에 가까운 측정은 '높음'으로 내지 않는다
    confidence: measured?.edge && readConfidence(raw.confidence) === 'high' ? 'medium' : readConfidence(raw.confidence),
  }
  return { colorDiagnosis: diagnosis, keywords: textList(raw.keywords, 'keywords', 3, 5, 24) }
}

/** 데모 결과 — 키가 없거나 ?mock=1 일 때. 유형만 바뀌고 문장은 고정(한국어) */
export function buildColorDemo(): ColorAnalysisResult {
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
    confidence: 'medium',
  }
  return { colorDiagnosis: diagnosis, keywords: warm ? ['온기', '생기', '부드러움', '햇살', '자연스러움'] : ['맑음', '차분함', '투명함', '세련됨', '고요'] }
}
