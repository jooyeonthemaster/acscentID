import { ImageAnalysisResult } from '@/types/analysis';
import { getPerfumeById } from './perfume-formatter';

// Gemini 응답 파싱
export function parseGeminiResponse(responseText: string): ImageAnalysisResult {
  try {
    // JSON 파싱
    const parsed = JSON.parse(responseText);

    // 검증
    validateTraits(parsed.traits);
    validateScentCategories(parsed.scentCategories);
    validatePersonalColor(parsed.personalColor);
    validateAnalysis(parsed.analysis);
    validateMatchingPerfumes(parsed.matchingPerfumes);

    // matchingPerfumes[0]에 전체 persona 데이터 추가
    const perfumeId = parsed.matchingPerfumes[0]?.perfumeId;
    const perfumeData = getPerfumeById(perfumeId);

    if (!perfumeData) {
      throw new Error(`Perfume not found: ${perfumeId}`);
    }

    const result: ImageAnalysisResult = {
      traits: parsed.traits,
      scentCategories: parsed.scentCategories,
      dominantColors: parsed.dominantColors || ['#FF7E9D', '#FFD8E6', '#FFFFFF', '#FFC0CB'],
      personalColor: parsed.personalColor,
      analysis: parsed.analysis,
      matchingKeywords: parsed.matchingKeywords || [],
      matchingPerfumes: [
        {
          perfumeId: perfumeData.id,
          score: parsed.matchingPerfumes[0].score,
          matchReason: parsed.matchingPerfumes[0].matchReason,
          persona: {
            id: perfumeData.id,
            name: perfumeData.name,
            description: perfumeData.description,
            traits: perfumeData.traits,
            categories: perfumeData.characteristics,
            keywords: perfumeData.keywords,
            primaryColor: perfumeData.primaryColor,
            secondaryColor: perfumeData.secondaryColor,
            mainScent: perfumeData.mainScent,
            subScent1: perfumeData.subScent1,
            subScent2: perfumeData.subScent2,
            recommendation: perfumeData.recommendation,
            mood: perfumeData.mood,
            personality: perfumeData.personality,
          },
        },
      ],
      comparisonAnalysis: parsed.comparisonAnalysis || undefined,
    };

    return result;
  } catch (error) {
    console.error('Gemini response parsing error:', error);
    console.error('Response text:', responseText);
    throw new Error('Failed to parse Gemini response');
  }
}

// Traits 검증
function validateTraits(traits: any) {
  const requiredKeys = ['sexy', 'cute', 'charisma', 'darkness', 'freshness', 'elegance', 'freedom', 'luxury', 'purity', 'uniqueness'];

  for (const key of requiredKeys) {
    if (typeof traits[key] !== 'number' || traits[key] < 1 || traits[key] > 10) {
      throw new Error(`Invalid trait value for ${key}: ${traits[key]}`);
    }
  }
}

// Scent categories 검증
function validateScentCategories(categories: any) {
  const requiredKeys = ['citrus', 'floral', 'woody', 'musky', 'fruity', 'spicy'];

  for (const key of requiredKeys) {
    if (typeof categories[key] !== 'number' || categories[key] < 1 || categories[key] > 10) {
      throw new Error(`Invalid scent category value for ${key}: ${categories[key]}`);
    }
  }
}

// Personal color 검증
function validatePersonalColor(personalColor: any) {
  const validSeasons = ['spring', 'summer', 'autumn', 'winter'];
  const validTones = ['bright', 'light', 'mute', 'deep'];

  if (!validSeasons.includes(personalColor.season)) {
    throw new Error(`Invalid season: ${personalColor.season}`);
  }

  if (!validTones.includes(personalColor.tone)) {
    throw new Error(`Invalid tone: ${personalColor.tone}`);
  }

  if (!Array.isArray(personalColor.palette) || personalColor.palette.length < 4) {
    throw new Error('Personal color palette must have at least 4 colors');
  }

  if (!personalColor.description || personalColor.description.trim().length === 0) {
    throw new Error('Personal color description is required');
  }
}

// Analysis 검증
function validateAnalysis(analysis: any) {
  const requiredFields = ['mood', 'style', 'expression', 'concept'];

  for (const field of requiredFields) {
    if (!analysis[field] || analysis[field].trim().length === 0) {
      throw new Error(`Analysis field ${field} is required`);
    }
  }
}

// Matching perfumes 검증
function validateMatchingPerfumes(perfumes: any[]) {
  if (!Array.isArray(perfumes) || perfumes.length !== 1) {
    throw new Error('Exactly 1 perfume must be recommended');
  }

  const perfume = perfumes[0];

  if (!perfume.perfumeId || !perfume.perfumeId.startsWith("AC'SCENT")) {
    throw new Error(`Invalid perfume ID: ${perfume.perfumeId}`);
  }

  if (typeof perfume.score !== 'number' || perfume.score < 0.7 || perfume.score > 1.0) {
    throw new Error(`Invalid perfume score: ${perfume.score}`);
  }

  if (!perfume.matchReason || perfume.matchReason.trim().length === 0) {
    throw new Error('Perfume matchReason is required');
  }
}
