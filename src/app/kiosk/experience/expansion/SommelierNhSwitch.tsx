'use client'

// 연말 시상식 소믈리에(studio-sommelier-nh) — 기본은 모노 갤러리 화면(nh 4종의 소믈리에, SommelierNhMode).
// 새로 만든 판은 주소 뒤에 붙여 따로 연다(2026-11-17 사용자 지시: 기존 4종과 영상 버전을 구분해서):
//   &lab=video — SIP! 영상판: 소믈리에 해나를 따라 포도밭 입구 → 시음실을 1인칭 영상으로 걷는다(SipGameMode motion · SipMotion.tsx). &lab=motion 도 같다
//   &lab=game  — 장면 그림 판 미연시(SipGameMode, 영상 없음)
// 랜딩(/booth-demo/nh)은 기존 4종 카드와 「새로 만든 판」(NH_NEW_DEMOS) 카드를 나눠 보여 준다.
import SommelierNhMode from './SommelierNhMode'
import SipGameMode from './SipGameMode'

export default function SommelierNhSwitch() {
  const lab = new URLSearchParams(window.location.search).get('lab')
  if (lab === 'video' || lab === 'motion') return <SipGameMode motion />
  if (lab === 'game') return <SipGameMode />
  return <SommelierNhMode />
}
