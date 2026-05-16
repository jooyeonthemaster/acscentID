import { NextRequest, NextResponse } from 'next/server';
import { getModelWithConfig, withTimeout } from '@/lib/gemini/client';
import { buildChemistryIndividualPrompt, buildChemistryProfilePrompt, ChemistryUserInput } from '@/lib/gemini/chemistry-prompt-builder';
import { parseChemistryIndividualResponse, parseChemistryProfileResponse } from '@/lib/gemini/chemistry-response-parser';
import { ImageAnalysisResult, ChemistryProfile, ChemistryAnalysisResult } from '@/types/analysis';
import { getApiLocale } from '@/lib/api-locale';
import { requireAuthenticatedUser } from '@/lib/auth/require-user';
import { consumeDailyAnalysisLimit, dailyAnalysisLimitExceededResponse } from '@/lib/analysis/daily-limit';
import { sanitizeSelfAnalysisTone } from '@/lib/gemini/self-tone';

interface ChemistryAnalyzeRequest {
  character1Name: string;
  character2Name: string;
  character1ImageBase64: string;
  character2ImageBase64: string;
  relationTropes: string[];
  character1Archetypes: string[];
  character2Archetypes: string[];
  scenes: string[];
  emotionKeywords: string[];
  scentDirection: number;
  message: string;
  customTrope?: string;
  customArchetype1?: string;
  customArchetype2?: string;
  customScene?: string;
  customEmotion?: string;
  targetType?: 'idol' | 'self';
}

interface ChemistryAnalyzeResponse {
  success: boolean;
  data?: ChemistryAnalysisResult;
  partial?: {
    characterA?: ImageAnalysisResult;
    characterB?: ImageAnalysisResult;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  const requestId = `CHEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log('\n' + '='.repeat(80));
  console.log(`[${requestId}] 🧪 케미 분석 요청 시작`);
  console.log('='.repeat(80));

  try {
    // 0. 인증 — 비로그인 분석 차단 (서버 사이드 강제)
    const authedUser = await requireAuthenticatedUser();
    if (!authedUser) {
      console.warn(`[${requestId}] ❌ 비로그인 케미 분석 시도 차단`);
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 0-1. 언어 감지
    const locale = getApiLocale(request);

    // 1. 요청 파싱
    const body: ChemistryAnalyzeRequest = await request.json();
    const {
      character1Name, character2Name,
      character1ImageBase64, character2ImageBase64,
      relationTropes, character1Archetypes, character2Archetypes,
      scenes, emotionKeywords, scentDirection, message,
      customTrope, customArchetype1, customArchetype2, customScene, customEmotion,
      targetType,
    } = body;
    const resolvedTargetType: 'idol' | 'self' = targetType === 'self' ? 'self' : 'idol';

    console.log(`[${requestId}] 📊 입력 데이터:`);
    console.log(`  - 캐릭터 A: ${character1Name}`);
    console.log(`  - 캐릭터 B: ${character2Name}`);
    console.log(`  - 관계 트로프: ${relationTropes.join(', ')}`);
    console.log(`  - 감정 키워드: ${emotionKeywords.join(', ')}`);
    console.log(`  - 이미지 A: ${character1ImageBase64 ? 'YES' : 'NO'}`);
    console.log(`  - 이미지 B: ${character2ImageBase64 ? 'YES' : 'NO'}`);

    // 2. API 키 확인
    if (!process.env.GEMINI_API_KEY) {
      console.error(`[${requestId}] API 키 미설정`);
      return NextResponse.json<ChemistryAnalyzeResponse>(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    const usage = await consumeDailyAnalysisLimit({
      userId: authedUser.id,
      email: authedUser.email,
      provider: authedUser.provider,
      productType: 'chemistry_set',
      endpoint: '/api/analyze/chemistry',
      targetType: resolvedTargetType,
    });
    if (!usage.allowed) {
      console.warn(`[${requestId}] Daily analysis limit exceeded`, usage);
      return dailyAnalysisLimitExceededResponse(usage);
    }
    console.log(`[${requestId}] Daily analysis usage consumed: ${usage.usedCount}/${usage.dailyLimit}`);

    // ===== Phase 1: 개별 분석 =====
    console.log(`[${requestId}] 🔄 Phase 1: 개별 분석 시작`);
    const phase1Start = Date.now();

    const individualPrompt = buildChemistryIndividualPrompt(character1Name, character2Name, locale, resolvedTargetType);
    const individualModel = getModelWithConfig({ maxOutputTokens: 12288, temperature: 0.7 });

    // 이미지 parts 구성
    const extractBase64 = (base64: string) => base64.includes(',') ? base64.split(',')[1] : base64;

    const individualParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: individualPrompt },
    ];

    if (character1ImageBase64) {
      individualParts.push({
        inlineData: { mimeType: 'image/jpeg', data: extractBase64(character1ImageBase64) },
      });
    }
    if (character2ImageBase64) {
      individualParts.push({
        inlineData: { mimeType: 'image/jpeg', data: extractBase64(character2ImageBase64) },
      });
    }

    let characterA: ImageAnalysisResult;
    let characterB: ImageAnalysisResult;

    // [FIX] HIGH: Phase 1 실패 시 1회 retry 추가
    const attemptPhase1 = async () => {
      const phase1Result = await withTimeout(
        individualModel.generateContent({
          contents: [{ role: 'user', parts: individualParts }],
        }),
        45000,
        'Phase 1 timed out (45s)'
      );

      const phase1Text = phase1Result.response.text();
      console.log(`[${requestId}] Phase 1 응답 길이: ${phase1Text.length}`);

      const individuals = parseChemistryIndividualResponse(phase1Text, locale);
      return individuals;
    };

    try {
      let individuals;
      try {
        individuals = await attemptPhase1();
      } catch (firstAttemptError: unknown) {
        const errorMsg = firstAttemptError instanceof Error ? firstAttemptError.message : 'Unknown error';
        console.warn(`[${requestId}] Phase 1 첫 번째 시도 실패, 재시도 중: ${errorMsg}`);
        individuals = await attemptPhase1();
      }

      characterA = individuals.characterA;
      characterB = individuals.characterB;

      // [FIX] HIGH: 같은 향수 매칭 시 B의 차순위 향수로 대체
      if (
        characterA.matchingPerfumes[0]?.perfumeId &&
        characterB.matchingPerfumes[0]?.perfumeId &&
        characterA.matchingPerfumes[0].perfumeId === characterB.matchingPerfumes[0].perfumeId
      ) {
        console.warn(`[${requestId}] 같은 향수 매칭 감지: ${characterA.matchingPerfumes[0].perfumeId}`);
        if (characterB.matchingPerfumes.length > 1) {
          // 차순위 향수로 교체
          const [, ...rest] = characterB.matchingPerfumes;
          characterB = { ...characterB, matchingPerfumes: [...rest, characterB.matchingPerfumes[0]] };
          console.log(`[${requestId}] B 향수를 차순위로 교체: ${characterB.matchingPerfumes[0]?.perfumeId}`);
        }
      }

      console.log(`[${requestId}] Phase 1 완료 (${Date.now() - phase1Start}ms)`);
      console.log(`  - A 향수: ${characterA.matchingPerfumes[0]?.perfumeId}`);
      console.log(`  - B 향수: ${characterB.matchingPerfumes[0]?.perfumeId}`);
    } catch (phase1Error: unknown) {
      const errorMsg = phase1Error instanceof Error ? phase1Error.message : 'Unknown error';
      console.error(`[${requestId}] Phase 1 실패 (재시도 포함): ${errorMsg}`);

      // Phase 1 실패 시 partial 없이 에러 반환
      return NextResponse.json<ChemistryAnalyzeResponse>(
        { success: false, error: `개별 분석 실패: ${errorMsg}` },
        { status: 500 }
      );
    }

    // ===== Phase 2: 케미 프로필 =====
    console.log(`[${requestId}] 🔄 Phase 2: 케미 프로필 시작`);
    const phase2Start = Date.now();

    const userInput: ChemistryUserInput = {
      character1Name,
      character2Name,
      relationTropes: customTrope?.trim() ? [...relationTropes, customTrope.trim()] : relationTropes,
      character1Archetypes: customArchetype1?.trim() ? [...character1Archetypes, customArchetype1.trim()] : character1Archetypes,
      character2Archetypes: customArchetype2?.trim() ? [...character2Archetypes, customArchetype2.trim()] : character2Archetypes,
      scenes: customScene?.trim() ? [...scenes, customScene.trim()] : scenes,
      emotionKeywords: customEmotion?.trim() ? [...emotionKeywords, customEmotion.trim()] : emotionKeywords,
      scentDirection,
      message,
    };

    const profilePrompt = buildChemistryProfilePrompt(characterA, characterB, userInput, locale, resolvedTargetType);
    const profileModel = getModelWithConfig({ maxOutputTokens: 6144, temperature: 0.8 });

    let chemistry: ChemistryProfile;

    try {
      const phase2Result = await withTimeout(
        profileModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: profilePrompt }] }],
        }),
        30000,
        'Phase 2 timed out (30s)'
      );

      const phase2Text = phase2Result.response.text();
      console.log(`[${requestId}] Phase 2 응답 길이: ${phase2Text.length}`);

      chemistry = parseChemistryProfileResponse(phase2Text);

      console.log(`[${requestId}] Phase 2 완료 (${Date.now() - phase2Start}ms)`);
      console.log(`  - 케미 타입: ${chemistry.chemistryType}`);
      console.log(`  - 케미 칭호: ${chemistry.chemistryTitle}`);
    } catch (phase2Error: unknown) {
      const errorMsg = phase2Error instanceof Error ? phase2Error.message : 'Unknown error';
      console.error(`[${requestId}] Phase 2 실패: ${errorMsg}`);

      // [FIX] HIGH: Phase 2 실패 시 207 partial 반환 (개별 분석은 성공)
      return NextResponse.json<ChemistryAnalyzeResponse>({
        success: false,
        error: `케미 프로필 생성 실패: ${errorMsg}`,
        partial: { characterA, characterB },
      }, { status: 207 });
    }

    // ===== 최종 결과 =====
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] 케미 분석 완료 (총 ${totalDuration}ms)`);
    console.log('='.repeat(80) + '\n');

    const result: ChemistryAnalysisResult = {
      characterA,
      characterB,
      chemistry,
    };
    const responseData = resolvedTargetType === 'self'
      ? sanitizeSelfAnalysisTone(result)
      : result;

    return NextResponse.json<ChemistryAnalyzeResponse>({
      success: true,
      data: responseData,
    });

  } catch (error: unknown) {
    const totalDuration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] 오류 발생 (${totalDuration}ms): ${errorMsg}`);
    console.error('='.repeat(80) + '\n');

    return NextResponse.json<ChemistryAnalyzeResponse>(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
