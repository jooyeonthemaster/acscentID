'use client'

// POST! 우체통 — 엽서 한 장(4×6 세로, 1200×1800 = 인화 크기 그대로).
// 위: 그림엽서(큰 사진 + 「Greetings from ○○」) / 아래: 엽서 뒷면(손글씨 편지 · 얼굴 우표 · 소인 · 받는 사람 · QR)
// 화면에서는 scale 로 줄여 보이고, 인화 · 배달용 JPEG 는 이 요소를 그대로 떠서 만든다(modern-screenshot).
import { forwardRef, type CSSProperties } from 'react'
import { blackHan, gowun, pen, yesteryear } from './fonts'

export interface PostcardData {
  photo: string | null
  stamp: string | null
  capScript: string
  capBig: string
  toLine: string
  letter: string[]
  fromLine: string
  quote?: string
  stampValue: string
  pmTop: string
  pmBottom: string
  pmDate: string
  pmTime: string
  toShort: string
  fromShort: string
  zip: string
  qr: string | null
  qrText: string
  accent: string
  /** 편지 칸이 손글씨로 써지는 중(글자 수) — 화면 연출용, 인화본은 비움 */
  typed?: number
}

export const CARD_W = 1200
export const CARD_H = 1800

export const Postcard = forwardRef<HTMLDivElement, { data: PostcardData; scale?: number; style?: CSSProperties; className?: string }>(
  function Postcard({ data: d, scale = 1, style, className }, ref) {
    // 편지 글자 크기: 줄 수 · 가장 긴 줄에 맞춰
    const longest = Math.max(1, ...d.letter.map((l) => l.length))
    const size = Math.min(60, Math.floor(640 / (longest * 0.62)), d.letter.length > 4 ? 52 : 60)
    const typed = d.typed ?? Infinity
    const starts = d.letter.map((_, i) => d.letter.slice(0, i).join('').length)
    const shown = d.letter.map((line, i) => line.slice(0, Math.max(0, Math.min(line.length, typed - starts[i]))))
    return (
      <div className={`pc-wrap ${className ?? ''}`} style={{ width: CARD_W * scale, height: CARD_H * scale, ...style }}>
        <div
          ref={ref}
          className={`pc ${pen.variable} ${blackHan.variable} ${gowun.variable} ${yesteryear.variable}`}
          style={{ transform: `scale(${scale})`, ['--pc-accent' as string]: d.accent } as CSSProperties}
        >
          <div className="pc-pic" style={{ backgroundImage: d.photo ? `url(${d.photo})` : undefined }}>
            {!d.photo && <div className="pc-pic-empty">사진 자리</div>}
            <div className="pc-cap">
              <div className="pc-cap-s">{d.capScript}</div>
              <div className="pc-cap-b">{d.capBig}</div>
            </div>
          </div>
          <div className="pc-cut" />
          <div className="pc-tag">POST CARD</div>
          <div className="pc-back">
            <div className="pc-left">
              <div className="pc-to">{d.toLine}</div>
              {Array.from({ length: Math.max(4, d.letter.length) }, (_, i) => (
                <div key={i} className="pc-ln" style={{ fontSize: size }}>{shown[i] ?? ''}</div>
              ))}
              <div className="pc-from">{d.fromLine}</div>
              {d.quote && <div className="pc-quote">{d.quote}</div>}
            </div>
            <div className="pc-right">
              <div className="pc-stamp">
                <div className="pc-stamp-in" style={{ backgroundImage: d.stamp ? `url(${d.stamp})` : undefined }}>
                  <div className="pc-stamp-v">{d.stampValue}</div>
                  <div className="pc-stamp-n">POST! {d.pmDate.slice(0, 4)}</div>
                </div>
              </div>
              <svg className="pc-pm" viewBox="0 0 230 230" aria-hidden="true">
                <defs>
                  <path id="pc-arc" d="M 30 115 A 85 85 0 0 1 200 115" />
                  <path id="pc-arc2" d="M 36 120 A 79 79 0 0 0 194 120" />
                </defs>
                <circle cx="115" cy="115" r="104" fill="none" stroke="#1d2540" strokeWidth="5" />
                <circle cx="115" cy="115" r="64" fill="none" stroke="#1d2540" strokeWidth="3" />
                <text fontFamily="Pretendard" fontWeight="800" fontSize="25" fill="#1d2540" letterSpacing="3">
                  <textPath href="#pc-arc" startOffset="50%" textAnchor="middle">{d.pmTop}</textPath>
                </text>
                <text fontFamily="Pretendard" fontWeight="700" fontSize="21" fill="#1d2540" letterSpacing="2">
                  <textPath href="#pc-arc2" startOffset="50%" textAnchor="middle" dominantBaseline="hanging">{d.pmBottom}</textPath>
                </text>
                <text x="115" y="108" textAnchor="middle" fontFamily="Pretendard" fontWeight="900" fontSize="30" fill="#1d2540">{d.pmDate}</text>
                <text x="115" y="140" textAnchor="middle" fontFamily="Pretendard" fontWeight="700" fontSize="24" fill="#1d2540">{d.pmTime}</text>
              </svg>
              <div className="pc-addr">
                <div className="pc-row"><span className="pc-lbl">받는 사람</span><span className="pc-val">{d.toShort}</span></div>
                <div className="pc-row"><span className="pc-lbl">보내는 사람</span><span className="pc-val">{d.fromShort}</span></div>
                <div className="pc-zip">{d.zip.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
              </div>
              {d.qr && (
                <div className="pc-qr">
                  <div className="pc-qr-t">{d.qrText.split('\n').map((t, i) => <div key={i}>{t}</div>)}</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.qr} alt="" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  },
)
