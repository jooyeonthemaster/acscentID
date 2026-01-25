'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Camera, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  onUpload: (file: File, type: 'memory' | 'figure') => void;
  imageType: 'memory' | 'figure';
  disabled?: boolean;
  preview?: string | null;
}

export function ImageUploader({ onUpload, imageType, disabled = false, preview }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, imageType);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file, imageType);
    }
  };

  const isMemory = imageType === 'memory';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 mb-4"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 미리보기가 있는 경우 */}
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-[300px] mx-auto"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Image
                src={preview}
                alt={isMemory ? '기억 장면' : '피규어용 이미지'}
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-2 text-center text-sm text-gray-600">
              {isMemory ? '📸 기억의 장면이 업로드되었어요!' : '🎨 피규어 이미지가 업로드되었어요!'}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative w-full max-w-[300px] mx-auto aspect-square rounded-xl border-2 border-dashed
              ${isDragging
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-300 bg-gray-50 hover:border-yellow-400 hover:bg-yellow-50'
              }
              cursor-pointer transition-all
              flex flex-col items-center justify-center gap-4
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${isMemory
                  ? 'bg-gradient-to-br from-pink-300 to-purple-300'
                  : 'bg-gradient-to-br from-cyan-300 to-blue-300'
                }
                border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
              `}
            >
              {isMemory ? (
                <Camera className="w-7 h-7" />
              ) : (
                <ImagePlus className="w-7 h-7" />
              )}
            </motion.div>

            <div className="text-center px-4">
              <p className="font-bold text-gray-800 mb-1">
                {isMemory ? '기억의 장면 업로드' : '피규어용 이미지 업로드'}
              </p>
              <p className="text-sm text-gray-500">
                {isMemory
                  ? '그 순간의 감정을 향기로 표현할게요'
                  : '이 이미지를 바탕으로 피규어를 제작해요'
                }
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Upload className="w-4 h-4" />
              <span>클릭하거나 드래그해서 업로드</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
