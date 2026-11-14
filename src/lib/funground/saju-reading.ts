// 펀그라운드 별내 사주(SAJU!) — 미리 써 둔 풀이 문장에서 고르는 기기 안 풀이(B안 · 외부 AI 0). A안 AI 포춘이 실패하면 이 결과로 대신한다.
// 만세력은 기존 엔진(src/lib/saju computeSajuChart)이 계산하고, 이 파일은 계산된 원국에서 정해진 규칙으로 문장만 고른다 — 같은 생일이면 늘 같은 풀이.
// 대상은 9~19세: 외모 · 점수 · 순위 · 연애 · 돈 이야기와 향 처방은 넣지 않는다. 모든 화면에 「재미로 보는 풀이예요」를 붙인다.
//
// 첫 묶음 55문장
//   일간 10(천간마다 하나) · 많은 오행 5 · 적은 오행 5 · 힘이 되는 오행(용신) 5 · 2027년 흐름 10 · 청소년 주제 15(공부 · 친구 · 진로 · 꿈 · 마음 × 3) · 행운 5
//
// 고르는 규칙(모두 원국 계산값에서 바로 정해진다)
//   - 일간: 일주 천간(chart.dayMaster.gan)
//   - 많은 오행: chart.dominantElements[0] · 적은 오행: chart.lackingElements[0] · 힘이 되는 오행: chart.yongsin.element (엔진의 용신 규칙 그대로)
//   - 2027년(정미 丁未년): 해의 천간 정(丁)이 내 일간에게 어떤 십성인지로 고른다 — 일간마다 하나로 정해진다.
//       갑→상관(표현) · 을→식신(즐겁게 만들기) · 병→겁재(함께 달리기) · 정→비견(나다움) · 무→정인(배움 · 도움)
//       기→편인(새 관심) · 경→정관(역할 · 책임) · 신→편관(도전) · 임→정재(차곡차곡 쌓기 · 정임합) · 계→편재(경험 넓히기)
//     재성(돈) · 관성(시험 · 압박)은 청소년 말로 바꿔 썼다 — 돈 대신 '계획 · 쌓기', 압박 대신 '역할 · 도전'. 표는 시험(__tests__)이 sipseongOf 로 다시 확인한다.
//   - 청소년 주제: 오행을 셋으로 묶어(펼치는 기운 목 · 화 / 가운데 토 / 모으는 기운 금 · 수 — 오행의 음양) 고른다.
//       공부 ← 일간 오행의 묶음 · 진로 ← 가장 많은 오행의 묶음 · 꿈 ← 힘이 되는 오행의 묶음
//       친구 ← 일간과 같은 오행이 원국에서 차지하는 몫(35% 이상 / 25% 이상 / 그 아래 — 비겁의 많고 적음.
//         2007~2017년생 5,280명 견본에서 셋이 대략 3분의 1씩 나오는 경계)
//       마음 ← 신강 · 중화 · 신약(일간을 돕는 오행이 얼마나 있나)
//   - 행운: 힘이 되는 오행(용신)의 색 · 물건 · 습관

import { computeSajuChart, sipseongOf } from '@/lib/saju'
import type { Element, ElementCount, Gan, Pillar, SajuChart, Sipseong, StrengthLevel } from '@/lib/saju'

export const FG_ELEMENTS: readonly Element[] = ['목', '화', '토', '금', '수']
export const FG_ELEMENT_HANJA: Record<Element, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
/** 오행 한 단어 뜻 — 화면의 막대 아래 */
export const FG_ELEMENT_WORD: Record<Element, string> = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' }

/** 화면에서 받는 생일 — hourIndex: 12지시 번호(0 = 자시 23~01시 … 11 = 해시), null = 시간 모름 */
export interface FgBirth {
  year: number
  month: number
  day: number
  calendar: 'solar' | 'lunar'
  isLeapMonth?: boolean
  hourIndex: number | null
}

/** 12지시 — 대표 시각은 칸의 가운데(index*2 시 정각, 키오스크 사주 SajuInput 의 branchToHour 와 같다) */
export const FG_HOURS = [
  { hanja: '子', label: '자시', range: '23~01시' },
  { hanja: '丑', label: '축시', range: '01~03시' },
  { hanja: '寅', label: '인시', range: '03~05시' },
  { hanja: '卯', label: '묘시', range: '05~07시' },
  { hanja: '辰', label: '진시', range: '07~09시' },
  { hanja: '巳', label: '사시', range: '09~11시' },
  { hanja: '午', label: '오시', range: '11~13시' },
  { hanja: '未', label: '미시', range: '13~15시' },
  { hanja: '申', label: '신시', range: '15~17시' },
  { hanja: '酉', label: '유시', range: '17~19시' },
  { hanja: '戌', label: '술시', range: '19~21시' },
  { hanja: '亥', label: '해시', range: '21~23시' },
] as const

/** API 로 받은 생일 검사 — 틀리면 한국어 오류를 던진다(날짜가 달력에 있는지는 fgSajuChart 가 본다) */
export function parseFgBirth(raw: unknown): FgBirth {
  if (typeof raw !== 'object' || raw === null) throw new Error('생일 정보가 없습니다.')
  const b = raw as Record<string, unknown>
  const int = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
  if (!int(b.year, 1930, 2035) || !int(b.month, 1, 12) || !int(b.day, 1, 31)) throw new Error('생년월일이 올바르지 않습니다.')
  if (b.calendar !== 'solar' && b.calendar !== 'lunar') throw new Error('양력 · 음력을 골라 주세요.')
  if (b.hourIndex !== null && b.hourIndex !== undefined && !int(b.hourIndex, 0, 11)) throw new Error('태어난 시간이 올바르지 않습니다.')
  return {
    year: b.year as number,
    month: b.month as number,
    day: b.day as number,
    calendar: b.calendar,
    isLeapMonth: b.calendar === 'lunar' && b.isLeapMonth === true,
    hourIndex: b.hourIndex === null || b.hourIndex === undefined ? null : (b.hourIndex as number),
  }
}

/** 생일 → 원국. 성별은 대운(이 화면은 쓰지 않음)에만 쓰여 원국 · 오행 · 용신이 같다 — 묻지 않고 한쪽으로 고정한다. 잘못된 날짜는 한국어 오류를 던진다 */
export function fgSajuChart(birth: FgBirth): SajuChart {
  return computeSajuChart({
    date: { year: birth.year, month: birth.month, day: birth.day },
    calendar: birth.calendar,
    isLeapMonth: birth.calendar === 'lunar' && birth.isLeapMonth === true,
    time: birth.hourIndex === null ? null : { hour: (birth.hourIndex * 2) % 24, minute: 0 },
    gender: 'female',
  })
}

// ───────── 미리 쓴 문장 55 ─────────

export interface FgLine { id: string; title: string; text: string }

/** 일간 10 — 천간마다 자연물 하나 */
export const DAY_MASTER_LINES: Record<Gan, FgLine> = {
  갑: { id: 'day-갑', title: '곧게 자라는 큰 나무', text: '하고 싶은 일이 생기면 먼저 시작해 보는 사람이에요. 방향을 정하면 끝까지 밀고 나가는 힘이 있어서, 친구들이 「같이 해 보자」며 따라와요.' },
  을: { id: 'day-을', title: '어디서든 길을 찾는 덩굴', text: '처음 가는 곳에서도 금방 적응하고 내 자리를 찾아요. 부드러워 보여도 쉽게 포기하지 않는 끈기가 숨어 있어요.' },
  병: { id: 'day-병', title: '환하게 비추는 한낮의 해', text: '있는 곳을 밝게 만드는 사람이에요. 마음을 솔직하게 표현해서 주변 사람들이 편하게 다가와요.' },
  정: { id: 'day-정', title: '어둠을 밝히는 촛불', text: '한 가지에 오래 집중하고, 가까운 사람을 세심하게 챙겨요. 작은 변화도 잘 알아차리는 섬세한 눈을 가졌어요.' },
  무: { id: 'day-무', title: '든든한 큰 산', text: '쉽게 흔들리지 않아서 친구들이 기대고 싶어 하는 사람이에요. 서두르지 않고 큰 그림을 보며 차분하게 움직여요.' },
  기: { id: 'day-기', title: '씨앗을 키우는 너른 밭', text: '무엇이든 차근차근 키워 내는 사람이에요. 친구의 이야기를 잘 들어 주고, 맡은 일을 알차게 챙겨요.' },
  경: { id: 'day-경', title: '단단한 무쇠', text: '옳다고 생각하면 바로 움직이는 결단력이 있어요. 약속과 의리를 소중히 여겨서 믿음직한 친구가 돼요.' },
  신: { id: 'day-신', title: '반짝이는 보석', text: '나만의 기준이 분명하고, 좋아하는 일은 꼼꼼하게 다듬어 완성해요. 작은 부분까지 신경 쓰는 정성이 큰 장점이에요.' },
  임: { id: 'day-임', title: '넓고 깊은 바다', text: '궁금한 게 많고 생각의 폭이 넓은 사람이에요. 여러 사람과 두루 어울리며 새로운 생각을 잘 받아들여요.' },
  계: { id: 'day-계', title: '촉촉한 새벽 이슬비', text: '조용히 스며들어 주변을 촉촉하게 만드는 사람이에요. 느낌이 빠르고 다른 사람의 마음을 잘 알아차려요.' },
}

/** 많은 오행 5 */
export const STRONG_LINES: Record<Element, FgLine> = {
  목: { id: 'strong-목', title: '목(木) 기운이 가장 많아요', text: '새로운 걸 시작하고 쑥쑥 자라려는 힘이 커요. 시작한 일을 하나씩 마무리하는 연습을 더하면 더 멀리 가요.' },
  화: { id: 'strong-화', title: '화(火) 기운이 가장 많아요', text: '열정이 넘치고 표현을 잘해요. 가끔은 숨을 고르고 천천히 가는 시간도 챙겨 주세요.' },
  토: { id: 'strong-토', title: '토(土) 기운이 가장 많아요', text: '차분하고 믿음직한 힘이 커요. 가끔은 새로운 일에 먼저 손을 들어 보면 재미있는 일이 생겨요.' },
  금: { id: 'strong-금', title: '금(金) 기운이 가장 많아요', text: '정리하고 판단하는 힘이 또렷해요. 내 기준만큼 친구의 생각도 들어 보면 더 단단해져요.' },
  수: { id: 'strong-수', title: '수(水) 기운이 가장 많아요', text: '생각이 깊고 궁금한 게 많아요. 생각이 많아질 땐 몸을 움직이며 머리를 쉬게 해 주세요.' },
}

/** 적은 오행 5 */
export const WEAK_LINES: Record<Element, FgLine> = {
  목: { id: 'weak-목', title: '목(木) 기운은 조금 적어요', text: '새로운 걸 시작할 때 망설여질 수 있어요. 작은 것부터 「일단 해 보기」가 도움이 돼요.' },
  화: { id: 'weak-화', title: '화(火) 기운은 조금 적어요', text: '속마음을 꺼내는 데 시간이 걸릴 수 있어요. 좋아하는 것을 친구에게 하나씩 이야기해 보세요.' },
  토: { id: 'weak-토', title: '토(土) 기운은 조금 적어요', text: '계획이 자주 바뀔 수 있어요. 매일 같은 시간에 하는 작은 습관이 중심을 잡아 줘요.' },
  금: { id: 'weak-금', title: '금(金) 기운은 조금 적어요', text: '마무리를 미루게 될 때가 있어요. 할 일을 적고 하나씩 지워 가면 뿌듯함이 쌓여요.' },
  수: { id: 'weak-수', title: '수(水) 기운은 조금 적어요', text: '바쁘게 달리다 쉬는 걸 잊을 수 있어요. 잠깐 멈춰서 생각을 정리하는 시간을 가져 보세요.' },
}

/** 힘이 되는 오행(용신) 5 */
export const YONGSIN_LINES: Record<Element, FgLine> = {
  목: { id: 'yong-목', title: '나에게 힘이 되는 기운은 목(木)', text: '자라고 뻗어 가는 기운이에요. 새로운 걸 배우고 시작할 때 힘이 나요.' },
  화: { id: 'yong-화', title: '나에게 힘이 되는 기운은 화(火)', text: '밝고 따뜻한 기운이에요. 사람들과 어울리고 마음을 표현할 때 힘이 나요.' },
  토: { id: 'yong-토', title: '나에게 힘이 되는 기운은 토(土)', text: '든든하게 받쳐 주는 기운이에요. 규칙적인 생활과 꾸준한 습관에서 힘이 나요.' },
  금: { id: 'yong-금', title: '나에게 힘이 되는 기운은 금(金)', text: '맺고 정리하는 기운이에요. 목표를 정하고 하나씩 끝낼 때 힘이 나요.' },
  수: { id: 'yong-수', title: '나에게 힘이 되는 기운은 수(水)', text: '깊이 생각하는 기운이에요. 책을 읽거나 차분히 쉬는 시간에 힘이 나요.' },
}

/** 2027년(정미 丁未년)의 해 천간 */
export const FG_YEAR = 2027
export const FG_YEAR_GANJI = { gan: '정' as Gan, ji: '미', hanja: '丁未', label: '정미(丁未)년' }

/** 2027년 흐름 10 — 일간마다 하나(해 천간 정 丁 이 일간에게 무엇인가). sipseong 은 시험이 sipseongOf(일간, '정')과 같은지 확인한다 */
export const YEAR_LINES: Record<Gan, FgLine & { sipseong: Sipseong }> = {
  갑: { id: 'y27-갑', sipseong: '상관', title: '생각을 꺼내 보이는 해', text: '나무가 불을 피우듯 내 안의 아이디어가 밖으로 나오는 해예요. 생각을 말이나 그림, 글로 꺼내 보면 좋은 반응을 만날 수 있어요.' },
  을: { id: 'y27-을', sipseong: '식신', title: '좋아하는 걸 만드는 해', text: '좋아하는 일을 즐겁게 파고들기 좋은 해예요. 취미를 꾸준히 이어 가다 보면 손에 잡히는 작은 결과물이 생겨요.' },
  병: { id: 'y27-병', sipseong: '겁재', title: '함께 달리는 해', text: '나와 닮은 친구들과 함께 달리는 해예요. 서로 자극을 주고받으며 한 뼘 더 자라요. 겨루기보다 힘을 모으는 쪽을 먼저 떠올려 보세요.' },
  정: { id: 'y27-정', sipseong: '비견', title: '나다움을 찾는 해', text: '나와 같은 촛불(丁)이 찾아오는 해예요. 내가 좋아하는 것과 잘하는 것이 무엇인지 또렷하게 알게 돼요.' },
  무: { id: 'y27-무', sipseong: '정인', title: '배움이 쏙쏙 들어오는 해', text: '따뜻한 불이 산을 데워 주는 해예요. 선생님이나 가까운 어른의 도움을 받으며 배우기 좋아요.' },
  기: { id: 'y27-기', sipseong: '편인', title: '새로운 관심이 생기는 해', text: '처음 보는 분야에 호기심이 생기는 해예요. 남들이 잘 하지 않는 주제를 깊게 파 보면 나만의 무기가 돼요.' },
  경: { id: 'y27-경', sipseong: '정관', title: '역할을 맡아 보는 해', text: '불이 쇠를 단련하듯 책임감이 자라는 해예요. 모둠장이나 동아리 역할을 맡아 보면 한층 단단해져요.' },
  신: { id: 'y27-신', sipseong: '편관', title: '도전이 나를 다듬는 해', text: '조금 어려운 도전이 찾아오는 해예요. 피하지 않고 부딪혀 보면 보석이 다듬어지듯 더 빛나게 돼요.' },
  임: { id: 'y27-임', sipseong: '정재', title: '차곡차곡 쌓는 해', text: '물(壬)과 불(丁)이 만나 짝을 이루는 해예요. 계획을 세우고 꾸준히 쌓아 가면 노력한 만큼 결과가 눈에 보여요.' },
  계: { id: 'y27-계', sipseong: '편재', title: '경험이 넓어지는 해', text: '활동하는 무대가 넓어지는 해예요. 새로운 장소, 새로운 사람, 새로운 체험에서 배울 게 많아요.' },
}

export type FgTopic = 'study' | 'friend' | 'career' | 'dream' | 'mind'
export const FG_TOPICS: { key: FgTopic; label: string }[] = [
  { key: 'study', label: '공부' },
  { key: 'friend', label: '친구' },
  { key: 'career', label: '진로' },
  { key: 'dream', label: '꿈' },
  { key: 'mind', label: '마음' },
]

/** 오행 셋 묶음 — 펼치는 기운(목 · 화) · 가운데(토) · 모으는 기운(금 · 수) */
export type FgElementGroup = 'spread' | 'center' | 'gather'
export const elementGroup = (e: Element): FgElementGroup => (e === '목' || e === '화' ? 'spread' : e === '토' ? 'center' : 'gather')

export type FgFriendLevel = 'many' | 'some' | 'few'

/** 청소년 주제 15 — 주제마다 셋 */
export const TOPIC_LINES = {
  study: {
    spread: { id: 'study-spread', title: '직접 해 보며 배우는 타입', text: '눈으로만 보기보다 직접 해 보고 말로 설명해 볼 때 머리에 쏙 들어와요. 친구에게 가르쳐 주듯 복습해 보세요.' },
    center: { id: 'study-center', title: '차곡차곡 쌓는 타입', text: '매일 조금씩 꾸준히 할 때 실력이 가장 많이 늘어요. 정해진 시간에 정해진 만큼 하는 습관이 큰 힘이 돼요.' },
    gather: { id: 'study-gather', title: '정리하며 파고드는 타입', text: '배운 내용을 나만의 노트로 정리하고, 왜 그런지 끝까지 파고들 때 실력이 늘어요. 조용한 곳에서 집중력이 살아나요.' },
  },
  friend: {
    many: { id: 'friend-many', title: '함께라서 신나는 타입', text: '비슷한 친구들과 어울릴 때 에너지가 차올라요. 모둠 활동이나 동아리에서 분위기를 이끄는 역할이 잘 맞아요.' },
    some: { id: 'friend-some', title: '깊고 오래가는 친구 타입', text: '마음이 잘 맞는 친구와 오래 가까이 지내요. 친구의 이야기를 끝까지 들어 주는 게 큰 장점이에요.' },
    few: { id: 'friend-few', title: '새 친구를 넓혀 가는 타입', text: '나와 다른 친구들에게서 새로운 걸 많이 배워요. 먼저 「안녕」 하고 말을 걸면 생각보다 금방 친해져요.' },
  },
  career: {
    spread: { id: 'career-spread', title: '생각을 펼쳐 보이는 길', text: '생각을 표현하고 사람들과 함께하는 일에 관심을 가져 보세요. 발표, 공연, 기획 같은 활동에서 나를 발견할 수 있어요.' },
    center: { id: 'career-center', title: '사람을 잇고 돌보는 길', text: '사람과 사람을 잇고 돌보는 일에 관심을 가져 보세요. 모둠을 이끌거나 행사를 준비해 보는 경험이 도움이 돼요.' },
    gather: { id: 'career-gather', title: '탐구하고 만드는 길', text: '궁금한 걸 조사하고 무언가를 만들어 내는 일에 관심을 가져 보세요. 과학, 코딩, 글쓰기처럼 깊이 파는 활동이 잘 맞아요.' },
  },
  dream: {
    spread: { id: 'dream-spread', title: '크게 그리는 꿈', text: '꿈은 크게 그려도 괜찮아요. 하고 싶은 일을 세 가지 적어 두고, 이번 달에 해 볼 수 있는 한 걸음을 정해 보세요.' },
    center: { id: 'dream-center', title: '한 걸음씩 다가가는 꿈', text: '꿈은 하루아침이 아니라 매일의 작은 습관으로 가까워져요. 오늘 할 수 있는 일 하나부터 시작해 보세요.' },
    gather: { id: 'dream-gather', title: '나만의 색을 찾는 꿈', text: '남과 견주기보다 내가 진짜 좋아하는 게 무엇인지 들여다보세요. 좋아하는 것을 모아 두는 「꿈 노트」를 만들어 보면 좋아요.' },
  },
  mind: {
    신강: { id: 'mind-strong', title: '씩씩하게 버티는 마음', text: '마음의 힘이 단단해서 어려운 일도 씩씩하게 버텨요. 가끔은 혼자 다 하려 하지 말고 친구에게 도움을 청해 보세요.' },
    중화: { id: 'mind-balanced', title: '균형 잡힌 마음', text: '마음의 균형이 잘 잡혀 있어서 상황에 맞게 움직여요. 지금처럼 공부하는 시간과 쉬는 시간을 골고루 챙겨 주세요.' },
    신약: { id: 'mind-gentle', title: '섬세하게 느끼는 마음', text: '다른 사람의 마음을 잘 느끼는 섬세한 마음이에요. 힘들 때는 믿는 사람에게 이야기하고, 충분히 쉬어 가도 괜찮아요.' },
  },
} satisfies {
  study: Record<FgElementGroup, FgLine>
  friend: Record<FgFriendLevel, FgLine>
  career: Record<FgElementGroup, FgLine>
  dream: Record<FgElementGroup, FgLine>
  mind: Record<StrengthLevel, FgLine>
}

export interface FgLucky extends FgLine { color: string; swatch: string; item: string; habit: string }

/** 행운 5 — 힘이 되는 오행(용신)마다 색 · 물건 · 습관 */
export const LUCKY_LINES: Record<Element, FgLucky> = {
  목: { id: 'lucky-목', title: '초록 기운 채우기', color: '초록', swatch: '#2f9e5b', item: '작은 화분', habit: '아침 스트레칭', text: '초록색 물건을 가까이 두고 작은 화분을 키워 보세요. 아침에 기지개를 쭉 켜면 하루가 상쾌해요.' },
  화: { id: 'lucky-화', title: '빨강 기운 채우기', color: '빨강 · 주황', swatch: '#e5533d', item: '밝은 색 키링', habit: '햇볕 아래 산책', text: '밝은 색 소품을 하나 달고 다녀 보세요. 햇볕을 쬐며 걷는 시간이 기분을 환하게 해 줘요.' },
  토: { id: 'lucky-토', title: '노랑 기운 채우기', color: '노랑 · 갈색', swatch: '#d9a227', item: '나만의 다이어리', habit: '정해진 시간에 밥 먹기', text: '하루를 적는 다이어리를 곁에 두세요. 정해진 시간에 밥 먹고 자는 생활이 힘을 단단하게 모아 줘요.' },
  금: { id: 'lucky-금', title: '하양 기운 채우기', color: '하양 · 은색', swatch: '#9aa3b2', item: '은색 볼펜', habit: '자기 전 책상 정리', text: '깔끔한 은색 필기구를 써 보세요. 자기 전에 책상을 정리하면 다음 날 머리가 맑아져요.' },
  수: { id: 'lucky-수', title: '파랑 기운 채우기', color: '파랑 · 남색', swatch: '#2f6fd6', item: '물병', habit: '물 자주 마시기', text: '좋아하는 물병을 들고 다니며 물을 자주 마셔 보세요. 일찍 잠자리에 들면 생각이 차분해져요.' },
}

/** 문장 묶음별 개수(시험 · 보고용) — 합계 55 */
export function fgSajuLineCounts() {
  return {
    dayMaster: Object.keys(DAY_MASTER_LINES).length,
    strong: Object.keys(STRONG_LINES).length,
    weak: Object.keys(WEAK_LINES).length,
    yongsin: Object.keys(YONGSIN_LINES).length,
    year2027: Object.keys(YEAR_LINES).length,
    topics: Object.values(TOPIC_LINES).reduce((sum, group) => sum + Object.keys(group).length, 0),
    lucky: Object.keys(LUCKY_LINES).length,
  }
}

/** 55문장 전부(id 겹침 · 금지어 시험용) */
export function fgSajuAllLines(): FgLine[] {
  return [
    ...Object.values(DAY_MASTER_LINES), ...Object.values(STRONG_LINES), ...Object.values(WEAK_LINES),
    ...Object.values(YONGSIN_LINES), ...Object.values(YEAR_LINES),
    ...Object.values(TOPIC_LINES).flatMap((group) => Object.values(group) as FgLine[]),
    ...Object.values(LUCKY_LINES),
  ]
}

// ───────── 화면에 보여 줄 원국 ─────────

export interface FgPillarView { gan: string; ji: string; ganHanja: string; jiHanja: string; ganElement: Element; jiElement: Element; animal: string }
export interface FgChartView {
  /** 시 · 일 · 월 · 년 순(만세력 표 왼쪽부터) — 시간 모름이면 시주 null */
  pillars: { key: 'hour' | 'day' | 'month' | 'year'; label: string; pillar: FgPillarView | null }[]
  /** 오행 몫(%, 합 100) */
  percent: ElementCount
  zodiac: string
  isThreePillar: boolean
  isJasiBirth: boolean
  /** 양력 날짜 표시(음력 입력이면 바꾼 양력) */
  solarLabel: string
  lunarLabel: string
}

const pillarView = (p: Pillar): FgPillarView => ({ gan: p.gan, ji: p.ji, ganHanja: p.ganHanja, jiHanja: p.jiHanja, ganElement: p.ganElement, jiElement: p.jiElement, animal: p.jiAnimal })

/** 오행 가중치 → 백분율(큰 나머지 방식으로 합을 정확히 100) */
export function elementPercent(count: ElementCount, total: number): ElementCount {
  const raw = FG_ELEMENTS.map((e) => (count[e] / total) * 100)
  const floor = raw.map(Math.floor)
  let left = 100 - floor.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => ({ i, rest: v - floor[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (const { i } of order) { if (left <= 0) break; floor[i] += 1; left -= 1 }
  return Object.fromEntries(FG_ELEMENTS.map((e, i) => [e, floor[i]])) as ElementCount
}

export function fgChartView(chart: SajuChart): FgChartView {
  const { year, month, day, hour } = chart.pillars
  const s = chart.solarDate
  const l = chart.lunarDate
  return {
    pillars: [
      { key: 'hour', label: '태어난 시', pillar: hour ? pillarView(hour) : null },
      { key: 'day', label: '태어난 날', pillar: pillarView(day) },
      { key: 'month', label: '태어난 달', pillar: pillarView(month) },
      { key: 'year', label: '태어난 해', pillar: pillarView(year) },
    ],
    percent: elementPercent(chart.elementCount, chart.totalUnits),
    zodiac: chart.zodiacAnimal,
    isThreePillar: chart.isThreePillar,
    isJasiBirth: chart.isJasiBirth,
    solarLabel: `양력 ${s.year}년 ${s.month}월 ${s.day}일`,
    lunarLabel: `음력 ${l.year}년 ${l.isLeapMonth ? '윤' : ''}${l.month}월 ${l.day}일`,
  }
}

// ───────── 풀이 고르기 ─────────

export interface FgSajuReading {
  /** 고른 문장 id — 같은 생일이면 늘 같다(AI 풀이도 이 틀을 채운다) */
  ids: string[]
  dayMaster: { gan: Gan; hanja: string; element: Element; title: string; text: string }
  strong: { element: Element; title: string; text: string }
  weak: { element: Element; title: string; text: string }
  yongsin: { element: Element; title: string; text: string }
  year2027: { sipseong: Sipseong; title: string; text: string }
  topics: Record<FgTopic, { title: string; text: string }>
  lucky: { element: Element; title: string; text: string; color: string; swatch: string; item: string; habit: string }
}

/** 일간과 같은 오행이 원국에서 차지하는 몫 → 친구 문장 */
export function friendLevel(chart: SajuChart): FgFriendLevel {
  const share = chart.elementCount[chart.dayMaster.element] / chart.totalUnits
  return share >= 0.35 ? 'many' : share >= 0.25 ? 'some' : 'few'
}

const card = (line: FgLine) => ({ title: line.title, text: line.text })

/** 원국에서 55문장 중 골라 풀이를 만든다(순수 함수 — 같은 원국이면 같은 결과) */
export function buildFgSajuReading(chart: SajuChart): FgSajuReading {
  const dm = chart.dayMaster
  const strongEl = chart.dominantElements[0]
  const weakEl = chart.lackingElements[0]
  const yongEl = chart.yongsin.element
  const day = DAY_MASTER_LINES[dm.gan]
  const strong = STRONG_LINES[strongEl]
  const weak = WEAK_LINES[weakEl]
  const yong = YONGSIN_LINES[yongEl]
  const year = YEAR_LINES[dm.gan]
  const topicLines: Record<FgTopic, FgLine> = {
    study: TOPIC_LINES.study[elementGroup(dm.element)],
    friend: TOPIC_LINES.friend[friendLevel(chart)],
    career: TOPIC_LINES.career[elementGroup(strongEl)],
    dream: TOPIC_LINES.dream[elementGroup(yongEl)],
    mind: TOPIC_LINES.mind[dm.strength],
  }
  const lucky = LUCKY_LINES[yongEl]
  return {
    ids: [day.id, strong.id, weak.id, yong.id, year.id, ...FG_TOPICS.map((t) => topicLines[t.key].id), lucky.id],
    dayMaster: { gan: dm.gan, hanja: dm.hanja, element: dm.element, ...card(day) },
    strong: { element: strongEl, ...card(strong) },
    weak: { element: weakEl, ...card(weak) },
    yongsin: { element: yongEl, ...card(yong) },
    year2027: { sipseong: sipseongOf(dm.gan, FG_YEAR_GANJI.gan), ...card(year) },
    topics: {
      study: card(topicLines.study), friend: card(topicLines.friend), career: card(topicLines.career),
      dream: card(topicLines.dream), mind: card(topicLines.mind),
    },
    lucky: { element: yongEl, title: lucky.title, text: lucky.text, color: lucky.color, swatch: lucky.swatch, item: lucky.item, habit: lucky.habit },
  }
}

/** 화면 · API 가 함께 쓰는 결과 — engine: 'local'(미리 쓴 문장) · 'ai'(AI 풀이) */
export interface FgSajuResult {
  engine: 'local' | 'ai'
  /** AI 풀이를 못 받아 미리 쓴 문장으로 대신했는가 */
  fallback: boolean
  chart: FgChartView
  reading: FgSajuReading
}

/** 생일 → 기기 안 풀이(B안) */
export function fgLocalSaju(birth: FgBirth): FgSajuResult {
  const chart = fgSajuChart(birth)
  return { engine: 'local', fallback: false, chart: fgChartView(chart), reading: buildFgSajuReading(chart) }
}

/** 청소년 화면에 내지 않는 말 — 미리 쓴 문장 시험과 AI 응답 검사가 함께 쓴다 */
export const FG_FORBIDDEN_WORDS: readonly string[] = [
  '향수', '향기', '향 처방', '연애', '이성 친구', '남자친구', '여자친구', '애인', '결혼',
  '재물', '돈을', '돈이', '돈은', '부자', '재테크', '용돈', '외모', '얼굴', '잘생', '예쁘', '못생', '몸매',
  '점수', '순위', '등수', '1등', '불행', '재앙', '흉하', '죽음', '사고가', '병에', '대박',
]

export function fgForbiddenWord(text: string): string | null {
  return FG_FORBIDDEN_WORDS.find((w) => text.includes(w)) ?? null
}
