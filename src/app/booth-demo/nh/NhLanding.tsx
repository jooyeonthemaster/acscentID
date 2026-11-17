'use client'

// 연말 시상식 AI 체험존 데모 랜딩(/booth-demo/nh) — 고객이 링크로 열어 프로그램을 직접 해 보고 고른다(11/24 확정).
// 카드 4장: 키오스크 AI 소믈리에 + 포토부스 새해 이야기 셋(부스 2대에 둘을 고른다). 카드마다 제작 구분(기존 · 고쳐 씀 / 새로 제작)과 손님 한 명 시간.
// 그 아래 따로 「새로 만든 판」(NH_NEW_DEMOS) — 영상판 SIP! · FACE!(같은 프로그램을 영상 속 길잡이와 함께, &lab=video).
// 고객 로고 · 이름은 넣지 않는다(브랜드 커스텀 옵션을 고르기 전, src/lib/nh-awards/brand.ts). /booth-demo/nh/clean?k=… 은 워터마크 없는 판.

import { ArrowUpRight, Camera, Clock, Printer, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import { DemoCleanLinkMaker } from '@/components/demo/DemoCleanLinkMaker'
import { NH_BUILD_LABEL, NH_DEMOS, NH_NEW_DEMOS, nhDemoHref, type NhDemo } from '@/lib/nh-awards/demo'
import { NH_WINES } from '@/lib/kiosk/expansion/nh-wines'
import { NH_KIND_LABEL } from '@/lib/kiosk/expansion/nh-sommelier'
import { Kiosk } from '@/app/kiosk-demo/KioskDemoLanding'
import { Booth } from '@/app/booth-demo/BoothDemoLanding'
import '@/app/kiosk-demo/kiosk-demo.css'
import '@/app/booth-demo/booth-demo.css'
import './nh-landing.css'

const NOTES = [
  '노트북 크롬으로 열어 노트북 카메라로 끝까지 해 볼 수 있어요. 카메라 권한을 물으면 허용해 주세요.',
  '포토부스 화면은 가로(현장 모니터와 같은 배치)를, 키오스크 화면은 세로를 창 크기에 맞춰 보여 드려요. 전체 화면(F11 · ⌃⌘F)이면 가장 크게 보여요.',
  '데모의 「인쇄하기」는 인쇄 미리보기로 보여 드려요. 현장 기기에서는 포토부스는 4×6 사진이, 키오스크는 영수증이 바로 나와요.',
  '사진은 AI가 이야기를 쓰거나 와인을 고르는 동안만 쓰고 저장하지 않아요. QR로 받기를 누른 결과만 정해진 기간 보관한 뒤 지워요.',
  '관상 · 사주 · 손금은 재미로 보는 새해 창작 이야기예요. 얼굴 생김새나 손금 선으로 성격 · 앞날을 판정하지 않아요.',
  '시음 와인 10병은 지금 제안 목록이에요. 재고에 따라 11월 24일까지 바뀌면 데모도 같이 바뀌어요.',
  '화면 · 인화물 · 영수증의 행사 로고 · 이름 자리는 비워 두었어요(브랜드 커스텀을 고르시면 넣어요).',
  '데모 화면에는 DEMO 워터마크가 보여요. 현장 기기와 인화물에는 나오지 않아요.',
]

function Card({ demo, cleanKey }: { demo: NhDemo; cleanKey?: string }) {
  return (
    <li className="nh-card" data-device={demo.device} style={{ '--nh-tone': demo.color } as CSSProperties}>
      {/* 실제 기기 정면 그림 안에 데모 첫 화면 — 영업용 랜딩(/kiosk-demo · /booth-demo)과 같은 그림. 부스는 출구에서 4×6 견본이 나온다 */}
      <a className="nh-card-shot" href={nhDemoHref(demo, cleanKey)} target="_blank" rel="noopener" aria-label={`${demo.name} 데모 열기`}>
        {demo.device === 'kiosk' ? (
          <Kiosk className="nh-device">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demo.screen} alt={`${demo.name} 첫 화면`} width={600} height={1067} loading="lazy" decoding="async" />
          </Kiosk>
        ) : (
          <Booth className="nh-device" print={demo.print}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demo.screen} alt={`${demo.name} 첫 화면`} width={960} height={540} loading="lazy" decoding="async" />
          </Booth>
        )}
        <span className="nh-card-device">{demo.device === 'kiosk' ? '키오스크 · 세로 화면' : '포토부스 · 가로 화면 + 4×6 인화'}</span>
      </a>
      <div className="nh-card-body">
        <div className="nh-flags">
          <span className="nh-flag" data-build={demo.build}>{NH_BUILD_LABEL[demo.build]}</span>
        </div>
        <p className="nh-tag">{demo.tag}</p>
        <h3>{demo.name}</h3>
        <p className="nh-desc">{demo.desc}</p>
        <p className="nh-from">다시 쓴 것 · {demo.from}</p>
        <dl className="nh-meta">
          <div><dt><Clock size={16} />손님 한 명</dt><dd>{demo.time}</dd></div>
          <div><dt><Sparkles size={16} />기다림</dt><dd>{demo.wait}</dd></div>
          <div><dt><Printer size={16} />결과물</dt><dd>{demo.output}</dd></div>
        </dl>
        <a className="nh-open" href={nhDemoHref(demo, cleanKey)} target="_blank" rel="noopener">직접 해 보기 <ArrowUpRight size={18} /></a>
      </div>
    </li>
  )
}

export function NhLanding({ cleanKey, cleanRejected = false }: { cleanKey?: string; cleanRejected?: boolean }) {
  const kiosk = NH_DEMOS.filter((d) => d.device === 'kiosk')
  const booth = NH_DEMOS.filter((d) => d.device === 'booth')
  return (
    <main className="nh-landing">
      {cleanRejected && <p className="nh-alert" role="alert">워터마크 없는 링크가 맞지 않거나 기간이 지났어요. 워터마크가 있는 데모로 보여 드려요.</p>}
      <header className="nh-hero">
        <p className="nh-kicker">2026. 12. 15 · 연말 시상식 AI 체험존</p>
        <h1>프로그램을 직접 해 보고<br />골라 주세요</h1>
        <p className="nh-lead">AI 소믈리에 키오스크 2대와 포토부스 2대. 포토부스는 부스마다 관상 · 사주 · 손금 중 하나를 돌려요 — 셋 중 둘을 골라 주세요.</p>
        <ul className="nh-facts">
          <li><b>약 100명</b><span>운영 1시간 30분</span></li>
          <li><b>한 명 2분 안팎</b><span>입력은 짧게 · 기다림은 10초 안쪽</span></li>
          <li><b>11월 24일</b><span>와인 목록 · 포토부스 프로그램 확정</span></li>
        </ul>
      </header>

      <section className="nh-section">
        <div className="nh-section-head"><h2>AI 소믈리에 키오스크</h2><p>추천은 늘 아래 10병 중 한 병 — 직원이 번호를 보고 따라 드려요.</p></div>
        <ul className="nh-grid nh-grid--kiosk">
          {kiosk.map((d) => <Card key={d.key} demo={d} cleanKey={cleanKey} />)}
          <li className="nh-wines" aria-label="시음 와인 10병">
            <p className="nh-tag">시음 와인 10병 · 지금 제안 목록</p>
            <ol>{NH_WINES.map((w) => <li key={w.no}><b>{w.no}</b><span>{w.name}<small>{NH_KIND_LABEL[w.kind]} · {w.region}</small></span></li>)}</ol>
          </li>
        </ul>
      </section>

      <section className="nh-section">
        <div className="nh-section-head"><h2>포토부스 · 2027 정미년 새해 이야기</h2><p>사진 + 짧은 새해 이야기를 4×6 한 장으로 — 디자인 두 가지 중 손님이 골라 인화해요.</p></div>
        <ul className="nh-grid">{booth.map((d) => <Card key={d.key} demo={d} cleanKey={cleanKey} />)}</ul>
      </section>

      <section className="nh-section">
        <div className="nh-section-head"><h2>새로 만든 판 · 영상판</h2><p>위 프로그램과 같은 추천 · 이야기 · 결과물을, 영상 속 길잡이(소믈리에 · 도화서 화원)가 안내하는 판으로 만들었어요. 위 판 대신 고르실 수 있어요.</p></div>
        <ul className="nh-grid">{NH_NEW_DEMOS.map((d) => <Card key={d.key} demo={d} cleanKey={cleanKey} />)}</ul>
      </section>

      <section className="nh-section nh-notes">
        <h2><Camera size={20} />확인하실 때</h2>
        <ul>{(cleanKey ? NOTES.filter((n) => !n.includes('워터마크')) : NOTES).map((n) => <li key={n}>{n}</li>)}</ul>
      </section>

      <footer className="nh-foot">
        <DemoCleanLinkMaker paths={[['연말 시상식 AI 체험존 데모', '/booth-demo/nh/clean']]} />
      </footer>
    </main>
  )
}
