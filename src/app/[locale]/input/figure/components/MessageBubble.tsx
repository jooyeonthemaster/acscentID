'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { FigureChatMessage } from '@/types/analysis';

interface MessageBubbleProps {
  message: FigureChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAi = message.type === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-4`}
    >
      {/* AI 아바타 */}
      {isAi && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#232838] to-[#232838] flex items-center justify-center border-2 border-[#262A38]">
            <span className="text-lg">🧴</span>
          </div>
        </div>
      )}

      {/* 메시지 버블 */}
      <div
        className={`max-w-[80%] ${
          isAi
            ? 'bg-[#12141D] border-2 border-[#262A38]'
            : 'bg-[#161925] text-[#E9E2D0] border-2 border-[#262A38]'
        } rounded-[12px] ${isAi ? 'rounded-tl-none' : 'rounded-tr-none'} p-4`}
      >
        {/* 이미지가 있는 경우 */}
        {message.image && (
          <div className="mb-2">
            <div className="relative w-full max-w-[200px] aspect-square rounded-[12px] overflow-hidden border-2 border-[#262A38]">
              <Image
                src={message.image}
                alt={message.imageType === 'memory' ? '기억 장면' : '피규어용 이미지'}
                fill
                className="object-cover"
              />
            </div>
            <div className={`text-xs lg:text-sm mt-1 ${isAi ? 'text-[#8B8578]' : 'text-[#151823]'}`}>
              {message.imageType === 'memory' ? '📸 기억의 장면' : '🎨 피규어용 이미지'}
            </div>
          </div>
        )}

        {/* 메시지 텍스트 */}
        <div className={`whitespace-pre-wrap ${isAi ? 'text-[#E9E2D0]' : 'text-[#E9E2D0]'}`}>
          {message.content}
        </div>

        {/* 타임스탬프 */}
        <div className={`text-xs lg:text-sm mt-2 ${isAi ? 'text-[#8B8578]' : 'text-[#151823]'}`}>
          {message.timestamp.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </motion.div>
  );
}
