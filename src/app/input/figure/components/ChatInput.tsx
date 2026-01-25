'use client';

import { useState, useRef, KeyboardEvent } from 'react';
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
  placeholder = '메시지를 입력하세요...',
  showImageButton = false,
  imageType,
}: ChatInputProps) {
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
    <div className="bg-white border-t-2 border-black p-4">
      <div className="flex items-end gap-2">
        {/* 이미지 업로드 버튼 */}
        {showImageButton && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleImageSelect}
            disabled={disabled}
            className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-300 to-purple-300 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center disabled:opacity-50 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
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
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-gray-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* 전송 버튼 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="flex-shrink-0 w-12 h-12 bg-yellow-400 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
