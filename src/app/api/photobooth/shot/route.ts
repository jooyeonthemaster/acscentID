import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { resolveCurrentEvent } from '@/lib/photobooth/current-event'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODES = ['solo', 'together', 'template', 'card'] as const

function text(value: unknown, max = 120): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

/**
 * 촬영 내역 기록 (부스 전용, 비로그인 공개)
 * POST  /api/photobooth/shot   완성 시 1건 생성 → { id }
 * PATCH /api/photobooth/shot   인쇄·저장 눌렀을 때 해당 건 갱신
 *
 * 사진은 저장하지 않는다 (메타데이터만).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const mode = MODES.find((m) => m === body?.mode)
    if (!mode) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    // 진행 중 생카에 자동 귀속 — 부스가 이벤트 id를 보낼 필요가 없다
    const currentEvent = await resolveCurrentEvent(serviceClient)

    const { data, error } = await serviceClient
      .from('photobooth_shots')
      .insert({
        mode,
        cut_count: Number.isInteger(body.cut_count) ? Math.min(9, Math.max(1, body.cut_count)) : 1,
        event_id: currentEvent?.id ?? null,
        card_code: text(body.card_code, 10),
        frame_title: text(body.frame_title),
        template_title: text(body.template_title),
        cutout_used: body.cutout_used === true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Photobooth shot insert failed:', error)
      return NextResponse.json({ error: '기록에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Photobooth shot POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.id !== 'string') {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    const payload: Record<string, boolean> = {}
    if (body.printed === true) payload.printed = true
    if (body.downloaded === true) payload.downloaded = true
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: true })
    }

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('photobooth_shots')
      .update(payload)
      .eq('id', body.id)

    if (error) {
      console.error('Photobooth shot update failed:', error)
      return NextResponse.json({ error: '기록에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Photobooth shot PATCH error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
