export const EXPANSION_IDS = ["sommelier","cocktail","barista","taste-dna","style-profiler","coord","lookalike","science","palm","aura","product","team","vision-wall","heritage","travel","scent","face","couple"] as const
export type ExpansionId = (typeof EXPANSION_IDS)[number]
export const isExpansionId = (id: string): id is ExpansionId => (EXPANSION_IDS as readonly string[]).includes(id)
export const EXPANSION_META = {
  "sommelier": {
    "name": "소믈리에",
    "tag": "SIP!",
    "color": "#6B2941",
    "note": "사진(표정·옷 색) + 단맛·산미·바디감 → 와인 스타일과 테이스팅 카드",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/sommelier.webp"
  },
  "cocktail": {
    "name": "칵테일 크리에이터",
    "tag": "MIX!",
    "color": "#E65B39",
    "note": "사진(표정·옷 색) + 기분·맛 → 나만의 칵테일·논알코올 레시피",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/cocktail.webp"
  },
  "barista": {
    "name": "바리스타 매칭",
    "tag": "BREW!",
    "color": "#684333",
    "note": "사진(표정·옷 색) + 산미·고소함·추출법 → 원두와 한 잔의 프로필",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/barista.webp"
  },
  "taste-dna": {
    "name": "미각 DNA",
    "tag": "TASTE!",
    "color": "#5D6C36",
    "note": "사진(표정·옷 색) + 좋아하는 맛 → 취향 지도와 음식 조합",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/taste-dna.webp"
  },
  "style-profiler": {
    "name": "스타일 프로파일러",
    "tag": "STYLE!",
    "color": "#272B35",
    "note": "사진(지금 입은 옷 색) + 스타일·상황 → 취향 무드보드",
    "category": "패션",
    "hero": "/assets/kiosk-expansion/style-profiler.webp"
  },
  "coord": {
    "name": "코디 추천",
    "tag": "LOOK!",
    "color": "#3E6260",
    "note": "사진(지금 입은 옷 색) + 날씨·상황 → 아이템별 코디와 대안",
    "category": "패션",
    "hero": "/assets/kiosk-expansion/coord.webp"
  },
  "lookalike": {
    "name": "가상 스타 무드 체험",
    "tag": "STAR!",
    "color": "#256D99",
    "note": "사진(표정·옷 색)으로 짚어 주는 가상 스타 3명의 사진 무드 · 실존 인물 비교 없음",
    "category": "엔터테인먼트",
    "hero": "/assets/kiosk-expansion/lookalike.webp"
  },
  "science": {
    "name": "과학 체험",
    "tag": "LAB!",
    "color": "#2664BA",
    "note": "빛의 삼원색 실험 → 내 옷 색을 빛으로 만드는 미션까지",
    "category": "교육",
    "hero": "/assets/kiosk-expansion/science.webp"
  },
  "palm": {
    "name": "손금 이야기",
    "tag": "PALM!",
    "color": "#3B5B72",
    "note": "손을 펼친 모양 → 설명용 손 그림으로 즐기는 창작 이야기",
    "category": "운세",
    "hero": "/assets/kiosk-expansion/palm.webp"
  },
  "aura": {
    "name": "오라 컬러 체험",
    "tag": "AURA!",
    "color": "#785DA9",
    "note": "사진(표정·옷 색) + 기분·색 → 오늘의 컬러 카드와 작은 행동",
    "category": "운세",
    "hero": "/assets/kiosk-expansion/aura.webp"
  },
  "product": {
    "name": "제품 인터랙티브 체험관",
    "tag": "TOUCH!",
    "color": "#276F7A",
    "note": "사진(공간의 빛·옷 색)으로 맞춘 조명 → 회전·색·밝기 탐색과 연결 디스플레이",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/product.webp"
  },
  "team": {
    "name": "팀 케미",
    "tag": "TEAM!",
    "color": "#D07735",
    "note": "함께 찍은 사진 + 2~6명의 답변 → 함께 고른 관심사·하고 싶은 역할",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/team.webp"
  },
  "vision-wall": {
    "name": "비전 월",
    "tag": "VISION!",
    "color": "#314C97",
    "note": "사진(옷 색·표정)으로 고른 카드에 한 문장 → 벽면의 공동 비전 작품",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/vision-wall.webp"
  },
  "heritage": {
    "name": "문화유산 타임머신",
    "tag": "HERITAGE!",
    "color": "#315C6B",
    "note": "사진 속 빛으로 고른 시간대 → 문화유산 재현 장면과 연결 전시 화면",
    "category": "관광",
    "hero": "/assets/kiosk-expansion/heritage.webp"
  },
  "travel": {
    "name": "여행 성향",
    "tag": "TRIP!",
    "color": "#268075",
    "note": "사진(표정·옷 색) + 여행에서 원하는 것 → 여행 취향과 하루 코스",
    "category": "관광",
    "hero": "/assets/kiosk-expansion/travel.webp"
  },
  "scent": {
    "name": "향수 소울메이트",
    "tag": "SCENT!",
    "color": "#58694F",
    "note": "사진(옷 색·표정) + 향 취향·무드 → 향 노트와 시향 카드",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/scent.webp"
  },
  "face": {
    "name": "관상에서 착안한 이야기",
    "tag": "FACE!",
    "color": "#805849",
    "note": "사진(표정)·주제 선택 → 전통 관상에서 착안한 창작 이야기",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/face.webp"
  },
  "couple": {
    "name": "커플 케미",
    "tag": "US!",
    "color": "#A65258",
    "note": "두 사람 사진 + 취향·대화 질문 → 같은 점·다른 점·데이트 아이디어",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/couple.webp"
  }
} as const
export type PreferenceId = 'sommelier' | 'cocktail' | 'barista' | 'taste-dna' | 'style-profiler' | 'coord' | 'aura' | 'travel' | 'scent'
export type Answers = Record<string, string | string[] | number>
export interface ChoiceOption { id: string; label: string; note?: string; color?: string; icon?: string }
export interface Question { key: string; title: string; note?: string; type: 'single' | 'multi' | 'scale'; options?: ChoiceOption[]; min?: number; max?: number; step?: number; initial?: number; required?: boolean; unit?: string }
export interface QuestionStep { title: string; note?: string; questions: Question[] }
export interface PreferenceDefinition { id: PreferenceId; headline: string; description: string; guide: string[]; steps: QuestionStep[]; resultLabel: string; footnote?: string }
export interface ResultSection { title: string; body: string; items?: string[] }
export interface ResultMetric { label: string; value: number; max: number; color?: string }
export interface ExperienceResult { id: string; title: string; subtitle?: string; summary: string; tags: string[]; sections: ResultSection[]; metrics?: ResultMetric[]; palette?: string[]; footnote?: string }
export interface AnswerSummary { key: string; label: string; value: string; step: number }
export interface RecommendationBundle { primary: ExperienceResult; alternatives: ExperienceResult[]; summary: AnswerSummary[] }
