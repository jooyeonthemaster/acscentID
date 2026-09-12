/**
 * 관리자 주문 → 「페이히어 온라인 매출 데이터」 엑셀 변환
 *
 * 원가계산 워크북의 `입력_페이히어_온라인` 시트에 그대로 붙여넣을 수 있는 형식으로 생성한다.
 *   A: 결제일 / B: 결제시간 / C: 결제 내역 / D: 합계(단가) / E: 수량 / F: 금액
 *   G: 배송상태 / H: 비고
 *
 * 금액 규칙 — 주문 단위 할인(쿠폰)은 품목 소계 비율대로 배분하고 잔여분은 마지막 행에 몰아
 * `Σ금액 === orders.final_price` 가 항상 성립하도록 한다. 배송비는 별도 행으로 분리한다.
 */

import ExcelJS from 'exceljs'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const EXCEL_EPOCH_DAYS = 25569 // 1970-01-01 의 엑셀 serial
const MS_PER_DAY = 86400000

export interface SalesExcelOrderItem {
  product_type?: string | null
  perfume_name?: string | null
  size?: string | null
  unit_price?: number | null
  quantity?: number | null
  subtotal?: number | null
}

export interface SalesExcelOrder {
  id: string
  order_number: string
  created_at: string
  status: string
  size?: string | null
  product_type?: string | null
  price?: number | null
  shipping_fee?: number | null
  discount_amount?: number | null
  final_price?: number | null
  item_count?: number | null
  recipient_name?: string | null
  is_influencer?: boolean | null
  refund_amount?: number | null
  order_items?: SalesExcelOrderItem[] | null
}

export interface SalesExcelRow {
  /** 엑셀 날짜 serial (KST 기준 자정) */
  dateSerial: number
  /** 엑셀 시간 serial (0~1 소수) */
  timeSerial: number
  description: string
  unitPrice: number
  quantity: number
  amount: number
  shippingStatus: string
  note: string
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: '결제 진행중',
  pending: '입금대기',
  paid: '입금완료',
  preparing: '상품준비중',
  shipping: '배송중',
  delivered: '배송완료',
  cancel_requested: '취소요청',
  cancelled: '취소완료',
}

/** 결제 내역 라벨 — 스크린샷 형식(10ml / 50ml / 시향지)에 맞춘 용량 표기 */
function formatDescription(productType: string | null | undefined, size: string | null | undefined): string {
  if (productType === 'image_analysis_paper') return '시향지'
  if (size === 'scent_paper') return productType === 'chemistry_set' ? '시향지 2매' : '시향지'
  if (size === 'clicker') return '디퓨저 클리커'
  if (size === 'set') return '세트'
  return size || '기타'
}

/** UTC ISO 문자열 → KST 기준 엑셀 날짜/시간 serial (타임존 변환을 직접 계산해 환경 의존 제거) */
function toKstSerials(iso: string): { dateSerial: number; timeSerial: number } {
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return { dateSerial: 0, timeSerial: 0 }
  const kstMs = ms + KST_OFFSET_MS
  const days = Math.floor(kstMs / MS_PER_DAY)
  const msOfDay = kstMs - days * MS_PER_DAY
  return {
    dateSerial: days + EXCEL_EPOCH_DAYS,
    timeSerial: msOfDay / MS_PER_DAY,
  }
}

/** 주문 1건 → 매출 행 배열 (품목별 1행 + 배송비 1행) */
export function buildSalesRows(order: SalesExcelOrder): SalesExcelRow[] {
  const { dateSerial, timeSerial } = toKstSerials(order.created_at)
  const shippingStatus = ORDER_STATUS_LABELS[order.status] ?? order.status

  const noteParts: string[] = [order.order_number]
  if (order.is_influencer) noteParts.push('인플루언서')
  if ((order.refund_amount ?? 0) > 0) noteParts.push(`환불 ${(order.refund_amount ?? 0).toLocaleString()}원`)
  const note = noteParts.join(' · ')

  // 품목 소스 — order_items 가 없으면 주문 헤더로 단일 품목을 합성
  const items: SalesExcelOrderItem[] = order.order_items && order.order_items.length > 0
    ? order.order_items
    : [{
        product_type: order.product_type,
        size: order.size,
        quantity: order.item_count || 1,
        subtotal: order.price ?? 0,
        unit_price: Math.round((order.price ?? 0) / Math.max(order.item_count || 1, 1)),
      }]

  const grossList = items.map(item => {
    const qty = Math.max(item.quantity ?? 1, 1)
    return item.subtotal ?? (item.unit_price ?? 0) * qty
  })
  const gross = grossList.reduce((sum, v) => sum + v, 0)
  const discount = order.discount_amount ?? 0

  // 할인 비율 배분 — 반올림 잔여분은 마지막 품목이 흡수
  let allocated = 0
  const rows: SalesExcelRow[] = items.map((item, index) => {
    const qty = Math.max(item.quantity ?? 1, 1)
    const isLast = index === items.length - 1
    const share = gross > 0
      ? (isLast ? discount - allocated : Math.round((discount * grossList[index]) / gross))
      : (isLast ? discount - allocated : 0)
    allocated += share
    const amount = grossList[index] - share

    return {
      dateSerial,
      timeSerial,
      description: formatDescription(item.product_type ?? order.product_type, item.size),
      unitPrice: qty > 0 ? Math.round(amount / qty) : amount,
      quantity: qty,
      amount,
      shippingStatus,
      note,
    }
  })

  const shippingFee = order.shipping_fee ?? 0
  if (shippingFee > 0) {
    rows.push({
      dateSerial,
      timeSerial,
      description: '배송비',
      unitPrice: shippingFee,
      quantity: 1,
      amount: shippingFee,
      shippingStatus,
      note,
    })
  }

  return rows
}

const SHEET_NAME = '입력_페이히어_온라인'
const HEADERS = ['결제일', '결제시간', '결제 내역', '합계', '수량', '금액', '배송상태', '비고']
const HEADER_ROW = 6
const FIRST_DATA_ROW = 7

/**
 * 매출 행 배열 → 스크린샷과 동일한 레이아웃의 xlsx 버퍼
 */
export async function buildSalesWorkbook(rows: SalesExcelRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ACSCENT Admin'
  const sheet = workbook.addWorksheet(SHEET_NAME)

  sheet.columns = [
    { width: 13 }, { width: 12 }, { width: 26 }, { width: 13 },
    { width: 9 }, { width: 13 }, { width: 14 }, { width: 28 },
  ]

  // 안내 헤더 (1~5행)
  const title = sheet.getCell('A1')
  title.value = '[ 페이히어 온라인 매출 데이터 ]'
  title.font = { bold: true, size: 14 }

  sheet.getCell('A2').value = '※ 온라인 주문 데이터를 복사하여 아래에 붙여넣기'

  const guide = sheet.getCell('A5')
  guide.value = '▼ 여기부터 붙여넣기 (헤더 포함) ▼'
  guide.font = { bold: true }

  const lastDataRow = FIRST_DATA_ROW + rows.length - 1
  const totalCell = sheet.getCell('F5')
  if (rows.length > 0) {
    totalCell.value = {
      formula: `SUM(F${FIRST_DATA_ROW}:F${lastDataRow})`,
      result: rows.reduce((sum, r) => sum + r.amount, 0),
    }
  } else {
    totalCell.value = 0
  }
  totalCell.numFmt = '#,##0'
  totalCell.font = { bold: true }

  // 헤더 행 (6행) — 파란 배경 + 흰색 볼드
  const headerRow = sheet.getRow(HEADER_ROW)
  HEADERS.forEach((label, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = label
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2F528F' } },
      bottom: { style: 'thin', color: { argb: 'FF2F528F' } },
      left: { style: 'thin', color: { argb: 'FF2F528F' } },
      right: { style: 'thin', color: { argb: 'FF2F528F' } },
    }
  })
  headerRow.commit()

  // 데이터 행
  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(FIRST_DATA_ROW + index)
    excelRow.getCell(1).value = row.dateSerial
    excelRow.getCell(1).numFmt = 'yyyy.m.d'
    excelRow.getCell(2).value = row.timeSerial
    excelRow.getCell(2).numFmt = 'h:mm'
    excelRow.getCell(3).value = row.description
    excelRow.getCell(4).value = row.unitPrice
    excelRow.getCell(4).numFmt = '#,##0'
    excelRow.getCell(5).value = row.quantity
    excelRow.getCell(6).value = row.amount
    excelRow.getCell(6).numFmt = '#,##0'
    excelRow.getCell(7).value = row.shippingStatus
    excelRow.getCell(8).value = row.note
    excelRow.commit()
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/** 다운로드 파일명 — 기간 필터가 있으면 기간을 반영 */
export function buildSalesFileName(dateFrom?: string | null, dateTo?: string | null): string {
  if (dateFrom || dateTo) {
    return `페이히어_온라인_매출_${dateFrom || '처음'}_${dateTo || '오늘'}.xlsx`
  }
  const nowKst = new Date(Date.now() + KST_OFFSET_MS).toISOString().split('T')[0]
  return `페이히어_온라인_매출_${nowKst}.xlsx`
}
