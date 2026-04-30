'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Trash2, X, Calendar, ShoppingBag, Eye, ChevronRight, Beaker, Droplets, Check, CheckSquare, Square, ShoppingCart, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PerfumeNotes } from '@/app/[locale]/result/components/PerfumeNotes'
import { PerfumeProfile } from '@/app/[locale]/result/components/PerfumeProfile'
import { PerfumePersona } from '@/types/analysis'
import { PRODUCT_TYPE_BADGES, type ProductType } from '@/types/cart'
import { useProductPricing } from '@/hooks/useProductPricing'
import { perfumes } from '@/data/perfumes'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
import { useActiveProducts } from '@/hooks/useAdminContent'
import { isProductTypeDiscontinued } from '@/lib/products/active'

// 향수 ID로 색상 가져오기
const getPerfumeColor = (id: string): string => {
  const perfume = perfumes.find(p => p.id === id)
  return perfume?.primaryColor || '#6B7280'
}

// 밝은 색상인지 판별
const isLightColor = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 160
}

interface RecipeGranule {
  id: string
  name: string
  ratio: number
}

interface ConfirmedRecipe {
  granules: RecipeGranule[]
}

interface Analysis {
  id: string
  created_at: string
  twitter_name: string
  idol_name: string | null
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  analysis_data: AnalysisData
  confirmed_recipe: ConfirmedRecipe | null
  product_type?: ProductType
  service_mode?: 'online' | 'offline'
  modeling_image_url?: string | null
  modeling_request?: string | null
}

// 분석 데이터 타입 (레시피 모달에서 사용)
interface AnalysisData {
  matchingPerfumes?: Array<{
    matchScore?: number
    score?: number
    persona?: PerfumePersona
  }>
  matchingKeywords?: string[]
}

interface ChemistryAnalysis {
  sessionId: string
  characterA: Analysis
  characterB: Analysis
  chemistryData: object
  chemistryType: string | null
  chemistryTitle: string | null
  service_mode?: 'online' | 'offline'
  created_at: string
}

interface SavedAnalysisListProps {
  analyses: Analysis[]
  chemistryAnalyses?: ChemistryAnalysis[]
  loading: boolean
  onDelete: (id: string) => void
  onDeleteChemistry?: (sessionId: string) => void
  viewMode?: 'grid' | 'list'
}

export function SavedAnalysisList({ analyses, chemistryAnalyses = [], loading, onDelete, onDeleteChemistry, viewMode = 'grid' }: SavedAnalysisListProps) {
  const router = useRouter()
  const t = useTranslations('mypage.gallery')
  const tMypage = useTranslations('mypage')
  const tButtons = useTranslations('buttons')
  const tErrors = useTranslations('errors')
  const { getLocalizedName } = useLocalizedPerfumes()
  const { isProductActive, loading: productsLoading } = useActiveProducts()
  const { getDefaultSize, getDefaultPrice } = useProductPricing()
  const isAnalysisDiscontinued = (productType: string | null | undefined) =>
    isProductTypeDiscontinued(productType, isProductActive, productsLoading)
  const isChemistryDiscontinued = isAnalysisDiscontinued('chemistry_set')
  const [selectedImage, setSelectedImage] = useState<Analysis | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Analysis | null>(null)
  const [recipeModalTarget, setRecipeModalTarget] = useState<Analysis | null>(null)
  const [recipeProductTab, setRecipeProductTab] = useState<'10ml' | '50ml' | '5ml'>('10ml')

  // 다중 선택 관련 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  // 케미 삭제 대상
  const [chemistryDeleteTarget, setChemistryDeleteTarget] = useState<ChemistryAnalysis | null>(null)

  // 케미 상세보기 모달 대상
  const [chemistryDetailTarget, setChemistryDetailTarget] = useState<ChemistryAnalysis | null>(null)

  // 장바구니 결과 모달 상태
  const [cartResultModal, setCartResultModal] = useState<{
    type: 'success' | 'error'
    added?: number
    duplicates?: number
    message?: string
  } | null>(null)

  // 선택 토글
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === analyses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(analyses.map(a => a.id)))
    }
  }

  // 선택 모드 종료
  const exitSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }

  // 장바구니 담기
  const handleAddToCart = async () => {
    if (selectedIds.size === 0) return

    setIsAddingToCart(true)
    try {
      const selectedAnalyses = analyses.filter(a => selectedIds.has(a.id))
      const cartItems = selectedAnalyses.map(a => ({
        analysis_id: a.id,
        product_type: a.product_type || 'image_analysis',
        perfume_name: a.perfume_name,
        perfume_brand: a.perfume_brand || undefined,
        twitter_name: a.twitter_name || undefined,
        size: getDefaultSize(a.product_type || 'image_analysis'),
        price: getDefaultPrice(a.product_type || 'image_analysis'),
        quantity: 1,
        image_url: a.user_image_url || undefined,
        analysis_data: a.analysis_data || undefined,
      }))

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems }),
      })

      const data = await response.json()

      if (response.ok) {
        setCartResultModal({
          type: 'success',
          added: data.added,
          duplicates: data.duplicates || 0,
        })
        exitSelectionMode()
      } else {
        setCartResultModal({
          type: 'error',
          message: data.error || t('addToCartFailed'),
        })
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      setCartResultModal({
        type: 'error',
        message: t('addToCartError'),
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  // 상품 타입 뱃지 렌더링
  const renderProductTypeBadge = (productType?: ProductType) => {
    const type = productType || 'image_analysis'
    const badge = PRODUCT_TYPE_BADGES[type] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', labelShort: type }
    return (
      <span className={`px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded ${badge.bg} ${badge.text} border ${badge.border}`}>
        {badge.labelShort}
      </span>
    )
  }

  // 구매하기 버튼 클릭 - 체크아웃으로 이동
  const handlePurchase = (analysis: Analysis, e: React.MouseEvent) => {
    e.stopPropagation()

    // 비활성 상품(관리자에서 판매중단)이면 차단 — 분석 결과 카드에서 뒤늦게 구매 시도 방어
    if (isAnalysisDiscontinued(analysis.product_type)) {
      alert(tMypage('productDiscontinued'))
      return
    }

    // 분석 결과를 localStorage에 저장 (checkout 페이지에서 사용)
    const analysisResult = {
      matchingPerfumes: [{
        perfumeId: analysis.id,
        persona: {
          name: analysis.perfume_name,
          recommendation: analysis.perfume_brand
        }
      }],
      matchingKeywords: analysis.confirmed_recipe?.granules?.map(g => g.name) || []
    }

    localStorage.setItem('analysisResult', JSON.stringify(analysisResult))
    localStorage.setItem('userImage', analysis.user_image_url || '')
    localStorage.setItem('serviceMode', 'online')
    // 상품 타입 저장 (피규어 디퓨저 vs 향수 구분)
    localStorage.setItem('checkoutProductType', analysis.product_type || 'image_analysis')
    // 분석 ID 저장 (주문과 분석 결과 연결용)
    localStorage.setItem('checkoutAnalysisId', analysis.id)

    // 확정된 레시피 저장 (checkout 페이지에서 레시피 배지 표시용)
    if (analysis.confirmed_recipe) {
      localStorage.setItem('checkoutRecipe', JSON.stringify(analysis.confirmed_recipe))
      localStorage.setItem('checkoutRecipePerfumeName', analysis.perfume_name || '')
    }

    router.push('/checkout')
  }

  // 케미 향수 장바구니 담기
  const handleAddChemistryToCart = async (chem: ChemistryAnalysis) => {
    setIsAddingToCart(true)
    try {
      const cartItems = [{
        analysis_id: chem.characterA.id,
        product_type: 'chemistry_set' as ProductType,
        perfume_name: `${chem.characterA.perfume_name} x ${chem.characterB.perfume_name}`,
        perfume_brand: chem.characterA.perfume_brand || "AC'SCENT",
        twitter_name: `${chem.characterA.idol_name || chem.characterA.twitter_name} x ${chem.characterB.idol_name || chem.characterB.twitter_name}`,
        size: getDefaultSize('chemistry_set'),
        price: getDefaultPrice('chemistry_set'),
        quantity: 1,
        image_url: chem.characterA.user_image_url || undefined,
        analysis_data: chem.chemistryData || undefined,
      }]

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems }),
      })

      const data = await response.json()

      if (response.ok) {
        setCartResultModal({
          type: 'success',
          added: data.added,
          duplicates: data.duplicates || 0,
        })
      } else {
        setCartResultModal({
          type: 'error',
          message: data.error || t('addToCartFailed'),
        })
      }
    } catch (error) {
      console.error('Add chemistry to cart error:', error)
      setCartResultModal({
        type: 'error',
        message: t('addToCartError'),
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  // 케미 결과 페이지로 이동 (sessionStorage에 데이터 세팅 후 이동)
  const handleViewChemistryResult = (chem: ChemistryAnalysis) => {
    // ChemistryResultPage가 sessionStorage에서 읽으므로 데이터 세팅
    const chemistryResult = {
      characterA: chem.characterA.analysis_data,
      characterB: chem.characterB.analysis_data,
      chemistry: chem.chemistryData,
    }
    const chemistryForm = {
      character1Name: chem.characterA.twitter_name || chem.characterA.idol_name || 'A',
      character2Name: chem.characterB.twitter_name || chem.characterB.idol_name || 'B',
      image1Preview: chem.characterA.user_image_url || null,
      image2Preview: chem.characterB.user_image_url || null,
    }
    sessionStorage.setItem('chemistry_result', JSON.stringify(chemistryResult))
    sessionStorage.setItem('chemistry_form', JSON.stringify(chemistryForm))
    router.push('/result?type=chemistry&from=mypage')
  }

  // 케미 향수 구매 (체크아웃 직행)
  const handleChemistryPurchase = (chem: ChemistryAnalysis, e?: React.MouseEvent) => {
    e?.stopPropagation()

    // 케미 상품이 비활성(판매중단)이면 차단
    if (isChemistryDiscontinued) {
      alert(tMypage('productDiscontinued'))
      return
    }

    localStorage.setItem('checkoutProductType', 'chemistry_set')
    localStorage.setItem('checkoutAnalysisId', chem.sessionId)
    router.push('/checkout')
  }

  // 상대 시간 포맷
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t('minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('daysAgo', { count: diffDays })

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    })
  }

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-3'}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl sm:rounded-2xl animate-pulse border-[1.5px] sm:border-2 border-black shadow-[2px_2px_0_0_black] sm:shadow-[4px_4px_0_0_black] overflow-hidden"
          >
            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200" />
            <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
              <div className="h-3 sm:h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-2.5 sm:h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 빈 상태
  if (analyses.length === 0 && chemistryAnalyses.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl p-12 text-center shadow-[4px_4px_0_0_black]">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_black]">
          <Sparkles size={40} className="text-purple-500" />
        </div>
        <h3 className="text-xl font-black mb-2">{t('emptyTitle')}</h3>
        <p className="text-slate-500 text-sm mb-6">
          {t('emptyDesc')}
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-purple-500 text-white font-bold rounded-xl border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          {t('startAnalysis')}
        </Link>
      </div>
    )
  }

  // 그리드 뷰
  if (viewMode === 'grid') {
    return (
      <>
        {/* 선택 모드 툴바 */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            {isSelectionMode ? (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border-2 border-black bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  {selectedIds.size === analyses.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {t('deselectAll')}
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {t('selectAll')}
                    </>
                  )}
                </button>
                <span className="text-xs sm:text-sm text-slate-500">
                  {t('selectedCount', { count: selectedIds.size })}
                </span>
              </>
            ) : (
              <button
                onClick={() => setIsSelectionMode(true)}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border-2 border-black bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('addToCart')}
              </button>
            )}
          </div>
          {isSelectionMode && (
            <button
              onClick={exitSelectionMode}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {tButtons('cancel')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 일반 분석 + 케미 분석을 날짜순으로 통합 렌더링 */}
          {(() => {
            type MergedItem =
              | { type: 'analysis'; data: Analysis; date: number }
              | { type: 'chemistry'; data: ChemistryAnalysis; date: number }

            const merged: MergedItem[] = [
              ...analyses.map(a => ({ type: 'analysis' as const, data: a, date: new Date(a.created_at).getTime() })),
              ...chemistryAnalyses.map(c => ({ type: 'chemistry' as const, data: c, date: new Date(c.created_at).getTime() })),
            ].sort((a, b) => b.date - a.date)

            return merged.map((item, index) => {
              if (item.type === 'chemistry') {
                const chem = item.data
                return (
                  <motion.div
                    key={`chem-${chem.sessionId}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
                    className="col-span-2"
                  >
                    <div
                      className="bg-white border-[1.5px] sm:border-2 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-[2px_2px_0_0_black] sm:shadow-[4px_4px_0_0_black] hover:shadow-[3px_3px_0_0_black] sm:hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group"
                    >
                      {/* 이미지 영역 - 두 캐릭터 나란히 */}
                      <div
                        className="relative h-36 sm:h-44 overflow-hidden bg-gradient-to-br from-violet-100 via-pink-50 to-amber-50 cursor-pointer"
                        onClick={() => setChemistryDetailTarget(chem)}
                      >
                        <div className="flex w-full h-full">
                          <div className="w-1/2 h-full overflow-hidden relative">
                            {chem.characterA.user_image_url ? (
                              <img src={chem.characterA.user_image_url} alt={chem.characterA.idol_name || chem.characterA.twitter_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-pink-100"><span className="text-2xl sm:text-3xl">✨</span></div>
                            )}
                          </div>
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-white border-[1.5px] sm:border-2 border-black rounded-full flex items-center justify-center shadow-[1px_1px_0_0_black] sm:shadow-[2px_2px_0_0_black]">
                              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 fill-rose-500" />
                            </div>
                          </div>
                          <div className="w-1/2 h-full overflow-hidden relative">
                            {chem.characterB.user_image_url ? (
                              <img src={chem.characterB.user_image_url} alt={chem.characterB.idol_name || chem.characterB.twitter_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-amber-100"><span className="text-2xl sm:text-3xl">✨</span></div>
                            )}
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex gap-1 items-center">
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold rounded-md sm:rounded-lg bg-violet-100 text-violet-700 border-[1.5px] sm:border-2 border-violet-300 shadow-[1px_1px_0_0_rgba(0,0,0,0.2)]">
                            {PRODUCT_TYPE_BADGES.chemistry_set.labelShort}
                          </span>
                          {chem.service_mode === 'offline' && (
                            <span className="px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded-md sm:rounded-lg bg-slate-700 text-white border border-slate-800">
                              {t('offline')}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-white border-[1.5px] sm:border-2 border-black text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1 shadow-[1px_1px_0_0_black] sm:shadow-[2px_2px_0_0_black]">
                            <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            {formatRelativeTime(chem.created_at)}
                          </div>
                        </div>
                      </div>
                      {/* 정보 영역 */}
                      <div className="p-2.5 sm:p-3 border-t-[1.5px] sm:border-t-2 border-black">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-[11px] sm:text-sm truncate leading-tight">
                              {chem.characterA.idol_name || chem.characterA.twitter_name} x {chem.characterB.idol_name || chem.characterB.twitter_name}
                            </h3>
                            <p className="text-[9px] sm:text-[11px] text-slate-500 truncate mt-0.5">
                              {chem.characterA.perfume_name} x {chem.characterB.perfume_name}
                            </p>
                            {chem.chemistryTitle && (
                              <p className="text-[8px] sm:text-[10px] text-violet-600 font-bold truncate mt-0.5">{chem.chemistryTitle}</p>
                            )}
                          </div>
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setChemistryDeleteTarget(chem) }}
                            className="p-1 sm:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md sm:rounded-lg transition-colors flex-shrink-0" title={t('delete')}>
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setChemistryDetailTarget(chem) }}
                            disabled={isChemistryDiscontinued}
                            title={isChemistryDiscontinued ? tMypage('productDiscontinued') : undefined}
                            className={`w-full py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                              isChemistryDiscontinued
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-slate-800'
                            }`}
                          >
                            <ShoppingBag className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isChemistryDiscontinued ? 'text-slate-400' : 'text-yellow-400'}`} />
                            {isChemistryDiscontinued ? tMypage('discontinuedShort') : t('purchase')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              }

              const analysis = item.data
              return (
          <motion.div
              key={analysis.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
            >
              {/* 키치 스타일 카드 - 모바일에서 더 컴팩트 */}
              <div
                className={`bg-white border-[1.5px] sm:border-2 rounded-xl sm:rounded-2xl overflow-hidden shadow-[2px_2px_0_0_black] sm:shadow-[4px_4px_0_0_black] hover:shadow-[3px_3px_0_0_black] sm:hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group ${
                  isSelectionMode && selectedIds.has(analysis.id)
                    ? 'border-purple-500 ring-2 ring-purple-300'
                    : 'border-black'
                }`}
                onClick={isSelectionMode ? (e) => toggleSelection(analysis.id, e) : undefined}
              >
                {/* 이미지 영역 */}
                <div
                  className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 cursor-pointer"
                  onClick={isSelectionMode ? undefined : () => setSelectedImage(analysis)}
                >
                  {/* 선택 모드 체크박스 */}
                  {isSelectionMode && (
                    <div
                      className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedIds.has(analysis.id)
                          ? 'bg-purple-500 border-purple-500'
                          : 'bg-white/90 border-black'
                      }`}
                    >
                      {selectedIds.has(analysis.id) && (
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
                      )}
                    </div>
                  )}
                  {analysis.user_image_url ? (
                    <img
                      src={analysis.user_image_url}
                      alt={analysis.twitter_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">✨</div>
                        <span className="text-purple-400 text-[10px] sm:text-xs font-bold">No Image</span>
                      </div>
                    </div>
                  )}

                  {/* 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* 날짜 뱃지 - 선택 모드가 아닐 때만 표시 */}
                  {!isSelectionMode && (
                    <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-white border-[1.5px] sm:border-2 border-black text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1 shadow-[1px_1px_0_0_black] sm:shadow-[2px_2px_0_0_black]">
                      <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                      {formatRelativeTime(analysis.created_at)}
                    </div>
                  )}

                  {/* 상품 타입 뱃지 + 오프라인 뱃지 */}
                  <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 flex gap-1">
                    {renderProductTypeBadge(analysis.product_type)}
                    {analysis.service_mode === 'offline' && (
                      <span className="px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded bg-slate-700 text-white border border-slate-800">
                        {t('offline')}
                      </span>
                    )}
                  </div>

                  {/* 보기 버튼 (호버 시) - 선택 모드가 아닐 때만 */}
                  {!isSelectionMode && (
                    <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 right-1.5 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedImage(analysis)}
                        className="w-full py-1.5 sm:py-2 bg-white border-[1.5px] sm:border-2 border-black rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 shadow-[1px_1px_0_0_black] sm:shadow-[2px_2px_0_0_black] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                      >
                        <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {t('viewDetail')}
                      </button>
                    </div>
                  )}
                </div>

                {/* 정보 영역 */}
                <div className="p-2 sm:p-3 border-t-[1.5px] sm:border-t-2 border-black">
                  <div className="flex items-start justify-between gap-1 sm:gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-[11px] sm:text-sm truncate leading-tight">
                        {analysis.idol_name || analysis.twitter_name}
                      </h3>
                      <p className="text-[9px] sm:text-[11px] text-slate-500 truncate mt-0.5">
                        {analysis.perfume_name}
                      </p>
                    </div>
                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleteTarget(analysis)
                      }}
                      className="p-1 sm:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md sm:rounded-lg transition-colors flex-shrink-0"
                      title={t('delete')}
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>

                  {/* 버튼 영역 */}
                  <div className="flex flex-col gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                    {(() => {
                      const discontinued = isAnalysisDiscontinued(analysis.product_type)
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (discontinued) {
                              alert(tMypage('productDiscontinued'))
                              return
                            }
                            setRecipeModalTarget(analysis)
                          }}
                          disabled={discontinued}
                          title={discontinued ? tMypage('productDiscontinued') : undefined}
                          className={`w-full py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                            discontinued
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-black text-white hover:bg-slate-800'
                          }`}
                        >
                          <ShoppingBag className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${discontinued ? 'text-slate-400' : 'text-yellow-400'}`} />
                          {discontinued ? tMypage('discontinuedShort') : t('purchase')}
                        </button>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
              )
            })
          })()}
        </div>

        {/* 선택 모드 플로팅 바 */}
        <AnimatePresence>
          {isSelectionMode && selectedIds.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-40"
            >
              <div className="bg-black text-white rounded-2xl border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] p-4 flex items-center justify-between gap-4 max-w-md mx-auto sm:mx-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center font-black text-lg">
                    {selectedIds.size}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t('itemsSelected')}</p>
                    <p className="text-xs text-white/70">{t('addToCartAction')}</p>
                  </div>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="px-5 py-2.5 bg-amber-400 text-black font-bold rounded-xl border-2 border-black hover:bg-amber-300 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingToCart ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  {t('addToCart')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 모달들 */}
        {renderModals()}
      </>
    )
  }

  // 리스트 뷰
  return (
    <>
      {/* 선택 모드 툴바 */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border-2 border-black bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                {selectedIds.size === analyses.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t('deselectAll')}
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t('selectAll')}
                  </>
                )}
              </button>
              <span className="text-xs sm:text-sm text-slate-500">
                {t('selectedCount', { count: selectedIds.size })}
              </span>
            </>
          ) : (
            <button
              onClick={() => setIsSelectionMode(true)}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border-2 border-black bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('addToCart')}
            </button>
          )}
        </div>
        {isSelectionMode && (
          <button
            onClick={exitSelectionMode}
            className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {t('cancel')}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {analyses.map((analysis, index) => (
          <motion.div
            key={analysis.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div
              className={`bg-white border-2 rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all ${
                isSelectionMode && selectedIds.has(analysis.id)
                  ? 'border-purple-500 ring-2 ring-purple-300'
                  : 'border-black'
              }`}
              onClick={isSelectionMode ? (e) => toggleSelection(analysis.id, e) : undefined}
            >
              <div className="flex items-center gap-4 p-4">
                {/* 선택 모드 체크박스 */}
                {isSelectionMode && (
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedIds.has(analysis.id)
                        ? 'bg-purple-500 border-purple-500'
                        : 'bg-white border-black'
                    }`}
                  >
                    {selectedIds.has(analysis.id) && (
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    )}
                  </div>
                )}

                {/* 이미지 */}
                <div
                  className="w-20 h-20 rounded-xl overflow-hidden border-2 border-black flex-shrink-0 cursor-pointer"
                  onClick={isSelectionMode ? undefined : () => setSelectedImage(analysis)}
                >
                  {analysis.user_image_url ? (
                    <img
                      src={analysis.user_image_url}
                      alt={analysis.twitter_name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <Sparkles size={24} className="text-purple-400" />
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-lg truncate">{analysis.idol_name || analysis.twitter_name}</h3>
                    {renderProductTypeBadge(analysis.product_type)}
                    {analysis.service_mode === 'offline' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-white border border-slate-800">
                        {t('offline')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 truncate">{analysis.perfume_name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatRelativeTime(analysis.created_at)}
                    </span>
                    {analysis.confirmed_recipe?.granules && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-bold">
                        {t('recipeCount', { count: analysis.confirmed_recipe.granules.length })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 - 선택 모드가 아닐 때만 */}
                {!isSelectionMode && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleteTarget(analysis)
                      }}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={18} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setRecipeModalTarget(analysis)
                      }}
                      className="px-4 py-2.5 bg-amber-400 text-black text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-1.5 border-2 border-black"
                    >
                      <Beaker size={16} />
                      {t('recipeLabel')}
                    </button>

                    <Link
                      href={`/result?id=${analysis.id}&from=mypage`}
                      className="px-4 py-2.5 bg-purple-500 text-white text-sm font-bold rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-1.5"
                    >
                      {t('viewMore')}
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 선택 모드 플로팅 바 */}
      <AnimatePresence>
        {isSelectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-40"
          >
            <div className="bg-black text-white rounded-2xl border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] p-4 flex items-center justify-between gap-4 max-w-md mx-auto sm:mx-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center font-black text-lg">
                  {selectedIds.size}
                </div>
                <div>
                  <p className="font-bold text-sm">{t('itemsSelected')}</p>
                  <p className="text-xs text-white/70">{t('addToCartAction')}</p>
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="px-5 py-2.5 bg-amber-400 text-black font-bold rounded-xl border-2 border-black hover:bg-amber-300 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingToCart ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {tButtons('addToCart')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모달들 */}
      {renderModals()}
    </>
  )

  // 모달 렌더링 함수
  function renderModals() {
    return (
      <>
        {/* 이미지 상세보기 모달 */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-md w-full max-h-[85vh] flex flex-col"
              >
                {/* 닫기 버튼 */}
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors z-10"
                >
                  <X size={24} />
                </button>

                {/* 카드 - 스크롤 가능 */}
                <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0_0_black] overflow-y-auto">
                  {/* 이미지 - 모바일에서 크기 제한 */}
                  <div className="relative aspect-[4/3] sm:aspect-square max-h-[40vh] sm:max-h-[50vh]">
                    {selectedImage.user_image_url ? (
                      <img
                        src={selectedImage.user_image_url}
                        alt={selectedImage.twitter_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <span className="text-6xl">✨</span>
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-5 border-t-2 border-black">
                    <h2 className="font-black text-xl">{selectedImage.idol_name || selectedImage.twitter_name}</h2>
                    <p className="text-slate-600 text-sm mt-1">{selectedImage.perfume_name}</p>

                    {/* 확정 레시피 */}
                    {selectedImage.confirmed_recipe?.granules && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-xl border-2 border-yellow-300">
                        <p className="text-xs font-black text-yellow-700 mb-2">{t('confirmedRecipe')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedImage.confirmed_recipe.granules.map((g, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-yellow-800 border border-yellow-300"
                            >
                              {g.name} {g.ratio}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Link
                        href={`/result?id=${selectedImage.id}&from=mypage`}
                        className="flex-1 py-3 bg-white border-2 border-black text-black rounded-xl font-bold text-center hover:bg-slate-50 transition-colors"
                      >
                        {t('viewResult')}
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImage(null)
                          setRecipeModalTarget(selectedImage)
                        }}
                        className="flex-[1.5] py-3 bg-amber-400 text-black border-2 border-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-300 transition-all"
                      >
                        <Beaker size={18} />
                        {t('checkRecipe')}
                      </button>
                    </div>

                    <p className="text-center text-slate-400 text-xs mt-4">
                      {t('analyzedAt', { time: formatRelativeTime(selectedImage.created_at) })}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 삭제 확인 모달 */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border-2 border-black rounded-2xl p-6 max-w-xs w-full shadow-[8px_8px_0_0_black]"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center border-2 border-black">
                    <Trash2 size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-black mb-2">{t('deleteConfirm')}</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {t('deleteDesc', { name: deleteTarget.idol_name || deleteTarget.twitter_name })}<br />
                    {t('deleteIrreversible')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors border-2 border-black"
                    >
                      {tButtons('cancel')}
                    </button>
                    <button
                      onClick={() => {
                        onDelete(deleteTarget.id)
                        setDeleteTarget(null)
                      }}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors border-2 border-black"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 케미 삭제 확인 모달 */}
        <AnimatePresence>
          {chemistryDeleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChemistryDeleteTarget(null)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border-2 border-black rounded-2xl p-6 max-w-xs w-full shadow-[8px_8px_0_0_black]"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center border-2 border-black">
                    <Trash2 size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-black mb-2">{t('deleteConfirm')}</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {t('deleteDesc', { name: `${chemistryDeleteTarget.characterA.idol_name || chemistryDeleteTarget.characterA.twitter_name} x ${chemistryDeleteTarget.characterB.idol_name || chemistryDeleteTarget.characterB.twitter_name}` })}<br />
                    {t('deleteIrreversible')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setChemistryDeleteTarget(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors border-2 border-black"
                    >
                      {tButtons('cancel')}
                    </button>
                    <button
                      onClick={() => {
                        if (onDeleteChemistry) {
                          onDeleteChemistry(chemistryDeleteTarget.sessionId)
                        }
                        setChemistryDeleteTarget(null)
                      }}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors border-2 border-black"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 레시피 확인 모달 */}
        <AnimatePresence>
          {recipeModalTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecipeModalTarget(null)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-28 pb-24 sm:pb-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border-2 border-black rounded-2xl max-w-md w-full max-h-full flex flex-col shadow-[8px_8px_0_0_black] overflow-hidden"
              >
                {/* 모달 헤더 */}
                <div className="px-5 py-4 border-b-2 border-black bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-between flex-shrink-0">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Beaker size={20} />
                    {recipeModalTarget.confirmed_recipe ? t('confirmedRecipeTitle') : t('perfumeAnalysisInfo')}
                  </h3>
                  <button
                    onClick={() => setRecipeModalTarget(null)}
                    className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 모달 콘텐츠 */}
                <div className="p-5 overflow-y-auto flex-1 min-h-0">
                  {/* 대상 정보 */}
                  {(() => {
                    const modalPersona = recipeModalTarget.analysis_data?.matchingPerfumes?.[0]?.persona
                    return (
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
                        {recipeModalTarget.user_image_url ? (
                          <img
                            src={recipeModalTarget.user_image_url}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover border-2 border-black"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center border-2 border-black">
                            <Sparkles size={24} className="text-purple-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500">{recipeModalTarget.idol_name || recipeModalTarget.twitter_name}</p>
                          <h2 className="text-xl font-black leading-tight text-slate-900">{modalPersona?.name || recipeModalTarget.perfume_name}</h2>
                        </div>
                      </div>
                    )
                  })()}

                  {recipeModalTarget.confirmed_recipe?.granules ? (
                    /* 확정 레시피가 있는 경우: 시각화된 향료별 계량 표시 */
                    <div className="space-y-4">
                      {/* 섹션 헤더 */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg flex items-center justify-center border border-amber-500">
                          <Beaker size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-black text-slate-700">{t('customRecipe')}</span>
                      </div>

                      {/* 제품 타입 탭 */}
                      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                        {([
                          { key: '10ml' as const, label: t('perfumePerfumeLabel'), sub: t('perfumeSub10') },
                          { key: '50ml' as const, label: t('perfumeLabel50'), sub: t('perfumeSub50') },
                          { key: '5ml' as const, label: t('oilLabel'), sub: t('oilSub') },
                        ]).map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setRecipeProductTab(tab.key)}
                            className={`flex-1 py-2 px-1 rounded-lg text-center transition-all ${
                              recipeProductTab === tab.key
                                ? 'bg-white border-2 border-black shadow-[2px_2px_0_0_black] font-black'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <p className={`text-[11px] sm:text-xs ${recipeProductTab === tab.key ? 'text-black' : ''}`}>{tab.label}</p>
                            <p className={`text-[9px] sm:text-[10px] ${recipeProductTab === tab.key ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>{tab.sub}</p>
                          </button>
                        ))}
                      </div>

                      {/* 레시피 카드들 */}
                      {(() => {
                        const totalGrams = recipeProductTab === '10ml' ? 2 : recipeProductTab === '50ml' ? 10 : 5
                        return (
                          <div className="space-y-2.5">
                            {recipeModalTarget.confirmed_recipe!.granules.map((granule, idx) => {
                              const color = getPerfumeColor(granule.id)
                              const isLight = isLightColor(color)
                              const grams = totalGrams * (granule.ratio / 100)
                              const gramsDisplay = grams < 0.1 ? grams.toFixed(2) : grams.toFixed(1)

                              return (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="relative overflow-hidden rounded-xl border-2 border-black shadow-[3px_3px_0_0_black]"
                                >
                                  {/* 배경 바 */}
                                  <div
                                    className="absolute inset-0 opacity-20"
                                    style={{ backgroundColor: color }}
                                  />
                                  <div
                                    className="absolute left-0 top-0 bottom-0 opacity-30"
                                    style={{
                                      backgroundColor: color,
                                      width: `${granule.ratio}%`
                                    }}
                                  />

                                  {/* 콘텐츠 */}
                                  <div className="relative flex items-center gap-3 p-3">
                                    {/* 컬러 인디케이터 */}
                                    <div
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm border-2 ${isLight ? 'border-slate-300' : 'border-white/30'}`}
                                      style={{
                                        backgroundColor: color,
                                        color: isLight ? '#1e293b' : 'white'
                                      }}
                                    >
                                      {granule.ratio}%
                                    </div>

                                    {/* 향료 정보 */}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-black text-slate-900 truncate">{getLocalizedName(granule.id, granule.name)}</p>
                                      <p className="text-[10px] text-slate-500 font-medium">{granule.id}</p>
                                    </div>

                                    {/* 그램 수 표시 */}
                                    <div className="flex flex-col items-center flex-shrink-0 bg-white/80 rounded-lg px-2 py-1 border border-slate-200">
                                      <span className="text-sm font-black text-amber-600">{gramsDisplay}g</span>
                                      <Droplets size={12} className="text-slate-400" />
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* 총 비율 + 총 그램 표시 */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-600">{t('totalIngredient')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-500">
                            {recipeModalTarget.confirmed_recipe.granules.reduce((sum, g) => sum + g.ratio, 0)}%
                          </span>
                          <span className="text-lg font-black text-amber-600">
                            {recipeProductTab === '10ml' ? '2' : recipeProductTab === '50ml' ? '10' : '5'}g
                          </span>
                        </div>
                      </div>

                      {/* 안내 메시지 */}
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-xs text-amber-700 text-center">
                          {t('recipeAdjusted')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* 확정 레시피가 없는 경우: 향 노트 + 향 계열 그래프 */
                    <div className="space-y-5">
                      {(() => {
                        const perfume = recipeModalTarget.analysis_data?.matchingPerfumes?.[0]
                        const persona = perfume?.persona

                        return (
                          <>
                            {/* 향 노트 (탑/미들/베이스) */}
                            {persona && (persona.mainScent || persona.subScent1 || persona.subScent2) && (
                              <PerfumeNotes persona={persona} isDesktop={false} />
                            )}

                            {/* 향 계열 그래프 */}
                            {persona?.categories && (
                              <PerfumeProfile persona={persona} isDesktop={false} />
                            )}

                            {/* 분석 정보가 없는 경우 */}
                            {!persona?.mainScent && !persona?.categories && (
                              <div className="text-center py-8">
                                <p className="text-slate-400 text-sm">{t('noDetailedInfo')}</p>
                                <Link
                                  href={`/result?id=${recipeModalTarget.id}&from=mypage`}
                                  className="inline-block mt-3 px-4 py-2 bg-purple-500 text-white text-sm font-bold rounded-lg"
                                >
                                  {t('checkOnResultPage')}
                                </Link>
                              </div>
                            )}
                          </>
                        )
                      })()}

                      <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-xs text-slate-500">
                          {t('makeFeedbackRecipe')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 모달 푸터 */}
                <div className="px-5 py-4 border-t-2 border-black bg-slate-50 flex-shrink-0">
                  <div className="flex gap-2">
                    <Link
                      href={`/result?id=${recipeModalTarget.id}&from=mypage`}
                      className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-bold text-center hover:bg-slate-100 transition-colors"
                      onClick={() => setRecipeModalTarget(null)}
                    >
                      {t('viewResult')}
                    </Link>
                    {(() => {
                      const discontinued = isAnalysisDiscontinued(recipeModalTarget.product_type)
                      return (
                        <button
                          onClick={(e) => {
                            setRecipeModalTarget(null)
                            handlePurchase(recipeModalTarget, e)
                          }}
                          disabled={discontinued}
                          title={discontinued ? tMypage('productDiscontinued') : undefined}
                          className={`flex-[1.5] py-3 border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                            discontinued
                              ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                              : 'bg-black text-white border-black hover:bg-slate-800'
                          }`}
                        >
                          <ShoppingBag size={18} className={discontinued ? 'text-slate-400' : 'text-yellow-400'} />
                          {discontinued ? tMypage('discontinuedShort') : t('purchase')}
                        </button>
                      )
                    })()}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 케미 향수 상세 모달 */}
        <AnimatePresence>
          {chemistryDetailTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChemistryDetailTarget(null)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-20 pb-24 sm:pb-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border-2 border-black rounded-2xl max-w-md w-full max-h-full flex flex-col shadow-[8px_8px_0_0_black] overflow-hidden"
              >
                {/* 모달 헤더 */}
                <div className="px-5 py-4 border-b-2 border-black bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-between flex-shrink-0">
                  <h3 className="font-black text-lg text-white flex items-center gap-2">
                    <Heart size={20} className="fill-white" />
                    케미 향수 상세
                  </h3>
                  <button
                    onClick={() => setChemistryDetailTarget(null)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 모달 콘텐츠 */}
                <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-5">
                  {/* 듀얼 이미지 */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-violet-400 shadow-[2px_2px_0_0_rgba(139,92,246,0.5)] flex-shrink-0">
                      {chemistryDetailTarget.characterA.user_image_url ? (
                        <img
                          src={chemistryDetailTarget.characterA.user_image_url}
                          alt={chemistryDetailTarget.characterA.idol_name || chemistryDetailTarget.characterA.twitter_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                          <span className="text-2xl">✨</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_black]">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      </div>
                    </div>

                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-pink-400 shadow-[2px_2px_0_0_rgba(236,72,153,0.5)] flex-shrink-0">
                      {chemistryDetailTarget.characterB.user_image_url ? (
                        <img
                          src={chemistryDetailTarget.characterB.user_image_url}
                          alt={chemistryDetailTarget.characterB.idol_name || chemistryDetailTarget.characterB.twitter_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center">
                          <span className="text-2xl">✨</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 캐릭터 이름 */}
                  <div className="text-center">
                    <h2 className="text-lg font-black text-slate-900 leading-tight">
                      {chemistryDetailTarget.characterA.idol_name || chemistryDetailTarget.characterA.twitter_name}
                      <span className="text-rose-400 mx-1.5">x</span>
                      {chemistryDetailTarget.characterB.idol_name || chemistryDetailTarget.characterB.twitter_name}
                    </h2>
                    {chemistryDetailTarget.chemistryTitle && (
                      <p className="text-sm text-violet-600 font-bold mt-1">
                        &quot;{chemistryDetailTarget.chemistryTitle}&quot;
                      </p>
                    )}
                    {chemistryDetailTarget.chemistryType && (
                      <span className="inline-block mt-2 px-3 py-1 text-[10px] font-black rounded-full bg-violet-100 text-violet-700 border border-violet-300">
                        {chemistryDetailTarget.chemistryType === 'milddang' && '밀당 케미'}
                        {chemistryDetailTarget.chemistryType === 'slowburn' && '슬로우번 케미'}
                        {chemistryDetailTarget.chemistryType === 'dalddal' && '달달 케미'}
                        {chemistryDetailTarget.chemistryType === 'storm' && '폭풍 케미'}
                        {!['milddang', 'slowburn', 'dalddal', 'storm'].includes(chemistryDetailTarget.chemistryType || '') && chemistryDetailTarget.chemistryType}
                      </span>
                    )}
                  </div>

                  {/* 향수 A 정보 */}
                  {(() => {
                    const personaA = chemistryDetailTarget.characterA.analysis_data?.matchingPerfumes?.[0]?.persona
                    return (
                      <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                            <span className="text-white text-[10px] font-black">A</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-violet-500 font-bold">
                              {chemistryDetailTarget.characterA.idol_name || chemistryDetailTarget.characterA.twitter_name}
                            </p>
                            <p className="text-sm font-black text-slate-900 truncate">
                              {personaA?.name || chemistryDetailTarget.characterA.perfume_name}
                            </p>
                          </div>
                        </div>
                        {personaA && (personaA.mainScent || personaA.subScent1 || personaA.subScent2) && (
                          <div className="space-y-1.5">
                            {personaA.mainScent && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-violet-400 w-8 flex-shrink-0">TOP</span>
                                <span className="text-xs text-slate-600">{typeof personaA.mainScent === 'string' ? personaA.mainScent : personaA.mainScent.name}</span>
                              </div>
                            )}
                            {personaA.subScent1 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-violet-400 w-8 flex-shrink-0">MID</span>
                                <span className="text-xs text-slate-600">{typeof personaA.subScent1 === 'string' ? personaA.subScent1 : personaA.subScent1.name}</span>
                              </div>
                            )}
                            {personaA.subScent2 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-violet-400 w-8 flex-shrink-0">BASE</span>
                                <span className="text-xs text-slate-600">{typeof personaA.subScent2 === 'string' ? personaA.subScent2 : personaA.subScent2.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* 향수 B 정보 */}
                  {(() => {
                    const personaB = chemistryDetailTarget.characterB.analysis_data?.matchingPerfumes?.[0]?.persona
                    return (
                      <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                            <span className="text-white text-[10px] font-black">B</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-pink-500 font-bold">
                              {chemistryDetailTarget.characterB.idol_name || chemistryDetailTarget.characterB.twitter_name}
                            </p>
                            <p className="text-sm font-black text-slate-900 truncate">
                              {personaB?.name || chemistryDetailTarget.characterB.perfume_name}
                            </p>
                          </div>
                        </div>
                        {personaB && (personaB.mainScent || personaB.subScent1 || personaB.subScent2) && (
                          <div className="space-y-1.5">
                            {personaB.mainScent && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-pink-400 w-8 flex-shrink-0">TOP</span>
                                <span className="text-xs text-slate-600">{typeof personaB.mainScent === 'string' ? personaB.mainScent : personaB.mainScent.name}</span>
                              </div>
                            )}
                            {personaB.subScent1 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-pink-400 w-8 flex-shrink-0">MID</span>
                                <span className="text-xs text-slate-600">{typeof personaB.subScent1 === 'string' ? personaB.subScent1 : personaB.subScent1.name}</span>
                              </div>
                            )}
                            {personaB.subScent2 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-pink-400 w-8 flex-shrink-0">BASE</span>
                                <span className="text-xs text-slate-600">{typeof personaB.subScent2 === 'string' ? personaB.subScent2 : personaB.subScent2.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* 분석 일시 */}
                  <p className="text-center text-slate-400 text-xs">
                    {t('analyzedAt', { time: formatRelativeTime(chemistryDetailTarget.created_at) })}
                  </p>
                </div>

                {/* 모달 푸터 */}
                <div className="px-5 py-4 border-t-2 border-black bg-slate-50 flex-shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setChemistryDetailTarget(null)
                        handleViewChemistryResult(chemistryDetailTarget)
                      }}
                      className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-bold text-center hover:bg-slate-100 transition-colors"
                    >
                      {t('viewResult')}
                    </button>
                    <button
                      onClick={(e) => {
                        setChemistryDetailTarget(null)
                        handleChemistryPurchase(chemistryDetailTarget, e)
                      }}
                      disabled={isChemistryDiscontinued}
                      title={isChemistryDiscontinued ? tMypage('productDiscontinued') : undefined}
                      className={`flex-[1.5] py-3 border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                        isChemistryDiscontinued
                          ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                          : 'bg-black text-white border-black hover:bg-slate-800'
                      }`}
                    >
                      <ShoppingBag size={18} className={isChemistryDiscontinued ? 'text-slate-400' : 'text-yellow-400'} />
                      {isChemistryDiscontinued ? tMypage('discontinuedShort') : t('purchase')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 장바구니 결과 모달 */}
        <AnimatePresence>
          {cartResultModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartResultModal(null)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border-2 border-black rounded-2xl p-6 max-w-xs w-full shadow-[8px_8px_0_0_black]"
              >
                <div className="text-center">
                  {cartResultModal.type === 'success' ? (
                    <>
                      {/* 성공 아이콘 */}
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-yellow-400 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0_0_black]">
                        <ShoppingCart size={36} className="text-black" />
                      </div>
                      <h3 className="text-xl font-black mb-2">{t('addedToCart')}</h3>
                      <p className="text-3xl font-black text-purple-600 mb-1">
                        {cartResultModal.added}{t('itemsUnit')}
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        {cartResultModal.duplicates && cartResultModal.duplicates > 0
                          ? t('alreadyInCart', { count: cartResultModal.duplicates })
                          : t('addedToCartDesc')}
                      </p>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => setCartResultModal(null)}
                          className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors border-2 border-black"
                        >
                          {t('continueShopping')}
                        </button>
                        <button
                          onClick={() => {
                            setCartResultModal(null)
                            router.push('/mypage?tab=cart')
                          }}
                          className="flex-1 py-3 bg-amber-400 text-black rounded-xl font-bold hover:bg-amber-300 transition-colors border-2 border-black flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart size={16} />
                          {t('goToCart')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 에러 아이콘 */}
                      <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0_0_black]">
                        <X size={36} className="text-red-500" />
                      </div>
                      <h3 className="text-xl font-black mb-2">{t('errorOccurred')}</h3>
                      <p className="text-sm text-slate-500 mb-6">
                        {cartResultModal.message}
                      </p>
                      <button
                        onClick={() => setCartResultModal(null)}
                        className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors border-2 border-black"
                      >
                        {t('close')}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }
}
