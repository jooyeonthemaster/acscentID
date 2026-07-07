'use client';

// ============================================================
// 一章 — 원국 命式 (UI-SPEC §5.2, S1Chart)
// - auto height, py-24. 만세력 명식표(HanjiCard) — 열 좌→우 = 時 日 月 年.
// - whileInView(once) 순차 플립: 년간→년지→월간→월지→일간→일지→시간→시지, 0.15s 간격.
// - 일주 열 highlighted + 열 상단 SealStamp(日) — 마지막 플립 완료 0.4s 후 찍힘.
// - 시간모름(삼주): 時柱 열 두 타일 unknown. 야자시(isJasiBirth)면 고지문.
// - 궁합: 명식표 2개 세로 스택(나 → 상대), 기둥 풀이는 나의 것만.
// ============================================================

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { SajuChartSnapshot, SajuPillarSnapshot } from '@/types/analysis';
import {
  BrushDivider,
  ELEMENT_META,
  GanjiTile,
  HanjiCard,
  SAJU_EASE_INK,
  SAJU_GANJI_FLIP_INTERVAL,
  SAJU_GOLD_GRADIENT,
  SAJU_VIEWPORT,
  SealStamp,
  VerticalLabel,
} from '@/components/saju';
import type { ChapterMyeongsikProps } from './types';

type PillarKey = 'year' | 'month' | 'day' | 'hour';

/** 화면 좌→우 = 時 日 月 年 (전통 만세력 우→좌 표기) */
const DISPLAY_COLS: PillarKey[] = ['hour', 'day', 'month', 'year'];
const COL_HANJA: Record<PillarKey, string> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '時柱',
};
const PILLAR_HANJA: Record<PillarKey, string> = { year: '年', month: '月', day: '日', hour: '時' };
/** 플립 스태거 순서(고정): 년간0 → 년지1 → 월간2 → 월지3 → 일간4 → 일지5 → 시간6 → 시지7 */
const FLIP_INDEX: Record<PillarKey, number> = { year: 0, month: 2, day: 4, hour: 6 };

/** 명식표 1장 — 궁합 모드에서 나/상대 각각 재사용 */
function MyeongsikCard({
  chart,
  animate,
  nameLabel,
  isPartner,
}: {
  chart: SajuChartSnapshot;
  /** true면 뷰포트 진입 시 순차 플립(나의 명식), false면 정적 공개(상대 명식) */
  animate: boolean;
  nameLabel?: string | null;
  isPartner?: boolean;
}) {
  const t = useTranslations('saju.result.s1');
  const reduce = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [sealStamped, setSealStamped] = useState(!animate);
  const shown = !animate || entered || Boolean(reduce);

  // 마지막 플립(시지 delay 7×0.15 + 플립 0.9 + 착지 0.25) 완료 0.4s 후 일주 낙관
  useEffect(() => {
    if (!animate || !shown || sealStamped) return;
    if (reduce) {
      setSealStamped(true);
      return;
    }
    const timer = setTimeout(() => setSealStamped(true), 2600);
    return () => clearTimeout(timer);
  }, [animate, shown, sealStamped, reduce]);

  return (
    <motion.div
      onViewportEnter={() => setEntered(true)}
      viewport={SAJU_VIEWPORT}
      initial={animate && !reduce ? { opacity: 0, y: 24 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
    >
      {nameLabel && (
        <div className="mb-2">
          <span
            className={`inline-block rounded-md border bg-[#12141D] px-3 py-1 font-serif-kr text-[12px] font-semibold text-[#E9E2D0] ${
              isPartner ? 'border-[#C9A227]/40' : 'border-[#262A38]'
            }`}
          >
            {nameLabel}
          </span>
        </div>
      )}
      <HanjiCard padding="lg">
        <div
          className="grid items-center gap-x-2 gap-y-3"
          style={{ gridTemplateColumns: '18px repeat(4, minmax(0, 1fr))' }}
        >
          {/* 헤더 행 */}
          <div aria-hidden />
          {DISPLAY_COLS.map((key) => (
            <div key={`head-${key}`} className="flex flex-col items-center justify-end gap-1.5">
              {key === 'day' && (
                <SealStamp chars="日" size="sm" tone="cinnabar" stamped={animate ? sealStamped : undefined} />
              )}
              <span className="font-serif-kr text-[11px] font-semibold leading-none text-[#5C564A]">
                {COL_HANJA[key]}
              </span>
              <span className="font-serif-kr text-[9px] leading-none text-[#5C564A]">
                {t(`pillarLabels.${key}`)}
              </span>
            </div>
          ))}

          {/* 천간 행 */}
          <div className="flex items-center justify-center">
            <VerticalLabel text="天干" tone="ink" size={10} />
          </div>
          {DISPLAY_COLS.map((key) => {
            const pillar = chart.pillars[key];
            const unknown = key === 'hour' && !pillar;
            const state = !shown
              ? 'hidden'
              : unknown
                ? 'unknown'
                : key === 'day'
                  ? 'highlighted'
                  : 'revealed';
            return (
              <div key={`gan-${key}`} className="flex justify-center">
                <GanjiTile
                  hanja={pillar?.ganHanja ?? '時'}
                  reading={pillar ? `${pillar.gan}${pillar.ganElement}` : '미지(未知)'}
                  element={pillar?.ganElement ?? '토'}
                  size="md"
                  state={state}
                  flipDelay={FLIP_INDEX[key] * SAJU_GANJI_FLIP_INTERVAL}
                  onDark={false}
                />
              </div>
            );
          })}

          {/* 지지 행 */}
          <div className="flex items-center justify-center">
            <VerticalLabel text="地支" tone="ink" size={10} />
          </div>
          {DISPLAY_COLS.map((key) => {
            const pillar = chart.pillars[key];
            const unknown = key === 'hour' && !pillar;
            const state = !shown
              ? 'hidden'
              : unknown
                ? 'unknown'
                : key === 'day'
                  ? 'highlighted'
                  : 'revealed';
            return (
              <div key={`ji-${key}`} className="flex justify-center">
                <GanjiTile
                  hanja={pillar?.jiHanja ?? '時'}
                  reading={pillar?.ji ?? '미지(未知)'}
                  element={pillar?.jiElement ?? '토'}
                  size="md"
                  state={state}
                  flipDelay={(FLIP_INDEX[key] + 1) * SAJU_GANJI_FLIP_INTERVAL}
                  onDark={false}
                />
              </div>
            );
          })}
        </div>
      </HanjiCard>
    </motion.div>
  );
}

export function ChapterMyeongsik({ result, userName }: ChapterMyeongsikProps) {
  const t = useTranslations('saju.result.s1');
  const reduce = useReducedMotion();
  const chart = result.sajuChart;
  const compat = result.sajuCompatibility;
  const reading = result.sajuAnalysis.pillarsReading;

  const readingRows = (['year', 'month', 'day', 'hour'] as PillarKey[])
    .map((key) => ({ key, item: reading[key], pillar: chart.pillars[key] }))
    .filter(
      (row): row is { key: PillarKey; item: { title: string; meaning: string }; pillar: SajuPillarSnapshot } =>
        Boolean(row.item && row.pillar)
    );

  const fadeInView = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: SAJU_VIEWPORT,
          transition: { duration: 0.8, ease: SAJU_EASE_INK, delay },
        };

  return (
    <section className="relative px-6 py-24">
      {/* 장 도입 오너먼트 (§5.0) */}
      <div className="mb-3">
        <VerticalLabel text="一章" tone="gold" />
      </div>
      <div className="mb-10 flex justify-center">
        <BrushDivider width={200} draw={!reduce} />
      </div>

      {/* 킥커 + 헤드라인 */}
      <motion.div className="mb-10 text-center" {...fadeInView()}>
        <p
          className="font-serif-kr mb-3 text-[11px] font-semibold text-[#C9A227]"
          style={{ letterSpacing: '0.14em' }}
        >
          {t('kicker')}
        </p>
        <h2
          className="font-serif-kr break-keep text-[#E9E2D0]"
          style={{ fontSize: 34, lineHeight: 1.35, fontWeight: 900, letterSpacing: '-0.01em' }}
        >
          {t('headline')}
        </h2>
      </motion.div>

      {/* 명식표 — 궁합이면 나 → 상대 세로 스택 */}
      <div className="flex flex-col gap-8">
        <MyeongsikCard chart={chart} animate nameLabel={compat ? userName : null} />
        {compat && (
          <MyeongsikCard
            chart={compat.partnerChart}
            animate={false}
            nameLabel={compat.partnerName}
            isPartner
          />
        )}
      </div>

      {/* 야자시 고지 */}
      {chart.isJasiBirth && (
        <motion.div className="mt-5 flex gap-3" {...fadeInView()}>
          <span
            aria-hidden
            className="w-[2px] shrink-0 self-stretch"
            style={{ background: SAJU_GOLD_GRADIENT }}
          />
          <p className="font-serif-kr break-keep text-[12px] leading-[1.6] text-[#A69F8D]">
            {t('jasiNotice')}
          </p>
        </motion.div>
      )}

      {/* 기둥 풀이 리스트 — 궁합이어도 나의 것만 (상대 풀이는 四章에서 관계 관점으로) */}
      <div className="mt-12 flex flex-col gap-7">
        {readingRows.map(({ key, item, pillar }, i) => {
          const meta = ELEMENT_META[pillar.jiElement];
          return (
            <motion.div key={key} className="flex items-start gap-4" {...fadeInView(i * 0.15)}>
              <div
                aria-hidden
                className="font-serif-kr flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[15px] font-black"
                style={{ background: `${meta.fill}1A`, color: meta.textOnDark }}
              >
                {PILLAR_HANJA[key]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif-kr break-keep text-[16px] font-semibold leading-[1.6] text-[#E9E2D0]">
                  {item.title}
                </h3>
                <p className="font-serif-kr mt-1.5 break-keep text-[15px] leading-[1.85] text-[#A69F8D]">
                  {item.meaning}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
