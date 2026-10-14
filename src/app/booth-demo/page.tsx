import type { Metadata } from 'next'
import { ArrowDown, ArrowUpRight, Camera, Languages, Printer, QrCode, Sparkles, WandSparkles } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { BOOTH_DEMOS, BOOTH_DEMO_NEEDS, boothDemoHref, type BoothDemo } from '@/lib/booth/demo'
import './booth-demo.css'

// 영업용 포토부스 데모 랜딩 — 키오스크 데모(/kiosk-demo)와 같은 방식. 고른 프로그램을 /booth?mode=…&demo=1 로 새 창에 연다:
// 매장 기기 설정을 건드리지 않고, 이용권·촬영 기록·관리자 창 없이, 화면에 NEANDER 워터마크(BoothWatermark).
// AI 아이돌 사진은 진짜로 만든다(1분 3장·하루 40장 상한 — src/lib/booth/demo-server.ts).
// 로케일 라우팅 밖(middleware.ts), 검색 노출 금지 — 링크를 받은 사람만 본다. 설명: docs/photobooth-demo.md
export const metadata: Metadata = {
  title: 'NEANDER 포토부스 데모',
  description: 'AI 아이돌 사진과 매장 포토부스 프로그램을 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

const GROUPS: { id: BoothDemo['group']; title: string; note: string }[] = [
  { id: 'idol', title: 'AI 아이돌 포토', note: '한 컷을 찍으면 내 얼굴 그대로 K-POP 아이돌 컨셉 사진을 만들어 4×6으로 인화합니다' },
  { id: 'store', title: '매장 포토부스', note: '최애와 함께 찍고, 포토카드와 합성하고, 네 컷으로 남기는 생일카페 · 팬 이벤트용 프로그램' },
]
const FEATURES = [
  { Icon: WandSparkles, title: 'AI 아이돌 사진', text: '얼굴은 그대로 두고 조명 · 메이크업 · 의상 · 무대만 바꿔 컨셉 사진을 만듭니다. 남녀 · 단체(3명)도 됩니다.' },
  { Icon: Printer, title: '4×6 즉석 인화', text: '승화형 포토 프린터로 무테 인화. 디자인 4종을 고르면 그대로 뽑힙니다.' },
  { Icon: QrCode, title: '휴대폰으로 받기', text: '인화물 오른쪽 아래 QR을 찍으면 7일 동안 원본 사진을 휴대폰에 저장할 수 있습니다.' },
  { Icon: Camera, title: 'DSLR 연결', text: '캐논 DSLR을 USB로 연결해 라이브뷰와 고화질 촬영을 씁니다. 없으면 웹캠으로 동작합니다.' },
  { Icon: Languages, title: '5개 언어', text: '한국어 · English · 日本語 · 简体中文 · 繁體中文 — 화면 오른쪽 위에서 바꿉니다.' },
  { Icon: Sparkles, title: '행사 맞춤', text: '첫 화면 문구와 배경, 인화물 행사 표기, 프레임을 행사에 맞춰 바꿀 수 있습니다.' },
]
const NOTES = [
  '카메라를 쓰는 프로그램은 브라우저가 권한을 물을 때 허용해 주세요. 부스 화면은 가로 모니터(1280×720 이상) 기준입니다.',
  'AI 아이돌 사진은 찍은 뒤 20~40초쯤 걸립니다. 데모는 하루 이용 횟수가 정해져 있어, 넘으면 찍은 사진으로 인화 디자인만 보여 드립니다.',
  '인쇄는 프린터가 달린 실제 부스에서 바로 나옵니다. 브라우저에서는 인쇄 미리보기로 보여 드립니다.',
  '포카 · 직찍 합성은 화면의 QR을 휴대폰으로 찍어 사진을 올립니다.',
  '데모 화면에는 NEANDER 워터마크가 표시됩니다. 실제 매장 부스와 인화물에는 표시되지 않습니다.',
]
/** 머리말의 부스 화면 — 3초마다 바뀐다(칸 수는 booth-demo.css 의 15초 순환에 맞춘다) */
const HERO = ['idol-home', 'screen-template', 'screen-together', 'screen-solo', 'screen-card']
const HERO_CAPTION: Record<string, { tag: string; name: string; color: string }> = {
  'idol-home': { tag: 'AI IDOL', name: '아이돌 컨셉 고르기', color: '#7a4fd0' },
  'screen-template': { tag: 'WITH BIAS', name: '최애와 찍기', color: '#d0507a' },
  'screen-together': { tag: 'PHOTOCARD', name: '포카 · 직찍 합성', color: '#3b6fd8' },
  'screen-solo': { tag: '1 CUT · 4 CUTS', name: '일반 촬영', color: '#2f8a5a' },
  'screen-card': { tag: 'CARD SCAN', name: '포토카드 QR', color: '#b5762a' },
}

/** 부스를 정면에서 본 모양 — 가로 모니터 위에 DSLR. 그림 파일 없이 코드로 그린다(booth-demo.css 의 .bd-booth) */
function Booth({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`bd-booth${className ? ` ${className}` : ''}`}>
      <span className="bd-booth-cam" aria-hidden="true"><i /></span>
      <span className="bd-booth-body">
        <span className="bd-booth-screen">{children}</span>
      </span>
      <span className="bd-booth-stand" aria-hidden="true" />
    </span>
  )
}

/** 4×6 인화물 — 흰 테두리 없이 사진 한 장(무테) */
function Print({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="bd-print">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={600} height={900} loading="lazy" decoding="async" />
    </span>
  )
}

export default function BoothDemoPage() {
  return (
    <div className="bd">
      <header className="bd-top">
        <span className="bd-brand">NEANDER</span>
        <span className="bd-pill">PHOTOBOOTH DEMO</span>
      </header>

      <main>
        <section className="bd-hero">
          <div className="bd-hero-copy">
            <p className="bd-eyebrow">가로형 터치 포토부스 · DSLR · 4×6 인화</p>
            <h1>찍으면 바로,<br />아이돌 화보 한 장</h1>
            <p className="bd-lead">매장과 행사장에서 그대로 도는 포토부스 프로그램입니다. AI 아이돌 사진부터 최애와 함께 찍는 생일카페 촬영까지, 아래에서 골라 직접 눌러 보세요.</p>
            <a className="bd-button" href="#demos">데모 고르기<ArrowDown size={20} strokeWidth={2.2} aria-hidden="true" /></a>
          </div>
          <figure className="bd-hero-stage" aria-label="매장 포토부스 화면이 프로그램마다 바뀌며 도는 모습과 인화물">
            <Booth className="bd-booth--hero">
              <span className="bd-cycle" aria-hidden="true">
                {HERO.map((name, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={name} src={`/assets/booth-demo/${name}.webp`} alt="" width={960} height={540} decoding="async" fetchPriority={i ? 'low' : 'high'} style={{ '--i': i } as CSSProperties} />
                ))}
              </span>
            </Booth>
            <span className="bd-hero-print" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/booth-demo/print-ending-fairy.webp" alt="" width={600} height={900} decoding="async" />
            </span>
            <figcaption className="bd-now" aria-hidden="true">
              {HERO.map((name, i) => {
                const c = HERO_CAPTION[name]
                return <span key={name} style={{ '--i': i, '--bd-tone': c.color } as CSSProperties}><b>{c.tag}</b>{c.name}</span>
              })}
            </figcaption>
          </figure>
        </section>

        <div id="demos" className="bd-demos">
          {GROUPS.map((group) => {
            const demos = BOOTH_DEMOS.filter((demo) => demo.group === group.id)
            return (
              <section key={group.id} className="bd-group" aria-labelledby={`bd-${group.id}`}>
                <div className="bd-group-head">
                  <h2 id={`bd-${group.id}`}>{group.title}<span>{demos.length}</span></h2>
                  <p>{group.note}</p>
                </div>
                <ul className={`bd-grid${group.id === 'idol' ? ' bd-grid--print' : ''}`}>
                  {demos.map((demo) => (
                    <li key={demo.id}>
                      <a className="bd-card" href={boothDemoHref(demo)} target="_blank" rel="noopener" style={{ '--bd-tone': demo.color } as CSSProperties}>
                        {demo.print ? (
                          <Print src={demo.image} alt={`${demo.name} 인화물 견본`} />
                        ) : (
                          <Booth>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={demo.image} alt={`${demo.name} 화면`} width={960} height={540} loading="lazy" decoding="async" />
                          </Booth>
                        )}
                        <span className="bd-card-body">
                          <span className="bd-tag">{demo.tag}</span>
                          <b>{demo.name}</b>
                          <span className="bd-desc">{demo.desc}</span>
                          <span className="bd-needs">{demo.needs.map((need) => <i key={need}>{BOOTH_DEMO_NEEDS[need]}</i>)}</span>
                          <span className="bd-open">데모 열기<ArrowUpRight size={18} strokeWidth={2.2} aria-hidden="true" /></span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <section className="bd-features" aria-labelledby="bd-common">
          <h2 id="bd-common">포토부스가 갖춘 기능</h2>
          <ul>
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title}>
                <Icon size={26} strokeWidth={1.7} aria-hidden="true" />
                <b>{title}</b>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bd-notes" aria-labelledby="bd-notes">
          <h2 id="bd-notes">데모 이용 안내</h2>
          <ul>{NOTES.map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
      </main>

      <footer className="bd-foot">
        <b>주식회사 네안데르</b>
        <a href="tel:02-336-3368">Tel. 02-336-3368</a>
        <a href="tel:010-8507-5121">Mobile. 010-8507-5121</a>
        <span>neander@neander.co.kr</span>
      </footer>
    </div>
  )
}
