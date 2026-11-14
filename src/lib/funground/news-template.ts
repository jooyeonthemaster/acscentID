// 펀그라운드 별내 「FUTURE NEWS! 2046 별내 신문」 — 질문 셋(꿈 · 좋아하는 것 · 세상에 해 보고 싶은 일)의 고르기 목록과
// B안(engine=local) 기사 틀. 같은 대답이면 늘 같은 기사(난수 없음) — 외부 AI · 네트워크를 쓰지 않는다.
// A안(engine=ai)은 같은 대답을 AI 기자에게 넘겨 기사를 받고(news-ai.ts), 실패하면 이 틀의 기사로 대신한다.
// 기사 규칙(두 안 같음): 밝고 다정한 상상 · 외모 · 나이 · 점수 · 순위 · 연애 · 돈 · 실존 인물 · 상표 이야기 없음. 이름은 받지 않는다 —
// 「별내 출신 ○○」(꿈에서 나온 호칭)으로 부른다. 신문에는 「재미로 상상해 보는 미래 신문이에요」가 함께 찍힌다.
// 화면: src/app/booth-demo/funground/news · 시험: __tests__/news-template.test.ts(npm run test:funground-news)

import { FG_FORBIDDEN_WORDS } from './saju-reading'

export type NewsDreamId = 'inventor' | 'space' | 'artist' | 'musician' | 'athlete' | 'healer' | 'chef' | 'game'
export type NewsLikeId = 'animals' | 'nature' | 'books' | 'friends' | 'making' | 'stars'
export type NewsWishId = 'earth' | 'help' | 'smile' | 'town' | 'new' | 'together'

/** 신문 사진 칸 배경(public/ 아래 — LATER! · THEME! 에서 이미 만든 미래 장면 그림) */
export type NewsSceneId = 'city' | 'sky' | 'space' | 'stadium' | 'idol' | 'park' | 'magic'
export const NEWS_SCENE_ART: Record<NewsSceneId, string> = {
  city: '/assets/booth-programs/funground-later/city.webp',
  sky: '/assets/booth-programs/funground-later/sky.webp',
  space: '/assets/booth-programs/funground-theme/space.webp',
  stadium: '/assets/booth-programs/funground-theme/stadium.webp',
  idol: '/assets/booth-programs/funground-theme/idol.webp',
  park: '/assets/booth-programs/funground-theme/park.webp',
  magic: '/assets/booth-programs/funground-theme/magic.webp',
}

export interface NewsOption<Id extends string> {
  id: Id
  /** 고르기 카드의 큰 글 */
  label: string
  /** 카드 아래 한 줄 */
  line: string
}

export interface NewsDream extends NewsOption<NewsDreamId> {
  /** 기사 속 호칭 — 「별내 출신 ○○」 */
  role: string
  /** 사진 칸 배경 */
  scene: NewsSceneId
  /** 사진 설명의 자리 — 「○○에 선 별내 출신 …」 */
  place: string
  /** 부제 뒤쪽 — 「…마음이 ○○」 */
  grow: string
}

export interface NewsLike extends NewsOption<NewsLikeId> {
  /** 부제 앞쪽 — 「○○ 마음이 …」 */
  heart: string
  /** 기사 속 추억 — 「어릴 적 ○○ 시간이 …」 */
  memory: string
  /** 오늘의 별내 날씨 */
  weather: string
}

export interface NewsWish extends NewsOption<NewsWishId> {
  /** 기사 끝 문단(호칭이 들어가지 않는 맺음) */
  close: string
}

// ── 질문 1. 내 꿈 ──
export const NEWS_DREAMS: NewsDream[] = [
  { id: 'inventor', label: '발명가 · 과학자', line: '궁금한 걸 풀고 새것을 만들어요', role: '발명가', scene: 'city', place: '미래 도시 발명 전시장', grow: '세상을 바꾸는 발명으로 자랐다' },
  { id: 'space', label: '우주 탐험가', line: '별과 행성으로 떠나요', role: '우주 탐험가', scene: 'space', place: '우주 정거장 전망대', grow: '우주를 향한 탐험으로 이어졌다' },
  { id: 'artist', label: '예술가 · 디자이너', line: '그림과 디자인으로 표현해요', role: '예술가', scene: 'sky', place: '구름 위 전시장', grow: '모두가 멈춰 보는 작품이 됐다' },
  { id: 'musician', label: '음악가 · 가수', line: '노래와 연주로 마음을 전해요', role: '음악가', scene: 'idol', place: '빛의 무대', grow: '온 세상에 울리는 노래가 됐다' },
  { id: 'athlete', label: '운동선수', line: '땀 흘리며 힘차게 도전해요', role: '운동선수', scene: 'stadium', place: '모두의 경기장', grow: '힘차게 달리는 도전이 됐다' },
  { id: 'healer', label: '의사 · 수의사', line: '아픈 사람과 동물을 돌봐요', role: '의사', scene: 'city', place: '미래 도시 병원 앞', grow: '누군가를 돌보는 손길이 됐다' },
  { id: 'chef', label: '요리사', line: '맛있는 음식으로 힘을 줘요', role: '요리사', scene: 'park', place: '축제 마당', grow: '따뜻한 한 그릇 요리가 됐다' },
  { id: 'game', label: '게임 개발자', line: '신나는 놀이 세상을 만들어요', role: '게임 개발자', scene: 'magic', place: '게임 속 성', grow: '모두가 즐기는 놀이 세상이 됐다' },
]

// ── 질문 2. 내가 좋아하는 것 ──
export const NEWS_LIKES: NewsLike[] = [
  { id: 'animals', label: '동물', line: '강아지 · 고양이 · 새', heart: '동물을 아끼던 마음이', memory: '강아지와 고양이를 오래 들여다보던', weather: '맑음 · 철새 가족이 남쪽으로 여행해요' },
  { id: 'nature', label: '숲과 바다', line: '나무 · 꽃 · 파도 소리', heart: '숲과 바다를 좋아하던 마음이', memory: '숲길을 걷고 파도 소리를 듣던', weather: '맑음 · 불암산 위에 쌍무지개가 떠요' },
  { id: 'books', label: '책과 이야기', line: '소설 · 만화 · 상상', heart: '이야기를 좋아하던 마음이', memory: '책 속 이야기를 끝없이 상상하던', weather: '구름 조금 · 하늘 도서관이 문을 열어요' },
  { id: 'friends', label: '친구들', line: '함께 놀고 웃기', heart: '친구들과 함께하던 마음이', memory: '친구들과 머리를 맞대고 놀던', weather: '맑음 · 구름 미끄럼틀 운행 시작' },
  { id: 'making', label: '만들기', line: '조립 · 공작 · 꾸미기', heart: '뚝딱뚝딱 만들기를 좋아하던 마음이', memory: '상자와 테이프로 뭐든 만들던', weather: '바람 조금 · 종이비행기 날리기 좋은 날' },
  { id: 'stars', label: '밤하늘과 별', line: '별자리 · 달 · 우주', heart: '밤하늘을 올려다보던 마음이', memory: '밤하늘 별자리를 하나하나 세던', weather: '맑음 · 밤 9시 별똥별 소나기 예보' },
]

// ── 질문 3. 세상에 해 보고 싶은 일 ──
export const NEWS_WISHES: NewsWish[] = [
  { id: 'earth', label: '지구를 깨끗하게', line: '숲 · 바다 · 하늘 지키기', close: '다음 목표를 묻자 “지구가 더 맑아지는 날까지 계속할게요”라고 답했다.' },
  { id: 'help', label: '아픈 이웃 돕기', line: '사람과 동물 모두', close: '“아픈 친구가 한 명도 외롭지 않으면 좋겠어요”라는 말에 큰 박수가 쏟아졌다.' },
  { id: 'smile', label: '모두를 웃게', line: '하루에 한 번 더 웃음', close: '“오늘 웃은 사람이 내일도 웃으면 좋겠어요”라며 다음 계획을 살짝 귀띔했다.' },
  { id: 'town', label: '별내를 더 멋지게', line: '우리 동네 자랑 만들기', close: '별내 이웃들은 “우리 동네가 한층 더 멋져졌다”며 반가워했다.' },
  { id: 'new', label: '세상에 없던 것 만들기', line: '처음 보는 아이디어', close: '“아직 세상에 없는 게 훨씬 많아요”라며 벌써 다음 아이디어 노트를 펼쳤다.' },
  { id: 'together', label: '세계 친구와 함께', line: '말이 달라도 같이', close: '“다음엔 더 많은 친구와 함께할 거예요”라며 힘차게 손을 흔들었다.' },
]

export const NEWS_DREAM_BY_ID = Object.fromEntries(NEWS_DREAMS.map((d) => [d.id, d])) as Record<NewsDreamId, NewsDream>
export const NEWS_LIKE_BY_ID = Object.fromEntries(NEWS_LIKES.map((d) => [d.id, d])) as Record<NewsLikeId, NewsLike>
export const NEWS_WISH_BY_ID = Object.fromEntries(NEWS_WISHES.map((d) => [d.id, d])) as Record<NewsWishId, NewsWish>

/**
 * 꿈 × 해 보고 싶은 일 = 48개의 1면 — h: 제목(22자 안), l: 첫 문단(호칭 뒤에 붙는 말, 「별내 출신 ○○가 …」).
 * 숫자 · 등수 · 메달 · 상금 같은 겨루기 말은 쓰지 않는다.
 */
const FRONT: Record<NewsDreamId, Record<NewsWishId, { h: string; l: string }>> = {
  inventor: {
    earth: { h: '바다 쓰레기 먹는 로봇 물고기 발명', l: '바다에 떠다니는 쓰레기를 먹고 깨끗한 물만 내보내는 로봇 물고기를 세상에 내놓았다.' },
    help: { h: '아픈 곳 찾아 주는 반창고 로봇 발명', l: '붙이기만 하면 아픈 곳을 알려 주고 살살 낫게 돕는 반창고 로봇을 만들었다.' },
    smile: { h: '비 오는 날도 웃게 하는 무지개 우산', l: '빗방울이 닿으면 무지개가 피어나는 우산을 발명해 비 오는 날 거리를 환하게 바꿨다.' },
    town: { h: '별내 하늘 나는 자전거 버스 첫 운행', l: '바람의 힘으로 하늘을 나는 자전거 버스를 만들어 오늘 별내에서 첫 운행을 시작했다.' },
    new: { h: '세상에 없던 ‘꿈 녹화 안경’ 발명', l: '밤에 꾼 꿈을 아침에 다시 볼 수 있는 ‘꿈 녹화 안경’을 처음으로 선보였다.' },
    together: { h: '모든 말을 바로 옮기는 통역 이어폰', l: '어느 나라 말이든 바로 우리말로 옮겨 주는 통역 이어폰을 발명해 세계 친구들의 대화를 이었다.' },
  },
  space: {
    earth: { h: '우주에서 지구 숲 지키는 위성 띄웠다', l: '우주에서 지구의 숲을 하루 종일 지켜보는 초록 위성을 쏘아 올렸다.' },
    help: { h: '우주 정거장에 별빛 병원 문 열었다', l: '우주에서 일하는 사람과 동물 모두를 돌보는 ‘별빛 병원’을 우주 정거장에 열었다.' },
    smile: { h: '달에서 지구로 웃음 편지 보냈다', l: '달 기지에서 지구의 어린이들에게 웃음이 담긴 영상 편지를 보내 화제가 됐다.' },
    town: { h: '별내 이름 붙은 새 별 찾았다', l: '망원경 너머에서 처음 보는 별을 찾아 ‘별내별’이라는 이름을 붙였다.' },
    new: { h: '목성 구름 위에 떠 있는 집 지었다', l: '목성의 구름 위에 둥실 떠 있는 탐사 기지를 세상에서 처음으로 지었다.' },
    together: { h: '세계 친구들과 화성 캠프 열었다', l: '여러 나라의 친구들과 함께 화성에서 별을 보며 지내는 우주 캠프를 열었다.' },
  },
  artist: {
    earth: { h: '버려진 플라스틱이 거대한 고래 작품으로', l: '바닷가에서 모은 플라스틱으로 하늘만큼 큰 고래 작품을 만들어 모두를 놀라게 했다.' },
    help: { h: '병원 복도를 초록 숲 그림으로 바꿨다', l: '아이들이 지내는 병원 복도를 숲과 동물 그림으로 가득 채워 걷고 싶은 길로 바꿨다.' },
    smile: { h: '도시 담장마다 웃는 그림 피었다', l: '회색 담장마다 웃음이 나는 그림을 그려 도시 전체를 커다란 미술관으로 만들었다.' },
    town: { h: '별내 밤하늘에 빛 그림 전시회', l: '별내 밤하늘을 캔버스 삼아 빛으로 그린 그림 전시회를 열었다.' },
    new: { h: '만지면 노래하는 그림 처음 선보여', l: '손으로 만지면 색마다 다른 노래가 흘러나오는 그림을 처음으로 선보였다.' },
    together: { h: '세계 어린이와 함께 그린 지구 그림', l: '세계 곳곳의 어린이들과 한 조각씩 그려 이은 커다란 지구 그림을 완성했다.' },
  },
  musician: {
    earth: { h: '바람 · 파도 소리로 지구 노래 만들었다', l: '바람과 파도, 새소리를 모아 만든 ‘지구의 노래’를 발표했다.' },
    help: { h: '아픈 친구들 찾아가는 병원 음악회', l: '병원에서 지내는 친구들을 찾아가는 작은 음악회를 오늘도 이어 갔다.' },
    smile: { h: '한 번 들으면 웃음 나는 노래 발표', l: '한 번 들으면 저절로 웃음이 나는 노래를 발표해 거리마다 흥얼거림이 퍼졌다.' },
    town: { h: '별내 호수 위 떠 있는 무대에서 공연', l: '별내 호수 위에 둥실 뜬 무대에서 이웃들과 함께하는 공연을 열었다.' },
    new: { h: '세상에 없던 악기 ‘별빛 하프’ 탄생', l: '빛줄기를 튕기면 소리가 나는 새 악기 ‘별빛 하프’를 직접 만들어 연주했다.' },
    together: { h: '세계 친구들과 부른 노래 지구에 울려', l: '여러 나라 친구들과 각자의 말로 함께 부른 노래가 지구 곳곳에 울려 퍼졌다.' },
  },
  athlete: {
    earth: { h: '지구 한 바퀴 달리며 나무 심었다', l: '지구 한 바퀴를 이어 달리며 지나는 곳마다 나무를 심는 도전을 마쳤다.' },
    help: { h: '아픈 친구와 함께 뛰는 운동회 열었다', l: '몸이 불편한 친구도 함께 뛸 수 있는 모두의 운동회를 열었다.' },
    smile: { h: '보는 사람 모두 웃게 한 신나는 경기', l: '넘어져도 다시 일어나 웃으며 끝까지 달린 경기가 보는 사람 모두를 웃게 했다.' },
    town: { h: '별내에 모두의 운동장 문 열었다', l: '누구나 와서 마음껏 뛰어놀 수 있는 ‘모두의 운동장’을 별내에 열었다.' },
    new: { h: '새 운동 ‘구름 공놀이’ 만들었다', l: '구름처럼 가벼운 공을 띄워 주고받는 새 운동 ‘구름 공놀이’를 만들었다.' },
    together: { h: '세계 친구들과 바다 건너 이어달리기', l: '여러 나라 친구들과 바통을 이어받으며 바다 건너까지 이어달리기를 해냈다.' },
  },
  healer: {
    earth: { h: '숲속 동물 지키는 초록 병원 열었다', l: '다친 숲속 동물들을 돌보고 다시 숲으로 돌려보내는 초록 병원을 열었다.' },
    help: { h: '마음까지 돌보는 따뜻한 병원 열었다', l: '아픈 몸과 함께 지친 마음도 돌보는 따뜻한 병원을 열었다.' },
    smile: { h: '주사가 무섭지 않은 웃음 병원 화제', l: '들어서기만 해도 웃음이 나는 놀이터 같은 병원을 열어 화제가 됐다.' },
    town: { h: '별내에 밤에도 여는 이웃 병원', l: '밤늦게도 사람과 반려동물을 함께 돌보는 이웃 병원을 별내에 열었다.' },
    new: { h: '아픈 곳 그려 주는 ‘마음 청진기’', l: '대기만 하면 아픈 곳을 그림으로 보여 주는 ‘마음 청진기’를 처음 만들었다.' },
    together: { h: '세계 곳곳 날아가는 하늘 병원선 출발', l: '도움이 필요한 곳이면 어디든 날아가는 하늘 병원선을 이끌고 첫 비행을 시작했다.' },
  },
  chef: {
    earth: { h: '음식 남김없는 ‘지구 식당’ 열었다', l: '재료를 하나도 버리지 않는 ‘지구 식당’을 열어 남는 음식 없는 하루를 만들었다.' },
    help: { h: '아픈 친구 위한 힘나는 수프 개발', l: '아픈 친구들이 한 숟가락만 먹어도 힘이 나는 따뜻한 수프를 만들었다.' },
    smile: { h: '먹으면 웃음 나는 무지개 떡 화제', l: '한 입 먹으면 웃음이 나는 일곱 빛깔 무지개 떡을 선보여 화제가 됐다.' },
    town: { h: '별내 골목에 차린 모두의 식탁', l: '별내 골목에 누구나 앉아 함께 먹는 긴 ‘모두의 식탁’을 차렸다.' },
    new: { h: '우주에서도 먹는 구름 빵 개발', l: '하늘에 둥실 떠 있는 구름처럼 폭신하고 우주에서도 먹을 수 있는 빵을 만들었다.' },
    together: { h: '세계 친구들과 한 바퀴 요리 축제', l: '여러 나라 친구들과 서로의 요리를 나누는 ‘지구 한 바퀴 요리 축제’를 열었다.' },
  },
  game: {
    earth: { h: '놀면 진짜 나무가 자라는 게임', l: '게임 속에서 나무를 키우면 진짜 숲에도 나무가 심어지는 게임을 만들었다.' },
    help: { h: '아픈 친구도 함께 노는 게임 개발', l: '병원에 있는 친구도 손가락 하나로 함께 놀 수 있는 게임을 만들었다.' },
    smile: { h: '온 가족이 함께 웃는 게임 공개', l: '할머니부터 동생까지 온 가족이 함께 웃으며 즐기는 게임을 공개했다.' },
    town: { h: '별내 동네를 통째로 담은 게임', l: '별내의 골목과 공원을 그대로 옮겨 담은 게임을 공개해 이웃들의 사랑을 받았다.' },
    new: { h: '꿈속을 여행하는 게임 세상 열었다', l: '잠들기 전 상상한 곳을 직접 여행하는 새로운 게임 세상을 열었다.' },
    together: { h: '말이 달라도 함께 노는 세계 놀이터', l: '말이 달라도 몸짓과 그림으로 함께 노는 세계 놀이터 게임을 만들었다.' },
  },
}

export interface NewsAnswers {
  dream: NewsDreamId
  like: NewsLikeId
  wish: NewsWishId
}

/** 신문 기사(두 안 같은 틀) — kicker 는 늘 기기 안에서 정한다(「별내 출신 ○○」) */
export interface NewsStory {
  kicker: string
  headline: string
  subhead: string
  /** 2~3 문단 */
  article: string[]
  /** 사진 설명 */
  caption: string
  /** 작은 상자 — 예: 「오늘의 별내 날씨」 */
  sidebar: { title: string; text: string }
}

/** 기사 길이 상한 — 4×6 지면에 들어가는 만큼(news-print.ts 가 글자를 조금 줄여서라도 넣는다) */
export const NEWS_LIMITS = {
  kicker: 14,
  headline: 28,
  subhead: 46,
  paragraph: 120,
  articleTotal: 260,
  caption: 40,
  sidebarTitle: 14,
  sidebarText: 40,
} as const

/** 금지어 — FORTUNE! 과 같은 표(연애 · 돈 · 외모 · 점수 · 순위)에 신문만의 말(겨루기 · 상금 · 실존 상표 · 무서운 말)을 더했다 */
export const NEWS_FORBIDDEN_WORDS: readonly string[] = [
  ...FG_FORBIDDEN_WORDS,
  '금메달', '은메달', '동메달', '우승', '꼴찌', '최고 기록', '상금', '억 원', '만 원', '연봉', '사랑에', '사귀', '키스', '데이트',
  '전쟁', '무기', '피를', '다쳐 죽', '사망', '살인', '괴물',
  '나사', 'NASA', '삼성', '애플', '구글', '유튜브', '넷플릭스', '테슬라', '스페이스X', '노벨상', '올림픽', '월드컵', '아이돌',
  '키가', '뚱뚱', '날씬', '피부',
]

/** 나이를 말하는 표현(「12살」 「15세」 「초등학생」) — 나이는 묻지도 쓰지도 않는다 */
const AGE_PATTERN = /\d+\s*(살|세)(?![계기대])|초등학생|중학생|고등학생|어린 나이/

export function newsForbiddenWord(text: string): string | null {
  const word = NEWS_FORBIDDEN_WORDS.find((w) => text.includes(w))
  if (word) return word
  const age = AGE_PATTERN.exec(text)
  return age ? age[0] : null
}

/** 기사 틀 · 길이 · 금지어 검사 — 문제가 있으면 그 까닭(없으면 null). AI 응답 · 미리 쓴 기사 모두 같은 검사 */
export function checkNewsStory(story: NewsStory): string | null {
  const fields: [string, string, number][] = [
    ['kicker', story.kicker, NEWS_LIMITS.kicker],
    ['headline', story.headline, NEWS_LIMITS.headline],
    ['subhead', story.subhead, NEWS_LIMITS.subhead],
    ['caption', story.caption, NEWS_LIMITS.caption],
    ['sidebar.title', story.sidebar?.title, NEWS_LIMITS.sidebarTitle],
    ['sidebar.text', story.sidebar?.text, NEWS_LIMITS.sidebarText],
    ...(Array.isArray(story.article) ? story.article.map((p, i): [string, string, number] => [`article[${i}]`, p, NEWS_LIMITS.paragraph]) : []),
  ]
  if (!Array.isArray(story.article) || story.article.length < 2 || story.article.length > 3) return 'article 은 2~3 문단이어야 합니다'
  for (const [path, value, max] of fields) {
    if (typeof value !== 'string' || !value.trim()) return `${path} 가 비었습니다`
    if (value.length > max) return `${path} 가 너무 깁니다(${value.length}자 > ${max})`
    const bad = newsForbiddenWord(value)
    if (bad) return `${path} 에 쓰지 않는 말(${bad})이 있습니다`
  }
  const total = story.article.reduce((n, p) => n + p.length, 0)
  if (total > NEWS_LIMITS.articleTotal) return `기사가 너무 깁니다(${total}자 > ${NEWS_LIMITS.articleTotal})`
  return null
}

/** 주소 · 요청에서 받은 대답이 목록에 있는지 — 아니면 null */
export function parseNewsAnswers(value: unknown): NewsAnswers | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  const dream = typeof v.dream === 'string' && Object.hasOwn(NEWS_DREAM_BY_ID, v.dream) ? (v.dream as NewsDreamId) : null
  const like = typeof v.like === 'string' && Object.hasOwn(NEWS_LIKE_BY_ID, v.like) ? (v.like as NewsLikeId) : null
  const wish = typeof v.wish === 'string' && Object.hasOwn(NEWS_WISH_BY_ID, v.wish) ? (v.wish as NewsWishId) : null
  return dream && like && wish ? { dream, like, wish } : null
}

/** 호칭 — 의사 꿈 + 동물을 좋아하면 수의사 */
export function newsRole({ dream, like }: Pick<NewsAnswers, 'dream' | 'like'>): string {
  if (dream === 'healer' && like === 'animals') return '수의사'
  return NEWS_DREAM_BY_ID[dream].role
}

export const newsKicker = (answers: Pick<NewsAnswers, 'dream' | 'like'>) => `별내 출신 ${newsRole(answers)}`

/** 둘째 문단(추억 · 한마디) — 꿈 · 좋아하는 것 순서로 두 말투 중 하나(난수 없음) */
function memoryParagraph(role: string, like: NewsLike, turn: number): string {
  return turn % 2 === 0
    ? `${role}는 “어릴 적 펀그라운드 별내에서 ${like.memory} 시간이 지금의 저를 만들었어요”라고 말했다.`
    : `그 시작은 어릴 적 ${like.memory} 시간이었다. ${role}는 “그때 품은 상상을 하나씩 꺼내는 중이에요”라고 전했다.`
}

/** B안 기사 — 같은 대답이면 늘 같은 기사 */
export function buildNewsStory(answers: NewsAnswers): NewsStory {
  const dream = NEWS_DREAM_BY_ID[answers.dream]
  const like = NEWS_LIKE_BY_ID[answers.like]
  const wish = NEWS_WISH_BY_ID[answers.wish]
  const role = newsRole(answers)
  const front = FRONT[dream.id][wish.id]
  const turn = NEWS_DREAMS.indexOf(dream) + NEWS_LIKES.indexOf(like)
  return {
    kicker: `별내 출신 ${role}`,
    headline: front.h,
    subhead: `${like.heart} ${dream.grow}`,
    article: [
      `(별내=미래 신문) 별내 출신 ${role}가 ${front.l}`,
      memoryParagraph(role, like, turn),
      wish.close,
    ],
    caption: `▲ ${dream.place}에 선 별내 출신 ${role}`,
    sidebar: { title: '오늘의 별내 날씨', text: like.weather },
  }
}

/** 시험 · 점검용 — 모든 대답 조합(8 × 6 × 6 = 288) */
export function allNewsAnswers(): NewsAnswers[] {
  return NEWS_DREAMS.flatMap((d) => NEWS_LIKES.flatMap((l) => NEWS_WISHES.map((w) => ({ dream: d.id, like: l.id, wish: w.id }))))
}

/** 지면의 그날 — 오늘에서 20년 뒤 같은 날(2월 29일은 3월 1일로) */
export const NEWS_YEARS_AHEAD = 20
export function newsDate(today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setFullYear(d.getFullYear() + NEWS_YEARS_AHEAD)
  return d
}

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

/** 지면 머리 — 「2046년 11월 14일 수요일」 · 「제7,306호」(오늘 창간해 하루 한 호씩) */
export function newsDateline(today: Date): { date: string; weekday: string; issue: string; year: number } {
  const d = newsDate(today)
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const end = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const issue = Math.round((end - start) / 86_400_000) + 1
  return {
    date: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`,
    weekday: WEEKDAYS[d.getDay()],
    issue: `제${issue.toLocaleString('en-US')}호`,
    year: d.getFullYear(),
  }
}

/** 신문 아래 「20년 전 오늘의 나」 — 고른 대답 그대로 */
export function newsMemoRows(answers: NewsAnswers): { label: string; value: string }[] {
  return [
    { label: '꿈', value: NEWS_DREAM_BY_ID[answers.dream].label },
    { label: '좋아한 것', value: NEWS_LIKE_BY_ID[answers.like].label },
    { label: '해 보고 싶던 일', value: NEWS_WISH_BY_ID[answers.wish].label },
  ]
}

export const NEWS_DISCLAIMER = '재미로 상상해 보는 미래 신문이에요'
