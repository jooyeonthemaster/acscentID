import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  RESULT_PHOTO_BUCKET,
  RESULT_PHOTO_DIR,
  createResultToken,
  isResultExpired,
  isResultToken,
  resultPhotoPagePath,
  resultPhotoPath,
} from '@/lib/photobooth/result-photo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE_MB = 4
/** 부스 완성 직후에만 받는다 — 오래된 촬영 기록으로 아무 사진이나 올리는 걸 막는다 */
const SHOT_MAX_AGE_MS = 2 * 60 * 60 * 1000

/**
 * 부스 완성 사진을 "폰으로 받기"용으로 올린다 (부스 전용, 비로그인)
 * POST /api/photobooth/result  { shotId, imageBase64 } → { token, path }
 *
 * 손님이 [이미지 저장]을 누른 사진만, 24시간 보관한다 (src/lib/photobooth/result-photo.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const shotId = typeof body?.shotId === 'string' ? body.shotId : ''
    const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : ''

    if (!/^[0-9a-f-]{36}$/i.test(shotId)) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }
    if (!imageBase64.startsWith('data:image/jpeg;base64,')) {
      return NextResponse.json({ error: '올바른 이미지 형식이 아닙니다' }, { status: 400 })
    }
    const buffer = Buffer.from(imageBase64.slice('data:image/jpeg;base64,'.length), 'base64')
    // JPEG 시그니처(FF D8 FF) 확인 — 이름만 jpeg 인 다른 파일을 거른다
    if (buffer.length < 1024 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return NextResponse.json({ error: '이미지 데이터가 손상되었습니다' }, { status: 400 })
    }
    if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `이미지가 ${MAX_SIZE_MB}MB를 넘습니다` }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: shot, error: shotError } = await serviceClient
      .from('photobooth_shots')
      .select('id, created_at')
      .eq('id', shotId)
      .maybeSingle()
    if (shotError) {
      console.error('Photobooth result shot fetch failed:', shotError)
      return NextResponse.json({ error: '기록 조회에 실패했습니다' }, { status: 500 })
    }
    if (!shot || Date.now() - new Date(shot.created_at).getTime() > SHOT_MAX_AGE_MS) {
      return NextResponse.json({ error: '촬영 기록을 찾을 수 없습니다' }, { status: 404 })
    }

    const token = createResultToken()
    const { error: uploadError } = await serviceClient.storage
      .from(RESULT_PHOTO_BUCKET)
      .upload(resultPhotoPath(token), buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })
    if (uploadError) {
      console.error('Photobooth result upload failed:', uploadError)
      return NextResponse.json({ error: '사진을 올리지 못했습니다' }, { status: 500 })
    }

    // 통계: "저장" = 손님이 폰으로 받기를 요청한 건
    const { error: markError } = await serviceClient
      .from('photobooth_shots')
      .update({ downloaded: true })
      .eq('id', shot.id)
    if (markError) console.error('Photobooth result shot mark failed:', markError)

    await removeExpired(serviceClient)

    return NextResponse.json({ success: true, token, path: resultPhotoPagePath(token) })
  } catch (error) {
    console.error('Photobooth result POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/** 보관 기간이 지난 사진 정리 — 별도 스케줄러 없이 새 업로드가 올 때마다 오래된 것부터 지운다 */
async function removeExpired(serviceClient: ReturnType<typeof createServiceRoleClient>) {
  try {
    const { data: files, error } = await serviceClient.storage
      .from(RESULT_PHOTO_BUCKET)
      .list(RESULT_PHOTO_DIR, { limit: 200, sortBy: { column: 'created_at', order: 'asc' } })
    if (error || !files) return
    const expired = files
      .map((file) => file.name.replace(/\.jpg$/, ''))
      .filter((token) => isResultToken(token) && isResultExpired(token))
      .map((token) => resultPhotoPath(token))
    if (expired.length === 0) return
    const { error: removeError } = await serviceClient.storage.from(RESULT_PHOTO_BUCKET).remove(expired)
    if (removeError) console.error('Photobooth result cleanup failed:', removeError)
  } catch (error) {
    // 정리는 다음 업로드 때 다시 시도하면 된다 — 손님 흐름을 막지 않는다
    console.error('Photobooth result cleanup error:', error)
  }
}
