import { BoothUploadClient } from './BoothUploadClient'

// 포토부스 고객 폰 업로드 페이지 — 부스 QR 경유, 검색 노출 금지
export const metadata = {
  title: "사진 올리기 | AC'SCENT PHOTO",
  robots: { index: false, follow: false },
}

export default async function BoothUploadPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const normalized = decodeURIComponent(code).trim().toUpperCase()
  return <BoothUploadClient code={normalized} />
}
