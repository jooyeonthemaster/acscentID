'use client'

import { type CSSProperties, useMemo } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronRight, ImageIcon, Package, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { ProgramAdminBridge } from '@/components/programs/ProgramAdminBridge'
import { useActiveProducts, useProductImages } from '@/hooks/useAdminContent'
import { useProductDetail } from '@/hooks/useProductDetail'
import { extractProductPageContent, type ProductPagePositionField } from '@/lib/products/page-content'

function decodeSlug(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return decodeURIComponent(raw || '')
}

export default function GenericProgramPage() {
  const params = useParams<{ slug: string }>()
  const slug = decodeSlug(params.slug)
  const { products, loading: productsLoading } = useActiveProducts()
  const { imageUrls, loading: imagesLoading } = useProductImages(slug)
  const { detail, isCustomMode, loading: detailLoading } = useProductDetail(slug)

  const product = useMemo(
    () => products.find((item) => item.slug === slug) || null,
    [products, slug],
  )
  const productName = product?.name || slug
  const mainImage = imageUrls[0] || ''
  const pageContent = useMemo(
    () => extractProductPageContent(detail?.custom_html),
    [detail?.custom_html],
  )
  const pagePositionStyle = (field: ProductPagePositionField): CSSProperties | undefined => {
    const position = pageContent.positions[field]
    if (!position || (!position.x && !position.y)) return undefined

    return {
      transform: `translate(${position.x}px, ${position.y}px)`,
    }
  }

  if (!productsLoading && !product) {
    return (
      <main className="min-h-screen bg-[#FFFDF5] font-sans">
        <Header />
        <section className="flex min-h-screen items-center justify-center px-4 pt-24">
          <div className="w-full max-w-sm rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0_0_black]">
            <Package className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h1 className="text-xl font-black text-slate-900">상품을 찾을 수 없습니다</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              관리자 상품 목록에 등록되지 않은 페이지입니다.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-yellow-400 px-5 text-sm font-black text-black ring-2 ring-black"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <InactiveProductGuard productSlug={slug}>
      <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
        <Header />
        <ProgramAdminBridge productSlug={slug} />

        <section className="px-4 pb-10 pt-28">
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5"
            >
              <div className="relative mb-3 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0_0_black]">
                <div
                  className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50"
                  data-admin-product-image="true"
                  data-admin-page-position-field="productImage"
                  style={pagePositionStyle('productImage')}
                >
                  {imagesLoading ? (
                    <div className="h-full w-full animate-pulse bg-gradient-to-br from-yellow-100 to-amber-100" />
                  ) : mainImage ? (
                    <NextImage
                      src={mainImage}
                      alt={productName}
                      fill
                      className="object-cover"
                      sizes="455px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <ImageIcon className="h-12 w-12" />
                      <span className="text-sm font-black" data-admin-page-field="imagePlaceholder">
                        {pageContent.imagePlaceholder}
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute left-3 top-3 z-30"
                    data-admin-page-position-field="badge"
                    style={pagePositionStyle('badge')}
                  >
                    <span className="inline-flex min-h-7 items-center rounded-full border-2 border-black bg-yellow-400 px-3 text-[11px] font-black text-black shadow-[2px_2px_0_0_black]">
                      <span data-admin-page-field="badge">{pageContent.badge}</span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Link href="/" className="hover:text-black">홈</Link>
                <ChevronRight size={12} />
                <Link href="/" className="hover:text-black">프로그램</Link>
                <ChevronRight size={12} />
                <span className="font-bold text-black">{productName}</span>
              </div>

              <div className="mb-4">
                <h1 className="mb-1.5 text-xl font-black leading-tight text-black">
                  <span
                    className="inline-block"
                    data-admin-editable="product_name"
                    data-admin-page-position-field="productName"
                    style={pagePositionStyle('productName')}
                  >
                    {productName}
                  </span>
                </h1>
                <p className="text-sm font-medium text-slate-600">
                  <span
                    className="inline-block"
                    data-admin-page-field="subtitle"
                    data-admin-page-position-field="subtitle"
                    style={pagePositionStyle('subtitle')}
                  >
                    {pageContent.subtitle}
                  </span>
                </p>
              </div>

              <div
                className="mb-4 rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_black]"
                data-admin-page-position-field="infoCard"
                style={pagePositionStyle('infoCard')}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-black text-black" data-admin-page-field="infoTitle">
                    {pageContent.infoTitle}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-600" data-admin-page-field="infoBody">
                  {pageContent.infoBody}
                </p>
              </div>

              <button
                type="button"
                aria-disabled="true"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-gradient-to-r from-yellow-400 to-amber-400 py-3.5 text-base font-black text-black opacity-70 shadow-[3px_3px_0_0_black]"
                data-admin-page-position-field="ctaButton"
                style={pagePositionStyle('ctaButton')}
              >
                <span data-admin-page-field="ctaLabel">{pageContent.ctaLabel}</span>
              </button>
            </motion.div>
          </div>
        </section>

        {detailLoading ? (
          <section className="bg-white px-4 py-8">
            <div className="mx-auto h-64 w-full max-w-[455px] animate-pulse rounded-2xl bg-slate-100" />
          </section>
        ) : isCustomMode ? (
          <CustomDetailRenderer html={detail?.custom_html ?? ''} />
        ) : (
          <section className="bg-white px-4 py-8">
            <div className="mx-auto w-full max-w-[455px]" data-admin-editable="detail_html">
              <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h2 className="text-xl font-black text-slate-900">상세페이지를 준비해주세요</h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                  관리자 상품 관리 화면에서 기본 템플릿을 수정한 뒤 배포하면 이 영역에 표시됩니다.
                </p>
              </section>
            </div>
          </section>
        )}
      </main>
    </InactiveProductGuard>
  )
}
