import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JbnuLanding } from './JbnuLanding'

// 2026학년도 2학기 JBNU 전공탐색박람회 — AI 체험존 랜딩(노트북 첫 화면). 박람회 키디자인 + 체험 블록 셋. docs/kiosk-pc.md

const TITLE = 'JBNU 전공탐색박람회 · AI 체험존'
const DESCRIPTION = 'AI 퍼스널 컬러 · AI 캐리커처 · AI 미래 직업 탐색 — 2026학년도 2학기 JBNU 전공탐색박람회 (11.4~5 전북대학교 진수당)'
/** 링크 미리보기(카카오톡 등) — 이 랜딩 첫 화면을 1200×630 으로 찍은 그림. 첫 화면이 바뀌면 다시 찍는다 */
const OG_IMAGE = '/assets/kiosk-pc/jbnu/og.jpg'

/**
 * 링크 미리보기는 사이트 공통(AC'SCENT IDENTITY 그림·문구) 대신 이 랜딩의 것으로(2026-10-29 사용자 지시: 카톡 썸네일이 첫 페이지로).
 * 그림 주소는 연 주소를 따른다 — 행사 전용 주소(jbnu-major-fair.vercel.app)로 보낸 링크의 미리보기가 다른 도메인을 가리키지 않게.
 */
export async function generateMetadata(): Promise<Metadata> {
  const head = await headers()
  const host = (head.get('x-forwarded-host') ?? head.get('host') ?? 'www.acscent.co.kr').split(',')[0].trim()
  const hostname = host.split(':')[0].toLowerCase()
  const local = hostname === 'localhost' || hostname === '127.0.0.1'
  return {
    metadataBase: new URL(`${local ? 'http' : 'https'}://${host}`),
    title: TITLE,
    description: DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      siteName: 'JBNU 전공탐색박람회 AI 체험존',
      title: TITLE,
      description: DESCRIPTION,
      // og:url 은 넣지 않는다 — 카카오톡은 미리보기를 저장해 두는데, 주소 끝을 바꿔(/?v=2) 새로 읽게 할 때
      // og:url 이 옛 주소를 가리키면 그 저장본을 다시 쓸 수 있다
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: '2026학년도 2학기 JBNU 전공탐색박람회 AI 체험존 첫 화면' }],
    },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
  }
}

export default function JbnuLandingPage() {
  return <JbnuLanding />
}
