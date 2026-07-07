'use client';

// ============================================================
// SealStamp — 낙관(도장) (UI-SPEC §2.3)
// - 1~2자: 세로 스택 / 3~4자: 2×2 전통 독법(1→우상, 2→우하, 3→좌상, 4→좌하)
// - 찍힘: scale 1.15→1.0 + opacity 0→1, 0.45s easeSettle. bounce 금지.
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { SAJU_EASE_SETTLE } from './tokens';

export interface SealStampProps {
  /** 1~4 한자 ('命' | '合' | '命香' | '用神') */
  chars: string;
  /** 36 | 48 | 64 | 96 px */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'cinnabar' | 'ink' | 'outline';
  /** false→true 전환 시 찍힘 애니메이션. 미지정 시 정적 표시 */
  stamped?: boolean;
  /** 기울기(deg), 기본 -3 */
  rotate?: number;
  /** 모서리 마모 노치 (기본 false — 과하면 뺀다) */
  worn?: boolean;
  className?: string;
}

const SIZE_PX = { sm: 36, md: 48, lg: 64, xl: 96 } as const;

/** 4개 변 1px 투명 노치(x/y 20%, 65% 지점 고정 배치) — border-radius와 교집합 클립 */
const WORN_CLIP =
  'polygon(0% 0%, 19% 0%, 20% 1.5%, 21% 0%, 64% 0%, 65% 1.5%, 66% 0%, 100% 0%, 100% 19%, 98.5% 20%, 100% 21%, 100% 64%, 98.5% 65%, 100% 66%, 100% 100%, 81% 100%, 80% 98.5%, 79% 100%, 36% 100%, 35% 98.5%, 34% 100%, 0% 100%, 0% 81%, 1.5% 80%, 0% 79%, 0% 36%, 1.5% 35%, 0% 34%)';

// 2×2 전통 독법 배치 (index → [col, row])
const GRID_POS: Array<[number, number]> = [
  [2, 1], // 1 → 우상
  [2, 2], // 2 → 우하
  [1, 1], // 3 → 좌상
  [1, 2], // 4 → 좌하
];

export function SealStamp({
  chars,
  size = 'md',
  tone = 'cinnabar',
  stamped,
  rotate = -3,
  worn = false,
  className,
}: SealStampProps) {
  const reduce = useReducedMotion();
  const px = SIZE_PX[size];
  const glyphs = Array.from(chars).slice(0, 4);
  const fontSize = px * (glyphs.length === 1 ? 0.56 : 0.44);

  const toneStyle: CSSProperties =
    tone === 'cinnabar'
      ? {
          background: '#B03325', // 주사 도장밥 — cinnabar보다 한 단계 깊음
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.25)',
          color: '#F5EFE2',
        }
      : tone === 'ink'
        ? { background: '#1A1610', color: '#F5EFE2' }
        : { background: 'transparent', border: '1.5px solid currentColor', color: 'currentColor' };

  // stamped 미지정 = 정적 표시 / false = 찍히기 전(비표시) / true = 찍힘
  const mode = stamped === undefined ? 'static' : stamped ? 'in' : 'out';

  return (
    <motion.div
      role="img"
      aria-label={chars}
      className={`relative font-serif-kr select-none ${className ?? ''}`}
      style={{
        width: px,
        height: px,
        borderRadius: '18%',
        rotate,
        clipPath: worn ? WORN_CLIP : undefined,
        ...toneStyle,
      }}
      initial={false}
      animate={mode === 'out' ? { opacity: 0, scale: 1.15 } : { opacity: 1, scale: 1 }}
      transition={
        mode === 'static' || reduce
          ? { duration: 0 }
          : { duration: 0.45, ease: SAJU_EASE_SETTLE }
      }
    >
      {/* 인주 질감 하이라이트 (cinnabar 전용) */}
      {tone === 'cinnabar' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 'inherit',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), transparent 60%)',
          }}
        />
      )}
      {/* 착지 번짐 — 찍힘 직후 0.3s 페이드인 */}
      {mode === 'in' && tone === 'cinnabar' && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ borderRadius: 'inherit', boxShadow: '0 0 12px rgba(176,51,37,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        />
      )}

      {glyphs.length <= 2 ? (
        <div className="flex h-full w-full flex-col items-center justify-center">
          {glyphs.map((g, i) => (
            <span
              key={`${g}-${i}`}
              style={{ fontSize, fontWeight: 900, lineHeight: 1, width: glyphs.length === 2 ? '52%' : undefined, textAlign: 'center' }}
            >
              {g}
            </span>
          ))}
        </div>
      ) : (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 place-items-center">
          {glyphs.map((g, i) => (
            <span
              key={`${g}-${i}`}
              style={{
                fontSize,
                fontWeight: 900,
                lineHeight: 1,
                gridColumn: GRID_POS[i][0],
                gridRow: GRID_POS[i][1],
              }}
            >
              {g}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
