/**
 * 키오스크 체험 결과 "휴대폰으로 받기" — 손님이 받기를 누른 결과만 잠깐 보관한다.
 *
 * 원칙은 포토부스와 같다(src/lib/photobooth/result-photo.ts): 키오스크는 손님 사진·목소리를 남기지 않는다.
 * 이건 손님이 직접 요청한 건만 24시간 보관하는 예외다. QR(링크)을 가진 사람만 볼 수 있게 추측할 수 없는 토큰을 쓰고,
 * 기간이 지나면 페이지·파일 주소를 막고, 파일은 다음 업로드 때 지운다.
 *
 * 한 번에 파일 여러 개(명함 앞·뒤·PDF, 목소리·오디오 카드)를 올릴 수 있어 토큰마다 폴더를 쓴다:
 *   analysis-images/kiosk/share/{token}/meta.json.png · {name}  (그림이 아닌 파일은 {name}.png — share-store.ts)
 * 토큰 = 생성 시각(base36 8자) + 무작위 20자 → 시각을 따로 저장하지 않아도 만료를 판단한다.
 */

import { EXPERIENCE_IDS, type ExperienceId } from './experience'
import { isKioskLang, type KioskLang } from './i18n'

export const SHARE_BUCKET = 'analysis-images'
export const SHARE_DIR = 'kiosk/share'
export const SHARE_TTL_HOURS = 24
const TTL_MS = SHARE_TTL_HOURS * 60 * 60 * 1000

/** Vercel 요청 본문 한도(4.5MB) 안쪽 — base64 로 부풀기 전 합계 */
export const SHARE_MAX_TOTAL_BYTES = 3_000_000
export const SHARE_MAX_FILES = 4

const TOKEN_PATTERN = /^[0-9a-z]{8}[0-9A-Za-z]{20}$/
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export const SHARE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'audio/wav': 'wav',
  'application/pdf': 'pdf',
} as const
export type ShareType = keyof typeof SHARE_TYPES

export interface ShareFileMeta {
  /** 저장소 안의 파일 이름 — 영문 소문자·숫자·하이픈 + 확장자 */
  name: string
  type: ShareType
  size: number
  /** 휴대폰 화면에 보이는 이름(손님 언어) */
  label: string
}

export interface ShareMeta {
  kind: ExperienceId
  lang: KioskLang
  files: ShareFileMeta[]
}

export function isShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

export function createShareToken(now = Date.now()): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return now.toString(36).padStart(8, '0').slice(-8) + Array.from(bytes, (b) => BASE62[b % 62]).join('')
}

export const shareCreatedAt = (token: string) => parseInt(token.slice(0, 8), 36)
export const isShareExpired = (token: string, now = Date.now()) => now - shareCreatedAt(token) > TTL_MS
export const shareExpiresAt = (token: string) => shareCreatedAt(token) + TTL_MS

export const isShareFileName = (value: string) => /^[a-z0-9-]{1,40}\.(jpg|png|wav|pdf)$/.test(value)
export const shareFolder = (token: string) => `${SHARE_DIR}/${token}`
export const shareFilePath = (token: string, name: string) => `${SHARE_DIR}/${token}/${name}`
/** 파일 목록 — 버킷이 그림만 받아 PNG 에 담아 둔다(share-store.ts) */
export const shareMetaPath = (token: string) => `${SHARE_DIR}/${token}/meta.json.png`

/** 휴대폰에서 여는 페이지(QR 에 들어간다) */
export const sharePagePath = (token: string) => `/kiosk/get/${token}`
/** 파일 주소 — 우리 도메인을 거친다(다른 도메인 파일은 폰 브라우저가 저장 대신 열기만 한다) */
export const shareFileUrl = (token: string, name: string, download = false) => `/api/kiosk/share/${token}/${name}${download ? '?download=1' : ''}`

/** 파일 머리 바이트가 그 형식이 맞는가 — 이름만 그럴듯한 다른 파일을 거른다 */
export function looksLike(type: ShareType, bytes: Uint8Array): boolean {
  if (bytes.length < 64) return false
  const ascii = (from: number, text: string) => [...text].every((ch, i) => bytes[from + i] === ch.charCodeAt(0))
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') return bytes[0] === 0x89 && ascii(1, 'PNG')
  if (type === 'audio/wav') return ascii(0, 'RIFF') && ascii(8, 'WAVE')
  return ascii(0, '%PDF-')
}

export function parseShareMeta(value: unknown): ShareMeta | null {
  const raw = value as Partial<ShareMeta> | null
  if (!raw || !(EXPERIENCE_IDS as readonly string[]).includes(String(raw.kind)) || !Array.isArray(raw.files)) return null
  const files = raw.files.filter((file): file is ShareFileMeta =>
    Boolean(file) && isShareFileName(String(file.name)) && Object.hasOwn(SHARE_TYPES, String(file.type)) && typeof file.label === 'string' && Number.isFinite(file.size))
  if (!files.length) return null
  return { kind: raw.kind as ExperienceId, lang: isKioskLang(raw.lang) ? raw.lang : 'ko', files }
}
