'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Send, ImagePlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageUpload: (file: File, type: 'memory' | 'figure') => void;
  disabled?: boolean;
  placeholder?: string;
  showImageButton?: boolean;
  imageType?: 'memory' | 'figure';
}

export function ChatInput({
  onSend,
  onImageUpload,
  disabled = false,
  placeholder,
  showImageButton = false,
  imageType,
}: ChatInputProps) {
  const t = useTranslations('figureChat');
  const resolvedPlaceholder = placeholder || t('chatPlaceholder');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && imageType) {
      onImageUpload(file, imageType);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="bg-[#12141D] border-t-2 border-[#262A38] p-4">
      <div className="flex items-end gap-2">
        {/* 이미지 업로드 버튼 */}
        {showImageButton && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleImageSelect}
            disabled={disabled}
            className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#232838] to-[#232838] rounded-[12px] border-2 border-[#262A38] flex items-center justify-center disabled:opacity-50 transition-all"
          >
            <ImagePlus className="w-5 h-5" />
          </motion.button>
        )}

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 텍스트 입력 */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-[#151823] border-2 border-[#262A38] rounded-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-[#343A4C] transition-all disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* 전송 버튼 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="flex-shrink-0 w-12 h-12 bg-[#F5EFE2] rounded-[12px] border-2 border-[#F5EFE2] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FFFDF5] transition-all"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
