// 30가지 향료 데이터 (AC'SCENT 01 ~ 30)

export interface ScentNote {
    name: string
    description?: string
}

export interface Characteristics {
    citrus: number
    floral: number
    woody: number
    musky: number
    fruity: number
    spicy: number
}

export interface Traits {
    sexy: number
    cute: number
    charisma: number
    darkness: number
    freshness: number
    elegance: number
    freedom: number
    luxury: number
    purity: number
    uniqueness: number
}

export interface Perfume {
    id: string
    name: string
    description: string
    mood: string
    personality: string
    mainScent: ScentNote
    subScent1: ScentNote
    subScent2: ScentNote
    characteristics: Characteristics
    category: string
    recommendation: string
    traits: Traits
    keywords: string[]
    primaryColor: string
    secondaryColor: string
}

export const perfumes: Perfume[] = [
    {
        id: "AC'SCENT 01",
        name: "블랙베리",
        description: "달콤하고 진한 블랙베리 향이 매력적인 향수입니다. 달콤하면서도 약간의 시큼함이 있어 독특한 매력을 가지고 있습니다.",
        mood: "달콤한, 과일향, 상큼한, 매력적인",
        personality: "유니크하고 달콤한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "블랙베리" },
        subScent1: { name: "월계수잎" },
        subScent2: { name: "시더우드" },
        characteristics: { citrus: 2, floral: 3, woody: 5, musky: 2, fruity: 7, spicy: 1 },
        category: "fruity",
        recommendation: "현대적이고 세련된 감각의 20-30대 남성에게 특히 잘 어울립니다.",
        traits: { sexy: 7, cute: 2, charisma: 8, darkness: 9, freshness: 3, elegance: 6, freedom: 5, luxury: 7, purity: 1, uniqueness: 8 },
        keywords: ["시크함", "도시적", "미니멀", "관찰자", "무관심"],
        primaryColor: "#1E1E24",
        secondaryColor: "#420039"
    },
    {
        id: "AC'SCENT 02",
        name: "만다린 오렌지",
        description: "상큼하고 활기찬 만다린 오렌지 향이 기분을 밝게 해주는 향수입니다.",
        mood: "상큼한, 활기찬, 밝은, 에너지 넘치는",
        personality: "밝고 활기찬 에너지를 가진, 긍정적인 사람에게 어울립니다.",
        mainScent: { name: "만다린 오렌지" },
        subScent1: { name: "그레이프프루트" },
        subScent2: { name: "피오니" },
        characteristics: { citrus: 8, floral: 6, woody: 3, musky: 3, fruity: 7, spicy: 1 },
        category: "citrus",
        recommendation: "도시적이고 세련된 감각의 25-35세 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 6, cute: 3, charisma: 7, darkness: 2, freshness: 8, elegance: 9, freedom: 4, luxury: 8, purity: 5, uniqueness: 6 },
        keywords: ["세련됨", "계산된", "미니멀", "도시 엘리트", "완벽함"],
        primaryColor: "#FF9F1C",
        secondaryColor: "#FAFAFA"
    },
    {
        id: "AC'SCENT 03",
        name: "스트로베리",
        description: "달콤하고 싱그러운 딸기 향이 매력적인 향수입니다. 사랑스럽고 귀여운 분위기를 연출합니다.",
        mood: "달콤한, 사랑스러운, 귀여운, 싱그러운",
        personality: "사랑스럽고 귀여운 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "스트로베리" },
        subScent1: { name: "자스민" },
        subScent2: { name: "바닐라" },
        characteristics: { citrus: 6, floral: 6, woody: 2, musky: 3, fruity: 8, spicy: 1 },
        category: "fruity",
        recommendation: "사랑스럽고 로맨틱한 감성의 20-30대 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 3, cute: 10, charisma: 5, darkness: 1, freshness: 7, elegance: 4, freedom: 6, luxury: 3, purity: 8, uniqueness: 6 },
        keywords: ["애교", "달콤함", "귀여움", "파스텔", "발랄함"],
        primaryColor: "#FF7E9D",
        secondaryColor: "#FFD8E6"
    },
    {
        id: "AC'SCENT 04",
        name: "베르가못",
        description: "시트러스와 허브 향이 조화롭게 어우러진 베르가못 향수입니다. 상쾌하면서도 우아한 느낌을 줍니다.",
        mood: "상쾌한, 우아한, 세련된, 깔끔한",
        personality: "세련되고 우아한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "베르가못" },
        subScent1: { name: "오렌지 플라워" },
        subScent2: { name: "엠버" },
        characteristics: { citrus: 8, floral: 7, woody: 3, musky: 4, fruity: 6, spicy: 1 },
        category: "citrus",
        recommendation: "세련되고 우아한 품격을 지닌 30-50대 남녀 모두에게 잘 어울립니다.",
        traits: { sexy: 8, cute: 1, charisma: 7, darkness: 2, freshness: 6, elegance: 10, freedom: 4, luxury: 9, purity: 3, uniqueness: 7 },
        keywords: ["우아함", "품격", "여유", "지중해", "세련됨"],
        primaryColor: "#F3CA40",
        secondaryColor: "#344055"
    },
    {
        id: "AC'SCENT 05",
        name: "비터 오렌지",
        description: "쌉싸름한 오렌지 향이 독특한 매력을 가진 향수입니다. 상큼하면서도 깊이 있는 향이 오래 지속됩니다.",
        mood: "쌉싸름한, 독특한, 깊이있는, 성숙한",
        personality: "독특하고 깊이 있는 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "비터 오렌지" },
        subScent1: { name: "쥬니퍼베리" },
        subScent2: { name: "스파이시 우디 어코드" },
        characteristics: { citrus: 7, floral: 3, woody: 6, musky: 3, fruity: 4, spicy: 8 },
        category: "spicy",
        recommendation: "카리스마 있고 자신감 넘치는 30-45세 남성에게 특히 잘 어울립니다.",
        traits: { sexy: 8, cute: 1, charisma: 10, darkness: 7, freshness: 4, elegance: 7, freedom: 3, luxury: 8, purity: 2, uniqueness: 9 },
        keywords: ["카리스마", "강렬함", "압도적", "마피아 보스", "포스"],
        primaryColor: "#FF4000",
        secondaryColor: "#2F2F2F"
    },
    {
        id: "AC'SCENT 06",
        name: "캐럿",
        description: "달콤하면서도 흙내음이 나는 독특한 당근 향수입니다. 편안하면서도 유니크한 분위기를 연출합니다.",
        mood: "편안한, 독특한, 자연적인, 달콤한",
        personality: "편안하면서도 독특한 개성을 가진 사람에게 어울립니다.",
        mainScent: { name: "캐럿" },
        subScent1: { name: "자몽" },
        subScent2: { name: "로터스" },
        characteristics: { citrus: 4, floral: 7, woody: 2, musky: 4, fruity: 3, spicy: 2 },
        category: "floral",
        recommendation: "자연스럽고 건강한 아름다움을 추구하는 25-40대 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 2, cute: 5, charisma: 4, darkness: 1, freshness: 10, elegance: 3, freedom: 8, luxury: 2, purity: 9, uniqueness: 7 },
        keywords: ["자연주의", "웰니스", "맑은", "명상", "건강"],
        primaryColor: "#FFA62B",
        secondaryColor: "#78C091"
    },
    {
        id: "AC'SCENT 07",
        name: "로즈",
        description: "우아하고 고급스러운 장미 향이 매력적인 향수입니다. 로맨틱하고 여성스러운 분위기를 연출합니다.",
        mood: "우아한, 로맨틱한, 여성스러운, 고급스러운",
        personality: "우아하고 로맨틱한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "로즈" },
        subScent1: { name: "다마스커스 로즈" },
        subScent2: { name: "머스크" },
        characteristics: { citrus: 5, floral: 9, woody: 2, musky: 3, fruity: 4, spicy: 1 },
        category: "floral",
        recommendation: "우아하고 성숙한 매력을 지닌 35-50대 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 7, cute: 2, charisma: 8, darkness: 3, freshness: 4, elegance: 10, freedom: 3, luxury: 9, purity: 6, uniqueness: 7 },
        keywords: ["우아함", "고급", "클래식", "올드머니", "품격"],
        primaryColor: "#A8003D",
        secondaryColor: "#F0EAD6"
    },
    {
        id: "AC'SCENT 08",
        name: "튜베로즈",
        description: "강렬하고 관능적인 튜베로즈 향이 매력적인 향수입니다. 깊이 있고 인상적인 향이 오래 지속됩니다.",
        mood: "강렬한, 관능적인, 깊이있는, 인상적인",
        personality: "강렬하고 깊은 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "튜베로즈" },
        subScent1: { name: "화이트 플로럴" },
        subScent2: { name: "프리지아" },
        characteristics: { citrus: 4, floral: 9, woody: 1, musky: 3, fruity: 5, spicy: 2 },
        category: "floral",
        recommendation: "우아하고 세련된 매력을 지닌 30-45세 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 9, cute: 3, charisma: 9, darkness: 2, freshness: 5, elegance: 8, freedom: 4, luxury: 9, purity: 8, uniqueness: 8 },
        keywords: ["화려함", "카리스마", "매혹적", "순백", "강렬함"],
        primaryColor: "#F5F5F5",
        secondaryColor: "#CCAD8F"
    },
    {
        id: "AC'SCENT 09",
        name: "오렌지 블라썸",
        description: "상큼하고 화사한 오렌지 꽃 향이 매력적인 향수입니다. 밝고 사랑스러운 분위기를 연출합니다.",
        mood: "화사한, 상큼한, 사랑스러운, 봄같은",
        personality: "화사하고 사랑스러운 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "오렌지 블라썸" },
        subScent1: { name: "자스민" },
        subScent2: { name: "퉁카 빈" },
        characteristics: { citrus: 6, floral: 8, woody: 3, musky: 4, fruity: 5, spicy: 2 },
        category: "floral",
        recommendation: "세련되고 자신감 있는 30-40대 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 6, cute: 4, charisma: 7, darkness: 1, freshness: 8, elegance: 9, freedom: 5, luxury: 8, purity: 7, uniqueness: 6 },
        keywords: ["세련됨", "프렌치시크", "도시적", "우아함", "파리지엔"],
        primaryColor: "#F9A03F",
        secondaryColor: "#FFEFD5"
    },
    {
        id: "AC'SCENT 10",
        name: "튤립",
        description: "신선하고 맑은 튤립 향이 매력적인 향수입니다. 깔끔하고 우아한 분위기를 연출합니다.",
        mood: "신선한, 맑은, 깔끔한, 우아한",
        personality: "깔끔하고 우아한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "튤립" },
        subScent1: { name: "시클라멘" },
        subScent2: { name: "라일락" },
        characteristics: { citrus: 4, floral: 8, woody: 2, musky: 3, fruity: 4, spicy: 1 },
        category: "floral",
        recommendation: "맑고 순수한 이미지의 25-35세 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 3, cute: 7, charisma: 5, darkness: 1, freshness: 8, elegance: 7, freedom: 5, luxury: 6, purity: 10, uniqueness: 5 },
        keywords: ["순수함", "청순", "빛나는", "깨끗함", "우아함"],
        primaryColor: "#FFC0CB",
        secondaryColor: "#FFFFFF"
    },
    {
        id: "AC'SCENT 11",
        name: "라임",
        description: "상큼하고 톡 쏘는 라임 향이 매력적인 향수입니다. 활기차고 신선한 분위기를 연출합니다.",
        mood: "상큼한, 활기찬, 톡쏘는, 신선한",
        personality: "활기차고 신선한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "라임" },
        subScent1: { name: "바질" },
        subScent2: { name: "앰버우드" },
        characteristics: { citrus: 7, floral: 2, woody: 4, musky: 2, fruity: 7, spicy: 4 },
        category: "citrus",
        recommendation: "활동적이고 자유로운 라이프스타일을 가진 25-40대 남녀 모두에게 잘 어울립니다.",
        traits: { sexy: 6, cute: 3, charisma: 7, darkness: 1, freshness: 9, elegance: 6, freedom: 10, luxury: 7, purity: 5, uniqueness: 8 },
        keywords: ["여유로움", "쿨함", "자유", "휴양지", "청량감"],
        primaryColor: "#C4E17F",
        secondaryColor: "#21B6A8"
    },
    {
        id: "AC'SCENT 12",
        name: "은방울꽃",
        description: "섬세하고 순수한 은방울꽃 향이 매력적인 향수입니다. 청순하고 깨끗한 분위기를 연출합니다.",
        mood: "섬세한, 순수한, 청순한, 깨끗한",
        personality: "순수하고 청순한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "은방울꽃" },
        subScent1: { name: "핑크 프리지아" },
        subScent2: { name: "자스민" },
        characteristics: { citrus: 2, floral: 3, woody: 5, musky: 7, fruity: 7, spicy: 1 },
        category: "musky",
        recommendation: "우아하고 섬세한 매력을 지닌 28-38세 여성에게 특히 잘 어울립니다.",
        traits: { sexy: 4, cute: 6, charisma: 3, darkness: 2, freshness: 7, elegance: 8, freedom: 4, luxury: 5, purity: 9, uniqueness: 7 },
        keywords: ["섬세함", "조용함", "우아함", "예술적", "청초함"],
        primaryColor: "#F0F8FF",
        secondaryColor: "#E6E6FA"
    },
    {
        id: "AC'SCENT 13",
        name: "유자",
        description: "상큼하고 달콤한 유자 향이 매력적인 향수입니다. 밝고 활기찬 분위기를 연출합니다.",
        mood: "상큼한, 달콤한, 밝은, 활기찬",
        personality: "밝고 활기찬 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "유자" },
        subScent1: { name: "로즈마리" },
        subScent2: { name: "민트" },
        characteristics: { citrus: 8, floral: 2, woody: 3, musky: 6, fruity: 4, spicy: 3 },
        category: "citrus",
        recommendation: "생동감 있고 활력 넘치는 25-40대 남녀 모두에게 잘 어울립니다.",
        traits: { sexy: 5, cute: 6, charisma: 6, darkness: 1, freshness: 10, elegance: 4, freedom: 7, luxury: 5, purity: 8, uniqueness: 7 },
        keywords: ["활기참", "건강", "에너지", "생기", "청량함"],
        primaryColor: "#F9DB24",
        secondaryColor: "#7ECE6E"
    },
    {
        id: "AC'SCENT 14",
        name: "민트",
        description: "시원하고 청량한 민트 향이 매력적인 향수입니다. 상쾌하고 깔끔한 분위기를 연출합니다.",
        mood: "시원한, 청량한, 상쾌한, 깔끔한",
        personality: "청량하고 상쾌한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "민트" },
        subScent1: { name: "자스민" },
        subScent2: { name: "마테 잎" },
        characteristics: { citrus: 8, floral: 1, woody: 6, musky: 3, fruity: 4, spicy: 8 },
        category: "citrus",
        recommendation: "깨끗하고 세련된 감각의 28-42세 남녀 모두에게 잘 어울립니다.",
        traits: { sexy: 3, cute: 4, charisma: 6, darkness: 1, freshness: 10, elegance: 7, freedom: 3, luxury: 6, purity: 9, uniqueness: 6 },
        keywords: ["완벽주의", "청량함", "깔끔함", "정리정돈", "상쾌함"],
        primaryColor: "#ABDEE6",
        secondaryColor: "#FFFFFF"
    },
    {
        id: "AC'SCENT 15",
        name: "페티그레인",
        description: "상큼하면서도 우아한 페티그레인 향이 매력적인 향수입니다. 세련되고 깔끔한 분위기를 연출합니다.",
        mood: "상큼한, 우아한, 세련된, 깔끔한",
        personality: "세련되고 우아한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "페티그레인" },
        subScent1: { name: "비터오렌지" },
        subScent2: { name: "자몽" },
        characteristics: { citrus: 8, floral: 7, woody: 2, musky: 4, fruity: 3, spicy: 3 },
        category: "citrus",
        recommendation: "활기차고 세련된 감각의 30-45세 남녀에게 모두 잘 어울립니다.",
        traits: { sexy: 7, cute: 4, charisma: 8, darkness: 1, freshness: 9, elegance: 8, freedom: 10, luxury: 9, purity: 6, uniqueness: 7 },
        keywords: ["휴양지", "여행", "셀럽", "자유로움", "여유"],
        primaryColor: "#82B1FF",
        secondaryColor: "#FFD180"
    },
    {
        id: "AC'SCENT 16",
        name: "샌달우드",
        description: "따뜻하고 부드러운 샌달우드 향이 매력적인 향수입니다. 깊이 있고 편안한 분위기를 연출합니다.",
        mood: "따뜻한, 부드러운, 깊이있는, 편안한",
        personality: "따뜻하고 편안한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "샌달우드" },
        subScent1: { name: "암브록산" },
        subScent2: { name: "파피루스" },
        characteristics: { citrus: 9, floral: 2, woody: 3, musky: 3, fruity: 7, spicy: 2 },
        category: "citrus",
        recommendation: "카리스마 있고 성숙한 매력의 35-50대 남녀에게 잘 어울립니다.",
        traits: { sexy: 8, cute: 1, charisma: 9, darkness: 6, freshness: 2, elegance: 8, freedom: 4, luxury: 9, purity: 3, uniqueness: 7 },
        keywords: ["중후함", "깊이감", "신사적", "지적", "고급스러움"],
        primaryColor: "#5D4037",
        secondaryColor: "#D7CCC8"
    },
    {
        id: "AC'SCENT 17",
        name: "레몬페퍼",
        description: "상큼한 레몬과 스파이시한 후추가 어우러진 향수입니다. 독특하고 활기찬, 센스있는 분위기를 연출합니다.",
        mood: "상큼한, 스파이시한, 독특한, 활기찬",
        personality: "독특하고 센스있는 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "레몬페퍼" },
        subScent1: { name: "인센스" },
        subScent2: { name: "오리스" },
        characteristics: { citrus: 6, floral: 1, woody: 8, musky: 3, fruity: 1, spicy: 7 },
        category: "woody",
        recommendation: "자유분방하면서도 세련된 감각의 28-45세 남녀에게 잘 어울립니다.",
        traits: { sexy: 7, cute: 2, charisma: 6, darkness: 5, freshness: 8, elegance: 5, freedom: 9, luxury: 6, purity: 3, uniqueness: 10 },
        keywords: ["예술적", "자유로움", "독특함", "창의적", "비주류"],
        primaryColor: "#FFEB3B",
        secondaryColor: "#212121"
    },
    {
        id: "AC'SCENT 18",
        name: "핑크페퍼",
        description: "달콤하면서도 스파이시한 핑크페퍼 향이 매력적인 향수입니다. 유니크하고 세련된 분위기를 연출합니다.",
        mood: "달콤한, 스파이시한, 유니크한, 세련된",
        personality: "유니크하고 세련된 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "핑크페퍼" },
        subScent1: { name: "넛맥" },
        subScent2: { name: "민트" },
        characteristics: { citrus: 3, floral: 4, woody: 8, musky: 7, fruity: 1, spicy: 7 },
        category: "woody",
        recommendation: "도시적이고 세련된 감각의 30-45세 남성에게 특히 잘 어울립니다.",
        traits: { sexy: 6, cute: 3, charisma: 8, darkness: 3, freshness: 6, elegance: 7, freedom: 4, luxury: 8, purity: 2, uniqueness: 7 },
        keywords: ["바쁨", "워커홀릭", "도시적", "효율적", "현대적"],
        primaryColor: "#FF80AB",
        secondaryColor: "#424242"
    },
    {
        id: "AC'SCENT 19",
        name: "바다소금",
        description: "시원하고 청량한 바다소금 향이 매력적인 향수입니다. 깨끗하고 상쾌한 분위기를 연출합니다.",
        mood: "시원한, 청량한, 깨끗한, 상쾌한",
        personality: "깨끗하고 상쾌한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "바다소금" },
        subScent1: { name: "세이지" },
        subScent2: { name: "머스크" },
        characteristics: { citrus: 8, floral: 3, woody: 5, musky: 2, fruity: 4, spicy: 1 },
        category: "citrus",
        recommendation: "맨발로 모래 밟는 것이 인생 최고의 행복인 자유영혼에게 어울립니다.",
        traits: { sexy: 6, cute: 3, charisma: 6, darkness: 1, freshness: 10, elegance: 5, freedom: 10, luxury: 4, purity: 8, uniqueness: 7 },
        keywords: ["자유로움", "바다", "청량함", "자연스러움", "모험"],
        primaryColor: "#00B4D8",
        secondaryColor: "#E9F5F9"
    },
    {
        id: "AC'SCENT 20",
        name: "타임",
        description: "허브향이 강한 타임 향수입니다. 상쾌하면서도 깊이 있는 향이 매력적입니다.",
        mood: "상쾌한, 허브향, 깊이있는, 자연적인",
        personality: "자연적이고 깊이 있는 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "타임" },
        subScent1: { name: "시더우드" },
        subScent2: { name: "베티버" },
        characteristics: { citrus: 1, floral: 1, woody: 8, musky: 1, fruity: 1, spicy: 7 },
        category: "woody",
        recommendation: "도시와 숲 사이의 균형을 찾은 미스터리한 존재에게 어울립니다.",
        traits: { sexy: 6, cute: 2, charisma: 7, darkness: 5, freshness: 7, elegance: 6, freedom: 8, luxury: 5, purity: 4, uniqueness: 9 },
        keywords: ["균형", "미스터리", "아날로그", "자연", "도시"],
        primaryColor: "#3A5A40",
        secondaryColor: "#DAD7CD"
    },
    {
        id: "AC'SCENT 21",
        name: "머스크",
        description: "부드럽고 따뜻한 머스크 향이 매력적인 향수입니다. 섹시하고 포근한 분위기를 연출합니다.",
        mood: "부드러운, 따뜻한, 섹시한, 포근한",
        personality: "부드럽고 섹시한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "머스크" },
        subScent1: { name: "앰버" },
        subScent2: { name: "바닐라" },
        characteristics: { citrus: 2, floral: 3, woody: 4, musky: 7, fruity: 1, spicy: 4 },
        category: "musky",
        recommendation: "우아함이 직업이자 소명인 현대판 귀족에게 어울립니다.",
        traits: { sexy: 9, cute: 1, charisma: 8, darkness: 4, freshness: 3, elegance: 10, freedom: 4, luxury: 10, purity: 5, uniqueness: 7 },
        keywords: ["우아함", "품격", "고급", "파리지앵", "문화적"],
        primaryColor: "#9C7A5B",
        secondaryColor: "#EADFD3"
    },
    {
        id: "AC'SCENT 22",
        name: "화이트로즈",
        description: "순수하고 우아한 화이트로즈 향이 매력적인 향수입니다. 깨끗하고 로맨틱한 분위기를 연출합니다.",
        mood: "순수한, 우아한, 깨끗한, 로맨틱한",
        personality: "순수하고 로맨틱한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "화이트로즈" },
        subScent1: { name: "피오니" },
        subScent2: { name: "머스크" },
        characteristics: { citrus: 2, floral: 6, woody: 2, musky: 8, fruity: 2, spicy: 2 },
        category: "musky",
        recommendation: "순백의 아우라로 모든 공간을 정화하는 청순의 여신에게 어울립니다.",
        traits: { sexy: 5, cute: 6, charisma: 6, darkness: 1, freshness: 7, elegance: 9, freedom: 4, luxury: 8, purity: 10, uniqueness: 6 },
        keywords: ["순백", "청순", "정화", "천사", "빛나는"],
        primaryColor: "#FFFFFF",
        secondaryColor: "#F1F0EA"
    },
    {
        id: "AC'SCENT 23",
        name: "스웨이드",
        description: "부드럽고 따뜻한 스웨이드 향이 매력적인 향수입니다. 편안하고 고급스러운 분위기를 연출합니다.",
        mood: "부드러운, 따뜻한, 편안한, 고급스러운",
        personality: "편안하고 고급스러운 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "스웨이드" },
        subScent1: { name: "아이리스" },
        subScent2: { name: "앰버우드" },
        characteristics: { citrus: 2, floral: 6, woody: 8, musky: 7, fruity: 1, spicy: 4 },
        category: "woody",
        recommendation: "도시의 문화 엘리트, 스타일이 DNA에 새겨진 사람에게 어울립니다.",
        traits: { sexy: 7, cute: 2, charisma: 6, darkness: 3, freshness: 4, elegance: 8, freedom: 5, luxury: 8, purity: 3, uniqueness: 7 },
        keywords: ["세련됨", "문화적", "스타일", "도시적", "부티크"],
        primaryColor: "#A9927D",
        secondaryColor: "#F2F4F3"
    },
    {
        id: "AC'SCENT 24",
        name: "이탈리안만다린",
        description: "상큼하고 활기찬 이탈리안만다린 향이 매력적인 향수입니다. 밝고 에너지 넘치는 분위기를 연출합니다.",
        mood: "상큼한, 활기찬, 밝은, 에너지 넘치는",
        personality: "밝고 에너지 넘치는 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "이탈리안만다린" },
        subScent1: { name: "네롤리" },
        subScent2: { name: "머스크" },
        characteristics: { citrus: 7, floral: 3, woody: 5, musky: 8, fruity: 5, spicy: 1 },
        category: "citrus",
        recommendation: "존재 자체가 매혹적인 자연의 선물 같은 사람에게 어울립니다.",
        traits: { sexy: 9, cute: 5, charisma: 8, darkness: 2, freshness: 6, elegance: 7, freedom: 6, luxury: 6, purity: 5, uniqueness: 8 },
        keywords: ["매혹적", "페로몬", "자연스러움", "센슈얼", "타고난"],
        primaryColor: "#FF9A62",
        secondaryColor: "#FFF3E4"
    },
    {
        id: "AC'SCENT 25",
        name: "라벤더",
        description: "편안하고 안정적인 라벤더 향이 매력적인 향수입니다. 차분하고 힐링되는 분위기를 연출합니다.",
        mood: "편안한, 안정적인, 차분한, 힐링되는",
        personality: "차분하고 편안한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "라벤더" },
        subScent1: { name: "통카빈" },
        subScent2: { name: "샌달우드" },
        characteristics: { citrus: 3, floral: 3, woody: 7, musky: 8, fruity: 1, spicy: 7 },
        category: "woody",
        recommendation: "깊은 대화를 나눌 수 있는 지적 매력의 대가에게 어울립니다.",
        traits: { sexy: 6, cute: 2, charisma: 7, darkness: 4, freshness: 6, elegance: 8, freedom: 5, luxury: 7, purity: 4, uniqueness: 6 },
        keywords: ["지적", "중후함", "깊이있는", "재즈", "위스키"],
        primaryColor: "#8B80F9",
        secondaryColor: "#43281C"
    },
    {
        id: "AC'SCENT 26",
        name: "이탈리안사이프러스",
        description: "우디하고 시원한 사이프러스 향이 매력적인 향수입니다. 자연적이고 신비로운 분위기를 연출합니다.",
        mood: "우디한, 시원한, 자연적인, 신비로운",
        personality: "자연적이고 신비로운 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "이탈리안사이프러스" },
        subScent1: { name: "주니퍼" },
        subScent2: { name: "베티버" },
        characteristics: { citrus: 2, floral: 1, woody: 8, musky: 6, fruity: 4, spicy: 7 },
        category: "woody",
        recommendation: "밤의 제왕이라 불리는 어둠의 카리스마를 가진 사람에게 어울립니다.",
        traits: { sexy: 8, cute: 1, charisma: 9, darkness: 9, freshness: 4, elegance: 7, freedom: 5, luxury: 6, purity: 2, uniqueness: 10 },
        keywords: ["미스터리", "어둠", "카리스마", "수수께끼", "밤"],
        primaryColor: "#1C2321",
        secondaryColor: "#7D98A1"
    },
    {
        id: "AC'SCENT 27",
        name: "스모키 블렌드 우드",
        description: "깊고 스모키한 우드 향이 매력적인 향수입니다. 신비롭고 강렬한 분위기를 연출합니다.",
        mood: "스모키한, 깊은, 신비로운, 강렬한",
        personality: "깊이 있고 신비로운 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "스모키 블렌드 우드" },
        subScent1: { name: "가이악우드" },
        subScent2: { name: "앰버" },
        characteristics: { citrus: 1, floral: 3, woody: 9, musky: 7, fruity: 4, spicy: 7 },
        category: "woody",
        recommendation: "VIP 라운지의 단골손님, 타고난 사업가에게 어울립니다.",
        traits: { sexy: 8, cute: 1, charisma: 9, darkness: 7, freshness: 2, elegance: 8, freedom: 4, luxury: 10, purity: 3, uniqueness: 7 },
        keywords: ["품격", "성공", "VIP", "깊이", "사업가"],
        primaryColor: "#4A4238",
        secondaryColor: "#C69F6A"
    },
    {
        id: "AC'SCENT 28",
        name: "레더",
        description: "고급스럽고 따뜻한 가죽 향이 매력적인 향수입니다. 세련되고 카리스마 있는 분위기를 연출합니다.",
        mood: "고급스러운, 따뜻한, 세련된, 카리스마있는",
        personality: "세련되고 카리스마 있는 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "레더" },
        subScent1: { name: "오드" },
        subScent2: { name: "바닐라" },
        characteristics: { citrus: 2, floral: 1, woody: 6, musky: 7, fruity: 5, spicy: 8 },
        category: "spicy",
        recommendation: "미식의 신, 세련된 취향의 표본인 사람에게 어울립니다.",
        traits: { sexy: 7, cute: 1, charisma: 8, darkness: 5, freshness: 3, elegance: 9, freedom: 4, luxury: 10, purity: 2, uniqueness: 8 },
        keywords: ["미식가", "컬렉터", "고급취향", "세련됨", "감각적"],
        primaryColor: "#6B3D2E",
        secondaryColor: "#BCAA99"
    },
    {
        id: "AC'SCENT 29",
        name: "바이올렛",
        description: "섬세하고 우아한 바이올렛 향이 매력적인 향수입니다. 로맨틱하고 여성스러운 분위기를 연출합니다.",
        mood: "섬세한, 우아한, 로맨틱한, 여성스러운",
        personality: "섬세하고 로맨틱한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "바이올렛" },
        subScent1: { name: "아이리스" },
        subScent2: { name: "시더우드" },
        characteristics: { citrus: 2, floral: 6, woody: 7, musky: 6, fruity: 4, spicy: 2 },
        category: "floral",
        recommendation: "패션위크 프론트로에 앉아야 직성이 풀리는 트렌드의 여왕에게 어울립니다.",
        traits: { sexy: 7, cute: 3, charisma: 8, darkness: 4, freshness: 5, elegance: 7, freedom: 6, luxury: 8, purity: 4, uniqueness: 10 },
        keywords: ["트렌드", "아방가르드", "패션", "예술적", "선구자"],
        primaryColor: "#9370DB",
        secondaryColor: "#F6F0F9"
    },
    {
        id: "AC'SCENT 30",
        name: "무화과",
        description: "달콤하면서도 깊이 있는 무화과 향이 매력적인 향수입니다. 포근하고 안정적인, 성숙한 분위기를 연출합니다.",
        mood: "달콤한, 포근한, 안정적인, 성숙한",
        personality: "포근하고 성숙한 매력을 가진 사람에게 어울립니다.",
        mainScent: { name: "무화과" },
        subScent1: { name: "코코넛" },
        subScent2: { name: "머스크" },
        characteristics: { citrus: 3, floral: 5, woody: 6, musky: 7, fruity: 6, spicy: 3 },
        category: "fruity",
        recommendation: "인생 승리자, 여유로움이 몸에 베인 품격의 상징인 사람에게 어울립니다.",
        traits: { sexy: 7, cute: 2, charisma: 7, darkness: 3, freshness: 6, elegance: 9, freedom: 5, luxury: 10, purity: 4, uniqueness: 6 },
        keywords: ["여유", "품격", "승리자", "와인", "고급"],
        primaryColor: "#7E5546",
        secondaryColor: "#FCF1D5"
    }
]

// 카테고리 설명
export const categoryDescriptions: Record<string, string> = {
    citrus: "상쾌하고 활기찬 시트러스 향",
    floral: "우아하고 여성스러운, 꽃의 향기",
    woody: "깊고 따뜻한 나무 향",
    musky: "포근하고 관능적인 머스크 향",
    fruity: "달콤하고 즙이 많은 과일 향",
    spicy: "자극적이고 강렬한 스파이시 향"
}

// 특성 설명
export const traitDescriptions: Record<string, string> = {
    sexy: "관능적이고 매혹적인 에너지",
    cute: "애교스럽고 사랑스러운 매력",
    charisma: "강한 존재감과 영향력",
    darkness: "신비롭고 깊은 어둠의 매력",
    freshness: "상쾌하고 맑은 에너지",
    elegance: "고상하고 품격 있는 분위기",
    freedom: "구속되지 않는 자유분방한 영혼",
    luxury: "고급스럽고 풍요로운 아우라",
    purity: "깨끗하고 맑은 순백의 이미지",
    uniqueness: "남다르고 개성 강한 정도"
}

// 향료 ID로 찾기
export function getPerfumeById(id: string): Perfume | undefined {
    return perfumes.find(p => p.id === id)
}

// 향료 이름으로 찾기
export function getPerfumeByName(name: string): Perfume | undefined {
    return perfumes.find(p => p.name === name)
}

// 카테고리별 향료 목록
export function getPerfumesByCategory(category: string): Perfume[] {
    return perfumes.filter(p => p.category === category)
}
