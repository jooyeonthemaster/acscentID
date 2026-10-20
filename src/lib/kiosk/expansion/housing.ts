// 주거복지대전(2026-12-16, 양재 aT센터)용 키오스크 체험 3종 — 데이터와 규칙(DOM·네트워크 없음 · 시험 가능).
//  · housing-navi  주거복지 내비게이터 — 몇 가지 답 → 규칙표로 알아볼 만한 정책을 고른다(AI 는 고른 것 안에서 풀어 쓰기만)
//  · housing-mate  우리 집 성향 테스트 — 여덟 문항 → 주거 성향 캐릭터 · 잘 맞는 이웃 · 어울리는 주거 모델
//  · housing-home  2036 우리 집의 나 — 사진 한 장 + 미래의 집 장면 → AI 캐리커처(장면·화풍은 image-prompts.ts)
//
// ⚠️ 정책 자격은 해마다 바뀐다. 여기의 정책 이름·대상·신청처는 '알아볼 곳을 짚어 주는' 안내용 초안이며 금액·소득 기준 숫자는 일부러 넣지 않았다.
//    행사 전에 LH·HUG·국토부 담당자 검수를 받는다(docs/kiosk-housing.md '검수').

import { josa } from './korean'
import type { ExperienceResult, Question } from './types'

export type Answers = Record<string, string | string[]>
export const NO_PHOTO_IDS = ['housing-navi', 'housing-mate'] as const

// ───────────────────────── 1. 주거복지 내비게이터 ─────────────────────────

export const NAVI_QUESTIONS: Question[] = [
  { key: 'age', title: '나이대를 골라 주세요', type: 'single', required: true, options: [
    { id: 'youth', label: '만 19~34세', note: '청년' },
    { id: 'middle', label: '만 35~64세' },
    { id: 'senior', label: '만 65세 이상', note: '어르신' },
  ] },
  { key: 'family', title: '누구와 함께 살고 있나요?', note: '앞으로 함께 살 예정이어도 괜찮아요.', type: 'single', required: true, options: [
    { id: 'single', label: '혼자 살아요' },
    { id: 'newlywed', label: '신혼부부예요', note: '결혼 7년 이내 · 예비 부부' },
    { id: 'baby', label: '아기가 있어요', note: '최근 2년 안에 태어난 아이' },
    { id: 'kids', label: '자녀가 있어요', note: '미성년 자녀' },
    { id: 'family', label: '부모님·가족과 함께' },
  ] },
  { key: 'home', title: '지금 사는 집은요?', type: 'single', required: true, options: [
    { id: 'monthly', label: '월세' },
    { id: 'jeonse', label: '전세' },
    { id: 'own', label: '내 집(자가)' },
    { id: 'parents', label: '부모님 집 등', note: '따로 내는 주거비가 거의 없어요' },
  ] },
  { key: 'owner', title: '세대원 모두 집이 없나요?', note: '집을 가지고 있는지에 따라 받을 수 있는 정책이 크게 달라요.', type: 'single', required: true, options: [
    { id: 'none', label: '네, 모두 무주택이에요' },
    { id: 'has', label: '집이 있어요' },
    { id: 'unsure', label: '잘 모르겠어요' },
  ] },
  { key: 'income', title: '가구 소득은 대략 어느 쪽인가요?', note: '정확한 금액은 묻지 않아요. 비슷한 쪽을 골라 주세요.', type: 'single', required: true, options: [
    { id: 'low', label: '생활이 많이 빠듯해요', note: '기초생활 · 차상위 가까이' },
    { id: 'lower', label: '평균보다 낮은 편' },
    { id: 'mid', label: '평균쯤' },
    { id: 'high', label: '평균보다 높은 편' },
  ] },
  { key: 'need', title: '가장 도움받고 싶은 것은?', note: '두 개까지 고를 수 있어요.', type: 'multi', max: 2, required: true, options: [
    { id: 'rent', label: '월세·전세 부담 줄이기' },
    { id: 'buy', label: '내 집 마련' },
    { id: 'public', label: '공공임대 들어가기' },
    { id: 'repair', label: '집 고치기·살기 편한 집' },
    { id: 'deposit', label: '전세 보증금 지키기' },
    { id: 'care', label: '돌봄이 있는 집' },
  ] },
]

const LABEL = (key: string, id: string) => NAVI_QUESTIONS.find((q) => q.key === key)?.options?.find((o) => o.id === id)?.label ?? id

interface Policy {
  id: string
  name: string
  /** 한 줄 소개(카드 요약·AI 후보 설명) */
  summary: string
  who: string
  where: string
  /** 0 이면 해당 없음. 높을수록 먼저 */
  score: (a: NaviView) => number
  /** 왜 짚었는지 — 손님 답에서 */
  why: (a: NaviView) => string
}

interface NaviView {
  age: string
  family: string
  home: string
  owner: string
  income: string
  need: string[]
  noHome: boolean
  /** 소득이 평균 이하(높은 편이 아니다) */
  modest: boolean
}

/** 해시태그용 짧은 이름 — 띄어쓰기 없이 */
const POLICY_TAG: Record<string, string> = {
  'youth-rent': '청년월세', beotimmok: '버팀목전세', 'youth-deposit-loan': '청년전용대출', didimdol: '디딤돌대출',
  'newborn-loan': '신생아특례', 'newlywed-rental': '신혼매입임대', 'happy-house': '행복주택', 'integrated-rental': '통합공공임대',
  'housing-benefit': '주거급여', 'senior-house': '고령자복지주택', repair: '집수리지원', 'deposit-guarantee': '전세보증',
  'care-home': '주거돌봄',
}

const MYHOME = '마이홈포털(myhome.go.kr) · 마이홈 상담센터 1600-1004'
const FUND = '주택도시기금(enhuf.molit.go.kr) · 기금 수탁은행'

export const POLICIES: Policy[] = [
  {
    id: 'youth-rent', name: '청년 월세 지원', summary: '부모님과 따로 사는 무주택 청년의 월세 부담을 덜어 주는 지원',
    who: '부모와 따로 사는 무주택 청년(소득·재산 기준 있음)', where: '복지로 · 주소지 행정복지센터 · ' + MYHOME,
    score: (a) => a.age === 'youth' && a.home === 'monthly' && a.noHome && a.modest ? 9 + (a.need.includes('rent') ? 3 : 0) : 0,
    why: () => '청년이고 월세로 살고 있다고 하셨어요.',
  },
  {
    id: 'beotimmok', name: '버팀목 전세자금 대출', summary: '무주택 세대주의 전세 보증금을 낮은 금리로 빌려주는 주택도시기금 대출',
    who: '무주택 세대주(소득·자산 기준 있음) · 청년·신혼부부 전용 상품도 있어요', where: FUND,
    score: (a) => a.noHome && a.modest && (a.home === 'jeonse' || a.home === 'monthly' || a.need.includes('rent')) ? 6 + (a.home === 'jeonse' ? 2 : 0) + (a.need.includes('rent') ? 2 : 0) : 0,
    why: (a) => a.home === 'jeonse' ? '전세로 살고 있고 집이 없다고 하셨어요.' : '집이 없고 주거비 부담을 줄이고 싶다고 하셨어요.',
  },
  {
    id: 'youth-deposit-loan', name: '청년 전용 보증부월세·전세 대출', summary: '청년의 보증금과 월세 부담을 함께 덜어 주는 전용 대출',
    who: '무주택 청년 세대주(나이·소득 기준 있음)', where: FUND,
    score: (a) => a.age === 'youth' && a.noHome && a.modest && (a.home === 'monthly' || a.home === 'jeonse' || a.home === 'parents') ? 7 + (a.need.includes('rent') ? 2 : 0) : 0,
    why: () => '청년이고 집이 없다고 하셨어요.',
  },
  {
    id: 'didimdol', name: '내 집 마련 디딤돌 대출', summary: '무주택 서민의 첫 집 구입을 낮은 금리로 돕는 주택도시기금 대출',
    who: '무주택 세대주(소득·주택 가격 기준 있음) · 신혼부부·자녀 가구는 우대', where: FUND,
    score: (a) => a.noHome && a.income !== 'low' && (a.need.includes('buy') || a.family === 'newlywed') ? 6 + (a.need.includes('buy') ? 4 : 0) + (a.family === 'newlywed' || a.family === 'kids' ? 1 : 0) : 0,
    why: (a) => a.need.includes('buy') ? '내 집 마련을 생각하고 있다고 하셨어요.' : '신혼부부라고 하셨어요.',
  },
  {
    id: 'newborn-loan', name: '신생아 특례 대출(구입·전세)', summary: '최근 아이를 낳은 무주택 가구의 집 구입·전세 자금을 돕는 특례 대출',
    who: '대출 신청일 기준 2년 안에 출산한 무주택 가구(소득·주택 가격 기준 있음)', where: FUND,
    score: (a) => a.family === 'baby' && a.noHome ? 10 + (a.need.includes('buy') || a.need.includes('rent') ? 2 : 0) : 0,
    why: () => '최근 2년 안에 아기가 태어났다고 하셨어요.',
  },
  {
    id: 'newlywed-rental', name: '신혼·신생아 매입임대 · 전세임대', summary: 'LH가 사들이거나 빌린 집을 신혼부부·아이 가구에 시세보다 낮게 빌려주는 임대',
    who: '무주택 신혼부부 · 예비부부 · 아이를 키우는 가구(소득·자산 기준 있음)', where: 'LH청약플러스(apply.lh.or.kr) · LH 콜센터 1600-1004',
    score: (a) => (a.family === 'newlywed' || a.family === 'baby') && a.noHome && a.modest ? 8 + (a.need.includes('public') || a.need.includes('rent') ? 2 : 0) : 0,
    why: (a) => `${a.family === 'baby' ? '아기를 키우는' : '신혼'} 무주택 가구라고 하셨어요.`,
  },
  {
    id: 'happy-house', name: '행복주택', summary: '청년·신혼부부·고령자 등이 교통이 편한 곳에서 시세보다 낮게 사는 공공임대',
    who: '무주택 청년 · 신혼부부 · 고령자 · 주거급여 수급자 등(계층별 기준 있음)', where: 'LH청약플러스(apply.lh.or.kr) · 지역 공사 · ' + MYHOME,
    score: (a) => a.noHome && a.modest && (a.age === 'youth' || a.age === 'senior' || a.family === 'newlywed' || a.family === 'baby') ? 6 + (a.need.includes('public') ? 4 : 0) : 0,
    why: (a) => a.age === 'youth' ? '청년 무주택이라고 하셨어요.' : a.age === 'senior' ? '어르신 무주택 가구라고 하셨어요.' : '신혼·아이 가구로 집이 없다고 하셨어요.',
  },
  {
    id: 'integrated-rental', name: '통합공공임대주택', summary: '소득에 따라 임대료를 달리 내며 오래 살 수 있는 공공임대(국민·영구·행복주택을 하나로)',
    who: '무주택 가구(소득·자산 기준 있음)', where: 'LH청약플러스(apply.lh.or.kr) · ' + MYHOME,
    score: (a) => a.noHome && a.income !== 'high' ? 5 + (a.need.includes('public') ? 4 : 0) + (a.income === 'low' || a.income === 'lower' ? 1 : 0) : 0,
    why: () => '집이 없고 오래 살 집을 찾고 있다고 하셨어요.',
  },
  {
    id: 'housing-benefit', name: '주거급여', summary: '소득이 낮은 가구에 월세(임차급여)를 지원하거나 내 집 수리(수선유지급여)를 돕는 제도',
    who: '소득이 낮은 가구(소득인정액 기준 있음) · 세입자는 임차급여, 집주인은 수선유지급여', where: '주소지 행정복지센터 · 복지로(bokjiro.go.kr)',
    score: (a) => a.income === 'low' ? 10 + (a.need.includes('rent') || a.need.includes('repair') ? 2 : 0) : 0,
    why: (a) => a.home === 'own' ? '생활이 빠듯하고 집을 가지고 있다고 하셨어요 — 수리를 돕는 수선유지급여가 있어요.' : '생활이 빠듯하다고 하셨어요.',
  },
  {
    id: 'senior-house', name: '고령자 복지주택', summary: '어르신을 위한 무장애 설계 임대주택에 돌봄·건강·여가 시설을 함께 둔 집',
    who: '만 65세 이상 무주택 어르신(소득 기준 있음)', where: 'LH청약플러스(apply.lh.or.kr) · 지역 지자체',
    score: (a) => a.age === 'senior' && a.noHome && a.modest ? 8 + (a.need.includes('care') || a.need.includes('public') ? 3 : 0) : 0,
    why: () => '어르신 무주택 가구라고 하셨어요.',
  },
  {
    id: 'repair', name: '집수리·주거환경 개선 지원', summary: '오래된 집의 단열·안전·편의 시설 고치기를 돕는 지자체·공공기관 사업',
    who: '지자체·사업마다 달라요(취약계층 · 노후 주택 · 어르신 가구 등)', where: '주소지 행정복지센터 · 지역 주거복지센터 · ' + MYHOME,
    score: (a) => a.need.includes('repair') || (a.age === 'senior' && a.home === 'own') ? 6 + (a.need.includes('repair') ? 3 : 0) : 0,
    why: (a) => a.need.includes('repair') ? '집 고치기·살기 편한 집이 필요하다고 하셨어요.' : '어르신이 내 집에 살고 있다고 하셨어요.',
  },
  {
    id: 'deposit-guarantee', name: '전세보증금 반환보증', summary: '계약이 끝났을 때 집주인이 보증금을 돌려주지 않으면 HUG가 대신 돌려주는 보증',
    who: '전세로 사는 세입자(주택·보증금 요건 있음)', where: 'HUG 주택도시보증공사(khug.or.kr) · HUG 콜센터 1566-9009',
    score: (a) => a.home === 'jeonse' || a.need.includes('deposit') ? 6 + (a.need.includes('deposit') ? 5 : 0) : 0,
    why: (a) => a.need.includes('deposit') ? '전세 보증금을 지키고 싶다고 하셨어요.' : '전세로 살고 있다고 하셨어요.',
  },
  {
    id: 'care-home', name: '돌봄이 있는 주거 서비스', summary: '임대주택에 사는 홀몸 어르신 등을 살피는 안부 확인·돌봄 연계 서비스',
    who: '공공임대 입주 어르신 · 돌봄이 필요한 가구(단지·사업마다 달라요)', where: 'LH 콜센터 1600-1004 · 지역 주거복지센터',
    score: (a) => a.need.includes('care') ? 7 + (a.age === 'senior' ? 3 : 0) : 0,
    why: () => '돌봄이 있는 집을 찾고 있다고 하셨어요.',
  },
]

/** 늘 마지막 — 다 맞지 않아도 손님이 갈 곳 */
const FALLBACK: Pick<Policy, 'id' | 'name' | 'summary' | 'who' | 'where'> = {
  id: 'myhome-consult', name: '마이홈 맞춤 상담', summary: '내 조건을 넣으면 받을 수 있는 주거복지 정책을 한 번에 찾아 주는 국토부 포털과 상담 센터',
  who: '누구나', where: MYHOME + ' · 행사장 상담 부스',
}

function view(a: Answers): NaviView {
  const need = Array.isArray(a.need) ? a.need : []
  const income = String(a.income ?? '')
  return { age: String(a.age ?? ''), family: String(a.family ?? ''), home: String(a.home ?? ''), owner: String(a.owner ?? ''), income, need, noHome: a.owner === 'none' || a.owner === 'unsure', modest: income !== 'high' }
}

export interface NaviMatch { id: string; name: string; summary: string; who: string; where: string; why: string; score: number }

/** 알아볼 만한 정책 — 점수 순, 최대 max 개. 하나도 없으면 빈 목록(결과는 마이홈 상담만 짚는다) */
export function matchPolicies(a: Answers, max = 5): NaviMatch[] {
  const v = view(a)
  return POLICIES
    .map((p) => ({ p, score: p.score(v) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, max)
    .map(({ p, score }) => ({ id: p.id, name: p.name, summary: p.summary, who: p.who, where: p.where, why: p.why(v), score }))
}

export function naviSummary(a: Answers): { label: string; value: string }[] {
  return NAVI_QUESTIONS.map((q) => {
    const value = a[q.key]
    return { label: q.title.replace(/[?？]$/, ''), value: Array.isArray(value) ? value.map((id) => LABEL(q.key, id)).join(', ') : LABEL(q.key, String(value ?? '')) }
  })
}

export function naviResult(a: Answers): ExperienceResult {
  const v = view(a)
  const matches = matchPolicies(a)
  const who = [LABEL('age', v.age), LABEL('family', v.family), LABEL('home', v.home)].join(' · ')
  const sections = matches.map((m, i) => ({
    title: `${i + 1}. ${m.name}`,
    body: `${m.summary}. ${m.why}`,
    items: [`대상: ${m.who}`, `알아볼 곳: ${m.where}`],
  }))
  sections.push({ title: matches.length ? '더 알아보기' : FALLBACK.name, body: `${FALLBACK.summary}. 행사장 상담 부스에서도 바로 물어볼 수 있어요.`, items: [`알아볼 곳: ${FALLBACK.where}`] })
  return {
    id: 'navi',
    title: '나의 주거복지 처방전',
    subtitle: who,
    summary: matches.length
      ? `답해 주신 조건으로 먼저 알아보면 좋을 정책 ${matches.length}가지를 골랐어요. 자격·금액은 공고마다 달라서, 신청 전에 꼭 '알아볼 곳'에서 확인해 주세요.`
      : '답해 주신 조건으로는 딱 맞는 정책을 짚기 어려워요. 마이홈 상담에서 내 조건을 넣으면 더 정확하게 찾아 줘요.',
    tags: matches.length ? matches.slice(0, 4).map((m) => POLICY_TAG[m.id] ?? m.id) : ['마이홈상담'],
    sections,
    footnote: '안내용 참고 결과예요. 실제 자격·지원 내용은 해마다 바뀌는 공고와 기관 심사로 정해져요. 입력한 내용은 저장하지 않아요.',
  }
}

/** AI 에 보낼 후보 — 고른 정책 중 '가장 먼저 알아볼 것' 하나를 pick 하게 한다 */
export function naviCandidates(a: Answers) {
  return matchPolicies(a, 4).map((m) => ({ id: m.id, title: m.name, summary: `${m.summary}. 대상: ${m.who}. 짚은 이유: ${m.why}` }))
}

// ───────────────────────── 2. 우리 집 성향 테스트 ─────────────────────────

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
}

export const MATE_PROFILES: Record<MateType, MateProfile> = {
  lounge: {
    name: '공유 라운지 사교형', tagline: '함께 밥 먹을 때 집이 완성되는 사람',
    body: '복도에서 만난 이웃과 인사를 넘어 수다로 이어지는 집이 편한 성향이에요. 공유 주방·라운지가 있는 단지에서 빛나요.',
    match: 'garden', matchWhy: '텃밭에서 키운 채소를 공유 주방으로 가져오는 이웃과 만나면 식탁이 풍성해져요.',
    homes: ['공유 주방·라운지가 있는 청년·공유주택', '커뮤니티 시설이 많은 공공임대 단지'], try: '이번 주에 이웃 한 명에게 먼저 인사를 건네 보세요.',
  },
  garden: {
    name: '텃밭 돌봄형', tagline: '흙을 만지며 동네를 가꾸는 사람',
    body: '옥상 정원·공동 텃밭처럼 함께 가꾸는 공간에서 이웃과 천천히 가까워지는 성향이에요. 여러 세대가 섞여 사는 단지와 잘 맞아요.',
    match: 'smart', matchWhy: '스마트 센서로 물 주기를 챙겨 줄 이웃과 만나면 텃밭이 쉬워져요 — 세대를 잇는 짝이에요.',
    homes: ['공동 텃밭·옥상 정원이 있는 세대통합형 단지', '마을 공동체가 있는 공공주택'], try: '창가에 작은 화분 하나를 들여 보세요.',
  },
  smart: {
    name: '스마트 혼자살이형', tagline: '작아도 똑똑한 내 공간을 아끼는 사람',
    body: '내 공간이 분명하고, 기술로 살림을 가볍게 만드는 걸 즐기는 성향이에요. 스마트홈 기능이 들어간 1인 주거와 잘 맞아요.',
    match: 'garden', matchWhy: '흙과 계절을 아는 이웃과 만나면 화면 밖의 즐거움이 하나 늘어요.',
    homes: ['스마트홈 IoT가 들어간 청년 주택·1인 주거', '역세권 소형 공공임대'], try: '자주 쓰는 집안일 하나를 예약 기능으로 바꿔 보세요.',
  },
  maker: {
    name: '동네 메이커형', tagline: '고치고 만들며 이웃을 돕는 사람',
    body: '공구 하나로 동네의 불편을 해결하는 성향이에요. 공방·작업실처럼 함께 만드는 공간이 있는 단지에서 이웃의 든든한 해결사가 돼요.',
    match: 'family', matchWhy: '아이 장난감과 가구를 고쳐 줄 메이커는 아이 키우는 이웃에게 큰 힘이 돼요.',
    homes: ['공방·공유 작업실이 있는 공동체 주택', '일터와 가까운 일자리 연계형 주택'], try: '집에서 미뤄 둔 작은 수리 하나를 해 보세요.',
  },
  quiet: {
    name: '조용한 숲세권형', tagline: '자연 가까이 쉼을 아는 사람',
    body: '창밖의 나무와 고요한 아침이 하루를 지켜 주는 성향이에요. 필요할 때 서로 살피되 각자의 쉼을 존중하는 동네와 잘 맞아요.',
    match: 'lounge', matchWhy: '가끔 문을 두드려 차 한잔 나누는 이웃이 있으면 고요함이 외로움이 되지 않아요.',
    homes: ['녹지가 가까운 공공주택', '안부 확인 서비스가 있는 단지'], try: '오늘 저녁 10분, 화면을 끄고 창밖을 바라보세요.',
  },
  family: {
    name: '품앗이 육아형', tagline: '아이도 이웃도 함께 키우는 사람',
    body: '아이를 같이 돌보고 반찬을 나누는 품앗이가 자연스러운 성향이에요. 돌봄 시설과 놀이터가 가까운 단지에서 마음이 놓여요.',
    match: 'maker', matchWhy: '고장 난 자전거를 고쳐 주는 이웃과 만나면 아이 키우기가 한결 수월해져요.',
    homes: ['공동육아 나눔터가 있는 신혼·가족 단지', '돌봄 시설이 함께 있는 공공주택'], try: '이웃과 아이 책 한 권을 바꿔 읽어 보세요.',
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

export function mateResult(a: Answers, pick?: MateType): ExperienceResult {
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
    tags: ['우리집성향', p.name.replace(/\s/g, ''), '세대공존'],
    metrics: (Object.keys(MATE_AXES) as MateAxis[]).map((axis) => ({ label: MATE_AXES[axis], value: Math.round((axes[axis] / top) * 10), max: 10 })),
    // 영수증은 절 넷(AI 분석 + 셋)까지라 스탬프 랠리를 '오늘 해 볼 것'보다 앞에 둔다 — 도장 칸이 종이에 있어야 한다
    sections: [
      { title: `잘 맞는 이웃 · ${partner.name}`, body: p.matchWhy },
      { title: '어울리는 우리 집', body: `${josa(p.name, '은/는')} 이런 주거 모델에서 편안해요.`, items: p.homes },
      { title: '스탬프 랠리', body: '이 영수증을 들고 행사장 다른 부스를 둘러보세요. 아래 빈칸에 부스 도장을 모아 보세요.', items: ['(                                  )', '(                                  )', '(                                  )'] },
      { title: '오늘 해 볼 것', body: p.try },
    ],
    footnote: '재미로 보는 성향 테스트예요. 입력한 답은 저장하지 않아요.',
  }
}

export function mateCandidates(a: Answers) {
  return rankMates(a).slice(0, 3).map((t) => ({ id: t, title: MATE_PROFILES[t].name, summary: `${MATE_PROFILES[t].tagline}. ${MATE_PROFILES[t].body}` }))
}

export function mateSummary(a: Answers): { label: string; value: string }[] {
  return MATE_QUESTIONS.map((q) => ({ label: q.title.replace(/[?？]$/, ''), value: q.options.find((o) => o.id === a[q.key])?.label ?? '' }))
}

// ───────────────────────── 3. 2036 우리 집의 나 ─────────────────────────

export const HOME_SCENES = {
  smart: { label: '스마트홈 거실', note: '말로 켜는 조명 · 도우미 로봇', story: '목소리 한마디로 불이 켜지고, 작은 도우미 로봇이 하루를 반겨 주는 거실' },
  share: { label: '세대공존 공유주택', note: '함께 쓰는 마당 · 텃밭 벤치', story: '여러 세대가 함께 가꾸는 텃밭과 마당 벤치가 있는 공유주택' },
  care: { label: '고령친화 우리 집', note: '문턱 없는 집 · 안전 손잡이', story: '문턱이 없고 손잡이와 넓은 문이 있어 누구나 편하게 다니는 집' },
  youth: { label: '청년 스마트 원룸', note: '복층 침대 · 창가 책상', story: '작지만 복층 침대와 창가 책상으로 알차게 꾸민 청년의 원룸' },
} as const
export type HomeScene = keyof typeof HOME_SCENES
export const HOME_STYLES = { line: { label: '선화', note: '영수증에 가장 또렷하게 나와요' }, color: { label: '수채 일러스트', note: '휴대폰으로 받을 때 예뻐요' } } as const
export type HomeStyle = keyof typeof HOME_STYLES

export function homeResult(scene: HomeScene, style: HomeStyle): ExperienceResult {
  const s = HOME_SCENES[scene]
  return {
    id: `${scene}-${style}`,
    title: `2036, ${s.label}의 나`,
    subtitle: `${HOME_STYLES[style].label} 캐리커처`,
    summary: `10년 뒤 ${s.story}에서 지내는 나를 그렸어요.`,
    tags: ['2036우리집', s.label.replace(/\s/g, ''), '주거복지대전'],
    sections: [{ title: '그림 속 우리 집', body: `${s.story}. ${s.note}.` }],
    footnote: '사진은 그림을 만드는 데만 쓰고 저장하지 않아요.',
  }
}
