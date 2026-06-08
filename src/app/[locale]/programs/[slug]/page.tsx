'use client'

import { type CSSProperties, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Package, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { ProgramAdminBridge } from '@/components/programs/ProgramAdminBridge'
import { UnifiedDetailHero } from '@/components/products/UnifiedDetailHero'
import { useActiveProducts } from '@/hooks/useAdminContent'
import { useProductDetail } from '@/hooks/useProductDetail'
import { extractProductPageContent, type ProductPagePositionField } from '@/lib/products/page-content'

function decodeSlug(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return decodeURIComponent(raw || '')
}

export default function GenericProgramPage() {
  const t = useTranslations()
  const params = useParams<{ slug: string }>()
  const slug = decodeSlug(params.slug)
  const { products, loading: productsLoading } = useActiveProducts()
  const { detail, isCustomMode, loading: detailLoading } = useProductDetail(slug)

  const product = useMemo(
    () => products.find((item) => item.slug === slug) || null,
    [products, slug],
  )
  const productName = product?.name || slug
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
            <h1 className="text-xl font-black text-slate-900">{t('programs.detail.generic.notFoundTitle')}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {t('programs.detail.generic.notRegistered')}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-5 text-sm font-black text-white ring-2 ring-black"
            >
              {t('programs.detail.generic.backHome')}
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

        <UnifiedDetailHero
          productSlug={slug}
          title={productName}
          imageAlt={productName}
          pageContent={pageContent}
          pagePositionStyle={pagePositionStyle}
          breadcrumbs={[
            { label: t('programs.breadcrumbHome'), href: '/' },
            { label: t('programs.breadcrumbPrograms'), href: '/' },
            { label: productName },
          ]}
          infoIcon={<Sparkles className="h-4 w-4 text-slate-900" />}
          cta={{
            label: pageContent.ctaLabel,
            disabled: true,
          }}
        />

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
                <h2 className="text-xl font-black text-slate-900">{t('programs.detail.generic.prepareTitle')}</h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                  {t('programs.detail.generic.prepareDesc')}
                </p>
              </section>
            </div>
          </section>
        )}
      </main>
    </InactiveProductGuard>
  )
}
