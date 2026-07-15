'use client';

// ============================================================
// 五章 — 용신(用神)의 계시 (UI-SPEC §5.6)
// 스크롤 연동 섹션 #2 (마지막 sticky): h-[220vh] + sticky child.
// 바인딩(§5.6 — 정확히 이 구간):
//   킥커+헤드라인 opacity [0.02, 0.1] → [0, 1]
//   arcProgress     [0.12, 0.42] → [0, 1]  (원호 재드로잉 + 유성 헤드)
//   igniteT         [0.42, 0.58] → [0, 1]  (노드 점화)
//   계시문          [0.6, 0.7]   → opacity 0→1, y 24→0
//   전환문          [0.74, 0.82] → opacity 0→1
//   섹션 침잠: ring scale [0.86, 1] → [1, 0.85], opacity → 0.3
// 점화 완료 시점(p≥0.58)에 용신 오행 대형 한자 + elementBridge 라인.
// reduced-motion: sticky 해제, 정적 최종값 렌더 (§5.10).
// ============================================================

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import {
  BrushDivider,
  ElementRing,
  VerticalLabel,
  ELEMENT_META,
} from '@/components/saju';

// 섹션 prop 계약 SSOT — sections/types.ts
import type { ChapterYongsinProps } from './types';

export type { ChapterYongsinProps };

const hasText = (s?: string | null): s is string => !!s && s.trim().length > 0;

export function ChapterYongsin({ result, targetType }: ChapterYongsinProps) {
  const t = useTranslations('saju.result');
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // --- §5.6 바인딩 (훅은 조건 없이 항상 생성 — 순서 고정) ---
  const headOpacity = useTransform(p, [0.02, 0.1], [0, 1]);
  const arc = useTransform(p, [0.12, 0.42], [0, 1]);
  const ignite = useTransform(p, [0.42, 0.58], [0, 1]);
  const nameOpacity = useTransform(p, [0.58, 0.66], [0, 1]);
  const revealOpacity = useTransform(p, [0.6, 0.7], [0, 1]);
  const revealY = useTransform(p, [0.6, 0.7], [24, 0]);
  const transitionOpacity = useTransform(p, [0.74, 0.82], [0, 1]);
  const ringScale = useTransform(p, [0.86, 1], [1, 0.85]);
  const ringOpacity = useTransform(p, [0.86, 1], [1, 0.3]);
  // reduced-motion 정적 최종값
  const staticOne = useMotionValue(1);

  // sticky 구간 클리핑 방지 — 콘텐츠(헤드라인+링 300+계시문 전문)가 뷰포트보다
  // 크면 비율 축소해 링 상단/하단이 overflow-hidden에 잘리지 않게 한다.
  const fitRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const update = () => {
      // 콘텐츠를 화면 정중앙에 유지하면서 위아래로 넉넉한 여백을 둔다.
      // 상하 각 ≈108px씩 예산에서 제외(헤더 가림 방지 + 시각적 숨 공간).
      const budget = window.innerHeight - 216;
      const h = el.scrollHeight;
      setFitScale(h > budget ? Math.max(0.62, budget / h) : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const chart = result.sajuChart;
  if (!chart) return null;

  const yongsinElement = chart.yongsin.element;
  const meta = ELEMENT_META[yongsinElement];
  const narrative = result.sajuAnalysis?.elementFlow?.yongsinNarrative;
  const bridge = result.sajuAnalysis?.scentDestiny?.elementBridge;
  const headline = targetType === 'idol' ? t('s5.headlineIdol') : t('s5.headline');

  const headerBlock = (
    <div className="text-center">
      <div className="mb-4 flex justify-center">
        <BrushDivider width={200} tone="gold" draw={!reduce} />
      </div>
      <p className="break-keep font-serif-kr text-[11px] font-semibold leading-[1.4] tracking-[0.14em] text-[#C9A227]">
        {t('s5.kicker')}
      </p>
      <h2 className="mt-3 break-keep font-serif-kr text-[34px] font-black leading-[1.35] tracking-[-0.01em] text-[#E9E2D0]">
        {headline}
      </h2>
    </div>
  );

  const nameBlock = (
    <div className="text-center">
      <span
        aria-hidden
        className="block font-serif-kr text-[72px] font-black leading-none"
        style={{ color: meta.textOnDark }}
      >
        {meta.hanja}
      </span>
      {hasText(bridge) && (
        <p className="mx-auto mt-4 max-w-[360px] break-keep font-serif-kr text-[24px] font-semibold leading-[1.45] text-[#E9E2D0]">
          {bridge}
        </p>
      )}
    </div>
  );

  const narrativeBlock = hasText(narrative) ? (
    <p className="mx-auto max-w-[380px] break-keep text-left font-serif-kr text-[15px] leading-[1.85] text-[rgba(233,226,208,0.88)]">
      {narrative}
    </p>
  ) : null;

  const transitionBlock = (
    <p className="saju-gold-foil break-keep text-center font-serif-kr text-[24px] font-semibold leading-[1.45]">
      {t('s5.transition')}
    </p>
  );

  // ---------- reduced-motion: 정적 렌더 (§5.10) ----------
  if (reduce) {
    return (
      <section className="relative px-6 py-32">
        <div className="absolute left-6 top-24">
          <VerticalLabel text="五章" tone="gold" />
        </div>
        <div className="flex flex-col items-center gap-8">
          {headerBlock}
          <ElementRing
            counts={chart.elementCount}
            yongsin={yongsinElement}
            size={300}
            drawOnView={false}
            progress={{ arc: staticOne, ignite: staticOne }}
          />
          {nameBlock}
          {narrativeBlock}
          {transitionBlock}
        </div>
      </section>
    );
  }

  // ---------- 스크롤 연동 sticky 렌더 ----------
  return (
    <section ref={ref} className="relative" style={{ height: '220vh' }}>
      <div className="sticky top-0 flex h-[100dvh] items-center justify-center overflow-hidden px-6">
        <motion.div className="absolute left-6 top-20" style={{ opacity: headOpacity }}>
          <VerticalLabel text="五章" tone="gold" />
        </motion.div>

        {/* 콘텐츠 래퍼 — 뷰포트 초과분만큼 비율 축소(클리핑 방지, 레이아웃 불변) */}
        <div
          ref={fitRef}
          className="flex flex-col items-center gap-5"
          style={{ transform: `scale(${fitScale})`, transformOrigin: 'center' }}
        >
          <motion.div style={{ opacity: headOpacity }}>{headerBlock}</motion.div>

          <motion.div style={{ scale: ringScale, opacity: ringOpacity }}>
            <ElementRing
              counts={chart.elementCount}
              yongsin={yongsinElement}
              size={300}
              drawOnView={false}
              progress={{ arc, ignite }}
            />
          </motion.div>

          <motion.div style={{ opacity: nameOpacity }}>{nameBlock}</motion.div>

          {narrativeBlock && (
            <motion.div style={{ opacity: revealOpacity, y: revealY }}>
              {narrativeBlock}
            </motion.div>
          )}

          <motion.div style={{ opacity: transitionOpacity }}>{transitionBlock}</motion.div>
        </div>
      </div>
    </section>
  );
}
