// 연말 시상식(2026-12-15) 포토부스 「2027 정미년 새해 이야기」 3종 — 관상 FACE! · 사주 SAJU! · 손금 PALM!.
// 흐름(src/app/booth/programs/ReadingFlow.tsx): 촬영(+ 사주는 생년월일) → AI 가 새해 이야기 글 → 기기 안에서 4×6 인화 원판 합성(사진 + 글) → QR · 인쇄.
// 그림은 AI 로 새로 만들지 않는다(처리량 — 손님 100명을 부스 2대가 90분에 돌린다. docs/nh-awards-demo.md '처리량').
//
// 재료(다시 쓴 것)
//   - 관상: 키오스크 studio-face(표정 · 고개 기울기 → 관상에서 착안한 창작 이야기, src/lib/kiosk/expansion/social.ts FACE_TOPICS)
//   - 손금: 키오스크 studio-palm(손을 펼친 정도 → 손금 이야기, social.ts palmFocus)
//   - 사주: 펀그라운드 FORTUNE!(만세력 fgSajuChart · 2027 정미년 십성 · 용신 행운, src/lib/funground/saju-reading.ts) — 청소년 문장 대신 직장인 · 중장년 새해 문장
//
// 원칙(키오스크 확장 체험과 같다): 얼굴 생김새로 성격 · 건강 · 운명을 판정하지 않는다 · 실제 손금 선을 해석하지 않는다 ·
// 「재미로 보는 창작 이야기」 안내를 화면과 인화물에 둔다 · 촬영 사진은 생성 요청에만 쓰고 저장하지 않는다 · 행사 · 기관 이름을 넣지 않는다.
// AI 가 늦거나(10초) 규칙에 어긋나면 미리 쓴 문장으로 대신한다 — 손님을 기다리게 하지 않는다. 이 파일은 계산만(DOM · 네트워크 없음 · 서버와 화면이 같이 쓴다).

import { FORBIDDEN } from '@/lib/kiosk/expansion/ai'
import { FG_ELEMENT_HANJA, FG_ELEMENT_WORD, FG_YEAR_GANJI, fgChartView, fgSajuChart, type FgBirth, type FgChartView } from '@/lib/funground/saju-reading'
import { sipseongOf } from '@/lib/saju'
import type { Element, Gan, SajuChart, Sipseong } from '@/lib/saju'

export const READING_PROGRAMS = ['nh-face', 'nh-saju', 'nh-palm'] as const
export type ReadingProgramId = (typeof READING_PROGRAMS)[number]
export const isReadingProgram = (id: unknown): id is ReadingProgramId => typeof id === 'string' && (READING_PROGRAMS as readonly string[]).includes(id)

export const READING_YEAR = 2027
export const READING_YEAR_LABEL = '2027 정미년(丁未年)'
/** 화면 · 인화물에 늘 보이는 안내 */
export const READING_NOTICE = '재미로 보는 새해 창작 이야기예요. 얼굴 생김새 · 손금 선으로 성격이나 앞날을 판정하지 않아요.'

/** 새해 이야기 한 장 — 인화물에 그대로 들어간다(길이는 4×6 원판에 맞춘 상한) */
export interface ReadingStory {
  /** 큰 글씨 두세 낱말(예: 꾸준한 불씨) */
  keyword: string
  title: string
  lines: [string, string, string]
  lucky: { color: string; item: string }
  /** 마지막 덕담 한 줄 */
  wish: string
}
export const STORY_MAX = { keyword: 10, title: 22, line: 48, color: 10, item: 12, wish: 30 } as const

/** 기기에서 잰 값(사진은 이 값과 함께 AI 에만 보낸다) — 관상: 표정 · 기울기, 손금: 펼친 정도 · 엄지 */
export interface ReadingFacts {
  /** 0~100 */
  smile?: number
  /** 도 */
  tilt?: number
  /** 손가락을 펼친 정도 0~100 */
  spread?: number
  thumb?: boolean
}

// ───────── 관상 FACE! — 듣고 싶은 새해 이야기(한 번 누름) ─────────

export const FACE_TOPICS = [
  { id: 'work', label: '일과 성장', sub: '새해에 키우고 싶은 일' },
  { id: 'people', label: '사람과 인연', sub: '함께하는 사람들' },
  { id: 'rest', label: '쉼과 여유', sub: '나를 돌보는 시간' },
  { id: 'challenge', label: '새로운 도전', sub: '처음 해 볼 일' },
] as const
export type FaceTopic = (typeof FACE_TOPICS)[number]['id']

export type FaceMood = 'bright' | 'soft' | 'calm'
/** 미소 값 → 오늘의 표정(키오스크 expression 과 같은 문턱: 환한 미소 78 · 살짝 미소 30) */
export const faceMood = (facts: ReadingFacts): FaceMood | null => facts.smile == null ? null : facts.smile >= 78 ? 'bright' : facts.smile >= 30 ? 'soft' : 'calm'
export const FACE_MOOD_LABEL: Record<FaceMood, string> = { bright: '환한 미소', soft: '살짝 미소', calm: '차분한 표정' }

const FACE_TOPIC_STORY: Record<FaceTopic, Omit<ReadingStory, 'lines'> & { first: string; last: string }> = {
  work: { keyword: '단단한 한 걸음', title: '쌓아 온 것이 빛나는 해', first: '한 해 동안 묵묵히 쌓아 온 일이 정미년에는 눈에 보이는 결과로 이어지는 이야기예요.', last: '새해 첫 달, 올해 꼭 마무리하고 싶은 일 하나를 수첩 첫 장에 적어 보세요.', lucky: { color: '버건디', item: '새 수첩' }, wish: '올 한 해 수고 많으셨어요. 새해에도 힘차게!' },
  people: { keyword: '따뜻한 인연', title: '좋은 사람이 곁에 머무는 해', first: '고마운 얼굴들이 하나둘 떠오르는 이야기예요. 정미년에는 함께한 사람들과 웃을 일이 많아요.', last: '오늘 함께한 동료에게 고맙다는 한마디를 먼저 건네 보세요.', lucky: { color: '살구색', item: '손편지' }, wish: '함께해서 든든한 한 해, 새해에도 함께해요.' },
  rest: { keyword: '느긋한 쉼표', title: '나를 돌보는 여유의 해', first: '바쁘게 달려온 만큼 정미년에는 나를 위한 쉼표를 찍는 이야기예요.', last: '새해 달력에 나만을 위한 하루를 먼저 표시해 두세요.', lucky: { color: '크림색', item: '따뜻한 차 한 잔' }, wish: '쉬어 가도 괜찮은 한 해가 되길 바라요.' },
  challenge: { keyword: '첫 번째 불꽃', title: '처음이 즐거운 해', first: '해 보고 싶던 일을 꺼내 드는 이야기예요. 정미년의 불(丁) 기운처럼 작게 시작해도 오래 타올라요.', last: '미뤄 둔 도전 하나를 골라 이번 달 안에 첫 단계를 해 보세요.', lucky: { color: '다홍색', item: '운동화' }, wish: '새해의 첫걸음을 힘껏 응원해요.' },
}
const FACE_MOOD_LINE: Record<FaceMood, string> = {
  bright: '활짝 웃으며 남긴 오늘의 한 장처럼, 새해에도 웃을 일이 먼저 찾아오길 바라요.',
  soft: '살며시 머금은 오늘의 미소처럼, 새해에는 작은 기쁨이 자주 머물러요.',
  calm: '차분한 오늘의 표정처럼, 새해에는 내 속도대로 가도 충분해요.',
}

export function localFaceStory(topic: FaceTopic, facts: ReadingFacts): ReadingStory {
  const t = FACE_TOPIC_STORY[topic]
  const mood = faceMood(facts) ?? 'soft'
  const tilted = facts.tilt != null && Math.abs(facts.tilt) >= 6
  const second = tilted ? `${FACE_MOOD_LINE[mood].replace(/\.$/, '')} 고개를 살짝 기울인 모습처럼 익숙한 일도 새 각도로 보면 길이 보여요.`.slice(0, 120) : FACE_MOOD_LINE[mood]
  return { keyword: t.keyword, title: t.title, lines: [t.first, second, t.last], lucky: t.lucky, wish: t.wish }
}

// ───────── 손금 PALM! — 손을 펼친 모양(실제 손금 선은 읽지 않는다) ─────────

export type PalmOpen = 'wide' | 'mid' | 'closed'
/** 키오스크 palmFocus 와 같은 문턱(55 · 25) */
export const palmOpen = (facts: ReadingFacts): PalmOpen => facts.spread == null ? 'mid' : facts.spread >= 55 ? 'wide' : facts.spread < 25 ? 'closed' : 'mid'
export const PALM_OPEN_LABEL: Record<PalmOpen, string> = { wide: '활짝 편 손', mid: '편안하게 편 손', closed: '가지런히 모은 손' }

const PALM_STORY: Record<PalmOpen, ReadingStory> = {
  wide: { keyword: '넓게 펼치는 손', title: '손을 활짝 여는 해', lines: ['손가락을 활짝 편 손처럼, 정미년에는 새로운 일과 사람을 넓게 맞아들이는 이야기예요.', '펼친 손바닥에 내년의 좋은 소식이 하나둘 내려앉는 장면을 떠올려 보세요.', '새해에는 먼저 손 내밀어 인사를 건네 보세요. 좋은 인연이 그 손을 잡아요.'], lucky: { color: '금색', item: '새 명함' }, wish: '두 손 가득 좋은 일 받는 새해 되세요.' },
  mid: { keyword: '편안한 두 손', title: '균형이 반가운 해', lines: ['편안하게 편 손처럼, 정미년에는 일과 쉼 사이의 균형을 잘 잡아 가는 이야기예요.', '꽉 쥐지도 다 놓지도 않은 손에 꼭 필요한 것만 남아요.', '새해 첫 주, 손으로 직접 적은 올해의 목표 세 줄을 만들어 보세요.'], lucky: { color: '초록', item: '작은 화분' }, wish: '편안하고 넉넉한 새해 보내세요.' },
  closed: { keyword: '차곡차곡 모으는 손', title: '알차게 모으는 해', lines: ['가지런히 모은 손처럼, 정미년에는 흩어진 것을 차곡차곡 모아 단단하게 만드는 이야기예요.', '작은 습관 하나를 꾸준히 이어 가면 연말에 두 손 가득 결실이 남아요.', '새해에는 매일 하는 일 하나를 정해 손에 익을 때까지 이어 가 보세요.'], lucky: { color: '남색', item: '저금통' }, wish: '알찬 결실을 두 손에 담는 새해 되세요.' },
}
export function localPalmStory(facts: ReadingFacts): ReadingStory {
  const story = PALM_STORY[palmOpen(facts)]
  if (!facts.thumb) return story
  // 엄지를 벌렸으면 둘째 줄을 바꾼다(엄지 = 내가 먼저 움직이는 힘이라는 이야기)
  return { ...story, lines: [story.lines[0], '엄지를 힘 있게 벌린 손처럼, 새해에는 내가 먼저 움직일 때 일이 술술 풀려요.', story.lines[2]] }
}

// ───────── 사주 SAJU! — 만세력(펀그라운드와 같은 엔진) + 직장인 · 중장년 새해 문장 ─────────

/** 일간 10 — 자연물 비유(성인 말투) */
const DAY_MASTER: Record<Gan, { image: string; keyword: string }> = {
  갑: { image: '곧게 뻗은 큰 나무', keyword: '곧은 큰 나무' }, 을: { image: '어디서든 뿌리내리는 덩굴', keyword: '유연한 덩굴' },
  병: { image: '한낮의 해', keyword: '환한 한낮의 해' }, 정: { image: '오래 타오르는 등불', keyword: '따뜻한 등불' },
  무: { image: '든든한 큰 산', keyword: '든든한 큰 산' }, 기: { image: '곡식을 키우는 너른 들', keyword: '너른 들판' },
  경: { image: '단단한 바위', keyword: '단단한 바위' }, 신: { image: '빛나는 보석', keyword: '빛나는 보석' },
  임: { image: '넓고 깊은 강', keyword: '깊은 강' }, 계: { image: '촉촉한 단비', keyword: '반가운 단비' },
}
/** 2027 정미년의 해 천간 정(丁)이 일간에게 무엇인가(십성) — 성인 새해 문장. 재성 · 관성도 순하게(돈 · 승진을 약속하지 않는다) */
const YEAR_STORY: Record<Sipseong, { title: string; line: string }> = {
  비견: { title: '나다움이 또렷해지는 해', line: '정미년에는 나와 닮은 기운이 찾아와 내가 잘하는 것이 또렷해져요. 내 방식에 자신을 가져도 좋아요.' },
  겁재: { title: '함께 달려 멀리 가는 해', line: '정미년에는 뜻이 맞는 사람과 힘을 모을 일이 많아요. 혼자보다 함께일 때 더 멀리 가요.' },
  식신: { title: '즐겁게 만들어 내는 해', line: '정미년에는 좋아하는 일에서 결과물이 쑥쑥 나와요. 즐기는 마음이 가장 큰 힘이 돼요.' },
  상관: { title: '생각을 꺼내 보이는 해', line: '정미년에는 마음속 아이디어를 꺼내 보일 때예요. 말과 글로 표현하면 좋은 반응이 돌아와요.' },
  편재: { title: '경험의 폭이 넓어지는 해', line: '정미년에는 새로운 곳, 새로운 사람을 만날 기회가 많아요. 발걸음을 넓힐수록 얻는 것이 많아요.' },
  정재: { title: '차곡차곡 쌓이는 해', line: '정미년에는 꾸준히 해 온 일이 차곡차곡 쌓여 손에 잡혀요. 계획대로 한 걸음씩이 정답이에요.' },
  편관: { title: '도전이 나를 키우는 해', line: '정미년에는 조금 벅찬 일도 해낼 힘이 생겨요. 피하지 않고 마주하면 한 뼘 자라요.' },
  정관: { title: '믿음이 쌓이는 해', line: '정미년에는 맡은 역할을 성실히 해내는 모습이 빛나요. 주변의 믿음이 든든한 바탕이 돼요.' },
  편인: { title: '새로운 관심이 피어나는 해', line: '정미년에는 처음 보는 분야에 마음이 끌려요. 배워 보고 싶은 것이 생기면 바로 시작해 보세요.' },
  정인: { title: '배움과 도움이 들어오는 해', line: '정미년에는 좋은 조언과 도움이 찾아와요. 배우는 자리에 가까이 있으면 힘이 돼요.' },
}
/** 힘이 되는 오행(용신) — 행운의 색 · 물건 · 한 줄(성인 생활) */
const LUCKY: Record<Element, { color: string; item: string; line: string }> = {
  목: { color: '초록', item: '작은 화분', line: '책상 위에 초록 화분 하나를 두고, 아침마다 기지개를 쭉 켜 보세요.' },
  화: { color: '빨강', item: '붉은 머플러', line: '붉은 소품 하나를 곁에 두고, 햇볕 아래 걷는 시간을 자주 가져 보세요.' },
  토: { color: '황토색', item: '새 다이어리', line: '하루를 적는 다이어리를 곁에 두고, 정해진 시간에 식사하는 습관을 지켜 보세요.' },
  금: { color: '은색', item: '좋은 펜', line: '손에 맞는 좋은 펜 하나로 계획을 적고, 퇴근 전 책상을 정리해 보세요.' },
  수: { color: '남색', item: '텀블러', line: '좋아하는 텀블러에 물을 자주 채워 마시고, 하루를 조용히 돌아보는 시간을 가져 보세요.' },
}

/** 인화물 · 화면에 쓰는 원국 요약(사진과 함께 찍힌다) */
export interface SajuView {
  pillars: { label: string; hanja: string | null }[]
  dayMaster: { gan: Gan; hanja: string; element: Element; image: string }
  zodiac: string
  sipseong: Sipseong
  yongsin: Element
  solarLabel: string
  isThreePillar: boolean
}

const PILLAR_LABEL = { hour: '시주', day: '일주', month: '월주', year: '년주' } as const

export function sajuView(chart: SajuChart, view: FgChartView = fgChartView(chart)): SajuView {
  const gan = chart.dayMaster.gan
  return {
    pillars: view.pillars.map((p) => ({ label: PILLAR_LABEL[p.key], hanja: p.pillar ? `${p.pillar.ganHanja}${p.pillar.jiHanja}` : null })),
    dayMaster: { gan, hanja: chart.dayMaster.hanja, element: chart.dayMaster.element, image: DAY_MASTER[gan].image },
    zodiac: chart.zodiacAnimal,
    sipseong: sipseongOf(gan, FG_YEAR_GANJI.gan),
    yongsin: chart.yongsin.element,
    solarLabel: view.solarLabel,
    isThreePillar: chart.isThreePillar,
  }
}

/** 생일 → 원국 요약. 잘못된 날짜는 한국어 오류를 던진다(펀그라운드 엔진 그대로) */
export const sajuViewOf = (birth: FgBirth): SajuView => sajuView(fgSajuChart(birth))

export function localSajuStory(v: SajuView): ReadingStory {
  const year = YEAR_STORY[v.sipseong], luck = LUCKY[v.yongsin], dm = DAY_MASTER[v.dayMaster.gan]
  return {
    keyword: dm.keyword,
    title: year.title,
    lines: [
      `${v.dayMaster.gan}(${v.dayMaster.hanja}) 일간, ${dm.image}의 기운을 타고났어요.`,
      year.line,
      luck.line,
    ],
    lucky: { color: luck.color, item: luck.item },
    wish: '정미년 한 해, 하시는 일마다 술술 풀리길 바라요.',
  }
}

// ───────── AI 지시문 · 응답 검사 ─────────

/** 이 3종에서 더 막는 말(키오스크 FORBIDDEN 에 더해) — 생김새 판정 · 손금 선 · 겁주는 말 · 약속 · 행사 · 기관 이름 */
export const READING_FORBIDDEN: [RegExp, string][] = [
  // '문턱이' · '콧노래' · '귓가' 처럼 덕담에 흔한 낱말은 걸리지 않게 낱말 앞을 본다
  [/(?<![가-힣])(이마|눈썹이|눈매|코가|코는|코끝|입술|입매|턱선|턱이|광대뼈|얼굴형|관골|인중|이목구비|생김새)|관상학적으로|상이 좋|복스러운 얼굴/, '얼굴 생김새 판정'],
  [/감정선|두뇌선|운명선|결혼선|재물선|태양선|손금이 (좋|나쁘|길|짧|깊)|선이 (길|짧|깊|뚜렷)/, '손금 선 해석'],
  [/병원|질병|건강운|건강이 (나빠|안 좋)|사고수|구설|조심해야|불운|액운|흉운|삼재|이혼|이별|파산|손해를 /, '겁주는 말 · 건강 판정'],
  [/승진(이|을) (확정|보장|약속)|합격(이|을) (확정|보장)|복권|로또|대박|부자가 (된|될)/, '결과 약속'],
  [/농협|엔에이치|\bNH\b|시상식|수상자|협회|주식회사/i, '행사 · 기관 이름'],
]

/** 사진(관상 · 손금)에서 마음 · 성격 · 태도를 짐작하는 말 — 2026-11-17 실호출: '고개에서 … 다정한 여유가 느껴져요'. 사주는 원국 이야기라 넘긴다 */
// 2026-11-17 예시 시험에서 더 나왔다: '꾸준함과 신뢰를 더해주는 모습이세요' · '좋은 협력 운이 보여요' · '시작할 준비가 되어 보여요'
const PHOTO_GUESS: [RegExp, string] = [/느껴져요|느껴집니다|느껴지네요|엿보여요|엿보입니다|분이시네요|분이세요|가지셨네요|가진 분|성품|됨됨이|모습이세요|(운|기운|에너지|성격|마음)(이|가)? ?(보여요|보이네요|보입니다)|되어 보여요|되어 보이세요|해 보이세요|느껴지는|느껴지네|보여줘요|보여 줘요|가득해 보여|알려주는 듯|알려 주는 듯|내면의|성격(이|을|의) /, '사진으로 마음 · 성격 짐작']

/** 사주는 원국 자체가 「타고난 기운」 이야기라 사진 판정용 '성격 단정'과 '팔자'는 사주에서만 넘긴다 */
const SAJU_ALLOWED = /^(타고난|팔자|기질)$/

export function storyProblem(story: ReadingStory, program?: ReadingProgramId): string | null {
  const all = [story.keyword, story.title, ...story.lines, story.lucky.color, story.lucky.item, story.wish].join(' ')
  if (!/[가-힣]/.test(all)) return '한국어로 써야 합니다'
  for (const [pattern, why] of [...FORBIDDEN, ...READING_FORBIDDEN, ...(program && program !== 'nh-saju' ? [PHOTO_GUESS] : [])]) {
    const hit = all.match(pattern)
    if (hit && !(program === 'nh-saju' && SAJU_ALLOWED.test(hit[0]))) return `규칙 위반(${why}): "${hit[0]}"`
  }
  return null
}

const clean = (v: unknown, path: string, max: number, min = 2): string => {
  const text = typeof v === 'string' ? v.replace(/["“”`#*]/g, '').replace(/\s+/g, ' ').trim() : ''
  if (text.length < min) throw new Error(`${path} 가 비었습니다.`)
  if (text.length > max) throw new Error(`${path} 는 ${max}자 이내여야 합니다(지금 ${text.length}자).`)
  return text
}

/** 응답(JSON 으로 읽은 것) → 이야기. 틀 · 길이 · 금지어가 어긋나면 이유를 담아 던진다(다시 받거나 미리 쓴 문장으로) */
export function parseStory(value: unknown, program?: ReadingProgramId): ReadingStory {
  if (!value || typeof value !== 'object') throw new Error('JSON 객체가 아닙니다.')
  const v = value as Record<string, unknown>
  const lines = Array.isArray(v.lines) ? v.lines : []
  if (lines.length !== 3) throw new Error('lines 는 정확히 3개여야 합니다.')
  const lucky = (v.lucky ?? {}) as Record<string, unknown>
  const story: ReadingStory = {
    keyword: clean(v.keyword, 'keyword', STORY_MAX.keyword),
    title: clean(v.title, 'title', STORY_MAX.title, 4),
    lines: lines.map((x, i) => clean(x, `lines[${i}]`, STORY_MAX.line, 10)) as [string, string, string],
    lucky: { color: clean(lucky.color, 'lucky.color', STORY_MAX.color, 1), item: clean(lucky.item, 'lucky.item', STORY_MAX.item, 1) },
    wish: clean(v.wish, 'wish', STORY_MAX.wish, 6),
  }
  const problem = storyProblem(story, program)
  if (problem) throw new Error(`${problem} — 이 표현을 빼고 다시 쓰십시오.`)
  return story
}

const ROLE: Record<ReadingProgramId, string> = {
  'nh-face': '연말 행사 포토부스의 「새해 관상 이야기」 작가. 전통 관상에서 착안했지만, 얼굴 생김새는 보지 않고 사진 속 지금의 표정 · 분위기 · 옷차림과 손님이 고른 주제로만 따뜻한 2027 정미년 새해 이야기를 쓴다.',
  'nh-palm': '연말 행사 포토부스의 「새해 손금 이야기」 작가. 손금 선은 읽지 않고, 사진 속 손을 펼친 모양 · 제스처와 표정 · 분위기에서 착안해 2027 정미년 새해 이야기를 쓴다.',
  'nh-saju': '연말 행사 포토부스의 「정미년 사주 이야기」 작가. 서버가 계산한 원국 사실만으로 2027 정미년 새해 이야기를 쓴다. 다시 계산하지 않는다.',
}

export interface ReadingInput {
  program: ReadingProgramId
  topic?: FaceTopic
  facts: ReadingFacts
  saju?: SajuView
  /** 사진을 함께 보내는가(관상 · 손금) */
  photo: boolean
}

/** 기기에서 잰 값을 말로 */
export function factsLine(input: Pick<ReadingInput, 'program' | 'facts'>): string {
  const f = input.facts
  if (input.program === 'nh-palm') return `손 모양: ${PALM_OPEN_LABEL[palmOpen(f)]}${f.thumb ? ' · 엄지를 벌림' : ''}`
  if (input.program === 'nh-face') {
    const mood = faceMood(f)
    return [mood ? `표정: ${FACE_MOOD_LABEL[mood]}` : '', f.tilt != null && Math.abs(f.tilt) >= 6 ? '고개를 살짝 기울임' : ''].filter(Boolean).join(' · ')
  }
  return ''
}

export function buildReadingPrompt(input: ReadingInput): string {
  const s = input.saju
  const lines = [
    `당신은 ${ROLE[input.program]}`,
    '',
    '# 입력',
    input.photo ? '- 첨부 사진: 손님이 방금 포토부스에서 찍은 사진이다. 보이는 것(표정, 손의 모양, 옷의 색, 분위기)만 근거로 쓴다.' : '- 사진은 보내지 않았다. 사진 이야기를 지어내지 않는다.',
    factsLine(input) ? `- 기기에서 잰 값: ${factsLine(input)}` : '',
    input.topic ? `- 손님이 고른 새해 이야기 주제: ${FACE_TOPICS.find((t) => t.id === input.topic)?.label}` : '',
    s ? `- 원국(계산 완료): ${JSON.stringify({
      사주: s.pillars.map((p) => `${p.label} ${p.hanja ?? '모름'}`).join(' / '),
      일간: `${s.dayMaster.gan}(${s.dayMaster.hanja}) · ${s.dayMaster.element}(${FG_ELEMENT_HANJA[s.dayMaster.element]} · ${FG_ELEMENT_WORD[s.dayMaster.element]}) · 비유 ${s.dayMaster.image}`,
      띠: s.zodiac,
      '2027년': `정미(丁未)년 — 해의 천간 정(丁)은 이 일간에게 ${s.sipseong}`,
      힘이되는오행: `${s.yongsin}(${FG_ELEMENT_HANJA[s.yongsin]})`,
      행운: LUCKY[s.yongsin],
    })}` : '',
    '',
    '# 쓰는 규칙',
    `- ${READING_YEAR_LABEL} 새해를 맞는 직장인 · 중장년 손님에게 건네는 따뜻하고 기분 좋은 덕담. 존댓말(~요). 끝은 늘 희망적으로.`,
    '- 재미로 보는 창작 이야기다. 단정하거나 예언하지 말고 「~하는 이야기예요」 「~해 보세요」처럼 부드럽게.',
    '- 얼굴 생김새(이목구비 · 얼굴형 · 피부)로 성격 · 능력 · 건강 · 운명을 판정하지 않는다. 외모를 평가하지 않는다. 나이 · 성별을 추정하지 않는다.',
    input.photo ? '- 사진에서 보이는 것(미소, 고개, 손 모양, 옷 색)은 말해도 되지만, 그것으로 마음 · 성격 · 태도를 짐작하는 말(「~가 느껴져요」 「~한 분이시네요」)은 쓰지 않는다. 보이는 것은 새해 덕담으로 잇는다(예: 환한 미소처럼 웃을 일이 많은 해).' : '',
    '- 손금 선(생명선 · 감정선 등)을 읽거나 해석한다고 말하지 않는다.',
    '- 건강 · 사고 · 이별처럼 겁주는 말, 승진 · 합격 · 큰돈을 약속하는 말을 쓰지 않는다.',
    '- 행사 · 회사 · 기관 이름, 실존 인물 · 연예인을 말하지 않는다.',
    '- 기기에서 잰 숫자를 그대로 옮기지 않는다.',
    input.program === 'nh-face' ? '- 인화물에는 찍은 사진 대신 AI 가 그린 한복 초상이 들어간다. 그러니 찍을 때 입은 옷(색 · 종류)은 말하지 않는다. 사진에서 쓸 수 있는 것은 미소 · 고개 · 함께 찍은 사람 수뿐이다. 둘째 줄은 그중 하나를 새해 장면에 빗댄 덕담 한 문장(예: 오늘의 환한 미소처럼 웃을 일이 먼저 찾아오는 해예요 / 나란히 선 세 분처럼 함께 걷는 길이 든든한 해예요). 기운 · 에너지 · 분위기 · 마음을 짐작하지 않는다.' : '',
    input.program === 'nh-face' ? '- keyword 는 인화물에 큰 붓글씨로 세로로 찍힌다. 자연 · 사물 비유 두세 낱말(예: 단단한 한 걸음, 오래 타는 등불, 봄을 여는 바람, 차오르는 보름달). 「새로운 시작」 「좋은 인연」 「행복」 「성장」처럼 흔한 말과 쉼표는 쓰지 않는다.' : '',
    s ? '- 원국 사실을 바꾸지 않는다. 첫 줄은 일간의 비유로, 둘째 줄은 2027년 흐름으로, 셋째 줄은 행운의 색 · 물건을 살린 작은 실천으로.' : '- 첫 줄은 고른 주제(또는 손 모양)에서 착안한 새해 이야기, 둘째 줄은 사진에서 본 지금의 모습, 셋째 줄은 새해에 해 볼 작은 실천.',
    '',
    '# 출력 — JSON 하나만(설명 · 코드 블록 없이)',
    `{"keyword": "큰 글씨 두세 낱말(${STORY_MAX.keyword}자 이내)", "title": "새해 이야기 제목(${STORY_MAX.title}자 이내)", "lines": ["한 문장(${STORY_MAX.line}자 이내)", "한 문장", "한 문장"], "lucky": {"color": "행운의 색(${STORY_MAX.color}자 이내)", "item": "행운의 물건(${STORY_MAX.item}자 이내)"}, "wish": "마지막 덕담 한 줄(${STORY_MAX.wish}자 이내)"}`,
  ]
  return lines.filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n')
}

/** 미리 쓴 문장 — AI 를 못 받았을 때 */
export function localStory(input: Pick<ReadingInput, 'program' | 'topic' | 'facts' | 'saju'>): ReadingStory {
  if (input.program === 'nh-saju') {
    if (!input.saju) throw new Error('생년월일이 필요해요.')
    return localSajuStory(input.saju)
  }
  if (input.program === 'nh-palm') return localPalmStory(input.facts)
  return localFaceStory(input.topic ?? 'work', input.facts)
}

/** 요청 본문의 기기 측정값 검사 */
export function readFacts(raw: unknown): ReadingFacts {
  const r = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : undefined
  return { smile: num(r.smile, 0, 100), tilt: num(r.tilt, -90, 90), spread: num(r.spread, 0, 100), thumb: r.thumb === true ? true : undefined }
}

export const isFaceTopic = (v: unknown): v is FaceTopic => typeof v === 'string' && FACE_TOPICS.some((t) => t.id === v)
