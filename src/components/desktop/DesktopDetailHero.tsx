"use client"

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
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

interface DesktopDetailHeroProps {
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
    <section className={cn("px-6 pb-14 pt-[124px]", sectionClassName)}>
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)_420px] items-start gap-12">
        {/* 좌: 갤러리 (sticky) */}
        <div className="sticky top-[100px]">
          <div className="overflow-hidden rounded-[16px] border-2 border-[#D8CFBB] bg-[#F5EFE2]">
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
                  sizes="(min-width: 1280px) 700px, 560px"
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

              <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                <span
                  className={cn("inline-flex items-center rounded-full border-2 border-[#B8880F] px-3 py-1 text-xs lg:text-sm font-black", badgeClassName)}
                  data-admin-page-position-field="badge"
                  style={pagePositionStyle?.("badge")}
                >
                  <span data-admin-page-field="badge">{pageContent.badge}</span>
                </span>
                {secondaryBadges}
              </div>

              {showArrows && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    aria-label={t('programs.prevImage')}
                    className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-all hover:bg-black/35 active:scale-95"
                  >
                    <ChevronLeft size={24} className="text-[#E9E2D0] drop-shadow" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label={t('programs.nextImage')}
                    className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-all hover:bg-black/35 active:scale-95"
                  >
                    <ChevronRight size={24} className="text-[#E9E2D0] drop-shadow" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 썸네일 스트립 */}
          {showArrows && (
            <div className="mt-3 flex gap-2">
              {thumbnailImages.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => selectImage(index)}
                  aria-label={t('programs.thumbnailAria', { alt: imageAlt, index: index + 1 })}
                  aria-current={index === selectedImageIndex}
                  className={cn(
                    "relative h-20 w-20 overflow-hidden rounded-[10px] border-2 transition-all",
                    index === selectedImageIndex
                      ? "border-[#EEB62B]"
                      : "border-[#262A38] opacity-60 hover:opacity-100",
                  )}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    data-pin-nopin="true"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 우: 정보/구매 패널 */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs lg:text-sm text-[#8B8578]">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={12} />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-[#E9E2D0]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-bold text-[#E9E2D0]">{item.label}</span>
                )}
              </span>
            ))}
          </div>

          {meta && <div className="mb-2">{meta}</div>}

          <div className="mb-5">
            <h1 className={cn("mb-2 break-keep text-3xl font-black leading-tight text-[#E9E2D0]", titleClassName)}>
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
            className="mb-5 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-5"
            data-admin-page-position-field="infoCard"
            style={pagePositionStyle?.("infoCard")}
          >
            {price && <div className="mb-4">{price}</div>}

            <div className="rounded-[12px] border border-[#D8CFBB] bg-[#EDE5D2] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                {infoIcon}
                <span className="text-xs lg:text-sm font-bold text-[#1A1610]" data-admin-page-field="infoTitle">
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
                  "flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] py-3.5 text-base font-black text-[#1A1610] transition-all hover:bg-[#F2C24A] disabled:opacity-50",
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
                    "mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] py-3 text-sm lg:text-base font-black text-[#1A1610] transition-all hover:bg-[#FFFDF5] disabled:opacity-50",
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
        </div>
      </div>
    </section>
  )
}
