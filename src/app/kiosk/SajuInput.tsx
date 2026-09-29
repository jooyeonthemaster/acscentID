'use client'

// 키오스크 사주 입력 — 물리 키보드가 없으므로 생년월일은 숫자 패드, 시간은 12지시 격자로 받는다.
// 사이트의 휠 피커(WheelDatePicker)는 정밀 스크롤이 필요해 터치 키오스크에 부적합하다.

import { useCallback, useMemo } from 'react'
import { SAJU_PURPOSES, SAJU_RELATION_OPTIONS, type SajuPurpose, type SajuBirthInput } from '@/types/analysis'
import { sajuText, type SajuText } from '@/lib/kiosk/saju-i18n'
import './saju-input.css'

const KO = sajuText('ko')

export const SAJU_YEAR_MIN = 1930
export const SAJU_YEAR_MAX = 2035

/** 12지시 — 대표 시각은 (index*2)%24 (사이트 constants.ts representativeHourOfBranch와 동일) */
export const BRANCH_HOURS = [
  { hanja: '子', label: '자시', range: '23–01' },
  { hanja: '丑', label: '축시', range: '01–03' },
  { hanja: '寅', label: '인시', range: '03–05' },
  { hanja: '卯', label: '묘시', range: '05–07' },
  { hanja: '辰', label: '진시', range: '07–09' },
  { hanja: '巳', label: '사시', range: '09–11' },
  { hanja: '午', label: '오시', range: '11–13' },
  { hanja: '未', label: '미시', range: '13–15' },
  { hanja: '申', label: '신시', range: '15–17' },
  { hanja: '酉', label: '유시', range: '17–19' },
  { hanja: '戌', label: '술시', range: '19–21' },
  { hanja: '亥', label: '해시', range: '21–23' },
] as const

export function branchToHour(index: number): number {
  return (index * 2) % 24
}

/** 8자리 문자열(YYYYMMDD)을 검증한다. 유효하면 null, 아니면 오류 문구 */
export function validateBirthDigits(digits: string, calendar: 'solar' | 'lunar', tx: SajuText = KO): string | null {
  if (digits.length !== 8) return null // 아직 입력 중
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  if (year < SAJU_YEAR_MIN || year > SAJU_YEAR_MAX) return tx.errYear(SAJU_YEAR_MIN, SAJU_YEAR_MAX)
  if (month < 1 || month > 12) return tx.errMonth
  if (day < 1 || day > 31) return tx.errDay
  if (calendar === 'solar') {
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return tx.errNoDate
    }
    if (d.getTime() > Date.now()) return tx.errFuture
  } else if (day > 30) {
    return tx.errLunar30
  }
  return null
}

export function digitsToBirth(
  digits: string,
  calendar: 'solar' | 'lunar',
  isLeapMonth: boolean,
  hourIndex: number | null
): SajuBirthInput {
  return {
    year: Number(digits.slice(0, 4)),
    month: Number(digits.slice(4, 6)),
    day: Number(digits.slice(6, 8)),
    hour: hourIndex === null ? null : branchToHour(hourIndex),
    minute: hourIndex === null ? null : 0,
    calendar,
    ...(calendar === 'lunar' ? { isLeapMonth } : {}),
  }
}

export function formatBirthDigits(digits: string): string {
  const y = digits.slice(0, 4).padEnd(4, '·')
  const m = digits.slice(4, 6).padEnd(2, '·')
  const d = digits.slice(6, 8).padEnd(2, '·')
  return `${y} . ${m} . ${d}`
}

// ── 목적 선택 ─────────────────────────────────────────────
export function SajuPurposeGrid({
  value,
  onChange,
  tx = KO,
}: {
  value: SajuPurpose | null
  onChange: (p: SajuPurpose) => void
  tx?: SajuText
}) {
  return (
    <div className="ksk-purposes">
      {SAJU_PURPOSES.map((p) => (
        <button key={p.id} className="ksk-purpose" data-on={value === p.id} onClick={() => onChange(p.id)}>
          <span className="ksk-purpose-hanja">{p.hanja}</span>
          <b>{tx.purposes[p.id]?.label ?? p.label}</b>
          <span>{tx.purposes[p.id]?.desc ?? p.description}</span>
        </button>
      ))}
    </div>
  )
}

// ── 생년월일 숫자 패드 ─────────────────────────────────────
export function SajuBirthPad({
  digits,
  onDigits,
  calendar,
  onCalendar,
  isLeapMonth,
  onLeapMonth,
  label,
  tx = KO,
}: {
  digits: string
  onDigits: (next: string) => void
  calendar: 'solar' | 'lunar'
  onCalendar: (c: 'solar' | 'lunar') => void
  isLeapMonth: boolean
  onLeapMonth: (v: boolean) => void
  label?: string
  tx?: SajuText
}) {
  const error = useMemo(() => validateBirthDigits(digits, calendar, tx), [digits, calendar, tx])

  const push = useCallback(
    (d: string) => {
      if (digits.length >= 8) return
      onDigits(digits + d)
    },
    [digits, onDigits]
  )

  return (
    <>
      <div className="ksk-seg">
        <button className="ksk-seg-btn" data-on={calendar === 'solar'} onClick={() => onCalendar('solar')}>
          {tx.solar}
        </button>
        <button className="ksk-seg-btn" data-on={calendar === 'lunar'} onClick={() => onCalendar('lunar')}>
          {tx.lunar}
        </button>
      </div>

      <div className="ksk-birth-display">
        <span className="ksk-birth-label ksk-mono">{label ?? tx.birthLabel}</span>
        {/* 숫자 자리 — 비어 있으면 속이 빈 원, 누르면 그 자리에 숫자. 연 4 · 월 2 · 일 2 */}
        <span className="ksk-birth-value ksk-mono ksk-birth-slots" aria-label={formatBirthDigits(digits)}>
          {[0, 1, 2, 3, -1, 4, 5, -1, 6, 7].map((i, k) =>
            i < 0 ? <span key={k} className="ksk-birth-sep" aria-hidden="true">.</span>
              : <span key={k} className="ksk-birth-slot" data-filled={i < digits.length || undefined} data-next={i === digits.length || undefined} aria-hidden="true">{digits[i] ?? ''}</span>
          )}
        </span>
      </div>
      <p className="ksk-birth-hint">{error ?? (digits.length < 8 ? tx.birthHint : ' ')}</p>

      {calendar === 'lunar' && (
        <button className="ksk-check" data-on={isLeapMonth} onClick={() => onLeapMonth(!isLeapMonth)}>
          <i />
          {tx.leapMonth}
        </button>
      )}

      <div className="ksk-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button key={n} className="ksk-pad-key" onClick={() => push(n)} disabled={digits.length >= 8}>
            {n}
          </button>
        ))}
        <button className="ksk-pad-key ksk-pad-fn" onClick={() => onDigits('')} disabled={!digits}>
          {tx.clearAll}
        </button>
        <button className="ksk-pad-key" onClick={() => push('0')} disabled={digits.length >= 8}>
          0
        </button>
        <button className="ksk-pad-key ksk-pad-fn" onClick={() => onDigits(digits.slice(0, -1))} disabled={!digits}>
          ⌫
        </button>
      </div>
    </>
  )
}

// ── 태어난 시간 (12지시) ───────────────────────────────────
export function SajuHourGrid({
  value,
  onChange,
  tx = KO,
}: {
  value: number | null | 'unknown'
  onChange: (v: number | 'unknown') => void
  tx?: SajuText
}) {
  return (
    <>
      <div className="ksk-branches">
        {BRANCH_HOURS.map((b, i) => (
          <button key={b.hanja} className="ksk-branch" data-on={value === i} onClick={() => onChange(i)}>
            <span className="ksk-branch-hanja">{b.hanja}</span>
            <b>{tx.hours[i] ?? b.label}</b>
            <span className="ksk-mono">{b.range}</span>
          </button>
        ))}
      </div>
      <button className="ksk-alt" data-on={value === 'unknown'} onClick={() => onChange('unknown')}>
        {tx.hourUnknown}
      </button>
    </>
  )
}

// ── 관계 선택 (궁합) ──────────────────────────────────────
export function SajuRelationGrid({
  value,
  onChange,
  tx = KO,
}: {
  value: string
  onChange: (v: string) => void
  tx?: SajuText
}) {
  return (
    <div className="ksk-chips" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
      {SAJU_RELATION_OPTIONS.map((r) => (
        <button key={r.id} className="ksk-chip" data-on={value === r.id} onClick={() => onChange(r.id)}>
          {tx.relations[r.id] ?? r.label}
        </button>
      ))}
    </div>
  )
}
