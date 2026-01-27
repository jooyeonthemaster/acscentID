import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini API 클라이언트 초기화
export function initializeGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  // 디버깅용: 실제 사용되는 API 키 확인 (앞 15자만 표시)
  console.log(`[Gemini] 사용 중인 API 키: ${apiKey?.substring(0, 15)}...`);

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  return new GoogleGenerativeAI(apiKey);
}

// Gemini 모델 가져오기
export function getModel() {
  const genAI = initializeGemini();

  return genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 8192,
      responseMimeType: "application/json", // JSON 응답 강제
    },
  });
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
