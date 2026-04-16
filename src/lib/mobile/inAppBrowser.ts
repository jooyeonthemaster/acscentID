// 인앱브라우저 검출 및 외부 브라우저 강제 이동 유틸리티
//
// 한국에서 모바일 PG 결제 실패의 가장 흔한 원인:
// 카카오톡/인스타그램/페이스북/네이버 등 SNS 앱의 내장(인앱) 브라우저는
// KCP·카카오페이·네이버페이 결제 페이지의 카드사 인증/앱 호출을 차단한다.
// 결제 시도 전 반드시 외부 브라우저(Safari/Chrome)로 이동시켜야 한다.

export type InAppBrowserType =
  | 'kakaotalk'
  | 'kakaostory'
  | 'instagram'
  | 'facebook'
  | 'naver'
  | 'line'
  | 'band'
  | 'daum'
  | 'everytime'
  | 'twitter'
  | 'whale'
  | 'generic_inapp'
  | null

export type MobileOS = 'ios' | 'android' | 'other'

export interface InAppBrowserInfo {
  isInApp: boolean
  type: InAppBrowserType
  os: MobileOS
  userAgent: string
  // iOS 인앱브라우저는 대부분 자동 우회가 불가능하고 사용자 수동 이동 안내가 필요
  canAutoEscape: boolean
  displayName: string
}

const IN_APP_PATTERNS: Array<{
  type: Exclude<InAppBrowserType, null>
  regex: RegExp
  displayName: string
}> = [
  { type: 'kakaotalk', regex: /KAKAOTALK/i, displayName: '카카오톡' },
  { type: 'kakaostory', regex: /KAKAOSTORY/i, displayName: '카카오스토리' },
  { type: 'instagram', regex: /Instagram/i, displayName: '인스타그램' },
  { type: 'facebook', regex: /FBAN|FBAV|FB_IAB/i, displayName: '페이스북' },
  { type: 'naver', regex: /NAVER\(inapp/i, displayName: '네이버 앱' },
  { type: 'line', regex: /Line\//i, displayName: '라인' },
  { type: 'band', regex: /BAND\//i, displayName: '밴드' },
  { type: 'daum', regex: /DaumApps/i, displayName: '다음 앱' },
  { type: 'everytime', regex: /everytimeapp/i, displayName: '에브리타임' },
  { type: 'twitter', regex: /Twitter/i, displayName: 'X(트위터)' },
  { type: 'whale', regex: /Whale\/(?:\d+)/i, displayName: '웨일 앱' },
]

function detectOS(ua: string): MobileOS {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

/**
 * 현재 브라우저가 인앱브라우저인지 검출한다.
 * SSR 환경에서는 isInApp=false를 반환한다.
 */
export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof navigator === 'undefined') {
    return {
      isInApp: false,
      type: null,
      os: 'other',
      userAgent: '',
      canAutoEscape: false,
      displayName: '',
    }
  }

  const ua = navigator.userAgent || ''
  const os = detectOS(ua)

  for (const pattern of IN_APP_PATTERNS) {
    if (pattern.regex.test(ua)) {
      // Android는 intent:// 또는 전용 scheme으로 외부 브라우저 호출이 가능하다.
      // iOS는 대부분의 앱이 WKWebView 기반이며, 유일하게 카카오톡만
      // kakaotalk://web/openExternal을 통해 자동 우회가 가능하다.
      const canAutoEscape =
        os === 'android' ||
        (os === 'ios' && pattern.type === 'kakaotalk')

      return {
        isInApp: true,
        type: pattern.type,
        os,
        userAgent: ua,
        canAutoEscape,
        displayName: pattern.displayName,
      }
    }
  }

  // WKWebView/WebView 일반 탐지 (알려지지 않은 인앱)
  // iOS: Safari가 들어있지 않으면 보통 인앱
  if (os === 'ios' && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua)) {
    return {
      isInApp: true,
      type: 'generic_inapp',
      os,
      userAgent: ua,
      canAutoEscape: false,
      displayName: '인앱 브라우저',
    }
  }

  // Android WebView 탐지 (wv 플래그)
  if (os === 'android' && /; wv\)/i.test(ua)) {
    return {
      isInApp: true,
      type: 'generic_inapp',
      os,
      userAgent: ua,
      canAutoEscape: true,
      displayName: '인앱 브라우저',
    }
  }

  return {
    isInApp: false,
    type: null,
    os,
    userAgent: ua,
    canAutoEscape: false,
    displayName: '',
  }
}

/**
 * 인앱브라우저에서 현재 페이지를 외부 브라우저로 강제 이동시킨다.
 * Android는 intent:// 스킴을 통해 Chrome으로, 카카오톡 iOS는 openExternal을 통해
 * Safari로 이동시킨다. 자동 우회가 불가능한 경우 false를 반환한다.
 */
export function escapeInAppBrowser(info?: InAppBrowserInfo): boolean {
  if (typeof window === 'undefined') return false
  const inApp = info ?? detectInAppBrowser()
  if (!inApp.isInApp || !inApp.canAutoEscape) return false

  const currentUrl = window.location.href

  // Android: intent:// 스킴으로 Chrome 강제 실행
  if (inApp.os === 'android') {
    // chrome intent는 scheme 제거 후 구성
    const noProtocol = currentUrl.replace(/^https?:\/\//, '')
    const intentUrl =
      'intent://' +
      noProtocol +
      '#Intent;scheme=https;package=com.android.chrome;end'
    window.location.href = intentUrl
    return true
  }

  // iOS 카카오톡: openExternal scheme 지원
  if (inApp.os === 'ios' && inApp.type === 'kakaotalk') {
    const kakaoUrl =
      'kakaotalk://web/openExternal?url=' + encodeURIComponent(currentUrl)
    window.location.href = kakaoUrl
    return true
  }

  return false
}

/**
 * 사용자에게 수동으로 외부 브라우저로 여는 방법을 안내하는 문구를 반환한다.
 * 자동 우회가 불가능한 iOS 인앱브라우저용 가이드 텍스트.
 */
export function getManualEscapeGuide(info: InAppBrowserInfo): string {
  if (!info.isInApp) return ''

  switch (info.type) {
    case 'instagram':
    case 'facebook':
      return '우측 상단의 ⋯(더보기) 버튼을 누른 뒤 "외부 브라우저에서 열기" 또는 "Safari에서 열기"를 선택해 주세요.'
    case 'kakaostory':
      return '우측 상단 메뉴에서 "다른 브라우저로 열기"를 선택해 주세요.'
    case 'line':
      return '우측 하단의 ⋯ 버튼을 누른 뒤 "기본 브라우저로 열기"를 선택해 주세요.'
    case 'naver':
      return '우측 하단의 공유 버튼에서 "Safari로 열기"를 선택해 주세요.'
    case 'twitter':
      return '우측 상단 공유 버튼에서 "Safari에서 열기"를 선택해 주세요.'
    case 'generic_inapp':
    default:
      if (info.os === 'ios') {
        return '화면 하단 또는 우측 상단의 공유/더보기 버튼에서 "Safari에서 열기"를 선택해 주세요.'
      }
      return '우측 상단 메뉴에서 "다른 브라우저로 열기"를 선택해 주세요.'
  }
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}
