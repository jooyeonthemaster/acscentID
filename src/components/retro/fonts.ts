// 레트로 UI 픽셀 서체 — 타이틀바의 짧은 영문 제목과 숫자에만 쓴다.
// Silkscreen: 대문자 픽셀체라 작은 크기에서도 2·8·S, C·O 가 헷갈리지 않는다(실기 배율 1.93에서 비교해 골랐다 —
// Pixelify Sans 는 14~16px 에서 'AC'SCENT' 가 'AO'SOENT' 로 읽혔다).
// 라틴 전용이라 한글·한자는 뒤따르는 본문 서체가 받는다(--rt-font-pixel 스택 참고).

import { Silkscreen } from 'next/font/google'

export const pixelFont = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pixel',
  display: 'swap',
})

export const RETRO_FONT_CLASS = pixelFont.variable
