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
    badgeClassName = "bg-white text-[var(--ink)]",
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
      <div className="overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)]">
        <div
          className="relative aspect-square bg-[var(--soft)]"
          data-admin-product-image="true"
          data-admin-page-position-field="productImage"
          style={pagePositionStyle?.("productImage")}
        >
          {loading || productImages.length === 0 ? (
            <div className="h-full w-full animate-pulse bg-[var(--soft)]" />
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
            <span className={cn("inline-flex min-h-11 items-center rounded-[4px] border border-[var(--line)] px-5 text-sm lg:text-base font-black", badgeClassName)}>
              <span data-admin-page-field="badge">{badge}</span>
            </span>
          </div>
        </div>

        {(loading || thumbnailImages.length > 0) && (
          <div className="flex gap-2 overflow-x-auto border-t border-[var(--line)] bg-white p-3">
            {loading ? (
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-[4px] border border-[var(--line)] bg-[var(--soft)]" />
            ) : thumbnailImages.map((img, idx) => {
              const selected = selectedImage === idx
              return (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={cn(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-[4px] border bg-white transition-all",
                    selected ? "border-[var(--ink)]" : "border-[var(--line)] opacity-80 hover:border-[var(--muted-ink)] hover:opacity-100",
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
                    <span className="absolute left-1 top-1 rounded-[3px] bg-[var(--ink)] px-1 text-[9px] font-black text-white">
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
