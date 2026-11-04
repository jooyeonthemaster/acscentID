'use client'

// 관리자 창의 '글꼴 고르기' — 화면 글꼴과 행사 글꼴이 같이 쓴다(목업 07).
// 목록·분류는 화면 글꼴 목록(screen-fonts/catalog)을 그대로 쓴다. 고르면 바로 저장하고 닫힌다(같은 글꼴이면 닫기만).
// 55종을 한꺼번에 받지 않게, 화면에 들어온 줄만 그 글꼴을 입힌다(@font-face 는 쓰일 때만 내려받는다).

import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { SCREEN_FONT_CATEGORIES, SCREEN_FONTS, screenFontFaceCss, screenFontFamily, type ScreenFontCategory } from '@/lib/screen-fonts/catalog'
import { AdminModal } from './admin-ui'

const ALL_FACES = SCREEN_FONTS.map((font) => screenFontFaceCss(font.id)).join('')
const SAMPLE = '가나다 최애향 AaBb 123'

function FontRow({ id, label, note, selected, onPick, root }: {
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
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) setSeen(true) }, { root, rootMargin: '240px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [root, seen])
  const family = screenFontFamily(id)
  return (
    <button ref={ref} type="button" role="option" aria-selected={selected} className="kadm-font-row" data-selected={selected || undefined} data-autofocus={selected || undefined} onClick={onPick}>
      <span className="kadm-font-name">
        <b>{label}</b>
        {(selected || note) && <em>{selected ? '현재 선택' : note}</em>}
      </span>
      <span className="kadm-font-sample" style={seen && family ? { fontFamily: family } : undefined}>{SAMPLE}</span>
      <span className="kadm-radio" data-on={selected || undefined} aria-hidden="true">{selected && <Check size={16} strokeWidth={3} />}</span>
    </button>
  )
}

export function AdminFontPicker({ value, defaultLabel, defaultNote, defaultFont, onPick, onClose }: {
  value: string | null
  /** '기본' 항목 이름 — 화면 글꼴은 디자인별 기본, 행사 글꼴은 '기기 평소 글꼴' */
  defaultLabel: string
  defaultNote: string
  /** '기본' 항목을 그릴 글꼴(레트로 기본은 에스코어드림) */
  defaultFont?: string | null
  onPick: (font: string | null) => void
  onClose: () => void
}) {
  const [list, setList] = useState<HTMLDivElement | null>(null)
  // 열 때 고른 글꼴이 보이게
  useEffect(() => { list?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' }) }, [list])
  return (
    <AdminModal label="글꼴 고르기" onClose={onClose} wide className="kadm-fonts">
      <style>{ALL_FACES}</style>
      <header className="kadm-modal-head">
        <div>
          <h3>글꼴 고르기</h3>
          <p>글꼴을 고르면 바로 저장하고 이전 화면으로 돌아가요.</p>
        </div>
        <button type="button" className="kadm-chip-btn" onClick={onClose}>닫기 <X size={18} strokeWidth={2} aria-hidden="true" /></button>
      </header>
      <div className="kadm-font-list" role="listbox" aria-label="글꼴" ref={setList}>
        <section>
          <h4>기본</h4>
          <FontRow id={defaultFont ?? null} label={defaultLabel} note={defaultNote} selected={value === null} onPick={() => onPick(null)} root={list} />
        </section>
        {(Object.keys(SCREEN_FONT_CATEGORIES) as ScreenFontCategory[]).map((category) => (
          <section key={category}>
            <h4>{SCREEN_FONT_CATEGORIES[category]}</h4>
            {SCREEN_FONTS.filter((font) => font.category === category).map((font) => (
              <FontRow key={font.id} id={font.id} label={font.label} selected={value === font.id} onPick={() => onPick(font.id)} root={list} />
            ))}
          </section>
        ))}
      </div>
      <p className="kadm-modal-foot">다른 글꼴을 누르면 바로 적용돼요. {SCREEN_FONTS.length}종</p>
    </AdminModal>
  )
}
