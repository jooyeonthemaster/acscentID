"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ShoppingCart, Package, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/api-client"
import type { ImageAnalysisResult } from "@/types/analysis"
import { PRODUCT_PRICING, formatPrice } from "@/types/cart"
import { useTranslations } from 'next-intl'

interface ChemistryPurchaseChapterProps {
  characterA: ImageAnalysisResult
  characterB: ImageAnalysisResult
  character1Name: string
  character2Name: string
}

export function ChemistryPurchaseChapter({
  characterA, characterB, character1Name, character2Name,
}: ChemistryPurchaseChapterProps) {
  const router = useRouter()
  const { user, unifiedUser } = useAuth()
  const { showToast } = useToast()
  const t = useTranslations()
  const [selectedSize, setSelectedSize] = useState<'set_10ml' | 'set_50ml'>('set_10ml')
  const [isAdding, setIsAdding] = useState(false)

  const pricing = PRODUCT_PRICING.chemistry_set
  const selectedOption = pricing.find(p => p.size === selectedSize) || pricing[0]

  const perfumeA = characterA.matchingPerfumes[0]?.persona
  const perfumeB = characterB.matchingPerfumes[0]?.persona

  const handleAddToCart = async () => {
    if (!user && !unifiedUser) {
      showToast(t('chemistry.buttons.loginRequired') || "로그인이 필요합니다.", "error")
      return
    }
    setIsAdding(true)
    try {
      const resultStr = sessionStorage.getItem('chemistry_result')
      if (!resultStr) throw new Error(t('chemistry.buttons.noResult') || '분석 결과를 찾을 수 없습니다.')

      const formStr = sessionStorage.getItem('chemistry_form')
      const formMeta = formStr ? JSON.parse(formStr) : {}

      const saveResponse = await apiFetch('/api/results/chemistry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisResult: JSON.parse(resultStr),
          character1Name,
          character2Name,
          userId: user?.id || unifiedUser?.id,
          serviceMode: formMeta.serviceMode || 'online',
        }),
      })

      const saveData = await saveResponse.json()
      if (!saveData.success) {
        throw new Error(saveData.error || '결과 저장 실패')
      }

      const cartResponse = await apiFetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: saveData.sessionId,
          product_type: 'chemistry_set',
          perfume_name: `${perfumeA?.name || '향수 A'} x ${perfumeB?.name || '향수 B'}`,
          perfume_brand: "AC'SCENT",
          twitter_name: `${character1Name} x ${character2Name}`,
          size: selectedSize,
          price: selectedOption.price,
          quantity: 1,
        }),
      })
      const cartData = await cartResponse.json()
      if (cartData.success) {
        showToast(t('chemistry.buttons.addedToCart') || "장바구니에 추가되었습니다!", "success")
      } else {
        throw new Error(cartData.error)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : (t('chemistry.buttons.addFailed') || '장바구니 추가에 실패했습니다.')
      showToast(msg, "error")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="px-4">
      <div className="bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_black] overflow-hidden">
        {/* 헤더 — 더 시각적으로 */}
        <div className="bg-gradient-to-r from-violet-500 to-pink-500 p-5 text-center text-white relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full" />
          <Package className="w-8 h-8 mx-auto mb-2 relative z-10" />
          <h2 className="text-lg font-black relative z-10">{t('chemistry.result.purchase')}</h2>
          <p className="text-xs text-white/80 mt-1 relative z-10">{t('chemistry.description')}</p>
        </div>

        {/* 향수 세트 시각화 — 두 향수 나란히 */}
        <div className="p-5 border-b-2 border-slate-100">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center flex-1">
              <div
                className="w-14 h-14 rounded-full border-2 border-violet-300 mx-auto shadow-[2px_2px_0_0_#8b5cf6]"
                style={{ background: perfumeA ? `linear-gradient(135deg, ${perfumeA.primaryColor}, ${perfumeA.secondaryColor})` : '#ddd' }}
              />
              <span className="text-xs font-bold text-slate-800 mt-1.5 block">{perfumeA?.name || '향수 A'}</span>
              <span className="text-[10px] text-violet-500 font-bold">{character1Name}</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-200 to-pink-200 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_black]">
                <span className="text-base font-black text-slate-800">+</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 mt-1 block">SET</span>
            </div>
            <div className="text-center flex-1">
              <div
                className="w-14 h-14 rounded-full border-2 border-pink-300 mx-auto shadow-[2px_2px_0_0_#ec4899]"
                style={{ background: perfumeB ? `linear-gradient(135deg, ${perfumeB.primaryColor}, ${perfumeB.secondaryColor})` : '#ddd' }}
              />
              <span className="text-xs font-bold text-slate-800 mt-1.5 block">{perfumeB?.name || '향수 B'}</span>
              <span className="text-[10px] text-pink-500 font-bold">{character2Name}</span>
            </div>
          </div>
        </div>

        {/* 사이즈 선택 */}
        <div className="p-5 space-y-3">
          {pricing.map((option) => (
            <motion.button
              key={option.size}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSize(option.size as 'set_10ml' | 'set_50ml')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedSize === option.size
                  ? 'border-violet-500 bg-violet-50 shadow-[2px_2px_0_0_#8b5cf6]'
                  : 'border-slate-200 bg-white hover:border-violet-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-black text-slate-900">{option.label}</span>
                </div>
                <span className="text-base font-black text-violet-600">{formatPrice(option.price)}{t('currency.suffix')}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* 구매 버튼 */}
        <div className="p-5 pt-0 space-y-2.5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-slate-900 text-white border-2 border-black shadow-[4px_4px_0_0_black] hover:shadow-[2px_2px_0_0_black] transition-all disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            <span>{isAdding ? (t('buttons.loading') || '추가 중...') : (t('chemistry.buttons.addToCart') || '장바구니 담기')}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              if (!user && !unifiedUser) {
                showToast(t('chemistry.buttons.loginRequired') || "로그인이 필요합니다.", "error")
                return
              }
              setIsAdding(true)
              try {
                const resultStr = sessionStorage.getItem('chemistry_result')
                if (!resultStr) throw new Error('분석 결과를 찾을 수 없습니다.')

                const formStr2 = sessionStorage.getItem('chemistry_form')
                const formMeta2 = formStr2 ? JSON.parse(formStr2) : {}

                const saveResponse = await apiFetch('/api/results/chemistry', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    analysisResult: JSON.parse(resultStr),
                    character1Name,
                    character2Name,
                    userId: user?.id || unifiedUser?.id,
                    serviceMode: formMeta2.serviceMode || 'online',
                  }),
                })
                const saveData = await saveResponse.json()
                if (!saveData.success) throw new Error(saveData.error || '결과 저장 실패')

                await apiFetch('/api/cart', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    analysis_id: saveData.sessionId,
                    product_type: 'chemistry_set',
                    perfume_name: `${perfumeA?.name || '향수 A'} x ${perfumeB?.name || '향수 B'}`,
                    perfume_brand: "AC'SCENT",
                    twitter_name: `${character1Name} x ${character2Name}`,
                    size: selectedSize,
                    price: selectedOption.price,
                    quantity: 1,
                  }),
                })

                // 체크아웃 페이지에 필요한 localStorage 데이터 설정
                localStorage.setItem('checkoutProductType', 'chemistry_set')
                localStorage.setItem('checkoutAnalysisId', saveData.sessionId)
                router.push('/checkout')
              } catch (error) {
                const msg = error instanceof Error ? error.message : '결제 진행에 실패했습니다.'
                showToast(msg, "error")
                setIsAdding(false)
              }
            }}
            disabled={isAdding}
            className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-violet-600 text-white border-2 border-violet-700 hover:bg-violet-700 transition-all disabled:opacity-50"
          >
            <CreditCard size={16} />
            <span>{t('checkout.orderProduct') || '바로 구매'}</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
