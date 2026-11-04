// 미래 직업 탐색(NEXT!)의 AI 분석 — 고른 활동·MBTI·상황 답·관상 사진(있으면)과 규칙이 고른 직업 셋을 AI 가 보고 손님에게 맞춘 풀이를 쓴다.
// 2026-10-26 주거복지대전 제안서("질문 여덟 개 → 나의 관상 찍기(AI 분석) → 사진 인화")에 맞춰 추가. 직업은 규칙(data.ts)이 고르고 AI 는 바꾸지 않는다.
// 관상은 재미로 보는 이야기 — 얼굴 생김새로 능력·성격·운명을 단정하지 않고 표정·분위기만 말한다(ai.ts FORBIDDEN 과 같은 금지어).
// 요청 검사·지시문·응답 검사만(DOM·네트워크 없음 · 시험 가능). 호출은 app/api/kiosk/experience/career.

import type { KioskLang } from './i18n'
import { FORBIDDEN } from './expansion/ai'
import { outputLanguageRule } from './program-core'

export interface CareerAiRequest {
  lang: KioskLang
  /** 관상 사진(긴 변 768 JPEG data:) — 건너뛰면 null */
  photo: string | null
  interests: string[]
  mbti: string | null
  answers: { label: string; value: string }[]
  /** 규칙이 고른 직업 셋(이름 · 설명) — 순서 그대로 */
  careers: { name: string; desc: string }[]
  /** 기기에서 읽은 인상(재미로 보는 관상 특징 이름) */
  traits: string[]
}
export interface CareerAiAnalysis { headline: string; insight: string; photo: string[]; tips: string[] }

/** 관상 사진에서 이목구비를 짚는 말 — 표정·분위기만 말한다(2026-10-26 실호출: '깊은 눈매에서 느껴지는 … 태도') */
const FACE_FEATURES: [RegExp, string][] = [[/눈매|이목구비|얼굴형|턱선|이마가|이마에서|콧날|코가|입매|눈썹이|광대/, '이목구비 언급']]

const LANGS: KioskLang[] = ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant']
const isPhotoUrl = (value: unknown): value is string => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value) && value.length <= 1_500_000
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u001f\u007f"`“”]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
const cleanList = (value: unknown, n: number, max: number) => Array.isArray(value) ? value.slice(0, n).map((x) => clean(x, max)).filter(Boolean) : []

/** 요청 본문 검사 — 무인증 엔드포인트라 길이·개수를 모두 자른다. 틀리면 null */
export function readCareerAiRequest(body: unknown): CareerAiRequest | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const lang = LANGS.includes(b.lang as KioskLang) ? (b.lang as KioskLang) : 'ko'
  if (b.photo != null && !isPhotoUrl(b.photo)) return null
  const careers = Array.isArray(b.careers) ? b.careers.slice(0, 3).map((c) => ({ name: clean((c as Record<string, unknown>)?.name, 40), desc: clean((c as Record<string, unknown>)?.desc, 160) })).filter((c) => c.name) : []
  if (!careers.length) return null
  const answers = Array.isArray(b.answers) ? b.answers.slice(0, 8).map((a) => ({ label: clean((a as Record<string, unknown>)?.label, 80), value: clean((a as Record<string, unknown>)?.value, 80) })).filter((a) => a.label) : []
  return { lang, photo: isPhotoUrl(b.photo) ? b.photo : null, interests: cleanList(b.interests, 8, 30), mbti: /^[EI][SN][TF][JP]$/.test(String(b.mbti ?? '')) ? String(b.mbti) : null, answers, careers, traits: cleanList(b.traits, 6, 30) }
}

export function buildCareerPrompt(req: CareerAiRequest): string {
  const lines = [
    "당신은 키오스크 체험 '미래 직업 탐색(NEXT!)'의 진로 탐색 안내자입니다. 손님이 고른 활동과 답, 재미로 보는 관상(사진이 있으면)을 엮어, 규칙이 이미 고른 직업 셋을 왜 탐색해 볼 만한지 다정하게 풀어 줍니다.",
    '',
    '# 입력',
    req.photo ? '- 첨부 사진: 손님이 방금 찍은 관상 사진. 표정·분위기·옷차림처럼 실제로 보이는 것만 짚는다.' : '- 사진 없음: 관상을 건너뛰었다. 사진 이야기를 지어내지 않는다.',
    req.interests.length ? `- 마음이 가는 활동: ${req.interests.join(', ')}` : '',
    req.mbti ? `- MBTI(손님이 고름): ${req.mbti}` : '- MBTI: 고르지 않음',
    req.answers.length ? `- 상황 질문 답: ${req.answers.map((a) => `${a.label}=${a.value}`).join(' / ')}` : '',
    req.traits.length ? `- 기기가 읽은 인상(재미로 보는 관상 단서): ${req.traits.join(', ')}` : '',
    `- 탐색해 볼 직업(이 순서·이름 그대로, 바꾸거나 더하지 않는다): ${req.careers.map((c, i) => `${i + 1}. ${c.name}(${c.desc})`).join(' ')}`,
    '',
    '# 규칙',
    '- 존댓말(~요). 손님에게 직접 말하듯 다정하고 구체적으로.',
    '- 적성·능력·미래를 단정하지 않는다("~하게 될 거예요" 금지, "~를 탐색해 보세요"). 재미로 보는 탐색이다.',
    '- 관상은 재미로 곁들이는 이야기: 이목구비(눈매·코·입매·이마·턱선·얼굴형)를 말하지 않는다. 표정(미소 등)과 옷차림·분위기만 짚고, 그것으로 성격·태도·능력을 판정하지 않는다. 외모 평가(예쁨·잘생김·체형·나이·피부)를 하지 않는다.',
    '- 실존 인물·연예인을 말하지 않는다. 행사장 부스·시설을 지어내지 않는다.',
    '',
    '# 출력 — JSON 하나만',
    `{"headline": "한 줄 제목(30자 이내)", "insight": "고른 활동·답·MBTI(있으면)·관상(있으면)을 엮어 첫 직업을 중심으로 왜 탐색해 볼 만한지 2~3문장(90~260자)", "photo": ${req.photo ? '["사진에서 본 표정·분위기 1(50자 이내)"]' : '[]'}, "tips": ["이번 주에 해 볼 작은 탐색 1(50자 이내)", "작은 탐색 2"]}`,
  ]
  return lines.filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n') + outputLanguageRule(req.lang)
}

const text = (value: unknown, path: string, max: number, min: number) => {
  if (typeof value !== 'string' || value.trim().length < min) throw new Error(`${path} 필드가 비었거나 너무 짧습니다(${min}자 이상).`)
  return value.trim().slice(0, max)
}
const list = (value: unknown, path: string, min: number, max: number, itemMax: number) => {
  const items = Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).map((x) => x.trim().slice(0, itemMax)) : []
  if (items.length < min) throw new Error(`${path} 는 ${min}개 이상이어야 합니다.`)
  return items.slice(0, max)
}

export function validateCareerAi(value: unknown, req: CareerAiRequest): CareerAiAnalysis {
  if (!value || typeof value !== 'object') throw new Error('응답 최상위가 JSON 객체가 아닙니다.')
  const v = value as Record<string, unknown>
  const out: CareerAiAnalysis = {
    headline: text(v.headline, 'headline', 60, 4),
    insight: text(v.insight, 'insight', 360, 30),
    photo: req.photo ? list(v.photo, 'photo', 1, 2, 90) : [],
    tips: list(v.tips, 'tips', 2, 3, 90),
  }
  if (req.lang === 'ko') {
    const all = [out.headline, out.insight, ...out.photo, ...out.tips].join(' ')
    if (!/[가-힣]/.test(all)) throw new Error('한국어로 써야 합니다.')
    for (const [pattern, why] of [...FORBIDDEN, ...FACE_FEATURES]) if (pattern.test(all)) throw new Error(`규칙 위반(${why}): "${all.match(pattern)?.[0]}" 같은 표현을 빼고 다시 쓰십시오.`)
  }
  return out
}
