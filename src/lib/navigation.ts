/**
 * 사이트 내비게이션 단일 정의 — PC GNB(DesktopHeader), 모바일 메뉴 드로어(MobileMenuSheet),
 * 하단 탭의 프로그램 시트(MobileBottomNav)가 모두 이 배열을 쓴다.
 * 노출 여부는 각 컴포넌트가 useActiveProducts().isProductVisible(slug)로 거른다.
 */
export const PROGRAM_NAV_LINKS = [
  { slug: 'idol-image', href: '/programs/idol-image', labelKey: 'products.idolImage', descKey: 'programs.subtitle.idolImage' },
  { slug: 'figure', href: '/programs/figure', labelKey: 'products.figureDiffuser', descKey: 'programs.subtitle.figure' },
  { slug: 'graduation', href: '/programs/graduation', labelKey: 'products.graduation', descKey: 'programs.subtitle.graduation' },
  { slug: 'personal', href: '/programs/personal', labelKey: 'products.personal', descKey: 'programs.subtitle.personal' },
  { slug: 'chemistry', href: '/programs/chemistry', labelKey: 'products.chemistry', descKey: 'programs.subtitle.chemistry' },
  { slug: 'saju', href: '/programs/saju', labelKey: 'products.saju', descKey: 'programs.subtitle.saju' },
  { slug: 'le-quack', href: '/programs/le-quack', labelKey: 'products.leQuack', descKey: 'home.signaturePerfumDesc' },
  { slug: 'today-scent', href: '/programs/today-scent', labelKey: 'todayScent.title', descKey: 'todayScent.subtitle' },
] as const

/** GNB "소개" 드롭다운 */
export const ABOUT_NAV_LINKS = [
  { href: '/about/brand', labelKey: 'footer.brandStory' },
  { href: '/about/how-it-works', labelKey: 'footer.howItWorks' },
] as const

/** GNB 단일 링크 (드롭다운 없음) */
export const PRIMARY_NAV_LINKS = [
  { href: '/collaboration', labelKey: 'footer.collaboration' },
  { href: '/faq', labelKey: 'footer.faq' },
] as const

export const VISIT_RESERVATION_URL =
  'https://map.naver.com/p/entry/place/1274492663?c=15.00,0,0,0,dh&placePath=%2Fhome%3Ffrom%3Dmap%26fromPanelNum%3D1'
