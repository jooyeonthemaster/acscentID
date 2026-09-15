'use client'

// 키오스크 터치 키보드 — 물리 키보드 없는 무인 기기용.
// 한글(두벌식)은 lib/kiosk/hangul.ts 조합 엔진을 쓰고, 영문/숫자는 그대로 덧붙인다.
// 상태는 HangulState 하나로 관리해 조합 중인 글자(가 → 감 → 가마)가 화면에 실시간 반영된다.

import { useCallback, useEffect, useState } from 'react'
import {
  HangulState,
  EMPTY_HANGUL,
  fromText,
  hangulValue,
  pushJamo,
  pushChar,
  backspace,
  commitHangul,
} from '@/lib/kiosk/hangul'

type Mode = 'ko' | 'en' | 'num'

// 두벌식 배열 (shift = 쌍자음/ㅒㅖ)
const KO_ROWS = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
]
const KO_SHIFT: Record<string, string> = {
  ㅂ: 'ㅃ', ㅈ: 'ㅉ', ㄷ: 'ㄸ', ㄱ: 'ㄲ', ㅅ: 'ㅆ', ㅐ: 'ㅒ', ㅔ: 'ㅖ',
}

const EN_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
]

const NUM_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '_', '.', ',', '!', '?', '@', '#', '/'],
  ['+', '=', '*', '(', ')', ':', ';'],
]

interface Props {
  value: string
  onChange: (next: string) => void
  onClose: () => void
  maxLength?: number
  /** 키보드 상단에 표시할 안내 문구 */
  hint?: string
}

export function OnScreenKeyboard({ value, onChange, onClose, maxLength = 12, hint }: Props) {
  const [mode, setMode] = useState<Mode>('ko')
  const [shift, setShift] = useState(false)
  // 조합 상태는 키보드가 소유한다. 외부 value가 바뀌어도(초기화 등) 동기화된다.
  const [state, setState] = useState<HangulState>(() => fromText(value))

  useEffect(() => {
    // 부모가 값을 비웠으면(리셋) 조합 버퍼도 비운다
    if (value === '' && hangulValue(state) !== '') setState(EMPTY_HANGUL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const apply = useCallback(
    (next: HangulState) => {
      setState(next)
      onChange(hangulValue(next))
    },
    [onChange]
  )

  const onKey = useCallback(
    (key: string) => {
      if (mode === 'ko') {
        const jamo = shift ? (KO_SHIFT[key] ?? key) : key
        apply(pushJamo(state, jamo, maxLength))
        if (shift) setShift(false)
      } else {
        const ch = mode === 'en' && shift ? key.toUpperCase() : key
        apply(pushChar(state, ch, maxLength))
        if (shift) setShift(false)
      }
    },
    [mode, shift, state, maxLength, apply]
  )

  const rows = mode === 'ko' ? KO_ROWS : mode === 'en' ? EN_ROWS : NUM_ROWS
  const label = (key: string) => {
    if (mode === 'ko') return shift ? (KO_SHIFT[key] ?? key) : key
    if (mode === 'en') return shift ? key.toUpperCase() : key
    return key
  }
  const shiftable = mode !== 'num'
  const full = hangulValue(state).length >= maxLength

  return (
    <div className="ksk-osk" role="group" aria-label="터치 키보드">
      <div className="ksk-osk-preview">
        <span className="ksk-osk-value">
          {value || <em>{hint ?? '입력해 주세요'}</em>}
          <i className="ksk-osk-caret" />
        </span>
        <span className="ksk-osk-count ksk-mono">
          {hangulValue(state).length}/{maxLength}
        </span>
      </div>

      <div className="ksk-osk-keys">
        {rows.map((row, i) => (
          <div className="ksk-osk-row" key={i}>
            {/* 마지막 줄 좌우에 시프트/백스페이스를 배치 */}
            {i === rows.length - 1 && shiftable && (
              <button
                className="ksk-key ksk-key-wide"
                data-on={shift}
                onClick={() => setShift((s) => !s)}
                aria-pressed={shift}
              >
                ⇧
              </button>
            )}
            {row.map((key) => (
              <button
                key={key}
                className="ksk-key"
                disabled={full && mode !== 'ko'}
                onClick={() => onKey(key)}
              >
                {label(key)}
              </button>
            ))}
            {i === rows.length - 1 && (
              <button className="ksk-key ksk-key-wide" onClick={() => apply(backspace(state))}>
                ⌫
              </button>
            )}
          </div>
        ))}

        <div className="ksk-osk-row">
          <button
            className="ksk-key ksk-key-mode"
            onClick={() => {
              // 언어 전환 시 조합 중인 글자를 확정한다 (한글 버퍼가 영문에 섞이지 않도록)
              const committed = commitHangul(state)
              setState(committed)
              onChange(hangulValue(committed))
              setShift(false)
              setMode((m) => (m === 'ko' ? 'en' : m === 'en' ? 'num' : 'ko'))
            }}
          >
            {/* 눌렀을 때 전환될 모드를 표시한다 (현재 모드를 쓰면 무슨 일이 일어날지 모호함) */}
            {mode === 'ko' ? 'ABC' : mode === 'en' ? '123' : '한글'}
          </button>
          <button className="ksk-key ksk-key-space" onClick={() => apply(pushChar(state, ' ', maxLength))}>
            공백
          </button>
          <button
            className="ksk-key ksk-key-done"
            onClick={() => {
              const committed = commitHangul(state)
              setState(committed)
              onChange(hangulValue(committed))
              onClose()
            }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}
