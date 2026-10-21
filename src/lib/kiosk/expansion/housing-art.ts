// 주거복지대전 키오스크 3종의 그림 에셋 — 2026-10-22 목업(design-review/housing-mockups, 로컬 전용)에서 받은 그림을
// public/assets/kiosk-expansion/housing/ 에 두고, 문항·선택지 id 로 찾는다. 파일 이름 규칙이 곧 데이터 계약이다:
//   housing-scent-<문항>-<선택지>.webp · housing-mate-<문항>-<선택지>.webp · housing-home-scene-<장면>.webp · housing-home-style-<화풍>.webp
//   housing-mate-<성향>.webp(성향 캐릭터) · housing-wait-<blend|draw|mate>.webp · housing-receipt-room.webp
// 그림에는 글자가 없다 — 문구·버튼·체크는 모두 화면 요소다. 모든 선택지에 그림이 있는지는 __tests__/housing.test.ts 가 파일로 확인한다.

import type { HomeScene, HomeStyle, MateType } from './housing'

export const HOUSING_ART_DIR = '/assets/kiosk-expansion/housing'
const art = (name: string) => `${HOUSING_ART_DIR}/${name}.webp`

/** 문항 카드 그림 — 우리 집 향 처방(scent) · 성향 향수(mate) */
export const choiceArt = (mode: 'scent' | 'mate', question: string, option: string) => art(`housing-${mode}-${question}-${option}`)
export const sceneArt = (scene: HomeScene) => art(`housing-home-scene-${scene}`)
export const styleArt = (style: HomeStyle) => art(`housing-home-style-${style}`)
/** 성향 캐릭터 — 결과 카드·영수증 그림 */
export const mateArt = (type: MateType) => art(`housing-mate-${type}`)

/** AI 를 기다리는 동안의 그림 — 향 처방은 비커 블렌딩, 2036 은 스케치북, 성향 향수는 마을과 향수병 */
export const WAIT_ART = { scent: art('housing-wait-blend'), home: art('housing-wait-draw'), mate: art('housing-wait-mate') } as const
/** 향 처방 영수증 그림 — 감열지에 잘 나오는 선화(첫 화면 그림은 컬러라 점묘가 탁하다) */
export const RECEIPT_ROOM_ART = art('housing-receipt-room')
