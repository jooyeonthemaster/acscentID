"use client"

import { Suspense, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  ChevronRight,
  Droplets,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { AuthModal } from "@/components/auth/AuthModal"
import { CustomDetailRenderer } from "@/components/programs/CustomDetailRenderer"
import { ProgramAdminBridge } from "@/components/programs/ProgramAdminBridge"
import { useAuth } from "@/contexts/AuthContext"
import { useProductPricing, type PricingRow } from "@/hooks/useProductPricing"
import { useProductDetail } from "@/hooks/useProductDetail"
import { useProductImages } from "@/hooks/useAdminContent"
import { useStoreProducts } from "@/hooks/useStoreProducts"
import { formatPrice, type AddToCartRequest, type CartItem } from "@/types/cart"
import { TODAY_SCENTS, getScentById, type TodayScent } from "@/lib/today-scent/scents"
import {
  STORE_PRODUCT_IMAGE,
  STORE_PRODUCT_TYPE,
  buildStoreAnalysisData,
  getStoreProductName,
  type StoreProduct,
} from "@/lib/products/store-products"
import { setMobileOverlayOpen } from "@/lib/mobile-overlay"
import { emitCartChanged } from "@/lib/cart-events"

type SelectedScentQuantities = Record<string, number>

const MAX_SCENT_QUANTITY = 10

function decodeSlug(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return decodeURIComponent(raw || "")
}

function ProductNotFound() {
  return (
    <main className="min-h-screen bg-[#FFFDF5] font-sans">
      <Header />
      <section className="flex min-h-screen items-center justify-center px-4 pt-24">
        <div className="w-full max-w-sm rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0_0_black]">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h1 className="text-xl font-black text-slate-900">상품을 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">상품 목록에서 다시 선택해주세요.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-yellow-400 px-5 text-sm font-black text-black ring-2 ring-black"
          >
            상품으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  )
}

function ProductsDetailContent() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = decodeSlug(params.slug)
  const { getProductBySlug, loading: productsLoading } = useStoreProducts()
  const product = getProductBySlug(slug)
  const { detail, isCustomMode } = useProductDetail(slug)
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()
  const isLoggedIn = !!(user || unifiedUser)
  const scentParam = searchParams.get("scent")

  const initialScentQuantities = useMemo<SelectedScentQuantities>(() => {
    const scent = scentParam ? getScentById(scentParam) : null
    return scent ? { [scent.id]: 1 } : {}
  }, [scentParam])

  const [selectedQuantities, setSelectedQuantities] = useState<SelectedScentQuantities>(initialScentQuantities)
  const [query, setQuery] = useState("")
  const [addingToCart, setAddingToCart] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    setSelectedQuantities(initialScentQuantities)
  }, [initialScentQuantities])

  useEffect(() => {
    setMobileOverlayOpen("store-product-purchase-prompt", showLoginPrompt)
    return () => setMobileOverlayOpen("store-product-purchase-prompt", false)
  }, [showLoginPrompt])

  if (productsLoading && !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF5]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-900 border-t-lime-400" />
      </div>
    )
  }

  if (!product) return <ProductNotFound />

  return (
    <ProductDetailInner
      product={product}
      detailHtml={isCustomMode ? detail?.custom_html ?? "" : ""}
      selectedQuantities={selectedQuantities}
      setSelectedQuantities={setSelectedQuantities}
      query={query}
      setQuery={setQuery}
      isLoggedIn={isLoggedIn}
      loading={loading}
      addingToCart={addingToCart}
      setAddingToCart={setAddingToCart}
      showLoginPrompt={showLoginPrompt}
      setShowLoginPrompt={setShowLoginPrompt}
      showAuthModal={showAuthModal}
      setShowAuthModal={setShowAuthModal}
      router={router}
      priceOption={getOption(STORE_PRODUCT_TYPE, product.size)}
    />
  )
}

function ProductDetailInner({
  product,
  detailHtml,
  selectedQuantities,
  setSelectedQuantities,
  query,
  setQuery,
  isLoggedIn,
  loading,
  addingToCart,
  setAddingToCart,
  showLoginPrompt,
  setShowLoginPrompt,
  showAuthModal,
  setShowAuthModal,
  router,
  priceOption,
}: {
  product: StoreProduct
  detailHtml: string
  selectedQuantities: SelectedScentQuantities
  setSelectedQuantities: Dispatch<SetStateAction<SelectedScentQuantities>>
  query: string
  setQuery: (value: string) => void
  isLoggedIn: boolean
  loading: boolean
  addingToCart: boolean
  setAddingToCart: (value: boolean) => void
  showLoginPrompt: boolean
  setShowLoginPrompt: (value: boolean) => void
  showAuthModal: boolean
  setShowAuthModal: (value: boolean) => void
  router: ReturnType<typeof useRouter>
  priceOption: PricingRow | null
}) {
  const price = priceOption?.price ?? product.fallbackPrice
  const originalPrice = priceOption?.original_price ?? null
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null
  const purchasePath = `/checkout?product=store-multi&type=${STORE_PRODUCT_TYPE}&item=${product.slug}`
  const [authRedirectPath, setAuthRedirectPath] = useState<string | undefined>(undefined)
  const { imageUrls } = useProductImages(product.slug)
  const productImages = useMemo(() => {
    return Array.from(new Set([product.image, ...imageUrls].filter(Boolean)))
  }, [product.image, imageUrls])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const selectedProductImage = productImages[selectedImageIndex] || product.image || STORE_PRODUCT_IMAGE

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [product.slug, productImages[0], productImages.length])

  const filteredScents = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return TODAY_SCENTS
    return TODAY_SCENTS.filter((scent) => {
      return [
        scent.name,
        scent.perfumeId,
        scent.vibe,
        scent.notes.top,
        scent.notes.mid,
        scent.notes.base,
        ...scent.keywords,
      ].some((value) => value.toLowerCase().includes(normalized))
    })
  }, [query])

  const selectedItems = useMemo(() => {
    return TODAY_SCENTS
      .map((scent) => ({
        scent,
        quantity: selectedQuantities[scent.id] || 0,
      }))
      .filter((item) => item.quantity > 0)
  }, [selectedQuantities])

  const selectedScentCount = selectedItems.length
  const selectedTotalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0)
  const selectedTotalPrice = price * selectedTotalQuantity

  const setScentQuantity = (scentId: string, quantity: number) => {
    setSelectedQuantities((prev) => {
      const next = { ...prev }
      const clamped = Math.max(0, Math.min(MAX_SCENT_QUANTITY, quantity))
      if (clamped <= 0) {
        delete next[scentId]
      } else {
        next[scentId] = clamped
      }
      return next
    })
  }

  const requireSelectedItems = () => {
    if (selectedItems.length > 0) return selectedItems
    alert("향을 선택해주세요!")
    return null
  }

  const buildCartPayloads = (items: typeof selectedItems): AddToCartRequest[] => {
    return items.map(({ scent, quantity }) => ({
      product_type: STORE_PRODUCT_TYPE,
      perfume_name: getStoreProductName(product, scent),
      perfume_brand: "AC'SCENT",
      size: product.size as AddToCartRequest["size"],
      price,
      quantity,
      image_url: product.image || STORE_PRODUCT_IMAGE,
      analysis_data: buildStoreAnalysisData(product, scent),
    }))
  }

  const buildCheckoutItems = (items: typeof selectedItems): CartItem[] => {
    const now = new Date().toISOString()
    return items.map(({ scent, quantity }) => ({
      id: `direct-store-${product.slug}-${scent.id}`,
      user_id: "",
      analysis_id: null,
      layering_session_id: null,
      product_type: STORE_PRODUCT_TYPE,
      perfume_name: getStoreProductName(product, scent),
      perfume_brand: "AC'SCENT",
      twitter_name: null,
      size: product.size as CartItem["size"],
      price,
      quantity,
      image_url: product.image || STORE_PRODUCT_IMAGE,
      analysis_data: buildStoreAnalysisData(product, scent),
      created_at: now,
      updated_at: now,
    }))
  }

  const persistCheckoutItems = (items: typeof selectedItems) => {
    localStorage.setItem("checkoutItems", JSON.stringify(buildCheckoutItems(items)))
  }

  const handlePurchaseClick = () => {
    if (loading) return
    const items = requireSelectedItems()
    if (!items) return
    persistCheckoutItems(items)

    if (isLoggedIn) {
      router.push(purchasePath)
    } else {
      setAuthRedirectPath(purchasePath)
      setShowLoginPrompt(true)
    }
  }

  const handleGuestPurchase = () => {
    const items = requireSelectedItems()
    if (!items) return
    persistCheckoutItems(items)
    router.push(`${purchasePath}&guest=true`)
  }

  const handleAddToCart = async () => {
    if (loading || addingToCart) return
    const items = requireSelectedItems()
    if (!items) return
    if (!isLoggedIn) {
      setAuthRedirectPath(undefined)
      setShowLoginPrompt(true)
      return
    }

    setAddingToCart(true)
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: buildCartPayloads(items),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || "장바구니 추가에 실패했습니다")
      emitCartChanged()
      alert(`${selectedScentCount}가지 향을 장바구니에 담았어요`)
    } catch (error) {
      alert(error instanceof Error ? error.message : "장바구니 추가에 실패했습니다")
    } finally {
      setAddingToCart(false)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <main className="relative min-h-screen bg-[#FFFDF5] pb-28 font-sans">
      <Header showBack backHref="/products" />
      <ProgramAdminBridge productSlug={product.slug} />

      <section className="px-4 pb-8 pt-28">
        <div className="mx-auto w-full max-w-[455px]">
          <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-black">홈</Link>
            <ChevronRight size={12} />
            <Link href="/products" className="hover:text-black">상품</Link>
            <ChevronRight size={12} />
            <span className="font-bold text-black">{product.title}</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0_0_black]"
          >
            <div
              className="relative aspect-square bg-yellow-50"
              data-admin-product-image="true"
              data-admin-page-position-field="productImage"
            >
              <Image
                src={selectedProductImage}
                alt={product.title}
                fill
                sizes="(max-width: 455px) 100vw, 455px"
                priority
                className="object-cover"
                data-pin-nopin="true"
              />
              <div className="absolute left-3 top-3 flex gap-2">
                <span
                  className="rounded-full border-2 border-black bg-black px-3 py-1 text-[10px] font-black text-white"
                  data-admin-page-position-field="badge"
                >
                  {product.badge}
                </span>
                <span className="rounded-full border-2 border-black bg-[#FCD34D] px-3 py-1 text-[10px] font-black text-black">
                  향 선택
                </span>
              </div>
            </div>
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t-2 border-black bg-white p-3">
                {productImages.map((image, index) => {
                  const selected = index === selectedImageIndex
                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all ${
                        selected
                          ? "border-black shadow-[2px_2px_0_0_black]"
                          : "border-slate-200 opacity-80 hover:border-slate-500 hover:opacity-100"
                      }`}
                      aria-label={`${product.title} 이미지 ${index + 1} 보기`}
                    >
                      <Image
                        src={image}
                        alt={`${product.title} 이미지 ${index + 1}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                        data-pin-nopin="true"
                      />
                      {index === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-yellow-400 px-1 text-[9px] font-black text-black ring-1 ring-black">
                          대표
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-black text-lime-700 ring-1 ring-lime-300">상품</span>
              <span className="text-xs font-bold text-slate-500">분석 없이 바로 구매</span>
            </div>
            <h1 className="text-2xl font-black leading-tight text-black">
              <span data-admin-editable="product_name" data-admin-page-position-field="productName">
                {product.title}
              </span>
            </h1>
            <p
              className="mt-2 text-sm font-medium leading-relaxed text-slate-600"
              data-admin-page-position-field="subtitle"
            >
              {product.description}
            </p>
            <div className="mt-4 flex items-end gap-2" data-admin-page-position-field="price">
              <span className="text-2xl font-black text-black">{formatPrice(price)}원</span>
              {originalPrice && originalPrice > price && (
                <>
                  <span className="text-sm font-bold text-slate-400 line-through">{formatPrice(originalPrice)}원</span>
                  {discount !== null && (
                    <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-black text-white">{discount}% OFF</span>
                  )}
                </>
              )}
            </div>
          </motion.div>

          <section
            className="mb-5 rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_black]"
            data-admin-page-position-field="included"
          >
            <div className="mb-3 flex items-center gap-2">
              <Package size={16} className="text-lime-600" />
              <h2 className="text-sm font-black text-slate-900">구성</h2>
            </div>
            <ul className="space-y-2">
              {product.included.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-black bg-[#FCD34D] text-[10px]">
                    <Check size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-5 rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_black]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Droplets size={16} className="text-[#F472B6]" />
                  <h2 className="text-sm font-black text-slate-900">향 선택</h2>
                </div>
                <p className="text-xs font-medium text-slate-500">AC&apos;SCENT 30가지 향 중 원하는 향을 고르고, 향별 수량을 조절해주세요.</p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-center text-[11px] font-black text-slate-600">
                {TODAY_SCENTS.length} scents
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="향 이름, 노트, 키워드 검색"
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold outline-none transition-colors focus:border-black focus:bg-white"
              />
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredScents.map((scent) => {
                const quantity = selectedQuantities[scent.id] || 0
                const active = quantity > 0
                return (
                  <div
                    key={scent.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setScentQuantity(scent.id, active ? 0 : 1)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setScentQuantity(scent.id, active ? 0 : 1)
                      }
                    }}
                    className={`w-full cursor-pointer select-none rounded-xl border-2 p-3 text-left transition-all ${
                      active
                        ? "border-black bg-[#FEF3C7] shadow-[2px_2px_0_0_black]"
                        : "border-slate-200 bg-white hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black text-lg"
                        style={{ backgroundColor: scent.theme.bg }}
                      >
                        {scent.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-slate-900">{scent.name}</p>
                            <p className="text-[11px] font-bold text-slate-400">{scent.perfumeId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setScentQuantity(scent.id, active ? 0 : 1)
                            }}
                            className={`min-h-8 shrink-0 rounded-full border-2 px-3 text-[11px] font-black transition-colors ${
                              active
                                ? "border-black bg-[#F472B6] text-white"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            {active ? "선택됨" : "선택"}
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{scent.vibe}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[scent.notes.top, scent.notes.mid, scent.notes.base].map((note) => (
                            <span key={note} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {note}
                            </span>
                          ))}
                        </div>
                        {active && (
                          <div
                            className="mt-3 flex items-center justify-between rounded-xl border-2 border-black bg-white px-2 py-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span className="text-xs font-black text-slate-700">수량</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setScentQuantity(scent.id, quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-700 transition-colors hover:border-black"
                                aria-label={`${scent.name} 수량 줄이기`}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-black text-black">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => setScentQuantity(scent.id, quantity + 1)}
                                disabled={quantity >= MAX_SCENT_QUANTITY}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-700 transition-colors hover:border-black disabled:opacity-40"
                                aria-label={`${scent.name} 수량 늘리기`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {selectedItems.length > 0 ? (
            <section className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_black]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-[#F472B6]" />
                  <h2 className="text-sm font-black text-slate-900">선택한 향</h2>
                </div>
                <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-black text-lime-700">
                  {selectedScentCount}종 · {selectedTotalQuantity}개
                </span>
              </div>
              <div className="space-y-2">
                {selectedItems.map(({ scent, quantity }) => (
                  <div key={scent.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black text-base"
                        style={{ backgroundColor: scent.theme.bg }}
                      >
                        {scent.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">{scent.name}</p>
                        <p className="text-[11px] font-bold text-slate-500">
                          {product.shortLabel} · {formatPrice(price)}원 × {quantity}
                        </p>
                      </div>
                      <span className="text-sm font-black text-black">{formatPrice(price * quantity)}원</span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setScentQuantity(scent.id, quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-700 transition-colors hover:border-black"
                        aria-label={`${scent.name} 선택 수량 줄이기`}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-black">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setScentQuantity(scent.id, quantity + 1)}
                        disabled={quantity >= MAX_SCENT_QUANTITY}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-700 transition-colors hover:border-black disabled:opacity-40"
                        aria-label={`${scent.name} 선택 수량 늘리기`}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setScentQuantity(scent.id, 0)}
                        className="ml-1 min-h-8 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-500 transition-colors hover:bg-slate-200"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-black px-3 py-2 text-white">
                <span className="text-xs font-black opacity-70">총 상품 금액</span>
                <span className="text-base font-black">{formatPrice(selectedTotalPrice)}원</span>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-slate-600">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-[#F472B6]">
                  <Droplets size={22} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-400">선택한 향</p>
                  <h2 className="text-lg font-black text-slate-900">아직 선택한 향이 없습니다</h2>
                </div>
              </div>
            </section>
          )}

          <div data-admin-editable="detail_html">
            {detailHtml ? <CustomDetailRenderer html={detailHtml} /> : null}
          </div>
        </div>
      </section>

      {!showLoginPrompt && !showAuthModal && (
        <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[455px] -translate-x-1/2 border-t-2 border-black bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
          <div className="grid grid-cols-[minmax(0,1fr)_52px_minmax(112px,1.1fr)] items-center gap-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-black leading-tight text-black">
                {formatPrice(selectedTotalQuantity > 0 ? selectedTotalPrice : price)}원
              </div>
              <div className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
                {selectedTotalQuantity > 0
                  ? `${selectedScentCount}종 · ${selectedTotalQuantity}개 · ${product.shortLabel}`
                  : `향 미선택 · ${product.shortLabel}`}
              </div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={loading || addingToCart}
              aria-label="장바구니 담기"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-white text-black shadow-[3px_3px_0_0_black] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] disabled:opacity-50"
            >
              {addingToCart ? <Loader2 size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
            </button>
            <button
              onClick={handlePurchaseClick}
              disabled={loading}
              className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#FCD34D] px-3 text-sm font-black text-black shadow-[3px_3px_0_0_black] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] disabled:opacity-50"
            >
              바로 구매
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showLoginPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginPrompt(false)}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 z-[90] mx-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl"
            >
              <div className="relative bg-gradient-to-b from-lime-50 to-white p-6 pb-4 text-center">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-slate-100"
                >
                  <X size={20} className="text-slate-400" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black bg-[#FCD34D] shadow-[4px_4px_0_0_black]">
                  <ShoppingBag size={28} className="text-black" />
                </div>
                <h2 className="mb-2 text-xl font-black text-slate-900">로그인하고 구매하기</h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  로그인하면 주문 내역과 배송 상태를 마이페이지에서 확인할 수 있어요.
                </p>
              </div>
              <div className="border-y-2 border-black bg-slate-50 px-6 py-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-green-500">✓</span>
                    <span className="text-slate-600">장바구니는 로그인 후 이용 가능해요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-green-500">✓</span>
                    <span className="text-slate-600">비회원도 바로 구매는 가능해요</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-6">
                <button
                  onClick={handleLoginClick}
                  className="h-14 w-full rounded-2xl border-2 border-black bg-black text-lg font-bold text-white shadow-[4px_4px_0_0_#FCD34D] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FCD34D]"
                >
                  로그인 / 회원가입
                </button>
                <button
                  onClick={handleGuestPurchase}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white font-semibold text-slate-600 transition-all hover:border-slate-400 hover:bg-slate-50"
                >
                  비회원으로 구매하기
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath={authRedirectPath}
      />
    </main>
  )
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FFFDF5]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-900 border-t-lime-400" />
        </div>
      }
    >
      <ProductsDetailContent />
    </Suspense>
  )
}
