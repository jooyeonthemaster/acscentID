// SCENT! AI 조향사(ai-perfumer) 전용 화면 문구 — 5개 언어. 기존 키오스크 문구(i18n.ts)에 있는 것은 그쪽을 쓰고,
// 새 디자인(docs/design-mockups/scent-ai-perfumer-redesign-20261028)에만 있는 문구를 여기에 둔다.

import type { KioskLang } from './i18n'

export type PerfumerStepKey = 'info' | 'style' | 'personality' | 'charm' | 'capture'

export interface PerfumerText {
  brandSub: string
  homeAria: string
  langTitle: string
  langSub: string
  langDone: string
  attractLine: string
  attractSteps: [string, string, string]
  attractCta: string
  attractFoot: string
  stepNames: Record<PerfumerStepKey, string>
  infoDesc: string
  nameLabel: string
  optional: string
  cardGuest: string
  keyboardDone: string
  picked: (n: number, max: number) => string
  toPhoto: string
  camDesc: string
  camNote: string
  phoneUpload: string
  camPreparing: string
  camDeniedTitle: string
  camDeniedDesc: string
  camFailTitle: string
  camFailDesc: string
  camRetrying: string
  countdownTitle: string
  countdownDesc: string
  countdownBtn: string
  confirmReady: string
  retake: string
  otherPhoto: string
  qrTitle: string
  qrScan: string
  qrSteps: [string, string, string]
  qrNote: string
  qrFailTitle: string
  qrExpiredTitle: string
  qrExpiredDesc: string
  keptChoices: string
  analyzingTitle: (name: string) => string
  keptInput: string
  reportLabel: (name: string) => string
  tabs: [string, string, string]
  scentTitle: (name: string) => string
  match: string
  profileTitle: string
  myImage: string
  tenTraits: string
  scentFamily: string
  sixFamilies: string
  readingTitle: string
  bestSeason: string
  bestTime: string
  usageGuide: string
  aiReading: string
  myPicks: string
  viewProfile: string
  viewReading: string
  printRecipe: string
  receiptTitle: string
  preparing: string
  printingTitle: string
  printingSub: (ticket: string | null, name: string) => string
  printingWait: string
  printingBtn: string
  printingFoot: string
  doneTitle: string
  doneDesc: string
  fragrance: (ml: string) => string
  base: (ml: string) => string
  viewResult: string
  finish: string
  backToResult: string
  previewNote: string
  printFailTitle: string
  printFailDesc: string
  printRetry: string
  idleTitle: string
  idleDesc: string
  demo: string
  // ── 휴대폰 사진 올리기(키오스크 QR 로 들어온 화면) ──
  mConnected: string
  mDisconnected: string
  mTitle: string
  mDesc: string
  mTips: [string, string, string]
  mPrivacy: string
  mSendingTitle: string
  mSendingBtn: string
  mDoneTitle: string
  mDoneNote: string
  mFailTitle: string
  mFailDesc: string
  mPhotoErrorTitle: string
  mPhotoErrorDesc: string
}

const ko: PerfumerText = {
  brandSub: 'AI 조향사',
  homeAria: '처음 화면으로',
  langTitle: '언어를 선택해 주세요',
  langSub: 'Choose your language',
  langDone: '선택 완료',
  attractLine: '사진 한 장으로 만나는 나만의 향',
  attractSteps: ['취향 선택', '사진 촬영', '향 레시피'],
  attractCta: '나의 향 찾기',
  attractFoot: '퍼퓸 10ml 조향 체험',
  stepNames: { info: '나를 소개해요', style: '스타일', personality: '성격', charm: '매력', capture: '사진' },
  infoDesc: '향 레시피에 담길 이름을 알려주세요.',
  nameLabel: '이름 또는 별명',
  optional: '선택',
  cardGuest: 'Your name',
  keyboardDone: '입력 완료',
  picked: (n, max) => `${n} / ${max} 선택`,
  toPhoto: '사진 찍기',
  camDesc: '얼굴을 가이드 안에 맞춰주세요.',
  camNote: '사진은 향 분석에만 사용돼요.',
  phoneUpload: '휴대폰 사진 올리기',
  camPreparing: '카메라를 준비하고 있어요',
  camDeniedTitle: '카메라를 쓸 수 없어요',
  camDeniedDesc: '카메라 사용이 허용되지 않았어요. 직원에게 알려 주시거나 휴대폰 사진을 올려 주세요.',
  camFailTitle: '카메라에 연결하지 못했어요',
  camFailDesc: '연결을 다시 시도하고 있어요. 휴대폰 사진을 올려도 돼요.',
  camRetrying: '다시 연결하는 중',
  countdownTitle: '잠시만 그대로 계세요',
  countdownDesc: '곧 사진이 촬영됩니다.',
  countdownBtn: '촬영 준비 중',
  confirmReady: '사진이 준비됐어요.',
  retake: '다시 촬영',
  otherPhoto: '다른 사진',
  qrTitle: '휴대폰 사진을 올려주세요',
  qrScan: '휴대폰 카메라로 QR을 비춰주세요',
  qrSteps: ['QR 스캔', '사진 선택', '키오스크에서 확인'],
  qrNote: '전송된 사진은 향 분석에만 사용해요.',
  qrFailTitle: '사진을 받지 못했어요',
  qrExpiredTitle: 'QR 시간이 만료됐어요',
  qrExpiredDesc: '새 QR로 다시 연결해 주세요.',
  keptChoices: '선택한 취향은 그대로예요.',
  analyzingTitle: (name) => (name ? `${name}님의 향을\n찾고 있어요` : '당신의 향을\n찾고 있어요'),
  keptInput: '입력한 정보와 사진은 그대로예요.',
  reportLabel: (name) => (name ? `${name}님의 SCENT REPORT` : 'MY SCENT REPORT'),
  tabs: ['나의 향', '프로필', '해석'],
  scentTitle: (name) => (name ? `${name}님을 닮은 향` : '나를 닮은 향'),
  match: '매칭',
  profileTitle: '분위기를\n향으로 읽었어요',
  myImage: '나의 이미지',
  tenTraits: '10가지 특성',
  scentFamily: '향 계열',
  sixFamilies: '6가지 계열',
  readingTitle: 'AI가 읽은\n나의 분위기',
  bestSeason: '추천 계절',
  bestTime: '추천 시간',
  usageGuide: '사용 가이드',
  aiReading: 'AI 해석',
  myPicks: '내 선택',
  viewProfile: '프로필 보기',
  viewReading: '해석 보기',
  printRecipe: '레시피 출력',
  receiptTitle: '나의 향 레시피',
  preparing: '출력 준비 중',
  printingTitle: '레시피를\n출력하고 있어요',
  printingSub: (ticket, name) => [ticket ? `#${ticket}` : null, name ? `${name}님의 향 레시피` : '나의 향 레시피'].filter(Boolean).join(' · '),
  printingWait: '잠시만 기다려 주세요.',
  printingBtn: '인쇄 중',
  printingFoot: '출력구에서 영수증을 확인해 주세요.',
  doneTitle: '나만의 향,\n이제 만들어볼까요?',
  doneDesc: '영수증을 직원에게 보여주세요.',
  fragrance: (ml) => `향료 ${ml}ml`,
  base: (ml) => `베이스 ${ml}ml`,
  viewResult: '결과 다시 보기',
  finish: '체험 마치기',
  backToResult: '결과로 돌아가기',
  previewNote: '프린터가 연결되지 않은 화면이에요. 레시피를 이미지로 저장할 수 있어요.',
  printFailTitle: '영수증 출력이\n멈췄어요',
  printFailDesc: '다시 출력하거나 직원에게 알려주세요.',
  printRetry: '다시 출력하기',
  idleTitle: '계속 체험하시겠어요?',
  idleDesc: '잠시 후 처음 화면으로 돌아갑니다.',
  demo: '데모 결과',
  mConnected: '키오스크 연결됨',
  mDisconnected: '연결 확인 필요',
  mTitle: '사진을\n올려주세요',
  mDesc: '얼굴이 잘 나온 사진 한 장을 골라주세요.',
  mTips: ['정면 사진', '밝은 조명', '얼굴이 잘 보이게'],
  mPrivacy: '향 분석을 위한 사진이에요.',
  mSendingTitle: '키오스크로\n보내고 있어요',
  mSendingBtn: '사진 전송 중',
  mDoneTitle: '사진 전송\n완료!',
  mDoneNote: '다른 사진으로 바꾸려면 키오스크에서 QR을 다시 만들어 주세요.',
  mFailTitle: '사진을 보내지 못했어요',
  mFailDesc: '연결을 확인한 뒤 다시 보내 주세요. 고른 사진은 그대로예요.',
  mPhotoErrorTitle: '사진을 열지 못했어요',
  mPhotoErrorDesc: '다른 사진을 골라 주세요.',
}

const en: PerfumerText = {
  brandSub: 'AI Perfumer',
  homeAria: 'Back to start',
  langTitle: 'Choose your language',
  langSub: '언어를 선택해 주세요',
  langDone: 'Done',
  attractLine: 'Your own scent from a single photo',
  attractSteps: ['Your taste', 'Photo', 'Scent recipe'],
  attractCta: 'Find my scent',
  attractFoot: 'Perfume 10ml blending experience',
  stepNames: { info: 'About you', style: 'Style', personality: 'Personality', charm: 'Charm', capture: 'Photo' },
  infoDesc: 'Tell us the name to print on your scent recipe.',
  nameLabel: 'Name or nickname',
  optional: 'optional',
  cardGuest: 'Your name',
  keyboardDone: 'Done',
  picked: (n, max) => `${n} / ${max} selected`,
  toPhoto: 'Take a photo',
  camDesc: 'Fit your face inside the guide.',
  camNote: 'Your photo is used only for the scent analysis.',
  phoneUpload: 'Upload from my phone',
  camPreparing: 'Getting the camera ready',
  camDeniedTitle: 'The camera is not available',
  camDeniedDesc: 'Camera access is not allowed. Please tell our staff, or upload a photo from your phone.',
  camFailTitle: "We couldn't connect to the camera",
  camFailDesc: "We're trying again. You can also upload a photo from your phone.",
  camRetrying: 'Reconnecting',
  countdownTitle: 'Hold still for a moment',
  countdownDesc: 'Your photo will be taken shortly.',
  countdownBtn: 'Getting ready',
  confirmReady: 'Your photo is ready.',
  retake: 'Retake',
  otherPhoto: 'Another photo',
  qrTitle: 'Upload a photo from your phone',
  qrScan: 'Scan the QR code with your phone camera',
  qrSteps: ['Scan QR', 'Pick a photo', 'Check the kiosk'],
  qrNote: 'The photo you send is used only for the scent analysis.',
  qrFailTitle: "We didn't receive the photo",
  qrExpiredTitle: 'The QR code has expired',
  qrExpiredDesc: 'Please connect again with a new QR code.',
  keptChoices: 'Your choices are kept.',
  analyzingTitle: (name) => (name ? `Finding ${name}'s\nscent` : 'Finding\nyour scent'),
  keptInput: 'Your answers and photo are kept.',
  reportLabel: (name) => (name ? `${name}'s SCENT REPORT` : 'MY SCENT REPORT'),
  tabs: ['My scent', 'Profile', 'Reading'],
  scentTitle: (name) => (name ? `The scent that is ${name}` : 'The scent that is you'),
  match: 'Match',
  profileTitle: 'Your mood,\nread as scent',
  myImage: 'My image',
  tenTraits: '10 traits',
  scentFamily: 'Scent family',
  sixFamilies: '6 families',
  readingTitle: 'Your mood,\nas AI reads it',
  bestSeason: 'Best season',
  bestTime: 'Best time',
  usageGuide: 'How to wear it',
  aiReading: 'AI reading',
  myPicks: 'My picks',
  viewProfile: 'View profile',
  viewReading: 'View reading',
  printRecipe: 'Print recipe',
  receiptTitle: 'My scent recipe',
  preparing: 'Preparing',
  printingTitle: 'Printing\nyour recipe',
  printingSub: (ticket, name) => [ticket ? `#${ticket}` : null, name ? `${name}'s scent recipe` : 'My scent recipe'].filter(Boolean).join(' · '),
  printingWait: 'Please wait a moment.',
  printingBtn: 'Printing',
  printingFoot: 'Please take the receipt from the printer slot.',
  doneTitle: 'Your own scent —\nshall we make it?',
  doneDesc: 'Please show the receipt to our staff.',
  fragrance: (ml) => `Fragrance ${ml}ml`,
  base: (ml) => `Base ${ml}ml`,
  viewResult: 'View results again',
  finish: 'Finish',
  backToResult: 'Back to results',
  previewNote: 'No printer is connected here. You can save the recipe as an image.',
  printFailTitle: 'The receipt\nstopped printing',
  printFailDesc: 'Print again, or let our staff know.',
  printRetry: 'Print again',
  idleTitle: 'Still there?',
  idleDesc: 'We will return to the start screen soon.',
  demo: 'Demo result',
  mConnected: 'Kiosk connected',
  mDisconnected: 'Check connection',
  mTitle: 'Upload\na photo',
  mDesc: 'Pick one photo that shows your face clearly.',
  mTips: ['Facing front', 'Bright light', 'Face clearly visible'],
  mPrivacy: 'This photo is for the scent analysis.',
  mSendingTitle: 'Sending to\nthe kiosk',
  mSendingBtn: 'Sending photo',
  mDoneTitle: 'Photo\nsent!',
  mDoneNote: 'To use a different photo, make a new QR code on the kiosk.',
  mFailTitle: "We couldn't send the photo",
  mFailDesc: 'Check your connection and send it again. Your photo is still selected.',
  mPhotoErrorTitle: "We couldn't open the photo",
  mPhotoErrorDesc: 'Please pick another photo.',
}

const ja: PerfumerText = {
  brandSub: 'AI調香師',
  homeAria: '最初の画面へ',
  langTitle: '言語を選んでください',
  langSub: 'Choose your language',
  langDone: '決定',
  attractLine: '写真一枚で出会う、私だけの香り',
  attractSteps: ['好みを選ぶ', '写真撮影', '香りのレシピ'],
  attractCta: '私の香りを探す',
  attractFoot: 'パフューム10ml 調香体験',
  stepNames: { info: '自己紹介', style: 'スタイル', personality: '性格', charm: '魅力', capture: '写真' },
  infoDesc: '香りのレシピに載せる名前を教えてください。',
  nameLabel: '名前またはニックネーム',
  optional: '任意',
  cardGuest: 'Your name',
  keyboardDone: '入力完了',
  picked: (n, max) => `${n} / ${max} 選択`,
  toPhoto: '写真を撮る',
  camDesc: '顔をガイドの中に合わせてください。',
  camNote: '写真は香りの分析にのみ使われます。',
  phoneUpload: 'スマホの写真をアップロード',
  camPreparing: 'カメラを準備しています',
  camDeniedTitle: 'カメラを使えません',
  camDeniedDesc: 'カメラの使用が許可されていません。スタッフにお知らせいただくか、スマホの写真をアップロードしてください。',
  camFailTitle: 'カメラに接続できませんでした',
  camFailDesc: 'もう一度接続しています。スマホの写真をアップロードすることもできます。',
  camRetrying: '再接続中',
  countdownTitle: 'そのまま少しお待ちください',
  countdownDesc: 'まもなく撮影します。',
  countdownBtn: '撮影準備中',
  confirmReady: '写真の準備ができました。',
  retake: '撮り直す',
  otherPhoto: '別の写真',
  qrTitle: 'スマホの写真をアップロードしてください',
  qrScan: 'スマホのカメラでQRを読み取ってください',
  qrSteps: ['QRを読み取る', '写真を選ぶ', 'キオスクで確認'],
  qrNote: '送信された写真は香りの分析にのみ使います。',
  qrFailTitle: '写真を受け取れませんでした',
  qrExpiredTitle: 'QRの有効時間が切れました',
  qrExpiredDesc: '新しいQRでもう一度接続してください。',
  keptChoices: '選んだ好みはそのままです。',
  analyzingTitle: (name) => (name ? `${name}さんの香りを\n探しています` : 'あなたの香りを\n探しています'),
  keptInput: '入力した情報と写真はそのままです。',
  reportLabel: (name) => (name ? `${name}さんの SCENT REPORT` : 'MY SCENT REPORT'),
  tabs: ['私の香り', 'プロフィール', '解釈'],
  scentTitle: (name) => (name ? `${name}さんに似た香り` : 'あなたに似た香り'),
  match: 'マッチ',
  profileTitle: '雰囲気を\n香りで読みました',
  myImage: '私のイメージ',
  tenTraits: '10の特性',
  scentFamily: '香りの系統',
  sixFamilies: '6つの系統',
  readingTitle: 'AIが読んだ\n私の雰囲気',
  bestSeason: 'おすすめの季節',
  bestTime: 'おすすめの時間',
  usageGuide: '使い方ガイド',
  aiReading: 'AIの解釈',
  myPicks: '私の選択',
  viewProfile: 'プロフィールを見る',
  viewReading: '解釈を見る',
  printRecipe: 'レシピを印刷',
  receiptTitle: '私の香りのレシピ',
  preparing: '印刷準備中',
  printingTitle: 'レシピを\n印刷しています',
  printingSub: (ticket, name) => [ticket ? `#${ticket}` : null, name ? `${name}さんの香りのレシピ` : '私の香りのレシピ'].filter(Boolean).join(' · '),
  printingWait: '少々お待ちください。',
  printingBtn: '印刷中',
  printingFoot: '出力口でレシートをお受け取りください。',
  doneTitle: '私だけの香り、\nさっそく作ってみましょう',
  doneDesc: 'レシートをスタッフにお見せください。',
  fragrance: (ml) => `香料 ${ml}ml`,
  base: (ml) => `ベース ${ml}ml`,
  viewResult: '結果をもう一度見る',
  finish: '体験を終える',
  backToResult: '結果に戻る',
  previewNote: 'プリンターが接続されていない画面です。レシピを画像で保存できます。',
  printFailTitle: 'レシートの印刷が\n止まりました',
  printFailDesc: 'もう一度印刷するか、スタッフにお知らせください。',
  printRetry: 'もう一度印刷',
  idleTitle: '体験を続けますか？',
  idleDesc: 'まもなく最初の画面に戻ります。',
  demo: 'デモ結果',
  mConnected: 'キオスクに接続済み',
  mDisconnected: '接続を確認',
  mTitle: '写真を\nアップロード',
  mDesc: '顔がよく写った写真を一枚選んでください。',
  mTips: ['正面の写真', '明るい照明', '顔がよく見えるように'],
  mPrivacy: '香りの分析のための写真です。',
  mSendingTitle: 'キオスクへ\n送信しています',
  mSendingBtn: '写真を送信中',
  mDoneTitle: '写真の送信が\n完了しました',
  mDoneNote: '別の写真にする場合は、キオスクでQRを作り直してください。',
  mFailTitle: '写真を送信できませんでした',
  mFailDesc: '接続を確認して、もう一度送信してください。選んだ写真はそのままです。',
  mPhotoErrorTitle: '写真を開けませんでした',
  mPhotoErrorDesc: '別の写真を選んでください。',
}

const zhHans: PerfumerText = {
  brandSub: 'AI调香师',
  homeAria: '回到首页',
  langTitle: '请选择语言',
  langSub: 'Choose your language',
  langDone: '确定',
  attractLine: '一张照片，遇见专属于你的香气',
  attractSteps: ['选择喜好', '拍摄照片', '香气配方'],
  attractCta: '寻找我的香气',
  attractFoot: '10ml 香水调香体验',
  stepNames: { info: '自我介绍', style: '风格', personality: '性格', charm: '魅力', capture: '照片' },
  infoDesc: '请告诉我们要印在香气配方上的名字。',
  nameLabel: '名字或昵称',
  optional: '选填',
  cardGuest: 'Your name',
  keyboardDone: '输入完成',
  picked: (n, max) => `已选 ${n} / ${max}`,
  toPhoto: '拍照',
  camDesc: '请把脸对准引导框。',
  camNote: '照片只用于香气分析。',
  phoneUpload: '上传手机照片',
  camPreparing: '正在准备相机',
  camDeniedTitle: '无法使用相机',
  camDeniedDesc: '相机未获得使用许可。请告知工作人员，或上传手机照片。',
  camFailTitle: '无法连接相机',
  camFailDesc: '正在重新连接。也可以上传手机照片。',
  camRetrying: '正在重新连接',
  countdownTitle: '请保持不动',
  countdownDesc: '马上就要拍照了。',
  countdownBtn: '准备拍摄',
  confirmReady: '照片已准备好。',
  retake: '重拍',
  otherPhoto: '换一张',
  qrTitle: '请上传手机照片',
  qrScan: '请用手机相机扫描二维码',
  qrSteps: ['扫描二维码', '选择照片', '在设备上确认'],
  qrNote: '发送的照片只用于香气分析。',
  qrFailTitle: '没有收到照片',
  qrExpiredTitle: '二维码已过期',
  qrExpiredDesc: '请用新的二维码重新连接。',
  keptChoices: '已选的喜好会保留。',
  analyzingTitle: (name) => (name ? `正在寻找\n${name}的香气` : '正在寻找\n你的香气'),
  keptInput: '输入的信息和照片都会保留。',
  reportLabel: (name) => (name ? `${name}的 SCENT REPORT` : 'MY SCENT REPORT'),
  tabs: ['我的香气', '个人档案', '解读'],
  scentTitle: (name) => (name ? `像${name}的香气` : '像你的香气'),
  match: '匹配',
  profileTitle: '用香气\n读懂你的气质',
  myImage: '我的形象',
  tenTraits: '10项特质',
  scentFamily: '香调',
  sixFamilies: '6种香调',
  readingTitle: 'AI眼中的\n你的气质',
  bestSeason: '推荐季节',
  bestTime: '推荐时间',
  usageGuide: '使用指南',
  aiReading: 'AI解读',
  myPicks: '我的选择',
  viewProfile: '查看档案',
  viewReading: '查看解读',
  printRecipe: '打印配方',
  receiptTitle: '我的香气配方',
  preparing: '准备打印',
  printingTitle: '正在\n打印配方',
  printingSub: (ticket, name) => [ticket ? `#${ticket}` : null, name ? `${name}的香气配方` : '我的香气配方'].filter(Boolean).join(' · '),
  printingWait: '请稍候。',
  printingBtn: '打印中',
  printingFoot: '请在出纸口取走小票。',
  doneTitle: '专属的香气，\n现在来调配吧？',
  doneDesc: '请把小票出示给工作人员。',
  fragrance: (ml) => `香料 ${ml}ml`,
  base: (ml) => `基底 ${ml}ml`,
  viewResult: '再看一次结果',
  finish: '结束体验',
  backToResult: '返回结果',
  previewNote: '此画面未连接打印机，可以把配方保存为图片。',
  printFailTitle: '小票打印\n中断了',
  printFailDesc: '请重新打印，或告知工作人员。',
  printRetry: '重新打印',
  idleTitle: '还要继续体验吗？',
  idleDesc: '即将回到首页。',
  demo: '演示结果',
  mConnected: '已连接设备',
  mDisconnected: '请检查连接',
  mTitle: '请上传\n照片',
  mDesc: '请选择一张脸部清晰的照片。',
  mTips: ['正面照片', '光线明亮', '脸部清晰可见'],
  mPrivacy: '这是用于香气分析的照片。',
  mSendingTitle: '正在发送到\n设备',
  mSendingBtn: '照片发送中',
  mDoneTitle: '照片\n发送完成！',
  mDoneNote: '如需更换照片，请在设备上重新生成二维码。',
  mFailTitle: '照片发送失败',
  mFailDesc: '请检查网络后重新发送。已选的照片会保留。',
  mPhotoErrorTitle: '无法打开照片',
  mPhotoErrorDesc: '请选择其他照片。',
}

const zhHant: PerfumerText = {
  brandSub: 'AI調香師',
  homeAria: '回到首頁',
  langTitle: '請選擇語言',
  langSub: 'Choose your language',
  langDone: '確定',
  attractLine: '一張照片，遇見專屬於你的香氣',
  attractSteps: ['選擇喜好', '拍攝照片', '香氣配方'],
  attractCta: '尋找我的香氣',
  attractFoot: '10ml 香水調香體驗',
  stepNames: { info: '自我介紹', style: '風格', personality: '個性', charm: '魅力', capture: '照片' },
  infoDesc: '請告訴我們要印在香氣配方上的名字。',
  nameLabel: '名字或暱稱',
  optional: '選填',
  cardGuest: 'Your name',
  keyboardDone: '輸入完成',
  picked: (n, max) => `已選 ${n} / ${max}`,
  toPhoto: '拍照',
  camDesc: '請把臉對準引導框。',
  camNote: '照片只用於香氣分析。',
  phoneUpload: '上傳手機照片',
  camPreparing: '正在準備相機',
  camDeniedTitle: '無法使用相機',
  camDeniedDesc: '相機未獲得使用許可。請告知工作人員，或上傳手機照片。',
  camFailTitle: '無法連接相機',
  camFailDesc: '正在重新連接。也可以上傳手機照片。',
  camRetrying: '正在重新連接',
  countdownTitle: '請保持不動',
  countdownDesc: '馬上就要拍照了。',
  countdownBtn: '準備拍攝',
  confirmReady: '照片已準備好。',
  retake: '重拍',
  otherPhoto: '換一張',
  qrTitle: '請上傳手機照片',
  qrScan: '請用手機相機掃描 QR 碼',
  qrSteps: ['掃描 QR 碼', '選擇照片', '在裝置上確認'],
  qrNote: '傳送的照片只用於香氣分析。',
  qrFailTitle: '沒有收到照片',
  qrExpiredTitle: 'QR 碼已過期',
  qrExpiredDesc: '請用新的 QR 碼重新連接。',
  keptChoices: '已選的喜好會保留。',
  analyzingTitle: (name) => (name ? `正在尋找\n${name}的香氣` : '正在尋找\n你的香氣'),
  keptInput: '輸入的資訊和照片都會保留。',
  reportLabel: (name) => (name ? `${name}的 SCENT REPORT` : 'MY SCENT REPORT'),
  tabs: ['我的香氣', '個人檔案', '解讀'],
  scentTitle: (name) => (name ? `像${name}的香氣` : '像你的香氣'),
  match: '匹配',
  profileTitle: '用香氣\n讀懂你的氣質',
  myImage: '我的形象',
  tenTraits: '10項特質',
  scentFamily: '香調',
  sixFamilies: '6種香調',
  readingTitle: 'AI眼中的\n你的氣質',
  bestSeason: '推薦季節',
  bestTime: '推薦時間',
  usageGuide: '使用指南',
  aiReading: 'AI解讀',
  myPicks: '我的選擇',
  viewProfile: '查看檔案',
  viewReading: '查看解讀',
  printRecipe: '列印配方',
  receiptTitle: '我的香氣配方',
  preparing: '準備列印',
  printingTitle: '正在\n列印配方',
  printingSub: (ticket, name) => [ticket ? `#${ticket}` : null, name ? `${name}的香氣配方` : '我的香氣配方'].filter(Boolean).join(' · '),
  printingWait: '請稍候。',
  printingBtn: '列印中',
  printingFoot: '請在出紙口取走收據。',
  doneTitle: '專屬的香氣，\n現在來調配吧？',
  doneDesc: '請把收據出示給工作人員。',
  fragrance: (ml) => `香料 ${ml}ml`,
  base: (ml) => `基底 ${ml}ml`,
  viewResult: '再看一次結果',
  finish: '結束體驗',
  backToResult: '返回結果',
  previewNote: '此畫面未連接印表機，可以把配方儲存為圖片。',
  printFailTitle: '收據列印\n中斷了',
  printFailDesc: '請重新列印，或告知工作人員。',
  printRetry: '重新列印',
  idleTitle: '還要繼續體驗嗎？',
  idleDesc: '即將回到首頁。',
  demo: '示範結果',
  mConnected: '已連接裝置',
  mDisconnected: '請檢查連線',
  mTitle: '請上傳\n照片',
  mDesc: '請選擇一張臉部清晰的照片。',
  mTips: ['正面照片', '光線明亮', '臉部清晰可見'],
  mPrivacy: '這是用於香氣分析的照片。',
  mSendingTitle: '正在傳送到\n裝置',
  mSendingBtn: '照片傳送中',
  mDoneTitle: '照片\n傳送完成！',
  mDoneNote: '如需更換照片，請在裝置上重新產生 QR 碼。',
  mFailTitle: '照片傳送失敗',
  mFailDesc: '請檢查網路後重新傳送。已選的照片會保留。',
  mPhotoErrorTitle: '無法開啟照片',
  mPhotoErrorDesc: '請選擇其他照片。',
}

const TEXT: Record<KioskLang, PerfumerText> = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }

export function perfumerText(lang: KioskLang): PerfumerText {
  return TEXT[lang] ?? ko
}
