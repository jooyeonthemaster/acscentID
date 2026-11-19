/* eslint-disable @next/next/no-img-element -- 영상판 첫 장면 그림 */
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { ArrowDown, ArrowUpRight, Clapperboard, Footprints, Sparkles } from 'lucide-react'
import { Kiosk } from '../KioskDemoLanding'
import { Booth } from '@/app/booth-demo/BoothDemoLanding'
import { boothDemoHref } from '@/lib/booth/demo'
import { DemoTabs } from '@/components/demo/DemoTabs'
import { kioskDemoCardHref } from '@/lib/kiosk/demo'
import { VIDEO_PROGRAMS } from '@/app/kiosk/video/plans'
import './../kiosk-demo.css'
import '@/app/booth-demo/booth-demo.css'

// 키오스크 영상판 데모 랜딩(/kiosk-demo/video, 2026-11-18 사용자 지시: 기존 프로그램은 그대로 두고 새 데모 링크에).
// 카드마다 실제 프로그램의 영상판(/kiosk?mode=…&demo=1&lab=video)을 연다 — 같은 카메라 · AI · 결과, 겉모습만 길잡이 인물 영상.
// 기존 데모 랜딩(/kiosk-demo)과 기본 화면은 그대로. 로케일 라우팅 밖(middleware.ts), 검색 노출 금지.

export const VIDEO_DEMO_META: Metadata = {
  title: 'NEANDER 키오스크 영상판 데모',
  description: '길잡이 인물이 영상 속에서 안내하는 키오스크 체험 프로그램 데모입니다.',
  robots: { index: false, follow: false },
}

const CARDS = [
  { id: 'color', mode: 'ai-color', desc: '회색 옷만 입는 컬러리스트 서하가 아틀리에를 걸으며 상담 · 촬영 · 드레이프를 하고, 거울 앞에서 결과를 보여 줍니다.' },
  { id: 'draw', mode: 'studio-draw', desc: '언덕 위 화실의 거리 화가 모루가 손가락 프레임으로 구도를 잡고, 이젤 옆에서 그린 캐리커처를 캔버스째 돌려 보여 줍니다.' },
  { id: 'makeup', mode: 'studio-makeup', desc: '백스테이지 메이크업 아티스트 이안의 전구 거울이 카메라이자 화장 화면이 되고, 런웨이 입구에서 완성 사진을 들어 보입니다.' },
] as const

/** 영상판이 따로 계획(plans.ts) 밖에 있는 프로그램 — SCENT! 는 기본 SCENT! 화면에 영상판을 입혔다(src/app/kiosk/perfumer/scent-plan.ts) */
const MORE_CARDS = [
  { key: 'scent', tag: 'SCENT! · 영상판', name: 'AI 조향사 — 하린의 향수 하우스', color: '#244eea', screen: '/assets/kiosk-programs/perfumer/video/lane.webp', href: (k?: string) => kioskDemoCardHref({ mode: 'ai-perfumer', lab: 'video' }, k),
    desc: '실사 조향사 하린을 따라 골목 입구 → 살롱 → 온실 → 증류실 → 향료 오르간 → 사진 스튜디오 → 블렌딩 랩 → 부티크를 걸으며 취향을 고르고 사진을 찍으면, AI가 나만의 향 레시피를 만들어 줍니다.', needs: ['카메라', 'AI', '레시피 출력'] },
  // SCENT! 스핀오프 미연시(2026-11-19, 모드 ai-perfumer-harin, src/app/kiosk/perfumer/date) — 대본 docs/scent-harin-route.md
  { key: 'harin', tag: 'SCENT! · 하린 루트', name: '하린과의 하루 — 향기로 기억해 줄래요?', color: '#d94f86', screen: '/assets/kiosk-programs/perfumer/date/lane.webp', href: (k?: string) => kioskDemoCardHref({ mode: 'ai-perfumer-harin' }, k),
    desc: '조향사 하린과 마주 보고 이야기하는 미연시. 하린이 목소리로 말을 걸고, 고르는 대답마다 호감도와 나에게 맞는 향 키워드가 쌓여요. 사진을 찍으면 AI가 향을 만들고, 호감도에 따라 엔딩 셋 중 하나와 손편지 영수증을 받아요.', needs: ['카메라', 'AI', '음성 · 립싱크', '엔딩 3'] },
  // 포토부스 일반 프로그램 LATER!(2026-11-19, 모드 later — 늘 영상판, src/app/booth/programs/LaterFlow.tsx) — 가로 화면
  { key: 'later', device: 'booth' as const, tag: 'LATER! · 영상판', name: '나중 박사의 타임캡슐 — 10 · 20 · 30년 뒤의 우리', color: '#1f4fd8', screen: '/assets/booth-programs/later-video/garage.webp', href: (k?: string) => `${boothDemoHref({ mode: 'later' }, k)}&camera=webcam`,
    desc: '가로 포토부스. 괴짜 발명가 나중 박사의 실험실에서 커다란 타임캡슐에 올라 조종석에서 한 컷 찍고 레버를 당기면, 창밖으로 2036 · 2046 · 2056년의 우리가 차례로 나타나요. 돌아오면 네 컷을 2×6 사진으로 뽑아 줍니다.', needs: ['카메라', 'AI 미래 사진', '1~4인', '2×6 인화 · QR'] },
]

/** 연말 시상식(2026-12-15) 영상판 — 다른 세션이 만든 것을 같은 데모에 모음(SIP! 키오스크 · FACE! · SAJU! 포토부스) */
const EVENT_CARDS = [
  { key: 'sip', device: 'kiosk' as const, tag: 'SIP! · 영상판', name: 'AI 소믈리에 — 해나의 와이너리 여정', color: '#6b2941', screen: '/assets/booth-demo/nh/sip-video.webp', href: (k?: string) => kioskDemoCardHref({ mode: 'studio-sommelier-nh', lab: 'video' }, k),
    desc: '소믈리에 해나를 따라 포도밭 입구 → 포도밭 → 와이너리 → 수장고 → 시음실을 1인칭으로 걸으며 맛을 고르면, AI가 시음 와인 10병 중 한 병을 골라 줍니다.', needs: ['카메라', 'AI', '영상 안내'] },
  { key: 'face', device: 'booth' as const, tag: 'FACE! · 영상판', name: '새해 관상 이야기 — 도화서 화원', color: '#b3261e', screen: '/assets/booth-programs/nh-face-video/courtyard.webp', href: (k?: string) => `${boothDemoHref({ mode: 'nh-face' }, k)}&camera=webcam&lab=video`,
    desc: '가로 포토부스. 도화서 화원이 화실 마당에서 맞이해 구도를 재고, 조선 시대 초상으로 그려 족자에 걸어 줍니다.', needs: ['카메라', 'AI 초상', '4×6 인화'] },
  { key: 'saju', device: 'booth' as const, tag: 'SAJU! · 영상판', name: '정미년 사주 이야기 — 관상감 천문 관원', color: '#2f3f73', screen: '/assets/booth-programs/nh-saju-video/gate.webp', href: (k?: string) => `${boothDemoHref({ mode: 'nh-saju' }, k)}&camera=webcam&lab=video`,
    desc: '가로 포토부스. 천문 관원 하율이 밤의 관상감에서 맞이해 만세력으로 생년월일을 찾고, 구리거울로 한 컷 찍은 뒤 별밤에 사주를 세워 정미년 첫 해돋이에 사주 카드를 보여 줍니다.', needs: ['생년월일', 'AI 초상', '4×6 접는 카드'] },
]

const FEATURES = [
  { Icon: Footprints, title: '끊기지 않는 장면', text: '어느 때 버튼을 눌러도 하던 동작을 2초 안에 마치고, 걸어 나가 다음 장소로 걸어 들어옵니다.' },
  { Icon: Clapperboard, title: '기다림도 장면으로', text: 'AI 가 분석하거나 그리는 동안 길잡이가 천을 대 보고, 그림을 그리고, 머리를 손질합니다.' },
  { Icon: Sparkles, title: '결과는 영상 속에', text: '거울 · 캔버스 · 즉석 사진 안에 손님 결과가 그려진 듯 들어갑니다. 손 · 소매는 그 앞에 그대로 남습니다.' },
]

const NOTES = [
  '카메라를 쓰는 프로그램이라 브라우저가 권한을 물으면 허용해 주세요.',
  '촬영 · AI 분석 · 결과는 기본 프로그램과 같습니다. 영상판은 화면 겉모습만 다릅니다.',
  '영상을 처음 받는 동안(프로그램마다 15~37MB) 잠시 그림으로 보일 수 있습니다.',
  '데모 화면에는 DEMO 워터마크가 표시됩니다.',
]
const notes = (clean: boolean) => (clean ? NOTES.filter((n) => !n.includes('워터마크')) : NOTES)

/** 영상판 데모 랜딩 — 서명(cleanKey)이 맞으면 워터마크 없는 데모 주소(demo=clean&k=…)로 연다(/kiosk-demo/video/clean) */
export function VideoDemoLanding({ cleanKey, cleanRejected = false }: { cleanKey?: string; cleanRejected?: boolean }) {
  return (
    <div className="kd">
      <DemoTabs current="video" cleanKey={cleanKey} />
      {cleanRejected && <p className="kd-notice" role="status">워터마크 없는 링크가 아니거나 사용 기간이 지났어요. 워터마크가 있는 데모로 보여 드려요 — 새 링크는 담당자에게 요청해 주세요.</p>}
      <header className="kd-top">
        <span className="kd-brand">NEANDER</span>
        <span className="kd-pill">KIOSK VIDEO DEMO</span>
      </header>
      <main>
        <section className="kd-hero">
          <div className="kd-hero-copy">
            <p className="kd-eyebrow">세로형 터치 키오스크 · 길잡이 인물 영상판</p>
            <h1>화면 속 인물이<br />직접 안내합니다</h1>
            <p className="kd-lead">AI로 만든 길잡이 인물이 장소를 옮겨 다니며 촬영하고, 분석하고, 결과를 건네는 영상판입니다. 아래에서 골라 직접 눌러 보세요.</p>
            <a className="kd-button" href="#demos">데모 고르기<ArrowDown size={20} strokeWidth={2.2} aria-hidden="true" /></a>
          </div>
        </section>

        <div id="demos" className="kd-demos">
          <section className="kd-group" aria-labelledby="kd-video">
            <div className="kd-group-head">
              <h2 id="kd-video">체험 프로그램 영상판<span>{CARDS.length + MORE_CARDS.length}</span></h2>
              <p>기본 프로그램과 같은 촬영 · AI · 결과를, 길잡이 인물이 걸어 다니는 영상 위에서</p>
            </div>
            <ul className="kd-grid">
              {CARDS.map((card) => {
                const p = VIDEO_PROGRAMS[card.id]
                return (
                  <li key={card.id}>
                    <a className="kd-card" href={kioskDemoCardHref({ mode: card.mode, lab: 'video' }, cleanKey)} target="_blank" rel="noopener" style={{ '--kd-tone': p.tone } as CSSProperties}>
                      <Kiosk><img src={`${p.plan.base}/${p.first}.webp`} alt={`${p.name} 영상판 첫 장면`} width={720} height={1280} loading="lazy" decoding="async" /></Kiosk>
                      <span className="kd-card-body">
                        <span className="kd-tag">{p.tag} · 영상판</span>
                        <b>{p.name} — {p.guide}</b>
                        <span className="kd-desc">{card.desc}</span>
                        <span className="kd-needs"><i>카메라</i><i>AI</i><i>영상 안내</i></span>
                        <span className="kd-open">데모 열기<ArrowUpRight size={18} strokeWidth={2.2} aria-hidden="true" /></span>
                      </span>
                    </a>
                  </li>
                )
              })}
              {MORE_CARDS.map((card) => (
                <li key={card.key}>
                  <a className="kd-card" href={card.href(cleanKey)} target="_blank" rel="noopener" style={{ '--kd-tone': card.color } as CSSProperties}>
                    {'device' in card && card.device === 'booth'
                      ? <Booth><img src={card.screen} alt={`${card.name} 첫 장면`} width={1280} height={720} loading="lazy" decoding="async" /></Booth>
                      : <Kiosk><img src={card.screen} alt={`${card.name} 첫 장면`} width={720} height={1280} loading="lazy" decoding="async" /></Kiosk>}
                    <span className="kd-card-body">
                      <span className="kd-tag">{card.tag}</span>
                      <b>{card.name}</b>
                      <span className="kd-desc">{card.desc}</span>
                      <span className="kd-needs">{card.needs.map((n) => <i key={n}>{n}</i>)}</span>
                      <span className="kd-open">데모 열기<ArrowUpRight size={18} strokeWidth={2.2} aria-hidden="true" /></span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section className="kd-group" aria-labelledby="kd-video-event">
            <div className="kd-group-head">
              <h2 id="kd-video-event">연말 시상식 영상판<span>{EVENT_CARDS.length}</span></h2>
              <p>AI 소믈리에 키오스크와 새해 관상 · 사주 포토부스 — 같은 방식(조각 영상 · 끊김 없는 이동)으로 만든 행사 프로그램</p>
            </div>
            <ul className="kd-grid">
              {EVENT_CARDS.map((card) => (
                <li key={card.key}>
                  <a className="kd-card" href={card.href(cleanKey)} target="_blank" rel="noopener" style={{ '--kd-tone': card.color } as CSSProperties}>
                    {card.device === 'kiosk'
                      ? <Kiosk><img src={card.screen} alt={`${card.name} 첫 장면`} width={600} height={1067} loading="lazy" decoding="async" /></Kiosk>
                      : <Booth><img src={card.screen} alt={`${card.name} 첫 장면`} width={1280} height={720} loading="lazy" decoding="async" /></Booth>}
                    <span className="kd-card-body">
                      <span className="kd-tag">{card.tag}</span>
                      <b>{card.name}</b>
                      <span className="kd-desc">{card.desc}</span>
                      <span className="kd-needs">{card.needs.map((n) => <i key={n}>{n}</i>)}</span>
                      <span className="kd-open">데모 열기<ArrowUpRight size={18} strokeWidth={2.2} aria-hidden="true" /></span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="kd-features" aria-labelledby="kd-common">
          <h2 id="kd-common">영상판이 다른 점</h2>
          <ul>
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title}><Icon size={26} strokeWidth={1.7} aria-hidden="true" /><b>{title}</b><span>{text}</span></li>
            ))}
          </ul>
        </section>

        <section className="kd-notes" aria-labelledby="kd-notes">
          <h2 id="kd-notes">데모 이용 안내</h2>
          <ul>{notes(Boolean(cleanKey)).map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
      </main>
      <footer className="kd-foot">
        <b>주식회사 네안데르</b>
        <a href="tel:02-336-3368">Tel. 02-336-3368</a>
        <a href="tel:010-8507-5121">Mobile. 010-8507-5121</a>
        <span>neander@neander.co.kr</span>
      </footer>
    </div>
  )
}
