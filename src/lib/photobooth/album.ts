/**
 * 추억 무비 — 휴대폰에서 사진 5~20장을 부스로 보내는 업로드 세션(서버 전용).
 *
 * DB 표 없이 저장소만 쓴다: 세션 = 서명 토큰(만료 시각·무작위·서명). 사진은 analysis-images/photobooth/album/<세션>/ 에
 * 순서대로 쌓이고, 부스가 목록을 2.5초마다 가져온다. 부스·폰 모두 같은 토큰으로 지울 수 있다.
 * 손님 사진이라 짧게만 둔다 — 세션 30분, 영상을 다 만들거나 처음으로 돌아가면 부스가 지우고, 남은 것은 새 세션을 만들 때 지운다.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const ALBUM_BUCKET = 'analysis-images'
export const ALBUM_DIR = 'photobooth/album'
export const ALBUM_MIN = 5
export const ALBUM_MAX = 20
export const ALBUM_TTL_MS = 30 * 60 * 1000
export const ALBUM_PHOTO_MAX_BYTES = 3 * 1024 * 1024

function secret() {
  const value = process.env.SCREEN_BACKGROUND_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('서버 설정이 없습니다.')
  return value
}
const sign = (id: string) => createHmac('sha256', secret()).update(`booth-album:${id}`).digest('hex').slice(0, 24)

/** 세션 id = 만료 시각(base36 9자) + 무작위 12자 — 폴더 이름. 토큰 = id + '-' + 서명 */
export function createAlbumSession(now = Date.now()): { id: string; token: string; expiresAt: number } {
  const expiresAt = now + ALBUM_TTL_MS
  const id = expiresAt.toString(36).padStart(9, '0') + randomBytes(9).toString('base64url').replace(/[^A-Za-z0-9]/g, 'x').slice(0, 12)
  return { id, token: `${id}-${sign(id)}`, expiresAt }
}

export function albumExpiresAt(id: string): number {
  return parseInt(id.slice(0, 9), 36)
}

/** 토큰이 맞으면 세션 id, 아니면 null(만료 포함) */
export function readAlbumToken(token: unknown, now = Date.now()): string | null {
  if (typeof token !== 'string' || !/^[0-9a-z]{9}[A-Za-z0-9]{12}-[0-9a-f]{24}$/.test(token)) return null
  const [id, signed] = token.split('-')
  const expected = sign(id)
  if (!timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return null
  return albumExpiresAt(id) > now ? id : null
}

export const albumFolder = (id: string) => `${ALBUM_DIR}/${id}`
/** 사진 이름 — 올린 순서대로 정렬되게 시각(base36) + 무작위 */
export const albumPhotoName = (now = Date.now()) => `${now.toString(36)}-${randomBytes(4).toString('hex')}.jpg`
export const isAlbumPhotoName = (name: unknown): name is string => typeof name === 'string' && /^[0-9a-z]{6,10}-[0-9a-f]{8}\.jpg$/.test(name)

/** 폰 업로드 페이지 */
export const albumPagePath = (token: string) => `/booth/album/${token}`
