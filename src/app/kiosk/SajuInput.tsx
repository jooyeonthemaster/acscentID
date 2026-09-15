'use client'

// 키오스크 사주 입력 — 물리 키보드가 없으므로 생년월일은 숫자 패드, 시간은 12지시 격자로 받는다.
// 사이트의 휠 피커(WheelDatePicker)는 정밀 스크롤이 필요해 터치 키오스크에 부적합하다.

import { useCallback, useMemo } from 'react'
import { SAJU_PURPOSES, SAJU_RELATION_OPTIONS, type SajuPurpose, type SajuBirthInput } from '@/types/analysis'

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
export function validateBirthDigits(digits: string, calendar: 'solar' | 'lunar'): string | null {
  if (digits.length !== 8) return null // 아직 입력 중
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  if (year < SAJU_YEAR_MIN || year > SAJU_YEAR_MAX) return `${SAJU_YEAR_MIN}년부터 ${SAJU_YEAR_MAX}년까지 가능합니다`
  if (month < 1 || month > 12) return '월을 확인해 주세요'
  if (day < 1 || day > 31) return '일을 확인해 주세요'
  if (calendar === 'solar') {
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return '없는 날짜입니다'
    }
    if (d.getTime() > Date.now()) return '아직 오지 않은 날짜입니다'
  } else if (day > 30) {
    return '음력은 30일까지입니다'
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
}: {
  value: SajuPurpose | null
  onChange: (p: SajuPurpose) => void
}) {
  return (
    <div className="ksk-purposes">
      {SAJU_PURPOSES.map((p) => (
        <button key={p.id} className="ksk-purpose" data-on={value === p.id} onClick={() => onChange(p.id)}>
          <span className="ksk-purpose-hanja">{p.hanja}</span>
          <b>{p.label}</b>
          <span>{p.description}</span>
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
  label = '생년월일',
}: {
  digits: string
  onDigits: (next: string) => void
  calendar: 'solar' | 'lunar'
  onCalendar: (c: 'solar' | 'lunar') => void
  isLeapMonth: boolean
  onLeapMonth: (v: boolean) => void
  label?: string
}) {
  const error = useMemo(() => validateBirthDigits(digits, calendar), [digits, calendar])

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
          양력
        </button>
        <button className="ksk-seg-btn" data-on={calendar === 'lunar'} onClick={() => onCalendar('lunar')}>
          음력
        </button>
      </div>

      <div className="ksk-birth-display">
        <span className="ksk-birth-label ksk-mono">{label}</span>
        <span className="ksk-birth-value ksk-mono">{formatBirthDigits(digits)}</span>
      </div>
      <p className="ksk-birth-hint">{error ?? (digits.length < 8 ? '연도 4자리 → 월 2자리 → 일 2자리 순서로 눌러 주세요' : ' ')}</p>

      {calendar === 'lunar' && (
        <button className="ksk-check" data-on={isLeapMonth} onClick={() => onLeapMonth(!isLeapMonth)}>
          <i />
          윤달로 계산하기
        </button>
      )}

      <div className="ksk-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button key={n} className="ksk-pad-key" onClick={() => push(n)} disabled={digits.length >= 8}>
            {n}
          </button>
        ))}
        <button className="ksk-pad-key ksk-pad-fn" onClick={() => onDigits('')} disabled={!digits}>
          전체 지움
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
}: {
  value: number | null | 'unknown'
  onChange: (v: number | 'unknown') => void
}) {
  return (
    <>
      <div className="ksk-branches">
        {BRANCH_HOURS.map((b, i) => (
          <button key={b.hanja} className="ksk-branch" data-on={value === i} onClick={() => onChange(i)}>
            <span className="ksk-branch-hanja">{b.hanja}</span>
            <b>{b.label}</b>
            <span className="ksk-mono">{b.range}</span>
          </button>
        ))}
      </div>
      <button className="ksk-alt" data-on={value === 'unknown'} onClick={() => onChange('unknown')}>
        태어난 시간을 몰라요 (세 기둥으로 봅니다)
      </button>
    </>
  )
}

// ── 관계 선택 (궁합) ──────────────────────────────────────
export function SajuRelationGrid({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="ksk-chips" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
      {SAJU_RELATION_OPTIONS.map((r) => (
        <button key={r.id} className="ksk-chip" data-on={value === r.id} onClick={() => onChange(r.id)}>
          {r.label}
        </button>
      ))}
    </div>
  )
}
