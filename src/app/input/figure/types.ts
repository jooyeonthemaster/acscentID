// 피규어 채팅 전용 타입 정의
// 공통 타입은 src/types/analysis.ts에서 import

import type { FigureChatPhase, QuickReply } from '@/types/analysis';

export type {
  FigureChatMessage,
  FigureChatPhase,
  FigureChatData,
  FigureChatState,
  QuickReply,
  MemoryScene,
  FigureModeling,
  ScentStory,
  FigureAnalysisData,
  FigureEmotionTraits
} from '@/types/analysis';

// 채팅 시나리오 단계 정의
export interface ChatScenarioStep {
  phase: FigureChatPhase;
  aiMessage: string;
  expectation: 'text' | 'quickReply' | 'image' | 'confirm';
  quickReplies?: QuickReply[];
  imageType?: 'memory' | 'figure';
  placeholder?: string;
  required: boolean;
}

// 공감 반응 타입
export interface EmpathyResponse {
  trigger: string;
  responses: string[];
}

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
  analyzing: 100
};
