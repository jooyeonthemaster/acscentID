'use client';

// ============================================================
// GoldDust — 금 파티클 (UI-SPEC §2.7, 공통 프리미티브 §2)
// 입력 위저드 / 로딩 오버레이 / 결과 페이지가 이 단일 구현을 공유한다.
// - 기본 18개(최대 24), 크기 1.5~3.5px, 상승 9~16s, 사행 ±8~14px
// - 전부 CSS(saju-dust-rise / saju-dust-sway — globals.css §1.3)
// - 인덱스 기반 결정적 의사난수(seededRandom — PrintableReport 기법 재사용)
// - hydration 안전: 모든 인라인 스타일 수치를 toFixed 고정 포맷 문자열로 출력.
//   (Math.sin 결과는 엔진/버전 간 최하위 비트가 달라질 수 있어, 소수 자릿수를
//   고정하지 않으면 SSR/CSR 직렬화 문자열이 어긋나 hydration mismatch가 난다.)
// - prefers-reduced-motion: opacity 0.2 정적 표시
// ============================================================

import { useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';

export interface GoldDustProps {
  /** 기본 18, 최대 24 */
  count?: number;
  /** 위치 클래스 오버라이드 (기본 absolute inset-0) */
  className?: string;
}

/** 인덱스 기반 결정적 의사난수 (PrintableReport seededRandom 기법 재사용) */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const range = (seed: number, min: number, max: number) => min + seededRandom(seed) * (max - min);

export function GoldDust({ count = 18, className }: GoldDustProps) {
  const reduce = useReducedMotion();
  const n = Math.min(count, 24);

  return (
    <div
      aria-hidden
      className={`pointer-events-none overflow-hidden ${className ?? 'absolute inset-0'}`}
    >
      {Array.from({ length: n }, (_, i) => {
        // SSR/CSR 동일성 보장: 아래 값들은 전부 toFixed 고정 포맷으로만 DOM에 나간다.
        const size = range(i * 11 + 1, 1.5, 3.5).toFixed(2); // px
        const left = range(i * 11 + 2, 4, 96).toFixed(2); // %
        const bottom = range(i * 11 + 3, -5, 30).toFixed(2); // %
        const duration = range(i * 11 + 4, 9, 16).toFixed(2); // s
        const delay = range(i * 11 + 5, 0, 8).toFixed(2); // s
        const peak = range(i * 11 + 6, 0.25, 0.65).toFixed(2);
        const sway = (range(i * 11 + 7, 8, 14) * (i % 2 === 0 ? 1 : -1)).toFixed(1); // px
        const swayDuration = range(i * 11 + 8, 2.6, 4.2).toFixed(2); // s

        const outer: CSSProperties = {
          position: 'absolute',
          left: `${left}%`,
          bottom: `${bottom}%`,
          width: `${size}px`,
          height: `${size}px`,
          opacity: reduce ? 0.2 : 0,
          animation: reduce
            ? undefined
            : `saju-dust-rise ${duration}s linear ${delay}s infinite`,
          ['--dust-peak' as string]: peak,
        };
        const inner: CSSProperties = {
          display: 'block',
          width: '100%',
          height: '100%',
          borderRadius: '9999px',
          background: 'radial-gradient(circle, #F2DA8A 0%, #C9A227 60%, transparent 100%)',
          animation: reduce
            ? undefined
            : `saju-dust-sway ${swayDuration}s ease-in-out ${delay}s infinite`,
          ['--dust-sway' as string]: `${sway}px`,
        };

        return (
          <span key={i} style={outer}>
            <span style={inner} />
          </span>
        );
      })}
    </div>
  );
}
