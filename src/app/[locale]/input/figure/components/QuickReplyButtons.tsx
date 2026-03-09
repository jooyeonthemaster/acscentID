'use client';

import { motion } from 'framer-motion';
import type { QuickReply } from '@/types/analysis';

interface QuickReplyButtonsProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
}

export function QuickReplyButtons({ replies, onSelect, disabled = false }: QuickReplyButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap gap-2 mb-4 px-2"
    >
      {replies.map((reply, index) => (
        <motion.button
          key={reply.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className="px-4 py-2.5 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span className="flex items-center gap-2">
            {reply.emoji && <span className="text-lg">{reply.emoji}</span>}
            <span className="font-medium text-sm">{reply.label}</span>
          </span>
        </motion.button>
      ))}
    </motion.div>
  );
}
