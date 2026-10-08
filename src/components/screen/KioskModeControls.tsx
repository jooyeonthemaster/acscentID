'use client'

// 키오스크 STORE ADMIN '운영 모드' — 매장 상시(최애 분석) ↔ 행사 모드(예: K-WAVE 사주 분석).
// 고르면 같은 종류의 키오스크 모두가 다음 손님부터 그 모드로 돈다. 목록은 src/lib/kiosk/modes.ts
import { useState } from 'react'
import { KIOSK_MODES, findKioskMode } from '@/lib/kiosk/modes'
import type { DeviceSettings } from '@/lib/screen-backgrounds/types'
import './kiosk-mode-controls.css'

const PROGRAM_LABELS = { idol: '최애 이미지 분석', personal: '내 이미지 분석', saju: '사주 분석', color: 'AI 퍼스널 컬러', tarot: 'AI 타로' } as const

export function KioskModeControls({ value, onSave, onSelectBackground, disabled, settings }: {
  value: string | null | undefined
  onSave: (patch: Partial<DeviceSettings>) => Promise<void>
  /** 사주 표시(한자 글꼴·영수증 양식) — 새 디자인이 마음에 안 들면 이전으로 되돌린다 */
  settings?: DeviceSettings
  /** 모드에 기본 배경이 있으면 함께 고른다(useScreenBackgrounds().selectBackground) */
  onSelectBackground?: (id: string) => Promise<void>
  disabled?: boolean
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const current = findKioskMode(value)
  const pick = async (id: string) => {
    if (saving || id === current.id) return
    setSaving(id); setError('')
    try {
      await onSave({ mode: id === KIOSK_MODES[0].id ? null : id })
      const bg = findKioskMode(id).defaultBackground
      if (bg && onSelectBackground) await onSelectBackground(bg)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { setSaving(null) }
  }
  return (
    <section className="kmc" aria-label="운영 모드">
      <div className="kmc-head">
        <b>운영 모드</b>
        <span>행사에 나갈 때 바꿔 주세요. 모든 키오스크가 다음 손님부터 따라갑니다.</span>
      </div>
      <div className="kmc-list" role="radiogroup" aria-label="운영 모드">
        {KIOSK_MODES.map(mode => (
          <button key={mode.id} type="button" role="radio" aria-checked={current.id === mode.id} disabled={disabled || !!saving}
            onClick={() => void pick(mode.id)}>
            <b>{mode.label}{saving === mode.id ? ' · 저장 중…' : ''}</b>
            <span>{mode.note}</span>
            <em>{mode.programs.map(p => PROGRAM_LABELS[p]).join(' · ')}{mode.defaultBackground ? ' · 전용 배경으로 바뀜' : ''}</em>
          </button>
        ))}
      </div>
      {settings && current.programs.includes('saju') && (
        <div className="kmc-saju">
          <b>사주 표시</b>
          {([
            ['hanjaFont', '한자 글꼴', [['kaishu', '해서 (새)'], ['gothic', '고딕 (이전)']], settings.hanjaFont ?? 'kaishu'],
            ['receiptStyle', '영수증', [['sheet', '감정서형 (새)'], ['prescription', '처방전형 (이전)']], settings.receiptStyle ?? 'sheet'],
          ] as const).map(([key, label, options, now]) => (
            <div key={key} className="kmc-row">
              <span>{label}</span>
              <div className="kmc-seg" role="group" aria-label={label}>
                {options.map(([id, text]) => (
                  <button key={id} type="button" aria-pressed={now === id} disabled={disabled || !!saving || now === id}
                    onClick={() => { setSaving(key); setError(''); void onSave({ [key]: id } as Partial<DeviceSettings>).catch(cause => setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.')).finally(() => setSaving(null)) }}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="kmc-error" role="alert">{error}</p>}
    </section>
  )
}
