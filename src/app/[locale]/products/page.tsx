"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronRight, Droplets, Package, ShoppingBag, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { Header } from "@/components/layout/Header"
import { useProductPricing } from "@/hooks/useProductPricing"
import { useStoreProducts } from "@/hooks/useStoreProducts"
import { useStoreProductText } from "@/hooks/useStoreProductText"
import { formatPrice } from "@/types/cart"
import { STORE_PRODUCT_TYPE } from "@/lib/products/store-products"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { ProductsDesktop } from "./_desktop/ProductsDesktop"

export default function ProductsPage() {
  const t = useTranslations()
  const { getOption } = useProductPricing()
  const { products } = useStoreProducts()
  const storeText = useStoreProductText()

  const mobileList = (
    <main className="relative min-h-screen bg-[#0C0E16] font-wanted">
      <Header />

      <section className="px-4 pb-28 pt-28">
        <div className="mx-auto w-full max-w-[455px]">
          <div className="mb-4 flex items-center gap-1.5 text-xs lg:text-sm text-[#8B8578]">
            <Link href="/" className="hover:text-[#1A1610]">{t('nav.home')}</Link>
            <ChevronRight size={12} />
            <span className="font-bold text-[#E9E2D0]">{t('nav.products')}</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] lg:text-[13px] font-black tracking-widest text-[#8B8578]">
              <ShoppingBag size={13} />
              PRODUCTS
            </div>
            <h1 className="whitespace-pre-line text-2xl font-black leading-tight text-[#E9E2D0]">
              {t('store.list.heroTitle')}
            </h1>
            <p className="mt-2 text-sm lg:text-base font-bold leading-relaxed text-[#8B8578]">
              {t('store.list.heroDesc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4">
            {products.map((product, index) => {
              const option = getOption(STORE_PRODUCT_TYPE, product.size)
              const price = option?.price ?? product.fallbackPrice
              const originalPrice = option?.original_price ?? null
              const localized = storeText(product)

              return (
                <motion.div
                  key={product.slug}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="group grid grid-cols-[112px_minmax(0,1fr)] gap-4 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-3 transition-all"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[12px] border-2 border-[#D8CFBB] bg-[#FDFAF1]">
                      <Image
                        src={product.image}
                        alt={localized.title}
                        fill
                        sizes="112px"
                        priority={index === 0}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-pin-nopin="true"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-[#EEB62B] px-2 py-0.5 text-[9px] font-black text-[#1A1610]">
                        {product.badge}
                      </span>
                    </div>

                    <div className="min-w-0 py-1">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] lg:text-[13px] font-black text-[#5C564A]">
                        {product.size === "scent_paper" ? <Sparkles size={13} /> : <Droplets size={13} />}
                        <span>{t('store.list.scentSelectable')}</span>
                      </div>
                      <h2 className="text-lg font-black leading-tight text-[#1A1610]">{localized.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs lg:text-sm font-medium leading-relaxed text-[#8B8578]">
                        {localized.description}
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-base font-black text-[#1A1610]">{formatPrice(price)}{t('currency.suffix')}</span>
                        {originalPrice && originalPrice > price && (
                          <span className="text-xs lg:text-sm font-bold text-[#8B8578] line-through">{formatPrice(originalPrice)}{t('currency.suffix')}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-6">
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

  return <ViewportSwitch mobile={mobileList} desktop={<ProductsDesktop />} />
}
