import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 폰이 QR로 올린 사진을 키오스크가 받아오는 중계 라우트.
// Storage URL을 클라이언트가 직접 불러오면 교차 출처가 되어 캔버스가 오염되고(getImageData 불가)
// 영수증 디더링이 막힌다. 서버가 대신 받아 같은 출처로 내려주고, 촬영본과 같은 규격으로 맞춘다.

const MAX_EDGE = 960 // 카메라 촬영본(720x960)과 동일한 상한
const JPEG_QUALITY = 80
const BUCKET_NAME = 'analysis-images'

/** 키오스크가 받아간 사진은 즉시 지우고 세션을 닫는다 (실패해도 전달은 계속) */
async function consumeSession(
  client: ReturnType<typeof createServiceRoleClient>,
  sessionId: string,
  photoUrl: string
) {
  try {
    // 공개 URL에서 버킷 내부 경로만 잘라낸다: .../object/public/analysis-images/<path>
    const marker = `/object/public/${BUCKET_NAME}/`
    const idx = photoUrl.indexOf(marker)
    if (idx >= 0) {
      const objectPath = decodeURIComponent(photoUrl.slice(idx + marker.length).split('?')[0])
      const { error } = await client.storage.from(BUCKET_NAME).remove([objectPath])
      if (error) console.error('[kiosk/photo] 사진 삭제 실패:', error)
    } else {
      console.error('[kiosk/photo] 사진 경로를 해석하지 못했습니다:', photoUrl)
    }
    await client
      .from('photobooth_sessions')
      .update({ status: 'expired', photo_url: null })
      .eq('id', sessionId)
  } catch (e) {
    console.error('[kiosk/photo] 세션 소진 처리 실패:', e)
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase() ?? ''
  if (!/^PB-[A-Z2-9]{6}$/.test(code)) {
    return NextResponse.json({ error: 'INVALID_CODE' }, { status: 400 })
  }

  try {
    const serviceClient = createServiceRoleClient()
    const { data: session, error } = await serviceClient
      .from('photobooth_sessions')
      .select('id, status, photo_url, expires_at')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      console.error('[kiosk/photo] 세션 조회 실패:', error)
      return NextResponse.json({ error: 'SESSION_LOOKUP_FAILED' }, { status: 500 })
    }
    if (!session || session.status !== 'uploaded' || !session.photo_url) {
      return NextResponse.json({ error: 'NOT_UPLOADED' }, { status: 404 })
    }
    // 업로드된 세션도 TTL을 넘기면 만료시킨다 — 코드만 알면 언제까지나 남의 사진을
    // 받아갈 수 있는 창구가 되면 안 된다
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'EXPIRED' }, { status: 410 })
    }

    const upstream = await fetch(session.photo_url, { cache: 'no-store' })
    if (!upstream.ok) {
      console.error('[kiosk/photo] 원본 다운로드 실패:', upstream.status)
      return NextResponse.json({ error: 'FETCH_FAILED' }, { status: 502 })
    }

    const input = Buffer.from(await upstream.arrayBuffer())
    const output = await sharp(input)
      .rotate() // EXIF 회전 반영 — 폰 세로 사진이 눕지 않게
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()

    // 전달 완료 = 세션 소진. 얼굴 사진을 공개 버킷에 남겨두지 않는다
    // ("사진은 분석에만 쓰고 보관하지 않는다"는 화면 고지와 실제 동작을 일치시킨다)
    await consumeSession(serviceClient, session.id, session.photo_url)

    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[kiosk/photo] 중계 실패:', e)
    return NextResponse.json({ error: 'RELAY_FAILED' }, { status: 500 })
  }
}
