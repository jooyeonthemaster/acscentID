'use client'

// 키오스크 AI 타로 입력 단계 — 주제 고르기 → 질문 한 줄(선택) → 카드 세 장 뽑기.
// 기존·레트로 두 화면이 같은 .ksk-* 클래스를 쓰므로 단계 화면을 통째로 여기 두고 양쪽에서 부른다.
// 터치 키보드만 화면마다 달라서 keyboard 로 받아 그린다.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ArrowRight, BriefcaseBusiness, Coins, Heart, Shuffle, Sparkles, Sprout } from 'lucide-react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { TarotText } from '@/lib/kiosk/program-i18n'
import { TAROT_DECK, TAROT_PICK_COUNT, TAROT_POSITIONS, TAROT_TOPICS, preloadTarotArt, shuffleTarotDeck } from '@/lib/kiosk/tarot-deck'
import type { TarotDraw, TarotTopic } from '@/types/analysis'
import { TarotCardBack, TarotCardFace } from './TarotCard'
import { CUT_MS, SHUFFLE_MS, TarotShuffleAnimation } from './TarotShuffleAnimation'
import { flipOpen, flyCardBack, glideFrom, spotOf, type Flight } from './tarot-flight'
import './programs.css'
import './moonlit-tarot.css'
import './tarot-motion.css'

export type TarotStep = 'topic' | 'question' | 'cards'

const TOPIC_ICONS = { general: Sparkles, love: Heart, career: BriefcaseBusiness, money: Coins, self: Sprout }

/** 타로 한 판의 상태 — 주제·질문·섞은 덱·고른 자리. 키오스크 화면이 들고 있다가 처음으로 돌아갈 때 reset 한다 */
export function useTarotSession() {
  const [topic, setTopic] = useState<TarotTopic | null>(null)
  const [question, setQuestion] = useState('')
  const [questionOpen, setQuestionOpen] = useState(false)
  const [deck, setDeck] = useState<TarotDraw[]>([])
  /** 고른 순서대로의 덱 자리 번호 */
  const [picks, setPicks] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)

  const shuffle = useCallback(() => {
    setDeck(shuffleTarotDeck())
    setPicks([])
    setRevealed(false)
  }, [])
  const pick = useCallback((slot: number) => {
    setPicks((list) => (list.includes(slot) || list.length >= TAROT_PICK_COUNT ? list : [...list, slot]))
  }, [])
  /** 잘못 누른 카드 한 장만 무른다 — 뒤의 카드가 한 자리씩 당겨진다(과거·현재·미래는 고른 순서) */
  const unpick = useCallback((slot: number) => {
    setPicks((list) => list.filter((s) => s !== slot))
  }, [])
  const reset = useCallback(() => {
    setTopic(null)
    setQuestion('')
    setQuestionOpen(false)
    setDeck([])
    setPicks([])
    setRevealed(false)
  }, [])
  /** 뽑힌 카드 — 과거·현재·미래 순서 */
  const draws = useMemo(() => picks.map((slot) => deck[slot]).filter(Boolean), [picks, deck])

  return { topic, setTopic, question, setQuestion, questionOpen, setQuestionOpen, deck, picks, pick, unpick, shuffle, revealed, setRevealed, draws, reset }
}

export type TarotSession = ReturnType<typeof useTarotSession>

export function TarotSteps({ step, session, tx, labels, lang, pill, onPrev, onNext, keyboard, questionNote, revealedDesc }: {
  step: TarotStep
  session: TarotSession
  tx: TarotText
  labels: { prev: string; next: string }
  lang: KioskLang
  /** 단계 표시 '03 · TOPIC' — 다른 단계와 같은 번호 매김(화면 쪽 stepPill) */
  pill: (step: TarotStep) => string
  onPrev: () => void
  /** 마지막 단계(cards)에서는 분석을 시작한다 */
  onNext: () => void
  keyboard: (props: { value: string; onChange: (value: string) => void; onClose: () => void; maxLength: number; hint: string }) => ReactNode
  /** 질문 칸 아래 '질문은 선택 사항입니다.'(목업 T05) */
  questionNote?: string
  /** 카드를 펼친 뒤 제목 아래 한 줄(목업 T11) — 손님 이름이 들어간다 */
  revealedDesc?: string
}) {
  const { deck, shuffle } = session
  // 카드 단계에 처음 들어올 때 한 번 섞는다 — 이전 단계로 갔다 와도 고른 카드는 그대로
  useEffect(() => {
    if (step === 'cards' && deck.length === 0) shuffle()
  }, [step, deck.length, shuffle])

  if (step === 'topic') {
    return (
      <div key="topic" className="ksk-body trt-step" data-tarot-step="topic">
        <p className="ksk-eyebrow ksk-mono">{pill('topic')}</p>
        <h1 className="ksk-title">{tx.topicTitle}</h1>
        <p className="ksk-desc">{tx.topicDesc}</p>
        <div className="ksk-purposes">
          {TAROT_TOPICS.map((id) => {
            const Icon = TOPIC_ICONS[id]
            return (
              <button key={id} type="button" className="ksk-purpose" data-on={session.topic === id} aria-pressed={session.topic === id} onClick={() => session.setTopic(id)}>
                <span className="trt-topic-icon"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span>
                <b>{tx.topics[id].label}</b>
                <span>{tx.topics[id].desc}</span>
              </button>
            )
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div className="ksk-actions">
          <button className="ksk-btn" onClick={onPrev}>{labels.prev}</button>
          <button className="ksk-btn ksk-btn-primary" disabled={!session.topic} onClick={onNext}>{labels.next}</button>
        </div>
      </div>
    )
  }

  if (step === 'question') {
    return (
      <div key="question" className="ksk-body trt-step" data-tarot-step="question">
        <p className="ksk-eyebrow ksk-mono">{pill('question')}</p>
        <h1 className="ksk-title">{tx.questionTitle}</h1>
        <p className="ksk-desc">{tx.questionDesc}</p>
        <button className="ksk-input ksk-input-tall" data-empty={!session.question} onClick={() => session.setQuestionOpen(true)}>
          {session.question || tx.questionPh}
        </button>
        {questionNote && !session.questionOpen && <p className="trt-question-note">{questionNote}</p>}
        <div style={{ flex: 1 }} />
        {session.questionOpen ? (
          keyboard({
            value: session.question,
            onChange: session.setQuestion,
            onClose: () => session.setQuestionOpen(false),
            maxLength: 40,
            hint: tx.questionHint,
          })
        ) : (
          <div className="ksk-actions">
            <button className="ksk-btn" onClick={onPrev}>{labels.prev}</button>
            <button className="ksk-btn ksk-btn-primary" onClick={onNext}>{session.question.trim() ? labels.next : tx.skip}</button>
          </div>
        )}
      </div>
    )
  }

  return <TarotCardSelection session={session} tx={tx} labels={labels} lang={lang} pill={pill} onPrev={onPrev} onNext={onNext} revealedDesc={revealedDesc} />
}

type DeckPhase = 'collecting' | 'shuffling' | 'cutting' | 'dealing' | 'ready' | 'clearing' | 'revealing'
/**
 * 단계 시간 — 모으기(다시 섞기에서만) → 섞기(리플 2번) → 컷 → 나눠 주기 → 선택 가능.
 * 펼치기: 덱을 걷고(clearing) → 세 장이 가운데로 미끄러져 와 한 장씩 뒤집힌다(revealing, 끝나야 '풀이 보기').
 * 나눠 주기·모으기 시간은 tarot-motion.css 의 카드별 지연(--deal-delay · --collect-delay)과 맞춘다.
 */
const PHASE_MS = { collecting: 860, shuffling: SHUFFLE_MS, cutting: CUT_MS, dealing: 1280, clearing: 300, revealing: 1950 } as const
/** 한 장씩 나눠 주는 간격 · 모으는 간격(ms) */
const DEAL_GAP_MS = 28
const COLLECT_GAP_MS = 14
/** 펼치기 — 세 장이 가운데로 온 뒤 첫 장이 뒤집히기까지 · 장 사이 간격(ms). tarot-motion.css 의 캡션 지연과 맞춘다 */
const FLIP_START_MS = 520
const FLIP_GAP_MS = 240
/** 부채꼴(8+8+6)의 처음 높이 — 재기 전에도 섞기 영역이 부채꼴과 같은 높이가 되게 */
const FAN_HEIGHT_GUESS = 338
const MOTION_COPY: Record<KioskLang, { shuffling: string; cutting: string; dealing: string }> = {
  ko: { shuffling: '질문을 떠올리며 카드를 섞어요', cutting: '세 더미로 나누어 다시 모아요', dealing: '마음이 가는 카드를 찾아보세요' },
  en: { shuffling: 'Hold your question in mind as the cards shuffle', cutting: 'Cutting into three piles, then gathering', dealing: 'Find the cards you feel drawn to' },
  ja: { shuffling: '質問を思い浮かべながら、カードを混ぜます', cutting: '3つの山に分けて、もう一度重ねます', dealing: '心が惹かれるカードを探してください' },
  'zh-Hans': { shuffling: '想着你的问题，正在洗牌', cutting: '分成三叠，再重新合拢', dealing: '寻找吸引你的牌' },
  'zh-Hant': { shuffling: '想著你的問題，正在洗牌', cutting: '分成三疊，再重新合攏', dealing: '尋找吸引你的牌' },
}

/**
 * 22장을 세 줄 부채꼴(8+8+6)로 펼치고 세 장을 고른다.
 * 움직임은 모두 transform·opacity 만 쓴다(CSS 애니메이션 · Web Animations) — 화면을 다시 짜지 않고 그래픽 스레드에서 돈다.
 *  · 고르기: 누른 카드가 살짝 들려 과거·현재·미래 자리로 휘어 날아가 내려앉는다(tarot-flight.ts). 무르면 제자리로 돌아간다.
 *  · 다시 섞기: 펼친 카드와 고른 카드가 가운데 더미로 모인 뒤 섞기 → 컷 → 다시 나눠 주기.
 *  · 펼치기: 덱이 걷히고 → 세 장이 가운데로 커지며 미끄러져 와 → 한 장씩 들려 뒤집힌다.
 */
function TarotCardSelection({ session, tx, labels, lang, pill, onPrev, onNext, revealedDesc }: {
  session: TarotSession
  tx: TarotText
  labels: { prev: string; next: string }
  lang: KioskLang
  pill: (step: TarotStep) => string
  onPrev: () => void
  onNext: () => void
  revealedDesc?: string
}) {
  // 카드 연출은 기기의 '움직임 줄이기' 설정을 따르지 않는다. 매장 PC 는 윈도우를 '최적 성능'으로 맞춰 두어
  // 창 애니메이션이 꺼져 있고, 그러면 브라우저가 prefers-reduced-motion 으로 알려 온다 — 손님이 고른 설정이 아니라
  // 기기 사양 조정인데, 그걸 따르면 섞기·펼치기·고르기·뒤집기가 통째로 사라져 '다시 섞기'는 눌러도 아무 일도 없어 보인다
  // (2026-10-10 실기에서 확인). 연출은 transform·opacity 만 쓰므로 느린 기기에서도 부담이 작다.
  const layerRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const slotsRef = useRef<HTMLDivElement>(null)
  const slotEls = useRef<(HTMLDivElement | null)[]>([])
  const fanEls = useRef<(HTMLButtonElement | null)[]>([])
  const flights = useRef(new Set<Flight>())
  /** 펼치기 직전 세 자리의 위치 — 자리가 바뀐 뒤 여기서부터 미끄러져 간다 */
  const slotsBefore = useRef<DOMRect | null>(null)
  const picksBefore = useRef(session.picks)
  const [perRow, setPerRow] = useState(8)
  const [phase, setPhase] = useState<DeckPhase>(() => session.deck.length ? 'ready' : 'shuffling')
  const [tableHeight, setTableHeight] = useState(FAN_HEIGHT_GUESS)
  /** 자리로 날아가는 중인 카드(id) — 도착할 때까지 자리는 비어 보인다 */
  const [arriving, setArriving] = useState<number[]>([])
  /** 부채꼴로 돌아가는 중인 덱 자리 — 도착할 때까지 빈 칸으로 보인다 */
  const [returning, setReturning] = useState<number[]>([])
  const { deck, picks, revealed, setRevealed } = session
  const reshuffleDeck = session.shuffle
  const flying = arriving.length > 0 || returning.length > 0
  const busy = phase !== 'ready'
  const full = picks.length >= TAROT_PICK_COUNT
  const copy = MOTION_COPY[lang]

  useEffect(() => {
    if (!deck.length || phase === 'ready') return
    const next: Record<Exclude<DeckPhase, 'ready'>, DeckPhase> = {
      collecting: 'shuffling',
      shuffling: 'cutting',
      cutting: 'dealing',
      dealing: 'ready',
      clearing: 'revealing',
      revealing: 'ready',
    }
    const timer = window.setTimeout(() => {
      // 펼친 카드가 가운데로 다 모인 뒤에 실제 덱을 새로 섞는다(고른 카드도 이때 비운다)
      if (phase === 'collecting') reshuffleDeck()
      if (phase === 'clearing') {
        // 덱이 걷혔다 — 자리가 바뀌기 전 위치를 재 두고 앞면을 연다(아래 useLayoutEffect 가 이어받는다)
        slotsBefore.current = slotsRef.current?.getBoundingClientRect() ?? null
        setRevealed(true)
      }
      setPhase(next[phase])
    }, PHASE_MS[phase])
    return () => window.clearTimeout(timer)
  }, [deck.length, phase, reshuffleDeck, setRevealed])

  // 펼치기 — 세 자리가 가운데로 옮겨지고 커지는 것을 미끄러지듯 잇고(FLIP), 이어서 한 장씩 뒤집는다
  useLayoutEffect(() => {
    const before = slotsBefore.current
    slotsBefore.current = null
    if (!revealed || !before || !slotsRef.current) return
    glideFrom(slotsRef.current, before)
    slotEls.current.forEach((el, i) => flipOpen(el?.firstElementChild as HTMLElement | null, FLIP_START_MS + i * FLIP_GAP_MS))
  }, [revealed])

  // 한 장을 무르면 뒤의 카드가 한 자리씩 당겨진다 — 옆 자리에서 미끄러져 오게
  useLayoutEffect(() => {
    const before = picksBefore.current
    picksBefore.current = picks
    if (before.length <= picks.length || !picks.length) return
    const [a, b] = slotEls.current
    if (!a || !b) return
    const zoom = a.offsetWidth ? a.getBoundingClientRect().width / a.offsetWidth : 1
    const step = (b.getBoundingClientRect().left - a.getBoundingClientRect().left) / zoom
    picks.forEach((slot, index) => {
      const was = before.indexOf(slot)
      if (was > index) slotEls.current[index]?.animate([{ transform: `translateX(${(was - index) * step}px)` }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.3,.05,.15,1)' })
    })
  }, [picks])

  // 부채꼴이 다 깔렸을 때 높이를 기억해 둔다 — 다음 섞기 영역을 같은 높이로
  useEffect(() => {
    if (phase === 'ready' && deckRef.current?.offsetHeight) setTableHeight(deckRef.current.offsetHeight)
  }, [phase, perRow])

  // 타로 첫 화면을 건너뛰고 들어온 경우를 위해 여기서도 원화를 받아 둔다(한 번만 받는다)
  useEffect(() => preloadTarotArt(), [])

  // 화면을 나가면 날아가던 카드를 치운다
  useEffect(() => {
    const active = flights.current
    return () => { active.forEach((flight) => flight.cancel()); active.clear() }
  }, [])

  useEffect(() => {
    const el = deckRef.current
    if (!el) return
    // Measure CSS pixels so the kiosk shell's zoom does not shrink touch targets.
    const observer = new ResizeObserver(([entry]) => setPerRow(Math.max(4, Math.min(8, Math.floor((entry.contentRect.width - 12) / 55)))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const rows = Array.from({ length: Math.ceil(deck.length / perRow) }, (_, row) => deck.slice(row * perRow, (row + 1) * perRow))
  /** 부채꼴에서 그 자리 카드의 기울기 — -1(왼쪽 끝) ~ 1(오른쪽 끝) */
  const lean = (slot: number) => {
    const row = rows[Math.floor(slot / perRow)]
    return row && row.length > 1 ? ((slot % perRow) / (row.length - 1)) * 2 - 1 : 0
  }

  const launch = (flight: Flight, landed: () => void) => {
    flights.current.add(flight)
    void flight.done.then((ok) => {
      flights.current.delete(flight)
      if (!ok) return
      // 진짜 카드를 먼저 그려 놓고(동기) 날아온 카드를 치운다 — 한 프레임도 비지 않게
      flushSync(landed)
      flight.remove()
    })
  }

  const pickCard = (slot: number) => {
    if (busy || full || returning.includes(slot)) return
    const card = deck[slot]
    const layer = layerRef.current
    const from = fanEls.current[slot]
    const to = slotEls.current[picks.length]
    session.pick(slot)
    if (!card || !layer || !from || !to) return
    setArriving((list) => [...list, card.id])
    launch(flyCardBack(layer, spotOf(layer, from, 'fan', lean(slot) * 10), spotOf(layer, to, 'slot')), () => setArriving((list) => list.filter((id) => id !== card.id)))
  }

  const unpickCard = (slot: number | undefined) => {
    // 날아오는 카드가 있을 때는 자리가 당겨지면 엉뚱한 곳에 내려앉는다 — 다 내려앉은 뒤에 무른다
    if (slot === undefined || busy || revealed || arriving.length) return
    const index = picks.indexOf(slot)
    if (index < 0) return
    const layer = layerRef.current
    const from = slotEls.current[index]
    const to = fanEls.current[slot]
    session.unpick(slot)
    if (!layer || !from || !to) return
    setReturning((list) => [...list, slot])
    launch(flyCardBack(layer, spotOf(layer, from, 'slot'), spotOf(layer, to, 'fan', lean(slot) * 10)), () => setReturning((list) => list.filter((s) => s !== slot)))
  }

  const reshuffle = () => {
    if (busy || flying || revealed) return
    // 고른 카드도 자리에서 가운데 더미로 날아가 섞인다(펼친 카드는 CSS 가 모은다). 덱은 다 모인 뒤에 섞는다(위 타이머)
    const layer = layerRef.current
    const table = deckRef.current
    const sample = fanEls.current.find(Boolean)
    if (layer && table && sample) {
      const pile = { ...spotOf(layer, table, 'fan'), width: sample.offsetWidth }
      picks.forEach((_, index) => {
        const from = slotEls.current[index]
        if (!from) return
        const flight = flyCardBack(layer, spotOf(layer, from, 'slot'), pile, { delay: 60 + index * 80, fade: true })
        flights.current.add(flight)
        void flight.done.then(() => { flights.current.delete(flight); flight.remove() })
      })
    }
    setPhase('collecting')
  }

  const reveal = () => {
    if (!full || busy || flying) return
    setPhase('clearing')
  }

  const gathering = phase === 'shuffling' || phase === 'cutting'
  return (
    <div className="ksk-body trt-step" data-tarot-step="cards" data-revealed={revealed || undefined} data-deck-phase={phase}>
      <div className="trt-selection-progress" aria-hidden="true">
        {TAROT_POSITIONS.map((position, i) => <span key={position} data-filled={i < picks.length || undefined} />)}
      </div>
      <p className="ksk-eyebrow ksk-mono" aria-live="polite" aria-atomic="true">{pill('cards')} · {tx.picked(picks.length, TAROT_PICK_COUNT)}</p>
      <h1 className="ksk-title">{revealed ? tx.revealedTitle : tx.cardsTitle}</h1>
      {/* 고르기 시작하면 설명 자리에 '한 장 무르기' 안내를 보여 준다 — 줄을 더하면 화면이 넘친다(일본어) */}
      {!revealed && <p className="ksk-desc">{picks.length > 0 ? tx.undoHint : tx.cardsDesc}</p>}
      {revealed && revealedDesc && <p className="ksk-desc trt-revealed-desc">{revealedDesc}</p>}

      <div ref={slotsRef} className="trt-slots" data-revealed={revealed || undefined}>
        {TAROT_POSITIONS.map((position, i) => {
          const draw = session.draws[i]
          const open = revealed && Boolean(draw)
          // 날아오는 중이거나(도착 전) 다시 섞으러 떠난 카드는 자리에 없다
          const landed = Boolean(draw) && !arriving.includes(draw.id) && phase !== 'collecting'
          return (
            <div key={position} className="trt-slot" data-filled={landed || undefined} style={{ '--i': i } as CSSProperties}>
              <span className="trt-slot-pos">{tx.positions[position].label}</span>
              <button
                type="button"
                className="trt-slot-control"
                disabled={!landed || revealed || busy}
                aria-label={`${tx.positions[position].label} · ${draw && !revealed ? tx.undoHint : tx.positions[position].desc}`}
                onClick={() => unpickCard(picks[i])}
              >
                <div ref={(el) => { slotEls.current[i] = el }} className="trt-flip" data-open={open || undefined}>
                  <div className="trt-flip-inner">
                    <div className="trt-flip-side trt-flip-back">
                      {landed ? <TarotCardBack /> : <div className="trt-card trt-card--empty"><span>{i + 1}</span></div>}
                    </div>
                    <div className="trt-flip-side trt-flip-front" aria-hidden={!open}>
                      {draw && <TarotCardFace id={draw.id} reversed={draw.reversed} lang={lang} />}
                    </div>
                  </div>
                </div>
              </button>
              <span className="trt-slot-name">
                {/* 역방향 카드는 이름이 거꾸로 보이므로 캡션에 이름과 방향을 같이 적는다 */}
                {open ? `${TAROT_DECK[draw.id].names[lang]} · ${draw.reversed ? tx.reversed : tx.upright}` : tx.positions[position].desc}
              </span>
            </div>
          )
        })}
      </div>

      <div ref={deckRef} className="trt-table" hidden={revealed} style={gathering ? { minHeight: tableHeight } : undefined}>
        {gathering && <TarotShuffleAnimation phase={phase} label={copy[phase]} />}
        {!gathering && <div className="trt-deck trt-deck--fan" role="group" aria-label={tx.cardsTitle} data-full={(full && phase === 'ready') || undefined}>
          {rows.map((row, rowIndex) => <div className="trt-fan-row" key={rowIndex} style={{ '--columns': perRow } as CSSProperties}>
          {row.map((card, column) => {
            const slot = rowIndex * perRow + column
            const order = picks.indexOf(slot)
            const picked = order >= 0
            const away = picked || returning.includes(slot)
            const offset = lean(slot)
            return (
              <button
                key={slot}
                ref={(el) => { fanEls.current[slot] = el }}
                type="button"
                className="trt-deck-card trt-fan-card"
                style={{
                  '--fan-angle': `${offset * 10}deg`,
                  '--fan-drop': `${offset * offset * 13}px`,
                  '--deal-delay': `${slot * DEAL_GAP_MS}ms`,
                  // 부채꼴 한가운데(섞은 더미 자리)까지의 거리 — 카드 몇 장 폭·몇 줄인지. 나눠 줄 때 여기서 출발하고, 모을 때 여기로 간다
                  '--dx': (row.length - 1) / 2 - column,
                  '--dy': (rows.length - 1) / 2 - rowIndex,
                  '--collect-delay': `${(deck.length - 1 - slot) * COLLECT_GAP_MS}ms`,
                } as CSSProperties}
                data-picked={picked || undefined}
                data-away={away || undefined}
                // 고른 카드는 다시 누르면 취소된다. 세 장이 차면 나머지는 잠근다
                disabled={busy || (!picked && (full || away))}
                aria-pressed={picked}
                aria-label={picked ? `${slot + 1} · ${tx.positions[TAROT_POSITIONS[order]].label} · ${tx.undoHint}` : `${slot + 1}`}
                onClick={() => (picked ? unpickCard(slot) : pickCard(slot))}
              >
                <span className="trt-fan-lift">{away ? (
                  <span className="trt-card trt-card--picked" aria-hidden="true">{picked && <span>{order + 1}</span>}</span>
                ) : <TarotCardBack />}</span>
              </button>
            )
          })}</div>)}
        </div>}
        {phase === 'dealing' && <span className="trt-sr-only" role="status">{copy.dealing}</span>}
      </div>

      {/* 다시 섞기 — 버튼 바 위 흐림에 묻히지 않게 덱 바로 아래에 둔다(펼치기 전에만) */}
      {!revealed && (
        <p className="trt-hint">
          <button type="button" className="trt-hint-btn" disabled={busy || flying} onClick={reshuffle}><Shuffle size={20} strokeWidth={1.7} aria-hidden="true" />{tx.reshuffle}</button>
        </p>
      )}

      {!revealed && <div style={{ flex: 1 }} />}
      {revealed ? (
        // 펼친 뒤에는 다시 섞을 수 없다 — 앞면을 보고 마음에 들 때까지 다시 뽑으면 '뽑기'가 아니다
        <div className="ksk-actions">
          <button className="ksk-btn ksk-btn-primary trt-read-btn" disabled={busy} onClick={onNext}><span>{tx.readCards}</span><ArrowRight size={24} strokeWidth={2} aria-hidden="true" /></button>
        </div>
      ) : (
        <div className="ksk-actions">
          <button className="ksk-btn" onClick={onPrev}>{labels.prev}</button>
          <button className="ksk-btn ksk-btn-primary" disabled={!full || busy || flying} onClick={reveal}>{tx.reveal}</button>
        </div>
      )}
      {/* 날아가는 카드가 그려지는 층 — 누를 수 없고, 화면 구성에 끼어들지 않는다 */}
      <div ref={layerRef} className="trt-flight-layer" aria-hidden="true" />
    </div>
  )
}
