'use client';

// ============================================================
// 二章 — 일간 日干 (UI-SPEC §5.3, S2DayMaster)
// - auto height, py-24, 중앙 정렬.
// - 대형 한자(dayMasterReading.hanja) 120px/900 + 금박 샤인(.saju-gold-foil),
//   whileInView opacity 0→1 / scale 1.15→1, 1.4s easeInk. 뒤에 방사형 은은광.
// - archetypeTitle → 오행·음양 칩 → natureMetaphor(여는 은유) → narrative 전문(문단 스태거).
// - 궁합: 상대 일간 미니 카드(HanjiCard md) + "두 중심이 四章에서 만납니다" 캡션.
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { SajuElement } from '@/types/analysis';
import {
  BrushDivider,
  ELEMENT_META,
  HanjiCard,
  SAJU_EASE_INK,
  SAJU_VIEWPORT,
  VerticalLabel,
} from '@/components/saju';
import type { ChapterIlganProps } from './types';

const ELEMENT_I18N_KEY: Record<SajuElement, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
};

export function ChapterIlgan({ result, targetType }: ChapterIlganProps) {
  const t = useTranslations('saju.result.s2');
  const tCommon = useTranslations('saju.common');
  const reduce = useReducedMotion();

  const chart = result.sajuChart;
  const reading = result.sajuAnalysis.dayMasterReading;
  const compat = result.sajuCompatibility;
  const meta = ELEMENT_META[chart.dayMaster.element];

  const paragraphs = reading.narrative
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

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
        <VerticalLabel text="二章" tone="gold" />
      </div>
      <div className="mb-10 flex justify-center">
        <BrushDivider width={200} draw={!reduce} />
      </div>

      <motion.div className="mb-12 text-center" {...fadeInView()}>
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
          {t(targetType === 'idol' ? 'headlineIdol' : 'headline')}
        </h2>
      </motion.div>

      {/* 대형 한자 + 방사형 은은광 */}
      <div className="relative flex justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 220,
            height: 220,
            background: 'radial-gradient(circle, rgba(201,162,39,0.12), transparent 70%)',
          }}
        />
        <motion.span
          role="img"
          aria-label={`일간 ${reading.hanja}`}
          className="saju-gold-foil font-serif-kr relative"
          style={{ fontSize: 120, lineHeight: 1, fontWeight: 900, letterSpacing: 0 }}
          initial={reduce ? false : { opacity: 0, scale: 1.15 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={SAJU_VIEWPORT}
          transition={{ duration: 1.4, ease: SAJU_EASE_INK }}
        >
          {reading.hanja}
        </motion.span>
      </div>

      {/* 아키타입 타이틀 */}
      <motion.h3
        className="font-serif-kr mt-8 break-keep text-center text-[24px] font-semibold leading-[1.45] text-[#E9E2D0]"
        {...fadeInView(0.1)}
      >
        {reading.archetypeTitle}
      </motion.h3>

      {/* 오행 · 음양 칩 행 */}
      <motion.div className="mt-5 flex justify-center gap-2" {...fadeInView(0.2)}>
        <span
          className="font-serif-kr rounded-md px-3 py-1.5 text-[13px] font-semibold"
          style={{ background: `${meta.fill}1A`, color: meta.textOnDark }}
        >
          {meta.hanja} {tCommon(`elements.${ELEMENT_I18N_KEY[chart.dayMaster.element]}`)}
        </span>
        <span className="font-serif-kr rounded-md border border-[#262A38] bg-[#12141D] px-3 py-1.5 text-[13px] font-semibold text-[#E9E2D0]">
          {tCommon(`yinYang.${chart.dayMaster.yinYang === '양' ? 'yang' : 'yin'}`)}
        </span>
      </motion.div>

      {/* 여는 은유 + 대서사 — 전문 노출, 문단 스태거 */}
      <div className="mt-12 flex flex-col gap-6 text-left">
        {reading.natureMetaphor && (
          <motion.p
            className="font-serif-kr break-keep text-[15px] font-semibold leading-[1.85] text-[#E9E2D0]"
            {...fadeInView()}
          >
            {reading.natureMetaphor}
          </motion.p>
        )}
        {paragraphs.map((paragraph, i) => (
          <motion.p
            key={i}
            className="font-serif-kr break-keep text-[15px] leading-[1.85]"
            style={{ color: 'rgba(233,226,208,0.85)' }}
            {...fadeInView(Math.min(i * 0.12, 0.36))}
          >
            {paragraph}
          </motion.p>
        ))}
      </div>

      {/* 궁합 — 상대 일간 미니 카드 */}
      {compat && (
        <motion.div className="mt-12" {...fadeInView()}>
          <HanjiCard padding="md">
            <div className="flex items-center gap-5">
              <span
                aria-hidden
                className="font-serif-kr shrink-0 text-[#1A1610]"
                style={{ fontSize: 48, lineHeight: 1, fontWeight: 900 }}
              >
                {compat.partnerChart.dayMaster.hanja}
              </span>
              <div className="min-w-0">
                <p className="font-serif-kr break-keep text-[15px] font-semibold leading-[1.6] text-[#1A1610]">
                  {compat.partnerName}
                </p>
                <p className="font-serif-kr mt-1 break-keep text-[12px] leading-[1.6] text-[#5C564A]">
                  日干 · {compat.partnerChart.dayMaster.gan}({compat.partnerChart.dayMaster.hanja}) ·{' '}
                  {tCommon(`elements.${ELEMENT_I18N_KEY[compat.partnerChart.dayMaster.element]}`)}
                </p>
              </div>
            </div>
          </HanjiCard>
          <p className="font-serif-kr mt-4 break-keep text-center text-[12px] leading-[1.6] text-[#A69F8D]">
            {t('compatNote')}
          </p>
        </motion.div>
      )}
    </section>
  );
}
