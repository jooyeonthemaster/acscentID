import fs from 'fs'
import path from 'path'
import { createServiceRoleClient } from '../src/lib/supabase/service'
import {
  DEFAULT_FINANCE_MONTH_SETTINGS,
  mergeFinanceSettings,
  normalizeFinanceMonth,
  type FinanceMonthSettings,
  type FinanceTransaction,
} from '../src/lib/admin/finance-core'
import { parseFinanceImportFile, settingsWithPatch } from '../src/lib/admin/finance-import'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq < 0) return
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  })
}

function arg(name: string, fallback = '') {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || fallback
}

function nfc(value: string) {
  return value.normalize('NFC')
}

function child(parent: string, wanted: string) {
  const found = fs.readdirSync(parent).find((name) => nfc(name) === wanted)
  if (!found) throw new Error(`Missing path segment: ${wanted}`)
  return path.join(parent, found)
}

function defaultMayWorkbookPath() {
  const base = '/Users/idongju/Library/Mobile Documents/com~apple~CloudDocs'
  return child(child(child(child(child(base, '*네안데르'), '0.네안데르 회계'), '2026'), '5월'), '2605악센트원가계산.xlsx')
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

async function main() {
  loadEnv(path.join(process.cwd(), '.env.local'))

  const month = normalizeFinanceMonth(arg('month', '2026-05'))
  const source = arg('source', 'full_workbook')
  const filePath = arg('file', defaultMayWorkbookPath())
  const replaceExisting = arg('replace', 'true') !== 'false'
  const importedBy = arg('by', 'codex-import')
  const dryRun = arg('dry-run', 'false') === 'true'

  const parsed = parseFinanceImportFile(fs.readFileSync(filePath), path.basename(filePath), source, month)
  const grossAmount = parsed.transactions.reduce((sum, row) => sum + Math.round(row.grossAmount), 0)

  const bySource = parsed.transactions.reduce<Record<string, { count: number; amount: number }>>((acc, row) => {
    acc[row.source] ||= { count: 0, amount: 0 }
    acc[row.source].count += 1
    acc[row.source].amount += row.grossAmount
    return acc
  }, {})
  const manualByCategory = parsed.manualEntries.reduce<Record<string, { count: number; amount: number }>>((acc, row) => {
    acc[row.category] ||= { count: 0, amount: 0 }
    acc[row.category].count += 1
    acc[row.category].amount += row.amount
    return acc
  }, {})

  if (dryRun) {
    console.log(JSON.stringify({
      success: true,
      dryRun: true,
      month,
      source,
      fileName: path.basename(filePath),
      transactions: parsed.transactions.length,
      bySource,
      manualEntries: parsed.manualEntries.length,
      manualByCategory,
      grossAmount,
      settingsImported: Boolean(parsed.settingsPatch),
    }, null, 2))
    return
  }

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
      const { error } = await supabase.from('finance_transactions').delete().eq('month', month).eq('source', source)
      if (error) throw error
    }
  }

  const { data: batch, error: batchError } = await supabase
    .from('finance_import_batches')
    .insert({
      month,
      source,
      file_name: path.basename(filePath),
      row_count: parsed.transactions.length + parsed.manualEntries.length,
      gross_amount: grossAmount,
      replaced_existing: replaceExisting,
      imported_by: importedBy,
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
      created_by: importedBy,
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
      .upsert(toDbSettings(month, merged, importedBy), { onConflict: 'month' })
    if (error) throw error
  }

  console.log(JSON.stringify({
    success: true,
    month,
    source,
    fileName: path.basename(filePath),
    importBatchId,
    transactions: parsed.transactions.length,
    bySource,
    manualEntries: parsed.manualEntries.length,
    manualByCategory,
    grossAmount,
    settingsImported: Boolean(parsed.settingsPatch),
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
