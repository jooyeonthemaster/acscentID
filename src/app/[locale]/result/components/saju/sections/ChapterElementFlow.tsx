'use client';

// ============================================================
// 三章 — 오행의 흐름 (UI-SPEC §5.4, S3Elements)
// - auto height, py-24. ElementRing(size 300, ignite=false — 점화는 五章의 것).
//   부족 오행은 여기서 확실히 "꺼져" 보인다(五章 점화의 복선).
// - 분포 바 리스트(5행, width = count/8), 과다/부족 칩 요약,
//   dominantNarrative / lackingNarrative 전문 노출.
// - 궁합: 링은 나 기준 1개 유지, 바를 이중 바(나/상대 40%)로 교체 + 범례.
// ============================================================

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { SajuElement } from '@/types/analysis';
import {
  BrushDivider,
  ELEMENT_META,
  ElementRing,
  SAJU_EASE_INK,
  SAJU_ELEMENTS,
  SAJU_VIEWPORT,
  VerticalLabel,
} from '@/components/saju';
import type { ChapterElementFlowProps } from './types';

const ELEMENT_I18N_KEY: Record<SajuElement, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
};

export function ChapterElementFlow({ result }: ChapterElementFlowProps) {
  const t = useTranslations('saju.result.s3');
  const tCommon = useTranslations('saju.common');
  const reduce = useReducedMotion();

  const chart = result.sajuChart;
  const compat = result.sajuCompatibility;
  const flow = result.sajuAnalysis.elementFlow;
  const counts = chart.elementCount;

  // 과다(3+) 오행 = 넘치는 기운 칩, 부족은 계산 스냅샷(lackingElements) 그대로
  const dominantElement = SAJU_ELEMENTS.reduce<SajuElement>(
    (max, el) => ((counts[el] ?? 0) > (counts[max] ?? 0) ? el : max),
    SAJU_ELEMENTS[0]
  );
  const showDominant = (counts[dominantElement] ?? 0) >= 3;
  const lackingElements = chart.yongsin.lackingElements;

  const elementLabel = (el: SajuElement) => tCommon(`elements.${ELEMENT_I18N_KEY[el]}`);

  const fadeInView = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: SAJU_VIEWPORT,
          transition: { duration: 0.8, ease: SAJU_EASE_INK, delay },
        };

  const barWidth = (count: number) => `${Math.min((count / 8) * 100, 100)}%`;

  return (
    <section className="relative px-6 py-24">
      {/* 장 도입 오너먼트 (§5.0) */}
      <div className="mb-3">
        <VerticalLabel text="三章" tone="gold" />
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
          {t('headline')}
        </h2>
      </motion.div>

      {/* 상생 고리 — 점화 없음(五章의 것) */}
      <div className="flex justify-center">
        <ElementRing
          counts={counts}
          yongsin={chart.yongsin.element}
          ignite={false}
          size={300}
          showCounts
        />
      </div>

      {/* 분포 바 리스트 */}
      <div className="mt-12 flex flex-col gap-4">
        {SAJU_ELEMENTS.map((el, i) => {
          const meta = ELEMENT_META[el];
          const mine = counts[el] ?? 0;
          const partner = compat ? compat.partnerChart.elementCount[el] ?? 0 : null;
          return (
            <motion.div key={el} className="flex items-center gap-3" {...fadeInView(i * 0.08)}>
              <span
                className="font-serif-kr w-16 shrink-0 text-[13px] font-semibold"
                style={{ color: meta.textOnDark }}
              >
                {meta.hanja} {el}
              </span>
              <div className="min-w-0 flex-1">
                {partner === null ? (
                  <div className="h-2 overflow-hidden rounded-full bg-[#12141D]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: meta.fill }}
                      initial={reduce ? { width: barWidth(mine) } : { width: 0 }}
                      whileInView={{ width: barWidth(mine) }}
                      viewport={SAJU_VIEWPORT}
                      transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#12141D]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: meta.fill }}
                        initial={reduce ? { width: barWidth(mine) } : { width: 0 }}
                        whileInView={{ width: barWidth(mine) }}
                        viewport={SAJU_VIEWPORT}
                        transition={{ duration: 0.8, ease: SAJU_EASE_INK }}
                      />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#12141D]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: meta.fill, opacity: 0.4 }}
                        initial={reduce ? { width: barWidth(partner) } : { width: 0 }}
                        whileInView={{ width: barWidth(partner) }}
                        viewport={SAJU_VIEWPORT}
                        transition={{ duration: 0.8, ease: SAJU_EASE_INK, delay: 0.1 }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <span className="w-7 shrink-0 text-right font-sans text-[13px] text-[#A69F8D]">
                {partner === null ? mine : `${mine}·${partner}`}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* 궁합 이중 바 범례 */}
      {compat && (
        <motion.div className="mt-4 flex items-center justify-end gap-4" {...fadeInView()}>
          <span className="flex items-center gap-1.5 font-serif-kr text-[11px] text-[#A69F8D]">
            <span aria-hidden className="h-1.5 w-4 rounded-full bg-[#E9E2D0]" />
            {t('legendMine')}
          </span>
          <span className="flex items-center gap-1.5 font-serif-kr text-[11px] text-[#A69F8D]">
            <span aria-hidden className="h-1.5 w-4 rounded-full bg-[#E9E2D0] opacity-40" />
            {compat.partnerName}
          </span>
        </motion.div>
      )}

      {/* 과다 / 부족 칩 요약 */}
      <motion.div className="mt-8 flex flex-wrap justify-center gap-2" {...fadeInView()}>
        {showDominant && (
          <span
            className="font-serif-kr rounded-md border px-3 py-1.5 text-[13px] font-semibold"
            style={{
              borderColor: ELEMENT_META[dominantElement].fill,
              color: ELEMENT_META[dominantElement].textOnDark,
            }}
          >
            {t('dominantChip', { element: elementLabel(dominantElement) })}
          </span>
        )}
        {lackingElements.map((el) => (
          <span
            key={el}
            className="font-serif-kr rounded-md border border-dashed border-[#5C564A] px-3 py-1.5 text-[13px] font-semibold text-[#A69F8D]"
          >
            {t('lackingChip', { element: elementLabel(el) })}
          </span>
        ))}
      </motion.div>

      {/* 흐름 서사 — 전문 노출 */}
      <div className="mt-10 flex flex-col gap-6 text-left">
        {[flow.dominantNarrative, flow.lackingNarrative]
          .filter(Boolean)
          .map((narrative, i) => (
            <motion.p
              key={i}
              className="font-serif-kr break-keep text-[15px] leading-[1.85]"
              style={{ color: 'rgba(233,226,208,0.85)' }}
              {...fadeInView(i * 0.12)}
            >
              {narrative}
            </motion.p>
          ))}
      </div>
    </section>
  );
}
