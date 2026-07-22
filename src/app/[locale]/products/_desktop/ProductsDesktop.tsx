'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Droplets, Package, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/types/cart'
import { STORE_PRODUCT_TYPE } from '@/lib/products/store-products'
import { useProductPricing } from '@/hooks/useProductPricing'
import { useStoreProducts } from '@/hooks/useStoreProducts'
import { useStoreProductText } from '@/hooks/useStoreProductText'

/**
 * /products 데스크탑 변형 (lg+): 흰 카드 3열 그리드 (에디토리얼).
 * 데이터 훅은 모바일 페이지와 동일 소스를 그대로 사용한다.
 */
export function ProductsDesktop() {
  const t = useTranslations()
  const { getOption } = useProductPricing()
  const { products } = useStoreProducts()
  const storeText = useStoreProductText()

  return (
    <main className="relative min-h-screen bg-[var(--canvas)]">
      <section className="px-6 pb-28 pt-[124px]">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="mb-4 flex items-center gap-1.5 text-sm text-[var(--muted-ink)]">
            <Link href="/" className="hover:text-[var(--ink)]">{t('nav.home')}</Link>
            <ChevronRight size={12} />
            <span className="font-bold text-[var(--ink)]">{t('nav.products')}</span>
          </div>

          <div className="mb-12">
            <p className="mb-2 text-[11px] font-black text-[var(--muted-ink)]">PRODUCTS</p>
            <h1 className="whitespace-pre-line break-keep text-4xl font-black leading-tight text-[var(--ink)]">
              {t('store.list.heroTitle')}
            </h1>
            <p className="mt-3 max-w-[560px] break-keep text-base leading-relaxed text-[var(--muted-ink)]">
              {t('store.list.heroDesc')}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {products.map((product, index) => {
              const option = getOption(STORE_PRODUCT_TYPE, product.size)
              const price = option?.price ?? product.fallbackPrice
              const originalPrice = option?.original_price ?? null
              const localized = storeText(product)

              return (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[5px] border border-[var(--line)] bg-white transition-colors hover:border-[var(--ink)]"
                >
                  <div className="relative aspect-square overflow-hidden bg-[var(--soft)]">
                    <Image
                      src={product.image}
                      alt={localized.title}
                      fill
                      sizes="(min-width: 1280px) 400px, 320px"
                      priority={index === 0}
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      data-pin-nopin="true"
                    />
                    <span className="absolute left-3 top-3 rounded-[3px] bg-[var(--ink)] px-2 py-1 text-[11px] font-bold uppercase text-white">
                      {product.badge}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col border-t border-[var(--line-soft)] p-5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[var(--muted-ink)]">
                      {product.size === 'scent_paper' ? <Sparkles size={13} /> : <Droplets size={13} />}
                      <span>{t('store.list.scentSelectable')}</span>
                    </div>
                    <h2 className="break-keep text-xl font-extrabold leading-tight text-[var(--ink)]">{localized.title}</h2>
                    <p className="mt-1.5 line-clamp-2 break-keep text-sm leading-relaxed text-[var(--muted-ink)]">
                      {localized.description}
                    </p>
                    <div className="mt-auto flex items-end gap-2 pt-4">
                      <span className="text-lg font-extrabold text-[var(--ink)]">
                        {formatPrice(price)}{t('currency.suffix')}
                      </span>
                      {originalPrice && originalPrice > price && (
                        <span className="text-sm text-[var(--muted-ink)] line-through">
                          {formatPrice(originalPrice)}{t('currency.suffix')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-14 border-t border-[var(--line)] pt-6">
            <div className="mb-2 flex items-center gap-2 text-[var(--ink)]">
              <Package size={16} className="text-[var(--muted-ink)]" />
              <span className="text-base font-extrabold">{t('store.list.orderInfoTitle')}</span>
            </div>
            <p className="max-w-[720px] break-keep text-sm leading-relaxed text-[var(--muted-ink)]">
              {t('store.list.orderInfoDesc')}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
