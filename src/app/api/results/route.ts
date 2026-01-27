import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { ImageAnalysisResult } from '@/types/analysis'

// POST: 분석 결과 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userImageUrl,
      analysisData,
      twitterName,
      perfumeName,
      perfumeBrand,
      matchingKeywords,
      userId,
      userFingerprint,
      idolName,
      idolGender,
      // 피규어 디퓨저 온라인 모드 전용
      modelingImageUrl,
      modelingRequest,
      productType,
      serviceMode
    } = body as {
      userImageUrl?: string
      analysisData: ImageAnalysisResult
      twitterName: string
      perfumeName: string
      perfumeBrand: string
      matchingKeywords?: string[]
      userId?: string | null
      userFingerprint?: string | null
      idolName?: string | null
      idolGender?: string | null
      // 피규어 디퓨저 온라인 모드 전용
      modelingImageUrl?: string | null
      modelingRequest?: string | null
      productType?: string | null
      serviceMode?: string | null
    }

    // 필수 데이터 검증
    if (!analysisData || !twitterName || !perfumeName || !perfumeBrand) {
      return NextResponse.json(
        { success: false, error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // Supabase에 저장 (user_id, user_fingerprint 포함)
    const { data, error } = await supabase
      .from('analysis_results')
      .insert({
        user_image_url: userImageUrl || null,
        analysis_data: analysisData,
        twitter_name: twitterName,
        perfume_name: perfumeName,
        perfume_brand: perfumeBrand,
        matching_keywords: matchingKeywords || [],
        user_id: userId || null,
        user_fingerprint: userFingerprint || null,
        idol_name: idolName || null,
        idol_gender: idolGender || null,
        // 피규어 디퓨저 온라인 모드 전용
        modeling_image_url: modelingImageUrl || null,
        modeling_request: modelingRequest || null,
        modeling_submitted_at: modelingImageUrl ? new Date().toISOString() : null,
        product_type: productType || 'image_analysis',
        service_mode: serviceMode || 'online'
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { success: false, error: '저장 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data.id
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
