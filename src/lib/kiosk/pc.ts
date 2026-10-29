// 노트북(PC) 가로 화면용 체험 링크 — 행사에서 노트북을 열어 두고 손님이 직접 쓴다(2026-10-28).
// 세로 키오스크와 같은 프로그램을 가로 두 칸(왼쪽 카메라·그림 / 오른쪽 설명·버튼)으로 보여 준다.
// 링크가 프로그램을 정한다: 기기 설정·관리자 창·운영 모드 갈아타기·워터마크·영수증 인쇄가 없고, 결과는 QR 로 휴대폰에 받는다.
// 설명: docs/kiosk-pc.md

import type { ExperienceId } from './experience'
import type { KioskLang } from './i18n'

export type KioskPcProgram =
  | { slug: 'color'; name: string; tag: string; kind: 'shell'; mode: 'ai-color' }
  | { slug: 'caricature' | 'career'; name: string; tag: string; kind: 'experience'; experience: ExperienceId }

export const KIOSK_PC_PROGRAMS: readonly KioskPcProgram[] = [
  { slug: 'color', name: 'AI 퍼스널 컬러', tag: 'COLOR!', kind: 'shell', mode: 'ai-color' },
  { slug: 'caricature', name: 'AI 캐리커처', tag: 'DRAW!', kind: 'experience', experience: 'draw' },
  { slug: 'career', name: 'AI 미래 직업 탐색', tag: 'NEXT!', kind: 'experience', experience: 'career' },
]

export const findKioskPcProgram = (slug: string) => KIOSK_PC_PROGRAMS.find((program) => program.slug === slug)

/**
 * 행사 랜딩(체험 목록) — 랜딩에서 연 체험 주소에는 ?hub=<id> 가 붙는다. 그 체험은 손님이 끝내거나 '처음으로'를 누르면
 * 자기 첫 화면 대신 랜딩으로 돌아가고, 첫 화면에 '체험 목록' 버튼이 생긴다(src/app/kiosk/pc/PcHub.tsx).
 */
export const KIOSK_PC_HUBS = {
  /** 2026학년도 2학기 JBNU 전공탐색박람회(2026.11.4~5, 전북대 진수당) — docs/kiosk-pc.md */
  jbnu: { href: '/kiosk/pc/jbnu', label: '체험 목록' },
} as const
export type KioskPcHubId = keyof typeof KIOSK_PC_HUBS
export type KioskPcHub = { href: string; label: string }

/**
 * 행사 전용 주소(2026-10-29 사용자 지시: "acscent 빼고 이 행사에 맞는 .vercel.app 도메인") — 같은 Vercel 프로젝트에 붙인 도메인.
 * 이 주소의 첫 화면(/)은 그 행사 랜딩이고, 체험·받기 밖의 사이트 페이지로는 가지 않는다(middleware.ts).
 */
export const KIOSK_PC_EVENT_HOSTS: Record<string, KioskPcHubId> = {
  'jbnu-major-fair.vercel.app': 'jbnu',
}

/** 지금 주소의 ?hub= — 없거나 모르는 이름이면 null. 행사 전용 주소에서는 랜딩이 그 주소의 첫 화면(/)이다 */
export function kioskPcHub(): KioskPcHub | null {
  if (typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('hub')
  if (!id || !Object.hasOwn(KIOSK_PC_HUBS, id)) return null
  const hub = KIOSK_PC_HUBS[id as KioskPcHubId]
  return KIOSK_PC_EVENT_HOSTS[window.location.hostname] === id ? { ...hub, href: '/' } : hub
}

/**
 * 노트북(pc) 화면의 사진 안내 — 노트북 결과물(휴대폰으로 받는 그림)에는 손님 사진이 들어간다(2026-10-29 사용자 지시).
 * 매장 키오스크의 '저장하지 않아요' 문구를 노트북에서는 이것으로 바꾼다.
 */
export const PC_PHOTO_NOTE: Record<KioskLang, string> = {
  ko: '사진은 AI 분석과 내 결과 이미지에만 쓰여요 · 휴대폰으로 받은 결과는 24시간 뒤 지워져요',
  en: 'Your photo is used only for the AI analysis and your result image · Saved results are deleted after 24 hours',
  ja: '写真はAI分析と結果画像にのみ使います · 受け取った結果は24時間後に削除されます',
  'zh-Hans': '照片仅用于AI分析和你的结果图片 · 领取的结果将在24小时后删除',
  'zh-Hant': '照片僅用於AI分析和你的結果圖片 · 領取的結果將在24小時後刪除',
}

export const kioskPcHref = (slug: KioskPcProgram['slug'], hub?: KioskPcHubId) => `/kiosk/pc/${slug}${hub ? `?hub=${hub}` : ''}`
