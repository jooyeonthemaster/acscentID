// 퍼스널 컬러 · 타로 전용 화면(목업 C01–C19 · T01–T20 · M01–M04) 문구 — 5개 언어.
// program-i18n.ts(흐름·결과 문구)에 더해 화면 구성용 문구만 둔다. ProgramUiText 를 다섯 언어가 모두 채워야 빌드된다.
// 이름이 들어가는 문장은 함수 — 이름을 비우면(선택 입력) 이름 없이 자연스러운 문장으로 바뀐다.

import type { KioskLang } from './i18n'

export interface ProgramUiText {
  stepper: { info: string; photo: string }
  color: {
    infoDesc: string
    nameLabel: string
    genderLabel: string
    typingTitle: string
    typingDesc: string
    intro: string
    captureDesc: string
    tips: [string, string, string]
    useQr: string
    qrTitle: string
    qrDesc: string
    qrCaption: string
    qrSteps: [string, string, string]
    qrPrivacy: string
    qrBack: string
    useCamera: string
    regenQr: string
    qrCreating: string
    qrFailed: string
    qrExpired: string
    confirmDesc: string
    confirmCheck: string
    retake: string
    start: string
    camOff: string
    camChecking: string
    useFile: string
    noFace: [string, string]
    analyzingTitle: (name: string) => string
    analyzingDesc: string
    analyzingSteps: [string, string, string]
    analyzingWait: string
    privacy: string
    resultKicker: (name: string) => string
    tryOnTitle: string
    tryOnDesc: string
    tabPreview: string
    tabOriginal: string
    compare: string
    compareTitle: string
    compareDesc: string
    captionOriginal: string
    captionPreview: (color: string) => string
    selectedColor: string
    backToPreview: string
    tryOnPreparing: string
    tryOnNoGarment: string
    tryOnFailed: string
    retryTryOn: string
    paletteHint: string
    drapeHint: string
    moreTone: string
    moreStyle: string
    styleSub: string
    receiptTitle: (name: string) => string
    receiptDesc: string
  }
  tarot: {
    questionNote: string
    revealedDesc: (name: string) => string
    analyzingTitle: string
    flowLead: string
    receiptTitle: (name: string) => string
  }
  error: { label: string; retake: string }
  mobile: {
    title: string
    desc: [string, string]
    dropHint: [string, string]
    formats: string
    tips: { title: string; desc: string }[]
    pick: string
    privacy: string
    steps: [string, string, string]
    confirmTitle: string
    confirmDesc: string
    confirm: string
    pickAnother: string
    doneTitle: string
    doneDesc: [string, string]
    connecting: string
    wait: string
    preparing: string
    sending: string
    sendingDesc: string
    expiredTitle: string
    expiredDesc: string
    photoErrorTitle: string
    photoErrorDesc: string
    reselect: string
    uploadErrorTitle: string
    uploadErrorDesc: string
    reupload: string
    footer: string
  }
}

const withName = (name: string, named: (n: string) => string, plain: string) => (name.trim() ? named(name.trim()) : plain)

const ko: ProgramUiText = {
  stepper: { info: '고객 정보', photo: '사진 촬영' },
  color: {
    infoDesc: '이름은 진단서에 함께 표시돼요',
    nameLabel: '이름 또는 별명',
    genderLabel: '성별을 선택해 주세요',
    typingTitle: '이름을 입력해 주세요',
    typingDesc: '진단서에 표시할 이름 또는 별명이에요.',
    intro: '나에게 어울리는 색, AI가 찾아드릴게요',
    captureDesc: '사진은 진단을 위한 AI 분석에만 사용돼요',
    tips: ['모자 · 마스크 · 색안경은 벗어 주세요', '앞머리를 넘겨 이마가 살짝 보이게', '얼굴은 가운데, 어깨와 상의까지 보이게 서 주세요'],
    useQr: 'QR로 폰 사진 올리기',
    qrTitle: '폰으로 사진을 올려 주세요',
    qrDesc: '정면으로 촬영한 사진 한 장이면 충분해요',
    qrCaption: '사진 업로드 QR',
    qrSteps: ['폰 카메라로 QR을 스캔해 주세요', '갤러리에서 정면 사진 한 장을 골라 주세요', '사진이 이 화면에 자동으로 나타나요'],
    qrPrivacy: '사진은 퍼스널컬러 진단에만 사용돼요',
    qrBack: '이전 단계로 돌아가기',
    useCamera: '직접 촬영하기',
    regenQr: 'QR 다시 만들기',
    qrCreating: 'QR을 만들고 있어요…',
    qrFailed: '연결이 불안정해 사진을 받지 못했습니다.\nQR을 다시 만들거나 카메라로 촬영해 주세요.',
    qrExpired: 'QR 사용 시간이 지났어요.\nQR을 다시 만들어 주세요.',
    confirmDesc: '얼굴과 피부 톤이 선명하게 보이는지 확인해 주세요',
    confirmCheck: '밝은 조명 · 정면 · 자연스러운 피부 톤',
    retake: '다시 하기',
    start: '분석 시작',
    camOff: '카메라를 찾을 수 없습니다.',
    camChecking: '연결을 확인하는 중…',
    useFile: '사진 파일로 대신하기',
    noFace: ['얼굴을 찾지 못했습니다.', '정면에서 다시 찍어 주세요.'],
    analyzingTitle: (name) => withName(name, (n) => `${n}님의 컬러를\n찾고 있어요`, '나의 컬러를\n찾고 있어요'),
    analyzingDesc: '피부와 눈동자, 머리카락의 조화를 살펴봐요',
    analyzingSteps: ['피부 톤 살펴보기', '명도와 선명도 분석하기', '어울리는 팔레트 정리하기'],
    analyzingWait: '잠시만 기다려 주세요',
    privacy: '사진은 진단을 위한 AI 분석에만 사용돼요',
    resultKicker: (name) => withName(name, (n) => `${n}님의 퍼스널 컬러`, '나의 퍼스널 컬러'),
    tryOnTitle: '옷에 색을 입혀 보세요',
    tryOnDesc: '색을 누르면 상의 색이 바뀌어요',
    tabPreview: '옷 색 미리보기',
    tabOriginal: '원본 보기',
    compare: '원본과 나란히 비교',
    compareTitle: '원본과 비교해 보세요',
    compareDesc: '같은 사진, 달라진 옷 색',
    captionOriginal: '촬영 원본',
    captionPreview: (color) => `${color} 미리보기`,
    selectedColor: '선택한 색',
    backToPreview: '옷 색 미리보기로 돌아가기',
    tryOnPreparing: '상의 영역을 찾고 있어요…',
    tryOnNoGarment: '상의가 잘 보이지 않아 얼굴 옆에 색을 대어 보여 드려요.',
    tryOnFailed: '옷 색 미리보기를 준비하지 못해 얼굴 옆에 색을 대어 보여 드려요.',
    retryTryOn: '옷 색 다시 시도',
    paletteHint: '색을 누르면 상의에 입혀 볼 수 있어요.',
    drapeHint: '색을 누르면 얼굴 옆에 대어 볼 수 있어요.',
    moreTone: '톤 분석과 스타일 가이드 더 보기',
    moreStyle: '스타일 가이드 더 보기',
    styleSub: '일상에서 나의 컬러를 즐기는 방법',
    receiptTitle: (name) => withName(name, (n) => `${n}님의 진단서`, '나의 진단서'),
    receiptDesc: '진단 결과를 이미지로 저장할 수 있어요.',
  },
  tarot: {
    questionNote: '질문은 선택 사항입니다.',
    revealedDesc: (name) => withName(name, (n) => `${n}님의 마음에 있는 이야기를 지금, 카드가 전해 줍니다.`, '마음에 있는 이야기를 지금, 카드가 전해 줍니다.'),
    analyzingTitle: '세 장의 흐름을 읽는 중…',
    flowLead: '세 장이 말하는 것',
    receiptTitle: (name) => withName(name, (n) => `${n}님의 리딩 리포트`, '나의 리딩 리포트'),
  },
  error: { label: 'ERROR', retake: '다시 찍기' },
  mobile: {
    title: '사진 올리기',
    desc: ['퍼스널컬러 진단에 사용할', '정면 사진 한 장을 골라 주세요.'],
    dropHint: ['여기를 눌러', '사진을 선택해 주세요.'],
    formats: 'JPG, PNG 파일 지원',
    tips: [
      { title: '정면 사진', desc: '얼굴이 잘 보이게 찍어 주세요.' },
      { title: '밝은 조명', desc: '자연광처럼 밝은 곳에서 찍어 주세요.' },
      { title: '필터 없이', desc: '필터나 보정 없이 촬영해 주세요.' },
    ],
    pick: '갤러리에서 사진 선택',
    privacy: '확정하기 전에는 전송되지 않아요.',
    steps: ['사진 선택', '확인', '완료'],
    confirmTitle: '이 사진으로 할까요?',
    confirmDesc: '확정하면 키오스크 화면으로 전송됩니다.',
    confirm: '이 사진으로 확정하기',
    pickAnother: '다른 사진 고르기',
    doneTitle: '업로드 완료',
    doneDesc: ['키오스크 화면을 확인해 주세요.', '이 창은 닫으셔도 됩니다.'],
    connecting: '연결 중입니다',
    wait: '잠시만 기다려 주세요.',
    preparing: '사진을 준비하고 있어요',
    sending: '사진을 보내는 중이에요',
    sendingDesc: '키오스크로 전송하고 있어요.',
    expiredTitle: '접속할 수 없습니다',
    expiredDesc: '키오스크에서 QR을 다시 만들어 주세요.',
    photoErrorTitle: '사진을 불러오지 못했어요',
    photoErrorDesc: '다른 사진을 골라 주세요.',
    reselect: '다시 선택',
    uploadErrorTitle: '사진을 전송하지 못했어요',
    uploadErrorDesc: '선택한 사진은 그대로 있어요.',
    reupload: '다시 올리기',
    footer: 'PERSONAL COLOR',
  },
}

const en: ProgramUiText = {
  stepper: { info: 'About you', photo: 'Photo' },
  color: {
    infoDesc: 'Your name appears on your color report',
    nameLabel: 'Name or nickname',
    genderLabel: 'Select your gender',
    typingTitle: 'Enter your name',
    typingDesc: 'The name or nickname shown on your report.',
    intro: 'AI finds the colors that suit you',
    captureDesc: 'Your photo is used only for the AI diagnosis',
    tips: ['Take off hats, masks and tinted glasses', 'Brush your fringe aside so your forehead shows', 'Face in the center, shoulders and top in view'],
    useQr: 'Upload a photo from your phone',
    qrTitle: 'Upload a photo from your phone',
    qrDesc: 'One front-facing photo is enough',
    qrCaption: 'Photo upload QR',
    qrSteps: ['Scan the QR code with your phone camera', 'Choose one front-facing photo from your gallery', 'The photo appears on this screen automatically'],
    qrPrivacy: 'Your photo is used only for the personal color diagnosis',
    qrBack: 'Back to the previous step',
    useCamera: 'Take a photo here',
    regenQr: 'New QR code',
    qrCreating: 'Creating a QR code…',
    qrFailed: 'The connection was unstable and no photo arrived.\nCreate a new QR code or take a photo here.',
    qrExpired: 'This QR code has expired.\nPlease create a new one.',
    confirmDesc: 'Check that your face and skin tone are clearly visible',
    confirmCheck: 'Bright light · Facing front · Natural skin tone',
    retake: 'Retake',
    start: 'Start analysis',
    camOff: 'No camera found.',
    camChecking: 'Checking the connection…',
    useFile: 'Use a photo file instead',
    noFace: ['We could not find a face.', 'Please face the camera and try again.'],
    analyzingTitle: (name) => withName(name, (n) => `Finding ${n}'s\ncolors`, 'Finding\nyour colors'),
    analyzingDesc: 'Looking at how your skin, eyes and hair work together',
    analyzingSteps: ['Reading your skin tone', 'Measuring value and clarity', 'Building your palette'],
    analyzingWait: 'Just a moment',
    privacy: 'Your photo is used only for the AI diagnosis',
    resultKicker: (name) => withName(name, (n) => `${n}'s personal color`, 'Your personal color'),
    tryOnTitle: 'Try colors on your top',
    tryOnDesc: 'Tap a color to change the color of your top',
    tabPreview: 'Color preview',
    tabOriginal: 'Original',
    compare: 'Compare side by side',
    compareTitle: 'Compare with the original',
    compareDesc: 'Same photo, a different color top',
    captionOriginal: 'Original photo',
    captionPreview: (color) => `${color} preview`,
    selectedColor: 'Selected color',
    backToPreview: 'Back to the color preview',
    tryOnPreparing: 'Finding your top…',
    tryOnNoGarment: 'Your top is hard to see, so we show the color next to your face instead.',
    tryOnFailed: 'The top preview is not available, so we show the color next to your face instead.',
    retryTryOn: 'Try the top preview again',
    paletteHint: 'Tap a color to try it on your top.',
    drapeHint: 'Tap a color to hold it next to your face.',
    moreTone: 'See tone analysis and style guide',
    moreStyle: 'See the style guide',
    styleSub: 'Ways to enjoy your colors every day',
    receiptTitle: (name) => withName(name, (n) => `${n}'s color report`, 'Your color report'),
    receiptDesc: 'You can save your result as an image.',
  },
  tarot: {
    questionNote: 'The question is optional.',
    revealedDesc: (name) => withName(name, (n) => `The cards now tell the story in ${n}'s heart.`, 'The cards now tell the story in your heart.'),
    analyzingTitle: 'Reading the flow of the three cards…',
    flowLead: 'What the three cards say',
    receiptTitle: (name) => withName(name, (n) => `${n}'s reading`, 'Your reading'),
  },
  error: { label: 'ERROR', retake: 'Retake photo' },
  mobile: {
    title: 'Upload a photo',
    desc: ['Choose one front-facing photo', 'for your personal color diagnosis.'],
    dropHint: ['Tap here', 'to choose a photo.'],
    formats: 'JPG and PNG supported',
    tips: [
      { title: 'Face the front', desc: 'Make sure your face is clearly visible.' },
      { title: 'Bright light', desc: 'Take it somewhere bright, like daylight.' },
      { title: 'No filters', desc: 'Use a photo without filters or retouching.' },
    ],
    pick: 'Choose from gallery',
    privacy: 'Nothing is sent until you confirm.',
    steps: ['Choose', 'Check', 'Done'],
    confirmTitle: 'Use this photo?',
    confirmDesc: 'Once confirmed, it is sent to the kiosk screen.',
    confirm: 'Use this photo',
    pickAnother: 'Choose another photo',
    doneTitle: 'Upload complete',
    doneDesc: ['Please check the kiosk screen.', 'You can close this window.'],
    connecting: 'Connecting',
    wait: 'Just a moment.',
    preparing: 'Preparing your photo',
    sending: 'Sending your photo',
    sendingDesc: 'Sending it to the kiosk.',
    expiredTitle: 'Cannot connect',
    expiredDesc: 'Please create a new QR code on the kiosk.',
    photoErrorTitle: 'Could not load the photo',
    photoErrorDesc: 'Please choose another photo.',
    reselect: 'Choose again',
    uploadErrorTitle: 'Could not send the photo',
    uploadErrorDesc: 'Your selected photo is still here.',
    reupload: 'Send again',
    footer: 'PERSONAL COLOR',
  },
}

const ja: ProgramUiText = {
  stepper: { info: 'お客様情報', photo: '写真撮影' },
  color: {
    infoDesc: 'お名前は診断書に表示されます',
    nameLabel: 'お名前またはニックネーム',
    genderLabel: '性別を選んでください',
    typingTitle: 'お名前を入力してください',
    typingDesc: '診断書に表示するお名前またはニックネームです。',
    intro: '似合う色を、AIが見つけます',
    captureDesc: '写真は診断のためのAI分析にのみ使います',
    tips: ['帽子・マスク・色付きメガネは外してください', '前髪を分けて額が少し見えるように', '顔は中央に、肩と服まで映るように立ってください'],
    useQr: 'スマホの写真をQRで送る',
    qrTitle: 'スマホから写真を送ってください',
    qrDesc: '正面から撮った写真1枚で十分です',
    qrCaption: '写真アップロードQR',
    qrSteps: ['スマホのカメラでQRを読み取ってください', 'ギャラリーから正面の写真を1枚選んでください', '写真がこの画面に自動で表示されます'],
    qrPrivacy: '写真はパーソナルカラー診断にのみ使います',
    qrBack: '前の画面に戻る',
    useCamera: 'ここで撮影する',
    regenQr: 'QRを作り直す',
    qrCreating: 'QRを作成しています…',
    qrFailed: '接続が不安定で写真を受け取れませんでした。\nQRを作り直すか、カメラで撮影してください。',
    qrExpired: 'QRの有効時間が過ぎました。\nQRを作り直してください。',
    confirmDesc: '顔と肌のトーンがはっきり見えるか確認してください',
    confirmCheck: '明るい照明 · 正面 · 自然な肌のトーン',
    retake: '撮り直す',
    start: '分析を始める',
    camOff: 'カメラが見つかりません。',
    camChecking: '接続を確認しています…',
    useFile: '写真ファイルで代わりにする',
    noFace: ['顔が見つかりませんでした。', '正面からもう一度撮影してください。'],
    analyzingTitle: (name) => withName(name, (n) => `${n}さんの色を\n探しています`, 'あなたの色を\n探しています'),
    analyzingDesc: '肌・瞳・髪の調和を見ています',
    analyzingSteps: ['肌のトーンを見る', '明度と鮮やかさを分析する', '似合うパレットをまとめる'],
    analyzingWait: '少々お待ちください',
    privacy: '写真は診断のためのAI分析にのみ使います',
    resultKicker: (name) => withName(name, (n) => `${n}さんのパーソナルカラー`, 'あなたのパーソナルカラー'),
    tryOnTitle: '服に色をのせてみましょう',
    tryOnDesc: '色を押すとトップスの色が変わります',
    tabPreview: '服の色プレビュー',
    tabOriginal: '元の写真',
    compare: '元の写真と並べて比べる',
    compareTitle: '元の写真と比べてみましょう',
    compareDesc: '同じ写真、変わった服の色',
    captionOriginal: '撮影した写真',
    captionPreview: (color) => `${color} プレビュー`,
    selectedColor: '選んだ色',
    backToPreview: '服の色プレビューに戻る',
    tryOnPreparing: 'トップスの範囲を探しています…',
    tryOnNoGarment: 'トップスがよく見えないため、顔の横に色を当てて表示します。',
    tryOnFailed: '服の色プレビューを準備できなかったため、顔の横に色を当てて表示します。',
    retryTryOn: '服の色をもう一度試す',
    paletteHint: '色を押すとトップスにのせて見られます。',
    drapeHint: '色を押すと顔の横に当てられます。',
    moreTone: 'トーン分析とスタイルガイドを見る',
    moreStyle: 'スタイルガイドを見る',
    styleSub: '毎日の暮らしで自分の色を楽しむ方法',
    receiptTitle: (name) => withName(name, (n) => `${n}さんの診断書`, 'あなたの診断書'),
    receiptDesc: '診断結果を画像で保存できます。',
  },
  tarot: {
    questionNote: '質問は任意です。',
    revealedDesc: (name) => withName(name, (n) => `${n}さんの心にある物語を、いまカードが伝えます。`, '心にある物語を、いまカードが伝えます。'),
    analyzingTitle: '3枚の流れを読んでいます…',
    flowLead: '3枚が語ること',
    receiptTitle: (name) => withName(name, (n) => `${n}さんのリーディング`, 'あなたのリーディング'),
  },
  error: { label: 'ERROR', retake: '撮り直す' },
  mobile: {
    title: '写真を送る',
    desc: ['パーソナルカラー診断に使う', '正面の写真を1枚選んでください。'],
    dropHint: ['ここを押して', '写真を選んでください。'],
    formats: 'JPG・PNGに対応',
    tips: [
      { title: '正面の写真', desc: '顔がよく見えるように撮ってください。' },
      { title: '明るい照明', desc: '自然光のような明るい場所で撮ってください。' },
      { title: 'フィルターなし', desc: 'フィルターや補正なしで撮ってください。' },
    ],
    pick: 'ギャラリーから写真を選ぶ',
    privacy: '確定するまでは送信されません。',
    steps: ['写真を選ぶ', '確認', '完了'],
    confirmTitle: 'この写真にしますか？',
    confirmDesc: '確定するとキオスクの画面に送られます。',
    confirm: 'この写真で確定する',
    pickAnother: '別の写真を選ぶ',
    doneTitle: 'アップロード完了',
    doneDesc: ['キオスクの画面を確認してください。', 'この画面は閉じて大丈夫です。'],
    connecting: '接続しています',
    wait: '少々お待ちください。',
    preparing: '写真を準備しています',
    sending: '写真を送っています',
    sendingDesc: 'キオスクに送信しています。',
    expiredTitle: '接続できません',
    expiredDesc: 'キオスクでQRを作り直してください。',
    photoErrorTitle: '写真を読み込めませんでした',
    photoErrorDesc: '別の写真を選んでください。',
    reselect: '選び直す',
    uploadErrorTitle: '写真を送れませんでした',
    uploadErrorDesc: '選んだ写真はそのまま残っています。',
    reupload: 'もう一度送る',
    footer: 'PERSONAL COLOR',
  },
}

const zhHans: ProgramUiText = {
  stepper: { info: '基本信息', photo: '拍照' },
  color: {
    infoDesc: '名字会显示在诊断书上',
    nameLabel: '名字或昵称',
    genderLabel: '请选择性别',
    typingTitle: '请输入名字',
    typingDesc: '显示在诊断书上的名字或昵称。',
    intro: '适合你的颜色，由 AI 为你找到',
    captureDesc: '照片仅用于诊断的 AI 分析',
    tips: ['请摘下帽子、口罩和有色眼镜', '把刘海拨开，露出一点额头', '脸在中间，让肩膀和上衣也入镜'],
    useQr: '用手机上传照片',
    qrTitle: '请用手机上传照片',
    qrDesc: '一张正面照片就够了',
    qrCaption: '照片上传二维码',
    qrSteps: ['用手机相机扫描二维码', '从相册选择一张正面照片', '照片会自动显示在这个画面上'],
    qrPrivacy: '照片仅用于个人色彩诊断',
    qrBack: '返回上一步',
    useCamera: '在这里拍照',
    regenQr: '重新生成二维码',
    qrCreating: '正在生成二维码…',
    qrFailed: '连接不稳定，没有收到照片。\n请重新生成二维码或用相机拍照。',
    qrExpired: '二维码已过期。\n请重新生成二维码。',
    confirmDesc: '请确认脸部和肤色是否清晰',
    confirmCheck: '光线明亮 · 正面 · 自然肤色',
    retake: '重拍',
    start: '开始分析',
    camOff: '找不到相机。',
    camChecking: '正在检查连接…',
    useFile: '改用照片文件',
    noFace: ['没有找到人脸。', '请正对镜头重新拍摄。'],
    analyzingTitle: (name) => withName(name, (n) => `正在寻找\n${n}的颜色`, '正在寻找\n你的颜色'),
    analyzingDesc: '正在观察皮肤、瞳孔和头发的协调',
    analyzingSteps: ['观察肤色', '分析明度与清晰度', '整理适合的色盘'],
    analyzingWait: '请稍候',
    privacy: '照片仅用于诊断的 AI 分析',
    resultKicker: (name) => withName(name, (n) => `${n}的个人色彩`, '你的个人色彩'),
    tryOnTitle: '给衣服换个颜色',
    tryOnDesc: '点击颜色，上衣颜色就会改变',
    tabPreview: '衣服颜色预览',
    tabOriginal: '原图',
    compare: '与原图并排比较',
    compareTitle: '与原图比较',
    compareDesc: '同一张照片，不同的衣服颜色',
    captionOriginal: '原始照片',
    captionPreview: (color) => `${color} 预览`,
    selectedColor: '所选颜色',
    backToPreview: '返回衣服颜色预览',
    tryOnPreparing: '正在寻找上衣区域…',
    tryOnNoGarment: '上衣不够清楚，改为把颜色放在脸旁展示。',
    tryOnFailed: '无法准备衣服颜色预览，改为把颜色放在脸旁展示。',
    retryTryOn: '重试衣服颜色',
    paletteHint: '点击颜色即可试穿在上衣上。',
    drapeHint: '点击颜色，放在脸旁看看。',
    moreTone: '查看色调分析与风格指南',
    moreStyle: '查看风格指南',
    styleSub: '在日常中享受自己颜色的方法',
    receiptTitle: (name) => withName(name, (n) => `${n}的诊断书`, '你的诊断书'),
    receiptDesc: '可以把诊断结果保存为图片。',
  },
  tarot: {
    questionNote: '问题可以不填。',
    revealedDesc: (name) => withName(name, (n) => `此刻，牌将传达${n}心中的故事。`, '此刻，牌将传达你心中的故事。'),
    analyzingTitle: '正在解读三张牌的流动…',
    flowLead: '三张牌想说的',
    receiptTitle: (name) => withName(name, (n) => `${n}的解读报告`, '你的解读报告'),
  },
  error: { label: 'ERROR', retake: '重拍' },
  mobile: {
    title: '上传照片',
    desc: ['请选择一张用于', '个人色彩诊断的正面照片。'],
    dropHint: ['点击这里', '选择照片。'],
    formats: '支持 JPG、PNG',
    tips: [
      { title: '正面照片', desc: '请让脸部清楚可见。' },
      { title: '明亮光线', desc: '请在像自然光一样明亮的地方拍摄。' },
      { title: '不加滤镜', desc: '请使用未加滤镜或修图的照片。' },
    ],
    pick: '从相册选择照片',
    privacy: '确认之前不会发送。',
    steps: ['选择照片', '确认', '完成'],
    confirmTitle: '用这张照片吗？',
    confirmDesc: '确认后会发送到自助机画面。',
    confirm: '确认使用这张照片',
    pickAnother: '选择其他照片',
    doneTitle: '上传完成',
    doneDesc: ['请查看自助机画面。', '可以关闭这个页面了。'],
    connecting: '正在连接',
    wait: '请稍候。',
    preparing: '正在准备照片',
    sending: '正在发送照片',
    sendingDesc: '正在发送到自助机。',
    expiredTitle: '无法连接',
    expiredDesc: '请在自助机上重新生成二维码。',
    photoErrorTitle: '无法读取照片',
    photoErrorDesc: '请选择其他照片。',
    reselect: '重新选择',
    uploadErrorTitle: '照片发送失败',
    uploadErrorDesc: '所选照片仍然保留。',
    reupload: '重新发送',
    footer: 'PERSONAL COLOR',
  },
}

const zhHant: ProgramUiText = {
  stepper: { info: '基本資訊', photo: '拍照' },
  color: {
    infoDesc: '名字會顯示在診斷書上',
    nameLabel: '名字或暱稱',
    genderLabel: '請選擇性別',
    typingTitle: '請輸入名字',
    typingDesc: '顯示在診斷書上的名字或暱稱。',
    intro: '適合你的顏色，由 AI 為你找到',
    captureDesc: '照片僅用於診斷的 AI 分析',
    tips: ['請摘下帽子、口罩和有色眼鏡', '把瀏海撥開，露出一點額頭', '臉在中間，讓肩膀和上衣也入鏡'],
    useQr: '用手機上傳照片',
    qrTitle: '請用手機上傳照片',
    qrDesc: '一張正面照片就夠了',
    qrCaption: '照片上傳 QR',
    qrSteps: ['用手機相機掃描 QR', '從相簿選擇一張正面照片', '照片會自動顯示在這個畫面上'],
    qrPrivacy: '照片僅用於個人色彩診斷',
    qrBack: '返回上一步',
    useCamera: '在這裡拍照',
    regenQr: '重新產生 QR',
    qrCreating: '正在產生 QR…',
    qrFailed: '連線不穩定，沒有收到照片。\n請重新產生 QR 或用相機拍照。',
    qrExpired: 'QR 已過期。\n請重新產生 QR。',
    confirmDesc: '請確認臉部和膚色是否清晰',
    confirmCheck: '光線明亮 · 正面 · 自然膚色',
    retake: '重拍',
    start: '開始分析',
    camOff: '找不到相機。',
    camChecking: '正在檢查連線…',
    useFile: '改用照片檔案',
    noFace: ['沒有找到人臉。', '請正對鏡頭重新拍攝。'],
    analyzingTitle: (name) => withName(name, (n) => `正在尋找\n${n}的顏色`, '正在尋找\n你的顏色'),
    analyzingDesc: '正在觀察皮膚、瞳孔和頭髮的協調',
    analyzingSteps: ['觀察膚色', '分析明度與清晰度', '整理適合的色盤'],
    analyzingWait: '請稍候',
    privacy: '照片僅用於診斷的 AI 分析',
    resultKicker: (name) => withName(name, (n) => `${n}的個人色彩`, '你的個人色彩'),
    tryOnTitle: '給衣服換個顏色',
    tryOnDesc: '點選顏色，上衣顏色就會改變',
    tabPreview: '衣服顏色預覽',
    tabOriginal: '原圖',
    compare: '與原圖並排比較',
    compareTitle: '與原圖比較',
    compareDesc: '同一張照片，不同的衣服顏色',
    captionOriginal: '原始照片',
    captionPreview: (color) => `${color} 預覽`,
    selectedColor: '所選顏色',
    backToPreview: '返回衣服顏色預覽',
    tryOnPreparing: '正在尋找上衣範圍…',
    tryOnNoGarment: '上衣不夠清楚，改為把顏色放在臉旁展示。',
    tryOnFailed: '無法準備衣服顏色預覽，改為把顏色放在臉旁展示。',
    retryTryOn: '重試衣服顏色',
    paletteHint: '點選顏色即可試穿在上衣上。',
    drapeHint: '點選顏色，放在臉旁看看。',
    moreTone: '查看色調分析與風格指南',
    moreStyle: '查看風格指南',
    styleSub: '在日常中享受自己顏色的方法',
    receiptTitle: (name) => withName(name, (n) => `${n}的診斷書`, '你的診斷書'),
    receiptDesc: '可以把診斷結果儲存為圖片。',
  },
  tarot: {
    questionNote: '問題可以不填。',
    revealedDesc: (name) => withName(name, (n) => `此刻，牌將傳達${n}心中的故事。`, '此刻，牌將傳達你心中的故事。'),
    analyzingTitle: '正在解讀三張牌的流動…',
    flowLead: '三張牌想說的',
    receiptTitle: (name) => withName(name, (n) => `${n}的解讀報告`, '你的解讀報告'),
  },
  error: { label: 'ERROR', retake: '重拍' },
  mobile: {
    title: '上傳照片',
    desc: ['請選擇一張用於', '個人色彩診斷的正面照片。'],
    dropHint: ['點這裡', '選擇照片。'],
    formats: '支援 JPG、PNG',
    tips: [
      { title: '正面照片', desc: '請讓臉部清楚可見。' },
      { title: '明亮光線', desc: '請在像自然光一樣明亮的地方拍攝。' },
      { title: '不加濾鏡', desc: '請使用未加濾鏡或修圖的照片。' },
    ],
    pick: '從相簿選擇照片',
    privacy: '確認之前不會傳送。',
    steps: ['選擇照片', '確認', '完成'],
    confirmTitle: '用這張照片嗎？',
    confirmDesc: '確認後會傳送到自助機畫面。',
    confirm: '確認使用這張照片',
    pickAnother: '選擇其他照片',
    doneTitle: '上傳完成',
    doneDesc: ['請查看自助機畫面。', '可以關閉這個頁面了。'],
    connecting: '正在連線',
    wait: '請稍候。',
    preparing: '正在準備照片',
    sending: '正在傳送照片',
    sendingDesc: '正在傳送到自助機。',
    expiredTitle: '無法連線',
    expiredDesc: '請在自助機上重新產生 QR。',
    photoErrorTitle: '無法讀取照片',
    photoErrorDesc: '請選擇其他照片。',
    reselect: '重新選擇',
    uploadErrorTitle: '照片傳送失敗',
    uploadErrorDesc: '所選照片仍然保留。',
    reupload: '重新傳送',
    footer: 'PERSONAL COLOR',
  },
}

const TEXTS: Record<KioskLang, ProgramUiText> = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }

export function programUiText(lang: KioskLang): ProgramUiText {
  return TEXTS[lang] ?? ko
}
