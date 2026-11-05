// 프로그램마다 다른 제목 글꼴 — next/font 로 빌드 때 받아 우리 도메인에서 내보낸다(행사장 인터넷이 약해도 첫 화면에 바로).
// 캔버스(인화 디자인·영상)도 같은 글꼴을 쓴다: family 이름은 .style.fontFamily
// ANSAN(2026 안산사이언스밸리 과학축제)은 공식 웹사이트와 같은 글꼴 — Bricolage Grotesque(영문 디스플레이) · JetBrains Mono(라벨),
// 사이트가 쓰는 원본 파일 그대로(asv-fonts/, SIL OFL 1.1 — 같은 폴더의 OFL-*.txt). 한글은 Pretendard(programs.css @font-face).
import { Anton, Bagel_Fat_One, Black_Han_Sans, Gowun_Batang, Nanum_Pen_Script, Playfair_Display } from 'next/font/google'
import localFont from 'next/font/local'

export const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--pg-f-anton' })
export const playfair = Playfair_Display({ weight: ['700', '900'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', variable: '--pg-f-playfair' })
export const bagel = Bagel_Fat_One({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--pg-f-bagel' })
export const blackHan = Black_Han_Sans({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--pg-f-blackhan' })
export const gowun = Gowun_Batang({ weight: ['400', '700'], subsets: ['latin'], display: 'swap', preload: false, variable: '--pg-f-gowun' })
export const pen = Nanum_Pen_Script({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--pg-f-pen' })
/** 영문 디스플레이(가변 — 굵기 200~800, 폭 75~100%: 캔버스는 fontStretch 'condensed' 로 좁은 폭) */
export const bricolage = localFont({
  src: './asv-fonts/BricolageGrotesque-latin.woff2', weight: '200 800', style: 'normal', display: 'swap', variable: '--pg-f-bricolage',
  declarations: [{ prop: 'font-stretch', value: '75% 100%' }],
})
export const jetbrains = localFont({ src: './asv-fonts/JetBrainsMono-latin.woff2', weight: '400 700', style: 'normal', display: 'swap', variable: '--pg-f-mono' })

export const FONT_VARS = [anton, playfair, bagel, blackHan, gowun, pen, bricolage, jetbrains].map((f) => f.variable).join(' ')

/** 캔버스에 쓰기 전에 글꼴을 받아 둔다 */
export async function loadCanvasFonts(): Promise<void> {
  const specs = [
    `40px ${anton.style.fontFamily}`, `900 40px ${playfair.style.fontFamily}`, `italic 900 40px ${playfair.style.fontFamily}`,
    `40px ${bagel.style.fontFamily}`, `40px ${blackHan.style.fontFamily}`, `700 40px ${gowun.style.fontFamily}`, `40px ${pen.style.fontFamily}`,
    `800 40px ${bricolage.style.fontFamily}`, `500 40px ${jetbrains.style.fontFamily}`, '800 40px Pretendard', '600 40px Pretendard',
  ]
  await Promise.all(specs.map((s) => document.fonts.load(s, 'A가!').catch(() => undefined)))
}
