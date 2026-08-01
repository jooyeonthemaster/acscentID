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
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
import Link from 'next/link'

interface RecipeData {
  id: string
  created_at: string
  perfume_name: string
  perfume_id: string
  generated_recipe: GeneratedRecipe
  retention_percentage: number
  selected_product: string | null
  result_id: string | null
}

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, unifiedUser } = useAuth()
  const { getLocalizedName } = useLocalizedPerfumes()
  // 카카오 사용자는 unifiedUser에만 있음
  const currentUser = unifiedUser || user
  const recipeId = params.id as string

  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('perfume_10ml')
  const [copied, setCopied] = useState(false)
  // 사주 프로그램 레시피 여부 — 디퓨저는 ml 대신 방울(총 10방울) 기준, 명칭 '디퓨저 클리커'
  const [isSaju, setIsSaju] = useState(false)

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
        // DB에 저장된 제품 타입이 있으면 반영
        if (data.selected_product && ['perfume_10ml', 'perfume_50ml', 'diffuser_5ml'].includes(data.selected_product)) {
          setSelectedProduct(data.selected_product as ProductType)
        }

        // 연결된 분석 결과로 사주 프로그램 여부 판별
        if (data.result_id) {
          const { data: analysis } = await supabase
            .from('analysis_results')
            .select('product_type')
            .eq('id', data.result_id)
            .single()
          setIsSaju(analysis?.product_type === 'saju_perfume')
        }
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

  // 방울 모드 — 사주 + 디퓨저 조합은 ml 일체 미노출, 방울 수만 표시
  const dropsMode = isSaju && selectedProduct === 'diffuser_5ml'
  const totalDrops = recipe?.generated_recipe?.totalDrops || 10
  const dropsOf = (id: string, ratio: number) => {
    const g = recipe?.generated_recipe?.granules.find((x) => x.id === id)
    return g?.drops ?? Math.round((ratio / 100) * totalDrops)
  }
  // 사주에서 디퓨저 제품명은 '디퓨저 클리커'
  const productLabelOf = (p: { id: ProductType; label: string }) =>
    isSaju && p.id === 'diffuser_5ml' ? '디퓨저 클리커' : p.label

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

    const amountLine = (g: (typeof granuleAmounts)[number]) =>
      dropsMode
        ? `- ${g.name} (${g.id}): ${dropsOf(g.id, g.ratio)}방울 (${g.ratio}%)`
        : `- ${g.name} (${g.id}): ${g.amountMl.toFixed(2)}ml (${g.ratio}%)`
    const recipeText = `[${recipe.perfume_name} 커스텀 레시피 - ${productLabelOf(productInfo)}]

총 향료량: ${dropsMode ? `${totalDrops}방울` : `${totalAmount.ml.toFixed(2)}ml`}

${granuleAmounts.map(amountLine).join('\n')}

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-ink)]" />
      </div>
    )
  }

  // 에러 상태
  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] px-5">
        <div className="text-center">
          <p className="text-[var(--muted-ink)] mb-4">{error || '레시피를 찾을 수 없습니다'}</p>
          <Link
            href="/mypage"
            className="text-[var(--muted-ink)] font-semibold hover:underline"
          >
            Back to My Page
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] pb-20">
      <div className="relative z-10 px-5 py-6 max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/mypage"
            className="p-2 rounded-[6px] hover:bg-[var(--soft)] transition-colors"
          >
            <ChevronLeft size={20} className="text-[var(--muted-ink)]" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[var(--ink)]">{recipe.perfume_name}</h1>
            <p className="text-xs lg:text-sm text-[var(--muted-ink)] flex items-center gap-1">
              <Calendar size={11} />
              {new Date(recipe.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 rounded-[6px] hover:bg-red-50 text-[var(--muted-ink)] hover:text-red-500 transition-colors"
            title="삭제"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* 제품 타입 선택 */}
        <div className="space-y-3 mb-5">
          <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)] flex items-center gap-2">
            <Beaker size={14} className="text-[var(--muted-ink)]" />
            제품 용량 선택
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((product) => {
              const isSelected = selectedProduct === product.id
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={`p-3 rounded-[6px] border-2 transition-all text-center ${
                    isSelected
                      ? 'border-[var(--line)] bg-[var(--canvas)] shadow-md'
                      : 'border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line)] hover:bg-[var(--canvas)]/50'
                  }`}
                >
                  <span className="text-2xl block mb-1">{product.icon}</span>
                  <p className={`text-xs lg:text-sm font-bold ${isSelected ? 'text-[var(--muted-ink)]' : 'text-[var(--muted-ink)]'}`}>
                    {productLabelOf(product)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 용량 정보 */}
        <div className="bg-gradient-to-br from-[var(--canvas)] to-[var(--canvas)] rounded-[6px] p-4 border border-stone-200/50 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{productInfo.icon}</span>
              <div>
                <p className="font-bold text-[var(--ink)]">{productLabelOf(productInfo)}</p>
                {/* 방울 모드에서는 ml 단위를 일체 노출하지 않는다 */}
                <p className="text-xs lg:text-sm text-[var(--muted-ink)]">
                  {dropsMode ? productInfo.description : `전체 ${productInfo.totalVolumeMl}ml`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs lg:text-sm text-[var(--muted-ink)]">총 향료량</p>
              <p className="text-xl font-black text-[var(--muted-ink)]">
                {dropsMode ? `${totalDrops}방울` : `${productInfo.fragranceVolumeMl}ml`}
              </p>
            </div>
          </div>
        </div>

        {/* 향료별 계량 */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)] flex items-center gap-2">
              <Scale size={14} className="text-[var(--muted-ink)]" />
              향료별 계량
            </h3>
            <button
              onClick={handleCopyRecipe}
              className="flex items-center gap-1 text-xs lg:text-sm text-[var(--muted-ink)] hover:text-[var(--muted-ink)] transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={14} className="text-[var(--muted-ink)]" />
                  <span className="text-[var(--muted-ink)]">복사됨!</span>
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
              const textColorClass = isLightColor(bgColor) ? 'text-[var(--ink)]' : 'text-[var(--ink)]'

              return (
                <motion.div
                  key={granule.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[var(--paper)] rounded-[6px] p-3 border border-[var(--line)] shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-[6px] flex flex-col items-center justify-center font-bold shadow-md flex-shrink-0 ${textColorClass}`}
                      style={{ backgroundColor: bgColor }}
                    >
                      <span className="text-sm lg:text-base font-black">
                        {dropsMode ? dropsOf(granule.id, granule.ratio) : granule.amountMl.toFixed(1)}
                      </span>
                      <span className="text-[8px] opacity-80">{dropsMode ? '방울' : 'ml'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--ink)] text-sm lg:text-base">{getLocalizedName(granule.id, granule.name)}</span>
                        <span className="text-[10px] lg:text-[12px] px-1.5 py-0.5 bg-[var(--soft)] text-[var(--muted-ink)] rounded-full">
                          {granule.ratio}%
                        </span>
                      </div>
                      <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)] font-medium">{granule.id}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-[var(--muted-ink)]">
                        {dropsMode ? `${dropsOf(granule.id, granule.ratio)}방울` : `${granule.amountMl.toFixed(2)}ml`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* 합계 */}
        <div className="bg-[var(--soft)] rounded-[6px] p-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm lg:text-base font-bold text-[var(--muted-ink)]">총 향료량</span>
            <p className="text-xl font-black text-[var(--ink)]">
              {dropsMode ? `${totalDrops}방울` : `${totalAmount.ml.toFixed(2)}ml`}
            </p>
          </div>
        </div>

        {/* 레시피 설명 */}
        {recipe.generated_recipe.overallExplanation && (
          <div className="bg-[var(--paper)] rounded-[6px] p-4 border border-[var(--line)] shadow-sm">
            <h3 className="text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-2">레시피 설명</h3>
            <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed whitespace-pre-wrap">
              {recipe.generated_recipe.overallExplanation}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
