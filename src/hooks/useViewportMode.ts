'use client'

import { useSyncExternalStore } from 'react'
import { DESKTOP_MEDIA_QUERY } from '@/lib/desktop/routes'

export type ViewportMode = 'ssr' | 'mobile' | 'desktop'

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(DESKTOP_MEDIA_QUERY)
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getSnapshot(): ViewportMode {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches ? 'desktop' : 'mobile'
}

function getServerSnapshot(): ViewportMode {
  return 'ssr'
}

/**
 * SSR 안전 뷰포트 모드.
 *
 * 서버 렌더는 항상 'ssr'을 반환하고(하이드레이션 미스매치 원천 차단),
 * 하이드레이션 직후 페인트 전에 matchMedia 값('mobile' | 'desktop')으로
 * 동기화된다. 그 사이 어느 트리를 보일지는 CSS(lg:)가 결정한다.
 */
export function useViewportMode(): ViewportMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
