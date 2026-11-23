// POST! 우체통 — 글에만 AI 를 쓴다: 받아쓰기 · 맞춤법 다듬기 · 산타 답장. 사진은 AI 로 바꾸지 않는다.
// 키: OPENROUTER_POST_API_KEY (초안은 R&D 키 STUDIO_RND_DONGJU 값을 .env.local 에 넣어 씀).
// 프로젝트 · 고객 행사가 정해지면 그 키(STUDIO_ / B2B_)로 바꾼다.

const MODEL = 'google/gemini-3-flash-preview'

function key() {
  const k = process.env.OPENROUTER_POST_API_KEY
  if (!k) throw new Error('OPENROUTER_POST_API_KEY 가 없어요')
  return k
}

async function askJson<T>(content: unknown[], timeoutMs = 20000): Promise<{ data: T; cost: number | null }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', 'X-Title': 'POST! mailbox booth (draft)' },
    body: JSON.stringify({ model: MODEL, response_format: { type: 'json_object' }, temperature: 0.4, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const body = await res.json().catch(() => null)
  const text: string | undefined = body?.choices?.[0]?.message?.content
  if (!res.ok || !text) throw new Error(`AI 응답 오류 ${res.status}`)
  const json = text.replace(/^```(?:json)?\s*|\s*```$/g, '')
  return { data: JSON.parse(json) as T, cost: body?.usage?.cost ?? null }
}

export interface LetterResult {
  heard: boolean
  raw: string
  text: string
  lines: string[]
  from: string
  blocked: boolean
}

/** 녹음(16kHz 모노 WAV, base64) → 받아쓰기 + 맞춤법만 다듬기 + 엽서 줄 나누기 + 막을 말 거르기 */
export async function transcribeLetter(wavBase64: string, toLine: string, santa: boolean) {
  const prompt = `너는 우체통 포토부스의 받아쓰기 담당이다. 손님이 「${toLine}」 보내는 엽서에 쓸 말을 녹음했다.${santa ? ' 아이가 산타 할아버지께 소원을 말하는 경우가 많다.' : ''}

아래 JSON 하나로만 답한다.
{
  "heard": 사람 말소리가 있고 알아들을 수 있으면 true,
  "raw": 들린 그대로 받아쓴 글,
  "text": raw 에서 맞춤법 · 띄어쓰기만 고친 글. 단어를 바꾸거나 새 문장을 보태지 않는다. "어", "음" 같은 군말만 뺀다. 말투(반말 · 존댓말 · 사투리)는 그대로,
  "from": 말 끝이나 처음에 자기 이름을 밝혔으면 그 이름만(「민준이가」 → 「민준」, 「저는 지호예요」 → 「지호」), 없으면 "",
  "lines": text 를 엽서에 손글씨로 쓸 줄로 나눈 배열. 뜻이 끊기지 않게, 한 줄 16자 안팎, 최대 5줄. from 에 넣은 이름 인사(「민준이가」 「저는 지호예요」)만 lines 에서 뺀다 — from 이 "" 이면 아무것도 빼지 않는다,
  "blocked": 욕설 · 혐오 · 성적인 말 · 남을 해치는 말 · 전화번호 · 집 주소 · 주민번호 같은 개인정보가 있으면 true
}`
  const { data, cost } = await askJson<LetterResult>([
    { type: 'text', text: prompt },
    { type: 'input_audio', input_audio: { data: wavBase64, format: 'wav' } },
  ])
  const lines = Array.isArray(data.lines) ? data.lines.map((l) => String(l).trim()).filter(Boolean).slice(0, 5) : []
  return {
    result: {
      heard: Boolean(data.heard) && lines.length > 0,
      raw: String(data.raw ?? ''),
      text: String(data.text ?? ''),
      lines,
      from: String(data.from ?? '').trim().slice(0, 8),
      blocked: Boolean(data.blocked),
    } satisfies LetterResult,
    cost,
  }
}

export interface SantaReply {
  lines: string[]
  long: string
}

/** 아이의 소원 편지 → 산타 답장(엽서 4줄 + QR 로 보는 긴 편지) */
export async function santaReply(wish: string, name: string) {
  const prompt = `너는 북극의 산타 할아버지다. 한국 아이${name ? ` 「${name}」` : ''}가 크리스마스 우체통에 보낸 편지에 답장을 쓴다.

아이가 보낸 편지: 「${wish}」

규칙
- 할아버지 말투(「~단다」 「~렴」 「~구나」), 따뜻하고 짧게. 아이가 바로 읽을 수 있는 쉬운 말.
- 아이가 말한 잘한 일이 있으면 하나 짚어 칭찬한다. 없으면 편지를 보내 준 마음을 칭찬한다.
- 선물을 약속하지 않는다. 「꼭 줄게」 「갖다줄게」 「준비했단다」 같은 말 금지. 「크리스마스 아침을 기대하렴」 「산타 할아버지가 잘 기억해 둘게」까지만.
- 소원이 장난감이 아닌 무거운 내용(아픈 가족, 다툼, 이별 등)이면 이뤄 주겠다고 하지 않고, 마음을 알아주고 응원하는 말만 쓴다.
- 이름을 모르면 이름을 지어내지 않는다.

아래 JSON 하나로만 답한다.
{ "lines": 엽서에 쓸 답장 4줄 배열(한 줄 16자 안팎), "long": QR 로 보는 긴 답장 편지 6~10줄(줄바꿈 \\n) }`
  const { data, cost } = await askJson<SantaReply>([{ type: 'text', text: prompt }])
  return {
    result: {
      lines: (Array.isArray(data.lines) ? data.lines : []).map((l) => String(l).trim()).filter(Boolean).slice(0, 5),
      long: String(data.long ?? ''),
    } satisfies SantaReply,
    cost,
  }
}
