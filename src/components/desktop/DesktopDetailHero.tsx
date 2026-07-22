"use client"

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ImageIcon, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { useProductImages } from "@/hooks/useAdminContent"
import { cn } from "@/lib/utils"
import type { ProductPageContent, ProductPagePositionField } from "@/lib/products/page-content"
import type { DetailHeroImageMeta } from "@/components/products/UnifiedDetailHero"

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

interface DesktopDetailHeroProps {
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

/**
 * UnifiedDetailHero의 데스크탑(lg+) 대응 — 동일한 props 인터페이스로
 * 좌측 sticky 갤러리 + 우측 구매 패널 2컬럼을 렌더링한다.
 * admin 에디터 브리지가 쓰는 data-admin-* 속성을 그대로 유지한다.
 */
export function DesktopDetailHero({
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
}: DesktopDetailHeroProps) {
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
    <section className={cn("bg-[var(--paper)] px-6 pb-16 pt-[124px]", sectionClassName)}>
      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)] items-start gap-14">
        {/* 좌: 갤러리 (sticky) */}
        <div className="sticky top-[104px] min-w-0">
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
                  sizes="(min-width: 1280px) 660px, 50vw"
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
                <span className="absolute left-3.5 top-3.5 z-20 rounded-[3px] border border-white/75 bg-[#191918]/80 px-2 py-1.5 text-[10px] font-extrabold leading-none text-white">
                  {selectedMeta.badge}
                </span>
              )}

              {showArrows && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    aria-label={t('programs.prevImage')}
                    className="absolute left-3.5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#191918]/25 bg-white/90 transition-colors hover:bg-white"
                  >
                    <ChevronLeft size={22} className="text-[var(--ink)]" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label={t('programs.nextImage')}
                    className="absolute right-3.5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#191918]/25 bg-white/90 transition-colors hover:bg-white"
                  >
                    <ChevronRight size={22} className="text-[var(--ink)]" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 썸네일 스트립 */}
          {showArrows && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {thumbnailImages.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => selectImage(index)}
                  aria-label={t('programs.thumbnailAria', { alt: imageAlt, index: index + 1 })}
                  aria-current={index === selectedImageIndex}
                  className={cn(
                    "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--soft)]",
                    index === selectedImageIndex
                      ? "border-2 border-[var(--ink)]"
                      : "border border-[var(--line)] opacity-80 hover:opacity-100",
                  )}
                >
                  <Image src={url} alt="" fill sizes="72px" className="object-cover" data-pin-nopin="true" />
                </button>
              ))}
            </div>
          )}

          {selectedMeta?.caption && (
            <p className="mt-2 min-h-[34px] text-[11px] leading-[1.5] text-[var(--muted-ink)]">
              {selectedMeta.caption}
            </p>
          )}
        </div>

        {/* 우: 정보/구매 패널 */}
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[var(--muted-ink)]">
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

          <div className="mb-3 flex min-h-[28px] flex-wrap items-center gap-2.5">
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

          <div className="mb-5">
            <h1 className={cn("break-keep text-[34px] font-black leading-[1.18] text-[var(--ink)] xl:text-[38px]", titleClassName)}>
              <span
                className="inline-block"
                data-admin-editable="product_name"
                data-admin-page-position-field="productName"
                style={pagePositionStyle?.("productName")}
              >
                {title}
              </span>
            </h1>
            <p className="mt-3.5 max-w-[500px] break-keep text-[17px] leading-[1.65] text-[var(--muted-ink)]">
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

          {price && <div className="border-b border-[var(--line)] pb-5">{price}</div>}

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
            <div className="mt-6">
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
        </div>
      </div>
    </section>
  )
}
