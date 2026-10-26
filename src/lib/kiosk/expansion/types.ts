import type { ScentRecipe } from './recipe'
export const EXPANSION_IDS = ["sommelier","cocktail","barista","taste-dna","style-profiler","coord","lookalike","science","palm","aura","product","team","vision-wall","heritage","travel","scent","face","couple","housing-scent","housing-home","housing-mate"] as const
export type ExpansionId = (typeof EXPANSION_IDS)[number]
export const isExpansionId = (id: string): id is ExpansionId => (EXPANSION_IDS as readonly string[]).includes(id)
export const EXPANSION_META = {
  "sommelier": {
    "name": "소믈리에",
    "tag": "SIP!",
    "color": "#6B2941",
    "note": "사진 + 단맛·산미·바디감 → AI가 골라 풀어 주는 와인 스타일과 테이스팅 카드",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/sommelier.webp"
  },
  "cocktail": {
    "name": "칵테일 크리에이터",
    "tag": "MIX!",
    "color": "#E65B39",
    "note": "사진 + 기분·맛 → AI가 골라 주는 나만의 칵테일·논알코올 레시피",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/cocktail.webp"
  },
  "barista": {
    "name": "바리스타 매칭",
    "tag": "BREW!",
    "color": "#684333",
    "note": "사진 + 산미·고소함·추출법 → AI가 골라 주는 원두와 추출 가이드",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/barista.webp"
  },
  "taste-dna": {
    "name": "미각 DNA",
    "tag": "TASTE!",
    "color": "#5D6C36",
    "note": "사진 + 좋아하는 맛 → AI가 풀어 주는 맛 지도와 음식 조합",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/taste-dna.webp"
  },
  "style-profiler": {
    "name": "스타일 프로파일러",
    "tag": "STYLE!",
    "color": "#272B35",
    "note": "지금 입은 옷 사진 + 스타일·상황 → AI 스타일 무드보드",
    "category": "패션",
    "hero": "/assets/kiosk-expansion/style-profiler.webp"
  },
  "coord": {
    "name": "코디 추천",
    "tag": "LOOK!",
    "color": "#3E6260",
    "note": "지금 입은 옷 사진 + 날씨·상황 → AI가 추천 코디를 입혀 주는 룩북",
    "category": "패션",
    "hero": "/assets/kiosk-expansion/coord.webp"
  },
  "lookalike": {
    "name": "가상 스타 무드 체험",
    "tag": "STAR!",
    "color": "#256D99",
    "note": "표정·옷 색으로 짚는 가상 스타 무드 → AI 화보 사진 · 실존 인물 비교 없음",
    "category": "엔터테인먼트",
    "hero": "/assets/kiosk-expansion/lookalike.webp"
  },
  "science": {
    "name": "과학 체험",
    "tag": "LAB!",
    "color": "#2664BA",
    "note": "빛의 삼원색 실험 · 내 옷 색 미션 → AI 선생님의 실험 해설",
    "category": "교육",
    "hero": "/assets/kiosk-expansion/science.webp"
  },
  "palm": {
    "name": "손금 이야기",
    "tag": "PALM!",
    "color": "#3B5B72",
    "note": "손을 펼친 모양 → AI가 지어 주는 손 위의 창작 이야기",
    "category": "운세",
    "hero": "/assets/kiosk-expansion/palm.webp"
  },
  "aura": {
    "name": "오라 컬러 체험",
    "tag": "AURA!",
    "color": "#785DA9",
    "note": "사진 + 기분·색 → AI 오라 컬러 사진과 오늘의 작은 행동",
    "category": "운세",
    "hero": "/assets/kiosk-expansion/aura.webp"
  },
  "product": {
    "name": "제품 인터랙티브 체험관",
    "tag": "TOUCH!",
    "color": "#276F7A",
    "note": "사진 속 빛으로 맞춘 가상 조명 → 회전·색·밝기 탐색과 AI 공간 제안",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/product.webp"
  },
  "team": {
    "name": "팀 케미",
    "tag": "TEAM!",
    "color": "#D07735",
    "note": "단체 사진 + 2~6명의 답변 → 함께 고른 관심사와 AI 팀 포스터",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/team.webp"
  },
  "vision-wall": {
    "name": "비전 월",
    "tag": "VISION!",
    "color": "#314C97",
    "note": "사진으로 고른 카드에 한 문장 → 전시 벽 게시와 AI 응원 해설",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/vision-wall.webp"
  },
  "heritage": {
    "name": "문화유산 타임머신",
    "tag": "HERITAGE!",
    "color": "#315C6B",
    "note": "궁궐 장면·시대·빛 탐험 → AI 타임머신 사진(옛 풍경은 한복)",
    "category": "관광",
    "hero": "/assets/kiosk-expansion/heritage.webp"
  },
  "travel": {
    "name": "여행 성향",
    "tag": "TRIP!",
    "color": "#268075",
    "note": "사진 + 여행에서 원하는 것 → AI가 골라 주는 여행 코스",
    "category": "관광",
    "hero": "/assets/kiosk-expansion/travel.webp"
  },
  "scent": {
    "name": "향수 소울메이트",
    "tag": "SCENT!",
    "color": "#58694F",
    "note": "사진 + 향 취향·무드 → AI가 골라 주는 시향 후보와 노트",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/scent.webp"
  },
  "face": {
    "name": "관상에서 착안한 이야기",
    "tag": "FACE!",
    "color": "#805849",
    "note": "표정 사진 + 오늘의 주제 → 관상에서 착안한 AI 창작 이야기",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/face.webp"
  },
  "couple": {
    "name": "커플 케미",
    "tag": "US!",
    "color": "#A65258",
    "note": "두 사람 사진 + 취향 질문 → 같은 점·다른 점과 AI 커플 포스터",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/couple.webp"
  }
,
  // 주거복지대전(2026-12-16) 체험 3종 — 데이터·규칙은 housing.ts, 화면은 app/kiosk/experience/expansion/HousingModes.tsx
  "housing-scent": {
    "name": "우리 집 향 처방",
    "tag": "ROOM!",
    "color": "#1F5C8B",
    "note": "사는 집 · 햇빛 · 고민 · 원하는 분위기 → AI가 우리 집에 맞는 향료 둘을 블렌딩한 조향 레시피",
    "category": "주거복지",
    "hero": "/assets/kiosk-expansion/housing-scent.webp"
  },
  "housing-home": {
    "name": "2036 우리 집의 향",
    "tag": "MY HOME!",
    "color": "#2C7A6B",
    "note": "사진 한 장 + 10년 뒤 집 장면 → AI 캐리커처와 그 집에 어울리는 조향 레시피",
    "category": "주거복지",
    "hero": "/assets/kiosk-expansion/housing-home.webp"
  },
  "housing-mate": {
    "name": "우리 집 성향 향수",
    "tag": "MATE!",
    "color": "#B5603A",
    "note": "여덟 가지 질문 → 주거 성향 캐릭터 · 잘 맞는 이웃 · 그 성향의 시그니처 조향 레시피",
    "category": "주거복지",
    "hero": "/assets/kiosk-expansion/housing-mate.webp"
  }} as const
export type PreferenceId = 'sommelier' | 'cocktail' | 'barista' | 'taste-dna' | 'style-profiler' | 'coord' | 'aura' | 'travel' | 'scent'
export type Answers = Record<string, string | string[] | number>
export interface ChoiceOption { id: string; label: string; note?: string; color?: string; icon?: string }
export interface Question { key: string; title: string; note?: string; type: 'single' | 'multi' | 'scale'; options?: ChoiceOption[]; min?: number; max?: number; step?: number; initial?: number; required?: boolean; unit?: string }
export interface QuestionStep { title: string; note?: string; questions: Question[] }
export interface PreferenceDefinition { id: PreferenceId; headline: string; description: string; guide: string[]; steps: QuestionStep[]; resultLabel: string; footnote?: string }
export interface ResultSection { title: string; body: string; items?: string[] }
export interface ResultMetric { label: string; value: number; max: number; color?: string }
/** recipe — 조향 레시피(주거복지대전 3종, recipe.ts). 있으면 화면·카드·영수증이 레시피 칸을 먼저 그린다
 *  art — 결과를 대표하는 그림(성향 캐릭터 등, AI 합성이 아닌 준비된 그림). 결과 카드 머리와 영수증 그림에 쓴다 */
export interface ExperienceResult { id: string; title: string; subtitle?: string; summary: string; tags: string[]; sections: ResultSection[]; metrics?: ResultMetric[]; palette?: string[]; footnote?: string; recipe?: ScentRecipe; art?: { src: string; caption: string; wide?: boolean } }
export interface AnswerSummary { key: string; label: string; value: string; step: number }
export interface RecommendationBundle { primary: ExperienceResult; alternatives: ExperienceResult[]; summary: AnswerSummary[] }
