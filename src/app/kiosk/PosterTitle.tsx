'use client'

// 행사 모드(K-WAVE 사주) 첫 화면 제목 — 홍보 배너와 같은 모양:
// 아주 굵은 SAJU!(끝 글자는 벽돌색) / 사주로 찾는 나만의 향, / 벽돌색 AI 조향사 / 자간 넓은 AI PERFUMER / 가는 선 / 지원 언어 줄.
// 레트로·맥(KioskClient)과 클래식(KioskClassic)이 같이 쓴다. 문구는 src/lib/kiosk/modes.ts 의 poster.
// 포토부스의 같은 제목(src/components/photobooth/IdolPosterTitle.tsx)과 짝 — 키오스크는 세로 화면 폭에 맞춰 cqw 로 크기를 잡는다.
//
// 색: 기본은 배너의 먹색·벽돌색. 클래식처럼 배경 그림 위에 바로 놓일 때는 --poster-ink / --poster-accent 로
// 배경 글자색을 넘겨 어두운 배경에서도 읽히게 한다(kiosk-classic.css).

import type { KioskPoster } from '@/lib/kiosk/modes'

const INK = 'var(--poster-ink, #1b1a24)'
const BRICK = 'var(--poster-accent, #a8392b)'
const DISPLAY = "'Pretendard', 'Pretendard Variable', system-ui, sans-serif"
/** 한자권 화면 문구·언어 줄 — 키오스크 루트(KIOSK_FONT_CLASS)의 한자권 글꼴 변수 */
const CJK = "'Pretendard', var(--font-noto-jp), var(--font-noto-sc), var(--font-noto-tc), sans-serif"

/** line 이 없으면 poster.line(한국어) — 외국어 화면에서는 그 언어 부제를 넘긴다 */
export function PosterTitle({ poster, line }: { poster: KioskPoster; line?: string }) {
  const lineText = line ?? poster.line
  // 외국어 화면은 아래 카드 문장이 길어 — 제목을 조금 줄여 시작 버튼이 화면 안에 남게
  const compact = line != null
  return (
    <div
      className="ksk-poster"
      style={{ containerType: 'inline-size', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: INK, fontFamily: DISPLAY }}
      aria-label={`${poster.word}${poster.accent} ${lineText} ${poster.main}`}
    >
      <p style={{ fontWeight: 900, fontSize: compact ? 'min(118px, 23cqw)' : 'min(150px, 30cqw)', lineHeight: 0.86, letterSpacing: '-0.045em', margin: 0, whiteSpace: 'nowrap' }}>
        {poster.word}
        <span style={{ color: BRICK }}>{poster.accent}</span>
      </p>
      <p style={{ fontWeight: 800, fontSize: compact ? 'min(26px, 4.8cqw)' : 'min(40px, 7.4cqw)', letterSpacing: '-0.02em', lineHeight: 1.25, margin: '0.55em 0 0.1em', fontFamily: CJK, wordBreak: 'keep-all' }}>{lineText}</p>
      <p style={{ color: BRICK, fontWeight: 900, fontSize: compact ? 'min(72px, 13.5cqw)' : 'min(96px, 17.5cqw)', lineHeight: 1.02, letterSpacing: '-0.035em', margin: 0, whiteSpace: 'nowrap' }}>{poster.main}</p>
      <p style={{ fontWeight: 500, fontSize: 'min(24px, 4.4cqw)', letterSpacing: '0.55em', margin: '0.2em 0 0', paddingLeft: '0.55em', whiteSpace: 'nowrap' }}>{poster.mainEn}</p>
      <span aria-hidden="true" style={{ display: 'block', width: 'min(72px, 13cqw)', height: 2, background: BRICK, margin: 'min(18px, 3.4cqw) 0' }} />
      <p style={{ fontWeight: 700, fontSize: 'min(22px, 4cqw)', margin: 0, fontFamily: CJK }}>{poster.langs}</p>
    </div>
  )
}
