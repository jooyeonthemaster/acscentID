'use client'

// 영업용 데모에서 연 주소인가(demo=1 · demo=clean&k=…, 펀그라운드 데모의 AI 진단) — 노트북 가로 화면이 같이 쓴다.
// 데모일 때만: DEMO 워터마크(PcScreen), 결과 [휴대폰으로 받기] → [인쇄하기] + 인쇄 미리보기 창(PrintPreview).
// 행사용 노트북 링크(데모 표시 없음)는 예전 그대로다.

import { useSyncExternalStore } from 'react'
import { isFungroundSite } from '@/lib/funground/demo'

const subscribeNever = () => () => {}
const readDemo = () => new URLSearchParams(window.location.search).has('demo')

/** 주소에 demo 가 붙었는가 — 서버에서 그릴 때는 아님(붙은 뒤 한 번 읽는다) */
export const useDemoLink = () => useSyncExternalStore(subscribeNever, readDemo, () => false)

/**
 * 펀그라운드 데모(/booth-demo/funground)에서 연 주소인가(site=funground) — 퍼스널 컬러 · 직업 탐색을 「FUN GROUND Editorial」 테마로(FgPcFrame).
 * 같은 노트북 링크를 행사에서 쓸 때(표시 없음)는 예전 화면 그대로다.
 */
export const useFungroundLink = () => useSyncExternalStore(subscribeNever, isFungroundSite, () => false)
