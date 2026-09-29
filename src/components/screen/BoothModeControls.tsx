'use client'

// 포토부스 STORE ADMIN '운영 모드' — 매장 상시 ↔ 행사 모드(예: K-WAVE K-POP 무대 메이크업).
// 고르면 같은 종류의 포토부스 모두가 다음 손님부터 그 모드로 돈다. 목록은 src/lib/booth/modes.ts
// (키오스크 KioskModeControls 와 같은 모양 — 같은 CSS)
import { useState } from 'react'
import { BOOTH_MODES, findBoothMode } from '@/lib/booth/modes'
import type { DeviceSettings } from '@/lib/screen-backgrounds/types'
import './kiosk-mode-controls.css'

export function BoothModeControls({ value, onSave, onSelectBackground, disabled }: {
  value: string | null | undefined
  onSave: (patch: Partial<DeviceSettings>) => Promise<void>
  /** 모드에 기본 배경이 있으면 함께 고른다(useScreenBackgrounds().selectBackground) */
  onSelectBackground?: (id: string) => Promise<void>
  disabled?: boolean
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const current = findBoothMode(value)
  const pick = async (id: string) => {
    if (saving || id === current.id) return
    setSaving(id); setError('')
    try {
      await onSave({ mode: id === BOOTH_MODES[0].id ? null : id })
      const bg = findBoothMode(id).defaultBackground
      if (bg && onSelectBackground) await onSelectBackground(bg)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { setSaving(null) }
  }
  return (
    <section className="kmc" aria-label="운영 모드">
      <div className="kmc-head">
        <b>운영 모드</b>
        <span>행사에 나갈 때 바꿔 주세요. 모든 포토부스가 다음 손님부터 따라갑니다.</span>
      </div>
      <div className="kmc-list" role="radiogroup" aria-label="운영 모드">
        {BOOTH_MODES.map(mode => (
          <button key={mode.id} type="button" role="radio" aria-checked={current.id === mode.id} disabled={disabled || !!saving}
            onClick={() => void pick(mode.id)}>
            <b>{mode.label}{saving === mode.id ? ' · 저장 중…' : ''}</b>
            <span>{mode.note}</span>
            <em>{mode.stageMakeup ? 'K-POP 무대 메이크업 룩' : '기존 촬영 그대로'}{mode.defaultBackground ? ' · 전용 배경' : ''}</em>
          </button>
        ))}
      </div>
      {error && <p className="kmc-error" role="alert">{error}</p>}
    </section>
  )
}
