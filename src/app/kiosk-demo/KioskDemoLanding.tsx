import { ArrowDown, ArrowUpRight, Languages, LayoutGrid, Printer, Smartphone, Sparkles, WandSparkles } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { KIOSK_DEMOS, KIOSK_DEMO_NEEDS, kioskDemoHref, type KioskDemo } from '@/lib/kiosk/demo'
import './kiosk-demo.css'

// 영업용 데모 랜딩 — 키오스크에서 도는 프로그램을 골라 웹브라우저로 직접 눌러 볼 수 있게 한다.
// 고른 프로그램은 운영 모드 미리보기 주소에 demo=1 을 붙여 새 창으로 연다: 화면에 NEANDER 워터마크가 깔린다(KioskWatermark).
// /kiosk-demo/clean 은 같은 랜딩의 워터마크 없는 판 — demo=clean 으로 열어 워터마크를 깔지 않는다.
// 로케일 라우팅 밖(middleware.ts), 검색 노출 금지 — 링크를 받은 사람만 본다. 설명: docs/kiosk-modes.md '영업용 데모'

/** 주거복지 묶음은 제안서(2026-10-26) 순서 — 전시 둘(TOUCH! · VISION!) 다음 AI 체험 둘(NEXT! · ROOM!) */
const HOUSING_ORDER = ['studio-product', 'studio-vision-wall', 'studio-career', 'studio-housing-scent']
const order = (mode: string) => { const i = HOUSING_ORDER.indexOf(mode); return i < 0 ? 99 : i }

/** 그 프로그램의 첫 화면(560×996 CSS 크기로 찍어 600×1067 로 줄인 것) */
const screenShot = (mode: string) => `/assets/kiosk-demo/screen-${mode}.webp`
const GROUPS: { id: KioskDemo['group']; title: string; note: string }[] = [
  { id: 'reading', title: 'AI 분석 · 리딩', note: '사진이나 생년월일로 나를 읽어 주는 프로그램' },
  { id: 'studio', title: '체험 스튜디오', note: '직접 만들고 꾸며 보는 프로그램' },
  { id: 'preferences', title: '취향을 발견하는 시간', note: '음료 · 패션 · 여행 · 향 — 사진 한 장과 내 선택으로 만드는 가이드' },
  { id: 'social', title: '나와 우리를 위한 이야기', note: '카메라 체험과 사람별 답변으로 즐기는 케미' },
  { id: 'interactive', title: '터치로 움직이는 전시', note: '빛의 실험 · 문화유산 탐색' },
  { id: 'housing', title: '주거복지 · 공공 행사', note: '2026 대한민국 주거복지대전 AI 체험존 — 제품 인터랙티브 체험관(TOUCH!) · 비전 월(VISION!) · 미래 직업 탐색(NEXT!) · 우리 집 향 처방(ROOM!)' },
]
const FEATURES = [
  { Icon: LayoutGrid, title: '프로그램 전환', text: '관리자 화면에서 키오스크마다 다른 프로그램을 골라 운영합니다.' },
  { Icon: Languages, title: '언어 안내', text: '기존 10종은 5개 언어, 새로 추가된 21종은 한국어로 제공합니다.' },
  { Icon: Smartphone, title: '휴대폰으로 받기', text: '체험 스튜디오의 결과는 QR을 찍어 휴대폰에 저장합니다.' },
  { Icon: WandSparkles, title: 'AI 분석 · 합성', text: '새 체험 18종은 사진과 답변을 AI가 함께 보고 풀이하고, 그중 6종은 사진으로 화보 · 오라 · 타임머신 · 포스터 · 룩북을 새로 만듭니다.' },
  { Icon: Printer, title: '영수증 출력', text: '사주 · 컬러 · 타로 · 스킨케어 · 캐리커처 · 명함은 영수증으로도 뽑고, 새 체험 21종은 결과 화면의 인쇄하기 한 번이면 바로 나옵니다.' },
  { Icon: Sparkles, title: '행사 맞춤', text: '첫 화면 문구와 배경, 영수증 문구를 행사에 맞춰 바꿀 수 있습니다.' },
]
const NOTES = [
  '카메라나 마이크를 쓰는 프로그램은 브라우저가 권한을 물을 때 허용해 주세요.',
  'AI가 분석하는 데 3~7초, 사진으로 그림을 새로 만드는 프로그램은 10~20초쯤 걸립니다.',
  '영수증 출력은 프린터가 달린 실제 키오스크에서 동작합니다. 브라우저에서는 미리보기로 보여 줍니다.',
  '데모 화면에는 NEANDER 워터마크가 표시됩니다. 실제 매장 키오스크에는 표시되지 않습니다.',
]
/** 머리말의 키오스크 한 대 — 화면이 이 차례로 3초마다 바뀐다(움직임 줄이기를 켠 브라우저는 첫 화면에 머문다) */
// 새 체험 다섯(스타 무드 · 코디 · 오라 · 문화유산 · 칵테일)과 기존 다섯을 번갈아 — 칸 수는 kiosk-demo.css 의 30초 순환(10칸)에 맞춘다
const HERO = ['studio-lookalike', 'ai-tarot', 'studio-coord', 'studio-draw', 'studio-aura', 'studio-card', 'studio-heritage', 'ai-color', 'studio-cocktail', 'kwave-2026']
  .map((mode) => KIOSK_DEMOS.find((demo) => demo.mode === mode)!)

/**
 * 매장 키오스크를 정면에서 본 모양 — 그림 파일 없이 코드로 그린다(kiosk-demo.css 의 .kd-kiosk).
 * 실물(2026-09 매장 설치)의 특징만 옮겼다: 검은 몸체 · 크게 둥근 윗모서리 · 가운데 위에 집게로 꽂은 웹캠 · 9:16 화면 · 화면 아래 영수증 구멍이 난 패널(아래로 흐려진다).
 */
function Kiosk({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`kd-kiosk${className ? ` ${className}` : ''}`}>
      <span className="kd-kiosk-cam" aria-hidden="true"><i /></span>
      <span className="kd-kiosk-body">
        <span className="kd-kiosk-screen">{children}</span>
        <span className="kd-kiosk-panel" aria-hidden="true"><i /></span>
      </span>
    </span>
  )
}

/** 랜딩 본문 — clean 이면 워터마크 없는 데모 주소(demo=clean)로 열고 안내 문구에서 워터마크 줄을 뺀다 */
export function KioskDemoLanding({ clean = false }: { clean?: boolean }) {
  return (
    <div className="kd">
      <header className="kd-top">
        <span className="kd-brand">NEANDER</span>
        <span className="kd-pill">KIOSK DEMO</span>
      </header>

      <main>
        <section className="kd-hero">
          <div className="kd-hero-copy">
            <p className="kd-eyebrow">세로형 터치 키오스크 · 1080 × 1920</p>
            <h1>키오스크 한 대,<br />체험 프로그램 {KIOSK_DEMOS.length}가지</h1>
            <p className="kd-lead">매장과 행사장에 세우는 키오스크에서 그대로 도는 프로그램입니다. 아래에서 골라 직접 눌러 보세요.</p>
            <a className="kd-button" href="#demos">데모 고르기<ArrowDown size={20} strokeWidth={2.2} aria-hidden="true" /></a>
          </div>
          <figure className="kd-hero-stage" aria-label="매장 키오스크에서 프로그램이 바뀌며 도는 모습">
            <Kiosk className="kd-kiosk--hero">
              <span className="kd-cycle" aria-hidden="true">
                {HERO.map((demo, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={demo.mode} src={screenShot(demo.mode)} alt="" width={600} height={1067} decoding="async" fetchPriority={i ? 'low' : 'high'} style={{ '--i': i } as CSSProperties} />
                ))}
              </span>
            </Kiosk>
            <figcaption className="kd-now" aria-hidden="true">
              {HERO.map((demo, i) => <span key={demo.mode} style={{ '--i': i, '--kd-tone': demo.color } as CSSProperties}><b>{demo.tag}</b>{demo.name}</span>)}
            </figcaption>
          </figure>
        </section>

        <div id="demos" className="kd-demos">
          {GROUPS.map((group) => {
            const demos = KIOSK_DEMOS.filter((demo) => demo.group === group.id).sort((a, b) => order(a.mode) - order(b.mode))
            return (
              <section key={group.id} className="kd-group" aria-labelledby={`kd-${group.id}`}>
                <div className="kd-group-head">
                  <h2 id={`kd-${group.id}`}>{group.title}<span>{demos.length}</span></h2>
                  <p>{group.note}</p>
                </div>
                <ul className="kd-grid">
                  {demos.map((demo) => (
                    <li key={demo.mode}>
                      <a className="kd-card" href={kioskDemoHref(demo.mode, clean)} target="_blank" rel="noopener" style={{ '--kd-tone': demo.color } as CSSProperties}>
                        <Kiosk>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={screenShot(demo.mode)} alt={`${demo.name} 첫 화면`} width={600} height={1067} loading="lazy" decoding="async" />
                        </Kiosk>
                        <span className="kd-card-body">
                          <span className="kd-tag">{demo.tag}</span>
                          <b>{demo.name}</b>
                          <span className="kd-desc">{demo.desc}</span>
                          <span className="kd-needs">{demo.needs.map((need) => <i key={need}>{KIOSK_DEMO_NEEDS[need]}</i>)}</span>
                          <span className="kd-open">데모 열기<ArrowUpRight size={18} strokeWidth={2.2} aria-hidden="true" /></span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <section className="kd-features" aria-labelledby="kd-common">
          <h2 id="kd-common">키오스크가 갖춘 기능</h2>
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

        <section className="kd-notes" aria-labelledby="kd-notes">
          <h2 id="kd-notes">데모 이용 안내</h2>
          <ul>{(clean ? NOTES.filter((note) => !note.includes('워터마크')) : NOTES).map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
      </main>

      <footer className="kd-foot">
        <b>주식회사 네안데르</b>
        {/* 휴대폰에서 누르면 바로 전화가 걸린다 */}
        <a href="tel:02-336-3368">Tel. 02-336-3368</a>
        <a href="tel:010-8507-5121">Mobile. 010-8507-5121</a>
        <span>neander@neander.co.kr</span>
      </footer>
    </div>
  )
}
