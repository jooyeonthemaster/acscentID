'use client'

// 키오스크 터치 키보드 — 물리 키보드 없는 무인 기기용.
// 한글(두벌식)은 lib/kiosk/hangul.ts 조합 엔진을 쓰고, 영문/숫자는 그대로 덧붙인다.
// 일본어는 로마자→가나, 중국어는 병음→한자 후보 선택으로 입력한다.
// 상태는 HangulState 하나로 관리해 조합 중인 글자(가 → 감 → 가마)가 화면에 실시간 반영된다.

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { pushRomaji, flushRomaji, toKatakana } from '@/lib/kiosk/ime-kana'
import { pinyinCandidates } from '@/lib/kiosk/ime'
import { PixelIcon } from '@/components/retro'

type Mode = 'ko' | 'en' | 'num' | 'ja' | 'zh'

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

/** 모드 전환 버튼이 도는 순서 — 첫 모드는 화면 언어가 정한다 */
function modeCycle(primary: Mode): Mode[] {
  return primary === 'en' ? ['en', 'num'] : [primary, 'en', 'num']
}

/** 버튼에 쓸 이름 — 그 언어 사용자가 바로 알아보는 표기를 쓴다 */
const MODE_LABEL: Record<Mode, string> = {
  ko: '한글',
  en: 'ABC',
  num: '123',
  ja: 'かな',
  zh: '拼音',
}

/** 후보 한 줄에 보여줄 개수 */
const CANDIDATE_PAGE = 9

interface Props {
  value: string
  onChange: (next: string) => void
  onClose: () => void
  maxLength?: number
  /** 키보드 상단에 표시할 안내 문구 */
  hint?: string
  /** 화면 언어 라벨 — 없으면 한국어 기본값 */
  labels?: { aria: string; placeholder: string; space: string; done: string }
  initialMode?: Mode
  /** 중국어 후보를 번체로 낸다 */
  traditional?: boolean
}

export function OnScreenKeyboard({
  value,
  onChange,
  onClose,
  maxLength = 12,
  hint,
  labels,
  initialMode = 'ko',
  traditional = false,
}: Props) {
  // 화면 언어에 맞는 자판으로 시작한다 — 한국어가 아니면 한글 자모는 쓸 일이 없다
  const [mode, setMode] = useState<Mode>(initialMode)
  const [shift, setShift] = useState(false)
  // 조합 상태는 키보드가 소유한다. 외부 value가 바뀌어도(초기화 등) 동기화된다.
  const [state, setState] = useState<HangulState>(() => fromText(value))
  /** 아직 가나/한자로 확정되지 않은 로마자·병음 */
  const [pending, setPending] = useState('')
  const [katakana, setKatakana] = useState(false)
  const [page, setPage] = useState(0)

  const cycle = useMemo(() => modeCycle(initialMode), [initialMode])

  useEffect(() => {
    // 부모가 값을 비웠으면(리셋) 조합 버퍼도 비운다
    if (value === '' && hangulValue(state) !== '') {
      setState(EMPTY_HANGUL)
      setPending('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const apply = useCallback(
    (next: HangulState) => {
      setState(next)
      onChange(hangulValue(next))
    },
    [onChange]
  )

  const candidates = useMemo(
    () => (mode === 'zh' && pending ? pinyinCandidates(pending, traditional) : []),
    [mode, pending, traditional]
  )
  const pageCount = Math.max(1, Math.ceil(candidates.length / CANDIDATE_PAGE))
  const shown = candidates.slice(page * CANDIDATE_PAGE, page * CANDIDATE_PAGE + CANDIDATE_PAGE)

  /** 조합 중인 로마자·병음을 정리하고 확정 가능한 만큼 본문에 넣는다 */
  const flushPending = useCallback(
    (s: HangulState): HangulState => {
      if (!pending) return s
      setPending('')
      setPage(0)
      if (mode !== 'ja') return s // 병음은 한자를 고르지 않았으면 버린다
      const kana = flushRomaji(pending)
      if (!kana) return s
      return pushChar(s, katakana ? toKatakana(kana) : kana, maxLength)
    },
    [pending, mode, katakana, maxLength]
  )

  const commitCandidate = useCallback(
    (ch: string) => {
      setPending('')
      setPage(0)
      apply(pushChar(state, ch, maxLength))
    },
    [apply, state, maxLength]
  )

  const onKey = useCallback(
    (key: string) => {
      if (mode === 'ko') {
        const jamo = shift ? (KO_SHIFT[key] ?? key) : key
        apply(pushJamo(state, jamo, maxLength))
        if (shift) setShift(false)
        return
      }
      if (mode === 'ja') {
        const step = pushRomaji(pending, key)
        setPending(step.pending)
        if (step.emit) apply(pushChar(state, katakana ? toKatakana(step.emit) : step.emit, maxLength))
        return
      }
      if (mode === 'zh') {
        setPending((p) => (p.length >= 6 ? p : p + key))
        setPage(0)
        return
      }
      const ch = mode === 'en' && shift ? key.toUpperCase() : key
      apply(pushChar(state, ch, maxLength))
      if (shift) setShift(false)
    },
    [mode, shift, state, maxLength, apply, pending, katakana]
  )

  const onBackspace = useCallback(() => {
    // 조합 중인 로마자·병음이 있으면 그걸 먼저 지운다 (확정된 글자를 건드리지 않는다)
    if (pending) {
      setPending(pending.slice(0, -1))
      setPage(0)
      return
    }
    apply(backspace(state))
  }, [pending, apply, state])

  const onSpace = useCallback(() => {
    // 병음 입력 중 스페이스는 첫 후보 확정 — 일반적인 중국어 입력기와 같다
    if (mode === 'zh' && candidates.length > 0) {
      commitCandidate(candidates[0])
      return
    }
    apply(pushChar(flushPending(state), ' ', maxLength))
  }, [mode, candidates, commitCandidate, apply, flushPending, state, maxLength])

  const rows = mode === 'ko' ? KO_ROWS : mode === 'num' ? NUM_ROWS : EN_ROWS
  const label = (key: string) => {
    if (mode === 'ko') return shift ? (KO_SHIFT[key] ?? key) : key
    if (mode === 'en') return shift ? key.toUpperCase() : key
    return key
  }
  const shiftable = mode === 'ko' || mode === 'en'
  const full = hangulValue(state).length >= maxLength
  const nextMode = cycle[(cycle.indexOf(mode) + 1) % cycle.length]

  return (
    <div className="ksk-osk" role="group" aria-label={labels?.aria ?? '터치 키보드'}>
      <div className="ksk-osk-preview">
        <span className="ksk-osk-value">
          {value || pending ? (
            <>
              {value}
              {pending && <span className="ksk-osk-pending">{pending}</span>}
            </>
          ) : (
            <em>{hint ?? labels?.placeholder ?? '입력해 주세요'}</em>
          )}
          <i className="ksk-osk-caret" />
        </span>
        <span className="ksk-osk-count ksk-mono">
          {hangulValue(state).length}/{maxLength}
        </span>
      </div>

      {mode === 'zh' && (
        // 병음을 치는 중에만 후보줄이 열린다 — 자판 높이가 흔들리지 않게 자리는 늘 잡아둔다
        <div className="ksk-osk-cands" data-open={shown.length > 0}>
          {shown.map((ch) => (
            <button key={ch} className="ksk-cand" onClick={() => commitCandidate(ch)} disabled={full}>
              {ch}
            </button>
          ))}
          {pageCount > 1 && (
            <button
              className="ksk-cand ksk-cand-more"
              onClick={() => setPage((p) => (p + 1) % pageCount)}
              aria-label="다음 후보"
            >
              <PixelIcon name="arrowRight" size={28} />
            </button>
          )}
        </div>
      )}

      <div className="ksk-osk-keys">
        {rows.map((row, i) => (
          <div className="ksk-osk-row" key={i}>
            {/* 마지막 줄 좌우에 시프트(또는 가나 전환)/백스페이스를 배치 */}
            {i === rows.length - 1 && shiftable && (
              <button
                className="ksk-key ksk-key-wide"
                data-on={shift}
                onClick={() => setShift((s) => !s)}
                aria-pressed={shift}
              >
                <PixelIcon name="shift" size={28} label="Shift" />
              </button>
            )}
            {i === rows.length - 1 && mode === 'ja' && (
              <button
                className="ksk-key ksk-key-wide"
                data-on={katakana}
                onClick={() => setKatakana((k) => !k)}
                aria-pressed={katakana}
              >
                {katakana ? 'カナ' : 'かな'}
              </button>
            )}
            {row.map((key) => (
              <button
                key={key}
                className="ksk-key"
                disabled={full && mode !== 'ko' && mode !== 'zh'}
                onClick={() => onKey(key)}
              >
                {label(key)}
              </button>
            ))}
            {i === rows.length - 1 && (
              <button className="ksk-key ksk-key-wide" onClick={onBackspace} aria-label="Backspace">
                <PixelIcon name="backspace" size={30} />
              </button>
            )}
          </div>
        ))}

        <div className="ksk-osk-row">
          <button
            className="ksk-key ksk-key-mode"
            onClick={() => {
              // 자판을 바꾸기 전에 조합 중인 글자를 확정한다 (버퍼가 다음 자판에 섞이지 않도록)
              const committed = commitHangul(flushPending(state))
              setState(committed)
              onChange(hangulValue(committed))
              setShift(false)
              setMode(nextMode)
            }}
          >
            {/* 눌렀을 때 전환될 모드를 표시한다 (현재 모드를 쓰면 무슨 일이 일어날지 모호함) */}
            {MODE_LABEL[nextMode]}
          </button>
          <button className="ksk-key ksk-key-space" onClick={onSpace}>
            {labels?.space ?? '공백'}
          </button>
          <button
            className="ksk-key ksk-key-done"
            onClick={() => {
              const committed = commitHangul(flushPending(state))
              setState(committed)
              onChange(hangulValue(committed))
              onClose()
            }}
          >
            {labels?.done ?? '완료'}
          </button>
        </div>
      </div>
    </div>
  )
}
