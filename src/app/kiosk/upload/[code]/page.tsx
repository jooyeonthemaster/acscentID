import { KioskUploadClient } from './KioskUploadClient'
import { kioskText, isKioskLang } from '@/lib/kiosk/i18n'
import { notoSansJP, notoSansSC, notoSansTC } from '../../fonts'
import './upload.css'

// 키오스크 QR 사진 업로드 — 고객 폰에서 열리는 화면. 검색 노출 금지.
/** 탭 제목도 키오스크가 넘긴 언어로 (폰 브라우저에 그대로 보인다) */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const t = kioskText(isKioskLang(lang) ? lang : 'ko')
  return { title: `${t.upload.pageTitle} | AC'SCENT`, robots: { index: false, follow: false } }
}

export default async function KioskUploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { code } = await params
  const { lang } = await searchParams
  const normalized = decodeURIComponent(code).trim().toUpperCase()
  return (
    // 폰에도 같은 한자권 웹폰트를 실어 준다 — 기기 글꼴에 기대지 않는다
    <div className={`${notoSansJP.variable} ${notoSansSC.variable} ${notoSansTC.variable}`}>
      <KioskUploadClient code={normalized} lang={lang} />
    </div>
  )
}
