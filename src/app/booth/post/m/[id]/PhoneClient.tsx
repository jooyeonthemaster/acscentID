'use client'

// 손님 휴대폰 — 우체통과 연결 → 엽서가 오면 [카카오톡 친구에게 보내기] · [다른 방법으로 보내기] · [내 엽서 저장하기]
// 받는 사람 번호는 받지 않는다. 친구는 손님 자기 카톡(또는 휴대폰 공유창)에서 고른다.
import { useEffect, useState } from 'react'
import { pen } from '../../fonts'
import type { PostCard } from '@/lib/post/store'

declare global {
  interface Window { Kakao?: { isInitialized(): boolean; init(key: string): void; Share: { sendDefault(o: unknown): void } } }
}

// 카카오 JavaScript SDK — NEXT_PUBLIC_KAKAO_JS_KEY 가 있을 때만 읽는다(카카오 개발자 앱에 이 사이트 도메인 등록 필요).
// 버전은 카카오 개발자 문서의 최신 안내로 확인할 것.
const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'

function loadKakao(key: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ready = () => { try { if (!window.Kakao!.isInitialized()) window.Kakao!.init(key); resolve(true) } catch { resolve(false) } }
    if (window.Kakao) return ready()
    const s = document.createElement('script')
    s.src = KAKAO_SDK
    s.async = true
    s.onload = ready
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

export function PhoneClient({ sessionId, kakaoKey }: { sessionId: string; kakaoKey: string | null }) {
  const [state, setState] = useState<'joining' | 'waiting' | 'ready' | 'error'>('joining')
  const [card, setCard] = useState<PostCard | null>(null)
  const [kakao, setKakao] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let timer = 0
    ;(async () => {
      const j = await fetch(`/api/post/session/${sessionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join' }) })
      if (!j.ok) { setState('error'); return }
      setState('waiting')
      const poll = async () => {
        const s = await fetch(`/api/post/session/${sessionId}`).then((r) => r.json()).catch(() => null)
        if (!alive) return
        if (s?.cardId) {
          const c = await fetch(`/api/post/card/${s.cardId}`).then((r) => r.json()).catch(() => null)
          if (c?.id) { setCard(c); setState('ready'); return }
        }
        timer = window.setTimeout(poll, 1500)
      }
      void poll()
    })()
    return () => { alive = false; window.clearTimeout(timer) }
  }, [sessionId])

  useEffect(() => {
    if (kakaoKey) void loadKakao(kakaoKey).then(setKakao)
  }, [kakaoKey])

  const log = (what: string) => { void fetch(`/api/post/session/${sessionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'log', what }) }) }

  if (state === 'error') return <main className="pm"><div className="pm-logo">POST!</div><h1>연결이 끝난 QR이에요</h1><p>우체통 앞에서 새로 시작해 주세요.</p></main>
  if (state !== 'ready' || !card) {
    return (
      <main className="pm">
        <div className="pm-logo">POST! 우체통 한통</div>
        <h1>우체통과 연결됐어요</h1>
        <p>엽서를 우체통에 넣으면<br />여기서 바로 배달할 수 있어요.</p>
        <div className="pm-env"><div className="pm-env-body" /><div className="pm-env-flap" /><div className="pm-env-seal">POST!</div></div>
      </main>
    )
  }

  const origin = window.location.origin
  const cardUrl = `${origin}/booth/post/c/${card.id}`
  const imgUrl = `${origin}/api/post/card/${card.id}/card.jpg`
  const who = card.fromName || '누군가'
  const title = card.santa ? '산타 할아버지 답장이 도착했어요' : `${who}님이 보낸 엽서가 도착했어요`

  const sendKakao = () => {
    log('kakao')
    if (kakao && window.Kakao) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title, description: 'POST! 우체통에서 부친 엽서예요', imageUrl: imgUrl, link: { mobileWebUrl: cardUrl, webUrl: cardUrl } },
        buttons: [{ title: '엽서 열어 보기', link: { mobileWebUrl: cardUrl, webUrl: cardUrl } }],
      })
    } else void shareOther(true)
  }
  const shareOther = async (fromKakao = false) => {
    if (!fromKakao) log('share')
    try {
      if (navigator.share) await navigator.share({ title, text: `${title} 💌`, url: cardUrl })
      else { await navigator.clipboard.writeText(cardUrl); setNote('주소를 복사했어요. 카톡 대화창에 붙여 넣어 주세요.') }
    } catch { /* 공유창을 닫음 */ }
  }

  return (
    <main className={`pm ${pen.variable}`}>
      <div className="pm-logo">POST! 우체통 한통</div>
      <h1>{card.recipient === 'me' ? '엽서가 완성됐어요' : '엽서가 완성됐어요.\n누구에게 배달할까요?'}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pm-card" src={imgUrl} alt="완성된 엽서" />
      <div className="pm-btns">
        {card.recipient !== 'me' && <button type="button" className="pm-btn pm-btn--kakao" onClick={sendKakao}>{card.santa ? '엄마 아빠에게 카톡으로 보내기' : '카카오톡 친구에게 보내기'}</button>}
        {card.recipient !== 'me' && <button type="button" className="pm-btn" onClick={() => void shareOther()}>다른 방법으로 보내기 (문자 등)</button>}
        <a className="pm-btn pm-btn--solid" href={imgUrl} download={`POST-엽서-${card.id}.jpg`} onClick={() => log('save')}>내 엽서 저장하기</a>
      </div>
      {note && <p>{note}</p>}
      {!kakaoKey && <p className="pm-foot">초안: 카카오 키(NEXT_PUBLIC_KAKAO_JS_KEY)가 없어 카톡 단추는 휴대폰 공유창을 엽니다.</p>}
      {card.santa && card.longLetter && <div className="pm-long">{card.longLetter}</div>}
    </main>
  )
}
