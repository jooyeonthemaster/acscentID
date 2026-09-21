// 키오스크 번체(繁體中文) 향수 텍스트 — src/data/perfumes-i18n.ts 의 간체(zh)를
// OpenCC(cn → twp: 대만 정체 + 대만식 어휘)로 변환해 생성한 정적 데이터.
// 사이트엔 번체 로케일이 없어 키오스크 전용이다. 간체 원문을 고치면 다시 생성할 것.

export interface PerfumeTextHant {
  name: string
  description: string
  mood: string
  personality: string
  keywords: string[]
  mainScent: string
  subScent1: string
  subScent2: string
  recommendation: string
}

export const PERFUMES_ZH_HANT: Record<string, PerfumeTextHant> = {
  "AC'SCENT 01": {
    "name": "黑莓",
    "description": "一款以濃郁甜美的黑莓香氣為主調的迷人香水。甜中帶酸的獨特層次，散發著無法抗拒的魅力。",
    "mood": "甜美, 果香, 清新, 迷人",
    "personality": "適合擁有獨特甜美魅力的人。",
    "keywords": [
      "時髦",
      "都市感",
      "極簡",
      "觀察者",
      "疏離感"
    ],
    "mainScent": "黑莓",
    "subScent1": "月桂葉",
    "subScent2": "雪松木",
    "recommendation": "特別適合現代時尚的20至30歲男性。"
  },
  "AC'SCENT 02": {
    "name": "柑橘",
    "description": "清新活力的柑橘香氣，瞬間點亮心情的活力之香。充滿陽光般的正能量。",
    "mood": "清新, 活力, 明朗, 能量滿滿",
    "personality": "適合陽光開朗、充滿正能量的人。",
    "keywords": [
      "精緻",
      "有策略",
      "極簡",
      "都市精英",
      "完美主義"
    ],
    "mainScent": "柑橘",
    "subScent1": "葡萄柚",
    "subScent2": "牡丹",
    "recommendation": "特別適合都市時尚的25至35歲女性。"
  },
  "AC'SCENT 03": {
    "name": "草莓",
    "description": "一款以甜美清新的草莓香氣為主調的迷人香水。營造出可愛甜蜜的少女氛圍。",
    "mood": "甜美, 可愛, 萌系, 清新",
    "personality": "適合擁有可愛甜美魅力的人。",
    "keywords": [
      "撒嬌",
      "甜蜜",
      "可愛",
      "粉彩",
      "活潑"
    ],
    "mainScent": "草莓",
    "subScent1": "茉莉",
    "subScent2": "香草",
    "recommendation": "特別適合浪漫可愛的20至30歲女性。"
  },
  "AC'SCENT 04": {
    "name": "佛手柑",
    "description": "柑橘與草本完美融合的佛手柑香水。清爽之中盡顯優雅氣質。",
    "mood": "清爽, 優雅, 精緻, 乾淨",
    "personality": "適合氣質優雅、舉止從容的人。",
    "keywords": [
      "優雅",
      "品位",
      "從容",
      "地中海",
      "精緻"
    ],
    "mainScent": "佛手柑",
    "subScent1": "橙花",
    "subScent2": "琥珀",
    "recommendation": "適合30至50歲具有優雅品位的男女。"
  },
  "AC'SCENT 05": {
    "name": "苦橙",
    "description": "苦橙的微苦香氣散發著獨特魅力的香水。清新卻深邃的香調持久悠長。",
    "mood": "微苦, 獨特, 深邃, 成熟",
    "personality": "適合擁有獨特深沉魅力的人。",
    "keywords": [
      "領袖氣質",
      "強烈",
      "壓倒性",
      "王者風範",
      "氣場"
    ],
    "mainScent": "苦橙",
    "subScent1": "杜松子",
    "subScent2": "辛辣木質調",
    "recommendation": "特別適合充滿氣場和自信的30至45歲男性。"
  },
  "AC'SCENT 06": {
    "name": "胡蘿蔔",
    "description": "一款帶有甜蜜泥土氣息的獨特胡蘿蔔香水。營造舒適而別具一格的氛圍。",
    "mood": "舒適, 獨特, 自然, 甜美",
    "personality": "適合溫和舒適又有獨特個性的人。",
    "keywords": [
      "自然主義",
      "健康生活",
      "清澈",
      "冥想",
      "健康"
    ],
    "mainScent": "胡蘿蔔",
    "subScent1": "葡萄柚",
    "subScent2": "蓮花",
    "recommendation": "特別適合追求自然健康之美的25至40歲女性。"
  },
  "AC'SCENT 07": {
    "name": "玫瑰",
    "description": "一款以優雅奢華的玫瑰香氣為主調的迷人香水。營造浪漫而女性化的典雅氛圍。",
    "mood": "優雅, 浪漫, 女性化, 奢華",
    "personality": "適合優雅浪漫、氣質出眾的人。",
    "keywords": [
      "優雅",
      "奢華",
      "經典",
      "舊錢風",
      "品位"
    ],
    "mainScent": "玫瑰",
    "subScent1": "大馬士革玫瑰",
    "subScent2": "麝香",
    "recommendation": "特別適合優美成熟的35至50歲女性。"
  },
  "AC'SCENT 08": {
    "name": "晚香玉",
    "description": "濃烈而感性的晚香玉香氣令人難以忘懷。深邃而印象深刻的香調持久留香。",
    "mood": "濃烈, 感性, 深邃, 印象深刻",
    "personality": "適合擁有強烈深邃魅力的人。",
    "keywords": [
      "華麗",
      "領袖氣質",
      "魅惑",
      "純白",
      "強烈"
    ],
    "mainScent": "晚香玉",
    "subScent1": "白花調",
    "subScent2": "小蒼蘭",
    "recommendation": "特別適合優雅精緻的30至45歲女性。"
  },
  "AC'SCENT 09": {
    "name": "橙花",
    "description": "清新華麗的橙花香氣令人心曠神怡。營造明朗而甜美的春日氛圍。",
    "mood": "華麗, 清新, 可愛, 春天般的",
    "personality": "適合華麗而可愛、魅力四射的人。",
    "keywords": [
      "精緻",
      "法式優雅",
      "都市感",
      "優雅",
      "巴黎風"
    ],
    "mainScent": "橙花",
    "subScent1": "茉莉",
    "subScent2": "零陵香豆",
    "recommendation": "特別適合精緻自信的30至40歲女性。"
  },
  "AC'SCENT 10": {
    "name": "鬱金香",
    "description": "清新純淨的鬱金香香氣令人心曠神怡。營造利落優雅的清新氛圍。",
    "mood": "清新, 純淨, 利落, 優雅",
    "personality": "適合氣質乾淨優雅的人。",
    "keywords": [
      "純潔",
      "清純",
      "閃耀",
      "潔淨",
      "優雅"
    ],
    "mainScent": "鬱金香",
    "subScent1": "仙客來",
    "subScent2": "丁香花",
    "recommendation": "特別適合純淨清新的25至35歲女性。"
  },
  "AC'SCENT 11": {
    "name": "青檸",
    "description": "清爽刺激的青檸香氣令人精神振奮。營造活力四射的清新氛圍。",
    "mood": "清爽, 活力, 刺激, 清新",
    "personality": "適合充滿活力和清新魅力的人。",
    "keywords": [
      "從容",
      "酷",
      "自由",
      "度假",
      "清涼"
    ],
    "mainScent": "青檸",
    "subScent1": "羅勒",
    "subScent2": "琥珀木",
    "recommendation": "適合熱愛自由活躍生活方式的25至40歲男女。"
  },
  "AC'SCENT 12": {
    "name": "鈴蘭",
    "description": "細膩純淨的鈴蘭香氣令人心醉。營造清純潔淨的淡雅氛圍。",
    "mood": "細膩, 純淨, 清純, 潔淨",
    "personality": "適合純淨清純、氣質脫俗的人。",
    "keywords": [
      "細膩",
      "安靜",
      "優雅",
      "藝術感",
      "清雅"
    ],
    "mainScent": "鈴蘭",
    "subScent1": "粉色小蒼蘭",
    "subScent2": "茉莉",
    "recommendation": "特別適合優雅細膩的28至38歲女性。"
  },
  "AC'SCENT 13": {
    "name": "柚子",
    "description": "清新甜美的柚子香氣令人愉悅。營造明亮活力的陽光氛圍。",
    "mood": "清新, 甜美, 明朗, 活力",
    "personality": "適合陽光開朗、充滿活力的人。",
    "keywords": [
      "活力",
      "健康",
      "能量",
      "生機",
      "清爽"
    ],
    "mainScent": "柚子",
    "subScent1": "迷迭香",
    "subScent2": "薄荷",
    "recommendation": "適合充滿生命力和活力的25至40歲男女。"
  },
  "AC'SCENT 14": {
    "name": "薄荷",
    "description": "清涼提神的薄荷香氣令人精神煥發。營造清爽利落的潔淨氛圍。",
    "mood": "清涼, 提神, 爽快, 利落",
    "personality": "適合追求清爽利落生活方式的人。",
    "keywords": [
      "完美主義",
      "清涼",
      "潔淨",
      "井然有序",
      "清爽"
    ],
    "mainScent": "薄荷",
    "subScent1": "茉莉",
    "subScent2": "馬黛葉",
    "recommendation": "適合注重品質的28至42歲男女。"
  },
  "AC'SCENT 15": {
    "name": "苦橙葉",
    "description": "清新而優雅的苦橙葉香氣令人心曠神怡。營造精緻利落的高階氛圍。",
    "mood": "清新, 優雅, 精緻, 利落",
    "personality": "適合精緻優雅、從容不迫的人。",
    "keywords": [
      "度假",
      "旅行",
      "名流",
      "自在",
      "從容"
    ],
    "mainScent": "苦橙葉",
    "subScent1": "苦橙",
    "subScent2": "葡萄柚",
    "recommendation": "適合活力精緻的30至45歲男女。"
  },
  "AC'SCENT 16": {
    "name": "檀香木",
    "description": "溫暖柔和的檀香木香氣令人安心。營造深沉而寧靜的溫馨氛圍。",
    "mood": "溫暖, 柔和, 深邃, 寧靜",
    "personality": "適合溫暖穩重、令人安心的人。",
    "keywords": [
      "沉穩",
      "深度",
      "紳士",
      "知性",
      "高階感"
    ],
    "mainScent": "檀香木",
    "subScent1": "龍涎酮",
    "subScent2": "紙莎草",
    "recommendation": "適合有領袖氣質的成熟35至50歲男女。"
  },
  "AC'SCENT 17": {
    "name": "檸檬胡椒",
    "description": "清新檸檬與辛辣胡椒巧妙融合的香水。營造別出心裁、活力滿滿的氛圍。",
    "mood": "清新, 辛辣, 獨特, 活力",
    "personality": "適合別具一格、品味獨到的人。",
    "keywords": [
      "藝術感",
      "自由",
      "獨特",
      "創意",
      "非主流"
    ],
    "mainScent": "檸檬胡椒",
    "subScent1": "焚香",
    "subScent2": "鳶尾根",
    "recommendation": "適合自由不羈又精緻的28至45歲男女。"
  },
  "AC'SCENT 18": {
    "name": "粉紅胡椒",
    "description": "甜美與辛辣交織的粉紅胡椒香水。營造獨特而精緻的迷人氛圍。",
    "mood": "甜美, 辛辣, 獨特, 精緻",
    "personality": "適合擁有獨特精緻品味的人。",
    "keywords": [
      "忙碌",
      "工作狂",
      "都市感",
      "高效",
      "現代"
    ],
    "mainScent": "粉紅胡椒",
    "subScent1": "肉豆蔻",
    "subScent2": "薄荷",
    "recommendation": "特別適合都市精英30至45歲男性。"
  },
  "AC'SCENT 19": {
    "name": "海鹽",
    "description": "清涼舒爽的海鹽香氣彷彿海風拂面。營造潔淨清新的自由氛圍。",
    "mood": "清涼, 清爽, 潔淨, 舒暢",
    "personality": "適合熱愛大自然、追求自由的人。",
    "keywords": [
      "自由",
      "大海",
      "清爽",
      "自然",
      "冒險"
    ],
    "mainScent": "海鹽",
    "subScent1": "鼠尾草",
    "subScent2": "麝香",
    "recommendation": "赤腳踩沙便是人生至福的自由靈魂。"
  },
  "AC'SCENT 20": {
    "name": "百里香",
    "description": "草本氣息濃郁的百里香香水。清新中蘊含深邃的層次感。",
    "mood": "清爽, 草本, 深邃, 自然",
    "personality": "適合崇尚自然、內心深邃的人。",
    "keywords": [
      "平衡",
      "神秘",
      "復古",
      "自然",
      "都市"
    ],
    "mainScent": "百里香",
    "subScent1": "雪松木",
    "subScent2": "香根草",
    "recommendation": "在城市與森林之間找到平衡的神秘存在。"
  },
  "AC'SCENT 21": {
    "name": "麝香",
    "description": "柔軟溫暖的麝香香氣令人沉醉。營造性感而溫馨的親密氛圍。",
    "mood": "柔軟, 溫暖, 性感, 溫馨",
    "personality": "適合溫柔性感、魅力天成的人。",
    "keywords": [
      "優雅",
      "品位",
      "奢華",
      "巴黎風",
      "文化"
    ],
    "mainScent": "麝香",
    "subScent1": "琥珀",
    "subScent2": "香草",
    "recommendation": "以優雅為天職和使命的當代貴族。"
  },
  "AC'SCENT 22": {
    "name": "白玫瑰",
    "description": "純淨優雅的白玫瑰香氣令人心醉。營造潔淨而浪漫的純美氛圍。",
    "mood": "純淨, 優雅, 潔淨, 浪漫",
    "personality": "適合純淨浪漫、氣質清雅的人。",
    "keywords": [
      "純白",
      "清純",
      "淨化",
      "天使",
      "閃耀"
    ],
    "mainScent": "白玫瑰",
    "subScent1": "牡丹",
    "subScent2": "麝香",
    "recommendation": "以純白之光淨化一切空間的清純女神。"
  },
  "AC'SCENT 23": {
    "name": "麂皮",
    "description": "柔軟溫暖的麂皮香氣令人倍感奢華。營造舒適而高雅的精緻氛圍。",
    "mood": "柔軟, 溫暖, 舒適, 奢華",
    "personality": "適合自然散發高階感的人。",
    "keywords": [
      "精緻",
      "文化",
      "風格",
      "都市感",
      "精品店"
    ],
    "mainScent": "麂皮",
    "subScent1": "鳶尾花",
    "subScent2": "琥珀木",
    "recommendation": "都市文化精英，風格刻入DNA的人。"
  },
  "AC'SCENT 24": {
    "name": "義大利柑橘",
    "description": "清新活力的義大利柑橘香氣充滿地中海陽光。明朗而充滿能量。",
    "mood": "清新, 活力, 明朗, 能量滿滿",
    "personality": "適合天生魅力四射、活力無限的人。",
    "keywords": [
      "魅惑",
      "荷爾蒙",
      "自然",
      "感性",
      "天生"
    ],
    "mainScent": "義大利柑橘",
    "subScent1": "橙花油",
    "subScent2": "麝香",
    "recommendation": "存在本身就令人著迷的、如大自然饋贈般的人。"
  },
  "AC'SCENT 25": {
    "name": "薰衣草",
    "description": "舒緩安寧的薰衣草香氣令人放鬆身心。營造寧靜治癒的美好氛圍。",
    "mood": "舒緩, 安寧, 沉靜, 治癒",
    "personality": "適合沉穩溫和、令人安心的人。",
    "keywords": [
      "知性",
      "沉穩",
      "深度",
      "爵士",
      "威士忌"
    ],
    "mainScent": "薰衣草",
    "subScent1": "零陵香豆",
    "subScent2": "檀香木",
    "recommendation": "能進行深度對話的知性魅力大師。"
  },
  "AC'SCENT 26": {
    "name": "義大利柏樹",
    "description": "木質清涼的柏樹香氣令人精神振奮。營造自然而神秘的高階氛圍。",
    "mood": "木質, 清涼, 自然, 神秘",
    "personality": "適合擁有自然神秘氣質的人。",
    "keywords": [
      "神秘",
      "暗夜",
      "氣場",
      "謎",
      "夜"
    ],
    "mainScent": "義大利柏樹",
    "subScent1": "杜松",
    "subScent2": "香根草",
    "recommendation": "被稱為暗夜之王、擁有黑暗氣場的人。"
  },
  "AC'SCENT 27": {
    "name": "煙燻混合木",
    "description": "深邃煙燻的木質香氣令人著迷。營造神秘而強大的王者氛圍。",
    "mood": "煙燻, 深邃, 神秘, 強烈",
    "personality": "適合深沉而神秘、令人敬畏的人。",
    "keywords": [
      "品位",
      "成功",
      "貴賓",
      "深度",
      "企業家"
    ],
    "mainScent": "煙燻混合木",
    "subScent1": "愈創木",
    "subScent2": "琥珀",
    "recommendation": "VIP休息室的常客，天生的商界精英。"
  },
  "AC'SCENT 28": {
    "name": "皮革",
    "description": "奢華溫暖的皮革香氣散發著尊貴氣息。精緻而充滿領袖風範。",
    "mood": "奢華, 溫暖, 精緻, 氣場強大",
    "personality": "適合品味卓越、氣場強大的人。",
    "keywords": [
      "美食家",
      "收藏家",
      "高階品味",
      "精緻",
      "感官"
    ],
    "mainScent": "皮革",
    "subScent1": "沉香",
    "subScent2": "香草",
    "recommendation": "美食之神，精緻品味的典範。"
  },
  "AC'SCENT 29": {
    "name": "紫羅蘭",
    "description": "細膩優雅的紫羅蘭香氣令人陶醉。營造浪漫而女性化的藝術氛圍。",
    "mood": "細膩, 優雅, 浪漫, 女性化",
    "personality": "適合細膩浪漫、藝術感十足的人。",
    "keywords": [
      "潮流",
      "前衛",
      "時尚",
      "藝術感",
      "先鋒"
    ],
    "mainScent": "紫羅蘭",
    "subScent1": "鳶尾花",
    "subScent2": "雪松木",
    "recommendation": "非坐在時裝週前排不可的潮流女王。"
  },
  "AC'SCENT 30": {
    "name": "無花果",
    "description": "甜美而深邃的無花果香氣令人沉醉。營造溫馨穩重的成熟氛圍。",
    "mood": "甜美, 溫馨, 穩重, 成熟",
    "personality": "適合溫暖成熟、從容優雅的人。",
    "keywords": [
      "從容",
      "品位",
      "贏家",
      "紅酒",
      "奢華"
    ],
    "mainScent": "無花果",
    "subScent1": "椰子",
    "subScent2": "麝香",
    "recommendation": "人生贏家，從容優雅已融入骨血的品位象徵。"
  }
}
