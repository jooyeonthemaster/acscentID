'use client'

import { forwardRef } from 'react'

/**
 * 매장 비치용 A5 택배 접수 안내 배너 (인쇄 원본).
 *
 * 캡처 기준 크기는 437 × 620px — A5(148 × 210mm) 비율이며 scale 4로 구우면
 * 정확히 1748 × 2480px(300DPI)이 된다. 화면 미리보기는 부모에서 축소한다.
 *
 * modern-screenshot 로 이미지화하므로:
 *  - 색상은 CSS 변수(--ink 등) 대신 hex 인라인 스타일로 고정한다 (클론 시 변수 유실 방지)
 *  - QR은 외부 API 이미지가 아닌 data URL 이어야 한다 (CORS 차단 방지)
 */

export const BANNER_WIDTH = 437
export const BANNER_HEIGHT = 620
/** 437 × 620 → 1748 × 2480 (A5 300DPI) */
export const BANNER_PRINT_SCALE = 4

const INK = '#191918'
const LINE = '#D9D9D3'

const SANS_STACK =
  'var(--font-wanted), "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'

interface ShipQrBannerProps {
  /** QRCode.toDataURL 로 만든 data URL */
  qrDataUrl: string
}

export const ShipQrBanner = forwardRef<HTMLDivElement, ShipQrBannerProps>(
  function ShipQrBanner({ qrDataUrl }, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: BANNER_WIDTH,
          height: BANNER_HEIGHT,
          background: '#FFFFFF',
          color: INK,
          fontFamily: SANS_STACK,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '42px 28px 42px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* 재단선 안쪽 프레임 */}
        <div
          style={{
            position: 'absolute',
            inset: 14,
            border: `1px solid ${LINE}`,
            pointerEvents: 'none',
          }}
        />

        {/* 워드마크 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo/acscent-wordmark-ink.png"
          alt="AC'SCENT"
          style={{ height: 14, width: 'auto', display: 'block' }}
        />

        {/* 제목 — 손님이 가장 먼저 읽어야 하는 안내 문구 */}
        <p
          style={{
            marginTop: 29,
            marginBottom: 0,
            fontSize: 29,
            lineHeight: 1.35,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          받으실 주소를 입력해 주세요
        </p>

        {/* QR — 제목 바로 아래 */}
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* 패딩 24px(인쇄 시 약 8mm)은 QR 규격상 필요한 여백 4모듈 이상을 확보한다 */}
          <div
            style={{
              padding: 26,
              border: `1px solid ${INK}`,
              background: '#FFFFFF',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="택배 접수 QR"
              style={{ width: 255, height: 255, display: 'block' }}
            />
          </div>
          <p style={{ marginTop: 24, fontSize: 15, fontWeight: 800 }}>
            카메라로 QR을 스캔해주세요
          </p>
        </div>
      </div>
    )
  }
)
