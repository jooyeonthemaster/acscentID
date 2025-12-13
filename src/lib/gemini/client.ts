import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini API 클라이언트 초기화
export function initializeGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  return new GoogleGenerativeAI(apiKey);
}

// Gemini 모델 가져오기
export function getModel() {
  const genAI = initializeGemini();

  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
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
