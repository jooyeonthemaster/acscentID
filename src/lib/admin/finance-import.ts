import crypto from 'crypto'
import * as XLSX from 'xlsx'
import {
  DEFAULT_FINANCE_MONTH_SETTINGS,
  type FinanceChannel,
  type FinanceManualEntry,
  type FinanceMonthSettings,
  type FinanceSource,
  type FinanceTransaction,
  normalizeFinanceMonth,
} from './finance-core'

type SheetRows = unknown[][]

export interface FinanceImportParseResult {
  transactions: FinanceTransaction[]
  manualEntries: FinanceManualEntry[]
  settingsPatch: Partial<FinanceMonthSettings> | null
  detectedSheets: string[]
}

const PAYHERE_SOURCES = ['payhere_wow', 'payhere_id', 'payhere_online'] as const

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const cleaned = normalizeText(value).replace(/[^\d.-]/g, '')
  if (!cleaned) return 0
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function excelSerialToDate(value: number) {
  const parsed = XLSX.SSF.parse_date_code(value)
  if (!parsed) return ''
  const month = String(parsed.m).padStart(2, '0')
  const day = String(parsed.d).padStart(2, '0')
  return `${parsed.y}-${month}-${day}`
}

function toIsoDate(value: unknown, fallbackMonth: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return excelSerialToDate(value) || fallbackMonth
  }

  const text = normalizeText(value)
  if (!text) return fallbackMonth

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serialDate = excelSerialToDate(Number(text))
    if (serialDate) return serialDate
  }

  const iso = text.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }

  const koreanShort = text.match(/(\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})/)
  if (koreanShort) {
    return `20${koreanShort[1]}-${koreanShort[2].padStart(2, '0')}-${koreanShort[3].padStart(2, '0')}`
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)

  return fallbackMonth
}

function parseQuantity(value: unknown) {
  const text = normalizeText(value)
  if (!text) return 1
  const people = text.match(/(\d+(?:\.\d+)?)\s*명/)
  if (people) return Number(people[1])
  const paren = text.match(/\((\d+(?:\.\d+)?)\)/)
  if (paren) return Number(paren[1])
  const plain = text.match(/^(\d+(?:\.\d+)?)/)
  if (plain) return Number(plain[1])
  return 1
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): SheetRows | null {
  const realName = workbook.SheetNames.find((name) => normalizeText(name) === normalizeText(sheetName))
  const sheet = realName ? workbook.Sheets[realName] : null
  if (!sheet) return null
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as SheetRows
}

function getFirstSheetRows(workbook: XLSX.WorkBook): SheetRows {
  const firstName = workbook.SheetNames[0]
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstName], { header: 1, defval: '', raw: false }) as SheetRows
}

function findHeaderRow(rows: SheetRows, required: string[]) {
  return rows.findIndex((row) => {
    const cells = row.map(normalizeText)
    return required.every((label) => cells.some((cell) => cell.includes(label)))
  })
}

function headerMap(row: unknown[]) {
  return row.reduce<Record<string, number>>((acc, cell, index) => {
    const text = normalizeText(cell)
    if (text && acc[text] === undefined) acc[text] = index
    return acc
  }, {})
}

function findHeaderIndex(headers: Record<string, number>, candidates: string[], fallback: number) {
  for (const [header, index] of Object.entries(headers)) {
    if (candidates.some((candidate) => header.includes(candidate))) return index
  }
  return fallback
}

function stableExternalId(parts: unknown[]) {
  return crypto
    .createHash('sha1')
    .update(parts.map((part) => normalizeText(part)).join('|'))
    .digest('hex')
}

function sourceDefaultChannel(source: FinanceSource): FinanceChannel {
  if (source === 'payhere_wow') return 'wow_store'
  if (source === 'payhere_id' || source === 'naver_booking') return 'id_store'
  if (source === 'payhere_online') return 'online_site'
  return 'unknown'
}

function parsePayhereRows(rows: SheetRows, source: Extract<FinanceSource, 'payhere_wow' | 'payhere_id' | 'payhere_online'>, month: string) {
  const headerRow = findHeaderRow(rows, ['결제일', '합계'])
  if (headerRow < 0) return []

  const headers = headerMap(rows[headerRow])
  const dateIndex = findHeaderIndex(headers, ['결제일', '일자', '날짜'], 0)
  const timeIndex = findHeaderIndex(headers, ['결제시간', '시간'], 1)
  const descIndex = findHeaderIndex(headers, ['결제 내역', '상품', '내역'], 2)
  const amountIndex = findHeaderIndex(headers, ['합계', '금액', '결제금액'], 3)
  const quantityIndex = findHeaderIndex(headers, ['수량'], -1)
  const monthDate = normalizeFinanceMonth(month)

  return rows.slice(headerRow + 1).flatMap<FinanceTransaction>((row, rowIndex) => {
    const amount = Math.round(asNumber(row[amountIndex]))
    const rawDescription = normalizeText(row[descIndex])
    const dateValue = row[dateIndex]
    if (!amount || !dateValue || rawDescription.includes('전체합계')) return []

    const occurredOn = toIsoDate(dateValue, monthDate)
    const externalId = stableExternalId([source, occurredOn, row[timeIndex], rawDescription, amount, rowIndex])

    return [{
      month: monthDate,
      source,
      channel: sourceDefaultChannel(source),
      occurredOn,
      externalId,
      rawDescription,
      itemName: rawDescription,
      quantity: quantityIndex >= 0 ? parseQuantity(row[quantityIndex]) : 1,
      grossAmount: amount,
      paymentMethod: 'payhere',
      rawPayload: {
        rowIndex: headerRow + rowIndex + 2,
        values: row.map((value) => normalizeText(value)),
      },
    }]
  })
}

function parseNaverRows(rows: SheetRows, month: string) {
  const headerRow = findHeaderRow(rows, ['예약번호', '상태'])
  if (headerRow < 0) return []

  const headers = headerMap(rows[headerRow])
  const externalIndex = findHeaderIndex(headers, ['예약번호'], 0)
  const statusIndex = findHeaderIndex(headers, ['상태'], 5)
  const dateIndex = findHeaderIndex(headers, ['이용일시', '예약일시', '방문일', '날짜'], 13)
  const itemIndex = findHeaderIndex(headers, ['상품명', '예약상품', '상품'], 15)
  const optionIndex = findHeaderIndex(headers, ['옵션', '이용인원', '방문자', '수량'], 16)
  const amountIndex = findHeaderIndex(headers, ['결제금액', '금액', '매출'], 17)
  const monthDate = normalizeFinanceMonth(month)

  return rows.slice(headerRow + 1).flatMap<FinanceTransaction>((row, rowIndex) => {
    const externalId = normalizeText(row[externalIndex])
    const status = normalizeText(row[statusIndex])
    const itemName = normalizeText(row[itemIndex])
    const optionText = normalizeText(row[optionIndex])
    const amount = Math.round(asNumber(row[amountIndex]))
    const occurredOn = toIsoDate(row[dateIndex], monthDate)

    if (!externalId && !itemName && !amount) return []

    return [{
      month: monthDate,
      source: 'naver_booking',
      channel: itemName.toLowerCase().includes('forget-me-not') ? 'wow_store' : 'id_store',
      occurredOn,
      externalId: externalId || stableExternalId(['naver_booking', occurredOn, itemName, optionText, amount, rowIndex]),
      status,
      itemName,
      optionText,
      rawDescription: `${itemName} ${optionText}`.trim(),
      quantity: parseQuantity(optionText),
      grossAmount: amount,
      paymentMethod: 'naver_pay',
      rawPayload: {
        rowIndex: headerRow + rowIndex + 2,
        values: row.map((value) => normalizeText(value)),
      },
    }]
  })
}

function labelValueMap(rows: SheetRows) {
  const map = new Map<string, number>()
  rows.forEach((row) => {
    const label = normalizeText(row[0])
    if (!label) return
    map.set(label, asNumber(row[1]))
  })
  return map
}

function settingsFromWorkbook(workbook: XLSX.WorkBook): Partial<FinanceMonthSettings> | null {
  const rows = getSheetRows(workbook, '기본가정')
  if (!rows) return null

  const labels = labelValueMap(rows)
  const patch: Partial<FinanceMonthSettings> = {}
  const put = (key: keyof FinanceMonthSettings, label: string) => {
    const value = labels.get(label)
    if (typeof value === 'number' && Number.isFinite(value)) {
      ;(patch as Record<string, number>)[key] = value
    }
  }

  put('fixedRent', '매장 임차료')
  put('fixedUtilities', '전기/수도/가스')
  put('fixedTelecom', '인터넷/통신비')
  put('fixedInsurance', '보험료')
  put('fixedOther', '기타')
  put('idStaffLabor', '월 상시 인건비')

  const naverRate = labels.get('네이버예약')
  if (typeof naverRate === 'number') patch.naverFeeRatePercent = naverRate <= 1 ? naverRate * 100 : naverRate
  const cardRate = labels.get('카드결제')
  if (typeof cardRate === 'number') patch.payhereFeeRatePercent = cardRate <= 1 ? cardRate * 100 : cardRate

  patch.notes = '원가계산 워크북에서 가져온 월별 기본 가정입니다.'
  return patch
}

function parseEventMasterManualEntries(workbook: XLSX.WorkBook, month: string) {
  const rows = getSheetRows(workbook, '입력_이벤트마스터')
  if (!rows) return []

  const monthDate = normalizeFinanceMonth(month)
  const headerRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.map(normalizeText).includes('코드') && row.map(normalizeText).includes('인건비'))

  const entries: FinanceManualEntry[] = []
  headerRows.forEach(({ row, index }, headerIndex) => {
    const headers = headerMap(row)
    const codeIndex = findHeaderIndex(headers, ['코드'], 0)
    const nameIndex = findHeaderIndex(headers, ['이벤트명'], 1)
    const startIndex = findHeaderIndex(headers, ['시작일'], 2)
    const laborIndex = findHeaderIndex(headers, ['인건비'], 9)
    const nextHeaderIndex = headerRows[headerIndex + 1]?.index ?? rows.length
    const sectionTitle = normalizeText(rows[index - 1]?.join(' '))
    const requiredPrefix = sectionTitle.includes('와우') ? 'WE-' : sectionTitle.includes('아이디') ? 'ID-' : ''

    rows.slice(index + 1, nextHeaderIndex).some((dataRow) => {
      const code = normalizeText(dataRow[codeIndex])
      if (!code) return false
      if (code.includes('소계') || code.startsWith('[') || code === '0') return false
      if (!/^(WE|ID)-/.test(code)) return false
      if (requiredPrefix && !code.startsWith(requiredPrefix)) return false

      const amount = Math.round(asNumber(dataRow[laborIndex]))
      if (amount > 0) {
        entries.push({
          month: monthDate,
          kind: 'cost',
          channel: code.startsWith('WE-') ? 'wow_store' : 'id_store',
          category: 'event_labor',
          amount,
          occurredOn: toIsoDate(dataRow[startIndex], monthDate),
          description: `이벤트 인건비 · ${normalizeText(dataRow[nameIndex]) || code}`,
          source: 'workbook_import',
          rawPayload: { code },
        })
      }

      return false
    })
  })

  return entries
}

function parseEventSupplyManualEntries(workbook: XLSX.WorkBook, month: string) {
  const rows = getSheetRows(workbook, '입력_이벤트준비물')
  if (!rows) return []

  const monthDate = normalizeFinanceMonth(month)
  const headerRow = findHeaderRow(rows, ['이벤트코드', '품목', '금액'])
  if (headerRow < 0) return []

  const headers = headerMap(rows[headerRow])
  const codeIndex = findHeaderIndex(headers, ['이벤트코드', '코드'], 0)
  const itemIndex = findHeaderIndex(headers, ['품목'], 2)
  const amountIndex = findHeaderIndex(headers, ['금액'], 5)
  const categoryIndex = findHeaderIndex(headers, ['카테고리'], 6)

  return rows.slice(headerRow + 1).flatMap<FinanceManualEntry>((row) => {
    const code = normalizeText(row[codeIndex])
    if (!/^(WE|ID)-/.test(code)) return []
    const amount = Math.round(asNumber(row[amountIndex]))
    if (amount <= 0) return []

    return [{
      month: monthDate,
      kind: 'cost',
      channel: code.startsWith('WE-') ? 'wow_store' : 'id_store',
      category: 'event_supply',
      amount,
      occurredOn: monthDate,
      description: `이벤트 준비물 · ${normalizeText(row[itemIndex]) || code}`,
      source: 'workbook_import',
      rawPayload: {
        code,
        category: normalizeText(row[categoryIndex]),
      },
    }]
  })
}

function sheetNumber(workbook: XLSX.WorkBook, sheetName: string, cellAddress: string) {
  const realName = workbook.SheetNames.find((name) => normalizeText(name) === normalizeText(sheetName))
  const sheet = realName ? workbook.Sheets[realName] : null
  if (!sheet) return 0
  return asNumber(sheet[cellAddress]?.v ?? sheet[cellAddress]?.w)
}

function workbookSummaryEntry({
  month,
  channel,
  category,
  amount,
  description,
  rawPayload,
}: {
  month: string
  channel: FinanceChannel
  category: string
  amount: number
  description: string
  rawPayload: Record<string, unknown>
}): FinanceManualEntry | null {
  if (!Number.isFinite(amount) || amount <= 0) return null
  return {
    month,
    kind: 'cost',
    channel,
    category,
    amount,
    occurredOn: month,
    description,
    source: 'workbook_summary_import',
    rawPayload,
  }
}

function parseWorkbookSummaryManualEntries(workbook: XLSX.WorkBook, month: string) {
  const monthDate = normalizeFinanceMonth(month)
  const entries: FinanceManualEntry[] = []

  const push = (entry: FinanceManualEntry | null) => {
    if (entry) entries.push(entry)
  }

  const productCostOverrides: Array<[FinanceChannel, string, number, string]> = [
    ['wow_store', '와우 재료비', sheetNumber(workbook, '통합BEP', 'B86'), '통합BEP!B86'],
    ['id_store', '아이디 재료비', sheetNumber(workbook, '통합BEP', 'C86'), '통합BEP!C86'],
    ['online_site', '온라인 재료비', sheetNumber(workbook, '온라인', 'B15'), '온라인!B15'],
  ]

  productCostOverrides.forEach(([channel, label, amount, cell]) => {
    push(workbookSummaryEntry({
      month: monthDate,
      channel,
      category: 'workbook_product_cost_override',
      amount,
      description: `워크북 재료비 · ${label}`,
      rawPayload: { workbookCell: cell, override: 'product_cost' },
    }))
  })

  const feeOverrides: Array<[FinanceChannel, string, number, string]> = [
    ['wow_store', '와우 수수료', sheetNumber(workbook, '통합BEP', 'B89'), '통합BEP!B89'],
    ['id_store', '아이디 수수료', sheetNumber(workbook, '통합BEP', 'C89'), '통합BEP!C89'],
  ]

  feeOverrides.forEach(([channel, label, amount, cell]) => {
    push(workbookSummaryEntry({
      month: monthDate,
      channel,
      category: 'workbook_fee_override',
      amount,
      description: `워크북 수수료 · ${label}`,
      rawPayload: { workbookCell: cell, override: 'fee' },
    }))
  })

  const directLaborEntries: Array<[FinanceChannel, string, number, string]> = [
    ['wow_store', '와우 직접인건비', sheetNumber(workbook, '와우매장', 'G26'), '와우매장!G26'],
    [
      'id_store',
      '아이디 직접인건비',
      sheetNumber(workbook, '아이디매장', 'I11') +
        sheetNumber(workbook, '아이디매장', 'J11') +
        sheetNumber(workbook, '아이디매장', 'I35') +
        sheetNumber(workbook, '아이디매장', 'J35'),
      '아이디매장!I11+J11+I35+J35',
    ],
  ]

  directLaborEntries.forEach(([channel, label, amount, cell]) => {
    push(workbookSummaryEntry({
      month: monthDate,
      channel,
      category: 'workbook_direct_labor',
      amount,
      description: `워크북 직접인건비 · ${label}`,
      rawPayload: { workbookCell: cell },
    }))
  })

  const eventSupplyEntries: Array<[FinanceChannel, string, number, string]> = [
    ['wow_store', '와우 이벤트 준비물', sheetNumber(workbook, '통합BEP', 'B88'), '통합BEP!B88'],
    ['id_store', '아이디 이벤트 준비물', sheetNumber(workbook, '통합BEP', 'C88'), '통합BEP!C88'],
  ]

  eventSupplyEntries.forEach(([channel, label, amount, cell]) => {
    push(workbookSummaryEntry({
      month: monthDate,
      channel,
      category: 'workbook_event_supply',
      amount,
      description: `워크북 이벤트 준비물 · ${label}`,
      rawPayload: { workbookCell: cell },
    }))
  })

  return entries
}

function parseStandalone(workbook: XLSX.WorkBook, source: FinanceSource, month: string) {
  const rows = getFirstSheetRows(workbook)
  if (source === 'naver_booking') return parseNaverRows(rows, month)
  if (PAYHERE_SOURCES.includes(source as (typeof PAYHERE_SOURCES)[number])) {
    return parsePayhereRows(rows, source as (typeof PAYHERE_SOURCES)[number], month)
  }
  return []
}

export function parseFinanceImportFile(buffer: Buffer, fileName: string, source: string, month: string): FinanceImportParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const normalizedMonth = normalizeFinanceMonth(month)

  if (source === 'full_workbook') {
    const transactions = [
      ...parsePayhereRows(getSheetRows(workbook, '입력_페이히어_와우') || [], 'payhere_wow', normalizedMonth),
      ...parsePayhereRows(getSheetRows(workbook, '입력_페이히어_아이디') || [], 'payhere_id', normalizedMonth),
      ...parsePayhereRows(getSheetRows(workbook, '입력_페이히어_온라인') || [], 'payhere_online', normalizedMonth),
      ...parseNaverRows(getSheetRows(workbook, '입력_네이버예약') || [], normalizedMonth),
    ]
    const workbookSummaryEntries = parseWorkbookSummaryManualEntries(workbook, normalizedMonth)
    const manualEntries = workbookSummaryEntries.length > 0 ? workbookSummaryEntries : [
      ...parseEventMasterManualEntries(workbook, normalizedMonth),
      ...parseEventSupplyManualEntries(workbook, normalizedMonth),
    ]
    const settingsPatch = settingsFromWorkbook(workbook)

    return {
      transactions,
      manualEntries,
      settingsPatch,
      detectedSheets: workbook.SheetNames,
    }
  }

  return {
    transactions: parseStandalone(workbook, source as FinanceSource, normalizedMonth),
    manualEntries: [],
    settingsPatch: null,
    detectedSheets: workbook.SheetNames,
  }
}

export function settingsWithPatch(base: FinanceMonthSettings, patch: Partial<FinanceMonthSettings> | null) {
  if (!patch) return base
  return {
    ...DEFAULT_FINANCE_MONTH_SETTINGS,
    ...base,
    ...patch,
  }
}
