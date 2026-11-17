'use client'

// 연말 시상식 소믈리에(studio-sommelier-nh) — 기본은 모노 갤러리 화면(배포본). 실험판은 주소 뒤에 붙여 따로 연다:
//   &lab=game   — 1인칭 미연시 게임(장면 그림 · 유리판 대사)
//   &lab=motion — 실험판 2: 움직이는 장면(배경판 + 해나 두 겹, 숨 · 흔들림 · 시차) · 빨리감기 이동
import SommelierNhMode from './SommelierNhMode'
import SipGameMode from './SipGameMode'

export default function SommelierNhSwitch() {
  const lab = new URLSearchParams(window.location.search).get('lab')
  if (lab === 'motion') return <SipGameMode motion />
  return lab === 'game' ? <SipGameMode /> : <SommelierNhMode />
}
