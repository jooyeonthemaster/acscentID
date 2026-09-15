import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'analysis-images'
const MAX_SIZE_MB = 8

/**
 * 고객 폰 사진 업로드 (QR 경유 /booth/upload/[code] 전용, 비로그인 공개)
 * POST /api/photobooth/upload  { code, imageBase64 }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''

    if (!/^PB-[A-Z2-9]{6}$/.test(code)) {
      return NextResponse.json({ error: '잘못된 세션 코드입니다' }, { status: 400 })
    }
    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json({ error: '올바른 이미지 형식이 아닙니다' }, { status: 400 })
    }

    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      return NextResponse.json({ error: '이미지 데이터가 손상되었습니다' }, { status: 400 })
    }

    const buffer = Buffer.from(base64Data, 'base64')
    if (buffer.length / (1024 * 1024) > MAX_SIZE_MB) {
      return NextResponse.json(
        { error: `이미지 크기가 ${MAX_SIZE_MB}MB를 초과합니다` },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 세션 유효성 확인 (대기 중 + 만료 전)
    const { data: session, error: sessionError } = await serviceClient
      .from('photobooth_sessions')
      .select('id, status, expires_at')
      .eq('code', code)
      .maybeSingle()

    if (sessionError) {
      console.error('Photobooth upload session fetch failed:', sessionError)
      return NextResponse.json({ error: '세션 조회에 실패했습니다' }, { status: 500 })
    }
    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 })
    }
    if (session.status !== 'waiting' || new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: '만료된 세션입니다. 부스 화면에서 QR을 다시 발급해주세요' },
        { status: 410 }
      )
    }

    const filePath = `photobooth/${code}_${Date.now()}.jpg`
    const { data: uploaded, error: uploadError } = await serviceClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Photobooth upload storage error:', uploadError)
      return NextResponse.json({ error: '업로드에 실패했습니다' }, { status: 500 })
    }

    const { data: urlData } = serviceClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploaded.path)

    const { error: updateError } = await serviceClient
      .from('photobooth_sessions')
      .update({ status: 'uploaded', photo_url: urlData.publicUrl })
      .eq('id', session.id)

    if (updateError) {
      console.error('Photobooth session update failed:', updateError)
      return NextResponse.json({ error: '업로드 처리에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, photoUrl: urlData.publicUrl })
  } catch (error) {
    console.error('Photobooth upload POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
