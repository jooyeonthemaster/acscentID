import { perfumes, Perfume } from '@/data/perfumes';
import { getLocalizedPerfumeText } from '@/data/perfumes-i18n';
import type { Locale } from '@/i18n/config';

// 토큰 최적화된 향수 데이터 형식
export interface OptimizedPerfume {
  id: string;
  name: string;
  traits: {
    sexy: number;
    cute: number;
    charisma: number;
    darkness: number;
    freshness: number;
    elegance: number;
    freedom: number;
    luxury: number;
    purity: number;
    uniqueness: number;
  };
  characteristics: {
    citrus: number;
    floral: number;
    woody: number;
    musky: number;
    fruity: number;
    spicy: number;
  };
  keywords: string[];
  mood: string;
  personality: string;
  mainScent: string;
  description: string;
}

// 30개 향수를 최적화된 형식으로 변환 (locale별 번역 데이터 사용)
export function formatPerfumesForPrompt(locale: Locale = 'ko'): OptimizedPerfume[] {
  return perfumes.map((perfume: Perfume) => {
    const localized = getLocalizedPerfumeText(perfume.id, locale);
    return {
      id: perfume.id,
      name: localized?.name || perfume.name,
      traits: perfume.traits,
      characteristics: perfume.characteristics,
      keywords: localized?.keywords || perfume.keywords,
      mood: localized?.mood || perfume.mood,
      personality: localized?.personality || perfume.personality,
      mainScent: localized?.mainScent || perfume.mainScent.name,
      description: (localized?.description || perfume.description).slice(0, 100),
    };
  });
}

// 특정 ID로 전체 향수 데이터 가져오기
export function getPerfumeById(perfumeId: string): Perfume | undefined {
  return perfumes.find(p => p.id === perfumeId);
}
