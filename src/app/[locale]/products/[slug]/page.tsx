"use client"

import { Suspense, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  Droplets,
  Loader2,
  Minus,
  Package,
  PenLine,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Header } from "@/components/layout/Header"
import { AuthModal } from "@/components/auth/AuthModal"
import { CustomDetailRenderer } from "@/components/programs/CustomDetailRenderer"
import { ProgramAdminBridge } from "@/components/programs/ProgramAdminBridge"
import { UnifiedDetailHero } from "@/components/products/UnifiedDetailHero"
import { DesktopDetailHero } from "@/components/desktop/DesktopDetailHero"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { useAuth } from "@/contexts/AuthContext"
import { useProductPricing, type PricingRow } from "@/hooks/useProductPricing"
import { useProductDetail } from "@/hooks/useProductDetail"
import { useProductImages } from "@/hooks/useAdminContent"
import { useStoreProducts } from "@/hooks/useStoreProducts"
import { useStoreProductText } from "@/hooks/useStoreProductText"
import { formatPrice, type AddToCartRequest, type CartItem } from "@/types/cart"
import { TODAY_SCENTS, getScentById } from "@/lib/today-scent/scents"
import {
  STORE_PRODUCT_IMAGE,
  STORE_PRODUCT_TYPE,
  buildStoreAnalysisData,
  getStoreProductName,
  type StoreProduct,
} from "@/lib/products/store-products"
import { extractProductPageContentWithFallback, type ProductPagePositionField } from "@/lib/products/page-content"
import { setMobileOverlayOpen } from "@/lib/mobile-overlay"
import { emitCartChanged } from "@/lib/cart-events"

type SelectedScentQuantities = Record<string, number>

const MAX_SCENT_QUANTITY = 10
const SCENT_PAPER_PRODUCT_SLUG = "scent-paper"

function decodeSlug(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return decodeURIComponent(raw || "")
}

function parseSelectedScentQuantities(scentParam: string | null, scentsParam: string | null): SelectedScentQuantities {
  const quantities: SelectedScentQuantities = {}

  scentsParam?.split(",").forEach((entry) => {
    const [rawScentId, rawQuantity] = entry.split(":")
    const scentId = rawScentId?.trim()
    if (!scentId || !getScentById(scentId)) return

    const parsedQuantity = Number.parseInt(rawQuantity || "1", 10)
    quantities[scentId] = Math.max(1, Math.min(MAX_SCENT_QUANTITY, Number.isFinite(parsedQuantity) ? parsedQuantity : 1))
  })

  if (Object.keys(quantities).length > 0) return quantities

  const scent = scentParam ? getScentById(scentParam) : null
  return scent ? { [scent.id]: 1 } : {}
}

function ProductNotFound() {
  const t = useTranslations()
  return (
    <main className="min-h-screen bg-[#0C0E16] font-wanted">
      <Header />
      <section className="flex min-h-screen items-center justify-center px-4 pt-24">
        <div className="w-full max-w-sm rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-8 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-[#5C564A]" />
          <h1 className="text-xl font-black text-[#1A1610]">{t('store.detail.notFoundTitle')}</h1>
          <p className="mt-2 text-sm lg:text-base font-medium text-[#8B8578]">{t('store.detail.notFoundDesc')}</p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-11 items-center rounded-[12px] bg-[#FDFAF1] px-5 text-sm lg:text-base font-black text-[#1A1610] ring-2 ring-[#D8CFBB]"
          >
            {t('store.detail.backToProducts')}
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
  // 관리자 편집 미리보기에서는 비활성 상품도 불러와 편집/미리보기할 수 있게 한다
  const isAdminPreview = searchParams.get("adminPreview") === "1"
  const { getProductBySlug, loading: productsLoading } = useStoreProducts({ includeInactive: isAdminPreview })
  const product = getProductBySlug(slug)
  const { detail, isCustomMode } = useProductDetail(slug)
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()
  const isLoggedIn = !!(user || unifiedUser)
  const scentParam = searchParams.get("scent")
  const scentsParam = searchParams.get("scents")

  const initialScentQuantities = useMemo<SelectedScentQuantities>(() => {
    return parseSelectedScentQuantities(scentParam, scentsParam)
  }, [scentParam, scentsParam])

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
      <div className="flex min-h-screen items-center justify-center bg-[#0C0E16]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#D8CFBB] border-t-[#D8CFBB]" />
      </div>
    )
  }

  if (!product) return <ProductNotFound />

  const innerProps = {
    product,
    detailHtml: isCustomMode ? detail?.custom_html ?? "" : "",
    pageConfigHtml: detail?.custom_html ?? "",
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
    priceOption: getOption(STORE_PRODUCT_TYPE, product.size),
  }

  return (
    <ViewportSwitch
      mobile={<ProductDetailInner {...innerProps} />}
      desktop={<ProductDetailInner {...innerProps} desktopFrame />}
    />
  )
}

function ProductDetailInner({
  product,
  detailHtml,
  pageConfigHtml,
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
  desktopFrame = false,
}: {
  product: StoreProduct
  detailHtml: string
  pageConfigHtml: string
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
  /** lg+ 데스크탑 프레임: 히어로 2컬럼 전환 + 본문 레일 확장. 모바일 렌더링은 불변. */
  desktopFrame?: boolean
}) {
  const t = useTranslations()
  const storeText = useStoreProductText()
  const localized = storeText(product)
  const requestOnlyLabel = t('store.detail.requestOnlyLabel')
  const price = priceOption?.price ?? product.fallbackPrice
  const originalPrice = priceOption?.original_price ?? null
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null
  const purchasePath = `/checkout?product=store-multi&type=${STORE_PRODUCT_TYPE}&item=${product.slug}`
  const [authRedirectPath, setAuthRedirectPath] = useState<string | undefined>(undefined)
  const scentSectionRef = useRef<HTMLElement>(null)
  const { imageUrls, loading: imagesLoading } = useProductImages(product.slug)
  const productImages = useMemo(() => {
    const savedImages = imageUrls.filter(Boolean)
    const representativeImages = product.image && product.image !== STORE_PRODUCT_IMAGE ? [product.image] : []
    const fallbackImages = savedImages.length > 0 ? [] : [product.image].filter(Boolean)
    return Array.from(new Set([...representativeImages, ...savedImages, ...fallbackImages]))
  }, [product.image, imageUrls])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [fragranceRequestNote, setFragranceRequestNote] = useState("")
  const firstProductImage = productImages[0]

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [product.slug, firstProductImage, productImages.length])

  const localizedDescription = localized.description
  const localizedIncluded = localized.included.join("\n")
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(pageConfigHtml, {
      badge: product.badge,
      subtitle: localizedDescription,
      infoTitle: t('store.detail.infoTitle'),
      infoBody: localizedIncluded.length > 0 ? localizedIncluded : t('store.detail.infoBodyFallback'),
      ctaLabel: t('store.detail.ctaLabel'),
    }),
    [pageConfigHtml, product.badge, localizedDescription, localizedIncluded, t],
  )
  const pagePositionStyle = (field: ProductPagePositionField) => {
    const position = pageContent.positions[field]
    if (!position || (!position.x && !position.y)) return undefined

    return {
      transform: `translate(${position.x}px, ${position.y}px)`,
    }
  }

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
  const canTryScentPaperFirst = product.slug !== SCENT_PAPER_PRODUCT_SLUG

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

  const trimmedRequestNote = fragranceRequestNote.trim()

  // 향 미선택이어도 "특정 향료 요청"에 내용이 있으면 진행 가능. 둘 다 없을 때만 막는다.
  const requireSelectedItems = () => {
    if (selectedItems.length > 0) return selectedItems
    if (trimmedRequestNote) return [] // 요청 메모만으로 구매 진행
    alert(t('store.detail.selectScentAlert'))
    return null
  }

  // 향 미선택 + 요청 메모만 있는 경우의 메타데이터 (특정 향료 요청 전용 항목)
  const buildRequestOnlyAnalysisData = () => ({
    matchingKeywords: [localized.shortLabel],
    storeProduct: {
      slug: product.slug,
      title: localized.title,
      size: product.size,
      scentName: requestOnlyLabel,
      requestNote: trimmedRequestNote,
    },
  })

  const buildCartPayloads = (items: typeof selectedItems): AddToCartRequest[] => {
    if (items.length === 0) {
      return [{
        product_type: STORE_PRODUCT_TYPE,
        perfume_name: `${localized.title} (${requestOnlyLabel})`,
        perfume_brand: "AC'SCENT",
        size: product.size as AddToCartRequest["size"],
        price,
        quantity: 1,
        image_url: product.image || STORE_PRODUCT_IMAGE,
        analysis_data: buildRequestOnlyAnalysisData(),
      }]
    }
    return items.map(({ scent, quantity }) => ({
      product_type: STORE_PRODUCT_TYPE,
      perfume_name: getStoreProductName(product, scent, localized.title),
      perfume_brand: "AC'SCENT",
      size: product.size as AddToCartRequest["size"],
      price,
      quantity,
      image_url: product.image || STORE_PRODUCT_IMAGE,
      analysis_data: buildStoreAnalysisData(product, scent, fragranceRequestNote, localized.title, localized.shortLabel),
    }))
  }

  const buildCheckoutItems = (items: typeof selectedItems): CartItem[] => {
    const now = new Date().toISOString()
    if (items.length === 0) {
      return [{
        id: `direct-store-${product.slug}-request`,
        user_id: "",
        analysis_id: null,
        layering_session_id: null,
        product_type: STORE_PRODUCT_TYPE,
        perfume_name: `${localized.title} (${requestOnlyLabel})`,
        perfume_brand: "AC'SCENT",
        twitter_name: null,
        size: product.size as CartItem["size"],
        price,
        quantity: 1,
        image_url: product.image || STORE_PRODUCT_IMAGE,
        analysis_data: buildRequestOnlyAnalysisData(),
        created_at: now,
        updated_at: now,
      }]
    }
    return items.map(({ scent, quantity }) => ({
      id: `direct-store-${product.slug}-${scent.id}`,
      user_id: "",
      analysis_id: null,
      layering_session_id: null,
      product_type: STORE_PRODUCT_TYPE,
      perfume_name: getStoreProductName(product, scent, localized.title),
      perfume_brand: "AC'SCENT",
      twitter_name: null,
      size: product.size as CartItem["size"],
      price,
      quantity,
      image_url: product.image || STORE_PRODUCT_IMAGE,
      analysis_data: buildStoreAnalysisData(product, scent, fragranceRequestNote, localized.title, localized.shortLabel),
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
      if (!res.ok) throw new Error(data.details || data.error || t('store.detail.addFailed'))
      emitCartChanged()
      if (selectedScentCount === 0 && trimmedRequestNote) {
        alert(t('store.detail.requestAddedToast', { note: trimmedRequestNote }))
      } else {
        alert(t('store.detail.addedToast', { count: selectedScentCount }))
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t('store.detail.addFailed'))
    } finally {
      setAddingToCart(false)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const scrollToScentSelection = () => {
    scentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleTryScentPaperFirst = () => {
    const params = new URLSearchParams()

    if (selectedItems.length === 1 && selectedItems[0].quantity === 1) {
      params.set("scent", selectedItems[0].scent.id)
    } else if (selectedItems.length > 0) {
      params.set("scents", selectedItems.map(({ scent, quantity }) => `${scent.id}:${quantity}`).join(","))
    }

    const queryString = params.toString()
    router.push(`/products/${SCENT_PAPER_PRODUCT_SLUG}${queryString ? `?${queryString}` : ""}`)
  }

  const heroProps = {
    productSlug: product.slug,
    title: localized.title,
    imageAlt: localized.title,
    pageContent,
    pagePositionStyle,
    breadcrumbs: [
      { label: t('nav.home'), href: "/" },
      { label: t('nav.products'), href: "/products" },
      { label: localized.title },
    ],
    images: {
      urls: productImages,
      loading: imagesLoading,
      selectedIndex: selectedImageIndex,
      onSelect: setSelectedImageIndex,
    },
    secondaryBadges: (
      <span className="inline-flex items-center rounded-full border-2 border-[#B8880F] bg-[#EEB62B] px-3 py-1 text-xs lg:text-sm font-black text-[#1A1610]">
        {t('store.detail.selectScent')}
      </span>
    ),
    meta: (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[#EDE5D2] px-2.5 py-1 text-[11px] lg:text-[13px] font-black text-[#5C564A] ring-1 ring-[#D8CFBB]">{t('store.detail.metaTag')}</span>
        <span className="text-xs lg:text-sm font-bold text-[#8B8578]">{t('store.detail.metaSub')}</span>
      </div>
    ),
    price: (
      <div
        className="flex items-end gap-2"
        data-admin-page-position-field="price"
        style={pagePositionStyle("price")}
      >
        <span className="text-2xl font-black text-[#1A1610]">{formatPrice(price)}{t('currency.suffix')}</span>
        {originalPrice && originalPrice > price && (
          <>
            <span className="text-sm lg:text-base font-bold text-[#8B8578] line-through">{formatPrice(originalPrice)}{t('currency.suffix')}</span>
            {discount !== null && (
              <span className="rounded-[12px] bg-[#FDFAF1] px-1.5 py-0.5 text-[10px] lg:text-[12px] font-black text-[#1A1610]">{discount}% OFF</span>
            )}
          </>
        )}
      </div>
    ),
    infoIcon: <Droplets size={14} className="text-[#1A1610]" />,
    cta: {
      onClick: scrollToScentSelection,
      label: pageContent.ctaLabel,
    },
    secondaryCta: canTryScentPaperFirst ? {
      onClick: handleTryScentPaperFirst,
      label: t('store.detail.tryPaperFirst'),
      hint: selectedItems.length > 0
        ? t('store.detail.tryPaperHintSelected')
        : t('store.detail.tryPaperHintDefault'),
    } : undefined,
  }

  return (
    <main className={desktopFrame ? "relative min-h-screen bg-[#0C0E16] pb-16 font-wanted" : "relative min-h-screen bg-[#0C0E16] pb-40 font-wanted"}>
      {!desktopFrame && <Header showBack backHref="/products" />}
      {!desktopFrame && <ProgramAdminBridge productSlug={product.slug} />}

      {desktopFrame ? <DesktopDetailHero {...heroProps} /> : <UnifiedDetailHero {...heroProps} />}

      <section className="px-4 pb-8">
        <div className={desktopFrame ? "mx-auto w-full max-w-[760px]" : "mx-auto w-full max-w-[455px]"}>
          <section
            className="mb-5 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-4"
            data-admin-page-position-field="included"
            style={pagePositionStyle("included")}
          >
            <div className="mb-3 flex items-center gap-2">
              <Package size={16} className="text-[#1A1610]" />
              <h2 className="text-sm lg:text-base font-black text-[#1A1610]">{t('store.detail.composition')}</h2>
            </div>
            <ul className="space-y-2">
              {localized.included.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm lg:text-base font-bold text-[#5C564A]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D8CFBB] bg-[#FDFAF1] text-[10px] lg:text-[12px] text-[#1A1610]">
                    <Check size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section ref={scentSectionRef} id="scent-selector" className="mb-5 scroll-mt-24 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Droplets size={16} className="text-[#9F9F9F]" />
                  <h2 className="text-sm lg:text-base font-black text-[#1A1610]">{t('store.detail.selectScent')}</h2>
                </div>
                <p className="text-xs lg:text-sm font-medium text-[#8B8578]">{t('store.detail.scentSelectDesc')}</p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-[#EDE5D2] px-2.5 py-1 text-center text-[11px] lg:text-[13px] font-black text-[#5C564A]">
                {t('store.detail.scentsCount', { count: TODAY_SCENTS.length })}
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B8578]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('store.detail.searchPlaceholder')}
                className="h-11 w-full rounded-[12px] border-2 border-[#D8CFBB] bg-[#EDE5D2] text-[#1A1610] placeholder:text-[#8B8578] pl-9 pr-3 text-sm lg:text-base font-bold outline-none transition-colors focus:border-[#D8CFBB] focus:bg-[#F5EFE2]"
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
                    className={`w-full cursor-pointer select-none rounded-[12px] border-2 p-3 text-left transition-all ${
                      active
                        ? "border-[#D8CFBB] bg-[#EDE5D2]"
                        : "border-[#D8CFBB] bg-[#F5EFE2] hover:border-[#C9BFA8]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] text-lg"
                        style={{ backgroundColor: scent.theme.bg }}
                      >
                        {scent.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm lg:text-base font-black text-[#1A1610]">{scent.name}</p>
                            <p className="text-[11px] lg:text-[13px] font-bold text-[#8B8578]">{scent.perfumeId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setScentQuantity(scent.id, active ? 0 : 1)
                            }}
                            className={`min-h-8 shrink-0 rounded-full border-2 px-3 text-[11px] lg:text-[13px] font-black transition-colors ${
                              active
                                ? "border-[#D8CFBB] bg-[#FDFAF1] text-[#1A1610]"
                                : "border-[#D8CFBB] bg-[#F5EFE2] text-[#5C564A]"
                            }`}
                          >
                            {active ? t('store.detail.selected') : t('store.detail.select')}
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs lg:text-sm font-medium leading-relaxed text-[#8B8578]">{scent.vibe}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[scent.notes.top, scent.notes.mid, scent.notes.base].map((note) => (
                            <span key={note} className="rounded-full bg-[#EDE5D2] px-2 py-0.5 text-[10px] lg:text-[12px] font-bold text-[#5C564A]">
                              {note}
                            </span>
                          ))}
                        </div>
                        {active && (
                          <div
                            className="mt-3 flex items-center justify-between rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] px-2 py-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span className="text-xs lg:text-sm font-black text-[#5C564A]">{t('store.detail.quantity')}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setScentQuantity(scent.id, quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-[#5C564A] transition-colors hover:border-[#D8CFBB]"
                                aria-label={t('store.detail.decreaseQtyAria', { name: scent.name })}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm lg:text-base font-black text-[#1A1610]">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => setScentQuantity(scent.id, quantity + 1)}
                                disabled={quantity >= MAX_SCENT_QUANTITY}
                                className="flex h-8 w-8 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-[#5C564A] transition-colors hover:border-[#D8CFBB] disabled:opacity-40"
                                aria-label={t('store.detail.increaseQtyAria', { name: scent.name })}
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

          {/* 특정 향료 요청 (선택) — 향 선택 단계의 주관식 입력. 비워도 구매 가능. */}
          <section className="rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-4">
            <div className="mb-2 flex items-center gap-2">
              <PenLine size={16} className="text-[#9F9F9F]" />
              <h2 className="text-sm lg:text-base font-black text-[#1A1610]">특정 향료 요청</h2>
              <span className="rounded-full bg-[#EDE5D2] px-2 py-0.5 text-[10px] lg:text-[12px] font-bold text-[#8B8578]">선택</span>
            </div>
            <textarea
              value={fragranceRequestNote}
              onChange={(event) => setFragranceRequestNote(event.target.value)}
              maxLength={200}
              rows={2}
              placeholder="예: 하현상 시그니처 향으로 주세요!"
              className="w-full resize-none rounded-[12px] border-2 border-[#D8CFBB] bg-[#EDE5D2] px-3 py-2.5 text-sm lg:text-base text-[#1A1610] outline-none transition-colors placeholder:text-[#8B8578] focus:border-[#D8CFBB]"
            />
            <p className="mt-1.5 text-[11px] lg:text-[13px] font-medium text-[#8B8578]">
              원하는 향이 따로 있으면 적어주세요. 작성하지 않아도 구매할 수 있어요.
            </p>
          </section>

          {selectedItems.length > 0 ? (
            <section className="rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-[#9F9F9F]" />
                  <h2 className="text-sm lg:text-base font-black text-[#1A1610]">{t('store.detail.selectedScents')}</h2>
                </div>
                <span className="rounded-full bg-[#EDE5D2] px-2.5 py-1 text-[11px] lg:text-[13px] font-black text-[#5C564A]">
                  {t('store.detail.countSummary', { count: selectedScentCount, qty: selectedTotalQuantity })}
                </span>
              </div>
              <div className="space-y-2">
                {selectedItems.map(({ scent, quantity }) => (
                  <div key={scent.id} className="rounded-[12px] border border-[#D8CFBB] bg-[#EDE5D2] p-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] text-base"
                        style={{ backgroundColor: scent.theme.bg }}
                      >
                        {scent.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm lg:text-base font-black text-[#1A1610]">{scent.name}</p>
                        <p className="text-[11px] lg:text-[13px] font-bold text-[#8B8578]">
                          {localized.shortLabel} · {formatPrice(price)}{t('currency.suffix')} × {quantity}
                        </p>
                      </div>
                      <span className="text-sm lg:text-base font-black text-[#1A1610]">{formatPrice(price * quantity)}{t('currency.suffix')}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setScentQuantity(scent.id, quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-[#5C564A] transition-colors hover:border-[#D8CFBB]"
                        aria-label={t('store.detail.decreaseQtyAria', { name: scent.name })}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm lg:text-base font-black text-[#1A1610]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setScentQuantity(scent.id, quantity + 1)}
                        disabled={quantity >= MAX_SCENT_QUANTITY}
                        className="flex h-8 w-8 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-[#5C564A] transition-colors hover:border-[#D8CFBB] disabled:opacity-40"
                        aria-label={t('store.detail.increaseQtyAria', { name: scent.name })}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setScentQuantity(scent.id, 0)}
                        className="ml-1 min-h-8 rounded-[12px] bg-[#EDE5D2] px-3 text-xs lg:text-sm font-black text-[#8B8578] transition-colors hover:bg-[#D8CFBB]"
                      >
                        {t('store.detail.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-[12px] bg-[#FDFAF1] px-3 py-2 text-[#1A1610]">
                <span className="text-xs lg:text-sm font-black opacity-70">{t('store.detail.totalAmount')}</span>
                <span className="text-base font-black">{formatPrice(selectedTotalPrice)}{t('currency.suffix')}</span>
              </div>
            </section>
          ) : (
            <section className="rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] p-5 text-[#5C564A]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#EDE5D2] text-[#9F9F9F]">
                  <Droplets size={22} />
                </span>
                <div>
                  <p className="text-xs lg:text-sm font-black text-[#8B8578]">{t('store.detail.selectedScents')}</p>
                  <h2 className="text-lg font-black text-[#1A1610]">{t('store.detail.noScentSelected')}</h2>
                </div>
              </div>
            </section>
          )}

          <div data-admin-editable="detail_html">
            {detailHtml ? <CustomDetailRenderer html={detailHtml} /> : null}
          </div>
        </div>
      </section>

      {/* 데스크탑: 고정 바 대신 본문 레일 끝의 인라인 구매 패널 */}
      {desktopFrame && (
        <div className="mx-auto w-full max-w-[760px] px-4">
          <div className="rounded-[16px] border-2 border-[#262A38] bg-[#12141D] p-4">
            {canTryScentPaperFirst && (
              <button
                type="button"
                onClick={handleTryScentPaperFirst}
                className="mb-3 flex h-10 w-full items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-xs lg:text-sm font-black text-[#1A1610] transition-all hover:bg-[#FFFDF5]"
              >
                {t('store.detail.tryPaperFirstBottom')}
              </button>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_52px_minmax(160px,0.8fr)] items-center gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-black leading-tight text-[#E9E2D0]">
                  {formatPrice(selectedTotalQuantity > 0 ? selectedTotalPrice : price)}{t('currency.suffix')}
                </div>
                <div className="mt-0.5 truncate text-[11px] lg:text-[13px] font-bold text-[#8B8578]">
                  {selectedTotalQuantity > 0
                    ? t('store.detail.summaryShort', { count: selectedScentCount, qty: selectedTotalQuantity, label: localized.shortLabel })
                    : trimmedRequestNote
                      ? `특정 향료 요청 · ${localized.shortLabel}`
                      : t('store.detail.notSelectedShort', { label: localized.shortLabel })}
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={loading || addingToCart}
                aria-label={t('store.detail.addToCartAria')}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-[#1A1610] transition-all hover:bg-[#FFFDF5] disabled:opacity-50"
              >
                {addingToCart ? <Loader2 size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
              </button>
              <button
                onClick={handlePurchaseClick}
                disabled={loading}
                className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] px-4 text-sm lg:text-base font-black text-[#1A1610] transition-all hover:bg-[#F2C24A] disabled:opacity-50"
              >
                {t('store.detail.buyNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!desktopFrame && !showLoginPrompt && !showAuthModal && (
        <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[455px] -translate-x-1/2 border-t-2 border-[#262A38] bg-[#12141D] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
          {canTryScentPaperFirst && (
            <button
              type="button"
              onClick={handleTryScentPaperFirst}
              className="mb-2 flex h-10 w-full items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-xs lg:text-sm font-black text-[#1A1610] transition-all"
            >
              {t('store.detail.tryPaperFirstBottom')}
            </button>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_52px_minmax(112px,1.1fr)] items-center gap-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-black leading-tight text-[#E9E2D0]">
                {formatPrice(selectedTotalQuantity > 0 ? selectedTotalPrice : price)}{t('currency.suffix')}
              </div>
              <div className="mt-0.5 truncate text-[10px] lg:text-[12px] font-bold text-[#8B8578]">
                {selectedTotalQuantity > 0
                  ? t('store.detail.summaryShort', { count: selectedScentCount, qty: selectedTotalQuantity, label: localized.shortLabel })
                  : trimmedRequestNote
                    ? `특정 향료 요청 · ${localized.shortLabel}`
                    : t('store.detail.notSelectedShort', { label: localized.shortLabel })}
              </div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={loading || addingToCart}
              aria-label={t('store.detail.addToCartAria')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] text-[#1A1610] transition-all disabled:opacity-50"
            >
              {addingToCart ? <Loader2 size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
            </button>
            <button
              onClick={handlePurchaseClick}
              disabled={loading}
              className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] px-3 text-sm lg:text-base font-black text-[#1A1610] transition-all disabled:opacity-50"
            >
              {t('store.detail.buyNow')}
            </button>
          </div>
        </div>
      )}
      {!desktopFrame && <div className="h-28" />}

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
              className="fixed inset-x-4 top-1/2 z-[90] mx-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] shadow-2xl"
            >
              <div className="relative bg-gradient-to-b from-[#FDFAF1] to-[#F5EFE2] p-6 pb-4 text-center">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-[#EDE5D2]"
                >
                  <X size={20} className="text-[#8B8578]" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[12px] border-2 border-[#D8CFBB] bg-[#FDFAF1]">
                  <ShoppingBag size={28} className="text-[#1A1610]" />
                </div>
                <h2 className="mb-2 text-xl font-black text-[#1A1610]">{t('store.detail.loginTitle')}</h2>
                <p className="text-sm lg:text-base leading-relaxed text-[#5C564A]">
                  {t('store.detail.loginDesc')}
                </p>
              </div>
              <div className="border-y-2 border-[#D8CFBB] bg-[#EDE5D2] px-6 py-4">
                <div className="space-y-2 text-sm lg:text-base">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#8B8578]">✓</span>
                    <span className="text-[#5C564A]">{t('store.detail.benefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#8B8578]">✓</span>
                    <span className="text-[#5C564A]">{t('store.detail.benefit2')}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-6">
                <button
                  onClick={handleLoginClick}
                  className="h-14 w-full rounded-[12px] border-2 border-[#12141D] bg-[#12141D] text-lg font-bold text-[#F5EFE2] transition-all"
                >
                  {t('store.detail.loginButton')}
                </button>
                <button
                  onClick={handleGuestPurchase}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#D8CFBB] bg-[#F5EFE2] font-semibold text-[#5C564A] transition-all hover:border-[#C9BFA8] hover:bg-[#EDE5D2]"
                >
                  {t('store.detail.guestButton')}
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
        <div className="flex min-h-screen items-center justify-center bg-[#0C0E16]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#D8CFBB] border-t-[#C9BFA8]" />
        </div>
      }
    >
      <ProductsDetailContent />
    </Suspense>
  )
}
