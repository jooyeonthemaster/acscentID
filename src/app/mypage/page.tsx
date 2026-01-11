'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileHeader } from './components/ProfileHeader'
import { SavedRecipeList } from './components/SavedRecipeList'
import { SavedAnalysisList } from './components/SavedAnalysisList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, Beaker, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface RecipeGranule {
  id: string
  name: string
  ratio: number
}

interface ConfirmedRecipe {
  granules: RecipeGranule[]
}

interface AnalysisResult {
  id: string
  created_at: string
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  analysis_data: object
  confirmed_recipe: ConfirmedRecipe | null  // 확정된 레시피
}

interface RecipeResult {
  id: string
  created_at: string
  perfume_name: string
  perfume_id: string
  generated_recipe: {
    granules: Array<{ id: string; name: string; ratio: number }>
    overallExplanation: string
  } | null
  retention_percentage: number
}

function MyPageContent() {
  const { user, unifiedUser } = useAuth()
  const searchParams = useSearchParams()
  // 카카오 사용자는 unifiedUser에만 있음
  const currentUser = unifiedUser || user
  const userId = unifiedUser?.id || user?.id
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [recipes, setRecipes] = useState<RecipeResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'recipes' ? 'recipes' : 'analyses')

  // API를 통해 데이터 조회 (RLS 우회)
  const fetchData = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      // fingerprint를 함께 전송하여 미연동 데이터도 조회 + 자동 연동
      const fingerprint = typeof window !== 'undefined'
        ? localStorage.getItem('user_fingerprint')
        : null
      const url = fingerprint
        ? `/api/user/data?fingerprint=${encodeURIComponent(fingerprint)}`
        : '/api/user/data'

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to fetch user data:', data.error)
        return
      }

      setAnalyses(data.analyses || [])
      setRecipes(data.recipes || [])

      if (data.analysisError) {
        console.error('Analysis fetch error:', data.analysisError)
      }
      if (data.recipeError) {
        console.error('Recipe fetch error:', data.recipeError)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 레시피 삭제 (API 사용)
  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('이 레시피를 삭제할까요?')) return

    try {
      const response = await fetch(`/api/user/recipe/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to delete recipe:', data.error)
        alert('삭제에 실패했습니다')
        return
      }

      setRecipes((prev) => prev.filter((r) => r.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 중 오류가 발생했습니다')
    }
  }

  // 분석 결과 삭제 (API 사용)
  const handleDeleteAnalysis = async (id: string) => {
    console.log('🔥 handleDeleteAnalysis 호출됨, ID:', id)
    console.log('✅ 삭제 진행 중...')

    try {
      const response = await fetch(`/api/user/analysis/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to delete analysis:', data.error)
        alert('삭제에 실패했습니다')
        return
      }

      setAnalyses((prev) => prev.filter((a) => a.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-amber-50 to-transparent" />
      </div>

      <div className="relative z-10 px-5 py-6 max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/result"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">마이페이지</h1>
        </div>

        {/* 프로필 헤더 */}
        <ProfileHeader user={user} unifiedUser={unifiedUser} />

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/80 rounded-2xl p-1.5 shadow-sm border border-slate-100">
            <TabsTrigger
              value="recipes"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2"
            >
              <Beaker size={14} />
              내 레시피 ({recipes.length})
            </TabsTrigger>
            <TabsTrigger
              value="analyses"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles size={14} />
              분석 결과 ({analyses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SavedRecipeList
                recipes={recipes}
                loading={loading}
                onDelete={handleDeleteRecipe}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="analyses" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SavedAnalysisList
                analyses={analyses}
                loading={loading}
                onDelete={handleDeleteAnalysis}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Force rebuild
export default function MyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
      <MyPageContent />
    </Suspense>
  )
}
