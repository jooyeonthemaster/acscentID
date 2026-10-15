// 프로그램마다 다른 제목 글꼴 — next/font 로 빌드 때 받아 우리 도메인에서 내보낸다(행사장 인터넷이 약해도 첫 화면에 바로).
// 캔버스(인화 디자인·영상)도 같은 글꼴을 쓴다: family 이름은 .style.fontFamily
import { Anton, Bagel_Fat_One, Black_Han_Sans, Gowun_Batang, Nanum_Pen_Script, Playfair_Display } from 'next/font/google'

export const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--pg-f-anton' })
export const playfair = Playfair_Display({ weight: ['700', '900'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', variable: '--pg-f-playfair' })
export const bagel = Bagel_Fat_One({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--pg-f-bagel' })
export const blackHan = Black_Han_Sans({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--pg-f-blackhan' })
export const gowun = Gowun_Batang({ weight: ['400', '700'], subsets: ['latin'], display: 'swap', preload: false, variable: '--pg-f-gowun' })
export const pen = Nanum_Pen_Script({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--pg-f-pen' })

export const FONT_VARS = [anton, playfair, bagel, blackHan, gowun, pen].map((f) => f.variable).join(' ')

/** 캔버스에 쓰기 전에 글꼴을 받아 둔다 */
export async function loadCanvasFonts(): Promise<void> {
  const specs = [
    `40px ${anton.style.fontFamily}`, `900 40px ${playfair.style.fontFamily}`, `italic 900 40px ${playfair.style.fontFamily}`,
    `40px ${bagel.style.fontFamily}`, `40px ${blackHan.style.fontFamily}`, `700 40px ${gowun.style.fontFamily}`, `40px ${pen.style.fontFamily}`,
  ]
  await Promise.all(specs.map((s) => document.fonts.load(s, 'A가!').catch(() => undefined)))
}
