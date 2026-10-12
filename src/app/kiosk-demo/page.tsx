import type { Metadata } from 'next'
import { ArrowDown, ArrowUpRight, Languages, LayoutGrid, Printer, Smartphone, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import { KIOSK_DEMOS, KIOSK_DEMO_NEEDS, kioskDemoHref, type KioskDemo } from '@/lib/kiosk/demo'
import './kiosk-demo.css'

// 영업용 데모 랜딩 — 키오스크에서 도는 프로그램을 골라 웹브라우저로 직접 눌러 볼 수 있게 한다.
// 고른 프로그램은 운영 모드 미리보기 주소에 demo=1 을 붙여 새 창으로 연다: 접속 비밀번호를 묻고(web-access.ts), 화면에 NEANDER 워터마크가 깔린다(DemoWatermark).
// 로케일 라우팅 밖(middleware.ts), 검색 노출 금지 — 링크를 받은 사람만 본다. 설명: docs/kiosk-modes.md '영업용 데모'
export const metadata: Metadata = {
  title: 'NEANDER 키오스크 데모',
  description: '세로형 터치 키오스크에서 도는 AI 체험 프로그램 열 가지를 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

const thumb = (mode: string) => `/assets/kiosk-demo/${mode}.webp`
const GROUPS: { id: KioskDemo['group']; title: string; note: string }[] = [
  { id: 'reading', title: 'AI 분석 · 리딩', note: '사진이나 생년월일로 나를 읽어 주는 프로그램' },
  { id: 'studio', title: '체험 스튜디오', note: '직접 만들고 꾸며 보는 프로그램' },
]
const FEATURES = [
  { Icon: LayoutGrid, title: '프로그램 전환', text: '관리자 화면에서 키오스크마다 다른 프로그램을 골라 운영합니다.' },
  { Icon: Languages, title: '5개 언어', text: '한국어 · English · 日本語 · 简体中文 · 繁體中文' },
  { Icon: Smartphone, title: '휴대폰으로 받기', text: '체험 스튜디오의 결과는 QR을 찍어 휴대폰에 저장합니다.' },
  { Icon: Printer, title: '영수증 출력', text: '사주 · 컬러 · 타로 · 스킨케어 · 캐리커처 · 명함은 영수증으로도 뽑습니다.' },
  { Icon: Sparkles, title: '행사 맞춤', text: '첫 화면 문구와 배경, 영수증 문구를 행사에 맞춰 바꿀 수 있습니다.' },
]
const NOTES = [
  '데모를 열면 여섯 자리 접속 코드를 묻습니다. 코드는 담당자에게 받으세요. 한 번 넣으면 그 브라우저에서 12시간 동안 다시 묻지 않습니다.',
  '카메라나 마이크를 쓰는 프로그램은 브라우저가 권한을 물을 때 허용해 주세요.',
  'AI가 그림을 그리는 프로그램은 결과가 나오기까지 10초쯤 걸립니다.',
  '영수증 출력은 프린터가 달린 실제 키오스크에서 동작합니다. 브라우저에서는 미리보기로 보여 줍니다.',
  '데모 화면에는 NEANDER 워터마크가 표시됩니다.',
]
/** 머리말 옆에 세워 두는 화면 세 장 */
const HERO = ['ai-tarot', 'studio-draw', 'studio-voice']

function Screen({ mode, alt, eager = false }: { mode: string; alt: string; eager?: boolean }) {
  return (
    <span className="kd-device">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb(mode)} alt={alt} width={540} height={960} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </span>
  )
}

export default function KioskDemoPage() {
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
            <h1>키오스크 한 대,<br />AI 체험 프로그램 열 가지</h1>
            <p className="kd-lead">매장과 행사장에 세우는 키오스크에서 그대로 도는 프로그램입니다. 아래에서 골라 직접 눌러 보세요.</p>
            <a className="kd-button" href="#demos">데모 고르기<ArrowDown size={20} strokeWidth={2.2} aria-hidden="true" /></a>
          </div>
          <div className="kd-hero-stage" aria-hidden="true">
            {HERO.map((mode) => <Screen key={mode} mode={mode} alt="" eager />)}
          </div>
        </section>

        <div id="demos" className="kd-demos">
          {GROUPS.map((group) => {
            const demos = KIOSK_DEMOS.filter((demo) => demo.group === group.id)
            return (
              <section key={group.id} className="kd-group" aria-labelledby={`kd-${group.id}`}>
                <div className="kd-group-head">
                  <h2 id={`kd-${group.id}`}>{group.title}<span>{demos.length}</span></h2>
                  <p>{group.note}</p>
                </div>
                <ul className="kd-grid">
                  {demos.map((demo) => (
                    <li key={demo.mode}>
                      <a className="kd-card" href={kioskDemoHref(demo.mode)} target="_blank" rel="noopener" style={{ '--kd-tone': demo.color } as CSSProperties}>
                        <Screen mode={demo.mode} alt={`${demo.name} 첫 화면`} />
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
          <ul>{NOTES.map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
      </main>

      <footer className="kd-foot">
        <b>주식회사 네안더</b>
        <span>Tel. 02-336-3368</span>
        <span>neander@neander.co.kr</span>
      </footer>
    </div>
  )
}
