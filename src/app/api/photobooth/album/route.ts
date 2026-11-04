import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { IdolError, readIdolTicket } from '@/lib/booth/idol-generate'
import { sameOrigin } from '@/lib/screen-backgrounds/device-auth'
import {
  ALBUM_BUCKET, ALBUM_DIR, ALBUM_MAX, ALBUM_PHOTO_MAX_BYTES,
  albumExpiresAt, albumFolder, albumPagePath, albumPhotoName, createAlbumSession, isAlbumPhotoName, readAlbumToken,
} from '@/lib/photobooth/album'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }
type Client = ReturnType<typeof createServiceRoleClient>

const bucket = (client: Client) => client.storage.from(ALBUM_BUCKET)

async function listPhotos(client: Client, id: string) {
  const { data, error } = await bucket(client).list(albumFolder(id), { limit: 100, sortBy: { column: 'name', order: 'asc' } })
  if (error) throw new Error(error.message)
  return (data ?? []).filter((f) => isAlbumPhotoName(f.name)).map((f) => ({
    name: f.name,
    url: bucket(client).getPublicUrl(`${albumFolder(id)}/${f.name}`).data.publicUrl,
  }))
}

const SESSIONS_PER_MINUTE = 6
let sessionWindow = 0
let sessionCount = 0

/**
 * 추억 무비 업로드 세션
 * POST   { ticket }                       부스: 세션 만들기 → { token, path, expiresAt }
 * POST   { token, imageBase64 }           폰: 사진 한 장 올리기(JPEG, 3MB 이하, 세션당 20장) → { photos }
 * GET    ?token=                          부스·폰: 올라온 사진 목록 → { photos: [{ name, url }], expiresAt }
 * DELETE ?token=&name=                    한 장 지우기(name 없으면 모두) → { photos }
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  try {
    const body = await request.json().catch(() => null)
    const client = createServiceRoleClient()

    if (body?.ticket !== undefined) {
      readIdolTicket(body.ticket)
      const now = Date.now()
      if (now - sessionWindow > 60_000) { sessionWindow = now; sessionCount = 0 }
      if (++sessionCount > SESSIONS_PER_MINUTE) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429, headers })
      const session = createAlbumSession(now)
      void removeExpired(client)
      return NextResponse.json({ token: session.token, path: albumPagePath(session.token), expiresAt: session.expiresAt }, { headers })
    }

    const id = readAlbumToken(body?.token)
    if (!id) return NextResponse.json({ error: '업로드 시간이 지났어요. 부스 화면의 새 QR을 찍어 주세요.' }, { status: 410, headers })
    const image = typeof body?.imageBase64 === 'string' ? body.imageBase64 : ''
    if (!image.startsWith('data:image/jpeg;base64,')) return NextResponse.json({ error: 'JPEG 사진만 올릴 수 있어요.' }, { status: 400, headers })
    const buffer = Buffer.from(image.slice('data:image/jpeg;base64,'.length), 'base64')
    if (buffer.length < 1024 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return NextResponse.json({ error: '사진이 손상되었어요.' }, { status: 400, headers })
    }
    if (buffer.length > ALBUM_PHOTO_MAX_BYTES) return NextResponse.json({ error: '사진이 너무 커요.' }, { status: 413, headers })
    const before = await listPhotos(client, id)
    if (before.length >= ALBUM_MAX) return NextResponse.json({ error: `사진은 ${ALBUM_MAX}장까지 올릴 수 있어요.`, photos: before }, { status: 409, headers })
    const { error } = await bucket(client).upload(`${albumFolder(id)}/${albumPhotoName()}`, buffer, { contentType: 'image/jpeg', upsert: false })
    if (error) {
      console.error('[album] 올리기 실패:', error.message)
      return NextResponse.json({ error: '사진을 올리지 못했어요. 다시 시도해 주세요.' }, { status: 500, headers })
    }
    return NextResponse.json({ photos: await listPhotos(client, id), expiresAt: albumExpiresAt(id) }, { headers })
  } catch (error) {
    if (error instanceof IdolError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
    console.error('[album] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500, headers })
  }
}

export async function GET(request: NextRequest) {
  const id = readAlbumToken(request.nextUrl.searchParams.get('token'))
  if (!id) return NextResponse.json({ error: '업로드 시간이 지났어요.', expired: true }, { status: 410, headers })
  try {
    return NextResponse.json({ photos: await listPhotos(createServiceRoleClient(), id), expiresAt: albumExpiresAt(id) }, { headers })
  } catch (error) {
    console.error('[album] 목록 실패:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '사진 목록을 불러오지 못했어요.' }, { status: 500, headers })
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers })
  // 영상을 다 만든 뒤 지울 때는 세션이 막 만료됐을 수 있다 — 서명만 맞으면 지우게 둔다
  const token = request.nextUrl.searchParams.get('token')
  const id = readAlbumToken(token, 0)
  if (!id) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400, headers })
  const name = request.nextUrl.searchParams.get('name')
  try {
    const client = createServiceRoleClient()
    const targets = name ? (isAlbumPhotoName(name) ? [name] : []) : (await listPhotos(client, id)).map((p) => p.name)
    if (targets.length) await bucket(client).remove(targets.map((n) => `${albumFolder(id)}/${n}`))
    return NextResponse.json({ photos: albumExpiresAt(id) > Date.now() ? await listPhotos(client, id) : [] }, { headers })
  } catch (error) {
    console.error('[album] 지우기 실패:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '사진을 지우지 못했어요.' }, { status: 500, headers })
  }
}

/** 만료된 세션 폴더 정리 — 새 세션을 만들 때마다 */
async function removeExpired(client: Client) {
  try {
    const { data } = await bucket(client).list(ALBUM_DIR, { limit: 100 })
    for (const folder of data ?? []) {
      if (!/^[0-9a-z]{9}[A-Za-z0-9]{12}$/.test(folder.name) || albumExpiresAt(folder.name) > Date.now()) continue
      const { data: files } = await bucket(client).list(albumFolder(folder.name), { limit: 100 })
      if (files?.length) await bucket(client).remove(files.map((f) => `${albumFolder(folder.name)}/${f.name}`))
    }
  } catch (error) {
    console.error('[album] 정리 실패:', error instanceof Error ? error.message : error)
  }
}
