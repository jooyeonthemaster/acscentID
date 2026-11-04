'use client'

import { KioskClassic } from '../classic/KioskClassic'

/** SCENT! AI 조향사 — 기존(classic) 셸의 상태·동작에 전용 화면을 입힌다(기기의 화면 디자인 설정과 무관) */
export function PerfumerKiosk() {
  return <KioskClassic design="perfumer" />
}
