"use client"

import { motion } from "framer-motion"
import { Package, Star, Sparkles, Check, Palette, GraduationCap, Bird } from "lucide-react"
import { useTranslations } from 'next-intl'
import type { ProductType } from "@/types/cart"
import { FREE_SHIPPING_THRESHOLD, formatPrice } from "@/types/cart"

interface OrderSummaryProps {
  perfumeName: string
  perfumeBrand: string
  userImage: string | null
  productType?: ProductType
  selectedSize: "10ml" | "50ml" | "set"
  onSizeChange: (size: "10ml" | "50ml" | "set") => void
  price: number
  keywords: string[]
}

export function OrderSummary({
  perfumeName,
  perfumeBrand,
  userImage,
  productType = "image_analysis",
  selectedSize,
  onSizeChange,
  price,
  keywords,
}: OrderSummaryProps) {
  const t = useTranslations()
  const isFigureDiffuser = productType === "figure_diffuser"
  const isGraduation = productType === "graduation"
  const isSignature = productType === "signature"
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_#000] space-y-5"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#FBCFE8] border-2 border-slate-900 flex items-center justify-center">
          <Package size={16} className="text-slate-900" />
        </div>
        <h3 className="font-black text-lg text-slate-900">{t('checkout.orderProduct')}</h3>
      </div>

      {/* 상품 정보 */}
      <div className="flex gap-4">
        {/* 이미지 */}
        <div className="w-24 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[#FEF9C3] border-2 border-slate-900 shadow-[2px_2px_0px_#000]">
          {userImage ? (
            <img
              src={userImage}
              alt={t('checkout.analysisImage')}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Star size={20} className="text-slate-400" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm text-[#F472B6] font-black tracking-wide">{perfumeBrand}</p>
            <h4 className="font-black text-slate-900 text-base leading-tight mt-0.5">{perfumeName}</h4>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 3).map((keyword, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 bg-[#FEF9C3] text-slate-900 rounded-full font-bold border border-slate-900"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          <p className="text-xl font-black text-slate-900">
            {price.toLocaleString()}{t('currency.suffix')}
          </p>
        </div>
      </div>

      {/* 용량/상품 선택 */}
      <div className="space-y-3">
        <p className="text-sm font-black text-slate-900 flex items-center gap-2">
          {isFigureDiffuser ? (
            <>
              <Palette size={14} className="text-cyan-500" />
              {t('checkout.productSelection')}
            </>
          ) : isGraduation ? (
            <>
              <GraduationCap size={14} className="text-emerald-500" />
              {t('checkout.graduationPerfumeSelection')}
            </>
          ) : isSignature ? (
            <>
              <Bird size={14} className="text-amber-500" />
              {t('checkout.signaturePerfumeLabel')}
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-[#F472B6]" />
              {t('checkout.sizeSelection')}
            </>
          )}
        </p>

        {isFigureDiffuser ? (
          /* 피규어 디퓨저 세트 (단일 옵션) */
          <div className="grid grid-cols-1 gap-3">
            <div className="relative p-4 rounded-xl border-2 border-slate-900 bg-gradient-to-br from-cyan-50 to-amber-50 shadow-[3px_3px_0px_#000]">
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg">{t('checkout.figureSetTitle')}</p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{t('checkout.figureSetDesc')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <p className="text-xl font-black text-slate-900">48,000{t('currency.suffix')}</p>
              </div>
            </div>
          </div>
        ) : isGraduation ? (
          /* 졸업 퍼퓸 (10ml 단일 옵션) - 에메랄드 테마 */
          <div className="grid grid-cols-1 gap-3">
            <div className="relative p-4 rounded-xl border-2 border-slate-900 bg-gradient-to-br from-emerald-50 to-amber-50 shadow-[3px_3px_0px_#000]">
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-2xl">🎓</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg">{t('checkout.graduationPerfumeTitle')}</p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{t('checkout.graduationPerfumeDesc')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-end gap-2">
                  <p className="text-xl font-black text-slate-900">34,000{t('currency.suffix')}</p>
                  <span className="text-xs text-slate-400 line-through">49,000{t('currency.suffix')}</span>
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded">31% OFF</span>
                </div>
              </div>
            </div>
          </div>
        ) : isSignature ? (
          /* 시그니처 뿌덕퍼퓸 (10ml 단일 옵션) - 앰버 테마 */
          <div className="grid grid-cols-1 gap-3">
            <div className="relative p-4 rounded-xl border-2 border-slate-900 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-[3px_3px_0px_#000]">
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-2xl">🦆</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-lg">{t('checkout.signaturePerfumeTitle')}</p>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{t('checkout.signaturePerfumeDesc')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-end gap-2">
                  <p className="text-xl font-black text-slate-900">34,000{t('currency.suffix')}</p>
                  <span className="text-xs text-slate-400 line-through">45,000{t('currency.suffix')}</span>
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded">29% OFF</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 향수 옵션 (10ml / 50ml) */
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSizeChange("10ml")}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                selectedSize === "10ml"
                  ? "border-slate-900 bg-[#FEF9C3] shadow-[2px_2px_0px_#000]"
                  : "border-slate-300 bg-white hover:border-slate-900 hover:shadow-[2px_2px_0px_#000]"
              }`}
            >
              {selectedSize === "10ml" && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F472B6] rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
              <p className="font-black text-slate-900 text-base">10ml</p>
              <p className="text-[10px] text-slate-500 font-bold">{t('checkout.sprayType')}</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">24,000{t('currency.suffix')}</p>
            </button>
            <button
              onClick={() => onSizeChange("50ml")}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                selectedSize === "50ml"
                  ? "border-slate-900 bg-[#FEF9C3] shadow-[2px_2px_0px_#000]"
                  : "border-slate-300 bg-white hover:border-slate-900 hover:shadow-[2px_2px_0px_#000]"
              }`}
            >
              {selectedSize === "50ml" && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F472B6] rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
              <p className="font-black text-slate-900 text-base">50ml</p>
              <p className="text-[10px] text-slate-500 font-bold">{t('checkout.sprayType')}</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">48,000{t('currency.suffix')}</p>
            </button>
          </div>
        )}
      </div>

      {/* 포함 사항 */}
      <div className={`${isFigureDiffuser ? 'bg-cyan-100' : isGraduation ? 'bg-emerald-100' : isSignature ? 'bg-amber-100' : 'bg-[#E9D5FF]'} border-2 border-slate-900 rounded-xl p-4`}>
        <p className="text-sm font-black text-slate-900 mb-3">{t('checkout.included')}</p>
        <ul className="space-y-2 text-sm text-slate-800 font-bold">
          {isFigureDiffuser ? (
            /* 피규어 디퓨저 세트 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeFigure')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeEssence')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includePotBase')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount')}
              </li>
            </>
          ) : isGraduation ? (
            /* 졸업 퍼퓸 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeGradPerfume')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeReport')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeGradCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.shippingFeeAmount')}
              </li>
            </>
          ) : isSignature ? (
            /* 시그니처 뿌덕퍼퓸 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeSignaturePerfume')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeKeyring')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.freeShippingOverInfo')}
              </li>
            </>
          ) : (
            /* 향수 포함 사항 */
            <>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeAnalysisPerfume', { size: selectedSize })}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includePremiumPackage')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {t('checkout.includeAnalysisCard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-900 flex items-center justify-center text-[10px]">✓</span>
                {price >= FREE_SHIPPING_THRESHOLD ? t('checkout.freeShippingLabel') : t('checkout.shippingFeeAmount')}
              </li>
            </>
          )}
        </ul>
      </div>
    </motion.div>
  )
}
