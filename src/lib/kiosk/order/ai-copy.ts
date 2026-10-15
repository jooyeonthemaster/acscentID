// AI 컨시어지 답변 문장 — 네 언어. ai-engine.ts 가 매장 데이터에서 찾은 값을 끼워 문장을 만든다.
// 한국어 조사(은/는·이/가·을/를)는 앞말 받침을 보고 고른다(josa).

import type { AllergenId, OrderLang } from './types'
import type { DietId } from './diet'

/** 문장 가운데에 들어가는 재료 이름 — 'Salted fermented shrimp' → 'salted fermented shrimp'(약어는 그대로) */
export function mid(word: string): string {
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(word) ? word[0].toLowerCase() + word.slice(1) : word
}

/** 조사만 — 따옴표로 감싼 말 뒤에 붙일 때: `‘${x}’${particle(x, '으로/로')}` */
export function particle(word: string, pair: '은/는' | '이/가' | '을/를' | '과/와' | '으로/로'): string {
  return josa(word, pair).slice(word.length)
}

/** 앞말 받침에 맞는 조사 — josa('김치찌개', '은/는') → '김치찌개는' */
export function josa(word: string, pair: '은/는' | '이/가' | '을/를' | '과/와' | '으로/로'): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  const [withBatchim, without] = pair.split('/')
  if (code < 0xac00 || code > 0xd7a3) return `${word}${without}`
  const jong = (code - 0xac00) % 28
  if (pair === '으로/로' && jong === 8) return `${word}로` // ㄹ 받침
  return `${word}${jong ? withBatchim : without}`
}

export interface AiCopy {
  list: (items: string[]) => string
  quote: (dish: string) => string
  greet: (p: { store: string; constraints: string }) => string
  hello: string
  thanks: string
  fallback: string
  recommendIntro: (p: { constraints: string }) => string
  recommendOutro: string
  firstTime: string
  reason: {
    signature: string
    chef: string
    best: (rank: number) => string
    country: (country: string, pct: number) => string
    fits: (constraints: string) => string
    mild: string
    hotMatch: string
    vegan: string
    share: (n: number) => string
    cheap: (price: string) => string
    swap: (change: string) => string
    pairs: (dish: string) => string
  }
  filterAck: (p: { what: string }) => string
  filterResult: (p: { n: number; total: number }) => string
  filterAdjust: (p: { dish: string; change: string }) => string
  safetyYes: (p: { dish: string; what: string; ingredient: string; note?: string }) => string
  safetyNo: (p: { dish: string; what: string }) => string
  /** '먹어도 돼요?' — 첫 낱말이 '네'로 읽히지 않게 따로 */
  canYes: (p: { dish: string; what: string }) => string
  canNo: (p: { dish: string; what: string; ingredient: string; note?: string }) => string
  /** 물은 것은 없지만 저장한 다른 조건에 걸릴 때 */
  alsoNote: (p: { what: string; ingredient: string }) => string
  /** 바꿀 옵션도, 대신 권할 메뉴도 손님 조건에 맞지 않을 때 */
  noSafe: string
  /** AI 로 담았는데 손님 조건에 걸릴 때 */
  addCaution: (p: { dish: string; what: string; ingredient: string }) => string
  safetyFix: (p: { change: string }) => string
  safetyAlt: (p: { alt: string }) => string
  halalNote: string
  info: (p: { dish: string; desc: string; chef: string }) => string
  spice: (p: { dish: string; label: string; level: number }) => string
  spiceShy: (country: string) => string
  spiceMilder: (p: { change: string }) => string
  spiceNone: string
  lowSpiceIntro: string
  hotIntro: string
  howto: (p: { dish: string; text: string }) => string
  pairing: (p: { dish: string; names: string }) => string
  popularBy: (p: { country: string }) => string
  budget: (p: { price: string }) => string
  share: (p: { n: number }) => string
  drinks: string
  drinksNoAlcohol: string
  desserts: string
  added: (p: { names: string }) => string
  addWhich: string
  nearby: string
  contents: (p: { dish: string; list: string; hidden?: string }) => string
  withIngredient: (p: { what: string }) => string
  /** 그 재료가 든 메뉴가 있지만 모두 손님 조건에 걸린다 */
  withIngredientNone: string
  /** '찌개에 새우 들어가요?'처럼 분류를 물을 때 — 분류 안 메뉴를 한 줄씩 비교 */
  catIntro: (p: { cat: string; what: string }) => string
  catYes: (p: { dish: string; ingredient: string }) => string
  catNo: (p: { dish: string }) => string
  without: (noun: string) => string
  allergenNoun: Record<AllergenId, string>
  dietNoun: Record<DietId, string>
  dietAdj: Record<DietId, string>
  follow: {
    first: string
    milder: string
    spicy: (dish: string) => string
    contains: (dish: string) => string
    howto: (dish: string) => string
    pairing: (dish: string) => string
    popular: string
    drinks: string
    dessert: string
    nearby: string
    vegan: string
    noPork: string
    share: string
    add: (dish: string) => string
  }
}

const ko: AiCopy = {
  list: (items) => items.join(', '),
  quote: (dish) => `‘${dish}’`,
  greet: ({ store, constraints }) =>
    `안녕하세요! ${store} 전용 AI 컨시어지예요. 이 집 메뉴와 재료, 사장님 노트를 전부 알고 있어요.${constraints ? ` ${constraints} 조건도 기억해 둘게요.` : ''} 무엇이든 편하게 물어보세요.`,
  hello: '안녕하세요! 오늘 어떤 음식이 당기세요? 맵기나 재료 걱정이 있으면 말씀만 해 주세요.',
  thanks: '천만에요! 더 궁금한 게 있으면 언제든 불러 주세요. 맛있게 드세요.',
  fallback: '제가 잘 알아들었는지 모르겠어요. 메뉴 추천, 재료·알레르기, 매운 정도, 먹는 법, 매장 안내를 도와드릴 수 있어요. 일단 오늘 많이 찾는 메뉴를 보여 드릴게요.',
  recommendIntro: ({ constraints }) => (constraints ? `${constraints} 조건에 맞춰 골라 봤어요.` : '이 집에서 꼭 드셔 보셨으면 하는 메뉴예요.'),
  recommendOutro: '더 순한 맛이나 곁들일 음료가 필요하면 말씀해 주세요.',
  firstTime: '처음 오셨다면 이 집 대표 메뉴부터 추천해요.',
  reason: {
    signature: '이 집 대표 메뉴',
    chef: '셰프 추천',
    best: (rank) => `전체 주문 ${rank}위`,
    country: (country, pct) => `${country} 손님 ${pct}%가 주문`,
    fits: (constraints) => `${constraints} 조건에 맞음`,
    mild: '맵지 않아요',
    hotMatch: '매운맛 좋아하시면 딱',
    vegan: '완전 비건',
    share: (n) => `${n}명이 나눠 먹기 좋아요`,
    cheap: (price) => `${price}`,
    swap: (change) => `‘${change}’${particle(change, '으로/로')} 바꾸면 OK`,
    pairs: (dish) => `${josa(dish, '과/와')} 찰떡궁합`,
  },
  filterAck: ({ what }) => `알겠어요. ‘${what}’ 조건으로 메뉴판을 다시 맞췄어요.`,
  filterResult: ({ n, total }) => `${total}개 중 ${n}개를 드실 수 있어요.`,
  filterAdjust: ({ dish, change }) => `${josa(dish, '은/는')} ‘${change}’ 옵션을 고르면 드실 수 있어요.`,
  safetyYes: ({ dish, what, ingredient, note }) => `네, ${dish}에는 ${what} 성분이 있어요 — ${josa(ingredient, '이/가')} 들어가요.${note ? ` ${note}` : ''}`,
  safetyNo: ({ dish, what }) => `아니요, 사장님 재료표를 확인해 보니 ${dish}에는 ${josa(what, '이/가')} 들어가지 않아요.`,
  safetyFix: ({ change }) => `‘${change}’ 옵션을 고르시면 걱정 없이 드실 수 있어요.`,
  noSafe: '아쉽게도 저장하신 조건에 모두 맞는 대체 메뉴는 찾지 못했어요. 직원에게 조리 방법을 바꿀 수 있는지 물어봐 주세요.',
  canYes: ({ dish, what }) => `드셔도 괜찮아요 — 재료표상 ${dish}에는 ${josa(what, '이/가')} 없어요.`,
  canNo: ({ dish, what, ingredient, note }) => `지금 그대로는 어려워요 — ${dish}에는 ${josa(ingredient, '이/가')} 들어가 ${what} 성분이 있어요.${note ? ` ${note}` : ''}`,
  alsoNote: ({ what, ingredient }) => `다만 저장하신 조건 중 ${what}에 걸려요(${ingredient}).`,
  addCaution: ({ dish, what, ingredient }) => `주의: ${dish}에는 ${josa(ingredient, '이/가')} 들어가 ${what} 조건에 맞지 않아요. 주문 전에 꼭 확인해 주세요.`,
  safetyAlt: ({ alt }) => `대신 ${josa(alt, '은/는')} 어떠세요? 조건에 맞아요.`,
  halalNote: '참고로 저희는 할랄 인증 매장이 아니고, 주방에서 돼지고기를 함께 다뤄요.',
  info: ({ desc, chef }) => `${desc}\n\n사장님 한마디: “${chef}”`,
  spice: ({ dish, label, level }) => `${josa(dish, '은/는')} 한국 기준 ${level}단계, ‘${label}’예요.`,
  spiceShy: (country) => `${country} 손님께는 조금 더 맵게 느껴질 수 있어요.`,
  spiceMilder: ({ change }) => `‘${change}’${particle(change, '으로/로')} 고르시면 훨씬 순해져요.`,
  spiceNone: '고춧가루가 들어가지 않아 전혀 맵지 않아요.',
  lowSpiceIntro: '맵지 않거나 순한 메뉴만 골랐어요.',
  hotIntro: '매운맛 좋아하신다면 이 메뉴들이에요.',
  howto: ({ dish, text }) => `${dish} 먹는 법이에요. ${text}`,
  pairing: ({ dish, names }) => `${dish}에는 ${josa(names, '을/를')} 곁들이는 손님이 많아요.`,
  popularBy: ({ country }) => `이 매장 주문 데이터로 보면, ${country} 손님들은 이 메뉴를 가장 많이 고르세요.`,
  budget: ({ price }) => `${price} 이하로 든든하게 드실 수 있는 메뉴예요.`,
  share: ({ n }) => `${n}분이면 한 사람에 한 메뉴, 그리고 가운데 놓고 나눠 먹을 메뉴 하나를 추천해요. 한국은 나눠 먹는 문화예요!`,
  drinks: '이 집 음료예요. 막걸리는 해물파전과 잘 어울려요.',
  drinksNoAlcohol: '알코올 없는 음료만 골랐어요.',
  desserts: '식사 뒤에 이런 디저트는 어떠세요?',
  added: ({ names }) => `${josa(names, '을/를')} 담았어요. 오른쪽 아래 주문 버튼에서 확인할 수 있어요.`,
  addWhich: '어떤 메뉴를 담을까요? 메뉴 이름을 말씀해 주세요.',
  nearby: '식사 후 걸어서 가 볼 만한 곳이에요. 영수증 QR로 길 안내도 받아 보세요.',
  contents: ({ dish, list, hidden }) => `${dish} 재료: ${list}.${hidden ? `\n\n이름만 봐서는 모르는 재료도 있어요 — ${hidden}` : ''}`,
  withIngredient: ({ what }) => `${josa(what, '이/가')} 들어간 메뉴예요.`,
  without: (noun) => `${noun} 없이`,
  withIngredientNone: '다만 지금 조건으로는 드실 수 있는 메뉴가 없어요.',
  catIntro: ({ cat, what }) => `${cat} 메뉴를 ${what} 기준으로 하나씩 확인했어요.`,
  catYes: ({ dish, ingredient }) => `✗ ${dish} — ${josa(ingredient, '이/가')} 들어가요`,
  catNo: ({ dish }) => `✓ ${dish} — 들어가지 않아요`,
  allergenNoun: { gluten: '밀(글루텐)', crustaceans: '갑각류', eggs: '달걀', fish: '생선', peanuts: '땅콩', soy: '대두', milk: '우유', nuts: '견과류', celery: '셀러리', mustard: '겨자', sesame: '참깨', sulphites: '아황산염', lupin: '루핀', molluscs: '연체·조개류' },
  dietNoun: { 'no-pork': '돼지고기', 'no-beef': '소고기', halal: '돼지고기나 술', vegetarian: '고기나 해산물', vegan: '동물성 재료', 'no-alcohol': '알코올' },
  dietAdj: { 'no-pork': '돼지고기 없이', 'no-beef': '소고기 없이', halal: '할랄(돼지고기·술 없이)', vegetarian: '채식', vegan: '비건', 'no-alcohol': '알코올 없이' },
  follow: {
    first: '처음인데 뭐가 좋아요?',
    milder: '더 안 매운 건요?',
    spicy: (dish) => `${dish} 많이 매워요?`,
    contains: (dish) => `${dish}에 뭐가 들어가요?`,
    howto: (dish) => `${dish} 어떻게 먹어요?`,
    pairing: (dish) => `${josa(dish, '과/와')} 같이 먹으면 좋은 건?`,
    popular: '일본 사람들은 뭘 많이 먹어요?',
    drinks: '음료 추천해 줘',
    dessert: '디저트는 뭐가 있어요?',
    nearby: '식사 후에 근처 어디 가 볼까요?',
    vegan: '비건 메뉴 있어요?',
    noPork: '돼지고기 없는 메뉴 있어요?',
    share: '셋이서 나눠 먹을 메뉴 추천해 줘',
    add: (dish) => `${dish} 담아 줘`,
  },
}

const en: AiCopy = {
  list: (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`),
  quote: (dish) => dish,
  greet: ({ store, constraints }) =>
    `Hi! I'm ${store}'s own AI concierge. I know every dish, ingredient and chef's note in this kitchen.${constraints ? ` I'll keep your preferences in mind: ${constraints}.` : ''} Ask me anything.`,
  hello: "Hello! What are you in the mood for? Tell me about spice or any ingredients you avoid and I'll take care of it.",
  thanks: "You're welcome! Call me anytime. Enjoy your meal!",
  fallback: "I'm not sure I understood that. I can help with recommendations, ingredients and allergies, spice levels, how to eat a dish, or store info. Meanwhile, here's what guests love today.",
  recommendIntro: ({ constraints }) => (constraints ? `Here are my picks for you — all ${constraints}.` : 'Here are the dishes I’d love you to try here.'),
  recommendOutro: 'Want something milder, or a drink to go with it?',
  firstTime: "First time? Start with the house signatures.",
  reason: {
    signature: 'House signature',
    chef: "Chef's pick",
    best: (rank) => `#${rank} best seller`,
    country: (country, pct) => `${pct}% of guests from ${country} order it`,
    fits: (constraints) => `Fits: ${constraints}`,
    mild: 'Not spicy',
    hotMatch: 'Perfect if you like heat',
    vegan: '100% plant-based',
    share: (n) => `Great to share for ${n}`,
    cheap: (price) => price,
    swap: (change) => `OK with “${change}”`,
    pairs: (dish) => `Pairs with ${dish}`,
  },
  filterAck: ({ what }) => `Got it — ${what}. I've updated your whole menu.`,
  filterResult: ({ n, total }) => `${n} of our ${total} dishes work for you.`,
  filterAdjust: ({ dish, change }) => `${dish} works too if you choose “${change}”.`,
  safetyYes: ({ dish, what, ingredient, note }) => `Yes — our ${dish} does contain ${what}: it has ${mid(ingredient)}.${note ? ` ${note}` : ''}`,
  safetyNo: ({ dish, what }) => `No — according to the chef's ingredient sheet, our ${dish} contains no ${what}.`,
  safetyFix: ({ change }) => `Choose “${change}” and you can enjoy it safely.`,
  noSafe: "I couldn't find a swap or another dish that fits all of your preferences — please ask our staff whether the kitchen can adapt it.",
  canYes: ({ dish, what }) => `You're fine — according to the chef's ingredient sheet, our ${dish} has no ${what}.`,
  canNo: ({ dish, what, ingredient, note }) => `Not as it is — our ${dish} contains ${what}: it has ${mid(ingredient)}.${note ? ` ${note}` : ''}`,
  alsoNote: ({ what, ingredient }) => `One more thing: it does contain ${what} (${mid(ingredient)}), which you told me to avoid.`,
  addCaution: ({ dish, what, ingredient }) => `Heads-up: ${dish} contains ${what} (${mid(ingredient)}), which doesn't match your preferences. Please double-check before ordering.`,
  safetyAlt: ({ alt }) => `Instead, how about ${alt}? It fits your needs.`,
  halalNote: 'Please note we are not halal-certified, and pork is prepared in the same kitchen.',
  info: ({ desc, chef }) => `${desc}\n\nFrom the chef: “${chef}”`,
  spice: ({ dish, label, level }) => `Our ${dish} is level ${level} on the Korean scale — “${label}”.`,
  spiceShy: (country) => `Guests from ${country} often find it a little hotter than expected.`,
  spiceMilder: ({ change }) => `Choose “${change}” and it becomes much milder.`,
  spiceNone: 'There is no chili in it at all.',
  lowSpiceIntro: 'Here are dishes with little or no spice.',
  hotIntro: 'If you love heat, these are for you.',
  howto: ({ dish, text }) => `How to enjoy ${dish}: ${text}`,
  pairing: ({ dish, names }) => `With ${dish}, guests here love adding ${names}.`,
  popularBy: ({ country }) => `Based on this restaurant's order data, guests from ${country} choose these the most.`,
  budget: ({ price }) => `Satisfying dishes for ${price} or less.`,
  share: ({ n }) => `For ${n}, I'd order one dish each plus one to share in the middle — sharing is how Koreans eat!`,
  drinks: 'Here are our drinks. The makgeolli is a classic with the seafood pancake.',
  drinksNoAlcohol: 'Here are our alcohol-free drinks.',
  desserts: 'Something sweet to finish?',
  added: ({ names }) => `Added ${names} to your order. You can review it with the Order button.`,
  addWhich: 'Which dish should I add? Just tell me its name.',
  nearby: 'A few places worth a short walk after your meal.',
  contents: ({ dish, list, hidden }) => `${dish} is made with: ${list}.${hidden ? `\n\nSome ingredients aren't obvious from the name — ${hidden}` : ''}`,
  withIngredient: ({ what }) => `Dishes made with ${what}:`,
  without: (noun) => `no ${noun}`,
  withIngredientNone: 'None of them fit your current preferences, though.',
  catIntro: ({ cat, what }) => `I checked each of our ${cat.toLowerCase()} for ${what}:`,
  catYes: ({ dish, ingredient }) => `✗ ${dish} — contains ${mid(ingredient)}`,
  catNo: ({ dish }) => `✓ ${dish} — none`,
  allergenNoun: { gluten: 'gluten (wheat)', crustaceans: 'crustaceans (shrimp/crab)', eggs: 'egg', fish: 'fish', peanuts: 'peanuts', soy: 'soy', milk: 'milk', nuts: 'tree nuts', celery: 'celery', mustard: 'mustard', sesame: 'sesame', sulphites: 'sulphites', lupin: 'lupin', molluscs: 'molluscs (clams/squid)' },
  dietNoun: { 'no-pork': 'pork', 'no-beef': 'beef', halal: 'pork or alcohol', vegetarian: 'meat or seafood', vegan: 'animal products', 'no-alcohol': 'alcohol' },
  dietAdj: { 'no-pork': 'pork-free', 'no-beef': 'beef-free', halal: 'halal-friendly (no pork, no alcohol)', vegetarian: 'vegetarian', vegan: 'vegan', 'no-alcohol': 'alcohol-free' },
  follow: {
    first: "First time — what's good?",
    milder: 'Anything milder?',
    spicy: (dish) => `Is ${dish} very spicy?`,
    contains: (dish) => `What's in ${dish}?`,
    howto: (dish) => `How do I eat ${dish}?`,
    pairing: (dish) => `What goes well with ${dish}?`,
    popular: 'What do Japanese guests order?',
    drinks: 'Recommend a drink',
    dessert: 'What desserts do you have?',
    nearby: 'Where should I go after eating?',
    vegan: 'Do you have vegan dishes?',
    noPork: 'Anything without pork?',
    share: 'What should 3 of us share?',
    add: (dish) => `Add ${dish}`,
  },
}

const ja: AiCopy = {
  list: (items) => items.join('、'),
  quote: (dish) => `「${dish}」`,
  greet: ({ store, constraints }) =>
    `こんにちは！${store}専用のAIコンシェルジュです。このお店のメニュー、食材、シェフのメモをすべて把握しています。${constraints ? `「${constraints}」の条件も覚えておきますね。` : ''}何でも気軽に聞いてください。`,
  hello: 'こんにちは！今日はどんな気分ですか？辛さや苦手な食材があれば教えてください。',
  thanks: 'どういたしまして！またいつでも声をかけてください。ごゆっくりどうぞ。',
  fallback: 'うまく理解できなかったかもしれません。おすすめ、食材・アレルギー、辛さ、食べ方、お店の案内などをお手伝いできます。まずは今日人気のメニューをご紹介しますね。',
  recommendIntro: ({ constraints }) => (constraints ? `「${constraints}」の条件で選びました。` : 'このお店でぜひ味わっていただきたいメニューです。'),
  recommendOutro: '辛さ控えめのものや、合わせる飲み物もお探ししましょうか？',
  firstTime: '初めてなら、まずはお店の看板メニューがおすすめです。',
  reason: {
    signature: 'お店の看板メニュー',
    chef: 'シェフのおすすめ',
    best: (rank) => `注文数${rank}位`,
    country: (country, pct) => `${country}のお客様の${pct}%が注文`,
    fits: (constraints) => `${constraints}に対応`,
    mild: '辛くありません',
    hotMatch: '辛いもの好きにぴったり',
    vegan: '完全ヴィーガン',
    share: (n) => `${n}人でシェアにぴったり`,
    cheap: (price) => price,
    swap: (change) => `「${change}」でOK`,
    pairs: (dish) => `${dish}と好相性`,
  },
  filterAck: ({ what }) => `かしこまりました。「${what}」でメニュー全体を調整しました。`,
  filterResult: ({ n, total }) => `${total}品中${n}品を召し上がれます。`,
  filterAdjust: ({ dish, change }) => `${dish}も「${change}」を選べば召し上がれます。`,
  safetyYes: ({ dish, what, ingredient, note }) => `はい、${dish}には${what}が含まれます。${ingredient}が入っています。${note ?? ''}`,
  safetyNo: ({ dish, what }) => `いいえ、シェフの食材リストによると、${dish}に${what}は入っていません。`,
  safetyFix: ({ change }) => `「${change}」を選べば安心して召し上がれます。`,
  noSafe: 'ご登録の条件をすべて満たす代わりのメニューは見つかりませんでした。調理を変えられるか、スタッフにお尋ねください。',
  canYes: ({ dish, what }) => `大丈夫です。食材リストによると、${dish}に${what}は入っていません。`,
  canNo: ({ dish, what, ingredient, note }) => `このままでは難しいです。${dish}には${ingredient}が入っていて、${what}を含みます。${note ?? ''}`,
  alsoNote: ({ what, ingredient }) => `ただし、ご登録の条件のうち${what}に該当します（${ingredient}）。`,
  addCaution: ({ dish, what, ingredient }) => `ご注意：${dish}には${ingredient}が入っていて、${what}の条件に合いません。ご注文前に必ずご確認ください。`,
  safetyAlt: ({ alt }) => `代わりに${alt}はいかがですか？条件に合っています。`,
  halalNote: 'なお、当店はハラール認証店ではなく、同じ厨房で豚肉も扱っています。',
  info: ({ desc, chef }) => `${desc}\n\nシェフより：「${chef}」`,
  spice: ({ dish, label, level }) => `${dish}は韓国基準でレベル${level}、「${label}」です。`,
  spiceShy: (country) => `${country}のお客様には、少し辛く感じられることが多いです。`,
  spiceMilder: ({ change }) => `「${change}」を選ぶとぐっとマイルドになります。`,
  spiceNone: '唐辛子は使っていないので、まったく辛くありません。',
  lowSpiceIntro: '辛くない、またはマイルドなメニューを選びました。',
  hotIntro: '辛いもの好きなら、こちらのメニューです。',
  howto: ({ dish, text }) => `${dish}の召し上がり方です。${text}`,
  pairing: ({ dish, names }) => `${dish}には、${names}を合わせるお客様が多いです。`,
  popularBy: ({ country }) => `このお店の注文データでは、${country}のお客様にはこちらが一番人気です。`,
  budget: ({ price }) => `${price}以下で満足できるメニューです。`,
  share: ({ n }) => `${n}名様なら、お一人様一品に、真ん中でシェアする一品を加えるのがおすすめです。韓国はシェアして食べる文化なんです！`,
  drinks: 'ドリンクメニューです。マッコリは海鮮チヂミと相性抜群です。',
  drinksNoAlcohol: 'ノンアルコールのドリンクだけを選びました。',
  desserts: '食後に甘いものはいかがですか？',
  added: ({ names }) => `${names}を追加しました。右下の注文ボタンから確認できます。`,
  addWhich: 'どのメニューを追加しましょうか？料理名を教えてください。',
  nearby: '食後に歩いて行ける、おすすめのスポットです。',
  contents: ({ dish, list, hidden }) => `${dish}の食材：${list}。${hidden ? `\n\n名前からは分からない食材もあります — ${hidden}` : ''}`,
  withIngredient: ({ what }) => `${what}を使ったメニューです。`,
  without: (noun) => `${noun}なし`,
  withIngredientNone: 'ただ、今の条件で召し上がれるメニューはありません。',
  catIntro: ({ cat, what }) => `${cat}のメニューを「${what}」で一品ずつ確認しました。`,
  catYes: ({ dish, ingredient }) => `✗ ${dish} — ${ingredient}が入っています`,
  catNo: ({ dish }) => `✓ ${dish} — 入っていません`,
  allergenNoun: { gluten: '小麦（グルテン）', crustaceans: '甲殻類', eggs: '卵', fish: '魚', peanuts: '落花生', soy: '大豆', milk: '乳', nuts: 'ナッツ類', celery: 'セロリ', mustard: 'からし', sesame: 'ごま', sulphites: '亜硫酸塩', lupin: 'ルピナス', molluscs: '貝・軟体類' },
  dietNoun: { 'no-pork': '豚肉', 'no-beef': '牛肉', halal: '豚肉やアルコール', vegetarian: '肉や魚介', vegan: '動物性食材', 'no-alcohol': 'アルコール' },
  dietAdj: { 'no-pork': '豚肉なし', 'no-beef': '牛肉なし', halal: 'ハラール対応（豚肉・アルコールなし）', vegetarian: 'ベジタリアン', vegan: 'ヴィーガン', 'no-alcohol': 'アルコールなし' },
  follow: {
    first: '初めてです。おすすめは？',
    milder: 'もっと辛くないものは？',
    spicy: (dish) => `${dish}は辛いですか？`,
    contains: (dish) => `${dish}には何が入っていますか？`,
    howto: (dish) => `${dish}はどうやって食べますか？`,
    pairing: (dish) => `${dish}に合うものは？`,
    popular: '日本人に人気のメニューは？',
    drinks: 'おすすめの飲み物は？',
    dessert: 'デザートはありますか？',
    nearby: '食後に近くでおすすめの場所は？',
    vegan: 'ヴィーガンメニューはありますか？',
    noPork: '豚肉なしのメニューは？',
    share: '3人でシェアするなら？',
    add: (dish) => `${dish}を追加して`,
  },
}

const fr: AiCopy = {
  list: (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`),
  quote: (dish) => `« ${dish} »`,
  greet: ({ store, constraints }) =>
    `Bonjour ! Je suis le concierge IA de ${store}. Je connais chaque plat, chaque ingrédient et toutes les notes de la cheffe.${constraints ? ` Je garde vos préférences en tête : ${constraints}.` : ''} Posez-moi toutes vos questions.`,
  hello: 'Bonjour ! Qu’est-ce qui vous ferait plaisir ? Dites-moi si vous évitez le piment ou certains ingrédients.',
  thanks: 'Avec plaisir ! N’hésitez pas à revenir vers moi. Bon appétit !',
  fallback: 'Je ne suis pas sûr d’avoir bien compris. Je peux vous aider pour les suggestions, les ingrédients et allergènes, le piment, la façon de manger un plat ou les infos du restaurant. En attendant, voici les plats préférés de nos clients.',
  recommendIntro: ({ constraints }) => (constraints ? `Voici ma sélection pour vous — tout est ${constraints}.` : 'Voici les plats que je vous conseille vraiment ici.'),
  recommendOutro: 'Envie de quelque chose de plus doux, ou d’une boisson pour accompagner ?',
  firstTime: 'Première visite ? Commencez par les signatures de la maison.',
  reason: {
    signature: 'Signature de la maison',
    chef: 'Choix de la cheffe',
    best: (rank) => `N°${rank} des ventes`,
    country: (country, pct) => `${country} : ${pct} % des clients le commandent`,
    fits: (constraints) => `Compatible : ${constraints}`,
    mild: 'Pas épicé',
    hotMatch: 'Parfait si vous aimez le piment',
    vegan: '100 % végétal',
    share: (n) => `Idéal à partager à ${n}`,
    cheap: (price) => price,
    swap: (change) => `OK avec « ${change} »`,
    pairs: (dish) => `Accord parfait avec ${dish}`,
  },
  filterAck: ({ what }) => `C’est noté : ${what}. J’ai adapté toute la carte.`,
  filterResult: ({ n, total }) => `${n} plats sur ${total} vous conviennent.`,
  filterAdjust: ({ dish, change }) => `${dish} est aussi possible en choisissant « ${change} ».`,
  safetyYes: ({ dish, what, ingredient, note }) => `Oui — ${dish} : contient ${what}. Ingrédient concerné : ${mid(ingredient)}.${note ? ` ${note}` : ''}`,
  safetyNo: ({ dish, what }) => `Non — d’après la fiche ingrédients de la cheffe, ${dish} est sans ${what}.`,
  safetyFix: ({ change }) => `Choisissez « ${change} » et vous pourrez le déguster sans souci.`,
  noSafe: 'Je n’ai trouvé ni modification ni autre plat compatible avec tous vos critères — demandez à notre équipe si la cuisine peut l’adapter.',
  canYes: ({ dish, what }) => `Aucun souci — d’après la fiche ingrédients, ${dish} est sans ${what}.`,
  canNo: ({ dish, what, ingredient, note }) => `Pas tel quel — ${dish} : contient ${what}. Ingrédient concerné : ${mid(ingredient)}.${note ? ` ${note}` : ''}`,
  alsoNote: ({ what, ingredient }) => `Attention toutefois : ce plat contient ${what} (${mid(ingredient)}), que vous souhaitez éviter.`,
  addCaution: ({ dish, what, ingredient }) => `Attention : ${dish} contient ${what} (${mid(ingredient)}), ce qui ne correspond pas à vos critères. Vérifiez avant de commander.`,
  safetyAlt: ({ alt }) => `À la place, que diriez-vous de ${alt} ? Ce plat vous convient.`,
  halalNote: 'À noter : nous ne sommes pas certifiés halal et le porc est préparé dans la même cuisine.',
  info: ({ desc, chef }) => `${desc}\n\nLe mot de la cheffe : « ${chef} »`,
  spice: ({ dish, label, level }) => `${dish} : niveau ${level} sur l’échelle coréenne — « ${label} ».`,
  spiceShy: (country) => `Pour des clients (${country}), cela paraît souvent un peu plus fort que prévu.`,
  spiceMilder: ({ change }) => `Choisissez « ${change} » et le plat devient bien plus doux.`,
  spiceNone: 'Il n’y a aucun piment dedans.',
  lowSpiceIntro: 'Voici des plats peu ou pas épicés.',
  hotIntro: 'Si vous aimez le piment, ces plats sont pour vous.',
  howto: ({ dish, text }) => `Pour déguster ${dish} : ${text}`,
  pairing: ({ dish, names }) => `Avec ${dish}, nos clients ajoutent volontiers ${names}.`,
  popularBy: ({ country }) => `D’après les commandes de ce restaurant, voici les choix préférés des clients (${country}).`,
  budget: ({ price }) => `Des plats copieux pour ${price} ou moins.`,
  share: ({ n }) => `À ${n}, je conseille un plat par personne et un plat à partager au milieu — en Corée, on partage tout !`,
  drinks: 'Voici nos boissons. Le makgeolli est l’accord classique avec la galette aux fruits de mer.',
  drinksNoAlcohol: 'Voici nos boissons sans alcool.',
  desserts: 'Une petite douceur pour finir ?',
  added: ({ names }) => `J’ai ajouté ${names} à votre commande. Vous pouvez la vérifier avec le bouton Commander.`,
  addWhich: 'Quel plat dois-je ajouter ? Dites-moi simplement son nom.',
  nearby: 'Quelques lieux à deux pas, pour une balade après le repas.',
  contents: ({ dish, list, hidden }) => `${dish} est préparé avec : ${list}.${hidden ? `\n\nCertains ingrédients ne se devinent pas au nom du plat — ${hidden}` : ''}`,
  withIngredient: ({ what }) => `Plats préparés avec : ${what}.`,
  without: (noun) => `sans ${noun}`,
  withIngredientNone: 'Mais aucun ne correspond à vos critères actuels.',
  catIntro: ({ cat, what }) => `J’ai vérifié chaque plat de la catégorie « ${cat} » pour : ${what}.`,
  catYes: ({ dish, ingredient }) => `✗ ${dish} — contient ${mid(ingredient)}`,
  catNo: ({ dish }) => `✓ ${dish} — sans`,
  allergenNoun: { gluten: 'gluten (blé)', crustaceans: 'crustacés (crevette, crabe)', eggs: 'œuf', fish: 'poisson', peanuts: 'arachides', soy: 'soja', milk: 'lait', nuts: 'fruits à coque', celery: 'céleri', mustard: 'moutarde', sesame: 'sésame', sulphites: 'sulfites', lupin: 'lupin', molluscs: 'mollusques (palourdes, calmar)' },
  dietNoun: { 'no-pork': 'porc', 'no-beef': 'bœuf', halal: 'porc ni alcool', vegetarian: 'viande ni fruits de mer', vegan: 'produits animaux', 'no-alcohol': 'alcool' },
  dietAdj: { 'no-pork': 'sans porc', 'no-beef': 'sans bœuf', halal: 'compatible halal (sans porc ni alcool)', vegetarian: 'végétarien', vegan: 'végan', 'no-alcohol': 'sans alcool' },
  follow: {
    first: 'Première fois, que conseillez-vous ?',
    milder: 'Quelque chose de plus doux ?',
    spicy: (dish) => `${dish}, c’est très épicé ?`,
    contains: (dish) => `Qu’y a-t-il dans ${dish} ?`,
    howto: (dish) => `Comment manger ${dish} ?`,
    pairing: (dish) => `Qu’est-ce qui va bien avec ${dish} ?`,
    popular: 'Que commandent les Japonais ?',
    drinks: 'Une boisson à conseiller ?',
    dessert: 'Quels desserts avez-vous ?',
    nearby: 'Où aller après le repas ?',
    vegan: 'Avez-vous des plats végans ?',
    noPork: 'Des plats sans porc ?',
    share: 'Que partager à trois ?',
    add: (dish) => `Ajoute ${dish}`,
  },
}

export const AI_COPY: Record<OrderLang, AiCopy> = { ko, en, ja, fr }
