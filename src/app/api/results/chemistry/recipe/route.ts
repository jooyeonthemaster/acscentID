import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import type { GeneratedRecipe, ProductType } from '@/types/feedback'

interface ChemistryRecipeSaveRequest {
  sessionId?: string | null
  analysisAId?: string | null
  analysisBId?: string | null
  recipeA: GeneratedRecipe
  recipeB: GeneratedRecipe
  selectedA?: 1 | 2 | null
  selectedB?: 1 | 2 | null
  productType?: ProductType
}

function mergeFinalRecipe(analysisData: unknown, recipe: GeneratedRecipe, meta: Record<string, unknown>) {
  const base = analysisData && typeof analysisData === 'object' && !Array.isArray(analysisData)
    ? analysisData as Record<string, unknown>
    : {}

  return {
    ...base,
    finalRecipe: recipe,
    final_recipe: recipe,
    chemistryRecipeMeta: meta,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChemistryRecipeSaveRequest = await request.json()
    const {
      sessionId,
      recipeA,
      recipeB,
      selectedA = null,
      selectedB = null,
      productType = 'perfume_10ml',
    } = body

    let { analysisAId, analysisBId } = body

    if (!recipeA?.granules?.length || !recipeB?.granules?.length) {
      return NextResponse.json(
        { success: false, error: '확정 레시피가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    let currentChemistryData: Record<string, unknown> = {}

    if (sessionId) {
      const { data: session, error } = await supabase
        .from('layering_sessions')
        .select('analysis_a_id, analysis_b_id, chemistry_data')
        .eq('id', sessionId)
        .single()

      if ((error || !session) && (!analysisAId || !analysisBId)) {
        return NextResponse.json(
          { success: false, error: '케미 세션을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      if (session) {
        analysisAId = analysisAId || session.analysis_a_id
        analysisBId = analysisBId || session.analysis_b_id
        currentChemistryData = session.chemistry_data || {}
      }
    }

    if (!analysisAId || !analysisBId) {
      return NextResponse.json(
        { success: false, error: '분석 ID가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const confirmedAt = new Date().toISOString()
    const meta = {
      confirmedAt,
      selectedA,
      selectedB,
      productType,
    }

    const { data: analyses, error: fetchError } = await supabase
      .from('analysis_results')
      .select('id, analysis_data')
      .in('id', [analysisAId, analysisBId])

    if (fetchError || !analyses || analyses.length < 2) {
      return NextResponse.json(
        { success: false, error: '분석 결과를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const analysisById = new Map(analyses.map((analysis) => [analysis.id, analysis]))
    const analysisA = analysisById.get(analysisAId)
    const analysisB = analysisById.get(analysisBId)

    if (!analysisA || !analysisB) {
      return NextResponse.json(
        { success: false, error: '분석 결과 매칭에 실패했습니다.' },
        { status: 404 }
      )
    }

    const { error: updateAError } = await supabase
      .from('analysis_results')
      .update({
        analysis_data: mergeFinalRecipe(analysisA.analysis_data, recipeA, { ...meta, role: 'A' }),
      })
      .eq('id', analysisAId)

    if (updateAError) {
      console.error('[Chemistry Recipe Save] analysis A update error:', updateAError)
      return NextResponse.json(
        { success: false, error: 'A 레시피 저장 실패' },
        { status: 500 }
      )
    }

    const { error: updateBError } = await supabase
      .from('analysis_results')
      .update({
        analysis_data: mergeFinalRecipe(analysisB.analysis_data, recipeB, { ...meta, role: 'B' }),
      })
      .eq('id', analysisBId)

    if (updateBError) {
      console.error('[Chemistry Recipe Save] analysis B update error:', updateBError)
      return NextResponse.json(
        { success: false, error: 'B 레시피 저장 실패' },
        { status: 500 }
      )
    }

    if (sessionId) {
      await supabase
        .from('layering_sessions')
        .update({
          chemistry_data: {
            ...currentChemistryData,
            confirmedRecipes: {
              recipeA,
              recipeB,
              selectedA,
              selectedB,
              productType,
              confirmedAt,
            },
          },
        })
        .eq('id', sessionId)
    }

    return NextResponse.json({ success: true, confirmedAt })
  } catch (error) {
    console.error('[Chemistry Recipe Save] API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
