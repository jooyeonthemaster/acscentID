import type { KioskLang } from '@/lib/kiosk/i18n'
import type { SkinCare, SkinFeel, SkinStep, SkinTexture } from './routine'

export interface SkinText {
  brand: string
  headline: string
  sub: [string, string]
  cta: string
  foot: string
  steps: [string, string, string]
  checkTitle: string
  checkDesc: string
  feelTitle: string
  feels: Record<SkinFeel, string>
  /** 결과·칩에 쓰는 짧은 이름 */
  feelShort: Record<SkinFeel, string>
  careTitle: string
  cares: Record<SkinCare, string>
  checkNote: string
  toBuild: string
  checkFoot: string
  buildTitle: [string, string]
  am: string
  pm: string
  stepNames: Record<SkinStep, string>
  stepDesc: Record<SkinStep, string>
  textureAsk: string
  textures: Record<SkinTexture, string>
  textureShort: Record<SkinTexture, string>
  buildNote: string
  toResult: string
  resultTitle: string
  resultDesc: string
  focus: Record<'moisture' | 'balance' | 'keep', string>
  pace: { simple: string; full: string }
  mine: string
  mineNote: string
  /** 단계마다 한 줄 — 세안은 느낌에 따라, 보습은 사용감에 따라 */
  tipCleanse: Record<SkinFeel, string>
  tipMoisturize: Record<SkinTexture, string>
  tips: Record<'tone' | 'sunscreen' | 'soothe' | 'essence' | 'eye' | 'mask' | 'exfoliate', string>
  /** 루틴 직접 고치기 */
  edit: string
  editDone: string
  editHint: string
  addStep: string
  addTitle: string
  customStep: string
  customTitle: string
  customPlaceholder: string
  customTag: string
  tipCustom: string
  moveUp: string
  moveDown: string
  remove: string
  reset: string
  maxSteps: string
  mineEdited: string
  receiptSub: string
  toPhone: string
  toPhoneSub: string
  again: string
  save: string
  resultFoot: string
  cardLabel: string
}

const ko: SkinText = {
  brand: 'SKIN STUDIO',
  headline: '오늘의 피부 루틴을 찾아요',
  sub: ['내가 느끼는 피부 상태로', '가볍게 만드는 하루 습관'],
  cta: '내 루틴 찾기',
  foot: '자가 체크 기반 관리 가이드',
  steps: ['체크하기', '루틴 만들기', '저장하기'],
  checkTitle: '평소 피부는 어떤가요?',
  checkDesc: '내가 느끼는 상태를 골라 주세요.',
  feelTitle: '세안 후 느낌',
  feels: { tight: '당기는 편이에요', oily: '번들거리는 편이에요', both: '둘 다 느껴져요', calm: '편안한 편이에요' },
  feelShort: { tight: '세안 후 당김', oily: '세안 후 번들거림', both: '당김과 번들거림', calm: '편안한 피부' },
  careTitle: '관심 있는 관리',
  cares: { moisture: '보습', simple: '간단한 루틴', texture: '사용감' },
  checkNote: '선택한 답변으로 루틴을 정리해 드려요.',
  toBuild: '루틴 만들기',
  checkFoot: '나만의 건강한 피부 습관',
  buildTitle: ['나에게 맞게', '루틴을 정리해요'],
  am: '아침',
  pm: '저녁',
  stepNames: { cleanse: '세안', tone: '정돈', moisturize: '보습', sunscreen: '자외선 차단', soothe: '여유 있는 날 한 단계', essence: '에센스·세럼', eye: '아이크림', mask: '마스크팩', exfoliate: '각질 케어' },
  stepDesc: { cleanse: '나에게 편안한 세안', tone: '세안 뒤 피부결 정돈', moisturize: '사용감을 골라 주세요', sunscreen: '외출 전 챙기는 단계', soothe: '주 1~2회, 편안한 저녁에', essence: '고민에 맞는 한 가지를 얇게', eye: '눈가에 소량을 톡톡', mask: '주 1~2회, 10~15분', exfoliate: '주 1회, 자극 없이 부드럽게' },
  textureAsk: '사용감을 골라 주세요',
  textures: { light: '가볍게', rich: '촉촉하게' },
  textureShort: { light: '가벼운 사용감', rich: '촉촉한 사용감' },
  buildNote: '내가 선택한 루틴으로 저장돼요.',
  toResult: '루틴 완성하기',
  resultTitle: '나의 데일리 루틴',
  resultDesc: '내가 입력한 상태로 정리한 관리 가이드',
  focus: { moisture: '보습 중심', balance: '산뜻한 균형', keep: '지금처럼 편안하게' },
  pace: { simple: '간단하게', full: '차근차근' },
  mine: '내 선택',
  mineNote: '이런 상태와 선호에 맞춰 루틴을 구성했어요.',
  tipCleanse: {
    tight: '미지근한 물로 짧게, 문지르지 않고 헹궈요.',
    oily: '아침은 가볍게, 저녁은 꼼꼼하게 씻어요.',
    both: '번들거리는 부위만 한 번 더 살살 씻어요.',
    calm: '지금처럼 자극 없이 부드럽게 씻어요.',
  },
  tipMoisturize: { light: '가벼운 제형을 얇게 한 번 펴 발라요.', rich: '촉촉한 제형을 넉넉히, 당기는 곳은 한 번 더 발라요.' },
  tips: { tone: '세안 뒤 물기가 마르기 전에 가볍게 정돈해요.', sunscreen: '외출 15분 전, 얼굴 전체에 고르게 발라요.', soothe: '시간이 넉넉한 저녁에 수분을 한 번 더 채워요.', essence: '정돈 뒤, 보습 전에 얇게 펴 발라요.', eye: '약지로 눈가를 따라 가볍게 두드려요.', mask: '시간을 지켜 떼어 내고, 남은 에센스는 두드려 흡수시켜요.', exfoliate: '문지르지 말고 부드럽게, 한 뒤에는 보습을 넉넉히 해요.' },
  toPhone: '휴대폰으로 가져가기',
  toPhoneSub: '루틴 카드 저장',
  again: '다시 고르기',
  save: '루틴 저장하기',
  resultFoot: '자가 체크 기반 가이드 · 진단 결과가 아닙니다',
  edit: '루틴 직접 고치기',
  editDone: '고치기 완료',
  editHint: '순서를 바꾸거나, 빼고 더할 수 있어요.',
  addStep: '단계 추가',
  addTitle: '어떤 단계를 더할까요?',
  customStep: '직접 입력',
  customTitle: '내가 쓰는 단계를 적어 주세요',
  customPlaceholder: '예) 앰플, 수면팩',
  customTag: '내 단계',
  tipCustom: '내가 더한 단계예요. 평소 쓰던 대로 이 순서에 써 주세요.',
  moveUp: '위로',
  moveDown: '아래로',
  remove: '빼기',
  reset: '추천 루틴으로',
  maxSteps: '한 번에 7단계까지 담을 수 있어요.',
  mineEdited: '직접 고친 루틴',
  receiptSub: '루틴 영수증',
  cardLabel: '나의 데일리 루틴 카드',
}

const en: SkinText = {
  brand: 'SKIN STUDIO',
  headline: 'Find today’s skin routine',
  sub: ['A simple daily habit built', 'from how your skin feels'],
  cta: 'Find my routine',
  foot: 'A care guide based on your own check',
  steps: ['Check', 'Build', 'Save'],
  checkTitle: 'How does your skin usually feel?',
  checkDesc: 'Pick what feels closest to you.',
  feelTitle: 'After washing your face',
  feels: { tight: 'It feels tight', oily: 'It gets shiny', both: 'A bit of both', calm: 'It feels comfortable' },
  feelShort: { tight: 'Tight after washing', oily: 'Shiny after washing', both: 'Tight and shiny', calm: 'Comfortable skin' },
  careTitle: 'What you care about',
  cares: { moisture: 'Moisture', simple: 'A simple routine', texture: 'Texture' },
  checkNote: 'We’ll arrange a routine from your answers.',
  toBuild: 'Build my routine',
  checkFoot: 'My own healthy skin habit',
  buildTitle: ['Arrange the routine', 'to suit you'],
  am: 'Morning',
  pm: 'Evening',
  stepNames: { cleanse: 'Cleanse', tone: 'Prep', moisturize: 'Moisturize', sunscreen: 'Sunscreen', soothe: 'An extra step on easy days', essence: 'Essence / serum', eye: 'Eye cream', mask: 'Sheet mask', exfoliate: 'Exfoliate' },
  stepDesc: { cleanse: 'A cleanse that feels comfortable', tone: 'Smooth the skin after cleansing', moisturize: 'Choose the texture you like', sunscreen: 'The step before going out', soothe: 'Once or twice a week, on a calm evening', essence: 'One product, a thin layer', eye: 'A little, patted around the eyes', mask: 'Once or twice a week, 10–15 min', exfoliate: 'Once a week, gently' },
  textureAsk: 'Choose the texture you like',
  textures: { light: 'Light', rich: 'Rich' },
  textureShort: { light: 'Light texture', rich: 'Rich texture' },
  buildNote: 'Your routine is saved the way you choose.',
  toResult: 'Finish my routine',
  resultTitle: 'My daily routine',
  resultDesc: 'A care guide arranged from what you told us',
  focus: { moisture: 'Moisture first', balance: 'Fresh balance', keep: 'Keep it comfortable' },
  pace: { simple: 'Simple', full: 'Step by step' },
  mine: 'My choices',
  mineNote: 'The routine follows these answers and preferences.',
  tipCleanse: {
    tight: 'Use lukewarm water, keep it short and rinse without rubbing.',
    oily: 'Light in the morning, thorough in the evening.',
    both: 'Go over the shiny areas gently one more time.',
    calm: 'Keep cleansing gently, just as you do now.',
  },
  tipMoisturize: { light: 'Spread a thin layer of a light texture.', rich: 'Use a rich texture generously, and add more where it feels tight.' },
  tips: { tone: 'Prep lightly before your skin dries after cleansing.', sunscreen: 'Apply evenly over the whole face 15 minutes before going out.', soothe: 'On an unhurried evening, add one more layer of moisture.', essence: 'Apply a thin layer after prep, before moisturizer.', eye: 'Tap lightly along the eye area with your ring finger.', mask: 'Remove it on time and pat in what is left.', exfoliate: 'No scrubbing — be gentle, then moisturize generously.' },
  toPhone: 'Take it on my phone',
  toPhoneSub: 'Save the routine card',
  again: 'Choose again',
  save: 'Save my routine',
  resultFoot: 'A self-check guide · not a diagnosis',
  edit: 'Edit my routine',
  editDone: 'Done editing',
  editHint: 'Reorder, remove or add steps.',
  addStep: 'Add a step',
  addTitle: 'Which step shall we add?',
  customStep: 'Type my own',
  customTitle: 'Name your own step',
  customPlaceholder: 'e.g. ampoule, sleeping mask',
  customTag: 'My step',
  tipCustom: 'A step you added. Use it at this point, the way you usually do.',
  moveUp: 'Move up',
  moveDown: 'Move down',
  remove: 'Remove',
  reset: 'Back to suggested',
  maxSteps: 'Up to 7 steps at a time.',
  mineEdited: 'Edited by me',
  receiptSub: 'Routine receipt',
  cardLabel: 'My daily routine card',
}

const ja: SkinText = {
  brand: 'SKIN STUDIO',
  headline: '今日の肌ルーティンを見つけます',
  sub: ['自分で感じる肌の状態から', '気軽につくる毎日の習慣'],
  cta: 'ルーティンを見つける',
  foot: 'セルフチェックにもとづくケアガイド',
  steps: ['チェック', 'ルーティン作成', '保存'],
  checkTitle: 'ふだんの肌はどうですか？',
  checkDesc: '自分で感じる状態を選んでください。',
  feelTitle: '洗顔後の感じ',
  feels: { tight: 'つっぱりやすいです', oily: 'テカりやすいです', both: 'どちらも感じます', calm: '落ち着いています' },
  feelShort: { tight: '洗顔後のつっぱり', oily: '洗顔後のテカリ', both: 'つっぱりとテカリ', calm: '落ち着いた肌' },
  careTitle: '気になるケア',
  cares: { moisture: '保湿', simple: 'シンプルケア', texture: '使用感' },
  checkNote: '選んだ回答からルーティンをまとめます。',
  toBuild: 'ルーティンをつくる',
  checkFoot: '自分らしいすこやかな肌習慣',
  buildTitle: ['自分に合わせて', 'ルーティンを整えます'],
  am: '朝',
  pm: '夜',
  stepNames: { cleanse: '洗顔', tone: '整える', moisturize: '保湿', sunscreen: '日焼け止め', soothe: 'ゆとりのある日のひと手間', essence: '美容液', eye: 'アイクリーム', mask: 'シートマスク', exfoliate: '角質ケア' },
  stepDesc: { cleanse: '自分に心地よい洗顔', tone: '洗顔後に肌のキメを整える', moisturize: '使用感を選んでください', sunscreen: 'お出かけ前のステップ', soothe: '週1〜2回、ゆったりした夜に', essence: '気になるところにひとつだけ薄く', eye: '目もとに少量をやさしく', mask: '週1〜2回、10〜15分', exfoliate: '週1回、やさしく' },
  textureAsk: '使用感を選んでください',
  textures: { light: 'さっぱり', rich: 'しっとり' },
  textureShort: { light: 'さっぱりした使用感', rich: 'しっとりした使用感' },
  buildNote: '選んだルーティンのまま保存されます。',
  toResult: 'ルーティンを完成',
  resultTitle: 'マイデイリールーティン',
  resultDesc: '入力した状態をもとにまとめたケアガイド',
  focus: { moisture: '保湿中心', balance: 'さっぱりバランス', keep: '今のまま心地よく' },
  pace: { simple: 'シンプルに', full: 'じっくり' },
  mine: 'あなたの選択',
  mineNote: 'この状態と好みに合わせてルーティンを組みました。',
  tipCleanse: {
    tight: 'ぬるま湯で手短に、こすらずすすぎます。',
    oily: '朝は軽く、夜はていねいに洗います。',
    both: 'テカる部分だけ、もう一度やさしく洗います。',
    calm: '今のまま、刺激を与えずやさしく洗います。',
  },
  tipMoisturize: { light: 'さっぱりタイプを薄く一度のばします。', rich: 'しっとりタイプをたっぷり、つっぱる所は重ねづけします。' },
  tips: { tone: '洗顔後、水気が乾く前に軽く整えます。', sunscreen: 'お出かけ15分前、顔全体にむらなく塗ります。', soothe: 'ゆとりのある夜は、うるおいをもう一度補います。', essence: '整えたあと、保湿の前に薄くのばします。', eye: '薬指で目もとを軽くたたくようになじませます。', mask: '時間を守ってはがし、残った美容液はなじませます。', exfoliate: 'こすらずやさしく。終わったらしっかり保湿します。' },
  toPhone: 'スマホで持ち帰る',
  toPhoneSub: 'ルーティンカードを保存',
  again: '選び直す',
  save: 'ルーティンを保存',
  resultFoot: 'セルフチェックにもとづくガイド · 診断結果ではありません',
  edit: 'ルーティンを編集',
  editDone: '編集完了',
  editHint: '順番の入れ替え、削除・追加ができます。',
  addStep: 'ステップを追加',
  addTitle: 'どのステップを追加しますか？',
  customStep: '自分で入力',
  customTitle: 'お使いのステップを入力してください',
  customPlaceholder: '例）アンプル、ナイトパック',
  customTag: 'マイステップ',
  tipCustom: '自分で追加したステップです。いつもどおり、この順番で使ってください。',
  moveUp: '上へ',
  moveDown: '下へ',
  remove: '外す',
  reset: 'おすすめに戻す',
  maxSteps: '一度に7ステップまで入れられます。',
  mineEdited: '自分で編集',
  receiptSub: 'ルーティンレシート',
  cardLabel: 'マイデイリールーティンカード',
}

const zhHans: SkinText = {
  brand: 'SKIN STUDIO',
  headline: '找到今天的护肤流程',
  sub: ['根据自己感受到的皮肤状态', '轻松养成每日习惯'],
  cta: '找到你的护肤流程',
  foot: '基于自身感受的护理指南',
  steps: ['勾选状态', '定制流程', '保存'],
  checkTitle: '平时皮肤感觉如何？',
  checkDesc: '请选择你自己感受到的状态。',
  feelTitle: '洁面后的感觉',
  feels: { tight: '比较紧绷', oily: '容易泛油光', both: '两种都有', calm: '比较舒适' },
  feelShort: { tight: '洁面后紧绷', oily: '洁面后泛油光', both: '紧绷又泛油光', calm: '舒适的皮肤' },
  careTitle: '关注的护理',
  cares: { moisture: '保湿', simple: '简单流程', texture: '使用感' },
  checkNote: '将根据你的选择整理护肤流程。',
  toBuild: '定制流程',
  checkFoot: '属于你的健康护肤习惯',
  buildTitle: ['按适合你的方式', '整理护肤流程'],
  am: '早上',
  pm: '晚上',
  stepNames: { cleanse: '洁面', tone: '爽肤', moisturize: '保湿', sunscreen: '防晒', soothe: '有空的日子多一步', essence: '精华', eye: '眼霜', mask: '面膜', exfoliate: '去角质' },
  stepDesc: { cleanse: '让自己舒适的洁面', tone: '洁面后整理肌理', moisturize: '请选择使用感', sunscreen: '出门前别忘的一步', soothe: '每周1~2次，在放松的晚上', essence: '选一款，薄薄一层', eye: '少量轻拍在眼周', mask: '每周1~2次，10~15分钟', exfoliate: '每周1次，轻柔进行' },
  textureAsk: '请选择使用感',
  textures: { light: '清爽', rich: '滋润' },
  textureShort: { light: '清爽的使用感', rich: '滋润的使用感' },
  buildNote: '将按你选择的流程保存。',
  toResult: '完成流程',
  resultTitle: '你的日常护肤流程',
  resultDesc: '根据你选择的状态整理的护理指南',
  focus: { moisture: '保湿为主', balance: '清爽平衡', keep: '保持现在的舒适' },
  pace: { simple: '简单', full: '循序渐进' },
  mine: '你的选择',
  mineNote: '已根据这些状态和偏好安排流程。',
  tipCleanse: {
    tight: '用温水短时间清洗，冲洗时不要揉搓。',
    oily: '早上轻轻洗，晚上仔细洗。',
    both: '只在泛油光的部位再轻轻洗一遍。',
    calm: '像现在这样，温和无刺激地清洗。',
  },
  tipMoisturize: { light: '取清爽质地，薄薄涂一层。', rich: '滋润质地多取一些，紧绷处再涂一遍。' },
  tips: { tone: '洁面后趁水分未干，轻轻整理肌理。', sunscreen: '出门前15分钟，均匀涂抹全脸。', soothe: '在时间充裕的晚上，再补一次水分。', essence: '整理肌理后、保湿前，薄薄涂开。', eye: '用无名指沿眼周轻轻点拍。', mask: '按时取下，把剩余精华轻拍吸收。', exfoliate: '不要用力搓，之后充分保湿。' },
  toPhone: '用手机带走',
  toPhoneSub: '保存流程卡片',
  again: '重新选择',
  save: '保存流程',
  resultFoot: '基于自身感受的指南 · 并非诊断结果',
  edit: '自己修改流程',
  editDone: '修改完成',
  editHint: '可以调整顺序，也可以增减步骤。',
  addStep: '添加步骤',
  addTitle: '想添加哪个步骤？',
  customStep: '自己输入',
  customTitle: '请写下你在用的步骤',
  customPlaceholder: '例：安瓶、睡眠面膜',
  customTag: '我的步骤',
  tipCustom: '这是你自己添加的步骤。请照平时的习惯，在这一步使用。',
  moveUp: '上移',
  moveDown: '下移',
  remove: '移除',
  reset: '恢复推荐流程',
  maxSteps: '一次最多可放入7个步骤。',
  mineEdited: '自己修改的流程',
  receiptSub: '流程小票',
  cardLabel: '你的日常护肤流程卡',
}

const zhHant: SkinText = {
  brand: 'SKIN STUDIO',
  headline: '找到今天的保養流程',
  sub: ['根據自己感受到的肌膚狀態', '輕鬆養成每日習慣'],
  cta: '找到你的保養流程',
  foot: '依自身感受整理的保養指南',
  steps: ['勾選狀態', '打造流程', '儲存'],
  checkTitle: '平常肌膚感覺如何？',
  checkDesc: '請選擇你自己感受到的狀態。',
  feelTitle: '洗臉後的感覺',
  feels: { tight: '比較緊繃', oily: '容易泛油光', both: '兩種都有', calm: '比較舒適' },
  feelShort: { tight: '洗臉後緊繃', oily: '洗臉後泛油光', both: '緊繃又泛油光', calm: '舒適的肌膚' },
  careTitle: '關注的保養',
  cares: { moisture: '保濕', simple: '簡單流程', texture: '使用感' },
  checkNote: '將依你的選擇整理保養流程。',
  toBuild: '打造流程',
  checkFoot: '專屬於你的健康保養習慣',
  buildTitle: ['依適合你的方式', '整理保養流程'],
  am: '早上',
  pm: '晚上',
  stepNames: { cleanse: '洗臉', tone: '調理', moisturize: '保濕', sunscreen: '防曬', soothe: '有空的日子多一步', essence: '精華', eye: '眼霜', mask: '面膜', exfoliate: '去角質' },
  stepDesc: { cleanse: '讓自己舒服的洗臉', tone: '洗臉後整理肌膚紋理', moisturize: '請選擇使用感', sunscreen: '出門前別忘的一步', soothe: '每週1~2次，在放鬆的晚上', essence: '選一款，薄薄一層', eye: '少量輕拍在眼周', mask: '每週1~2次，10~15分鐘', exfoliate: '每週1次，輕柔進行' },
  textureAsk: '請選擇使用感',
  textures: { light: '清爽', rich: '滋潤' },
  textureShort: { light: '清爽的使用感', rich: '滋潤的使用感' },
  buildNote: '將依你選擇的流程儲存。',
  toResult: '完成流程',
  resultTitle: '你的日常保養流程',
  resultDesc: '依你選擇的狀態整理的保養指南',
  focus: { moisture: '保濕為主', balance: '清爽平衡', keep: '維持現在的舒適' },
  pace: { simple: '簡單', full: '循序漸進' },
  mine: '你的選擇',
  mineNote: '已依這些狀態和偏好安排流程。',
  tipCleanse: {
    tight: '用溫水短時間清洗，沖洗時不要搓揉。',
    oily: '早上輕輕洗，晚上仔細洗。',
    both: '只在泛油光的部位再輕輕洗一次。',
    calm: '像現在這樣，溫和不刺激地清洗。',
  },
  tipMoisturize: { light: '取清爽質地，薄薄擦一層。', rich: '滋潤質地多取一些，緊繃處再擦一次。' },
  tips: { tone: '洗臉後趁水分未乾，輕輕調理肌膚。', sunscreen: '出門前15分鐘，均勻塗抹全臉。', soothe: '在時間充裕的晚上，再補一次水分。', essence: '調理後、保濕前，薄薄塗開。', eye: '用無名指沿眼周輕輕點拍。', mask: '按時取下，把剩餘精華輕拍吸收。', exfoliate: '不要用力搓，之後充分保濕。' },
  toPhone: '用手機帶走',
  toPhoneSub: '儲存流程卡',
  again: '重新選擇',
  save: '儲存流程',
  resultFoot: '依自身感受整理的指南 · 並非診斷結果',
  edit: '自己修改流程',
  editDone: '修改完成',
  editHint: '可以調整順序，也可以增減步驟。',
  addStep: '新增步驟',
  addTitle: '想新增哪個步驟？',
  customStep: '自行輸入',
  customTitle: '請寫下你在用的步驟',
  customPlaceholder: '例：安瓶、晚安面膜',
  customTag: '我的步驟',
  tipCustom: '這是你自己新增的步驟。請照平常的習慣，在這一步使用。',
  moveUp: '上移',
  moveDown: '下移',
  remove: '移除',
  reset: '恢復推薦流程',
  maxSteps: '一次最多可放入7個步驟。',
  mineEdited: '自己修改的流程',
  receiptSub: '流程收據',
  cardLabel: '你的日常保養流程卡',
}

export const SKIN_TEXT: Partial<Record<KioskLang, SkinText>> & { ko: SkinText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }
