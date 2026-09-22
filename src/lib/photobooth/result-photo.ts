/**
 * 부스 완성 사진 "폰으로 받기" — 손님이 [이미지 저장]을 누른 사진만 잠깐 보관한다.
 *
 * 원칙: 부스는 사진을 남기지 않는다(얼굴 = 민감정보). 이건 손님이 직접 요청한 건만
 * 24시간 보관하는 예외다. 링크(QR)를 가진 사람만 볼 수 있도록 추측 불가능한 토큰을 쓰고,
 * 기간이 지나면 페이지는 막고 파일은 다음 업로드 때 지운다.
 *
 * 토큰 = 생성 시각(base36 8자) + 무작위 20자 → 시각을 따로 저장하지 않아도 만료를 판단할 수 있다.
 */

export const RESULT_PHOTO_BUCKET = 'analysis-images'
export const RESULT_PHOTO_DIR = 'photobooth/results'
export const RESULT_PHOTO_TTL_HOURS = 24
const TTL_MS = RESULT_PHOTO_TTL_HOURS * 60 * 60 * 1000

const TOKEN_PATTERN = /^[0-9a-z]{8}[0-9A-Za-z]{20}$/
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function isResultToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

/** 서버 전용 — crypto.getRandomValues 는 Node 에도 있다 */
export function createResultToken(now = Date.now()): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes, (b) => BASE62[b % 62]).join('')
  return now.toString(36).padStart(8, '0').slice(-8) + random
}

export function resultTokenCreatedAt(token: string): number {
  return parseInt(token.slice(0, 8), 36)
}

export function isResultExpired(token: string, now = Date.now()): boolean {
  return now - resultTokenCreatedAt(token) > TTL_MS
}

export function resultPhotoPath(token: string): string {
  return `${RESULT_PHOTO_DIR}/${token}.jpg`
}

/** 폰에서 여는 페이지 경로 (QR 에 들어간다) */
export function resultPhotoPagePath(token: string): string {
  return `/booth/photo/${token}`
}

/** 사진 파일 (우리 도메인 경유 — 다른 도메인 파일이면 폰 브라우저가 저장 대신 열기만 한다) */
export function resultPhotoImagePath(token: string, download = false): string {
  return `/api/photobooth/result/${token}${download ? '?download=1' : ''}`
}
