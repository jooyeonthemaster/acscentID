import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { hasCostAnalysisAccess } from '@/lib/admin/cost-analysis-access'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { normalizeFinanceMonth, type FinanceTransaction } from '@/lib/admin/finance-core'
import {
  fetchPayhereTransactions,
  getPayhereSyncStatus,
  PayhereConfigurationError,
  PAYHERE_SYNC_SOURCES,
  type PayhereSyncSource,
} from '@/lib/admin/payhere-sync'

const PAYHERE_SOURCE_SET = new Set(PAYHERE_SYNC_SOURCES.map((source) => source.source))

function transactionToDb(row: FinanceTransaction, importBatchId: string) {
  return {
    month: row.month,
    source: row.source,
    channel: row.channel,
    occurred_on: row.occurredOn,
    external_id: row.externalId,
    status: row.status,
    item_name: row.itemName,
    option_text: row.optionText,
    raw_description: row.rawDescription,
    quantity: row.quantity,
    gross_amount: Math.round(row.grossAmount),
    payment_method: row.paymentMethod,
    raw_payload: row.rawPayload || {},
    import_batch_id: importBatchId,
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

function sourcesFromBody(value: unknown): PayhereSyncSource[] {
  const rawSources = Array.isArray(value) ? value.map((source) => String(source)) : PAYHERE_SYNC_SOURCES.map((source) => source.source)
  const uniqueSources = Array.from(new Set(rawSources))
  return uniqueSources.filter((source): source is PayhereSyncSource => PAYHERE_SOURCE_SET.has(source as PayhereSyncSource))
}

async function requireFinanceAdmin(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 }),
    }
  }

  if (!hasCostAnalysisAccess(request)) {
    return {
      admin: null,
      response: NextResponse.json({ error: '원가 분석 비밀번호 확인이 필요합니다' }, { status: 403 }),
    }
  }

  return { admin, response: null }
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireFinanceAdmin(request)
    if (response) return response

    return NextResponse.json(getPayhereSyncStatus())
  } catch (error) {
    console.error('[finance/payhere-sync] GET error:', error)
    return NextResponse.json({ error: 'PAYHERE 동기화 상태를 확인하지 못했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, response } = await requireFinanceAdmin(request)
    if (response || !admin) return response

    const body = await request.json().catch(() => ({}))
    const month = normalizeFinanceMonth(body.month || '')
    const sources = sourcesFromBody(body.sources)
    const replaceExisting = body.replaceExisting !== false

    if (sources.length === 0) {
      return NextResponse.json({ error: '동기화할 PAYHERE 매장을 선택해 주세요' }, { status: 400 })
    }

    const status = getPayhereSyncStatus()
    const unavailableSources = status.sources.filter((source) => sources.includes(source.source) && !source.configured)
    if (!status.configured || unavailableSources.length > 0) {
      return NextResponse.json(
        {
          error: 'PAYHERE API 설정이 아직 완료되지 않았습니다',
          status,
        },
        { status: 409 }
      )
    }

    const synced = await fetchPayhereTransactions({ month, sources })
    const supabase = createServiceRoleClient()

    if (replaceExisting) {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('month', month)
        .in('source', sources)
      if (error) throw error
    }

    const importBatches = []
    for (const sourceRow of synced.sourceRows) {
      const rows = synced.transactions.filter((transaction) => transaction.source === sourceRow.source)
      const { data: batch, error: batchError } = await supabase
        .from('finance_import_batches')
        .insert({
          month,
          source: sourceRow.source,
          file_name: 'PAYHERE API 자동 동기화',
          row_count: rows.length,
          gross_amount: sourceRow.grossAmount,
          replaced_existing: replaceExisting,
          imported_by: admin.email,
        })
        .select('id')
        .single()

      if (batchError) throw batchError
      const importBatchId = String(batch.id)

      for (const insertRows of chunk(rows.map((row) => transactionToDb(row, importBatchId)), 500)) {
        const { error } = await supabase.from('finance_transactions').insert(insertRows)
        if (error) throw error
      }

      importBatches.push({
        ...sourceRow,
        importBatchId,
      })
    }

    return NextResponse.json({
      success: true,
      month,
      sources: importBatches,
      transactionCount: synced.transactions.length,
      grossAmount: synced.transactions.reduce((sum, row) => sum + Math.round(row.grossAmount), 0),
      status: synced.status,
    })
  } catch (error) {
    if (error instanceof PayhereConfigurationError) {
      return NextResponse.json(
        {
          error: error.message,
          status: error.status,
        },
        { status: 409 }
      )
    }

    console.error('[finance/payhere-sync] POST error:', error)
    return NextResponse.json({ error: 'PAYHERE 매출 동기화에 실패했습니다' }, { status: 500 })
  }
}
