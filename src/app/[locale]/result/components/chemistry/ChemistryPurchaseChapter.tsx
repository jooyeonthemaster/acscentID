"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ShoppingCart, Package, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/api-client"
import type { ImageAnalysisResult } from "@/types/analysis"
import { formatPrice } from "@/types/cart"
import { useProductPricing } from "@/hooks/useProductPricing"
import { useLocalizedPerfumes } from "@/hooks/useLocalizedPerfumes"
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
  const { getLocalizedName } = useLocalizedPerfumes()
  const [selectedSize, setSelectedSize] = useState<'set_10ml' | 'set_50ml'>('set_10ml')
  const [isAdding, setIsAdding] = useState(false)
  const { getOptions, getOption } = useProductPricing()

  const pricing = getOptions('chemistry_set')
  const selectedOption = getOption('chemistry_set', selectedSize) ?? pricing[0]

  const perfumeA = characterA.matchingPerfumes[0]?.persona
  const perfumeB = characterB.matchingPerfumes[0]?.persona
  const perfumeAId = characterA.matchingPerfumes[0]?.perfumeId
  const perfumeBId = characterB.matchingPerfumes[0]?.perfumeId
  const perfumeAName = perfumeAId ? getLocalizedName(perfumeAId, perfumeA?.name) : perfumeA?.name
  const perfumeBName = perfumeBId ? getLocalizedName(perfumeBId, perfumeB?.name) : perfumeB?.name

  const handleAddToCart = async () => {
    if (!user && !unifiedUser) {
      showToast(t('chemistry.buttons.loginRequired'), "error")
      return
    }
    setIsAdding(true)
    try {
      const resultStr = sessionStorage.getItem('chemistry_result')
      if (!resultStr) throw new Error(t('chemistry.buttons.noResult'))

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
          targetType: formMeta.targetType || 'idol',
        }),
      })

      const saveData = await saveResponse.json()
      if (!saveData.success) {
        throw new Error(saveData.error || t('chemistry.errors.saveFailed'))
      }

      const cartResponse = await apiFetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layering_session_id: saveData.sessionId,
          product_type: 'chemistry_set',
          perfume_name: `${perfumeAName || t('chemistry.fallback.perfumeA')} x ${perfumeBName || t('chemistry.fallback.perfumeB')}`,
          perfume_brand: "AC'SCENT",
          twitter_name: `${character1Name} x ${character2Name}`,
          size: selectedSize,
          price: selectedOption.price,
          quantity: 1,
        }),
      })
      const cartData = await cartResponse.json()
      if (cartData.success) {
        showToast(t('chemistry.buttons.addedToCart'), "success")
      } else {
        throw new Error(cartData.error)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('chemistry.buttons.addFailed')
      showToast(msg, "error")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="px-4">
      <div className="bg-[#F5EFE2] border border-[#D8CFBB] rounded-[12px] overflow-hidden">
        {/* 헤더 — 더 시각적으로 */}
        <div className="bg-gradient-to-r from-[#EFE4C8] to-[#EFE4C8] p-5 text-center text-[#1A1610] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full" />
          <Package className="w-8 h-8 mx-auto mb-2 relative z-10" />
          <h2 className="text-lg font-bold relative z-10">{t('chemistry.result.purchase')}</h2>
          <p className="text-xs lg:text-sm text-[#5C564A] mt-1 relative z-10">{t('chemistry.description')}</p>
        </div>

        {/* 향수 세트 시각화 — 두 향수 나란히 */}
        <div className="p-5 border-b-2 border-[#1E222E]">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center flex-1">
              <div
                className="w-14 h-14 rounded-full border border-[#D8CFBB] mx-auto"
                style={{ background: perfumeA ? `linear-gradient(135deg, ${perfumeA.primaryColor}, ${perfumeA.secondaryColor})` : '#ddd' }}
              />
              <span className="text-xs lg:text-sm font-medium text-[#1A1610] mt-1.5 block">{perfumeAName || t('chemistry.fallback.perfumeA')}</span>
              <span className="text-[10px] lg:text-[12px] text-[#8B8578] font-medium">{character1Name}</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#D8CFBB] to-[#D8CFBB] border border-[#D8CFBB] flex items-center justify-center">
                <span className="text-base font-bold text-[#1A1610]">+</span>
              </div>
              <span className="text-[9px] font-medium text-[#8B8578] mt-1 block">SET</span>
            </div>
            <div className="text-center flex-1">
              <div
                className="w-14 h-14 rounded-full border border-[#D8CFBB] mx-auto"
                style={{ background: perfumeB ? `linear-gradient(135deg, ${perfumeB.primaryColor}, ${perfumeB.secondaryColor})` : '#ddd' }}
              />
              <span className="text-xs lg:text-sm font-medium text-[#1A1610] mt-1.5 block">{perfumeBName || t('chemistry.fallback.perfumeB')}</span>
              <span className="text-[10px] lg:text-[12px] text-[#8B8578] font-medium">{character2Name}</span>
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
              className={`w-full p-4 rounded-[12px] border text-left transition-all ${
                selectedSize === option.size
                  ? 'border-[#C9BFA8] bg-[#FDFAF1]'
                  : 'border-[#D8CFBB] bg-[#F5EFE2] hover:border-[#D8CFBB]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm lg:text-base font-bold text-[#1A1610]">{option.label}</span>
                </div>
                <span className="text-base font-bold text-[#5C564A]">{formatPrice(option.price)}{t('currency.suffix')}</span>
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
            className="w-full h-14 rounded-[12px] font-bold text-base flex items-center justify-center gap-2 bg-[#EFE4C8] text-[#1A1610] border border-[#D8CFBB] transition-all disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            <span>{isAdding ? t('chemistry.buttons.addingToCart') : t('chemistry.buttons.addToCart')}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              if (!user && !unifiedUser) {
                showToast(t('chemistry.buttons.loginRequired'), "error")
                return
              }
              setIsAdding(true)
              try {
                const resultStr = sessionStorage.getItem('chemistry_result')
                if (!resultStr) throw new Error(t('chemistry.buttons.noResult'))

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
                    targetType: formMeta2.targetType || 'idol',
                  }),
                })
                const saveData = await saveResponse.json()
                if (!saveData.success) throw new Error(saveData.error || t('chemistry.errors.saveFailed'))

                await apiFetch('/api/cart', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    layering_session_id: saveData.sessionId,
                    product_type: 'chemistry_set',
                    perfume_name: `${perfumeAName || t('chemistry.fallback.perfumeA')} x ${perfumeBName || t('chemistry.fallback.perfumeB')}`,
                    perfume_brand: "AC'SCENT",
                    twitter_name: `${character1Name} x ${character2Name}`,
                    size: selectedSize,
                    price: selectedOption.price,
                    quantity: 1,
                  }),
                })

                // 체크아웃 페이지에 필요한 localStorage 데이터 설정
                localStorage.setItem('checkoutProductType', 'chemistry_set')
                localStorage.setItem('checkoutLayeringSessionId', saveData.sessionId)
                router.push('/checkout')
              } catch (error) {
                const msg = error instanceof Error ? error.message : t('chemistry.errors.checkoutFailed')
                showToast(msg, "error")
                setIsAdding(false)
              }
            }}
            disabled={isAdding}
            className="w-full h-12 rounded-[12px] font-bold text-sm lg:text-base flex items-center justify-center gap-2 bg-[#EFE4C8] text-[#1A1610] border border-[#D8CFBB] hover:bg-[#EFE4C8] transition-all disabled:opacity-50"
          >
            <CreditCard size={16} />
            <span>{t('checkout.orderProduct')}</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
