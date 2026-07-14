'use client';

// ============================================================
// 운문(雲紋) — 실물 상품(클리커 디퓨저) 아트의 층층 구름 모티프
// 먹색 밤하늘 위 뭉게구름 실루엣 + 옅은 금 윤곽 + 나선 소용돌이 + 보름달.
// ★ 되돌리기: SAJU_CLOUDS 플래그를 false로 두면 모든 운문 렌더가 사라진다.
//   (SajuResultPage의 SAJU_SECTION_BANDS와 같은 방식의 원클릭 토글)
// 규약: 정적 우선(드리프트는 CSS 저속 1겹만), prefers-reduced-motion 정지,
//   본문 위에는 저대비(윤곽 opacity ≤ 0.4)로만 깐다.
// ============================================================

import type { CSSProperties } from 'react';

/** 운문 전체 on/off 토글 — false면 모든 Cloud* 컴포넌트가 null을 반환한다 */
export const SAJU_CLOUDS = true;

// ---------- 패스 데이터 (viewBox 기준 — canvas Path2D에서도 재사용) ----------

/**
 * 구름 한 덩이(puff cluster) — viewBox 0 0 200 110
 * 바닥이 평평한 뭉게구름: 좌우 어깨 + 중앙 봉우리 3개의 둥근 능선.
 */
export const CLOUD_PUFF_D =
  'M0,110 L0,86 C0,68 12,56 30,55 C32,36 48,24 66,28 C74,10 98,4 114,16 ' +
  'C130,6 152,10 160,26 C178,26 192,40 192,58 C197,64 200,74 200,84 L200,110 Z';

/** 퍼프 윤곽선 전용(열린 패스) — 밑변/옆변 없이 위 능선만 긋는다 */
export const CLOUD_PUFF_TOP_D =
  'M0,86 C0,68 12,56 30,55 C32,36 48,24 66,28 C74,10 98,4 114,16 ' +
  'C130,6 152,10 160,26 C178,26 192,40 192,58 C197,64 200,74 200,84';

/** 나선 소용돌이(구름 결) — puff 좌표계 기준 스트로크 전용 */
export const CLOUD_CURL_DS = [
  // 왼쪽 어깨의 큰 소용돌이
  'M38,80 C36,66 46,56 60,58 C72,60 78,70 74,80 C70,88 60,90 54,84 C50,79 52,72 58,71 C63,70 66,74 64,78',
  // 오른쪽의 작은 소용돌이
  'M138,84 C138,72 148,66 158,70 C166,73 168,82 162,87 C157,91 150,89 149,84 C148,80 152,77 155,79',
] as const;

/**
 * 구름 능선(ridge) — viewBox 0 0 800 140. 화면 폭을 덮는 연속 능선.
 * 봉우리 높낮이를 불규칙하게 두어 상품 아트의 겹구름 느낌을 낸다.
 */
export const CLOUD_RIDGE_D =
  'M0,140 L0,74 C14,74 22,60 38,60 C46,42 70,36 84,48 C96,30 124,28 138,44 ' +
  'C156,40 170,52 172,66 C190,66 200,78 202,90 C216,88 226,94 230,104 ' +
  'C244,80 246,58 268,52 C282,30 312,26 330,42 C348,26 378,30 388,50 C406,48 420,60 422,76 ' +
  'C438,74 450,84 452,96 C464,78 470,64 490,60 C498,42 522,36 538,46 C552,28 582,28 596,46 ' +
  'C614,42 630,52 634,68 C652,66 664,76 666,90 C680,86 690,92 694,100 ' +
  'C702,80 716,68 736,68 C748,54 772,52 784,64 C792,68 798,76 800,86 L800,140 Z';

/** 능선 윤곽선 전용(열린 패스) */
export const CLOUD_RIDGE_TOP_D =
  'M0,74 C14,74 22,60 38,60 C46,42 70,36 84,48 C96,30 124,28 138,44 ' +
  'C156,40 170,52 172,66 C190,66 200,78 202,90 C216,88 226,94 230,104 ' +
  'C244,80 246,58 268,52 C282,30 312,26 330,42 C348,26 378,30 388,50 C406,48 420,60 422,76 ' +
  'C438,74 450,84 452,96 C464,78 470,64 490,60 C498,42 522,36 538,46 C552,28 582,28 596,46 ' +
  'C614,42 630,52 634,68 C652,66 664,76 666,90 C680,86 690,92 694,100 ' +
  'C702,80 716,68 736,68 C748,54 772,52 784,64 C792,68 798,76 800,86';

/** 능선 위 소용돌이들 — ridge 좌표계 기준 */
export const RIDGE_CURL_DS = [
  'M96,96 C94,82 104,72 118,74 C130,76 136,86 132,96 C128,104 118,106 112,100 C108,95 110,88 116,87',
  'M320,84 C318,70 328,60 342,62 C354,64 360,74 356,84 C352,92 342,94 336,88 C332,83 334,76 340,75',
  'M540,90 C538,76 548,66 562,68 C574,70 580,80 576,90 C572,98 562,100 556,94 C552,89 554,82 560,81',
  'M726,102 C724,90 733,82 744,84 C753,86 757,94 753,101 C749,107 741,108 737,103',
] as const;

// ---------- 톤 프리셋 ----------

export type CloudTone = 'ink' | 'raised' | 'blue' | 'cream';

/** 지면별 채움/윤곽 색 (팔레트 SSOT: tokens.ts / globals.css --saju-*) */
const TONE: Record<CloudTone, { fill: string; stroke: string }> = {
  /** 페이지 먹색 실루엣 — 섹션 경계용 */
  ink: { fill: '#0C0E16', stroke: '#C9A227' },
  /** 한 톤 밝은 먹색 — 배경 깊이용 */
  raised: { fill: '#171C28', stroke: '#C9A227' },
  /** 청묵 구름 — 상품 아트의 남색 구름 */
  blue: { fill: '#1B2334', stroke: '#C9A227' },
  /** 크림 지면 위 먹 워터마크 */
  cream: { fill: '#1A1610', stroke: '#1A1610' },
};

// ---------- 컴포넌트 ----------

export interface CloudRidgeProps {
  tone?: CloudTone;
  /** 위 경계에 매달리게(상하 반전) */
  flip?: boolean;
  /** 금 윤곽선 불투명도 (0이면 윤곽 없음) */
  strokeOpacity?: number;
  /** 채움 불투명도 */
  fillOpacity?: number;
  /** 소용돌이 결 표시 */
  curls?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** 구름 능선 — 화면 폭을 덮는 연속 실루엣 (섹션 경계/배경 하단용) */
export function CloudRidge({
  tone = 'ink',
  flip = false,
  strokeOpacity = 0.3,
  fillOpacity = 1,
  curls = true,
  className,
  style,
}: CloudRidgeProps) {
  if (!SAJU_CLOUDS) return null;
  const c = TONE[tone];
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 140"
      preserveAspectRatio="none"
      className={`pointer-events-none block w-full ${className ?? ''}`}
      style={{ transform: flip ? 'scaleY(-1)' : undefined, ...style }}
    >
      <path d={CLOUD_RIDGE_D} fill={c.fill} fillOpacity={fillOpacity} />
      <path
        d={CLOUD_RIDGE_TOP_D}
        fill="none"
        stroke={c.stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      {curls &&
        RIDGE_CURL_DS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={c.stroke}
            strokeOpacity={strokeOpacity * 0.8}
            strokeWidth={1}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
    </svg>
  );
}

export interface CloudPuffProps {
  tone?: CloudTone;
  /** 렌더 폭(px) — 비율 200:110 고정 */
  width?: number;
  strokeOpacity?: number;
  fillOpacity?: number;
  /** 좌우 반전 */
  flip?: boolean;
  curls?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** 구름 한 덩이 — 포인트 장식(병 받침/워터마크/로딩)용 */
export function CloudPuff({
  tone = 'blue',
  width = 160,
  strokeOpacity = 0.35,
  fillOpacity = 1,
  flip = false,
  curls = true,
  className,
  style,
}: CloudPuffProps) {
  if (!SAJU_CLOUDS) return null;
  const c = TONE[tone];
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 110"
      width={width}
      height={(width * 110) / 200}
      className={`pointer-events-none block ${className ?? ''}`}
      style={{ transform: flip ? 'scaleX(-1)' : undefined, ...style }}
    >
      <path d={CLOUD_PUFF_D} fill={c.fill} fillOpacity={fillOpacity} />
      <path
        d={CLOUD_PUFF_TOP_D}
        fill="none"
        stroke={c.stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      {curls &&
        CLOUD_CURL_DS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={c.stroke}
            strokeOpacity={strokeOpacity * 0.8}
            strokeWidth={1}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
    </svg>
  );
}

export interface CloudMoonProps {
  /** 지름(px) */
  size?: number;
  /** 달빛 글로우 반경 배수 (지름 대비) */
  glow?: number;
  className?: string;
  style?: CSSProperties;
}

/** 보름달 — 은은한 달무리 글로우 포함 */
export function CloudMoon({ size = 120, glow = 1.9, className, style }: CloudMoonProps) {
  if (!SAJU_CLOUDS) return null;
  const halo = size * glow;
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative ${className ?? ''}`}
      style={{ width: halo, height: halo, ...style }}
    >
      {/* 달무리 */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(240,240,250,0.16) 0%, rgba(240,240,250,0.05) 45%, transparent 70%)',
        }}
      />
      {/* 달 본체 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle at 42% 38%, #FBFAFF 0%, #EEEDF6 55%, #D9D8E6 100%)',
          boxShadow: '0 0 24px rgba(240,240,250,0.28)',
        }}
      />
    </div>
  );
}

export interface CloudDriftProps extends CloudPuffProps {
  /** 좌우 왕복 진폭(px) */
  sway?: number;
  /** 왕복 주기(s) — 규약상 12s 이상 저속 */
  duration?: number;
  delay?: number;
}

/** 부유 구름 — CSS 저속 드리프트 (globals.css saju-cloud-drift, reduced-motion 정지) */
export function CloudDrift({ sway = 12, duration = 14, delay = 0, style, ...rest }: CloudDriftProps) {
  if (!SAJU_CLOUDS) return null;
  return (
    <div
      aria-hidden
      className="saju-cloud-drift pointer-events-none"
      style={{
        ['--cloud-sway' as string]: `${sway}px`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        ...style,
      }}
    >
      <CloudPuff {...rest} />
    </div>
  );
}
