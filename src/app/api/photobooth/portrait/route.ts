import { NextRequest, NextResponse } from 'next/server'
import { generateWithModels } from '@/lib/booth/image-models'
import { IdolError, readIdolTicket } from '@/lib/booth/idol-generate'
import { DEMO_TICKET_OWNER, takeDemoGeneration } from '@/lib/booth/demo-server'
import { buildFacePortraitPrompt, PORTRAIT_ATTEMPTS, PORTRAIT_USES, portraitPeople } from '@/lib/booth/programs/portrait'
import { buildSajuPortraitPrompt } from '@/lib/booth/programs/saju-portrait'

/** 초상을 그리는 프로그램 → 지시문(관상: 동양풍 옛 초상, 사주: 후광 · 구름 · 한복의 새해 소원 카드) */
const PROMPTS: Record<'nh-face' | 'nh-saju', (people: number) => string> = { 'nh-face': buildFacePortraitPrompt, 'nh-saju': () => buildSajuPortraitPrompt() }
type PortraitProgram = keyof typeof PROMPTS
const isPortraitProgram = (v: unknown): v is PortraitProgram => typeof v === 'string' && v in PROMPTS

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 키 — 연말 시상식 전용 키가 있으면 그것(~/.claude/CLAUDE.md 키 규칙: 프로젝트 키), 없으면 부스 공통 키 */
const portraitKey = () => process.env.OPENROUTER_NH_API_KEY || process.env.OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY || process.env.OPENROUTER_PHOTOBOOTH_API_KEY || ''

/** 표마다 만든 초상 수(인스턴스 안) — 글(/api/photobooth/reading)이 쓰는 표 횟수와 따로 센다 */
const made = new Map<string, number>()

/**
 * 새해 관상 FACE!(nh-face) 동양풍 초상 · 정미년 사주 SAJU!(nh-saju) 새해 소원 카드 초상 — 부스 전용, 비로그인
 * POST /api/photobooth/portrait  { ticket, program: 'nh-face' | 'nh-saju', photo: 'data:image/jpeg;base64,…'(긴 변 1024), people?: 기기가 센 얼굴 수 }
 * → { image: 'data:image/jpeg;base64,…' }
 *
 * 부스는 촬영 직후 이 요청을 보내고, 손님이 주제를 고르는 동안 받는다. 실패하면 부스는 찍은 사진을 세피아로 바꿔 같은 원판에 넣는다(손님을 막지 않는다).
 * 표는 사진 프로그램과 같은 생성 표 — 서명 · 기한만 확인하고 횟수는 여기서 따로 센다(표 하나로 초상 2장). 데모 표는 데모 상한을 같이 쓴다.
 * 손님 사진은 생성에만 쓰고 저장 · 기록하지 않는다.
 */
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 2_500_000) return NextResponse.json({ error: '사진이 너무 커요.' }, { status: 413 })
    const body = await request.json().catch(() => null)
    const program = body?.program
    if (!isPortraitProgram(program)) return NextResponse.json({ error: '프로그램을 확인해 주세요.' }, { status: 400 })
    const photo = typeof body?.photo === 'string' && /^data:image\/jpeg;base64,/.test(body.photo) && body.photo.length <= 2_000_000 ? body.photo as string : null
    if (!photo) return NextResponse.json({ error: '사진이 필요해요.' }, { status: 400 })
    const { payload, pass } = readIdolTicket(body?.ticket)
    const used = made.get(payload) ?? 0
    if (used >= PORTRAIT_USES) throw new IdolError('이번 이용권으로 만들 수 있는 초상을 다 만들었어요.', 429)
    if (!portraitKey()) throw new IdolError('AI 초상 키가 아직 설정되지 않았어요.', 503)
    if (pass === DEMO_TICKET_OWNER) await takeDemoGeneration()
    made.set(payload, used + 1)
    if (made.size > 2000) for (const key of [...made.keys()].slice(0, 1000)) made.delete(key)

    const people = portraitPeople(body?.people)
    const result = await generateWithModels({
      key: { value: portraitKey(), title: `AC'SCENT photobooth ${program}` }, log: 'nh-portrait',
      attempts: PORTRAIT_ATTEMPTS, prompt: PROMPTS[program](people), photos: [photo], label: `${program} ${people}명`,
    })
    return NextResponse.json({ image: result.image }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof IdolError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[nh-portrait] 오류:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'AI 초상을 만들지 못했어요.' }, { status: 500 })
  }
}
