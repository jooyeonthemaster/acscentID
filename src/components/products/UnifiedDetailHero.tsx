"use client"

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, ImageIcon, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { useProductImages } from "@/hooks/useAdminContent"
import { cn } from "@/lib/utils"
import type { ProductPageContent, ProductPagePositionField } from "@/lib/products/page-content"

interface BreadcrumbItem {
  label: ReactNode
  href?: string
}

interface ControlledImages {
  urls: string[]
  loading?: boolean
  selectedIndex: number
  onSelect: (index: number) => void
}

interface DetailHeroCta {
  label?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  hint?: ReactNode
}

interface UnifiedDetailHeroProps {
  productSlug: string
  title: ReactNode
  imageAlt: string
  pageContent: ProductPageContent
  pagePositionStyle?: (field: ProductPagePositionField) => CSSProperties | undefined
  breadcrumbs: BreadcrumbItem[]
  images?: ControlledImages
  badgeClassName?: string
  secondaryBadges?: ReactNode
  meta?: ReactNode
  price?: ReactNode
  infoIcon?: ReactNode
  infoItems?: ReactNode[]
  cta?: DetailHeroCta
  secondaryCta?: DetailHeroCta
  titleClassName?: string
  sectionClassName?: string
}

export function UnifiedDetailHero({
  productSlug,
  title,
  imageAlt,
  pageContent,
  pagePositionStyle,
  breadcrumbs,
  images,
  badgeClassName = "bg-[#EEB62B] text-[#1A1610]",
  secondaryBadges,
  meta,
  price,
  infoIcon = <Sparkles size={14} className="text-[#1A1610]" />,
  infoItems,
  cta,
  secondaryCta,
  titleClassName,
  sectionClassName,
}: UnifiedDetailHeroProps) {
  const t = useTranslations()
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0)
  const { imageUrls, loading: internalImagesLoading } = useProductImages(productSlug)

  const imageList = images?.urls ?? imageUrls
  const imagesLoading = images?.loading ?? internalImagesLoading
  const selectedImageIndex = images?.selectedIndex ?? internalSelectedIndex
  const selectImage = images?.onSelect ?? setInternalSelectedIndex
  const selectedImage = imageList[selectedImageIndex] || imageList[0] || ""
  const thumbnailImages = imagesLoading ? [] : imageList

  useEffect(() => {
    if (selectedImageIndex < imageList.length) return
    selectImage(0)
  }, [imageList.length, selectedImageIndex, selectImage])

  // 좌우 화살표 — 홈 배너와 동일하게 처음/끝에서 순환
  const showArrows = !imagesLoading && thumbnailImages.length > 1
  const prevImage = () =>
    selectImage((selectedImageIndex - 1 + thumbnailImages.length) % thumbnailImages.length)
  const nextImage = () =>
    selectImage((selectedImageIndex + 1) % thumbnailImages.length)

  return (
    <section className={cn("px-4 pb-10 pt-28", sectionClassName)}>
      <div className="mx-auto w-full max-w-[455px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 -mx-4 overflow-hidden bg-[#F5EFE2]"
        >
          <div
            className="relative aspect-square bg-[#F5EFE2]"
            data-admin-product-image="true"
            data-admin-page-position-field="productImage"
            style={pagePositionStyle?.("productImage")}
          >
            {imagesLoading ? (
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#EDE5D2] to-[#D8CFBB]" />
            ) : selectedImage ? (
              <Image
                src={selectedImage}
                alt={imageAlt}
                fill
                sizes="(max-width: 455px) 100vw, 455px"
                priority
                className="object-cover transition-transform duration-300"
                data-pin-nopin="true"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#8B8578]">
                <ImageIcon className="h-12 w-12" />
                <span className="text-sm lg:text-base font-black" data-admin-page-field="imagePlaceholder">
                  {pageContent.imagePlaceholder}
                </span>
              </div>
            )}

            <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
              <span
                className={cn("inline-flex items-center rounded-full border-2 border-[#B8880F] px-3 py-1 text-xs lg:text-sm font-black", badgeClassName)}
                data-admin-page-position-field="badge"
                style={pagePositionStyle?.("badge")}
              >
                <span data-admin-page-field="badge">{pageContent.badge}</span>
              </span>
              {secondaryBadges}
            </div>

            {/* 좌우 네비게이션 버튼 — 홈 배너와 동일한 스타일 */}
            {showArrows && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label={t('programs.prevImage')}
                  className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-all hover:bg-black/35 active:scale-95"
                >
                  <ChevronLeft size={24} className="text-[#E9E2D0] drop-shadow" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label={t('programs.nextImage')}
                  className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-all hover:bg-black/35 active:scale-95"
                >
                  <ChevronRight size={24} className="text-[#E9E2D0] drop-shadow" />
                </button>
              </>
            )}

            {/* 사진 장수 표시 — 점 인디케이터 (사진 위 하단 중앙) */}
            {showArrows && (
              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {thumbnailImages.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectImage(index)}
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-300",
                      index === selectedImageIndex
                        ? "w-6 bg-[#12141D] shadow-md"
                        : "w-2.5 bg-[#12141D]/40 hover:bg-[#12141D]/70",
                    )}
                    aria-label={t('programs.thumbnailAria', { alt: imageAlt, index: index + 1 })}
                    aria-current={index === selectedImageIndex}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs lg:text-sm text-[#8B8578]">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={12} />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-[#1A1610]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-bold text-[#E9E2D0]">{item.label}</span>
                )}
              </span>
            ))}
          </div>

          {meta && <div className="mb-2">{meta}</div>}

          <div className="mb-4">
            <h1 className={cn("mb-1.5 break-keep text-2xl font-black leading-tight text-[#E9E2D0]", titleClassName)}>
              <span
                className="inline-block"
                data-admin-editable="product_name"
                data-admin-page-position-field="productName"
                style={pagePositionStyle?.("productName")}
              >
                {title}
              </span>
            </h1>
            <p className="text-sm lg:text-base font-medium leading-relaxed text-[#A69F8D]">
              <span
                className="inline-block"
                data-admin-page-field="subtitle"
                data-admin-page-position-field="subtitle"
                style={pagePositionStyle?.("subtitle")}
              >
                {pageContent.subtitle}
              </span>
            </p>
          </div>

          <div
            className="mb-4 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-4"
            data-admin-page-position-field="infoCard"
            style={pagePositionStyle?.("infoCard")}
          >
            {price && <div className="mb-3">{price}</div>}

            <div className="rounded-[12px] border border-[#D8CFBB] bg-[#EDE5D2] p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                {infoIcon}
                <span className="font-bold text-xs lg:text-sm text-[#1A1610]" data-admin-page-field="infoTitle">
                  {pageContent.infoTitle}
                </span>
              </div>
              <p className="mb-1.5 whitespace-pre-line text-[11px] lg:text-[13px] text-[#5C564A]" data-admin-page-field="infoBody">
                {pageContent.infoBody}
              </p>
              {infoItems && infoItems.length > 0 && (
                <ul className="space-y-0.5 pl-5 text-[11px] lg:text-[13px] text-[#5C564A]">
                  {infoItems.map((item, index) => (
                    <li key={index} className="list-disc">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {cta && (
            <>
              <button
                type="button"
                onClick={cta.onClick}
                disabled={cta.disabled}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] py-3.5 text-base font-black text-[#1A1610] transition-all disabled:opacity-50",
                  cta.className,
                )}
                data-admin-page-position-field="ctaButton"
                style={pagePositionStyle?.("ctaButton")}
              >
                <span data-admin-page-field="ctaLabel">{cta.label ?? pageContent.ctaLabel}</span>
              </button>
              {secondaryCta && (
                <button
                  type="button"
                  onClick={secondaryCta.onClick}
                  disabled={secondaryCta.disabled}
                  className={cn(
                    "mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] py-3 text-sm lg:text-base font-black text-[#1A1610] transition-all disabled:opacity-50",
                    secondaryCta.className,
                  )}
                >
                  {secondaryCta.label}
                </button>
              )}
              {cta.hint && <div className="mt-2 text-center text-xs lg:text-sm font-medium text-[#8B8578]">{cta.hint}</div>}
              {secondaryCta?.hint && <div className="mt-1 text-center text-xs lg:text-sm font-medium text-[#8B8578]">{secondaryCta.hint}</div>}
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}
