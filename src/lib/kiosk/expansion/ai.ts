// 체험 18종의 AI 분석 — 사진(있으면)과 손님의 답변·기기에서 잰 값을 AI(OpenRouter 텍스트 모델)가 보고,
// 정해진 후보가 있으면 그중 하나를 고르고(pick), 그 사람에게 맞춘 풀이를 쓴다. 상품·향료·레시피는 지어내지 않는다 — 후보 밖은 거절하고 다시 받는다.
// 이 파일은 요청 검사·지시문·응답 검사·결과 합치기만(DOM·네트워크 없음 · 시험 가능). 호출은 app/api/kiosk/experience/expansion.

import { catalogForPrompt, normalizeId, PREFER_COUNT, validateRecipe, type RawRecipe } from './recipe'
import { EXPANSION_META, isExpansionId, type ExpansionId, type ExperienceResult } from './types'

export interface AiCandidate { id: string; title: string; summary: string }
export interface AiRequest {
  id: ExpansionId
  /** 긴 변 768 안팎의 JPEG data: 주소 — 사진 없이 하기면 없다 */
  photo: string | null
  /** 기기에서 잰 값 한 줄(readingLine) */
  facts: string
  answers: { label: string; value: string }[]
  candidates: AiCandidate[]
  /** 모드별 맥락(고른 주제·실험 기록·문장 등) */
  context: string
  /** 조향 레시피를 함께 짤 때(주거복지대전 3종) — 규칙이 매긴 향료 순위 위쪽(주향 후보) */
  recipe?: { prefer: string[] }
}
export interface AiAnalysis {
  /** 고른 후보 id — 후보가 없는 체험은 null */
  pick: string | null
  /** 한 줄 제목(결과의 'AI 분석 · …') */
  headline: string
  insight: string
  /** 사진에서 본 것 — 사진이 없으면 빈 목록 */
  photo: string[]
  tips: string[]
  /** 조향 레시피 — recipe 요청에만 */
  recipe?: RawRecipe
}

/** 레시피를 짤 수 있는 체험 */
export const RECIPE_IDS: readonly ExpansionId[] = ['housing-scent', 'housing-home', 'housing-mate']

export const AI_SECTION = 'AI 분석'
const isPhotoUrl = (value: unknown): value is string => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value) && value.length <= 1_500_000
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u001f\u007f\u2028\u2029"`“”]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''

/** 요청 본문 검사 — 무인증 엔드포인트라 길이·개수를 모두 자른다. 틀리면 null */
export function readAiRequest(body: unknown): AiRequest | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.id !== 'string' || !isExpansionId(b.id)) return null
  if (b.photo != null && !isPhotoUrl(b.photo)) return null
  const answers = Array.isArray(b.answers) ? b.answers.slice(0, 24).map((x) => ({ label: clean((x as Record<string, unknown>)?.label, 60), value: clean((x as Record<string, unknown>)?.value, 120) })).filter((x) => x.label) : []
  const candidates = Array.isArray(b.candidates) ? b.candidates.slice(0, 4).map((x) => ({ id: clean((x as Record<string, unknown>)?.id, 80), title: clean((x as Record<string, unknown>)?.title, 60), summary: clean((x as Record<string, unknown>)?.summary, 320) })).filter((x) => x.id && x.title) : []
  // 레시피 주향 후보 — 실제 향료 id 만, 중복 없이, PREFER_COUNT 개까지
  const preferRaw = (b.recipe as { prefer?: unknown } | undefined)?.prefer
  const prefer = Array.isArray(preferRaw) ? [...new Set(preferRaw.map(normalizeId).filter((x): x is string => !!x))].slice(0, PREFER_COUNT) : []
  const recipe = RECIPE_IDS.includes(b.id) && prefer.length >= 3 ? { prefer } : undefined
  return { id: b.id, photo: isPhotoUrl(b.photo) ? b.photo : null, facts: clean(b.facts, 400), answers, candidates, context: clean(b.context, 1500), ...(recipe ? { recipe } : {}) }
}

/** 모드마다 AI 의 역할과 그 모드만의 금지·주의 */
const MODE: Record<ExpansionId, { role: string; rules: string[] }> = {
  sommelier: { role: '와인 취향 안내자. 후보 와인 스타일 중 손님에게 가장 어울리는 하나를 골라 이유를 풀어 준다.', rules: ['성인 대상 취향 안내다. 음주를 권하거나 양을 정하지 않는다.', '후보에 없는 와인 이름·브랜드를 만들지 않는다.'] },
  cocktail: { role: '음료 바텐더. 후보 레시피 중 하나를 골라 오늘의 손님에게 어울리는 이유를 풀어 준다.', rules: ['레시피의 재료·분량은 이미 정해져 있다. 바꾸거나 더하지 않는다.', '음주를 권하지 않는다. 논알코올이면 알코올 이야기를 하지 않는다.'] },
  barista: { role: '바리스타. 후보 커피 프로필 중 하나를 골라 이유와 즐기는 방법을 풀어 준다.', rules: ['카페인·건강 효과를 말하지 않는다.', '후보에 없는 원두 상품명을 만들지 않는다.'] },
  'taste-dna': { role: '음식 취향 큐레이터. 후보 음식 조합 중 하나를 골라 이유를 풀어 준다.', rules: ['영양·건강·의학적 판단을 하지 않는다. DNA 는 별명일 뿐 유전자 분석이 아니다.'] },
  'style-profiler': { role: '스타일리스트. 후보 스타일 중 하나를 골라 지금 입은 옷과 이어지는 무드보드 이유를 풀어 준다.', rules: ['체형·얼굴·나이를 평가하지 않는다. 옷의 색·소재·실루엣과 분위기만 말한다.'] },
  coord: { role: '코디네이터. 후보 코디 중 하나를 골라 지금 입은 옷에서 이어 입는 방법을 풀어 준다.', rules: ['체형·얼굴·나이를 평가하지 않는다. 옷의 색·소재·아이템만 말한다.'] },
  lookalike: { role: '사진 연출가. 손님이 고른 가상 스타 무드로 사진을 찍을 때의 연출을 풀어 준다.', rules: ['실존 인물·연예인 이름을 말하지 않고, 누구를 닮았다고 하지 않는다.', '얼굴 생김새를 평가하지 않는다. 표정·옷·빛·포즈만 말한다.'] },
  science: { role: '빛 실험 선생님. 손님이 만든 색과 미션 기록을 보고 빛의 삼원색 원리를 정확하게 풀어 준다.', rules: ['과학적으로 정확하게 쓴다(빛의 가산 혼합, RGB 0~255).'] },
  palm: { role: '손 위 이야기꾼. 사진 속 손을 펼친 모양과 제스처에서 착안한 짧은 창작 이야기를 쓴다.', rules: ['손금 선을 읽거나 해석한다고 말하지 않는다. 생명선·수명·건강·재물·미래를 말하지 않는다.', '창작 이야기임이 드러나게 쓴다.'] },
  aura: { role: '컬러 이야기꾼. 후보 컬러 중 하나를 골라 오늘의 분위기와 작은 행동을 풀어 준다.', rules: ['실제 오라·에너지·성격을 측정한다고 말하지 않는다. 재미로 보는 색 이야기다.'] },
  product: { role: '조명 디자이너. 손님이 고른 가상 조명 설정과 사진 속 공간의 빛을 보고 쓰임 장면을 제안한다.', rules: ['가상 제품이다. 가격·판매·실제 규격을 말하지 않는다.'] },
  team: { role: '팀 활동 퍼실리테이터. 함께 찍은 사진의 분위기와 각자 고른 답변 집계를 보고 팀이 해 볼 활동을 제안한다.', rules: ['사진 속 누가 누구인지 추측하지 않는다. 사람마다 성격·능력을 판정하지 않는다.', '팀의 성공·궁합을 점수로 판정하지 않는다.'] },
  'vision-wall': { role: '비전 월 큐레이터. 손님이 쓴 한 문장을 존중해 그 비전을 응원하는 해설을 쓴다.', rules: ['손님의 문장을 고치거나 왜곡하지 않는다.'] },
  heritage: { role: '문화유산 해설사. 손님이 고른 장면·시대·빛과 살펴본 지점으로 탐험 노트를 쓴다.', rules: ['특정 궁궐·유적을 고증한 사실처럼 말하지 않는다. 일반적인 전통 건축 이야기로 쓴다.'] },
  travel: { role: '여행 큐레이터. 후보 코스 중 하나를 골라 이유와 즐기는 요령을 풀어 준다.', rules: ['실제 장소 이름·영업시간·예약을 지어내지 않는다.'] },
  scent: { role: '향 큐레이터. 후보 향 중 하나를 골라 시향할 때의 포인트를 풀어 준다.', rules: ['후보에 없는 향 이름·노트를 지어내지 않는다. 피부·알레르기 판단을 하지 않는다.'] },
  face: { role: '전통 관상에서 착안한 이야기꾼. 손님이 고른 주제와 지금의 표정·분위기로 따뜻한 창작 이야기를 쓴다.', rules: ['이목구비·얼굴형으로 성격·능력·건강·운명을 판정하지 않는다. 표정·옷·분위기만 말한다.', '재미로 보는 창작 이야기임이 드러나게 쓴다.'] },
  couple: { role: '데이트 플래너. 두 사람 사진의 분위기와 각자 고른 답변을 보고 함께 해 볼 데이트를 제안한다.', rules: ['누가 누구인지 추측하지 않는다. 관계의 성공·궁합을 판정하지 않는다.'] },
  'housing-scent': { role: '홈 프래그런스 조향사. 손님이 답한 우리 집 환경(집 형태·함께 사는 사람·햇빛·고민·머무는 곳·원하는 분위기·피하고 싶은 향)을 읽고, 그 집에 가장 잘 맞는 블렌드를 짠다.', rules: ['집의 고민(습기·냄새 등)을 향으로 해결·제거·살균한다고 말하지 않는다. 기분과 분위기를 바꾸는 향으로 말한다.', '건강·수면·치료 효과를 말하지 않는다.', '행사장에 있는 부스·시설·이벤트·경품을 지어내지 않는다(손님이 보는 화면과 영수증에 적힌 것만 말한다).'] },
  'housing-home': { role: '미래 주거 조향사. 손님이 고른 10년 뒤 집 장면과 사진 속 분위기(표정·옷 색)로 그 집에서 보낼 하루를 그리고, 그 집에 어울리는 블렌드를 짠다.', rules: ['특정 정책·상품·회사·가격을 말하지 않는다.', '미래를 예언하지 않는다. 상상해 보는 하루로 쓴다.', '행사장에 있는 부스·시설·이벤트·경품을 지어내지 않는다(손님이 보는 화면과 영수증에 적힌 것만 말한다).'] },
  'housing-mate': { role: '주거 성향 조향사. 성향 후보 중 손님의 답과 가장 잘 맞는 하나를 골라, 어울리는 이웃·공간 이야기와 그 성향의 시그니처 블렌드를 짠다.', rules: ['재미로 보는 성향 이야기다. 사람의 됨됨이를 판정하지 않는다.', '특정 단지·정책의 자격이나 입주를 약속하지 않는다.', '행사장에 있는 부스·시설·이벤트·경품을 지어내지 않는다(손님이 보는 화면과 영수증에 적힌 것만 말한다).'] },
}

/** 어떤 체험에서도 쓰면 안 되는 말 — 들어가면 그 이유를 붙여 다시 받는다 */
const FORBIDDEN: [RegExp, string][] = [
  [/연예인|아이돌|배우 [가-힣]{2,3}|닮았|닮은 사람/, '실존 인물·닮은 사람 언급'],
  [/생명선|수명|단명|장수할|팔자|운명이 정해|재물운/, '손금·운명·수명 판정'],
  [/잘생|못생|뚱뚱|날씬|체형이|살이 쪄|피부색|피부 ?톤|피부결|인종|나이 들어 보|어려 보/, '외모·피부·체형·나이 평가'],
  // 사진 한 장으로 사람의 됨됨이를 단정하지 않는다(2026-10-14 실호출: 손 모양에서 '따뜻한 마음씨가 느껴집니다')
  [/마음씨|마음이 느껴|성품|타고난|기질|성향이|태도가 느껴|성격이에요|성격을 가진|성격이 [가-힣]+(해요|네요|군요)/, '성격·됨됨이 단정'],
  // 팀·커플의 구성이나 궁합을 판정하지 않는다(같은 날 실호출: '함께 새로운 프로젝트를 시작하기에 최적의 구성입니다')
  [/최적의 (구성|조합|팀)|궁합이|천생연분|완벽한 (팀|커플|조합)|잘 맞는 (팀|커플|사이)/, '관계·팀 판정'],
  // 향이 냄새·습기를 없애거나 몸에 효과가 있다고 하지 않는다(주거복지대전 조향 레시피)
  [/살균|항균|탈취|냄새를 (없애|제거|잡아)|숙면|불면|치료|효능|면역력/, '향의 효능·제거 단정'],
]

/** 지시문 — 손님 입력은 따옴표·줄바꿈을 걷어 한 줄로 넣는다(readAiRequest) */
export function buildAiPrompt(req: AiRequest): string {
  const meta = EXPANSION_META[req.id], mode = MODE[req.id]
  const lines = [
    `당신은 키오스크 체험 '${meta.name}'의 ${mode.role}`,
    '',
    '# 입력',
    req.photo ? '- 첨부 사진: 손님이 방금 키오스크 카메라로 찍은 사진이다. 사진에서 실제로 보이는 것(표정, 옷의 색·소재·스타일, 손의 모양, 배경의 빛과 분위기)을 구체적으로 짚어 근거로 쓴다.' : '- 사진 없음: 손님이 사진 없이 하기를 골랐다. 사진 이야기를 지어내지 않는다.',
    req.facts ? `- 기기에서 잰 값: ${req.facts}` : '',
    req.answers.length ? `- 손님의 답변: ${req.answers.map((a) => `${a.label}=${a.value}`).join(' / ')}` : '',
    req.candidates.length ? `- 후보(반드시 이 중 하나를 pick 에 id 로): ${req.candidates.map((c) => `{id: ${c.id}, 이름: ${c.title}, 설명: ${c.summary}}`).join(' ')}` : '',
    req.context ? `- 맥락: ${req.context}` : '',
    ...(req.recipe ? [
      '',
      '# 조향 — 아래 실제 향료 30종 중 최대 둘을 골라 블렌드 레시피(recipe)를 짠다(현장에서 바로 섞을 수 있게 향료는 두 가지까지)',
      catalogForPrompt(),
      `- 주향(비율이 가장 큰 향료)은 반드시 다음 추천 후보 중 하나: ${req.recipe.prefer.join(', ')} (손님 답변으로 매긴 순위, 앞일수록 잘 맞는다).`,
      '- 보통은 두 가지: 주향 + 보조 향료 하나(30종 어디서든, 주향과 어우러져 손님 답변의 분위기를 완성하게, 주향과 다른 향료). 주향 하나만으로 충분하면 한 가지(100)도 된다. 피하고 싶다고 한 계열은 쓰지 않는다. 세 가지 이상은 안 된다.',
      '- ratio 는 정수(%). 두 가지면 각 20~80, 합은 정확히 100. 한 가지면 100. 큰 비율부터 차례로.',
      '- id 는 목록의 표기 그대로(예: AC\'SCENT 07). 목록에 없는 향료·노트·브랜드를 만들지 않는다.',
      '- name 은 이 블렌드의 한국어 이름(2~16자, 예: 햇살 드는 오후의 거실). story 는 이 향이 손님의 집에서 어떤 장면을 만드는지 1~2문장(40~160자).',
    ] : []),
    '',
    '# 규칙',
    '- 한국어 존댓말(~요). 손님에게 직접 말하듯 다정하고 구체적으로.',
    '- 외모 평가(예쁨·잘생김·체형·나이·인종·성별 추정)를 하지 않는다. 실존 인물·연예인을 말하지 않는다. 건강·수명·운명·성격을 판정하지 않는다.',
    '- 사진만 보고 성격·마음씨·속마음을 단정하지 않는다("~한 마음씨가 느껴져요", "~한 성격이에요" 금지). 보이는 것을 말하고, 이야기는 오늘의 제안으로 잇는다.',
    '- 기기에서 잰 값의 숫자(미소 70 같은)를 그대로 옮기지 않는다. 말로 풀어 쓴다.',
    ...mode.rules.map((r) => `- ${r}`),
    req.candidates.length ? '- pick 은 후보 id 중 하나를 글자 그대로. 후보 밖의 상품·이름을 만들지 않는다.' : '- 후보가 없으므로 pick 은 null.',
    '',
    '# 출력 — JSON 하나만',
    `{"pick": ${req.candidates.length ? '"후보 id"' : 'null'}, "headline": "결과 한 줄 제목(30자 이내)", "insight": "왜 이 결과인지 사진·답변을 엮어 2~3문장(90~260자)", "photo": ${req.photo ? '["사진에서 본 것 1(60자 이내)", "사진에서 본 것 2"]' : '[]'}, "tips": ["오늘 해 볼 것 1(60자 이내)", "오늘 해 볼 것 2"]${req.recipe ? ', "recipe": {"name": "블렌드 이름", "story": "이 향이 만드는 장면", "notes": [{"id": "AC\'SCENT ??", "ratio": 60, "reason": "이 향료를 넣은 이유(30자 이내)"}, {"id": "…", "ratio": 40, "reason": "…"}]}' : ''}}`,
  ]
  return lines.filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n')
}

const text = (value: unknown, path: string, max: number, min = 1): string => {
  if (typeof value !== 'string' || value.trim().length < min) throw new Error(`${path} 필드가 비었거나 너무 짧습니다(${min}자 이상).`)
  return value.trim().slice(0, max)
}
const list = (value: unknown, path: string, min: number, max: number, itemMax: number): string[] => {
  const items = Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).map((x) => x.trim().slice(0, itemMax)) : []
  if (items.length < min) throw new Error(`${path} 는 ${min}개 이상이어야 합니다.`)
  return items.slice(0, max)
}

/** 응답(JSON 으로 읽은 것) 검사 — 어긋나면 그 이유를 담은 오류를 던져 다시 받게 한다 */
export function validateAiAnalysis(value: unknown, req: AiRequest): AiAnalysis {
  if (!value || typeof value !== 'object') throw new Error('응답 최상위가 JSON 객체가 아닙니다.')
  const v = value as Record<string, unknown>
  const ids = req.candidates.map((c) => c.id)
  const pick = ids.length ? (typeof v.pick === 'string' && ids.includes(v.pick.trim()) ? v.pick.trim() : null) : null
  if (ids.length && !pick) throw new Error(`pick 은 후보 id(${ids.join(', ')}) 중 하나를 글자 그대로 써야 합니다.`)
  const analysis: AiAnalysis = {
    pick,
    headline: text(v.headline, 'headline', 40, 4),
    insight: text(v.insight, 'insight', 320, 40),
    photo: req.photo ? list(v.photo, 'photo', 1, 3, 80) : [],
    tips: list(v.tips, 'tips', 2, 3, 80),
    ...(req.recipe ? { recipe: validateRecipe(v.recipe, req.recipe.prefer) } : {}),
  }
  const all = [analysis.headline, analysis.insight, ...analysis.photo, ...analysis.tips, ...(analysis.recipe ? [analysis.recipe.name, analysis.recipe.story, ...analysis.recipe.notes.map((n) => n.reason)] : [])].join(' ')
  if (!/[가-힣]/.test(all)) throw new Error('한국어로 써야 합니다.')
  for (const [pattern, why] of FORBIDDEN) if (pattern.test(all)) throw new Error(`규칙 위반(${why}): "${all.match(pattern)?.[0]}" 같은 표현을 빼고 다시 쓰십시오.`)
  return analysis
}

/** 결과에 AI 분석을 맨 앞 절로 넣는다(결과 화면 첫 절·카드·영수증에 그대로 보인다) */
export function applyAiAnalysis(result: ExperienceResult, analysis: AiAnalysis): ExperienceResult {
  const items = [...analysis.photo.map((x) => `사진에서: ${x}`), ...analysis.tips]
  return { ...result, tags: result.tags.includes('AI 분석') ? result.tags : [...result.tags, 'AI 분석'], sections: [{ title: `${AI_SECTION} · ${analysis.headline}`, body: analysis.insight, items }, ...result.sections.filter((s) => !s.title.startsWith(AI_SECTION))] }
}
export const hasAiSection = (result: ExperienceResult) => result.sections.some((s) => s.title.startsWith(AI_SECTION))

/** AI 에 보낼 후보 — 결과의 이름과 요약만 */
export const toCandidates = (results: ExperienceResult[]): AiCandidate[] => results.slice(0, 4).map((r) => ({ id: r.id, title: r.title, summary: r.summary.slice(0, 300) }))
