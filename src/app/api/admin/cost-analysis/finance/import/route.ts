import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { hasCostAnalysisAccess } from '@/lib/admin/cost-analysis-access'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  DEFAULT_FINANCE_MONTH_SETTINGS,
  mergeFinanceSettings,
  normalizeFinanceMonth,
  type FinanceMonthSettings,
  type FinanceTransaction,
} from '@/lib/admin/finance-core'
import { parseFinanceImportFile, settingsWithPatch } from '@/lib/admin/finance-import'

const IMPORT_SOURCES = new Set(['full_workbook', 'payhere_wow', 'payhere_id', 'payhere_online', 'naver_booking'])

function toDbSettings(month: string, settings: FinanceMonthSettings, updatedBy: string) {
  return {
    month,
    fixed_rent: Math.round(settings.fixedRent),
    fixed_utilities: Math.round(settings.fixedUtilities),
    fixed_telecom: Math.round(settings.fixedTelecom),
    fixed_insurance: Math.round(settings.fixedInsurance),
    fixed_other: Math.round(settings.fixedOther),
    wow_fixed_allocation_percent: settings.wowFixedAllocationPercent,
    id_fixed_allocation_percent: settings.idFixedAllocationPercent,
    online_fixed_allocation_percent: settings.onlineFixedAllocationPercent,
    id_staff_labor: Math.round(settings.idStaffLabor),
    event_staff_labor: Math.round(settings.eventStaffLabor),
    naver_fee_rate_percent: settings.naverFeeRatePercent,
    payhere_fee_rate_percent: settings.payhereFeeRatePercent,
    online_pg_fee_rate_percent: settings.onlinePgFeeRatePercent,
    notes: settings.notes || '',
    updated_by: updatedBy,
  }
}

function dbSettingsToClient(row: Record<string, unknown> | null): FinanceMonthSettings {
  if (!row) return DEFAULT_FINANCE_MONTH_SETTINGS
  const numberValue = (key: string) => Number(row[key] || 0)
  return mergeFinanceSettings({
    fixedRent: numberValue('fixed_rent'),
    fixedUtilities: numberValue('fixed_utilities'),
    fixedTelecom: numberValue('fixed_telecom'),
    fixedInsurance: numberValue('fixed_insurance'),
    fixedOther: numberValue('fixed_other'),
    wowFixedAllocationPercent: numberValue('wow_fixed_allocation_percent'),
    idFixedAllocationPercent: numberValue('id_fixed_allocation_percent'),
    onlineFixedAllocationPercent: numberValue('online_fixed_allocation_percent'),
    idStaffLabor: numberValue('id_staff_labor'),
    eventStaffLabor: numberValue('event_staff_labor'),
    naverFeeRatePercent: numberValue('naver_fee_rate_percent'),
    payhereFeeRatePercent: numberValue('payhere_fee_rate_percent'),
    onlinePgFeeRatePercent: numberValue('online_pg_fee_rate_percent'),
    notes: String(row.notes || ''),
  })
}

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

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    if (!hasCostAnalysisAccess(request)) {
      return NextResponse.json({ error: '원가 분석 비밀번호 확인이 필요합니다' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const source = String(formData.get('source') || '')
    const month = normalizeFinanceMonth(String(formData.get('month') || ''))
    const replaceExisting = String(formData.get('replaceExisting') || 'true') !== 'false'

    if (!IMPORT_SOURCES.has(source)) {
      return NextResponse.json({ error: '지원하지 않는 업로드 소스입니다' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '업로드할 파일이 필요합니다' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = parseFinanceImportFile(buffer, file.name, source, month)
    const supabase = createServiceRoleClient()

    if (replaceExisting) {
      if (source === 'full_workbook') {
        const sources = ['payhere_wow', 'payhere_id', 'payhere_online', 'naver_booking']
        const { error: transactionDeleteError } = await supabase
          .from('finance_transactions')
          .delete()
          .eq('month', month)
          .in('source', sources)
        if (transactionDeleteError) throw transactionDeleteError

        const { error: manualDeleteError } = await supabase
          .from('finance_manual_entries')
          .delete()
          .eq('month', month)
          .in('source', ['workbook_import', 'workbook_summary_import'])
        if (manualDeleteError) throw manualDeleteError
      } else {
        const { error: transactionDeleteError } = await supabase
          .from('finance_transactions')
          .delete()
          .eq('month', month)
          .eq('source', source)
        if (transactionDeleteError) throw transactionDeleteError
      }
    }

    const grossAmount = parsed.transactions.reduce((sum, row) => sum + Math.round(row.grossAmount), 0)
    const { data: batch, error: batchError } = await supabase
      .from('finance_import_batches')
      .insert({
        month,
        source,
        file_name: file.name,
        row_count: parsed.transactions.length + parsed.manualEntries.length,
        gross_amount: grossAmount,
        replaced_existing: replaceExisting,
        imported_by: admin.email,
      })
      .select('id')
      .single()

    if (batchError) throw batchError
    const importBatchId = String(batch.id)

    for (const rows of chunk(parsed.transactions.map((row) => transactionToDb(row, importBatchId)), 500)) {
      const { error } = await supabase.from('finance_transactions').insert(rows)
      if (error) throw error
    }

    for (const rows of chunk(parsed.manualEntries, 500)) {
      const { error } = await supabase.from('finance_manual_entries').insert(rows.map((entry) => ({
        month: entry.month,
        kind: entry.kind,
        channel: entry.channel,
        category: entry.category,
        amount: Math.round(entry.amount),
        occurred_on: entry.occurredOn,
        description: entry.description,
        source: entry.source || 'workbook_import',
        raw_payload: entry.rawPayload || {},
        created_by: admin.email,
      })))
      if (error) throw error
    }

    if (parsed.settingsPatch) {
      const { data: currentSettings } = await supabase
        .from('finance_month_settings')
        .select('*')
        .eq('month', month)
        .maybeSingle()
      const merged = settingsWithPatch(dbSettingsToClient(currentSettings as Record<string, unknown> | null), parsed.settingsPatch)
      const { error } = await supabase
        .from('finance_month_settings')
        .upsert(toDbSettings(month, merged, admin.email), { onConflict: 'month' })
      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      month,
      source,
      importBatchId,
      rowCount: parsed.transactions.length,
      manualEntryCount: parsed.manualEntries.length,
      grossAmount,
      detectedSheets: parsed.detectedSheets,
      settingsImported: Boolean(parsed.settingsPatch),
    })
  } catch (error) {
    console.error('[finance/import] POST error:', error)
    return NextResponse.json({ error: '재무 파일 업로드 처리에 실패했습니다' }, { status: 500 })
  }
}
