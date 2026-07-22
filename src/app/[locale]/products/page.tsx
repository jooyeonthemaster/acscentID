"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronRight, Droplets, Package, Sparkles } from "lucide-react"
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
    <main className="relative min-h-screen bg-[var(--canvas)]">
      <Header />

      <section className="px-4 pb-28 pt-28">
        <div className="mx-auto w-full max-w-[455px]">
          <div className="mb-4 flex items-center gap-1.5 text-xs text-[var(--muted-ink)]">
            <Link href="/" className="hover:text-[var(--ink)]">{t('nav.home')}</Link>
            <ChevronRight size={12} />
            <span className="font-bold text-[var(--ink)]">{t('nav.products')}</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <p className="mb-2 text-[11px] font-black text-[var(--muted-ink)]">PRODUCTS</p>
            <h1 className="whitespace-pre-line break-keep text-2xl font-black leading-tight text-[var(--ink)]">
              {t('store.list.heroTitle')}
            </h1>
            <p className="mt-2 break-keep text-sm leading-relaxed text-[var(--muted-ink)]">
              {t('store.list.heroDesc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-3">
            {products.map((product, index) => {
              const option = getOption(STORE_PRODUCT_TYPE, product.size)
              const price = option?.price ?? product.fallbackPrice
              const originalPrice = option?.original_price ?? null
              const localized = storeText(product)

              return (
                <motion.div
                  key={product.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="group grid grid-cols-[112px_minmax(0,1fr)] gap-4 rounded-[5px] border border-[var(--line)] bg-white p-3 transition-colors hover:border-[var(--ink)]"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[4px] bg-[var(--soft)]">
                      <Image
                        src={product.image}
                        alt={localized.title}
                        fill
                        sizes="112px"
                        priority={index === 0}
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        data-pin-nopin="true"
                      />
                      <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-[var(--ink)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        {product.badge}
                      </span>
                    </div>

                    <div className="min-w-0 py-1">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted-ink)]">
                        {product.size === "scent_paper" ? <Sparkles size={13} /> : <Droplets size={13} />}
                        <span>{t('store.list.scentSelectable')}</span>
                      </div>
                      <h2 className="break-keep text-lg font-extrabold leading-tight text-[var(--ink)]">{localized.title}</h2>
                      <p className="mt-1 line-clamp-2 break-keep text-xs leading-relaxed text-[var(--muted-ink)]">
                        {localized.description}
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-base font-extrabold text-[var(--ink)]">{formatPrice(price)}{t('currency.suffix')}</span>
                        {originalPrice && originalPrice > price && (
                          <span className="text-xs text-[var(--muted-ink)] line-through">{formatPrice(originalPrice)}{t('currency.suffix')}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-8 border-t border-[var(--line)] pt-5">
            <div className="mb-2 flex items-center gap-2 text-[var(--ink)]">
              <Package size={15} className="text-[var(--muted-ink)]" />
              <span className="text-sm font-extrabold">{t('store.list.orderInfoTitle')}</span>
            </div>
            <p className="break-keep text-xs leading-relaxed text-[var(--muted-ink)]">
              {t('store.list.orderInfoDesc')}
            </p>
          </div>
        </div>
      </section>
    </main>
  )

  return <ViewportSwitch mobile={mobileList} desktop={<ProductsDesktop />} />
}
