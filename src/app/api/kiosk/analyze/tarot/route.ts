import { NextRequest, NextResponse } from 'next/server';
import type { TarotAnalysisResult, TarotTopic } from '@/types/analysis';
import { kioskEnabled, mockAllowed } from '@/lib/kiosk/access';
import { isKioskLang, type KioskLang } from '@/lib/kiosk/i18n';
import { generateParsed } from '@/lib/kiosk/program-core';
import { buildTarotDemo, buildTarotPrompt, buildTarotSpread, parseTarotResponse, toTarotResult } from '@/lib/kiosk/tarot-analysis';
import { TAROT_TOPICS, parseTarotDraws } from '@/lib/kiosk/tarot-deck';

// 키오스크 AI 타로 — 손님이 화면에서 뽑은 메이저 아르카나 세 장(과거·현재·미래)을 읽는다.
// 카드는 요청에 실려 오고 서버는 검증만 한다(0~21, 서로 다른 세 장). 향은 미래 카드의 원소 후보에서 고른다.
// 다른 키오스크 분석 라우트와 같은 게이트·같은 원칙: 실패해도 가짜 풀이로 넘어가지 않는다.

interface KioskTarotResponse {
  success: boolean;
  data?: TarotAnalysisResult;
  error?: string;
  mocked?: boolean;
}

export async function POST(request: NextRequest) {
  const requestId = `KIOSK-TAROT-${Date.now().toString(36)}`;

  if (!kioskEnabled(request)) {
    return NextResponse.json<KioskTarotResponse>({ success: false, error: 'KIOSK_DISABLED' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { name?: unknown; gender?: unknown; topic?: unknown; question?: unknown; cards?: unknown; lang?: unknown; mock?: unknown };
    const lang: KioskLang = isKioskLang(body.lang) ? body.lang : 'ko';
    const topic = TAROT_TOPICS.find((t) => t === body.topic) as TarotTopic | undefined;
    if (!topic) {
      return NextResponse.json<KioskTarotResponse>({ success: false, error: 'INVALID_TOPIC' }, { status: 400 });
    }
    const draws = parseTarotDraws(body.cards);
    if (!draws) {
      return NextResponse.json<KioskTarotResponse>({ success: false, error: 'INVALID_CARDS' }, { status: 400 });
    }
    // 질문은 프롬프트에 따옴표로 들어간다 — 줄바꿈·따옴표를 걷어내 한 줄로
    const question = typeof body.question === 'string' ? body.question.replace(/["\n\r]+/g, ' ').trim().slice(0, 80) : '';
    const spread = buildTarotSpread(topic, question || undefined, draws);
    console.log(`[${requestId}] 카드 ${spread.cards.map((c) => `${c.id}${c.reversed ? 'R' : ''}`).join(' ')} / ${topic} / 원소 ${spread.scentElement}`);

    if ((body.mock === true && mockAllowed()) || !process.env.OPENROUTER_API_KEY) {
      console.log(`[${requestId}] 데모 응답 반환`);
      return NextResponse.json<KioskTarotResponse>({ success: true, data: buildTarotDemo(lang, spread), mocked: true });
    }

    const prompt = buildTarotPrompt({
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 20) : '게스트',
      gender: typeof body.gender === 'string' ? body.gender.slice(0, 12) : '',
      lang,
      spread,
    });
    const parsed = await generateParsed({
      requestId, prompt, temperature: 0.85,
      parse: (text) => parseTarotResponse(text, lang, spread),
    });
    console.log(`[${requestId}] 향 ${parsed.pick.perfume.id}`);
    return NextResponse.json<KioskTarotResponse>({ success: true, data: toTarotResult(parsed, lang, spread) });
  } catch (error) {
    console.error(`[${requestId}] 타로 분석 실패:`, error instanceof Error ? error.message : error);
    return NextResponse.json<KioskTarotResponse>({ success: false, error: 'ANALYZE_FAILED' }, { status: 500 });
  }
}
