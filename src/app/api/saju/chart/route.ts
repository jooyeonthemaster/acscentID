// POST /api/saju/chart — 만세력 명식 계산 전용 경량 라우트 (Gemini 미사용, 일일 한도 미적용)
// 용도: 입력 위저드 제출 직후 "괘를 뽑는 의식" 로딩 오버레이가 실제 팔자 글자를 뒤집는 데 사용.
// 계산은 전적으로 src/lib/saju 엔진 — AI는 개입하지 않는다 (DESIGN.md §3 대원칙).

import { NextRequest, NextResponse } from 'next/server'
import { computeSajuChart } from '@/lib/saju'
import {
  parseApiBirthInput,
  toEngineBirthInput,
  toSajuChartSnapshot,
} from '@/lib/gemini/saju-prompt-builder'
import type { SajuChartSnapshot } from '@/types/analysis'

interface SajuChartResponse {
  success: boolean
  chart?: SajuChartSnapshot
  partnerChart?: SajuChartSnapshot
  error?: string
}

export async function POST(request: NextRequest) {
  const requestId = `SAJU-CHART-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<SajuChartResponse>(
      { success: false, error: '요청 본문이 올바른 JSON이 아닙니다.' },
      { status: 400 }
    )
  }

  try {
    // 본인 명식 — 입력 검증(한국어 오류) 후 엔진 계산 (음력 변환·범위 오류도 엔진이 한국어로 throw)
    const birth = parseApiBirthInput(body.birth, '본인')
    const chart = computeSajuChart(toEngineBirthInput(birth, body.gender))

    let partnerChart: SajuChartSnapshot | undefined
    if (body.partnerBirth !== undefined && body.partnerBirth !== null) {
      const partnerBirth = parseApiBirthInput(body.partnerBirth, '상대방')
      partnerChart = toSajuChartSnapshot(
        computeSajuChart(toEngineBirthInput(partnerBirth, body.partnerGender))
      )
    }

    const snapshot = toSajuChartSnapshot(chart)
    console.log(
      `[${requestId}] 명식 계산 완료: ${snapshot.pillars.year.gan}${snapshot.pillars.year.ji} ${snapshot.pillars.month.gan}${snapshot.pillars.month.ji} ${snapshot.pillars.day.gan}${snapshot.pillars.day.ji} ${snapshot.pillars.hour ? `${snapshot.pillars.hour.gan}${snapshot.pillars.hour.ji}` : '(삼주)'}${partnerChart ? ' + 상대 명식' : ''}`
    )

    return NextResponse.json<SajuChartResponse>({
      success: true,
      chart: snapshot,
      ...(partnerChart ? { partnerChart } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '사주 계산 중 알 수 없는 오류가 발생했습니다.'
    console.error(`[${requestId}] 명식 계산 실패: ${message}`)
    return NextResponse.json<SajuChartResponse>(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
