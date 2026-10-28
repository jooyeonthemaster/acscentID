// 노트북(PC) 가로 화면용 체험 링크 — 행사에서 노트북을 열어 두고 손님이 직접 쓴다(2026-10-28).
// 세로 키오스크와 같은 프로그램을 가로 두 칸(왼쪽 카메라·그림 / 오른쪽 설명·버튼)으로 보여 준다.
// 링크가 프로그램을 정한다: 기기 설정·관리자 창·운영 모드 갈아타기·워터마크·영수증 인쇄가 없고, 결과는 QR 로 휴대폰에 받는다.
// 설명: docs/kiosk-pc.md

import type { ExperienceId } from './experience'

export type KioskPcProgram =
  | { slug: 'color'; name: string; tag: string; kind: 'shell'; mode: 'ai-color' }
  | { slug: 'caricature' | 'career'; name: string; tag: string; kind: 'experience'; experience: ExperienceId }

export const KIOSK_PC_PROGRAMS: readonly KioskPcProgram[] = [
  { slug: 'color', name: 'AI 퍼스널 컬러', tag: 'COLOR!', kind: 'shell', mode: 'ai-color' },
  { slug: 'caricature', name: 'AI 캐리커처', tag: 'DRAW!', kind: 'experience', experience: 'draw' },
  { slug: 'career', name: 'AI 미래 직업 탐색', tag: 'NEXT!', kind: 'experience', experience: 'career' },
]

export const findKioskPcProgram = (slug: string) => KIOSK_PC_PROGRAMS.find((program) => program.slug === slug)

export const kioskPcHref = (slug: KioskPcProgram['slug']) => `/kiosk/pc/${slug}`
