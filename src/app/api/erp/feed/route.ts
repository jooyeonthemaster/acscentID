// ============================================================
//  ERP 매출 피드 — 본사 ERP 가 온라인 주문을 끌어가는 창구
// ------------------------------------------------------------
//  본사 ERP(NEANDER)의 매출 워크스페이스는 지금까지 관리자 주문 화면에서
//  「페이히어 온라인」 엑셀을 내려받아 **손으로 올려** 왔다
//  (src/lib/admin/sales-excel.ts). 그 엑셀은 이 DB 를 페이히어 시트 모양으로
//  재가공한 것이라, 품목 라벨만 남고 주문번호는 비고 문자열이 되고,
//  쿠폰 할인은 품목에 미리 안분된 채로 넘어갔다 — 손실 변환이다.
//
//  이 라우트는 그 손실 없이 원본을 그대로 넘긴다. 엑셀은 사람이 눈으로
//  볼 때를 위해 남겨 둔다.
//
//  ⚠️ **읽기 전용이다.** 이 파일은 어떤 테이블도 쓰지 않는다.
//  ⚠️ 개인정보는 고르지 않는다 — select 문에 recipient_name·phone·address·
//     memo 가 없다는 사실이 이 약속의 실제 이행이다.
//
//  부르는 법 (셋 중 하나):
//    GET /api/erp/feed?after=<cursorKey>&limit=300
//        그 커서 뒤로 **바뀐** 주문만. 평소 동기화가 쓴다. 처음이면 after 없이.
//    GET /api/erp/feed?ids=<주문id,…>
//        그 주문들이 **아직 있는지**. ERP 가 가진 주문 중 여기 안 돌아온 것은
//        관리자 화면에서 지워진 것이다 — 지운 주문은 증분에 다시 오지 않으므로
//        이렇게 되물어야 ERP 의 매출 줄을 치울 수 있다.
//    GET /api/erp/feed?from=YYYY-MM-DD&to=YYYY-MM-DD&offset=0&limit=300
//        그 기간에 **들어온** 주문. 과거 적재가 쓴다. 남았으면 complete=false 이고
//        ERP 는 offset 을 limit 만큼 밀어 다시 부른다.
//
//  ⚠️ after 모드는 orders.updated_at 에 기댄다. 이 테이블에는 updated_at 을
//     자동으로 올리는 트리거가 없고, 결제·환불·상태변경 라우트가 손으로
//     넣고 있다. 그 코드를 지나지 않고 값이 바뀌면(콘솔에서 직접 고치는 등)
//     after 모드가 놓친다. 그래서 ERP 는 주기적으로 from/to 모드를 한 번씩
//     돌려 그 달을 통째로 맞춘다 — 놓침을 구조로 메운다.
// ============================================================

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { checkFeedAuth } from '@/lib/erp/feed-auth'
import {
  FEED_SOURCE,
  FEED_VERSION,
  NEVER_PAID_STATUSES,
  REVENUE_STATUSES,
  type FeedEnvelope,
  type OnlineOrderItemRow,
  type OnlineOrderRow,
} from '@/lib/erp/feed-contract'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 300
/** ids 모드에서 한 번에 물을 수 있는 주문 수 */
const MAX_IDS = 100
const MAX_LIMIT = 500
/** 품목을 읽을 때 한 번에 넣는 주문 수 */
const ITEM_CHUNK = 100
/** 주문 하나에 이만큼 넘는 품목은 없다고 본다 — 넘으면 멈춘다 (위 주석) */
const ITEMS_PER_ORDER_CAP = 9

/** 주문 헤더에서 고르는 열 — 개인정보 열은 여기 없다 */
const ORDER_COLUMNS = [
  'id',
  'order_number',
  'created_at',
  'updated_at',
  'paid_at',
  'status',
  'payment_method',
  'pg_provider',
  'pg_tx_id',
  'price',
  'subtotal',
  'item_count',
  'shipping_fee',
  'discount_amount',
  'original_price',
  'final_price',
  'refund_amount',
  'refunded_at',
  'is_influencer',
  'product_type',
  'size',
  'perfume_name',
].join(', ')

const ITEM_COLUMNS = 'id, order_id, product_type, size, perfume_name, unit_price, quantity, subtotal'

type Row = Record<string, unknown>

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const text = (v: unknown) => String(v ?? '').trim()
const ms = (v: unknown) => {
  const t = Date.parse(String(v ?? ''))
  return Number.isFinite(t) ? t : 0
}

/** cursorKey = `updated_at 원문|id` */
function parseAfter(raw: string | null): { ts: string; id: string } | null {
  if (!raw) return null
  const at = raw.lastIndexOf('|')
  if (at <= 0) return null
  const ts = raw.slice(0, at)
  const id = raw.slice(at + 1)
  if (!Number.isFinite(Date.parse(ts)) || !/^[0-9a-f-]{36}$/i.test(id)) return null
  return { ts, id }
}

/** PostgREST or() 안에 넣을 값 — 따옴표로 감싼다 (시각의 콜론·점·+ 때문에) */
const pgQuote = (v: string) => `"${v.replace(/"/g, '')}"`

function toKoreaBoundaryIso(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+09:00`).toISOString()
}

/**
 * 이 주문을 매출로 볼 것인가, 아니라면 왜 아닌가.
 *
 * 바탕은 원가계산 화면의 규칙이다 (REVENUE_STATUSES · 인플루언서 제외).
 *
 * ⚠️ **한 가지는 일부러 다르게 판정한다 — 부분 환불.**
 *    이 사이트의 환불 라우트 셋(admin/orders/refund · refund/manual · 결제
 *    웹훅의 PartialCancelled)은 금액이 일부여도 status 를 'cancelled' 로
 *    바꾼다. 그래서 상태만 보면 72,000 중 24,000 을 돌려준 주문이 **통째로
 *    매출에서 사라진다** — 실제로는 48,000 을 받았는데. 원가계산 화면
 *    (cost-analysis/finance)도 같은 이유로 그 주문을 빼고 있다.
 *
 *    피드는 금액으로 판정한다: 돌려준 돈이 결제액보다 적으면 매출이다.
 *    얼마를 돌려줬는지 함께 보내고, 어느 품목인지는 ERP 가 사람에게 묻는다.
 *
 * ⚠️ cancel_requested(고객 취소 요청, 아직 처리 전)는 원가계산 화면처럼
 *    매출에서 뺀다. 요청이 거절돼 상태가 돌아오면 updated_at 이 움직여 다시
 *    들어온다.
 */
function judge(order: Row): { revenue: boolean; excluded?: OnlineOrderRow['excluded'] } {
  const status = text(order.status)
  const finalPrice = num(order.final_price)
  const refund = num(order.refund_amount)

  if (order.is_influencer) return { revenue: false, excluded: 'influencer' }
  if (text(order.product_type) === 'payment_test') return { revenue: false, excluded: 'test' }
  if (finalPrice <= 0) return { revenue: false, excluded: 'test' }

  // 환불 처리된 주문 — 금액으로 가른다 (위 주석)
  if (status === 'cancelled') {
    if (refund > 0 && refund < finalPrice) return { revenue: true }
    return { revenue: false, excluded: refund > 0 ? 'refunded' : 'cancelled' }
  }
  if (!REVENUE_STATUSES.includes(status as (typeof REVENUE_STATUSES)[number])) {
    return { revenue: false, excluded: status === 'cancel_requested' ? 'cancelled' : 'unpaid' }
  }
  if (refund > 0 && refund >= finalPrice) return { revenue: false, excluded: 'refunded' }
  return { revenue: true }
}

/**
 * 품목 줄. order_items 가 없는 옛 주문(2026-01-25 장바구니 도입 전)은
 * 주문 헤더로 한 줄을 합성한다 — 엑셀 내보내기와 같은 방식이다.
 */
function itemsOf(order: Row, items: Row[]): OnlineOrderItemRow[] {
  if (items.length > 0) {
    return items.map((it) => {
      const qty = Math.max(1, num(it.quantity))
      const subtotal = num(it.subtotal) || num(it.unit_price) * qty
      return {
        id: text(it.id),
        productType: text(it.product_type) || text(order.product_type),
        size: text(it.size),
        name: text(it.perfume_name),
        unitPrice: num(it.unit_price) || (qty > 0 ? Math.round(subtotal / qty) : subtotal),
        qty,
        subtotal,
      }
    })
  }
  const qty = Math.max(1, num(order.item_count))
  const subtotal = num(order.subtotal) || num(order.price)
  return [
    {
      // 합성 줄의 id 는 주문 id 다 — ERP 의 멱등키가 안정적이어야 한다
      id: text(order.id),
      productType: text(order.product_type) || 'image_analysis',
      size: text(order.size),
      name: text(order.perfume_name),
      unitPrice: qty > 0 ? Math.round(subtotal / qty) : subtotal,
      qty,
      subtotal,
    },
  ]
}

function toRow(order: Row, items: Row[]): OnlineOrderRow {
  const list = itemsOf(order, items)
  const itemsTotal = list.reduce((s, i) => s + i.subtotal, 0)
  const { revenue, excluded } = judge(order)
  const out: OnlineOrderRow = {
    id: text(order.id),
    orderNumber: text(order.order_number),
    paidAt: order.paid_at ? String(order.paid_at) : null,
    createdAt: String(order.created_at ?? ''),
    updatedAt: String(order.updated_at ?? order.created_at ?? ''),
    status: text(order.status),
    revenue,
    paymentMethod: text(order.payment_method) || 'card',
    itemsTotal,
    shippingFee: num(order.shipping_fee),
    discountAmount: num(order.discount_amount),
    finalPrice: num(order.final_price),
    refundAmount: num(order.refund_amount),
    refundedAt: order.refunded_at ? String(order.refunded_at) : null,
    items: list,
  }
  if (excluded) out.excluded = excluded
  if (text(order.pg_provider)) out.pgProvider = text(order.pg_provider)
  if (text(order.pg_tx_id)) out.pgTxId = text(order.pg_tx_id)
  return out
}

export async function GET(req: Request) {
  const auth = checkFeedAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(req.url)
  const afterParam = url.searchParams.get('after')
  const after = parseAfter(afterParam)
  if (afterParam && !after) {
    return NextResponse.json({ error: 'after 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  const idsParam = (url.searchParams.get('ids') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  if (idsParam.length > MAX_IDS) {
    return NextResponse.json({ error: `ids 는 한 번에 ${MAX_IDS}개까지입니다.` }, { status: 400 })
  }
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit')) || DEFAULT_LIMIT))
  const serverTime = Date.now()

  try {
    const supabase = createServiceRoleClient()
    let query = supabase.from('orders').select(ORDER_COLUMNS)

    const idsMode = idsParam.length > 0
    const windowMode = !idsMode && !!(from || to)
    if (idsMode) {
      // 아직 있는지 묻는 모드 — 상태 거르기 없이 있는 그대로
      query = query.in('id', idsParam)
    } else if (windowMode) {
      // 기간 모드 — 그 기간에 들어온 주문 (과거 적재). id 로 순서를 굳혀야
      // offset 으로 넘길 때 같은 주문이 두 쪽에 걸치거나 빠지지 않는다.
      if (from) query = query.gte('created_at', toKoreaBoundaryIso(from))
      if (to) query = query.lt('created_at', toKoreaBoundaryIso(to))
      query = query.order('created_at', { ascending: true }).order('id', { ascending: true })
    } else {
      // 증분 모드 — (updated_at, id) 짝이 커서보다 뒤인 주문만
      if (after) {
        const ts = pgQuote(after.ts)
        query = query.or(`updated_at.gt.${ts},and(updated_at.eq.${ts},id.gt.${after.id})`)
      }
      query = query.order('updated_at', { ascending: true }).order('id', { ascending: true })
    }

    // 결제창만 열고 끝난 시도는 보내지 않는다. pending(무통장 입금 대기)은
    // 보낸다 — 관리자가 입금 확인을 되돌리면 paid → pending 이 되는데, 그걸
    // 걸러 버리면 ERP 가 이미 적재한 줄을 지울 기회가 없다.
    // (ids 모드는 거르지 않는다 — "있나"를 묻는 것이다)
    if (!idsMode) {
      query = query.or(
        `paid_at.not.is.null,status.not.in.(${NEVER_PAID_STATUSES.join(',')})`,
      )
    }

    const { data: orders, error } = idsMode
      ? await query
      : windowMode
        ? await query.range(offset, offset + limit - 1)
        : await query.limit(limit)
    if (error) {
      console.error('[erp/feed] orders query failed:', error.message)
      return NextResponse.json({ error: `주문을 읽지 못했습니다: ${error.message}` }, { status: 500 })
    }

    // supabase-js 는 select 문자열을 정적으로 해석해 열 타입을 추론하려 하는데,
    // orders 테이블은 생성 DDL 이 레포에 없어 타입이 없다 (마이그레이션에 ALTER 만
    // 있다). 추론이 실패한 자리라 unknown 을 거쳐 우리가 아는 모양으로 읽는다.
    const list = (orders ?? []) as unknown as Row[]
    const ids = list.map((o) => text(o.id)).filter(Boolean)

    // 품목은 주문 id 를 잘게 나눠 읽는다. 한 번에 수백 개를 in() 에 넣으면
    // ① URL 이 수십 KB 가 되고 ② PostgREST 가 한 응답을 1,000행에서 자른다.
    // 잘린 주문은 품목이 없는 옛 주문처럼 보여 헤더로 한 줄이 합성되고,
    // 다음 증분에서 진짜 품목 줄이 따로 생겨 **매출이 두 번** 잡힌다.
    const byOrder = new Map<string, Row[]>()
    for (let i = 0; i < ids.length; i += ITEM_CHUNK) {
      const { data: items, error: itemError } = await supabase
        .from('order_items')
        .select(ITEM_COLUMNS)
        .in('order_id', ids.slice(i, i + ITEM_CHUNK))
        .range(0, ITEM_CHUNK * ITEMS_PER_ORDER_CAP - 1)
      if (itemError) {
        console.error('[erp/feed] order_items query failed:', itemError.message)
        return NextResponse.json({ error: `품목을 읽지 못했습니다: ${itemError.message}` }, { status: 500 })
      }
      const got = (items ?? []) as unknown as Row[]
      if (got.length >= ITEM_CHUNK * ITEMS_PER_ORDER_CAP) {
        // 이 한도에 닿았다면 잘렸을 수 있다 — 틀린 줄을 보내느니 멈춘다
        return NextResponse.json(
          { error: '품목이 한 번에 읽을 수 있는 한도를 넘었습니다. limit 을 줄여 다시 부르세요.' },
          { status: 500 },
        )
      }
      for (const it of got) {
        const key = text(it.order_id)
        const bucket = byOrder.get(key)
        if (bucket) bucket.push(it)
        else byOrder.set(key, [it])
      }
    }

    const rows = list.map((o) => toRow(o, byOrder.get(text(o.id)) || []))

    // 커서는 증분 모드에서 **마지막으로 보낸 주문**의 (updated_at 원문, id) 다.
    // 정렬이 (updated_at, id) 라 마지막 줄이 곧 가장 뒤다. 받은 것이 없으면
    // 요청의 커서를 그대로 돌려준다.
    const last = !idsMode && !windowMode && list.length > 0 ? list[list.length - 1] : null
    const cursorKey = last
      ? `${String(last.updated_at ?? last.created_at ?? '')}|${text(last.id)}`
      : afterParam || ''
    const cursor = rows.reduce((max, r) => Math.max(max, ms(r.updatedAt)), 0)

    const envelope: FeedEnvelope<OnlineOrderRow> = {
      version: FEED_VERSION,
      source: FEED_SOURCE,
      serverTime,
      cursor,
      cursorKey,
      complete: idsMode || rows.length < limit,
      rows,
    }
    return NextResponse.json(envelope, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[erp/feed] failed:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '알 수 없는 오류' },
      { status: 500 },
    )
  }
}
