"use client"

import { forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import type { TodayScent } from '@/lib/today-scent/scents'

interface TodayScentCardProps {
  scent: TodayScent
  /** 캡처용 고정 너비 카드. 화면 표시는 부모에서 scale 처리 */
  dateLabel: string
}

/**
 * 공유용 "오늘의 향" 카드.
 * modern-screenshot 로 이미지화하기 위해 색상은 inline style,
 * 폰트는 시스템/이모지 기준으로 안전하게 구성.
 */
export const TodayScentCard = forwardRef<HTMLDivElement, TodayScentCardProps>(
  function TodayScentCard({ scent, dateLabel }, ref) {
    const t = useTranslations('todayScent')

    return (
      <div
        ref={ref}
        style={{
          width: 340,
          backgroundColor: scent.theme.bg,
          color: scent.theme.ink,
          border: '4px solid #0f172a',
          borderRadius: 28,
          boxShadow: '8px 8px 0px #0f172a',
          padding: 28,
          boxSizing: 'border-box',
          fontFamily:
            '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif',
        }}
      >
        {/* 상단 라벨 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            opacity: 0.7,
          }}
        >
          <span>AC&apos;SCENT</span>
          <span>{dateLabel}</span>
        </div>

        {/* 오늘의 향 타이틀 */}
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          {t('todayLabel')}
        </div>

        {/* 이모지 + 이름 */}
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 72, lineHeight: 1 }}>{scent.emoji}</div>
          <div
            style={{
              marginTop: 14,
              fontSize: 26,
              fontWeight: 900,
              lineHeight: 1.25,
            }}
          >
            {scent.name}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              fontWeight: 600,
              opacity: 0.75,
            }}
          >
            {scent.vibe}
          </div>
        </div>

        {/* 노트 */}
        <div
          style={{
            marginTop: 22,
            backgroundColor: 'rgba(255,255,255,0.55)',
            border: '2px solid #0f172a',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-around',
            textAlign: 'center',
          }}
        >
          {[
            { k: t('notesTop'), v: scent.notes.top },
            { k: t('notesMid'), v: scent.notes.mid },
            { k: t('notesBase'), v: scent.notes.base },
          ].map((n) => (
            <div key={n.k} style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }}>
                {n.k}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>
                {n.v}
              </div>
            </div>
          ))}
        </div>

        {/* 설명 */}
        <div
          style={{
            marginTop: 18,
            fontSize: 13,
            lineHeight: 1.6,
            fontWeight: 500,
            opacity: 0.9,
          }}
        >
          {scent.description}
        </div>

        {/* 키워드 */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          {scent.keywords.map((kw) => (
            <span
              key={kw}
              style={{
                backgroundColor: scent.theme.accent,
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              #{kw}
            </span>
          ))}
        </div>

        {/* 바이럴 푸터 */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 14,
            borderTop: '2px dashed rgba(15,23,42,0.3)',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            opacity: 0.65,
          }}
        >
          {t('cardFooter')}
        </div>
      </div>
    )
  }
)
