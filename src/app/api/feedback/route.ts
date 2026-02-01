import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import {
  CategoryPreferences,
  SpecificScent,
  GeneratedRecipe,
  FeedbackRow,
  transformFeedbackRow,
  SelectedRecipeType,
} from '@/types/feedback'

// ============================================
// POST: 새 피드백 저장
// ============================================
export async function POST(request: NextRequest) {
  const requestId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${requestId}] Feedback POST request received`)

  try {
    const body = await request.json()
    const {
      resultId,
      perfumeId,
      perfumeName,
      retentionPercentage,
      categoryPreferences,
      specificScents,
      notes,
      generatedRecipe,
      userFingerprint,
      naturalLanguageFeedback,
      selectedRecipeType,
    } = body as {
      resultId?: string
      perfumeId: string
      perfumeName: string
      retentionPercentage: number
      categoryPreferences: CategoryPreferences
      specificScents: SpecificScent[]
      notes?: string
      generatedRecipe?: GeneratedRecipe
      userFingerprint?: string
      naturalLanguageFeedback?: string
      selectedRecipeType?: SelectedRecipeType
    }

    // 유효성 검사
    if (!perfumeId || !perfumeName) {
      console.log(`[${requestId}] Validation failed: missing perfume info`)
      return NextResponse.json(
        { success: false, error: '향수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (
      typeof retentionPercentage !== 'number' ||
      retentionPercentage < 0 ||
      retentionPercentage > 100
    ) {
      console.log(`[${requestId}] Validation failed: invalid retention percentage`)
      return NextResponse.json(
        { success: false, error: '잔향률은 0-100% 사이여야 합니다.' },
        { status: 400 }
      )
    }

    // Supabase에 저장
    const insertData = {
      result_id: resultId || null,
      perfume_id: perfumeId,
      perfume_name: perfumeName,
      retention_percentage: retentionPercentage,
      category_preferences: categoryPreferences,
      specific_scents: specificScents || [],
      notes: notes || null,
      generated_recipe: generatedRecipe || null,
      user_fingerprint: userFingerprint || null,
      natural_language_feedback: naturalLanguageFeedback || null,
      selected_recipe_type: selectedRecipeType || null,
    }

    console.log(`[${requestId}] Inserting feedback for perfume: ${perfumeName}`)

    const { data, error } = await supabase
      .from('perfume_feedbacks')
      .insert(insertData)
      .select('id, created_at')
      .single()

    if (error) {
      console.error(`[${requestId}] Supabase insert error:`, error)
      return NextResponse.json(
        { success: false, error: '피드백 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    console.log(`[${requestId}] Feedback saved successfully: ${data.id}`)

    return NextResponse.json({
      success: true,
      id: data.id,
      createdAt: data.created_at,
    })
  } catch (error) {
    console.error(`[${requestId}] API error:`, error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ============================================
// GET: 피드백 목록 조회
// ============================================
export async function GET(request: NextRequest) {
  const requestId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${requestId}] Feedback GET request received`)

  try {
    const { searchParams } = new URL(request.url)
    const fingerprint = searchParams.get('fingerprint')
    const resultId = searchParams.get('resultId')
    const perfumeId = searchParams.get('perfumeId')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('perfume_feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50)) // 최대 50개

    // 필터 적용
    if (fingerprint) {
      query = query.eq('user_fingerprint', fingerprint)
      console.log(`[${requestId}] Filtering by fingerprint`)
    }

    if (resultId) {
      query = query.eq('result_id', resultId)
      console.log(`[${requestId}] Filtering by resultId: ${resultId}`)
    }

    if (perfumeId) {
      query = query.eq('perfume_id', perfumeId)
      console.log(`[${requestId}] Filtering by perfumeId: ${perfumeId}`)
    }

    const { data, error } = await query

    if (error) {
      console.error(`[${requestId}] Supabase query error:`, error)
      return NextResponse.json(
        { success: false, error: '피드백 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // camelCase로 변환
    const feedbacks = (data as FeedbackRow[]).map(transformFeedbackRow)

    console.log(`[${requestId}] Returning ${feedbacks.length} feedbacks`)

    return NextResponse.json({
      success: true,
      feedbacks,
    })
  } catch (error) {
    console.error(`[${requestId}] API error:`, error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
