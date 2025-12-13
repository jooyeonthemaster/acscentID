import { NextRequest, NextResponse } from 'next/server';
import { getModel, withTimeout } from '@/lib/gemini/client';
import { buildGeminiPrompt } from '@/lib/gemini/prompt-builder';
import { parseGeminiResponse } from '@/lib/gemini/response-parser';
import { AnalyzeRequest, AnalyzeResponse } from '@/types/gemini';
import { ImageAnalysisResult } from '@/types/analysis';
import { perfumes } from '@/data/perfumes';

// Mock 데이터 생성 함수 (fallback용)
function generateMockResult(): ImageAnalysisResult {
  const randomPerfume = perfumes[Math.floor(Math.random() * perfumes.length)];

  return {
    traits: {
      sexy: Math.floor(Math.random() * 7) + 2,
      cute: Math.floor(Math.random() * 7) + 2,
      charisma: Math.floor(Math.random() * 7) + 2,
      darkness: Math.floor(Math.random() * 7) + 2,
      freshness: Math.floor(Math.random() * 7) + 2,
      elegance: Math.floor(Math.random() * 7) + 2,
      freedom: Math.floor(Math.random() * 7) + 2,
      luxury: Math.floor(Math.random() * 7) + 2,
      purity: Math.floor(Math.random() * 7) + 2,
      uniqueness: Math.floor(Math.random() * 7) + 2,
    },
    scentCategories: {
      citrus: Math.floor(Math.random() * 7) + 2,
      floral: Math.floor(Math.random() * 7) + 2,
      woody: Math.floor(Math.random() * 7) + 2,
      musky: Math.floor(Math.random() * 7) + 2,
      fruity: Math.floor(Math.random() * 7) + 2,
      spicy: Math.floor(Math.random() * 7) + 2,
    },
    dominantColors: ['#A8785A', '#784B33', '#212121', '#F2E3D5'],
    personalColor: {
      season: 'autumn',
      tone: 'mute',
      palette: ['#A8785A', '#784B33', '#212121', '#F2E3D5'],
      description: '완전 가을의 여신! 🍂 깊고 차분한 톤이 찰떡이야! 세상에서 제일 예쁜 조합!',
    },
    analysis: {
      mood: '세상만사 귀찮은 듯 늘어진 모습! 몽환적인 분위기에 넋을 잃겠어! 완전 힐링 바이브! 💤✨',
      style: '미니멀리즘의 정수! 심플하면서도 세련된 완벽한 조합! 이게 바로 진정한 쿨함이야! 🖤',
      expression: '영혼 가출 직전! 탈진한 듯한 표정이 오히려 더 매력적! 피곤해도 예쁜 게 말이 돼? 😴💕',
      concept: '지친 현대인의 초상! 무기력 속에서 빛나는 독특한 아우라! 완전 힙해! 🌙',
    },
    matchingKeywords: ['무기력', '피곤', '커피', '휴식', '일상'],
    matchingPerfumes: [
      {
        perfumeId: randomPerfume.id,
        score: 0.85 + Math.random() * 0.1,
        matchReason: `${randomPerfume.name} 향이 완전 찰떡! 이건 진짜 운명이야! 💕✨`,
        persona: {
          id: randomPerfume.id,
          name: randomPerfume.name,
          description: randomPerfume.description,
          traits: randomPerfume.traits,
          categories: randomPerfume.characteristics,
          keywords: randomPerfume.keywords,
          primaryColor: randomPerfume.primaryColor,
          secondaryColor: randomPerfume.secondaryColor,
          mainScent: randomPerfume.mainScent,
          subScent1: randomPerfume.subScent1,
          subScent2: randomPerfume.subScent2,
          recommendation: randomPerfume.recommendation,
          mood: randomPerfume.mood,
          personality: randomPerfume.personality,
        },
      },
    ],
    comparisonAnalysis: {
      imageInterpretation: '사진 보는 순간 표정부터 완전 눈길 사로잡혔어! 😮 되게 자연스러우면서도 뭔가 생각에 잠긴 듯한 분위기? 🤔 전체적으로 차분하고 쿨톤 색감이 주는 세련된 느낌이 있고, 자세도 편안해서 부담 없는 힐링 바이브가 느껴져! 💙✨ 옷 스타일도 심플한데 그게 오히려 포인트!',
      userInputSummary: '너는 다양한 스타일과 성격을 선택했을 거야! 구체적으로 뭘 골랐는지는 모르겠지만, 네가 생각하는 너 자신의 이미지를 담은 선택들이겠지? 🌸 어떤 매력 포인트를 강조했는지도 너만의 개성이 담겨있을 거고! ✨',
      reflectionDetails: '오케이 본격 비교 분석 시작! 🔥\n\n【일치】혹시 너 차분한 스타일이나 편안한 성격 골랐어? 그럼 완전 맞아! 나도 사진에서 표정이랑 자세로 여유로움 엄청 느꼈거든! 💯 이 부분은 자기이해 완벽!\n\n【차이】근데 있잖아, 사진만 봤을 땐 약간 쿨한 느낌도 있더라고? 😮 만약 네가 따뜻한 쪽 선택했다면, 겉으론 차가워 보이지만 속은 따뜻한 갭 매력일 수도! 이게 진짜 숨은 포인트!\n\n【대조】혹시 화려한 스타일 골랐어? 사진이랑은 약간 다를 수 있는데, 이건 상황에 따라 다양한 모습을 보여줄 수 있다는 증거야! 🎭 사진 속 차분함과 실제 화려함의 조화가 매력!\n\n【최종 향수】이 모든 분석 종합! 사진 속 차분함(AI) + 너의 개성(유저) + 숨은 매력(발견) = 이 향수 선택! 진짜 완벽 조합! 💕✨',
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. 요청 파싱
    const body: AnalyzeRequest = await request.json();
    const { formData, imageBase64 } = body;

    if (!formData) {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          error: 'Form data is required',
          fallback: generateMockResult(),
        },
        { status: 400 }
      );
    }

    // 2. API 키 확인
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          error: 'API key not configured',
          fallback: generateMockResult(),
        },
        { status: 500 }
      );
    }

    // 3. 프롬프트 생성
    const prompt = buildGeminiPrompt(formData);

    // 4. Gemini 모델 가져오기
    const model = getModel();

    // 5. 요청 parts 구성
    const parts: any[] = [{ text: prompt }];

    // 이미지 포함 (있을 경우)
    if (imageBase64) {
      // data:image/jpeg;base64,/9j/4AAQ... 형식에서 base64 부분만 추출
      const base64Data = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      });
    }

    // 6. Gemini API 호출 (30초 타임아웃)
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts }],
      }),
      30000,
      'Gemini API request timed out (30 seconds)'
    );

    // 7. 응답 텍스트 추출
    const responseText = result.response.text();

    // 8. 응답 파싱 및 검증
    const parsedData = parseGeminiResponse(responseText);

    // 9. 성공 응답
    return NextResponse.json<AnalyzeResponse>({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    // 에러 로깅
    console.error('Gemini API Error:', error);
    console.error('Error details:', error.message);

    // Fallback mock 데이터 반환
    return NextResponse.json<AnalyzeResponse>(
      {
        success: false,
        error: error.message || 'Unknown error occurred',
        fallback: generateMockResult(),
      },
      { status: 500 }
    );
  }
}
