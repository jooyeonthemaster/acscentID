import { KioskUploadClient } from './KioskUploadClient'
import './upload.css'

// 키오스크 QR 사진 업로드 — 고객 폰에서 열리는 화면. 검색 노출 금지.
export const metadata = {
  title: "사진 올리기 | AC'SCENT",
  robots: { index: false, follow: false },
}

export default async function KioskUploadPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const normalized = decodeURIComponent(code).trim().toUpperCase()
  return <KioskUploadClient code={normalized} />
}
