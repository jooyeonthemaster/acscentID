import type { KioskLang } from '@/lib/kiosk/i18n'
import type { HairStyle } from '@/lib/kiosk/hair-styles'

export type MakeupPart = 'lip' | 'blush' | 'eye'
/** 색조 셋 말고 더 고를 수 있는 것 — 아이라인 · 속눈썹 · 눈썹 · 얼굴형 · 헤어 */
export type MakeupExtra = 'liner' | 'lash' | 'brow' | 'shape' | 'hair'
export type MakeupTool = MakeupPart | MakeupExtra

export interface MakeupText {
  brand: string
  headline: string
  sub: string
  chips: [string, string]
  cta: string
  foot: string
  steps: [string, string, string]
  captureTitle: string
  captureDesc: string
  tips: [string, string]
  captureNote: string
  shoot: string
  finding: string
  noFace: [string, string]
  editTitle: string
  original: string
  applied: string
  editNote: string
  parts: Record<MakeupPart, string>
  /** 부위마다 색 다섯 개의 이름 */
  colors: Record<MakeupPart, [string, string, string, string, string]>
  /** 입술 색에 따른 룩 이름 */
  looks: [string, string, string, string, string]
  tools: Record<MakeupExtra, string>
  /** 아이라인 셋(브라운 · 블랙 · 눈꼬리를 뺀 윙) */
  liners: [string, string, string]
  brows: [string, string, string, string]
  hairs: [string, string, string, string, string, string]
  lashHint: string
  shapeHint: string
  hairFinding: string
  hairNone: string
  /** 머리 모양 바꾸기(AI) */
  hairAi: string
  hairAiTitle: string
  hairStyles: Record<HairStyle, string>
  /** {n} 자리에 남은 횟수 */
  hairAiNote: string
  hairAiLimit: string
  hairAiWorking: string
  hairAiFailed: [string, string]
  hairAiPrivacy: string
  hairBack: string
  extrasTitle: string
  level: string
  levelLow: string
  levelHigh: string
  toResult: string
  resultTitle: string
  resultNote: string
  paletteTitle: string
  keepFace: string
  colorNote: string
  again: string
  save: string
  saveTitle: string
  cardLabel: string
  home: string
}

const ko: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: '나에게 어울리는 오늘의 룩',
  sub: '립부터 아이라인 · 눈썹 · 헤어까지 미리 만나보세요.',
  chips: ['색은 자유롭게', '보정은 은은하게'],
  cta: '메이크업 시작하기',
  foot: '내 사진으로 미리 보는 색조 체험',
  steps: ['촬영', '메이크업', '저장'],
  captureTitle: '정면 사진을 촬영해 주세요.',
  captureDesc: '얼굴이 잘 보이도록 머리카락을 정리해 주세요.',
  tips: ['정면 보기', '밝은 곳에서'],
  captureNote: '사진 한 장으로 색조 · 보정 · 헤어까지.',
  shoot: '사진 촬영',
  finding: '얼굴을 찾고 있어요…',
  noFace: ['얼굴을 찾지 못했어요.', '정면을 보고 다시 촬영해 주세요.'],
  editTitle: '메이크업을 골라보세요.',
  original: '원본',
  applied: '적용',
  editNote: '가운데 선을 좌우로 밀어 비교해 보세요.',
  parts: { lip: '립', blush: '블러셔', eye: '아이' },
  colors: {
    lip: ['누드 코랄', '로즈 핑크', '로즈 코랄', '체리 레드', '플럼'],
    blush: ['피치', '코랄', '로즈', '핑크', '모브'],
    eye: ['샴페인', '로즈 브라운', '소프트 라벤더', '모브', '브라운'],
  },
  looks: ['데일리 누드', '러블리 핑크', '소프트 로즈', '체리 포인트', '딥 플럼'],
  tools: { liner: '아이라인', lash: '속눈썹', brow: '눈썹', shape: '얼굴형', hair: '헤어' },
  liners: ['브라운', '블랙', '윙 라인'],
  brows: ['소프트 브라운', '다크 브라운', '애쉬', '블랙'],
  hairs: ['내추럴 블랙', '초코 브라운', '애쉬 브라운', '오렌지 브라운', '로즈 핑크', '블론드'],
  lashHint: '속눈썹을 길고 풍성하게',
  shapeHint: '턱선은 갸름하게, 피부결은 매끈하게',
  hairFinding: '머리카락을 찾고 있어요…',
  hairNone: '머리카락을 찾지 못했어요.',
  hairAi: 'AI로 머리 모양 바꾸기',
  hairAiTitle: '어떤 머리 모양으로 바꿔 볼까요?',
  hairStyles: { bob: '단발', 'long-wave': '긴 웨이브', short: '숏컷', ponytail: '포니테일', bangs: '시스루 뱅', perm: '컬 펌' },
  hairAiNote: 'AI가 사진의 머리 모양만 바꿔요. {n}번 더 할 수 있어요.',
  hairAiLimit: '이 사진으로는 다 바꿔 봤어요.',
  hairAiWorking: '머리 모양을 바꾸고 있어요… 10초쯤 걸려요',
  hairAiFailed: ['머리 모양을 바꾸지 못했어요.', '잠시 후 다시 시도해 주세요.'],
  hairAiPrivacy: '사진은 바꾸는 데만 쓰고 저장하지 않아요.',
  hairBack: '원래 머리로',
  extrasTitle: '함께 적용',
  level: '농도',
  levelLow: '연하게',
  levelHigh: '진하게',
  toResult: '이 룩으로 선택',
  resultTitle: '오늘의 룩이 완성됐어요!',
  resultNote: '내 사진 위에 올려 본 미리보기예요.',
  paletteTitle: '이 룩의 컬러',
  keepFace: '내 사진으로 미리 본 오늘의 스타일이에요.',
  colorNote: '화면의 색은 실제 발색과 다를 수 있어요.',
  again: '다시 꾸미기',
  save: '룩 이미지 저장',
  saveTitle: '룩 이미지 받기',
  cardLabel: '오늘의 메이크업 룩',
  home: '홈',
}

const en: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: 'Today’s look that suits me',
  sub: 'Preview everything from lips to liner, brows and hair.',
  chips: ['Any color you like', 'A gentle touch-up'],
  cta: 'Start makeup',
  foot: 'Try colors on your own photo',
  steps: ['Photo', 'Makeup', 'Save'],
  captureTitle: 'Take a photo facing forward.',
  captureDesc: 'Tidy your hair so your face shows clearly.',
  tips: ['Face forward', 'In good light'],
  captureNote: 'Color, touch-up and hair — from one photo.',
  shoot: 'Take photo',
  finding: 'Finding your face…',
  noFace: ['We couldn’t find a face.', 'Please face forward and try again.'],
  editTitle: 'Choose your makeup.',
  original: 'Original',
  applied: 'Applied',
  editNote: 'Slide the center line to compare.',
  parts: { lip: 'Lip', blush: 'Blush', eye: 'Eye' },
  colors: {
    lip: ['Nude coral', 'Rose pink', 'Rose coral', 'Cherry red', 'Plum'],
    blush: ['Peach', 'Coral', 'Rose', 'Pink', 'Mauve'],
    eye: ['Champagne', 'Rose brown', 'Soft lavender', 'Mauve', 'Brown'],
  },
  looks: ['Daily nude', 'Lovely pink', 'Soft rose', 'Cherry point', 'Deep plum'],
  tools: { liner: 'Liner', lash: 'Lashes', brow: 'Brows', shape: 'Contour', hair: 'Hair' },
  liners: ['Brown', 'Black', 'Winged'],
  brows: ['Soft brown', 'Dark brown', 'Ash', 'Black'],
  hairs: ['Natural black', 'Chocolate brown', 'Ash brown', 'Copper brown', 'Rose pink', 'Blonde'],
  lashHint: 'Longer, fuller lashes',
  shapeHint: 'A slimmer jawline and smoother skin',
  hairFinding: 'Finding your hair…',
  hairNone: 'We couldn’t find your hair.',
  hairAi: 'Change hairstyle with AI',
  hairAiTitle: 'Which hairstyle shall we try?',
  hairStyles: { bob: 'Bob', 'long-wave': 'Long waves', short: 'Short cut', ponytail: 'Ponytail', bangs: 'Wispy bangs', perm: 'Curly perm' },
  hairAiNote: 'AI changes only the hair in your photo. {n} more to go.',
  hairAiLimit: 'That’s every change for this photo.',
  hairAiWorking: 'Changing your hairstyle… about 10 seconds',
  hairAiFailed: ['We couldn’t change the hairstyle.', 'Please try again in a moment.'],
  hairAiPrivacy: 'Your photo is used only for this change and is not stored.',
  hairBack: 'Back to my hair',
  extrasTitle: 'Also applied',
  level: 'Intensity',
  levelLow: 'Sheer',
  levelHigh: 'Bold',
  toResult: 'Choose this look',
  resultTitle: 'Your look for today is ready!',
  resultNote: 'A preview layered on your own photo.',
  paletteTitle: 'Colors in this look',
  keepFace: 'A preview of today’s style on your own photo.',
  colorNote: 'On-screen colors may differ from real products.',
  again: 'Edit again',
  save: 'Save look image',
  saveTitle: 'Get my look image',
  cardLabel: 'My makeup look',
  home: 'Home',
}

const ja: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: 'あなたに似合う今日のルック',
  sub: 'リップからアイライン · 眉 · ヘアまで先に試せます。',
  chips: ['色は自由に', '補正はほんのり'],
  cta: 'メイクを始める',
  foot: '自分の写真で先に見るカラーメイク体験',
  steps: ['撮影', 'メイク', '保存'],
  captureTitle: '正面の写真を撮影してください。',
  captureDesc: '顔がよく見えるように髪を整えてください。',
  tips: ['正面を向く', '明るい場所で'],
  captureNote: '写真1枚でカラー · 補正 · ヘアまで。',
  shoot: '撮影する',
  finding: '顔を探しています…',
  noFace: ['顔が見つかりませんでした。', '正面を向いてもう一度撮影してください。'],
  editTitle: 'メイクを選んでみましょう。',
  original: '元の写真',
  applied: 'メイク後',
  editNote: '中央の線を左右に動かして比べてみてください。',
  parts: { lip: 'リップ', blush: 'チーク', eye: 'アイ' },
  colors: {
    lip: ['ヌードコーラル', 'ローズピンク', 'ローズコーラル', 'チェリーレッド', 'プラム'],
    blush: ['ピーチ', 'コーラル', 'ローズ', 'ピンク', 'モーヴ'],
    eye: ['シャンパン', 'ローズブラウン', 'ソフトラベンダー', 'モーヴ', 'ブラウン'],
  },
  looks: ['デイリーヌード', 'ラブリーピンク', 'ソフトローズ', 'チェリーポイント', 'ディーププラム'],
  tools: { liner: 'アイライン', lash: 'まつ毛', brow: '眉', shape: '輪郭', hair: 'ヘア' },
  liners: ['ブラウン', 'ブラック', 'ウィングライン'],
  brows: ['ソフトブラウン', 'ダークブラウン', 'アッシュ', 'ブラック'],
  hairs: ['ナチュラルブラック', 'チョコブラウン', 'アッシュブラウン', 'オレンジブラウン', 'ローズピンク', 'ブロンド'],
  lashHint: 'まつ毛を長く、ふさふさに',
  shapeHint: 'フェイスラインはすっきり、肌はなめらかに',
  hairFinding: '髪を探しています…',
  hairNone: '髪が見つかりませんでした。',
  hairAi: 'AIで髪型を変える',
  hairAiTitle: 'どんな髪型に変えてみますか？',
  hairStyles: { bob: 'ボブ', 'long-wave': 'ロングウェーブ', short: 'ショート', ponytail: 'ポニーテール', bangs: 'シースルーバング', perm: 'カールパーマ' },
  hairAiNote: 'AIが写真の髪型だけを変えます。あと{n}回できます。',
  hairAiLimit: 'この写真の分はすべて試しました。',
  hairAiWorking: '髪型を変えています… 10秒ほどかかります',
  hairAiFailed: ['髪型を変えられませんでした。', '少し待ってからもう一度お試しください。'],
  hairAiPrivacy: '写真は髪型を変えるためだけに使い、保存しません。',
  hairBack: '元の髪に戻す',
  extrasTitle: 'あわせて適用',
  level: '濃さ',
  levelLow: '薄め',
  levelHigh: '濃いめ',
  toResult: 'このルックにする',
  resultTitle: '今日のルックが完成しました！',
  resultNote: '自分の写真に重ねてみたプレビューです。',
  paletteTitle: 'このルックのカラー',
  keepFace: 'あなたの写真で試した今日のスタイルです。',
  colorNote: '画面の色は実際の発色と異なる場合があります。',
  again: '選び直す',
  save: 'ルック画像を保存',
  saveTitle: 'ルック画像を受け取る',
  cardLabel: '今日のメイクルック',
  home: 'ホーム',
}

const zhHans: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: '适合你的今日妆容',
  sub: '从唇妆到眼线 · 眉毛 · 头发，抢先预览。',
  chips: ['颜色随心选', '修饰轻柔自然'],
  cta: '开始试妆',
  foot: '用自己的照片预览彩妆',
  steps: ['拍照', '试妆', '保存'],
  captureTitle: '请拍摄一张正面照片。',
  captureDesc: '请整理头发，让脸部清晰可见。',
  tips: ['正对镜头', '光线明亮处'],
  captureNote: '一张照片，彩妆 · 修饰 · 头发都能试。',
  shoot: '拍摄照片',
  finding: '正在寻找人脸…',
  noFace: ['没有找到人脸。', '请正对镜头重新拍摄。'],
  editTitle: '来挑选妆容吧。',
  original: '原图',
  applied: '上妆后',
  editNote: '左右拖动中间的线来比较。',
  parts: { lip: '唇妆', blush: '腮红', eye: '眼妆' },
  colors: {
    lip: ['裸珊瑚', '玫瑰粉', '玫瑰珊瑚', '樱桃红', '梅子色'],
    blush: ['蜜桃色', '珊瑚色', '玫瑰色', '粉色', '藕紫色'],
    eye: ['香槟色', '玫瑰棕', '柔和薰衣草', '藕紫色', '棕色'],
  },
  looks: ['日常裸妆', '甜美粉嫩', '柔和玫瑰', '樱桃点缀', '深邃梅子'],
  tools: { liner: '眼线', lash: '睫毛', brow: '眉毛', shape: '脸型', hair: '头发' },
  liners: ['棕色', '黑色', '上扬眼线'],
  brows: ['柔和棕', '深棕色', '雾灰色', '黑色'],
  hairs: ['自然黑', '巧克力棕', '灰棕色', '橘棕色', '玫瑰粉', '金色'],
  lashHint: '让睫毛更长更浓密',
  shapeHint: '下颌线条更纤细，肤质更光滑',
  hairFinding: '正在寻找头发…',
  hairNone: '没有找到头发。',
  hairAi: 'AI换发型',
  hairAiTitle: '想换成哪种发型？',
  hairStyles: { bob: '波波头', 'long-wave': '波浪长发', short: '超短发', ponytail: '马尾', bangs: '空气刘海', perm: '烫卷发' },
  hairAiNote: 'AI只会改变照片里的发型。还可以再试 {n} 次。',
  hairAiLimit: '这张照片的更换次数已用完。',
  hairAiWorking: '正在更换发型… 大约需要 10 秒',
  hairAiFailed: ['没能换好发型。', '请稍后再试。'],
  hairAiPrivacy: '照片仅用于更换发型，不会保存。',
  hairBack: '恢复原发型',
  extrasTitle: '同时应用',
  level: '浓淡',
  levelLow: '淡一点',
  levelHigh: '浓一点',
  toResult: '选择这个妆容',
  resultTitle: '今日妆容完成啦！',
  resultNote: '这是叠加在你照片上的预览。',
  paletteTitle: '这个妆容的用色',
  keepFace: '用你的照片预览的今日造型。',
  colorNote: '屏幕上的颜色可能与实际显色有所不同。',
  again: '重新试妆',
  save: '保存妆容图片',
  saveTitle: '领取妆容图片',
  cardLabel: '今日妆容',
  home: '首页',
}

const zhHant: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: '適合你的今日妝容',
  sub: '從唇妝到眼線 · 眉毛 · 頭髮，搶先預覽。',
  chips: ['顏色隨心選', '修飾輕柔自然'],
  cta: '開始試妝',
  foot: '用自己的照片預覽彩妝',
  steps: ['拍照', '試妝', '儲存'],
  captureTitle: '請拍攝一張正面照片。',
  captureDesc: '請整理頭髮，讓臉部清楚可見。',
  tips: ['正對鏡頭', '光線明亮處'],
  captureNote: '一張照片，彩妝 · 修飾 · 頭髮都能試。',
  shoot: '拍攝照片',
  finding: '正在尋找人臉…',
  noFace: ['沒有找到人臉。', '請正對鏡頭重新拍攝。'],
  editTitle: '來挑選妝容吧。',
  original: '原圖',
  applied: '上妝後',
  editNote: '左右拖曳中間的線來比較。',
  parts: { lip: '唇妝', blush: '腮紅', eye: '眼妝' },
  colors: {
    lip: ['裸珊瑚', '玫瑰粉', '玫瑰珊瑚', '櫻桃紅', '梅子色'],
    blush: ['蜜桃色', '珊瑚色', '玫瑰色', '粉色', '藕紫色'],
    eye: ['香檳色', '玫瑰棕', '柔和薰衣草', '藕紫色', '棕色'],
  },
  looks: ['日常裸妝', '甜美粉嫩', '柔和玫瑰', '櫻桃點綴', '深邃梅子'],
  tools: { liner: '眼線', lash: '睫毛', brow: '眉毛', shape: '臉型', hair: '頭髮' },
  liners: ['棕色', '黑色', '上揚眼線'],
  brows: ['柔和棕', '深棕色', '霧灰色', '黑色'],
  hairs: ['自然黑', '巧克力棕', '灰棕色', '橘棕色', '玫瑰粉', '金色'],
  lashHint: '讓睫毛更長更濃密',
  shapeHint: '下顎線條更纖細，膚質更光滑',
  hairFinding: '正在尋找頭髮…',
  hairNone: '沒有找到頭髮。',
  hairAi: 'AI換髮型',
  hairAiTitle: '想換成哪種髮型？',
  hairStyles: { bob: '鮑伯頭', 'long-wave': '波浪長髮', short: '超短髮', ponytail: '馬尾', bangs: '空氣瀏海', perm: '燙捲髮' },
  hairAiNote: 'AI只會改變照片裡的髮型。還可以再試 {n} 次。',
  hairAiLimit: '這張照片的更換次數已用完。',
  hairAiWorking: '正在更換髮型… 大約需要 10 秒',
  hairAiFailed: ['沒能換好髮型。', '請稍後再試。'],
  hairAiPrivacy: '照片僅用於更換髮型，不會儲存。',
  hairBack: '恢復原髮型',
  extrasTitle: '同時套用',
  level: '濃淡',
  levelLow: '淡一點',
  levelHigh: '濃一點',
  toResult: '選擇這個妝容',
  resultTitle: '今日妝容完成囉！',
  resultNote: '這是疊加在你照片上的預覽。',
  paletteTitle: '這個妝容的用色',
  keepFace: '用你的照片預覽的今日造型。',
  colorNote: '螢幕上的顏色可能與實際顯色有所不同。',
  again: '重新試妝',
  save: '儲存妝容圖片',
  saveTitle: '領取妝容圖片',
  cardLabel: '今日妝容',
  home: '首頁',
}

export const MAKEUP_TEXT: Partial<Record<KioskLang, MakeupText>> & { ko: MakeupText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }
