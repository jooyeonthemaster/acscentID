"use client"

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, ImageIcon, Sparkles } from "lucide-react"
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
  badgeClassName = "bg-black text-white",
  secondaryBadges,
  meta,
  price,
  infoIcon = <Sparkles size={14} className="text-slate-900" />,
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

  return (
    <section className={cn("px-4 pb-10 pt-28", sectionClassName)}>
      <div className="mx-auto w-full max-w-[455px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 overflow-hidden rounded-[28px] border-[3px] border-black bg-white shadow-[6px_6px_0_0_black]"
        >
          <div
            className="relative aspect-square bg-white"
            data-admin-product-image="true"
            data-admin-page-position-field="productImage"
            style={pagePositionStyle?.("productImage")}
          >
            {imagesLoading ? (
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
            ) : selectedImage ? (
              <Image
                src={selectedImage}
                alt={imageAlt}
                fill
                sizes="(max-width: 455px) 100vw, 455px"
                priority
                className="object-contain p-10 transition-transform duration-300 sm:p-12"
                data-pin-nopin="true"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
                <ImageIcon className="h-12 w-12" />
                <span className="text-sm font-black" data-admin-page-field="imagePlaceholder">
                  {pageContent.imagePlaceholder}
                </span>
              </div>
            )}

            <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
              <span
                className={cn("inline-flex min-h-11 items-center rounded-full border-[3px] border-black px-5 text-sm font-black shadow-[2px_2px_0_0_black]", badgeClassName)}
                data-admin-page-position-field="badge"
                style={pagePositionStyle?.("badge")}
              >
                <span data-admin-page-field="badge">{pageContent.badge}</span>
              </span>
              {secondaryBadges}
            </div>
          </div>

          {(imagesLoading || thumbnailImages.length > 0) && (
            <div className="flex gap-2 overflow-x-auto border-t-2 border-black bg-white p-3">
              {imagesLoading ? (
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl border-2 border-slate-200 bg-slate-100" />
              ) : thumbnailImages.map((image, index) => {
                const selected = index === selectedImageIndex
                return (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => selectImage(index)}
                    className={cn(
                      "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all",
                      selected ? "border-black shadow-[2px_2px_0_0_black]" : "border-slate-200 opacity-80 hover:border-slate-500 hover:opacity-100",
                    )}
                    aria-label={t('programs.thumbnailAria', { alt: imageAlt, index: index + 1 })}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                      data-pin-nopin="true"
                    />
                    {index === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-[#FCD34D] px-1 text-[9px] font-black text-black ring-1 ring-black">
                        {t('programs.representative')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={12} />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-black">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-bold text-black">{item.label}</span>
                )}
              </span>
            ))}
          </div>

          {meta && <div className="mb-2">{meta}</div>}

          <div className="mb-4">
            <h1 className={cn("mb-1.5 break-keep text-2xl font-black leading-tight text-black", titleClassName)}>
              <span
                className="inline-block"
                data-admin-editable="product_name"
                data-admin-page-position-field="productName"
                style={pagePositionStyle?.("productName")}
              >
                {title}
              </span>
            </h1>
            <p className="text-sm font-medium leading-relaxed text-slate-600">
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
            className="mb-4 rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_black]"
            data-admin-page-position-field="infoCard"
            style={pagePositionStyle?.("infoCard")}
          >
            {price && <div className="mb-3">{price}</div>}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                {infoIcon}
                <span className="font-bold text-xs text-black" data-admin-page-field="infoTitle">
                  {pageContent.infoTitle}
                </span>
              </div>
              <p className="mb-1.5 whitespace-pre-line text-[11px] text-slate-600" data-admin-page-field="infoBody">
                {pageContent.infoBody}
              </p>
              {infoItems && infoItems.length > 0 && (
                <ul className="space-y-0.5 pl-5 text-[11px] text-slate-600">
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
                  "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-black py-3.5 text-base font-black text-white shadow-[3px_3px_0_0_#cbd5e1] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#cbd5e1] disabled:opacity-50",
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
                    "mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-white py-3 text-sm font-black text-black shadow-[3px_3px_0_0_black] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_black] disabled:opacity-50",
                    secondaryCta.className,
                  )}
                >
                  {secondaryCta.label}
                </button>
              )}
              {cta.hint && <div className="mt-2 text-center text-xs font-medium text-slate-500">{cta.hint}</div>}
              {secondaryCta?.hint && <div className="mt-1 text-center text-xs font-medium text-slate-500">{secondaryCta.hint}</div>}
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}
