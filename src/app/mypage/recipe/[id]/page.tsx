'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, Beaker, Scale, Copy, CheckCircle2, Trash2, Calendar, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import {
  ProductType,
  PRODUCT_TYPES,
  calculateGranuleAmounts,
  GeneratedRecipe,
} from '@/types/feedback'
import { perfumes } from '@/data/perfumes'
import Link from 'next/link'

interface RecipeData {
  id: string
  created_at: string
  perfume_name: string
  perfume_id: string
  generated_recipe: GeneratedRecipe
  retention_percentage: number
}

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, unifiedUser } = useAuth()
  // 카카오 사용자는 unifiedUser에만 있음
  const currentUser = unifiedUser || user
  const recipeId = params.id as string

  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('perfume_10ml')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!recipeId || !currentUser) return

    const fetchRecipe = async () => {
      setLoading(true)
      setError(null)

      try {
        // 먼저 user_id로 조회 시도, 없으면 fingerprint로 조회
        let data = null
        let fetchError = null

        // user_id로 조회 (Google OAuth 사용자)
        const result = await supabase
          .from('perfume_feedbacks')
          .select('*')
          .eq('id', recipeId)
          .eq('user_id', currentUser.id)
          .single()

        data = result.data
        fetchError = result.error

        // user_id로 못 찾으면 fingerprint로 조회 (카카오 사용자 등)
        if (fetchError && typeof window !== 'undefined') {
          const fingerprint = localStorage.getItem('user_fingerprint')
          if (fingerprint) {
            const fpResult = await supabase
              .from('perfume_feedbacks')
              .select('*')
              .eq('id', recipeId)
              .eq('user_fingerprint', fingerprint)
              .single()

            data = fpResult.data
            fetchError = fpResult.error
          }
        }

        if (fetchError) {
          console.error('Failed to fetch recipe:', fetchError)
          setError('레시피를 찾을 수 없습니다')
          return
        }

        if (!data.generated_recipe) {
          setError('레시피 데이터가 없습니다')
          return
        }

        setRecipe(data)
      } catch (err) {
        console.error('Fetch error:', err)
        setError('로딩 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchRecipe()
  }, [recipeId, currentUser])

  // 선택된 제품 정보
  const productInfo = useMemo(() => {
    return PRODUCT_TYPES.find((p) => p.id === selectedProduct)!
  }, [selectedProduct])

  // 용량 계산
  const granuleAmounts = useMemo(() => {
    if (!recipe?.generated_recipe) return []
    return calculateGranuleAmounts(recipe.generated_recipe, selectedProduct)
  }, [recipe, selectedProduct])

  // 총 용량
  const totalAmount = useMemo(() => {
    return {
      ml: granuleAmounts.reduce((sum, g) => sum + g.amountMl, 0),
    }
  }, [granuleAmounts])

  // 향수 색상 가져오기
  const getGranuleColor = (id: string) => {
    const perfume = perfumes.find((p) => p.id === id)
    return perfume?.primaryColor || '#6B7280'
  }

  // 밝은 색상 판단
  const isLightColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 180
  }

  // 레시피 복사
  const handleCopyRecipe = async () => {
    if (!recipe) return

    const recipeText = `[${recipe.perfume_name} 커스텀 레시피 - ${productInfo.label}]

총 향료량: ${totalAmount.ml.toFixed(2)}ml

${granuleAmounts.map((g) => `- ${g.name} (${g.id}): ${g.amountMl.toFixed(2)}ml (${g.ratio}%)`).join('\n')}

AC'SCENT IDENTITY에서 생성됨`

    try {
      await navigator.clipboard.writeText(recipeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // 레시피 삭제
  const handleDelete = async () => {
    if (!recipe || !currentUser) return
    if (!confirm('이 레시피를 삭제할까요?')) return

    try {
      // user_id 또는 fingerprint로 삭제
      let error = null

      // 먼저 user_id로 삭제 시도
      const result = await supabase
        .from('perfume_feedbacks')
        .delete()
        .eq('id', recipe.id)
        .eq('user_id', currentUser.id)

      error = result.error

      // user_id로 삭제 실패시 fingerprint로 삭제 시도
      if (error && typeof window !== 'undefined') {
        const fingerprint = localStorage.getItem('user_fingerprint')
        if (fingerprint) {
          const fpResult = await supabase
            .from('perfume_feedbacks')
            .delete()
            .eq('id', recipe.id)
            .eq('user_fingerprint', fingerprint)

          error = fpResult.error
        }
      }

      if (error) {
        console.error('Delete error:', error)
        alert('삭제에 실패했습니다')
        return
      }

      router.push('/mypage')
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  // 에러 상태
  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-5">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error || '레시피를 찾을 수 없습니다'}</p>
          <Link
            href="/mypage"
            className="text-amber-600 font-semibold hover:underline"
          >
            마이페이지로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="relative z-10 px-5 py-6 max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/mypage"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{recipe.perfume_name}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={11} />
              {new Date(recipe.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="삭제"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* 제품 타입 선택 */}
        <div className="space-y-3 mb-5">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Beaker size={14} className="text-purple-500" />
            제품 용량 선택
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((product) => {
              const isSelected = selectedProduct === product.id
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/50'
                  }`}
                >
                  <span className="text-2xl block mb-1">{product.icon}</span>
                  <p className={`text-xs font-bold ${isSelected ? 'text-amber-700' : 'text-slate-700'}`}>
                    {product.label}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 용량 정보 */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200/50 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{productInfo.icon}</span>
              <div>
                <p className="font-bold text-slate-900">{productInfo.label}</p>
                <p className="text-xs text-slate-500">전체 {productInfo.totalVolumeMl}ml</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">총 향료량</p>
              <p className="text-xl font-black text-amber-600">{productInfo.fragranceVolumeMl}ml</p>
            </div>
          </div>
        </div>

        {/* 향료별 계량 */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Scale size={14} className="text-amber-500" />
              향료별 계량
            </h3>
            <button
              onClick={handleCopyRecipe}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className="text-green-600">복사됨!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>레시피 복사</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {granuleAmounts.map((granule, index) => {
              const bgColor = getGranuleColor(granule.id)
              const textColorClass = isLightColor(bgColor) ? 'text-slate-800' : 'text-white'

              return (
                <motion.div
                  key={granule.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold shadow-md flex-shrink-0 ${textColorClass}`}
                      style={{ backgroundColor: bgColor }}
                    >
                      <span className="text-sm font-black">{granule.amountMl.toFixed(1)}</span>
                      <span className="text-[8px] opacity-80">ml</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{granule.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          {granule.ratio}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{granule.id}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-amber-600">{granule.amountMl.toFixed(2)}ml</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* 합계 */}
        <div className="bg-slate-100 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">총 향료량</span>
            <p className="text-xl font-black text-slate-900">{totalAmount.ml.toFixed(2)}ml</p>
          </div>
        </div>

        {/* 레시피 설명 */}
        {recipe.generated_recipe.overallExplanation && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-2">레시피 설명</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {recipe.generated_recipe.overallExplanation}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
