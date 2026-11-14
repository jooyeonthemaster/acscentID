'use client'

import { ArrowUpRight, MonitorSmartphone, RotateCw } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { DemoCleanLinkMaker } from '@/components/demo/DemoCleanLinkMaker'
import {
  BUILD_LABEL, PHASE_LABEL, PLAN_INFO, fungroundPlanPrograms, fungroundStartHref, fungroundTargetHref,
  type FungroundPlan, type FungroundProgram,
} from '@/lib/funground/demo'
import './funground-landing.css'

// 펀그라운드 별내 견적 데모 랜딩(/booth-demo/funground) — 포토부스 데모 랜딩(BoothDemoLanding)과 같은 카드 · 기기 그림 짜임.
// A안 / B안 탭(#a · #b 로 기억). 카드마다 단계(1단계 12월 · 2단계 1월)와 제작 구분(기존 · 고쳐 씀 · 새로)을 단다.
// 설치 기기는 32인치 세로 터치스크린 1대 — '세로 시작 화면'에서 프로그램을 고르는 흐름을 열어 볼 수 있다.
// /booth-demo/funground/clean?k=… 은 같은 랜딩의 워터마크 없는 판(서명이 맞을 때만, src/lib/demo-clean.ts).

const NOTES = [
  '카메라를 쓰는 프로그램은 브라우저가 권한을 물을 때 허용해 주세요. 설치 기기는 세로 화면(1080×1920)입니다 — 노트북에서는 화면 비율에 맞춰 줄여 보여 드려요.',
  '「가로 화면」 표시가 있는 프로그램은 지금 부스용 가로 화면으로 열립니다. 설치 때 세로 화면으로 바꿉니다.',
  'A안의 AI 사진은 찍은 뒤 15~40초쯤 걸립니다. 데모의 AI 생성은 하루 이용 횟수가 정해져 있어, 넘으면 안내가 나옵니다.',
  'A안: 사진은 AI 사진을 만드는 동안만 AI 서비스로 보내고, 결과 사진과 원본을 데모 서버에 남기지 않습니다.',
  'B안: 외부 AI 서비스를 부르지 않습니다. 사진은 브라우저(설치 때는 기기) 안에서만 처리합니다.',
  '사주 · 미래 직업은 재미로 보는 풀이입니다. 퍼스널 컬러는 점수 없이 「어울리는 색」만 알려 드립니다.',
  '인쇄는 프린터가 달린 실제 기기에서 바로 나옵니다. 브라우저에서는 미리보기로 보여 드립니다. 뮤직비디오 QR 받기는 설치 때 연결합니다.',
  '펀그라운드 색 · 로고 자리는 임시입니다. 실제 로고를 받으면 바꿉니다.',
  '데모 화면에는 DEMO 워터마크가 표시됩니다. 실제 기기와 인화물에는 표시되지 않습니다.',
]

const readPlan = (): FungroundPlan => (typeof window !== 'undefined' && window.location.hash === '#b' ? 'b' : 'a')

/** 벽에 매입한 세로 체험기 정면 — 그림 파일 없이 코드로 그린다(funground-landing.css 의 .fl-device). 가로 프로그램은 화면 안에 가로로 */
function Device({ screen, landscape, alt, hero = false }: { screen: string; landscape: boolean; alt: string; hero?: boolean }) {
  return (
    <span className={`fl-device${hero ? ' fl-device--hero' : ''}`}>
      <span className="fl-device-body">
        <span className="fl-device-cam" aria-hidden="true"><i /></span>
        <span className={`fl-device-screen${landscape ? ' fl-device-screen--wide' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screen} alt={alt} loading={hero ? 'eager' : 'lazy'} decoding="async" />
        </span>
        <span className="fl-device-slots" aria-hidden="true"><i /><i /></span>
      </span>
    </span>
  )
}

function Card({ program, cleanKey }: { program: FungroundProgram; cleanKey?: string }) {
  const landscape = program.orientation === 'landscape'
  const two = program.targets.length > 1
  return (
    <li className="fl-card" style={{ '--fl-tone': program.color } as CSSProperties}>
      <Device screen={program.screen} landscape={landscape} alt={`${program.name} 화면`} />
      <div className="fl-card-body">
        <div className="fl-flags">
          <span className="fl-flag fl-flag--phase" data-phase={program.phase}>{PHASE_LABEL[program.phase]}</span>
          <span className="fl-flag fl-flag--build" data-build={program.build}>{BUILD_LABEL[program.build]}</span>
        </div>
        <span className="fl-tag">{program.no}. {program.tag}</span>
        <b className="fl-name">{program.name}</b>
        <span className="fl-desc">{program.desc}</span>
        {program.note && <span className="fl-note">{program.note}</span>}
        {landscape && <span className="fl-rotate"><RotateCw size={15} strokeWidth={2.4} aria-hidden="true" />가로 화면 · 설치 때 세로로 바꿈</span>}
        <span className="fl-badges">{program.badges.map((b) => <i key={b}>{b}</i>)}</span>
        <span className="fl-opens">
          {program.targets.map((target) => (
            <a key={target.id + (target.query?.engine ?? '')} className="fl-open" href={fungroundTargetHref(target, cleanKey)} target="_blank" rel="noopener">
              {two ? target.label : '데모 열기'}<ArrowUpRight size={17} strokeWidth={2.3} aria-hidden="true" />
            </a>
          ))}
        </span>
      </div>
    </li>
  )
}

export function FungroundLanding({ cleanKey, cleanRejected = false }: { cleanKey?: string; cleanRejected?: boolean }) {
  const [plan, setPlan] = useState<FungroundPlan>('a')
  useEffect(() => {
    const sync = () => setPlan(readPlan())
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const choose = (next: FungroundPlan) => {
    setPlan(next)
    history.replaceState(null, '', `#${next}`)
  }
  const programs = fungroundPlanPrograms(plan)
  const phase1 = programs.filter((p) => p.phase === 1)
  const phase2 = programs.filter((p) => p.phase === 2)
  const clean = Boolean(cleanKey)

  return (
    <div className="fl">
      {cleanRejected && (
        <p className="fl-notice" role="status">워터마크 없는 링크가 아니거나 사용 기간이 지났어요. 워터마크가 있는 데모로 보여 드려요 — 새 링크는 담당자에게 요청해 주세요.</p>
      )}
      <header className="fl-top">
        <span className="fl-brand">NEANDER</span>
        <span className="fl-pill">FUN GROUND 별내 · 견적 데모</span>
      </header>

      <main>
        <section className="fl-hero">
          <div className="fl-hero-copy">
            <p className="fl-eyebrow">32인치 세로 터치스크린 1대 · 카메라 · 4×6 포토 프린터 · 영수증 프린터</p>
            <h1>펀그라운드 별내<br />체험 부스 데모</h1>
            <p className="fl-lead">9~19세 청소년이 혼자, 친구와 함께 즐기는 상설 체험기입니다. 견적 두 안의 프로그램을 아래에서 직접 눌러 보세요. 기기 한 대에 프로그램을 모두 담고, 세로 시작 화면에서 고릅니다.</p>
            <div className="fl-compare" role="tablist" aria-label="견적안">
              {(['a', 'b'] as const).map((id) => (
                <button key={id} type="button" role="tab" aria-selected={plan === id} className="fl-plan" data-plan={id} onClick={() => choose(id)}>
                  <span className="fl-plan-head"><b>{PLAN_INFO[id].title}</b><em>{PLAN_INFO[id].quote}</em></span>
                  <span className="fl-plan-line">{PLAN_INFO[id].line}</span>
                  <span className="fl-plan-count">프로그램 {fungroundPlanPrograms(id).length}가지</span>
                </button>
              ))}
            </div>
          </div>
          <figure className="fl-hero-stage">
            <Device hero screen={`/assets/booth-demo/funground/start-${plan}.webp`} landscape={false} alt={`${PLAN_INFO[plan].short} 세로 시작 화면`} />
            <a className="fl-button" href={fungroundStartHref(plan, cleanKey)} target="_blank" rel="noopener">
              <MonitorSmartphone size={20} strokeWidth={2.2} aria-hidden="true" />{PLAN_INFO[plan].short} 세로 시작 화면 열기
            </a>
          </figure>
        </section>

        <nav className="fl-tabs" aria-label="견적안 고르기">
          {(['a', 'b'] as const).map((id) => (
            <a key={id} href={`#${id}`} aria-current={plan === id ? 'true' : undefined} onClick={(e) => { e.preventDefault(); choose(id) }}>
              {PLAN_INFO[id].title}<span>{fungroundPlanPrograms(id).length}</span>
            </a>
          ))}
        </nav>

        <section className="fl-plan-section" aria-labelledby="fl-plan-title">
          <div className="fl-group-head">
            <h2 id="fl-plan-title">{PLAN_INFO[plan].title}<span>{PLAN_INFO[plan].quote}</span></h2>
            <p>{PLAN_INFO[plan].line}{plan === 'b' ? ' 테마 포토 · 퍼스널 컬러만 AI 인식을 쓰고(기기 안), 사주 · 미래 직업 · 뮤직비디오는 체험 프로그램입니다.' : ' AI 포토 6종 + AI 진단 1종(둘 중 고름) + AI 포춘.'}</p>
          </div>
          {[{ phase: 1 as const, list: phase1 }, { phase: 2 as const, list: phase2 }].filter((g) => g.list.length).map((g) => (
            <div key={g.phase} className="fl-phase">
              <h3>{PHASE_LABEL[g.phase]}<span>{g.phase === 1 ? '12월 중순 설치 때 함께 들어갑니다' : '1월 업데이트로 더합니다'}</span></h3>
              <ul className="fl-grid">{g.list.map((p) => <Card key={p.key} program={p} cleanKey={cleanKey} />)}</ul>
            </div>
          ))}
        </section>

        <section className="fl-notes" aria-labelledby="fl-notes">
          <h2 id="fl-notes">데모 이용 안내</h2>
          <ul>{(clean ? NOTES.filter((n) => !n.includes('워터마크')) : NOTES).map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      </main>

      <footer className="fl-foot">
        <b>주식회사 네안데르</b>
        <a href="tel:02-336-3368">Tel. 02-336-3368</a>
        <a href="tel:010-8507-5121">Mobile. 010-8507-5121</a>
        <span>neander@neander.co.kr</span>
        <DemoCleanLinkMaker paths={[['펀그라운드 별내 데모', '/booth-demo/funground/clean']]} />
      </footer>
    </div>
  )
}
