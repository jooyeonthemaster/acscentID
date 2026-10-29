'use client'

// 행사 랜딩에서 연 체험(?hub=…) — 손님이 체험을 끝내면 랜딩으로 돌아간다. src/lib/kiosk/pc.ts 의 KIOSK_PC_HUBS
// 체험마다 '처음으로'·무입력 초기화·결과 뒤 처음으로가 제각각이라, 화면이 첫 화면으로 '돌아온' 순간 하나로 잡는다.

import { useEffect, useMemo, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { kioskPcHub, type KioskPcHub } from '@/lib/kiosk/pc'
import './pc-hub.css'

/** 첫 화면에 손님 없이 이만큼 머물면 랜딩으로 — 체험을 열어 놓고 떠난 자리를 다음 손님이 랜딩에서 고르게 */
const HUB_IDLE_MS = 90_000

/**
 * pc: 노트북 화면인가 · atStart: 지금 체험의 첫 화면인가.
 * 첫 화면을 한 번 떠났다가 다시 첫 화면이 되면(체험을 마침·처음으로·무입력) 바로 랜딩으로 간다.
 */
export function usePcHub(pc: boolean, atStart: boolean): KioskPcHub | null {
  const hub = useMemo(() => (pc ? kioskPcHub() : null), [pc])
  const left = useRef(false)
  useEffect(() => {
    if (!hub) return
    if (!atStart) { left.current = true; return }
    const go = () => window.location.assign(hub.href)
    if (left.current) { go(); return }
    let timer = window.setTimeout(go, HUB_IDLE_MS)
    const bump = () => { window.clearTimeout(timer); timer = window.setTimeout(go, HUB_IDLE_MS) }
    window.addEventListener('pointerdown', bump, true)
    window.addEventListener('keydown', bump, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', bump, true)
      window.removeEventListener('keydown', bump, true)
    }
  }, [hub, atStart])
  return hub
}

/** 체험 첫 화면 위 가운데의 '← 체험 목록' */
export function PcHubBack({ hub }: { hub: KioskPcHub }) {
  return (
    <a className="pc-hub-back" href={hub.href}>
      <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
      <span>{hub.label}</span>
    </a>
  )
}
