// 연말 시상식(2026-12-15) AI 체험존의 브랜드 커스텀 자리 — 고객이 브랜드 커스텀 옵션을 고르면 여기만 켜고 채운다.
// 지금은 꺼 둔다(고객이 고르기 전): 화면 · 4×6 인화물 · 영수증 어디에도 고객 로고 · 이름이 나오지 않는다.
//
// 켜는 법(옵션을 고른 기기 종류만):
//   1. 로고 파일을 public/assets/nh-awards/ 에 넣는다 — 인화용은 투명 PNG(가로 600px 이상), 영수증용은 흑백 선화 PNG(감열지라 점묘로 찍힌다)
//   2. 아래 booth / kiosk 의 enabled 를 true 로, line 에 인화물 · 영수증 맨 아래 한 줄(예: 행사명)을 쓴다
//   3. 데모(/booth-demo/nh)에서 결과 인화 디자인 2종과 영수증 미리보기를 다시 확인한다
// 포토부스와 키오스크는 따로 고른다(옵션이 기기 종류마다 따로라서).

export interface EventBrand {
  enabled: boolean
  /** 인화물 · 영수증 맨 아래 한 줄 */
  line: string
  /** 4×6 인화물 아래쪽 로고(투명 PNG) — null 이면 글자 줄만 */
  printLogo: string | null
  /** 영수증 맨 아래 로고(흑백 선화) — null 이면 글자 줄만 */
  receiptLogo: string | null
}

export const NH_BRAND: { booth: EventBrand; kiosk: EventBrand } = {
  booth: { enabled: false, line: '', printLogo: null, receiptLogo: null },
  kiosk: { enabled: false, line: '', printLogo: null, receiptLogo: null },
}

/** 이 행사의 부스 프로그램 · 키오스크 모드 */
export const NH_BOOTH_PROGRAMS = ['nh-face', 'nh-saju', 'nh-palm'] as const
export const NH_KIOSK_EXPERIENCES = ['sommelier-nh'] as const

/** 그 프로그램 · 체험에 켜진 브랜드(없으면 null) */
export function eventBrandFor(id: string): EventBrand | null {
  const brand = (NH_BOOTH_PROGRAMS as readonly string[]).includes(id) ? NH_BRAND.booth : (NH_KIOSK_EXPERIENCES as readonly string[]).includes(id) ? NH_BRAND.kiosk : null
  return brand?.enabled ? brand : null
}
