// SCENT! 영상판(/kiosk?mode=ai-perfumer&lab=video, 2026-11-18) — 실사 조향사 하린을 따라 향수 하우스 여덟 곳을 걷는 영상 계획.
//   골목 입구 → 응접 살롱 → 온실 → 증류실 → 향료 오르간 → 사진 스튜디오 → 블렌딩 랩 → 부티크. 화면 단계마다 한 곳(SCENE_OF).
//   장소마다 hi-<장소>(도착 인사 4초) · idle-<장소>-1|2(대기 4초), 장소 사이 move-<도착>(8초 — 하린이 오른쪽으로 걸어 나가고, 길을 걷고, 왼쪽에서 걸어 들어온다).
//   재생은 키오스크 영상판 공용 재생기(../video/stage.tsx KxVideoStage). 뒤로 가기 · 처음으로처럼 이음 영상이 없는 곳은 도착 장소 인사로 바로(컷).
// 그림 · 영상 원본: design-review/scent-art(README · tools/scent-spec.mjs), 만드는 법: .claude/skills/kiosk-video-flow

import type { KxMove, KxVideoPlan } from '../video/stage'
import type { PfStep } from './types'

export type ScentScene = 'lane' | 'salon' | 'greenhouse' | 'distillery' | 'organ' | 'studio' | 'lab' | 'boutique'
const SCENES: ScentScene[] = ['lane', 'salon', 'greenhouse', 'distillery', 'organ', 'studio', 'lab', 'boutique']

/** 화면 단계 → 장소 */
export const SCENE_OF: Record<PfStep, ScentScene> = {
  attract: 'lane', info: 'salon', style: 'greenhouse', personality: 'distillery', charm: 'organ', capture: 'studio', analyzing: 'lab', result: 'boutique',
}

/** 이동 영상 out(하린이 다 나간 초) · in(걸어 들어오기 시작한 초) — 0.5초 간격 밀착 인화로 잰 값(2026-11-18 Wan 3.0 8초 판, design-review/scent-art/_sheets/moves-full.jpg) */
const OUT_IN: Record<Exclude<ScentScene, 'lane'>, [number, number]> = {
  salon: [3, 4.6], greenhouse: [3, 5.2], distillery: [3.4, 4.9], organ: [3, 4.4], studio: [3.3, 4.8], lab: [2.4, 4.8], boutique: [3.7, 4.9],
}

export const SCENT_PLAN: KxVideoPlan = {
  base: '/assets/kiosk-programs/perfumer/video',
  scenes: SCENES,
  idles: 2,
  moves: Object.fromEntries(SCENES.slice(1).map((to, i) => {
    const [out, inn] = OUT_IN[to as Exclude<ScentScene, 'lane'>]
    return [`${SCENES[i]}>${to}`, { src: `move-${to}`, out, in: inn, len: 8 } satisfies KxMove]
  })),
}

/** 길잡이 이름 */
export const GUIDE = { ko: '하린', other: 'Harin' }
