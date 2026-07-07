'use client';

// ============================================================
// SajuBottle — 코드로 그린 향수병 (UI-SPEC §2.9, 終章 리빌 전용)
// persona 데이터에 병 이미지가 없으므로 순수 SVG로 그린다.
// phase: 'outline'(금실이 병을 그림, 2.2s) → 'filling'(액체 상승 1.4s,
//        어깨 오행 인장 stamped) → 'complete'(정적 + 액면 흔들림 유지)
// 향수명 텍스트는 SVG 밖 HTML 레이어가 겹쳐 올린다(§2.9 — 폰트/줄바꿈 제어).
// reduced-motion: 완성 상태 정적 렌더 (§5.7).
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';
import type { SajuElement } from '@/types/analysis';
import { ELEMENT_META, SAJU_EASE_BRUSH, SAJU_EASE_INK, SAJU_EASE_SETTLE } from './tokens';
import { GoldGradientDef } from './textures';

export type SajuBottlePhase = 'outline' | 'filling' | 'complete';

export interface SajuBottleProps {
  /** [persona.primaryColor, persona.secondaryColor] */
  liquidColors: [string, string];
  /** 용신 — 병 어깨의 오행 인장 색 */
  element: SajuElement;
  /** 리빌 단계 (§5.7 오케스트레이션은 호출부 책임) */
  phase: SajuBottlePhase;
  /** 렌더 폭 px (기본 200, 높이 = 폭 × 1.6) */
  size?: number;
  className?: string;
}

// 병신(body): 어깨가 둥근 직사각 플라콘 — SSOT path (§2.9)
const BODY_D =
  'M60,110 Q60,96 74,92 L86,88 L86,64 L114,64 L114,88 L126,92 Q140,96 140,110 L140,272 Q140,288 124,288 L76,288 Q60,288 60,272 Z';

// 액체 영역 (병신 내부 clip): y 92(어깨)~288(바닥), 72%까지 참
const LIQ_BOTTOM = 288;
const LIQ_TOP_FULL = 288 - (288 - 92) * 0.72; // ≈ 146.9

export function SajuBottle({
  liquidColors,
  element,
  phase,
  size = 200,
  className,
}: SajuBottleProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const goldId = `saju-bottle-gold-${uid}`;
  const capId = `saju-bottle-cap-${uid}`;
  const liquidId = `saju-bottle-liquid-${uid}`;
  const clipId = `saju-bottle-clip-${uid}`;

  // reduced-motion: 전 시퀀스 생략 — 완성 상태 정적 렌더 (§5.7)
  const p: SajuBottlePhase = reduce ? 'complete' : phase;
  const filled = p === 'filling' || p === 'complete';
  const sealOn = filled;
  const meta = ELEMENT_META[element];
  const sealGlyph = element === '금' ? '#1A1610' : '#F5EFE2';

  return (
    <div className={`relative ${className ?? ''}`} style={{ width: size, height: size * 1.6 }}>
      <style>{`
        @keyframes saju-liquid-sway {
          0%, 100% { transform: translateY(-1px); }
          50% { transform: translateY(1px); }
        }
      `}</style>

      <svg
        viewBox="0 0 200 320"
        width={size}
        height={size * 1.6}
        role="img"
        aria-label="사주로 처방된 향수병"
      >
        <defs>
          <GoldGradientDef id={goldId} />
          <GoldGradientDef id={capId} x1="0%" y1="0%" x2="0%" y2="100%" />
          <linearGradient id={liquidId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={liquidColors[0]} />
            <stop offset="100%" stopColor={liquidColors[1]} />
          </linearGradient>
          <clipPath id={clipId}>
            <path d={BODY_D} />
          </clipPath>
        </defs>

        {/* 액체 — 병신 내부 clip, 72%까지 상승 */}
        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            x={56}
            width={88}
            fill={`url(#${liquidId})`}
            opacity={0.85}
            initial={false}
            animate={
              filled
                ? { y: LIQ_TOP_FULL, height: LIQ_BOTTOM - LIQ_TOP_FULL }
                : { y: LIQ_BOTTOM, height: 0 }
            }
            transition={
              p === 'filling' ? { duration: 1.4, ease: SAJU_EASE_INK } : { duration: 0 }
            }
          />
          {/* 액면(液面) — 2px 밝은 라인 + 미세 사인파 흔들림 */}
          <g
            style={{
              animation:
                filled && !reduce ? 'saju-liquid-sway 3s ease-in-out infinite' : undefined,
            }}
          >
            <motion.line
              x1={62}
              x2={138}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
              initial={false}
              animate={
                filled
                  ? { y1: LIQ_TOP_FULL, y2: LIQ_TOP_FULL, opacity: 1 }
                  : { y1: LIQ_BOTTOM, y2: LIQ_BOTTOM, opacity: 0 }
              }
              transition={
                p === 'filling' ? { duration: 1.4, ease: SAJU_EASE_INK } : { duration: 0 }
              }
            />
          </g>
        </g>

        {/* 병신 외곽선 — 금실이 병을 그린다 (outline: pathLength 0→1, 2.2s easeBrush) */}
        <motion.path
          d={BODY_D}
          stroke={`url(#${goldId})`}
          strokeWidth={1.5}
          fill="rgba(245,239,226,0.04)"
          initial={p === 'outline' ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={
            p === 'outline' ? { duration: 2.2, ease: SAJU_EASE_BRUSH } : { duration: 0 }
          }
        />

        {/* 캡 + 목 링 — outline 1.5s부터 페이드 (§5.7: 1.8s 시점 = 리빌 0.3s + 1.5s) */}
        <motion.g
          initial={p === 'outline' ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={
            p === 'outline' ? { delay: 1.5, duration: 0.7 } : { duration: 0 }
          }
        >
          <rect x={82} y={28} width={36} height={36} rx={4} fill={`url(#${capId})`} />
          {/* 캡 상단 하이라이트 라인 */}
          <line x1={86} y1={32} x2={114} y2={32} stroke="#F2DA8A" strokeWidth={1} opacity={0.8} />
          {/* 목 링 — 금 헤어라인 */}
          <line x1={84} y1={60} x2={116} y2={60} stroke={`url(#${goldId})`} strokeWidth={1} />
        </motion.g>

        {/* 라벨지 — 병 중앙 크림 rect (향수명 HTML은 호출부가 겹쳐 올린다) */}
        <motion.rect
          x={70}
          y={150}
          width={60}
          height={80}
          rx={3}
          fill="#F5EFE2"
          initial={false}
          animate={{ opacity: filled ? 0.96 : 0 }}
          transition={
            p === 'filling' ? { delay: 1.2, duration: 0.6 } : { duration: 0 }
          }
        />

        {/* 오행 인장 — 병 어깨 중앙(y≈118), SealStamp sm 상당의 SVG 각인 */}
        <motion.g
          initial={false}
          animate={sealOn ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.15 }}
          transition={
            p === 'filling'
              ? { delay: 1.1, duration: 0.45, ease: SAJU_EASE_SETTLE }
              : { duration: 0 }
          }
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <g transform="rotate(-3 100 118)">
            <rect x={88} y={106} width={24} height={24} rx={4} fill={meta.fill} />
            <text
              x={100}
              y={118.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fontWeight={900}
              fill={sealGlyph}
              style={{ fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', serif" }}
            >
              {meta.hanja}
            </text>
          </g>
        </motion.g>
      </svg>
    </div>
  );
}
