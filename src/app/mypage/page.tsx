'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { ProfileHeader } from './components/ProfileHeader'
import { SavedRecipeList } from './components/SavedRecipeList'
import { SavedAnalysisList } from './components/SavedAnalysisList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, Beaker, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface AnalysisResult {
  id: string
  created_at: string
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  analysis_data: object
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

export default function MyPage() {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [recipes, setRecipes] = useState<RecipeResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('recipes')

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)

      try {
        // 분석 결과 조회
        const { data: analysisData, error: analysisError } = await supabase
          .from('analysis_results')
          .select('id, created_at, twitter_name, perfume_name, perfume_brand, user_image_url, analysis_data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (analysisError) {
          console.error('Failed to fetch analyses:', analysisError)
        } else {
          setAnalyses(analysisData || [])
        }

        // 레시피 조회 (generated_recipe가 있는 것만)
        const { data: recipeData, error: recipeError } = await supabase
          .from('perfume_feedbacks')
          .select('id, created_at, perfume_name, perfume_id, generated_recipe, retention_percentage')
          .eq('user_id', user.id)
          .not('generated_recipe', 'is', null)
          .order('created_at', { ascending: false })

        if (recipeError) {
          console.error('Failed to fetch recipes:', recipeError)
        } else {
          setRecipes(recipeData || [])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // 레시피 삭제
  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('이 레시피를 삭제할까요?')) return

    try {
      const { error } = await supabase
        .from('perfume_feedbacks')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Failed to delete recipe:', error)
        alert('삭제에 실패했습니다')
        return
      }

      setRecipes((prev) => prev.filter((r) => r.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  // 분석 결과 삭제
  const handleDeleteAnalysis = async (id: string) => {
    if (!confirm('이 분석 결과를 삭제할까요?')) return

    try {
      const { error } = await supabase
        .from('analysis_results')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Failed to delete analysis:', error)
        alert('삭제에 실패했습니다')
        return
      }

      setAnalyses((prev) => prev.filter((a) => a.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
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
        <ProfileHeader user={user} />

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
