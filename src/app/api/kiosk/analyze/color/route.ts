import { NextRequest, NextResponse } from 'next/server';
import type { ColorAnalysisResult } from '@/types/analysis';
import { kioskEnabled, mockAllowed } from '@/lib/kiosk/access';
import { isKioskLang, type KioskLang } from '@/lib/kiosk/i18n';
import { buildColorDemo, buildColorPrompt, diagnoseFromMeasure, parseColorResponse, readColorMeasure } from '@/lib/kiosk/color-analysis';
import { generateParsed, promptLine } from '@/lib/kiosk/program-core';

// 키오스크 AI 퍼스널 컬러 진단 — 사진 한 장으로 8유형 중 하나를 진단한다(향 추천 없음 — 진단서만).
// 다른 키오스크 분석 라우트와 같은 게이트(kioskEnabled)·같은 원칙: 실패해도 가짜 결과로 넘어가지 않는다.
// 사진은 AI 서버로만 가고 저장·기록하지 않는다(기기 아카이브에도 넘기지 않는다 — KioskClient).

// generateParsed 는 88초 안에 끝난다(program-core) — 플랫폼 기본 한도에 걸려 중간에 죽지 않게
export const maxDuration = 120;

interface KioskColorResponse {
  success: boolean;
  data?: ColorAnalysisResult;
  error?: string;
  mocked?: boolean;
}

const MAX_IMAGE_BASE64_CHARS = 4_000_000; // /api/kiosk/analyze 와 같은 상한
const MAX_FOCUS_BASE64_CHARS = 1_500_000;

export async function POST(request: NextRequest) {
  const requestId = `KIOSK-COLOR-${Date.now().toString(36)}`;

  if (!kioskEnabled(request)) {
    return NextResponse.json<KioskColorResponse>({ success: false, error: 'KIOSK_DISABLED' }, { status: 403 });
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  // 원본 + 진단용 얼굴 사진(작다 — 긴 변 768px)
  if (contentLength > MAX_IMAGE_BASE64_CHARS + MAX_FOCUS_BASE64_CHARS + 64_000) {
    return NextResponse.json<KioskColorResponse>({ success: false, error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }

  try {
    const body = (await request.json()) as { name?: unknown; gender?: unknown; imageBase64?: unknown; focusImage?: unknown; measure?: unknown; lang?: unknown; mock?: unknown };
    const lang: KioskLang = isKioskLang(body.lang) ? body.lang : 'ko';
    const image = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    if (!image || image.length > MAX_IMAGE_BASE64_CHARS) {
      return NextResponse.json<KioskColorResponse>({ success: false, error: 'INVALID_IMAGE' }, { status: 400 });
    }

    if ((body.mock === true && mockAllowed()) || !process.env.OPENROUTER_API_KEY) {
      console.log(`[${requestId}] 데모 응답 반환`);
      return NextResponse.json<KioskColorResponse>({ success: true, data: buildColorDemo(), mocked: true });
    }

    // 기기가 옷·배경을 지운 진단용 사진을 같이 보냈으면 그것으로 진단한다 — 같은 얼굴이 옷 색에 따라 다른 유형으로 나오던 것을 막는다.
    // 없으면(모델을 아직 못 받은 기기) 원본으로 — 지시문이 옷·배경을 근거로 쓰지 말라고 한다
    const focusImage = typeof body.focusImage === 'string' && body.focusImage.length > 2_000 && body.focusImage.length <= MAX_FOCUS_BASE64_CHARS ? body.focusImage : null;
    const measure = readColorMeasure(body.measure);
    // 측정값으로 유형을 정한다(같은 사람은 같은 결과) — AI 는 그 유형의 설명을 쓴다. 다르게 답하면 다시 받는다
    const measured = diagnoseFromMeasure(measure);
    const prompt = buildColorPrompt({
      name: promptLine(body.name, 20) || 'Guest',
      gender: promptLine(body.gender, 12),
      lang,
      focused: Boolean(focusImage),
      measure,
    });
    console.log(`[${requestId}] 사진 ${focusImage ? '진단용(옷·배경 지움)' : '원본'}${measure ? ` · 피부 L${measure.skin.L} a${measure.skin.a} b${measure.skin.b}${measure.hair ? ` · 머리 L${measure.hair.L}` : ''} · 측정 진단 ${measured ? (measured.typeId ?? measured.undertone) : '없음(AI 판단)'}` : ''}`);
    // 진단은 같은 사진이면 같은 답이 나와야 한다 — 온도 0.3 에서는 같은 사진이 웜·쿨로 갈렸다(5번 중 2번),
    // 0 에서는 8번 모두 같은 유형이었다(2026-10-08 실측)
    const parsed = await generateParsed({
      requestId, prompt, image: focusImage ?? image, temperature: 0, lang,
      parse: (text) => parseColorResponse(text, measured),
    });
    if (!parsed) {
      console.log(`[${requestId}] 얼굴 없음`);
      return NextResponse.json<KioskColorResponse>({ success: false, error: 'NO_FACE' }, { status: 422 });
    }
    console.log(`[${requestId}] 진단 ${parsed.colorDiagnosis.typeId} (${parsed.colorDiagnosis.confidence})`);
    return NextResponse.json<KioskColorResponse>({ success: true, data: parsed });
  } catch (error) {
    // 상세 오류는 로그에만 — 무인증 엔드포인트라 업스트림 메시지를 노출하지 않는다
    console.error(`[${requestId}] 퍼스널 컬러 진단 실패:`, error instanceof Error ? error.message : error);
    return NextResponse.json<KioskColorResponse>({ success: false, error: 'ANALYZE_FAILED' }, { status: 500 });
  }
}
