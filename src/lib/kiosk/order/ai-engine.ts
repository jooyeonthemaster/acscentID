// Aible AI 컨시어지 — 데모용 '매장 RAG' 흉내. 실제 언어 모델은 부르지 않는다.
// 손님 말(네 언어 어느 것이든)에서 메뉴·재료·알레르기·식습관·매운맛·의도를 뽑고(이해),
// 이 매장 데이터(메뉴판·재료표·사장님 노트·주문 통계·매장 안내)에서 답을 찾아(검색)
// 화면 언어로 문장을 짓는다(생성). 같은 질문엔 늘 같은 답 — 데이터에 없는 말은 지어내지 않는다.

import { AI_COPY, type AiCopy } from './ai-copy'
import { countryByCode } from './countries'
import {
  conflictsFor, defaultSelection, dietBlocks, fitFor, hasConstraints, ingredientsFor, priceFor, spiceFor,
  type DietId, type Fit, type Profile, type Selection,
} from './diet'
import { countryName, spicePalate, won } from './format'
import { ORDER_TEXT } from './i18n'
import { CATEGORIES, INGREDIENTS, MENU, STORE, STORE_FAQ, menuItem } from './menu'
import type { AllergenId, CategoryId, Country, MenuItem, OrderLang } from './types'

export type Intent =
  | 'greet' | 'hello' | 'thanks' | 'recommend' | 'filter' | 'with-ingredient'
  | 'dish-safety' | 'dish-info' | 'dish-contents' | 'dish-spice' | 'dish-howto' | 'pairing'
  | 'popular-by' | 'budget' | 'share' | 'drinks' | 'desserts' | 'low-spice' | 'hot'
  | 'add' | 'faq' | 'nearby' | 'fallback'

export type SourceKey = 'menu' | 'ingredients' | 'chef' | 'orders' | 'faq'

export interface AiContext {
  lang: OrderLang
  country: Country | null
  profile: Profile
  /** 바로 앞에서 이야기한 메뉴 — '이거 매워요?' 의 '이거' */
  lastDishId?: string
}

export interface AiCard {
  id: string
  reason: string
  sel: Selection
}

export interface AiEntity {
  kind: 'dish' | 'allergen' | 'diet' | 'spice' | 'country' | 'topic'
  label: string
}

export interface AiAnswer {
  intent: Intent
  entities: AiEntity[]
  /** 검색 단계에서 찾은 데이터 건수 */
  found: number
  /** 알레르기 대조 단계를 보여 줄지 */
  checked: boolean
  text: string
  cards: AiCard[]
  sources: SourceKey[]
  safety: boolean
  followUps: string[]
  profilePatch?: Partial<Profile>
  addToCart?: { id: string; sel: Selection }[]
  focusDishId?: string
  nearby?: boolean
}

// ───────────────────────── 이해: 네 언어 낱말 사전 ─────────────────────────

/** 비교용으로 접기 — 소문자, 라틴 악센트만 떼고(é→e) 한글·가나는 그대로(NFC) 둔다. 낱말 앞뒤 공백은 남긴다 */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    .replace(/[’`]/g, "'")
    // 가타카나 → 히라가나: 화면 자판은 히라가나를 내고, 메뉴 이름·낱말은 가타카나다(キムチチゲ ↔ きむちちげ)
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

const LATIN = /[a-z]/
const JA_PARTICLE = /[\sとのやもはがをにで、。・]/
/**
 * 낱말 찾기 — 라틴 낱말은 앞이 글자가 아닐 때만(‘table’ 안의 ‘ble’, ‘peanut’ 안의 ‘nut’ 을 막는다. 뒤는 열어 둬 ‘allerg’ 같은 앞부분 일치는 그대로),
 * 두 글자 이하 히라가나는 앞이 문장 처음·띄어쓰기·조사일 때만(‘ほかに’ 안의 ‘かに’, ‘おいしいかな’ 안의 ‘いか’ 를 막는다).
 */
function findWord(text: string, needle: string, from = 0): number {
  if (!needle) return -1
  let idx = text.indexOf(needle, from)
  const latin = LATIN.test(needle[0])
  const shortKana = !latin && needle.length <= 2 && /^[\u3040-\u309f]+$/.test(needle)
  while (idx >= 0) {
    const before = text[idx - 1] ?? ' '
    if (latin ? !LATIN.test(before) : shortKana ? JA_PARTICLE.test(before) : true) return idx
    idx = text.indexOf(needle, idx + 1)
  }
  return -1
}
const hasWord = (text: string, needle: string) => findWord(text, needle) >= 0

/** 손님 말 정규화 — 앞뒤에 공백을 붙여 ' it ' 같은 낱말 경계 단서가 문장 끝에서도 맞게 한다 */
export function norm(s: string): string {
  return ` ${fold(s).replace(/\s+/g, ' ').trim()} `
}

const ALLERGEN_WORDS: Record<AllergenId, string[]> = {
  gluten: ['gluten', 'wheat', 'flour', 'celiac', 'coeliac', '글루텐', '밀가루', '밀 알레르기', '小麦', 'グルテン', 'こむぎ', 'ble', 'farine', 'coeliaque'],
  crustaceans: ['shrimp', 'prawn', 'crab', 'lobster', 'crustacean', '새우', '꽃게', '게장', '게살', '갑각', '랍스터', 'えび', 'エビ', '海老', 'かに', 'カニ', '蟹', '甲殻', 'crevette', 'crabe', 'homard', 'crustace'],
  eggs: ['egg', '달걀', '계란', '卵', 'たまご', '玉子', 'oeuf', 'œuf'],
  fish: ['fish', 'anchov', '생선', '멸치', '어류', '魚', 'さかな', 'いわし', 'poisson', 'anchois'],
  peanuts: ['peanut', 'groundnut', '땅콩', 'ピーナッツ', '落花生', 'ピーナツ', 'らっかせい', 'arachide', 'cacahuete'],
  soy: ['soy', 'soya', 'tofu', '대두', '두부', '콩', '大豆', '豆腐', 'だいず', 'とうふ', 'soja'],
  milk: ['milk', 'dairy', 'lactose', 'cream', 'cheese', '우유', '유제품', '유당', '치즈', '乳', 'ミルク', 'チーズ', 'ぎゅうにゅう', 'lait', 'laitier', 'creme', 'fromage'],
  nuts: ['tree nut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pistachio', 'pecan', '호두', '아몬드', 'くるみ', 'アーモンド', 'amande', 'fruits a coque', 'noisette'],
  celery: ['celery', '셀러리', 'セロリ', 'celeri'],
  mustard: ['mustard', '겨자', 'からし', '辛子', 'マスタード', 'moutarde'],
  sesame: ['sesame', '참깨', '들깨', '깨소금', 'ごま', '胡麻', 'ゴマ'],
  sulphites: ['sulfite', 'sulphite', '아황산', '亜硫酸'],
  lupin: ['lupin', '루핀', 'ルピナス'],
  molluscs: ['mollusc', 'mollusk', 'clam', 'squid', 'octopus', 'oyster', 'mussel', '조개', '오징어', '문어', '홍합', '연체', '貝', 'イカ', 'タコ', '牡蠣', 'あさり', 'mollusque', 'palourde', 'calmar', 'calamar', 'poulpe', 'huitre', 'moule'],
}
/** 한 낱말이 여럿을 뜻하는 것 — 'shellfish', 'seafood' */
const MULTI_ALLERGEN: [string[], AllergenId[]][] = [
  // 손님이 말하는 '견과'·'해산물'은 넓다 — 안전 쪽으로 땅콩·생선까지 함께 본다
  [['nut', 'nuts', '견과', 'ナッツ', 'noix'], ['nuts', 'peanuts']],
  [['seafood', 'sea food', '해산물', '해물', '海鮮', '魚介', 'シーフード', 'fruits de mer'], ['crustaceans', 'molluscs', 'fish']],
  [['shellfish', '조개류', 'coquillage'], ['crustaceans', 'molluscs']],
]

const DIET_WORDS: Record<DietId, string[]> = {
  'no-pork': ['pork', 'pig', 'bacon', ' ham ', 'lard', '돼지', '삼겹', '豚', 'ポーク', 'ぶたにく', 'ぶた', 'porc', 'cochon', 'lardon'],
  'no-beef': ['beef', ' cow', 'hindu', '소고기', '쇠고기', '힌두', '牛肉', 'ビーフ', 'ヒンドゥー', 'ぎゅうにく', 'boeuf', 'vache', 'hindou'],
  halal: ['halal', 'muslim', 'islam', '할랄', '무슬림', '이슬람', 'ハラール', 'ハラル', 'イスラム', 'ムスリム', 'musulman'],
  vegetarian: ['vegetarian', 'veggie', 'no meat', 'meat-free', 'meatless', '채식', '베지테리언', 'ベジタリアン', '菜食', 'vegetarien', 'sans viande'],
  vegan: ['vegan', 'plant-based', 'plant based', '비건', 'ヴィーガン', 'ビーガン', 'vegetalien', 'végan'],
  'no-alcohol': ['alcohol-free', 'non-alcoholic', 'non alcoholic', 'no alcohol', '무알콜', '논알콜', '술 말고', 'ノンアル', 'アルコールなし', 'sans alcool'],
}
/** 고기 낱말 중 '정체성'(채식·할랄)이 아닌 것 — 부정어가 없으면 '그 재료가 든 메뉴' 질문이다 */
const IDENTITY_DIETS: DietId[] = ['halal', 'vegetarian', 'vegan', 'no-alcohol']

const NEGATION = [
  ' no ', 'not ', "don't", 'dont ', "doesn't", 'without', '-free', ' free', 'allerg', 'avoid', "can't", 'cannot', 'intoleran', ' hate', 'except',
  '안 먹', '못 먹', '빼', '없는', '없이', '알레르기', '알러지', '피해', '싫어', '말고', '제외', '안 들어간', '안들어간', '들어가지 않', '안 들어가',
  'なし', '抜き', '食べられな', '食べられません', 'たべられません', 'られません', 'はいっていない', 'はいってない', 'アレルギ', 'たべられな', 'にがて', '苦手', 'ダメ', 'だめ', '入っていない', '入ってない', '避け', 'ぬき', '以外',
  'sans ', 'pas de', 'allergi', 'eviter', 'je ne mange', 'intoler', 'sauf',
]
const SPICE_LOW = [
  'not spicy', 'non-spicy', 'non spicy', 'no spice', 'less spicy', 'not too spicy', "don't like spicy", 'not hot', 'mild', 'no chili',
  '안 매운', '안매운', '덜 매운', '맵지 않', '안 맵', '순한', '매운 거 못', '매운거 못', '매운 걸 못',
  '辛くない', '辛くな', '辛いのが苦手', '辛いの苦手', '辛さ控えめ', 'マイルド', '甘口', 'からくない', 'からくな', 'からいのがにがて', 'あまくち',
  'pas epice', 'pas piquant', 'peu epice', 'pas trop epice', 'doux', 'sans piment',
]
const SPICE_HIGH = ['spicy', 'spice', ' hot', 'fire', 'chili', '매운', '맵', '매워', '辛い', '辛口', '激辛', '辛さ', '辛', 'からい', 'からくち', 'げきから', 'からさ', 'epice', 'piquant', 'releve', 'piment']

const INTENT_WORDS = {
  first: ['first time', 'first visit', 'never tried', 'new to korean', '처음', '初めて', 'はじめて', 'premiere fois', 'premiere visite', 'jamais goute'],
  recommend: ['recommend', 'suggest', 'what should', 'what to eat', "what's good", 'whats good', 'what is good', 'best', 'popular', 'signature', 'must try', 'must-try', 'favorite', 'favourite',
    '추천', '뭐 먹', '뭘 먹', '뭐가 좋', '뭐가 맛있', '맛있는', '인기', '대표', '잘 나가', 'おすすめ', 'オススメ', '人気', '何がいい', '名物', '看板', 'にんき', 'なにがいい', 'recommand', 'conseil', 'populaire', 'specialite', 'que manger', 'meilleur'],
  howto: ['how to eat', 'how do i eat', 'how do you eat', 'how should i eat', 'how to enjoy', 'eat it', '어떻게 먹', '먹는 법', '먹는 방법', '食べ方', 'どうやって食べ', 'どう食べ', 'たべかた', 'どうやってたべ', 'comment manger', 'comment le manger', 'comment la manger', 'comment deguster', 'comment on mange'],
  pairing: ['go with', 'goes with', 'goes well', 'pair', 'side dish', 'together with', 'drink with', '같이 먹', '어울리', '곁들', '궁합', '合う', '一緒に', '相性', 'あう', 'いっしょに', 'accompagn', 'aller avec', 'va bien avec', 'avec quoi'],
  whatis: ['what is', "what's", 'whats', 'tell me about', 'explain', 'describe', '뭐예요', '뭐에요', '뭔가요', '무엇', '어떤 음식', '설명', 'とは', 'って何', 'ってなに', 'どんな料理', '教えて', "qu'est-ce", "c'est quoi", 'expliqu', 'parle-moi', 'parlez-moi', 'decris'],
  contains: ['contain', 'inside', 'in it', 'ingredient', "what's in", 'whats in', 'what is in', 'made of', 'made with', 'have in', '들어', '재료', '뭐가 있', '入って', '材料', '使って', '食材', 'はいって', 'ざいりょう', 'contient', 'dedans', 'ingredient', 'il y a quoi', 'compose'],
  canEat: ['can i eat', 'can i have', 'is it ok', 'is it safe', 'safe for', 'okay for', '먹어도', '먹을 수', '괜찮', '食べられます', '食べても', '大丈夫', 'puis-je manger', 'je peux manger', 'est-ce que je peux', 'sans danger'],
  budget: ['cheap', 'budget', 'affordable', 'inexpensive', 'under ', 'less than', 'below', '싼', '저렴', '가성비', '싸게', '이하', '안 비싼', '安い', 'リーズナブル', 'お手頃', '以下', 'やすい', 'pas cher', 'bon marche', 'economique', 'moins cher', 'moins de'],
  share: ['share', 'sharing', 'group', 'for two', 'for three', 'for four', 'for 2', 'for 3', 'for 4', 'people', 'friends', 'family', 'of us',
    '나눠', '명이', '명이서', '둘이', '셋이', '넷이', '친구', '가족', 'みんなで', 'シェア', '人で', '家族', '友達', '二人', '三人', '四人', 'partager', 'a deux', 'a trois', 'a quatre', 'a plusieurs', 'famille', 'amis', 'personnes'],
  drink: ['drink', 'beverage', 'alcohol', 'beer', 'soju', 'makgeolli', 'wine', 'cocktail', '음료', '마실', '마시', '술', '소주', '막걸리', '飲み物', 'ドリンク', 'お酒', '焼酎', 'マッコリ', '飲', 'のみもの', 'おさけ', 'boisson', 'boire', 'alcool', ' vin'],
  dessert: ['dessert', 'sweet', 'bingsu', 'shaved ice', '디저트', '달달', '단 거', '단것', '후식', '빙수', '달콤', 'デザート', '甘い', 'かき氷', 'スイーツ', 'あまい', 'sucre', 'douceur', 'glace'],
  add: ['add', 'order it', "i'll have", 'i will have', 'i want', 'give me', 'put it', 'take it', '담아', '주문할', '주문해', '시킬', '주세요', '줘', '追加', '注文して', 'ください', 'お願い', 'ajoute', 'commande', 'je prends', 'je veux', 'je voudrais', 'mettez'],
  nearby: ['nearby', 'near here', 'around here', 'sightseeing', 'attraction', 'go next', 'go after', 'visit after', 'tourist', 'walk to', 'things to do', '근처', '주변', '관광', '구경', '갈 만한', '가볼', '가 볼', '놀러', '近く', '観光', '周辺', 'この後', 'このあと', '行く', '行ける', 'ちかく', 'かんこう', 'a cote', 'visiter', 'touristique', 'aux alentours', 'balade', 'promenade', 'que faire'],
  popular: ['order', 'eat', 'love', 'like', 'popular', '먹', '인기', '좋아', '주문', '많이', '食べ', '人気', '好き', '注文', 'たべ', 'にんき', 'すき', 'ちゅうもん', 'commande', 'mange', 'aime', 'prefer', 'populaire'],
  thanks: ['thank', 'thanks', 'thx', '고마', '감사', 'ありがと', 'merci'],
  hello: [' hello', ' hi ', ' hey', 'good evening', 'good morning', '안녕', 'こんにちは', 'こんばんは', 'はじめまして', 'bonjour', 'salut', 'bonsoir', 'coucou'],
  pronoun: [' it ', ' it?', 'this', 'that one', '이거', '이건', '그거', '그건', '이 메뉴', 'これ', 'それ', 'この料理', ' ca ', ' ca?', 'ce plat', 'celui-ci', 'celui la'],
  question: ['?', '？', ' is ', ' does ', ' do ', ' can ', '나요', '까요', '어요?', 'ますか', 'ですか', 'か？', 'る？', 'い？', '요?', 'est-ce', 'est-il'],
}

/** 분류를 가리키는 말 — '찌개에 새우 들어가요?' 처럼 메뉴 하나가 아니라 분류를 물을 때 */
const CATEGORY_WORDS: [CategoryId, string[]][] = [
  ['stew', ['stew', 'soup', 'jjigae', '찌개', 'チゲ', 'スープ', '鍋', 'ragout', 'soupe']],
  ['rice-noodle', ['noodle', ' rice', 'bibimbap', '국수', '면 요리', '밥', '麺', 'ご飯', 'ビビンバ', 'nouille', ' riz']],
  ['grill', ['grill', 'bbq', 'barbecue', 'fried', '구이', '튀김', '焼き', '揚げ', 'grille', 'frit']],
  ['dessert', ['dessert', 'sweets', '디저트', '후식', 'デザート', 'スイーツ']],
  ['drink', ['drink', 'beverage', '음료', '飲み物', 'ドリンク', 'boisson']],
]

const NATIONALITY: [string, string[]][] = [
  ['jp', ['japanese', 'japan', '일본', '日本', 'japon']],
  ['us', ['american', 'america', 'usa', '미국', 'アメリカ', 'americain', 'etats-unis']],
  ['fr', ['french', 'france', '프랑스', 'フランス', 'francais']],
  ['cn', ['chinese', 'china', '중국', '中国', 'chinois', 'chine']],
  ['tw', ['taiwan', '대만', '台湾', 'taiwanais']],
  ['th', ['thai', 'thailand', '태국', 'タイ人', 'タイの', 'thailandais', 'thailande']],
  ['vn', ['vietnam', '베트남', 'ベトナム', 'vietnamien']],
  ['gb', ['british', 'english people', ' uk ', 'england', '영국', 'イギリス', 'britannique', 'anglais']],
  ['de', ['german', 'germany', '독일', 'ドイツ', 'allemand', 'allemagne']],
  ['sg', ['singapore', '싱가포르', 'シンガポール', 'singapour']],
  ['hk', ['hong kong', '홍콩', '香港']],
  ['ph', ['filipino', 'philippine', '필리핀', 'フィリピン', 'philippin']],
  ['au', ['australia', 'aussie', '호주', 'オーストラリア', 'australien']],
]

const NUMBER_WORDS: [string, number][] = [
  ['two', 2], ['three', 3], ['four', 4], ['five', 5], ['six', 6], ['둘', 2], ['두 명', 2], ['셋', 3], ['세 명', 3], ['넷', 4], ['네 명', 4], ['다섯', 5],
  ['二人', 2], ['ふたり', 2], ['三人', 3], ['四人', 4], ['五人', 5], ['deux', 2], ['trois', 3], ['quatre', 4], ['cinq', 5],
]

/** 메뉴 별칭 — 이름(네 언어)과 로마자는 자동으로 더한다. 여기엔 사람들이 흔히 부르는 말만 */
const DISH_ALIASES: Record<string, string[]> = {
  'dolsot-bibimbap': ['bibimbap', 'bibimbab', 'stone pot', 'dolsot', '비빔밥', '돌솥', 'ビビンバ', 'ビビンパ', '石焼'],
  'sanchae-bibimbap': ['mountain', 'herb bibimbap', 'vegan bibimbap', 'wild greens', '산채', '山菜', 'montagne', 'herbes sauvages'],
  'kimchi-jjigae': ['kimchi stew', 'kimchi jjigae', 'kimchi soup', '김치찌개', '김치 찌개', 'キムチチゲ', 'キムチ鍋', 'ragout de kimchi', 'soupe de kimchi'],
  'doenjang-jjigae': ['doenjang', 'soybean paste', 'bean paste stew', 'miso stew', '된장', 'テンジャン', '味噌チゲ', 'pate de soja'],
  'sundubu': ['sundubu', 'soft tofu', 'silken tofu', '순두부', 'スンドゥブ', 'tofu soyeux'],
  'mul-naengmyeon': ['naengmyeon', 'cold noodle', 'buckwheat', '냉면', '冷麺', 'nouilles froides', 'sarrasin'],
  'japchae': ['japchae', 'glass noodle', '잡채', 'チャプチェ', '春雨', 'vermicelle'],
  'samgyeopsal': ['samgyeopsal', 'pork belly', 'bbq', 'barbecue', 'korean bbq', '삼겹살', '고기 구이', 'サムギョプサル', '焼肉', 'poitrine de porc'],
  'yangnyeom-chicken': ['fried chicken', 'chicken', 'kfc', '치킨', '양념치킨', 'チキン', 'ヤンニョム', '唐揚げ', 'poulet'],
  'haemul-pajeon': ['pajeon', 'pancake', 'scallion', 'jeon', '파전', 'チヂミ', 'パジョン', 'galette', 'crepe'],
  'tteokbokki': ['tteokbokki', 'topokki', 'ddukbokki', 'rice cake', '떡볶이', 'トッポッキ', 'gateau de riz'],
  'gun-mandu': ['mandu', 'dumpling', 'gyoza', '만두', '군만두', '餃子', 'マンドゥ', 'ravioli', 'raviolis'],
  'galbi-jjim': ['galbi', 'short rib', 'braised beef', 'rib', '갈비', '갈비찜', 'カルビ', 'カルビチム', 'cote de boeuf', 'travers'],
  'ganjang-gejang': ['gejang', 'raw crab', 'marinated crab', 'soy crab', '게장', '간장게장', 'カンジャンケジャン', 'ケジャン', 'crabe cru'],
  'injeolmi-bingsu': ['bingsu', 'shaved ice', 'injeolmi', '빙수', '인절미', 'ピンス', 'かき氷', 'glace pilee'],
  'hotteok': ['hotteok', 'hoddeok', 'sweet pancake', '호떡', 'ホットク', 'crepe sucree'],
  'sikhye': ['sikhye', 'rice punch', '식혜', 'シッケ', 'punch de riz'],
  'omija-ade': ['omija', 'five flavor', 'berry ade', '오미자', 'オミジャ', 'cinq saveurs'],
  'makgeolli': ['makgeolli', 'rice wine', '막걸리', 'マッコリ', 'vin de riz'],
  'soju': ['soju', '소주', '焼酎', 'ソジュ'],
}

/** 이름이 비슷해 헷갈리는 메뉴의 대안 — 조건에 걸리면 이 순서로 권한다 */
const SIMILAR: Record<string, string[]> = {
  'dolsot-bibimbap': ['sanchae-bibimbap', 'japchae', 'doenjang-jjigae'],
  'sanchae-bibimbap': ['dolsot-bibimbap', 'japchae'],
  'kimchi-jjigae': ['doenjang-jjigae', 'sundubu', 'galbi-jjim'],
  'doenjang-jjigae': ['sundubu', 'kimchi-jjigae', 'sanchae-bibimbap'],
  'sundubu': ['doenjang-jjigae', 'kimchi-jjigae', 'dolsot-bibimbap'],
  'mul-naengmyeon': ['japchae', 'sanchae-bibimbap', 'dolsot-bibimbap'],
  'japchae': ['sanchae-bibimbap', 'gun-mandu', 'dolsot-bibimbap'],
  'samgyeopsal': ['galbi-jjim', 'yangnyeom-chicken', 'gun-mandu'],
  'yangnyeom-chicken': ['samgyeopsal', 'galbi-jjim', 'haemul-pajeon'],
  'haemul-pajeon': ['japchae', 'gun-mandu', 'yangnyeom-chicken'],
  'tteokbokki': ['japchae', 'gun-mandu', 'haemul-pajeon'],
  'gun-mandu': ['tteokbokki', 'japchae', 'haemul-pajeon'],
  'galbi-jjim': ['samgyeopsal', 'japchae', 'dolsot-bibimbap'],
  'ganjang-gejang': ['galbi-jjim', 'haemul-pajeon', 'dolsot-bibimbap'],
  'injeolmi-bingsu': ['hotteok', 'sikhye', 'omija-ade'],
  'hotteok': ['injeolmi-bingsu', 'sikhye'],
  'sikhye': ['omija-ade', 'injeolmi-bingsu'],
  'omija-ade': ['sikhye'],
  'makgeolli': ['omija-ade', 'soju'],
  'soju': ['makgeolli', 'omija-ade'],
}

let aliasIndex: { alias: string; id: string }[] | null = null
function dishAliases() {
  if (aliasIndex) return aliasIndex
  const out: { alias: string; id: string }[] = []
  for (const item of MENU) {
    const words = new Set<string>([item.romanized, ...Object.values(item.name), ...(DISH_ALIASES[item.id] ?? [])])
    for (const w of words) {
      const alias = norm(w).trim()
      if (alias.length >= 2 || /[぀-鿿가-힣]/.test(alias)) out.push({ alias, id: item.id })
    }
  }
  // 긴 별칭부터 — '산채비빔밥'이 '비빔밥'보다 먼저 잡히게
  aliasIndex = out.sort((a, b) => b.alias.length - a.alias.length)
  return aliasIndex
}

interface Parsed {
  text: string
  dishes: string[]
  allergens: AllergenId[]
  diets: DietId[]
  negated: boolean
  spiceLow: boolean
  spiceHigh: boolean
  nationality?: string
  number?: number
  categories: CategoryId[]
  has: (key: keyof typeof INTENT_WORDS) => boolean
}

/** 찾은 낱말 자리는 지워서 짧은 낱말이 겹쳐 잡히지 않게 한다('shellfish' 안의 'fish') */
function take(state: { t: string }, words: string[]): boolean {
  let hit = false
  for (const needle of words.map(fold).sort((a, b) => b.length - a.length)) {
    let idx = findWord(state.t, needle)
    while (idx >= 0) {
      hit = true
      state.t = state.t.slice(0, idx) + ' '.repeat(needle.length) + state.t.slice(idx + needle.length)
      idx = findWord(state.t, needle)
    }
  }
  return hit
}

function parse(query: string): Parsed {
  const text = norm(query)
  const state = { t: text }

  // 메뉴 이름 — 긴 것부터 잡고 지운다
  const dishes: string[] = []
  for (const { alias, id } of dishAliases()) {
    const idx = state.t.indexOf(alias)
    if (idx < 0) continue
    // 라틴 별칭은 낱말 경계가 맞아야 한다('rib' ≠ 'ribbon', 'jeon' ≠ 'pajeon' 은 위에서 이미 지워짐)
    if (/^[a-z]/.test(alias)) {
      const before = state.t[idx - 1] ?? ' '
      const rest = state.t.slice(idx + alias.length).replace(/^(s|es)(?![a-z])/, '')
      if (/[a-z]/.test(before) || /^[a-z]/.test(rest)) continue
    }
    if (!dishes.includes(id)) dishes.push(id)
    state.t = state.t.slice(0, idx) + ' '.repeat(alias.length) + state.t.slice(idx + alias.length)
  }

  const spiceLow = take(state, SPICE_LOW)
  const spiceHigh = !spiceLow && take(state, SPICE_HIGH)

  const diets: DietId[] = []
  for (const id of ['no-alcohol', 'vegan', 'vegetarian', 'halal', 'no-pork', 'no-beef'] as DietId[]) {
    if (take(state, DIET_WORDS[id])) diets.push(id)
  }
  const allergens: AllergenId[] = []
  for (const [words, ids] of MULTI_ALLERGEN) if (take(state, words)) for (const a of ids) if (!allergens.includes(a)) allergens.push(a)
  for (const id of Object.keys(ALLERGEN_WORDS) as AllergenId[]) {
    if (take(state, ALLERGEN_WORDS[id]) && !allergens.includes(id)) allergens.push(id)
  }

  // 메뉴 이름을 지운 뒤에 본다 — '김치찌개'가 '찌개' 분류로 잡히지 않게
  const categories: CategoryId[] = []
  for (const [cat, words] of CATEGORY_WORDS) if (words.some((w) => hasWord(state.t, fold(w)))) categories.push(cat)

  let nationality: string | undefined
  for (const [code, words] of NATIONALITY) {
    if (words.some((w) => hasWord(text, fold(w)))) { nationality = code; break }
  }

  let number: number | undefined
  const digits = text.match(/(\d[\d,.]*)/)
  if (digits) number = Number(digits[1].replace(/,/g, ''))
  if (number === undefined) for (const [w, n] of NUMBER_WORDS) if (hasWord(text, fold(w))) { number = n; break }

  const negated = NEGATION.some((w) => hasWord(text, fold(w)))
  const has = (key: keyof typeof INTENT_WORDS) => INTENT_WORDS[key].some((w) => hasWord(text, fold(w)))

  return { text, dishes, allergens, diets, negated, spiceLow, spiceHigh, nationality, number, categories, has }
}

// ───────────────────────── 검색: 점수·이유 ─────────────────────────

function nameOf(id: string, lang: OrderLang): string {
  return menuItem(id)?.name[lang] ?? id
}

function changeLabel(fit: Pick<Fit, 'fixChanges' | 'milderChanges'>, lang: OrderLang, which: 'fix' | 'milder' = 'fix'): string {
  const list = which === 'fix' ? fit.fixChanges : fit.milderChanges
  // '없음'·'None' 처럼 선택지만으로는 뜻이 안 서는 것이 있어 옵션 이름을 앞에 붙인다
  return list.map((c) => `${c.group.label[lang]}: ${c.choice.label[lang]}`).join(' + ')
}

function constraintSummary(profile: Profile, copy: AiCopy): string {
  const parts = [
    ...profile.diets.map((d) => copy.dietAdj[d]),
    ...profile.allergens.map((a) => copy.without(copy.allergenNoun[a])),
  ]
  return copy.list(parts)
}

const MAIN_CATS: CategoryId[] = ['signature', 'stew', 'rice-noodle', 'grill', 'street']

interface ScoreOpts {
  categories?: CategoryId[]
  spice?: 'low' | 'high'
  maxPrice?: number
  shareable?: boolean
  countryCode?: string
}

function scoreItem(item: MenuItem, ctx: AiContext, opts: ScoreOpts = {}): { score: number; fit: Fit } | null {
  const fit = fitFor(item, ctx.profile)
  if (fit.status === 'conflict') return null
  if (opts.categories && !opts.categories.includes(item.category)) return null
  const sel = fit.fix ?? (fit.tooSpicy && fit.milder ? fit.milder : undefined) ?? defaultSelection(item)
  const spice = spiceFor(item, sel)
  if (opts.spice === 'low' && spice > 1) return null
  if (opts.spice === 'high' && spice < 3) return null
  if (opts.maxPrice && priceFor(item, sel) > opts.maxPrice) return null
  let score = 21 - item.rank
  const code = (opts.countryCode ?? ctx.country?.code ?? '').toUpperCase()
  const love = item.lovedBy.find((l) => l.country === code)
  if (love) score += love.pct * (opts.countryCode ? 1.5 : 0.6)
  if (item.badges.includes('signature')) score += 6
  if (item.badges.includes('chef')) score += 3
  if (fit.status === 'adjust') score -= 3
  if (fit.tooSpicy) score -= fit.milder ? 4 : 14
  if (opts.shareable && item.servings >= 2) score += 6
  if (!opts.categories && !MAIN_CATS.includes(item.category)) score -= 30
  if (opts.maxPrice) score += (opts.maxPrice - priceFor(item, sel)) / 1000
  return { score, fit }
}

function reasonFor(item: MenuItem, fit: Fit, ctx: AiContext, copy: AiCopy, focus?: 'country' | 'price' | 'share' | 'spice'): string {
  const reasons: string[] = []
  const code = ctx.country?.code.toUpperCase()
  const love = item.lovedBy.find((l) => l.country === code)
  if (fit.status === 'adjust') reasons.push(copy.reason.swap(changeLabel(fit, ctx.lang)))
  else if (fit.tooSpicy && fit.milder) reasons.push(copy.reason.swap(changeLabel(fit, ctx.lang, 'milder')))
  if (focus === 'price') reasons.push(copy.reason.cheap(won(priceFor(item, fit.fix ?? defaultSelection(item)))))
  if (focus === 'share' && item.servings >= 2) reasons.push(copy.reason.share(Math.max(2, ctx.profile.party)))
  if (focus === 'spice') reasons.push(spiceFor(item, fit.fix ?? defaultSelection(item)) === 0 ? copy.reason.mild : ORDER_TEXT[ctx.lang].spiceLevels[spiceFor(item, fit.fix ?? defaultSelection(item))])
  if (love && love.pct >= 12 && ctx.country) reasons.push(copy.reason.country(countryName(ctx.country, ctx.lang), love.pct))
  if (item.badges.includes('vegan') && ctx.profile.diets.some((d) => d === 'vegan' || d === 'vegetarian')) reasons.push(copy.reason.vegan)
  if (item.badges.includes('signature')) reasons.push(copy.reason.signature)
  else if (item.rank <= 3) reasons.push(copy.reason.best(item.rank))
  else if (item.badges.includes('chef')) reasons.push(copy.reason.chef)
  if (fit.status === 'ok' && hasConstraints(ctx.profile) && reasons.length < 2) reasons.push(copy.reason.fits(constraintSummary(ctx.profile, copy)))
  if (!reasons.length) reasons.push(copy.reason.best(item.rank))
  return reasons.slice(0, 2).join(' · ')
}

function cardFor(item: MenuItem, ctx: AiContext, fit = fitFor(item, ctx.profile), focus?: Parameters<typeof reasonFor>[4]): AiCard {
  const sel = fit.fix ?? (fit.tooSpicy && fit.milder ? fit.milder : undefined) ?? defaultSelection(item)
  return { id: item.id, reason: reasonFor(item, fit, ctx, AI_COPY[ctx.lang], focus), sel }
}

function ranked(ctx: AiContext, opts: ScoreOpts = {}, limit = 4): AiCard[] {
  return MENU.map((item) => ({ item, r: scoreItem(item, ctx, opts) }))
    .filter((x): x is { item: MenuItem; r: { score: number; fit: Fit } } => !!x.r)
    .sort((a, b) => b.r.score - a.r.score)
    .slice(0, limit)
    .map(({ item, r }) => cardFor(item, ctx, r.fit, opts.maxPrice ? 'price' : opts.shareable ? 'share' : opts.spice ? 'spice' : undefined))
}

/** 메뉴 화면 'AI 추천' 줄 */
export function recommendPicks(ctx: AiContext, limit = 4): AiCard[] {
  return ranked(ctx, {}, limit)
}

/** 메뉴 상세의 'AI 인사이트' 한 줄 */
export function insightFor(id: string, ctx: AiContext): string {
  const item = menuItem(id)
  if (!item) return ''
  return reasonFor(item, fitFor(item, ctx.profile), ctx, AI_COPY[ctx.lang])
}

function alternativeFor(id: string, ctx: AiContext, profile: Profile = ctx.profile): MenuItem | undefined {
  const pool = [...(SIMILAR[id] ?? []), ...MENU.filter((m) => m.category === menuItem(id)?.category).map((m) => m.id)]
  for (const alt of pool) {
    const item = menuItem(alt)
    if (item && alt !== id && fitFor(item, profile).status !== 'conflict') return item
  }
  return undefined
}

function hiddenLine(ingredientId: string, lang: OrderLang): string | undefined {
  const ing = INGREDIENTS[ingredientId]
  return ing?.hidden && ing.hiddenNote ? ing.hiddenNote[lang] : undefined
}

// ───────────────────────── 생성: 의도별 답 ─────────────────────────

/** 카드 수도 '찾은 건수'에 넣는다 */
function withFound(answer: AiAnswer): AiAnswer {
  return { ...answer, found: Math.max(answer.found, answer.cards.length) }
}

function base(intent: Intent, partial: Partial<AiAnswer>): AiAnswer {
  return { intent, entities: [], found: 0, checked: false, text: '', cards: [], sources: ['menu'], safety: false, followUps: [], ...partial }
}

function entitiesOf(p: Parsed, ctx: AiContext, dishIds: string[]): AiEntity[] {
  const t = ORDER_TEXT[ctx.lang]
  const out: AiEntity[] = []
  for (const id of dishIds) out.push({ kind: 'dish', label: nameOf(id, ctx.lang) })
  for (const a of p.allergens) out.push({ kind: 'allergen', label: t.allergens[a] })
  for (const d of p.diets) out.push({ kind: 'diet', label: t.diets[d] })
  if (p.spiceLow) out.push({ kind: 'spice', label: t.spiceLevels[0] })
  if (p.spiceHigh) out.push({ kind: 'spice', label: t.spiceLevels[3] })
  if (p.nationality) {
    const c = countryByCode(p.nationality)
    if (c) out.push({ kind: 'country', label: countryName(c, ctx.lang) })
  }
  return out
}

function followsForDish(id: string, ctx: AiContext, skip: string[] = []): string[] {
  const c = AI_COPY[ctx.lang]
  const name = nameOf(id, ctx.lang)
  return [c.follow.spicy(name), c.follow.howto(name), c.follow.pairing(name), c.follow.add(name)].filter((q) => !skip.includes(q)).slice(0, 3)
}

function followsGeneral(ctx: AiContext, first?: string): string[] {
  const c = AI_COPY[ctx.lang]
  const pool = [c.follow.milder, c.follow.drinks, c.follow.dessert, c.follow.nearby, c.follow.share]
  return first ? [first, ...pool].slice(0, 3) : pool.slice(0, 3)
}

/** 대화를 열 때 첫 인사 */
export function greetingAnswer(ctx: AiContext): AiAnswer {
  const copy = AI_COPY[ctx.lang]
  const constraints = constraintSummary(ctx.profile, copy)
  return base('greet', {
    text: copy.greet({ store: STORE.name, constraints }),
    sources: [],
    followUps: ORDER_TEXT[ctx.lang].ai.suggestions,
  })
}

export function askAi(query: string, ctx: AiContext): AiAnswer {
  const p = parse(query)
  const copy = AI_COPY[ctx.lang]
  const t = ORDER_TEXT[ctx.lang]

  // 메뉴를 콕 집지 않았지만 '이거 매워요?'처럼 앞 메뉴를 가리키는 질문
  const dishQuestion = p.has('howto') || p.has('pairing') || p.has('contains') || p.has('canEat') || ((p.spiceHigh || p.spiceLow) && p.has('question'))
  let dishes = p.dishes
  const concepts = p.allergens.length + p.diets.length
  // '새우 안 들어간 메뉴?' 처럼 부정어 + 재료면 앞 메뉴 이야기가 아니라 거르기 요청이다
  const filterAsk = p.negated && concepts > 0 && !p.has('pronoun')
  if (!dishes.length && ctx.lastDishId && !p.categories.length && (p.has('pronoun') || (dishQuestion && !p.has('recommend') && !filterAsk))) dishes = [ctx.lastDishId]
  const entities = entitiesOf(p, ctx, dishes)

  // 1) 특정 메뉴에 대한 질문
  if (dishes.length) {
    const id = dishes[0]
    const item = menuItem(id)!
    const name = item.name[ctx.lang]

    // 담아 줘
    if (p.has('add') && !p.has('question') && !dishQuestion && concepts === 0 && !p.spiceHigh && !p.spiceLow) {
      const adds = dishes.map((d) => {
        const it = menuItem(d)!
        const fit = fitFor(it, ctx.profile)
        return { id: d, sel: fit.fix ?? defaultSelection(it) }
      })
      // 손님 조건에 걸리는 메뉴도 담기는 하되(손님 뜻), 걸리는 재료를 분명히 알린다
      const cautions = adds.flatMap((a) => {
        const c = conflictsFor(menuItem(a.id)!, a.sel, ctx.profile)[0]
        if (!c) return []
        const w = c.kind === 'allergen' ? copy.allergenNoun[c.allergen] : copy.dietNoun[c.diet]
        return [copy.addCaution({ dish: nameOf(a.id, ctx.lang), what: w, ingredient: INGREDIENTS[c.ingredient].name[ctx.lang] })]
      })
      return base('add', {
        entities, found: adds.length, safety: cautions.length > 0,
        text: [copy.added({ names: copy.list(adds.map((a) => nameOf(a.id, ctx.lang))) }), ...cautions].join('\n\n'),
        addToCart: adds, focusDishId: id, sources: ['menu'],
        followUps: [copy.follow.pairing(name), copy.follow.drinks, copy.follow.dessert],
      })
    }

    // 이 메뉴에 ○○ 들어가요? / 먹어도 돼요?
    //   '들었나'는 물은 것만 보고, 바꿀 옵션·대신 권할 메뉴는 손님이 저장한 조건까지 합쳐서 찾는다(콩 알레르기에 '두부로 바꾸기'를 권하지 않게)
    if (concepts > 0 || (p.has('canEat') && hasConstraints(ctx.profile))) {
      const asked: Profile = concepts > 0 ? { ...ctx.profile, allergens: p.allergens, diets: p.diets } : ctx.profile
      const merged: Profile = {
        ...ctx.profile,
        allergens: [...new Set([...ctx.profile.allergens, ...p.allergens])],
        diets: [...new Set([...ctx.profile.diets, ...p.diets])],
      }
      const canEat = p.has('canEat')
      const lines: string[] = []
      const cards: AiCard[] = []
      const ingNames: string[] = []
      for (const d of dishes.slice(0, 2)) {
        const it = menuItem(d)!
        const dn = it.name[ctx.lang]
        const conflicts = conflictsFor(it, defaultSelection(it), asked)
        if (!conflicts.length) {
          const what = copy.list([...asked.diets.map((x) => copy.dietNoun[x]), ...asked.allergens.map((a) => copy.allergenNoun[a])])
          lines.push(canEat ? copy.canYes({ dish: dn, what }) : copy.safetyNo({ dish: dn, what }))
          // 물은 것은 없지만 저장한 다른 조건에 걸리면 알린다
          const other = conflictsFor(it, defaultSelection(it), merged).filter((c) => !conflicts.some((x) => x.kind === c.kind && x.ingredient === c.ingredient))
          for (const c of other.slice(0, 1)) {
            const ing = INGREDIENTS[c.ingredient]
            const w = c.kind === 'allergen' ? copy.allergenNoun[c.allergen] : copy.dietNoun[c.diet]
            lines.push(copy.alsoNote({ what: w, ingredient: ing.name[ctx.lang] }))
          }
          cards.push(cardFor(it, ctx))
          continue
        }
        for (const [i, c] of conflicts.slice(0, 2).entries()) {
          const ing = INGREDIENTS[c.ingredient]
          ingNames.push(ing.name[ctx.lang])
          const what = c.kind === 'allergen' ? copy.allergenNoun[c.allergen] : copy.dietNoun[c.diet]
          const note = hiddenLine(c.ingredient, ctx.lang)
          lines.push(canEat && i === 0 ? copy.canNo({ dish: dn, what, ingredient: ing.name[ctx.lang], note }) : copy.safetyYes({ dish: dn, what, ingredient: ing.name[ctx.lang], note }))
        }
        const fit = fitFor(it, merged)
        if (fit.status === 'adjust') {
          lines.push(copy.safetyFix({ change: changeLabel(fit, ctx.lang) }))
          cards.push({ id: it.id, reason: copy.reason.swap(changeLabel(fit, ctx.lang)), sel: fit.fix! })
        } else {
          const alt = alternativeFor(d, ctx, merged)
          if (alt) {
            lines.push(copy.safetyAlt({ alt: alt.name[ctx.lang] }))
            cards.push(cardFor(alt, { ...ctx, profile: merged }))
          } else lines.push(copy.noSafe)
        }
      }
      if (merged.diets.includes('halal')) lines.push(copy.halalNote)
      return base('dish-safety', {
        entities, found: dishes.length + ingNames.length, checked: true,
        text: lines.join('\n\n'), cards, sources: ['ingredients', 'chef'],
        safety: merged.allergens.length > 0, focusDishId: id,
        followUps: followsForDish(id, ctx),
      })
    }

    // 매워요?
    if (p.spiceHigh || p.spiceLow) {
      const sel = defaultSelection(item)
      const level = spiceFor(item, sel)
      const lines = [copy.spice({ dish: name, label: t.spiceLevels[level], level })]
      if (level === 0) lines.push(copy.spiceNone)
      else if (spicePalate(ctx.country) === 'shy' && level >= 2 && ctx.country) lines.push(copy.spiceShy(countryName(ctx.country, ctx.lang)))
      const calmer = fitFor(item, { ...ctx.profile, spiceMax: Math.max(0, level - 1) as Profile['spiceMax'] })
      if (level > 0 && calmer.milder) lines.push(copy.spiceMilder({ change: changeLabel(calmer, ctx.lang, 'milder') }))
      return base('dish-spice', {
        entities, found: 1, text: lines.join(' '),
        cards: [calmer.milder && level > ctx.profile.spiceMax ? { id, reason: copy.reason.swap(changeLabel(calmer, ctx.lang, 'milder')), sel: calmer.milder } : cardFor(item, ctx)],
        sources: ['menu', 'chef'], focusDishId: id,
        followUps: [copy.follow.milder, copy.follow.howto(name), copy.follow.pairing(name)],
      })
    }

    if (p.has('howto')) {
      return base('dish-howto', {
        entities, found: 1, text: copy.howto({ dish: name, text: item.howToEat[ctx.lang] }),
        cards: [cardFor(item, ctx)], sources: ['menu', 'chef'], focusDishId: id,
        followUps: followsForDish(id, ctx, [copy.follow.howto(name)]),
      })
    }

    if (p.has('pairing')) {
      const pairs = item.pairsWith.map((x) => menuItem(x)).filter((x): x is MenuItem => !!x && fitFor(x, ctx.profile).status !== 'conflict')
      return base('pairing', {
        entities, found: pairs.length,
        text: copy.pairing({ dish: name, names: copy.list(pairs.map((x) => x.name[ctx.lang])) }),
        cards: pairs.map((x) => ({ ...cardFor(x, ctx), reason: copy.reason.pairs(name) })),
        sources: ['orders', 'chef'], focusDishId: id,
        followUps: [copy.follow.add(name), copy.follow.dessert, copy.follow.drinks],
      })
    }

    if (p.has('contains')) {
      const ids = ingredientsFor(item)
      const hidden = ids.filter((x) => INGREDIENTS[x].hidden && INGREDIENTS[x].hiddenNote)
      return base('dish-contents', {
        entities, found: ids.length, checked: hasConstraints(ctx.profile),
        text: copy.contents({
          dish: name,
          list: copy.list(ids.map((x) => INGREDIENTS[x].name[ctx.lang])),
          hidden: hidden.length ? hidden.map((x) => `${INGREDIENTS[x].name[ctx.lang]}: ${INGREDIENTS[x].hiddenNote![ctx.lang]}`).join(' / ') : undefined,
        }),
        cards: [cardFor(item, ctx)], sources: ['ingredients', 'menu'], safety: true, focusDishId: id,
        followUps: followsForDish(id, ctx),
      })
    }

    // 그냥 메뉴 이름 → 소개
    const cards = dishes.slice(0, 3).map((d) => cardFor(menuItem(d)!, ctx))
    return base('dish-info', {
      entities, found: dishes.length,
      text: copy.info({ dish: name, desc: item.description[ctx.lang], chef: item.ownerNote[ctx.lang] }),
      cards, sources: ['menu', 'chef'], focusDishId: id,
      followUps: followsForDish(id, ctx),
    })
  }

  // 1-b) 분류 + 재료 — '찌개에 새우 들어가요?' → 그 분류 메뉴를 한 줄씩 비교
  if (p.categories.length && concepts > 0) {
    const cat = p.categories[0]
    const items = MENU.filter((m) => m.category === cat)
    const probe: Profile = { ...ctx.profile, allergens: p.allergens, diets: p.diets }
    const what = copy.list([...p.diets.map((d) => copy.dietNoun[d]), ...p.allergens.map((a) => copy.allergenNoun[a])])
    const catLabel = CATEGORIES.find((c) => c.id === cat)?.label[ctx.lang] ?? cat
    const lines = [copy.catIntro({ cat: catLabel, what })]
    const safe: MenuItem[] = []
    for (const item of items) {
      const hit = conflictsFor(item, defaultSelection(item), probe)[0]
      if (hit) lines.push(copy.catYes({ dish: item.name[ctx.lang], ingredient: INGREDIENTS[hit.ingredient].name[ctx.lang] }))
      else { lines.push(copy.catNo({ dish: item.name[ctx.lang] })); safe.push(item) }
    }
    if (probe.diets.includes('halal')) lines.push(copy.halalNote)
    return base('dish-safety', {
      entities: [...entities, { kind: 'topic', label: catLabel }], found: items.length, checked: true,
      text: lines.join('\n'), cards: safe.filter((m) => fitFor(m, ctx.profile).status !== 'conflict').slice(0, 3).map((m) => cardFor(m, ctx)),
      sources: ['ingredients', 'menu'], safety: p.allergens.length > 0,
      followUps: followsGeneral(ctx),
    })
  }

  // 2) 근처 관광
  if (p.has('nearby')) {
    return base('nearby', { entities: [{ kind: 'topic', label: t.done.nearby }], found: STORE.nearby.length, text: copy.nearby, nearby: true, sources: ['faq'], followUps: [copy.follow.dessert, copy.follow.first, copy.follow.drinks] })
  }

  // 3) ○○ 나라 사람들은 뭘 먹어요?
  if (p.nationality && (p.has('popular') || p.has('recommend'))) {
    const country = countryByCode(p.nationality) ?? ctx.country
    const cname = countryName(country ?? null, ctx.lang)
    const code = (country?.code ?? '').toUpperCase()
    const cards = MENU.map((item) => ({ item, love: item.lovedBy.find((l) => l.country === code)?.pct ?? 0 }))
      .filter((x) => x.love > 0 && fitFor(x.item, ctx.profile).status !== 'conflict')
      .sort((a, b) => b.love - a.love)
      .slice(0, 4)
      .map(({ item, love }) => ({ ...cardFor(item, ctx), reason: copy.reason.country(cname, love) }))
    return base('popular-by', {
      entities, found: cards.length, text: copy.popularBy({ country: cname }),
      cards: cards.length ? cards : ranked(ctx), sources: ['orders'],
      followUps: followsGeneral(ctx, cards[0] ? copy.follow.howto(nameOf(cards[0].id, ctx.lang)) : undefined),
    })
  }

  // 4) 매장 안내(화장실·와이파이·결제·팁 …) — 식습관 낱말이 함께 오면 메뉴 거르기가 더 쓸모 있다.
  //    '셋이 뭘 나눠 먹지?'는 안내 문장보다 메뉴 카드가 낫다(아래 share)
  if (!concepts && !p.spiceLow && !p.spiceHigh) {
    const faq = STORE_FAQ.find((f) => Object.values(f.keywords).flat().some((k) => k.trim() && hasWord(p.text, fold(k))))
    if (faq && !(faq.id === 'sharing' && p.has('share'))) {
      return base('faq', {
        entities: [{ kind: 'topic', label: faq.question[ctx.lang] }], found: 1,
        text: faq.answer[ctx.lang], sources: ['faq'],
        followUps: [copy.follow.first, copy.follow.nearby, copy.follow.popular],
      })
    }
  }

  // 5) 식습관·알레르기 — '비건이에요', '새우 알레르기', '돼지고기 빼고'
  if (concepts > 0) {
    const identity = p.diets.some((d) => IDENTITY_DIETS.includes(d))
    if (p.negated || identity || p.allergens.length && p.has('canEat')) {
      const patch: Partial<Profile> = {
        diets: [...new Set([...ctx.profile.diets, ...p.diets])],
        allergens: [...new Set([...ctx.profile.allergens, ...p.allergens])],
      }
      const profile = { ...ctx.profile, ...patch }
      const next: AiContext = { ...ctx, profile }
      const fitting = MENU.filter((m) => fitFor(m, profile).status !== 'conflict')
      const adjustable = MENU.filter((m) => MAIN_CATS.includes(m.category) && fitFor(m, profile).status === 'adjust')
      const what = copy.list([...p.diets.map((d) => copy.dietAdj[d]), ...p.allergens.map((a) => copy.without(copy.allergenNoun[a]))])
      const lines = [copy.filterAck({ what }), copy.filterResult({ n: fitting.length, total: MENU.length })]
      for (const m of adjustable.slice(0, 2)) lines.push(copy.filterAdjust({ dish: m.name[ctx.lang], change: changeLabel(fitFor(m, profile), ctx.lang) }))
      if (profile.diets.includes('halal')) lines.push(copy.halalNote)
      return base('filter', {
        entities, found: fitting.length, checked: true,
        text: lines.join(' '), cards: ranked(next), sources: ['ingredients', 'menu'],
        safety: p.allergens.length > 0, profilePatch: patch,
        followUps: followsGeneral(ctx, copy.follow.first),
      })
    }
    // 부정어 없이 '해산물 메뉴?' → 그 재료가 든 메뉴
    const withIt = MENU.filter((m) => {
      const ids = ingredientsFor(m)
      return ids.some((x) => INGREDIENTS[x].allergens.some((a) => p.allergens.includes(a)) || p.diets.some((d) => dietBlocks(d, x)))
    }).filter((m) => fitFor(m, ctx.profile).status !== 'conflict')
    const what = copy.list([...p.diets.map((d) => copy.dietNoun[d]), ...p.allergens.map((a) => copy.allergenNoun[a])])
    return base('with-ingredient', {
      entities, found: withIt.length, checked: hasConstraints(ctx.profile),
      text: withIt.length ? copy.withIngredient({ what }) : `${copy.withIngredient({ what })} ${copy.withIngredientNone}`, cards: withIt.sort((a, b) => a.rank - b.rank).slice(0, 4).map((m) => cardFor(m, ctx)),
      sources: ['ingredients'], followUps: followsGeneral(ctx),
    })
  }

  // 6) 매운맛
  if (p.spiceLow) {
    const profile: Profile = { ...ctx.profile, spiceMax: Math.min(ctx.profile.spiceMax, 1) as Profile['spiceMax'] }
    return withFound(base('low-spice', {
      entities, found: 0, text: copy.lowSpiceIntro, cards: ranked({ ...ctx, profile }, { spice: 'low' }),
      sources: ['menu', 'chef'], profilePatch: { spiceMax: profile.spiceMax },
      followUps: followsGeneral(ctx),
    }))
  }
  if (p.spiceHigh) {
    const profile: Profile = { ...ctx.profile, spiceMax: 4 }
    return withFound(base('hot', {
      entities, text: copy.hotIntro, cards: ranked({ ...ctx, profile }, { spice: 'high' }),
      sources: ['menu', 'chef'], profilePatch: { spiceMax: 4 },
      followUps: followsGeneral(ctx),
    }))
  }

  // 7) 예산
  if (p.has('budget')) {
    let limit = 10000
    if (p.number) limit = p.number >= 1000 ? p.number : ctx.country ? Math.round(p.number * ctx.country.currency.krw) : p.number * 1000
    return withFound(base('budget', {
      entities, text: copy.budget({ price: won(limit) }), cards: ranked(ctx, { maxPrice: limit, categories: MAIN_CATS }),
      sources: ['menu', 'orders'], followUps: followsGeneral(ctx),
    }))
  }

  // 8) 여럿이 나눠 먹기
  if (p.has('share')) {
    const n = Math.min(8, Math.max(2, p.number && p.number < 20 ? p.number : ctx.profile.party))
    return withFound(base('share', {
      entities, text: copy.share({ n }), cards: ranked({ ...ctx, profile: { ...ctx.profile, party: n } }, { shareable: true }, Math.min(5, n + 1)),
      sources: ['orders', 'chef'], profilePatch: { party: n },
      followUps: followsGeneral(ctx, copy.follow.drinks),
    }))
  }

  // 9) 음료·디저트
  if (p.has('drink')) {
    const noAlcohol = ctx.profile.diets.some((d) => d === 'halal' || d === 'no-alcohol')
    return withFound(base('drinks', {
      entities, text: noAlcohol ? copy.drinksNoAlcohol : copy.drinks, cards: ranked(ctx, { categories: ['drink'] }),
      sources: ['menu', 'orders'], followUps: [copy.follow.dessert, copy.follow.first, copy.follow.nearby],
    }))
  }
  if (p.has('dessert')) {
    return withFound(base('desserts', {
      entities, text: copy.desserts, cards: ranked(ctx, { categories: ['dessert'] }),
      sources: ['menu', 'chef'], followUps: [copy.follow.drinks, copy.follow.nearby, copy.follow.first],
    }))
  }

  // 10) 추천
  if (p.has('recommend') || p.has('first')) {
    const constraints = constraintSummary(ctx.profile, copy)
    const intro = p.has('first') ? `${copy.firstTime} ${copy.recommendIntro({ constraints })}` : copy.recommendIntro({ constraints })
    const cards = ranked(ctx)
    return withFound(base('recommend', {
      entities, text: `${intro} ${copy.recommendOutro}`, cards,
      checked: hasConstraints(ctx.profile), safety: ctx.profile.allergens.length > 0,
      sources: ['orders', 'menu', ...(hasConstraints(ctx.profile) ? (['ingredients'] as SourceKey[]) : [])],
      followUps: cards[0] ? followsForDish(cards[0].id, ctx).slice(0, 2).concat(copy.follow.drinks) : followsGeneral(ctx),
    }))
  }

  if (p.has('add') && ctx.lastDishId) return askAi(nameOf(ctx.lastDishId, ctx.lang) + ' ' + query, { ...ctx, lastDishId: undefined })
  if (p.has('add')) return base('add', { text: copy.addWhich, sources: [], followUps: followsGeneral(ctx, copy.follow.first) })
  if (p.has('thanks')) return base('thanks', { text: copy.thanks, sources: [], followUps: [copy.follow.nearby, copy.follow.dessert, copy.follow.drinks] })
  if (p.has('hello')) return base('hello', { text: copy.hello, sources: [], followUps: ORDER_TEXT[ctx.lang].ai.suggestions })

  return withFound(base('fallback', { text: copy.fallback, cards: ranked(ctx, {}, 3), sources: ['orders'], followUps: ORDER_TEXT[ctx.lang].ai.suggestions }))
}
