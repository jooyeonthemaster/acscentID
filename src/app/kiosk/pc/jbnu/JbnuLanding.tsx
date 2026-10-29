'use client'

// 2026학년도 2학기 JBNU 전공탐색박람회(2026.11.4~5, 전북대 진수당) AI 체험존 — 행사 노트북의 첫 화면.
// 주최 측 요청(10-29): "첫 화면에 박람회 키디자인을 넣고, 세 솔루션이 보이는 데모안". 키디자인 요소(제목·깃발·마스코트·로고)는
// 주최 측이 보낸 현수막 PDF·포스터에서 바탕 남색만 빼 잘라 낸 그림이다(public/assets/kiosk-pc/jbnu).
// 블록을 누르면 그 체험이 ?hub=jbnu 로 열리고, 체험을 마치면 이 화면으로 돌아온다(PcHub.tsx).
// 화면은 체험 화면과 같은 1280×780 기준으로 그리고 창에 맞춰 키운다(usePcFit).

import { useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { ArrowRight, Smartphone } from 'lucide-react'
import { kioskPcHref, type KioskPcProgram } from '@/lib/kiosk/pc'
import { preloadGarmentModel, setGarmentDownloadFast } from '@/lib/kiosk/garment-recolor'
import { usePcFit } from '../usePcFit'
import './jbnu.css'

const ASSET = '/assets/kiosk-pc/jbnu'
const subscribeNever = () => () => {}

const BLOCKS: { slug: KioskPcProgram['slug']; tag: string; name: string; desc: string; chips: string[]; color: string }[] = [
  { slug: 'color', tag: 'COLOR!', name: 'AI 퍼스널 컬러', desc: '사진 한 장으로 나에게 어울리는 색을 찾고, 옷 색을 바꿔 입어 봐요', chips: ['사진 촬영', 'AI 진단'], color: '#272f73' },
  { slug: 'caricature', tag: 'DRAW!', name: 'AI 캐리커처', desc: '내 사진이 유쾌한 캐리커처 그림으로 — 친구와 같이 찍어도 돼요', chips: ['혼자 · 같이', 'AI 그림'], color: '#c0472f' },
  { slug: 'career', tag: 'NEXT!', name: 'AI 미래 직업 탐색', desc: '좋아하는 활동·MBTI·관상으로 탐색해 볼 직업과 첫 도전을 찾아요', chips: ['질문 8개', 'AI 분석'], color: '#1946cd' },
]

export function JbnuLanding() {
  // 서버에서 그린 첫 화면과 맞추려고 창 크기는 브라우저에 붙은 뒤에 잰다
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false)
  const fit = usePcFit(ready)

  // 손님이 고르기 전에 퍼스널 컬러의 옷 색 미리보기 파일을 받아 둔다(다 받은 파일은 브라우저 보관함에 남아 체험 화면이 바로 쓴다)
  useEffect(() => {
    setGarmentDownloadFast(true)
    const timer = window.setTimeout(preloadGarmentModel, 1500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="jb-root" style={fit} data-ready={ready || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="jb-flags" data-side="left" src={`${ASSET}/flags-left.webp`} alt="" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="jb-flags" data-side="right" src={`${ASSET}/flags-right.webp`} alt="" draggable={false} />

      <header className="jb-head">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSET}/title.webp`} alt="2026학년도 2학기 JBNU 전공탐색 박람회" draggable={false} />
        </h1>
        <p className="jb-when">
          <b>일시</b><span>26.11.04.(수) ~ 05.(목) 10시~17시</span>
          <i aria-hidden="true" />
          <b>장소</b><span>전북대학교 진수당</span>
        </p>
      </header>

      <section className="jb-zone" aria-labelledby="jb-zone-title">
        <div className="jb-zone-head">
          <h2 id="jb-zone-title"><span aria-hidden="true">✦</span>AI 체험존</h2>
          <p>체험할 프로그램을 골라 주세요</p>
        </div>
        <ul className="jb-cards">
          {BLOCKS.map((block, i) => (
            <li key={block.slug} style={{ '--c': block.color, '--i': i } as CSSProperties}>
              <a className="jb-card" href={kioskPcHref(block.slug, 'jbnu')}>
                <span className="jb-shot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ASSET}/screen-${block.slug}.webp`} alt="" draggable={false} />
                </span>
                <span className="jb-body">
                  <em>{block.tag}</em>
                  <b>{block.name}</b>
                  <span className="jb-desc">{block.desc}</span>
                  <span className="jb-chips">
                    {block.chips.map((chip) => <span key={chip}>{chip}</span>)}
                    <span>QR 저장</span>
                  </span>
                </span>
                <span className="jb-go">체험하기<ArrowRight size={22} strokeWidth={2.4} aria-hidden="true" /></span>
              </a>
            </li>
          ))}
        </ul>
        <p className="jb-note"><Smartphone size={18} strokeWidth={2} aria-hidden="true" />결과는 화면에 뜨는 QR을 휴대폰으로 찍어 저장할 수 있어요</p>
      </section>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="jb-mascot" data-side="left" src={`${ASSET}/mascot-girl.webp`} alt="" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="jb-mascot" data-side="right" src={`${ASSET}/mascot-boy.webp`} alt="" draggable={false} />

      <footer className="jb-foot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET}/logo-glocal.webp`} alt="글로컬대학사업" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET}/logo-jbnu.webp`} alt="전북대학교 학생취업진로처 취업진로지원과" draggable={false} />
      </footer>
    </main>
  )
}
