// POST /api/analyze/saju — 사주 분석 퍼퓸 메인 라우트 (chemistry 패턴)
// 대원칙: 명식은 서버의 src/lib/saju 엔진이 계산한다 (클라이언트가 보낸 차트는 무시).
// AI는 해석(sajuAnalysis + 유니버설 코어)만 생성하고, sajuChart는 항상 엔진 스냅샷으로 덮어쓴다.

import { NextRequest, NextResponse } from 'next/server';
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client';
import {
  buildSajuPrompt, buildSajuRetryPrompt, parseApiBirthInput, toEngineBirthInput,
  toSajuChartSnapshot, toSajuPairRelationSnapshots, type SajuPromptPartner,
} from '@/lib/gemini/saju-prompt-builder';
import { parseSajuGeminiResponse } from '@/lib/gemini/saju-response-parser';
import { wrapPromptWithLocale } from '@/lib/gemini/locale-prompt-wrapper';
import { computePairRelations, computeSajuChart, getScentCandidates } from '@/lib/saju';
import type { PairRelations, SajuChart } from '@/lib/saju';
import { getApiLocale } from '@/lib/api-locale';
import { requireAuthenticatedUser } from '@/lib/auth/require-user';
import { consumeDailyAnalysisLimit, dailyAnalysisLimitExceededResponse } from '@/lib/analysis/daily-limit';
import { locales, type Locale } from '@/i18n/config';
import { perfumes } from '@/data/perfumes';
import {
  SAJU_PURPOSES, SAJU_RELATION_OPTIONS,
  type SajuAnalysisResult, type SajuAnalyzeRequest, type SajuPurpose,
} from '@/types/analysis';

interface SajuAnalyzeResponse {
  success: boolean;
  data?: SajuAnalysisResult;
  error?: string;
  fallback?: SajuAnalysisResult;
}

const GEMINI_TIMEOUT_MS = 60000;
const MAX_RETRIES = 1;

function normalizeLocale(value: unknown): Locale | null {
  return typeof value === 'string' && locales.includes(value as Locale)
    ? value as Locale
    : null;
}

function normalizePurpose(value: unknown): SajuPurpose | null {
  return SAJU_PURPOSES.some((p) => p.id === value) ? value as SajuPurpose : null;
}

type SajuRelationId = (typeof SAJU_RELATION_OPTIONS)[number]['id'];

function normalizeRelation(value: unknown): SajuRelationId {
  const found = SAJU_RELATION_OPTIONS.find((option) => option.id === value);
  if (!found) {
    console.warn(`[Saju] 알 수 없는 관계 유형(${String(value)}) — 'friend'로 대체`);
    return 'friend';
  }
  return found.id;
}

// ── 사주 전용 mock fallback ──
// 고정 생시(1995-08-03 10:30 양력, 여) → 을해 계미 병인 계사 / 일간 병화(丙火) / 여름 미월생 / 용신 금(결핍).
// sajuChart는 엔진으로 실제 계산하므로 서사(병화·한낮의 태양·유자)와 명식이 절대 어긋나지 않는다.
function generateSajuMockResult(): SajuAnalysisResult {
  const chart = computeSajuChart({
    date: { year: 1995, month: 8, day: 3 },
    calendar: 'solar',
    time: { hour: 10, minute: 30 },
    gender: 'female',
  });
  const perfume = perfumes.find((p) => p.id === "AC'SCENT 13") ?? perfumes[12];

  return {
    traits: { sexy: 4, cute: 4, charisma: 8, darkness: 3, freshness: 7, elegance: 6, freedom: 6, luxury: 5, purity: 6, uniqueness: 7 },
    scentCategories: { citrus: 9, floral: 4, woody: 3, musky: 4, fruity: 4, spicy: 3 },
    dominantColors: ['#C0392B', '#B8B8B0', '#2C3E60', '#C9A227'],
    personalColor: {
      season: 'summer',
      tone: 'bright',
      palette: ['#C0392B', '#E2604E', '#B8B8B0', '#F5EFE2', '#C9A227'],
      description: '한여름 미월(未月)의 병화(丙火) 명식입니다. 뜨거운 채도의 붉은 기운이 바탕이 되고, 그 위에 금(金)의 서늘한 광택이 한 겹 얹힐 때 이 사람의 색은 완성됩니다. 쨍한 원색보다 빛을 머금은 밝은 명도가 얼굴을 살립니다.',
    },
    analysis: {
      mood: '여름 미월(未月)의 병화(丙火) — 명식 전체가 한낮의 열기로 가득합니다. 일지의 인목(寅木)이 불에 장작을 대주니 기세는 쉽게 꺾이지 않습니다. 다만 금(金)의 자리가 비어 있어, 이 열기를 거두어 줄 서늘함이 이 명식의 숨은 그리움입니다.',
      style: '감추지 못하는 사람의 스타일입니다. 병화는 구름 뒤에 숨어도 빛이 새어 나옵니다. 화려한 장식보다 잘 다린 흰 셔츠의 광택, 벼려진 단정함이 이 기운을 오히려 돋보이게 합니다.',
      expression: '표정이 먼저 도착하는 사람입니다. 년지 해수(亥水)와 월간 계수(癸水)의 물 기운이 안쪽에 흐르고 있어, 뜨겁게 말하고 조용히 식는 낙차가 있습니다. 그 낙차가 이 명식의 매력입니다.',
      concept: '한낮의 태양에 서늘한 광택 한 방울 — "벼려진 여름". 넘치는 화기를 부정하지 않고, 금(金)의 수렴으로 윤곽을 잡아주는 조향 컨셉입니다.',
    },
    matchingKeywords: ['한낮의 태양', '투명한 열정', '벼려진 광택', '여름의 확신', '서늘한 여운'],
    matchingPerfumes: [
      {
        perfumeId: perfume.id,
        score: 0.93,
        matchReason: '이 명식에는 금(金)이 없습니다. 미월(未月)의 화기가 강한 사람에게 필요한 것은 더 타오르는 일이 아니라 서늘하게 벼려지는 일입니다. 용신 금(金)의 감각 번역은 베어내는 맑음, 시트러스의 광택 — 유자의 차가운 노란빛이 정확히 그 자리를 채웁니다. 향이 곧 처방입니다.',
        persona: {
          id: perfume.id,
          name: perfume.name,
          description: perfume.description,
          traits: perfume.traits,
          categories: perfume.characteristics,
          keywords: perfume.keywords,
          primaryColor: perfume.primaryColor,
          secondaryColor: perfume.secondaryColor,
          mainScent: {
            ...perfume.mainScent,
            fanComment: '샛노란 유자의 맑은 산미 — 겉으로 드러나는 기운입니다. 처음 만나는 사람은 이 사람의 열기보다 이 서늘한 광택을 먼저 읽습니다.',
          },
          subScent1: {
            ...perfume.subScent1,
            fanComment: '로즈마리의 푸른 허브가 중심 기운, 일간 병화(丙火)의 자리를 지킵니다. 태양의 온기가 향의 심장에서 계속 뜁니다.',
          },
          subScent2: {
            ...perfume.subScent2,
            fanComment: '민트의 시린 잔향은 뿌리 기운 — 용신 금(金)이 안착하는 자리입니다. 하루의 끝에서 이 서늘함이 남은 열기를 거두어 줍니다.',
          },
          recommendation: '화기가 가장 오르는 한낮이 지나고, 마음의 온도를 한 단계 내리고 싶은 오후의 처방입니다.',
          mood: perfume.mood,
          personality: perfume.personality,
          usageGuide: {
            situation: '화기가 가장 오르는 한낮이 지나고, 마음의 온도를 한 단계 내리고 싶은 오후의 처방입니다.',
            tips: [
              '오전보다 오후 — 태양이 기울기 시작할 때 금(金)의 수렴이 가장 잘 듣습니다.',
              '귀 뒤보다 손목 안쪽 — 맥이 뛰는 자리에서 열기와 서늘함이 부드럽게 섞입니다.',
              '여름에는 한 번, 겨울에는 두 번 — 계절의 화기에 맞춰 용량을 조절하십시오.',
            ],
          },
        },
      },
    ],
    comparisonAnalysis: {
      imageInterpretation: '여덟 글자가 그리는 첫인상은 "숨길 수 없는 사람"입니다. 을해(乙亥) 위에서 시작된 물길이 계미(癸未)의 한여름 관문을 지나, 병인(丙寅)의 태양으로 솟아오릅니다. 뜨겁게 시작하고 투명하게 드러내는 사람 — 존재만으로 자리의 온도를 바꿉니다. 다만 그 빛을 거두어 줄 금(金)의 자리는 비어 있습니다. 그래서 이 명식은 정돈된 것, 벼려진 것에 본능적으로 끌립니다.',
      userInputSummary: '의뢰인은 명식 전체의 흐름, 종합운을 물었습니다. 지금 이 사람에게 필요한 것은 새로운 불씨가 아니라 이미 타오르는 불을 다루는 법입니다. 그 답을 향의 언어로 옮겼습니다.',
      reflectionDetails: '【명식의 첫인상】병화(丙火) 일간이 일 년 중 가장 뜨거운 미월(未月)의 하늘에 떠 있습니다. 스스로 이글거리는 태양 — 계절의 도움 없이도 열정은 차고 넘칩니다.\n\n【숨은 기운】겉의 열기 아래로 해수(亥水)와 계수(癸水)의 물길이 조용히 흐릅니다. 뜨겁게 시작하고 서늘하게 식는 낙차, 그것이 이 사람의 깊이입니다.\n\n【용신의 다리】이 명식의 금(金) 자리는 비어 있습니다. 여름의 곡식을 베어 들이는 가을의 손 — 거두고 정돈하는 기운이 이 사람의 용신입니다. 부족한 기운은 밖에서 채울 수 있고, 향은 그 가장 가까운 처방입니다.\n\n【운명의 향】그래서 유자입니다. 샛노란 시트러스의 차가운 광택이 탑에서 금(金)의 자리를 열고, 로즈마리가 태양의 심장을 지키며, 민트의 시린 잔향이 뿌리에서 열기를 거둡니다. 명식이 비워 둔 자리에 정확히 놓이는 향입니다.',
    },
    scentRecommendation: {
      best_season: 'autumn',
      best_time: 'afternoon',
      season_reason: '용신 금(金)의 계절은 가을 — 수렴의 기운이 가장 잘 스미는 때입니다.',
      time_reason: '한낮의 화기가 기울기 시작하는 오후, 서늘한 광택이 가장 오래 머뭅니다.',
    },
    sajuChart: toSajuChartSnapshot(chart),
    sajuPurpose: 'general',
    sajuAnalysis: {
      dayMasterReading: {
        archetypeTitle: '한여름의 태양',
        hanja: '丙火',
        natureMetaphor: '당신이 태어난 순간의 하늘에는 한낮의 태양이 떠 있었습니다. 그것도 일 년 중 가장 뜨거운 미월(未月)의 태양이.',
        narrative: '병화(丙火)는 존재만으로 좌중을 밝히는 사람입니다. 촛불처럼 가까운 이만 데우는 불이 아니라, 있는 자리 전체의 온도를 바꾸는 빛입니다. 같은 병화라도 겨울의 태양은 귀하게 대접받는 온기이지만, 미월의 병화는 스스로 이글거리는 불 — 당신의 열정은 계절의 도움 없이도 차고 넘칩니다. 일지의 인목(寅木)은 불에 장작을 대주는 자리라, 이 태양은 쉽게 지지 않습니다. 사람들이 당신 곁에서 이유 없이 기운을 얻는 것은 그 때문입니다. 흔히 병화의 그림자를 과시라 부르지만, 정확히는 투명함입니다 — 숨기는 법을 모르는 빛일 뿐입니다. 다만 태양은 제 그림자를 보지 못합니다. 년지 해수(亥水)의 깊은 물이 당신 안쪽에 흐르고 있어, 뜨거운 겉과 서늘한 속의 낙차가 이 명식의 진짜 깊이입니다. 그래서 이 명식의 과제는 더 타오르는 일이 아니라, 거두는 일입니다.',
      },
      pillarsReading: {
        year: { title: '물 위에서 시작된 불', meaning: '년주 을해(乙亥) — 뿌리의 자리에 바다 위 덩굴이 있습니다. 유연하게 길을 찾는 기질과 깊은 물의 직관이 초년의 바탕입니다.' },
        month: { title: '한여름의 관문', meaning: '월주 계미(癸未) — 가장 뜨거운 계절에 이슬비 한 줄기가 걸려 있습니다. 사회로 나가는 문에서 열기와 습기가 공존하니, 일은 뜨겁게 하되 마음은 자주 식혀야 하는 자리입니다.' },
        day: { title: '장작을 안은 태양', meaning: '일주 병인(丙寅) — 나의 자리이자 배우자의 자리에 인목(寅木)이 앉아 불을 살립니다. 스스로 연료를 지닌 태양이라, 곁에 오는 사람도 그 생기에 데워집니다.' },
        hour: { title: '낮의 뱀', meaning: '시주 계사(癸巳) — 말년과 내면의 자리에 한낮의 뱀 사화(巳火)가 있습니다. 나이가 들수록 불은 은근해지고, 계수(癸水)의 이슬이 그 위를 식혀 줍니다.' },
      },
      elementFlow: {
        dominantNarrative: '이 명식은 수(水)의 기운이 가장 두텁습니다. 물이 많으면 생각이 깊고 직관이 빠릅니다 — 뜨거운 병화가 즉흥으로 보여도, 결정의 밑바닥에는 늘 조류가 흐르고 있습니다. 다만 깊은 물은 스스로를 가라앉히기도 하니, 생각이 길어질 때가 이 명식의 그림자입니다.',
        lackingNarrative: '당신의 명식에서 금(金)의 자리는 비어 있습니다. 그래서 당신은 그 기운을 밖에서 찾습니다 — 정돈된 책상, 벼려진 문장, 서늘하게 맑은 것들에 끌리는 이유입니다. 비어 있다는 것은 모자란 것이 아니라, 채울 자리가 준비되어 있다는 뜻입니다.',
        yongsinNarrative: '원국의 오행 가운데 금(金)이 가장 약하여, 이 부족한 기운을 채우는 것을 용신으로 삼습니다. 금은 거두는 기운 — 여름의 곡식을 베어 들이는 가을의 손입니다. 타오르는 화기와 깊은 수기 사이에서, 금은 열기를 걷어 물로 흘려보내는 다리가 됩니다. 이 기운은 향이 될 수 있습니다.',
      },
      purposeReading: {
        purpose: 'general',
        title: '거두는 법을 배우는 흐름',
        narrative: '이 명식의 중심 이야기는 "시작의 힘"과 "마무리의 기술" 사이에 있습니다. 일주 병인(丙寅)은 장작을 안은 태양 — 시작에 필요한 불씨와 연료를 모두 스스로 갖췄습니다. 무언가를 벌이는 일에서 당신은 늘 남보다 반 박자 빠릅니다. 미월(未月)의 한여름 기운이 그 속도를 더 부추깁니다. 다만 명식에 금(金)이 비어 있으니, 벌인 것을 베어 거두는 손은 타고나지 않았습니다. 이것은 결함이 아니라 배워서 채우는 자리입니다. 년지 해수(亥水)와 월간 계수(癸水)의 깊은 물은 당신이 지치기 전에 스스로를 식히는 안전장치입니다 — 생각이 많아지는 날은 물이 일하는 날이니 조급해하지 마십시오. 흐름으로 보면, 뜨겁게 벌이는 계절과 서늘하게 정리하는 계절을 번갈아 쓰는 것이 이 명식의 리듬입니다. 하나를 끝내고 다음을 시작할 때, 의식처럼 정돈의 시간을 두십시오. 그 잠깐의 수렴이 다음 불꽃을 더 멀리 보이게 합니다. 태양은 지는 법을 알아서 아름답습니다.',
        keyInsights: [
          '일지 인목(寅木)이 불의 장작 — 시작의 힘은 이미 충분하니, 새 불씨를 찾기보다 있는 불을 다루십시오.',
          '비어 있는 금(金)의 자리 — 마무리와 정돈이 이 명식의 열쇠이며, 그 기운은 밖에서 채울 수 있습니다.',
          '해수(亥水)·계수(癸水)의 깊은 물 — 생각이 깊어지는 날은 가라앉는 날이 아니라 식히는 날입니다.',
        ],
        timingAdvice: '해가 기우는 오후의 결정이 당신에게 유리합니다. 한낮의 확신은 한 박자 쉬었다 꺼내십시오.',
      },
      scentDestiny: {
        whyNarrative: '당신의 명식에는 금(金)이 없습니다. 미월(未月)의 화기(火氣)가 강하고 일지 인목(寅木)이 그 불을 계속 살리는 사람 — 당신에게 필요한 것은 더 타오르는 일이 아니라 서늘하게 벼려지는 일입니다. 금의 감각 번역은 베어내는 맑음, 차가운 광택, 걷어내는 손길입니다. 그 기운을 노트로 옮기면 시트러스의 산미와 허브의 청량입니다. 유자의 샛노란 광택이 탑에서 금의 자리를 열고, 로즈마리의 푸른 허브가 태양의 심장을 지키며, 민트의 시린 잔향이 뿌리에서 열기를 거둡니다. 명식이 비워 둔 자리에 정확히 놓이는 향 — 향이 곧 처방입니다.',
        elementBridge: '금(金)의 기운 — 서늘하게 벼려 거두는',
        topMeaning: '탑의 유자는 겉으로 드러나는 기운입니다. 처음 만나는 사람은 당신의 열기보다 이 맑은 광택을 먼저 읽습니다.',
        middleMeaning: '미들의 로즈마리는 중심 기운, 일간 병화(丙火)의 자리를 지킵니다. 태양의 온기가 향의 심장에서 계속 뜁니다.',
        baseMeaning: '베이스의 민트는 뿌리 기운 — 용신 금(金)이 안착하는 자리입니다. 하루의 끝에서 이 서늘함이 남은 열기를 거두어 줍니다.',
        ritualGuide: '화기가 가장 오르는 한낮이 지나고 해가 기울기 시작할 때 — 그때가 이 향의 시간입니다. 중요한 결정을 앞둔 오후, 손목 안쪽에 한 번이면 충분합니다.',
        wearingMoment: '여름 오후 다섯 시, 긴 회의를 끝내고 나온 복도. 창으로 기운 햇빛이 길게 눕고, 손목에서 유자의 서늘한 광택이 올라옵니다. 뜨거웠던 하루가 그제야 정돈되기 시작합니다.',
      },
      yearlyFlow: {
        yearTitle: '2026 병오년',
        narrative: '2026 병오년, 당신의 명식에는 비견(比肩)의 불 — 나와 같은 태양이 하나 더 들어옵니다. 하늘에 태양이 두 개 뜨는 해이니, 경쟁이 아니라 동행으로 읽으십시오. 같은 속도로 달리는 사람 곁에서 당신의 빛은 오히려 또렷해집니다. 한여름의 기세일수록, 서늘한 정돈의 시간을 의식처럼 챙기십시오.',
      },
    },
  };
}

export async function POST(request: NextRequest) {
  const requestId = `SAJU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log('\n' + '='.repeat(80));
  console.log(`[${requestId}] 🔮 사주 분석 요청 시작`);
  console.log('='.repeat(80));

  try {
    // 0. 인증 — 비로그인 분석 차단 (서버 사이드 강제)
    const authedUser = await requireAuthenticatedUser();
    if (!authedUser) {
      console.warn(`[${requestId}] ❌ 비로그인 사주 분석 시도 차단`);
      return NextResponse.json<SajuAnalyzeResponse>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 1. 요청 파싱
    const body: SajuAnalyzeRequest = await request.json();
    const locale = normalizeLocale(body.locale) || getApiLocale(request);
    const resolvedTargetType: 'idol' | 'self' = body.targetType === 'idol' ? 'idol' : 'self';
    const isOfflineServiceMode = body.serviceMode === 'offline';

    const purpose = normalizePurpose(body.purpose);
    if (!purpose) {
      return NextResponse.json<SajuAnalyzeResponse>(
        { success: false, error: `purpose는 ${SAJU_PURPOSES.map((p) => p.id).join('/')} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }
    const name = typeof body.name === 'string' && body.name.trim().length > 0 ? body.name.trim() : null;
    if (!name) {
      return NextResponse.json<SajuAnalyzeResponse>(
        { success: false, error: '이름(name)이 필요합니다.' },
        { status: 400 }
      );
    }
    const gender = typeof body.gender === 'string' ? body.gender : '';

    console.log(`[${requestId}] 📊 입력 데이터:`);
    console.log(`  - 이름: ${name} (${resolvedTargetType === 'idol' ? '최애' : '본인'})`);
    console.log(`  - 목적: ${purpose}`);
    console.log(`  - 심원: ${body.wish ? 'YES' : 'NO'}`);
    console.log(`  - 상대 정보: ${body.partner ? 'YES' : 'NO'}`);
    console.log(`  - locale: ${locale} / serviceMode: ${body.serviceMode ?? 'online'}`);

    // 2. API 키 확인
    if (!process.env.OPENROUTER_API_KEY) {
      console.error(`[${requestId}] API 키 미설정`);
      return NextResponse.json<SajuAnalyzeResponse>(
        { success: false, error: 'API key not configured', fallback: generateSajuMockResult() },
        { status: 500 }
      );
    }

    // 3. 일일 한도 (오프라인 QR 모드는 우회 — 기존 라우트 계약 준수)
    if (isOfflineServiceMode) {
      console.log(`[${requestId}] Offline QR saju analysis - daily limit bypassed`);
    } else {
      const usage = await consumeDailyAnalysisLimit({
        userId: authedUser.id,
        email: authedUser.email,
        provider: authedUser.provider,
        productType: 'saju_perfume',
        endpoint: '/api/analyze/saju',
        targetType: resolvedTargetType,
      });
      if (!usage.allowed) {
        console.warn(`[${requestId}] Daily analysis limit exceeded`, usage);
        return dailyAnalysisLimitExceededResponse(usage);
      }
      console.log(`[${requestId}] Daily analysis usage consumed: ${usage.usedCount}/${usage.dailyLimit}`);
    }

    // 4. 명식 계산 — 서버 엔진이 유일한 진실 (클라이언트가 보낸 차트는 무시)
    let chart: SajuChart;
    let partnerChart: SajuChart | null = null;
    let pairRelations: PairRelations | null = null;
    let partnerPrompt: SajuPromptPartner | undefined;
    let relationId: SajuRelationId = 'friend';

    try {
      const birth = parseApiBirthInput(body.birth, '본인');
      chart = computeSajuChart(toEngineBirthInput(birth, body.gender));

      if (purpose === 'compatibility') {
        if (!body.partner?.birth) {
          return NextResponse.json<SajuAnalyzeResponse>(
            { success: false, error: '궁합 분석에는 상대방 정보(partner)가 필요합니다.' },
            { status: 400 }
          );
        }
        const partnerBirth = parseApiBirthInput(body.partner.birth, '상대방');
        partnerChart = computeSajuChart(toEngineBirthInput(partnerBirth, body.partner.gender));
        pairRelations = computePairRelations(chart, partnerChart);
        relationId = normalizeRelation(body.partner.relation);
        partnerPrompt = {
          name: typeof body.partner.name === 'string' && body.partner.name.trim() ? body.partner.name.trim() : '상대방',
          gender: typeof body.partner.gender === 'string' ? body.partner.gender : '',
          relationLabel: SAJU_RELATION_OPTIONS.find((option) => option.id === relationId)?.label ?? '친구',
          chart: partnerChart,
          relations: pairRelations,
        };
      }
    } catch (chartError) {
      const message = chartError instanceof Error ? chartError.message : '사주 계산에 실패했습니다.';
      console.error(`[${requestId}] 명식 계산 실패: ${message}`);
      return NextResponse.json<SajuAnalyzeResponse>(
        { success: false, error: message },
        { status: 400 }
      );
    }

    const p = chart.pillars;
    console.log(`[${requestId}] 🧮 명식 계산 완료 (엔진 SSOT):`);
    console.log(`  - 사주: ${p.year.gan}${p.year.ji} ${p.month.gan}${p.month.ji} ${p.day.gan}${p.day.ji} ${p.hour ? `${p.hour.gan}${p.hour.ji}` : '(삼주)'}`);
    console.log(`  - 일간: ${chart.dayMaster.gan}(${chart.dayMaster.hanja}) ${chart.dayMaster.strength} / 용신: ${chart.yongsin.element}(${chart.yongsin.reason})`);
    if (pairRelations) {
      console.log(`  - 궁합 관계 히트: ${pairRelations.hits.length}건 / 상보점수: ${pairRelations.elementComplementScore}`);
    }

    // 5. 용신 → 후보 향수 (코드가 좁힌 우선 후보)
    const candidates = getScentCandidates(chart.yongsin.element, chart.lackingElements);
    console.log(`[${requestId}] 🌿 우선 후보 ${candidates.length}종: ${candidates.map((c) => c.id).join(', ')}`);

    // 6. 프롬프트 구성 (ko 소스 → locale 래핑)
    const basePrompt = buildSajuPrompt({
      name,
      gender,
      targetType: resolvedTargetType,
      purpose,
      wish: typeof body.wish === 'string' && body.wish.trim() ? body.wish.trim() : undefined,
      chart,
      candidates,
      partner: partnerPrompt,
    });
    const wrappedPrompt = wrapPromptWithLocale(basePrompt, locale);
    console.log(`[${requestId}] 📝 프롬프트 길이: ${wrappedPrompt.length}자`);

    // 7. Gemini 호출 — 검증 실패 시 오류를 프롬프트에 주입해 1회 교정 재시도 (feedback-customize 패턴)
    // 운세 서사가 안전 필터 중간 임계에 걸리는 문제는 OpenRouter의 Google 라우팅이
    // 가장 완화된 안전 설정을 기본 적용하므로 별도 safetySettings 없이 해소된다.
    const model = getModelWithConfig({
      maxOutputTokens: 16384,
      temperature: 0.85,
    });

    const attempt = async (prompt: string) => {
      const apiStart = Date.now();
      const geminiResult = await withTimeout(
        model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        GEMINI_TIMEOUT_MS,
        'Gemini API request timed out (60 seconds)'
      );
      const responseText = geminiResult.response.text();
      console.log(`[${requestId}] Gemini 응답 수신 (${Date.now() - apiStart}ms, ${responseText.length}자)`);
      return parseSajuGeminiResponse(responseText, {
        locale,
        purpose,
        isThreePillar: chart.isThreePillar,
        requireCompatibility: purpose === 'compatibility',
      });
    };

    let parsed: Awaited<ReturnType<typeof attempt>> | null = null;
    let lastError = '';
    for (let tryIndex = 0; tryIndex <= MAX_RETRIES && !parsed; tryIndex += 1) {
      try {
        const prompt = tryIndex === 0 ? wrappedPrompt : buildSajuRetryPrompt(wrappedPrompt, lastError);
        if (tryIndex > 0) console.warn(`[${requestId}] 🔁 교정 재시도 ${tryIndex}/${MAX_RETRIES}: ${lastError}`);
        parsed = await attempt(prompt);
      } catch (attemptError) {
        lastError = attemptError instanceof Error ? attemptError.message : 'Unknown error';
        console.error(`[${requestId}] 시도 ${tryIndex + 1} 실패: ${lastError}`);
      }
    }
    if (!parsed) {
      throw new Error(lastError || '사주 해석 생성에 실패했습니다.');
    }

    // 8. 최종 조립 — sajuChart는 항상 엔진 스냅샷으로 주입 (AI가 어떤 명식을 말했든 무시)
    const result: SajuAnalysisResult = {
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

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] ✅ 사주 분석 완료 (총 ${totalDuration}ms)`);
    console.log(`  - 향수: ${result.matchingPerfumes[0]?.perfumeId}`);
    console.log(`  - 일간 해석: ${result.sajuAnalysis.dayMasterReading.archetypeTitle} (${result.sajuAnalysis.dayMasterReading.hanja})`);
    if (result.sajuAnalysis.compatibilityReading) {
      console.log(`  - 궁합 점수: ${result.sajuAnalysis.compatibilityReading.score}`);
    }
    console.log('='.repeat(80) + '\n');

    return NextResponse.json<SajuAnalyzeResponse>({ success: true, data: result });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] 💥 오류 발생 (${totalDuration}ms): ${errorMsg}`);
    console.error('='.repeat(80) + '\n');

    return NextResponse.json<SajuAnalyzeResponse>(
      { success: false, error: errorMsg, fallback: generateSajuMockResult() },
      { status: 500 }
    );
  }
}
