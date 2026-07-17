'use client'

import type { ReactNode } from 'react'
import { useViewportMode } from '@/hooks/useViewportMode'

interface ViewportSwitchProps {
  mobile: ReactNode
  desktop: ReactNode
}

/**
 * 모바일 트리(기존 JSX 무수정)와 데스크탑 트리를 lg(64rem) 기준으로 전환한다.
 *
 * - SSR/첫 페인트: 두 트리가 모두 DOM에 있고 CSS가 하나만 보여준다 → 어떤
 *   폭에서도 플래시 없음. display:contents 래퍼라 모바일 폭에서 레이아웃
 *   영향이 0이다(기존 렌더링과 바이트 동일한 박스 트리).
 * - 하이드레이션 후: matchMedia로 확정된 쪽만 남기고 반대 트리를
 *   언마운트한다 → 중복 effect·포털 누수·중복 id가 사라진다.
 * - key 고정으로 생존 트리는 모드 확정 시 리마운트되지 않는다(상태 보존).
 *
 * 사용 규칙: 공유 상태/데이터 훅은 페이지 본문에 두고 양 트리에 props로
 * 내려보낼 것(1024px 경계 리사이즈에도 상태가 살아남는다). 모달은 이
 * 컴포넌트 바깥 페이지 레벨에 하나만 둘 것.
 */
export function ViewportSwitch({ mobile, desktop }: ViewportSwitchProps) {
  const mode = useViewportMode()

  return (
    <>
      {mode !== 'desktop' && (
        <div key="m" className="contents lg:hidden">
          {mobile}
        </div>
      )}
      {mode !== 'mobile' && (
        <div key="d" className="hidden lg:contents">
          {desktop}
        </div>
      )}
    </>
  )
}
