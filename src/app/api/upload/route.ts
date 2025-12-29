/**
 * 이미지 업로드 API
 * POST /api/upload
 *
 * - base64 이미지를 받아 Supabase Storage에 업로드
 * - 서버사이드에서 처리하여 클라이언트 부담 감소
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

const BUCKET_NAME = 'analysis-images'
const MAX_SIZE_MB = 5

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, userId, fingerprint } = body as {
      imageBase64: string
      userId?: string | null
      fingerprint?: string | null
    }

    // 필수 데이터 검증
    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: '이미지 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 이미 URL인 경우 그대로 반환
    if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
      return NextResponse.json({
        success: true,
        url: imageBase64,
        path: null,
        size: 0
      })
    }

    // base64 형식 검증
    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: '올바른 이미지 형식이 아닙니다.' },
        { status: 400 }
      )
    }

    // 식별자 결정 (userId > fingerprint > anonymous)
    const identifier = userId || fingerprint || 'anonymous'

    // base64 데이터 추출
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64

    // base64 문자열 유효성 검사 (ASCII 문자만 허용)
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      console.error('[Upload API] Invalid base64 characters detected')
      return NextResponse.json(
        { success: false, error: '이미지 데이터가 손상되었습니다.' },
        { status: 400 }
      )
    }

    // Buffer로 변환 (에러 처리 포함)
    let buffer: Buffer
    try {
      buffer = Buffer.from(base64Data, 'base64')
    } catch (bufferError) {
      console.error('[Upload API] Buffer conversion error:', bufferError)
      return NextResponse.json(
        { success: false, error: '이미지 변환에 실패했습니다.' },
        { status: 400 }
      )
    }

    // 크기 검증 (5MB 제한)
    const sizeMB = buffer.length / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json(
        { success: false, error: `이미지 크기가 ${MAX_SIZE_MB}MB를 초과합니다.` },
        { status: 400 }
      )
    }

    // 파일 경로 생성
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filePath = `${identifier}/${timestamp}_${random}.jpg`

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1년 캐시
        upsert: false
      })

    if (error) {
      console.error('[Upload API] Storage error:', error)
      return NextResponse.json(
        { success: false, error: `업로드 실패: ${error.message}` },
        { status: 500 }
      )
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    console.log(`[Upload API] Success: ${filePath} (${(sizeMB).toFixed(2)} MB)`)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      size: buffer.length
    })

  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
