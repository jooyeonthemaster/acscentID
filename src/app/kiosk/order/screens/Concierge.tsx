'use client'

// AI 컨시어지 대화 — 손님 말을 이해 → 이 매장 데이터 검색 → 알레르기 대조 → 답변 쓰기 단계를 눈에 보이게 거친 뒤,
// 답을 한 글자씩 흘려 쓰고(스트리밍) 메뉴 카드·출처·안전 안내를 붙인다. 엔진은 ai-engine.ts(데이터 기반, 언어 모델 호출 없음).

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Check, Database, Footprints, Keyboard, Loader2, Mic, Plus, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { askAi, greetingAnswer, type AiAnswer, type SourceKey } from '@/lib/kiosk/order/ai-engine'
import { priceFor } from '@/lib/kiosk/order/diet'
import { foodSrc, won } from '@/lib/kiosk/order/format'
import { STORE, menuItem } from '@/lib/kiosk/order/menu'
import type { OrderLang } from '@/lib/kiosk/order/types'
import { useOrder, type ChatMsg } from '../store'
import { TouchKeyboard } from '../TouchKeyboard'
import { AiOrb, BottomSheet, CloseButton } from '../ui'

let msgSeq = 1000
/** 다 흘려 쓴 답 — 시트를 닫았다 열어도 다시 흘려 쓰지 않는다 */
const streamed = new Set<number>()

const SPEECH_LANG: Record<OrderLang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR' }

type Phase = 'understand' | 'search' | 'check' | 'write'

function useStream(text: string, active: boolean, lang: OrderLang, onTick?: () => void) {
  // 한 메시지는 한 번만 흘려 쓴다(생각 중 → 쓰는 중 → 끝). 쓰지 않을 때는 글 전체
  const [n, setN] = useState(0)
  const tick = useRef(onTick)
  useLayoutEffect(() => { tick.current = onTick })
  useEffect(() => {
    if (!active) return
    // 한·일은 글자, 영·불은 낱말 몇 개씩 — 실제 언어 모델이 토큰을 내보내는 느낌. 갱신 함수에는 부수 효과를 두지 않는다
    const step = lang === 'ko' || lang === 'ja' ? 2 : 4
    let shown = 0
    const id = window.setInterval(() => {
      shown = Math.min(text.length, shown + step + (shown % 3 === 0 ? 1 : 0))
      setN(shown)
      tick.current?.()
      if (shown >= text.length) window.clearInterval(id)
    }, 28)
    return () => window.clearInterval(id)
  }, [text, active, lang])
  return active ? Math.min(n, text.length) : text.length
}

function Thinking({ answer, onDone }: { answer: AiAnswer; onDone: () => void }) {
  const { t } = useOrder()
  const phases: Phase[] = answer.checked ? ['understand', 'search', 'check', 'write'] : ['understand', 'search', 'write']
  const [at, setAt] = useState(0)
  useEffect(() => {
    const durations = { understand: 520, search: 640, check: 520, write: 380 }
    let total = 0
    const timers = phases.map((p, i) => {
      total += durations[p]
      return window.setTimeout(() => setAt(i + 1), total)
    })
    timers.push(window.setTimeout(onDone, total + 120))
    return () => timers.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const label = (p: Phase) =>
    p === 'understand' ? t.ai.steps.understand
      : p === 'search' ? `${t.ai.steps.search}${at > 1 ? ` · ${t.ai.steps.found(Math.max(answer.found, answer.cards.length, 1))}` : ''}`
        : p === 'check' ? t.ai.steps.check : t.ai.steps.write
  return (
    <div className="ok-think">
      {answer.entities.length > 0 && (
        <motion.div className="ok-think-entities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <small>{t.ai.detected}</small>
          {answer.entities.map((e, i) => (
            <motion.span key={`${e.kind}-${e.label}`} className={`ok-entity is-${e.kind}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 400, damping: 22 }}>
              {e.label}
            </motion.span>
          ))}
        </motion.div>
      )}
      <ul>
        {phases.map((p, i) => (
          <li key={p} className={i < at ? 'is-done' : i === at ? 'is-active' : ''}>
            <span className="ok-think-icon">{i < at ? <Check size={13} strokeWidth={3} /> : i === at ? <Loader2 size={13} strokeWidth={3} className="ok-spin" /> : <i />}</span>
            {label(p)}
          </li>
        ))}
      </ul>
    </div>
  )
}

const SOURCE_ORDER: SourceKey[] = ['menu', 'ingredients', 'chef', 'orders', 'faq']

function AiMessage({ msg, scroll }: { msg: ChatMsg; scroll: () => void }) {
  const { state, dispatch, t } = useOrder()
  const answer = msg.answer!
  const fresh = !streamed.has(msg.id)
  const resolve = useCallback(() => {
    dispatch({ type: 'chat-resolve', id: msg.id, answer })
    if (answer.addToCart?.length) {
      for (const a of answer.addToCart) dispatch({ type: 'add', id: a.id, sel: a.sel })
    }
  }, [dispatch, msg.id, answer])
  const n = useStream(answer.text, !msg.pending && fresh, state.lang, scroll)
  const done = !msg.pending && n >= answer.text.length
  useEffect(() => {
    if (done) { streamed.add(msg.id); scroll() }
  }, [done, msg.id, scroll])

  return (
    <motion.div className="ok-msg is-ai" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
      <AiOrb size={30} thinking={msg.pending} className="ok-msg-avatar" />
      <div className="ok-msg-col">
        {msg.pending ? (
          <div className="ok-bubble lg is-thinking"><Thinking answer={answer} onDone={resolve} /></div>
        ) : (
          <>
            <div className="ok-bubble lg">
              {answer.text.slice(0, n).split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
              {!done && <i className="ok-caret is-stream" />}
            </div>
            <AnimatePresence>
              {done && answer.cards.length > 0 && (
                <motion.div key="cards" className="ok-msg-cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {answer.cards.map((card, i) => {
                    const item = menuItem(card.id)
                    if (!item) return null
                    const inCart = state.cart.some((l) => l.id === card.id)
                    return (
                      <motion.div key={card.id} className="ok-mini lg" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, type: 'spring', stiffness: 280, damping: 26 }}>
                        <button type="button" className="ok-mini-hit lg-press" onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'item', id: card.id, sel: card.sel } })}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={foodSrc(card.id, true)} alt="" draggable={false} />
                          <span>
                            <b>{item.name[state.lang]}</b>
                            <small>{card.reason}</small>
                            <em>{won(priceFor(item, card.sel))}</em>
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`ok-mini-add lg-press${inCart ? ' is-in' : ''}`}
                          aria-label={t.common.add}
                          onClick={() => {
                            dispatch({ type: 'add', id: card.id, sel: card.sel })
                            dispatch({ type: 'toast', text: `${item.name[state.lang]} · ${t.ai.added}` })
                          }}
                        >
                          {inCart ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                        </button>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
              {done && answer.nearby && (
                <motion.div key="nearby" className="ok-msg-cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {STORE.nearby.map((spot) => (
                    <div key={spot.id} className="ok-mini ok-mini--spot lg">
                      <span className="ok-spot-icon"><Footprints size={20} strokeWidth={2} /></span>
                      <span>
                        <b>{spot.name[state.lang]}</b>
                        <small>{spot.note[state.lang]}</small>
                        <em>{t.done.walk(spot.walkMin)}</em>
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
              {done && answer.sources.length > 0 && (
                <motion.div key="sources" className="ok-sources" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Database size={12} strokeWidth={2.4} />
                  {SOURCE_ORDER.filter((s) => answer.sources.includes(s)).map((s) => <span key={s}>{t.ai.sources[s]}</span>)}
                </motion.div>
              )}
              {done && answer.safety && (
                <motion.p key="safety" className="ok-safety" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                  <ShieldAlert size={15} strokeWidth={2.2} />{t.ai.safety}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  )
}

interface SpeechLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function speechCtor(): (new () => SpeechLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechLike; webkitSpeechRecognition?: new () => SpeechLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function Concierge() {
  const { state, dispatch, t } = useOrder()
  const open = state.sheet?.kind === 'ai'
  const asked = state.sheet?.kind === 'ai' ? state.sheet.ask : undefined
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [listening, setListening] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<SpeechLike | null>(null)
  const lastAsk = useRef<string | undefined>(undefined)

  const scroll = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const ctx = { lang: state.lang, country: state.country, profile: state.profile, lastDishId: state.lastDishId }

  const send = useCallback((raw: string) => {
    const text = raw.trim()
    if (!text) return
    const answer = askAi(text, ctx)
    dispatch({ type: 'chat', msg: { id: ++msgSeq, role: 'user', text } })
    dispatch({ type: 'chat', msg: { id: ++msgSeq, role: 'ai', text: '', answer, pending: true } })
    setInput('')
    setTyping(false)
    window.setTimeout(scroll, 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, scroll, state.lang, state.country, state.profile, state.lastDishId])

  // 처음 열면 인사, 메뉴 상세에서 질문을 들고 왔으면 바로 묻는다
  useEffect(() => {
    if (!open) { lastAsk.current = undefined; return }
    if (!state.chat.length) {
      const hello = greetingAnswer(ctx)
      dispatch({ type: 'greet', msg: { id: ++msgSeq, role: 'ai', text: hello.text, answer: hello } })
    }
    let askTimer = 0
    if (asked && lastAsk.current !== asked) {
      lastAsk.current = asked
      askTimer = window.setTimeout(() => send(asked), state.chat.length ? 150 : 900)
    }
    const scrollTimer = window.setTimeout(scroll, 60)
    return () => { window.clearTimeout(askTimer); window.clearTimeout(scrollTimer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asked])

  const thinking = state.chat.some((m) => m.pending)
  const lastAi = [...state.chat].reverse().find((m) => m.role === 'ai' && m.answer && !m.pending)
  const followUps = lastAi?.answer?.followUps?.length ? lastAi.answer.followUps : t.ai.suggestions

  const voice = () => {
    const Ctor = speechCtor()
    if (!Ctor) {
      dispatch({ type: 'toast', text: t.ai.voiceOff })
      setTyping(true)
      return
    }
    if (listening) { recRef.current?.stop(); return }
    try {
      const rec = new Ctor()
      rec.lang = SPEECH_LANG[state.lang]
      rec.interimResults = true
      rec.continuous = false
      let finalText = ''
      rec.onresult = (e) => {
        let text = ''
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript
          if (e.results[i].isFinal) finalText = text
        }
        setInput(text)
      }
      rec.onerror = () => {
        setListening(false)
        dispatch({ type: 'toast', text: t.ai.voiceOff })
      }
      rec.onend = () => {
        setListening(false)
        if (finalText) send(finalText)
      }
      recRef.current = rec
      rec.start()
      setListening(true)
    } catch {
      dispatch({ type: 'toast', text: t.ai.voiceOff })
    }
  }

  const close = () => {
    recRef.current?.stop()
    setTyping(false)
    setInput('')
    dispatch({ type: 'sheet', sheet: null })
  }

  return (
    <BottomSheet open={open} onClose={close} label={t.ai.name} className={`ok-sheet--ai${thinking ? ' is-thinking' : ''}`} height="95%">
      <div className="ok-ai-glow" aria-hidden="true" />
      <header className="ok-ai-head">
        <AiOrb size={52} thinking={thinking} />
        <div>
          <h2>{t.ai.name} <span className="ok-ai-badge">{t.ai.role}</span></h2>
          <p>{t.ai.knows(STORE.knowledge.dishes, STORE.knowledge.ingredients, STORE.knowledge.ownerNotes)}</p>
        </div>
        <CloseButton onClick={close} label={t.common.close} />
      </header>

      <div className="ok-chat" ref={listRef}>
        {state.chat.map((m) =>
          m.role === 'user' ? (
            <motion.div key={m.id} className="ok-msg is-user" initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }}>
              <div className="ok-bubble is-user">{m.text}</div>
            </motion.div>
          ) : (
            <AiMessage key={m.id} msg={m} scroll={scroll} />
          ),
        )}
      </div>

      <div className={`ok-ai-input${typing ? ' is-typing' : ''}`}>
        <div className="ok-chips-row ok-suggest">
          {followUps.map((q) => (
            <button key={q} type="button" className="ok-chip is-suggest lg-press" disabled={thinking} onClick={() => send(q)}>{q}</button>
          ))}
        </div>
        <div className="ok-ai-bar">
          <button type="button" className={`ok-iconbtn lg lg-press${listening ? ' is-live' : ''}`} onClick={voice} aria-label={t.ai.voice}>
            {listening ? <span className="ok-wave" aria-hidden="true"><i /><i /><i /><i /></span> : <Mic size={22} strokeWidth={2.2} />}
          </button>
          <button type="button" className="ok-ai-field lg lg-press" onClick={() => setTyping((v) => !v)}>
            {listening ? <span className="ok-ai-listening">{input || t.ai.listening}</span> : input ? <span>{input}</span> : <span className="ok-search-placeholder"><Keyboard size={17} strokeWidth={2} /> {t.ai.placeholder}</span>}
            {typing && <i className="ok-caret" />}
          </button>
          <button type="button" className="ok-send lg-press" disabled={!input.trim() || thinking} onClick={() => send(input)} aria-label={t.ai.send}>
            <ArrowUp size={22} strokeWidth={2.8} />
          </button>
        </div>
        <AnimatePresence>
          {typing && (
            <motion.div key="kb" className="ok-ai-kb" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <TouchKeyboard layout={state.lang} value={input} onChange={setInput} onEnter={() => send(input)} enterLabel={t.ai.send} maxLength={90} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  )
}
