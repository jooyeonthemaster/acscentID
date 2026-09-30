import { BoothUploadClient } from './BoothUploadClient'
import { parseBoothLang } from '@/lib/booth/i18n'

// 포토부스 고객 폰 업로드 페이지 — 부스 QR 경유, 검색 노출 금지
export const metadata = {
  title: "사진 올리기 | AC'SCENT PHOTO",
  robots: { index: false, follow: false },
}

export default async function BoothUploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  /** ?lang= — 부스 화면 언어(부스가 QR 주소에 붙인다, 없으면 한국어) */
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const { code } = await params
  const lang = parseBoothLang((await searchParams).lang)
  const normalized = decodeURIComponent(code).trim().toUpperCase()
  return <BoothUploadClient code={normalized} lang={lang} />
}
