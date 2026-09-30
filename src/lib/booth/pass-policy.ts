// 포토부스 이용권 필요 여부 — 운영 모드마다 스토어 어드민 '운영 모드'에서 켜고 끈다(기기 설정 settings-booth 의 pass).
// 저장한 적 없는 모드는 기본값: 매장은 이용권 필요, 행사 모드(K-WAVE)는 필요 없음.
import { findBoothMode } from './modes'

/** 저장값이 없을 때 이용권 없이 쓰는 모드 */
const PASS_FREE_BY_DEFAULT = new Set(['kwave-2026'])

/** 기기 설정의 pass 값 — 모드 id → 이용권 필요 여부 */
export type BoothPassSettings = Record<string, boolean>

export function passRequiredFor(modeId: string, pass?: BoothPassSettings | null): boolean {
  return pass?.[modeId] ?? !PASS_FREE_BY_DEFAULT.has(modeId)
}

/** 지금 운영 모드에서 이용권이 필요한가 */
export function boothPassRequired(settings: { mode?: string | null; pass?: BoothPassSettings | null }): boolean {
  return passRequiredFor(findBoothMode(settings.mode).id, settings.pass)
}

/** 저장·전송된 값 검사 — 모드 id(영소문자·숫자·-)와 true/false 만, 10개까지 */
export function parsePassSettings(value: unknown): BoothPassSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 10) return null
  if (!entries.every(([key, flag]) => /^[a-z0-9-]{1,40}$/.test(key) && typeof flag === 'boolean')) return null
  return Object.fromEntries(entries) as BoothPassSettings
}

/** 이용권 없이 쓰는 모드의 AI 아이돌 사진 생성 표 (부스 화면용) — 못 받으면 null(메이크업 사진으로 대신) */
export async function requestFreeIdolTicket(): Promise<string | null> {
  try {
    const res = await fetch('/api/photobooth/idol/ticket', { method: 'POST', cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { idolTicket?: unknown }
    return typeof data.idolTicket === 'string' ? data.idolTicket : null
  } catch {
    return null
  }
}
