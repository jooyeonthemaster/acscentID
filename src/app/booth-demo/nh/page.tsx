import type { Metadata } from 'next'
import { NhLanding } from './NhLanding'

// 연말 시상식 AI 체험존 데모 — 링크를 받은 사람만 본다(검색 노출 금지, 로케일 라우팅 밖 middleware.ts). 설명: docs/nh-awards-demo.md
export const metadata: Metadata = {
  title: '연말 시상식 AI 체험존 데모',
  description: 'AI 소믈리에 키오스크와 포토부스 새해 이야기(관상 · 사주 · 손금)를 직접 해 보고 고르는 데모입니다.',
  robots: { index: false, follow: false },
}

export default function NhDemoPage() {
  return <NhLanding />
}
