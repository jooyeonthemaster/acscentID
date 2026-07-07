'use client';

// ============================================================
// ProgressThread — 진행 표시: 금실과 매듭 (UI-SPEC §2.8)
// 실(絲)이 왼쪽에서 풀려나오고, 단계마다 매듭(結)이 지어진다.
// - 완료: 8px 금 원 / 현재: 11px 주사 원 + 한자 라벨 + 느린 펄스 / 미래: 6px 링
// - 위치: 위저드 Header 바로 아래, px-6 (호출부 책임), sticky 아님.
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { SAJU_EASE_INK, SAJU_GOLD_GRADIENT } from './tokens';

export interface ProgressThreadStep {
  key: string;
  hanja: string;
}

export interface ProgressThreadProps {
  /** 표시할 단계 (궁합 시 6개, 아니면 5개) */
  steps: ProgressThreadStep[];
  currentIndex: number;
  className?: string;
}

export function ProgressThread({ steps, currentIndex, className }: ProgressThreadProps) {
  const reduce = useReducedMotion();
  const n = steps.length;
  const fraction = n > 1 ? Math.min(Math.max(currentIndex, 0), n - 1) / (n - 1) : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={n}
      aria-valuenow={currentIndex + 1}
      aria-valuetext={steps[currentIndex] ? steps[currentIndex].hanja : undefined}
      className={`relative h-7 w-full ${className ?? ''}`}
    >
      <style>{`
        @keyframes saju-knot-pulse {
          0% { box-shadow: 0 0 0 0 rgba(192,57,43,0.25); }
          100% { box-shadow: 0 0 0 5px rgba(192,57,43,0); }
        }
      `}</style>

      {/* 미도달 구간 — 1px 헤어라인 */}
      <div
        aria-hidden
        className="absolute inset-x-0 bg-[#262A38]"
        style={{ top: 23.5, height: 1 }}
      />
      {/* 금실 — 현재 매듭까지 scaleX 채움 */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0"
        style={{
          top: 23.25,
          height: 1.5,
          background: SAJU_GOLD_GRADIENT,
          transformOrigin: 'left',
        }}
        initial={false}
        animate={{ scaleX: fraction }}
        transition={reduce ? { duration: 0 } : { duration: 0.8, ease: SAJU_EASE_INK }}
      />

      {/* 매듭들 */}
      {steps.map((step, i) => {
        const left = n > 1 ? `${(i / (n - 1)) * 100}%` : '0%';
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div
            key={step.key}
            aria-hidden
            className="absolute"
            style={{ left, top: 24, transform: 'translate(-50%, -50%)' }}
          >
            {isCurrent ? (
              <>
                <div
                  className="rounded-full bg-[#C0392B]"
                  style={{
                    width: 11,
                    height: 11,
                    animation: reduce ? undefined : 'saju-knot-pulse 2.4s ease-out infinite',
                  }}
                />
                {/* 현재 매듭 위 한자 라벨 (매듭 위 6px) */}
                <span
                  className="font-serif-kr absolute left-1/2 whitespace-nowrap"
                  style={{
                    transform: 'translateX(-50%)',
                    bottom: 17,
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: '#E9E2D0',
                  }}
                >
                  {step.hanja}
                </span>
              </>
            ) : isDone ? (
              <div className="rounded-full bg-[#C9A227]" style={{ width: 8, height: 8 }} />
            ) : (
              <div
                className="rounded-full border border-[#262A38] bg-transparent"
                style={{ width: 6, height: 6 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
