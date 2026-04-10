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

// 추천 계절/시간대 타입
export type BestSeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type BestTimeType = 'morning' | 'afternoon' | 'evening' | 'night';

// 추천 계절/시간대 정보
export interface ScentRecommendation {
  best_season: BestSeasonType;
  best_time: BestTimeType;
  season_reason?: string;
  time_reason?: string;
}

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
  scentRecommendation?: ScentRecommendation;  // 추천 계절/시간대
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

// 추천 계절 라벨
export const BEST_SEASON_LABELS: Record<BestSeasonType, { label: string; icon: string }> = {
  spring: { label: '봄', icon: '🌸' },
  summer: { label: '여름', icon: '☀️' },
  autumn: { label: '가을', icon: '🍂' },
  winter: { label: '겨울', icon: '❄️' }
};

// 추천 시간대 라벨
export const BEST_TIME_LABELS: Record<BestTimeType, { label: string; icon: string }> = {
  morning: { label: '오전', icon: '🌅' },
  afternoon: { label: '오후', icon: '☀️' },
  evening: { label: '저녁', icon: '🌆' },
  night: { label: '밤', icon: '🌙' }
};

// ========================================
// 피규어 디퓨저 전용 타입
// ========================================

// 피규어 감정 특성 (10가지)
export interface FigureEmotionTraits {
  nostalgia: number;      // 그리움/향수 (1-10)
  warmth: number;         // 따뜻함 (1-10)
  excitement: number;     // 설렘 (1-10)
  comfort: number;        // 편안함 (1-10)
  passion: number;        // 열정 (1-10)
  tenderness: number;     // 다정함 (1-10)
  joy: number;            // 기쁨 (1-10)
  melancholy: number;     // 아련함 (1-10)
  serenity: number;       // 평온함 (1-10)
  intensity: number;      // 강렬함 (1-10)
}

// 피규어 감정 특성 라벨
export const FIGURE_EMOTION_LABELS: Record<keyof FigureEmotionTraits, string> = {
  nostalgia: '그리움',
  warmth: '따뜻함',
  excitement: '설렘',
  comfort: '편안함',
  passion: '열정',
  tenderness: '다정함',
  joy: '기쁨',
  melancholy: '아련함',
  serenity: '평온함',
  intensity: '강렬함'
};

// 피규어 감정 특성 아이콘
export const FIGURE_EMOTION_ICONS: Record<keyof FigureEmotionTraits, string> = {
  nostalgia: '🌙',
  warmth: '☀️',
  excitement: '💓',
  comfort: '🛋️',
  passion: '🔥',
  tenderness: '💕',
  joy: '😊',
  melancholy: '🌧️',
  serenity: '🍃',
  intensity: '⚡'
};

// 기억 장면 정보
export interface MemoryScene {
  sceneImage?: string;           // 업로드한 장면 이미지 URL
  sceneTitle: string;            // 장면 제목 (예: "처음 함께 걸었던 봄날")
  sceneSummary: string;          // 채팅에서 추출한 장면 요약
  emotions: string[];            // 감정 키워드 배열
  sceneDate?: string;            // 사용자가 언급한 시기 (선택)
  seasonTime?: string;           // 계절/시간대
  colorTone?: string;            // 색감/톤
  extractedScent: {
    primary: string;             // 추출된 주요 향 (예: "벚꽃 향기")
    description: string;         // 향 설명
  };
}

// 피규어 모델링 정보
export interface FigureModeling {
  figureImage: string;           // 피규어용 이미지 URL
  characterName: string;         // 캐릭터명
  poseDescription?: string;      // 포즈 설명
  specialRequests: string[];     // 사용자 요청사항 배열
  colorPalette?: string[];       // 추천 색상 팔레트
  diffuserScent?: string;        // 디퓨저에 담길 향
  adminNotes?: string;           // 관리자 확인용 메모
}

// 향기 스토리
export interface ScentStory {
  storyTitle: string;            // 스토리 제목 (예: "봄날의 약속을 담은 향")
  storyNarrative: string;        // AI 생성 향수 스토리
  memoryConnection: string;      // 기억과 향의 연결 설명
}

// 피규어 분석 데이터 (ImageAnalysisResult 확장용)
export interface FigureAnalysisData {
  memoryScene: MemoryScene;
  figureModeling: FigureModeling;
  scentStory: ScentStory;
  emotionTraits: FigureEmotionTraits;
}

// 채팅 메시지 타입
export interface FigureChatMessage {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  image?: string;                // 이미지 URL 또는 base64
  imageType?: 'memory' | 'figure';
  isEmpathy?: boolean;           // AI 공감 반응 여부
}

// 빠른 응답 옵션
export interface QuickReply {
  id: string;
  label: string;
  value: string;
  emoji?: string;
}

// 채팅 단계
export type FigureChatPhase =
  | 'greeting'        // 인사 & 기억 수집
  | 'emotion'         // 감정 수집
  | 'context'         // 분위기/맥락 수집
  | 'memory_image'    // 기억 장면 이미지
  | 'color_tone'      // 색감/톤 수집
  | 'figure_intro'    // 피규어 안내
  | 'figure_image'    // 피규어 이미지
  | 'figure_request'  // 피규어 요청사항
  | 'complete'        // 완료 & 분석
  | 'analyzing';      // 분석 중

// 채팅 수집 데이터
export interface FigureChatData {
  memoryStory: string;           // 기억 이야기
  emotion: string;               // 감정
  seasonTime: string;            // 계절/시간
  colorTone: string;             // 색감/톤
  memoryImage: File | null;      // 기억 장면 이미지
  memoryImagePreview: string | null;  // 미리보기 base64
  figureImage: File | null;      // 피규어용 이미지
  figureImagePreview: string | null;  // 미리보기 base64
  figureRequest: string;         // 피규어 요청사항
  userName?: string;             // 사용자/최애 이름
}

// 채팅 상태
export interface FigureChatState {
  messages: FigureChatMessage[];
  currentPhase: FigureChatPhase;
  collectedData: FigureChatData;
  isAiTyping: boolean;
  isSubmitting: boolean;
  progress: number;              // 0-100
}


// ========================================
// 졸업 향 추천 프로그램 (JOLLDUCK) 타입
// ========================================

// 졸업 유형
export type GraduationType = 'elementary' | 'middle' | 'high' | 'university' | 'graduate' | 'other';

// 졸업 유형 라벨
export const GRADUATION_TYPE_LABELS: Record<GraduationType, string> = {
  elementary: '초등학교',
  middle: '중학교',
  high: '고등학교',
  university: '대학교',
  graduate: '대학원',
  other: '기타'
};

// 졸업 폼 데이터 타입
export interface GraduationFormDataType {
  // 기본 정보
  pin?: string;                    // 오프라인 모드 인증 번호 (4자리)
  name: string;                    // 분석 대상 이름
  gender: string;                  // 성별
  graduationType: GraduationType;  // 졸업 유형
  schoolName?: string;             // 학교명 (선택)

  // 학창 시절의 모습 (과거)
  pastStyles: string[];            // 학창 시절 스타일
  pastPersonalities: string[];     // 학창 시절 성격
  pastMemories: string;            // 학창 시절 기억/추억 (자유 서술)

  // 졸업하는 지금의 모습 (현재)
  currentFeeling: string;          // 현재 감정 상태
  currentGrowth: string[];         // 성장한 점들
  currentAchievements: string;     // 이룬 것들 (자유 서술)

  // 졸업 후의 모습 (미래)
  futureDreams: string[];          // 미래 꿈/목표
  futurePersonality: string[];     // 되고 싶은 모습
  futureWish: string;              // 미래에 대한 바람 (자유 서술)

  // 이미지
  image: File | null;              // 졸업 사진 또는 현재 사진
  imagePreview?: string | null;    // 이미지 미리보기 base64

  // 이미지 변환 여부 (선택)
  transformImage?: boolean;        // 졸업사진 스타일로 변환 여부
  transformedImageUrl?: string;    // 변환된 이미지 URL
}

// 시간별 향기 분석
export interface TimeScentAnalysis {
  description: string;             // 해당 시간대 향기 설명
  keywords: string[];              // 키워드
  noteConnection: string;          // 향 노트와의 연결 설명
}

// 졸업 분석 데이터
export interface GraduationAnalysis {
  pastScent: TimeScentAnalysis;    // 학창 시절의 향기 (탑노트 연결)
  presentScent: TimeScentAnalysis; // 현재의 향기 (미들노트 연결)
  futureScent: TimeScentAnalysis;  // 미래의 향기 (베이스노트 연결)
}

// 시간 여정 스토리
export interface TimeJourney {
  storyTitle: string;              // 졸업 향수 스토리 제목
  storyNarrative: string;          // 과거-현재-미래를 아우르는 감동적인 스토리
}

// 졸업 메시지
export interface GraduationMessage {
  congratulation: string;          // 졸업 축하 메시지
  encouragement: string;           // 미래를 향한 응원 메시지
}

// 졸업 분석 결과 (ImageAnalysisResult 확장)
export interface GraduationAnalysisResult extends ImageAnalysisResult {
  graduationAnalysis: GraduationAnalysis;
  timeJourney: TimeJourney;
  graduationMessage: GraduationMessage;
  graduationType?: GraduationType;
  schoolName?: string;
}


// ========================================
// 케미 향수 프로그램 타입
// ========================================

// 케미 유형 (4대 케미향)
export type ChemistryType = 'milddang' | 'slowburn' | 'dalddal' | 'storm';

// 케미 유형 라벨
export const CHEMISTRY_TYPE_LABELS: Record<ChemistryType, string> = {
  milddang: '밀당 케미',
  slowburn: '슬로우번 케미',
  dalddal: '달달 케미',
  storm: '폭풍 케미',
};

// 케미 유형 아이콘
export const CHEMISTRY_TYPE_ICONS: Record<ChemistryType, string> = {
  milddang: '🎭',
  slowburn: '🔥',
  dalddal: '🍯',
  storm: '⚡',
};

// 케미 유형 색상
export const CHEMISTRY_TYPE_COLORS: Record<ChemistryType, { bg: string; text: string; border: string; gradient: string }> = {
  milddang: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', gradient: 'from-violet-400 to-pink-400' },
  slowburn: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', gradient: 'from-amber-400 to-red-400' },
  dalddal: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', gradient: 'from-rose-400 to-pink-400' },
  storm: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300', gradient: 'from-cyan-400 to-blue-400' },
};

// 특성 시너지
export interface TraitsSynergy {
  sharedStrengths: string[];
  complementaryTraits: string[];
  dynamicTension: string;
  synergyOneLiner?: string;
  traitsComparisonComment?: string;
}

// 향 하모니
export interface ScentHarmony {
  layeringEffect: string;
  topNoteInteraction: string;
  middleNoteInteraction: string;
  baseNoteInteraction: string;
  overallHarmony: string;
}

// 관계 다이나믹
export interface RelationshipDynamic {
  dynamicDescription: string;
  bestMoment: string;
  chemistryKeywords: string[];
}

// 레이어링 가이드
export interface LayeringGuide {
  ratio: string;
  method: string;
  situation: string;
  seasonTime: {
    best_season: string;
    best_time: string;
    reason: string;
  };
}

// 시나리오
export interface ChemistryScenario {
  title: string;
  content: string;
}

// 대사
export interface ChemistryDialogues {
  aToB: { line: string; action: string };
  bToA: { line: string; action: string };
}

// 색채 케미
export interface ColorChemistry {
  blendedPalette: string[];
  description: string;
}

// 케미 점수
export interface ChemistryScore {
  overall: number; // 0-100 종합 케미 점수
  scentMatch: number; // 0-100 향 궁합
  traitMatch: number; // 0-100 특성 궁합
  emotionMatch: number; // 0-100 감정 궁합
}

// 얼굴합 (비주얼 궁합)
export interface FaceMatch {
  score: number;         // 0-100 종합 얼굴합
  atmosphere: number;    // 0-100 분위기 조화
  contrast: number;      // 0-100 냉온 밸런스
  colorHarmony: number;  // 0-100 색감 조화
  styleMatch: number;    // 0-100 스타일 호환
  verdict: string;       // 한줄 판정
  atmosphereDesc?: string;
  contrastDesc?: string;
  colorHarmonyDesc?: string;
  styleMatchDesc?: string;
}

// 미래 예측 마일스톤
export interface FuturePrediction {
  timeLabel: string; // "1일차", "1주일", "1개월", "1년"
  prediction: string; // 짧은 예측
}

// 케미 프로필
export interface ChemistryProfile {
  chemistryType: ChemistryType;
  chemistryTitle: string; // AI 동적 칭호
  chemistryScore?: ChemistryScore; // 케미 점수 (시각화용)

  traitsSynergy: TraitsSynergy;
  scentHarmony: ScentHarmony;
  relationshipDynamic: RelationshipDynamic;
  layeringGuide: LayeringGuide;

  scenarios: ChemistryScenario[]; // "만약에" 시나리오
  dialogues: ChemistryDialogues;
  colorChemistry: ColorChemistry;
  faceMatch?: FaceMatch;

  futureVision: string;
  futurePredictions?: FuturePrediction[]; // 타임라인 형태 미래 예측
  chemistryStory: string;
}

// 케미 분석 결과 (최종)
export interface ChemistryAnalysisResult {
  characterA: ImageAnalysisResult;
  characterB: ImageAnalysisResult;
  chemistry: ChemistryProfile;
}

// 케미 입력 폼 데이터
export interface ChemistryFormDataType {
  pin: string;
  character1Name: string;
  character2Name: string;
  character1Image: File | null;
  character2Image: File | null;
  relationTrope: string;
  character1Archetype: string;
  character2Archetype: string;
  scene: string;
  emotionKeywords: string[];
  scentDirection: number; // 0-100 슬라이더
  message: string; // 자유 입력 (선택)
}

// 관계 트로프 옵션
export const RELATION_TROPES = [
  { id: 'enemies_to_lovers', label: '적에서 연인으로', emoji: '⚔️' },
  { id: 'childhood_friends', label: '소꿉친구', emoji: '🌱' },
  { id: 'rivals', label: '라이벌', emoji: '🔥' },
  { id: 'mentor_student', label: '사제관계', emoji: '📚' },
  { id: 'fate_encounter', label: '운명적 만남', emoji: '✨' },
  { id: 'push_pull', label: '밀당의 고수들', emoji: '🎭' },
  { id: 'protective', label: '보호자와 피보호자', emoji: '🛡️' },
  { id: 'opposites', label: '정반대 매력', emoji: '🌓' },
] as const;

// 아키타입 옵션
export const ARCHETYPE_OPTIONS = [
  { id: 'tsundere', label: '츤데레', emoji: '😤' },
  { id: 'gentle', label: '다정한 치유형', emoji: '🌸' },
  { id: 'charismatic', label: '카리스마 리더', emoji: '👑' },
  { id: 'mysterious', label: '미스터리 타입', emoji: '🌙' },
  { id: 'energetic', label: '에너지 폭발', emoji: '⚡' },
  { id: 'cool', label: '쿨한 무심형', emoji: '🧊' },
  { id: 'romantic', label: '로맨티스트', emoji: '🌹' },
  { id: 'rebel', label: '반항아', emoji: '🔥' },
] as const;

// 장면/분위기 옵션
export const SCENE_OPTIONS = [
  { id: 'cafe', label: '비 오는 날 카페', emoji: '☕', image: '/images/chemistry/scene_cafe.jpg' },
  { id: 'rooftop', label: '옥상 위 별빛', emoji: '🌃', image: '/images/chemistry/scene_rooftop.jpg' },
  { id: 'ocean', label: '해변의 일몰', emoji: '🌅', image: '/images/chemistry/scene_ocean.jpg' },
  { id: 'forest', label: '안개 낀 숲', emoji: '🌲', image: '/images/chemistry/scene_forest.jpg' },
  { id: 'city', label: '도시의 밤거리', emoji: '🏙️', image: '/images/chemistry/scene_city.jpg' },
  { id: 'library', label: '오래된 도서관', emoji: '📖', image: '/images/chemistry/scene_library.jpg' },
] as const;

// 감정 키워드 옵션
export const EMOTION_KEYWORDS = [
  { id: 'flutter', label: '설렘', emoji: '💓' },
  { id: 'tension', label: '긴장감', emoji: '⚡' },
  { id: 'comfort', label: '편안함', emoji: '☁️' },
  { id: 'excitement', label: '흥분', emoji: '🔥' },
  { id: 'longing', label: '그리움', emoji: '🌙' },
  { id: 'jealousy', label: '질투', emoji: '💚' },
  { id: 'trust', label: '신뢰', emoji: '🤝' },
  { id: 'playful', label: '장난기', emoji: '😜' },
  { id: 'passionate', label: '열정', emoji: '❤️‍🔥' },
  { id: 'bittersweet', label: '아련함', emoji: '🥀' },
] as const;

