'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Trash2, Plus, Minus, ShoppingBag, Sparkles, Check, Square, CheckSquare, Beaker, X, Droplets } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { CartItem, ProductType } from '@/types/cart'
import { PRODUCT_TYPE_BADGES, PRODUCT_PRICING, formatPrice, calculateCartTotals } from '@/types/cart'
import { useActivePromotions, calculateShippingWithPromotion } from '@/hooks/usePromotions'
import { PerfumeNotes } from '@/app/[locale]/result/components/PerfumeNotes'
import { PerfumeProfile } from '@/app/[locale]/result/components/PerfumeProfile'
import { PerfumePersona } from '@/types/analysis'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'

interface CartListProps {
  viewMode: 'grid' | 'list'
}

export function CartList({ viewMode }: CartListProps) {
  const router = useRouter()
  const t = useTranslations('mypage.cart')
  const tCurrency = useTranslations('currency')
  const tButtons = useTranslations('buttons')
  const { getLocalizedName } = useLocalizedPerfumes()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [recipeModalTarget, setRecipeModalTarget] = useState<CartItem | null>(null)
  const { freeShippingPromo } = useActivePromotions()

  // 장바구니 로드
  useEffect(() => {
    fetchCartItems()
  }, [])

  const fetchCartItems = async () => {
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
      } else if (response.status === 401) {
        // 로그인 필요
        setCartItems([])
      }
    } catch (error) {
      console.error('Failed to load cart:', error)
    } finally {
      setLoading(false)
    }
  }

  // 수량 변경
  const updateQuantity = async (item: CartItem, delta: number) => {
    const newQty = Math.max(1, Math.min(10, item.quantity + delta))
    if (newQty === item.quantity) return

    setUpdatingIds(prev => new Set(prev).add(item.id))
    try {
      const response = await fetch(`/api/cart/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })

      if (response.ok) {
        setCartItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, quantity: newQty } : i
        ))
      }
    } catch (error) {
      console.error('Failed to update quantity:', error)
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  // 사이즈 변경
  const updateSize = async (item: CartItem, newSize: string) => {
    if (item.size === newSize) return
    if (item.product_type === 'figure_diffuser') return // 피규어는 사이즈 변경 불가

    const pricing = PRODUCT_PRICING[item.product_type]
    const newPrice = pricing.find(p => p.size === newSize)?.price || item.price

    setUpdatingIds(prev => new Set(prev).add(item.id))
    try {
      const response = await fetch(`/api/cart/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: newSize,
          product_type: item.product_type,
        }),
      })

      if (response.ok) {
        setCartItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, size: newSize as CartItem['size'], price: newPrice } : i
        ))
      }
    } catch (error) {
      console.error('Failed to update size:', error)
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  // 아이템 삭제
  const removeItem = async (id: string) => {
    setUpdatingIds(prev => new Set(prev).add(id))
    try {
      const response = await fetch(`/api/cart/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setCartItems(prev => prev.filter(i => i.id !== id))
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        alert(t('removedFromCart'))
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
      alert(t('deleteFailed'))
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // 선택 삭제
  const removeSelected = async () => {
    if (selectedIds.size === 0) {
      alert(t('noSelectedItems'))
      return
    }

    const ids = Array.from(selectedIds)
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })

      if (response.ok) {
        const data = await response.json()
        setCartItems(prev => prev.filter(i => !selectedIds.has(i.id)))
        setSelectedIds(new Set())
        alert(t('deletedItems', { count: data.deleted }))
      }
    } catch (error) {
      console.error('Failed to remove selected:', error)
      alert(t('deleteFailed'))
    }
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === cartItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(cartItems.map(item => item.id)))
    }
  }

  // 개별 선택
  const toggleSelect = (id: string) => {
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

  // 결제하기
  const handleCheckout = () => {
    const itemsToCheckout = selectedIds.size > 0
      ? cartItems.filter(item => selectedIds.has(item.id))
      : cartItems

    if (itemsToCheckout.length === 0) {
      alert(t('noCheckoutItems'))
      return
    }

    // 체크아웃 페이지에서 사용할 데이터 저장
    localStorage.setItem('checkoutItems', JSON.stringify(itemsToCheckout))
    router.push('/checkout')
  }

  // 상품 타입 뱃지
  const renderProductTypeBadge = (productType: ProductType) => {
    const badge = PRODUCT_TYPE_BADGES[productType]
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${badge.bg} ${badge.text} border ${badge.border}`}>
        {badge.labelShort}
      </span>
    )
  }

  // 가격 계산
  const selectedItems = selectedIds.size > 0 ? cartItems.filter(i => selectedIds.has(i.id)) : cartItems
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingResult = calculateShippingWithPromotion(subtotal, undefined, freeShippingPromo)
  const totals = {
    subtotal,
    shippingFee: shippingResult.finalFee,
    discount: 0,
    total: subtotal + shippingResult.finalFee,
  }

  if (loading) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl p-8 shadow-[4px_4px_0_0_black]">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-black border-t-amber-400 rounded-full animate-spin" />
          <span className="font-bold">{t('loading')}</span>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl p-8 shadow-[4px_4px_0_0_black]">
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center border-2 border-black">
            <ShoppingCart size={32} className="text-amber-600" />
          </div>
          <h3 className="font-black text-lg mb-2">{t('empty')}</h3>
          <p className="text-sm text-slate-600 mb-6">
            {t('emptyHint')}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-black font-bold rounded-xl border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            <Sparkles size={18} />
            {t('startAnalysis')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 상단 컨트롤 */}
      <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_black]">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5"
            >
              {selectedIds.size === cartItems.length ? (
                <CheckSquare className="w-5 h-5 text-purple-500" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
              <span className="font-bold text-sm">
                {t('selectAll', { selected: selectedIds.size, total: cartItems.length })}
              </span>
            </button>
          </label>
          <button
            onClick={removeSelected}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            {t('deleteSelected')}
          </button>
        </div>
      </div>

      {/* 장바구니 아이템 목록 */}
      <div className="space-y-3">
        {cartItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-2xl overflow-hidden transition-all ${
              selectedIds.has(item.id) ? 'ring-2 ring-amber-400' : ''
            } ${updatingIds.has(item.id) ? 'opacity-60' : ''}`}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            {/* 상단: 체크박스 + 뱃지 + 삭제 */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSelect(item.id)}
                  className="flex-shrink-0"
                >
                  {selectedIds.has(item.id) ? (
                    <div className="w-5 h-5 bg-amber-400 rounded-md flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-slate-100 rounded-md border border-slate-300" />
                  )}
                </button>
                {renderProductTypeBadge(item.product_type)}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                disabled={updatingIds.has(item.id)}
                className="p-1.5 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* 중앙: 이미지 + 정보 */}
            <div className="flex gap-4 px-4 pb-3">
              {/* 이미지 */}
              <div className="flex-shrink-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.perfume_name}
                    className="w-20 h-20 rounded-xl object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
                    <ShoppingBag size={28} className="text-amber-500" />
                  </div>
                )}
              </div>

              {/* 상품 정보 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate mb-1">{item.perfume_name}</h3>

                {/* 레시피 버튼 */}
                {item.analysis_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setRecipeModalTarget(item)
                    }}
                    className="mb-2 py-1 px-2.5 bg-amber-400 text-black text-[11px] font-bold rounded-md flex items-center gap-1 hover:bg-amber-300 transition-colors"
                  >
                    <Beaker className="w-3 h-3" />
                    {t('checkRecipe')}
                  </button>
                )}

                {/* 옵션 선택 */}
                <div className="text-sm text-slate-500">
                  {item.product_type === 'figure_diffuser' ? (
                    <span className="text-xs">{t('setProduct')}</span>
                  ) : (
                    <select
                      value={item.size}
                      onChange={(e) => updateSize(item, e.target.value)}
                      disabled={updatingIds.has(item.id)}
                      className="text-xs text-slate-600 bg-slate-50 rounded-md px-2 py-1 border-none outline-none disabled:opacity-50"
                    >
                      {PRODUCT_PRICING[item.product_type].map(option => (
                        <option key={option.size} value={option.size}>
                          {option.label} - {formatPrice(option.price)}{tCurrency('suffix')}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* 하단: 수량 + 가격 */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80">
              <div className="flex items-center bg-white rounded-lg border border-slate-200">
                <button
                  onClick={() => updateQuantity(item, -1)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
                  disabled={item.quantity <= 1 || updatingIds.has(item.id)}
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold text-sm text-slate-700">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item, 1)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
                  disabled={item.quantity >= 10 || updatingIds.has(item.id)}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="font-black text-lg text-slate-900">
                {formatPrice(item.price * item.quantity)}{tCurrency('suffix')}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 하단 결제 정보 */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-400 border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black]">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>{t('productAmount')}</span>
            <span className="font-bold">{formatPrice(totals.subtotal)}{tCurrency('suffix')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1.5">
              {t('shippingFee')}
              {shippingResult.isFreeByPromotion && (
                <span className="px-1.5 py-0.5 bg-pink-500 text-white text-[9px] font-black rounded-full">배송비</span>
              )}
            </span>
            <span className="font-bold">
              {shippingResult.isFreeByPromotion ? (
                <span className="flex items-center gap-1.5">
                  <span className="line-through text-slate-400">{formatPrice(shippingResult.originalFee)}{tCurrency('suffix')}</span>
                  <span className="text-pink-600 font-black">0{tCurrency('suffix')}</span>
                </span>
              ) : totals.shippingFee === 0 ? (
                tCurrency('free')
              ) : (
                `${formatPrice(totals.shippingFee)}${tCurrency('suffix')}`
              )}
            </span>
          </div>
          {shippingResult.isFreeByPromotion && (
            <p className="text-xs text-pink-600 font-bold">✓ {shippingResult.promotionName || '무료배송 이벤트'} 적용중</p>
          )}
          {!shippingResult.isFreeByPromotion && totals.shippingFee === 0 && (
            <p className="text-xs text-amber-700">✓ {t('freeShippingNote')}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t-2 border-black/20">
          <div>
            <p className="text-sm font-bold">
              {selectedIds.size > 0
                ? t('selectedItems', { count: selectedIds.size })
                : t('allItems', { count: cartItems.length })
              }
            </p>
            <p className="text-2xl font-black">
              {formatPrice(totals.total)}{tCurrency('suffix')}
            </p>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full sm:w-auto px-8 py-4 bg-black text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0_0_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            {t('goCheckout')}
          </button>
        </div>
      </div>

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
                  {t('perfumeAnalysisInfo')}
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
                  const analysisData = recipeModalTarget.analysis_data as {
                    matchingPerfumes?: Array<{
                      persona?: PerfumePersona
                    }>
                    confirmedRecipe?: {
                      granules: Array<{ id: string; name: string; ratio: number }>
                    }
                  } | null
                  const persona = analysisData?.matchingPerfumes?.[0]?.persona
                  const confirmedRecipe = analysisData?.confirmedRecipe

                  return (
                    <>
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
                        {recipeModalTarget.image_url ? (
                          <img
                            src={recipeModalTarget.image_url}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover border-2 border-black"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center border-2 border-black">
                            <Sparkles size={24} className="text-purple-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500">{recipeModalTarget.twitter_name || t('analysisResult')}</p>
                          <h2 className="text-xl font-black leading-tight text-slate-900">
                            {persona?.name || recipeModalTarget.perfume_name}
                          </h2>
                        </div>
                      </div>

                      {confirmedRecipe?.granules ? (
                        /* 확정 레시피가 있는 경우 */
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-slate-600 mb-3">{t('customRecipe')}</p>
                          {confirmedRecipe.granules.map((granule, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border-2 border-amber-200"
                            >
                              <div className="flex items-center gap-2">
                                <Droplets size={16} className="text-amber-600" />
                                <span className="font-bold">{getLocalizedName(granule.id, granule.name)}</span>
                              </div>
                              <span className="px-3 py-1 bg-white rounded-lg font-black text-amber-700 border border-amber-300">
                                {granule.ratio}%
                              </span>
                            </div>
                          ))}
                          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center">
                            <p className="text-xs text-slate-500">
                              {t('recipeAdjusted')}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* 확정 레시피가 없는 경우: 향 노트 + 향 계열 그래프 */
                        <div className="space-y-5">
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
                                href={`/result?id=${recipeModalTarget.analysis_id}&from=mypage`}
                                className="inline-block mt-3 px-4 py-2 bg-purple-500 text-white text-sm font-bold rounded-lg"
                              >
                                {t('checkOnResultPage')}
                              </Link>
                            </div>
                          )}

                          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center">
                            <p className="text-xs text-slate-500">
                              {t('makeFeedbackRecipe')}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* 모달 푸터 */}
              <div className="px-5 py-4 border-t-2 border-black bg-slate-50 flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setRecipeModalTarget(null)}
                    className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-bold hover:bg-slate-100 transition-colors"
                  >
                    {tButtons('close')}
                  </button>
                  <Link
                    href={`/result?id=${recipeModalTarget.analysis_id}&from=mypage`}
                    className="flex-1 py-3 bg-purple-500 text-white border-2 border-black rounded-xl font-bold text-center hover:bg-purple-600 transition-colors"
                    onClick={() => setRecipeModalTarget(null)}
                  >
                    {t('viewResultDetail')}
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
