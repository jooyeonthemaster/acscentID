"use client"

import { motion } from "framer-motion"
import { Package, Star, Minus, Plus, Trash2, Check, Gift } from "lucide-react"
import { useTranslations } from 'next-intl'
import type { CartItem, ProductType } from "@/types/cart"
import { PRODUCT_TYPE_BADGES, PRODUCT_PRICING, formatPrice } from "@/types/cart"

interface MultiItemOrderSummaryProps {
  items: CartItem[]
  onUpdateQuantity: (itemId: string, delta: number) => void
  onUpdateSize: (itemId: string, size: string) => void
  onRemoveItem: (itemId: string) => void
  isFreeShippingPromo?: boolean
  promoName?: string
  isRepurchaser?: boolean
}

export function MultiItemOrderSummary({
  items,
  onUpdateQuantity,
  onUpdateSize,
  onRemoveItem,
  isFreeShippingPromo = false,
  promoName,
  isRepurchaser,
}: MultiItemOrderSummaryProps) {
  const t = useTranslations()
  const renderProductTypeBadge = (productType: ProductType) => {
    const badge = PRODUCT_TYPE_BADGES[productType] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', labelShort: productType }
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
          <h3 className="font-black text-lg text-slate-900">{t('checkout.orderProduct')}</h3>
        </div>
        <span className="text-sm font-bold text-slate-500">{t('checkout.itemCountSuffix', { count: items.length })}</span>
      </div>

      {/* 재구매 쿠폰 배너 */}
      {isRepurchaser === true && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl px-3 py-2.5 border-2 border-emerald-400"
        >
          <Check size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-emerald-800 font-black">재구매 고객님, 감사합니다! 🎉</p>
            <p className="text-[11px] text-emerald-700 font-bold mt-0.5">10% 할인 쿠폰을 아래에서 선택하여 적용해보세요</p>
          </div>
        </motion.div>
      )}
      {isRepurchaser === false && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl px-3 py-2.5 border-2 border-pink-300"
        >
          <Gift size={16} className="text-pink-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-pink-700 font-black">첫 구매 후 다음 주문부터 계속 10% 할인! 💝</p>
            <p className="text-[11px] text-pink-600 font-bold mt-0.5">재구매 쿠폰이 자동 발급되어 횟수 제한 없이 사용 가능해요</p>
          </div>
        </motion.div>
      )}

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
                    {t('checkout.setProduct')}
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
                  {formatPrice(item.price * item.quantity)}{t('currency.suffix')}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 안내 */}
      <div className="bg-[#E9D5FF] border-2 border-slate-900 rounded-xl p-4">
        <p className="text-sm font-black text-slate-900 mb-2">{t('checkout.orderGuide')}</p>
        <ul className="space-y-1.5 text-xs text-slate-700 font-bold">
          <li className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
            {isFreeShippingPromo ? (
              <span className="text-pink-600 font-bold">
                {t('checkout.promoFreeShipping', { promoName: promoName || t('checkout.eventLabel') })}
              </span>
            ) : (
              t('checkout.freeShippingOver')
            )}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
            {t('checkout.shippingAfterDeposit')}
          </li>
        </ul>
      </div>
    </motion.div>
  )
}
