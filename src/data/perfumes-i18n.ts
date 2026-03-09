import type { Locale } from '@/i18n/config'

interface PerfumeI18n {
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

const translations: Record<string, Record<string, PerfumeI18n>> = {
  en: {
    "AC'SCENT 01": {
      name: "Blackberry",
      description: "A captivating perfume with a rich, sweet blackberry scent. Its blend of sweetness and subtle tartness creates an irresistibly unique charm.",
      mood: "Sweet, Fruity, Zesty, Captivating",
      personality: "Perfect for someone with a uniquely sweet and magnetic allure.",
      keywords: ["Chic", "Urban", "Minimal", "Observer", "Nonchalant"],
      mainScent: "Blackberry",
      subScent1: "Bay Leaf",
      subScent2: "Cedarwood",
      recommendation: "Especially suited for modern, stylish men in their 20s and 30s."
    },
    "AC'SCENT 02": {
      name: "Mandarin Orange",
      description: "A bright, energizing perfume bursting with fresh mandarin orange. It lifts your spirits and radiates positivity.",
      mood: "Fresh, Vibrant, Bright, Energetic",
      personality: "Best for someone who radiates positive energy and boundless enthusiasm.",
      keywords: ["Sophisticated", "Calculated", "Minimal", "Urban Elite", "Flawless"],
      mainScent: "Mandarin Orange",
      subScent1: "Grapefruit",
      subScent2: "Peony",
      recommendation: "Especially suited for sophisticated, stylish women aged 25 to 35."
    },
    "AC'SCENT 03": {
      name: "Strawberry",
      description: "A sweet, luscious strawberry perfume that charms instantly. It creates an adorable, lovable atmosphere wherever you go.",
      mood: "Sweet, Lovable, Adorable, Fresh",
      personality: "Ideal for someone with an irresistibly cute and lovable charm.",
      keywords: ["Playful", "Sweet", "Cute", "Pastel", "Bubbly"],
      mainScent: "Strawberry",
      subScent1: "Jasmine",
      subScent2: "Vanilla",
      recommendation: "Especially suited for romantic, love-struck women in their 20s and 30s."
    },
    "AC'SCENT 04": {
      name: "Bergamot",
      description: "A harmonious blend of citrus and herbal notes in a bergamot perfume. Refreshing yet gracefully elegant.",
      mood: "Refreshing, Elegant, Refined, Clean",
      personality: "Made for someone who exudes refined sophistication and grace.",
      keywords: ["Elegance", "Prestige", "Leisure", "Mediterranean", "Sophistication"],
      mainScent: "Bergamot",
      subScent1: "Orange Flower",
      subScent2: "Amber",
      recommendation: "Suits men and women aged 30 to 50 who carry themselves with effortless poise."
    },
    "AC'SCENT 05": {
      name: "Bitter Orange",
      description: "A perfume with the distinctive bittersweet allure of bitter orange. Its bright yet deep character lingers memorably.",
      mood: "Bittersweet, Distinctive, Deep, Mature",
      personality: "For someone with a commanding, deeply captivating presence.",
      keywords: ["Charisma", "Intensity", "Commanding", "Boss Energy", "Presence"],
      mainScent: "Bitter Orange",
      subScent1: "Juniper Berry",
      subScent2: "Spicy Woody Accord",
      recommendation: "Especially suited for charismatic, confident men aged 30 to 45."
    },
    "AC'SCENT 06": {
      name: "Carrot",
      description: "A uniquely sweet perfume with earthy undertones of carrot. It creates a comforting yet distinctly original atmosphere.",
      mood: "Comforting, Unique, Natural, Sweet",
      personality: "For someone who is effortlessly unique with a comforting presence.",
      keywords: ["Naturalist", "Wellness", "Clear", "Meditation", "Healthy"],
      mainScent: "Carrot",
      subScent1: "Grapefruit",
      subScent2: "Lotus",
      recommendation: "Especially suited for women aged 25 to 40 who embrace natural, healthy beauty."
    },
    "AC'SCENT 07": {
      name: "Rose",
      description: "An elegant, luxurious rose perfume that captivates with every note. It creates a romantic, feminine ambiance of timeless beauty.",
      mood: "Elegant, Romantic, Feminine, Luxurious",
      personality: "For someone who embodies classic elegance and romantic allure.",
      keywords: ["Elegance", "Luxury", "Classic", "Old Money", "Prestige"],
      mainScent: "Rose",
      subScent1: "Damask Rose",
      subScent2: "Musk",
      recommendation: "Especially suited for elegant, refined women aged 35 to 50."
    },
    "AC'SCENT 08": {
      name: "Tuberose",
      description: "An intense, sensual tuberose perfume that leaves a lasting impression. Its rich depth lingers beautifully on the skin.",
      mood: "Intense, Sensual, Deep, Impressive",
      personality: "For someone with a powerful, deeply magnetic presence.",
      keywords: ["Glamorous", "Charismatic", "Enchanting", "Pure White", "Intense"],
      mainScent: "Tuberose",
      subScent1: "White Floral",
      subScent2: "Freesia",
      recommendation: "Especially suited for elegant, sophisticated women aged 30 to 45."
    },
    "AC'SCENT 09": {
      name: "Orange Blossom",
      description: "A radiant, fresh orange blossom perfume that blooms with warmth. It creates a bright, lovable ambiance like a spring garden.",
      mood: "Radiant, Fresh, Lovable, Spring-like",
      personality: "For someone who lights up a room with warmth and grace.",
      keywords: ["Refined", "French Chic", "Urban", "Graceful", "Parisienne"],
      mainScent: "Orange Blossom",
      subScent1: "Jasmine",
      subScent2: "Tonka Bean",
      recommendation: "Especially suited for poised, confident women in their 30s and 40s."
    },
    "AC'SCENT 10": {
      name: "Tulip",
      description: "A fresh, crisp tulip perfume that feels clean and pure. It creates a neat, elegant atmosphere with effortless grace.",
      mood: "Fresh, Clear, Clean, Elegant",
      personality: "For someone with a naturally clean and graceful presence.",
      keywords: ["Purity", "Innocent", "Radiant", "Pristine", "Grace"],
      mainScent: "Tulip",
      subScent1: "Cyclamen",
      subScent2: "Lilac",
      recommendation: "Especially suited for women aged 25 to 35 with a pure, luminous image."
    },
    "AC'SCENT 11": {
      name: "Lime",
      description: "A zesty, effervescent lime perfume that awakens the senses. It creates a lively, refreshing atmosphere full of energy.",
      mood: "Zesty, Lively, Sparkling, Fresh",
      personality: "For someone who brings fresh energy and vitality everywhere they go.",
      keywords: ["Easygoing", "Cool", "Freedom", "Resort", "Refreshing"],
      mainScent: "Lime",
      subScent1: "Basil",
      subScent2: "Amberwood",
      recommendation: "Suits active men and women aged 25 to 40 who live freely and adventurously."
    },
    "AC'SCENT 12": {
      name: "Lily of the Valley",
      description: "A delicate, pure lily of the valley perfume that whispers softly. It creates an innocent, pristine atmosphere of quiet beauty.",
      mood: "Delicate, Pure, Innocent, Pristine",
      personality: "For someone who possesses a quiet, understated purity.",
      keywords: ["Delicate", "Quiet", "Graceful", "Artistic", "Refined"],
      mainScent: "Lily of the Valley",
      subScent1: "Pink Freesia",
      subScent2: "Jasmine",
      recommendation: "Especially suited for graceful, refined women aged 28 to 38."
    },
    "AC'SCENT 13": {
      name: "Yuzu",
      description: "A bright, sweet yuzu perfume that sparkles with citrus joy. It creates a sunny, spirited atmosphere that lifts every mood.",
      mood: "Zesty, Sweet, Bright, Spirited",
      personality: "For someone who radiates sunshine and infectious good cheer.",
      keywords: ["Energetic", "Healthy", "Energy", "Vitality", "Crisp"],
      mainScent: "Yuzu",
      subScent1: "Rosemary",
      subScent2: "Mint",
      recommendation: "Suits vibrant, energetic men and women aged 25 to 40."
    },
    "AC'SCENT 14": {
      name: "Mint",
      description: "A cool, invigorating mint perfume that clears the mind. It creates a crisp, clean atmosphere of sharp clarity.",
      mood: "Cool, Crisp, Refreshing, Clean",
      personality: "For someone who values precision and clean, fresh energy.",
      keywords: ["Perfectionist", "Crisp", "Clean", "Organized", "Refreshing"],
      mainScent: "Mint",
      subScent1: "Jasmine",
      subScent2: "Mate Leaf",
      recommendation: "Suits polished, refined men and women aged 28 to 42."
    },
    "AC'SCENT 15": {
      name: "Petitgrain",
      description: "A fresh yet elegant petitgrain perfume that balances citrus brightness with herbal sophistication. Clean and polished.",
      mood: "Fresh, Elegant, Refined, Clean",
      personality: "For someone who carries effortless sophistication with poise.",
      keywords: ["Resort", "Travel", "Celebrity", "Carefree", "Leisure"],
      mainScent: "Petitgrain",
      subScent1: "Bitter Orange",
      subScent2: "Grapefruit",
      recommendation: "Suits stylish, spirited men and women aged 30 to 45."
    },
    "AC'SCENT 16": {
      name: "Sandalwood",
      description: "A warm, velvety sandalwood perfume that wraps you in comfort. Its rich depth creates a grounded, serene atmosphere.",
      mood: "Warm, Soft, Deep, Comforting",
      personality: "For someone with a warm heart and a reassuring, steady presence.",
      keywords: ["Distinguished", "Depth", "Gentleman", "Intellectual", "Refined"],
      mainScent: "Sandalwood",
      subScent1: "Ambroxan",
      subScent2: "Papyrus",
      recommendation: "Suits charismatic, mature men and women aged 35 to 50."
    },
    "AC'SCENT 17": {
      name: "Lemon Pepper",
      description: "A vibrant blend of zesty lemon and spicy pepper that surprises and delights. Bold, original, and full of character.",
      mood: "Zesty, Spicy, Unique, Lively",
      personality: "For someone with sharp wit and an unmistakably original style.",
      keywords: ["Artistic", "Free-spirited", "Unique", "Creative", "Alternative"],
      mainScent: "Lemon Pepper",
      subScent1: "Incense",
      subScent2: "Orris",
      recommendation: "Suits free-spirited, stylish men and women aged 28 to 45."
    },
    "AC'SCENT 18": {
      name: "Pink Pepper",
      description: "A sweet yet spicy pink pepper perfume with an alluring edge. It creates a uniquely sophisticated atmosphere that lingers.",
      mood: "Sweet, Spicy, Unique, Sophisticated",
      personality: "For someone with a distinctive blend of refinement and edge.",
      keywords: ["Busy", "Workaholic", "Urban", "Efficient", "Modern"],
      mainScent: "Pink Pepper",
      subScent1: "Nutmeg",
      subScent2: "Mint",
      recommendation: "Especially suited for polished, urban men in their 30s and 40s."
    },
    "AC'SCENT 19": {
      name: "Sea Salt",
      description: "A cool, bracing sea salt perfume that evokes ocean breezes. It creates a clean, revitalizing atmosphere of pure freedom.",
      mood: "Cool, Crisp, Clean, Refreshing",
      personality: "For someone who thrives on fresh air and wide-open spaces.",
      keywords: ["Freedom", "Ocean", "Refreshing", "Natural", "Adventure"],
      mainScent: "Sea Salt",
      subScent1: "Sage",
      subScent2: "Musk",
      recommendation: "For the free soul whose greatest happiness is walking barefoot in the sand."
    },
    "AC'SCENT 20": {
      name: "Thyme",
      description: "A bold, herbal thyme perfume with surprising depth. Its refreshing green character reveals layers of woody complexity.",
      mood: "Refreshing, Herbal, Deep, Natural",
      personality: "For someone with a grounded, mysterious depth rooted in nature.",
      keywords: ["Balance", "Mystery", "Analog", "Nature", "Urban"],
      mainScent: "Thyme",
      subScent1: "Cedarwood",
      subScent2: "Vetiver",
      recommendation: "For the enigmatic soul who has found balance between city and forest."
    },
    "AC'SCENT 21": {
      name: "Musk",
      description: "A soft, enveloping musk perfume that radiates warmth. It creates a seductive, cozy atmosphere of intimate allure.",
      mood: "Soft, Warm, Seductive, Cozy",
      personality: "For someone with a gentle sensuality and magnetic warmth.",
      keywords: ["Elegance", "Prestige", "Luxury", "Parisian", "Cultured"],
      mainScent: "Musk",
      subScent1: "Amber",
      subScent2: "Vanilla",
      recommendation: "For the modern aristocrat whose very calling is elegance itself."
    },
    "AC'SCENT 22": {
      name: "White Rose",
      description: "A pure, graceful white rose perfume that glows with innocence. It creates a clean, romantic atmosphere like a bridal garden.",
      mood: "Pure, Elegant, Clean, Romantic",
      personality: "For someone who carries an aura of pristine, romantic beauty.",
      keywords: ["Pure White", "Innocent", "Purifying", "Angelic", "Luminous"],
      mainScent: "White Rose",
      subScent1: "Peony",
      subScent2: "Musk",
      recommendation: "For the ethereal presence who purifies every space with her luminous aura."
    },
    "AC'SCENT 23": {
      name: "Suede",
      description: "A smooth, warm suede perfume that envelops you in luxury. It creates a comfortable, high-end atmosphere of quiet sophistication.",
      mood: "Soft, Warm, Comfortable, Luxurious",
      personality: "For someone whose natural elegance and refined taste are second nature.",
      keywords: ["Sophisticated", "Cultured", "Stylish", "Urban", "Boutique"],
      mainScent: "Suede",
      subScent1: "Iris",
      subScent2: "Amberwood",
      recommendation: "For the urban cultural elite whose impeccable style is written in their DNA."
    },
    "AC'SCENT 24": {
      name: "Italian Mandarin",
      description: "A bright, vivacious Italian mandarin perfume bursting with Mediterranean sunshine. Radiant energy in every drop.",
      mood: "Fresh, Vibrant, Bright, Energetic",
      personality: "For someone whose natural magnetism and charm are simply irresistible.",
      keywords: ["Alluring", "Pheromone", "Natural", "Sensual", "Innate"],
      mainScent: "Italian Mandarin",
      subScent1: "Neroli",
      subScent2: "Musk",
      recommendation: "For the naturally enchanting soul who is a gift from nature itself."
    },
    "AC'SCENT 25": {
      name: "Lavender",
      description: "A soothing, calming lavender perfume that quiets the mind. It creates a serene, healing atmosphere of deep tranquility.",
      mood: "Soothing, Calming, Serene, Healing",
      personality: "For someone with a tranquil, comforting presence that puts others at ease.",
      keywords: ["Intellectual", "Distinguished", "Profound", "Jazz", "Whiskey"],
      mainScent: "Lavender",
      subScent1: "Tonka Bean",
      subScent2: "Sandalwood",
      recommendation: "For the master of deep conversation and intellectual charm."
    },
    "AC'SCENT 26": {
      name: "Italian Cypress",
      description: "A woody, cool cypress perfume that evokes ancient groves. It creates a natural, enigmatic atmosphere of timeless mystery.",
      mood: "Woody, Cool, Natural, Mysterious",
      personality: "For someone who possesses an aura of dark, natural mystique.",
      keywords: ["Mystery", "Darkness", "Charisma", "Enigma", "Night"],
      mainScent: "Italian Cypress",
      subScent1: "Juniper",
      subScent2: "Vetiver",
      recommendation: "For the lord of the night, who commands the charisma of shadows."
    },
    "AC'SCENT 27": {
      name: "Smoky Blend Wood",
      description: "A deep, smoky wood perfume with smoldering intensity. It creates a mysterious, powerful atmosphere that commands the room.",
      mood: "Smoky, Deep, Mysterious, Intense",
      personality: "For someone with a profound, enigmatic depth that fascinates.",
      keywords: ["Prestige", "Success", "VIP", "Depth", "Mogul"],
      mainScent: "Smoky Blend Wood",
      subScent1: "Guaiacwood",
      subScent2: "Amber",
      recommendation: "For the VIP lounge regular, the born entrepreneur with impeccable taste."
    },
    "AC'SCENT 28": {
      name: "Leather",
      description: "A luxurious, warm leather perfume that speaks of craftsmanship and power. Refined and commanding in equal measure.",
      mood: "Luxurious, Warm, Refined, Commanding",
      personality: "For someone with unmistakable authority and impeccable taste.",
      keywords: ["Gourmet", "Collector", "Fine Taste", "Refined", "Sensory"],
      mainScent: "Leather",
      subScent1: "Oud",
      subScent2: "Vanilla",
      recommendation: "For the god of gastronomy and the epitome of refined taste."
    },
    "AC'SCENT 29": {
      name: "Violet",
      description: "A delicate, graceful violet perfume that enchants with quiet beauty. It creates a romantic, feminine atmosphere of artistic flair.",
      mood: "Delicate, Elegant, Romantic, Feminine",
      personality: "For someone with a tender, romantic soul and artistic sensibility.",
      keywords: ["Trendsetter", "Avant-garde", "Fashion", "Artistic", "Pioneer"],
      mainScent: "Violet",
      subScent1: "Iris",
      subScent2: "Cedarwood",
      recommendation: "For the fashion queen who belongs in the front row of every runway show."
    },
    "AC'SCENT 30": {
      name: "Fig",
      description: "A lush, deep fig perfume that wraps you in Mediterranean warmth. It creates a cozy, mature atmosphere of quiet confidence.",
      mood: "Sweet, Cozy, Grounded, Mature",
      personality: "For someone with a warm, seasoned presence and understated grace.",
      keywords: ["Leisure", "Prestige", "Winner", "Wine", "Luxury"],
      mainScent: "Fig",
      subScent1: "Coconut",
      subScent2: "Musk",
      recommendation: "For the life champion whose effortless poise is the very symbol of class."
    }
  },

  ja: {
    "AC'SCENT 01": {
      name: "ブラックベリー",
      description: "甘く濃厚なブラックベリーの香りが魅力的なパフュームです。甘さの中にほのかな酸味が加わり、唯一無二の魅力を放ちます。",
      mood: "甘い, フルーティー, 爽やか, 魅惑的",
      personality: "ユニークで甘い魅力を持つ方にぴったりです。",
      keywords: ["シック", "都会的", "ミニマル", "観察者", "無関心"],
      mainScent: "ブラックベリー",
      subScent1: "ベイリーフ",
      subScent2: "シダーウッド",
      recommendation: "モダンで洗練された20〜30代の男性に特におすすめです。"
    },
    "AC'SCENT 02": {
      name: "マンダリンオレンジ",
      description: "フレッシュで活気あふれるマンダリンオレンジの香りが気分を明るくしてくれるパフュームです。",
      mood: "爽やか, 活気のある, 明るい, エネルギッシュ",
      personality: "明るくポジティブなエネルギーに満ちた方にぴったりです。",
      keywords: ["洗練", "計算された", "ミニマル", "都会のエリート", "完璧"],
      mainScent: "マンダリンオレンジ",
      subScent1: "グレープフルーツ",
      subScent2: "ピオニー",
      recommendation: "都会的で洗練された25〜35歳の女性に特におすすめです。"
    },
    "AC'SCENT 03": {
      name: "ストロベリー",
      description: "甘くみずみずしいストロベリーの香りが魅力的なパフュームです。愛らしくキュートな雰囲気を演出します。",
      mood: "甘い, 愛らしい, キュート, みずみずしい",
      personality: "愛らしくキュートな魅力を持つ方にぴったりです。",
      keywords: ["愛嬌", "甘さ", "可愛さ", "パステル", "はつらつ"],
      mainScent: "ストロベリー",
      subScent1: "ジャスミン",
      subScent2: "バニラ",
      recommendation: "愛らしくロマンティックな感性の20〜30代女性に特におすすめです。"
    },
    "AC'SCENT 04": {
      name: "ベルガモット",
      description: "シトラスとハーブが美しく調和したベルガモットのパフュームです。爽やかでありながら優雅な印象を与えます。",
      mood: "爽やか, 優雅, 洗練された, すっきり",
      personality: "洗練された優雅さを持つ方にぴったりです。",
      keywords: ["優雅さ", "品格", "余裕", "地中海", "洗練"],
      mainScent: "ベルガモット",
      subScent1: "オレンジフラワー",
      subScent2: "アンバー",
      recommendation: "気品ある30〜50代の男女どちらにもおすすめです。"
    },
    "AC'SCENT 05": {
      name: "ビターオレンジ",
      description: "ほろ苦いオレンジの香りが独特の魅力を放つパフュームです。爽やかでありながら奥深い香りが長く続きます。",
      mood: "ほろ苦い, 独特な, 奥深い, 成熟した",
      personality: "独特で深みのある魅力を持つ方にぴったりです。",
      keywords: ["カリスマ", "強烈", "圧倒的", "ボス", "存在感"],
      mainScent: "ビターオレンジ",
      subScent1: "ジュニパーベリー",
      subScent2: "スパイシーウッディアコード",
      recommendation: "カリスマ性と自信にあふれた30〜45歳の男性に特におすすめです。"
    },
    "AC'SCENT 06": {
      name: "キャロット",
      description: "甘くアーシーな香りが独特なキャロットのパフュームです。心地よくユニークな雰囲気を演出します。",
      mood: "心地よい, ユニーク, ナチュラル, 甘い",
      personality: "穏やかでありながら個性的な方にぴったりです。",
      keywords: ["ナチュラリスト", "ウェルネス", "澄んだ", "瞑想", "健康的"],
      mainScent: "キャロット",
      subScent1: "グレープフルーツ",
      subScent2: "ロータス",
      recommendation: "ナチュラルで健やかな美しさを求める25〜40代の女性に特におすすめです。"
    },
    "AC'SCENT 07": {
      name: "ローズ",
      description: "優雅で高貴なバラの香りが魅力的なパフュームです。ロマンティックでフェミニンな雰囲気を演出します。",
      mood: "優雅, ロマンティック, フェミニン, 高貴",
      personality: "優雅でロマンティックな魅力を持つ方にぴったりです。",
      keywords: ["優雅さ", "高級", "クラシック", "オールドマネー", "品格"],
      mainScent: "ローズ",
      subScent1: "ダマスクローズ",
      subScent2: "ムスク",
      recommendation: "優美で成熟した魅力のある35〜50代の女性に特におすすめです。"
    },
    "AC'SCENT 08": {
      name: "チュベローズ",
      description: "強烈で官能的なチュベローズの香りが魅力的なパフュームです。深みのある印象的な香りが長く続きます。",
      mood: "強烈, 官能的, 奥深い, 印象的",
      personality: "強烈で深い魅力を持つ方にぴったりです。",
      keywords: ["華やか", "カリスマ", "魅惑的", "純白", "強烈"],
      mainScent: "チュベローズ",
      subScent1: "ホワイトフローラル",
      subScent2: "フリージア",
      recommendation: "優雅で洗練された魅力のある30〜45歳の女性に特におすすめです。"
    },
    "AC'SCENT 09": {
      name: "オレンジブロッサム",
      description: "爽やかで華やかなオレンジの花の香りが魅力的なパフュームです。明るく愛らしい雰囲気を演出します。",
      mood: "華やか, 爽やか, 愛らしい, 春のような",
      personality: "華やかで愛らしい魅力を持つ方にぴったりです。",
      keywords: ["洗練", "フレンチシック", "都会的", "優雅", "パリジェンヌ"],
      mainScent: "オレンジブロッサム",
      subScent1: "ジャスミン",
      subScent2: "トンカビーン",
      recommendation: "洗練された自信ある30〜40代の女性に特におすすめです。"
    },
    "AC'SCENT 10": {
      name: "チューリップ",
      description: "清々しく澄んだチューリップの香りが魅力的なパフュームです。すっきりと優雅な雰囲気を演出します。",
      mood: "清々しい, 澄んだ, すっきり, 優雅",
      personality: "清潔感と上品さを兼ね備えた方にぴったりです。",
      keywords: ["純粋さ", "清楚", "輝く", "清潔感", "優雅さ"],
      mainScent: "チューリップ",
      subScent1: "シクラメン",
      subScent2: "ライラック",
      recommendation: "澄んだ純粋なイメージの25〜35歳の女性に特におすすめです。"
    },
    "AC'SCENT 11": {
      name: "ライム",
      description: "爽やかで弾けるようなライムの香りが魅力的なパフュームです。活気に満ちたフレッシュな雰囲気を演出します。",
      mood: "爽やか, 活気のある, 弾ける, フレッシュ",
      personality: "活気にあふれ、フレッシュな魅力を持つ方にぴったりです。",
      keywords: ["余裕", "クール", "自由", "リゾート", "清涼感"],
      mainScent: "ライム",
      subScent1: "バジル",
      subScent2: "アンバーウッド",
      recommendation: "アクティブで自由なライフスタイルを持つ25〜40代の男女におすすめです。"
    },
    "AC'SCENT 12": {
      name: "スズラン",
      description: "繊細で純粋なスズランの香りが魅力的なパフュームです。清楚で清らかな雰囲気を演出します。",
      mood: "繊細, 純粋, 清楚, 清らか",
      personality: "純粋で清楚な魅力を持つ方にぴったりです。",
      keywords: ["繊細さ", "静けさ", "優雅さ", "芸術的", "清楚"],
      mainScent: "スズラン",
      subScent1: "ピンクフリージア",
      subScent2: "ジャスミン",
      recommendation: "優雅で繊細な魅力のある28〜38歳の女性に特におすすめです。"
    },
    "AC'SCENT 13": {
      name: "ユズ",
      description: "爽やかで甘いユズの香りが魅力的なパフュームです。明るく活気のある雰囲気を演出します。",
      mood: "爽やか, 甘い, 明るい, 活気のある",
      personality: "明るく活力に満ちた方にぴったりです。",
      keywords: ["活力", "健康", "エネルギー", "生気", "清涼"],
      mainScent: "ユズ",
      subScent1: "ローズマリー",
      subScent2: "ミント",
      recommendation: "生き生きとしたエネルギーに満ちた25〜40代の男女におすすめです。"
    },
    "AC'SCENT 14": {
      name: "ミント",
      description: "ひんやりと清涼感のあるミントの香りが魅力的なパフュームです。すっきりと清潔な雰囲気を演出します。",
      mood: "ひんやり, 清涼, 爽快, すっきり",
      personality: "清涼感と爽やかな魅力を持つ方にぴったりです。",
      keywords: ["完璧主義", "清涼感", "清潔感", "整理整頓", "爽やかさ"],
      mainScent: "ミント",
      subScent1: "ジャスミン",
      subScent2: "マテの葉",
      recommendation: "清潔感と洗練された感覚を持つ28〜42歳の男女におすすめです。"
    },
    "AC'SCENT 15": {
      name: "プチグレン",
      description: "爽やかでありながら優雅なプチグレンの香りが魅力的なパフュームです。洗練されたすっきりとした雰囲気を演出します。",
      mood: "爽やか, 優雅, 洗練された, すっきり",
      personality: "洗練された優雅さを持つ方にぴったりです。",
      keywords: ["リゾート", "旅", "セレブ", "自由", "余裕"],
      mainScent: "プチグレン",
      subScent1: "ビターオレンジ",
      subScent2: "グレープフルーツ",
      recommendation: "活気に満ちた洗練された30〜45歳の男女におすすめです。"
    },
    "AC'SCENT 16": {
      name: "サンダルウッド",
      description: "温かく滑らかなサンダルウッドの香りが魅力的なパフュームです。深みのある穏やかな雰囲気を演出します。",
      mood: "温かい, 滑らか, 奥深い, 穏やか",
      personality: "温かみのある落ち着いた魅力を持つ方にぴったりです。",
      keywords: ["重厚感", "深み", "紳士的", "知的", "高級感"],
      mainScent: "サンダルウッド",
      subScent1: "アンブロキサン",
      subScent2: "パピルス",
      recommendation: "カリスマと成熟した魅力のある35〜50代の男女におすすめです。"
    },
    "AC'SCENT 17": {
      name: "レモンペッパー",
      description: "爽やかなレモンとスパイシーなペッパーが調和したパフュームです。個性的で活気あるセンスの良い雰囲気を演出します。",
      mood: "爽やか, スパイシー, 個性的, 活気のある",
      personality: "個性的でセンスのある魅力を持つ方にぴったりです。",
      keywords: ["芸術的", "自由", "ユニーク", "クリエイティブ", "非主流"],
      mainScent: "レモンペッパー",
      subScent1: "インセンス",
      subScent2: "オリス",
      recommendation: "自由で洗練された感覚を持つ28〜45歳の男女におすすめです。"
    },
    "AC'SCENT 18": {
      name: "ピンクペッパー",
      description: "甘くスパイシーなピンクペッパーの香りが魅力的なパフュームです。ユニークで洗練された雰囲気を演出します。",
      mood: "甘い, スパイシー, ユニーク, 洗練された",
      personality: "ユニークで洗練された魅力を持つ方にぴったりです。",
      keywords: ["多忙", "仕事人間", "都会的", "効率的", "現代的"],
      mainScent: "ピンクペッパー",
      subScent1: "ナツメグ",
      subScent2: "ミント",
      recommendation: "都会的で洗練された30〜45歳の男性に特におすすめです。"
    },
    "AC'SCENT 19": {
      name: "シーソルト",
      description: "ひんやりと清涼感のあるシーソルトの香りが魅力的なパフュームです。清潔で爽やかな雰囲気を演出します。",
      mood: "ひんやり, 清涼, 清潔, 爽快",
      personality: "清潔感と爽やかさを持つ方にぴったりです。",
      keywords: ["自由", "海", "清涼感", "ナチュラル", "冒険"],
      mainScent: "シーソルト",
      subScent1: "セージ",
      subScent2: "ムスク",
      recommendation: "裸足で砂を踏む瞬間が人生最高の幸せである自由な魂の持ち主に。"
    },
    "AC'SCENT 20": {
      name: "タイム",
      description: "ハーブの力強い香りが特徴的なタイムのパフュームです。爽やかでありながら奥深い香りが魅力的です。",
      mood: "爽快, ハーバル, 奥深い, ナチュラル",
      personality: "自然体でありながら深みのある魅力を持つ方にぴったりです。",
      keywords: ["均衡", "ミステリー", "アナログ", "自然", "都市"],
      mainScent: "タイム",
      subScent1: "シダーウッド",
      subScent2: "ベチバー",
      recommendation: "都市と森の間でバランスを見つけたミステリアスな存在に。"
    },
    "AC'SCENT 21": {
      name: "ムスク",
      description: "柔らかく温かなムスクの香りが魅力的なパフュームです。セクシーで包み込むような雰囲気を演出します。",
      mood: "柔らかい, 温かい, セクシー, 包み込む",
      personality: "柔らかくセクシーな魅力を持つ方にぴったりです。",
      keywords: ["優雅さ", "品格", "高級", "パリジャン", "文化的"],
      mainScent: "ムスク",
      subScent1: "アンバー",
      subScent2: "バニラ",
      recommendation: "優雅さが天職にして使命である現代の貴族のような方に。"
    },
    "AC'SCENT 22": {
      name: "ホワイトローズ",
      description: "純粋で優雅なホワイトローズの香りが魅力的なパフュームです。清らかでロマンティックな雰囲気を演出します。",
      mood: "純粋, 優雅, 清らか, ロマンティック",
      personality: "純粋でロマンティックな魅力を持つ方にぴったりです。",
      keywords: ["純白", "清楚", "浄化", "天使", "輝く"],
      mainScent: "ホワイトローズ",
      subScent1: "ピオニー",
      subScent2: "ムスク",
      recommendation: "純白のオーラであらゆる空間を浄化する清楚の女神に。"
    },
    "AC'SCENT 23": {
      name: "スウェード",
      description: "柔らかく温かなスウェードの香りが魅力的なパフュームです。心地よく上質な雰囲気を演出します。",
      mood: "柔らかい, 温かい, 心地よい, 上質",
      personality: "心地よさと上品さを兼ね備えた方にぴったりです。",
      keywords: ["洗練", "文化的", "スタイル", "都会的", "ブティック"],
      mainScent: "スウェード",
      subScent1: "アイリス",
      subScent2: "アンバーウッド",
      recommendation: "都市のカルチャーエリート、スタイルがDNAに刻まれた方に。"
    },
    "AC'SCENT 24": {
      name: "イタリアンマンダリン",
      description: "爽やかで活気あふれるイタリアンマンダリンの香りが魅力的なパフュームです。明るくエネルギッシュな雰囲気を演出します。",
      mood: "爽やか, 活気のある, 明るい, エネルギッシュ",
      personality: "明るくエネルギッシュな魅力を持つ方にぴったりです。",
      keywords: ["魅惑的", "フェロモン", "ナチュラル", "センシュアル", "天性"],
      mainScent: "イタリアンマンダリン",
      subScent1: "ネロリ",
      subScent2: "ムスク",
      recommendation: "存在そのものが魅惑的な、自然からの贈り物のような方に。"
    },
    "AC'SCENT 25": {
      name: "ラベンダー",
      description: "穏やかで安らぐラベンダーの香りが魅力的なパフュームです。落ち着いた癒しの雰囲気を演出します。",
      mood: "穏やか, 安定した, 落ち着いた, 癒される",
      personality: "落ち着いた穏やかな魅力を持つ方にぴったりです。",
      keywords: ["知的", "重厚感", "深みのある", "ジャズ", "ウイスキー"],
      mainScent: "ラベンダー",
      subScent1: "トンカビーン",
      subScent2: "サンダルウッド",
      recommendation: "深い対話ができる知的魅力の達人に。"
    },
    "AC'SCENT 26": {
      name: "イタリアンサイプレス",
      description: "ウッディでひんやりとしたサイプレスの香りが魅力的なパフュームです。自然で神秘的な雰囲気を演出します。",
      mood: "ウッディ, ひんやり, ナチュラル, 神秘的",
      personality: "自然体で神秘的な魅力を持つ方にぴったりです。",
      keywords: ["ミステリー", "闇", "カリスマ", "謎", "夜"],
      mainScent: "イタリアンサイプレス",
      subScent1: "ジュニパー",
      subScent2: "ベチバー",
      recommendation: "夜の帝王と呼ばれる、闇のカリスマを持つ方に。"
    },
    "AC'SCENT 27": {
      name: "スモーキーブレンドウッド",
      description: "深くスモーキーなウッドの香りが魅力的なパフュームです。神秘的で力強い雰囲気を演出します。",
      mood: "スモーキー, 深い, 神秘的, 強烈",
      personality: "深みと神秘的な魅力を持つ方にぴったりです。",
      keywords: ["品格", "成功", "VIP", "深み", "実業家"],
      mainScent: "スモーキーブレンドウッド",
      subScent1: "ガイアックウッド",
      subScent2: "アンバー",
      recommendation: "VIPラウンジの常連、生まれながらの実業家の方に。"
    },
    "AC'SCENT 28": {
      name: "レザー",
      description: "高級感のある温かなレザーの香りが魅力的なパフュームです。洗練されたカリスマ的な雰囲気を演出します。",
      mood: "高級, 温かい, 洗練された, カリスマ的",
      personality: "洗練されたカリスマ的な魅力を持つ方にぴったりです。",
      keywords: ["美食家", "コレクター", "高級趣味", "洗練", "感性的"],
      mainScent: "レザー",
      subScent1: "ウード",
      subScent2: "バニラ",
      recommendation: "美食の神、洗練された趣味の体現者のような方に。"
    },
    "AC'SCENT 29": {
      name: "バイオレット",
      description: "繊細で優雅なバイオレットの香りが魅力的なパフュームです。ロマンティックでフェミニンな雰囲気を演出します。",
      mood: "繊細, 優雅, ロマンティック, フェミニン",
      personality: "繊細でロマンティックな魅力を持つ方にぴったりです。",
      keywords: ["トレンド", "アヴァンギャルド", "ファッション", "芸術的", "先駆者"],
      mainScent: "バイオレット",
      subScent1: "アイリス",
      subScent2: "シダーウッド",
      recommendation: "ファッションウィークの最前列に座らずにはいられないトレンドの女王に。"
    },
    "AC'SCENT 30": {
      name: "フィグ",
      description: "甘くも奥深いフィグの香りが魅力的なパフュームです。包み込むような安定感と成熟した雰囲気を演出します。",
      mood: "甘い, 包み込む, 安定した, 成熟した",
      personality: "包容力と成熟した魅力を持つ方にぴったりです。",
      keywords: ["余裕", "品格", "勝利者", "ワイン", "高級"],
      mainScent: "フィグ",
      subScent1: "ココナッツ",
      subScent2: "ムスク",
      recommendation: "人生の勝利者、余裕が体に染み込んだ品格の象徴のような方に。"
    }
  },

  zh: {
    "AC'SCENT 01": {
      name: "黑莓",
      description: "一款以浓郁甜美的黑莓香气为主调的迷人香水。甜中带酸的独特层次，散发着无法抗拒的魅力。",
      mood: "甜美, 果香, 清新, 迷人",
      personality: "适合拥有独特甜美魅力的人。",
      keywords: ["时髦", "都市感", "极简", "观察者", "疏离感"],
      mainScent: "黑莓",
      subScent1: "月桂叶",
      subScent2: "雪松木",
      recommendation: "特别适合现代时尚的20至30岁男性。"
    },
    "AC'SCENT 02": {
      name: "柑橘",
      description: "清新活力的柑橘香气，瞬间点亮心情的活力之香。充满阳光般的正能量。",
      mood: "清新, 活力, 明朗, 能量满满",
      personality: "适合阳光开朗、充满正能量的人。",
      keywords: ["精致", "有策略", "极简", "都市精英", "完美主义"],
      mainScent: "柑橘",
      subScent1: "葡萄柚",
      subScent2: "牡丹",
      recommendation: "特别适合都市时尚的25至35岁女性。"
    },
    "AC'SCENT 03": {
      name: "草莓",
      description: "一款以甜美清新的草莓香气为主调的迷人香水。营造出可爱甜蜜的少女氛围。",
      mood: "甜美, 可爱, 萌系, 清新",
      personality: "适合拥有可爱甜美魅力的人。",
      keywords: ["撒娇", "甜蜜", "可爱", "粉彩", "活泼"],
      mainScent: "草莓",
      subScent1: "茉莉",
      subScent2: "香草",
      recommendation: "特别适合浪漫可爱的20至30岁女性。"
    },
    "AC'SCENT 04": {
      name: "佛手柑",
      description: "柑橘与草本完美融合的佛手柑香水。清爽之中尽显优雅气质。",
      mood: "清爽, 优雅, 精致, 干净",
      personality: "适合气质优雅、举止从容的人。",
      keywords: ["优雅", "品位", "从容", "地中海", "精致"],
      mainScent: "佛手柑",
      subScent1: "橙花",
      subScent2: "琥珀",
      recommendation: "适合30至50岁具有优雅品位的男女。"
    },
    "AC'SCENT 05": {
      name: "苦橙",
      description: "苦橙的微苦香气散发着独特魅力的香水。清新却深邃的香调持久悠长。",
      mood: "微苦, 独特, 深邃, 成熟",
      personality: "适合拥有独特深沉魅力的人。",
      keywords: ["领袖气质", "强烈", "压倒性", "王者风范", "气场"],
      mainScent: "苦橙",
      subScent1: "杜松子",
      subScent2: "辛辣木质调",
      recommendation: "特别适合充满气场和自信的30至45岁男性。"
    },
    "AC'SCENT 06": {
      name: "胡萝卜",
      description: "一款带有甜蜜泥土气息的独特胡萝卜香水。营造舒适而别具一格的氛围。",
      mood: "舒适, 独特, 自然, 甜美",
      personality: "适合温和舒适又有独特个性的人。",
      keywords: ["自然主义", "健康生活", "清澈", "冥想", "健康"],
      mainScent: "胡萝卜",
      subScent1: "葡萄柚",
      subScent2: "莲花",
      recommendation: "特别适合追求自然健康之美的25至40岁女性。"
    },
    "AC'SCENT 07": {
      name: "玫瑰",
      description: "一款以优雅奢华的玫瑰香气为主调的迷人香水。营造浪漫而女性化的典雅氛围。",
      mood: "优雅, 浪漫, 女性化, 奢华",
      personality: "适合优雅浪漫、气质出众的人。",
      keywords: ["优雅", "奢华", "经典", "旧钱风", "品位"],
      mainScent: "玫瑰",
      subScent1: "大马士革玫瑰",
      subScent2: "麝香",
      recommendation: "特别适合优美成熟的35至50岁女性。"
    },
    "AC'SCENT 08": {
      name: "晚香玉",
      description: "浓烈而感性的晚香玉香气令人难以忘怀。深邃而印象深刻的香调持久留香。",
      mood: "浓烈, 感性, 深邃, 印象深刻",
      personality: "适合拥有强烈深邃魅力的人。",
      keywords: ["华丽", "领袖气质", "魅惑", "纯白", "强烈"],
      mainScent: "晚香玉",
      subScent1: "白花调",
      subScent2: "小苍兰",
      recommendation: "特别适合优雅精致的30至45岁女性。"
    },
    "AC'SCENT 09": {
      name: "橙花",
      description: "清新华丽的橙花香气令人心旷神怡。营造明朗而甜美的春日氛围。",
      mood: "华丽, 清新, 可爱, 春天般的",
      personality: "适合华丽而可爱、魅力四射的人。",
      keywords: ["精致", "法式优雅", "都市感", "优雅", "巴黎风"],
      mainScent: "橙花",
      subScent1: "茉莉",
      subScent2: "零陵香豆",
      recommendation: "特别适合精致自信的30至40岁女性。"
    },
    "AC'SCENT 10": {
      name: "郁金香",
      description: "清新纯净的郁金香香气令人心旷神怡。营造利落优雅的清新氛围。",
      mood: "清新, 纯净, 利落, 优雅",
      personality: "适合气质干净优雅的人。",
      keywords: ["纯洁", "清纯", "闪耀", "洁净", "优雅"],
      mainScent: "郁金香",
      subScent1: "仙客来",
      subScent2: "丁香花",
      recommendation: "特别适合纯净清新的25至35岁女性。"
    },
    "AC'SCENT 11": {
      name: "青柠",
      description: "清爽刺激的青柠香气令人精神振奋。营造活力四射的清新氛围。",
      mood: "清爽, 活力, 刺激, 清新",
      personality: "适合充满活力和清新魅力的人。",
      keywords: ["从容", "酷", "自由", "度假", "清凉"],
      mainScent: "青柠",
      subScent1: "罗勒",
      subScent2: "琥珀木",
      recommendation: "适合热爱自由活跃生活方式的25至40岁男女。"
    },
    "AC'SCENT 12": {
      name: "铃兰",
      description: "细腻纯净的铃兰香气令人心醉。营造清纯洁净的淡雅氛围。",
      mood: "细腻, 纯净, 清纯, 洁净",
      personality: "适合纯净清纯、气质脱俗的人。",
      keywords: ["细腻", "安静", "优雅", "艺术感", "清雅"],
      mainScent: "铃兰",
      subScent1: "粉色小苍兰",
      subScent2: "茉莉",
      recommendation: "特别适合优雅细腻的28至38岁女性。"
    },
    "AC'SCENT 13": {
      name: "柚子",
      description: "清新甜美的柚子香气令人愉悦。营造明亮活力的阳光氛围。",
      mood: "清新, 甜美, 明朗, 活力",
      personality: "适合阳光开朗、充满活力的人。",
      keywords: ["活力", "健康", "能量", "生机", "清爽"],
      mainScent: "柚子",
      subScent1: "迷迭香",
      subScent2: "薄荷",
      recommendation: "适合充满生命力和活力的25至40岁男女。"
    },
    "AC'SCENT 14": {
      name: "薄荷",
      description: "清凉提神的薄荷香气令人精神焕发。营造清爽利落的洁净氛围。",
      mood: "清凉, 提神, 爽快, 利落",
      personality: "适合追求清爽利落生活方式的人。",
      keywords: ["完美主义", "清凉", "洁净", "井然有序", "清爽"],
      mainScent: "薄荷",
      subScent1: "茉莉",
      subScent2: "马黛叶",
      recommendation: "适合注重品质的28至42岁男女。"
    },
    "AC'SCENT 15": {
      name: "苦橙叶",
      description: "清新而优雅的苦橙叶香气令人心旷神怡。营造精致利落的高级氛围。",
      mood: "清新, 优雅, 精致, 利落",
      personality: "适合精致优雅、从容不迫的人。",
      keywords: ["度假", "旅行", "名流", "自在", "从容"],
      mainScent: "苦橙叶",
      subScent1: "苦橙",
      subScent2: "葡萄柚",
      recommendation: "适合活力精致的30至45岁男女。"
    },
    "AC'SCENT 16": {
      name: "檀香木",
      description: "温暖柔和的檀香木香气令人安心。营造深沉而宁静的温馨氛围。",
      mood: "温暖, 柔和, 深邃, 宁静",
      personality: "适合温暖稳重、令人安心的人。",
      keywords: ["沉稳", "深度", "绅士", "知性", "高级感"],
      mainScent: "檀香木",
      subScent1: "龙涎酮",
      subScent2: "纸莎草",
      recommendation: "适合有领袖气质的成熟35至50岁男女。"
    },
    "AC'SCENT 17": {
      name: "柠檬胡椒",
      description: "清新柠檬与辛辣胡椒巧妙融合的香水。营造别出心裁、活力满满的氛围。",
      mood: "清新, 辛辣, 独特, 活力",
      personality: "适合别具一格、品味独到的人。",
      keywords: ["艺术感", "自由", "独特", "创意", "非主流"],
      mainScent: "柠檬胡椒",
      subScent1: "焚香",
      subScent2: "鸢尾根",
      recommendation: "适合自由不羁又精致的28至45岁男女。"
    },
    "AC'SCENT 18": {
      name: "粉红胡椒",
      description: "甜美与辛辣交织的粉红胡椒香水。营造独特而精致的迷人氛围。",
      mood: "甜美, 辛辣, 独特, 精致",
      personality: "适合拥有独特精致品味的人。",
      keywords: ["忙碌", "工作狂", "都市感", "高效", "现代"],
      mainScent: "粉红胡椒",
      subScent1: "肉豆蔻",
      subScent2: "薄荷",
      recommendation: "特别适合都市精英30至45岁男性。"
    },
    "AC'SCENT 19": {
      name: "海盐",
      description: "清凉舒爽的海盐香气仿佛海风拂面。营造洁净清新的自由氛围。",
      mood: "清凉, 清爽, 洁净, 舒畅",
      personality: "适合热爱大自然、追求自由的人。",
      keywords: ["自由", "大海", "清爽", "自然", "冒险"],
      mainScent: "海盐",
      subScent1: "鼠尾草",
      subScent2: "麝香",
      recommendation: "赤脚踩沙便是人生至福的自由灵魂。"
    },
    "AC'SCENT 20": {
      name: "百里香",
      description: "草本气息浓郁的百里香香水。清新中蕴含深邃的层次感。",
      mood: "清爽, 草本, 深邃, 自然",
      personality: "适合崇尚自然、内心深邃的人。",
      keywords: ["平衡", "神秘", "复古", "自然", "都市"],
      mainScent: "百里香",
      subScent1: "雪松木",
      subScent2: "香根草",
      recommendation: "在城市与森林之间找到平衡的神秘存在。"
    },
    "AC'SCENT 21": {
      name: "麝香",
      description: "柔软温暖的麝香香气令人沉醉。营造性感而温馨的亲密氛围。",
      mood: "柔软, 温暖, 性感, 温馨",
      personality: "适合温柔性感、魅力天成的人。",
      keywords: ["优雅", "品位", "奢华", "巴黎风", "文化"],
      mainScent: "麝香",
      subScent1: "琥珀",
      subScent2: "香草",
      recommendation: "以优雅为天职和使命的当代贵族。"
    },
    "AC'SCENT 22": {
      name: "白玫瑰",
      description: "纯净优雅的白玫瑰香气令人心醉。营造洁净而浪漫的纯美氛围。",
      mood: "纯净, 优雅, 洁净, 浪漫",
      personality: "适合纯净浪漫、气质清雅的人。",
      keywords: ["纯白", "清纯", "净化", "天使", "闪耀"],
      mainScent: "白玫瑰",
      subScent1: "牡丹",
      subScent2: "麝香",
      recommendation: "以纯白之光净化一切空间的清纯女神。"
    },
    "AC'SCENT 23": {
      name: "麂皮",
      description: "柔软温暖的麂皮香气令人倍感奢华。营造舒适而高雅的精致氛围。",
      mood: "柔软, 温暖, 舒适, 奢华",
      personality: "适合自然散发高级感的人。",
      keywords: ["精致", "文化", "风格", "都市感", "精品店"],
      mainScent: "麂皮",
      subScent1: "鸢尾花",
      subScent2: "琥珀木",
      recommendation: "都市文化精英，风格刻入DNA的人。"
    },
    "AC'SCENT 24": {
      name: "意大利柑橘",
      description: "清新活力的意大利柑橘香气充满地中海阳光。明朗而充满能量。",
      mood: "清新, 活力, 明朗, 能量满满",
      personality: "适合天生魅力四射、活力无限的人。",
      keywords: ["魅惑", "荷尔蒙", "自然", "感性", "天生"],
      mainScent: "意大利柑橘",
      subScent1: "橙花油",
      subScent2: "麝香",
      recommendation: "存在本身就令人着迷的、如大自然馈赠般的人。"
    },
    "AC'SCENT 25": {
      name: "薰衣草",
      description: "舒缓安宁的薰衣草香气令人放松身心。营造宁静治愈的美好氛围。",
      mood: "舒缓, 安宁, 沉静, 治愈",
      personality: "适合沉稳温和、令人安心的人。",
      keywords: ["知性", "沉稳", "深度", "爵士", "威士忌"],
      mainScent: "薰衣草",
      subScent1: "零陵香豆",
      subScent2: "檀香木",
      recommendation: "能进行深度对话的知性魅力大师。"
    },
    "AC'SCENT 26": {
      name: "意大利柏树",
      description: "木质清凉的柏树香气令人精神振奋。营造自然而神秘的高级氛围。",
      mood: "木质, 清凉, 自然, 神秘",
      personality: "适合拥有自然神秘气质的人。",
      keywords: ["神秘", "暗夜", "气场", "谜", "夜"],
      mainScent: "意大利柏树",
      subScent1: "杜松",
      subScent2: "香根草",
      recommendation: "被称为暗夜之王、拥有黑暗气场的人。"
    },
    "AC'SCENT 27": {
      name: "烟熏混合木",
      description: "深邃烟熏的木质香气令人着迷。营造神秘而强大的王者氛围。",
      mood: "烟熏, 深邃, 神秘, 强烈",
      personality: "适合深沉而神秘、令人敬畏的人。",
      keywords: ["品位", "成功", "贵宾", "深度", "企业家"],
      mainScent: "烟熏混合木",
      subScent1: "愈创木",
      subScent2: "琥珀",
      recommendation: "VIP休息室的常客，天生的商界精英。"
    },
    "AC'SCENT 28": {
      name: "皮革",
      description: "奢华温暖的皮革香气散发着尊贵气息。精致而充满领袖风范。",
      mood: "奢华, 温暖, 精致, 气场强大",
      personality: "适合品味卓越、气场强大的人。",
      keywords: ["美食家", "收藏家", "高级品味", "精致", "感官"],
      mainScent: "皮革",
      subScent1: "沉香",
      subScent2: "香草",
      recommendation: "美食之神，精致品味的典范。"
    },
    "AC'SCENT 29": {
      name: "紫罗兰",
      description: "细腻优雅的紫罗兰香气令人陶醉。营造浪漫而女性化的艺术氛围。",
      mood: "细腻, 优雅, 浪漫, 女性化",
      personality: "适合细腻浪漫、艺术感十足的人。",
      keywords: ["潮流", "前卫", "时尚", "艺术感", "先锋"],
      mainScent: "紫罗兰",
      subScent1: "鸢尾花",
      subScent2: "雪松木",
      recommendation: "非坐在时装周前排不可的潮流女王。"
    },
    "AC'SCENT 30": {
      name: "无花果",
      description: "甜美而深邃的无花果香气令人沉醉。营造温馨稳重的成熟氛围。",
      mood: "甜美, 温馨, 稳重, 成熟",
      personality: "适合温暖成熟、从容优雅的人。",
      keywords: ["从容", "品位", "赢家", "红酒", "奢华"],
      mainScent: "无花果",
      subScent1: "椰子",
      subScent2: "麝香",
      recommendation: "人生赢家，从容优雅已融入骨血的品位象征。"
    }
  },

  es: {
    "AC'SCENT 01": {
      name: "Mora",
      description: "Un perfume cautivador con un aroma dulce e intenso a mora. Su mezcla de dulzura y sutil acidez crea un encanto irresistible.",
      mood: "Dulce, Afrutado, Fresco, Cautivador",
      personality: "Ideal para alguien con un encanto dulce y magnético.",
      keywords: ["Chic", "Urbano", "Minimalista", "Observador", "Despreocupado"],
      mainScent: "Mora",
      subScent1: "Hoja de Laurel",
      subScent2: "Madera de Cedro",
      recommendation: "Especialmente indicado para hombres modernos y sofisticados de 20 a 30 anos."
    },
    "AC'SCENT 02": {
      name: "Mandarina",
      description: "Un perfume vibrante y energizante que desborda frescura de mandarina. Ilumina el animo y contagia positividad.",
      mood: "Fresco, Vibrante, Luminoso, Energetico",
      personality: "Para quien irradia energia positiva y entusiasmo contagioso.",
      keywords: ["Sofisticado", "Calculado", "Minimalista", "Elite urbana", "Impecable"],
      mainScent: "Mandarina",
      subScent1: "Pomelo",
      subScent2: "Peonia",
      recommendation: "Especialmente indicado para mujeres sofisticadas y elegantes de 25 a 35 anos."
    },
    "AC'SCENT 03": {
      name: "Fresa",
      description: "Un perfume dulce y jugoso de fresa que enamora al instante. Crea una atmosfera adorable y encantadora donde quiera que vayas.",
      mood: "Dulce, Adorable, Tierno, Fresco",
      personality: "Ideal para alguien con un encanto irresistiblemente tierno y adorable.",
      keywords: ["Coqueto", "Dulce", "Tierno", "Pastel", "Vivaz"],
      mainScent: "Fresa",
      subScent1: "Jazmin",
      subScent2: "Vainilla",
      recommendation: "Especialmente indicado para mujeres romanticas y soniadoras de 20 a 30 anos."
    },
    "AC'SCENT 04": {
      name: "Bergamota",
      description: "Una armoniosa fusion de citricos y notas herbales en un perfume de bergamota. Refrescante y al mismo tiempo elegantemente sofisticado.",
      mood: "Refrescante, Elegante, Refinado, Limpio",
      personality: "Creado para quien irradia sofisticacion y elegancia natural.",
      keywords: ["Elegancia", "Prestigio", "Serenidad", "Mediterraneo", "Sofisticacion"],
      mainScent: "Bergamota",
      subScent1: "Flor de Naranjo",
      subScent2: "Ambar",
      recommendation: "Para hombres y mujeres de 30 a 50 anos que llevan la distincion con naturalidad."
    },
    "AC'SCENT 05": {
      name: "Naranja Amarga",
      description: "Un perfume con el distintivo encanto agridulce de la naranja amarga. Su caracter fresco y profundo deja una huella memorable.",
      mood: "Agridulce, Distintivo, Profundo, Maduro",
      personality: "Para quien posee una presencia imponente y profundamente cautivadora.",
      keywords: ["Carisma", "Intensidad", "Imponente", "Energia de lider", "Presencia"],
      mainScent: "Naranja Amarga",
      subScent1: "Baya de Enebro",
      subScent2: "Acorde Amaderado Especiado",
      recommendation: "Especialmente indicado para hombres carismaticos y seguros de 30 a 45 anos."
    },
    "AC'SCENT 06": {
      name: "Zanahoria",
      description: "Un perfume singular con notas dulces y terrosas de zanahoria. Crea una atmosfera acogedora y sorprendentemente original.",
      mood: "Acogedor, Singular, Natural, Dulce",
      personality: "Para alguien que combina calidez natural con una personalidad unica.",
      keywords: ["Naturalista", "Bienestar", "Pureza", "Meditacion", "Salud"],
      mainScent: "Zanahoria",
      subScent1: "Pomelo",
      subScent2: "Loto",
      recommendation: "Especialmente indicado para mujeres de 25 a 40 anos que abrazan la belleza natural."
    },
    "AC'SCENT 07": {
      name: "Rosa",
      description: "Un perfume de rosa elegante y lujoso que cautiva con cada nota. Crea un ambiente romantico y femenino de belleza atemporal.",
      mood: "Elegante, Romantico, Femenino, Lujoso",
      personality: "Para quien encarna la elegancia clasica y el encanto romantico.",
      keywords: ["Elegancia", "Lujo", "Clasico", "Vieja escuela", "Prestigio"],
      mainScent: "Rosa",
      subScent1: "Rosa de Damasco",
      subScent2: "Almizcle",
      recommendation: "Especialmente indicado para mujeres elegantes y refinadas de 35 a 50 anos."
    },
    "AC'SCENT 08": {
      name: "Nardo",
      description: "Un perfume de nardo intenso y sensual que deja una impresion imborrable. Su rica profundidad perdura bellamente en la piel.",
      mood: "Intenso, Sensual, Profundo, Impactante",
      personality: "Para alguien con una presencia poderosa y profundamente magnetica.",
      keywords: ["Glamuroso", "Carismatico", "Encantador", "Pureza blanca", "Intenso"],
      mainScent: "Nardo",
      subScent1: "Floral Blanco",
      subScent2: "Fresia",
      recommendation: "Especialmente indicado para mujeres elegantes y sofisticadas de 30 a 45 anos."
    },
    "AC'SCENT 09": {
      name: "Azahar",
      description: "Un perfume radiante y fresco de azahar que florece con calidez. Crea un ambiente luminoso y adorable como un jardin primaveral.",
      mood: "Radiante, Fresco, Adorable, Primaveral",
      personality: "Para quien ilumina cualquier espacio con calidez y gracia.",
      keywords: ["Refinado", "Chic frances", "Urbano", "Elegante", "Parisina"],
      mainScent: "Azahar",
      subScent1: "Jazmin",
      subScent2: "Haba Tonka",
      recommendation: "Especialmente indicado para mujeres seguras y refinadas de 30 a 40 anos."
    },
    "AC'SCENT 10": {
      name: "Tulipan",
      description: "Un perfume de tulipan fresco y nitido que se siente puro y limpio. Crea una atmosfera pulcra y elegante con gracia natural.",
      mood: "Fresco, Cristalino, Limpio, Elegante",
      personality: "Para alguien con una presencia naturalmente limpia y elegante.",
      keywords: ["Pureza", "Inocencia", "Radiante", "Inmaculado", "Gracia"],
      mainScent: "Tulipan",
      subScent1: "Ciclamen",
      subScent2: "Lila",
      recommendation: "Especialmente indicado para mujeres de 25 a 35 anos con una imagen pura y luminosa."
    },
    "AC'SCENT 11": {
      name: "Lima",
      description: "Un perfume de lima chispeante y efervescente que despierta los sentidos. Crea una atmosfera vivaz y refrescante llena de energia.",
      mood: "Chispeante, Vivaz, Efervescente, Fresco",
      personality: "Para quien aporta energia fresca y vitalidad a cada momento.",
      keywords: ["Desenfadado", "Cool", "Libertad", "Resort", "Refrescante"],
      mainScent: "Lima",
      subScent1: "Albahaca",
      subScent2: "Madera de Ambar",
      recommendation: "Para hombres y mujeres activos de 25 a 40 anos que viven con libertad y aventura."
    },
    "AC'SCENT 12": {
      name: "Lirio de los Valles",
      description: "Un perfume delicado y puro de lirio de los valles que susurra con suavidad. Crea una atmosfera inocente y pristina de belleza serena.",
      mood: "Delicado, Puro, Inocente, Pristino",
      personality: "Para alguien que posee una pureza discreta y sin pretensiones.",
      keywords: ["Delicado", "Sereno", "Elegante", "Artistico", "Refinado"],
      mainScent: "Lirio de los Valles",
      subScent1: "Fresia Rosa",
      subScent2: "Jazmin",
      recommendation: "Especialmente indicado para mujeres elegantes y delicadas de 28 a 38 anos."
    },
    "AC'SCENT 13": {
      name: "Yuzu",
      description: "Un perfume de yuzu luminoso y dulce que irradia alegria citrica. Crea un ambiente soleado y animado que eleva cualquier momento.",
      mood: "Citrico, Dulce, Luminoso, Animado",
      personality: "Para quien irradia luz solar y buen humor contagioso.",
      keywords: ["Energetico", "Saludable", "Energia", "Vitalidad", "Nitido"],
      mainScent: "Yuzu",
      subScent1: "Romero",
      subScent2: "Menta",
      recommendation: "Para hombres y mujeres vibrantes y energeticos de 25 a 40 anos."
    },
    "AC'SCENT 14": {
      name: "Menta",
      description: "Un perfume de menta fresco y vigorizante que despeja la mente. Crea una atmosfera nitida y limpia de claridad absoluta.",
      mood: "Fresco, Nitido, Vigorizante, Limpio",
      personality: "Para quien valora la precision y la energia fresca y limpia.",
      keywords: ["Perfeccionista", "Nitido", "Limpio", "Organizado", "Refrescante"],
      mainScent: "Menta",
      subScent1: "Jazmin",
      subScent2: "Hoja de Mate",
      recommendation: "Para hombres y mujeres pulcros y refinados de 28 a 42 anos."
    },
    "AC'SCENT 15": {
      name: "Petitgrain",
      description: "Un perfume de petitgrain fresco y elegante que equilibra brillo citrico con sofisticacion herbal. Limpio y refinado.",
      mood: "Fresco, Elegante, Refinado, Limpio",
      personality: "Para quien lleva la sofisticacion con naturalidad y aplomo.",
      keywords: ["Resort", "Viaje", "Celebridad", "Despreocupado", "Ocio"],
      mainScent: "Petitgrain",
      subScent1: "Naranja Amarga",
      subScent2: "Pomelo",
      recommendation: "Para hombres y mujeres con estilo y energia de 30 a 45 anos."
    },
    "AC'SCENT 16": {
      name: "Sandalo",
      description: "Un perfume de sandalo calido y aterciopelado que te envuelve en confort. Su rica profundidad crea una atmosfera serena y reconfortante.",
      mood: "Calido, Suave, Profundo, Reconfortante",
      personality: "Para alguien de corazon calido y presencia tranquila y firme.",
      keywords: ["Distinguido", "Profundidad", "Caballero", "Intelectual", "Refinado"],
      mainScent: "Sandalo",
      subScent1: "Ambroxan",
      subScent2: "Papiro",
      recommendation: "Para hombres y mujeres carismaticos y maduros de 35 a 50 anos."
    },
    "AC'SCENT 17": {
      name: "Limon y Pimienta",
      description: "Una vibrante fusion de limon fresco y pimienta especiada que sorprende y deleita. Audaz, original y lleno de caracter.",
      mood: "Citrico, Especiado, Singular, Vivaz",
      personality: "Para alguien con ingenio agudo y un estilo inconfundiblemente original.",
      keywords: ["Artistico", "Espiritu libre", "Singular", "Creativo", "Alternativo"],
      mainScent: "Limon y Pimienta",
      subScent1: "Incienso",
      subScent2: "Lirio",
      recommendation: "Para hombres y mujeres libres y estilosos de 28 a 45 anos."
    },
    "AC'SCENT 18": {
      name: "Pimienta Rosa",
      description: "Un perfume de pimienta rosa dulce y especiado con un toque seductor. Crea una atmosfera unicamente sofisticada que perdura.",
      mood: "Dulce, Especiado, Singular, Sofisticado",
      personality: "Para alguien con una combinacion distintiva de refinamiento y audacia.",
      keywords: ["Ocupado", "Adicto al trabajo", "Urbano", "Eficiente", "Moderno"],
      mainScent: "Pimienta Rosa",
      subScent1: "Nuez Moscada",
      subScent2: "Menta",
      recommendation: "Especialmente indicado para hombres urbanos y sofisticados de 30 a 45 anos."
    },
    "AC'SCENT 19": {
      name: "Sal Marina",
      description: "Un perfume de sal marina fresco y estimulante que evoca la brisa del oceano. Crea una atmosfera limpia y revitalizante de pura libertad.",
      mood: "Fresco, Estimulante, Limpio, Vigorizante",
      personality: "Para quien se siente vivo con el aire puro y los espacios abiertos.",
      keywords: ["Libertad", "Oceano", "Refrescante", "Natural", "Aventura"],
      mainScent: "Sal Marina",
      subScent1: "Salvia",
      subScent2: "Almizcle",
      recommendation: "Para el alma libre cuya mayor felicidad es caminar descalzo sobre la arena."
    },
    "AC'SCENT 20": {
      name: "Tomillo",
      description: "Un perfume de tomillo herbal y audaz con una profundidad sorprendente. Su caracter verde y fresco revela capas de complejidad amanderada.",
      mood: "Refrescante, Herbal, Profundo, Natural",
      personality: "Para alguien con una profundidad misteriosa enraizada en la naturaleza.",
      keywords: ["Equilibrio", "Misterio", "Analogico", "Naturaleza", "Urbano"],
      mainScent: "Tomillo",
      subScent1: "Madera de Cedro",
      subScent2: "Vetiver",
      recommendation: "Para el alma enigmatica que ha encontrado el equilibrio entre la ciudad y el bosque."
    },
    "AC'SCENT 21": {
      name: "Almizcle",
      description: "Un perfume de almizcle suave y envolvente que irradia calidez. Crea una atmosfera seductora y acogedora de encanto intimo.",
      mood: "Suave, Calido, Seductor, Acogedor",
      personality: "Para alguien con una sensualidad sutil y una calidez magnetica.",
      keywords: ["Elegancia", "Prestigio", "Lujo", "Parisino", "Culto"],
      mainScent: "Almizcle",
      subScent1: "Ambar",
      subScent2: "Vainilla",
      recommendation: "Para el aristocrata moderno cuya vocacion es la elegancia misma."
    },
    "AC'SCENT 22": {
      name: "Rosa Blanca",
      description: "Un perfume de rosa blanca puro y gracioso que brilla con inocencia. Crea una atmosfera limpia y romantica como un jardin nupcial.",
      mood: "Puro, Elegante, Limpio, Romantico",
      personality: "Para quien lleva un aura de belleza romantica inmaculada.",
      keywords: ["Pureza", "Inocencia", "Purificador", "Angelical", "Luminoso"],
      mainScent: "Rosa Blanca",
      subScent1: "Peonia",
      subScent2: "Almizcle",
      recommendation: "Para la presencia eterea que purifica cada espacio con su aura luminosa."
    },
    "AC'SCENT 23": {
      name: "Ante",
      description: "Un perfume de ante suave y calido que te envuelve en lujo. Crea una atmosfera confortable y exclusiva de sofisticacion discreta.",
      mood: "Suave, Calido, Confortable, Lujoso",
      personality: "Para alguien cuya elegancia natural y gusto refinado son innatos.",
      keywords: ["Sofisticado", "Culto", "Con estilo", "Urbano", "Boutique"],
      mainScent: "Ante",
      subScent1: "Iris",
      subScent2: "Madera de Ambar",
      recommendation: "Para la elite cultural urbana cuyo estilo impecable esta escrito en su ADN."
    },
    "AC'SCENT 24": {
      name: "Mandarina Italiana",
      description: "Un perfume de mandarina italiana vivaz y luminoso que rebosa sol mediterraneo. Energia radiante en cada gota.",
      mood: "Fresco, Vibrante, Luminoso, Energetico",
      personality: "Para alguien cuyo magnetismo natural y encanto son simplemente irresistibles.",
      keywords: ["Seductor", "Feromona", "Natural", "Sensual", "Innato"],
      mainScent: "Mandarina Italiana",
      subScent1: "Neroli",
      subScent2: "Almizcle",
      recommendation: "Para el alma naturalmente encantadora que es un regalo de la naturaleza."
    },
    "AC'SCENT 25": {
      name: "Lavanda",
      description: "Un perfume de lavanda relajante y sereno que aquieta la mente. Crea una atmosfera tranquila y sanadora de profunda paz.",
      mood: "Relajante, Sereno, Tranquilo, Sanador",
      personality: "Para alguien con una presencia tranquila y reconfortante que transmite paz.",
      keywords: ["Intelectual", "Distinguido", "Profundo", "Jazz", "Whisky"],
      mainScent: "Lavanda",
      subScent1: "Haba Tonka",
      subScent2: "Sandalo",
      recommendation: "Para el maestro de las conversaciones profundas y el encanto intelectual."
    },
    "AC'SCENT 26": {
      name: "Cipres Italiano",
      description: "Un perfume de cipres amanderado y fresco que evoca bosques ancestrales. Crea una atmosfera natural y enigmatica de misterio atemporal.",
      mood: "Amanderado, Fresco, Natural, Misterioso",
      personality: "Para alguien que posee un aura de misticismo oscuro y natural.",
      keywords: ["Misterio", "Oscuridad", "Carisma", "Enigma", "Noche"],
      mainScent: "Cipres Italiano",
      subScent1: "Enebro",
      subScent2: "Vetiver",
      recommendation: "Para el senor de la noche, quien domina el carisma de las sombras."
    },
    "AC'SCENT 27": {
      name: "Madera Ahumada",
      description: "Un perfume de madera ahumada profundo e intenso con una fuerza arrolladora. Crea una atmosfera misteriosa y poderosa que domina la sala.",
      mood: "Ahumado, Profundo, Misterioso, Intenso",
      personality: "Para alguien con una profundidad enigmatica que fascina e inspira respeto.",
      keywords: ["Prestigio", "Exito", "VIP", "Profundidad", "Magnate"],
      mainScent: "Madera Ahumada",
      subScent1: "Guayaco",
      subScent2: "Ambar",
      recommendation: "Para el habitual del salon VIP, el empresario nato con gusto impecable."
    },
    "AC'SCENT 28": {
      name: "Cuero",
      description: "Un perfume de cuero lujoso y calido que habla de artesania y poder. Refinado e imponente a partes iguales.",
      mood: "Lujoso, Calido, Refinado, Imponente",
      personality: "Para alguien con una autoridad inconfundible y un gusto impecable.",
      keywords: ["Gourmet", "Coleccionista", "Buen gusto", "Refinado", "Sensorial"],
      mainScent: "Cuero",
      subScent1: "Oud",
      subScent2: "Vainilla",
      recommendation: "Para el dios de la gastronomia y el epitome del gusto refinado."
    },
    "AC'SCENT 29": {
      name: "Violeta",
      description: "Un perfume de violeta delicado y gracioso que encanta con su belleza discreta. Crea una atmosfera romantica y femenina de flair artistico.",
      mood: "Delicado, Elegante, Romantico, Femenino",
      personality: "Para alguien con un alma tierna y romantica y sensibilidad artistica.",
      keywords: ["Tendencia", "Vanguardia", "Moda", "Artistico", "Pionero"],
      mainScent: "Violeta",
      subScent1: "Iris",
      subScent2: "Madera de Cedro",
      recommendation: "Para la reina de la moda que merece la primera fila de cada desfile."
    },
    "AC'SCENT 30": {
      name: "Higo",
      description: "Un perfume de higo exuberante y profundo que te envuelve en calidez mediterranea. Crea una atmosfera acogedora y madura de confianza serena.",
      mood: "Dulce, Acogedor, Sereno, Maduro",
      personality: "Para alguien con una presencia calida y experimentada y una gracia natural.",
      keywords: ["Serenidad", "Prestigio", "Triunfador", "Vino", "Lujo"],
      mainScent: "Higo",
      subScent1: "Coco",
      subScent2: "Almizcle",
      recommendation: "Para el campeon de la vida cuyo aplomo natural es el simbolo mismo de la clase."
    }
  }
}

export function getLocalizedPerfumeText(perfumeId: string, locale: Locale): PerfumeI18n | undefined {
  if (locale === 'ko') return undefined // Use original Korean data
  return translations[locale]?.[perfumeId]
}
