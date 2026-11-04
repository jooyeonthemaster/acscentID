/**
 * 오프라인 결제 증빙 접수 → 엑셀 변환
 *
 * 손님 폼(/proof)으로 들어온 접수를 입금 처리(대량이체 작성 등)에 바로 쓸 수 있는 표로 만든다.
 *   A: 접수일시 / B: 접수번호 / C: 이름(예금주) / D: 연락처 / E: 은행 / F: 계좌번호
 *   G: 환불 금액 / H: 환불 방식 / I: 구매 상품 / J: 결제일 / K: 결제금액
 *   L: 증빙 사진 / M: 상태 / N: 관리자 메모
 * 계좌번호는 앞자리 0이 사라지지 않도록 텍스트 셀로 넣는다.
 * 환불 금액을 아직 정하지 않은 접수는 G 칸이 비어 있다.
 */

import ExcelJS from 'exceljs'
import {
  OFFLINE_PROOF_STATUS_LABELS,
  type OfflineProofStatus,
} from '@/lib/admin/offline-proof-filters'
import {
  REFUND_TYPE_LABELS,
  formatItems,
  type OfflineProofItem,
  type RefundType,
} from '@/lib/offline-proof'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const EXCEL_EPOCH_DAYS = 25569 // 1970-01-01 의 엑셀 serial
const MS_PER_DAY = 86400000

export interface OfflineProofExcelRequest {
  id: string
  request_number: string
  created_at: string
  name: string
  phone: string
  bank_name: string
  account_number: string
  payment_date: string
  payment_amount: number
  items?: OfflineProofItem[] | null
  refund_type?: string | null
  refund_amount?: number | null
  image_paths: string[] | null
  status: string
  admin_memo?: string | null
}

/** UTC ISO 문자열 → KST 기준 엑셀 날짜·시각 serial (환경 타임존 의존 제거) */
function toKstDateTimeSerial(iso: string): number {
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return 0
  return (ms + KST_OFFSET_MS) / MS_PER_DAY + EXCEL_EPOCH_DAYS
}

/** 'YYYY-MM-DD'(DATE 컬럼) → 엑셀 날짜 serial */
function toDateSerial(date: string): number | string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!match) return date
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / MS_PER_DAY + EXCEL_EPOCH_DAYS
}

const SHEET_NAME = '결제 증빙'
const HEADERS = [
  '접수일시', '접수번호', '이름(예금주)', '연락처', '은행', '계좌번호',
  '환불 금액', '환불 방식', '구매 상품', '결제일', '결제금액',
  '증빙 사진', '상태', '관리자 메모',
]

/**
 * 접수 목록 → xlsx 버퍼
 */
export async function buildOfflineProofWorkbook(
  requests: OfflineProofExcelRequest[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ACSCENT Admin'
  const sheet = workbook.addWorksheet(SHEET_NAME, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { width: 17 }, { width: 16 }, { width: 13 }, { width: 15 }, { width: 14 }, { width: 20 },
    { width: 13 }, { width: 10 }, { width: 30 }, { width: 12 }, { width: 13 },
    { width: 10 }, { width: 10 }, { width: 28 },
  ]

  // 헤더 행 — 파란 배경 + 흰색 볼드 (택배 접수·매출 엑셀과 동일 스타일)
  const headerRow = sheet.getRow(1)
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

  requests.forEach((request, index) => {
    const row = sheet.getRow(2 + index)
    row.getCell(1).value = toKstDateTimeSerial(request.created_at)
    row.getCell(1).numFmt = 'yyyy.m.d hh:mm'
    row.getCell(2).value = request.request_number
    row.getCell(3).value = request.name
    row.getCell(4).value = request.phone
    row.getCell(5).value = request.bank_name
    row.getCell(6).value = request.account_number
    row.getCell(6).numFmt = '@'
    if (request.refund_amount !== null && request.refund_amount !== undefined) {
      row.getCell(7).value = request.refund_amount
      row.getCell(7).numFmt = '#,##0'
    }
    row.getCell(8).value = request.refund_type
      ? REFUND_TYPE_LABELS[request.refund_type as RefundType] ?? request.refund_type
      : '미정'
    row.getCell(9).value = formatItems(request.items || [])
    row.getCell(10).value = toDateSerial(request.payment_date)
    row.getCell(10).numFmt = 'yyyy.m.d'
    row.getCell(11).value = request.payment_amount
    row.getCell(11).numFmt = '#,##0'
    row.getCell(12).value = `${request.image_paths?.length ?? 0}장`
    row.getCell(13).value =
      OFFLINE_PROOF_STATUS_LABELS[request.status as OfflineProofStatus] ?? request.status
    row.getCell(14).value = request.admin_memo || ''
    row.commit()
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/** 다운로드 파일명 — 기간 필터가 있으면 기간을 반영 */
export function buildOfflineProofFileName(dateFrom?: string | null, dateTo?: string | null): string {
  if (dateFrom || dateTo) {
    return `오프라인_결제증빙_${dateFrom || '처음'}_${dateTo || '오늘'}.xlsx`
  }
  const nowKst = new Date(Date.now() + KST_OFFSET_MS).toISOString().split('T')[0]
  return `오프라인_결제증빙_${nowKst}.xlsx`
}
