import type { Metadata } from 'next'
import { ArrowDown, ArrowUpRight, Camera, Clapperboard, Languages, Printer, QrCode, Sparkles, WandSparkles } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { DemoWatermarkUnlock } from '@/components/demo/DemoWatermarkUnlock'
import { BOOTH_DEMOS, BOOTH_DEMO_NEEDS, boothDemoHref, type BoothDemo } from '@/lib/booth/demo'
import './booth-demo.css'

// 영업용 포토부스 데모 랜딩 — 키오스크 데모(/kiosk-demo)와 같은 방식. 고른 프로그램을 /booth?mode=…&demo=1 로 새 창에 연다:
// 매장 기기 설정을 건드리지 않고, 이용권·촬영 기록·관리자 창 없이, 화면에 NEANDER 워터마크(BoothWatermark).
// AI 아이돌 사진은 진짜로 만든다(1분 3장·하루 40장 상한 — src/lib/booth/demo-server.ts).
// 로케일 라우팅 밖(middleware.ts), 검색 노출 금지 — 링크를 받은 사람만 본다. 설명: docs/photobooth-demo.md
export const metadata: Metadata = {
  title: 'NEANDER 포토부스 데모',
  description: 'AI 아이돌·런웨이·한복·웨딩 등 AI 사진 프로그램과 뮤직비디오·추억 무비 영상을 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

const GROUPS: { id: BoothDemo['group']; title: string; short: string; note: string }[] = [
  { id: 'photo', title: 'AI 사진 프로그램', short: 'AI 사진', note: '런웨이 · 패션 타임머신 · 졸업 · 한복 · 웨딩 · 초상화 — 한 컷을 찍으면 프로그램마다 다른 화면과 인화 디자인으로 AI 사진을 만들어 4×6 인화와 QR로 줍니다' },
  { id: 'housing', title: '주거복지 · 공공 행사', short: '주거복지', note: '2026 대한민국 주거복지대전에 맞춘 AI 사진 — 가족·친구와 함께 찍는 입주 기념사진 · 드림하우스 매거진 표지 · 2046 미래 도시 주민 카드' },
  { id: 'video', title: '영상 프로그램', short: '영상', note: '15초 뮤직비디오와 사진 5~20장으로 만드는 추억 영상 — 부스에서 편집해 QR로 휴대폰에 받습니다(AI 영상이 아닌 편집 영상)' },
  { id: 'idol', title: 'AI 아이돌 포토', short: 'AI 아이돌', note: '한 컷을 찍으면 내 얼굴 그대로 K-POP 아이돌 컨셉 사진을 만들어 4×6으로 인화합니다' },
]
const FEATURES = [
  { Icon: WandSparkles, title: 'AI 사진 프로그램', text: '얼굴은 그대로 두고 의상 · 배경 · 화풍만 바꿉니다. 런웨이 · 한복 · 졸업 · 웨딩(2인) 등 프로그램마다 화면과 인화 디자인이 다릅니다.' },
  { Icon: Clapperboard, title: '영상 프로그램', text: '15초 뮤직비디오와 휴대폰 사진으로 만드는 추억 영상. 음악 · 색감을 고르면 부스에서 영상을 만들어 QR로 보냅니다.' },
  { Icon: Printer, title: '4×6 즉석 인화', text: '승화형 포토 프린터로 무테 인화. 디자인 4종을 고르면 그대로 뽑힙니다.' },
  { Icon: QrCode, title: '휴대폰으로 받기', text: '인화물 오른쪽 아래 QR을 찍으면 7일 동안 원본 사진을 휴대폰에 저장할 수 있습니다.' },
  { Icon: Camera, title: 'DSLR 연결', text: '캐논 DSLR을 USB로 연결해 라이브뷰와 고화질 촬영을 씁니다. 없으면 웹캠으로 동작합니다.' },
  { Icon: Languages, title: '5개 언어', text: '한국어 · English · 日本語 · 简体中文 · 繁體中文 — 화면 오른쪽 위에서 바꿉니다.' },
  { Icon: Sparkles, title: '행사 맞춤', text: '첫 화면 문구와 배경, 인화물 행사 표기, 프레임을 행사에 맞춰 바꿀 수 있습니다.' },
]
const NOTES = [
  '카메라를 쓰는 프로그램은 브라우저가 권한을 물을 때 허용해 주세요. 부스 화면은 가로 모니터(1280×720 이상) 기준입니다.',
  'AI 사진은 찍은 뒤 20~40초쯤 걸립니다. 데모의 AI 생성은 모든 프로그램을 합쳐 하루 이용 횟수가 정해져 있어, 넘으면 안내가 나옵니다.',
  '영상 프로그램은 영상 길이만큼 만드는 시간이 걸립니다. 뮤직비디오는 카메라와 마이크 권한이 필요합니다.',
  '타임캡슐 · 미래 가족 · 2046 미래 도시는 재미로 보는 창작 이미지, 역사 속 한 장면은 역사에서 영감을 받은 상상화입니다.',
  '인쇄는 프린터가 달린 실제 부스에서 바로 나옵니다. 브라우저에서는 인쇄 미리보기로 보여 드립니다.',
  '추억 무비와 \'휴대폰 사진 가져오기\'는 화면의 QR을 휴대폰으로 찍어 사진을 올립니다.',
  '데모 화면에는 NEANDER 워터마크가 표시됩니다. 실제 매장 부스와 인화물에는 표시되지 않고, 관리자는 아래 \'워터마크 끄기\'에서 비밀번호로 끌 수 있습니다.',
]
/** 머리말의 부스 화면 — 3초마다 바뀐다(칸 수는 booth-demo.css 의 15초 순환에 맞춘다) */
const HERO = ['idol-home', 'program-runway', 'program-hanbok', 'program-wedding', 'program-music-video']
const HERO_CAPTION: Record<string, { tag: string; name: string; color: string }> = {
  'idol-home': { tag: 'AI IDOL', name: '아이돌 컨셉 고르기', color: '#7a4fd0' },
  'program-runway': { tag: 'WALK!', name: '런웨이 포토부스', color: '#e8336d' },
  'program-hanbok': { tag: 'HANBOK!', name: '한복 포토부스', color: '#2f6b4f' },
  'program-wedding': { tag: 'VOW!', name: '웨딩 포토부스', color: '#7a5240' },
  'program-music-video': { tag: 'MV!', name: '뮤직비디오 메이커', color: '#6a3fe0' },
}

/**
 * 매장 포토부스를 정면에서 본 모양 — 그림 파일 없이 코드로 그린다(booth-demo.css 의 .bd-booth).
 * 실물(2026-10 사진)의 특징만 옮겼다: 흰 세로 몸체 · 위 가운데 둥근 구멍 안의 캐논 렌즈 · 가운데 가로 화면(16:9) ·
 * 그 아래 가로로 긴 인화물 출구(오른쪽에 회색 받침). 몸체는 바닥까지 이어지므로 아래로 흐려진다.
 * print 가 있으면 출구에서 인화물이 나오는 모습.
 */
function Booth({ children, print, className }: { children: ReactNode; print?: string; className?: string }) {
  return (
    <span className={`bd-booth${className ? ` ${className}` : ''}`}>
      <span className="bd-booth-body">
        <span className="bd-booth-cam" aria-hidden="true"><i /></span>
        <span className="bd-booth-screen">{children}</span>
        <span className="bd-booth-slot" aria-hidden="true"><i /></span>
        {print && (
          <span className="bd-booth-print" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={print} alt="" width={600} height={900} loading="lazy" decoding="async" />
          </span>
        )}
      </span>
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
            <p className="bd-eyebrow">가로형 터치 포토부스 · DSLR · 4×6 인화 · 영상</p>
            <h1>찍으면 바로,<br />화보 한 장 · 영상 한 편</h1>
            <p className="bd-lead">매장과 행사장에서 그대로 도는 포토부스 프로그램 {BOOTH_DEMOS.length}가지입니다. 런웨이 · 한복 · 웨딩 같은 AI 사진, 뮤직비디오 · 추억 영상, AI 아이돌까지 — 아래에서 골라 직접 눌러 보세요.</p>
            <a className="bd-button" href="#demos">데모 고르기<ArrowDown size={20} strokeWidth={2.2} aria-hidden="true" /></a>
          </div>
          <figure className="bd-hero-stage" aria-label="매장 포토부스 화면이 프로그램마다 바뀌며 도는 모습과 인화물">
            <Booth className="bd-booth--hero" print="/assets/booth-demo/print-ending-fairy.webp">
              <span className="bd-cycle" aria-hidden="true">
                {HERO.map((name, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={name} src={`/assets/booth-demo/${name}.webp`} alt="" width={960} height={540} decoding="async" fetchPriority={i ? 'low' : 'high'} style={{ '--i': i } as CSSProperties} />
                ))}
              </span>
            </Booth>
            <figcaption className="bd-now" aria-hidden="true">
              {HERO.map((name, i) => {
                const c = HERO_CAPTION[name]
                return <span key={name} style={{ '--i': i, '--bd-tone': c.color } as CSSProperties}><b>{c.tag}</b>{c.name}</span>
              })}
            </figcaption>
          </figure>
        </section>

        <nav className="bd-nav" aria-label="프로그램 종류">
          {GROUPS.map((group) => (
            <a key={group.id} href={`#bd-${group.id}`}>{group.short}<span>{BOOTH_DEMOS.filter((d) => d.group === group.id).length}</span></a>
          ))}
        </nav>

        <div id="demos" className="bd-demos">
          {GROUPS.map((group) => {
            const demos = BOOTH_DEMOS.filter((demo) => demo.group === group.id)
            return (
              <section key={group.id} id={`bd-${group.id}`} className="bd-group" aria-labelledby={`bd-${group.id}-title`}>
                <div className="bd-group-head">
                  <h2 id={`bd-${group.id}-title`}>{group.title}<span>{demos.length}</span></h2>
                  <p>{group.note}</p>
                </div>
                <ul className="bd-grid">
                  {demos.map((demo) => (
                    <li key={demo.id}>
                      <a className="bd-card" href={boothDemoHref(demo)} target="_blank" rel="noopener" style={{ '--bd-tone': demo.color } as CSSProperties}>
                        <Booth print={demo.print}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={demo.screen} alt={`${demo.name} 화면`} width={960} height={540} loading="lazy" decoding="async" />
                        </Booth>
                        <span className="bd-card-body">
                          <span className="bd-tag">{demo.tag}</span>
                          <b>{demo.name}</b>
                          <span className="bd-desc">{demo.desc}</span>
                          <span className="bd-needs">{(demo.badges ?? demo.needs.map((need) => BOOTH_DEMO_NEEDS[need])).map((badge) => <i key={badge}>{badge}</i>)}</span>
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
        <DemoWatermarkUnlock />
      </footer>
    </div>
  )
}
