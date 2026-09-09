'use client'

import { useEffect } from 'react'

/**
 * 모달/바텀시트 표시 중 배경(body) 스크롤 잠금.
 * iOS Safari는 body에 overflow:hidden만 줘서는 배경 스크롤이 막히지 않으므로
 * position:fixed + 스크롤 위치 복원 방식을 사용한다 (FeedbackModal 패턴).
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const scrollY = window.scrollY
    const body = document.body
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    return () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [active])
}
