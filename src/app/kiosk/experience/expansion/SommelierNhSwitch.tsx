'use client'

// 연말 시상식 소믈리에(studio-sommelier-nh) — 기본은 SIP! 영상판(2026-11-17 사용자 지시 「실제 SIP 프로그램에 넣어봐」):
//   소믈리에 해나를 따라 포도밭 입구 → 포도밭 → 수확 → 와이너리 → 와인 수장고 → 시음실을 1인칭으로 이동하며 맛을 고른다(SipGameMode motion · SipMotion.tsx).
// 이전 화면은 주소 뒤에 붙여 연다:
//   &lab=classic — 모노 갤러리 화면(11/17 오전까지 배포본, SommelierNhMode)
//   &lab=game    — 장면 그림 판 미연시(SipGameMode, 영상 없음)
import SommelierNhMode from './SommelierNhMode'
import SipGameMode from './SipGameMode'

export default function SommelierNhSwitch() {
  const lab = new URLSearchParams(window.location.search).get('lab')
  if (lab === 'classic') return <SommelierNhMode />
  if (lab === 'game') return <SipGameMode />
  return <SipGameMode motion />
}
