/**
 * Locale-aware prompt wrapper for Gemini AI.
 *
 * Strategy: Keep Korean prompts as the source of truth (instructions format).
 * For non-Korean locales, add language instructions that tell Gemini to
 * generate all text output in the target language while keeping JSON keys in English.
 *
 * This avoids maintaining 5 copies of 1000+ line prompts.
 * Gemini is multilingual and can follow Korean instructions while outputting in another language.
 */

import type { Locale } from '@/i18n/config'

// Language-specific tone/style instructions
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  ko: '', // Korean is the default, no wrapper needed
  en: `
# 🚨🚨🚨 ABSOLUTE LANGUAGE RULE — READ THIS FIRST 🚨🚨🚨

**OUTPUT LANGUAGE: ENGLISH ONLY. ZERO KOREAN ALLOWED.**

The prompt below contains Korean instructions and Korean example responses.
These are ONLY for showing the FORMAT and STRUCTURE — NOT the language to use.
You MUST translate ALL example text into English. NEVER copy Korean text from examples.

If any Korean characters (가-힣) appear in your JSON output, the entire response will be REJECTED.

## ❌ WRONG (copying Korean from examples):
"matchReason": "Free-spirited의 청량함에 취해서 집에 못 가는 중..."

## ✅ CORRECT (fully translated):
"matchReason": "Totally drunk on that free-spirited freshness, can't even go home! 🌊✨"

## Tone adaptation for English:
- Enthusiastic, playful English with lots of emoji
- Fan-like excitement: "OMG", "literally dying", "I can't even", "iconic", "slay", "it's giving"
- Informal/casual (like talking to a bestie)
- Modern slang: "no cap", "fr fr", "lowkey", "highkey", "vibe check", "main character energy"
- Keep the same excitement level and emoji density

## Rules:
- ALL text VALUES → English only (zero Korean mixing)
- JSON keys → English (already are)
- Perfume IDs → keep as-is (e.g., "AC'SCENT 01")
- matchingKeywords → English words
- matchReason, noteComments, usageGuide, analysis fields → ALL in English
- comparisonAnalysis (imageInterpretation, userInputSummary, reflectionDetails) → ALL in English
- Same JSON structure exactly
`,
  ja: `
# 🚨🚨🚨 絶対言語ルール — 最初にこれを読んでください 🚨🚨🚨

**出力言語: 日本語のみ。韓国語は絶対禁止。**

以下のプロンプトには韓国語の指示と韓国語の例があります。
これらはフォーマットと構造を示すためだけのものです — 使用する言語ではありません。
すべての例文を日本語に翻訳してください。例から韓国語テキストを絶対にコピーしないでください。

韓国語の文字（가-힣）が出力に含まれている場合、レスポンス全体が拒否されます。

## ❌ 間違い（例から韓国語をコピー）:
"matchReason": "自由の청량함に酔って..."

## ✅ 正解（完全に翻訳）:
"matchReason": "この自由奔放な爽やかさに酔いしれて帰れない！🌊✨"

## 日本語のトーン適応:
- 熱狂的で遊び心のある日本語、絵文字たっぷり
- ファン的な興奮: 「やばい」「推せる」「尊い」「天才」「神」「最高すぎ」「無理」
- タメ口・くだけた口調（親友に話すように）
- ネットスラング: 「マジ」「ガチ」「エモい」「てぇてぇ」「沼」「バグ」「しんどい」
- 興奮度と絵文字の使用量は同じレベル

## ルール:
- すべてのテキスト値 → 日本語のみ（韓国語混在ゼロ）
- JSONキー → 英語のまま
- 香水ID → そのまま（例: "AC'SCENT 01"）
- matchingKeywords → 日本語
- matchReason, noteComments, usageGuide, analysis → すべて日本語
- comparisonAnalysis → すべて日本語
- JSON構造はまったく同じ
`,
  zh: `
# 🚨🚨🚨 绝对语言规则 — 首先阅读此内容 🚨🚨🚨

**输出语言: 仅限简体中文。绝对禁止韩文。**

以下提示包含韩语指示和韩语示例。
这些仅用于展示格式和结构 — 而非使用的语言。
你必须将所有示例文本翻译成中文。绝对不要从示例中复制韩文。

如果输出中出现任何韩文字符（가-힣），整个响应将被拒绝。

## ❌ 错误（从示例复制韩文）:
"matchReason": "Free-spirited的청량함에 취해서..."

## ✅ 正确（完全翻译）:
"matchReason": "完全沉醉在这种自由奔放的清爽感中，根本回不了家！🌊✨"

## 中文语调适应:
- 热情、活泼的中文，大量使用表情符号
- 粉丝般的兴奋: "天啊"、"绝了"、"太可了"、"真的哭了"、"永远的神"、"救命"
- 随性口语化（像跟好朋友说话）
- 网络流行语: "绝绝子"、"yyds"、"破防了"、"真的会谢"、"太上头了"、"DNA动了"
- 保持同等的兴奋程度和表情符号密度

## 规则:
- 所有文本值 → 仅限简体中文（零韩文混入）
- JSON键 → 保持英文不变
- 香水ID → 保持不变（例: "AC'SCENT 01"）
- matchingKeywords → 中文
- matchReason, noteComments, usageGuide, analysis → 全部中文
- comparisonAnalysis → 全部中文
- 保持完全相同的JSON结构
`,
  es: `
# 🚨🚨🚨 REGLA ABSOLUTA DE IDIOMA — LEE ESTO PRIMERO 🚨🚨🚨

**IDIOMA DE SALIDA: SOLO ESPAÑOL. CERO COREANO PERMITIDO.**

El prompt a continuación contiene instrucciones en coreano y ejemplos en coreano.
Estos son SOLO para mostrar el FORMATO y la ESTRUCTURA — NO el idioma a usar.
DEBES traducir TODO el texto de ejemplo al español. NUNCA copies texto coreano de los ejemplos.

Si aparece algún carácter coreano (가-힣) en tu salida JSON, toda la respuesta será RECHAZADA.

## ❌ INCORRECTO (copiando coreano de ejemplos):
"matchReason": "Free-spirited의 청량함에 취해서..."

## ✅ CORRECTO (totalmente traducido):
"matchReason": "¡Totalmente ebrio de esa frescura libre, no puedo ni volver a casa! 🌊✨"

## Adaptación de tono para español:
- Español entusiasta y juguetón con muchos emojis
- Emoción de fan: "¡Dios mío!", "¡Estoy muriendo!", "¡No puedo!", "icónico", "brutal", "es que"
- Español informal/casual (como hablando con un amigo cercano)
- Jerga moderna: "literal", "re", "tipo", "buenísimo", "tremendo", "posta"
- Mismo nivel de emoción y densidad de emojis

## Reglas:
- TODOS los valores de texto → solo español (cero mezcla con coreano)
- Claves JSON → inglés (ya lo están)
- IDs de perfume → mantener tal cual (ej: "AC'SCENT 01")
- matchingKeywords → palabras en español
- matchReason, noteComments, usageGuide, analysis → TODO en español
- comparisonAnalysis → TODO en español
- Exactamente la misma estructura JSON
`,
}

/**
 * Wrap a Korean prompt with locale-specific language instructions.
 * For Korean, returns the prompt unchanged.
 * For other languages, prepends language instructions and appends a reminder.
 */
export function wrapPromptWithLocale(prompt: string, locale: Locale): string {
  if (locale === 'ko') {
    return prompt
  }

  const instruction = LANGUAGE_INSTRUCTIONS[locale]
  if (!instruction) {
    return prompt
  }

  const reminder = getLocaleReminder(locale)

  return `${instruction}\n\n${prompt}\n\n${reminder}`
}

/**
 * Get a locale reminder to append at the end of the prompt.
 * This reinforces the language requirement as the last thing Gemini sees.
 */
function getLocaleReminder(locale: Locale): string {
  const reminders: Record<string, string> = {
    en: `# 🚨 FINAL CHECK BEFORE OUTPUT:
1. Scan every text value in your JSON — if ANY Korean characters (가-힣) exist, REWRITE that value in English.
2. The examples above were in Korean — you must NOT copy them. Write original English text.
3. Fields to double-check: matchReason, noteComments (top/middle/base), usageGuide (situation/tips), analysis (mood/style/expression/concept), comparisonAnalysis, matchingKeywords, personalColor.description, season_reason, time_reason.
4. EVERY SINGLE TEXT VALUE must be 100% English. Zero exceptions.`,
    ja: `# 🚨 出力前の最終チェック:
1. JSONのすべてのテキスト値をスキャン — 韓国語の文字（가-힣）が1つでもあれば、その値を日本語で書き直してください。
2. 上記の例は韓国語でした — コピーしないでください。オリジナルの日本語テキストを書いてください。
3. 確認必須フィールド: matchReason, noteComments, usageGuide, analysis, comparisonAnalysis, matchingKeywords, personalColor.description, season_reason, time_reason
4. すべてのテキスト値は100%日本語でなければなりません。例外なし。`,
    zh: `# 🚨 输出前最终检查:
1. 扫描JSON中的每个文本值 — 如果存在任何韩文字符（가-힣），用中文重写该值。
2. 上面的示例是韩语的 — 不要复制它们。写原创的中文文本。
3. 必须检查的字段: matchReason, noteComments, usageGuide, analysis, comparisonAnalysis, matchingKeywords, personalColor.description, season_reason, time_reason
4. 每个文本值必须是100%简体中文。零例外。`,
    es: `# 🚨 VERIFICACIÓN FINAL ANTES DE LA SALIDA:
1. Escanea cada valor de texto en tu JSON — si CUALQUIER carácter coreano (가-힣) existe, REESCRIBE ese valor en español.
2. Los ejemplos anteriores estaban en coreano — NO debes copiarlos. Escribe texto original en español.
3. Campos a verificar: matchReason, noteComments, usageGuide, analysis, comparisonAnalysis, matchingKeywords, personalColor.description, season_reason, time_reason
4. CADA VALOR DE TEXTO debe ser 100% español. Cero excepciones.`,
  }

  return reminders[locale] || ''
}

/**
 * Get locale-specific tone descriptions for hero-analyze prompt.
 */
export function getHeroAnalyzeLocaleInstruction(locale: Locale): string {
  if (locale === 'ko') return ''

  const instructions: Record<string, string> = {
    en: '\n\nIMPORTANT: Generate all text values (hashtags, teaser) in English. Use English hashtags like #SummerVibes instead of Korean.',
    ja: '\n\n重要: すべてのテキスト値（ハッシュタグ、ティーザー）を日本語で生成してください。日本語のハッシュタグを使用してください。',
    zh: '\n\n重要: 所有文本值（标签、预告）必须用简体中文生成。使用中文标签。',
    es: '\n\nIMPORTANTE: Genera todos los valores de texto (hashtags, teaser) en español. Usa hashtags en español.',
  }

  return instructions[locale] || ''
}
