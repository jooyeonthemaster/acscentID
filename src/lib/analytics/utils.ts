// Analytics 유틸리티 함수

/**
 * User-Agent에서 디바이스 타입 추출
 */
export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase()

  // 태블릿 체크 (모바일보다 먼저)
  if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    return 'tablet'
  }

  // 모바일 체크
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }

  return 'desktop'
}

/**
 * User-Agent에서 브라우저 이름 추출
 */
export function getBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera'
  if (ua.includes('samsung')) return 'Samsung Internet'
  if (ua.includes('msie') || ua.includes('trident')) return 'IE'

  return 'Other'
}

/**
 * User-Agent에서 OS 추출
 */
export function getOS(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS'
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('linux')) return 'Linux'

  return 'Other'
}

/**
 * URL에서 도메인 추출
 */
export function extractDomain(url: string | null): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch {
    return null
  }
}

/**
 * URL에서 UTM 파라미터 추출
 */
export function extractUTMParams(url: string): {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
} {
  try {
    const parsed = new URL(url)
    return {
      utm_source: parsed.searchParams.get('utm_source'),
      utm_medium: parsed.searchParams.get('utm_medium'),
      utm_campaign: parsed.searchParams.get('utm_campaign'),
      utm_term: parsed.searchParams.get('utm_term'),
      utm_content: parsed.searchParams.get('utm_content'),
    }
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    }
  }
}

/**
 * 세션 ID 생성 또는 가져오기 (새 세션 여부도 함께 반환)
 */
export function getOrCreateSessionId(): { id: string; isNew: boolean } {
  if (typeof window === 'undefined') return { id: '', isNew: false }

  const STORAGE_KEY = 'ppuduck_analytics_session'
  const EXPIRY_KEY = 'ppuduck_analytics_session_expiry'
  const SESSION_DURATION = 30 * 60 * 1000 // 30분

  const now = Date.now()
  const existingId = sessionStorage.getItem(STORAGE_KEY)
  const expiry = sessionStorage.getItem(EXPIRY_KEY)

  // 기존 세션이 있고 만료되지 않았으면 재사용
  if (existingId && expiry && now < parseInt(expiry)) {
    sessionStorage.setItem(EXPIRY_KEY, String(now + SESSION_DURATION))
    return { id: existingId, isNew: false }
  }

  // 새 세션 생성 (첫 방문 또는 만료 후)
  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  sessionStorage.setItem(STORAGE_KEY, newId)
  sessionStorage.setItem(EXPIRY_KEY, String(now + SESSION_DURATION))

  return { id: newId, isNew: true }
}

/**
 * 마지막 페이지 경로 저장/가져오기
 */
export function getLastPagePath(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('ppuduck_last_page')
}

export function setLastPagePath(path: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('ppuduck_last_page', path)
}

/**
 * 마지막 페이지뷰 시간 저장/가져오기 (체류 시간 계산용)
 */
export function getLastPageViewTime(): number | null {
  if (typeof window === 'undefined') return null
  const time = sessionStorage.getItem('ppuduck_last_pageview_time')
  return time ? parseInt(time) : null
}

export function setLastPageViewTime(time: number): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('ppuduck_last_pageview_time', String(time))
}

/**
 * 시간 포맷팅 (초 -> 분:초)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}분 ${secs}초`
}

/**
 * 숫자 포맷팅 (1000 -> 1K)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * 퍼센트 변화 계산
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
