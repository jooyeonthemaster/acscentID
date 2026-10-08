'use client'

import type { ReactNode } from 'react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { ModeAttract } from '@/lib/kiosk/modes'
import type { KioskProgramTheme } from '@/lib/kiosk/program-theme'
import './program-theme.css'

const COPY: Record<KioskLang, { colorCta: string; tarotCta: string; colorNote: string; tarotNote: string }> = {
  ko: { colorCta: '내 컬러 찾기', tarotCta: '나의 카드 뽑기', colorNote: '사진 한 장 · 8가지 컬러 타입', tarotNote: '과거 · 현재 · 미래' },
  en: { colorCta: 'Find my colors', tarotCta: 'Draw my cards', colorNote: 'One photo · 8 color types', tarotNote: 'Past · Present · Future' },
  ja: { colorCta: '似合う色を見つける', tarotCta: 'カードを引く', colorNote: '写真1枚 · 8つのカラータイプ', tarotNote: '過去 · 現在 · 未来' },
  'zh-Hans': { colorCta: '寻找我的色彩', tarotCta: '抽取我的牌', colorNote: '一张照片 · 8种色彩类型', tarotNote: '过去 · 现在 · 未来' },
  'zh-Hant': { colorCta: '尋找我的色彩', tarotCta: '抽取我的牌', colorNote: '一張照片 · 8種色彩類型', tarotNote: '過去 · 現在 · 未來' },
}

/** 장식 원화와 실제 텍스트·버튼을 분리해 번역과 터치 동작을 유지한다. */
export function ProgramAttract({ theme, lang, attract, brand, langControl, onStart }: {
  theme: KioskProgramTheme
  lang: KioskLang
  attract: ModeAttract
  brand: string
  langControl?: ReactNode
  onStart: () => void
}) {
  const color = theme === 'color'
  const copy = COPY[lang]
  return (
    <section className="ksk-attract program-attract" aria-labelledby="program-title">
      <header className="program-brandbar"><span>{brand}</span>{langControl}</header>
      <div className="program-intro">
        {!color && <span className="program-star" aria-hidden="true">✦</span>}
        <h1 id="program-title" className="program-wordmark">{attract.wordmark}</h1>
        <p className="program-headline">{color ? <>{attract.title1}<br />{attract.title2}</> : attract.sub}</p>
      </div>
      <div className="program-art" aria-hidden="true">
        {color && <span className="program-color-index">{['#272f73', '#ed573c', '#f5c745', '#b5cca0', '#f4c1a9', '#add1e4', '#cec3e2'].map(hex => <i key={hex} style={{ background: hex }} />)}</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/kiosk-programs/${color ? 'color-archive-fan' : 'moonlit-tarot-fan'}.webp`} alt="" draggable={false} fetchPriority="high" />
        {color && <><span className="program-doodle program-doodle-a">✳</span><span className="program-doodle program-doodle-b">✳</span></>}
      </div>
      <footer className="program-start-area">
        <p className="program-note">{color ? copy.colorNote : copy.tarotNote}</p>
        <button type="button" className="ksk-btn ksk-btn-primary program-start" onClick={onStart}>
          <span>{color ? copy.colorCta : copy.tarotCta}</span><span aria-hidden="true">→</span>
        </button>
        <p className="program-signature">{color ? 'AI PERSONAL COLOR' : 'AI TAROT READING'}</p>
      </footer>
    </section>
  )
}
