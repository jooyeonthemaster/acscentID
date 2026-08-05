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
import { emitCartChanged } from '@/lib/cart-events'
import { getScentElementEntry } from '@/lib/saju'
import { SAJU_ELEMENT_INFO, type SajuElement } from '@/types/analysis'
import { CloudRidge } from '@/components/saju'

const SAJU_ANALYSIS_PLACEHOLDER_IMAGE = '/images/saju/analysis-placeholder.png'

// 사주 분석 대표 이미지 — 추천 향의 주(主) 오행 한자 타일 (사주 먹·금 톤)
function SajuElementTile({ element, size = 'md' }: { element: SajuElement; size?: 'sm' | 'md' }) {
  const info = SAJU_ELEMENT_INFO[element]
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--canvas)] transition-transform duration-500 group-hover:scale-105">
      {/* 오행색 방사광 */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${info.color}33, transparent 70%)` }}
      />
      {/* 운문 능선 (상품 아트 모티프) */}
      {size !== 'sm' && (
        <CloudRidge
          tone="raised"
          strokeOpacity={0.22}
          className="absolute inset-x-0 bottom-0"
          style={{ height: '30%' }}
        />
      )}
      <span
        className={`relative font-serif-kr font-black leading-none ${
          size === 'sm' ? 'text-3xl' : 'text-[clamp(44px,18vw,96px)]'
        }`}
        style={{ color: info.onDark, textShadow: `0 0 26px ${info.color}59` }}
      >
        {info.hanja}
      </span>
    </div>
  )
}

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
  /** 방울 수 — 사주 프로그램 레시피에만 존재 (총 10방울 기준) */
  drops?: number
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
    perfumeId?: string
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
  locale?: string | null
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
  const getAnalysisPerfumeId = (analysis: Analysis | null | undefined) => {
    const topMatch = analysis?.analysis_data?.matchingPerfumes?.[0]
    return topMatch?.perfumeId || topMatch?.persona?.id || ''
  }
  const getAnalysisPerfumeName = (analysis: Analysis | null | undefined) => {
    if (!analysis) return ''
    const topMatch = analysis.analysis_data?.matchingPerfumes?.[0]
    const perfumeId = getAnalysisPerfumeId(analysis)
    return perfumeId
      ? getLocalizedName(perfumeId, topMatch?.persona?.name || analysis.perfume_name)
      : topMatch?.persona?.name || analysis.perfume_name
  }
  const getChemistryPerfumePairName = (chem: ChemistryAnalysis) =>
    `${getAnalysisPerfumeName(chem.characterA)} x ${getAnalysisPerfumeName(chem.characterB)}`
  const getDisplayImageUrl = (analysis: Analysis | null | undefined) => {
    if (!analysis) return ''
    if (analysis.user_image_url) return analysis.user_image_url
    return analysis.product_type === 'saju_perfume' ? SAJU_ANALYSIS_PLACEHOLDER_IMAGE : ''
  }
  // 사주 분석 — 추천 향의 주 오행 (있으면 placeholder 이미지 대신 오행 한자 타일 렌더)
  const getSajuElement = (analysis: Analysis | null | undefined): SajuElement | null => {
    if (!analysis || analysis.product_type !== 'saju_perfume' || analysis.user_image_url) return null
    const perfumeId = getAnalysisPerfumeId(analysis)
    return perfumeId ? getScentElementEntry(perfumeId)?.primaryElement ?? null : null
  }
  const [selectedImage, setSelectedImage] = useState<Analysis | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Analysis | null>(null)
  const [recipeModalTarget, setRecipeModalTarget] = useState<Analysis | null>(null)
  const [recipeProductTab, setRecipeProductTab] = useState<'10ml' | '50ml' | '5ml'>('10ml')
  // 사주 프로그램 레시피 — 디퓨저는 g 대신 방울(총 10방울) 기준, 명칭도 '디퓨저 클리커'
  const isSajuRecipeModal = recipeModalTarget?.product_type === 'saju_perfume'

  // 다중 선택 관련 상태 (체크박스는 상시 노출 — 별도 선택 모드 없음)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
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

  // 케미(레이어링) 분석도 선택 대상 — 선택 ID는 'chem:' 접두어로 일반 분석과 구분
  const chemSelectionId = (chem: ChemistryAnalysis) => `chem:${chem.sessionId}`
  const selectableChemistry = isChemistryDiscontinued ? [] : chemistryAnalyses
  const totalSelectable = analyses.length + selectableChemistry.length
  const allSelected = totalSelectable > 0 && selectedIds.size === totalSelectable

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set([
        ...analyses.map(a => a.id),
        ...selectableChemistry.map(chemSelectionId),
      ]))
    }
  }

  // 선택 해제
  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // 장바구니 담기
  const handleAddToCart = async () => {
    if (selectedIds.size === 0) return

    setIsAddingToCart(true)
    try {
      const selectedAnalyses = analyses.filter(a => selectedIds.has(a.id))
      const selectedChemistry = chemistryAnalyses.filter(c => selectedIds.has(chemSelectionId(c)))
      const cartItems = [
        ...selectedAnalyses.map(a => ({
          analysis_id: a.id,
          product_type: a.product_type || 'image_analysis',
          perfume_name: getAnalysisPerfumeName(a),
          perfume_brand: a.perfume_brand || undefined,
          twitter_name: a.twitter_name || undefined,
          size: getDefaultSize(a.product_type || 'image_analysis'),
          price: getDefaultPrice(a.product_type || 'image_analysis'),
          quantity: 1,
          image_url: a.user_image_url || undefined,
          analysis_data: a.analysis_data || undefined,
        })),
        ...selectedChemistry.map(chem => ({
          layering_session_id: chem.sessionId,
          product_type: 'chemistry_set' as ProductType,
          perfume_name: getChemistryPerfumePairName(chem),
          perfume_brand: chem.characterA.perfume_brand || "AC'SCENT",
          twitter_name: `${chem.characterA.idol_name || chem.characterA.twitter_name} x ${chem.characterB.idol_name || chem.characterB.twitter_name}`,
          size: getDefaultSize('chemistry_set'),
          price: getDefaultPrice('chemistry_set'),
          quantity: 1,
          image_url: chem.characterA.user_image_url || undefined,
          analysis_data: chem.chemistryData || undefined,
        })),
      ]

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems }),
      })

      const data = await response.json()

      if (response.ok) {
        emitCartChanged()
        setCartResultModal({
          type: 'success',
          added: data.added,
          duplicates: data.duplicates || 0,
        })
        clearSelection()
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
    const badge = PRODUCT_TYPE_BADGES[type] || { bg: 'bg-[var(--soft)]', text: 'text-[var(--muted-ink)]', border: 'border-[var(--line)]', labelShort: type }
    return (
      <span className={`px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded-[6px] ${badge.bg} ${badge.text} border ${badge.border}`}>
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
      // 사주의 sajuChart.yongsin 등 전체 분석 데이터를 유지해
      // 클리커 각인·박스 스티커 오행이 체크아웃까지 전달되게 한다.
      ...analysis.analysis_data,
      matchingPerfumes: [{
        perfumeId: getAnalysisPerfumeId(analysis) || analysis.id,
        persona: {
          name: getAnalysisPerfumeName(analysis),
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
      localStorage.setItem('checkoutRecipePerfumeName', getAnalysisPerfumeName(analysis) || '')
    }

    router.push('/checkout')
  }

  // 레이어링 퍼퓸 장바구니 담기
  const handleAddChemistryToCart = async (chem: ChemistryAnalysis) => {
    setIsAddingToCart(true)
    try {
      const cartItems = [{
        layering_session_id: chem.sessionId,
        product_type: 'chemistry_set' as ProductType,
        perfume_name: getChemistryPerfumePairName(chem),
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
        emitCartChanged()
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
      serviceMode: chem.service_mode || 'online',
      existingSessionId: chem.sessionId,
      analysisAId: chem.characterA.id,
      analysisBId: chem.characterB.id,
      resultLocale: chem.locale || null,
    }
    sessionStorage.setItem('chemistry_result', JSON.stringify(chemistryResult))
    sessionStorage.setItem('chemistry_form', JSON.stringify(chemistryForm))
    router.push('/result?type=chemistry&from=mypage')
  }

  // 레이어링 퍼퓸 구매 (체크아웃 직행)
  const handleChemistryPurchase = (chem: ChemistryAnalysis, e?: React.MouseEvent) => {
    e?.stopPropagation()

    // 케미 상품이 비활성(판매중단)이면 차단
    if (isChemistryDiscontinued) {
      alert(tMypage('productDiscontinued'))
      return
    }

    localStorage.setItem('checkoutProductType', 'chemistry_set')
    localStorage.setItem('checkoutLayeringSessionId', chem.sessionId)
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
            className="bg-[#F5EFE2] rounded-[6px] sm:rounded-[6px] animate-pulse border-[1.5px] sm:border border-[var(--line)] overflow-hidden"
          >
            <div className="aspect-square bg-gradient-to-br from-[var(--soft)] to-[var(--soft)]" />
            <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
              <div className="h-3 sm:h-4 bg-[var(--soft)] rounded-[6px] w-2/3" />
              <div className="h-2.5 sm:h-3 bg-[var(--soft)]/60 rounded-[6px] w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 빈 상태
  if (analyses.length === 0 && chemistryAnalyses.length === 0) {
    return (
      <div className="bg-[#F5EFE2] border border-[var(--line)] rounded-[6px] p-12 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
          <Sparkles size={40} className="text-[var(--muted-ink)]" />
        </div>
        <h3 className="text-xl font-black mb-2 text-[var(--ink)]">{t('emptyTitle')}</h3>
        <p className="text-[#5C564A] text-sm lg:text-base mb-6">
          {t('emptyDesc')}
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-[var(--ink)] text-white font-bold rounded-[6px] transition-colors hover:bg-black"
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
        {/* 선택 툴바 — 전체 선택(좌) / 장바구니 담기(우). 선택 가능한 항목이 있을 때만 노출 */}
        {totalSelectable > 0 && (
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 text-xs lg:text-sm sm:text-sm font-bold rounded-[6px] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--soft)] transition-colors flex items-center gap-1.5 shrink-0"
            >
              {allSelected ? (
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
            {selectedIds.size > 0 && (
              <span className="text-xs lg:text-sm sm:text-sm text-[var(--muted-ink)] truncate">
                {t('selectedCount', { count: selectedIds.size })}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={selectedIds.size === 0 || isAddingToCart}
            className={`px-3 py-1.5 text-xs lg:text-sm sm:text-sm font-bold rounded-[6px] border-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              selectedIds.size === 0 || isAddingToCart
                ? 'border-[var(--line)] bg-[var(--soft)] text-[var(--muted-ink)] cursor-not-allowed'
                : 'border-[#F5EFE2] bg-[#F5EFE2] text-[var(--ink)] hover:bg-[#FFFDF5]'
            }`}
          >
            {isAddingToCart ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border border-[var(--line)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {t('addToCart')}
          </button>
        </div>
        )}

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
                      className={`bg-[#F5EFE2] border-[1.5px] sm:border-2 rounded-[6px] sm:rounded-[6px] overflow-hidden transition-all group ${
                        selectedIds.has(chemSelectionId(chem))
                          ? 'border-[var(--line)] ring-2 ring-[var(--line)]'
                          : 'border-[var(--line)]'
                      }`}
                    >
                      {/* 이미지 영역 - 두 캐릭터 나란히 */}
                      <div
                        className="relative h-36 sm:h-44 overflow-hidden bg-gradient-to-br from-[var(--soft)] via-[var(--canvas)] to-[var(--canvas)] cursor-pointer"
                        onClick={() => setChemistryDetailTarget(chem)}
                      >
                        <div className="flex w-full h-full">
                          <div className="w-1/2 h-full overflow-hidden relative">
                            {chem.characterA.user_image_url ? (
                              <img src={chem.characterA.user_image_url} alt={chem.characterA.idol_name || chem.characterA.twitter_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--soft)] to-[var(--soft)]"><span className="text-2xl sm:text-3xl">✨</span></div>
                            )}
                          </div>
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-[var(--paper)] border-[1.5px] sm:border border-[var(--line)] rounded-full flex items-center justify-center">
                              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--ink)] fill-[var(--ink)]" />
                            </div>
                          </div>
                          <div className="w-1/2 h-full overflow-hidden relative">
                            {chem.characterB.user_image_url ? (
                              <img src={chem.characterB.user_image_url} alt={chem.characterB.idol_name || chem.characterB.twitter_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--soft)] to-[var(--soft)]"><span className="text-2xl sm:text-3xl">✨</span></div>
                            )}
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {/* 선택 체크박스 — 상시 노출 (판매중단 시 숨김) */}
                        {!isChemistryDiscontinued && (
                          <button
                            type="button"
                            onClick={(e) => toggleSelection(chemSelectionId(chem), e)}
                            aria-pressed={selectedIds.has(chemSelectionId(chem))}
                            aria-label={t('addToCart')}
                            className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-[6px] border-2 flex items-center justify-center transition-all ${
                              selectedIds.has(chemSelectionId(chem))
                                ? 'bg-[var(--ink)] border-[#B8880F]'
                                : 'bg-[var(--paper)]/90 border-[var(--line)]'
                            }`}
                          >
                            {selectedIds.has(chemSelectionId(chem)) && (
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
                            )}
                          </button>
                        )}
                        <div className={`absolute top-1.5 sm:top-2 flex gap-1 items-center ${isChemistryDiscontinued ? 'left-1.5 sm:left-2' : 'left-8 sm:left-10'}`}>
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold rounded-[6px] sm:rounded-[6px] bg-[var(--soft)] text-[var(--muted-ink)] border-[1.5px] sm:border border-[var(--line)]">
                            {PRODUCT_TYPE_BADGES.chemistry_set.labelShort}
                          </span>
                          {chem.service_mode === 'offline' && (
                            <span className="px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded-[6px] sm:rounded-[6px] bg-[var(--soft)] text-[var(--ink)] border border-[var(--line)]">
                              {t('offline')}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-[6px] sm:rounded-[6px] bg-[var(--paper)] border-[1.5px] sm:border border-[var(--line)] text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1">
                            <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            {formatRelativeTime(chem.created_at)}
                          </div>
                        </div>
                      </div>
                      {/* 정보 영역 */}
                      <div className="p-2.5 sm:p-3 border-t-[1.5px] sm:border-t-2 border-[var(--line)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-[11px] lg:text-[13px] sm:text-sm truncate leading-tight text-[var(--ink)]">
                              {chem.characterA.idol_name || chem.characterA.twitter_name} x {chem.characterB.idol_name || chem.characterB.twitter_name}
                            </h3>
                            <p className="text-[9px] sm:text-[11px] text-[#5C564A] truncate mt-0.5">
                              {getChemistryPerfumePairName(chem)}
                            </p>
                            {chem.chemistryTitle && (
                              <p className="text-[8px] sm:text-[10px] text-[#5C564A] font-bold truncate mt-0.5">{chem.chemistryTitle}</p>
                            )}
                          </div>
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setChemistryDeleteTarget(chem) }}
                            className="p-1 sm:p-1.5 text-[#5C564A] hover:text-red-500 hover:bg-red-50 rounded-[6px] sm:rounded-[6px] transition-colors flex-shrink-0" title={t('delete')}>
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setChemistryDetailTarget(chem) }}
                            disabled={isChemistryDiscontinued}
                            title={isChemistryDiscontinued ? tMypage('productDiscontinued') : undefined}
                            className={`w-full py-1.5 sm:py-2 text-[10px] lg:text-[12px] sm:text-xs font-bold rounded-[6px] sm:rounded-[6px] flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                              isChemistryDiscontinued
                                ? 'bg-[var(--soft)] text-[var(--muted-ink)] cursor-not-allowed'
                                : 'bg-[var(--ink)] text-white hover:bg-black'
                            }`}
                          >
                            <ShoppingBag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {isChemistryDiscontinued ? tMypage('discontinuedShort') : t('purchase')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              }

              const analysis = item.data
              const displayImageUrl = getDisplayImageUrl(analysis)
              const sajuElement = getSajuElement(analysis)
              return (
          <motion.div
              key={analysis.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
            >
              {/* 키치 스타일 카드 - 모바일에서 더 컴팩트 */}
              <div
                className={`bg-[#F5EFE2] border-[1.5px] sm:border-2 rounded-[6px] sm:rounded-[6px] overflow-hidden transition-all group ${
                  selectedIds.has(analysis.id)
                    ? 'border-[var(--line)] ring-2 ring-[var(--line)]'
                    : 'border-[var(--line)]'
                }`}
              >
                {/* 이미지 영역 */}
                <div
                  className="relative aspect-square overflow-hidden bg-gradient-to-br from-[var(--soft)] via-[var(--canvas)] to-[var(--canvas)] cursor-pointer"
                  onClick={() => setSelectedImage(analysis)}
                >
                  {/* 선택 체크박스 — 상시 노출 */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelection(analysis.id, e)}
                    aria-pressed={selectedIds.has(analysis.id)}
                    aria-label={t('addToCart')}
                    className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-[6px] border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(analysis.id)
                        ? 'bg-[var(--ink)] border-[#B8880F]'
                        : 'bg-[var(--paper)]/90 border-[var(--line)]'
                    }`}
                  >
                    {selectedIds.has(analysis.id) && (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                  {sajuElement ? (
                    <SajuElementTile element={sajuElement} />
                  ) : displayImageUrl ? (
                    <img
                      src={displayImageUrl}
                      alt={analysis.twitter_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">✨</div>
                        <span className="text-[var(--muted-ink)] text-[10px] lg:text-[12px] sm:text-xs font-bold">No Image</span>
                      </div>
                    </div>
                  )}

                  {/* 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* 날짜 뱃지 — 좌상단은 체크박스 자리라 우상단 (케미 카드와 동일) */}
                  <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-[6px] sm:rounded-[6px] bg-[var(--paper)] border-[1.5px] sm:border border-[var(--line)] text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1">
                    <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                    {formatRelativeTime(analysis.created_at)}
                  </div>

                  {/* 상품 타입 뱃지 + 오프라인 뱃지 */}
                  <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 flex gap-1">
                    {renderProductTypeBadge(analysis.product_type)}
                    {analysis.service_mode === 'offline' && (
                      <span className="px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded-[6px] bg-[var(--soft)] text-[var(--ink)] border border-[var(--line)]">
                        {t('offline')}
                      </span>
                    )}
                  </div>

                  {/* 보기 버튼 (호버 시) */}
                  <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 right-1.5 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedImage(analysis)}
                      className="w-full py-1.5 sm:py-2 bg-[var(--paper)] border-[1.5px] sm:border border-[var(--line)] rounded-[6px] sm:rounded-[6px] text-[10px] lg:text-[12px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all"
                    >
                      <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {t('viewDetail')}
                    </button>
                  </div>
                </div>

                {/* 정보 영역 */}
                <div className="p-2 sm:p-3 border-t-[1.5px] sm:border-t-2 border-[var(--line)]">
                  <div className="flex items-start justify-between gap-1 sm:gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-[11px] lg:text-[13px] sm:text-sm truncate leading-tight text-[var(--ink)]">
                        {analysis.idol_name || analysis.twitter_name}
                      </h3>
                      <p className="text-[9px] sm:text-[11px] text-[#5C564A] truncate mt-0.5">
                        {getAnalysisPerfumeName(analysis)}
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
                      className="p-1 sm:p-1.5 text-[#5C564A] hover:text-red-500 hover:bg-red-50 rounded-[6px] sm:rounded-[6px] transition-colors flex-shrink-0"
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
                          className={`w-full py-1.5 sm:py-2 text-[10px] lg:text-[12px] sm:text-xs font-bold rounded-[6px] sm:rounded-[6px] flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
                            discontinued
                              ? 'bg-[var(--soft)] text-[var(--muted-ink)] cursor-not-allowed'
                              : 'bg-[var(--ink)] text-white hover:bg-black'
                          }`}
                        >
                          <ShoppingBag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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

        {/* 모달들 */}
        {renderModals()}
      </>
    )
  }

  // 리스트 뷰
  return (
    <>
      {/* 선택 툴바 — 전체 선택(좌) / 장바구니 담기(우) */}
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={toggleSelectAll}
            className="px-3 py-1.5 text-xs lg:text-sm sm:text-sm font-bold rounded-[6px] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--soft)] transition-colors flex items-center gap-1.5 shrink-0"
          >
            {allSelected ? (
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
          {selectedIds.size > 0 && (
            <span className="text-xs lg:text-sm sm:text-sm text-[var(--muted-ink)] truncate">
              {t('selectedCount', { count: selectedIds.size })}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={selectedIds.size === 0 || isAddingToCart}
          className={`px-3 py-1.5 text-xs lg:text-sm sm:text-sm font-bold rounded-[6px] border-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            selectedIds.size === 0 || isAddingToCart
              ? 'border-[var(--line)] bg-[var(--soft)] text-[var(--muted-ink)] cursor-not-allowed'
              : 'border-[#F5EFE2] bg-[#F5EFE2] text-[var(--ink)] hover:bg-[#FFFDF5]'
          }`}
        >
          {isAddingToCart ? (
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border border-[var(--line)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
          {t('addToCart')}
        </button>
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
              className={`bg-[var(--paper)] border-2 rounded-[6px] overflow-hidden transition-all ${
                selectedIds.has(analysis.id)
                  ? 'border-[var(--line)] ring-2 ring-[var(--line)]'
                  : 'border-[var(--line)]'
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* 선택 체크박스 — 상시 노출 */}
                <button
                  type="button"
                  onClick={(e) => toggleSelection(analysis.id, e)}
                  aria-pressed={selectedIds.has(analysis.id)}
                  aria-label={t('addToCart')}
                  className={`w-6 h-6 rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedIds.has(analysis.id)
                      ? 'bg-[var(--ink)] border-[#B8880F]'
                      : 'bg-[var(--paper)] border-[var(--line)]'
                  }`}
                >
                  {selectedIds.has(analysis.id) && (
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  )}
                </button>

                {/* 이미지 */}
                <div
                  className="w-20 h-20 rounded-[6px] overflow-hidden border border-[var(--line)] flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedImage(analysis)}
                >
                  {getSajuElement(analysis) ? (
                    <SajuElementTile element={getSajuElement(analysis)!} size="sm" />
                  ) : getDisplayImageUrl(analysis) ? (
                    <img
                      src={getDisplayImageUrl(analysis)}
                      alt={analysis.twitter_name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] flex items-center justify-center">
                      <Sparkles size={24} className="text-[var(--muted-ink)]" />
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-lg truncate">{analysis.idol_name || analysis.twitter_name}</h3>
                    {renderProductTypeBadge(analysis.product_type)}
                    {analysis.service_mode === 'offline' && (
                      <span className="px-1.5 py-0.5 text-[10px] lg:text-[12px] font-bold rounded-[6px] bg-[var(--soft)] text-[var(--ink)] border border-[var(--line)]">
                        {t('offline')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm lg:text-base text-[var(--muted-ink)] truncate">{getAnalysisPerfumeName(analysis)}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs lg:text-sm text-[var(--muted-ink)] flex items-center gap-1">
                      <Calendar size={12} />
                      {formatRelativeTime(analysis.created_at)}
                    </span>
                    {analysis.confirmed_recipe?.granules && (
                      <span className="text-xs lg:text-sm px-2 py-0.5 bg-[var(--soft)] text-[var(--ink)] rounded-full font-bold">
                        {t('recipeCount', { count: analysis.confirmed_recipe.granules.length })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDeleteTarget(analysis)
                    }}
                    className="p-2.5 text-[var(--muted-ink)] hover:text-red-500 hover:bg-red-50 rounded-[6px] transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 size={18} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setRecipeModalTarget(analysis)
                    }}
                    className="px-4 py-2.5 bg-[#F5EFE2] text-[var(--ink)] text-sm lg:text-base font-bold rounded-[6px] hover:bg-[#FFFDF5] transition-colors flex items-center gap-1.5 border-2 border-[#F5EFE2]"
                  >
                    <Beaker size={16} />
                    {t('recipeLabel')}
                  </button>

                  <Link
                    href={`/result?id=${analysis.id}&from=mypage`}
                    className="px-4 py-2.5 bg-[#F5EFE2] text-[var(--ink)] text-sm lg:text-base font-bold rounded-[6px] hover:bg-[var(--soft)] transition-colors flex items-center gap-1.5"
                  >
                    {t('viewMore')}
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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
                className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden"
              >
                {/* 모달 헤더 — 레이어링 퍼퓸 상세와 동일한 구성 */}
                <div className="px-5 py-4 border-b-2 border-[var(--line)] bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] flex items-center justify-between flex-shrink-0">
                  <h3 className="font-black text-lg text-[var(--ink)] flex items-center gap-2">
                    <Sparkles size={20} className="fill-[var(--ink)]" />
                    {tMypage('analysisDetail')}
                  </h3>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-1 hover:bg-white/20 rounded-[6px] transition-colors text-[var(--ink)]"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 카드 콘텐츠 - 스크롤 가능 */}
                <div className="overflow-y-auto flex-1 min-h-0">
                  {/* 이미지 - 모바일에서 크기 제한 */}
                  <div className="relative aspect-[4/3] sm:aspect-square max-h-[40vh] sm:max-h-[50vh]">
                    {getSajuElement(selectedImage) ? (
                      <SajuElementTile element={getSajuElement(selectedImage)!} />
                    ) : getDisplayImageUrl(selectedImage) ? (
                      <img
                        src={getDisplayImageUrl(selectedImage)}
                        alt={selectedImage.twitter_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] flex items-center justify-center">
                        <span className="text-6xl">✨</span>
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-5 border-t-2 border-[var(--line)]">
                    <h2 className="font-black text-xl">{selectedImage.idol_name || selectedImage.twitter_name}</h2>
                    <p className="text-[var(--muted-ink)] text-sm lg:text-base mt-1">{getAnalysisPerfumeName(selectedImage)}</p>

                    {/* 확정 레시피 */}
                    {selectedImage.confirmed_recipe?.granules && (
                      <div className="mt-4 p-3 bg-[var(--canvas)] rounded-[6px] border border-[var(--line)]">
                        <p className="text-xs lg:text-sm font-black text-[var(--muted-ink)] mb-2">{t('confirmedRecipe')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedImage.confirmed_recipe.granules.map((g, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-[var(--paper)] rounded-[6px] text-xs lg:text-sm font-bold text-[var(--ink)] border border-[var(--line)]"
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
                        className="flex-1 py-3 bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-[6px] font-bold text-center hover:bg-[var(--soft)] transition-colors"
                      >
                        {t('viewResult')}
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImage(null)
                          setRecipeModalTarget(selectedImage)
                        }}
                        className="flex-[1.5] py-3 bg-[#F5EFE2] text-[var(--ink)] border-2 border-[#F5EFE2] rounded-[6px] font-bold flex items-center justify-center gap-2 hover:bg-[#FFFDF5] transition-all"
                      >
                        <Beaker size={18} />
                        {t('checkRecipe')}
                      </button>
                    </div>

                    <p className="text-center text-[var(--muted-ink)] text-xs lg:text-sm mt-4">
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
                className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-6 max-w-xs w-full"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                    <Trash2 size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-black mb-2">{t('deleteConfirm')}</h3>
                  <p className="text-sm lg:text-base text-[var(--muted-ink)] mb-6">
                    {t('deleteDesc', { name: deleteTarget.idol_name || deleteTarget.twitter_name })}<br />
                    {t('deleteIrreversible')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="flex-1 py-3 bg-[var(--soft)] text-[var(--muted-ink)] rounded-[6px] font-bold hover:bg-[var(--soft)] transition-colors border border-[var(--line)]"
                    >
                      {tButtons('cancel')}
                    </button>
                    <button
                      onClick={() => {
                        onDelete(deleteTarget.id)
                        setDeleteTarget(null)
                      }}
                      className="flex-1 py-3 bg-red-500 text-[var(--ink)] rounded-[6px] font-bold hover:bg-red-600 transition-colors border border-[var(--line)]"
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
                className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-6 max-w-xs w-full"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                    <Trash2 size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-black mb-2">{t('deleteConfirm')}</h3>
                  <p className="text-sm lg:text-base text-[var(--muted-ink)] mb-6">
                    {t('deleteDesc', { name: `${chemistryDeleteTarget.characterA.idol_name || chemistryDeleteTarget.characterA.twitter_name} x ${chemistryDeleteTarget.characterB.idol_name || chemistryDeleteTarget.characterB.twitter_name}` })}<br />
                    {t('deleteIrreversible')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setChemistryDeleteTarget(null)}
                      className="flex-1 py-3 bg-[var(--soft)] text-[var(--muted-ink)] rounded-[6px] font-bold hover:bg-[var(--soft)] transition-colors border border-[var(--line)]"
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
                      className="flex-1 py-3 bg-red-500 text-[var(--ink)] rounded-[6px] font-bold hover:bg-red-600 transition-colors border border-[var(--line)]"
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
                className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] max-w-md w-full max-h-full flex flex-col overflow-hidden"
              >
                {/* 모달 헤더 */}
                <div className="px-5 py-4 border-b-2 border-[var(--line)] bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] flex items-center justify-between flex-shrink-0">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Beaker size={20} />
                    {recipeModalTarget.confirmed_recipe ? t('confirmedRecipeTitle') : t('perfumeAnalysisInfo')}
                  </h3>
                  <button
                    onClick={() => setRecipeModalTarget(null)}
                    className="p-1 hover:bg-black/10 rounded-[6px] transition-colors"
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
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--line)]">
                        {recipeModalTarget.user_image_url ? (
                          <img
                            src={recipeModalTarget.user_image_url}
                            alt=""
                            className="w-14 h-14 rounded-[6px] object-cover border border-[var(--line)]"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-[6px] bg-[var(--soft)] flex items-center justify-center border border-[var(--line)]">
                            <Sparkles size={24} className="text-[var(--muted-ink)]" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs lg:text-sm text-[var(--muted-ink)]">{recipeModalTarget.idol_name || recipeModalTarget.twitter_name}</p>
                          <h2 className="text-xl font-black leading-tight text-[var(--ink)]">{getAnalysisPerfumeName(recipeModalTarget) || modalPersona?.name || recipeModalTarget.perfume_name}</h2>
                        </div>
                      </div>
                    )
                  })()}

                  {recipeModalTarget.confirmed_recipe?.granules ? (
                    /* 확정 레시피가 있는 경우: 시각화된 향료별 계량 표시 */
                    <div className="space-y-4">
                      {/* 섹션 헤더 */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                          <Beaker size={14} className="text-[var(--ink)]" />
                        </div>
                        <span className="text-sm lg:text-base font-black text-[var(--muted-ink)]">{t('customRecipe')}</span>
                      </div>

                      {/* 제품 타입 탭 */}
                      <div className="flex gap-1 p-1 bg-[var(--soft)] rounded-[6px]">
                        {([
                          { key: '10ml' as const, label: t('perfumePerfumeLabel'), sub: t('perfumeSub10') },
                          { key: '50ml' as const, label: t('perfumeLabel50'), sub: t('perfumeSub50') },
                          isSajuRecipeModal
                            ? { key: '5ml' as const, label: t('clickerLabel'), sub: t('clickerSub') }
                            : { key: '5ml' as const, label: t('oilLabel'), sub: t('oilSub') },
                        ]).map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setRecipeProductTab(tab.key)}
                            className={`flex-1 py-2 px-1 rounded-[6px] text-center transition-all ${
                              recipeProductTab === tab.key
                                ? 'bg-[var(--paper)] border border-[var(--line)] font-black'
                                : 'text-[var(--muted-ink)] hover:text-[var(--muted-ink)]'
                            }`}
                          >
                            <p className={`text-[11px] lg:text-[13px] sm:text-xs ${recipeProductTab === tab.key ? 'text-[var(--ink)]' : ''}`}>{tab.label}</p>
                            <p className={`text-[9px] sm:text-[10px] ${recipeProductTab === tab.key ? 'text-[var(--muted-ink)] font-bold' : 'text-[var(--muted-ink)]'}`}>{tab.sub}</p>
                          </button>
                        ))}
                      </div>

                      {/* 레시피 카드들 */}
                      {(() => {
                        const totalGrams = recipeProductTab === '10ml' ? 2 : recipeProductTab === '50ml' ? 10 : 5
                        // 사주 + 디퓨저 탭: g 대신 방울 표기 (레시피의 drops 값, 없으면 비율 환산)
                        const sajuDropsTab = isSajuRecipeModal && recipeProductTab === '5ml'
                        return (
                          <div className="space-y-2.5">
                            {recipeModalTarget.confirmed_recipe!.granules.map((granule, idx) => {
                              const color = getPerfumeColor(granule.id)
                              const isLight = isLightColor(color)
                              const grams = totalGrams * (granule.ratio / 100)
                              const gramsDisplay = grams < 0.1 ? grams.toFixed(2) : grams.toFixed(1)
                              const dropsVal = granule.drops ?? Math.round((granule.ratio / 100) * 10)

                              return (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="relative overflow-hidden rounded-[6px] border border-[var(--line)]"
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
                                      className={`w-10 h-10 rounded-[6px] flex items-center justify-center font-black text-sm lg:text-base border-2 ${isLight ? 'border-[var(--line)]' : 'border-white/30'}`}
                                      style={{
                                        backgroundColor: color,
                                        color: isLight ? '#292929' : 'white'
                                      }}
                                    >
                                      {granule.ratio}%
                                    </div>

                                    {/* 향료 정보 */}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-black text-[var(--ink)] truncate">{getLocalizedName(granule.id, granule.name)}</p>
                                      <p className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-medium">{granule.id}</p>
                                    </div>

                                    {/* 그램/방울 수 표시 */}
                                    <div className="flex flex-col items-center flex-shrink-0 bg-[var(--paper)]/80 rounded-[6px] px-2 py-1 border border-[var(--line)]">
                                      <span className="text-sm lg:text-base font-black text-[var(--muted-ink)]">
                                        {sajuDropsTab ? t('dropsCount', { count: dropsVal }) : `${gramsDisplay}g`}
                                      </span>
                                      <Droplets size={12} className="text-[var(--muted-ink)]" />
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* 총 비율 + 총 그램 표시 */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] rounded-[6px] border border-[var(--line)]">
                        <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">{t('totalIngredient')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">
                            {recipeModalTarget.confirmed_recipe.granules.reduce((sum, g) => sum + g.ratio, 0)}%
                          </span>
                          <span className="text-lg font-black text-[var(--muted-ink)]">
                            {isSajuRecipeModal && recipeProductTab === '5ml'
                              ? t('dropsCount', { count: 10 })
                              : `${recipeProductTab === '10ml' ? '2' : recipeProductTab === '50ml' ? '10' : '5'}g`}
                          </span>
                        </div>
                      </div>

                      {/* 안내 메시지 */}
                      <div className="p-3 bg-[var(--canvas)] rounded-[6px] border border-[var(--line)]">
                        <p className="text-xs lg:text-sm text-[var(--muted-ink)] text-center">
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
                                <p className="text-[var(--muted-ink)] text-sm lg:text-base">{t('noDetailedInfo')}</p>
                                <Link
                                  href={`/result?id=${recipeModalTarget.id}&from=mypage`}
                                  className="inline-block mt-3 px-4 py-2 bg-[var(--soft)] text-[var(--ink)] text-sm lg:text-base font-bold rounded-[6px]"
                                >
                                  {t('checkOnResultPage')}
                                </Link>
                              </div>
                            )}
                          </>
                        )
                      })()}

                      <div className="mt-4 p-3 bg-[var(--soft)] rounded-[6px] text-center">
                        <p className="text-xs lg:text-sm text-[var(--muted-ink)]">
                          {t('makeFeedbackRecipe')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 모달 푸터 */}
                <div className="px-5 py-4 border-t-2 border-[var(--line)] bg-[var(--soft)] flex-shrink-0">
                  <div className="flex gap-2">
                    <Link
                      href={`/result?id=${recipeModalTarget.id}&from=mypage`}
                      className="flex-1 py-3 bg-[var(--paper)] border border-[var(--line)] rounded-[6px] font-bold text-center hover:bg-[var(--soft)] transition-colors"
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
                          className={`flex-[1.5] py-3 border-2 rounded-[6px] font-bold flex items-center justify-center gap-2 transition-colors ${
                            discontinued
                              ? 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)] cursor-not-allowed'
                              : 'bg-[#F5EFE2] text-[var(--ink)] border-[#F5EFE2] hover:bg-[#FFFDF5]'
                          }`}
                        >
                          <ShoppingBag size={18} className={discontinued ? 'text-[var(--muted-ink)]' : 'text-[var(--muted-ink)]'} />
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

        {/* 레이어링 퍼퓸 상세 모달 */}
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
                className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] max-w-md w-full max-h-full flex flex-col overflow-hidden"
              >
                {/* 모달 헤더 */}
                <div className="px-5 py-4 border-b-2 border-[var(--line)] bg-gradient-to-r from-[var(--soft)] to-[var(--soft)] flex items-center justify-between flex-shrink-0">
                  <h3 className="font-black text-lg text-[var(--ink)] flex items-center gap-2">
                    <Heart size={20} className="fill-[var(--ink)]" />
                    레이어링 퍼퓸 상세
                  </h3>
                  <button
                    onClick={() => setChemistryDetailTarget(null)}
                    className="p-1 hover:bg-white/20 rounded-[6px] transition-colors text-[var(--ink)]"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 모달 콘텐츠 */}
                <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-5">
                  {/* 듀얼 이미지 */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[6px] overflow-hidden border border-[var(--line)] flex-shrink-0">
                      {chemistryDetailTarget.characterA.user_image_url ? (
                        <img
                          src={chemistryDetailTarget.characterA.user_image_url}
                          alt={chemistryDetailTarget.characterA.idol_name || chemistryDetailTarget.characterA.twitter_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] flex items-center justify-center">
                          <span className="text-2xl">✨</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 bg-[var(--paper)] border border-[var(--line)] rounded-full flex items-center justify-center">
                        <Heart className="w-4 h-4 text-[var(--ink)] fill-[var(--ink)]" />
                      </div>
                    </div>

                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[6px] overflow-hidden border border-[var(--line)] flex-shrink-0">
                      {chemistryDetailTarget.characterB.user_image_url ? (
                        <img
                          src={chemistryDetailTarget.characterB.user_image_url}
                          alt={chemistryDetailTarget.characterB.idol_name || chemistryDetailTarget.characterB.twitter_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] flex items-center justify-center">
                          <span className="text-2xl">✨</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 캐릭터 이름 */}
                  <div className="text-center">
                    <h2 className="text-lg font-black text-[var(--ink)] leading-tight">
                      {chemistryDetailTarget.characterA.idol_name || chemistryDetailTarget.characterA.twitter_name}
                      <span className="text-[var(--muted-ink)] mx-1.5">x</span>
                      {chemistryDetailTarget.characterB.idol_name || chemistryDetailTarget.characterB.twitter_name}
                    </h2>
                    {chemistryDetailTarget.chemistryTitle && (
                      <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold mt-1">
                        &quot;{chemistryDetailTarget.chemistryTitle}&quot;
                      </p>
                    )}
                    {chemistryDetailTarget.chemistryType && (
                      <span className="inline-block mt-2 px-3 py-1 text-[10px] lg:text-[12px] font-black rounded-full bg-[var(--soft)] text-[var(--muted-ink)] border border-[var(--line)]">
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
                      <div className="bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[6px] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-[var(--soft)] flex items-center justify-center">
                            <span className="text-[var(--ink)] text-[10px] lg:text-[12px] font-black">A</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] lg:text-[12px] text-[#5C564A] font-bold">
                              {chemistryDetailTarget.characterA.idol_name || chemistryDetailTarget.characterA.twitter_name}
                            </p>
                            <p className="text-sm lg:text-base font-black text-[var(--ink)] truncate">
                              {getAnalysisPerfumeName(chemistryDetailTarget.characterA) || personaA?.name || chemistryDetailTarget.characterA.perfume_name}
                            </p>
                          </div>
                        </div>
                        {personaA && (personaA.mainScent || personaA.subScent1 || personaA.subScent2) && (
                          <div className="space-y-1.5">
                            {personaA.mainScent && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#5C564A] w-8 flex-shrink-0">TOP</span>
                                <span className="text-xs lg:text-sm text-[#1A1610]">{typeof personaA.mainScent === 'string' ? personaA.mainScent : personaA.mainScent.name}</span>
                              </div>
                            )}
                            {personaA.subScent1 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#5C564A] w-8 flex-shrink-0">MID</span>
                                <span className="text-xs lg:text-sm text-[#1A1610]">{typeof personaA.subScent1 === 'string' ? personaA.subScent1 : personaA.subScent1.name}</span>
                              </div>
                            )}
                            {personaA.subScent2 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#5C564A] w-8 flex-shrink-0">BASE</span>
                                <span className="text-xs lg:text-sm text-[#1A1610]">{typeof personaA.subScent2 === 'string' ? personaA.subScent2 : personaA.subScent2.name}</span>
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
                      <div className="bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[6px] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-[var(--soft)] flex items-center justify-center">
                            <span className="text-[var(--ink)] text-[10px] lg:text-[12px] font-black">B</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] lg:text-[12px] text-[#5C564A] font-bold">
                              {chemistryDetailTarget.characterB.idol_name || chemistryDetailTarget.characterB.twitter_name}
                            </p>
                            <p className="text-sm lg:text-base font-black text-[var(--ink)] truncate">
                              {getAnalysisPerfumeName(chemistryDetailTarget.characterB) || personaB?.name || chemistryDetailTarget.characterB.perfume_name}
                            </p>
                          </div>
                        </div>
                        {personaB && (personaB.mainScent || personaB.subScent1 || personaB.subScent2) && (
                          <div className="space-y-1.5">
                            {personaB.mainScent && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#5C564A] w-8 flex-shrink-0">TOP</span>
                                <span className="text-xs lg:text-sm text-[#1A1610]">{typeof personaB.mainScent === 'string' ? personaB.mainScent : personaB.mainScent.name}</span>
                              </div>
                            )}
                            {personaB.subScent1 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#5C564A] w-8 flex-shrink-0">MID</span>
                                <span className="text-xs lg:text-sm text-[#1A1610]">{typeof personaB.subScent1 === 'string' ? personaB.subScent1 : personaB.subScent1.name}</span>
                              </div>
                            )}
                            {personaB.subScent2 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#5C564A] w-8 flex-shrink-0">BASE</span>
                                <span className="text-xs lg:text-sm text-[#1A1610]">{typeof personaB.subScent2 === 'string' ? personaB.subScent2 : personaB.subScent2.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* 분석 일시 */}
                  <p className="text-center text-[var(--muted-ink)] text-xs lg:text-sm">
                    {t('analyzedAt', { time: formatRelativeTime(chemistryDetailTarget.created_at) })}
                  </p>
                </div>

                {/* 모달 푸터 */}
                <div className="px-5 py-4 border-t-2 border-[var(--line)] bg-[var(--soft)] flex-shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setChemistryDetailTarget(null)
                        handleViewChemistryResult(chemistryDetailTarget)
                      }}
                      className="flex-1 py-3 bg-[var(--paper)] border border-[var(--line)] rounded-[6px] font-bold text-center hover:bg-[var(--soft)] transition-colors"
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
                      className={`flex-[1.5] py-3 border-2 rounded-[6px] font-bold flex items-center justify-center gap-2 transition-colors ${
                        isChemistryDiscontinued
                          ? 'bg-[var(--soft)] text-[var(--muted-ink)] border-[var(--line)] cursor-not-allowed'
                          : 'bg-[#F5EFE2] text-[var(--ink)] border-[#F5EFE2] hover:bg-[#FFFDF5]'
                      }`}
                    >
                      <ShoppingBag size={18} className={isChemistryDiscontinued ? 'text-[var(--muted-ink)]' : 'text-[var(--muted-ink)]'} />
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
                className="bg-[var(--paper)] border border-[var(--line)] rounded-[6px] p-6 max-w-xs w-full"
              >
                <div className="text-center">
                  {cartResultModal.type === 'success' ? (
                    <>
                      {/* 성공 아이콘 */}
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[var(--soft)] to-[var(--soft)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                        <ShoppingCart size={36} className="text-[var(--ink)]" />
                      </div>
                      <h3 className="text-xl font-black mb-2">{t('addedToCart')}</h3>
                      <p className="text-3xl font-black text-[var(--muted-ink)] mb-1">
                        {cartResultModal.added}{t('itemsUnit')}
                      </p>
                      <p className="text-sm lg:text-base text-[var(--muted-ink)] mb-4">
                        {cartResultModal.duplicates && cartResultModal.duplicates > 0
                          ? t('alreadyInCart', { count: cartResultModal.duplicates })
                          : t('addedToCartDesc')}
                      </p>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => setCartResultModal(null)}
                          className="flex-1 py-3 bg-[var(--soft)] text-[var(--muted-ink)] rounded-[6px] font-bold hover:bg-[var(--soft)] transition-colors border border-[var(--line)]"
                        >
                          {t('continueShopping')}
                        </button>
                        <button
                          onClick={() => {
                            setCartResultModal(null)
                            router.push('/mypage?tab=cart')
                          }}
                          className="flex-1 py-3 bg-[#F5EFE2] text-[var(--ink)] rounded-[6px] font-bold hover:bg-[#FFFDF5] transition-colors border-2 border-[#F5EFE2] flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart size={16} />
                          {t('goToCart')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 에러 아이콘 */}
                      <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                        <X size={36} className="text-red-500" />
                      </div>
                      <h3 className="text-xl font-black mb-2">{t('errorOccurred')}</h3>
                      <p className="text-sm lg:text-base text-[var(--muted-ink)] mb-6">
                        {cartResultModal.message}
                      </p>
                      <button
                        onClick={() => setCartResultModal(null)}
                        className="w-full py-3 bg-[var(--soft)] text-[var(--muted-ink)] rounded-[6px] font-bold hover:bg-[var(--soft)] transition-colors border border-[var(--line)]"
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
