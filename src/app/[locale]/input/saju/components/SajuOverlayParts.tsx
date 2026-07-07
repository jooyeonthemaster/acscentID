'use client'

// ============================================================
// SajuAnalyzingOverlay 보조 파트 (UI-SPEC §4.1/§4.4)
// 만세력 책 실루엣 SVG · 패 데이터 변환 · 진행 실 매듭 상수
// ============================================================

import type { SajuChartSnapshot, SajuPillarSnapshot } from '@/types/analysis'

// ---------- 타임라인 상수 ----------

/** 페이지 잔상 갑자·연도 (랜덤 아님 — 고정 3종, §4.1) */
export const GHOST_GANJI = ['1924 甲子', '1957 丁酉', '1998 戊寅'] as const

/** 패 플립 간격(초) — 년간 4.6s 시작, 0.9s 스태거 */
export const TILE_FLIP_INTERVAL = 0.9

/** 진행 실 매듭 위치(%) — 등간격 아님 (§4.4) */
export const KNOT_PCTS = [25, 60, 90] as const
/** 매듭 통과 근사 시각(ms) — 28s easeBrush 채움 기준 */
export const KNOT_TIMES_MS = [9000, 17000, 28000] as const

// ---------- 만세력 책 실루엣 (SVG, 전체 폭 260) ----------

export function BookSilhouette() {
    const gridLines = (offsetX: number) => {
        const lines: React.ReactNode[] = []
        for (let c = 1; c < 6; c += 1) {
            const x = offsetX + (126 / 6) * c
            lines.push(<line key={`c${offsetX}-${c}`} x1={x} y1={8} x2={x} y2={172} />)
        }
        for (let r = 1; r < 8; r += 1) {
            const y = 4 + (168 / 8) * r
            lines.push(<line key={`r${offsetX}-${r}`} x1={offsetX + 4} y1={y} x2={offsetX + 122} y2={y} />)
        }
        return lines
    }
    return (
        <svg width="260" height="180" viewBox="0 0 260 180" fill="none" aria-hidden>
            <rect x="2" y="4" width="126" height="172" rx="2" fill="#12141D" stroke="#262A38" />
            <rect x="132" y="4" width="126" height="172" rx="2" fill="#12141D" stroke="#262A38" />
            <line x1="130" y1="4" x2="130" y2="176" stroke="#C9A227" strokeOpacity="0.4" />
            <g stroke="#C9A227" strokeOpacity="0.25" strokeWidth="0.5">
                {gridLines(2)}
                {gridLines(132)}
            </g>
        </svg>
    )
}

// ---------- 패 데이터 ----------

export interface TileDatum {
    key: string
    hanja: string
    reading: string
    element: SajuPillarSnapshot['ganElement']
    /** 플립 순서 인덱스 (년간0 년지1 월간2 … §2.1 고정 순서) */
    order: number
}

export function tilesOf(chart: SajuChartSnapshot): { known: TileDatum[]; unknownCount: number } {
    const cols: Array<['year' | 'month' | 'day' | 'hour', SajuPillarSnapshot | null]> = [
        ['year', chart.pillars.year],
        ['month', chart.pillars.month],
        ['day', chart.pillars.day],
        ['hour', chart.pillars.hour],
    ]
    const known: TileDatum[] = []
    let unknownCount = 0
    cols.forEach(([name, pillar], col) => {
        if (!pillar) {
            unknownCount = 2
            return
        }
        known.push({
            key: `${name}-gan`,
            hanja: pillar.ganHanja,
            reading: `${pillar.gan}${pillar.ganElement}`,
            element: pillar.ganElement,
            order: col * 2,
        })
        known.push({
            key: `${name}-ji`,
            hanja: pillar.jiHanja,
            reading: pillar.ji,
            element: pillar.jiElement,
            order: col * 2 + 1,
        })
    })
    return { known, unknownCount }
}
