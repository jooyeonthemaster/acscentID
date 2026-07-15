'use client';

// ============================================================
// 序 — 밤하늘 (UI-SPEC §5.1, S0Prologue)
// - h-[240vh] 섹션 + sticky top-0 h-screen 자식. 스크롤 연동 섹션 #1(§5.10).
// - 별 36개(운명별 8 + 배경별 28)가 스크롤에 따라 팔자 글자로 응집.
// - useScroll/useTransform 구간은 §5.1 바인딩 값 그대로.
// - reduced-motion: sticky 해제 → 정적 렌더(헤드라인 + 팔자 패).
// ============================================================

import { useMemo, useRef } from 'react';
import {
  easeInOut,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { SajuElement } from '@/types/analysis';
import { CloudMoon, CloudRidge, GanjiTile } from '@/components/saju';
import type { PrologueStarsProps } from './types';

const TILE_W = 40; // GanjiTile sm
const TILE_H = 56;
const GAP = 12;

interface DestinyEntry {
  hanja: string;
  reading: string;
  element: SajuElement;
  slotX: number;
  slotY: number;
  scatterX: number;
  scatterY: number;
}

/** 인덱스 기반 결정적 의사난수 — SSR/CSR 동일 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** 배경별 1개 — opacity: [0,0.15]→[0,0.5] 후 [0.6,0.8]→[0.5,0.1] */
function BackgroundStar({ p, index }: { p: MotionValue<number>; index: number }) {
  const opacity = useTransform(p, [0, 0.15, 0.6, 0.8], [0, 0.5, 0.5, 0.1]);
  const left = 4 + seededRandom(index * 7 + 11) * 92;
  const top = 4 + seededRandom(index * 7 + 13) * 88;
  const size = 1.5 + seededRandom(index * 7 + 17) * 1;
  return (
    <motion.span
      aria-hidden
      className="absolute rounded-full"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: size,
        height: size,
        background: '#E9E2D0',
        filter: 'blur(0.5px)',
        opacity,
      }}
    />
  );
}

/** 운명별 1개 — 산개 좌표 → 슬롯 좌표로 응집, 글자 공개 구간에서 소멸 */
function DestinyStar({
  p,
  entry,
  index,
}: {
  p: MotionValue<number>;
  entry: DestinyEntry;
  index: number;
}) {
  const x = useTransform(p, [0.15, 0.55], [entry.scatterX, entry.slotX], { ease: easeInOut });
  const y = useTransform(p, [0.15, 0.55], [entry.scatterY, entry.slotY], { ease: easeInOut });
  const scale = useTransform(p, [0.15, 0.55], [1, 1.6]);
  const opacity = useTransform(p, [0.55 + index * 0.02, 0.62 + index * 0.02], [1, 0]);
  return (
    <motion.span
      aria-hidden
      className="absolute rounded-full"
      style={{
        left: -1.25,
        top: -1.25,
        width: 2.5,
        height: 2.5,
        background: '#E8C766',
        boxShadow: '0 0 4px #E8C766',
        x,
        y,
        scale,
        opacity,
      }}
    />
  );
}

/** 글자 공개 — 같은 구간에서 대응 운명별과 크로스페이드 */
function SlotTile({
  p,
  entry,
  index,
}: {
  p: MotionValue<number>;
  entry: DestinyEntry;
  index: number;
}) {
  const opacity = useTransform(p, [0.55 + index * 0.02, 0.62 + index * 0.02], [0, 1]);
  return (
    <motion.div
      className="absolute"
      style={{
        left: entry.slotX - TILE_W / 2,
        top: entry.slotY - TILE_H / 2,
        opacity,
      }}
    >
      <GanjiTile
        hanja={entry.hanja}
        reading={entry.reading}
        element={entry.element}
        size="sm"
        state="revealed"
      />
    </motion.div>
  );
}

export function PrologueStars({ result, targetType }: PrologueStarsProps) {
  const t = useTranslations('saju.result.s0');
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const chart = result.sajuChart;

  // 표기 열 순서(좌→우) = 時 日 月 年 (一章 만세력과 동일 — §5.2), 삼주면 日 月 年
  // 공개 순서(고정) = 년간→년지→월간→월지→일간→일지→(시간→시지)
  const entries = useMemo<DestinyEntry[]>(() => {
    const hasHour = Boolean(chart.pillars.hour);
    const displayCols: Array<'hour' | 'day' | 'month' | 'year'> = hasHour
      ? ['hour', 'day', 'month', 'year']
      : ['day', 'month', 'year'];
    const colX = (key: 'hour' | 'day' | 'month' | 'year') => {
      const ci = displayCols.indexOf(key);
      return (ci - (displayCols.length - 1) / 2) * (TILE_W + GAP);
    };
    const revealOrder: Array<'year' | 'month' | 'day' | 'hour'> = hasHour
      ? ['year', 'month', 'day', 'hour']
      : ['year', 'month', 'day'];

    const list: DestinyEntry[] = [];
    revealOrder.forEach((key) => {
      const pillar = chart.pillars[key];
      if (!pillar) return;
      const x = colX(key);
      const i0 = list.length;
      list.push({
        hanja: pillar.ganHanja,
        reading: `${pillar.gan}${pillar.ganElement}`,
        element: pillar.ganElement,
        slotX: x,
        slotY: -(TILE_H + GAP) / 2,
        scatterX: (seededRandom(i0 * 3 + 1) - 0.5) * 360,
        scatterY: (seededRandom(i0 * 3 + 2) - 0.5) * 520,
      });
      const i1 = list.length;
      list.push({
        hanja: pillar.jiHanja,
        reading: pillar.ji,
        element: pillar.jiElement,
        slotX: x,
        slotY: (TILE_H + GAP) / 2,
        scatterX: (seededRandom(i1 * 3 + 1) - 0.5) * 360,
        scatterY: (seededRandom(i1 * 3 + 2) - 0.5) * 520,
      });
    });
    return list;
  }, [chart]);

  // 헤드라인 — self/idol × 팔자/여섯 글자(삼주) 분기
  const headlineKey = chart.isThreePillar
    ? targetType === 'idol'
      ? 'headlineNoHourIdol'
      : 'headlineNoHour'
    : targetType === 'idol'
      ? 'headlineIdol'
      : 'headline';
  const headline = t(headlineKey);

  // §5.1 바인딩 (reduce 분기 전에 훅 호출 — 순서 고정)
  const containerOpacity = useTransform(p, [0.88, 1], [1, 0.4]);
  // 로드 직후(p=0)부터 헤드라인이 보이도록 — 이전엔 0.02부터 페이드인이라 첫 화면이 비어 보였다
  const headlineOpacity = useTransform(p, [0, 0.42, 0.52], [1, 1, 0]);
  const headlineY = useTransform(p, [0, 0.12], [8, 0]);
  const cueOpacity = useTransform(p, [0.06, 0.12], [1, 0]);

  // 운문 — 상품 아트(달+겹구름) 도입부: 스크롤이 진행되면 구름이 좌우로 걷히고
  // 달빛이 잦아들며 별(운명별)이 응집한다. (SAJU_CLOUDS — clouds.tsx 플래그로 일괄 토글)
  const moonOpacity = useTransform(p, [0, 0.35, 0.6], [0.95, 0.7, 0.15]);
  const cloudBackX = useTransform(p, [0.08, 0.55], ['0%', '-12%']);
  const cloudFrontX = useTransform(p, [0.08, 0.55], ['0%', '12%']);
  const cloudOpacity = useTransform(p, [0.08, 0.45, 0.6], [1, 0.8, 0]);

  // reduced-motion: 정적 최종 상태 (§5.10 — sticky 해제, 헤드라인은 접근성상 유지)
  if (reduce) {
    const hasHour = Boolean(chart.pillars.hour);
    const displayCols: Array<'hour' | 'day' | 'month' | 'year'> = hasHour
      ? ['hour', 'day', 'month', 'year']
      : ['day', 'month', 'year'];
    return (
      <section
        ref={ref}
        className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-12 overflow-hidden px-6 py-24"
      >
        {/* 운문 — 정적 렌더(reduced-motion): 하단 구름 능선만 */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
          <CloudRidge tone="raised" strokeOpacity={0.2} style={{ height: 96 }} />
        </div>
        <h2
          className="font-serif-kr break-keep text-center text-[#E9E2D0]"
          style={{ fontSize: 34, lineHeight: 1.35, fontWeight: 900, letterSpacing: '-0.01em', whiteSpace: 'pre-line' }}
        >
          {headline}
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            {displayCols.map((key) => {
              const pillar = chart.pillars[key];
              return pillar ? (
                <GanjiTile
                  key={`gan-${key}`}
                  hanja={pillar.ganHanja}
                  reading={`${pillar.gan}${pillar.ganElement}`}
                  element={pillar.ganElement}
                  size="sm"
                />
              ) : null;
            })}
          </div>
          <div className="flex gap-3">
            {displayCols.map((key) => {
              const pillar = chart.pillars[key];
              return pillar ? (
                <GanjiTile
                  key={`ji-${key}`}
                  hanja={pillar.jiHanja}
                  reading={pillar.ji}
                  element={pillar.jiElement}
                  size="sm"
                />
              ) : null;
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[240vh]">
      <motion.div
        className="sticky top-0 h-[100dvh] overflow-hidden"
        style={{ opacity: containerOpacity }}
      >
        {/* 운문 — 보름달 (헤드라인 위, 별보다 뒤) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[7%] -translate-x-1/2"
          style={{ opacity: moonOpacity }}
        >
          <CloudMoon size={92} />
        </motion.div>

        {/* 운문 — 하단 겹구름: 스크롤에 따라 좌우로 걷힌다 */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[200px]"
          style={{ opacity: cloudOpacity }}
        >
          <motion.div className="absolute -inset-x-[12%] bottom-9" style={{ x: cloudBackX }}>
            <CloudRidge tone="raised" strokeOpacity={0.22} style={{ height: 104 }} />
          </motion.div>
          <motion.div className="absolute -inset-x-[12%] bottom-0" style={{ x: cloudFrontX }}>
            <CloudRidge tone="blue" strokeOpacity={0.3} style={{ height: 118 }} />
          </motion.div>
        </motion.div>

        {/* 배경별 28개 */}
        <div className="absolute inset-0" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <BackgroundStar key={i} p={p} index={i} />
          ))}
        </div>

        {/* 중앙 앵커 — 운명별 + 글자 슬롯 */}
        <div className="absolute left-1/2 top-1/2" aria-hidden>
          {entries.map((entry, i) => (
            <DestinyStar key={`star-${i}`} p={p} entry={entry} index={i} />
          ))}
        </div>
        <div
          className="absolute left-1/2 top-1/2"
          role="img"
          aria-label={entries.map((e) => `${e.reading} ${e.hanja}`).join(', ')}
        >
          {entries.map((entry, i) => (
            <SlotTile key={`tile-${i}`} p={p} entry={entry} index={i} />
          ))}
        </div>

        {/* 헤드라인 */}
        <motion.div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-8"
          style={{ opacity: headlineOpacity, y: headlineY }}
        >
          <h2
            className="font-serif-kr break-keep text-center text-[#E9E2D0]"
            style={{ fontSize: 34, lineHeight: 1.35, fontWeight: 900, letterSpacing: '-0.01em', whiteSpace: 'pre-line' }}
          >
            {headline}
          </h2>
        </motion.div>

        {/* 스크롤 큐 — 하단 고정 액션 바(≈76px + safe-area)에 가려지지 않도록 그 위에 띄운다 */}
        <motion.div
          className="absolute inset-x-0 flex flex-col items-center gap-2"
          style={{
            opacity: cueOpacity,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
          }}
        >
          <span className="font-serif-kr text-[12px] leading-[1.6] text-[#A69F8D]">
            {t('scrollCue')}
          </span>
          <span
            aria-hidden
            className="block h-6 w-px"
            style={{ background: 'linear-gradient(180deg, #C9A227, transparent)' }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
