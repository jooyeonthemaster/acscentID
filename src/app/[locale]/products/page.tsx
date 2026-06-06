"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronRight, Droplets, Package, ShoppingBag, Sparkles } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useProductPricing } from "@/hooks/useProductPricing"
import { useStoreProducts } from "@/hooks/useStoreProducts"
import { formatPrice } from "@/types/cart"
import { STORE_PRODUCT_TYPE } from "@/lib/products/store-products"

export default function ProductsPage() {
  const { getOption } = useProductPricing()
  const { products } = useStoreProducts()

  return (
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />

      <section className="px-4 pb-28 pt-28">
        <div className="mx-auto w-full max-w-[455px]">
          <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-black">홈</Link>
            <ChevronRight size={12} />
            <span className="font-bold text-black">상품</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border-2 border-black bg-[#FCD34D] p-5 shadow-[4px_4px_0_0_black]"
          >
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3 py-1 text-[11px] font-black text-black">
              <ShoppingBag size={13} />
              PRODUCTS
            </div>
            <h1 className="text-2xl font-black leading-tight text-black">
              분석 없이 바로 고르는<br />AC&apos;SCENT 상품
            </h1>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-800">
              원하는 상품을 고르고, 마음에 드는 향을 선택한 뒤 바로 장바구니 또는 결제로 이동하세요.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4">
            {products.map((product, index) => {
              const option = getOption(STORE_PRODUCT_TYPE, product.size)
              const price = option?.price ?? product.fallbackPrice
              const originalPrice = option?.original_price ?? null

              return (
                <motion.div
                  key={product.slug}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="group grid grid-cols-[112px_minmax(0,1fr)] gap-4 rounded-2xl border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_black] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_black]"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-black bg-yellow-50">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="112px"
                        priority={index === 0}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-pin-nopin="true"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-0.5 text-[9px] font-black text-white">
                        {product.badge}
                      </span>
                    </div>

                    <div className="min-w-0 py-1">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black text-lime-700">
                        {product.size === "scent_paper" ? <Sparkles size={13} /> : <Droplets size={13} />}
                        <span>향 선택형 상품</span>
                      </div>
                      <h2 className="text-lg font-black leading-tight text-slate-900">{product.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">
                        {product.description}
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-base font-black text-black">{formatPrice(price)}원</span>
                        {originalPrice && originalPrice > price && (
                          <span className="text-xs font-bold text-slate-400 line-through">{formatPrice(originalPrice)}원</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-6 rounded-xl border-2 border-slate-900 bg-slate-900 p-4 text-white">
            <div className="mb-2 flex items-center gap-2">
              <Package size={16} className="text-[#FCD34D]" />
              <span className="text-sm font-black">상품 주문 안내</span>
            </div>
            <p className="text-xs font-medium leading-relaxed text-white/80">
              상품 주문은 AI 분석 리포트가 포함되지 않습니다. 향 선택 후 바로 주문되는 구조라 어드민 주문관리에서도 “상품”으로 따로 표시됩니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
