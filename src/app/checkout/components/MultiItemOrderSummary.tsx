"use client"

import { motion } from "framer-motion"
import { Package, Star, Minus, Plus, Trash2 } from "lucide-react"
import type { CartItem, ProductType } from "@/types/cart"
import { PRODUCT_TYPE_BADGES, PRODUCT_PRICING, formatPrice } from "@/types/cart"

interface MultiItemOrderSummaryProps {
  items: CartItem[]
  onUpdateQuantity: (itemId: string, delta: number) => void
  onUpdateSize: (itemId: string, size: string) => void
  onRemoveItem: (itemId: string) => void
}

export function MultiItemOrderSummary({
  items,
  onUpdateQuantity,
  onUpdateSize,
  onRemoveItem,
}: MultiItemOrderSummaryProps) {
  const renderProductTypeBadge = (productType: ProductType) => {
    const badge = PRODUCT_TYPE_BADGES[productType]
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${badge.bg} ${badge.text} border ${badge.border}`}>
        {badge.labelShort}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_#000] space-y-5"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FBCFE8] border-2 border-slate-900 flex items-center justify-center">
            <Package size={16} className="text-slate-900" />
          </div>
          <h3 className="font-black text-lg text-slate-900">주문 상품</h3>
        </div>
        <span className="text-sm font-bold text-slate-500">{items.length}개</span>
      </div>

      {/* 상품 목록 */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
          >
            {/* 이미지 */}
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#FEF9C3] border-2 border-slate-900">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.perfume_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Star size={20} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {renderProductTypeBadge(item.product_type)}
                  </div>
                  <p className="font-black text-sm truncate text-slate-900">{item.perfume_name}</p>
                  {item.twitter_name && (
                    <p className="text-xs text-purple-600">@{item.twitter_name}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* 사이즈 선택 */}
              <div className="mt-2 flex items-center gap-2">
                {item.product_type === 'figure_diffuser' ? (
                  <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-bold border border-cyan-300">
                    세트 상품
                  </span>
                ) : (
                  <select
                    value={item.size}
                    onChange={(e) => onUpdateSize(item.id, e.target.value)}
                    className="px-2 py-1 bg-white rounded text-xs font-bold border-2 border-slate-900"
                  >
                    {PRODUCT_PRICING[item.product_type].map(option => (
                      <option key={option.size} value={option.size}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 수량 & 가격 */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1 border border-slate-300 rounded overflow-hidden">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    disabled={item.quantity <= 1}
                    className="p-1 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    disabled={item.quantity >= 10}
                    className="p-1 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="font-black text-slate-900">
                  {formatPrice(item.price * item.quantity)}원
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 안내 */}
      <div className="bg-[#E9D5FF] border-2 border-slate-900 rounded-xl p-4">
        <p className="text-sm font-black text-slate-900 mb-2">주문 안내</p>
        <ul className="space-y-1.5 text-xs text-slate-700 font-bold">
          <li className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
            50ml 또는 세트 상품 포함 시 무료배송
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
            입금 확인 후 2~3일 내 배송
          </li>
        </ul>
      </div>
    </motion.div>
  )
}
