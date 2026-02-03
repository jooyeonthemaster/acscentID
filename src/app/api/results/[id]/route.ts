import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// GET: 분석 결과 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // Supabase에서 조회
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: '결과를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 조회수 증가 (비동기로 처리, 응답 차단 X)
    supabase
      .from('analysis_results')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id)
      .then(() => {})

    return NextResponse.json({
      success: true,
      result: {
        id: data.id,
        createdAt: data.created_at,
        userImageUrl: data.user_image_url,
        analysisData: data.analysis_data,
        twitterName: data.twitter_name,
        perfumeName: data.perfume_name,
        perfumeBrand: data.perfume_brand,
        matchingKeywords: data.matching_keywords,
        viewCount: data.view_count,
        idolName: data.idol_name,
        idolGender: data.idol_gender,
        serviceMode: data.service_mode || 'online',
        productType: data.product_type || 'image_analysis',
        // 피규어 모드 전용 필드
        modelingImageUrl: data.modeling_image_url || null,
        modelingRequest: data.modeling_request || null
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
