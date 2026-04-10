import { ImageAnalysisResult, ChemistryProfile, ChemistryType } from '@/types/analysis';
import { parseGeminiResponse } from './response-parser';
import type { Locale } from '@/i18n/config';

/**
 * Phase 1 응답 파싱: 두 캐릭터 개별 분석 결과
 */
export function parseChemistryIndividualResponse(
  responseText: string,
  locale: Locale = 'ko'
): { characterA: ImageAnalysisResult; characterB: ImageAnalysisResult } {
  try {
    let parsed = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }

    if (!parsed.characterA || !parsed.characterB) {
      throw new Error('Missing characterA or characterB in response');
    }

    // 각 캐릭터를 기존 파서로 재구성
    const characterAText = JSON.stringify(parsed.characterA);
    const characterBText = JSON.stringify(parsed.characterB);

    const characterA = parseGeminiResponse(characterAText, locale);
    const characterB = parseGeminiResponse(characterBText, locale);

    // 같은 향수 매칭 검증
    const perfumeIdA = characterA.matchingPerfumes[0]?.perfumeId;
    const perfumeIdB = characterB.matchingPerfumes[0]?.perfumeId;

    if (perfumeIdA === perfumeIdB) {
      console.warn(`[Chemistry Parser] Same perfume matched for both characters: ${perfumeIdA}. This should not happen.`);
      // 강제로 다른 향수로 변경하지 않고 경고만 남김 (AI에게 재시도 요청 가능)
    }

    return { characterA, characterB };
  } catch (error) {
    console.error('Chemistry individual response parsing error:', error);
    console.error('Response text:', responseText.substring(0, 500));
    throw new Error('Failed to parse chemistry individual response');
  }
}

/**
 * Phase 2 응답 파싱: 케미 프로필
 */
export function parseChemistryProfileResponse(
  responseText: string
): ChemistryProfile {
  try {
    let parsed = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }

    // 필수 필드 검증
    validateChemistryType(parsed.chemistryType);
    validateChemistryTitle(parsed.chemistryTitle);
    validateTraitsSynergy(parsed.traitsSynergy);
    validateScentHarmony(parsed.scentHarmony);
    validateRelationshipDynamic(parsed.relationshipDynamic);
    validateLayeringGuide(parsed.layeringGuide);
    validateColorChemistry(parsed.colorChemistry);

    const profile: ChemistryProfile = {
      chemistryType: parsed.chemistryType,
      chemistryTitle: parsed.chemistryTitle,
      traitsSynergy: {
        sharedStrengths: parsed.traitsSynergy.sharedStrengths || [],
        complementaryTraits: parsed.traitsSynergy.complementaryTraits || [],
        dynamicTension: parsed.traitsSynergy.dynamicTension || '',
        synergyOneLiner: parsed.traitsSynergy.synergyOneLiner || '',
        traitsComparisonComment: parsed.traitsSynergy.traitsComparisonComment || '',
      },
      scentHarmony: {
        layeringEffect: parsed.scentHarmony.layeringEffect || '',
        topNoteInteraction: parsed.scentHarmony.topNoteInteraction || '',
        middleNoteInteraction: parsed.scentHarmony.middleNoteInteraction || '',
        baseNoteInteraction: parsed.scentHarmony.baseNoteInteraction || '',
        overallHarmony: parsed.scentHarmony.overallHarmony || '',
      },
      relationshipDynamic: {
        dynamicDescription: parsed.relationshipDynamic.dynamicDescription || '',
        bestMoment: parsed.relationshipDynamic.bestMoment || '',
        chemistryKeywords: parsed.relationshipDynamic.chemistryKeywords || [],
      },
      layeringGuide: {
        ratio: parsed.layeringGuide.ratio || '5:5',
        method: parsed.layeringGuide.method || '',
        situation: parsed.layeringGuide.situation || '',
        seasonTime: {
          best_season: parsed.layeringGuide.seasonTime?.best_season || 'spring',
          best_time: parsed.layeringGuide.seasonTime?.best_time || 'afternoon',
          reason: parsed.layeringGuide.seasonTime?.reason || '',
        },
      },
      scenarios: (parsed.scenarios || []).slice(0, 3).map((s: { title: string; content: string }) => ({
        title: s?.title || '',
        content: s?.content || '',
      })),
      dialogues: {
        aToB: {
          line: parsed.dialogues?.aToB?.line || '',
          action: parsed.dialogues?.aToB?.action || '',
        },
        bToA: {
          line: parsed.dialogues?.bToA?.line || '',
          action: parsed.dialogues?.bToA?.action || '',
        },
      },
      colorChemistry: {
        blendedPalette: parsed.colorChemistry.blendedPalette || [],
        description: parsed.colorChemistry.description || '',
      },
      faceMatch: parsed.faceMatch ? {
        score: Number(parsed.faceMatch.score) || 75,
        atmosphere: Number(parsed.faceMatch.atmosphere) || 70,
        contrast: Number(parsed.faceMatch.contrast) || 70,
        colorHarmony: Number(parsed.faceMatch.colorHarmony) || 70,
        styleMatch: Number(parsed.faceMatch.styleMatch) || 70,
        verdict: String(parsed.faceMatch.verdict || ''),
        atmosphereDesc: String(parsed.faceMatch.atmosphereDesc || ''),
        contrastDesc: String(parsed.faceMatch.contrastDesc || ''),
        colorHarmonyDesc: String(parsed.faceMatch.colorHarmonyDesc || ''),
        styleMatchDesc: String(parsed.faceMatch.styleMatchDesc || ''),
      } : undefined,
      futureVision: parsed.futureVision || '',
      chemistryStory: parsed.chemistryStory || '',
    };

    return profile;
  } catch (error) {
    console.error('Chemistry profile response parsing error:', error);
    console.error('Response text:', responseText.substring(0, 500));
    throw new Error('Failed to parse chemistry profile response');
  }
}

// ============================================
// 검증 함수들
// ============================================

const VALID_CHEMISTRY_TYPES: ChemistryType[] = ['milddang', 'slowburn', 'dalddal', 'storm'];

function validateChemistryType(type: unknown): asserts type is ChemistryType {
  if (typeof type !== 'string' || !VALID_CHEMISTRY_TYPES.includes(type as ChemistryType)) {
    throw new Error(`Invalid chemistryType: ${type}. Must be one of: ${VALID_CHEMISTRY_TYPES.join(', ')}`);
  }
}

function validateChemistryTitle(title: unknown): void {
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('chemistryTitle is required and must be a non-empty string');
  }
}

function validateTraitsSynergy(synergy: unknown): void {
  if (!synergy || typeof synergy !== 'object') {
    throw new Error('traitsSynergy is required');
  }
  const s = synergy as Record<string, unknown>;
  if (!Array.isArray(s.sharedStrengths) || s.sharedStrengths.length === 0) {
    throw new Error('traitsSynergy.sharedStrengths must be a non-empty array');
  }
}

function validateScentHarmony(harmony: unknown): void {
  if (!harmony || typeof harmony !== 'object') {
    throw new Error('scentHarmony is required');
  }
  const h = harmony as Record<string, unknown>;
  if (typeof h.layeringEffect !== 'string' || !h.layeringEffect) {
    throw new Error('scentHarmony.layeringEffect is required');
  }
}

function validateRelationshipDynamic(dynamic: unknown): void {
  if (!dynamic || typeof dynamic !== 'object') {
    throw new Error('relationshipDynamic is required');
  }
  const d = dynamic as Record<string, unknown>;
  if (typeof d.dynamicDescription !== 'string' || !d.dynamicDescription) {
    throw new Error('relationshipDynamic.dynamicDescription is required');
  }
}

function validateLayeringGuide(guide: unknown): void {
  if (!guide || typeof guide !== 'object') {
    throw new Error('layeringGuide is required');
  }
}

function validateScenarios(scenarios: unknown): void {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error('scenarios must be a non-empty array');
  }
}

function validateDialogues(dialogues: unknown): void {
  if (!dialogues || typeof dialogues !== 'object') {
    throw new Error('dialogues is required');
  }
  const d = dialogues as Record<string, unknown>;
  if (!d.aToB || !d.bToA) {
    throw new Error('dialogues.aToB and dialogues.bToA are required');
  }
}

function validateColorChemistry(color: unknown): void {
  if (!color || typeof color !== 'object') {
    throw new Error('colorChemistry is required');
  }
  const c = color as Record<string, unknown>;
  if (!Array.isArray(c.blendedPalette) || c.blendedPalette.length < 3) {
    throw new Error('colorChemistry.blendedPalette must have at least 3 colors');
  }
}
