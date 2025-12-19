// 10가지 특성 점수 인터페이스
export interface TraitScores {
  sexy: number;        // 섹시함 (1-10)
  cute: number;        // 귀여움 (1-10)
  charisma: number;    // 카리스마 (1-10)
  darkness: number;    // 다크함 (1-10)
  freshness: number;   // 청량함 (1-10)
  elegance: number;    // 우아함 (1-10)
  freedom: number;     // 자유로움 (1-10)
  luxury: number;      // 럭셔리함 (1-10)
  purity: number;      // 순수함 (1-10)
  uniqueness: number;  // 독특함 (1-10)
}

// 향 카테고리 점수
export interface ScentCategoryScores {
  citrus: number;      // 시트러스 (1-10)
  floral: number;      // 플로럴 (1-10)
  woody: number;       // 우디 (1-10)
  musky: number;       // 머스크 (1-10)
  fruity: number;      // 프루티 (1-10)
  spicy: number;       // 스파이시 (1-10)
}

// 퍼스널 컬러 타입
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type ToneType = 'bright' | 'light' | 'mute' | 'deep';

export interface PersonalColor {
  season: SeasonType;
  tone: ToneType;
  palette: string[];  // HEX 색상 배열
  description: string;
}

// 향수 노트 정보
export interface ScentNote {
  name: string;
  description?: string;
  fanComment?: string;  // 주접 멘트 (AI 생성)
}

// 사용 가이드 정보 (주접 멘트)
export interface UsageGuide {
  situation: string;      // 사용 상황 주접 멘트
  tips: string[];         // 사용 팁 주접 멘트 배열
}

// 향수 페르소나
export interface PerfumePersona {
  id: string;
  name: string;
  description: string;
  traits: TraitScores;
  categories: ScentCategoryScores;
  keywords: string[];
  primaryColor: string;
  secondaryColor: string;
  mainScent?: ScentNote;
  subScent1?: ScentNote;
  subScent2?: ScentNote;
  recommendation?: string;
  mood?: string;
  personality?: string;
  usageGuide?: UsageGuide;  // AI 생성 사용 가이드
}

// 비교 분석 결과 타입
export interface ComparisonAnalysis {
  imageInterpretation: string;  // AI가 이미지만으로 해석한 내용 (주접 톤)
  userInputSummary: string;      // 유저 응답 요약 (주접 톤)
  reflectionDetails: string;     // 두 가지가 최종 결과에 어떻게 반영되었는지 상세 설명 (주접 톤)
}

// 이미지 분석 결과 타입
export interface ImageAnalysisResult {
  traits: TraitScores;
  scentCategories: ScentCategoryScores;
  dominantColors: string[];
  personalColor: PersonalColor;
  analysis?: {
    mood: string;
    style: string;
    expression: string;
    concept: string;
    aura?: string;
    toneAndManner?: string;
  };
  matchingKeywords?: string[];
  matchingPerfumes: {
    perfumeId: string;
    score: number;
    matchReason: string;
    persona?: PerfumePersona;
  }[];
  comparisonAnalysis?: ComparisonAnalysis;  // 이미지 vs 유저 응답 비교 분석
}

// 사용자 입력 폼 데이터
export interface FormDataType {
  pin: string;
  name: string;
  gender: string;
  styles: string[];
  customStyle: string;
  personalities: string[];
  customPersonality: string;
  charmPoints: string[];
  customCharm: string;
  image: File | null;
}

// 트레이트 라벨 맵
export const TRAIT_LABELS: Record<keyof TraitScores, string> = {
  sexy: '섹시함',
  cute: '귀여움',
  charisma: '카리스마',
  darkness: '다크함',
  freshness: '청량함',
  elegance: '우아함',
  freedom: '자유로움',
  luxury: '럭셔리함',
  purity: '순수함',
  uniqueness: '독특함'
};

// 트레이트 아이콘 맵
export const TRAIT_ICONS: Record<keyof TraitScores, string> = {
  sexy: '💋',
  cute: '🌸',
  charisma: '✨',
  darkness: '🌑',
  freshness: '🌊',
  elegance: '🦢',
  freedom: '🕊️',
  luxury: '💎',
  purity: '🤍',
  uniqueness: '🌈'
};

// 카테고리 정보
export const CATEGORY_INFO: Record<string, { bg: string; text: string; icon: string; name: string }> = {
  citrus: { bg: 'bg-yellow-400', text: 'text-yellow-900', icon: '🍋', name: '시트러스' },
  floral: { bg: 'bg-pink-400', text: 'text-pink-900', icon: '🌸', name: '플로럴' },
  woody: { bg: 'bg-amber-600', text: 'text-amber-900', icon: '🌳', name: '우디' },
  musky: { bg: 'bg-purple-400', text: 'text-purple-900', icon: '✨', name: '머스크' },
  fruity: { bg: 'bg-red-400', text: 'text-red-900', icon: '🍎', name: '프루티' },
  spicy: { bg: 'bg-orange-400', text: 'text-orange-900', icon: '🌶️', name: '스파이시' }
};

// 시즌 한글명
export const SEASON_LABELS: Record<SeasonType, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울'
};

// 톤 한글명
export const TONE_LABELS: Record<ToneType, string> = {
  bright: '브라이트',
  light: '라이트',
  mute: '뮤트',
  deep: '딥'
};



