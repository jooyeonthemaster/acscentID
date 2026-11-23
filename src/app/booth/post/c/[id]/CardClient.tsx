'use client'

import { useEffect, useRef, useState } from 'react'
import { pen } from '../../fonts'
import type { PostCard } from '@/lib/post/store'

export function CardClient({ id }: { id: string }) {
  const [card, setCard] = useState<PostCard | null | 'missing'>(null)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch(`/api/post/card/${id}`).then((r) => (r.ok ? r.json() : 'missing')).then(setCard).catch(() => setCard('missing'))
  }, [id])

  if (card === 'missing') return <main className="pm"><div className="pm-logo">POST!</div><h1>엽서를 찾지 못했어요</h1><p>보관 기간이 지났을 수 있어요.</p></main>
  if (!card) return <main className="pm"><div className="pm-logo">POST!</div></main>

  const openEnv = () => { setOpen(true); window.setTimeout(() => setShown(true), 650) }

  return (
    <main className={`pm ${pen.variable}`}>
      <div className="pm-logo">POST! 우체통 한통</div>
      {!shown ? (
        <>
          <h1>{card.santa ? '북극에서 답장이 왔어요' : `${card.fromName || '누군가'}님이 엽서를 보냈어요`}</h1>
          <div className="pm-env" data-open={open} onClick={openEnv}>
            <div className="pm-env-body" />
            <div className="pm-env-flap" />
            <div className="pm-env-seal">POST!</div>
            <div className="pm-env-to">{card.toLine}</div>
          </div>
          <p>봉투를 눌러 열어 보세요</p>
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pm-card" src={`/api/post/card/${card.id}/card.jpg`} alt="엽서" />
          {card.hasVoice && (
            <div className="pm-btns">
              <button type="button" className="pm-btn pm-btn--solid" onClick={() => { if (!audio.current) audio.current = new Audio(`/api/post/card/${card.id}/voice.wav`); void audio.current.play() }}>
                {card.santa ? '내가 보낸 목소리 듣기' : '목소리로 듣기'}
              </button>
            </div>
          )}
          <p className="pm-foot">POST! 우체통 한통이 배달한 엽서예요.</p>
        </>
      )}
    </main>
  )
}
