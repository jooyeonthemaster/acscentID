"use client"

import { type CSSProperties, useState } from "react"
import { motion } from "framer-motion"
import { useProductImages } from "@/hooks/useAdminContent"
import { useTranslations } from "next-intl"
import type { ProductPagePositionField } from "@/lib/products/page-content"

interface ProgramImageGalleryProps {
  productSlug: string
  fallbackImages: string[]
  badge?: string
  badgeClassName?: string
  imageSurfaceClassName?: string
  pagePositionStyle?: (field: ProductPagePositionField) => CSSProperties | undefined
}

export function ProgramImageGallery({
  productSlug,
  fallbackImages,
  badge = "BEST",
  badgeClassName = "bg-yellow-400 text-black",
  imageSurfaceClassName = "bg-gradient-to-br from-yellow-50 to-amber-50",
  pagePositionStyle,
}: ProgramImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const t = useTranslations()

  const { imageUrls: dynamicImages, loading } = useProductImages(productSlug)
  // loading 중에는 fallback을 보여주지 않음 (플리커 방지)
  const productImages = loading
    ? []
    : dynamicImages.length > 0
      ? dynamicImages
      : fallbackImages
  const currentImage = productImages[selectedImage] || productImages[0] || ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      {/* 메인 이미지 */}
      <div className="relative bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] mb-3">
        <div
          className="absolute top-3 left-3 z-10 flex gap-2"
          data-admin-page-position-field="badge"
          style={pagePositionStyle?.("badge")}
        >
          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border-2 border-black ${badgeClassName}`}>
            <span data-admin-page-field="badge">{badge}</span>
          </span>
        </div>
        <div
          className={`aspect-square flex items-center justify-center ${imageSurfaceClassName}`}
          data-admin-product-image="true"
          data-admin-page-position-field="productImage"
          style={pagePositionStyle?.("productImage")}
        >
          {loading || productImages.length === 0 ? (
            <div className="w-full h-full animate-pulse bg-gradient-to-br from-yellow-100 to-amber-100" />
          ) : (
            <motion.img
              key={currentImage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={currentImage}
              alt={t('programs.productImage')}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>

      {/* 썸네일 */}
      {!loading && productImages.length > 1 && (
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
