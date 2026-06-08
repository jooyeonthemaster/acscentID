"use client"

import { type CSSProperties, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { useProductImages } from "@/hooks/useAdminContent"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { ProductPagePositionField } from "@/lib/products/page-content"

interface ProgramImageGalleryProps {
  productSlug: string
  badge?: string
  badgeClassName?: string
  pagePositionStyle?: (field: ProductPagePositionField) => CSSProperties | undefined
}

export function ProgramImageGallery(props: ProgramImageGalleryProps) {
  const {
    productSlug,
    badge = "BEST",
    badgeClassName = "bg-black text-white",
    pagePositionStyle,
  } = props
  const [selectedImage, setSelectedImage] = useState(0)
  const t = useTranslations()

  const { imageUrls: dynamicImages, loading } = useProductImages(productSlug)
  // loading/empty 중에는 오래된 하드코딩 이미지를 보여주지 않음 (플리커 방지)
  const productImages = loading ? [] : dynamicImages
  const currentImage = productImages[selectedImage] || productImages[0] || ""
  const thumbnailImages = loading ? [] : productImages

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      <div className="overflow-hidden rounded-[28px] border-[3px] border-black bg-white shadow-[6px_6px_0_0_black]">
        <div
          className="relative aspect-square bg-white"
          data-admin-product-image="true"
          data-admin-page-position-field="productImage"
          style={pagePositionStyle?.("productImage")}
        >
          {loading || productImages.length === 0 ? (
            <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
          ) : (
            <Image
              src={currentImage}
              alt={t('programs.productImage')}
              fill
              sizes="(max-width: 455px) 100vw, 455px"
              priority
              className="object-contain p-10 transition-transform duration-300 sm:p-12"
              data-pin-nopin="true"
            />
          )}
          <div
            className="absolute left-3 top-3 z-10 flex gap-2"
            data-admin-page-position-field="badge"
            style={pagePositionStyle?.("badge")}
          >
            <span className={cn("inline-flex min-h-11 items-center rounded-full border-[3px] border-black px-5 text-sm font-black shadow-[2px_2px_0_0_black]", badgeClassName)}>
              <span data-admin-page-field="badge">{badge}</span>
            </span>
          </div>
        </div>

        {(loading || thumbnailImages.length > 0) && (
          <div className="flex gap-2 overflow-x-auto border-t-2 border-black bg-white p-3">
            {loading ? (
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl border-2 border-slate-200 bg-slate-100" />
            ) : thumbnailImages.map((img, idx) => {
              const selected = selectedImage === idx
              return (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={cn(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all",
                    selected ? "border-black shadow-[2px_2px_0_0_black]" : "border-slate-200 opacity-80 hover:border-slate-500 hover:opacity-100",
                  )}
                  aria-label={`${t('programs.productImage')} 이미지 ${idx + 1} 보기`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                    data-pin-nopin="true"
                  />
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-[#FCD34D] px-1 text-[9px] font-black text-black ring-1 ring-black">
                      대표
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
