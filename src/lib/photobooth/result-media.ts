/**
 * 포토부스 영상 결과(뮤직비디오·추억 무비) "폰으로 받기" — 사진(result-photo.ts)과 같은 토큰·같은 7일 보관.
 *
 * 영상은 수 MB~수십 MB 라 서버(Vercel 요청 4.5MB 제한)를 거치지 않는다: 부스가 서버에서 한 번 쓰는 업로드 주소를 받아
 * 저장소에 바로 올리고(createSignedUploadUrl), 폰은 우리 주소(/api/photobooth/media/[token])를 거쳐 잠깐 쓰는 서명 주소로 받는다.
 * 저장소는 비공개 버킷 photobooth-media(영상 MIME·40MB 제한) — supabase/migrations/20261015_photobooth_programs.sql 로 만든다.
 */
import { RESULT_PHOTO_TTL_HOURS } from './result-photo'

export const RESULT_MEDIA_BUCKET = 'photobooth-media'
export const RESULT_MEDIA_DIR = 'videos'
export const RESULT_MEDIA_TTL_HOURS = RESULT_PHOTO_TTL_HOURS
export const RESULT_MEDIA_MAX_BYTES = 40 * 1024 * 1024
export const RESULT_MEDIA_TYPES = ['video/mp4', 'video/webm'] as const

export function resultMediaPath(token: string): string {
  return `${RESULT_MEDIA_DIR}/${token}`
}

/** 폰에서 여는 페이지(QR) */
export function resultMediaPagePath(token: string): string {
  return `/booth/video/${token}`
}

/** 영상 파일(재생 · ?download=1 저장) */
export function resultMediaFilePath(token: string, download = false): string {
  return `/api/photobooth/media/${token}${download ? '?download=1' : ''}`
}

/** MIME → 확장자 */
export function mediaExt(mime: string): 'mp4' | 'webm' {
  return mime.startsWith('video/mp4') ? 'mp4' : 'webm'
}
