// 키오스크 AI · 받기 API 의 하루 상한(서버 전용, 2026-11-11).
// 운영 사이트의 키오스크 API 는 영업 데모 · 행사 노트북(/kiosk/pc) · 매장 키오스크가 함께 쓰고, 누가 부르는지 확실히 가를 방법이 없다
// (매장 앱 표시 · User-Agent 는 브라우저에서 꾸밀 수 있고, 행사 노트북은 일반 크롬이다). 그래서 날짜(KST)마다 총량을 세어 넘으면 429 로 막는다
// — 화면 워터마크를 지우거나 API 를 직접 불러도 비용이 끝없이 나가지 않게.
//
// 몫은 둘: 데모 화면(주소에 demo= 가 붙은 화면 — /kiosk-demo 에서 연 것)에서 온 요청은 더 작은 'demo' 몫, 나머지는 'main'.
// 영업 데모를 누가 많이 써도 매장 · 행사 몫을 잡아먹지 않게 하려는 것이다. 데모인지는 브라우저가 붙이는 Referer 로 본다 —
// 정직한 요청을 가르는 용도일 뿐 보안 장치가 아니다(Referer 를 지운 요청은 main 몫에 들어가 그 상한에 걸린다).
//
// 상한 기본값은 실제 기록의 하루 최대치를 넉넉히 넘게 잡았다(2026-11-11 조회: 분석 398건 · 10/31 행사, 캐리커처 31건 · 받기 58건 · 11/4 JBNU).
// 환경 변수로 바꾼다: KIOSK_DAILY_LIMIT_ANALYSIS · _IMAGE · _SHARE, 데모 몫은 KIOSK_DEMO_DAILY_LIMIT_ANALYSIS · _IMAGE · _SHARE.
// 기록: 비공개 버킷 screen-background-settings/kiosk-usage/<날짜>/<몫>-<종류>.json (부스 데모 상한 src/lib/booth/demo-server.ts 와 같은 방식 —
// 인스턴스가 여러 개여도 대략 맞고, 동시에 몰리면 몇 건 넘을 수 있다). 저장소를 못 읽으면 막지 않는다(매장 손님을 세우지 않게) —
// 각 라우트의 분당 상한은 그대로 돈다. 설명: docs/kiosk-modes.md '키오스크 API 하루 상한'

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/** analysis: 글 분석(향 · 사주 · 컬러 · 타로 · 직업 · 체험 18종) / image: 그림 생성(캐리커처 · 머리 모양 · 명함 바탕 · 체험 그림) / share: 휴대폰으로 받기 올리기 */
export type KioskUsageKind = 'analysis' | 'image' | 'share'
export type KioskUsagePool = 'main' | 'demo'

const DEFAULT_LIMITS: Record<KioskUsagePool, Record<KioskUsageKind, number>> = {
  main: { analysis: 2000, image: 400, share: 3000 },
  demo: { analysis: 150, image: 40, share: 200 },
}

export function kioskDailyLimit(pool: KioskUsagePool, kind: KioskUsageKind): number {
  const value = Number(process.env[`KIOSK_${pool === 'demo' ? 'DEMO_' : ''}DAILY_LIMIT_${kind.toUpperCase()}`])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_LIMITS[pool][kind]
}

/** 데모 화면에서 온 요청이면 'demo' — Referer 의 주소에 demo= 가 있거나 /kiosk-demo 에서 왔을 때 */
export function kioskUsagePool(request: NextRequest): KioskUsagePool {
  const referer = request.headers.get('referer')
  if (!referer) return 'main'
  try {
    const url = new URL(referer)
    return url.searchParams.has('demo') || url.pathname.startsWith('/kiosk-demo') ? 'demo' : 'main'
  } catch {
    return 'main'
  }
}

const BUCKET = 'screen-background-settings'
const kstDay = (now: number) => new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
const usagePath = (day: string, pool: KioskUsagePool, kind: KioskUsageKind) => `kiosk-usage/${day}/${pool}-${kind}.json`

/** 날짜별 횟수 기록 — 운영은 Supabase 저장소, 시험은 메모리(__tests__/usage-cap.test.ts) */
export interface KioskUsageStore {
  /** 기록된 횟수(없으면 0) */
  read(path: string, now: number): Promise<number>
  write(path: string, count: number, limit: number, now: number): Promise<void>
}

function storageStore(): KioskUsageStore {
  const bucket = createServiceRoleClient().storage.from(BUCKET)
  return {
    async read(path, now) {
      const { data } = await bucket.download(`${path}?t=${now}`)
      if (!data) return 0
      try { return Number(JSON.parse(await data.text())?.count) || 0 } catch { return 0 }
    },
    async write(path, count, limit, now) {
      const body = new Blob([JSON.stringify({ count, limit, updatedAt: new Date(now).toISOString() })], { type: 'application/json' })
      const { error } = await bucket.upload(path, body, { upsert: true, contentType: 'application/json' })
      if (error) console.error('[kiosk-usage] 사용량 기록 실패:', error.message)
    },
  }
}

/**
 * 한 번 쓴다 — 오늘 상한을 넘었으면 429 응답을, 아니면 null 을 돌려준다(라우트는 받은 응답을 그대로 돌려준다).
 * AI 를 부르기 직전에(입력 검사 · 데모 결과(mock) 뒤에) 부른다. 실패한 생성도 센다.
 */
export async function takeKioskUsage(request: NextRequest, kind: KioskUsageKind, now = Date.now(), store?: KioskUsageStore): Promise<NextResponse | null> {
  const pool = kioskUsagePool(request)
  const limit = kioskDailyLimit(pool, kind)
  try {
    const records = store ?? storageStore()
    const path = usagePath(kstDay(now), pool, kind)
    const count = await records.read(path, now)
    if (count >= limit) {
      console.warn(`[kiosk-usage] ${pool}/${kind} 오늘 상한 ${limit}건에 닿아 막았습니다`)
      const error = pool === 'demo' ? '오늘 데모 이용 횟수를 다 썼어요. 내일 다시 이용해 주세요.' : '오늘 이용할 수 있는 횟수를 다 썼어요. 직원에게 알려 주세요.'
      return NextResponse.json({ success: false, error, limited: true }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
    }
    await records.write(path, count + 1, limit, now)
  } catch (error) {
    console.error('[kiosk-usage] 사용량 확인 실패(막지 않음):', error instanceof Error ? error.message : error)
  }
  return null
}
