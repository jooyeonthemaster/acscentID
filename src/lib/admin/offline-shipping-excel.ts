/**
 * 오프라인 택배 접수 → 「배송 약식」 엑셀 변환
 *
 * 매장 QR 폼(/ship)으로 들어온 접수를 택배사 접수/송장 작성에 바로 쓸 수 있는
 * 간단한 표 형식으로 생성한다.
 *   A: 접수일 / B: 접수번호 / C: 받는분 / D: 연락처 / E: 우편번호
 *   F: 주소 / G: 상품 / H: 상태 / I: 관리자 메모
 */

import ExcelJS from 'exceljs'
import {
  OFFLINE_SHIPPING_STATUS_LABELS,
  type OfflineShippingStatus,
} from '@/lib/admin/offline-shipping-filters'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const EXCEL_EPOCH_DAYS = 25569 // 1970-01-01 의 엑셀 serial
const MS_PER_DAY = 86400000

export interface OfflineShippingExcelRequest {
  id: string
  request_number: string
  created_at: string
  name: string
  phone: string
  zip_code?: string | null
  address: string
  address_detail?: string | null
  product_name?: string | null
  memo?: string | null
  status: string
  admin_memo?: string | null
}

/** UTC ISO 문자열 → KST 기준 엑셀 날짜 serial (환경 타임존 의존 제거) */
function toKstDateSerial(iso: string): number {
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return 0
  return Math.floor((ms + KST_OFFSET_MS) / MS_PER_DAY) + EXCEL_EPOCH_DAYS
}

const SHEET_NAME = '배송 약식'
const HEADERS = ['접수일', '접수번호', '받는분', '연락처', '우편번호', '주소', '상품', '상태', '관리자 메모']

/**
 * 접수 목록 → 배송 약식 xlsx 버퍼
 */
export async function buildOfflineShippingWorkbook(
  requests: OfflineShippingExcelRequest[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ACSCENT Admin'
  const sheet = workbook.addWorksheet(SHEET_NAME)

  sheet.columns = [
    { width: 12 }, { width: 16 }, { width: 12 }, { width: 15 }, { width: 9 },
    { width: 44 }, { width: 24 }, { width: 11 }, { width: 24 },
  ]

  // 헤더 행 — 파란 배경 + 흰색 볼드 (매출 엑셀과 동일 스타일)
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
    row.getCell(1).value = toKstDateSerial(request.created_at)
    row.getCell(1).numFmt = 'yyyy.m.d'
    row.getCell(2).value = request.request_number
    row.getCell(3).value = request.name
    row.getCell(4).value = request.phone
    row.getCell(5).value = request.zip_code || ''
    row.getCell(6).value = [request.address, request.address_detail].filter(Boolean).join(' ')
    row.getCell(7).value = request.product_name || ''
    row.getCell(8).value =
      OFFLINE_SHIPPING_STATUS_LABELS[request.status as OfflineShippingStatus] ?? request.status
    row.getCell(9).value = request.admin_memo || ''
    row.commit()
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/** 다운로드 파일명 — 기간 필터가 있으면 기간을 반영 */
export function buildOfflineShippingFileName(dateFrom?: string | null, dateTo?: string | null): string {
  if (dateFrom || dateTo) {
    return `오프라인_택배접수_${dateFrom || '처음'}_${dateTo || '오늘'}.xlsx`
  }
  const nowKst = new Date(Date.now() + KST_OFFSET_MS).toISOString().split('T')[0]
  return `오프라인_택배접수_${nowKst}.xlsx`
}
