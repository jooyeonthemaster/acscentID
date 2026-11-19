// SCENT! 스핀오프 「하린 루트」 — 영상 계획(2026-11-19). 가까운 구도(한 걸음 앞에서 마주 봄) 장소 8곳.
//   배경: HarinStage(공용 KxVideoStage 와 같은 세 겹 재생 + 대사 조각) — idle-<장소>-1|2(듣는 대기 4초) · move-<도착>(8초). hi-<장소> 는 idle-<장소>-1 의 복사본(첫 대사가 인사를 대신한다).
//   대사: talk/<줄 id>.mp4 — 그 장소 대기 영상(Wan)을 목소리 길이에 맞춰 이은 바탕에 Sync.so lipsync-2 로 입 모양만 맞춘 것(소리 포함).
//         첫 · 끝 프레임이 장소 그림이라 대기 · 대사 조각이 한 사슬로 이어진다(HarinStage). 2026-11-19 HeyGen 판(인물을 다시 그려 시작 1초 안에 자세가 튐)에서 바꿈.
// 원본: design-review/scent-art(date/ · wan3-date/ · talk-sync/ · talk-raw/(HeyGen 판), tools/scent-date-spec.mjs · scent-talk.mjs(목소리) · scent-talk-sync.py(립싱크) · scent-close.mjs), 대본 harin-script.json

import type { KxMove, KxVideoPlan } from '../../video/stage'
import type { ScentScene } from '../scent-plan'

export const HARIN_BASE = '/assets/kiosk-programs/perfumer/date'
const SCENES: ScentScene[] = ['lane', 'salon', 'greenhouse', 'distillery', 'organ', 'studio', 'lab', 'boutique']

/** 이동 영상 out(하린이 다 나간 초) · in(걸어 들어오기 시작한 초) — 0.5초 간격 밀착 인화로 잰 값 */
const OUT_IN: Record<Exclude<ScentScene, 'lane'>, [number, number]> = {
  // 2026-11-19 Wan 3.0 8초 판(design-review/scent-art/_sheets/date/moves.jpg)
  salon: [2.4, 4.9], greenhouse: [1.9, 4.8], distillery: [2.4, 4.4], organ: [2.4, 4.8], studio: [2.6, 4.8], lab: [2.4, 4.3], boutique: [4.3, 4.9],
}

export const HARIN_PLAN: KxVideoPlan = {
  base: HARIN_BASE,
  scenes: SCENES,
  idles: 2,
  moves: Object.fromEntries(SCENES.slice(1).map((to, i) => {
    const [out, inn] = OUT_IN[to as Exclude<ScentScene, 'lane'>]
    return [`${SCENES[i]}>${to}`, { src: `move-${to}`, out, in: inn, len: 8 } satisfies KxMove]
  })),
}
