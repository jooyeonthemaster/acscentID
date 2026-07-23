import { defaultLocale, locales, type Locale } from '@/i18n/config'

export type ProgramSeoSlug =
  | 'idol-image'
  | 'figure'
  | 'graduation'
  | 'chemistry'
  | 'le-quack'
  | 'personal'
  | 'saju'

interface ProgramSeoText {
  title: string
  description: string
  productDescription: string
  keywords: string[]
  programLabel: string
}

const PROGRAM_SEO: Record<Locale, Record<ProgramSeoSlug, ProgramSeoText>> = {
  ko: {
    'idol-image': {
      title: 'AI 이미지 분석 퍼퓸',
      description: '좋아하는 이미지로 추출하는 나만의 퍼퓸. AI가 이미지의 색감, 분위기, 감정을 분석하여 맞춤 퍼퓸 레시피를 만들어드립니다. 뿌덕퍼퓸(10ml/50ml) + 실물 분석보고서 포함.',
      productDescription: '좋아하는 이미지로 추출하는 나만의 맞춤 퍼퓸. 뿌덕퍼퓸 + 실물 분석보고서 포함.',
      keywords: ['아이돌 향수', '이미지 분석 향수', '뿌덕퍼퓸', 'AI 향수 추천', '덕후 향수', '최애 향수'],
      programLabel: '프로그램',
    },
    figure: {
      title: '피규어 화분 디퓨저',
      description: '좋아하는 이미지로 제작되는 나만의 3D 피규어 디퓨저. AI 맞춤 향 에센스와 샤쉐스톤 포함. 소중한 추억을 화분에 담아드립니다.',
      productDescription: '좋아하는 이미지로 제작되는 나만의 3D 피규어 디퓨저. 피규어 + 디퓨저 + 분석보고서 + 샤쉐스톤 + AI 맞춤 향 에센스 포함.',
      keywords: ['피규어 디퓨저', '3D 피규어', '커스텀 피규어', 'AI 디퓨저', '화분 디퓨저', '맞춤 굿즈'],
      programLabel: '프로그램',
    },
    graduation: {
      title: '졸업 기념 퍼퓸 | 2/28 한정판매',
      description: '졸업의 추억을 향기로 남기세요. 뿌덕퍼퓸(10ml) + 학사모 퍼퓸 키링 + 졸업장 스타일 분석보고서 포함. 2/28까지 한정 판매.',
      productDescription: '졸업의 추억을 향기로 남기세요. 뿌덕퍼퓸 + 학사모 퍼퓸 키링 + 졸업장st 분석보고서 포함.',
      keywords: ['졸업 선물', '졸업 향수', '졸업 기념품', '학사모 키링', '졸업 퍼퓸', '졸업식 선물 추천'],
      programLabel: '프로그램',
    },
    chemistry: {
      title: '레이어링 퍼퓸 세트',
      description: '두 인물의 케미를 향기로 담는 맞춤 향수 세트. AI가 두 인물의 이미지와 관계를 분석하여 케미 프로필과 맞춤 향수 세트를 추천합니다.',
      productDescription: '두 인물의 케미를 향기로 담는 맞춤 향수 세트. 레이어링 퍼퓸 세트 + 케미 프로필 카드 포함.',
      keywords: ['레이어링 퍼퓸', '커플 향수', '캐릭터 향수', 'AI 케미 분석', '레이어링 향수', '향수 세트'],
      programLabel: '프로그램',
    },
    'le-quack': {
      title: '시그니처 뿌덕퍼퓸 LE QUACK',
      description: "AC'SCENT IDENTITY 시그니처 향수 LE QUACK. 오리 캐릭터 키링과 함께하는 특별한 향수.",
      productDescription: "AC'SCENT IDENTITY 시그니처 향수. 오리 캐릭터 키링 포함.",
      keywords: ['시그니처 향수', '뿌덕퍼퓸', 'LE QUACK', '오리 키링', '캐릭터 향수'],
      programLabel: '프로그램',
    },
    personal: {
      title: '퍼스널 퍼퓸 - 나만의 맞춤 향수',
      description: 'AI 이미지 분석으로 나만의 시그니처 퍼퓸을 만들어보세요. 10,000건 이상의 분석 데이터 기반 맞춤 향수 추천.',
      productDescription: 'AI 이미지 분석으로 만드는 나만의 시그니처 퍼퓸.',
      keywords: ['퍼스널 퍼퓸', '맞춤 향수', '시그니처 향수', 'AI 향수 추천'],
      programLabel: '프로그램',
    },
    saju: {
      title: '사주 분석 퍼퓸 - 운명의 조향',
      description: '생년월일시로 읽는 운명의 향. 만세력 기반 사주 분석으로 일간과 오행, 용신을 풀어내고 부족한 기운을 채우는 맞춤 퍼퓸(10ml/50ml)을 조향합니다. 명식 분석보고서 포함.',
      productDescription: '생년월일시 기반 사주 분석으로 조향하는 맞춤 퍼퓸. 뿌덕퍼퓸 + 명식 분석보고서 포함.',
      keywords: ['사주 향수', '사주 분석 퍼퓸', '오행 향수', '용신 향수', '운세 향수', '최애 사주', '맞춤 향수'],
      programLabel: '프로그램',
    },
  },
  en: {
    'idol-image': {
      title: 'AI Image Analysis Perfume',
      description: 'Create a personalized perfume from your favorite image. AI analyzes color, mood, and emotion to build a custom scent recipe.',
      productDescription: 'A personalized perfume created from your favorite image, including a physical analysis report.',
      keywords: ['idol perfume', 'image analysis perfume', 'AI perfume recommendation', 'favorite image perfume'],
      programLabel: 'Programs',
    },
    figure: {
      title: '3D Figure Diffuser',
      description: 'A custom 3D figure diffuser made from your favorite image, with AI-matched scent essence and sachet stone.',
      productDescription: 'A custom 3D figure diffuser set with figure, diffuser, analysis report, sachet stone, and AI-matched scent essence.',
      keywords: ['figure diffuser', '3D figure', 'custom figure', 'AI diffuser', 'custom goods'],
      programLabel: 'Programs',
    },
    graduation: {
      title: 'Graduation Memorial Perfume',
      description: 'Turn graduation memories into scent with a perfume, graduation-cap perfume keyring, and diploma-style analysis report.',
      productDescription: 'A graduation memorial perfume package with perfume, graduation-cap keyring, and diploma-style analysis report.',
      keywords: ['graduation gift', 'graduation perfume', 'graduation keepsake', 'graduation ceremony gift'],
      programLabel: 'Programs',
    },
    chemistry: {
      title: 'Layering Perfume Set',
      description: 'Capture the chemistry of two characters in scent. AI analyzes their images and relationship to recommend a chemistry profile and perfume set.',
      productDescription: 'A custom scent set for two characters, including a chemistry profile card.',
      keywords: ['chemistry perfume', 'couple perfume', 'character perfume', 'AI chemistry analysis', 'layering perfume'],
      programLabel: 'Programs',
    },
    'le-quack': {
      title: 'SIGNATURE PPUDUCK Perfume LE QUACK',
      description: "AC'SCENT IDENTITY's signature LE QUACK perfume with a duck character keyring.",
      productDescription: "AC'SCENT IDENTITY signature perfume with a duck character keyring.",
      keywords: ['signature perfume', 'LE QUACK', 'duck keyring', 'character perfume'],
      programLabel: 'Programs',
    },
    personal: {
      title: 'Personal Perfume - Your Custom Scent',
      description: 'Create your own signature perfume with AI image analysis and personalized scent recommendations.',
      productDescription: 'Your own signature perfume created with AI image analysis.',
      keywords: ['personal perfume', 'custom scent', 'signature perfume', 'AI perfume recommendation'],
      programLabel: 'Programs',
    },
    saju: {
      title: 'Saju (Four Pillars) Fragrance Reading',
      description: 'A scent read from the moment you were born. Based on Saju, the Korean Four Pillars of Destiny, we chart your birth date and hour, interpret your day master and five elements, and blend a custom perfume that restores the energy you lack.',
      productDescription: 'A custom perfume prescribed from your Korean Four Pillars (Saju) birth chart, including a printed chart analysis report.',
      keywords: ['saju perfume', 'four pillars of destiny', 'Korean fortune telling', 'birth chart fragrance', 'five elements perfume', 'custom perfume'],
      programLabel: 'Programs',
    },
  },
  ja: {
    'idol-image': {
      title: 'AI イメージ分析パフューム',
      description: '好きな画像から自分だけのパフュームを作成。AIが色、雰囲気、感情を分析してカスタム香りレシピを提案します。',
      productDescription: '好きな画像から作るカスタムパフューム。実物分析レポート付き。',
      keywords: ['推し香水', '画像分析香水', 'AI香水推薦', '推し画像香水'],
      programLabel: 'プログラム',
    },
    figure: {
      title: 'フィギュア花鉢ディフューザー',
      description: '好きな画像で作る3Dフィギュアディフューザー。AIマッチング香料とサシェストーン付き。',
      productDescription: 'フィギュア、ディフューザー、分析レポート、サシェストーン、AIマッチング香料を含むセット。',
      keywords: ['フィギュアディフューザー', '3Dフィギュア', 'カスタムフィギュア', 'AIディフューザー'],
      programLabel: 'プログラム',
    },
    graduation: {
      title: '卒業記念パフューム',
      description: '卒業の思い出を香りに。パフューム、卒業帽パフュームキーリング、卒業証書風分析レポート付き。',
      productDescription: '卒業記念パフューム、卒業帽キーリング、卒業証書風分析レポートを含むパッケージ。',
      keywords: ['卒業ギフト', '卒業香水', '卒業記念品', '卒業式プレゼント'],
      programLabel: 'プログラム',
    },
    chemistry: {
      title: 'レイヤリングパフュームセット',
      description: '二人のケミを香りで表現。AIが画像と関係性を分析し、ケミプロフィールと香水セットを提案します。',
      productDescription: '二人のためのカスタム香りセット。ケミプロフィールカード付き。',
      keywords: ['ケミ香水', 'カップル香水', 'キャラクター香水', 'AIケミ分析', 'レイヤリング香水'],
      programLabel: 'プログラム',
    },
    'le-quack': {
      title: 'SIGNATURE プドゥックパフューム LE QUACK',
      description: "AC'SCENT IDENTITYのシグニチャーパフュームLE QUACK。アヒルキャラクターキーリング付き。",
      productDescription: "AC'SCENT IDENTITYシグニチャーパフューム。アヒルキャラクターキーリング付き。",
      keywords: ['シグニチャー香水', 'LE QUACK', 'アヒルキーリング', 'キャラクター香水'],
      programLabel: 'プログラム',
    },
    personal: {
      title: 'パーソナルパフューム - 自分だけの香り',
      description: 'AI画像分析で自分だけのシグニチャーパフュームを作成します。',
      productDescription: 'AI画像分析で作る自分だけのシグニチャーパフューム。',
      keywords: ['パーソナル香水', 'カスタム香り', 'シグニチャー香水', 'AI香水推薦'],
      programLabel: 'プログラム',
    },
    saju: {
      title: '四柱推命パフューム - 運命の調香',
      description: '生年月日時から読み解く運命の香り。韓国式四柱推命であなたの日干・五行・用神を分析し、足りない気を満たすカスタムパフュームを調香します。命式分析レポート付き。',
      productDescription: '四柱推命の命式から調香するカスタムパフューム。命式分析レポート付き。',
      keywords: ['四柱推命 香水', '四柱推命 パフューム', '五行 香水', '占い 香水', 'カスタム香水'],
      programLabel: 'プログラム',
    },
  },
  zh: {
    'idol-image': {
      title: 'AI图像分析香水',
      description: '用喜欢的图片制作专属香水。AI分析色彩、氛围与情感，生成定制香气配方。',
      productDescription: '由喜欢的图片生成的专属香水，附实体分析报告。',
      keywords: ['偶像香水', '图像分析香水', 'AI香水推荐', '本命图片香水'],
      programLabel: '项目',
    },
    figure: {
      title: '手办花盆香薰器',
      description: '用喜欢的图片制作3D手办香薰器，包含AI匹配香氛精华与香氛石。',
      productDescription: '包含手办、香薰器、分析报告、香氛石与AI匹配香氛精华的定制套装。',
      keywords: ['手办香薰器', '3D手办', '定制手办', 'AI香薰器'],
      programLabel: '项目',
    },
    graduation: {
      title: '毕业纪念香水',
      description: '把毕业回忆留在香气里。包含香水、学士帽香水钥匙扣与毕业证书风格分析报告。',
      productDescription: '包含毕业纪念香水、学士帽钥匙扣与毕业证书风格分析报告的套装。',
      keywords: ['毕业礼物', '毕业香水', '毕业纪念品', '毕业典礼礼物'],
      programLabel: '项目',
    },
    chemistry: {
      title: '叠香香水套装',
      description: '用香气呈现两个人的化学反应。AI分析图片与关系，推荐化学档案和香水套装。',
      productDescription: '为两个人定制的香气套装，包含化学档案卡。',
      keywords: ['化学香水', '情侣香水', '角色香水', 'AI化学分析', '叠香香水'],
      programLabel: '项目',
    },
    'le-quack': {
      title: 'SIGNATURE 鸭子香水 LE QUACK',
      description: "AC'SCENT IDENTITY标志香水LE QUACK，附鸭子角色钥匙扣。",
      productDescription: "AC'SCENT IDENTITY标志香水，附鸭子角色钥匙扣。",
      keywords: ['标志香水', 'LE QUACK', '鸭子钥匙扣', '角色香水'],
      programLabel: '项目',
    },
    personal: {
      title: '个人香水 - 你的定制香气',
      description: '通过AI图像分析制作属于你的标志香水。',
      productDescription: '通过AI图像分析制作的专属标志香水。',
      keywords: ['个人香水', '定制香气', '标志香水', 'AI香水推荐'],
      programLabel: '项目',
    },
    saju: {
      title: '四柱八字香水 - 命运的调香',
      description: '用出生年月日时读出的命运之香。基于韩式四柱八字命理，解析你的日主、五行与用神，为你调配补足所缺之气的定制香水，并附命盘分析报告。',
      productDescription: '依据四柱八字命盘调配的定制香水，附命盘分析报告。',
      keywords: ['四柱香水', '八字香水', '五行香水', '命理香水', '定制香水'],
      programLabel: '项目',
    },
  },
  es: {
    'idol-image': {
      title: 'Perfume con Análisis de Imagen IA',
      description: 'Crea un perfume personalizado desde tu imagen favorita. La IA analiza color, ambiente y emoción para crear una receta de aroma.',
      productDescription: 'Un perfume personalizado creado desde tu imagen favorita, con reporte físico de análisis.',
      keywords: ['perfume idol', 'perfume con análisis de imagen', 'recomendación de perfume IA', 'perfume de imagen favorita'],
      programLabel: 'Programas',
    },
    figure: {
      title: 'Difusor con Figura 3D',
      description: 'Un difusor con figura 3D personalizado hecho desde tu imagen favorita, con esencia aromática combinada por IA.',
      productDescription: 'Set personalizado con figura, difusor, reporte de análisis, piedra aromática y esencia combinada por IA.',
      keywords: ['difusor con figura', 'figura 3D', 'figura personalizada', 'difusor IA'],
      programLabel: 'Programas',
    },
    graduation: {
      title: 'Perfume Conmemorativo de Graduación',
      description: 'Convierte los recuerdos de graduación en aroma con perfume, llavero de birrete y reporte estilo diploma.',
      productDescription: 'Paquete de graduación con perfume, llavero de birrete y reporte estilo diploma.',
      keywords: ['regalo de graduación', 'perfume de graduación', 'recuerdo de graduación'],
      programLabel: 'Programas',
    },
    chemistry: {
      title: 'Set de Perfume Layering',
      description: 'Captura la química de dos personajes en aroma. La IA analiza imágenes y relación para recomendar un perfil y set de perfumes.',
      productDescription: 'Set aromático personalizado para dos personajes, con tarjeta de perfil de química.',
      keywords: ['perfume química', 'perfume de pareja', 'perfume de personaje', 'análisis de química IA'],
      programLabel: 'Programas',
    },
    'le-quack': {
      title: 'SIGNATURE Perfume PPUDUCK LE QUACK',
      description: 'LE QUACK, el perfume signature de AC\'SCENT IDENTITY, con llavero de personaje pato.',
      productDescription: "Perfume signature de AC'SCENT IDENTITY con llavero de personaje pato.",
      keywords: ['perfume signature', 'LE QUACK', 'llavero pato', 'perfume de personaje'],
      programLabel: 'Programas',
    },
    personal: {
      title: 'Perfume Personal - Tu Aroma Personalizado',
      description: 'Crea tu propio perfume signature con análisis de imagen IA y recomendaciones personalizadas.',
      productDescription: 'Tu propio perfume signature creado con análisis de imagen IA.',
      keywords: ['perfume personal', 'aroma personalizado', 'perfume signature', 'recomendación de perfume IA'],
      programLabel: 'Programas',
    },
    saju: {
      title: 'Perfume de Saju (Cuatro Pilares del Destino)',
      description: 'Un aroma leído en el momento de tu nacimiento. Basado en el Saju, la astrología coreana de los Cuatro Pilares, interpretamos tu carta natal y los cinco elementos para crear un perfume que equilibra la energía que te falta. Incluye reporte de análisis.',
      productDescription: 'Un perfume personalizado creado a partir de tu carta de Saju (Cuatro Pilares), con reporte físico de análisis.',
      keywords: ['perfume saju', 'cuatro pilares del destino', 'astrología coreana', 'perfume de carta natal', 'perfume de cinco elementos', 'perfume personalizado'],
      programLabel: 'Programas',
    },
  },
}

export function resolveProgramLocale(locale: string | undefined): Locale {
  return locales.includes(locale as Locale) ? locale as Locale : defaultLocale
}

export function getProgramSeo(slug: ProgramSeoSlug, locale: Locale): ProgramSeoText {
  return PROGRAM_SEO[locale]?.[slug] || PROGRAM_SEO[defaultLocale][slug]
}

export function getLocalizedProgramPath(slug: ProgramSeoSlug, locale: Locale) {
  const path = `/programs/${slug}`
  return locale === defaultLocale ? path : `/${locale}${path}`
}
