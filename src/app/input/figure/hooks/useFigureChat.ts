'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Compressor from 'compressorjs';
import type {
  FigureChatMessage,
  FigureChatPhase,
  FigureChatData,
  FigureChatState,
  QuickReply,
} from '@/types/analysis';
import {
  CHAT_SCENARIOS,
  EMPATHY_RESPONSES,
  PHASE_PROGRESS,
  NEXT_PHASE,
  DEFAULT_USER_NAME,
} from '../constants';

// 초기 데이터 상태
const initialChatData: FigureChatData = {
  memoryStory: '',
  emotion: '',
  seasonTime: '',
  colorTone: '',
  memoryImage: null,
  memoryImagePreview: null,
  figureImage: null,
  figureImagePreview: null,
  figureRequest: '',
  userName: undefined,
};

// 초기 상태
const initialState: FigureChatState = {
  messages: [],
  currentPhase: 'greeting',
  collectedData: initialChatData,
  isAiTyping: false,
  isSubmitting: false,
  progress: 0,
};

// 랜덤 공감 반응 선택
function getRandomEmpathy(type: keyof typeof EMPATHY_RESPONSES, data?: FigureChatData): string {
  const responses = EMPATHY_RESPONSES[type];
  const randomIndex = Math.floor(Math.random() * responses.length);
  let response = responses[randomIndex];

  // 템플릿 변수 치환
  if (data?.emotion) {
    response = response.replace('{{emotion}}', data.emotion);
  }

  return response;
}

// 이미지 압축
function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      success: (result) => resolve(result as File),
      error: reject,
    });
  });
}

// 파일을 base64로 변환
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useFigureChat(userName?: string) {
  const router = useRouter();
  const isInitialized = useRef(false);
  const [state, setState] = useState<FigureChatState>({
    ...initialState,
    collectedData: {
      ...initialChatData,
      userName: userName || DEFAULT_USER_NAME,
    },
  });

  // AI 메시지 추가
  const addAiMessage = useCallback((content: string, isEmpathy = false) => {
    const message: FigureChatMessage = {
      id: uuidv4(),
      type: 'ai',
      content,
      timestamp: new Date(),
      isEmpathy,
    };
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
      isAiTyping: false,
    }));
  }, []);

  // 사용자 메시지 추가
  const addUserMessage = useCallback((content: string, image?: string, imageType?: 'memory' | 'figure') => {
    const message: FigureChatMessage = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date(),
      image,
      imageType,
    };
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  // 현재 시나리오 가져오기
  const getCurrentScenario = useCallback(() => {
    return CHAT_SCENARIOS.find((s) => s.phase === state.currentPhase);
  }, [state.currentPhase]);

  // AI 타이핑 시작
  const startAiTyping = useCallback(() => {
    setState((prev) => ({ ...prev, isAiTyping: true }));
  }, []);

  // 다음 단계로 진행
  const proceedToNextPhase = useCallback(() => {
    const nextPhase = NEXT_PHASE[state.currentPhase];
    const nextScenario = CHAT_SCENARIOS.find((s) => s.phase === nextPhase);

    setState((prev) => ({
      ...prev,
      currentPhase: nextPhase,
      progress: PHASE_PROGRESS[nextPhase],
    }));

    // 다음 AI 메시지 표시 (약간의 딜레이)
    if (nextScenario && nextPhase !== 'analyzing') {
      startAiTyping();
      setTimeout(() => {
        let message = nextScenario.aiMessage;

        // 템플릿 치환
        if (message.includes('{{empathy}}')) {
          message = message.replace('{{empathy}}', getRandomEmpathy('memory', state.collectedData));
        }
        if (message.includes('{{imageEmpathy}}')) {
          message = message.replace('{{imageEmpathy}}', getRandomEmpathy('memoryImage', state.collectedData));
        }
        if (message.includes('{{figureEmpathy}}')) {
          message = message.replace('{{figureEmpathy}}', getRandomEmpathy('figureImage'));
        }

        addAiMessage(message);
      }, 1000 + Math.random() * 500);
    }
  }, [state.currentPhase, state.collectedData, startAiTyping, addAiMessage]);

  // 사용자 텍스트 메시지 전송
  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    addUserMessage(content);

    // 현재 단계에 따라 데이터 수집
    setState((prev) => {
      const newData = { ...prev.collectedData };

      switch (prev.currentPhase) {
        case 'greeting':
          newData.memoryStory = content;
          break;
        case 'emotion':
          newData.emotion = content;
          break;
        case 'context':
          newData.seasonTime = content;
          break;
        case 'color_tone':
          newData.colorTone = content;
          break;
        case 'figure_request':
          newData.figureRequest = content;
          break;
      }

      return { ...prev, collectedData: newData };
    });

    // 다음 단계로 진행 (약간의 딜레이)
    setTimeout(() => {
      proceedToNextPhase();
    }, 500);
  }, [addUserMessage, proceedToNextPhase]);

  // 빠른 응답 선택
  const selectQuickReply = useCallback((reply: QuickReply) => {
    const displayText = reply.emoji ? `${reply.emoji} ${reply.label}` : reply.label;
    sendMessage(reply.value);
  }, [sendMessage]);

  // 이미지 업로드
  const uploadImage = useCallback(async (file: File, type: 'memory' | 'figure') => {
    try {
      // 이미지 압축
      const compressedFile = await compressImage(file);
      const base64 = await fileToBase64(compressedFile);

      // 사용자 메시지로 이미지 표시
      addUserMessage(
        type === 'memory' ? '📸 기억의 장면' : '🎨 피규어용 이미지',
        base64,
        type
      );

      // 상태 업데이트
      setState((prev) => {
        const newData = { ...prev.collectedData };
        if (type === 'memory') {
          newData.memoryImage = compressedFile;
          newData.memoryImagePreview = base64;
        } else {
          newData.figureImage = compressedFile;
          newData.figureImagePreview = base64;
        }
        return { ...prev, collectedData: newData };
      });

      // 다음 단계로 진행
      setTimeout(() => {
        proceedToNextPhase();
      }, 500);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
    }
  }, [addUserMessage, proceedToNextPhase]);

  // 분석 시작 확인
  const confirmAnalysis = useCallback(async () => {
    setState((prev) => ({ ...prev, isSubmitting: true, currentPhase: 'analyzing' }));
    addUserMessage('네, 분석 시작해주세요! ✨');

    startAiTyping();
    setTimeout(() => {
      addAiMessage('분석을 시작할게요! 잠시만 기다려주세요... 🔍✨');
    }, 500);

    try {
      // API 호출
      const { collectedData } = state;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: {
            name: collectedData.userName || DEFAULT_USER_NAME,
            gender: 'Other',
            styles: [collectedData.colorTone],
            customStyle: collectedData.seasonTime,
            personalities: [collectedData.emotion],
            customPersonality: collectedData.memoryStory,
            charmPoints: ['분위기', '감정'],
            customCharm: collectedData.figureRequest,
          },
          imageBase64: collectedData.memoryImagePreview,
          programType: 'figure',
          figureData: {
            memoryStory: collectedData.memoryStory,
            emotion: collectedData.emotion,
            seasonTime: collectedData.seasonTime,
            colorTone: collectedData.colorTone,
            figureImageBase64: collectedData.figureImagePreview,
            figureRequest: collectedData.figureRequest,
          },
        }),
      });

      const result = await response.json();

      if (result.success || result.fallback) {
        const analysisData = result.data || result.fallback;

        // localStorage에 결과 저장
        localStorage.setItem('analysisResult', JSON.stringify(analysisData));
        localStorage.setItem('userImage', collectedData.memoryImagePreview || '');
        localStorage.setItem('figureImage', collectedData.figureImagePreview || '');
        localStorage.setItem('figureRequest', collectedData.figureRequest);
        localStorage.setItem('userInfo', JSON.stringify({
          name: collectedData.userName,
          gender: 'Other',
        }));
        localStorage.setItem('serviceMode', 'online');
        localStorage.setItem('programType', 'figure');
        localStorage.setItem('figureChatData', JSON.stringify(collectedData));
        // 모델링 이미지 저장 (useAutoSave에서 DB에 업로드)
        localStorage.setItem('modelingImage', collectedData.figureImagePreview || '');
        localStorage.setItem('modelingRequest', collectedData.figureRequest || '');
        localStorage.setItem('productType', 'figure_diffuser');

        // 결과 페이지로 이동
        router.push('/result');
      } else {
        throw new Error(result.error || '분석 실패');
      }
    } catch (error) {
      console.error('분석 오류:', error);
      addAiMessage('죄송해요, 분석 중 오류가 발생했어요. 다시 시도해주세요. 😢');
      setState((prev) => ({ ...prev, isSubmitting: false, currentPhase: 'complete' }));
    }
  }, [state, addUserMessage, addAiMessage, startAiTyping, router]);

  // 초기 AI 메시지 표시 (한 번만 실행)
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const firstScenario = CHAT_SCENARIOS[0];
    startAiTyping();
    setTimeout(() => {
      addAiMessage(firstScenario.aiMessage);
    }, 800);
  }, []);

  return {
    ...state,
    getCurrentScenario,
    sendMessage,
    selectQuickReply,
    uploadImage,
    confirmAnalysis,
  };
}
