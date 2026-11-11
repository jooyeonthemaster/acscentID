// 워터마크 없는 데모 링크(2026-11-11) — 서버와 화면이 같이 쓰는 이름만. 서명 · 확인은 demo-clean-server.ts, 화면의 확인은 use-clean-demo.ts.
// 예전(2026-10-22)에는 /kiosk-demo/clean · /booth-demo/clean 주소만 알면, 또는 데모 주소의 demo=1 을 demo=clean 으로 바꾸기만 해도 워터마크가 빠졌다.
// 이제 관리자 비밀번호로 만든 기간 있는 서명(k)이 있어야 빠진다: /booth-demo/clean?k=… → 데모 화면 /booth?…&demo=clean&k=…
// 서명이 없거나 기간이 지났으면 워터마크를 깐다. 설명: docs/kiosk-modes.md '영업용 데모' · docs/photobooth-demo.md

/** 데모 주소의 서명 칸 */
export const DEMO_CLEAN_KEY_PARAM = 'k'
/** 워터마크 없는 데모 표시(demo=clean) — 키오스크 DEMO_CLEAN · 부스 BOOTH_DEMO_CLEAN 과 같은 값 */
export const DEMO_CLEAN_VALUE = 'clean'
/** 관리자가 고르는 링크 기간(일) */
export const DEMO_CLEAN_DAYS = [7, 30, 90] as const
export type DemoCleanDays = (typeof DEMO_CLEAN_DAYS)[number]
