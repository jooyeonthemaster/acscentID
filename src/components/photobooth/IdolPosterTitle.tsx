'use client'

// 행사 모드(K-WAVE) 대기 화면 제목 — 홍보 배너와 같은 모양:
// 아주 굵은 IDOL!(끝 글자는 벽돌색) / 오늘, 나도 K-POP 아이돌 / 벽돌색 AI 포토부스 / 자간 넓은 AI PHOTOBOOTH / 가는 선 / 지원 언어 줄.
// 레트로·맥(BoothClient)과 클래식(BoothClassic) 대기 화면이 같이 쓴다. 문구는 src/lib/booth/modes.ts 의 attract.poster

import type { BoothPoster } from '@/lib/booth/modes'

const INK = '#1b1a24'
const BRICK = '#a8392b'
const DISPLAY = "'Pretendard', 'Pretendard Variable', system-ui, sans-serif"
/** 언어 줄에 일본어·중국어 글자가 섞인다 — 키오스크 한자권 글꼴(root 의 KIOSK_FONT_CLASS 변수) */
const CJK = "'Pretendard', var(--font-noto-jp), var(--font-noto-sc), var(--font-noto-tc), sans-serif"

export function IdolPosterTitle({ poster }: { poster: BoothPoster }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ color: INK, fontFamily: DISPLAY }} aria-label={`${poster.word}${poster.accent} ${poster.line} ${poster.main}`}>
      <p style={{ fontWeight: 900, fontSize: 'clamp(72px, 15vh, 168px)', lineHeight: 0.86, letterSpacing: '-0.045em', margin: 0 }}>
        {poster.word}
        <span style={{ color: BRICK }}>{poster.accent}</span>
      </p>
      <p style={{ fontWeight: 800, fontSize: 'clamp(22px, 4.6vh, 46px)', letterSpacing: '-0.02em', margin: '0.5em 0 0' }}>{poster.line}</p>
      <p style={{ color: BRICK, fontWeight: 900, fontSize: 'clamp(44px, 9.5vh, 104px)', lineHeight: 1.02, letterSpacing: '-0.035em', margin: 0 }}>{poster.main}</p>
      <p style={{ fontWeight: 500, fontSize: 'clamp(13px, 2.5vh, 26px)', letterSpacing: '0.55em', margin: '0.2em 0 0', paddingLeft: '0.55em' }}>{poster.mainEn}</p>
      <span aria-hidden="true" style={{ display: 'block', width: 'clamp(48px, 7vh, 80px)', height: 2, background: BRICK, margin: 'clamp(10px, 2vh, 20px) 0' }} />
      <p style={{ fontWeight: 700, fontSize: 'clamp(14px, 2.6vh, 24px)', margin: 0, fontFamily: CJK }}>{poster.langs}</p>
    </div>
  )
}
