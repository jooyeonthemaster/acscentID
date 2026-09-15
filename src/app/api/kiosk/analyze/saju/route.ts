import { NextRequest, NextResponse } from 'next/server';
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client';
import {
  buildSajuPrompt, buildSajuRetryPrompt, parseApiBirthInput, toEngineBirthInput,
  toSajuChartSnapshot, toSajuPairRelationSnapshots, type SajuPromptPartner,
} from '@/lib/gemini/saju-prompt-builder';
import { parseSajuGeminiResponse } from '@/lib/gemini/saju-response-parser';
import { computePairRelations, computeSajuChart, getScentCandidates } from '@/lib/saju';
import type { PairRelations, SajuChart } from '@/lib/saju';
import { perfumes } from '@/data/perfumes';
import {
  SAJU_PURPOSES, SAJU_RELATION_OPTIONS,
  type SajuAnalysisResult, type SajuAnalyzeRequest, type SajuPurpose,
} from '@/types/analysis';

// 키오스크 전용 사주 분석 — /api/analyze/saju와 동일한 엔진·프롬프트·파서를 쓰되
// 인증(401)과 일일 한도 두 블록만 제거했다. 무인 기기는 로그인 주체가 없다.
// 명식·용신·향 후보는 서버 엔진이 결정적으로 계산하고 AI는 해석만 만든다(원 라우트와 동일 계약).

const GEMINI_TIMEOUT_MS = 60000;
const MAX_RETRIES = 1;
type SajuRelationId = (typeof SAJU_RELATION_OPTIONS)[number]['id'];

interface KioskSajuResponse {
  success: boolean;
  data?: SajuAnalysisResult;
  error?: string;
  mocked?: boolean;
}

function kioskEnabled(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (process.env.KIOSK_ENABLED !== '1') return false;
  if (process.env.KIOSK_ALLOW_REMOTE === '1') return true;
  const host = (request.headers.get('host') ?? '').split(':')[0];
  return host === 'localhost' || host === '127.0.0.1';
}

function mockAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.KIOSK_DEMO === '1';
}

function normalizePurpose(value: unknown): SajuPurpose | null {
  return SAJU_PURPOSES.some((p) => p.id === value) ? (value as SajuPurpose) : null;
}

function normalizeRelation(value: unknown): SajuRelationId {
  return SAJU_RELATION_OPTIONS.find((o) => o.id === value)?.id ?? 'friend';
}

/** 데모용 해석 — 명식/용신은 입력으로 실제 계산한 값을 그대로 쓰고 서사만 고정 문구로 채운다.
 *  (사주는 난수로 지어내면 명식과 해석이 어긋나 곧바로 티가 난다) */
function buildSajuDemoResult(chart: SajuChart, purpose: SajuPurpose): SajuAnalysisResult {
  const snapshot = toSajuChartSnapshot(chart);
  const yongsin = snapshot.yongsin.element;
  const candidate = getScentCandidates(chart.yongsin.element, chart.lackingElements)[0];
  const perfume = perfumes.find((p) => p.id === candidate?.id) ?? perfumes[0];
  const dm = snapshot.dayMaster;
  const line = (s: string) => s;

  return {
    traits: {
      sexy: 5, cute: 5, charisma: 7, darkness: 4, freshness: 6,
      elegance: 7, freedom: 5, luxury: 6, purity: 6, uniqueness: 7,
    },
    scentCategories: { citrus: 5, floral: 5, woody: 6, musky: 6, fruity: 4, spicy: 4 },
    dominantColors: ['#2E2A24', '#8A7F6B', '#D9CFBA', '#F2EDE3'],
    personalColor: {
      season: 'autumn', tone: 'mute',
      palette: ['#2E2A24', '#8A7F6B', '#D9CFBA', '#F2EDE3'],
      description: '깊고 차분한 톤이 어울리는 가을 뮤트 계열입니다.',
    },
    analysis: {
      mood: '고요한 가운데 중심이 또렷한 기운입니다.',
      style: '군더더기 없이 정돈된 결이 느껴집니다.',
      expression: '표정에 힘을 주지 않아도 존재감이 남습니다.',
      concept: '담백함 속의 단단함.',
    },
    matchingKeywords: ['중심', '균형', '절제', '지속', '온기'],
    matchingPerfumes: [{
      perfumeId: perfume.id,
      score: 0.92,
      matchReason: line(`${dm.gan}(${dm.hanja}) 일간에 ${yongsin}의 기운을 더하는 향입니다.`),
      persona: {
        id: perfume.id, name: perfume.name, description: perfume.description,
        traits: perfume.traits, categories: perfume.characteristics, keywords: perfume.keywords,
        primaryColor: perfume.primaryColor, secondaryColor: perfume.secondaryColor,
        mainScent: { ...perfume.mainScent, fanComment: '겉으로 드러나는 기운입니다.' },
        subScent1: { ...perfume.subScent1, fanComment: '중심을 잡아주는 기운입니다.' },
        subScent2: { ...perfume.subScent2, fanComment: '뿌리에 남는 기운입니다.' },
        recommendation: perfume.recommendation, mood: perfume.mood, personality: perfume.personality,
        usageGuide: {
          situation: '하루를 여는 자리에서 가볍게 두세 번 두릅니다.',
          tips: ['손목과 목덜미에 소량', '문지르지 말고 자연 건조', '옷보다 피부에 직접'],
        },
      },
    }],
    sajuChart: snapshot,
    sajuPurpose: purpose,
    sajuAnalysis: {
      dayMasterReading: {
        archetypeTitle: `${dm.gan}${dm.element}의 사람`,
        hanja: `${dm.hanja}${dm.element}`,
        natureMetaphor: '제자리를 지키며 주변의 온도를 바꾸는 기운입니다.',
        narrative: `${dm.gan}(${dm.hanja}) 일간은 ${dm.strength}으로 자리했습니다. 이것은 데모 문구이며 실제 해석이 아닙니다.`,
      },
      pillarsReading: {
        year: { title: '뿌리', meaning: '태어난 자리의 기운입니다. (데모)' },
        month: { title: '계절', meaning: '자라온 환경의 결입니다. (데모)' },
        day: { title: '중심', meaning: '자기 자신의 자리입니다. (데모)' },
        hour: snapshot.isThreePillar ? null : { title: '향방', meaning: '나아가는 방향입니다. (데모)' },
      },
      elementFlow: {
        dominantNarrative: '가장 두터운 기운이 전체를 이끌고 있습니다. (데모)',
        lackingNarrative: `${snapshot.yongsin.lackingElements.join('·') || '없음'}의 기운이 옅습니다. (데모)`,
        yongsinNarrative: `${yongsin}의 기운을 더하면 균형이 잡힙니다. (데모)`,
      },
      purposeReading: {
        purpose,
        title: '데모 해석',
        narrative: '실제 분석에서는 명식의 글자를 인용한 해석이 이 자리에 들어갑니다. (데모)',
        keyInsights: ['데모 통찰 1', '데모 통찰 2', '데모 통찰 3'],
        timingAdvice: '실제 분석에서 시기 조언이 들어갑니다. (데모)',
      },
      scentDestiny: {
        whyNarrative: `명식에 ${yongsin}의 기운이 필요하고, 그 기운을 감각으로 옮긴 것이 이 향입니다. (데모)`,
        elementBridge: `${yongsin}의 기운 — 균형을 잡아주는`,
        topMeaning: '겉으로 드러나는 기운',
        middleMeaning: '중심을 잡는 기운',
        baseMeaning: '뿌리에 남는 기운',
        ritualGuide: '아침에 한 번, 중요한 자리 앞에서 한 번. (데모)',
        wearingMoment: '문을 열고 들어서는 순간. (데모)',
      },
      yearlyFlow: { yearTitle: '올해의 흐름', narrative: '실제 분석에서 올해 흐름이 들어갑니다. (데모)' },
    },
  };
}

export async function POST(request: NextRequest) {
  const requestId = `KIOSK-SAJU-${Date.now().toString(36)}`;

  if (!kioskEnabled(request)) {
    return NextResponse.json<KioskSajuResponse>({ success: false, error: 'KIOSK_DISABLED' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as SajuAnalyzeRequest & { mock?: boolean };

    const purpose = normalizePurpose(body.purpose);
    if (!purpose) {
      return NextResponse.json<KioskSajuResponse>({ success: false, error: 'INVALID_PURPOSE' }, { status: 400 });
    }
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 20) : null;
    if (!name) {
      return NextResponse.json<KioskSajuResponse>({ success: false, error: 'NAME_REQUIRED' }, { status: 400 });
    }
    const gender = typeof body.gender === 'string' ? body.gender : '';
    const targetType: 'idol' | 'self' = body.targetType === 'idol' ? 'idol' : 'self';

    // ── 명식 계산 (서버 엔진이 유일한 진실) ──
    let chart: SajuChart;
    let partnerChart: SajuChart | null = null;
    let pairRelations: PairRelations | null = null;
    let partnerPrompt: SajuPromptPartner | undefined;
    let relationId: SajuRelationId = 'friend';

    try {
      const birth = parseApiBirthInput(body.birth, '본인');
      chart = computeSajuChart(toEngineBirthInput(birth, gender));

      if (purpose === 'compatibility') {
        if (!body.partner?.birth) {
          return NextResponse.json<KioskSajuResponse>({ success: false, error: 'PARTNER_REQUIRED' }, { status: 400 });
        }
        const partnerBirth = parseApiBirthInput(body.partner.birth, '상대방');
        partnerChart = computeSajuChart(toEngineBirthInput(partnerBirth, body.partner.gender));
        pairRelations = computePairRelations(chart, partnerChart);
        relationId = normalizeRelation(body.partner.relation);
        partnerPrompt = {
          name: typeof body.partner.name === 'string' && body.partner.name.trim() ? body.partner.name.trim() : '상대방',
          gender: typeof body.partner.gender === 'string' ? body.partner.gender : '',
          relationLabel: SAJU_RELATION_OPTIONS.find((o) => o.id === relationId)?.label ?? '친구',
          chart: partnerChart,
          relations: pairRelations,
        };
      }
    } catch (chartError) {
      const message = chartError instanceof Error ? chartError.message : '사주 계산에 실패했습니다.';
      console.error(`[${requestId}] 명식 계산 실패: ${message}`);
      return NextResponse.json<KioskSajuResponse>({ success: false, error: message }, { status: 400 });
    }

    const p = chart.pillars;
    console.log(`[${requestId}] 명식: ${p.year.gan}${p.year.ji} ${p.month.gan}${p.month.ji} ${p.day.gan}${p.day.ji} ${p.hour ? `${p.hour.gan}${p.hour.ji}` : '(삼주)'} / 용신 ${chart.yongsin.element}`);

    if ((body.mock && mockAllowed()) || !process.env.OPENROUTER_API_KEY) {
      console.log(`[${requestId}] 데모 응답 반환`);
      return NextResponse.json<KioskSajuResponse>({
        success: true, data: buildSajuDemoResult(chart, purpose), mocked: true,
      });
    }

    // ── 용신 → 후보 향 → 프롬프트 → AI 해석 (원 라우트와 동일) ──
    const candidates = getScentCandidates(chart.yongsin.element, chart.lackingElements);
    const prompt = buildSajuPrompt({
      name, gender, targetType, purpose,
      wish: typeof body.wish === 'string' && body.wish.trim() ? body.wish.trim().slice(0, 100) : undefined,
      chart, candidates, partner: partnerPrompt,
    });

    const model = getModelWithConfig({ maxOutputTokens: 16384, temperature: 0.85 });
    const attempt = async (text: string) => {
      const started = Date.now();
      const res = await withTimeout(
        model.generateContent({ contents: [{ role: 'user', parts: [{ text }] }] }),
        GEMINI_TIMEOUT_MS,
        'Gemini API request timed out (60 seconds)'
      );
      console.log(`[${requestId}] 응답 수신 (${Date.now() - started}ms)`);
      return parseSajuGeminiResponse(res.response.text(), {
        locale: 'ko',
        purpose,
        isThreePillar: chart.isThreePillar,
        requireCompatibility: purpose === 'compatibility',
      });
    };

    let parsed: Awaited<ReturnType<typeof attempt>> | null = null;
    let lastError = '';
    for (let i = 0; i <= MAX_RETRIES && !parsed; i += 1) {
      try {
        parsed = await attempt(i === 0 ? prompt : buildSajuRetryPrompt(prompt, lastError));
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error';
        console.error(`[${requestId}] 시도 ${i + 1} 실패: ${lastError}`);
      }
    }
    if (!parsed) throw new Error(lastError || '사주 해석 생성에 실패했습니다.');

    const data: SajuAnalysisResult = {
      ...parsed.core,
      sajuChart: toSajuChartSnapshot(chart),
      sajuAnalysis: parsed.sajuAnalysis,
      sajuPurpose: purpose,
      ...(purpose === 'compatibility' && partnerChart && pairRelations && partnerPrompt
        ? {
          sajuCompatibility: {
            partnerName: partnerPrompt.name,
            partnerGender: partnerPrompt.gender,
            relation: relationId,
            partnerChart: toSajuChartSnapshot(partnerChart),
            relations: toSajuPairRelationSnapshots(pairRelations),
            complementScore: pairRelations.elementComplementScore,
          },
        }
        : {}),
    };

    return NextResponse.json<KioskSajuResponse>({ success: true, data });
  } catch (error) {
    // 상세 오류는 로그에만 — 무인증 엔드포인트이므로 업스트림 메시지를 노출하지 않는다.
    // 가짜 해석으로 폴백하지도 않는다(명식과 어긋난 처방이 인쇄되면 안 된다).
    console.error(`[${requestId}] 사주 분석 실패:`, error instanceof Error ? error.message : error);
    return NextResponse.json<KioskSajuResponse>({ success: false, error: 'ANALYZE_FAILED' }, { status: 500 });
  }
}
