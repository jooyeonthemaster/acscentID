// Aible AI 주문 키오스크 — 데이터 계약.
// 가상 매장(모락 MORAK, 을지로 한식당)의 메뉴·재료·나라 목록이 이 타입을 따른다.
// 화면 언어는 넷(ko/en/ja/fr)뿐이다. 나라 고르기에서는 200여 나라가 보이지만, 각 나라는 이 넷 중 하나(ui)로 이어진다.

export const ORDER_LANGS = ['ko', 'en', 'ja', 'fr'] as const
export type OrderLang = (typeof ORDER_LANGS)[number]

/** 네 언어 문구 — ko 가 원본이다(사장님이 입력한 값) */
export type L10n = Record<OrderLang, string>

/** 유럽연합 14대 알레르기 유발 물질 — 외국인 손님에게 가장 익숙한 기준(사업계획서 'HACCP 14종 체크리스트') */
export const ALLERGEN_IDS = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const
export type AllergenId = (typeof ALLERGEN_IDS)[number]

/** 고기 종류 — 종교·식습관 거름(무슬림 돼지고기, 힌두 소고기 등) */
export type MeatKind = 'pork' | 'beef' | 'chicken'

export interface Ingredient {
  id: string
  name: L10n
  allergens: AllergenId[]
  meat?: MeatKind
  /** 동물성(고기·해산물·달걀·유제품·꿀 등) — 비건 판정 */
  animal?: boolean
  /** 달걀·유제품·꿀처럼 채식(락토-오보)은 되지만 비건은 아닌 동물성 */
  vegetarianOk?: boolean
  alcohol?: boolean
  /** 메뉴 이름만 봐서는 모르는 숨은 재료(새우젓·멸치 육수·액젓 등) — AI 가 먼저 짚어 준다 */
  hidden?: boolean
  /** 숨은 재료일 때 손님에게 보여 줄 한 줄 설명 */
  hiddenNote?: L10n
}

export type CategoryId = 'signature' | 'stew' | 'rice-noodle' | 'grill' | 'street' | 'dessert' | 'drink'

export interface Category {
  id: CategoryId
  label: L10n
}

export interface OptionChoice {
  id: string
  label: L10n
  priceDelta?: number
  /** 이 선택지를 고르면 더해지거나 빠지는 재료(알레르기·식습관 판정이 따라 바뀐다) */
  addIngredients?: string[]
  removeIngredients?: string[]
  /** 매운 정도를 이만큼 바꾼다(-4~+4) */
  spiceDelta?: number
}

export interface OptionGroup {
  id: string
  label: L10n
  choices: OptionChoice[]
  /** 기본 선택지 id */
  defaultChoice: string
}

/** 매운 정도 — 한국 기준 0(안 매움)~4(아주 매움) */
export type SpiceLevel = 0 | 1 | 2 | 3 | 4

export interface MenuItem {
  id: string
  category: CategoryId
  /** 원(KRW) */
  price: number
  /** ko = 한글 메뉴명(주방·직원에게 보여 줄 이름) */
  name: L10n
  /** 로마자 표기 — 'Dolsot Bibimbap' */
  romanized: string
  /** 카드 한 줄 설명(언어마다 약 40자 이내) */
  tagline: L10n
  /** 상세 설명 2~3문장 — 음식의 문화적 맥락까지 */
  description: L10n
  /** 먹는 법 한두 문장 */
  howToEat: L10n
  /** 사장님 한마디 — 이 매장만의 사실(재료 출처·조리법·추천). 범용 AI 는 모르는 정보 */
  ownerNote: L10n
  ingredients: string[]
  options?: OptionGroup[]
  spice: SpiceLevel
  kcal: number
  /** 몇 인분 */
  servings: number
  /** 실제 크기 — 그릇 지름(cm). 3D 보기·크기 비교에 쓴다 */
  sizeCm: number
  temperature: 'hot' | 'cold' | 'room'
  prepMinutes: number
  /** 이 매장 주문 데이터 — 나라별로 이 메뉴를 고른 손님 비율(%) */
  lovedBy: { country: string; pct: number }[]
  /** 전체 인기 순위(1 = 가장 많이 팔림) */
  rank: number
  /** 같이 먹으면 좋은 메뉴 id */
  pairsWith: string[]
  badges: ('signature' | 'best' | 'vegan' | 'new' | 'chef')[]
  /** AR 3D 모델이 있는가(src/app/kiosk/order/three) */
  has3D: boolean
  /** 19세 이상(주류) */
  adultsOnly?: boolean
}

export type Region = 'asia' | 'europe' | 'americas' | 'middle-east' | 'africa' | 'oceania'

export interface Country {
  /** ISO 3166-1 alpha-2 소문자 — 국기 파일 이름(public/assets/kiosk-order/flags/<code>.svg) */
  code: string
  /** 영어 이름 — 검색 기준 */
  name: string
  /** 그 나라 말로 쓴 나라 이름 */
  native: string
  /** 검색 별칭(USA, America, UK, Holland …) — 소문자 */
  aliases?: string[]
  /** 그 나라 대표 언어를 그 언어로 쓴 이름 — 'Deutsch', 'Español' */
  language: string
  /** 그 나라 말 인사 — 'Hallo', '¡Hola!' */
  greeting: string
  /** 실제로 이어지는 화면 언어 */
  ui: OrderLang
  currency: {
    code: string
    symbol: string
    /** 1 단위가 몇 원인지(참고 환율) */
    krw: number
    /** 소수 자리 — JPY/KRW 0, USD 2 */
    decimals: number
  }
  region: Region
  /** 인기 나라(첫 화면 큰 칸) 순서 — 없으면 목록에만 */
  featured?: number
}

export interface StoreProfile {
  /** 로마자 상호 — 'MORAK' */
  name: string
  /** 한글 상호 — '모락' */
  nameKo: string
  tagline: L10n
  area: L10n
  since: number
  owner: L10n
  hours: L10n
  /** 매장 RAG 데이터 규모 — 화면의 'AI 가 학습한 이 매장 데이터' 표시 */
  knowledge: { dishes: number; ingredients: number; ownerNotes: number; orders: number }
  /** 식사 뒤 걸어서 갈 만한 곳 — 관광 연계 */
  nearby: { id: string; name: L10n; walkMin: number; note: L10n }[]
}

export interface FaqEntry {
  id: string
  /** 손님 말에서 이 항목을 찾는 단서 — 언어별 소문자 낱말·구절(부분 일치) */
  keywords: Record<OrderLang, string[]>
  question: L10n
  answer: L10n
}
