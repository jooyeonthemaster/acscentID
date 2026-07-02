import { RELATION_TROPES, ARCHETYPE_OPTIONS, SCENE_OPTIONS, EMOTION_KEYWORDS } from '@/types/analysis'
import type { Locale } from '@/i18n/config'

type ChemistryOption = { id: string; label: string }

const OPTION_LABELS: Record<Locale, Record<string, string>> = {
  ko: Object.fromEntries(
    [...RELATION_TROPES, ...ARCHETYPE_OPTIONS, ...SCENE_OPTIONS, ...EMOTION_KEYWORDS].map((o) => [o.id, o.label])
  ),
  en: {
    enemies_to_lovers: 'enemies to lovers',
    childhood_friends: 'childhood friends',
    rivals: 'rivals',
    mentor_student: 'mentor and student',
    fate_encounter: 'fateful encounter',
    push_pull: 'push and pull',
    protective: 'protector and protected',
    opposites: 'opposites attract',
    tsundere: 'tsundere',
    gentle: 'gentle healer',
    charismatic: 'charismatic leader',
    mysterious: 'mysterious type',
    energetic: 'high energy',
    cool: 'cool and detached',
    romantic: 'romantic',
    rebel: 'rebel',
    cafe: 'rainy day cafe',
    rooftop: 'starlit rooftop',
    ocean: 'sunset beach',
    forest: 'misty forest',
    city: 'city night street',
    library: 'old library',
    flutter: 'butterflies',
    tension: 'tension',
    comfort: 'comfort',
    excitement: 'excitement',
    longing: 'longing',
    jealousy: 'jealousy',
    trust: 'trust',
    playful: 'playfulness',
    passionate: 'passion',
    bittersweet: 'bittersweetness',
  },
  ja: {
    enemies_to_lovers: '敵同士から恋へ',
    childhood_friends: '幼なじみ',
    rivals: 'ライバル',
    mentor_student: '師弟関係',
    fate_encounter: '運命的な出会い',
    push_pull: '駆け引き',
    protective: '守る人と守られる人',
    opposites: '正反対の魅力',
    tsundere: 'ツンデレ',
    gentle: '優しい癒やし系',
    charismatic: 'カリスマリーダー',
    mysterious: 'ミステリアスタイプ',
    energetic: 'エネルギッシュ',
    cool: 'クールで淡々',
    romantic: 'ロマンチスト',
    rebel: '反抗的なタイプ',
    cafe: '雨の日のカフェ',
    rooftop: '星明かりの屋上',
    ocean: '夕暮れの海辺',
    forest: '霧の森',
    city: '都会の夜道',
    library: '古い図書館',
    flutter: 'ときめき',
    tension: '緊張感',
    comfort: '安心感',
    excitement: '高揚感',
    longing: '恋しさ',
    jealousy: '嫉妬',
    trust: '信頼',
    playful: 'いたずら心',
    passionate: '情熱',
    bittersweet: '切なさ',
  },
  zh: {
    enemies_to_lovers: '从敌人到恋人',
    childhood_friends: '青梅竹马',
    rivals: '宿敌',
    mentor_student: '师徒关系',
    fate_encounter: '命运般的相遇',
    push_pull: '拉扯感',
    protective: '守护者与被守护者',
    opposites: '反差魅力',
    tsundere: '傲娇',
    gentle: '温柔疗愈型',
    charismatic: '魅力领袖',
    mysterious: '神秘型',
    energetic: '活力爆棚',
    cool: '冷感淡然型',
    romantic: '浪漫主义者',
    rebel: '叛逆型',
    cafe: '雨天咖啡馆',
    rooftop: '星光屋顶',
    ocean: '海边日落',
    forest: '雾气森林',
    city: '城市夜街',
    library: '旧图书馆',
    flutter: '心动',
    tension: '紧张感',
    comfort: '安心',
    excitement: '兴奋',
    longing: '思念',
    jealousy: '嫉妒',
    trust: '信任',
    playful: '调皮感',
    passionate: '热情',
    bittersweet: '酸甜苦涩',
  },
  es: {
    enemies_to_lovers: 'de enemigos a amantes',
    childhood_friends: 'amigos de la infancia',
    rivals: 'rivales',
    mentor_student: 'mentor y aprendiz',
    fate_encounter: 'encuentro del destino',
    push_pull: 'tira y afloja',
    protective: 'protector y protegido',
    opposites: 'atraccion de opuestos',
    tsundere: 'tsundere',
    gentle: 'sanador amable',
    charismatic: 'lider carismatico',
    mysterious: 'tipo misterioso',
    energetic: 'energia explosiva',
    cool: 'frio y distante',
    romantic: 'romantico',
    rebel: 'rebelde',
    cafe: 'cafe en dia de lluvia',
    rooftop: 'azotea bajo las estrellas',
    ocean: 'atardecer en la playa',
    forest: 'bosque con niebla',
    city: 'calle nocturna de la ciudad',
    library: 'biblioteca antigua',
    flutter: 'mariposas',
    tension: 'tension',
    comfort: 'comodidad',
    excitement: 'emocion',
    longing: 'anhelo',
    jealousy: 'celos',
    trust: 'confianza',
    playful: 'juego',
    passionate: 'pasion',
    bittersweet: 'agridulce',
  },
}

export function getChemistryOptionLabel(id: string, locale: Locale): string | undefined {
  return OPTION_LABELS[locale]?.[id] || OPTION_LABELS.ko[id]
}

export function formatChemistryOptionLabels(
  ids: string[] | undefined,
  options: readonly ChemistryOption[],
  locale: Locale
): string {
  if (!ids?.length) return ''

  const knownIds = new Set(options.map((o) => o.id))
  return ids
    .map((id) => {
      if (!knownIds.has(id)) return id
      return getChemistryOptionLabel(id, locale) ?? id
    })
    .join(', ')
}

export function getChemistrySlugLabels(locale: Locale): Record<string, string> {
  return OPTION_LABELS[locale] || OPTION_LABELS.ko
}
