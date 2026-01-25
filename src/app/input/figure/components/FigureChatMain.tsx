'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFigureChat } from '../hooks/useFigureChat';
import { ProgressHeader } from './ProgressHeader';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { QuickReplyButtons } from './QuickReplyButtons';
import { ImageUploader } from './ImageUploader';
import { FigureImageNotice } from './FigureImageNotice';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface FigureChatMainProps {
  userName?: string;
}

export function FigureChatMain({ userName }: FigureChatMainProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    currentPhase,
    collectedData,
    isAiTyping,
    isSubmitting,
    progress,
    getCurrentScenario,
    sendMessage,
    selectQuickReply,
    uploadImage,
    confirmAnalysis,
  } = useFigureChat(userName);

  const currentScenario = getCurrentScenario();

  // 자동 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  // 입력 타입 결정
  const showTextInput = currentScenario?.expectation === 'text' ||
    (currentScenario?.expectation === 'quickReply' && !isAiTyping);
  const showQuickReplies = currentScenario?.expectation === 'quickReply' &&
    currentScenario.quickReplies &&
    !isAiTyping;
  const showImageUploader = currentScenario?.expectation === 'image' && !isAiTyping;
  const showConfirmButton = currentScenario?.expectation === 'confirm' && !isAiTyping;
  const showFigureNotice = currentPhase === 'figure_intro' && !isAiTyping;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-yellow-50 to-pink-50">
      {/* 헤더 + 진행률 */}
      <ProgressHeader progress={progress} />

      {/* 채팅 영역 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {/* 메시지 목록 */}
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* AI 타이핑 표시 */}
        {isAiTyping && <TypingIndicator />}

        {/* 피규어 안내 (figure_intro 단계) */}
        {showFigureNotice && <FigureImageNotice />}

        {/* 빠른 응답 버튼 */}
        {showQuickReplies && currentScenario?.quickReplies && (
          <QuickReplyButtons
            replies={currentScenario.quickReplies}
            onSelect={selectQuickReply}
            disabled={isAiTyping || isSubmitting}
          />
        )}

        {/* 이미지 업로더 */}
        {showImageUploader && currentScenario?.imageType && (
          <ImageUploader
            onUpload={uploadImage}
            imageType={currentScenario.imageType}
            disabled={isAiTyping || isSubmitting}
            preview={
              currentScenario.imageType === 'memory'
                ? collectedData.memoryImagePreview
                : collectedData.figureImagePreview
            }
          />
        )}

        {/* 분석 시작 버튼 */}
        {showConfirmButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mt-6"
          >
            <Button
              onClick={confirmAnalysis}
              disabled={isSubmitting}
              className="px-8 py-6 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 text-black font-bold text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  분석 시작하기
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* 분석 중 표시 */}
        {currentPhase === 'analyzing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mb-4"
            >
              <div className="w-full h-full rounded-full border-4 border-yellow-400 border-t-transparent" />
            </motion.div>
            <p className="text-gray-600 text-center">
              소중한 기억을 향기로 변환하고 있어요...
              <br />
              <span className="text-sm text-gray-400">잠시만 기다려주세요 ✨</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* 입력 영역 */}
      {showTextInput && (
        <ChatInput
          onSend={sendMessage}
          onImageUpload={uploadImage}
          disabled={isAiTyping || isSubmitting}
          placeholder={currentScenario?.placeholder}
          showImageButton={showImageUploader}
          imageType={currentScenario?.imageType}
        />
      )}

      {/* 이미지 업로드 단계일 때 하단 안내 */}
      {showImageUploader && (
        <div className="bg-white border-t-2 border-black p-4 text-center text-sm text-gray-500">
          위 영역을 눌러 이미지를 업로드해주세요
        </div>
      )}
    </div>
  );
}
