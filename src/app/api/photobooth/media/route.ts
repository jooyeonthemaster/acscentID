import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { IdolError, readIdolTicket } from '@/lib/booth/idol-generate'
import { createResultToken, isResultExpired, isResultToken } from '@/lib/photobooth/result-photo'
import {
  RESULT_MEDIA_BUCKET, RESULT_MEDIA_DIR, RESULT_MEDIA_MAX_BYTES, RESULT_MEDIA_TYPES,
  resultMediaPagePath, resultMediaPath,
} from '@/lib/photobooth/result-media'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }
const PER_MINUTE = 10
let windowStart = 0
let windowCount = 0

/**
 * 영상 결과 올리기 준비(부스 전용) — 한 번 쓰는 업로드 주소를 준다. 파일은 부스가 저장소로 바로 올린다(PUT).
 * POST /api/photobooth/media { ticket, mime, size } → { token, uploadUrl, path }
 * ticket: 이번 손님의 생성 표(이용권 확인·이용권 없는 모드·데모가 준 것) — 쓰지는 않고 서명·기한만 본다.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  try {
    const body = await request.json().catch(() => null)
    readIdolTicket(body?.ticket)
    const mime = typeof body?.mime === 'string' ? body.mime.split(';')[0].trim() : ''
    const size = Number(body?.size)
    if (!(RESULT_MEDIA_TYPES as readonly string[]).includes(mime)) return NextResponse.json({ error: '영상 형식을 확인해 주세요.' }, { status: 400, headers })
    if (!Number.isFinite(size) || size < 1024 || size > RESULT_MEDIA_MAX_BYTES) {
      return NextResponse.json({ error: '영상 크기를 확인해 주세요.' }, { status: 400, headers })
    }
    const now = Date.now()
    if (now - windowStart > 60_000) { windowStart = now; windowCount = 0 }
    if (++windowCount > PER_MINUTE) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429, headers })

    const client = createServiceRoleClient()
    const token = createResultToken()
    const { data, error } = await client.storage.from(RESULT_MEDIA_BUCKET).createSignedUploadUrl(resultMediaPath(token))
    if (error || !data) {
      console.error('[media] 업로드 주소 실패:', error?.message)
      // 버킷이 없으면 'The related resource does not exist'(statusCode 404) — SQL(20261015_photobooth_programs.sql) 실행 전
      const missing = /not found|does not exist/i.test(error?.message ?? '') || String((error as { statusCode?: unknown } | null)?.statusCode) === '404'
      return NextResponse.json(
        { error: missing ? '영상 보관 저장소가 아직 준비되지 않았어요. 직원에게 알려 주세요.' : '영상을 올릴 준비를 하지 못했어요.' },
        { status: missing ? 503 : 500, headers },
      )
    }
    void removeExpired(client)
    return NextResponse.json({ token, uploadUrl: data.signedUrl, path: resultMediaPagePath(token) }, { headers })
  } catch (error) {
    if (error instanceof IdolError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
    console.error('[media] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers })
  }
}

/** 보관 기간이 지난 영상 정리 — 새 업로드 때마다 오래된 것부터 */
async function removeExpired(client: ReturnType<typeof createServiceRoleClient>) {
  try {
    const { data } = await client.storage.from(RESULT_MEDIA_BUCKET).list(RESULT_MEDIA_DIR, { limit: 100, sortBy: { column: 'created_at', order: 'asc' } })
    const expired = (data ?? []).map((f) => f.name).filter((t) => isResultToken(t) && isResultExpired(t)).map(resultMediaPath)
    if (expired.length) await client.storage.from(RESULT_MEDIA_BUCKET).remove(expired)
  } catch (error) {
    console.error('[media] 정리 실패:', error instanceof Error ? error.message : error)
  }
}
