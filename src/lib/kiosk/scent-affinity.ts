// 퍼스널 컬러 유형 · 타로 원소 → 향 후보. 사주의 용신 → 후보 향(src/lib/saju/scent-map.ts)과 같은 자리:
// 후보는 여기 표가 정하고, AI는 그 안에서 한 개를 골라 이유를 쓴다(표 밖의 향을 고르면 서버가 첫 후보로 바꾼다).
// 표는 향료 30종의 계열 수치·노트를 보고 손으로 고른 초안이다 — 조향 담당이 번호만 바꾸면 된다.
// 컬러 8유형이 30종을 모두 한 번 이상 쓴다(특정 향에 쏠리지 않게).

import { perfumes, type Perfume } from '@/data/perfumes'
import type { PersonalColorTypeId, TarotElement } from '@/types/analysis'

/** 향 번호(AC'SCENT NN) — 앞에 있을수록 그 유형의 대표 향 */
const COLOR_SCENTS: Record<PersonalColorTypeId, number[]> = {
  'spring-light': [3, 10, 9, 8, 6], // 맑고 가벼운 온기 — 꽃·과즙
  'spring-bright': [2, 11, 1, 4, 13], // 선명한 온기 — 톡 쏘는 과일·시트러스
  'summer-light': [12, 7, 15, 19, 22], // 투명한 서늘함 — 물기 있는 꽃·깨끗한 시트러스
  'summer-mute': [22, 29, 21, 24, 23], // 뿌연 서늘함 — 파우더리 머스크
  'autumn-mute': [16, 30, 23, 29, 27], // 차분한 온기 — 부드러운 나무결
  'autumn-deep': [27, 26, 20, 18, 5], // 짙은 온기 — 나무·향신료
  'winter-bright': [14, 17, 19, 13, 11], // 쨍한 서늘함 — 날 선 시트러스·허브
  'winter-deep': [25, 28, 21, 18, 26], // 깊은 서늘함 — 묵직한 머스크·가죽
}

const ELEMENT_SCENTS: Record<TarotElement, number[]> = {
  fire: [5, 17, 18, 28, 20, 7], // 불 = 발산 — 향신료·따뜻한 나무·붉은 꽃
  water: [21, 22, 24, 19, 1, 12], // 물 = 감정 — 머스크·물기
  air: [2, 4, 11, 13, 14, 15], // 바람 = 생각 — 시트러스·허브
  earth: [16, 27, 23, 30, 6, 26], // 흙 = 현실 — 나무·흙·열매
}

function byNumbers(numbers: number[]): Perfume[] {
  return numbers
    .map((n) => perfumes.find((p) => p.id === `AC'SCENT ${String(n).padStart(2, '0')}`))
    .filter((p): p is Perfume => Boolean(p))
}

export function colorScentCandidates(typeId: PersonalColorTypeId): Perfume[] {
  return byNumbers(COLOR_SCENTS[typeId])
}

export function tarotScentCandidates(element: TarotElement): Perfume[] {
  return byNumbers(ELEMENT_SCENTS[element])
}
