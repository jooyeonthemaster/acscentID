'use client'

// 화면 자판 — 영어(QWERTY)·프랑스어(AZERTY + 악센트 줄)·한국어(두벌식 조합)·일본어(로마자 → 가나)·나라 찾기(영문만).
// 한글 조합은 기존 키오스크의 hangul.ts, 가나 변환은 ime-kana.ts 를 그대로 쓴다.

import { CornerDownLeft, Delete, Globe, ArrowBigUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { backspace as hangulBack, commitHangul, fromText, hangulValue, pushChar, pushJamo, type HangulState } from '@/lib/kiosk/hangul'
import { flushRomaji, pushRomaji } from '@/lib/kiosk/ime-kana'

export type KeyboardLayout = 'en' | 'fr' | 'ko' | 'ja' | 'search'

const ROWS: Record<'en' | 'fr' | 'ko' | 'koShift' | 'search', string[][]> = {
  en: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm', '?']],
  fr: [['é', 'è', 'à', 'ç', 'ù', 'ê', 'â', 'î', 'ô', "'"], ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'], ['w', 'x', 'c', 'v', 'b', 'n', '?']],
  ko: [['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'], ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'], ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ', '?']],
  koShift: [['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅒ', 'ㅖ'], ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'], ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ', '?']],
  search: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']],
}

const SPACE_LABEL: Record<KeyboardLayout, string> = { en: 'space', fr: 'espace', ko: '스페이스', ja: 'スペース', search: 'space' }

export function TouchKeyboard({
  layout, value, onChange, onEnter, enterLabel, maxLength = 80,
}: {
  layout: KeyboardLayout
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  enterLabel?: string
  maxLength?: number
}) {
  // 한국어·일본어 자판은 지구본 키로 영어 자판과 오간다
  const [latin, setLatin] = useState(false)
  const [shift, setShift] = useState(false)
  const hangul = useRef<HangulState>(fromText(value))
  const kana = useRef({ text: value, pending: '' })
  const emitted = useRef(value)

  // 바깥에서 값을 바꾸면(보낸 뒤 비우기 등) 조합 상태도 그 값으로
  useEffect(() => {
    if (value === emitted.current) return
    hangul.current = fromText(value)
    kana.current = { text: value, pending: '' }
    emitted.current = value
  }, [value])

  const emit = (next: string) => {
    emitted.current = next
    onChange(next)
  }

  const native = !latin && (layout === 'ko' || layout === 'ja')

  const press = (key: string) => {
    if (layout === 'ko' && native) {
      const isJamo = /[ㄱ-ㅣ]/.test(key)
      hangul.current = isJamo ? pushJamo(hangul.current, key, maxLength) : pushChar(hangul.current, key, maxLength)
      if (shift) setShift(false)
      emit(hangulValue(hangul.current))
      return
    }
    if (layout === 'ja' && native) {
      if (!/[a-z-]/.test(key)) {
        const flushed = kana.current.text + flushRomaji(kana.current.pending) + (key === '?' ? '？' : key)
        kana.current = { text: flushed, pending: '' }
      } else {
        const step = pushRomaji(kana.current.pending, key)
        kana.current = { text: kana.current.text + step.emit, pending: step.pending }
      }
      emit((kana.current.text + kana.current.pending).slice(0, maxLength))
      return
    }
    // 영어로 바꿔 친 글자도 조합 상태에 붙여 둔다
    // 빠르게 연달아 눌러도 글자를 잃지 않게 — 화면이 다시 그려지기 전의 값(prop)이 아니라 방금 낸 값을 바탕으로
    const base = layout === 'ko' ? hangulValue(commitHangul(hangul.current)) : layout === 'ja' ? kana.current.text + flushRomaji(kana.current.pending) : emitted.current
    const ch = shift ? key.toUpperCase() : key
    const next = (base + ch).slice(0, maxLength)
    hangul.current = fromText(next)
    kana.current = { text: next, pending: '' }
    if (shift) setShift(false)
    emit(next)
  }

  const back = () => {
    if (layout === 'ko' && (hangul.current.cho >= 0 || hangul.current.jung >= 0)) {
      hangul.current = hangulBack(hangul.current)
      emit(hangulValue(hangul.current))
      return
    }
    if (layout === 'ja' && kana.current.pending) {
      kana.current = { ...kana.current, pending: kana.current.pending.slice(0, -1) }
      emit(kana.current.text + kana.current.pending)
      return
    }
    const next = [...emitted.current].slice(0, -1).join('')
    hangul.current = fromText(next)
    kana.current = { text: next, pending: '' }
    emit(next)
  }

  const space = () => {
    if (layout === 'ko') hangul.current = commitHangul(hangul.current)
    if (layout === 'ja') kana.current = { text: kana.current.text + flushRomaji(kana.current.pending), pending: '' }
    const base = layout === 'ko' ? hangulValue(hangul.current) : layout === 'ja' ? kana.current.text : emitted.current
    const next = (base + ' ').slice(0, maxLength)
    hangul.current = fromText(next)
    kana.current = { text: next, pending: '' }
    emit(next)
  }

  const enter = () => {
    if (layout === 'ja' && kana.current.pending) {
      const done = kana.current.text + flushRomaji(kana.current.pending)
      kana.current = { text: done, pending: '' }
      emit(done)
    }
    if (layout === 'ko') hangul.current = commitHangul(hangul.current)
    onEnter?.()
  }

  const rows = layout === 'ko' && native ? (shift ? ROWS.koShift : ROWS.ko) : layout === 'fr' ? ROWS.fr : layout === 'search' ? ROWS.search : ROWS.en
  const canToggle = layout === 'ko' || layout === 'ja'
  const showShift = layout === 'ko' ? native : layout !== 'search' && layout !== 'ja'

  return (
    <div className={`ok-kb lg lg-strong${layout === 'search' ? ' is-search' : ''}`} data-layout={layout} onPointerDown={(e) => e.preventDefault()}>
      {layout === 'ja' && native && <div className="ok-kb-hint">ROMAJI → かな　ex) sushi → すし</div>}
      {rows.map((row, i) => (
        <div className="ok-kb-row" key={i}>
          {i === rows.length - 1 && showShift && (
            <button type="button" className={`ok-key is-wide lg-press${shift ? ' is-on' : ''}`} onClick={() => setShift((s) => !s)} aria-label="shift">
              <ArrowBigUp size={20} strokeWidth={2} />
            </button>
          )}
          {row.map((key) => (
            <button type="button" key={key} className="ok-key lg-press" onClick={() => press(key)}>
              {shift && layout !== 'ko' ? key.toUpperCase() : key}
            </button>
          ))}
          {i === rows.length - 1 && (
            <button type="button" className="ok-key is-wide lg-press" onClick={back} aria-label="backspace">
              <Delete size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
      <div className="ok-kb-row">
        {canToggle && (
          <button type="button" className={`ok-key is-wide lg-press${latin ? ' is-on' : ''}`} onClick={() => { setLatin((v) => !v); setShift(false) }} aria-label="language">
            <Globe size={18} strokeWidth={2} />
            <small>{latin ? (layout === 'ko' ? '한' : 'あ') : 'ABC'}</small>
          </button>
        )}
        <button type="button" className="ok-key is-space lg-press" onClick={space}>{SPACE_LABEL[layout]}</button>
        {onEnter && (
          <button type="button" className="ok-key is-enter lg-press" onClick={enter}>
            {enterLabel ?? <CornerDownLeft size={20} strokeWidth={2.2} />}
          </button>
        )}
      </div>
    </div>
  )
}
