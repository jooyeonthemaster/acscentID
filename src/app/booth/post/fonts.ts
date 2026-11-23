// POST! 우체통 글꼴 — 손글씨(편지) · 굵은 제목(그림엽서 지명) · 명조(우표 액면) · 영문 필기체(Greetings from)
// next/font 로 빌드 때 받아 우리 도메인에서 내보낸다(행사장 인터넷이 약해도 바로).
import { Yesteryear } from 'next/font/google'
export { blackHan, gowun, pen } from '../programs/fonts'

export const yesteryear = Yesteryear({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--pc-f-script' })
