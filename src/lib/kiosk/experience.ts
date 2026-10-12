// 키오스크 체험 모드(2026-10-12) — 네일·명함·스킨케어·캐리커처·보이스·직업 탐색·메이크업.
// 향 분석(매장·사주)·컬러·타로와 달리 기존 화면 셸(기존·레트로·맥)을 쓰지 않고 전용 화면 하나(src/app/kiosk/experience)로 돈다.
// 관리자 창의 '체험 모드'로 고른다(modes.ts 의 experience 칸) — 사주·컬러·타로와 함께 고른 그 키오스크에만 저장된다(device-mode.ts).
// 화면 디자인·글꼴·배경 설정은 이 모드들에서 쓰이지 않는다.
// 설명: docs/kiosk-experiences.md

export const EXPERIENCE_IDS = ['nail', 'card', 'skin', 'draw', 'voice', 'career', 'makeup'] as const
export type ExperienceId = (typeof EXPERIENCE_IDS)[number]

/** 운영 모드 id — 'studio-nail' 처럼 붙인다 */
export const experienceModeId = (id: ExperienceId) => `studio-${id}`

/** 이 운영 모드가 체험 모드면 그 종류 */
export function kioskExperience(modeId: string | null | undefined): ExperienceId | undefined {
  if (!modeId?.startsWith('studio-')) return undefined
  const id = modeId.slice('studio-'.length)
  return (EXPERIENCE_IDS as readonly string[]).includes(id) ? (id as ExperienceId) : undefined
}

/** 관리자 화면·문서에서 쓰는 이름과 목업의 큰 글자 */
export const EXPERIENCE_META: Record<ExperienceId, { name: string; tag: string; note: string; color: string }> = {
  nail: { name: '네일 디자이너', tag: 'NAIL!', note: '손 사진에 네일 색·패턴 입히기', color: '#7A2946' },
  card: { name: '명함 디자이너', tag: 'CARD!', note: '느낌을 고르면 AI가 디자인 · 건당 비용', color: '#2148C8' },
  skin: { name: '스킨케어', tag: 'SKIN!', note: '자가 체크 · 내 루틴 직접 고치기', color: '#426B58' },
  draw: { name: '캐리커처', tag: 'DRAW!', note: '혼자·같이 그림으로 · 건당 생성 비용', color: '#B34734' },
  voice: { name: '보이스 체험', tag: 'VOICE!', note: '목소리 필터 8종 · 마이크 필요', color: '#187B8D' },
  career: { name: '미래 직업 탐색', tag: 'NEXT!', note: '관심사 · MBTI · 관상으로 탐색', color: '#315CA8' },
  makeup: { name: '버추얼 메이크업', tag: 'MAKEUP!', note: '색조·라인·얼굴형·헤어 미리보기', color: '#754F70' },
}

/**
 * 주소에 ?mode=studio-nail 처럼 붙이면 기기 설정을 건드리지 않고 그 모드로 본다(미리보기·검증용).
 * 매장 기기는 셸이 여는 주소가 고정이라 영향이 없다.
 */
export function previewKioskModeParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('mode')
}
