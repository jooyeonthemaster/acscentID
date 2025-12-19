import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { FeedbackRow, transformFeedbackRow } from '@/types/feedback'

// ============================================
// GET: 단일 피드백 조회
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requestId = `fb_get_${Date.now()}`
  console.log(`[${requestId}] Fetching feedback: ${id}`)

  try {
    const { data, error } = await supabase
      .from('perfume_feedbacks')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.log(`[${requestId}] Feedback not found: ${id}`)
      return NextResponse.json(
        { success: false, error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const feedback = transformFeedbackRow(data as FeedbackRow)
    console.log(`[${requestId}] Feedback found: ${feedback.perfumeName}`)

    return NextResponse.json({
      success: true,
      feedback,
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
// DELETE: 피드백 삭제
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requestId = `fb_del_${Date.now()}`
  console.log(`[${requestId}] Deleting feedback: ${id}`)

  try {
    // 먼저 존재하는지 확인
    const { data: existing } = await supabase
      .from('perfume_feedbacks')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('perfume_feedbacks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`[${requestId}] Supabase delete error:`, error)
      return NextResponse.json(
        { success: false, error: '피드백 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    console.log(`[${requestId}] Feedback deleted successfully`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[${requestId}] API error:`, error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH: 피드백 업데이트 (레시피 추가 등)
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requestId = `fb_patch_${Date.now()}`
  console.log(`[${requestId}] Updating feedback: ${id}`)

  try {
    const body = await request.json()
    const { generatedRecipe, notes } = body

    const updateData: Record<string, unknown> = {}
    if (generatedRecipe !== undefined) {
      updateData.generated_recipe = generatedRecipe
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '업데이트할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('perfume_feedbacks')
      .update(updateData)
      .eq('id', id)
      .select('id, created_at')
      .single()

    if (error) {
      console.error(`[${requestId}] Supabase update error:`, error)
      return NextResponse.json(
        { success: false, error: '피드백 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    console.log(`[${requestId}] Feedback updated successfully`)

    return NextResponse.json({
      success: true,
      id: data.id,
    })
  } catch (error) {
    console.error(`[${requestId}] API error:`, error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
