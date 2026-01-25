'use client';

import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      {/* AI 아바타 */}
      <div className="flex-shrink-0 mr-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-pink-300 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-lg">🧴</span>
        </div>
      </div>

      {/* 타이핑 버블 */}
      <div className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl rounded-tl-none px-5 py-4">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{
                y: [0, -6, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
