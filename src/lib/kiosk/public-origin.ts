// 손님 휴대폰이 열 주소(QR)의 앞부분.
// 화면이 공개 주소로 열려 있으면 그 주소를 그대로 쓴다 — 행사 전용 주소(jbnu-major-fair.vercel.app 등)에서 만든 QR 이
// 다른 도메인(www.acscent.co.kr)으로 가지 않게(2026-10-29). 기기 안 서버(localhost·사설망)로 열린 화면은 폰이 닿을 수 없어
// 배포 주소(NEXT_PUBLIC_SITE_URL)를 쓴다. 개발 서버(localhost)에서는 지금 주소(시험용).

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/

export function publicOrigin(): string {
  const here = window.location.origin
  if (!LOCAL_HOST.test(window.location.hostname)) return here
  if (process.env.NODE_ENV !== 'production') return here
  return (process.env.NEXT_PUBLIC_SITE_URL || here).replace(/\/$/, '')
}
