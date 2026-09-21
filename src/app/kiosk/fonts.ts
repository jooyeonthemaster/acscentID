// 키오스크 전용 한자권 글꼴 — 사이트 전역 글꼴(에스코어드림·완트드산스 등)은 한국어 전용이라
// 일본어 가나와 중국어 간체 글자가 없다. 매장 PC에 어떤 시스템 폰트가 깔려 있는지에
// 기대지 않으려고(윈도우 LTSB에는 CJK 보조 글꼴이 없을 수 있다) 웹폰트로 직접 싣는다.
// 영수증 캔버스도 이 글꼴로 그리므로, 화면과 인쇄 원판이 같은 글자 모양을 쓴다.

import { Noto_Sans_JP, Noto_Sans_SC, Noto_Sans_TC } from 'next/font/google'

export const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-noto-jp',
  display: 'swap',
  preload: false,
})

export const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-noto-sc',
  display: 'swap',
  preload: false,
})

export const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-noto-tc',
  display: 'swap',
  preload: false,
})

export const KIOSK_FONT_CLASS = `${notoSansJP.variable} ${notoSansSC.variable} ${notoSansTC.variable}`

/** 언어별 글꼴 스택 — 한국어/영어는 테마 글꼴을 그대로 쓰고, 한자권만 교체한다 */
export const CJK_FONT_STACK: Record<'ja' | 'zh-Hans' | 'zh-Hant', string> = {
  ja: 'var(--font-noto-jp), "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif',
  'zh-Hans': 'var(--font-noto-sc), "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif',
  'zh-Hant': 'var(--font-noto-tc), "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif',
}
