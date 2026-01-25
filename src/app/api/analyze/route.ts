import { NextRequest, NextResponse } from 'next/server';
import { getModel, withTimeout } from '@/lib/gemini/client';
import { buildGeminiPrompt, buildFigureGeminiPrompt, FigureDataInput } from '@/lib/gemini/prompt-builder';
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
          mainScent: {
            ...randomPerfume.mainScent,
            fanComment: '첫인상부터 심장 저격하는 탑노트! 💘 우리 애의 밝은 에너지가 딱 이 향이야! ✨',
          },
          subScent1: {
            ...randomPerfume.subScent1,
            fanComment: '우리 애의 다채로운 매력을 담은 미들노트! 🌸💕 이 향 맡으면 자동 심쿵!',
          },
          subScent2: {
            ...randomPerfume.subScent2,
            fanComment: '은은하게 남는 베이스노트가 우리 애 숨은 카리스마 표현! 🌙✨ 반전매력 실화!',
          },
          recommendation: '우리 애 생각하면서 출근할 때 뿌려! 💼✨ 하루 종일 행복한 향기에 취해서 일하다가 퇴근 후엔 콘텐츠 보면서 힐링! 콘서트 가기 전에 뿌리면 현장에서 우리 애랑 향으로 연결되는 기분! 🎤💕',
          mood: randomPerfume.mood,
          personality: randomPerfume.personality,
          usageGuide: {
            situation: '우리 애 생각하면서 출근할 때 뿌려! 💼✨',
            tips: [
              '손목에 뿌리고 귀 뒤에 살짝 톡톡! 우리 애 포카 볼 때마다 향기가 올라와서 행복 두 배! 🌸✨',
              '옷보다 피부에 직접! 체온으로 향이 퍼지면서 우리 애 따뜻한 매력이 느껴지는 착각 옴! 💕🔥',
              '문지르지 말고 자연 건조! 향의 레이어가 살아있어야 우리 애의 다채로운 매력처럼 시간별로 다르게 느껴짐! 🌈✨',
            ],
          },
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
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log('\n' + '='.repeat(80));
  console.log(`[${requestId}] 🚀 분석 요청 시작`);
  console.log('='.repeat(80));

  try {
    // 1. 요청 파싱
    const body: AnalyzeRequest & { programType?: string; figureData?: FigureDataInput } = await request.json();
    const { formData, imageBase64, programType, figureData } = body;

    // 피규어 모드 여부
    const isFigureMode = programType === 'figure';

    // 📊 입력 데이터 로깅
    console.log(`\n[${requestId}] 📊 입력 데이터:`);
    console.log(`  - 프로그램 타입: ${programType || 'default'}`);
    console.log(`  - 아이돌 이름: ${formData?.name || 'N/A'}`);
    console.log(`  - 성별: ${formData?.gender || 'N/A'}`);
    console.log(`  - 스타일: ${formData?.styles?.join(', ') || 'N/A'}`);
    console.log(`  - 성격: ${formData?.personalities?.join(', ') || 'N/A'}`);
    console.log(`  - 매력 포인트: ${formData?.charmPoints?.join(', ') || 'N/A'}`);
    console.log(`  - 이미지 첨부: ${imageBase64 ? '✅ YES' : '❌ NO'}`);
    if (imageBase64) {
      const imageSize = imageBase64.length;
      console.log(`  - 이미지 크기: ${(imageSize / 1024).toFixed(2)} KB`);
    }

    // 피규어 모드 추가 로깅
    if (isFigureMode && figureData) {
      console.log(`  - [피규어] 기억 이야기: ${figureData.memoryStory?.substring(0, 50)}...`);
      console.log(`  - [피규어] 감정: ${figureData.emotion}`);
      console.log(`  - [피규어] 계절/시간: ${figureData.seasonTime}`);
      console.log(`  - [피규어] 색감: ${figureData.colorTone}`);
      console.log(`  - [피규어] 요청사항: ${figureData.figureRequest || '없음'}`);
      console.log(`  - [피규어] 피규어 이미지: ${figureData.figureImageBase64 ? '✅ YES' : '❌ NO'}`);
    }

    if (!formData) {
      console.log(`[${requestId}] ❌ 오류: Form data 누락`);
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
      console.error(`[${requestId}] ❌ 오류: GEMINI_API_KEY 미설정`);
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          error: 'API key not configured',
          fallback: generateMockResult(),
        },
        { status: 500 }
      );
    }
    console.log(`[${requestId}] ✅ API 키 확인 완료`);

    // 3. 프롬프트 생성 (피규어 모드 분기)
    let prompt: string;
    if (isFigureMode && figureData) {
      prompt = buildFigureGeminiPrompt(formData, figureData);
      console.log(`[${requestId}] ✅ 피규어 전용 프롬프트 생성 완료 (${prompt.length} 문자)`);
    } else {
      prompt = buildGeminiPrompt(formData);
      console.log(`[${requestId}] ✅ 일반 프롬프트 생성 완료 (${prompt.length} 문자)`);
    }

    // 4. Gemini 모델 가져오기
    const model = getModel();
    console.log(`[${requestId}] ✅ Gemini 모델 초기화 완료`);

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
      console.log(`[${requestId}] ✅ 기억 장면 이미지 첨부 완료`);
    } else {
      console.log(`[${requestId}] ⚠️ 이미지 없이 텍스트만 분석`);
    }

    // 피규어 모드: 피규어 이미지 추가 첨부
    if (isFigureMode && figureData?.figureImageBase64) {
      const figureBase64Data = figureData.figureImageBase64.includes(',')
        ? figureData.figureImageBase64.split(',')[1]
        : figureData.figureImageBase64;

      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: figureBase64Data,
        },
      });
      console.log(`[${requestId}] ✅ 피규어용 이미지 첨부 완료`);
    }

    // 6. Gemini API 호출 (60초 타임아웃)
    console.log(`[${requestId}] 🔄 Gemini API 호출 중...`);
    const apiStartTime = Date.now();

    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts }],
      }),
      60000,
      'Gemini API request timed out (60 seconds)'
    );

    const apiDuration = Date.now() - apiStartTime;
    console.log(`[${requestId}] ✅ Gemini API 응답 수신 (${apiDuration}ms)`);

    // 7. 응답 텍스트 추출
    const responseText = result.response.text();
    console.log(`[${requestId}] 📝 응답 텍스트 길이: ${responseText.length} 문자`);

    // 🔍 AI 응답 핵심 내용 로깅 (디버깅용)
    console.log(`\n[${requestId}] 🔍 AI 응답 미리보기:`);
    console.log('-'.repeat(60));
    // imageInterpretation 부분 추출해서 로깅
    const imageInterpMatch = responseText.match(/"imageInterpretation"\s*:\s*"([^"]+)"/);
    if (imageInterpMatch) {
      console.log(`  📸 이미지 해석: ${imageInterpMatch[1].substring(0, 200)}...`);
    }
    // traits 부분 추출
    const traitsMatch = responseText.match(/"traits"\s*:\s*\{([^}]+)\}/);
    if (traitsMatch) {
      console.log(`  📊 특성값: ${traitsMatch[1].substring(0, 150)}...`);
    }
    // perfumeId 추출
    const perfumeIdMatch = responseText.match(/"perfumeId"\s*:\s*"([^"]+)"/);
    if (perfumeIdMatch) {
      console.log(`  🧴 추천 향수: ${perfumeIdMatch[1]}`);
    }
    console.log('-'.repeat(60));

    // 8. 응답 파싱 및 검증
    console.log(`[${requestId}] 🔄 응답 파싱 중...`);
    const parsedData = parseGeminiResponse(responseText);
    console.log(`[${requestId}] ✅ 응답 파싱 완료`);

    // 파싱 결과 요약 로깅
    console.log(`\n[${requestId}] 📋 파싱 결과 요약:`);
    console.log(`  - traits.sexy: ${parsedData.traits.sexy}`);
    console.log(`  - traits.cute: ${parsedData.traits.cute}`);
    console.log(`  - traits.charisma: ${parsedData.traits.charisma}`);
    console.log(`  - traits.darkness: ${parsedData.traits.darkness}`);
    console.log(`  - 추천 향수: ${parsedData.matchingPerfumes[0]?.persona?.id || 'N/A'}`);
    console.log(`  - 매칭 점수: ${parsedData.matchingPerfumes[0]?.score || 'N/A'}`);

    const totalDuration = Date.now() - startTime;
    console.log(`\n[${requestId}] ✅ 분석 완료 (총 ${totalDuration}ms)`);
    console.log('='.repeat(80) + '\n');

    // 9. 성공 응답
    return NextResponse.json<AnalyzeResponse>({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;

    // 상세 에러 로깅
    console.error(`\n[${requestId}] ❌ 오류 발생 (${totalDuration}ms 경과)`);
    console.error(`[${requestId}] 에러 타입: ${error.name || 'Unknown'}`);
    console.error(`[${requestId}] 에러 메시지: ${error.message}`);
    if (error.stack) {
      console.error(`[${requestId}] 스택 트레이스:\n${error.stack}`);
    }
    console.error('='.repeat(80) + '\n');

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
