import { NextRequest, NextResponse } from 'next/server';
import { getModel, withTimeout } from '@/lib/gemini/client';
import { buildGeminiPrompt, FormDataInput } from '@/lib/gemini/prompt-builder';
import { parseGeminiResponse } from '@/lib/gemini/response-parser';
import { sanitizeSelfAnalysisTone } from '@/lib/gemini/self-tone';
import { ImageAnalysisResult } from '@/types/analysis';
import { perfumes } from '@/data/perfumes';
import { kioskEnabled, mockAllowed } from '@/lib/kiosk/access';

// 키오스크 전용 분석 라우트 — /api/analyze와 동일한 파이프라인(프롬프트→Gemini→파서)이되
// 인증·일일한도 게이트가 없다. 무인 기기에서 로그인 없이 돌아야 하기 때문.
// 대신 프로덕션 배포에서는 KIOSK_ENABLED=1을 명시해야만 열린다(무과금 개방 방지).

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

interface KioskAnalyzeRequest {
  formData: FormDataInput;
  imageBase64?: string;
  mock?: boolean;
}

interface KioskAnalyzeResponse {
  success: boolean;
  data?: ImageAnalysisResult;
  error?: string;
  mocked?: boolean;
}


const MAX_IMAGE_BASE64_CHARS = 4_000_000; // ≈3MB 이미지 — 키오스크 캡처(720x960 q0.8)의 10배 여유
const MAX_LIST_ITEMS = 8;
const MAX_ITEM_CHARS = 30;

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .slice(0, MAX_LIST_ITEMS)
    .map((v) => v.slice(0, MAX_ITEM_CHARS));
}

// 키오스크 데모/폴백용 mock — /api/analyze의 generateMockResult와 동일한 스키마.
// 키오스크는 셀프 분석이므로 차분한 톤 문구를 쓴다.
function generateKioskMockResult(): ImageAnalysisResult {
  const p = perfumes[Math.floor(Math.random() * perfumes.length)];
  const r = () => Math.floor(Math.random() * 7) + 2;

  return {
    traits: {
      sexy: r(), cute: r(), charisma: r(), darkness: r(), freshness: r(),
      elegance: r(), freedom: r(), luxury: r(), purity: r(), uniqueness: r(),
    },
    scentCategories: {
      citrus: r(), floral: r(), woody: r(), musky: r(), fruity: r(), spicy: r(),
    },
    dominantColors: ['#A8785A', '#784B33', '#212121', '#F2E3D5'],
    personalColor: {
      season: 'autumn',
      tone: 'mute',
      palette: ['#A8785A', '#784B33', '#212121', '#F2E3D5'],
      description: '깊고 차분한 톤이 잘 어울리는 가을 뮤트 타입입니다.',
    },
    analysis: {
      mood: '차분한 가운데 또렷한 존재감이 느껴지는 분위기입니다. 편안함과 집중력이 공존합니다.',
      style: '군더더기 없는 실루엣과 정돈된 톤 매치가 인상적입니다.',
      expression: '자연스러운 표정에서 여유와 안정감이 드러납니다.',
      concept: '일상 속에서 은은하게 빛나는 미니멀 무드.',
    },
    matchingKeywords: ['차분함', '집중', '미니멀', '온기', '일상'],
    matchingPerfumes: [
      {
        perfumeId: p.id,
        score: 0.85 + Math.random() * 0.1,
        matchReason: `${p.name}의 결이 사진 속 분위기와 자연스럽게 겹칩니다.`,
        persona: {
          id: p.id,
          name: p.name,
          description: p.description,
          traits: p.traits,
          categories: p.characteristics,
          keywords: p.keywords,
          primaryColor: p.primaryColor,
          secondaryColor: p.secondaryColor,
          mainScent: { ...p.mainScent, fanComment: '첫인상을 여는 탑 노트입니다.' },
          subScent1: { ...p.subScent1, fanComment: '중심을 잡아주는 미들 노트입니다.' },
          subScent2: { ...p.subScent2, fanComment: '잔향으로 남는 베이스 노트입니다.' },
          recommendation: p.recommendation,
          mood: p.mood,
          personality: p.personality,
          usageGuide: {
            situation: '하루를 시작하며 가볍게 한두 번 분사하세요.',
            tips: ['손목과 귀 뒤에 소량 분사', '문지르지 말고 자연 건조', '옷보다는 피부에 직접'],
          },
        },
      },
    ],
    comparisonAnalysis: {
      imageInterpretation: '사진에서는 차분하고 정돈된 분위기가 먼저 읽힙니다.',
      userInputSummary: '선택하신 스타일과 성격 키워드가 반영되었습니다.',
      reflectionDetails: '이미지의 인상과 선택 키워드를 종합해 향을 매칭했습니다.',
    },
  };
}

export async function POST(request: NextRequest) {
  const requestId = `KIOSK-${Date.now().toString(36)}`;

  if (!kioskEnabled(request)) {
    return NextResponse.json<KioskAnalyzeResponse>(
      { success: false, error: 'KIOSK_DISABLED' },
      { status: 403 }
    );
  }

  // 바디 크기 상한 — request.json()은 임의 크기를 통째로 버퍼링한다
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_IMAGE_BASE64_CHARS + 64_000) {
    return NextResponse.json<KioskAnalyzeResponse>(
      { success: false, error: 'PAYLOAD_TOO_LARGE' },
      { status: 413 }
    );
  }

  try {
    const body = (await request.json()) as KioskAnalyzeRequest;
    const { formData, imageBase64, mock } = body;

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json<KioskAnalyzeResponse>(
        { success: false, error: 'formData is required' },
        { status: 400 }
      );
    }
    if (imageBase64 !== undefined) {
      if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
        return NextResponse.json<KioskAnalyzeResponse>(
          { success: false, error: 'INVALID_IMAGE' },
          { status: 400 }
        );
      }
    }

    const cleanForm = {
      name: typeof formData.name === 'string' ? formData.name.slice(0, 40) : '게스트',
      gender: typeof formData.gender === 'string' ? formData.gender.slice(0, 12) : 'Other',
      targetType: 'self' as const,
      styles: sanitizeStringList(formData.styles),
      customStyle: '',
      personalities: sanitizeStringList(formData.personalities),
      customPersonality: '',
      charmPoints: sanitizeStringList(formData.charmPoints),
      customCharm: '',
    };

    // 데모 모드(개발/명시적 허용 시) 또는 키 미설정 시 mock 반환 — 응답에 mocked를 명시해
    // 클라이언트가 '데모 결과'임을 표기하고 실제 제조용으로 오인되지 않게 한다
    if ((mock && mockAllowed()) || !process.env.OPENROUTER_API_KEY) {
      console.log(`[${requestId}] mock 응답 반환 (mock=${Boolean(mock)}, key=${Boolean(process.env.OPENROUTER_API_KEY)})`);
      return NextResponse.json<KioskAnalyzeResponse>({
        success: true,
        data: sanitizeSelfAnalysisTone(generateKioskMockResult()),
        mocked: true,
      });
    }

    const prompt = buildGeminiPrompt(cleanForm, 'ko');
    const model = getModel();

    const parts: GeminiPart[] = [{ text: prompt }];
    if (imageBase64) {
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
    }

    console.log(`[${requestId}] Gemini 호출 시작 (image=${Boolean(imageBase64)})`);
    const started = Date.now();
    const result = await withTimeout(
      model.generateContent({ contents: [{ role: 'user', parts }] }),
      60000,
      'Gemini API request timed out (60 seconds)'
    );
    console.log(`[${requestId}] 응답 수신 (${Date.now() - started}ms)`);

    const responseText = result.response.text();
    const parsed = parseGeminiResponse(responseText, 'ko');
    const data = sanitizeSelfAnalysisTone(parsed);

    return NextResponse.json<KioskAnalyzeResponse>({ success: true, data });
  } catch (error: unknown) {
    // 상세 오류는 서버 로그에만 — 무인증 엔드포인트라 업스트림 오류 원문을 노출하지 않는다.
    // mock 폴백도 주지 않는다: 가짜 레시피가 실물 영수증으로 인쇄되면 안 된다 (클라이언트는 재시도 UX).
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] 분석 실패:`, message);
    return NextResponse.json<KioskAnalyzeResponse>(
      { success: false, error: 'ANALYZE_FAILED' },
      { status: 500 }
    );
  }
}
