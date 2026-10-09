'use client'

// 키오스크 AI 타로 입력 단계 — 주제 고르기 → 질문 한 줄(선택) → 카드 세 장 뽑기.
// 기존·레트로 두 화면이 같은 .ksk-* 클래스를 쓰므로 단계 화면을 통째로 여기 두고 양쪽에서 부른다.
// 터치 키보드만 화면마다 달라서 keyboard 로 받아 그린다.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { BriefcaseBusiness, Coins, Heart, Shuffle, Sparkles, Sprout } from 'lucide-react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { TarotText } from '@/lib/kiosk/program-i18n'
import { TAROT_DECK, TAROT_PICK_COUNT, TAROT_POSITIONS, TAROT_TOPICS, preloadTarotArt, shuffleTarotDeck } from '@/lib/kiosk/tarot-deck'
import type { TarotDraw, TarotTopic } from '@/types/analysis'
import { TarotCardBack, TarotCardFace } from './TarotCard'
import { CUT_MS, SHUFFLE_MS, TarotShuffleAnimation } from './TarotShuffleAnimation'
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

export function TarotSteps({ step, session, tx, labels, lang, pill, onPrev, onNext, keyboard }: {
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
}) {
  const { deck, shuffle } = session
  // 카드 단계에 처음 들어올 때 한 번 섞는다 — 이전 단계로 갔다 와도 고른 카드는 그대로
  useEffect(() => {
    if (step === 'cards' && deck.length === 0) shuffle()
  }, [step, deck.length, shuffle])

  if (step === 'topic') {
    return (
      <div className="ksk-body trt-step" data-tarot-step="topic">
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
      <div className="ksk-body trt-step" data-tarot-step="question">
        <p className="ksk-eyebrow ksk-mono">{pill('question')}</p>
        <h1 className="ksk-title">{tx.questionTitle}</h1>
        <p className="ksk-desc">{tx.questionDesc}</p>
        <button className="ksk-input ksk-input-tall" data-empty={!session.question} onClick={() => session.setQuestionOpen(true)}>
          {session.question || tx.questionPh}
        </button>
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

  return <TarotCardSelection session={session} tx={tx} labels={labels} lang={lang} pill={pill} onPrev={onPrev} onNext={onNext} />
}

type DeckPhase = 'collecting' | 'shuffling' | 'cutting' | 'dealing' | 'ready' | 'revealing'
/** 단계 시간 — 모으기(다시 섞기에서만) → 섞기(리플 2번) → 컷 → 나눠 주기 → 선택 가능. 공개 뒤 '풀이 보기' 잠금 */
const PHASE_MS = { collecting: 620, shuffling: SHUFFLE_MS, cutting: CUT_MS, dealing: 950, revealing: 1400 } as const
/** 부채꼴(8+8+6)의 처음 높이 — 재기 전에도 섞기 영역이 부채꼴과 같은 높이가 되게 */
const FAN_HEIGHT_GUESS = 338
const MOTION_COPY: Record<KioskLang, { shuffling: string; cutting: string; dealing: string }> = {
  ko: { shuffling: '질문을 떠올리며 카드를 섞어요', cutting: '세 더미로 나누어 다시 모아요', dealing: '마음이 가는 카드를 찾아보세요' },
  en: { shuffling: 'Hold your question in mind as the cards shuffle', cutting: 'Cutting into three piles, then gathering', dealing: 'Find the cards you feel drawn to' },
  ja: { shuffling: '質問を思い浮かべながら、カードを混ぜます', cutting: '3つの山に分けて、もう一度重ねます', dealing: '心が惹かれるカードを探してください' },
  'zh-Hans': { shuffling: '想着你的问题，正在洗牌', cutting: '分成三叠，再重新合拢', dealing: '寻找吸引你的牌' },
  'zh-Hant': { shuffling: '想著你的問題，正在洗牌', cutting: '分成三疊，再重新合攏', dealing: '尋找吸引你的牌' },
}
const CARD_TRAVEL = { duration: .48, ease: [.22, 1, .36, 1] as const }

/** 데모의 섞기 → 컷 → 부채꼴 펼침을 22장·3장 선택 흐름에 맞춘다. */
function TarotCardSelection({ session, tx, labels, lang, pill, onPrev, onNext }: {
  session: TarotSession
  tx: TarotText
  labels: { prev: string; next: string }
  lang: KioskLang
  pill: (step: TarotStep) => string
  onPrev: () => void
  onNext: () => void
}) {
  const reducedMotion = useReducedMotion()
  const layoutId = useId()
  const deckRef = useRef<HTMLDivElement>(null)
  const [perRow, setPerRow] = useState(8)
  const [phase, setPhase] = useState<DeckPhase>(() => session.deck.length ? 'ready' : 'shuffling')
  const [tableHeight, setTableHeight] = useState(FAN_HEIGHT_GUESS)
  const { deck } = session
  const reshuffleDeck = session.shuffle
  const busy = phase !== 'ready'
  const full = session.picks.length >= TAROT_PICK_COUNT
  const copy = MOTION_COPY[lang]

  useEffect(() => {
    if (!deck.length || phase === 'ready') return
    const next: Record<Exclude<DeckPhase, 'ready'>, DeckPhase> = {
      collecting: 'shuffling',
      shuffling: 'cutting',
      cutting: 'dealing',
      dealing: 'ready',
      revealing: 'ready',
    }
    const timer = window.setTimeout(() => {
      // 펼친 카드가 가운데로 다 모인 뒤에 실제 덱을 새로 섞는다(고른 카드도 이때 비운다)
      if (phase === 'collecting') reshuffleDeck()
      setPhase(reducedMotion ? 'ready' : next[phase])
    }, reducedMotion ? 0 : PHASE_MS[phase])
    return () => window.clearTimeout(timer)
  }, [deck.length, phase, reducedMotion, reshuffleDeck])

  // 부채꼴이 다 깔렸을 때 높이를 기억해 둔다 — 다음 섞기 영역을 같은 높이로
  useEffect(() => {
    if (phase === 'ready' && deckRef.current?.offsetHeight) setTableHeight(deckRef.current.offsetHeight)
  }, [phase, perRow])

  // 타로 첫 화면을 건너뛰고 들어온 경우를 위해 여기서도 원화를 받아 둔다(한 번만 받는다)
  useEffect(() => preloadTarotArt(), [])

  useEffect(() => {
    const el = deckRef.current
    if (!el) return
    // Measure CSS pixels so the kiosk shell's zoom does not shrink touch targets.
    const observer = new ResizeObserver(([entry]) => setPerRow(Math.max(4, Math.min(8, Math.floor((entry.contentRect.width - 12) / 55)))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const reshuffle = () => {
    if (busy || session.revealed) return
    if (reducedMotion) {
      session.shuffle()
      return
    }
    // 펼친 카드(와 고른 카드)를 먼저 가운데로 모은다 — 덱은 모은 뒤에 섞는다(위 타이머)
    setPhase('collecting')
  }
  const rows = Array.from({ length: Math.ceil(deck.length / perRow) }, (_, row) => deck.slice(row * perRow, (row + 1) * perRow))
  const gathering = phase === 'shuffling' || phase === 'cutting'
  return (
    <LayoutGroup id={layoutId}>
    <div className="ksk-body trt-step" data-tarot-step="cards" data-revealed={session.revealed || undefined} data-deck-phase={phase}>
      <div className="trt-selection-progress" aria-hidden="true">
        {TAROT_POSITIONS.map((position, i) => <span key={position} data-filled={i < session.picks.length || undefined} />)}
      </div>
      <p className="ksk-eyebrow ksk-mono" aria-live="polite" aria-atomic="true">{pill('cards')} · {tx.picked(session.picks.length, TAROT_PICK_COUNT)}</p>
      <h1 className="ksk-title">{session.revealed ? tx.revealedTitle : tx.cardsTitle}</h1>
      {/* 고르기 시작하면 설명 자리에 '한 장 무르기' 안내를 보여 준다 — 줄을 더하면 화면이 넘친다(일본어) */}
      {!session.revealed && <p className="ksk-desc">{session.picks.length > 0 ? tx.undoHint : tx.cardsDesc}</p>}

      <div className="trt-slots" data-revealed={session.revealed || undefined}>
        {TAROT_POSITIONS.map((position, i) => {
          const draw = session.draws[i]
          const open = session.revealed && Boolean(draw)
          return (
            <div
              key={position}
              className="trt-slot"
              data-filled={Boolean(draw) || undefined}
            >
              <span className="trt-slot-pos">{tx.positions[position].label}</span>
              <button
                type="button"
                className="trt-slot-control"
                disabled={!draw || session.revealed || busy}
                aria-label={`${tx.positions[position].label} · ${draw && !session.revealed ? tx.undoHint : tx.positions[position].desc}`}
                onClick={() => session.unpick(session.picks[i])}
              >
                <div className="trt-flip" data-open={open || undefined} style={{ '--i': i } as CSSProperties}>
                  <div className="trt-flip-side trt-flip-back">
                    {draw ? <motion.div className="trt-moving-back" layoutId={reducedMotion ? undefined : `back-${draw.id}`} transition={CARD_TRAVEL}><TarotCardBack /></motion.div> : <div className="trt-card trt-card--empty"><span>{i + 1}</span></div>}
                  </div>
                  <div className="trt-flip-side trt-flip-front" aria-hidden={!open}>
                    {draw && <TarotCardFace id={draw.id} reversed={draw.reversed} lang={lang} />}
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

      <div ref={deckRef} className="trt-table" hidden={session.revealed} style={gathering ? { minHeight: tableHeight } : undefined}>
        {gathering && <TarotShuffleAnimation phase={phase} label={copy[phase]} />}
        {!gathering && <div className="trt-deck trt-deck--fan" role="group" aria-label={tx.cardsTitle}>
          {rows.map((row, rowIndex) => <div className="trt-fan-row" key={rowIndex} style={{ '--columns': perRow } as CSSProperties}>
          {row.map((card, column) => {
            const slot = rowIndex * perRow + column
            const picked = session.picks.includes(slot)
            const offset = row.length > 1 ? (column / (row.length - 1)) * 2 - 1 : 0
            return (
              <button
                key={slot}
                type="button"
                className="trt-deck-card trt-fan-card"
                style={{
                  '--fan-angle': `${offset * 10}deg`,
                  '--fan-drop': `${offset * offset * 13}px`,
                  '--deal-delay': `${rowIndex * 80 + column * 20}ms`,
                  // 부채꼴 한가운데(섞은 더미 자리)까지의 거리 — 카드 몇 장 폭·몇 줄인지. 나눠 줄 때 여기서 출발하고, 모을 때 여기로 간다
                  '--dx': (row.length - 1) / 2 - column,
                  '--dy': (rows.length - 1) / 2 - rowIndex,
                  '--collect-delay': `${(deck.length - 1 - slot) * 9}ms`,
                } as CSSProperties}
                data-picked={picked || undefined}
                // 고른 카드는 다시 누르면 취소된다. 세 장이 차면 나머지는 잠근다
                disabled={busy || (!picked && full)}
                aria-pressed={picked}
                aria-label={picked ? `${slot + 1} · ${tx.positions[TAROT_POSITIONS[session.picks.indexOf(slot)]].label} · ${tx.undoHint}` : `${slot + 1}`}
                onClick={() => (picked ? session.unpick(slot) : session.pick(slot))}
              >
                <span className="trt-fan-lift">{picked ? (
                  <span className="trt-card trt-card--picked" aria-hidden="true"><span>{session.picks.indexOf(slot) + 1}</span></span>
                ) : <motion.div className="trt-moving-back" layoutId={reducedMotion ? undefined : `back-${card.id}`} transition={CARD_TRAVEL}><TarotCardBack /></motion.div>}</span>
              </button>
            )
          })}</div>)}
        </div>}
        {phase === 'dealing' && <span className="trt-sr-only" role="status">{copy.dealing}</span>}
      </div>

      {/* 다시 섞기 — 버튼 바 위 흐림에 묻히지 않게 덱 바로 아래에 둔다(펼치기 전에만) */}
      {!session.revealed && (
        <p className="trt-hint">
          <button type="button" className="trt-hint-btn" disabled={busy} onClick={reshuffle}><Shuffle size={20} strokeWidth={1.7} aria-hidden="true" />{tx.reshuffle}</button>
        </p>
      )}

      {!session.revealed && <div style={{ flex: 1 }} />}
      {session.revealed ? (
        // 펼친 뒤에는 다시 섞을 수 없다 — 앞면을 보고 마음에 들 때까지 다시 뽑으면 '뽑기'가 아니다
        <div className="ksk-actions">
          <button className="ksk-btn ksk-btn-primary" disabled={busy} onClick={onNext}>{tx.readCards}</button>
        </div>
      ) : (
        <div className="ksk-actions">
          <button className="ksk-btn" onClick={onPrev}>{labels.prev}</button>
          <button className="ksk-btn ksk-btn-primary" disabled={!full || busy} onClick={() => { setPhase(reducedMotion ? 'ready' : 'revealing'); session.setRevealed(true) }}>{tx.reveal}</button>
        </div>
      )}
    </div>
    </LayoutGroup>
  )
}
