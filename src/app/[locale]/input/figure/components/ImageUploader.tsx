'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ImagePlus, Camera, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  onUpload: (file: File, type: 'memory' | 'figure') => void;
  imageType: 'memory' | 'figure';
  disabled?: boolean;
  preview?: string | null;
}

export function ImageUploader({ onUpload, imageType, disabled = false, preview }: ImageUploaderProps) {
  const t = useTranslations('figureChat');
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
            <div className="relative aspect-square rounded-[12px] overflow-hidden border-2 border-[#262A38]">
              <Image
                src={preview}
                alt={isMemory ? t('memoryImageAlt') : t('figureImageAlt')}
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-2 text-center text-sm lg:text-base text-[#A69F8D]">
              {isMemory ? t('memoryUploadSuccess') : t('figureUploadSuccess')}
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
              relative w-full max-w-[300px] mx-auto aspect-square rounded-[12px] border-2 border-dashed
              ${isDragging
                ? 'border-[#343A4C] bg-[#0C0E16]'
                : 'border-[#262A38] bg-[#151823] hover:border-[#343A4C] hover:bg-[#0C0E16]'
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
                  ? 'bg-gradient-to-br from-[#232838] to-[#232838]'
                  : 'bg-gradient-to-br from-[#232838] to-[#232838]'
                }
                border-2 border-[#262A38]
              `}
            >
              {isMemory ? (
                <Camera className="w-7 h-7" />
              ) : (
                <ImagePlus className="w-7 h-7" />
              )}
            </motion.div>

            <div className="text-center px-4">
              <p className="font-bold text-[#E9E2D0] mb-1">
                {isMemory ? t('memoryUploadTitle') : t('figureUploadTitle')}
              </p>
              <p className="text-sm lg:text-base text-[#8B8578]">
                {isMemory
                  ? t('memoryUploadDesc')
                  : t('figureUploadDesc')
                }
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs lg:text-sm text-[#8B8578]">
              <Upload className="w-4 h-4" />
              <span>{t('dragAndDrop')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
