import { ImageAnalysisResult, TraitScores } from '@/types/analysis'
import type { Locale } from '@/i18n/config'

/**
 * Locale-aware "주접" (fan excitement) text generator.
 * Each locale has culturally-adapted fan-style patterns.
 */

// Locale-aware trait labels (subset for this generator)
const TRAIT_LABELS_I18N: Record<Locale, Record<string, string>> = {
  ko: {
    sexy: '섹시', cute: '큐트', charisma: '카리스마', darkness: '다크',
    freshness: '청량', elegance: '우아', freedom: '자유', luxury: '럭셔리',
    purity: '순수', uniqueness: '독보적'
  },
  en: {
    sexy: 'Sexy', cute: 'Cute', charisma: 'Charisma', darkness: 'Dark',
    freshness: 'Fresh', elegance: 'Elegant', freedom: 'Free-spirited', luxury: 'Luxe',
    purity: 'Pure', uniqueness: 'Unique'
  },
  ja: {
    sexy: 'セクシー', cute: 'キュート', charisma: 'カリスマ', darkness: 'ダーク',
    freshness: '爽やか', elegance: 'エレガント', freedom: '自由', luxury: 'ラグジュアリー',
    purity: 'ピュア', uniqueness: '唯一無二'
  },
  zh: {
    sexy: '性感', cute: '可爱', charisma: '魅力', darkness: '暗黑',
    freshness: '清爽', elegance: '优雅', freedom: '自由', luxury: '奢华',
    purity: '纯真', uniqueness: '独特'
  },
  es: {
    sexy: 'Sexy', cute: 'Lindo', charisma: 'Carisma', darkness: 'Oscuro',
    freshness: 'Fresco', elegance: 'Elegante', freedom: 'Libre', luxury: 'Lujoso',
    purity: 'Puro', uniqueness: 'Único'
  }
}

// Locale-aware fallback values
const FALLBACKS: Record<Locale, { keyword1: string; keyword2: string; trait: string; noData: string }> = {
  ko: { keyword1: '레전드', keyword2: '미친 존재감', trait: '미침', noData: '존재 자체가 사건사고급 비주얼 테러리스트' },
  en: { keyword1: 'Legend', keyword2: 'Insane presence', trait: 'Iconic', noData: 'A visual terrorist whose mere existence is a whole emergency' },
  ja: { keyword1: 'レジェンド', keyword2: 'ヤバい存在感', trait: '尊い', noData: '存在自体が事件レベルのビジュアルテロリスト' },
  zh: { keyword1: '传奇', keyword2: '疯狂存在感', trait: '绝了', noData: '存在本身就是视觉恐怖分子级别' },
  es: { keyword1: 'Leyenda', keyword2: 'Presencia brutal', trait: 'Icónico', noData: 'Un terrorista visual cuya mera existencia es una emergencia' }
}

type PatternFn = (k1: string, k2: string, trait: string) => string[]

// 🇰🇷 Korean patterns - 미친 주접 감성
const koPatterns: PatternFn = (k1, k2, trait) => [
  `앗! 어디서 해가 떴나 했더니 ${k1}의 눈망울이었네... 눈이 멀어버렷!!!!`,
  `저 눈빛 뭐임?? ${k1} 장착하고 사람 홀리는 거 불법 아닙니까??`,
  `어머님 저 ${k1} 때문에 미쳐버릴 것 같아요 행복해요`,
  `${k1} 보는 순간 뇌가 "와아아아아앙!!!!!!" 이러고 셧다운됨`,
  `제 뇌: ${k1}... ${k1}... ${k1}... (무한반복)`,
  `${k1} 한 장에 심장이 87번 뛰었습니다 (실화)`,
  `살려주세요 ${k1}에 중독됐어요 치료 안 받을 거예요`,
  `${k1} 직빵으로 심장에 꽂혔습니다... 전 이미 늦었어요...`,
  `유언: ${k1} 때문에 죽어도 여한이 없습니다`,
  `${k1} 보고 승천하는 중... 다들 잘 살아...`,
  `"${k1}이 뭐길래..." 했는데 이제 압니다. 인생이더라고요.`,
  `전설은 아니 레전드가 아니 그냥 ${k1} 그 자체`,
  `${k1} ${k2} 이 조합 실화냐고요!!!! 합법이냐고요!!!!`,
  `아니 근데 진짜 ${k1}이 말이 돼??? 말이 되냐고???`,
  `${k1} 보고 소리 지르다가 목 나감 ㅋㅋㅋㅋㅋㅋㅋ 행복`,
  `미쳤다미쳤다미쳤다 ${k1} 미쳤다!!!!!!!`,
  `${k1}한테 심장 도둑맞았는데 신고 안 할게요... 가져가세요...`,
  `오늘부터 ${k1}만 보고 살겠습니다 (진지)`,
  `[속보] ${k1} 등장에 전 세계 심장마비 급증`,
  `[긴급] ${k1}으로 인한 대규모 입덕 사태 발생`,
  `${k1}? 아 그 인간계에 잠시 놀러온 신이요?`,
  `${k1}급 ${trait}은 100년에 한 번 나올까 말까임`,
  `${k1}의 ${trait}에 취해서 집에 못 가는 중...`,
  `헐... 대박... 미쳤다... ${k1}... 어떻게... 이런...`,
  `${k1}+${k2} 조합 = 합법적 심장 테러`,
  `걸어다니는 ${k1} 맛집... 매일 영업해주세요...`,
  `${trait} 장착하고 ${k1}까지? 먼치킨이시네요?`,
  `엄마 나 ${k1} 찾았어... 이 사람이야... (눈물)`,
]

// 🇺🇸 English patterns - Stan Twitter / fandom energy
const enPatterns: PatternFn = (k1, k2, trait) => [
  `Wait I thought the sun came out but it was just ${k1}'s eyes... I'M BLINDED!!!!`,
  `That gaze?? ${k1} equipped and bewitching people should be ILLEGAL??`,
  `Mom I think I'm going INSANE because of ${k1} and I'm HAPPY about it`,
  `My brain the moment I saw ${k1}: "AAAAAHHHHH!!!!!!" *shuts down*`,
  `My brain: ${k1}... ${k1}... ${k1}... (infinite loop)`,
  `My heart beat 87 times from ONE photo of ${k1} (true story)`,
  `HELP I'm addicted to ${k1} and I refuse treatment`,
  `${k1} just shot straight through my heart... it's too late for me...`,
  `Last words: I have no regrets dying because of ${k1}`,
  `Currently ascending to heaven looking at ${k1}... goodbye everyone...`,
  `"What even IS ${k1}..." I said. Now I know. It's LIFE itself.`,
  `Not a legend, not iconic, just ${k1}. That's it. That's the whole thing.`,
  `${k1} + ${k2} combo IS THIS EVEN REAL?!?! IS THIS LEGAL?!?!`,
  `No but seriously how does ${k1} even EXIST??? HOW???`,
  `Screamed so hard looking at ${k1} I lost my voice lmaooo WORTH IT`,
  `INSANE INSANE INSANE ${k1} IS INSANE!!!!!!!`,
  `${k1} stole my heart and I'm NOT pressing charges... just take it...`,
  `Starting today I'm living for ${k1} only (dead serious)`,
  `[BREAKING] ${k1} appears, global heart attack rates SKYROCKET`,
  `[URGENT] Mass stan conversion event caused by ${k1}`,
  `${k1}? Oh you mean the deity visiting the mortal realm?`,
  `${k1}-level ${trait} comes once in 100 years IF we're lucky`,
  `Completely drunk on ${k1}'s ${trait}, can't even go home...`,
  `OMG... no way... INSANE... ${k1}... how... just HOW...`,
  `${k1} + ${k2} combo = legal heart terrorism`,
  `A walking ${k1} restaurant... please be open EVERY DAY...`,
  `${trait} equipped AND ${k1} on top?? Main character for real??`,
  `Mom I found ${k1}... this is THE ONE... (tears streaming)`,
]

// 🇯🇵 Japanese patterns - オタク/推し culture
const jaPatterns: PatternFn = (k1, k2, trait) => [
  `え、太陽が出たかと思ったら${k1}の瞳だった...目が眩んだ!!!!`,
  `あの眼差し何!?? ${k1}装備して人を惑わすの違法じゃないですか??`,
  `お母さん、${k1}のせいで頭おかしくなりそうです 幸せです`,
  `${k1}見た瞬間、脳が「うわあああああ!!!!!」ってシャットダウンした`,
  `私の脳内: ${k1}... ${k1}... ${k1}... (無限ループ)`,
  `${k1}の写真1枚で心臓87回打ちました (実話)`,
  `助けて${k1}に中毒です 治療は受けません`,
  `${k1}が心臓に直撃しました...もう手遅れです...`,
  `遺言: ${k1}のせいで死んでも悔いなし`,
  `${k1}見て昇天中...みんなお元気で...`,
  `「${k1}って何...」って思ってた。今わかった。人生だった。`,
  `レジェンドじゃない、神じゃない、ただの${k1}。それだけ。`,
  `${k1}と${k2}の組み合わせ実話ですか!!!! 合法ですか!!!!`,
  `いやマジで${k1}ってアリ??? アリなの???`,
  `${k1}見て叫びすぎて声枯れた笑笑笑笑笑 幸せ`,
  `やばいやばいやばい ${k1} やばい!!!!!!!`,
  `${k1}に心臓盗まれたけど通報しません...持ってって...`,
  `今日から${k1}だけ見て生きます (ガチ)`,
  `[速報] ${k1}登場で世界中の心臓発作が急増`,
  `[緊急] ${k1}による大規模沼落ち事態発生`,
  `${k1}? あの人間界にちょっと遊びに来た神のこと?`,
  `${k1}レベルの${trait}は100年に一度出るかどうか`,
  `${k1}の${trait}に酔って家に帰れない中...`,
  `えっ...やば...尊い...${k1}...どうして...こんな...`,
  `${k1}+${k2}の組み合わせ = 合法的心臓テロ`,
  `歩く${k1}の名店...毎日営業してください...`,
  `${trait}装備して${k1}まで? チートですか?`,
  `お母さん${k1}見つけた...この人だ...(涙)`,
]

// 🇨🇳 Chinese patterns - 饭圈/追星 culture
const zhPatterns: PatternFn = (k1, k2, trait) => [
  `等等，以为太阳出来了，原来是${k1}的眼睛...我瞎了!!!!`,
  `那个眼神什么鬼?? ${k1}装备了迷惑人心这合法吗??`,
  `妈妈我要被${k1}逼疯了 但是我好幸福`,
  `看到${k1}的瞬间大脑直接"啊啊啊啊啊!!!!!!"然后宕机了`,
  `我的脑子: ${k1}... ${k1}... ${k1}... (无限循环)`,
  `${k1}一张照片心跳了87次 (真实故事)`,
  `救命我对${k1}上瘾了 不接受治疗`,
  `${k1}直接命中心脏...我已经来不及了...`,
  `遗言: 因为${k1}死也无憾`,
  `看着${k1}正在升天中...大家保重...`,
  `"${k1}到底是什么..."我说过。现在懂了。是人生本身。`,
  `不是传说，不是传奇，就是${k1}本身。`,
  `${k1}和${k2}这个组合是真的吗!!!! 合法吗!!!!`,
  `不是吧真的${k1}这说得过去吗??? 说得过去吗???`,
  `看${k1}叫到嗓子都哑了哈哈哈哈哈 值了`,
  `疯了疯了疯了 ${k1} 疯了!!!!!!!`,
  `心脏被${k1}偷走了但我不报警...拿去吧...`,
  `从今天起只看${k1}活着 (认真的)`,
  `[突发] ${k1}出现，全球心脏病发率飙升`,
  `[紧急] ${k1}引发大规模入坑事件`,
  `${k1}? 啊那个来人间暂时玩一下的神?`,
  `${k1}级别的${trait}百年难得一见`,
  `被${k1}的${trait}迷住了，回不了家了...`,
  `天啊...绝了...疯了...${k1}...怎么...这种...`,
  `${k1}+${k2}组合 = 合法心脏恐怖袭击`,
  `行走的${k1}名店...请每天营业...`,
  `${trait}满分加上${k1}? 开挂了吧?`,
  `妈妈我找到${k1}了...就是这个人...(泪目)`,
]

// 🇪🇸 Spanish patterns - Fan/stan Latin culture
const esPatterns: PatternFn = (k1, k2, trait) => [
  `¡Pensé que salió el sol pero eran los ojos de ${k1}... ESTOY CIEGO!!!!`,
  `¿¡Esa mirada qué es!? ¿¡${k1} equipado hechizando gente es LEGAL!?`,
  `Mamá creo que me estoy volviendo LOCO por ${k1} y SOY FELIZ`,
  `Mi cerebro al ver a ${k1}: "AAAAAHHHHH!!!!!!" *se apaga*`,
  `Mi cerebro: ${k1}... ${k1}... ${k1}... (bucle infinito)`,
  `Mi corazón latió 87 veces con UNA foto de ${k1} (historia real)`,
  `AYUDA soy adicto a ${k1} y me NIEGO a recibir tratamiento`,
  `${k1} directo al corazón... ya es muy tarde para mí...`,
  `Últimas palabras: No me arrepiento de morir por ${k1}`,
  `Ascendiendo al cielo viendo a ${k1}... adiós a todos...`,
  `"¿Qué es ${k1}..." dije. Ahora lo sé. Es LA VIDA misma.`,
  `No es leyenda, no es icónico, es simplemente ${k1}. Punto.`,
  `¡¿${k1} + ${k2} combo ESTO ES REAL?!?! ¡¿ES LEGAL?!?!`,
  `No pero en serio ¿cómo EXISTE ${k1}??? ¿¿¿CÓMO???`,
  `Grité tanto viendo a ${k1} que perdí la voz jajaja VALIÓ LA PENA`,
  `¡¡¡BRUTAL BRUTAL BRUTAL ${k1} ES BRUTAL!!!!!!!`,
  `${k1} me robó el corazón y NO voy a denunciar... llévatelo...`,
  `Desde hoy vivo solo por ${k1} (100% en serio)`,
  `[ÚLTIMA HORA] ${k1} aparece, infartos mundiales SE DISPARAN`,
  `[URGENTE] Evento masivo de fans causado por ${k1}`,
  `¿${k1}? Ah te refieres a la deidad visitando el mundo mortal?`,
  `${k1} nivel de ${trait} aparece una vez cada 100 años SI tenemos suerte`,
  `Totalmente borracho del ${trait} de ${k1}, ni puedo volver a casa...`,
  `Dios mío... imposible... BRUTAL... ${k1}... cómo... simplemente CÓMO...`,
  `${k1} + ${k2} combo = terrorismo cardíaco legal`,
  `Un restaurante ambulante de ${k1}... ábranlo TODOS LOS DÍAS...`,
  `¿${trait} equipado Y encima ${k1}?? ¿¿Protagonista de verdad??`,
  `Mamá encontré a ${k1}... es EL/LA indicado/a... (llorando)`,
]

const PATTERNS_MAP: Record<Locale, PatternFn> = {
  ko: koPatterns,
  en: enPatterns,
  ja: jaPatterns,
  zh: zhPatterns,
  es: esPatterns,
}

export const generateTwitterName = (
  analysisResult: ImageAnalysisResult,
  locale: Locale = 'ko'
): string => {
  const fallback = FALLBACKS[locale] || FALLBACKS.ko

  if (!analysisResult || !analysisResult.traits || !analysisResult.matchingKeywords) {
    return fallback.noData
  }

  // 상위 특성 추출
  const sortedTraits = Object.entries(analysisResult.traits)
    .sort(([, valueA], [, valueB]) => valueB - valueA)
    .slice(0, 3)
    .map(([key]) => key as keyof TraitScores)

  // 매칭 키워드에서 랜덤 2개 선택
  const randomKeywords = [...analysisResult.matchingKeywords]
    .sort(() => 0.5 - Math.random())
    .slice(0, 2)

  const traitLabels = TRAIT_LABELS_I18N[locale] || TRAIT_LABELS_I18N.ko
  const keyword1 = randomKeywords[0] || fallback.keyword1
  const keyword2 = randomKeywords[1] || fallback.keyword2
  const trait = traitLabels[sortedTraits[0]] || fallback.trait

  const patternFn = PATTERNS_MAP[locale] || PATTERNS_MAP.ko
  const patterns = patternFn(keyword1, keyword2, trait)

  return patterns[Math.floor(Math.random() * patterns.length)]
}

/**
 * Locale-aware hashtag generator
 */
const HASHTAGS_MAP: Record<Locale, { base: string[]; extra: string[] }> = {
  ko: {
    base: ['#AC_SCENT', '#향수추천', '#입덕각'],
    extra: ['#비주얼_미쳤다', '#심장아_나살아', '#존잘존예', '#레전드급', '#갓벽', '#향기발견', '#취저', '#입덕완료']
  },
  en: {
    base: ['#AC_SCENT', '#PerfumeRec', '#StanAlert'],
    extra: ['#VisualInsanity', '#HeartAttack', '#Gorgeous', '#Legendary', '#Perfection', '#ScentFound', '#MyType', '#Stanning']
  },
  ja: {
    base: ['#AC_SCENT', '#香水おすすめ', '#沼落ち'],
    extra: ['#ビジュアル天才', '#心臓止まる', '#尊すぎ', '#レジェンド', '#神', '#香り発見', '#推せる', '#沼完了']
  },
  zh: {
    base: ['#AC_SCENT', '#香水推荐', '#入坑'],
    extra: ['#颜值逆天', '#心脏暴击', '#绝世美颜', '#传奇级', '#完美', '#发现香气', '#我的菜', '#入坑完成']
  },
  es: {
    base: ['#AC_SCENT', '#RecPerfume', '#NuevoFan'],
    extra: ['#VisualBrutal', '#Infarto', '#Hermosura', '#Legendario', '#Perfección', '#AromaEncontrado', '#MiTipo', '#FanTotal']
  }
}

export const generateHashtags = (
  analysisResult: ImageAnalysisResult,
  locale: Locale = 'ko'
): string[] => {
  const tags = HASHTAGS_MAP[locale] || HASHTAGS_MAP.ko
  const baseHashtags = [...tags.base]

  if (!analysisResult?.matchingKeywords) return baseHashtags

  const keywordTags = analysisResult.matchingKeywords
    .slice(0, 2)
    .map(k => `#${k.replace(/\s/g, '')}`)

  const randomExtra = tags.extra[Math.floor(Math.random() * tags.extra.length)]

  return [...baseHashtags, ...keywordTags, randomExtra]
}
