'use client'

import { useEffect, useRef } from 'react'

/**
 * 결과 화면 — 스크롤해서 화면에 들어오는 부분이 차례로 나타나게 한다.
 * 돌려준 ref 를 단 요소 안의 [data-reveal] 이 보이기 시작하면 data-shown 을 붙인다(모양은 program-motion.css).
 *  · 감추는 것은 이 훅이 붙었을 때만이다(data-reveal-on) — 스크립트가 돌지 않으면 글이 가려진 채 남지 않고 그냥 다 보인다.
 *  · 한 번에 같이 들어온 것들은 위에서부터 조금씩 늦춰 나타낸다. 한 번 나타난 것은 다시 감추지 않는다.
 *  · 나중에 생긴 요소(옷 색 미리보기가 준비된 뒤의 칸 등)도 다음 렌더 때 찾아 지켜본다.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const observer = useRef<IntersectionObserver | null>(null)
  const watched = useRef(new WeakSet<Element>())

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      entering.forEach((entry, index) => {
        const el = entry.target as HTMLElement
        el.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 80}ms`)
        el.setAttribute('data-shown', '')
        io.unobserve(el)
      })
    }, { rootMargin: '0px 0px -6% 0px' })
    observer.current = io
    // 지켜보는 목록도 새로 — 지켜보던 것은 앞의 관찰자와 함께 끊겼다
    watched.current = new WeakSet()
    return () => {
      io.disconnect()
      observer.current = null
    }
  }, [])

  // 렌더마다 — 아직 지켜보지 않는 [data-reveal] 을 찾아 붙인다(값싼 조회 한 번)
  useEffect(() => {
    const root = ref.current
    const io = observer.current
    if (!root || !io) return
    root.setAttribute('data-reveal-on', '')
    root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-shown])').forEach((el) => {
      if (watched.current.has(el)) return
      watched.current.add(el)
      io.observe(el)
    })
  })

  return ref
}
