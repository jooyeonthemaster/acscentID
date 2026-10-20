// 포토부스 프로그램 14종(2026-10-15 목업 design-review/photobooth-program-flows-20261015) — 운영 모드 하나가 프로그램 하나다.
// 화면(src/app/booth/programs)·생성 서버(src/lib/booth/programs/prompts.ts)·데모 랜딩(/booth-demo)·운영 모드(modes.ts)가 이 목록을 같이 읽는다.
// 흐름은 공통: 시작 → 촬영/업로드 → 옵션 → 생성 → 결과 → 저장. 영상 둘(뮤직비디오·추억 무비)만 흐름이 다르다(kind).
// 옵션의 prompt 는 생성 서버가 id 로 다시 찾아 쓴다 — 화면에서 보낸 문장은 쓰지 않는다.

export const PROGRAM_IDS = [
  'runway', 'fashion-time', 'idol-makeup', 'fan-card', 'graduation', 'history', 'timecapsule',
  'brand-avatar', 'hanbok', 'traditional', 'wedding', 'future-family', 'music-video', 'memory-movie',
  // 2026 대한민국 주거복지대전(2026-12-16) 특화 — docs/photobooth-programs.md '주거복지대전 3종'
  'housing-movein', 'housing-cover', 'housing-2046',
] as const
export type ProgramId = (typeof PROGRAM_IDS)[number]

/** photo: AI 사진 한 장 → 4×6 인화·QR / mv: 15초 촬영 영상 편집 / movie: 휴대폰 사진 5~20장 → 슬라이드 영상 */
export type ProgramKind = 'photo' | 'mv' | 'movie'

export interface ProgramOption {
  id: string
  label: string
  sub?: string
  /** 타일 바탕(CSS background) — 사진 대신 색·무늬로 보여 준다 */
  swatch?: string
  /** 생성 프롬프트 조각(영어) */
  prompt?: string
}

export interface ProgramOptionGroup {
  id: string
  label: string
  /** tiles: 큰 타일 / chips: 한 줄 버튼 / swatches: 둥근 색 */
  look: 'tiles' | 'chips' | 'swatches'
  options: ProgramOption[]
}

export interface ProgramDef {
  id: ProgramId
  kind: ProgramKind
  /** 화면 위 서비스 이름(작은 글씨) */
  name: string
  /** 서비스 워드마크 — 목업의 컨셉 로고(AC'SCENT 표기는 넣지 않는다) */
  wordmark: string
  /** 시작 화면 큰 문구(줄바꿈 \n) */
  headline: string
  lead: string
  /** 시작 화면 3단계 */
  steps: [string, string, string]
  startCta: string
  capture: {
    title: string
    hint: string
    /** 생성에 넣는 사람 수 */
    people: 1 | 2
    /** 2: 두 사람을 따로 한 장씩(미래 가족) — 없으면 한 장에 모두 */
    shots: 1 | 2
    /** 혼자도 여럿(최대 4명)도 한 컷에 — 찍힌 사람 수 그대로 생성한다(입주 기념사진) */
    group?: boolean
  }
  options: { title: string; sub: string; cta: string; groups: ProgramOptionGroup[] }
  generating: { title: string; sub: string; stages: [string, string, string] }
  result: { title: string; sub: string }
  save: { title: string; sub: string }
  /** 창작(상상) 이미지 안내 — 화면에 늘 보인다 */
  creative?: string
  /** 시작 화면 소개 그림(목업 예시 인물 — 소개에만 쓴다) */
  intro: string
  /** 화면 아래 손글씨 한 줄 */
  script: string
  /** 인화 디자인 2종 이름 */
  designs: [string, string]
  /** 데모 카드 */
  card: { tag: string; desc: string; color: string; badges: string[] }
}

const intro = (id: ProgramId) => `/assets/booth-programs/${id}.webp`

/** 사진 프로그램의 기본 시간 */
const PHOTO_STAGES: [string, string, string] = ['사진 확인', '스타일 생성 중', '마무리']

export const PROGRAMS: ProgramDef[] = [
  {
    id: 'runway', kind: 'photo', name: '런웨이 포토부스', wordmark: 'WALK!',
    headline: '오늘, 런웨이의\n주인공은 나', lead: '단 3단계로 나만의 런웨이 포스터를 만들어 보세요',
    steps: ['촬영', '스타일', '완성'], startCta: '런웨이 시작하기',
    capture: { title: '카메라를 바라봐 주세요', hint: '얼굴과 어깨가 가이드 안에 들어오게 서 주세요', people: 1, shots: 1 },
    options: {
      title: '어떤 룩으로 걸을까요?', sub: '원하는 스타일을 선택해 주세요', cta: '이 룩으로 만들기',
      groups: [
        { id: 'look', label: '룩', look: 'tiles', options: [
          { id: 'minimal', label: '미니멀', sub: '블랙 수트', swatch: 'linear-gradient(160deg,#2b2b2b,#0c0c0c)', prompt: 'a sharp minimal black tailored suit with clean lines, monochrome high-fashion styling' },
          { id: 'glam', label: '글램', sub: '시퀸·새틴', swatch: 'linear-gradient(160deg,#5a2440,#140910 70%), radial-gradient(circle at 30% 30%,#ff7aa8,transparent 40%)', prompt: 'a glamorous sequined evening look with satin and subtle sparkle, couture runway styling' },
          { id: 'street', label: '스트리트', sub: '레더·오버핏', swatch: 'linear-gradient(160deg,#3a3a3a,#111 60%,#e8336d)', prompt: 'an edgy streetwear runway look: oversized leather jacket, layered pieces, chunky boots' },
        ] },
        { id: 'stage', label: '어떤 배경에서 촬영할까요?', look: 'chips', options: [
          { id: 'runway', label: '런웨이', prompt: 'walking on a glossy fashion-week runway with a dark audience and dramatic spotlights, photographers flashing along the sides' },
          { id: 'studio', label: '스튜디오', prompt: 'a high-fashion studio with a seamless dark backdrop and dramatic rim light' },
        ] },
      ],
    },
    generating: { title: '나의 런웨이를 만드는 중', sub: '조금만 기다려 주세요. 멋진 포스터로 완성하고 있어요.', stages: PHOTO_STAGES },
    result: { title: '나의 런웨이 포스터', sub: '가장 마음에 드는 디자인을 선택하세요' },
    save: { title: '나의 런웨이를 가져가세요', sub: '지금, 이 특별한 순간을 간직하세요' },
    intro: intro('runway'), script: 'My Runway', designs: ['MY RUNWAY 포스터', '런웨이 프레임'],
    card: { tag: 'WALK!', desc: '한 컷을 찍으면 패션위크 런웨이 위의 나를 포스터로 만들어 줘요.', color: '#e8336d', badges: ['AI 생성', '4×6 인화', 'QR 저장'] },
  },
  {
    id: 'fashion-time', kind: 'photo', name: '패션 타임머신', wordmark: 'ERA!',
    headline: '시대를 바꾸면,\n새로운 내가 보여요', lead: '지금의 나를 찍고, 다른 시대의 스타일로 만나 보세요',
    steps: ['촬영', '시대 선택', '완성'], startCta: '시간 여행 시작하기',
    capture: { title: '지금의 나를\n담아 주세요', hint: '지금 이 순간, 가장 멋진 당신을 촬영합니다', people: 1, shots: 1 },
    options: {
      title: '어느 시대로 가볼까요?', sub: '같은 나, 다른 시대의 스타일을 만나 보세요', cta: '이 시대로 떠나기',
      groups: [
        { id: 'era', label: '시대', look: 'tiles', options: [
          { id: '1970s', label: '1970s', sub: '코듀로이·보헤미안', swatch: 'linear-gradient(160deg,#a0612e,#5a3218)', prompt: 'authentic 1970s fashion: corduroy suit, wide collars, flared trousers, a printed silk scarf, warm vintage interior' },
          { id: '1990s', label: '1990s', sub: '데님·캐주얼', swatch: 'linear-gradient(160deg,#4f6f95,#23364f)', prompt: 'authentic 1990s fashion: double denim, oversized jacket, minimalist 90s styling, plain studio backdrop' },
          { id: '2000s', label: '2000s', sub: '트랙·Y2K', swatch: 'linear-gradient(160deg,#28457a,#121c33 60%,#e9e9e9)', prompt: 'authentic early 2000s Y2K fashion: track jacket with stripes, low-rise styling, playful accessories' },
        ] },
        { id: 'tone', label: '필름 톤', look: 'chips', options: [
          { id: 'warm', label: '따뜻한 필름', prompt: 'warm faded analog film color grade with soft grain' },
          { id: 'vivid', label: '선명한 컬러', prompt: 'vivid saturated color film look, crisp and bright' },
        ] },
      ],
    },
    generating: { title: '시간을\n건너는 중이에요', sub: '그 시절의 분위기로, 새로운 나를 만들고 있어요', stages: ['사진 확인', '룩 생성 중', '마무리'] },
    result: { title: '그 시절의 나를 만났어요', sub: '다른 시대의 나도 만나 보세요' },
    save: { title: '이 순간을 간직하세요', sub: 'QR 코드를 스캔하거나, 바로 인쇄할 수 있어요' },
    intro: intro('fashion-time'), script: 'Same me, Different time', designs: ['폴라로이드', '빈티지 매거진'],
    card: { tag: 'ERA!', desc: '1970년대·1990년대·2000년대 — 같은 얼굴로 그 시절 패션을 입어 봐요.', color: '#1e4fbf', badges: ['AI 생성', '4×6 인화', 'QR 저장'] },
  },
  {
    id: 'idol-makeup', kind: 'photo', name: '아이돌 메이크업 포토부스', wordmark: 'IDOL!',
    headline: '오늘은 내가 주인공', lead: '사진 한 장으로 만나는 또 다른 나',
    steps: ['촬영', '콘셉트', '완성'], startCta: '나의 무대 시작하기',
    capture: { title: '나의 얼굴을 담아 주세요', hint: '정면을 보고 미소 지어 주세요', people: 1, shots: 1 },
    options: {
      title: '어떤 무대에 설까요?', sub: '원하는 콘셉트를 선택해 보세요', cta: '이 콘셉트로 만들기',
      groups: [
        // 기존 AI 아이돌 컨셉(src/lib/booth/idol-concepts.ts)을 그대로 쓴다 — id 가 같다
        { id: 'concept', label: '콘셉트', look: 'tiles', options: [
          { id: 'ending-fairy', label: '엔딩 요정', swatch: 'linear-gradient(160deg,#f6a6d8,#8a5cf0)' },
          { id: 'album-jacket', label: '앨범 재킷', swatch: 'linear-gradient(160deg,#d8d2c8,#8b7d6b)' },
          { id: 'stage-fancam', label: '무대 직캠', swatch: 'linear-gradient(160deg,#ff3d6e,#2a0b2e)' },
          { id: 'mv-still', label: '뮤비 스틸', swatch: 'linear-gradient(160deg,#18c4d8,#4a1a8a)' },
        ] },
        { id: 'intensity', label: '메이크업 강도', look: 'chips', options: [
          { id: 'soft', label: '은은하게', prompt: 'Keep the stage makeup soft and subtle — sheer color, natural glow.' },
          { id: 'sparkle', label: '반짝이게', prompt: 'Make the stage makeup bold and sparkling — glitter accents and stronger color, still never reshaping features.' },
        ] },
      ],
    },
    generating: { title: '나의 무대를 만드는 중', sub: '가장 빛나는 순간을 준비하고 있어요', stages: PHOTO_STAGES },
    result: { title: '나만의 무대가 완성됐어요', sub: '마음에 드는 디자인을 선택하세요' },
    save: { title: '반짝이는 순간을 가져가세요', sub: '지금 이 사진을 저장하거나 인쇄할 수 있어요' },
    intro: intro('idol-makeup'), script: 'More than a Photo', designs: ['MY STAGE', '포토카드'],
    card: { tag: 'IDOL!', desc: '엔딩요정·앨범 재킷·직캠·뮤비 — 메이크업 강도까지 골라 내 얼굴 그대로 아이돌 무대에.', color: '#d63fa8', badges: ['AI 생성', '4×6 인화', 'QR 저장'] },
  },
  {
    id: 'fan-card', kind: 'photo', name: '팬 포토카드 메이커', wordmark: 'WITH!',
    headline: '내가 주인공인 한 장', lead: '작은 순간도, 특별한 추억이 돼요',
    steps: ['촬영', '꾸미기', '완성'], startCta: '포토카드 만들기',
    capture: { title: '나만의 포즈를\n보여 주세요', hint: '얼굴을 가이드에 맞춰 주세요', people: 1, shots: 1 },
    options: {
      title: '나만의 카드를 꾸며요', sub: '작은 디테일이 더 특별한 추억이 돼요', cta: '이 디자인으로 만들기',
      groups: [
        { id: 'frame', label: '프레임 선택', look: 'tiles', options: [
          { id: 'lavender', label: '라벤더', swatch: 'linear-gradient(140deg,#e9e1ff,#c8b8f5)' },
          { id: 'cream', label: '크림', swatch: 'linear-gradient(140deg,#fff7ea,#f1dfc0)' },
          { id: 'black', label: '블랙', swatch: 'linear-gradient(140deg,#2a2a2e,#0d0d10)' },
        ] },
        { id: 'sticker', label: '스티커 추가', look: 'chips', options: [
          { id: 'star', label: '별' }, { id: 'heart', label: '하트' }, { id: 'crown', label: '왕관' },
        ] },
        { id: 'caption', label: '카드 문구', look: 'chips', options: [
          { id: 'shine', label: '오늘도 빛나는 나' }, { id: 'good-day', label: 'Good Day ♡' }, { id: 'keep-going', label: 'Keep Going' },
        ] },
      ],
    },
    generating: { title: '나만의 카드를 만드는 중', sub: '특별한 한 장이 곧 완성될 거예요', stages: ['사진 확인', '카드 생성 중', '마무리'] },
    result: { title: '나만의 포토카드 완성', sub: '다양한 프레임으로, 더 특별한 한 장을 만들어 보세요' },
    save: { title: '나의 한 장을 가져가세요', sub: '소중한 오늘의 기록, 지금 바로 저장하고 인쇄해 보세요' },
    intro: intro('fan-card'), script: '오늘도 빛나는 나', designs: ['포토카드 2장', '카드 한 장 크게'],
    card: { tag: 'WITH!', desc: '내 사진을 포토카드 화보처럼 다듬고, 프레임·스티커·문구로 꾸며 카드로 뽑아요.', color: '#3f5bd8', badges: ['AI 보정', '4×6 인화', 'QR 저장'] },
  },
  {
    id: 'graduation', kind: 'photo', name: '졸업 포토부스', wordmark: 'GRAD!',
    headline: '빛나는 오늘을\n졸업 사진으로', lead: '가운과 배경을 나답게',
    steps: ['가운 선택', '배경 선택', '나만의 스타일'], startCta: '졸업 사진 만들기',
    capture: { title: '카메라를 바라봐요', hint: '얼굴을 가이드 안에 맞춰 주세요', people: 1, shots: 1 },
    options: {
      title: '나만의 졸업 스타일', sub: '가운, 배경, 학사모를 선택하고 특별한 졸업 사진을 만들어 보세요', cta: '이 스타일로 만들기',
      groups: [
        { id: 'gown', label: '가운', look: 'tiles', options: [
          { id: 'green', label: '그린', swatch: 'linear-gradient(160deg,#2d6a4a,#163a28)', prompt: 'a deep forest-green graduation gown with a white collar' },
          { id: 'black', label: '블랙', swatch: 'linear-gradient(160deg,#333,#0b0b0b)', prompt: 'a classic black graduation gown with a white collar' },
          { id: 'navy', label: '네이비', swatch: 'linear-gradient(160deg,#2c4b8c,#13234a)', prompt: 'a navy-blue graduation gown with a white collar' },
        ] },
        { id: 'cap', label: '학사모', look: 'chips', options: [
          { id: 'on', label: '학사모 ON', prompt: 'wearing a matching square academic cap with a gold tassel' },
          { id: 'off', label: '학사모 OFF', prompt: 'no cap, hair neatly styled' },
        ] },
        { id: 'place', label: '배경', look: 'tiles', options: [
          { id: 'campus', label: '캠퍼스', swatch: 'linear-gradient(160deg,#a9c7a0,#6b8f6a 60%,#c9b79a)', prompt: 'a sunny university campus with stone buildings and green trees, softly blurred' },
          { id: 'studio', label: '스튜디오', swatch: 'linear-gradient(160deg,#f3eee6,#d8cfc2)', prompt: 'a clean warm-cream photo studio backdrop with soft light' },
          { id: 'garden', label: '정원', swatch: 'linear-gradient(160deg,#d7e8c5,#8db07a 60%,#f2d7e3)', prompt: 'a blooming garden with white flowers and soft spring light' },
        ] },
      ],
    },
    generating: { title: '빛나는 순간을 만들어요', sub: '잠시만 기다려 주세요. 소중한 추억을 정성스럽게 만들고 있어요.', stages: ['사진 확인', '스타일 적용', '사진 완성'] },
    result: { title: '오늘의 나를 기념해요', sub: '마음에 드는 디자인을 선택하세요' },
    save: { title: '졸업의 순간을 가져가요', sub: 'QR로 받거나 바로 인쇄할 수 있어요' },
    intro: intro('graduation'), script: 'Good Things Ahead', designs: ['졸업 앨범', '꽃 프레임'],
    card: { tag: 'GRAD!', desc: '가운 색·학사모·배경을 골라 졸업 앨범 같은 한 장을 만들어요.', color: '#1f5a3d', badges: ['AI 생성', '4×6 인화', 'QR 저장'] },
  },
  {
    id: 'history', kind: 'photo', name: '역사 속 한 장면', wordmark: 'TIME!',
    headline: '역사 속 한 장면,\n그 주인공이 되어봐요', lead: '역사에서 영감을 받은 상상화',
    steps: ['역할', '장면', '나만의 기록'], startCta: '역사 속으로 떠나기',
    capture: { title: '시간 여행을 준비해요', hint: '얼굴을 가이드 안에 맞춰 주세요', people: 1, shots: 1 },
    options: {
      title: '어떤 장면으로 떠날까요?', sub: '역사에서 영감을 받은 상상화', cta: '이 장면으로 만들기',
      groups: [
        { id: 'role', label: '역할 선택', look: 'chips', options: [
          { id: 'painter', label: '화원', prompt: 'as a Joseon-era court painter holding a fine brush in front of a silk painting on an easel' },
          { id: 'astronomer', label: '천문관', prompt: 'as a Joseon-era royal astronomer beside a bronze armillary sphere' },
          { id: 'scribe', label: '기록관', prompt: 'as a Joseon-era royal scribe writing on hanji scrolls at a low desk' },
        ] },
        { id: 'scene', label: '장면 선택', look: 'chips', options: [
          { id: 'palace', label: '궁궐 정원', prompt: 'in a palace garden with a traditional pavilion and pink spring blossoms' },
          { id: 'study', label: '한옥 서재', prompt: 'in a calm hanok study with paper windows and wooden shelves' },
          { id: 'night', label: '별빛 마당', prompt: 'in a hanok courtyard under a starry night sky with paper lanterns' },
        ] },
      ],
    },
    generating: { title: '시간을 건너는 중이에요', sub: '역사에서 영감을 받은 상상화', stages: ['사진 확인', '장면 구성', '그림 완성'] },
    result: { title: '나의 역사 속 한 장면', sub: '역사에서 영감을 받은 상상화' },
    save: { title: '시간 여행을 간직해요', sub: '특별한 순간을 오래도록 간직하세요' },
    creative: '역사 기록이 아니라, 역사에서 영감을 받은 상상화예요',
    intro: intro('history'), script: '꽃이 피는 역사 속에서도, 나는 있었다', designs: ['화첩', '족자'],
    card: { tag: 'TIME!', desc: '화원·천문관·기록관이 되어 궁궐 정원이나 별빛 마당의 한 장면 속으로. 역사에서 영감을 받은 상상화예요.', color: '#b23a2a', badges: ['AI 생성', '상상화', '4×6 인화'] },
  },
  {
    id: 'timecapsule', kind: 'photo', name: '타임캡슐 포토', wordmark: 'LATER!',
    headline: '오늘의 나, 미래의 나', lead: '미래를 상상하는 사진',
    steps: ['오늘 촬영', '미래 선택', '미래의 나'], startCta: '미래의 나 만나기',
    capture: { title: '오늘의 모습을 담아요', hint: '얼굴을 가이드 안에 맞춰 주세요', people: 1, shots: 1 },
    options: {
      title: '어떤 미래를 만나볼까요?', sub: '실제 미래 모습과는 다를 수 있어요', cta: '이 미래로 만들기',
      groups: [
        { id: 'years', label: '몇 년 후의 나를 볼까요?', look: 'tiles', options: [
          { id: '10', label: '10년 후', swatch: 'linear-gradient(160deg,#dcd6ff,#8f86e8)', prompt: 'about 10 years older than in the photo, with subtle natural signs of maturity' },
          { id: '20', label: '20년 후', swatch: 'linear-gradient(160deg,#c9c3f5,#5c55c8)', prompt: 'about 20 years older than in the photo, gracefully aged with natural fine lines and a mature look' },
        ] },
        { id: 'place', label: '어떤 배경에서 만나볼까요?', look: 'tiles', options: [
          { id: 'city', label: '도시', swatch: 'linear-gradient(160deg,#a7c5e8,#5d7da8)', prompt: 'in a bright modern city street at golden hour' },
          { id: 'nature', label: '자연', swatch: 'linear-gradient(160deg,#a8d8b9,#3f7f63)', prompt: 'by a calm lake with mountains and trees on a clear day' },
        ] },
      ],
    },
    generating: { title: '미래의 장면을 만들어요', sub: '지금의 내가, 조금 더 빛나는 내일과 만나고 있어요', stages: ['사진 확인', '미래 상상', '사진 완성'] },
    result: { title: '미래의 나에게 인사해요', sub: '미래를 상상하는 사진' },
    save: { title: '상상한 내일을 간직해요', sub: '지금의 소중한 순간을, 오래도록' },
    creative: '재미로 보는 상상 사진이에요. 실제 미래 모습과는 다를 수 있어요',
    intro: intro('timecapsule'), script: '언제나, 더 빛날 너에게', designs: ['오늘 · 미래 나란히', '미래 엽서'],
    card: { tag: 'LATER!', desc: '오늘의 나를 찍고 10년·20년 후의 나를 상상해 봐요. 재미로 보는 창작 이미지예요.', color: '#5b55d6', badges: ['AI 생성', '창작 이미지', '4×6 인화'] },
  },
  {
    id: 'brand-avatar', kind: 'photo', name: '브랜드 아바타 메이커', wordmark: 'AVATAR!',
    headline: '브랜드 무드로\n다시 만나는 나', lead: '사진 한 장과 취향으로 만드는 캐릭터',
    steps: ['촬영', '무드', '아바타'], startCta: '내 아바타 만들기',
    capture: { title: '나의 모습을 담아요', hint: '안경은 그대로 착용해도 좋아요', people: 1, shots: 1 },
    options: {
      title: '어떤 무드가 좋으세요?', sub: '찍은 사진으로 캐릭터를 만들어요', cta: '이 스타일로 만들기',
      groups: [
        { id: 'mood', label: '무드', look: 'tiles', options: [
          { id: 'minimal', label: '미니멀', swatch: 'linear-gradient(160deg,#e9f3ee,#b9d8c8)', prompt: 'a clean minimal 3D character style with soft matte materials and simple shapes' },
          { id: 'playful', label: '플레이풀', swatch: 'linear-gradient(160deg,#ece6ff,#b3a2f2)', prompt: 'a playful, cute 3D animated character style with big expressive eyes and glossy soft materials' },
          { id: 'natural', label: '내추럴', swatch: 'linear-gradient(160deg,#f6ecdf,#d8bf9e)', prompt: 'a warm natural 3D character style with soft knit textures and earthy tones' },
        ] },
        { id: 'color', label: '포인트 컬러', look: 'swatches', options: [
          { id: 'violet', label: '보라', swatch: '#6d5ce8', prompt: 'violet' },
          { id: 'pink', label: '핑크', swatch: '#f2a7c3', prompt: 'soft pink' },
          { id: 'mint', label: '민트', swatch: '#8fcfaa', prompt: 'mint green' },
          { id: 'yellow', label: '옐로', swatch: '#f4c45a', prompt: 'warm yellow' },
        ] },
        { id: 'format', label: '결과물 형식', look: 'chips', options: [
          { id: 'profile', label: '프로필', prompt: 'a chest-up profile portrait on a plain pastel background' },
          { id: 'sticker', label: '스티커', prompt: 'a cheerful sticker-style pose with a playful hand gesture on a plain pastel background' },
        ] },
      ],
    },
    generating: { title: '나만의 캐릭터를 만들어요', sub: '선택한 무드를 입히고 있어요', stages: ['사진 확인', '캐릭터 구성', '아바타 완성'] },
    result: { title: '나의 아바타가 완성됐어요', sub: '사진 속 나를 닮은 캐릭터예요' },
    save: { title: '나만의 캐릭터를 가져가요', sub: 'QR로 받거나 아바타 카드로 인쇄해요' },
    intro: intro('brand-avatar'), script: '오늘, 좋은 하루 되세요!', designs: ['아바타 카드', '사진 · 아바타'],
    card: { tag: 'AVATAR!', desc: '카메라에는 실제 내 모습, 결과는 나를 닮은 3D 캐릭터. 무드와 포인트 컬러를 골라요.', color: '#5b48e0', badges: ['AI 생성', '캐릭터', '4×6 인화'] },
  },
  {
    id: 'hanbok', kind: 'photo', name: '한복 포토부스', wordmark: 'HANBOK!',
    headline: '오늘의 나를\n한복으로 기억해요', lead: '전통이 오늘의 특별한 순간이 되도록',
    steps: ['촬영', '한복 선택', '저장'], startCta: '한복 사진 만들기',
    capture: { title: '정면을 바라봐 주세요', hint: '얼굴과 어깨가 보이도록 맞춰 주세요', people: 1, shots: 1 },
    options: {
      title: '어떤 한복을 입어볼까요?', sub: '한복과 배경을 골라 주세요', cta: '이 모습으로 만들기',
      groups: [
        { id: 'hanbok', label: '한복', look: 'tiles', options: [
          { id: 'jade', label: '옥빛', swatch: 'linear-gradient(160deg,#cfe3d6,#6f9f86)', prompt: 'an elegant jade-green and ivory hanbok' },
          { id: 'white', label: '백색', swatch: 'linear-gradient(160deg,#fbf8f1,#e4dccb)', prompt: 'a refined ivory-white hanbok with subtle silk patterns' },
          { id: 'pink', label: '연분홍', swatch: 'linear-gradient(160deg,#fbe0e4,#e9a7b4)', prompt: 'a soft pale-pink hanbok with delicate silk embroidery' },
        ] },
        { id: 'place', label: '배경', look: 'tiles', options: [
          { id: 'palace', label: '궁궐', swatch: 'linear-gradient(160deg,#cfd9df,#7d8f7a 60%,#b0473b)', prompt: 'in front of a traditional Korean palace with pine trees' },
          { id: 'hanji', label: '한지', swatch: 'linear-gradient(160deg,#f6f0e3,#e2d6bd)', prompt: 'in front of a plain textured hanji paper backdrop, studio light' },
          { id: 'garden', label: '정원', swatch: 'linear-gradient(160deg,#e7f0dc,#9cbf8c 60%,#f2c9d4)', prompt: 'in a traditional Korean garden with a lotus pond and blossoms' },
        ] },
      ],
    },
    generating: { title: '한복의 아름다움을 담고 있어요', sub: '잠시만 기다려 주세요', stages: ['사진 확인 완료', '한복과 배경 만드는 중', '마지막 손질'] },
    result: { title: '나만의 한복 사진이 완성됐어요', sub: '마음에 드는 디자인을 선택하세요' },
    save: { title: '오늘의 순간을 간직하세요', sub: '좋은 날, 오래 간직되기를' },
    intro: intro('hanbok'), script: '전통이 오늘의 특별한 순간이 되도록', designs: ['단아한 액자', '전신 포스터'],
    card: { tag: 'HANBOK!', desc: '옥빛·백색·연분홍 한복과 궁궐·한지·정원 배경으로 단아한 한 장을.', color: '#2f6b4f', badges: ['AI 생성', '4×6 인화', 'QR 저장'] },
  },
  {
    id: 'traditional', kind: 'photo', name: '전통 화가', wordmark: 'INK!',
    headline: '내 얼굴이\n한 폭의 그림으로', lead: '붓결로 남기는 특별한 초상',
    steps: ['촬영', '화풍', '작품'], startCta: '내 초상화 그리기',
    capture: { title: '나의 모습을 담아볼까요?', hint: '얼굴을 가이드 안에 맞춰 주세요', people: 1, shots: 1 },
    options: {
      title: '어떤 붓결이 좋으세요?', sub: '화풍을 골라 주세요', cta: '이 화풍으로 그리기',
      groups: [
        { id: 'style', label: '화풍', look: 'tiles', options: [
          { id: 'oriental', label: '동양화', sub: '은은한 색과 부드러운 붓결', swatch: 'linear-gradient(160deg,#eef1f4,#9fb3c6)', prompt: 'a soft East Asian watercolor portrait painting with gentle blue-grey mountains and plum blossoms, delicate brush lines on rice paper' },
          { id: 'minhwa', label: '민화', sub: '선명한 색과 모란', swatch: 'linear-gradient(160deg,#f6c7a8,#d0483a 60%,#2f6b4f)', prompt: 'a vivid Korean folk painting (minhwa) portrait with bold flat colors, peonies and decorative patterns' },
          { id: 'ink', label: '수묵화', sub: '먹의 농담', swatch: 'linear-gradient(160deg,#f2f0ea,#6e6a62)', prompt: 'a monochrome ink-wash (sumukhwa) portrait painting with expressive black ink brush strokes and bamboo' },
        ] },
      ],
    },
    generating: { title: '한 붓씩 나를 담고 있어요', sub: '잠시만 기다려 주세요', stages: ['사진 확인 완료', '붓결 입히는 중', '작품 마무리'] },
    result: { title: '한 폭의 그림이\n완성됐어요', sub: '마음에 드는 표구를 골라 주세요' },
    save: { title: '나만의 작품을 간직하세요', sub: 'QR 코드를 스캔해 휴대폰에 저장할 수 있어요' },
    intro: intro('traditional'), script: '오늘, 특별한 순간이 그림이 되도록', designs: ['족자 표구', '낙관 액자'],
    card: { tag: 'INK!', desc: '동양화·민화·수묵화 — 내 얼굴을 붓결 초상화로 그려 낙관까지 찍어요.', color: '#3b3128', badges: ['AI 생성', '초상화', '4×6 인화'] },
  },
  {
    id: 'wedding', kind: 'photo', name: '웨딩 포토부스', wordmark: 'VOW!',
    headline: '우리의 장면을 남겨요', lead: '평범한 오늘이 특별한 추억이 되도록',
    steps: ['촬영', '무드 선택', '저장'], startCta: '웨딩 사진 만들기',
    capture: { title: '두 분 모두 정면을 봐 주세요', hint: '두 얼굴을 가이드에 맞춰 주세요', people: 2, shots: 1 },
    options: {
      title: '어떤 순간을 남길까요?', sub: '두 사람의 이야기가 가장 빛나는 장면을 선택해 주세요', cta: '이 장면으로 만들기',
      groups: [
        { id: 'place', label: '장소', look: 'tiles', options: [
          { id: 'garden', label: '가든', swatch: 'linear-gradient(160deg,#f3e6e2,#b9cfa4 60%,#f4c7cf)', prompt: 'an outdoor garden wedding with a flower arch and soft sunlight' },
          { id: 'classic', label: '클래식', swatch: 'linear-gradient(160deg,#faf6ee,#e2d3bd)', prompt: 'a classic elegant wedding hall with ivory drapes and candles' },
          { id: 'city', label: '시티', swatch: 'linear-gradient(160deg,#f2c7b5,#7b8bb0)', prompt: 'a rooftop at sunset overlooking a city skyline' },
        ] },
        { id: 'tone', label: '톤', look: 'swatches', options: [
          { id: 'ivory', label: '아이보리', swatch: '#f4efe4', prompt: 'airy ivory color tone' },
          { id: 'champagne', label: '샴페인', swatch: '#c9a882', prompt: 'warm champagne color tone' },
          { id: 'blush', label: '블러시', swatch: '#f1b9be', prompt: 'soft blush-pink color tone' },
        ] },
      ],
    },
    generating: { title: '우리만의 장면을\n완성하고 있어요', sub: '조금만 기다려 주시면, 특별한 사진이 완성됩니다', stages: ['두 사람 확인 완료', '웨딩 장면 만드는 중', '사진 마무리 대기'] },
    result: { title: '우리의 특별한 한 장', sub: '가장 마음에 드는 디자인을 선택해 주세요' },
    save: { title: '이 순간을 함께 간직하세요', sub: 'QR 코드를 스캔해 사진을 휴대폰에 저장할 수 있습니다' },
    intro: intro('wedding'), script: 'Our Special Day', designs: ['웨딩 액자', '청첩 카드'],
    card: { tag: 'VOW!', desc: '두 사람이 함께 찍으면 가든·클래식·시티 웨딩 화보로. 2인 촬영.', color: '#7a5240', badges: ['AI 생성', '2인', '4×6 인화'] },
  },
  {
    id: 'future-family', kind: 'photo', name: '미래 가족 상상', wordmark: 'FAMILY!',
    headline: '우리의 하루를 상상해요', lead: '두 장의 사진으로 만드는 상상 앨범',
    steps: ['사진', '상상', '우리의 가족'], startCta: '가족 사진 상상하기',
    capture: { title: '두 사람을 한 명씩 찍어 주세요', hint: '성인 두 사람의 사진을 준비해 주세요', people: 2, shots: 2 },
    options: {
      title: '어떤 하루를 만들어볼까요?', sub: '상상 속 가족의 특별한 순간', cta: '이 장면으로 상상하기',
      groups: [
        { id: 'scene', label: '장면', look: 'tiles', options: [
          { id: 'picnic', label: '공원 피크닉', swatch: 'linear-gradient(160deg,#cfe6b8,#7fae6a 60%,#f2d2a8)', prompt: 'a sunny park picnic on a checkered blanket with a pinwheel and a teddy bear' },
          { id: 'home', label: '집에서 하루', swatch: 'linear-gradient(160deg,#f6ece0,#d9c3a5)', prompt: 'a cozy afternoon at home on a sofa in warm window light' },
          { id: 'trip', label: '가족 여행', swatch: 'linear-gradient(160deg,#bfe0f2,#5aa0c8 60%,#f3e1b5)', prompt: 'a family trip at a seaside village on a clear day' },
        ] },
        { id: 'style', label: '스타일', look: 'chips', options: [
          { id: 'photo', label: '사진', prompt: 'natural candid photograph style' },
          { id: 'watercolor', label: '수채화', prompt: 'soft warm watercolor illustration style' },
        ] },
      ],
    },
    generating: { title: '상상 속 하루를 그리고 있어요', sub: 'AI가 만든 상상 이미지예요', stages: ['두 장의 사진 확인 완료', '상상 장면 만드는 중', '앨범 마무리 대기'] },
    result: { title: '함께여서 더 특별한 하루', sub: 'AI가 만든 상상 이미지예요' },
    save: { title: '상상 속 추억을 간직하세요', sub: 'QR로 받거나 바로 인쇄할 수 있어요' },
    creative: '재미로 보는 가족 상상 — AI가 만든 창작 이미지예요. 실제 가족의 모습을 예측하지 않아요',
    intro: intro('future-family'), script: '함께라서, 더 특별한 하루', designs: ['상상 앨범', '폴라로이드'],
    card: { tag: 'FAMILY!', desc: '성인 두 사람을 한 명씩 찍어 상상 속 가족의 하루를 그려요. 재미로 보는 창작 이미지예요.', color: '#c4622d', badges: ['AI 생성', '2인', '창작 이미지'] },
  },
  {
    id: 'music-video', kind: 'mv', name: '뮤직비디오 메이커', wordmark: 'MV!',
    headline: '나만의 15초 뮤직비디오', lead: '촬영하고, 음악을 고르면 완성',
    steps: ['15초 촬영', '음악·스타일', '영상 저장'], startCta: '뮤직비디오 만들기',
    capture: { title: '15초 동안 자유롭게 움직여요', hint: '춤을 추거나, 노래하거나, 어떤 모습이든 좋아요!', people: 1, shots: 1 },
    options: {
      title: '어떤 무드로 만들까요?', sub: '음악과 영상 스타일을 골라 주세요', cta: '영상 만들기',
      groups: [
        { id: 'genre', label: '음악 장르', look: 'chips', options: [
          { id: 'synthpop', label: '신스팝' }, { id: 'lofi', label: '로파이' },
        ] },
        { id: 'style', label: '영상 스타일', look: 'tiles', options: [
          { id: 'neon', label: '네온', swatch: 'linear-gradient(160deg,#3b1d8f,#e040c8 70%,#28d0ff)' },
          { id: 'film', label: '필름', swatch: 'linear-gradient(160deg,#4a3b2b,#a88a5c)' },
          { id: 'dream', label: '드림', swatch: 'linear-gradient(160deg,#d9d0ff,#f6c9e6 60%,#bfe6ff)' },
        ] },
      ],
    },
    generating: { title: '당신의 무대를 만들고 있어요', sub: '촬영한 영상에 음악과 색감을 입히는 중이에요', stages: ['장면 정리', '스타일 적용', '영상 마무리'] },
    result: { title: '나의 뮤직비디오 완성', sub: '촬영한 영상에 음악·색감 효과를 입힌 편집 영상이에요' },
    save: { title: '휴대폰에 담아가세요', sub: '카메라로 QR을 스캔하세요' },
    creative: 'AI가 새로 만든 영상이 아니라, 촬영한 15초 영상에 음악과 효과를 입힌 편집 영상이에요',
    intro: intro('music-video'), script: 'Music Video Your Way', designs: ['영상', '영상'],
    card: { tag: 'MV!', desc: '15초 동안 춤추고 노래하면 음악·네온·필름 효과를 입힌 영상이 되고, QR로 받아요. (AI 영상이 아닌 편집 영상)', color: '#6a3fe0', badges: ['영상 15초', '음악 합성', 'QR 다운로드'] },
  },
  {
    id: 'memory-movie', kind: 'movie', name: '추억 무비 메이커', wordmark: 'REPLAY!',
    headline: '우리의 순간을 한 편으로', lead: '사진과 음악으로 만드는 추억 영상',
    steps: ['사진 5~20장', '음악·문구', '영상 저장'], startCta: '추억 영상 만들기',
    capture: { title: '함께 담을 사진을 골라요', hint: '작은 사진들이 모여, 특별한 이야기가 됩니다', people: 1, shots: 1 },
    options: {
      title: '추억에 음악을 더해요', sub: '사진 속 순간이, 더 특별한 이야기가 되는 마법', cta: '영상 완성하기',
      groups: [
        { id: 'music', label: '음악', look: 'chips', options: [
          { id: 'acoustic', label: '어쿠스틱', sub: '따뜻한 감성' }, { id: 'piano', label: '피아노', sub: '잔잔한 무드' }, { id: 'cinematic', label: '시네마틱', sub: '영화 같은 순간' },
        ] },
        { id: 'length', label: '영상 길이', look: 'chips', options: [
          { id: '15', label: '15초' }, { id: '30', label: '30초' },
        ] },
        { id: 'title', label: '영상 제목', look: 'chips', options: [
          { id: 'season', label: '우리의 계절' }, { id: 'again', label: '좋은 날, 또 기억하자' }, { id: 'moments', label: '함께한 모든 순간' },
        ] },
      ],
    },
    generating: { title: '추억을 한 편으로 엮고 있어요', sub: '소중한 순간을 하나의 영화가 되는 중이에요', stages: ['사진 정리', '음악 맞추기', '영상 마무리'] },
    result: { title: '우리의 추억이\n영화가 됐어요', sub: '평범했던 순간이, 특별한 영화가 되어 돌아왔어요' },
    save: { title: '이 순간을\n오래 간직하세요', sub: '언제든 다시 꺼내볼 수 있는 영화로 남겨요' },
    creative: '올린 사진을 순서대로 이어 붙인 편집 영상이에요(AI 영상 아님)',
    intro: intro('memory-movie'), script: 'Memories make a brighter you', designs: ['영상', '영상'],
    card: { tag: 'REPLAY!', desc: '휴대폰으로 사진 5~20장을 올리고 순서·음악·제목을 고르면 추억 영상이 되고, QR로 받아요.', color: '#6b4a2b', badges: ['휴대폰 업로드', '영상', 'QR 다운로드'] },
  },
  {
    id: 'housing-movein', kind: 'photo', name: '입주 기념사진', wordmark: 'MOVE IN!',
    headline: '우리 집 첫날을\n한 장에 남겨요', lead: '혼자도, 가족·친구와 함께도 — 새 집 입주 기념사진을 찍어 드려요',
    steps: ['함께 촬영', '우리 집 고르기', '기념 인화'], startCta: '입주 사진 찍기',
    capture: { title: '모두 정면을 봐 주세요', hint: '혼자도, 가족·친구와 함께도 좋아요(최대 4명). 모든 얼굴이 화면에 들어오게 서 주세요', people: 1, shots: 1, group: true },
    options: {
      title: '어떤 집에 입주할까요?', sub: '새 집과 손에 들 소품을 골라 주세요', cta: '이 집으로 입주하기',
      groups: [
        { id: 'home', label: '우리 집', look: 'tiles', options: [
          { id: 'apartment', label: '새 아파트 거실', sub: '큰 창 · 공원 뷰', swatch: 'linear-gradient(160deg,#e9f1f7,#a9c8de 55%,#7fb37a)', prompt: 'standing together in the bright, newly finished living room of a Korean apartment on move-in day: clean light wood floors, a big window with a green park view, a few taped cardboard moving boxes on the floor' },
          { id: 'house', label: '마당 있는 집', sub: '잔디 마당 · 현관', swatch: 'linear-gradient(160deg,#f6efe2,#d9b98c 55%,#7aa86a)', prompt: 'standing together in front of the wooden front door of a small new two-story house with a lawn yard and a little flower bed on move-in day, a few moving boxes on the porch, clear blue sky' },
          { id: 'first', label: '첫 독립 원룸', sub: '햇살 드는 내 방', swatch: 'linear-gradient(160deg,#fff4dc,#f2cf8f 60%,#c7a07a)', prompt: 'standing together in a sunny, newly furnished small studio apartment on move-in day: a loft bed, a desk by the window, potted plants, a few half-opened moving boxes' },
        ] },
        { id: 'prop', label: '손에 들 것', look: 'chips', options: [
          { id: 'key', label: '새 집 열쇠', prompt: 'one person proudly holds up a set of new house keys tied with a small red ribbon' },
          { id: 'flower', label: '집들이 꽃다발', prompt: 'one person holds a bright housewarming flower bouquet' },
          { id: 'box', label: '이삿짐 상자', prompt: 'one person carries a cardboard moving box' },
        ] },
      ],
    },
    generating: { title: '새 집에\n입주하는 중이에요', sub: '모두의 얼굴 그대로, 우리 집 첫날을 만들고 있어요', stages: ['사진 확인', '새 집 꾸미는 중', '기념사진 마무리'] },
    result: { title: '입주를 축하해요!', sub: '마음에 드는 기념 디자인을 골라 주세요' },
    save: { title: '우리 집 첫날을 간직하세요', sub: 'QR로 받거나 바로 인쇄할 수 있어요' },
    intro: intro('housing-movein'), script: 'Welcome Home', designs: ['입주 기념 액자', '우리 집 프레임'],
    card: { tag: 'MOVE IN!', desc: '혼자도 가족·친구와 함께도 — 새 아파트·마당 있는 집·첫 원룸에 입주하는 기념사진을 4×6으로 뽑아 줘요.', color: '#2f6f9f', badges: ['AI 생성', '1~4인', '4×6 인화'] },
  },
  {
    id: 'housing-cover', kind: 'photo', name: '드림하우스 매거진', wordmark: 'COVER!',
    headline: '내가 꿈꾸는 집,\n잡지 표지가 되다', lead: '꿈꾸는 인테리어 속 주인공이 되어 매거진 표지를 찍어 보세요',
    steps: ['촬영', '인테리어', '표지 완성'], startCta: '표지 모델 되기',
    capture: { title: '표지 모델처럼\n정면을 봐 주세요', hint: '얼굴과 어깨가 가이드 안에 들어오게 서 주세요', people: 1, shots: 1 },
    options: {
      title: '어떤 집이 내 스타일일까요?', sub: '꿈꾸는 인테리어와 포즈를 골라 주세요', cta: '이 집으로 표지 찍기',
      groups: [
        { id: 'room', label: '인테리어', look: 'tiles', options: [
          { id: 'nordic', label: '북유럽', sub: '화이트 우드 · 패브릭', swatch: 'linear-gradient(160deg,#fbf8f2,#e3d5c0 60%,#b9c7c9)', prompt: 'a Scandinavian-style home interior: white walls, light oak wood, soft linen fabrics, a woven rug, pendant lamp and plenty of daylight' },
          { id: 'modern', label: '모던 미니멀', sub: '콘크리트 · 블랙', swatch: 'linear-gradient(160deg,#e9e7e3,#9a9690 55%,#1f1f1f)', prompt: 'a modern minimalist home interior: polished concrete, matte black fixtures, a low sofa, sculptural lighting and clean empty surfaces' },
          { id: 'plant', label: '플랜테리어', sub: '초록 식물 가득', swatch: 'linear-gradient(160deg,#eef3e4,#8fb47a 55%,#3f6b45)', prompt: 'a lush plant-filled home interior (planterior): many large green houseplants, hanging plants, rattan furniture and warm sunlight' },
          { id: 'hanok', label: '모던 한옥', sub: '서까래 · 창호', swatch: 'linear-gradient(160deg,#f6efe2,#c9a77c 55%,#6b4f35)', prompt: 'a modern hanok home interior: exposed wooden rafters, paper lattice windows (changho), warm wooden floors and simple modern furniture' },
        ] },
        { id: 'pose', label: '포즈', look: 'chips', options: [
          { id: 'sofa', label: '소파에 앉아', prompt: 'sitting relaxed on the sofa, looking at the camera with a confident, warm smile' },
          { id: 'window', label: '창가에 서서', prompt: 'standing by a large window in soft daylight, looking at the camera' },
          { id: 'kitchen', label: '주방에서', prompt: 'leaning on a kitchen island with a coffee cup, looking at the camera' },
        ] },
      ],
    },
    generating: { title: '표지를\n촬영하는 중이에요', sub: '꿈꾸는 집 속의 나를 매거진 화보로 만들고 있어요', stages: ['사진 확인', '인테리어 화보 촬영 중', '표지 편집'] },
    result: { title: '이번 호 표지 모델은 나', sub: '마음에 드는 표지 디자인을 골라 주세요' },
    save: { title: '나의 표지를 가져가세요', sub: 'QR로 받거나 바로 인쇄할 수 있어요' },
    intro: intro('housing-cover'), script: 'My Dream Home', designs: ['매거진 표지', '인테리어 화보'],
    card: { tag: 'COVER!', desc: '북유럽·모던·플랜테리어·모던 한옥 — 꿈꾸는 집 속 주인공이 되어 인테리어 매거진 표지를 찍어요.', color: '#c2412d', badges: ['AI 생성', '매거진 표지', '4×6 인화'] },
  },
  {
    id: 'housing-2046', kind: 'photo', name: '2046 미래 도시 주민', wordmark: '2046!',
    headline: '20년 뒤,\n나는 어떤 도시에 살까', lead: '숲이 된 빌딩, 바다 위 마을 — 미래 도시의 주민이 되어 보세요',
    steps: ['촬영', '미래 도시', '주민 카드'], startCta: '미래 도시로 이사 가기',
    capture: { title: '미래 주민 사진을\n찍어 볼게요', hint: '얼굴과 어깨가 가이드 안에 들어오게 서 주세요', people: 1, shots: 1 },
    options: {
      title: '어느 미래 도시에 살아 볼까요?', sub: '도시와 시간을 골라 주세요', cta: '이 도시로 이사 가기',
      groups: [
        { id: 'city', label: '미래 도시', look: 'tiles', options: [
          { id: 'forest', label: '수직 숲 도시', sub: '나무로 덮인 타워', swatch: 'linear-gradient(160deg,#e3f2e6,#6fb68a 55%,#2d6a54)', prompt: 'a future green city of 2046 with tall residential towers covered in trees and hanging gardens, sky bridges between buildings, clean air' },
          { id: 'ocean', label: '바다 위 마을', sub: '플로팅 하우스', swatch: 'linear-gradient(160deg,#e2f4fb,#6cc3e0 55%,#1f6f9a)', prompt: 'a future floating neighborhood of 2046 on calm blue sea: modular floating homes with solar roofs, wooden boardwalks and small gardens' },
          { id: 'smart', label: '스마트 마을', sub: '드론 · 자율 셔틀', swatch: 'linear-gradient(160deg,#ece9ff,#8b84f0 55%,#2b2a6e)', prompt: 'a friendly future smart neighborhood of 2046: low-rise homes with solar glass, small delivery drones in the sky, a rounded self-driving shuttle and a community park' },
        ] },
        { id: 'time', label: '시간', look: 'chips', options: [
          { id: 'day', label: '맑은 낮', prompt: 'bright clear daylight' },
          { id: 'sunset', label: '노을', prompt: 'warm golden sunset light' },
          { id: 'night', label: '빛나는 밤', prompt: 'a calm night with soft glowing city lights' },
        ] },
      ],
    },
    generating: { title: '미래 도시로\n이사하는 중이에요', sub: '20년 뒤 도시의 주민이 된 나를 만들고 있어요', stages: ['사진 확인', '미래 도시 짓는 중', '주민 카드 발급'] },
    result: { title: '2046 미래 도시에\n오신 걸 환영해요', sub: '마음에 드는 디자인을 골라 주세요' },
    save: { title: '미래의 나를 가져가세요', sub: 'QR로 받거나 바로 인쇄할 수 있어요' },
    creative: '재미로 상상해 보는 미래 도시 — AI가 만든 창작 이미지예요. 실제 계획이나 미래를 예측하지 않아요',
    intro: intro('housing-2046'), script: 'See you in 2046', designs: ['미래 주민 카드', '미래 도시 포스터'],
    card: { tag: '2046!', desc: '수직 숲 도시·바다 위 마을·스마트 마을 — 20년 뒤 미래 도시의 주민이 된 나를 주민 카드로 뽑아요.', color: '#1d8a78', badges: ['AI 생성', '창작 이미지', '4×6 인화'] },
  },
]

export function findProgram(id: string | null | undefined): ProgramDef | null {
  return PROGRAMS.find((p) => p.id === id) ?? null
}

export function isProgramId(id: unknown): id is ProgramId {
  return typeof id === 'string' && (PROGRAM_IDS as readonly string[]).includes(id)
}

/** 옵션 기본값 — 그룹마다 첫 항목 */
export function defaultChoices(program: ProgramDef): Record<string, string> {
  return Object.fromEntries(program.options.groups.map((g) => [g.id, g.options[0].id]))
}

/** 서버·화면 공통 검사 — 모든 그룹에 있는 값을 골랐는지 */
export function validChoices(program: ProgramDef, choices: unknown): Record<string, string> | null {
  if (!choices || typeof choices !== 'object' || Array.isArray(choices)) return null
  const out: Record<string, string> = {}
  for (const group of program.options.groups) {
    const value = (choices as Record<string, unknown>)[group.id]
    if (typeof value !== 'string' || !group.options.some((o) => o.id === value)) return null
    out[group.id] = value
  }
  return out
}

export function optionOf(program: ProgramDef, groupId: string, optionId: string | undefined): ProgramOption | null {
  return program.options.groups.find((g) => g.id === groupId)?.options.find((o) => o.id === optionId) ?? null
}
