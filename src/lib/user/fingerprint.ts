'use client'

/**
 * 기기 게스트 식별자(fingerprint) 클라이언트 유틸.
 *
 * fingerprint는 "아직 로그인 전 분석의 임시 소유표"일 뿐이므로,
 * 계정 귀속이 끝났거나 사용자가 바뀌는 시점(로그아웃)에는 반드시 새로 발급해
 * 공용 기기에서 다음 사용자와 식별자가 섞이지 않게 한다.
 */

const FINGERPRINT_KEY = 'user_fingerprint'

export function getOrCreateFingerprint(): string {
  if (typeof window === 'undefined') return ''

  let fp = localStorage.getItem(FINGERPRINT_KEY)
  if (!fp) {
    fp = generateFingerprint()
    localStorage.setItem(FINGERPRINT_KEY, fp)
  }
  return fp
}

export function rotateFingerprint(): string {
  if (typeof window === 'undefined') return ''

  const fp = generateFingerprint()
  localStorage.setItem(FINGERPRINT_KEY, fp)
  return fp
}

function generateFingerprint(): string {
  return `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
