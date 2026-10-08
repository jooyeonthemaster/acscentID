'use client'

// 키오스크 AI 타로 입력 단계 — 주제 고르기 → 질문 한 줄(선택) → 카드 세 장 뽑기.
// 기존·레트로 두 화면이 같은 .ksk-* 클래스를 쓰므로 단계 화면을 통째로 여기 두고 양쪽에서 부른다.
// 터치 키보드만 화면마다 달라서 keyboard 로 받아 그린다.

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { TarotText } from '@/lib/kiosk/program-i18n'
import { TAROT_DECK, TAROT_PICK_COUNT, TAROT_POSITIONS, TAROT_TOPICS, shuffleTarotDeck } from '@/lib/kiosk/tarot-deck'
import type { TarotDraw, TarotTopic } from '@/types/analysis'
import { TarotCardBack, TarotCardFace } from './TarotCard'
import './programs.css'

export type TarotStep = 'topic' | 'question' | 'cards'

const TOPIC_GLYPHS: Record<TarotTopic, string> = { general: '今', love: '戀', career: '業', money: '財', self: '我' }

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
      <div className="ksk-body">
        <p className="ksk-eyebrow ksk-mono">{pill('topic')}</p>
        <h1 className="ksk-title">{tx.topicTitle}</h1>
        <p className="ksk-desc">{tx.topicDesc}</p>
        <div className="ksk-purposes">
          {TAROT_TOPICS.map((id) => (
            <button key={id} className="ksk-purpose" data-on={session.topic === id} onClick={() => session.setTopic(id)}>
              <span className="ksk-purpose-hanja">{TOPIC_GLYPHS[id]}</span>
              <b>{tx.topics[id].label}</b>
              <span>{tx.topics[id].desc}</span>
            </button>
          ))}
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
      <div className="ksk-body">
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

  const full = session.picks.length >= TAROT_PICK_COUNT
  return (
    <div className="ksk-body">
      <p className="ksk-eyebrow ksk-mono">{pill('cards')} · {tx.picked(session.picks.length, TAROT_PICK_COUNT)}</p>
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
              // 펼치기 전에는 고른 자리를 눌러 그 한 장만 무를 수 있다
              role={draw && !session.revealed ? 'button' : undefined}
              onClick={draw && !session.revealed ? () => session.unpick(session.picks[i]) : undefined}
            >
              <span className="trt-slot-pos">{tx.positions[position].label}</span>
              <div className="trt-flip" data-open={open || undefined} style={{ '--i': i } as CSSProperties}>
                <div className="trt-flip-side trt-flip-back">
                  {draw ? <TarotCardBack /> : <div className="trt-card trt-card--empty">{i + 1}</div>}
                </div>
                <div className="trt-flip-side trt-flip-front">
                  {open && <TarotCardFace id={draw.id} reversed={draw.reversed} lang={lang} />}
                </div>
              </div>
              <span className="trt-slot-name">
                {/* 역방향 카드는 이름이 거꾸로 보이므로 캡션에 이름과 방향을 같이 적는다 */}
                {open ? `${TAROT_DECK[draw.id].names[lang]} · ${draw.reversed ? tx.reversed : tx.upright}` : tx.positions[position].desc}
              </span>
            </div>
          )
        })}
      </div>

      {!session.revealed && (
        <div className="trt-deck">
          {deck.map((_, slot) => {
            const picked = session.picks.includes(slot)
            return (
              <button
                key={slot}
                type="button"
                className="trt-deck-card"
                data-picked={picked || undefined}
                // 고른 카드는 다시 누르면 취소된다. 세 장이 차면 나머지는 잠근다
                disabled={!picked && full}
                aria-pressed={picked}
                aria-label={`${slot + 1}`}
                onClick={() => (picked ? session.unpick(slot) : session.pick(slot))}
              >
                <TarotCardBack />
              </button>
            )
          })}
        </div>
      )}

      {/* 다시 섞기 — 버튼 바 위 흐림에 묻히지 않게 덱 바로 아래에 둔다(펼치기 전에만) */}
      {!session.revealed && session.picks.length > 0 && (
        <p className="trt-hint">
          <button type="button" className="trt-hint-btn" onClick={shuffle}>{tx.reshuffle}</button>
        </p>
      )}

      <div style={{ flex: 1 }} />
      {session.revealed ? (
        // 펼친 뒤에는 다시 섞을 수 없다 — 앞면을 보고 마음에 들 때까지 다시 뽑으면 '뽑기'가 아니다
        <div className="ksk-actions">
          <button className="ksk-btn ksk-btn-primary" onClick={onNext}>{tx.readCards}</button>
        </div>
      ) : (
        <div className="ksk-actions">
          <button className="ksk-btn" onClick={onPrev}>{labels.prev}</button>
          <button className="ksk-btn ksk-btn-primary" disabled={!full} onClick={() => session.setRevealed(true)}>{tx.reveal}</button>
        </div>
      )}
    </div>
  )
}
