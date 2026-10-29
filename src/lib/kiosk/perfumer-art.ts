// SCENT! AI 조향사 화면의 장식 사진 — 모두 무지 병(글자·로고·숫자·라벨 없음)·은색 캡·푸른 유리 정물.
// 목업(docs/design-mockups/scent-ai-perfumer-redesign-20261028) 조각을 분위기 참고로만 주고 새로 생성했다(2026-10-29,
// Gemini 3 Pro Image 2K → webp). 화면의 글자·버튼·사진은 모두 실제 UI 이고 이 그림들은 장식으로만 쓴다.

const BASE = '/assets/kiosk-programs/perfumer'

export const PERFUMER_ART = {
  hero: `${BASE}/hero.webp`,
  profile: `${BASE}/profile.webp`,
  style: `${BASE}/deco-style.webp`,
  personality: `${BASE}/deco-personality.webp`,
  charm: `${BASE}/deco-charm.webp`,
  analysis: `${BASE}/analysis.webp`,
  orb: `${BASE}/orb.webp`,
  qr: `${BASE}/qr-bg.webp`,
  done: `${BASE}/done.webp`,
} as const

const FAMILIES = ['citrus', 'floral', 'fruity', 'woody', 'musky', 'spicy'] as const

/** 추천 향의 계열(data/perfumes 의 category)에 맞는 정물 — 모르는 계열이면 플로럴 */
export function perfumerFamilyArt(category: string | null | undefined): string {
  const family = (FAMILIES as readonly string[]).includes(category ?? '') ? category : 'floral'
  return `${BASE}/family-${family}.webp`
}

// 받아 둔 그림 — 참조를 쥐고 있어야 다시 그릴 때 서버에 묻지 않는다(tarot-deck.ts preloadTarotArt 와 같은 방식)
const preloaded: HTMLImageElement[] = []

/** 손님이 없을 때(첫 화면) 단계 그림을 미리 받는다 — 모두 합쳐 약 0.5MB. 계열 그림은 결과가 정해진 뒤 한 장만 받는다 */
export function preloadPerfumerArt() {
  if (typeof window === 'undefined' || preloaded.length) return
  for (const src of Object.values(PERFUMER_ART)) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    preloaded.push(img)
  }
}
