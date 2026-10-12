import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { kioskEnabled } from '@/lib/kiosk/access'
import { EXPERIENCE_IDS } from '@/lib/kiosk/experience'
import { isKioskLang } from '@/lib/kiosk/i18n'
import {
  SHARE_BUCKET, SHARE_DIR, SHARE_MAX_FILES, SHARE_MAX_TOTAL_BYTES, SHARE_TYPES,
  createShareToken, isShareExpired, isShareFileName, isShareToken, looksLike, shareFolder, sharePagePath,
  type ShareFileMeta, type ShareMeta, type ShareType,
} from '@/lib/kiosk/share'
import { putShareFile, putShareMeta } from '@/lib/kiosk/share-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 기기 한 대가 몰아 올리는 일 막기 — 서버 인스턴스 안에서 1분에 이만큼 */
const PER_MINUTE = 12
let windowStart = 0
let windowCount = 0

/**
 * 키오스크 체험 결과를 "휴대폰으로 받기"용으로 올린다(키오스크 전용, 비로그인)
 * POST /api/kiosk/share  { kind, lang, files: [{ name, type, label, data(base64) }] } → { token, path }
 * 손님이 받기를 누른 결과만, 24시간 보관한다(src/lib/kiosk/share.ts).
 */
export async function POST(request: NextRequest) {
  if (!kioskEnabled(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await request.json().catch(() => null)
    const kind = String(body?.kind ?? '')
    if (!(EXPERIENCE_IDS as readonly string[]).includes(kind)) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    const list: unknown[] = Array.isArray(body?.files) ? body.files : []
    if (!list.length || list.length > SHARE_MAX_FILES) return NextResponse.json({ error: '파일을 확인해 주세요' }, { status: 400 })

    const now = Date.now()
    if (now - windowStart > 60_000) { windowStart = now; windowCount = 0 }
    if (++windowCount > PER_MINUTE) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요' }, { status: 429 })

    const files: { meta: ShareFileMeta; bytes: Buffer }[] = []
    let total = 0
    for (const item of list) {
      const file = item as { name?: unknown; type?: unknown; label?: unknown; data?: unknown }
      const name = String(file?.name ?? '')
      const type = String(file?.type ?? '') as ShareType
      if (!isShareFileName(name) || !Object.hasOwn(SHARE_TYPES, type) || !name.endsWith(`.${SHARE_TYPES[type]}`) || typeof file.data !== 'string') {
        return NextResponse.json({ error: '파일 형식을 확인해 주세요' }, { status: 400 })
      }
      if (files.some((f) => f.meta.name === name)) return NextResponse.json({ error: '파일 이름이 겹칩니다' }, { status: 400 })
      const bytes = Buffer.from(file.data, 'base64')
      total += bytes.length
      if (total > SHARE_MAX_TOTAL_BYTES) return NextResponse.json({ error: '파일이 너무 큽니다' }, { status: 413 })
      if (!looksLike(type, bytes)) return NextResponse.json({ error: '파일이 손상되었습니다' }, { status: 400 })
      files.push({ meta: { name, type, size: bytes.length, label: String(file.label ?? '').slice(0, 60) }, bytes })
    }

    const client = createServiceRoleClient()
    const token = createShareToken(now)
    for (const file of files) {
      const error = await putShareFile(client, token, file.meta.name, file.meta.type, file.bytes)
      if (error) {
        console.error('[kiosk-share] 업로드 실패:', error)
        return NextResponse.json({ error: '파일을 올리지 못했습니다' }, { status: 500 })
      }
    }
    const meta: ShareMeta = { kind: kind as ShareMeta['kind'], lang: isKioskLang(body?.lang) ? body.lang : 'ko', files: files.map((f) => f.meta) }
    const metaError = await putShareMeta(client, token, meta)
    if (metaError) {
      console.error('[kiosk-share] 목록 저장 실패:', metaError)
      return NextResponse.json({ error: '파일을 올리지 못했습니다' }, { status: 500 })
    }

    await removeExpired(client)
    return NextResponse.json({ success: true, token, path: sharePagePath(token) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[kiosk-share] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/** 보관 기간이 지난 결과 정리 — 별도 스케줄러 없이 새 업로드가 올 때마다 오래된 것부터 지운다 */
async function removeExpired(client: ReturnType<typeof createServiceRoleClient>) {
  try {
    // 폴더 이름(토큰)은 생성 시각으로 시작해 이름순이 곧 시간순이다
    const { data: folders, error } = await client.storage.from(SHARE_BUCKET).list(SHARE_DIR, { limit: 40, sortBy: { column: 'name', order: 'asc' } })
    if (error || !folders) return
    for (const folder of folders) {
      if (!isShareToken(folder.name) || !isShareExpired(folder.name)) continue
      const { data: items } = await client.storage.from(SHARE_BUCKET).list(shareFolder(folder.name), { limit: 20 })
      if (!items?.length) continue
      const { error: removeError } = await client.storage.from(SHARE_BUCKET).remove(items.map((item) => `${shareFolder(folder.name)}/${item.name}`))
      if (removeError) console.error('[kiosk-share] 정리 실패:', removeError.message)
    }
  } catch (error) {
    // 정리는 다음 업로드 때 다시 시도하면 된다 — 손님 흐름을 막지 않는다
    console.error('[kiosk-share] 정리 오류:', error instanceof Error ? error.message : error)
  }
}
