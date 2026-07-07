'use client';

// ============================================================
// BrushDivider — 붓획 구분선 (UI-SPEC §2.4)
// 갈필 획: 중심선 path(SSOT) 기준 두께 0.8→3.2→1.2px 변주 폐곡선을
// 모듈 로드 시 1회 생성. stroke가 아니라 fill로 그린 가변 굵기 획.
// 드로잉: clip 와이프(fill 획이므로 pathLength 대신), 1.2s easeBrush.
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';
import { SAJU_EASE_BRUSH, SAJU_VIEWPORT } from './tokens';
import { GoldGradientDef } from './textures';

export interface BrushDividerProps {
  /** 120~280, 기본 200 */
  width?: number;
  /** 중앙 한자 라벨 (예: '一章') — 있으면 획이 좌우로 갈라짐 */
  label?: string;
  /** 기본 gold(다크 위) */
  tone?: 'gold' | 'ink-on-cream';
  /** 뷰포트 진입 시 획 드로잉 재생 (기본 true) */
  draw?: boolean;
  className?: string;
}

// ---------- 갈필 획 path 생성 (모듈 스코프 1회) ----------

type Pt = { x: number; y: number };

// 중심선 SSOT: M2,6 C30,3.5 60,4.5 100,4 C140,3.5 172,5.5 198,4.6
const SEGMENTS: [Pt, Pt, Pt, Pt][] = [
  [
    { x: 2, y: 6 },
    { x: 30, y: 3.5 },
    { x: 60, y: 4.5 },
    { x: 100, y: 4 },
  ],
  [
    { x: 100, y: 4 },
    { x: 140, y: 3.5 },
    { x: 172, y: 5.5 },
    { x: 198, y: 4.6 },
  ],
];

function cubicPoint(s: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * s[0].x + 3 * u * u * t * s[1].x + 3 * u * t * t * s[2].x + t * t * t * s[3].x,
    y: u * u * u * s[0].y + 3 * u * u * t * s[1].y + 3 * u * t * t * s[2].y + t * t * t * s[3].y,
  };
}

function cubicTangent(s: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  return {
    x: 3 * u * u * (s[1].x - s[0].x) + 6 * u * t * (s[2].x - s[1].x) + 3 * t * t * (s[3].x - s[2].x),
    y: 3 * u * u * (s[1].y - s[0].y) + 6 * u * t * (s[2].y - s[1].y) + 3 * t * t * (s[3].y - s[2].y),
  };
}

function centerAt(t: number): { p: Pt; n: Pt } {
  const i = t < 0.5 ? 0 : 1;
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const p = cubicPoint(SEGMENTS[i], local);
  const tan = cubicTangent(SEGMENTS[i], local);
  const len = Math.hypot(tan.x, tan.y) || 1;
  return { p, n: { x: -tan.y / len, y: tan.x / len } };
}

// 반두께 프로필 (전체 두께 0.8→3.2→1.2, 시작·끝은 뾰족하게)
const HALF_WIDTH_KEYS: [number, number][] = [
  [0, 0.02],
  [0.06, 0.4],
  [0.3, 1.2],
  [0.45, 1.6],
  [0.62, 1.3],
  [0.78, 1.0],
  [0.92, 0.6],
  [1, 0.02],
];

function halfWidth(t: number): number {
  for (let k = 0; k < HALF_WIDTH_KEYS.length - 1; k++) {
    const [t0, w0] = HALF_WIDTH_KEYS[k];
    const [t1, w1] = HALF_WIDTH_KEYS[k + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1);
      return w0 + (w1 - w0) * f;
    }
  }
  return 0.02;
}

function fmt(p: Pt): string {
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

function buildBrushPath(): string {
  const N = 48;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const { p, n } = centerAt(t);
    const w = halfWidth(t);
    top.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    bot.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  }
  const main = `M${fmt(top[0])} L${top.slice(1).map(fmt).join(' L')} L${bot
    .reverse()
    .map(fmt)
    .join(' L')} Z`;

  // 65% 지점 미세 갈라짐 틈 1개 — evenodd 차감 쐐기(꼬리 쪽으로 벌어짐)
  const M = 6;
  const gTop: Pt[] = [];
  const gBot: Pt[] = [];
  for (let j = 0; j <= M; j++) {
    const t = 0.62 + (0.09 * j) / M;
    const { p, n } = centerAt(t);
    const w = halfWidth(t);
    const centerOff = 0.365 * w;
    const half = 0.185 * w * (j / M);
    gTop.push({ x: p.x + n.x * (centerOff + half), y: p.y + n.y * (centerOff + half) });
    gBot.push({ x: p.x + n.x * (centerOff - half), y: p.y + n.y * (centerOff - half) });
  }
  const gap = `M${fmt(gTop[0])} L${gTop.slice(1).map(fmt).join(' L')} L${gBot
    .reverse()
    .map(fmt)
    .join(' L')} Z`;

  return `${main} ${gap}`;
}

const BRUSH_PATH_D = buildBrushPath();

// ---------- 컴포넌트 ----------

export function BrushDivider({
  width = 200,
  label,
  tone = 'gold',
  draw = true,
  className,
}: BrushDividerProps) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();

  const renderStroke = (w: number, key: string) => {
    const gradId = `saju-brush-${uid}-${key}`;
    return (
      <svg
        width={w}
        height={w / 20}
        viewBox="0 0 200 10"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        {tone === 'gold' && (
          <defs>
            <GoldGradientDef id={gradId} />
          </defs>
        )}
        <path
          d={BRUSH_PATH_D}
          fill={tone === 'gold' ? `url(#${gradId})` : '#1A1610'}
          opacity={tone === 'gold' ? 0.85 : 0.8}
          fillRule="evenodd"
        />
      </svg>
    );
  };

  const wipeProps =
    draw && !reduce
      ? {
          initial: { clipPath: 'inset(0 100% 0 0)' },
          whileInView: { clipPath: 'inset(0 0 0 0)' },
          viewport: SAJU_VIEWPORT,
          transition: { duration: 1.2, ease: SAJU_EASE_BRUSH },
        }
      : {};

  return (
    <motion.div
      role="separator"
      className={`inline-flex items-center justify-center gap-3 ${className ?? ''}`}
      {...wipeProps}
    >
      {label ? (
        <>
          {renderStroke(width * 0.4, 'l')}
          <span
            className="font-serif-kr break-keep"
            style={{
              fontSize: 13,
              lineHeight: 1.2,
              fontWeight: 900,
              letterSpacing: '0.35em',
              color: tone === 'gold' ? '#C9A227' : '#1A1610',
            }}
          >
            {label}
          </span>
          {renderStroke(width * 0.4, 'r')}
        </>
      ) : (
        renderStroke(width, 'c')
      )}
    </motion.div>
  );
}
