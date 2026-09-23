'use client'

// 글꼴 고르기 — 목록의 글꼴 이름을 그 글꼴로 그려 바로 비교한다(기본 <select> 는 항목별 글꼴을 못 그린다).
// 55종을 한꺼번에 받지 않게, 목록에서 화면에 들어온 항목만 글꼴을 입힌다(@font-face 는 쓰일 때만 내려받는다).
// 관리자 창이 움직임(transform)·overflow 안에 있어서 목록은 body 에 띄운다.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SCREEN_FONT_CATEGORIES, SCREEN_FONTS, findScreenFont, screenFontFaceCss, screenFontFamily, type ScreenFontCategory } from './catalog'
import './font-picker.css'

const ALL_FACES = SCREEN_FONTS.map(font => screenFontFaceCss(font.id)).join('')

function FontOption({ id, label, note, selected, onPick, root }: {
  id: string | null
  label: string
  note?: string
  selected: boolean
  onPick: () => void
  root: HTMLElement | null
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || seen) return
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setSeen(true) }, { root, rootMargin: '200px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [root, seen])
  const family = screenFontFamily(id)
  return (
    <button ref={ref} type="button" role="option" aria-selected={selected} className="sfp-option" onClick={onPick}
      style={seen && family ? { fontFamily: family } : undefined}>
      <span className="sfp-option-name">{label}</span>
      <span className="sfp-option-sample">가나다 최애향 AaBb 123</span>
      {note && <em>{note}</em>}
    </button>
  )
}

export function ScreenFontPicker({ value, onChange, disabled, defaultLabel = '기본 글꼴', defaultFont }: {
  value: string | null
  onChange: (font: string | null) => void
  disabled?: boolean
  defaultLabel?: string
  /** '기본' 항목을 그릴 글꼴 (레트로 기본은 에스코어드림) */
  defaultFont?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<HTMLDivElement | null>(null)
  const current = findScreenFont(value)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  // 열 때 고른 글꼴이 보이게
  useEffect(() => { list?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' }) }, [list])
  const pick = (font: string | null) => { setOpen(false); if (font !== value) onChange(font) }
  return (
    <>
      <button type="button" className="sfp-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(true)} style={{ fontFamily: screenFontFamily(value ?? defaultFont) }}>
        <span>{current?.label ?? defaultLabel}</span>
        <i aria-hidden="true">▾</i>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="sfp-scrim" onClick={() => setOpen(false)}>
          <style>{ALL_FACES}</style>
          <div className="sfp-panel" role="dialog" aria-modal="true" aria-label="글꼴 고르기" onClick={event => event.stopPropagation()}>
            <header className="sfp-head">
              <b>글꼴 고르기</b>
              <span>{SCREEN_FONTS.length}종 · 이름이 그 글꼴로 보입니다</span>
              <button type="button" className="sfp-close" onClick={() => setOpen(false)} aria-label="닫기">✕</button>
            </header>
            <div className="sfp-list" role="listbox" aria-label="화면 글꼴" ref={setList}>
              <FontOption id={defaultFont ?? null} label={defaultLabel} selected={value === null} onPick={() => pick(null)} root={list} />
              {(Object.keys(SCREEN_FONT_CATEGORIES) as ScreenFontCategory[]).map(category => (
                <section key={category} className="sfp-group">
                  <h4>{SCREEN_FONT_CATEGORIES[category]}</h4>
                  {SCREEN_FONTS.filter(font => font.category === category).map(font => (
                    <FontOption key={font.id} id={font.id} label={font.label} selected={value === font.id} onPick={() => pick(font.id)} root={list} />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
