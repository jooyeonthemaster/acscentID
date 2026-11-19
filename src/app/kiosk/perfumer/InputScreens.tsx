'use client'

// SCENT! AI 조향사 — 시작 · 이름·성별(터치 키보드) · 스타일/성격/매력 고르기 (목업 01 · 02)

import type { ComponentType } from 'react'
import {
  Camera, Check, Crown, Eye, Flame, Flower2, Glasses, Hand, HandHeart, Heart, HeartHandshake, Leaf,
  MessageCircle, Moon, Music, Ribbon, ScanEye, Shirt, Smile, Sparkle, Sprout, Sun,
} from 'lucide-react'
import { GENDER_OPTIONS } from '@/app/[locale]/input/constants'
import { PERFUMER_ART } from '@/lib/kiosk/perfumer-art'
import { BottomBar, Btn, StepDots, StepHead, Wordmark } from './ui'
import type { PerfumerCtx, PfPickKind } from './types'

type Icon = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>

/** 선택지 값(한국어 원본) → 선형 아이콘 */
const PICK_ICONS: Record<string, Icon> = {
  // 스타일
  귀여운: Ribbon, 섹시한: Flame, 시크한: Glasses, 우아한: Flower2, 활발한: Sun, 청량한: Sprout, 레트로: Camera, 캐주얼: Shirt,
  // 성격
  밝은: Sun, 차분한: Moon, 유머러스한: Smile, 수줍은: Heart, '자신감 있는': Crown, '사려 깊은': Leaf, 열정적인: Flame, 다정한: HeartHandshake,
  // 매력
  눈웃음: Eye, 목소리: Music, 손: Hand, 분위기: Sparkle, 눈빛: ScanEye, 미소: Smile, 말투: MessageCircle, 제스처: HandHeart,
}

export function AttractScreen({ ctx }: { ctx: PerfumerCtx }) {
  const { p } = ctx
  return (
    <section className="pf-screen pf-attract">
      <div className="pf-attract-head">
        <Wordmark size="lg" />
        <p className="pf-attract-sub">{p.brandSub}</p>
        <h1 className="pf-attract-title">
          {ctx.attractTitle[0]}
          <br />
          {ctx.attractTitle[1]}
        </h1>
      </div>
      {/* 장식 정물 — 눌러도 시작한다(버튼이 화면 아래에 있어 손이 먼저 가는 자리) */}
      <button type="button" className="pf-attract-art" tabIndex={-1} aria-hidden="true" onClick={ctx.start}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PERFUMER_ART.hero} alt="" />
      </button>
      <div className="pf-attract-foot">
        <p className="pf-attract-line">{p.attractLine}</p>
        <ol className="pf-attract-steps">
          {p.attractSteps.map((label, i) => (
            <li key={label}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {label}
            </li>
          ))}
        </ol>
        <Btn variant="primary" wide arrow onClick={ctx.start}>{p.attractCta}</Btn>
        <p className="pf-attract-note">{p.attractFoot}</p>
      </div>
    </section>
  )
}

/** keyboardApart: 자판을 이 화면 안에 그리지 않는다 — 영상판은 이름 칸 위 말풍선으로 따로 띄운다(PerfumerApp KeyboardPop) */
/** 영상판 첫 화면 — SIP! 영상판처럼 유리판 없이 영상 위에 큰 제목 · 'OO에서 OO까지' · 터치하여 시작. 화면 어디를 눌러도 시작한다 */
const VIDEO_ATTRACT: Record<PerfumerCtx['lang'], [string, string]> = {
  ko: ['골목에서 부티크까지', '터치하여 시작'],
  en: ['From the lane to the boutique', 'Touch to start'],
  ja: ['路地からブティックまで', 'タッチしてスタート'],
  'zh-Hans': ['从小巷到香水精品店', '触摸开始'],
  'zh-Hant': ['從小巷到香水精品店', '觸摸開始'],
}

export function VideoAttractScreen({ ctx }: { ctx: PerfumerCtx }) {
  const [tag, press] = VIDEO_ATTRACT[ctx.lang] ?? VIDEO_ATTRACT.ko
  return (
    <button type="button" className="scv-title" onClick={ctx.start} aria-label={press}>
      <span className="scv-logo" aria-label="SCENT!">SCENT<em>!</em></span>
      <span className="scv-tag">{tag}</span>
      <span className="scv-press">{press}</span>
    </button>
  )
}

export function InfoScreen({ ctx, keyboardApart = false }: { ctx: PerfumerCtx; keyboardApart?: boolean }) {
  const { p, t } = ctx
  const inline = ctx.keyboardOpen && !keyboardApart
  return (
    <section className="pf-screen" data-keyboard={inline || undefined}>
      <StepDots ctx={ctx} />
      <StepHead ctx={ctx} step="info" />
      <h1 className="pf-title">{t.infoTitleSelf}</h1>
      <p className="pf-desc">{p.infoDesc}</p>

      <p className="pf-field-label">
        {p.nameLabel}
        <span> · {p.optional}</span>
      </p>
      {/* 터치 전용 — 기기 키보드를 띄우지 않고 화면 자판을 연다 */}
      <button type="button" className="pf-field" data-focus={ctx.keyboardOpen || undefined} onClick={ctx.openKeyboard}>
        {ctx.name ? <span className="pf-field-value">{ctx.name}</span> : !ctx.keyboardOpen && <em>{t.namePlaceholder}</em>}
        {ctx.keyboardOpen && <i className="pf-caret" aria-hidden="true" />}
      </button>

      <p className="pf-field-label">{t.genderLabel}</p>
      <div className="pf-gender" role="radiogroup" aria-label={t.genderLabel}>
        {GENDER_OPTIONS.map((g) => {
          const on = ctx.gender === g.key
          return (
            <button key={g.key} type="button" role="radio" aria-checked={on} className="pf-option" data-on={on || undefined} onClick={() => ctx.setGender(g.key)}>
              {on && <span className="pf-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
              {t.gender[g.key as keyof typeof t.gender] ?? g.label}
            </button>
          )
        })}
      </div>

      {inline ? (
        <div className="pf-keyboard">{ctx.keyboard}</div>
      ) : (
        <div className="pf-info-art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PERFUMER_ART.profile} alt="" />
          {/* 이름 카드 — 손님이 쓴 이름이 그대로 올라간다(병에는 글자가 없다) */}
          <div className="pf-namecard">
            <span className="pf-namecard-name" data-empty={!ctx.name || undefined}>{ctx.name || p.cardGuest}</span>
            <span className="pf-namecard-mark">SCENT<em>!</em></span>
          </div>
        </div>
      )}

      <BottomBar>
        <Btn onClick={ctx.prev}>{t.prev}</Btn>
        <Btn variant="primary" arrow disabled={!ctx.gender} onClick={ctx.next}>{t.next}</Btn>
      </BottomBar>
    </section>
  )
}

const PICK_TITLE: Record<PfPickKind, 'styleTitle' | 'personalityTitle' | 'charmTitle'> = {
  style: 'styleTitle', personality: 'personalityTitle', charm: 'charmTitle',
}

export function PickScreen({ ctx, kind }: { ctx: PerfumerCtx; kind: PfPickKind }) {
  const { p, t } = ctx
  const selected = ctx.picks[kind]
  const full = selected.length >= ctx.maxPick
  const last = kind === 'charm'
  return (
    <section className="pf-screen pf-pick" data-kind={kind}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pf-pick-deco" src={PERFUMER_ART[kind]} alt="" aria-hidden="true" />
      <StepDots ctx={ctx} />
      <StepHead ctx={ctx} step={kind} />
      <h1 className="pf-title pf-title--pick">{t[PICK_TITLE[kind]]}</h1>
      <p className="pf-desc">{t.pickUpTo(ctx.maxPick)}</p>
      <p className="pf-picked" data-full={full || undefined} aria-live="polite">{p.picked(selected.length, ctx.maxPick)}</p>
      <div className="pf-cards">
        {ctx.pickOptions[kind].map((value) => {
          const on = selected.includes(value)
          const Icon = PICK_ICONS[value] ?? Sparkle
          return (
            <button
              key={value}
              type="button"
              className="pf-card"
              aria-pressed={on}
              data-on={on || undefined}
              // 세 개를 채운 뒤 새 항목은 눌러도 바뀌지 않는다 — 눈으로 보이게
              data-muted={(!on && full) || undefined}
              onClick={() => ctx.togglePick(kind, value)}
            >
              <Icon size={34} strokeWidth={1.4} aria-hidden="true" />
              <span>{ctx.pickLabels[kind][value] ?? value}</span>
              {on && <span className="pf-check pf-card-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
            </button>
          )
        })}
      </div>
      <BottomBar>
        <Btn onClick={ctx.prev}>{t.prev}</Btn>
        <Btn variant="primary" arrow disabled={selected.length === 0} onClick={ctx.next}>{last ? p.toPhoto : t.next}</Btn>
      </BottomBar>
    </section>
  )
}
