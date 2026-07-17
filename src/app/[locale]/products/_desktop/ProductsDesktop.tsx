'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Droplets, Package, ShoppingBag, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/types/cart'
import { STORE_PRODUCT_TYPE } from '@/lib/products/store-products'
import { useProductPricing } from '@/hooks/useProductPricing'
import { useStoreProducts } from '@/hooks/useStoreProducts'
import { useStoreProductText } from '@/hooks/useStoreProductText'

/**
 * /products 데스크탑 변형 (lg+): 크림 카드 3열 그리드.
 * 데이터 훅은 모바일 페이지와 동일 소스를 그대로 사용한다.
 */
export function ProductsDesktop() {
  const t = useTranslations()
  const { getOption } = useProductPricing()
  const { products } = useStoreProducts()
  const storeText = useStoreProductText()

  return (
    <main className="relative min-h-screen bg-[#0C0E16] font-wanted">
      <section className="px-6 pb-28 pt-[132px]">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-4 flex items-center gap-1.5 text-xs lg:text-sm text-[#8B8578]">
            <Link href="/" className="hover:text-[#E9E2D0]">{t('nav.home')}</Link>
            <ChevronRight size={12} />
            <span className="font-bold text-[#E9E2D0]">{t('nav.products')}</span>
          </div>

          <div className="mb-10">
            <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] lg:text-[13px] font-black tracking-widest text-[#8B8578]">
              <ShoppingBag size={13} />
              PRODUCTS
            </div>
            <h1 className="whitespace-pre-line text-4xl font-black leading-tight text-[#E9E2D0]">
              {t('store.list.heroTitle')}
            </h1>
            <p className="mt-3 max-w-[560px] text-sm lg:text-base font-bold leading-relaxed text-[#8B8578]">
              {t('store.list.heroDesc')}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {products.map((product, index) => {
              const option = getOption(STORE_PRODUCT_TYPE, product.size)
              const price = option?.price ?? product.fallbackPrice
              const originalPrice = option?.original_price ?? null
              const localized = storeText(product)

              return (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className="group flex flex-col rounded-[16px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-4 transition-colors hover:bg-[#FFFDF5]"
                >
                  <div className="relative aspect-square overflow-hidden rounded-[12px] border-2 border-[#D8CFBB] bg-[#FDFAF1]">
                    <Image
                      src={product.image}
                      alt={localized.title}
                      fill
                      sizes="(min-width: 1280px) 360px, 300px"
                      priority={index === 0}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-pin-nopin="true"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-[#EEB62B] px-2.5 py-1 text-[10px] lg:text-[12px] font-black text-[#1A1610]">
                      {product.badge}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col pt-4">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] lg:text-[13px] font-black text-[#5C564A]">
                      {product.size === 'scent_paper' ? <Sparkles size={13} /> : <Droplets size={13} />}
                      <span>{t('store.list.scentSelectable')}</span>
                    </div>
                    <h2 className="text-xl font-black leading-tight text-[#1A1610]">{localized.title}</h2>
                    <p className="mt-1.5 line-clamp-2 text-xs lg:text-sm font-medium leading-relaxed text-[#8B8578]">
                      {localized.description}
                    </p>
                    <div className="mt-auto flex items-end gap-2 pt-4">
                      <span className="text-lg font-black text-[#1A1610]">
                        {formatPrice(price)}{t('currency.suffix')}
                      </span>
                      {originalPrice && originalPrice > price && (
                        <span className="text-xs lg:text-sm font-bold text-[#8B8578] line-through">
                          {formatPrice(originalPrice)}{t('currency.suffix')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-12 rounded-[12px] border border-[#262A38] bg-[#12141D] p-6">
            <div className="mb-2 flex items-center gap-2 text-[#E9E2D0]">
              <Package size={16} className="text-[#8B8578]" />
              <span className="text-sm lg:text-base font-black">{t('store.list.orderInfoTitle')}</span>
            </div>
            <p className="text-xs lg:text-sm font-medium leading-relaxed text-[#8B8578]">
              {t('store.list.orderInfoDesc')}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
