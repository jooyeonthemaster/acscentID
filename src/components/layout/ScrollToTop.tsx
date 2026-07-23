'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 클라이언트 라우팅 시 새 페이지를 최상단부터 보여준다.
 *
 * App Router의 기본 스크롤-투-탑은 대상 라우트가 Suspense로 서스펜드되면
 * (예: 상품 상세는 <Suspense> 폴백을 먼저 렌더) 이전 스크롤 위치가 그대로
 * 남는 경우가 있다. pathname 변경을 감지해 명시적으로 최상단으로 올린다.
 *
 * - 초기 로드/새로고침: 브라우저 스크롤 복원을 존중하기 위해 건너뛴다.
 * - 뒤로/앞으로(popstate): 이전 스크롤 위치 복원을 존중해 건너뛴다.
 * - 해시(#anchor) 이동: Next가 처리하는 앵커 스크롤을 존중해 건너뛴다.
 */
export function ScrollToTop() {
  const pathname = usePathname()
  const isPopRef = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    const onPop = () => { isPopRef.current = true }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    if (isPopRef.current) {
      isPopRef.current = false
      return
    }
    if (window.location.hash) return
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
