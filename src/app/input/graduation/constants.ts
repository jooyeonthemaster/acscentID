// ===== 졸업 향 추천 프로그램 (JOLLDUCK) 상수 정의 =====

// 졸업 유형
export const GRADUATION_TYPES = [
  { key: "elementary", label: "초등학교", emoji: "🎒" },
  { key: "middle", label: "중학교", emoji: "📚" },
  { key: "high", label: "고등학교", emoji: "🏫" },
  { key: "university", label: "대학교", emoji: "🎓" },
  { key: "graduate", label: "대학원", emoji: "📜" },
  { key: "other", label: "기타", emoji: "✨" }
] as const

// 학창 시절 스타일 (과거)
export const PAST_STYLES = [
  { key: "active", label: "활발한 학생", emoji: "🏃" },
  { key: "quiet", label: "조용한 학생", emoji: "📖" },
  { key: "diligent", label: "성실한 모범생", emoji: "✏️" },
  { key: "artistic", label: "예술가적", emoji: "🎨" },
  { key: "athletic", label: "운동파", emoji: "⚽" },
  { key: "bookworm", label: "책벌레", emoji: "📚" },
  { key: "social", label: "사교적", emoji: "🤝" },
  { key: "unique", label: "독창적", emoji: "💫" }
] as const

// 학창 시절 성격 (과거)
export const PAST_PERSONALITIES = [
  { key: "shy", label: "수줍었던", emoji: "🌸" },
  { key: "bright", label: "밝았던", emoji: "☀️" },
  { key: "calm", label: "차분했던", emoji: "🍃" },
  { key: "passionate", label: "열정적이었던", emoji: "🔥" },
  { key: "curious", label: "호기심 많았던", emoji: "🔍" },
  { key: "warm", label: "따뜻했던", emoji: "💕" },
  { key: "stubborn", label: "고집 있었던", emoji: "💪" },
  { key: "humorous", label: "유머러스했던", emoji: "😄" }
] as const

// 현재 감정 상태
export const CURRENT_FEELINGS = [
  { key: "excited", label: "설레는", emoji: "🌟", color: "bg-yellow-100 border-yellow-400" },
  { key: "nostalgic", label: "아쉬운", emoji: "🥹", color: "bg-blue-100 border-blue-400" },
  { key: "proud", label: "뿌듯한", emoji: "🎉", color: "bg-green-100 border-green-400" },
  { key: "anxious", label: "떨리는", emoji: "💓", color: "bg-pink-100 border-pink-400" },
  { key: "grateful", label: "감사한", emoji: "🙏", color: "bg-amber-100 border-amber-400" },
  { key: "hopeful", label: "희망찬", emoji: "🌈", color: "bg-purple-100 border-purple-400" },
  { key: "bittersweet", label: "아련한", emoji: "🌸", color: "bg-rose-100 border-rose-400" },
  { key: "determined", label: "결연한", emoji: "💪", color: "bg-slate-100 border-slate-400" }
] as const

// 성장한 점들 (현재)
export const CURRENT_GROWTH = [
  { key: "confidence", label: "자신감", emoji: "💎" },
  { key: "patience", label: "인내심", emoji: "🌳" },
  { key: "communication", label: "소통 능력", emoji: "💬" },
  { key: "expertise", label: "전문성", emoji: "🎯" },
  { key: "leadership", label: "리더십", emoji: "👑" },
  { key: "creativity", label: "창의력", emoji: "🎨" },
  { key: "responsibility", label: "책임감", emoji: "🛡️" },
  { key: "independence", label: "독립심", emoji: "🦅" }
] as const

// 미래 꿈/목표
export const FUTURE_DREAMS = [
  { key: "career", label: "취업/커리어", emoji: "💼" },
  { key: "startup", label: "창업", emoji: "🚀" },
  { key: "study_abroad", label: "유학", emoji: "✈️" },
  { key: "travel", label: "여행", emoji: "🌍" },
  { key: "self_improvement", label: "자기계발", emoji: "📈" },
  { key: "volunteer", label: "봉사활동", emoji: "🤲" },
  { key: "relationship", label: "연애/결혼", emoji: "💕" },
  { key: "challenge", label: "새로운 도전", emoji: "⭐" }
] as const

// 되고 싶은 모습 (미래)
export const FUTURE_PERSONALITIES = [
  { key: "confident", label: "당당한", emoji: "👊" },
  { key: "warm_hearted", label: "따뜻한", emoji: "🫶" },
  { key: "professional", label: "전문적인", emoji: "🎖️" },
  { key: "free", label: "자유로운", emoji: "🕊️" },
  { key: "stable", label: "안정적인", emoji: "🏠" },
  { key: "challenging", label: "도전적인", emoji: "🔥" },
  { key: "influential", label: "영향력 있는", emoji: "💫" },
  { key: "happy", label: "행복한", emoji: "😊" }
] as const

// 총 스텝 수 (기본정보 → 학창시절 → 지금감정 → 앞으로 → 이미지)
export const GRADUATION_TOTAL_STEPS = 5

// 성별 옵션
export const GENDER_OPTIONS = [
  { key: "Male", label: "남성" },
  { key: "Female", label: "여성" },
  { key: "Other", label: "기타" }
] as const

// 분석 중 멘트 - 졸업 + 향 테마
export const GRADUATION_ANALYZING_QUOTES = [
  "교실의 분필 냄새, 추억의 첫 노트...",
  "운동장의 풀 향기를 기억에 담는 중...",
  "졸업장의 잉크 향, 새 시작의 향기...",
  "봄바람에 날리던 벚꽃 향을 조합 중...",
  "도서관에서 맡던 책장 넘기는 향기...",
  "청춘의 땀방울, 열정의 향기를 담는 중...",
  "친구들과 나눈 웃음을 향으로 표현 중...",
  "첫사랑처럼 설레는 미래의 향기...",
  "학식당의 추억, 따뜻한 점심의 향기...",
  "졸업식 꽃다발의 향기를 떠올리며...",
  "새벽 등굣길의 상쾌한 공기를 담는 중...",
  "꿈을 향해 달려온 당신의 향기 설계 중...",
  "스승의 따뜻한 말씀을 향으로 표현 중...",
  "졸업앨범 속 추억들을 향기로 엮는 중...",
  "새 출발을 축하하는 희망의 향기...",
  "과거와 미래를 잇는 당신만의 향수..."
] as const;

// 졸업 테마 컬러
export const GRADUATION_THEME = {
  primary: "#1e3a5f",      // 네이비 블루
  secondary: "#d4af37",    // 골드
  accent: "#f8f4e8",       // 아이보리
  text: "#1a1a2e",         // 다크 네이비
  background: "#f5f3ef",   // 웜 화이트
  success: "#2d5a27",      // 딥 그린
  highlight: "#fff8dc"     // 연한 골드
} as const

// 기본 폼 데이터 초기값
export const INITIAL_GRADUATION_FORM_DATA = {
  name: "",
  gender: "",
  graduationType: "" as const,
  schoolName: "",
  pastStyles: [] as string[],
  pastPersonalities: [] as string[],
  pastMemories: "",
  currentFeeling: "",
  currentGrowth: [] as string[],
  currentAchievements: "",
  futureDreams: [] as string[],
  futurePersonality: [] as string[],
  futureWish: "",
  image: null as File | null,
  imagePreview: null as string | null,
  transformImage: false,
  transformedImageUrl: ""
}
