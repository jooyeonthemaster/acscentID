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

/** 이미지별 출처 배지/설명 — images.urls와 인덱스로 정렬 */
export interface DetailHeroImageMeta {
  badge?: string
  caption?: string
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
  imageMeta?: DetailHeroImageMeta[]
  badgeClassName?: string
  secondaryBadges?: ReactNode
  meta?: ReactNode
  price?: ReactNode
  infoIcon?: ReactNode
  infoItems?: ReactNode[]
  /** 가격과 CTA 사이 자유 슬롯 — 정보성 용량 비교표 등 */
  panelExtra?: ReactNode
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
  imageMeta,
  badgeClassName = "bg-[var(--accent-strong,#E9B82E)] text-[#171717]",
  secondaryBadges,
  meta,
  price,
  infoIcon = <Sparkles size={14} className="text-[var(--ink)]" />,
  infoItems,
  panelExtra,
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
  const selectedMeta = imageMeta?.[selectedImageIndex]

  useEffect(() => {
    if (selectedImageIndex < imageList.length) return
    selectImage(0)
  }, [imageList.length, selectedImageIndex, selectImage])

  const showArrows = !imagesLoading && thumbnailImages.length > 1
  const prevImage = () =>
    selectImage((selectedImageIndex - 1 + thumbnailImages.length) % thumbnailImages.length)
  const nextImage = () =>
    selectImage((selectedImageIndex + 1) % thumbnailImages.length)

  return (
    <section className={cn("bg-[var(--paper)] px-4 pb-10 pt-28", sectionClassName)}>
      <div className="mx-auto w-full max-w-[680px]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <div className="overflow-hidden rounded-[6px] border border-[var(--line-soft,#ECECE8)] bg-[var(--soft)]">
            <div
              className="relative aspect-square"
              data-admin-product-image="true"
              data-admin-page-position-field="productImage"
              style={pagePositionStyle?.("productImage")}
            >
              {imagesLoading ? (
                <div className="h-full w-full animate-pulse bg-[var(--soft)]" />
              ) : selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={selectedMeta?.caption ? `${imageAlt} — ${selectedMeta.caption}` : imageAlt}
                  fill
                  sizes="(max-width: 680px) 100vw, 680px"
                  priority
                  className="object-cover"
                  data-pin-nopin="true"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[var(--muted-ink)]">
                  <ImageIcon className="h-12 w-12" />
                  <span className="text-sm font-bold" data-admin-page-field="imagePlaceholder">
                    {pageContent.imagePlaceholder}
                  </span>
                </div>
              )}

              {selectedMeta?.badge && (
                <span className="absolute left-3 top-3 z-20 rounded-[3px] border border-white/75 bg-[#191918]/80 px-2 py-1.5 text-[10px] font-extrabold leading-none text-white">
                  {selectedMeta.badge}
                </span>
              )}

              {showArrows && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    aria-label={t('programs.prevImage')}
                    className="absolute left-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#191918]/25 bg-white/90 transition-colors hover:bg-white"
                  >
                    <ChevronLeft size={20} className="text-[var(--ink)]" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label={t('programs.nextImage')}
                    className="absolute right-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#191918]/25 bg-white/90 transition-colors hover:bg-white"
                  >
                    <ChevronRight size={20} className="text-[var(--ink)]" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 썸네일 스트립 */}
          {showArrows && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={imageAlt}>
              {thumbnailImages.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => selectImage(index)}
                  aria-label={t('programs.thumbnailAria', { alt: imageAlt, index: index + 1 })}
                  aria-current={index === selectedImageIndex}
                  className={cn(
                    "relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--soft)]",
                    index === selectedImageIndex
                      ? "border-2 border-[var(--ink)]"
                      : "border border-[var(--line)]",
                  )}
                >
                  <Image src={url} alt="" fill sizes="60px" className="object-cover" data-pin-nopin="true" />
                </button>
              ))}
            </div>
          )}

          {selectedMeta?.caption && (
            <p className="mt-2 min-h-[34px] text-[11px] leading-[1.5] text-[var(--muted-ink)]">
              {selectedMeta.caption}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mt-6"
        >
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[var(--muted-ink)]">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={11} aria-hidden="true" />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-[var(--ink)]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[var(--ink)]">{item.label}</span>
                )}
              </span>
            ))}
          </div>

          <div className="mb-2 flex min-h-[24px] flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center rounded-[3px] px-2 py-1 text-[10px] font-black leading-none",
                badgeClassName,
              )}
              data-admin-page-position-field="badge"
              style={pagePositionStyle?.("badge")}
            >
              <span data-admin-page-field="badge">{pageContent.badge}</span>
            </span>
            {secondaryBadges}
            {meta}
          </div>

          <div className="mb-4">
            <h1 className={cn("mb-2 break-keep text-[28px] font-black leading-[1.2] text-[var(--ink)]", titleClassName)}>
              <span
                className="inline-block"
                data-admin-editable="product_name"
                data-admin-page-position-field="productName"
                style={pagePositionStyle?.("productName")}
              >
                {title}
              </span>
            </h1>
            <p className="max-w-[500px] break-keep text-[15px] leading-[1.65] text-[var(--muted-ink)]">
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

          {price && (
            <div className="border-b border-[var(--line)] pb-5">{price}</div>
          )}

          <div
            data-admin-page-position-field="infoCard"
            style={pagePositionStyle?.("infoCard")}
            className="mt-5 border-b border-[var(--line)]"
          >
            <div className="flex items-center gap-2 pb-2">
              {infoIcon}
              <span className="text-[13px] font-extrabold text-[var(--ink)]" data-admin-page-field="infoTitle">
                {pageContent.infoTitle}
              </span>
            </div>
            <p className="whitespace-pre-line pb-3 text-xs leading-[1.6] text-[var(--muted-ink)]" data-admin-page-field="infoBody">
              {pageContent.infoBody}
            </p>
            {infoItems && infoItems.length > 0 && (
              <ul className="space-y-1 pb-3 text-xs text-[var(--muted-ink)]">
                {infoItems.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span aria-hidden="true" className="text-[var(--line)]">—</span>
                    <span className="break-keep">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {panelExtra}

          {cta && (
            <div className="mt-5">
              <button
                type="button"
                onClick={cta.onClick}
                disabled={cta.disabled}
                className={cn(
                  "flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[5px] bg-[var(--ink)] px-4 text-[15px] font-extrabold text-white transition-colors hover:bg-[#333330] disabled:opacity-50",
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
                    "mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[5px] border border-[var(--ink)] bg-white px-4 text-sm font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--soft)] disabled:opacity-50",
                    secondaryCta.className,
                  )}
                >
                  {secondaryCta.label}
                </button>
              )}
              {cta.hint && <div className="mt-2 text-center text-[11px] text-[var(--muted-ink)]">{cta.hint}</div>}
              {secondaryCta?.hint && <div className="mt-1 text-center text-[11px] text-[var(--muted-ink)]">{secondaryCta.hint}</div>}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
