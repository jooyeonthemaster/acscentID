'use client'

// 펀그라운드 별내 데모의 부스 프로그램(DREAM!) — 「FUN GROUND Editorial」 테마(2026-11-16 목업 ~/Downloads/펀그라운드별내_UI목업_20261116_에디토리얼 dream_1~3).
// 주소에 site=funground 가 있고(src/lib/funground/demo.ts) 아래 FGE_ART 에 있는 프로그램일 때만 쓴다 — 매장 · 행사 · 다른 데모 화면은 그대로.
// 화면 틀(ProgramApp)은 .pg 에 data-site="funground" 를 달고, 모양은 funground-editorial.css 가 그 속에서만 바꾼다.
// 흐름 · 생성 · 저장 동작은 PhotoFlow 그대로 — 여기는 그 화면의 모양(위 막대 · 첫 화면 · 직업 사진 카드 · 결과)만.

import { Check, RotateCcw, Sparkles } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import type { ProgramDef, ProgramId } from '@/lib/booth/programs/catalog'
import { isFungroundSite } from '@/lib/funground/demo'

const ART = '/assets/booth-programs/funground-editorial'

export interface FgeArt {
  /** 첫 화면 왼쪽 꽉 찬 사진(그림 속 글자 없음 · 가상의 고등학생) */
  hero: string
  /** 첫 화면 한글 머리말 · 설명 한 줄 · 단추 */
  headline: string
  lead: string
  startCta: string
  /** 결과 화면 큰 제목 */
  resultTitle: string
  /** 사진 카드로 보일 선택지 그룹과 선택지별 사진 */
  cardGroup: string
  cards: Record<string, string>
  /** 아래 줄 칩 그룹의 짧은 이름(그룹 id → 이름) */
  chipLabels?: Record<string, string>
}

/** 에디토리얼 테마가 있는 프로그램 — 펀그라운드 데모에 들어간 부스 프로그램은 DREAM! 하나(2026-11-14) */
const FGE_ART: Partial<Record<ProgramId, FgeArt>> = {
  dream: {
    hero: `${ART}/dream-hero.webp`,
    headline: '꿈의 직업으로 변신',
    lead: '얼굴은 그대로, 옷과 일터만 바뀌어요',
    startCta: '시작하기',
    resultTitle: '꿈을 향해 한 걸음',
    cardGroup: 'job',
    cards: {
      astronomer: `${ART}/dream-astronomer.webp`,
      chef: `${ART}/dream-chef.webp`,
      vet: `${ART}/dream-vet.webp`,
      scientist: `${ART}/dream-scientist.webp`,
      firefighter: `${ART}/dream-firefighter.webp`,
      'game-dev': `${ART}/dream-gamedev.webp`,
    },
    chipLabels: { moment: '장면' },
  },
}

const subscribeNever = () => () => {}

/** 지금 화면이 펀그라운드 에디토리얼인가 — 그 프로그램의 그림 묶음, 아니면 null(서버 · 첫 그림은 늘 null 이라 hydration 이 어긋나지 않는다) */
export function useFgEditorial(program: ProgramDef): FgeArt | null {
  const on = useSyncExternalStore(subscribeNever, isFungroundSite, () => false)
  return on ? FGE_ART[program.id] ?? null : null
}

/** 단추 오른쪽 가는 화살표 */
export function FgeArrow() {
  return (
    <svg className="pgf-arrow" viewBox="0 0 64 24" fill="none" aria-hidden="true">
      <path d="M0 12h62M51 1.5 61.5 12 51 22.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** 위 막대 — FUN GROUND · 01 02 03(지금 단계 굵게 + 강조색 밑줄) · 작은 검정 「처음으로」(FgStage 의 FgTopBar 와 같은 모양, 1280 기준) */
export function FgeTopBar({ step, onHome }: { step: 1 | 2 | 3; onHome: () => void }) {
  return (
    <header className="pgf-top">
      <span className="pgf-logo" aria-label="FUN GROUND 별내">FUN GROUND</span>
      <span className="pgf-rule" aria-hidden="true" />
      <ol className="pgf-steps" aria-label="단계">
        {([1, 2, 3] as const).map((n) => (
          <li key={n} data-on={step === n || undefined} aria-current={step === n ? 'step' : undefined}>{`0${n}`}</li>
        ))}
      </ol>
      <span className="pgf-rule" aria-hidden="true" />
      <button type="button" className="pgf-home" onClick={onHome}>처음으로</button>
    </header>
  )
}

/** ① 첫 화면 — 왼쪽 꽉 찬 사진, 오른쪽 강조색 라벨 · DREAM! · 머리말(강조색 밑줄) · 한 줄 · 시작하기 */
export function FgeStart({ program, art, onStart }: { program: ProgramDef; art: FgeArt; onStart: () => void }) {
  return (
    <div className="pgf-split pgf-start">
      <div className="pgf-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art.hero} alt="" />
      </div>
      <div className="pgf-panel">
        <div className="pgf-labelrow"><span className="pgf-label">{program.name}</span></div>
        <h1 className="pgf-title">{program.wordmark}</h1>
        <p className="pgf-head"><u>{art.headline}</u></p>
        <p className="pgf-lead">{art.lead}</p>
        <button type="button" className="pgf-btn pgf-btn--wide" data-fg-start onClick={onStart}>{art.startCta}<FgeArrow /></button>
      </div>
    </div>
  )
}

/** ② 고르기 — 작은 워드마크 | 큰 질문(강조색 밑줄), 직업 사진 카드 3×2, 아래 줄: 찍은 사진 · 장면 칩 · 만들기 */
export function FgeOptions({ program, art, shotUrl, choices, onChange, onRetake, onGo }: {
  program: ProgramDef
  art: FgeArt
  shotUrl: string | null
  choices: Record<string, string>
  onChange: (group: string, option: string) => void
  onRetake: () => void
  onGo: () => void
}) {
  const cardGroup = program.options.groups.find((g) => g.id === art.cardGroup)
  const chipGroups = program.options.groups.filter((g) => g.id !== art.cardGroup)
  return (
    <div className="pgf-options pg-options">
      <header className="pgf-ohead">
        <b className="pgf-omark">{program.wordmark}</b>
        <h2 className="pgf-q"><u>{program.options.title}</u></h2>
      </header>
      {cardGroup && (
        <div className="pgf-cards" role="radiogroup" aria-label={cardGroup.label}>
          {cardGroup.options.map((option) => {
            const on = choices[cardGroup.id] === option.id
            return (
              <button key={option.id} type="button" role="radio" aria-checked={on} aria-label={option.label} className="pgf-card" onClick={() => onChange(cardGroup.id, option.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={art.cards[option.id] ?? option.image} alt="" />
                <b>{option.label}</b>
                {on && <i className="pgf-check" aria-hidden="true"><Check size={26} strokeWidth={3} /></i>}
              </button>
            )
          })}
        </div>
      )}
      <footer className="pgf-obar">
        <div className="pgf-oshot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shotUrl && <img src={shotUrl} alt="촬영한 사진" />}
          <button type="button" className="pgf-btn pgf-btn--ghost pgf-btn--sm" onClick={onRetake}><RotateCcw size={20} strokeWidth={1.5} aria-hidden="true" />다시 촬영</button>
        </div>
        {chipGroups.map((group) => (
          <div key={group.id} className="pgf-chiprow">
            <span className="pgf-chiplabel">{art.chipLabels?.[group.id] ?? group.label}</span>
            <div className="pgf-chips" role="radiogroup" aria-label={group.label}>
              {group.options.map((option) => (
                <button key={option.id} type="button" role="radio" aria-checked={choices[group.id] === option.id} className="pgf-chip" onClick={() => onChange(group.id, option.id)}>{option.label}</button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" className="pgf-btn pgf-btn--go" data-fg-go onClick={onGo}>{program.options.cta}<FgeArrow /></button>
      </footer>
    </div>
  )
}

/** ③ 결과 — 왼쪽 만든 사진(꽉 차게), 오른쪽 직업 라벨 · 큰 제목 · 인화 디자인 둘 · 인쇄하기 / QR로 받기(둘 다 저장 화면으로) */
export function FgeResult({ program, art, image, prints, comment, design, onDesign, label, onRetake, onStyle, onPrint, onQr }: {
  program: ProgramDef
  art: FgeArt
  image: string
  prints: [string, string]
  comment?: string
  design: 0 | 1
  onDesign: (i: 0 | 1) => void
  label: string
  onRetake: () => void
  onStyle: () => void
  onPrint: () => void
  onQr: () => void
}) {
  return (
    <div className="pgf-split pgf-result pg-result">
      <div className="pgf-hero pgf-hero--photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="만든 꿈의 직업 사진" />
      </div>
      <div className="pgf-panel">
        <div className="pgf-labelrow"><span className="pgf-label">{label}</span></div>
        <h2 className="pgf-head pgf-head--lg"><u>{art.resultTitle}</u></h2>
        {comment && <p className="pgf-lead">{comment}</p>}
        <div className="pgf-designs" role="radiogroup" aria-label="인화 디자인">
          {prints.map((src, i) => (
            <button key={i} type="button" role="radio" aria-checked={design === i} className="pgf-design" onClick={() => onDesign(i as 0 | 1)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" width={72} height={108} />
              <span><i>{`0${i + 1}`}</i>{program.designs[i]}</span>
              {design === i && <em className="pgf-check" aria-hidden="true"><Check size={20} strokeWidth={3} /></em>}
            </button>
          ))}
        </div>
        {program.creative && <p className="pgf-note" role="note">{program.creative}</p>}
        <div className="pgf-minor">
          <button type="button" className="pgf-btn pgf-btn--ghost pgf-btn--sm" onClick={onRetake}><RotateCcw size={20} strokeWidth={1.5} aria-hidden="true" />다시 촬영</button>
          <button type="button" className="pgf-btn pgf-btn--ghost pgf-btn--sm" onClick={onStyle}><Sparkles size={20} strokeWidth={1.5} aria-hidden="true" />스타일 변경</button>
        </div>
        <div className="pgf-actions">
          <button type="button" className="pgf-btn" data-fg-save onClick={onPrint}>인쇄하기</button>
          <button type="button" className="pgf-btn pgf-btn--ghost" onClick={onQr}>QR로 받기</button>
        </div>
      </div>
    </div>
  )
}
