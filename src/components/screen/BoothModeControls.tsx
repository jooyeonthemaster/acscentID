'use client'

// 포토부스 STORE ADMIN '운영 모드' — 매장 상시 ↔ 행사 모드(K-WAVE · ANSAN 등) · 프로그램 모드.
// 적용 범위 두 가지(2026-11-04):
//   - 이 부스만(기본) — 고른 이 기기에만 저장한다(src/lib/booth/device-mode.ts). 다른 부스는 그대로라 행사장 부스와 매장 부스를 따로 돌린다.
//   - 모든 부스 공통 — 서버의 기기 설정(settings-booth.mode). 따로 고른 모드가 없는 부스 모두가 다음 손님부터 따라간다.
// 목록은 src/lib/booth/modes.ts. 이용권 번호(모드별 필요 여부)는 모든 부스 공통.
// (CSS 이름이 kiosk-mode-controls 인 것은 예전에 키오스크 운영 모드 부품과 같이 쓰던 이름이라서다)
import { useState } from 'react'
import { BOOTH_MODES, findBoothMode } from '@/lib/booth/modes'
import { passRequiredFor } from '@/lib/booth/pass-policy'
import { writeDeviceBoothMode } from '@/lib/booth/device-mode'
import type { DeviceSettings } from '@/lib/screen-backgrounds/types'
import './kiosk-mode-controls.css'

type Scope = 'device' | 'shared'

export function BoothModeControls({ value, sharedMode, deviceMode, pass, onSave, onSelectBackground, disabled }: {
  /** 지금 이 부스가 도는 모드(이 부스 것 → 없으면 공통) */
  value: string | null | undefined
  /** 모든 부스 공통 운영 모드(서버 값) */
  sharedMode: string | null | undefined
  /** 이 부스에만 따로 고른 모드 — 없으면 null */
  deviceMode: string | null
  /** 모드별 이용권 필요 여부(기기 설정 pass) — 없는 모드는 기본값(src/lib/booth/pass-policy.ts) */
  pass?: Record<string, boolean>
  onSave: (patch: Partial<DeviceSettings>) => Promise<void>
  /** 공통 모드에 기본 배경이 있으면 함께 고른다(useScreenBackgrounds().selectBackground) — 이 부스만이면 그 기기에서만 깐다 */
  onSelectBackground?: (id: string) => Promise<void>
  disabled?: boolean
}) {
  const [scope, setScope] = useState<Scope>('device')
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const current = findBoothMode(value)
  const shared = findBoothMode(sharedMode)
  const chosen = scope === 'device' ? current : shared
  const fail = (cause: unknown) => setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.')

  const pick = async (id: string) => {
    if (saving || disabled) return
    if (scope === 'device' ? deviceMode === id : shared.id === id) return
    setSaving(id); setError(''); setDone('')
    try {
      if (scope === 'device') {
        await writeDeviceBoothMode(id)
        setDone(`이 부스를 '${findBoothMode(id).label}' 모드로 바꿨어요. 다른 부스는 그대로예요.`)
      } else {
        await onSave({ mode: id === BOOTH_MODES[0].id ? null : id })
        const bg = findBoothMode(id).defaultBackground
        if (bg && onSelectBackground) await onSelectBackground(bg)
        setDone(`모든 부스 공통을 '${findBoothMode(id).label}' 모드로 바꿨어요.${deviceMode ? ' 이 부스는 따로 고른 모드가 있어 그대로예요.' : ''}`)
      }
    } catch (cause) { fail(cause) } finally { setSaving(null) }
  }
  const followShared = async () => {
    if (saving || disabled || !deviceMode) return
    setSaving('follow'); setError(''); setDone('')
    try {
      await writeDeviceBoothMode(null)
      setDone(`이 부스가 다시 모든 부스 공통('${shared.label}')을 따라요.`)
    } catch (cause) { fail(cause) } finally { setSaving(null) }
  }
  const setPass = async (id: string, required: boolean) => {
    if (saving || passRequiredFor(id, pass) === required) return
    setSaving(`pass-${id}`); setError('')
    try {
      await onSave({ pass: { [id]: required } })
    } catch (cause) { fail(cause) } finally { setSaving(null) }
  }
  return (
    <section className="kmc" aria-label="운영 모드">
      <div className="kmc-head">
        <b>운영 모드</b>
        <span>지금 이 부스: <strong>{current.label}</strong> · {deviceMode ? '이 부스만 따로 고름' : '모든 부스 공통을 따름'}</span>
      </div>
      <div className="kmc-row kmc-row--wide">
        <span>적용 범위</span>
        <div className="kmc-seg" role="group" aria-label="적용 범위">
          <button type="button" aria-pressed={scope === 'device'} disabled={!!saving} onClick={() => setScope('device')}>이 부스만</button>
          <button type="button" aria-pressed={scope === 'shared'} disabled={!!saving} onClick={() => setScope('shared')}>모든 부스 공통</button>
        </div>
      </div>
      <p className="kmc-note">
        {scope === 'device'
          ? '고른 모드가 이 부스에서만 돌아요. 다른 부스는 바뀌지 않아요(행사장 부스와 매장 부스를 따로 돌릴 때).'
          : `따로 고른 모드가 없는 모든 부스가 다음 손님부터 따라가요. 지금 공통: ${shared.label}`}
      </p>
      {scope === 'device' && deviceMode && (
        <button type="button" className="kmc-follow" disabled={disabled || !!saving} onClick={() => void followShared()}>
          {saving === 'follow' ? '되돌리는 중…' : `따로 고른 것 지우고 모든 부스 공통(${shared.label}) 따르기`}
        </button>
      )}
      <div className="kmc-list" role="radiogroup" aria-label={scope === 'device' ? '이 부스 운영 모드' : '모든 부스 공통 운영 모드'}>
        {BOOTH_MODES.map(mode => (
          <button key={mode.id} type="button" role="radio" aria-checked={chosen.id === mode.id} disabled={disabled || !!saving}
            onClick={() => void pick(mode.id)}>
            <b>{mode.label}{saving === mode.id ? ' · 저장 중…' : ''}</b>
            <span>{mode.note}</span>
            <em>{mode.program ? '프로그램 전용 화면' : mode.stageMakeup ? 'K-POP 무대 메이크업 룩' : '기존 촬영 그대로'}{mode.defaultBackground ? ' · 전용 배경' : ''}</em>
          </button>
        ))}
      </div>
      {done && <p className="kmc-done" role="status">{done}</p>}
      <div className="kmc-saju" aria-label="이용권 번호">
        <b>이용권 번호 <small>모든 부스 공통</small></b>
        {BOOTH_MODES.map(mode => {
          const required = passRequiredFor(mode.id, pass)
          return (
            <div key={mode.id} className="kmc-row kmc-row--wide">
              <span>{mode.label}{saving === `pass-${mode.id}` ? ' · 저장 중…' : ''}</span>
              <div className="kmc-seg" role="group" aria-label={`${mode.label} 이용권`}>
                <button type="button" aria-pressed={required} disabled={disabled || !!saving} onClick={() => void setPass(mode.id, true)}>
                  입력해야 촬영
                </button>
                <button type="button" aria-pressed={!required} disabled={disabled || !!saving} onClick={() => void setPass(mode.id, false)}>
                  없이 바로 촬영
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {error && <p className="kmc-error" role="alert">{error}</p>}
    </section>
  )
}
