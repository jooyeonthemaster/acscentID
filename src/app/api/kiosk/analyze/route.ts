import { NextRequest, NextResponse } from 'next/server';
import { getModel, withTimeout } from '@/lib/gemini/client';
import { buildGeminiPrompt, FormDataInput } from '@/lib/gemini/prompt-builder';
import { parseGeminiResponse } from '@/lib/gemini/response-parser';
import { sanitizeSelfAnalysisTone } from '@/lib/gemini/self-tone';
import { ImageAnalysisResult } from '@/types/analysis';
import { perfumes } from '@/data/perfumes';
import { kioskEnabled, mockAllowed } from '@/lib/kiosk/access';
import { isKioskLang, analysisLocale, type KioskLang } from '@/lib/kiosk/i18n';
import { toTraditionalChinesePrompt, applyTraditionalPersona } from '@/lib/kiosk/analysis-lang';
import { getLocalizedPerfumeText } from '@/data/perfumes-i18n';

// 키오스크 전용 분석 라우트 — /api/analyze와 동일한 파이프라인(프롬프트→Gemini→파서)이되
// 인증·일일한도 게이트가 없다. 무인 기기에서 로그인 없이 돌아야 하기 때문.
// 대신 프로덕션 배포에서는 KIOSK_ENABLED=1을 명시해야만 열린다(무과금 개방 방지).

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

interface KioskAnalyzeRequest {
  formData: FormDataInput;
  imageBase64?: string;
  mock?: boolean;
  /** 키오스크 화면 언어 — AI 문장과 향수 텍스트가 이 언어로 나온다 (기본 ko) */
  lang?: KioskLang;
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
// 데모 결과 문구 — 개발·데모에서도 화면 전체가 선택 언어로 보이도록 언어별로 둔다
const MOCK_TEXT: Record<KioskLang, {
  colorDesc: string; mood: string; style: string; expression: string; concept: string;
  keywords: string[]; matchReason: (name: string) => string; notes: [string, string, string];
  situation: string; tips: string[]; imageInterpretation: string; userInputSummary: string; reflection: string;
}> = {
  ko: {
    colorDesc: '깊고 차분한 톤이 잘 어울리는 가을 뮤트 타입입니다.',
    mood: '차분한 가운데 또렷한 존재감이 느껴지는 분위기입니다. 편안함과 집중력이 공존합니다.',
    style: '군더더기 없는 실루엣과 정돈된 톤 매치가 인상적입니다.',
    expression: '자연스러운 표정에서 여유와 안정감이 드러납니다.',
    concept: '일상 속에서 은은하게 빛나는 미니멀 무드.',
    keywords: ['차분함', '집중', '미니멀', '온기', '일상'],
    matchReason: (name) => `${name}의 결이 사진 속 분위기와 자연스럽게 겹칩니다.`,
    notes: ['첫인상을 여는 탑 노트입니다.', '중심을 잡아주는 미들 노트입니다.', '잔향으로 남는 베이스 노트입니다.'],
    situation: '하루를 시작하며 가볍게 한두 번 분사하세요.',
    tips: ['손목과 귀 뒤에 소량 분사', '문지르지 말고 자연 건조', '옷보다는 피부에 직접'],
    imageInterpretation: '사진에서는 차분하고 정돈된 분위기가 먼저 읽힙니다.',
    userInputSummary: '선택하신 스타일과 성격 키워드가 반영되었습니다.',
    reflection: '이미지의 인상과 선택 키워드를 종합해 향을 매칭했습니다.',
  },
  en: {
    colorDesc: 'A muted autumn type that suits deep, calm tones.',
    mood: 'A calm mood with a clear, quiet presence. Comfort and focus sit side by side.',
    style: 'A clean silhouette with a tidy, well-balanced tone.',
    expression: 'The natural expression shows ease and composure.',
    concept: 'A minimal mood that glows softly in everyday life.',
    keywords: ['Calm', 'Focus', 'Minimal', 'Warmth', 'Everyday'],
    matchReason: (name) => `${name} blends naturally with the mood of the photo.`,
    notes: ['The top note that opens the first impression.', 'The middle note that anchors the heart.', 'The base note that lingers.'],
    situation: 'Spray lightly once or twice as you start your day.',
    tips: ['A little on wrists and behind the ears', "Let it dry — don't rub", 'On skin rather than clothes'],
    imageInterpretation: 'The photo first reads as calm and composed.',
    userInputSummary: 'Your chosen style and personality keywords are reflected.',
    reflection: 'We matched the scent by combining the image impression with your keywords.',
  },
  ja: {
    colorDesc: '深く落ち着いたトーンが似合う秋ミュートタイプです。',
    mood: '落ち着きの中に、はっきりとした存在感が感じられる雰囲気です。心地よさと集中力が共存しています。',
    style: '無駄のないシルエットと整ったトーンのバランスが印象的です。',
    expression: '自然な表情から、余裕と安定感が伝わります。',
    concept: '日常の中でほのかに輝くミニマルなムード。',
    keywords: ['落ち着き', '集中', 'ミニマル', 'ぬくもり', '日常'],
    matchReason: (name) => `${name}の質感が、写真の雰囲気と自然に重なります。`,
    notes: ['第一印象をひらくトップノートです。', '中心を支えるミドルノートです。', '余韻として残るベースノートです。'],
    situation: '一日の始まりに、軽く1〜2回スプレーしてください。',
    tips: ['手首と耳の後ろに少量', 'こすらず自然に乾かす', '服より肌に直接'],
    imageInterpretation: '写真からはまず、落ち着いて整った雰囲気が読み取れます。',
    userInputSummary: '選んだスタイルと性格のキーワードが反映されています。',
    reflection: '画像の印象と選んだキーワードを総合して香りをマッチングしました。',
  },
  'zh-Hans': {
    colorDesc: '适合深沉柔和色调的秋季柔和型。',
    mood: '沉静之中透着鲜明的存在感，舒适与专注并存。',
    style: '简洁的轮廓与协调的色调搭配令人印象深刻。',
    expression: '自然的表情流露出从容与安定。',
    concept: '在日常中微微发光的极简氛围。',
    keywords: ['沉静', '专注', '极简', '温暖', '日常'],
    matchReason: (name) => `${name}的质感与照片的氛围自然契合。`,
    notes: ['开启第一印象的前调。', '稳住核心的中调。', '留下余韵的后调。'],
    situation: '开始新的一天时，轻喷一两下即可。',
    tips: ['在手腕和耳后少量喷洒', '不要揉搓，让它自然干燥', '直接喷在皮肤上而非衣物上'],
    imageInterpretation: '照片首先传达出沉静、整洁的氛围。',
    userInputSummary: '已反映你所选的风格与性格关键词。',
    reflection: '综合图像印象与所选关键词完成了香气匹配。',
  },
  'zh-Hant': {
    colorDesc: '適合深沉柔和色調的秋季柔和型。',
    mood: '沉靜之中透著鮮明的存在感，舒適與專注並存。',
    style: '簡潔的輪廓與協調的色調搭配令人印象深刻。',
    expression: '自然的表情流露出從容與安定。',
    concept: '在日常中微微發光的極簡氛圍。',
    keywords: ['沉靜', '專注', '極簡', '溫暖', '日常'],
    matchReason: (name) => `${name}的質感與照片的氛圍自然契合。`,
    notes: ['開啟第一印象的前調。', '穩住核心的中調。', '留下餘韻的後調。'],
    situation: '開始新的一天時，輕噴一兩下即可。',
    tips: ['在手腕和耳後少量噴灑', '不要搓揉，讓它自然乾燥', '直接噴在皮膚上而非衣物上'],
    imageInterpretation: '照片首先傳達出沉靜、整潔的氛圍。',
    userInputSummary: '已反映你所選的風格與個性關鍵字。',
    reflection: '綜合圖像印象與所選關鍵字完成了香氣配對。',
  },
};

function generateKioskMockResult(lang: KioskLang = 'ko'): ImageAnalysisResult {
  const p = perfumes[Math.floor(Math.random() * perfumes.length)];
  const m = MOCK_TEXT[lang];
  // 향수 텍스트는 분석 경로와 같은 번역 데이터를 쓴다 (번체는 아래에서 applyTraditionalPersona 로 덮는다)
  const { locale } = analysisLocale(lang);
  const loc = locale === 'ko' ? undefined : getLocalizedPerfumeText(p.id, locale);
  const pName = loc?.name ?? p.name;
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
      description: m.colorDesc,
    },
    analysis: {
      mood: m.mood,
      style: m.style,
      expression: m.expression,
      concept: m.concept,
    },
    matchingKeywords: m.keywords,
    matchingPerfumes: [
      {
        perfumeId: p.id,
        score: 0.85 + Math.random() * 0.1,
        matchReason: m.matchReason(pName),
        persona: {
          id: p.id,
          name: pName,
          description: loc?.description ?? p.description,
          traits: p.traits,
          categories: p.characteristics,
          keywords: loc?.keywords ?? p.keywords,
          primaryColor: p.primaryColor,
          secondaryColor: p.secondaryColor,
          mainScent: { ...p.mainScent, name: loc?.mainScent ?? p.mainScent.name, fanComment: m.notes[0] },
          subScent1: { ...p.subScent1, name: loc?.subScent1 ?? p.subScent1.name, fanComment: m.notes[1] },
          subScent2: { ...p.subScent2, name: loc?.subScent2 ?? p.subScent2.name, fanComment: m.notes[2] },
          recommendation: m.situation,
          mood: loc?.mood ?? p.mood,
          personality: loc?.personality ?? p.personality,
          usageGuide: {
            situation: m.situation,
            tips: m.tips,
          },
        },
      },
    ],
    comparisonAnalysis: {
      imageInterpretation: m.imageInterpretation,
      userInputSummary: m.userInputSummary,
      reflectionDetails: m.reflection,
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
    const lang: KioskLang = isKioskLang(body.lang) ? body.lang : 'ko';
    const { locale, traditional } = analysisLocale(lang);
    // 번체는 향수 로컬 텍스트를 번체 표로 덮는다 (간체 번역 → 번체)
    const finalize = (r: ImageAnalysisResult) =>
      sanitizeSelfAnalysisTone(traditional ? applyTraditionalPersona(r) : r);

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
        data: finalize(generateKioskMockResult(lang)),
        mocked: true,
      });
    }

    const basePrompt = buildGeminiPrompt(cleanForm, locale);
    const prompt = traditional ? toTraditionalChinesePrompt(basePrompt) : basePrompt;
    const model = getModel();

    const parts: GeminiPart[] = [{ text: prompt }];
    if (imageBase64) {
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
    }

    console.log(`[${requestId}] Gemini 호출 시작 (image=${Boolean(imageBase64)}, lang=${lang})`);
    const started = Date.now();
    const result = await withTimeout(
      model.generateContent({ contents: [{ role: 'user', parts }] }),
      60000,
      'Gemini API request timed out (60 seconds)'
    );
    console.log(`[${requestId}] 응답 수신 (${Date.now() - started}ms)`);

    const responseText = result.response.text();
    const parsed = parseGeminiResponse(responseText, locale);
    const data = finalize(parsed);

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
