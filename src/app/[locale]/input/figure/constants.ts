// 피규어 디퓨저 채팅 대화 시나리오 및 상수

import type { QuickReply, FigureChatPhase } from '@/types/analysis';

// 대화 시나리오 정의
export interface ChatScenario {
  phase: FigureChatPhase;
  aiMessage: string;
  expectation: 'text' | 'quickReply' | 'image' | 'confirm';
  quickReplies?: QuickReply[];
  imageType?: 'memory' | 'figure';
  placeholder?: string;
  required: boolean;
}

export const CHAT_SCENARIOS: ChatScenario[] = [
  {
    phase: 'greeting',
    aiMessage: `안녕하세요! 저는 피규어 디퓨저를 제작하는 AI 도우미예요 💕

최애와의 특별한 순간을 향기와 피규어로 영원히 간직할 수 있도록 도와드릴게요!

먼저, 간직하고 싶은 최애와의 기억에 대해 이야기해주실래요?`,
    expectation: 'text',
    placeholder: '그때의 기억을 자유롭게 이야기해주세요...',
    required: true,
  },
  {
    phase: 'emotion',
    aiMessage: `{{empathy}}

그때 느꼈던 감정은 어땠나요?`,
    expectation: 'quickReply',
    quickReplies: [
      { id: 'happy', label: '벅차오르는 행복', value: '벅차오르는 행복', emoji: '🥹' },
      { id: 'moved', label: '감동으로 눈물', value: '감동으로 눈물', emoji: '😭' },
      { id: 'excited', label: '심장이 터질듯', value: '심장이 터질듯한 설렘', emoji: '💓' },
      { id: 'peaceful', label: '평화로운 안도감', value: '평화로운 안도감', emoji: '😌' },
    ],
    placeholder: '또는 직접 입력해주세요...',
    required: true,
  },
  {
    phase: 'context',
    aiMessage: `그 감정이 느껴지는 것 같아요 ✨

그 순간의 분위기가 궁금해요. 계절이나 시간대가 어땠는지 기억나시나요?`,
    expectation: 'quickReply',
    quickReplies: [
      { id: 'spring_day', label: '따뜻한 봄날', value: '따뜻한 봄날', emoji: '🌸' },
      { id: 'summer_night', label: '열정적인 여름밤', value: '열정적인 여름밤', emoji: '🌙' },
      { id: 'autumn_sunset', label: '노을지는 가을', value: '노을지는 가을', emoji: '🍂' },
      { id: 'winter_cold', label: '차가운 겨울', value: '차가운 겨울', emoji: '❄️' },
    ],
    placeholder: '또는 직접 입력해주세요...',
    required: true,
  },
  {
    phase: 'memory_image',
    aiMessage: `아, 그런 분위기였군요! 💫

이제 그 순간을 담은 이미지를 보여주실래요?
이 이미지의 감정과 분위기를 분석해서 향기로 표현할 거예요!`,
    expectation: 'image',
    imageType: 'memory',
    required: true,
  },
  {
    phase: 'color_tone',
    aiMessage: `{{imageEmpathy}}

이 장면에서 떠오르는 색감이 있다면 어떤 느낌인가요?`,
    expectation: 'quickReply',
    quickReplies: [
      { id: 'warm', label: '따뜻한 톤', value: '따뜻한 톤', emoji: '🔥' },
      { id: 'cool', label: '시원한 톤', value: '시원한 톤', emoji: '💎' },
      { id: 'pastel', label: '파스텔 톤', value: '파스텔 톤', emoji: '🎀' },
      { id: 'vivid', label: '비비드 톤', value: '비비드 톤', emoji: '🌈' },
    ],
    placeholder: '또는 직접 입력해주세요...',
    required: true,
  },
  {
    phase: 'figure_intro',
    aiMessage: `이제 피규어를 만들 차례예요! 🎨

⚠️ 안내사항:
• 단색 피규어로 출력됩니다 (직접 색칠하는 DIY 키트)
• 너무 복잡한 디테일은 3D 프린팅 특성상 구현이 어려워요

피규어로 만들 최애 이미지를 보내주세요!`,
    expectation: 'image',
    imageType: 'figure',
    required: true,
  },
  {
    phase: 'figure_request',
    aiMessage: `{{figureEmpathy}}

피규어 제작 시 특별히 요청하실 사항이 있나요?
(없으면 "없음"이라고 해주세요)`,
    expectation: 'text',
    placeholder: '예: 특정 포즈, 소품 추가, 의상 디테일 등',
    required: false,
  },
  {
    phase: 'complete',
    aiMessage: `모든 정보를 받았어요! 🎉

소중한 기억을 담은 피규어 디퓨저를 제작할게요.

분석을 시작할까요?`,
    expectation: 'confirm',
    required: true,
  },
];

// AI 공감 반응 라이브러리
export const EMPATHY_RESPONSES = {
  // 기억 이야기에 대한 공감
  memory: [
    '와... 정말 특별한 순간이었겠네요! 💕',
    '그 순간이 얼마나 소중했을지 느껴져요 ✨',
    '듣기만 해도 가슴이 따뜻해지는 기억이네요 🥹',
    '정말 아름다운 추억이에요! 간직하고 싶은 마음이 이해돼요 💫',
  ],

  // 기억 장면 이미지에 대한 공감
  memoryImage: [
    '와... 이 순간이 정말 특별했겠네요! 💕',
    '이 장면에서 {{emotion}} 감정이 느껴져요 ✨',
    '정말 아름다운 순간이에요! 향기로 간직하면 더 특별할 거예요 🌸',
    '이 이미지에서 따뜻한 감정이 전해져요 🥹',
  ],

  // 피규어 이미지에 대한 공감
  figureImage: [
    '우와! 정말 멋진 최애네요! 😍',
    '이 모습을 피규어로 만들면 너무 귀여울 것 같아요! 🎨',
    '피규어로 만들기 딱 좋은 이미지예요! 💪',
    '멋진 선택이에요! 최선을 다해 구현할게요 ✨',
  ],
};

// 감정별 향 매핑 (분석 시 참고)
export const EMOTION_SCENT_MAP: Record<string, string[]> = {
  '벅차오르는 행복': ['플로럴', '시트러스', '프루티'],
  '감동으로 눈물': ['머스크', '우디', '플로럴'],
  '심장이 터질듯한 설렘': ['스파이시', '시트러스', '플로럴'],
  '평화로운 안도감': ['우디', '머스크', '플로럴'],
};

// 계절/시간대별 향 매핑
export const SEASON_SCENT_MAP: Record<string, string[]> = {
  '따뜻한 봄날': ['플로럴', '프루티', '시트러스'],
  '열정적인 여름밤': ['시트러스', '스파이시', '우디'],
  '노을지는 가을': ['우디', '머스크', '스파이시'],
  '차가운 겨울': ['머스크', '우디', '스파이시'],
};

// 색감별 향 매핑
export const COLOR_SCENT_MAP: Record<string, string[]> = {
  '따뜻한 톤': ['우디', '스파이시', '머스크'],
  '시원한 톤': ['시트러스', '프루티', '플로럴'],
  '파스텔 톤': ['플로럴', '프루티', '머스크'],
  '비비드 톤': ['시트러스', '스파이시', '프루티'],
};

// 기본 사용자 이름 (로그인 안 한 경우)
export const DEFAULT_USER_NAME = '소중한 분';

// 진행률 계산용 단계 가중치
export const PHASE_PROGRESS: Record<FigureChatPhase, number> = {
  greeting: 0,
  emotion: 15,
  context: 25,
  memory_image: 40,
  color_tone: 50,
  figure_intro: 60,
  figure_image: 75,
  figure_request: 90,
  complete: 100,
  analyzing: 100,
};

// 다음 단계 맵핑
export const NEXT_PHASE: Record<FigureChatPhase, FigureChatPhase> = {
  greeting: 'emotion',
  emotion: 'context',
  context: 'memory_image',
  memory_image: 'color_tone',
  color_tone: 'figure_intro',
  figure_intro: 'figure_image',
  figure_image: 'figure_request',
  figure_request: 'complete',
  complete: 'analyzing',
  analyzing: 'analyzing',
};
