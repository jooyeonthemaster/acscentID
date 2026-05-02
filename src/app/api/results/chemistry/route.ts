import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import type { ChemistryAnalysisResult } from '@/types/analysis'
import { getApiLocale } from '@/lib/api-locale'

interface ChemistryResultSaveRequest {
  analysisResult: ChemistryAnalysisResult
  character1Name: string
  character2Name: string
  character1ImageUrl?: string
  character2ImageUrl?: string
  userId?: string | null
  userFingerprint?: string | null
  serviceMode?: string
  pin?: string | null
  qrCode?: string | null
  // 케미 입력 데이터
  relationTropes?: string[]
  character1Archetypes?: string[]
  character2Archetypes?: string[]
  scenes?: string[]
  emotionKeywords?: string[]
  scentDirection?: number
  message?: string
  // 분석 대상 타입 (최애/나)
  targetType?: 'idol' | 'self' | null
}

export async function POST(request: NextRequest) {
  try {
    const body: ChemistryResultSaveRequest = await request.json()
    const locale = getApiLocale(request)

    const {
      analysisResult,
      character1Name,
      character2Name,
      character1ImageUrl,
      character2ImageUrl,
      userId,
      userFingerprint,
      serviceMode,
      pin,
      qrCode,
      relationTropes,
      character1Archetypes,
      character2Archetypes,
      scenes,
      emotionKeywords,
      scentDirection,
      message,
      targetType,
    } = body

    const resolvedTargetType: 'idol' | 'self' = targetType === 'self' ? 'self' : 'idol'

    if (!analysisResult || !character1Name || !character2Name) {
      return NextResponse.json(
        { success: false, error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 1. 캐릭터 A 분석 결과 저장
    const perfumeA = analysisResult.characterA.matchingPerfumes[0]
    const { data: resultA, error: errorA } = await supabase
      .from('analysis_results')
      .insert({
        user_image_url: character1ImageUrl || null,
        analysis_data: analysisResult.characterA,
        twitter_name: character1Name,
        perfume_name: perfumeA?.persona?.name || 'Unknown',
        perfume_brand: "AC'SCENT",
        matching_keywords: analysisResult.characterA.matchingKeywords || [],
        user_id: userId || null,
        user_fingerprint: userFingerprint || null,
        idol_name: character1Name,
        product_type: 'chemistry_set',
        service_mode: serviceMode || 'online',
        pin: pin || null,
        qr_code_id: qrCode || null,
        locale: locale || 'ko',
        target_type: resolvedTargetType,
      })
      .select('id')
      .single()

    if (errorA) {
      console.error('[Chemistry Save] Character A insert error:', errorA)
      return NextResponse.json(
        { success: false, error: '캐릭터 A 저장 실패' },
        { status: 500 }
      )
    }

    // 2. 캐릭터 B 분석 결과 저장
    const perfumeB = analysisResult.characterB.matchingPerfumes[0]
    const { data: resultB, error: errorB } = await supabase
      .from('analysis_results')
      .insert({
        user_image_url: character2ImageUrl || null,
        analysis_data: analysisResult.characterB,
        twitter_name: character2Name,
        perfume_name: perfumeB?.persona?.name || 'Unknown',
        perfume_brand: "AC'SCENT",
        matching_keywords: analysisResult.characterB.matchingKeywords || [],
        user_id: userId || null,
        user_fingerprint: userFingerprint || null,
        idol_name: character2Name,
        product_type: 'chemistry_set',
        service_mode: serviceMode || 'online',
        pin: pin || null,
        qr_code_id: qrCode || null,
        locale: locale || 'ko',
        target_type: resolvedTargetType,
      })
      .select('id')
      .single()

    if (errorB) {
      console.error('[Chemistry Save] Character B insert error:', errorB)
      // [FIX] CRITICAL #6: 트랜잭션 롤백 — Character A가 성공했으므로 삭제
      await supabase.from('analysis_results').delete().eq('id', resultA.id)
      return NextResponse.json(
        { success: false, error: '캐릭터 B 저장 실패' },
        { status: 500 }
      )
    }

    // 3. 레이어링 세션 저장
    const { data: session, error: sessionError } = await supabase
      .from('layering_sessions')
      .insert({
        analysis_a_id: resultA.id,
        analysis_b_id: resultB.id,
        user_id: userId || null,
        user_fingerprint: userFingerprint || null,
        character_a_name: character1Name,
        character_b_name: character2Name,
        relation_trope: relationTropes?.join(', ') || null,
        character_a_archetype: character1Archetypes?.join(', ') || null,
        character_b_archetype: character2Archetypes?.join(', ') || null,
        scene: scenes?.join(', ') || null,
        emotion_keywords: emotionKeywords || [],
        scent_direction: scentDirection ?? 50,
        message: message || null,
        chemistry_data: analysisResult.chemistry,
        chemistry_type: analysisResult.chemistry.chemistryType,
        chemistry_title: analysisResult.chemistry.chemistryTitle,
        character_a_image_url: character1ImageUrl || null,
        character_b_image_url: character2ImageUrl || null,
        service_mode: serviceMode || 'online',
        pin: pin || null,
        qr_code_id: qrCode || null,
        locale: locale || 'ko',
        target_type: resolvedTargetType,
      })
      .select('id')
      .single()

    if (sessionError) {
      console.error('[Chemistry Save] Layering session insert error:', sessionError)
      // [FIX] CRITICAL #6: 트랜잭션 롤백 — 이전 INSERT 삭제
      await supabase.from('analysis_results').delete().eq('id', resultA.id)
      await supabase.from('analysis_results').delete().eq('id', resultB.id)
      return NextResponse.json(
        { success: false, error: '레이어링 세션 저장 실패' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysisAId: resultA.id,
      analysisBId: resultB.id,
      sessionId: session.id,
    })

  } catch (error) {
    console.error('[Chemistry Save] API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
