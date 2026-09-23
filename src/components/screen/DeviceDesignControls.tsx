'use client'

// 기기 관리자 패널(우측 하단 → PIN)의 '화면 디자인 · 글꼴' — 기존/레트로 두 UI가 같이 쓴다.
// 같은 종류의 기기가 설정을 공유하고, 관리자 웹(ScreenBackgroundManager)과 같은 저장소를 쓴다.

import { useState } from 'react'
import type { DeviceSettings } from '@/lib/screen-backgrounds/types'
import { DEFAULT_RETRO_FONT, findScreenFont, screenFontFamily } from '@/lib/screen-fonts/catalog'
import { ScreenFontFace } from '@/lib/screen-fonts/FontFace'
import { ScreenFontPicker } from '@/lib/screen-fonts/FontPicker'
import './device-design-controls.css'

export function DeviceDesignControls({ settings, onSave, disabled, sample, compact }: {
  settings: DeviceSettings
  onSave: (patch: Partial<DeviceSettings>) => Promise<void>
  disabled?: boolean
  sample: string
  /** 가로 화면(부스) — 한 줄로 줄여 배경 목록 높이를 남긴다. 미리보기는 글꼴 목록 옆 */
  compact?: boolean
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async (patch: Partial<DeviceSettings>) => {
    if (saving) return
    setSaving(true)
    setError('')
    try { await onSave(patch) } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { setSaving(false) }
  }
  const previewFont = settings.font ?? (settings.ui === 'retro' ? DEFAULT_RETRO_FONT : null)
  const busy = disabled || saving
  return (
    <div className={compact ? 'sdc sdc--compact' : 'sdc'} aria-busy={saving}>
      <div className="sdc-row">
        <b>화면 디자인</b>
        <div className="sdc-seg" role="group" aria-label="화면 디자인">
          {([['classic', '기존'], ['retro', '레트로']] as const).map(([ui, label]) => (
            <button key={ui} type="button" aria-pressed={settings.ui === ui} disabled={busy || settings.ui === ui} onClick={() => void save({ ui })}>{label}</button>
          ))}
        </div>
      </div>
      <div className="sdc-row">
        <b>글꼴</b>
        <ScreenFontPicker value={settings.font} disabled={busy} onChange={font => void save({ font })}
          defaultFont={settings.ui === 'retro' ? DEFAULT_RETRO_FONT : null}
          defaultLabel={settings.ui === 'retro' ? '기본 (에스코어드림)' : '기본 (배경의 글꼴 조합)'} />
      </div>
      <ScreenFontFace ids={[previewFont]} />
      <p className="sdc-sample" style={{ fontFamily: screenFontFamily(previewFont) }}>{sample}</p>
      <p className="sdc-status" role="status">
        {error || (saving ? '저장하고 있습니다… 같은 종류의 기기에 모두 적용됩니다.' : `현재: ${settings.ui === 'retro' ? '레트로' : '기존'} · ${findScreenFont(settings.font)?.label ?? '기본 글꼴'}`)}
      </p>
    </div>
  )
}
