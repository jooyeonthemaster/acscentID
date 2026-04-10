"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useProductImages } from "@/hooks/useAdminContent"
import { useTranslations } from "next-intl"

interface ProgramImageGalleryProps {
  productSlug: string
  fallbackImages: string[]
  badge?: string
}

export function ProgramImageGallery({
  productSlug,
  fallbackImages,
  badge = "BEST",
}: ProgramImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const t = useTranslations()

  const { imageUrls: dynamicImages } = useProductImages(productSlug)
  const productImages = dynamicImages.length > 0 ? dynamicImages : fallbackImages

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      {/* 메인 이미지 */}
      <div className="relative bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] mb-3">
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <span className="px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-black rounded-full border-2 border-black">
            {badge}
          </span>
        </div>
        <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50">
          <motion.img
            key={selectedImage}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            src={productImages[selectedImage]}
            alt={t('programs.productImage')}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 썸네일 */}
      {productImages.length > 1 && (
        <div className="flex gap-2 justify-center">
          {productImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                selectedImage === idx
                  ? 'border-black shadow-[2px_2px_0_0_black] scale-105'
                  : 'border-slate-300 hover:border-slate-500'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-contain bg-white p-1" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
