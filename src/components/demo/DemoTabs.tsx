import Link from 'next/link'
import { DEMO_CLEAN_KEY_PARAM } from '@/lib/demo-clean'
import './demo-tabs.css'

// 영업용 데모 랜딩 맨 위 탭(2026-11-18 사용자 지시: 데모 사이트의 여러 버전을 눌러 오가게) — 키오스크 · 포토부스.
// 2026-11-25: 따로 있던 「키오스크 영상판」 탭을 없애고 영상판 카드를 각 랜딩의 기본판 옆에 나란히(/kiosk-demo/video 는 /kiosk-demo 로 넘긴다).
// 서명 링크(?k=, 워터마크 없는 판)로 들어왔으면 탭도 같은 서명으로 워터마크 없는 판을 연다.
// 특정 고객 데모(/booth-demo/nh · /booth-demo/funground)에는 달지 않는다 — 그 고객에게 다른 데모가 보이지 않게.

export type DemoTabId = 'kiosk' | 'booth'

const TABS: { id: DemoTabId; label: string; sub: string; href: string; clean: string }[] = [
  { id: 'kiosk', label: '키오스크', sub: '세로 화면 · 영상판', href: '/kiosk-demo', clean: '/kiosk-demo/clean' },
  { id: 'booth', label: '포토부스', sub: '가로 화면 · AI 사진 · 영상판', href: '/booth-demo', clean: '/booth-demo/clean' },
]

export function DemoTabs({ current, cleanKey }: { current: DemoTabId; cleanKey?: string }) {
  return (
    <nav className="dt" aria-label="데모 종류">
      <div className="dt-in">
        {TABS.map((tab) => (
          <Link key={tab.id} className="dt-tab" aria-current={tab.id === current ? 'page' : undefined}
            href={cleanKey ? `${tab.clean}?${DEMO_CLEAN_KEY_PARAM}=${encodeURIComponent(cleanKey)}` : tab.href}>
            <b>{tab.label}</b><span>{tab.sub}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
