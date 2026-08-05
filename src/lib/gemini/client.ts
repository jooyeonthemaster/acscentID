// OpenRouter 경유 Gemini 호출 클라이언트
// 기존 @google/generative-ai SDK의 model.generateContent(...) → result.response.text()
// 인터페이스를 그대로 유지하는 어댑터 — 호출부(라우트/스크립트)는 모델 획득부 외에 변경이 없다.
// 모든 텍스트 분석은 Gemini 3.0 Flash(google/gemini-3-flash-preview)로 통일한다.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const OPENROUTER_TEXT_MODEL = 'google/gemini-3-flash-preview';
export const OPENROUTER_IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

interface TextPart { text: string }
interface InlineDataPart { inlineData: { mimeType?: string; data: string } }
type GeminiPart = string | TextPart | InlineDataPart;

// 기존 SDK 시절 호출부가 쓰는 3가지 요청 형태를 모두 수용한다.
type GenerateContentRequest =
  | string
  | GeminiPart[]
  | { contents: Array<{ role?: string; parts: GeminiPart[] }> };

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | OpenAIContentPart[];
}

export interface OpenRouterChatOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  /** false면 response_format(json_object) 강제를 해제한다. 기본은 기존 클라이언트와 동일하게 JSON 강제. */
  json?: boolean;
  /** 이미지 생성 모델용 (예: ['image', 'text']) */
  modalities?: Array<'text' | 'image'>;
}

export interface OpenRouterCompletion {
  choices?: Array<{
    message?: {
      content?: string | OpenAIContentPart[] | null;
      images?: Array<{ type?: string; image_url?: { url?: string } }>;
    };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: number | string };
}

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }
  return apiKey;
}

// OpenRouter 원 호출 — 이미지 생성처럼 raw 응답이 필요한 곳(graduation-image)에서도 직접 사용
export async function openRouterChat(
  messages: OpenRouterMessage[],
  options: OpenRouterChatOptions = {}
): Promise<OpenRouterCompletion> {
  const body: Record<string, unknown> = {
    model: options.model ?? OPENROUTER_TEXT_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    top_p: options.topP ?? 0.9,
    max_tokens: options.maxOutputTokens ?? 8192,
  };
  if (options.json !== false) {
    body.response_format = { type: 'json_object' };
  }
  if (options.modalities) {
    body.modalities = options.modalities;
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'X-Title': "AC'SCENT",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter API error ${res.status}: ${raw.slice(0, 500)}`);
  }

  const data = JSON.parse(raw) as OpenRouterCompletion;
  if (data.error) {
    throw new Error(`OpenRouter API error: ${data.error.message ?? JSON.stringify(data.error)}`);
  }
  return data;
}

function normalizeRequest(request: GenerateContentRequest): GeminiPart[] {
  if (typeof request === 'string') return [{ text: request }];
  if (Array.isArray(request)) return request;
  return request.contents.flatMap((content) => content.parts);
}

function toOpenAIContent(parts: GeminiPart[]): string | OpenAIContentPart[] {
  const hasInlineData = parts.some((part) => typeof part !== 'string' && 'inlineData' in part);

  if (!hasInlineData) {
    return parts
      .map((part) => (typeof part === 'string' ? part : (part as TextPart).text))
      .join('\n\n');
  }

  return parts.map((part): OpenAIContentPart => {
    if (typeof part === 'string') return { type: 'text', text: part };
    if ('inlineData' in part) {
      const mimeType = part.inlineData.mimeType ?? 'image/jpeg';
      return { type: 'image_url', image_url: { url: `data:${mimeType};base64,${part.inlineData.data}` } };
    }
    return { type: 'text', text: part.text };
  });
}

export function extractResponseText(data: OpenRouterCompletion): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part): part is Extract<OpenAIContentPart, { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }
  return '';
}

export interface GeminiCompatModel {
  generateContent: (request: GenerateContentRequest) => Promise<{ response: { text: () => string } }>;
}

// Gemini 모델 가져오기 (기본 설정)
export function getModel(): GeminiCompatModel {
  return getModelWithConfig({});
}

// 동적 설정 모델 가져오기
// 주의: 구 SDK의 safetySettings 파라미터는 제거됨 — OpenRouter의 Google 라우팅은
// 기본적으로 가장 완화된 안전 설정을 적용하므로 별도 완화 옵션이 필요 없다.
export function getModelWithConfig(options: {
  maxOutputTokens?: number;
  temperature?: number;
  json?: boolean;
} = {}): GeminiCompatModel {
  return {
    async generateContent(request) {
      const content = toOpenAIContent(normalizeRequest(request));
      const data = await openRouterChat([{ role: 'user', content }], {
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        json: options.json,
      });
      const text = extractResponseText(data);
      return { response: { text: () => text } };
    },
  };
}

// 타임아웃 wrapper
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]);
}
