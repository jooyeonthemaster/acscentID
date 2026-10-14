export const EXPANSION_IDS = ["sommelier","cocktail","barista","taste-dna","style-profiler","coord","lookalike","science","palm","aura","product","team","vision-wall","heritage","travel","scent","face","couple"] as const
export type ExpansionId = (typeof EXPANSION_IDS)[number]
export const isExpansionId = (id: string): id is ExpansionId => (EXPANSION_IDS as readonly string[]).includes(id)
export const EXPANSION_META = {
  "sommelier": {
    "name": "소믈리에",
    "tag": "SIP!",
    "color": "#6B2941",
    "note": "단맛·산미·바디감 선택 → 와인 스타일과 테이스팅 카드",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/sommelier.webp"
  },
  "cocktail": {
    "name": "칵테일 크리에이터",
    "tag": "MIX!",
    "color": "#E65B39",
    "note": "기분·맛 선택 → 나만의 칵테일·논알코올 레시피",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/cocktail.webp"
  },
  "barista": {
    "name": "바리스타 매칭",
    "tag": "BREW!",
    "color": "#684333",
    "note": "산미·고소함·추출법 → 원두와 한 잔의 프로필",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/barista.webp"
  },
  "taste-dna": {
    "name": "미각 DNA 프로파일",
    "tag": "TASTE!",
    "color": "#5D6C36",
    "note": "좋아하는 맛 선택 → 취향 지도와 음식 조합",
    "category": "식음료",
    "hero": "/assets/kiosk-expansion/taste-dna.webp"
  },
  "style-profiler": {
    "name": "스타일 프로파일러",
    "tag": "STYLE!",
    "color": "#272B35",
    "note": "스타일 카드·상황 선택 → 취향 무드보드",
    "category": "패션",
    "hero": "/assets/kiosk-expansion/style-profiler.webp"
  },
  "coord": {
    "name": "코디 추천 키오스크",
    "tag": "LOOK!",
    "color": "#3E6260",
    "note": "날씨·상황·취향 → 아이템별 코디와 대안",
    "category": "패션",
    "hero": "/assets/kiosk-expansion/coord.webp"
  },
  "lookalike": {
    "name": "연예인 닮은꼴 진단",
    "tag": "STAR!",
    "color": "#256D99",
    "note": "얼굴 확인·분위기 선택 → 가상 스타 스타일 3종",
    "category": "엔터테인먼트",
    "hero": "/assets/kiosk-expansion/lookalike.webp"
  },
  "science": {
    "name": "과학 체험 키오스크",
    "tag": "LAB!",
    "color": "#2664BA",
    "note": "빛의 삼원색 실험 → 슬라이더로 색을 섞는 터치 실험",
    "category": "교육",
    "hero": "/assets/kiosk-expansion/science.webp"
  },
  "palm": {
    "name": "손금 로봇",
    "tag": "PALM!",
    "color": "#3B5B72",
    "note": "손바닥 확인 → 설명용 손금 선으로 즐기는 이야기",
    "category": "운세",
    "hero": "/assets/kiosk-expansion/palm.webp"
  },
  "aura": {
    "name": "오라 리딩",
    "tag": "AURA!",
    "color": "#785DA9",
    "note": "기분·분위기·색 선택 → 오라 컬러와 오늘의 키워드",
    "category": "운세",
    "hero": "/assets/kiosk-expansion/aura.webp"
  },
  "product": {
    "name": "제품 인터랙티브 체험관",
    "tag": "TOUCH!",
    "color": "#276F7A",
    "note": "제품 회전·소재 선택·기능 탐색 → 연결 디스플레이 체험 제어",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/product.webp"
  },
  "team": {
    "name": "팀 케미 분석",
    "tag": "TEAM!",
    "color": "#D07735",
    "note": "여러 명의 선택 답변 → 협업 스타일·역할·공통 관심사",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/team.webp"
  },
  "vision-wall": {
    "name": "비전 월",
    "tag": "VISION!",
    "color": "#314C97",
    "note": "메시지·컬러 작성 → 벽면에 나타나는 공동 비전 작품 제어",
    "category": "기업",
    "hero": "/assets/kiosk-expansion/vision-wall.webp"
  },
  "heritage": {
    "name": "문화유산 타임머신",
    "tag": "HERITAGE!",
    "color": "#315C6B",
    "note": "시대·시간대 선택 → 문화유산 재현 장면과 연결 전시 화면",
    "category": "관광",
    "hero": "/assets/kiosk-expansion/heritage.webp"
  },
  "travel": {
    "name": "여행 성향 진단",
    "tag": "TRIP!",
    "color": "#268075",
    "note": "여행에서 원하는 것 선택 → 여행 취향과 하루 코스",
    "category": "관광",
    "hero": "/assets/kiosk-expansion/travel.webp"
  },
  "scent": {
    "name": "향수 소울메이트",
    "tag": "SCENT!",
    "color": "#58694F",
    "note": "향 취향 설문·무드 선택 → 향 노트와 시향 카드",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/scent.webp"
  },
  "face": {
    "name": "관상 분석",
    "tag": "FACE!",
    "color": "#805849",
    "note": "촬영·주제 선택 → 전통 관상에서 착안한 창작 이야기",
    "category": "기존 기능 확장",
    "hero": "/assets/kiosk-expansion/face.webp"
  },
  "couple": {
    "name": "커플 케미 진단",
    "tag": "US!",
    "color": "#A65258",
    "note": "두 사람 취향·대화 질문 → 같은 점·다른 점·데이트 아이디어",
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
