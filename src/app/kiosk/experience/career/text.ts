import type { KioskLang } from '@/lib/kiosk/i18n'
import type { CareerAxis, CareerId } from './data'

export interface CareerText {
  headline: string
  sub: string
  note: string
  cta: string
  foot: string
  /** 머리의 작은 글자 */
  tagline: string
  axes: Record<CareerAxis, string>
  q1Title: string
  q1Sub: string
  picked: (n: number) => string
  /** 상황 질문 다섯 개 — 제목(두 줄까지) · 보기 셋 */
  questions: { title: string[]; options: [string, string, string] }[]
  qSub: string
  prevQ: string
  nextQ: string
  seeResult: string
  done: string
  resultTitle: string
  resultSub: string
  careers: Record<CareerId, { name: string; desc: string; first: string }>
  firstLabel: string
  firstNote: string
  guide: string
  guideTitle: string
  guides: Record<CareerAxis, [string, string, string]>
  save: string
  saveTitle: string
  resultFoot: string
  cardLabel: string
}

const ko: CareerText = {
  headline: '나의 다음 가능성을 찾아요',
  sub: '좋아하는 일에서 시작하는 직업 탐색',
  note: '6개의 질문 · 새로운 발견',
  cta: '가능성 탐색 시작',
  foot: '관심사 기반 직업 탐색',
  tagline: '나의 다음 가능성을 찾아요',
  axes: { make: '만들기', solve: '문제 풀기', help: '사람 돕기', talk: '이야기하기' },
  q1Title: '마음이 가는 활동을 골라요',
  q1Sub: '여러 개를 골라도 좋아요',
  picked: (n) => `${n}개 선택`,
  questions: [
    { title: ['쉬는 날, 어떤 시간이', '가장 즐거운가요?'], options: ['무언가 만들거나 꾸미기', '게임·퍼즐 공략하기', '사람들과 수다 떨기'] },
    { title: ['함께 과제를 한다면,', '어떤 역할이 좋나요?'], options: ['자료를 찾아 분석하기', '팀원을 챙기고 조율하기', '앞에서 발표하기'] },
    { title: ['작은 축제를 만든다면,', '어떤 일을 맡고 싶나요?'], options: ['포스터와 공간 꾸미기', '일정과 예산 계획하기', '사람들에게 행사 알리기'] },
    { title: ['친구에게 고민이 생겼어요.', '나는 어떻게 할까요?'], options: ['끝까지 들어주기', '해결 방법 찾아보기', '기분 좋아질 선물 만들기'] },
    { title: ['언제 가장', '뿌듯한가요?'], options: ['내 손으로 완성했을 때', '누군가에게 도움이 됐을 때', '내 이야기에 공감해 줄 때'] },
  ],
  qSub: '가장 끌리는 하나를 골라주세요',
  prevQ: '이전 질문',
  nextQ: '다음 질문',
  seeResult: '결과 보기',
  done: '탐색 완료',
  resultTitle: '탐색해 볼 직업',
  resultSub: '좋아하는 활동에서 찾은 세 가지 방향',
  careers: {
    'brand-designer': { name: '브랜드 디자이너', desc: '색과 모양으로 브랜드의 이야기를 전해요', first: '좋아하는 브랜드의 포스터 한 장 만들기' },
    'space-designer': { name: '공간 디자이너', desc: '사람들이 머무는 공간의 경험을 만들어요', first: '내 방 한쪽을 새로 꾸미고 사진으로 남기기' },
    'product-designer': { name: '제품 디자이너', desc: '쓰기 편한 물건과 서비스를 설계해요', first: '자주 쓰는 물건의 불편한 점 하나 고쳐 그려 보기' },
    'food-creator': { name: '푸드 크리에이터', desc: '맛있는 한 접시로 사람들을 기쁘게 해요', first: '나만의 레시피로 한 접시 만들어 대접하기' },
    developer: { name: '소프트웨어 개발자', desc: '아이디어를 움직이는 프로그램으로 만들어요', first: '블록 코딩으로 작은 게임 하나 완성하기' },
    'data-analyst': { name: '데이터 분석가', desc: '숫자 속에서 숨은 답을 찾아요', first: '일주일 동안 내 하루를 기록해 그래프로 그리기' },
    'service-planner': { name: '서비스 기획자', desc: '사람들의 불편을 찾아 더 나은 방법을 설계해요', first: '주변의 불편한 점 세 가지와 해결 아이디어 적기' },
    researcher: { name: '기자 · 리서처', desc: '궁금한 것을 파고들어 알기 쉽게 전해요', first: '궁금한 주제를 조사해 한 장으로 정리하기' },
    'social-worker': { name: '사회복지사', desc: '필요한 도움을 찾아 사람과 이어 줘요', first: '우리 동네 봉사 활동 하나 찾아 참여하기' },
    teacher: { name: '교사 · 교육 전문가', desc: '배움이 즐거워지도록 곁에서 도와요', first: '내가 잘하는 것을 친구에게 10분 알려 주기' },
    'service-designer': { name: '서비스 디자이너', desc: '사람들이 편하게 쓰도록 경험을 다듬어요', first: '가족이 자주 쓰는 앱에서 불편한 화면 고쳐 그려 보기' },
    counselor: { name: '상담 심리사', desc: '이야기를 듣고 마음이 가벼워지도록 도와요', first: '친구의 이야기를 끊지 않고 끝까지 들어 보기' },
    'content-planner': { name: '콘텐츠 기획자', desc: '사람들이 즐길 이야기와 콘텐츠를 기획해요', first: '좋아하는 주제로 1분 영상 구성안 써 보기' },
    host: { name: '아나운서 · 진행자', desc: '말로 사람과 사람을 이어요', first: '좋아하는 것을 1분 동안 소리 내어 소개해 보기' },
    marketer: { name: '마케터', desc: '어떻게 알리면 좋을지 전략을 세워요', first: '좋아하는 가게를 알리는 한 줄 문구 세 개 쓰기' },
    'community-manager': { name: '커뮤니티 매니저', desc: '사람들이 모이고 이어지게 만들어요', first: '같은 취미를 가진 친구들과 작은 모임 열어 보기' },
  },
  firstLabel: '작은 첫 도전',
  firstNote: '흥미 기반 탐색 안내예요',
  guide: '도전 가이드 보기',
  guideTitle: '이렇게 시작해 보세요',
  guides: {
    make: ['마음에 드는 작품을 모아 따라 그려 보기', '작은 것 하나를 끝까지 완성하기', '완성한 것을 사진으로 남기고 보여 주기'],
    solve: ['궁금한 문제 하나를 정하기', '자료를 찾고 직접 해 보며 답을 좁히기', '알아낸 것을 한 장으로 정리하기'],
    help: ['주변에서 도움이 필요한 순간 찾아보기', '작은 도움 하나를 직접 해 보기', '상대의 반응을 기억해 다음에 더 잘하기'],
    talk: ['전하고 싶은 이야기 하나 고르기', '짧게 말하거나 써 보기', '친구에게 들려주고 느낌을 물어보기'],
  },
  save: '탐색 가이드 저장',
  saveTitle: '탐색 가이드 받기',
  resultFoot: '관심사 기반 탐색 · 적성 검사가 아니에요',
  cardLabel: '나의 직업 탐색 가이드',
}

const en: CareerText = {
  headline: 'Find your next possibility',
  sub: 'Exploring careers from what you like',
  note: '6 questions · new discoveries',
  cta: 'Start exploring',
  foot: 'Career exploration based on your interests',
  tagline: 'Find your next possibility',
  axes: { make: 'Making', solve: 'Solving', help: 'Helping', talk: 'Storytelling' },
  q1Title: 'Pick the activities you enjoy',
  q1Sub: 'You can choose more than one',
  picked: (n) => `${n} selected`,
  questions: [
    { title: ['On a day off, what do', 'you enjoy the most?'], options: ['Making or decorating something', 'Beating a game or puzzle', 'Chatting with people'] },
    { title: ['In a group project,', 'which role suits you?'], options: ['Finding and analyzing data', 'Looking after the team', 'Presenting up front'] },
    { title: ['If you ran a small festival,', 'what would you take on?'], options: ['Posters and decoration', 'Schedule and budget', 'Spreading the word'] },
    { title: ['A friend has a worry.', 'What do you do?'], options: ['Listen to the end', 'Look for a solution', 'Make a cheer-up gift'] },
    { title: ['When do you feel', 'the proudest?'], options: ['When I finish something by hand', 'When I help someone', 'When people relate to my story'] },
  ],
  qSub: 'Choose the one that appeals most',
  prevQ: 'Previous',
  nextQ: 'Next question',
  seeResult: 'See my result',
  done: 'Exploration done',
  resultTitle: 'Careers to explore',
  resultSub: 'Three directions found in what you like',
  careers: {
    'brand-designer': { name: 'Brand designer', desc: 'Tells a brand’s story with color and shape', first: 'Make one poster for a brand you like' },
    'space-designer': { name: 'Space designer', desc: 'Creates the experience of the places we stay in', first: 'Restyle one corner of your room and photograph it' },
    'product-designer': { name: 'Product designer', desc: 'Designs things and services that are easy to use', first: 'Redraw one annoying thing about an object you use' },
    'food-creator': { name: 'Food creator', desc: 'Makes people happy with one great plate', first: 'Cook a dish from your own recipe for someone' },
    developer: { name: 'Software developer', desc: 'Turns ideas into programs that run', first: 'Finish one small game with block coding' },
    'data-analyst': { name: 'Data analyst', desc: 'Finds hidden answers in numbers', first: 'Log your days for a week and chart them' },
    'service-planner': { name: 'Service planner', desc: 'Finds what bothers people and designs a better way', first: 'Write three everyday problems and ideas to fix them' },
    researcher: { name: 'Journalist · researcher', desc: 'Digs into questions and explains them clearly', first: 'Research a topic and sum it up on one page' },
    'social-worker': { name: 'Social worker', desc: 'Connects people with the help they need', first: 'Find one volunteer activity nearby and join it' },
    teacher: { name: 'Teacher · educator', desc: 'Helps learning feel enjoyable', first: 'Teach a friend something you do well for 10 minutes' },
    'service-designer': { name: 'Service designer', desc: 'Polishes experiences so people use them with ease', first: 'Redraw a confusing screen in an app your family uses' },
    counselor: { name: 'Counselor', desc: 'Listens and helps hearts feel lighter', first: 'Listen to a friend’s story without interrupting' },
    'content-planner': { name: 'Content planner', desc: 'Plans stories and content people enjoy', first: 'Outline a one-minute video on a topic you love' },
    host: { name: 'Announcer · host', desc: 'Connects people through words', first: 'Introduce something you love out loud for one minute' },
    marketer: { name: 'Marketer', desc: 'Plans how to spread the word', first: 'Write three one-line slogans for a shop you like' },
    'community-manager': { name: 'Community manager', desc: 'Brings people together and keeps them connected', first: 'Host a small meetup with friends who share a hobby' },
  },
  firstLabel: 'A small first step',
  firstNote: 'A guide based on your interests',
  guide: 'See the guide',
  guideTitle: 'Here’s how to begin',
  guides: {
    make: ['Collect works you like and try copying them', 'Finish one small thing all the way', 'Photograph it and show someone'],
    solve: ['Pick one question you’re curious about', 'Look things up and try it yourself', 'Sum up what you found on one page'],
    help: ['Notice a moment when someone needs help', 'Do one small helpful thing yourself', 'Remember the reaction and do better next time'],
    talk: ['Choose one story you want to tell', 'Say it or write it briefly', 'Tell a friend and ask how it felt'],
  },
  save: 'Save my guide',
  saveTitle: 'Get my guide',
  resultFoot: 'Interest-based exploration · not an aptitude test',
  cardLabel: 'My career exploration guide',
}

const ja: CareerText = {
  headline: '次の可能性を見つけましょう',
  sub: '好きなことから始める職業探索',
  note: '6つの質問 · 新しい発見',
  cta: '可能性の探索スタート',
  foot: '興味・関心にもとづく職業探索',
  tagline: '次の可能性を見つけましょう',
  axes: { make: 'つくる', solve: '問題を解く', help: '人を助ける', talk: '話す' },
  q1Title: '気になる活動を選びましょう',
  q1Sub: '複数選んでも大丈夫です',
  picked: (n) => `${n}個選択`,
  questions: [
    { title: ['休みの日、どんな時間が', 'いちばん楽しいですか？'], options: ['何かを作ったり飾ったり', 'ゲームやパズルを攻略', '誰かとおしゃべり'] },
    { title: ['グループ課題をするなら、', 'どの役割がいいですか？'], options: ['資料を集めて分析する', 'メンバーを支えて調整する', 'みんなの前で発表する'] },
    { title: ['小さなお祭りを開くなら、', '何を担当したいですか？'], options: ['ポスターと会場の飾りつけ', '日程と予算の計画', 'イベントの告知'] },
    { title: ['友だちに悩みができました。', 'あなたならどうしますか？'], options: ['最後まで話を聞く', '解決方法を探してみる', '元気が出る贈り物を作る'] },
    { title: ['いちばん誇らしいのは', 'どんなときですか？'], options: ['自分の手で完成させたとき', '誰かの役に立てたとき', '自分の話に共感されたとき'] },
  ],
  qSub: 'いちばん気になる1つを選んでください',
  prevQ: '前の質問',
  nextQ: '次の質問',
  seeResult: '結果を見る',
  done: '探索完了',
  resultTitle: '探索してみたい職業',
  resultSub: '好きな活動から見つけた3つの方向',
  careers: {
    'brand-designer': { name: 'ブランドデザイナー', desc: '色と形でブランドの物語を伝えます', first: '好きなブランドのポスターを1枚作る' },
    'space-designer': { name: '空間デザイナー', desc: '人が過ごす空間の体験をつくります', first: '部屋の一角を模様替えして写真に残す' },
    'product-designer': { name: 'プロダクトデザイナー', desc: '使いやすいモノやサービスを設計します', first: 'よく使う物の不便な点を1つ直して描く' },
    'food-creator': { name: 'フードクリエイター', desc: 'おいしい一皿で人を喜ばせます', first: '自分のレシピで一皿作ってふるまう' },
    developer: { name: 'ソフトウェア開発者', desc: 'アイデアを動くプログラムにします', first: 'ブロックコーディングで小さなゲームを1つ作る' },
    'data-analyst': { name: 'データアナリスト', desc: '数字の中から隠れた答えを見つけます', first: '1週間の毎日を記録してグラフにする' },
    'service-planner': { name: 'サービスプランナー', desc: '人の不便を見つけ、より良い方法を設計します', first: '身近な不便を3つと解決アイデアを書き出す' },
    researcher: { name: '記者・リサーチャー', desc: '気になることを掘り下げ、わかりやすく伝えます', first: '気になるテーマを調べて1枚にまとめる' },
    'social-worker': { name: '社会福祉士', desc: '必要な支援を見つけて人とつなぎます', first: '地域のボランティアを1つ探して参加する' },
    teacher: { name: '教師・教育の専門家', desc: '学びが楽しくなるようそばで支えます', first: '得意なことを友だちに10分教える' },
    'service-designer': { name: 'サービスデザイナー', desc: '人が気持ちよく使えるよう体験を磨きます', first: '家族がよく使うアプリの不便な画面を描き直す' },
    counselor: { name: '心理カウンセラー', desc: '話を聞いて、心が軽くなるよう支えます', first: '友だちの話をさえぎらず最後まで聞く' },
    'content-planner': { name: 'コンテンツプランナー', desc: '人が楽しめる物語やコンテンツを企画します', first: '好きなテーマで1分動画の構成を書いてみる' },
    host: { name: 'アナウンサー・司会者', desc: '言葉で人と人をつなぎます', first: '好きなものを1分間、声に出して紹介する' },
    marketer: { name: 'マーケター', desc: 'どう伝えるとよいか戦略を立てます', first: '好きなお店を紹介する一言コピーを3つ書く' },
    'community-manager': { name: 'コミュニティマネージャー', desc: '人が集まり、つながる場をつくります', first: '同じ趣味の友だちと小さな集まりを開く' },
  },
  firstLabel: '小さな最初の挑戦',
  firstNote: '興味にもとづく探索のご案内です',
  guide: '挑戦ガイドを見る',
  guideTitle: 'こう始めてみましょう',
  guides: {
    make: ['気に入った作品を集めて、まねして描いてみる', '小さなものを1つ、最後まで仕上げる', '完成したものを写真に残して見せる'],
    solve: ['気になる問いを1つ決める', '資料を調べ、自分で試しながら答えをしぼる', 'わかったことを1枚にまとめる'],
    help: ['身の回りで助けが必要な場面を探す', '小さな手助けを1つ、自分でやってみる', '相手の反応を覚えて、次にもっとうまくやる'],
    talk: ['伝えたい話を1つ選ぶ', '短く話すか、書いてみる', '友だちに聞かせて感想をたずねる'],
  },
  save: '探索ガイドを保存',
  saveTitle: '探索ガイドを受け取る',
  resultFoot: '興味にもとづく探索 · 適性検査ではありません',
  cardLabel: 'あなたの職業探索ガイド',
}

const zhHans: CareerText = {
  headline: '发现你的下一种可能',
  sub: '从喜欢的事出发的职业探索',
  note: '6个问题 · 新的发现',
  cta: '开始探索可能性',
  foot: '基于兴趣的职业探索',
  tagline: '发现你的下一种可能',
  axes: { make: '动手创作', solve: '解决问题', help: '帮助他人', talk: '表达交流' },
  q1Title: '选择让你心动的活动',
  q1Sub: '可以选择多项',
  picked: (n) => `已选 ${n} 项`,
  questions: [
    { title: ['休息日里，哪种时光', '最让你开心？'], options: ['动手制作或装饰', '攻克游戏或谜题', '和大家聊天'] },
    { title: ['如果一起做小组作业，', '你喜欢哪个角色？'], options: ['查找并分析资料', '照顾组员并协调', '上台发言'] },
    { title: ['如果办一场小型庆典，', '你想负责什么？'], options: ['设计海报、布置场地', '规划日程和预算', '向大家宣传活动'] },
    { title: ['朋友有了烦恼。', '你会怎么做？'], options: ['耐心听到最后', '帮忙找解决办法', '做个让人开心的礼物'] },
    { title: ['什么时候', '最有成就感？'], options: ['亲手完成作品时', '帮到别人时', '我的故事得到共鸣时'] },
  ],
  qSub: '请选出最吸引你的一项',
  prevQ: '上一题',
  nextQ: '下一题',
  seeResult: '查看结果',
  done: '探索完成',
  resultTitle: '可以探索的职业',
  resultSub: '从喜欢的活动中找到的三个方向',
  careers: {
    'brand-designer': { name: '品牌设计师', desc: '用色彩和造型讲述品牌故事', first: '为喜欢的品牌做一张海报' },
    'space-designer': { name: '空间设计师', desc: '打造人们停留的空间体验', first: '重新布置房间一角并拍照留念' },
    'product-designer': { name: '产品设计师', desc: '设计好用的物品和服务', first: '找出常用物品的一个不便，画出改良版' },
    'food-creator': { name: '美食创作者', desc: '用一盘美味让人开心', first: '用自己的食谱做一道菜招待别人' },
    developer: { name: '软件工程师', desc: '把创意变成能运行的程序', first: '用积木编程完成一个小游戏' },
    'data-analyst': { name: '数据分析师', desc: '从数字里找出隐藏的答案', first: '记录一周的每一天并画成图表' },
    'service-planner': { name: '服务策划', desc: '发现人们的不便，设计更好的办法', first: '写下身边的三个不便和解决点子' },
    researcher: { name: '记者 · 调研员', desc: '深入挖掘好奇的事，讲得通俗易懂', first: '调查一个好奇的主题并整理成一页' },
    'social-worker': { name: '社会工作者', desc: '为人们对接所需的帮助', first: '找一项社区志愿活动并参加' },
    teacher: { name: '教师 · 教育专家', desc: '在一旁陪伴，让学习变得有趣', first: '花10分钟把拿手的事教给朋友' },
    'service-designer': { name: '服务设计师', desc: '打磨体验，让人们用得更舒心', first: '重画家人常用App里不好用的界面' },
    counselor: { name: '心理咨询师', desc: '倾听诉说，让人心里轻松一些', first: '不打断，听朋友把话说完' },
    'content-planner': { name: '内容策划', desc: '策划让人乐在其中的故事和内容', first: '为喜欢的主题写一份1分钟视频大纲' },
    host: { name: '播音员 · 主持人', desc: '用语言连接人与人', first: '用1分钟大声介绍你喜欢的东西' },
    marketer: { name: '市场营销人员', desc: '制定策略，想出最好的宣传方式', first: '为喜欢的店写三条一句话宣传语' },
    'community-manager': { name: '社群运营', desc: '让人们聚在一起、彼此连接', first: '和同好的朋友办一次小聚会' },
  },
  firstLabel: '第一个小挑战',
  firstNote: '这是基于兴趣的探索指引',
  guide: '查看挑战指南',
  guideTitle: '可以这样开始',
  guides: {
    make: ['收集喜欢的作品并试着临摹', '把一件小东西做到完成', '把成品拍下来给别人看'],
    solve: ['选定一个好奇的问题', '查资料、亲手尝试，逐步缩小答案', '把弄明白的内容整理成一页'],
    help: ['留意身边有人需要帮助的时刻', '亲自帮一个小忙', '记住对方的反应，下次做得更好'],
    talk: ['选一个想讲的故事', '试着简短地说出来或写下来', '讲给朋友听，问问他的感受'],
  },
  save: '保存探索指南',
  saveTitle: '领取探索指南',
  resultFoot: '基于兴趣的探索 · 并非能力倾向测验',
  cardLabel: '你的职业探索指南',
}

const zhHant: CareerText = {
  headline: '發現你的下一種可能',
  sub: '從喜歡的事出發的職業探索',
  note: '6個問題 · 新的發現',
  cta: '開始探索可能性',
  foot: '以興趣為基礎的職業探索',
  tagline: '發現你的下一種可能',
  axes: { make: '動手創作', solve: '解決問題', help: '幫助他人', talk: '表達交流' },
  q1Title: '選擇讓你心動的活動',
  q1Sub: '可以選擇多項',
  picked: (n) => `已選 ${n} 項`,
  questions: [
    { title: ['休假日裡，哪種時光', '最讓你開心？'], options: ['動手製作或佈置', '攻略遊戲或謎題', '和大家聊天'] },
    { title: ['如果一起做小組作業，', '你喜歡哪個角色？'], options: ['查找並分析資料', '照顧組員並協調', '上台報告'] },
    { title: ['如果辦一場小型慶典，', '你想負責什麼？'], options: ['設計海報、佈置場地', '規劃時程和預算', '向大家宣傳活動'] },
    { title: ['朋友有了煩惱。', '你會怎麼做？'], options: ['耐心聽到最後', '幫忙找解決辦法', '做個讓人開心的禮物'] },
    { title: ['什麼時候', '最有成就感？'], options: ['親手完成作品時', '幫上別人的忙時', '我的故事得到共鳴時'] },
  ],
  qSub: '請選出最吸引你的一項',
  prevQ: '上一題',
  nextQ: '下一題',
  seeResult: '查看結果',
  done: '探索完成',
  resultTitle: '可以探索的職業',
  resultSub: '從喜歡的活動中找到的三個方向',
  careers: {
    'brand-designer': { name: '品牌設計師', desc: '用色彩和造型訴說品牌故事', first: '為喜歡的品牌做一張海報' },
    'space-designer': { name: '空間設計師', desc: '打造人們停留的空間體驗', first: '重新佈置房間一角並拍照留念' },
    'product-designer': { name: '產品設計師', desc: '設計好用的物品和服務', first: '找出常用物品的一個不便，畫出改良版' },
    'food-creator': { name: '美食創作者', desc: '用一盤美味讓人開心', first: '用自己的食譜做一道菜招待別人' },
    developer: { name: '軟體工程師', desc: '把創意變成能運作的程式', first: '用積木程式完成一個小遊戲' },
    'data-analyst': { name: '資料分析師', desc: '從數字裡找出隱藏的答案', first: '記錄一週的每一天並畫成圖表' },
    'service-planner': { name: '服務企劃', desc: '發現人們的不便，設計更好的方法', first: '寫下身邊的三個不便和解決點子' },
    researcher: { name: '記者 · 研究員', desc: '深入挖掘好奇的事，說得淺顯易懂', first: '調查一個好奇的主題並整理成一頁' },
    'social-worker': { name: '社會工作師', desc: '為人們連結所需的協助', first: '找一項社區志工活動並參加' },
    teacher: { name: '教師 · 教育專家', desc: '在一旁陪伴，讓學習變得有趣', first: '花10分鐘把拿手的事教給朋友' },
    'service-designer': { name: '服務設計師', desc: '琢磨體驗，讓人們用得更順手', first: '重畫家人常用App裡不好用的畫面' },
    counselor: { name: '諮商心理師', desc: '傾聽訴說，讓人心裡輕鬆一些', first: '不打斷，聽朋友把話說完' },
    'content-planner': { name: '內容企劃', desc: '企劃讓人樂在其中的故事和內容', first: '為喜歡的主題寫一份1分鐘影片大綱' },
    host: { name: '主播 · 主持人', desc: '用話語連結人與人', first: '用1分鐘大聲介紹你喜歡的東西' },
    marketer: { name: '行銷人員', desc: '擬定策略，想出最好的宣傳方式', first: '為喜歡的店寫三則一句話文案' },
    'community-manager': { name: '社群經理', desc: '讓人們聚在一起、彼此連結', first: '和同好的朋友辦一次小聚會' },
  },
  firstLabel: '第一個小挑戰',
  firstNote: '這是以興趣為基礎的探索指引',
  guide: '查看挑戰指南',
  guideTitle: '可以這樣開始',
  guides: {
    make: ['收集喜歡的作品並試著臨摹', '把一件小東西做到完成', '把成品拍下來給別人看'],
    solve: ['選定一個好奇的問題', '查資料、親手嘗試，逐步縮小答案', '把弄懂的內容整理成一頁'],
    help: ['留意身邊有人需要幫助的時刻', '親自幫一個小忙', '記住對方的反應，下次做得更好'],
    talk: ['選一個想說的故事', '試著簡短地說出來或寫下來', '說給朋友聽，問問他的感受'],
  },
  save: '儲存探索指南',
  saveTitle: '領取探索指南',
  resultFoot: '以興趣為基礎的探索 · 並非性向測驗',
  cardLabel: '你的職業探索指南',
}

export const CAREER_TEXT: Partial<Record<KioskLang, CareerText>> & { ko: CareerText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }
