'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, Plus, Minus, ShoppingBag, Sparkles, Check, Square, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import type { CartItem, ProductType } from '@/types/cart'
import { PRODUCT_TYPE_BADGES, PRODUCT_PRICING, formatPrice, calculateCartTotals } from '@/types/cart'

interface CartListProps {
  viewMode: 'grid' | 'list'
}

export function CartList({ viewMode }: CartListProps) {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

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
        alert('장바구니에서 삭제되었습니다')
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
      alert('삭제에 실패했습니다')
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
      alert('선택된 상품이 없습니다')
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
        alert(`${data.deleted}개 상품이 삭제되었습니다`)
      }
    } catch (error) {
      console.error('Failed to remove selected:', error)
      alert('삭제에 실패했습니다')
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
      alert('결제할 상품이 없습니다')
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
  const totals = calculateCartTotals(
    selectedIds.size > 0 ? cartItems.filter(i => selectedIds.has(i.id)) : cartItems
  )

  if (loading) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl p-8 shadow-[4px_4px_0_0_black]">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-black border-t-amber-400 rounded-full animate-spin" />
          <span className="font-bold">장바구니 로딩 중...</span>
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
          <h3 className="font-black text-lg mb-2">장바구니가 비어있어요</h3>
          <p className="text-sm text-slate-600 mb-6">
            분석 결과에서 마음에 드는 향수를 담아보세요!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-black font-bold rounded-xl border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            <Sparkles size={18} />
            분석 시작하기
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
                전체선택 ({selectedIds.size}/{cartItems.length})
              </span>
            </button>
          </label>
          <button
            onClick={removeSelected}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            선택삭제
          </button>
        </div>
      </div>

      {/* 장바구니 아이템 목록 */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
        {cartItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white border-2 rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] transition-all ${
              selectedIds.has(item.id) ? 'border-purple-500 ring-2 ring-purple-200' : 'border-black'
            } ${updatingIds.has(item.id) ? 'opacity-60' : ''}`}
          >
            <div className={`p-4 ${viewMode === 'list' ? 'flex gap-4' : ''}`}>
              {/* 선택 체크박스 + 이미지 */}
              <div className={`flex gap-3 ${viewMode === 'list' ? '' : 'mb-3'}`}>
                <button
                  onClick={() => toggleSelect(item.id)}
                  className="flex-shrink-0 mt-1"
                >
                  {selectedIds.has(item.id) ? (
                    <div className="w-5 h-5 bg-purple-500 rounded border-2 border-purple-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-white rounded border-2 border-black" />
                  )}
                </button>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.perfume_name}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-black"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-amber-100 border-2 border-black flex items-center justify-center">
                    <ShoppingBag size={24} className="text-amber-600" />
                  </div>
                )}
              </div>

              {/* 상품 정보 */}
              <div className={`flex-1 ${viewMode === 'list' ? '' : 'mt-2'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {renderProductTypeBadge(item.product_type)}
                    </div>
                    <p className="font-black truncate">{item.perfume_name}</p>
                    <p className="text-xs text-slate-600">{item.perfume_brand}</p>
                    {item.twitter_name && (
                      <p className="text-xs text-purple-600 mt-1">@{item.twitter_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={updatingIds.has(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* 사이즈 선택 & 가격 */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  {item.product_type === 'figure_diffuser' ? (
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold border border-cyan-300">
                      세트 상품
                    </span>
                  ) : (
                    <select
                      value={item.size}
                      onChange={(e) => updateSize(item, e.target.value)}
                      disabled={updatingIds.has(item.id)}
                      className="px-2 py-1 bg-white rounded-lg text-xs font-bold border-2 border-black disabled:opacity-50"
                    >
                      {PRODUCT_PRICING[item.product_type].map(option => (
                        <option key={option.size} value={option.size}>
                          {option.label} - {formatPrice(option.price)}원
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="font-black text-amber-600">
                    {formatPrice(item.price)}원
                  </span>
                </div>

                {/* 수량 조절 */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 border-2 border-black rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item, -1)}
                      className="p-1.5 hover:bg-slate-100 transition-colors disabled:opacity-50"
                      disabled={item.quantity <= 1 || updatingIds.has(item.id)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item, 1)}
                      className="p-1.5 hover:bg-slate-100 transition-colors disabled:opacity-50"
                      disabled={item.quantity >= 10 || updatingIds.has(item.id)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-black">
                    {formatPrice(item.price * item.quantity)}원
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 하단 결제 정보 */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-400 border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black]">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>상품금액</span>
            <span className="font-bold">{formatPrice(totals.subtotal)}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>배송비</span>
            <span className="font-bold">
              {totals.shippingFee === 0 ? '무료' : `${formatPrice(totals.shippingFee)}원`}
            </span>
          </div>
          {totals.shippingFee === 0 && (
            <p className="text-xs text-amber-700">✓ 50ml 또는 세트 상품 포함 시 무료배송</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t-2 border-black/20">
          <div>
            <p className="text-sm font-bold">
              {selectedIds.size > 0
                ? `선택 상품 ${selectedIds.size}개`
                : `전체 상품 ${cartItems.length}개`
              }
            </p>
            <p className="text-2xl font-black">
              {formatPrice(totals.total)}원
            </p>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full sm:w-auto px-8 py-4 bg-black text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0_0_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            주문하기 →
          </button>
        </div>
      </div>
    </div>
  )
}
