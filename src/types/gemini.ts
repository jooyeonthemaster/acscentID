import { ImageAnalysisResult } from './analysis';

// API 요청 타입
export interface AnalyzeRequest {
  formData: {
    name: string;
    gender: string;
    styles: string[];
    customStyle: string;
    personalities: string[];
    customPersonality: string;
    charmPoints: string[];
    customCharm: string;
  };
  imageBase64?: string; // base64 data URL
}

// API 응답 타입 (성공)
export interface AnalyzeSuccessResponse {
  success: true;
  data: ImageAnalysisResult;
}

// API 응답 타입 (실패)
export interface AnalyzeErrorResponse {
  success: false;
  error: string;
  fallback: ImageAnalysisResult; // Mock 데이터
}

// API 응답 타입 (통합)
export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
