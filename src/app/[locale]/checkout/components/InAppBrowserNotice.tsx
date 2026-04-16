"use client"

import dynamic from "next/dynamic"

/**
 * 인앱브라우저 경고 배너 (클라이언트 전용).
 *
 * 검출 로직은 브라우저 navigator 의존이기 때문에 SSR 경로에서 제외하고
 * 하이드레이션 이후에만 렌더링한다. dynamic({ ssr: false }) 래핑은
 * React 19의 effect 내 setState 경고도 함께 회피한다.
 */
export const InAppBrowserNotice = dynamic(
  () =>
    import("./InAppBrowserNoticeClient").then((mod) => ({
      default: mod.InAppBrowserNoticeClient,
    })),
  { ssr: false }
)
