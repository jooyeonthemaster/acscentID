'use client'

// 포토부스 언어 버튼 — 우측 상단(키오스크와 같은 5개 언어). 누르면 목록이 열리고, 밖을 누르면 닫힌다.
// retro: 레트로·맥 화면(BoothClient, 픽셀 아이콘·rt 메뉴) / classic: 클래식 화면(BoothClassic)
// 사전·언어 목록은 src/lib/booth/i18n.ts

import { useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { PixelIcon } from '@/components/retro'
import { BOOTH_LANGS, boothText, type BoothLang } from '@/lib/booth/i18n'

export function BoothLangSwitcher({ lang, onChange, variant, disabled }: {
  lang: BoothLang
  onChange: (lang: BoothLang) => void
  variant: 'retro' | 'classic'
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const t = boothText(lang)
  const current = BOOTH_LANGS.find((l) => l.id === lang)
  const retro = variant === 'retro'
  const pick = (id: BoothLang) => {
    onChange(id)
    setOpen(false)
  }
  return (
    <div className={retro ? 'bth-lang' : 'relative z-40'} data-open={open}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.langMenuLabel}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((v) => !v)
        }}
        className={retro
          ? 'bth-lang-btn rt-btn'
          : 'flex min-h-11 items-center gap-2 rounded-full border border-current/30 px-4 text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40'}
      >
        {retro ? <PixelIcon name="globe" size={24} /> : <Globe className="h-4 w-4" />}
        <span className={retro ? 'rt-pixel' : undefined}>{current?.code}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label={t.close}
            className={retro ? 'bth-lang-scrim' : 'fixed inset-0 z-[-1] cursor-default bg-transparent'}
            onClick={(event) => {
              event.stopPropagation()
              setOpen(false)
            }}
          />
          <ul
            role="listbox"
            aria-label={t.langMenuLabel}
            className={retro
              ? 'bth-lang-menu rt-menu'
              : 'absolute right-0 top-[calc(100%+8px)] min-w-[200px] overflow-hidden rounded-2xl bg-white py-1 text-neutral-900 shadow-2xl'}
          >
            {BOOTH_LANGS.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === lang}
                  data-on={option.id === lang}
                  lang={option.htmlLang}
                  onClick={(event) => {
                    event.stopPropagation()
                    pick(option.id)
                  }}
                  className={retro ? undefined : 'flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-base font-semibold hover:bg-neutral-100'}
                >
                  <span>{option.label}</span>
                  {option.id === lang && (retro ? <PixelIcon name="check" size={24} /> : <Check className="h-4 w-4" />)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
