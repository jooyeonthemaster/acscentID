'use client';

// ============================================================
// GanjiTile — 팔자 글자 패 (UI-SPEC §2.1)
// - 1:1.4 패 비율 (sm 40×56 / md 56×78 / lg 72×101)
// - 3D 플립: hidden(뒷면) → revealed, rotateY 180→0, 0.9s easeInk
//   착지 직후 scale [1.04→1] 0.25s easeSettle
// - 스태거 순서(고정): 년간→년지→월간→월지→일간→일지→시간→시지, 간격 0.15s
//   (flipDelay는 호출부가 SAJU_GANJI_FLIP_INTERVAL로 계산해 주입)
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import type { SajuElement } from '@/types/analysis';
import { ELEMENT_META, SAJU_EASE_INK, SAJU_EASE_SETTLE } from './tokens';

export type GanjiTileState = 'hidden' | 'revealed' | 'highlighted' | 'unknown';

export interface GanjiTileProps {
  /** '丙' */
  hanja: string;
  /** '병화' | '오' (한글 독음) */
  reading: string;
  element: SajuElement;
  /** 기본 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** 기본 'revealed' */
  state?: GanjiTileState;
  /** 초 단위 스태거 지연 */
  flipDelay?: number;
  /** 기본 true (다크 배경 위) */
  onDark?: boolean;
  className?: string;
}

const SIZES = {
  // unknown*: 시간모름 패 — §2.1의 워터마크 40px/독음 10px은 md 기준.
  // sm(40×56)은 그대로 쓰면 '미지(未知)'가 줄바꿈·세로 오버플로로 뭉개지므로 비례 축소.
  sm: { w: 40, h: 56, hanja: 24, reading: 9, unknownHanja: 26, unknownReading: 8 },
  md: { w: 56, h: 78, hanja: 34, reading: 10, unknownHanja: 40, unknownReading: 10 },
  lg: { w: 72, h: 101, hanja: 43, reading: 10, unknownHanja: 40, unknownReading: 10 },
} as const;

/** 뒷면 만세력 미니 격자 문양 (3×4 셀 + 중앙 원, stroke 0.75) */
function BackPattern({ w }: { w: number }) {
  return (
    <svg
      width={w * 0.6}
      height={w * 0.8}
      viewBox="0 0 30 40"
      fill="none"
      aria-hidden
      stroke="#C9A227"
      strokeOpacity={0.5}
      strokeWidth={0.75}
    >
      <rect x="0.5" y="0.5" width="29" height="39" />
      <line x1="10" y1="0.5" x2="10" y2="39.5" />
      <line x1="20" y1="0.5" x2="20" y2="39.5" />
      <line x1="0.5" y1="10" x2="29.5" y2="10" />
      <line x1="0.5" y1="20" x2="29.5" y2="20" />
      <line x1="0.5" y1="30" x2="29.5" y2="30" />
      <circle cx="15" cy="20" r="4.5" />
    </svg>
  );
}

export function GanjiTile({
  hanja,
  reading,
  element,
  size = 'md',
  state = 'revealed',
  flipDelay = 0,
  onDark = true,
  className,
}: GanjiTileProps) {
  const reduce = useReducedMotion();
  const s = SIZES[size];
  const meta = ELEMENT_META[element];
  const isUnknown = state === 'unknown';
  const isHighlighted = state === 'highlighted';
  const showFront = state !== 'hidden';

  // 처음부터 공개 상태로 마운트된 패는 플립하지 않는다(플립은 hidden→revealed 전환의 것)
  const [startedHidden] = useState(state === 'hidden');
  const willFlip = startedHidden && !reduce;

  const frontShadow = isHighlighted
    ? '0 0 0 1.5px #C9A227, 0 0 18px rgba(201,162,39,0.35)'
    : onDark
      ? '0 2px 10px rgba(0,0,0,0.35)'
      : '0 1px 4px rgba(26,22,16,0.12)';

  return (
    <div
      role="img"
      aria-label={isUnknown ? '시(時) 미지(未知)' : `${reading} ${hanja}`}
      className={`relative ${className ?? ''}`}
      style={{ width: s.w, height: s.h, perspective: 800 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={
          showFront
            ? willFlip
              ? { rotateY: 0, scale: [1, 1.04, 1] }
              : { rotateY: 0, scale: 1 }
            : { rotateY: 180, scale: 1 }
        }
        transition={
          showFront && willFlip
            ? {
                rotateY: { duration: 0.9, ease: SAJU_EASE_INK, delay: flipDelay },
                scale: { duration: 0.25, ease: SAJU_EASE_SETTLE, delay: flipDelay + 0.9 },
              }
            : { duration: 0 }
        }
      >
        {/* 앞면 — 한지 크림 지면 */}
        <div
          className="saju-hanji absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[6px] border border-[#D8CFBB]"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            boxShadow: frontShadow,
          }}
        >
          {/* 엘리먼트 액센트 바 3px (unknown은 회색 바) */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 rounded-t-[5px]"
            style={{ height: 3, background: isUnknown ? '#8B8578' : meta.fill }}
          />

          {isUnknown ? (
            <>
              <span
                aria-hidden
                className="font-serif-kr"
                style={{
                  fontSize: s.unknownHanja,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#1A1610',
                  opacity: 0.15,
                }}
              >
                時
              </span>
              <span
                className="font-serif-kr"
                style={{
                  fontSize: s.unknownReading,
                  fontWeight: 400,
                  lineHeight: 1.2,
                  color: '#A69F8D',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                미지(未知)
              </span>
            </>
          ) : (
            <>
              <span
                className="font-serif-kr"
                style={{ fontSize: s.hanja, fontWeight: 900, lineHeight: 1, color: '#1A1610' }}
              >
                {hanja}
              </span>
              <span
                className="font-serif-kr break-keep"
                style={{
                  fontSize: s.reading,
                  fontWeight: 400,
                  lineHeight: 1.2,
                  color: '#5C564A',
                  marginTop: 2,
                }}
              >
                {reading}
              </span>
            </>
          )}

          {/* 일주 강조 — 좌상단 금 코너 브래킷 */}
          {isHighlighted && (
            <svg
              aria-hidden
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className="absolute left-1 top-1.5"
            >
              <path d="M1 7 L1 1" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M1 1 L7 1" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* 뒷면 — 먹색 지면 + 만세력 미니 격자 */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[6px] border border-[#262A38] bg-[#14161F]"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <BackPattern w={s.w} />
        </div>
      </motion.div>
    </div>
  );
}
