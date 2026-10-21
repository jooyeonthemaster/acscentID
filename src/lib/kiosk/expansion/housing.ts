// 주거복지대전(2026-12-16, 양재 aT센터)용 키오스크 체험 3종 — 셋 다 끝에 '조향 레시피 영수증'이 나온다(recipe.ts).
//  · housing-scent 우리 집 향 처방 — 사는 집·빛·고민·머무는 곳·원하는 분위기 → 우리 집에 맞는 블렌드
//  · housing-mate  우리 집 성향 향수 — 여덟 문항 → 주거 성향 캐릭터 · 잘 맞는 이웃 · 그 성향의 시그니처 블렌드
//  · housing-home  2036 우리 집의 향 — 사진 한 장 + 미래의 집 장면 → AI 캐리커처 + 그 집의 블렌드(장면·화풍은 image-prompts.ts)
// 답변은 향 계열 가중치(FamilyWeights)가 되어 향료 30종의 순위를 매기고(recipe.ts rankPerfumes), AI 가 그 위쪽에서 주향을 골라 셋을 블렌딩한다.
// 2026-10-21 사용자 지시로 정책 내비게이터를 향 처방으로 바꿨다("키오스크 프로그램은 결국 조향을 위한 것").

import { josa } from './korean'
import { FAMILIES, FAMILY_KO, findPerfume, rankPerfumes, ruleRecipe, type Family, type FamilyWeights, type ScentRecipe } from './recipe'
import type { ExperienceResult } from './types'

export type Answers = Record<string, string | string[]>
export const NO_PHOTO_IDS = ['housing-scent', 'housing-mate'] as const

/** 가중치 더하기 */
function addWeights(into: Record<Family, number>, w: FamilyWeights | undefined, times = 1) {
  for (const f of FAMILIES) into[f] += (w?.[f] ?? 0) * times
}
const zero = (): Record<Family, number> => ({ citrus: 0, floral: 0, woody: 0, musky: 0, fruity: 0, spicy: 0 })

/** 레시피의 계열 그림(6각) — 비율로 섞은 향료 특성, 10점 만점 */
export function recipeMetrics(recipe: ScentRecipe) {
  const mix = zero()
  for (const n of recipe.notes) {
    const p = findPerfume(n.id)
    if (p) for (const f of FAMILIES) mix[f] += (p.characteristics[f] * n.ratio) / 100
  }
  return FAMILIES.map((f) => ({ label: FAMILY_KO[f], value: Math.round(mix[f] * 10) / 10, max: 10 }))
}

/** 레시피가 들어간 결과의 공통 마무리 */
const RECIPE_FOOT = '레시피는 실제 향료 30종 중에서 골랐어요. 피부가 민감하면 시향지로 먼저 맡아 보세요. 입력한 내용은 저장하지 않아요.'

// ───────────────────────── 1. 우리 집 향 처방 ─────────────────────────

interface ScentOption { id: string; label: string; note?: string; w?: FamilyWeights; avoid?: Family }
interface ScentQuestion { key: string; title: string; note?: string; multi?: number; options: ScentOption[] }

export const SCENT_QUESTIONS: ScentQuestion[] = [
  { key: 'home', title: '지금 사는 집은 어떤 곳인가요?', options: [
    { id: 'studio', label: '원룸·오피스텔', note: '한 공간에서 먹고 자고 일해요', w: { citrus: 2, musky: 1 } },
    { id: 'apt', label: '아파트', w: { woody: 1, floral: 1 } },
    { id: 'house', label: '주택·빌라', w: { woody: 2 } },
    { id: 'share', label: '함께 사는 집', note: '공유주택 · 기숙사', w: { citrus: 1, fruity: 1 } },
  ] },
  { key: 'with', title: '누구와 함께 지내나요?', options: [
    { id: 'alone', label: '혼자 지내요', w: { musky: 1 } },
    { id: 'two', label: '둘이 지내요', w: { floral: 1 } },
    { id: 'kids', label: '아이와 가족이 함께', w: { fruity: 1, citrus: 1 } },
    { id: 'pet', label: '반려동물과 함께', w: { citrus: 2, woody: 1 } },
  ] },
  { key: 'light', title: '우리 집에 햇빛은 어떻게 들어요?', options: [
    { id: 'bright', label: '하루 종일 환해요', w: { citrus: 1, floral: 1 } },
    { id: 'morning', label: '오전에 해가 들어요', w: { citrus: 2 } },
    { id: 'evening', label: '오후·저녁에 해가 들어요', w: { woody: 1, musky: 1 } },
    { id: 'dim', label: '해가 잘 안 들어요', w: { citrus: 2, spicy: 1 } },
  ] },
  { key: 'worry', title: '우리 집의 작은 고민은요?', note: '두 개까지 고를 수 있어요.', multi: 2, options: [
    { id: 'damp', label: '습하고 눅눅해요', w: { citrus: 2, woody: 2 } },
    { id: 'cook', label: '요리 냄새가 오래 남아요', w: { citrus: 3, spicy: 1 } },
    { id: 'pet', label: '반려동물 냄새가 신경 쓰여요', w: { citrus: 2, woody: 1 } },
    { id: 'stuffy', label: '답답하고 환기가 어려워요', w: { citrus: 2, spicy: 1 } },
    { id: 'stress', label: '소음·스트레스가 많아요', w: { musky: 2, woody: 1, floral: 1 } },
    { id: 'none', label: '특별한 고민은 없어요' },
  ] },
  { key: 'stay', title: '집에서 가장 오래 머무는 곳은?', options: [
    { id: 'living', label: '거실', note: '쉬고 이야기하는 곳', w: { floral: 1, fruity: 1 } },
    { id: 'bed', label: '침실', note: '잠들고 깨는 곳', w: { musky: 2, woody: 1 } },
    { id: 'desk', label: '작업·공부 공간', w: { citrus: 2, spicy: 1 } },
    { id: 'kitchen', label: '주방·식탁', w: { citrus: 2, fruity: 1 } },
  ] },
  { key: 'mood', title: '집에서 어떤 기분이고 싶나요?', options: [
    { id: 'rest', label: '깊은 휴식', w: { musky: 3, woody: 2 } },
    { id: 'focus', label: '또렷한 집중', w: { citrus: 3, spicy: 2 } },
    { id: 'fresh', label: '상쾌한 활기', w: { citrus: 3, fruity: 2 } },
    { id: 'warm', label: '포근한 온기', w: { musky: 2, woody: 2, floral: 1 } },
    { id: 'guest', label: '손님맞이', note: '들어서자마자 좋은 향', w: { floral: 3, fruity: 2 } },
  ] },
  { key: 'avoid', title: '피하고 싶은 향이 있나요?', note: '두 개까지 고를 수 있어요.', multi: 2, options: [
    { id: 'sweet', label: '달콤한 과일 향', avoid: 'fruity' },
    { id: 'flower', label: '진한 꽃 향', avoid: 'floral' },
    { id: 'spice', label: '맵싸한 향', avoid: 'spicy' },
    { id: 'none', label: '다 괜찮아요' },
  ] },
]

const picks = (a: Answers, key: string) => { const v = a[key]; return Array.isArray(v) ? v : v ? [v] : [] }
const scentOption = (key: string, id: string) => SCENT_QUESTIONS.find((q) => q.key === key)?.options.find((o) => o.id === id)

/** 답변 → 계열 가중치와 피할 계열 */
export function scentWeights(a: Answers): { weights: Record<Family, number>; avoid: Family[] } {
  const weights = zero()
  const avoid: Family[] = []
  for (const q of SCENT_QUESTIONS) for (const id of picks(a, q.key)) {
    const o = scentOption(q.key, id)
    // 원하는 분위기가 가장 크게 — 두 배
    addWeights(weights, o?.w, q.key === 'mood' ? 2 : 1)
    if (o?.avoid) avoid.push(o.avoid)
  }
  return { weights, avoid }
}

export const scentRanked = (a: Answers) => { const { weights, avoid } = scentWeights(a); return rankPerfumes(weights, avoid) }

export function scentSummary(a: Answers): { label: string; value: string }[] {
  return SCENT_QUESTIONS.map((q) => ({ label: q.title.replace(/[?？]$/, ''), value: picks(a, q.key).map((id) => scentOption(q.key, id)?.label ?? id).join(', ') }))
}

/** 두는 곳 · 쓰는 법 — 머무는 곳과 고민에서(규칙) */
function placement(a: Answers): string[] {
  const stay = picks(a, 'stay')[0]
  const worry = picks(a, 'worry')
  const out = [
    stay === 'bed' ? '침실은 잠들기 30분 전에 베개에서 먼 곳에 한두 번 뿌려 주세요.' : stay === 'desk' ? '책상 옆 공기에 한 번 — 집중이 필요할 때 시작 신호로 써 보세요.' : stay === 'kitchen' ? '요리를 마치고 환기한 뒤 식탁 근처에 가볍게 뿌려 주세요.' : '현관과 거실 사이에 두면 들어서는 순간 우리 집 향이 반겨 줘요.',
  ]
  if (worry.includes('damp')) out.push('습한 날은 창을 잠깐 열어 환기한 뒤에 쓰면 향이 더 맑게 남아요.')
  if (worry.includes('pet')) out.push('반려동물이 직접 닿지 않는 높은 곳에서 써 주세요.')
  if (worry.includes('stress')) out.push('퇴근 후 집에 오자마자 한 번 — 하루를 끄는 의식처럼 써 보세요.')
  return out.slice(0, 3)
}

export function scentResult(a: Answers, recipe: ScentRecipe): ExperienceResult {
  return {
    id: 'housing-scent',
    title: recipe.name,
    subtitle: '우리 집 향 처방',
    summary: recipe.story,
    tags: ['우리집향', ...recipe.notes.map((n) => n.name.replace(/\s/g, '')), '주거복지대전'],
    metrics: recipeMetrics(recipe),
    recipe,
    sections: [
      { title: '이렇게 써 보세요', body: '우리 집에서 향을 가장 잘 느끼는 방법이에요.', items: placement(a) },
      { title: '우리 집 진단', body: '답해 주신 우리 집이에요.', items: scentSummary(a).map((x) => `${x.label}: ${x.value}`) },
    ],
    footnote: RECIPE_FOOT,
  }
}

/** AI 를 건너뛰었을 때의 기본 레시피 */
export const scentRuleRecipe = (a: Answers) => ruleRecipe(scentRanked(a), '우리 집 기본 블렌드', '답해 주신 우리 집 환경에서 가장 잘 맞는 향료 셋을 골라 섞은 기본 레시피예요.')

// ───────────────────────── 2. 우리 집 성향 향수 ─────────────────────────

export const MATE_TYPES = ['lounge', 'garden', 'smart', 'maker', 'quiet', 'family'] as const
export type MateType = (typeof MATE_TYPES)[number]
type Points = Partial<Record<MateType, number>>

interface MateOption { id: string; label: string; note?: string; points: Points; axes?: Partial<Record<MateAxis, number>> }
interface MateQuestion { key: string; title: string; options: MateOption[] }
export type MateAxis = 'together' | 'nature' | 'tech' | 'care'
export const MATE_AXES: Record<MateAxis, string> = { together: '함께 지내기', nature: '자연과 쉼', tech: '스마트 기술', care: '서로 돌봄' }

export const MATE_QUESTIONS: MateQuestion[] = [
  { key: 'evening', title: '하루를 마치고 집에 오면 가장 하고 싶은 것은?', options: [
    { id: 'tea', label: '이웃과 차 한잔하며 수다', points: { lounge: 3, family: 1 }, axes: { together: 3 } },
    { id: 'walk', label: '텃밭이나 동네 산책', points: { garden: 3, quiet: 1 }, axes: { nature: 3 } },
    { id: 'rest', label: '혼자 영화 보며 푹 쉬기', points: { smart: 2, quiet: 2 }, axes: { tech: 1, nature: 1 } },
    { id: 'make', label: '무언가 만들거나 고치기', points: { maker: 3 }, axes: { tech: 1, together: 1 } },
  ] },
  { key: 'space', title: '단지 안에 함께 쓰는 공간이 하나 생긴다면?', options: [
    { id: 'kitchen', label: '함께 요리하는 공유 주방', points: { lounge: 3, family: 1 }, axes: { together: 3 } },
    { id: 'roof', label: '옥상 정원과 텃밭', points: { garden: 3 }, axes: { nature: 3 } },
    { id: 'studio', label: '공구가 있는 공방·작업실', points: { maker: 3 }, axes: { together: 1, tech: 1 } },
    { id: 'kids', label: '아이들이 노는 돌봄 놀이방', points: { family: 3 }, axes: { care: 3 } },
  ] },
  { key: 'neighbor', title: '이웃과는 어느 정도가 편한가요?', options: [
    { id: 'friend', label: '이름 부르며 지내는 사이', points: { lounge: 2, family: 2 }, axes: { together: 2, care: 1 } },
    { id: 'greet', label: '반갑게 인사하는 사이', points: { garden: 2, maker: 1 }, axes: { together: 1 } },
    { id: 'need', label: '필요할 때 돕는 사이', points: { quiet: 2, family: 1 }, axes: { care: 2 } },
    { id: 'self', label: '각자의 공간이 확실한 사이', points: { smart: 3, quiet: 1 }, axes: { tech: 1 } },
  ] },
  { key: 'tech', title: '우리 집에 꼭 있었으면 하는 기술은?', options: [
    { id: 'voice', label: '말로 켜고 끄는 스마트홈', points: { smart: 3 }, axes: { tech: 3 } },
    { id: 'safe', label: '혼자 있을 때 안부를 살피는 센서', points: { family: 1, quiet: 2 }, axes: { care: 3, tech: 1 } },
    { id: 'energy', label: '햇빛으로 전기를 만드는 지붕', points: { garden: 2, maker: 1 }, axes: { nature: 2, tech: 1 } },
    { id: 'none', label: '기술보다 손때 묻은 살림', points: { maker: 1, quiet: 2 }, axes: { nature: 1 } },
  ] },
  { key: 'weekend', title: '주말 아침, 가장 끌리는 풍경은?', options: [
    { id: 'market', label: '단지 안 벼룩시장', points: { lounge: 2, maker: 2 }, axes: { together: 2 } },
    { id: 'forest', label: '창밖으로 보이는 숲', points: { quiet: 3, garden: 1 }, axes: { nature: 3 } },
    { id: 'cafe', label: '집 앞 작은 카페와 서점', points: { smart: 2, lounge: 1 }, axes: { together: 1 } },
    { id: 'play', label: '아이들 웃음소리 나는 놀이터', points: { family: 3 }, axes: { care: 2, together: 1 } },
  ] },
  { key: 'help', title: '이웃을 도울 수 있다면 무엇으로?', options: [
    { id: 'cook', label: '반찬을 나눠요', points: { lounge: 2, family: 1 }, axes: { care: 2, together: 1 } },
    { id: 'fix', label: '고장 난 것을 고쳐 줘요', points: { maker: 3 }, axes: { care: 1, tech: 1 } },
    { id: 'teach', label: '휴대폰·키오스크 쓰는 법을 알려 줘요', points: { smart: 2, lounge: 1 }, axes: { tech: 2, care: 1 } },
    { id: 'plant', label: '화분과 텃밭을 돌봐 줘요', points: { garden: 3 }, axes: { nature: 2, care: 1 } },
  ] },
  { key: 'future', title: '10년 뒤 우리 집에 바라는 것은?', options: [
    { id: 'gen', label: '여러 세대가 어울려 사는 단지', points: { lounge: 1, family: 2, garden: 1 }, axes: { together: 2, care: 2 } },
    { id: 'small', label: '작아도 똑똑하게 꾸민 내 공간', points: { smart: 3 }, axes: { tech: 2 } },
    { id: 'green', label: '자연 가까이, 조용한 동네', points: { quiet: 2, garden: 2 }, axes: { nature: 3 } },
    { id: 'work', label: '집 가까이 일하고 배우는 공간', points: { maker: 2, smart: 1 }, axes: { together: 1, tech: 1 } },
  ] },
  { key: 'word', title: '우리 집을 한 단어로 고른다면?', options: [
    { id: 'warm', label: '사랑방', points: { lounge: 2, family: 1 }, axes: { together: 2 } },
    { id: 'nest', label: '둥지', points: { family: 2, quiet: 1 }, axes: { care: 2 } },
    { id: 'lab', label: '실험실', points: { maker: 2, smart: 1 }, axes: { tech: 2 } },
    { id: 'forest', label: '숲속 오두막', points: { quiet: 2, garden: 1 }, axes: { nature: 2 } },
  ] },
]

interface MateProfile {
  name: string
  tagline: string
  body: string
  /** 잘 맞는 이웃 — 다른 성향(다른 세대와 어울리는 짝) */
  match: MateType
  matchWhy: string
  /** 어울리는 주거 모델 */
  homes: string[]
  /** 오늘 해 볼 것 */
  try: string
  /** 이 성향의 시그니처 향 — 계열 가중치 */
  scent: FamilyWeights
}

export const MATE_PROFILES: Record<MateType, MateProfile> = {
  lounge: {
    name: '공유 라운지 사교형', tagline: '함께 밥 먹을 때 집이 완성되는 사람',
    body: '복도에서 만난 이웃과 인사를 넘어 수다로 이어지는 집이 편한 성향이에요. 공유 주방·라운지가 있는 단지에서 빛나요.',
    match: 'garden', matchWhy: '텃밭에서 키운 채소를 공유 주방으로 가져오는 이웃과 만나면 식탁이 풍성해져요.',
    homes: ['공유 주방·라운지가 있는 청년·공유주택', '커뮤니티 시설이 많은 공공임대 단지'], try: '이번 주에 이웃 한 명에게 먼저 인사를 건네 보세요.',
    scent: { fruity: 3, citrus: 2, floral: 1 },
  },
  garden: {
    name: '텃밭 돌봄형', tagline: '흙을 만지며 동네를 가꾸는 사람',
    body: '옥상 정원·공동 텃밭처럼 함께 가꾸는 공간에서 이웃과 천천히 가까워지는 성향이에요. 여러 세대가 섞여 사는 단지와 잘 맞아요.',
    match: 'smart', matchWhy: '스마트 센서로 물 주기를 챙겨 줄 이웃과 만나면 텃밭이 쉬워져요 — 세대를 잇는 짝이에요.',
    homes: ['공동 텃밭·옥상 정원이 있는 세대통합형 단지', '마을 공동체가 있는 공공주택'], try: '창가에 작은 화분 하나를 들여 보세요.',
    scent: { floral: 2, citrus: 2, woody: 1 },
  },
  smart: {
    name: '스마트 혼자살이형', tagline: '작아도 똑똑한 내 공간을 아끼는 사람',
    body: '내 공간이 분명하고, 기술로 살림을 가볍게 만드는 걸 즐기는 성향이에요. 스마트홈 기능이 들어간 1인 주거와 잘 맞아요.',
    match: 'garden', matchWhy: '흙과 계절을 아는 이웃과 만나면 화면 밖의 즐거움이 하나 늘어요.',
    homes: ['스마트홈 IoT가 들어간 청년 주택·1인 주거', '역세권 소형 공공임대'], try: '자주 쓰는 집안일 하나를 예약 기능으로 바꿔 보세요.',
    scent: { citrus: 3, musky: 2 },
  },
  maker: {
    name: '동네 메이커형', tagline: '고치고 만들며 이웃을 돕는 사람',
    body: '공구 하나로 동네의 불편을 해결하는 성향이에요. 공방·작업실처럼 함께 만드는 공간이 있는 단지에서 이웃의 든든한 해결사가 돼요.',
    match: 'family', matchWhy: '아이 장난감과 가구를 고쳐 줄 메이커는 아이 키우는 이웃에게 큰 힘이 돼요.',
    homes: ['공방·공유 작업실이 있는 공동체 주택', '일터와 가까운 일자리 연계형 주택'], try: '집에서 미뤄 둔 작은 수리 하나를 해 보세요.',
    scent: { woody: 3, spicy: 2 },
  },
  quiet: {
    name: '조용한 숲세권형', tagline: '자연 가까이 쉼을 아는 사람',
    body: '창밖의 나무와 고요한 아침이 하루를 지켜 주는 성향이에요. 필요할 때 서로 살피되 각자의 쉼을 존중하는 동네와 잘 맞아요.',
    match: 'lounge', matchWhy: '가끔 문을 두드려 차 한잔 나누는 이웃이 있으면 고요함이 외로움이 되지 않아요.',
    homes: ['녹지가 가까운 공공주택', '안부 확인 서비스가 있는 단지'], try: '오늘 저녁 10분, 화면을 끄고 창밖을 바라보세요.',
    scent: { woody: 3, musky: 2 },
  },
  family: {
    name: '품앗이 육아형', tagline: '아이도 이웃도 함께 키우는 사람',
    body: '아이를 같이 돌보고 반찬을 나누는 품앗이가 자연스러운 성향이에요. 돌봄 시설과 놀이터가 가까운 단지에서 마음이 놓여요.',
    match: 'maker', matchWhy: '고장 난 자전거를 고쳐 주는 이웃과 만나면 아이 키우기가 한결 수월해져요.',
    homes: ['공동육아 나눔터가 있는 신혼·가족 단지', '돌봄 시설이 함께 있는 공공주택'], try: '이웃과 아이 책 한 권을 바꿔 읽어 보세요.',
    scent: { musky: 2, floral: 2, fruity: 1 },
  },
}

export function mateScores(a: Answers): { type: Record<MateType, number>; axes: Record<MateAxis, number> } {
  const type = Object.fromEntries(MATE_TYPES.map((t) => [t, 0])) as Record<MateType, number>
  const axes: Record<MateAxis, number> = { together: 0, nature: 0, tech: 0, care: 0 }
  for (const q of MATE_QUESTIONS) {
    const option = q.options.find((o) => o.id === a[q.key])
    if (!option) continue
    for (const [t, n] of Object.entries(option.points) as [MateType, number][]) type[t] += n
    for (const [axis, n] of Object.entries(option.axes ?? {}) as [MateAxis, number][]) axes[axis] += n
  }
  return { type, axes }
}

/** 점수 순 성향 — 동점이면 MATE_TYPES 순서 */
export function rankMates(a: Answers): MateType[] {
  const { type } = mateScores(a)
  return [...MATE_TYPES].sort((x, y) => type[y] - type[x] || MATE_TYPES.indexOf(x) - MATE_TYPES.indexOf(y))
}

/** 성향 → 향료 순위(그 성향의 시그니처 가중치 + 답에서 나온 축 조금) */
export function mateRanked(type: MateType) {
  return rankPerfumes(MATE_PROFILES[type].scent)
}
export const mateRuleRecipe = (type: MateType) => ruleRecipe(mateRanked(type), `${MATE_PROFILES[type].name.split(' ')[0]} 블렌드`, `${MATE_PROFILES[type].tagline}에게 어울리는 향료 셋을 골라 섞은 기본 레시피예요.`)

export function mateResult(a: Answers, pick: MateType | undefined, recipe: ScentRecipe): ExperienceResult {
  const ranked = rankMates(a)
  const type = pick && MATE_TYPES.includes(pick) ? pick : ranked[0]
  const p = MATE_PROFILES[type]
  const partner = MATE_PROFILES[p.match]
  const { axes } = mateScores(a)
  const top = Math.max(6, ...Object.values(axes))
  return {
    id: type,
    title: p.name,
    subtitle: p.tagline,
    summary: p.body,
    tags: ['우리집성향', p.name.replace(/\s/g, ''), ...recipe.notes.slice(0, 2).map((n) => n.name.replace(/\s/g, ''))],
    recipe,
    metrics: (Object.keys(MATE_AXES) as MateAxis[]).map((axis) => ({ label: MATE_AXES[axis], value: Math.round((axes[axis] / top) * 10), max: 10 })),
    // 레시피가 있는 영수증은 절 둘(AI 분석 + 하나)까지라 스탬프 랠리를 맨 앞에 둔다 — 도장 칸이 종이에 있어야 한다
    sections: [
      { title: '스탬프 랠리', body: '이 영수증을 들고 행사장 다른 부스를 둘러보세요. 아래 빈칸에 부스 도장을 모아 보세요.', items: ['(                                  )', '(                                  )', '(                                  )'] },
      { title: `잘 맞는 이웃 · ${partner.name}`, body: p.matchWhy },
      { title: '어울리는 우리 집', body: `${josa(p.name, '은/는')} 이런 주거 모델에서 편안해요.`, items: p.homes },
      { title: '오늘 해 볼 것', body: p.try },
    ],
    footnote: `재미로 보는 성향 테스트예요. ${RECIPE_FOOT}`,
  }
}

export function mateCandidates(a: Answers) {
  return rankMates(a).slice(0, 3).map((t) => ({ id: t, title: MATE_PROFILES[t].name, summary: `${MATE_PROFILES[t].tagline}. ${MATE_PROFILES[t].body}` }))
}

export function mateSummary(a: Answers): { label: string; value: string }[] {
  return MATE_QUESTIONS.map((q) => ({ label: q.title.replace(/[?？]$/, ''), value: q.options.find((o) => o.id === a[q.key])?.label ?? '' }))
}

// ───────────────────────── 3. 2036 우리 집의 향 ─────────────────────────

export const HOME_SCENES = {
  smart: { label: '스마트홈 거실', note: '말로 켜는 조명 · 도우미 로봇', story: '목소리 한마디로 불이 켜지고, 작은 도우미 로봇이 하루를 반겨 주는 거실', scent: { citrus: 3, musky: 2, woody: 1 } as FamilyWeights },
  share: { label: '세대공존 공유주택', note: '함께 쓰는 마당 · 텃밭 벤치', story: '여러 세대가 함께 가꾸는 텃밭과 마당 벤치가 있는 공유주택', scent: { floral: 2, fruity: 2, citrus: 1 } as FamilyWeights },
  care: { label: '고령친화 우리 집', note: '문턱 없는 집 · 안전 손잡이', story: '문턱이 없고 손잡이와 넓은 문이 있어 누구나 편하게 다니는 집', scent: { woody: 3, musky: 2, floral: 1 } as FamilyWeights },
  youth: { label: '청년 스마트 원룸', note: '복층 침대 · 창가 책상', story: '작지만 복층 침대와 창가 책상으로 알차게 꾸민 청년의 원룸', scent: { citrus: 3, spicy: 2, woody: 1 } as FamilyWeights },
} as const
export type HomeScene = keyof typeof HOME_SCENES
export const HOME_STYLES = { line: { label: '선화', note: '영수증에 가장 또렷하게 나와요' }, color: { label: '수채 일러스트', note: '휴대폰으로 받을 때 예뻐요' } } as const
export type HomeStyle = keyof typeof HOME_STYLES

export const homeRanked = (scene: HomeScene) => rankPerfumes(HOME_SCENES[scene].scent)
export const homeRuleRecipe = (scene: HomeScene) => ruleRecipe(homeRanked(scene), `2036 ${HOME_SCENES[scene].label}`, `10년 뒤 ${HOME_SCENES[scene].story}에 어울리는 향료 셋을 골라 섞은 기본 레시피예요.`)

export function homeResult(scene: HomeScene, style: HomeStyle, recipe: ScentRecipe): ExperienceResult {
  const s = HOME_SCENES[scene]
  return {
    id: `${scene}-${style}`,
    title: recipe.name,
    subtitle: `2036, ${s.label}의 향`,
    summary: recipe.story,
    tags: ['2036우리집', s.label.replace(/\s/g, ''), ...recipe.notes.slice(0, 2).map((n) => n.name.replace(/\s/g, ''))],
    metrics: recipeMetrics(recipe),
    recipe,
    sections: [{ title: '그림 속 우리 집', body: `10년 뒤 ${s.story}에서 지내는 나를 ${HOME_STYLES[style].label}로 그렸어요. ${s.note}.` }],
    footnote: `사진은 그림을 만드는 데만 쓰고 저장하지 않아요. ${RECIPE_FOOT}`,
  }
}
