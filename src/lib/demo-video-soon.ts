// 영상판 준비 중 카드(2026-11-25 사용자 지시: 영상판이 없는 데모도 영상판을 만든다면 어떤 첫 장면일지 상상한 그림을 데모 랜딩에, 「준비 중」 뱃지로).
// 그림은 /assets/demo-video-soon/<카드 이름>.webp — 원본 · 프롬프트는 저장소 밖 design-review/video-thumbs(tools/thumbs.mjs). 길잡이 인물과 장소는 상상 — 실제 영상판을 만들면 이 표에서 빼고 진짜 영상판 카드로 바꾼다.
// 키는 데모 카드 이름(키오스크 id ?? mode, 포토부스 id)

/** 카드 이름 → 길잡이 */
export const VIDEO_SOON_GUIDE: Record<string, string> = {
  'kwave-2026': '명리 조향사 소원',
  'ai-tarot': '타로 리더 루나',
  'studio-nail': '네일 아티스트 보라',
  'studio-card': '그래픽 디자이너 준',
  'studio-skin': '스킨케어 연구원 이슬',
  'studio-voice': '사운드 엔지니어 도윤',
  'studio-career': '진로 탐험가 나래',
  'studio-sommelier': '소믈리에 재윤',
  'studio-cocktail': '바텐더 미아',
  'studio-barista': '바리스타 하준',
  'studio-taste-dna': '미식 탐험가 단비',
  'studio-style-profiler': '스타일리스트 제이',
  'studio-coord': '코디네이터 시우',
  'studio-lookalike': '포토 디렉터 레아',
  'studio-science': '과학 선생님 빛나',
  'studio-palm': '손 이야기꾼 온새',
  'studio-aura': '오라 포토그래퍼 유리',
  'studio-product': '제품 큐레이터 태오',
  'studio-team': '팀 코치 한결',
  'studio-vision-wall': '전시 큐레이터 서진',
  'studio-heritage': '궁궐 해설사 이랑',
  'studio-travel': '여행 가이드 바다',
  'studio-face': '얼굴 이야기 화가 연우',
  'studio-couple': '커플 포토플래너 다온',
  'studio-housing-scent': '홈 퍼퓨머 새봄',
  'studio-housing-home': '미래 건축가 도담',
  'studio-housing-mate': '이웃 매니저 모아',
  'idol-ending-fairy': '음악방송 PD 세라',
  'idol-album-jacket': '컨셉 포토그래퍼 이현',
  'idol-stage-fancam': '직캠 촬영감독 강',
  'idol-mv-still': 'MV 감독 네온',
  'program-runway': '런웨이 디렉터 마리',
  'program-fashion-time': '패션 타임 스타일리스트 레트',
  'program-idol-makeup': '메이크업 디렉터 수아',
  'program-fan-card': '포토카드 디자이너 봄',
  'program-graduation': '졸업 사진가 선우',
  'program-history': '기록관 사관 한빛',
  'program-timecapsule': '타임캡슐 우체부 미래',
  'program-brand-avatar': '아바타 제작자 픽셀',
  'program-hanbok': '한복 디자이너 고운',
  'program-traditional': '화백 청암',
  'program-caricature': '캐리커처 작가 두리',
  'program-wedding': '웨딩 플래너 하늘',
  'program-future-family': '가족 사진관 주인 다정',
  'program-music-video': 'MV 디렉터 비트',
  'program-memory-movie': '추억 영사기사 필름',
  'program-housing-movein': '입주 도우미 새집',
  'program-housing-cover': '매거진 에디터 하나',
  'program-housing-2046': '미래 도시 안내원 이오',
  'event-ansan-2026': '과학축제 연구원 사이',
  'event-nh-palm': '내의원 의녀 단',
  'funground-a-fortune': '별점 안내원 포비',
  'funground-a-news': '2046 기자 미르',
  'funground-a-dream': '꿈의 직업 안내원 하람',
  'funground-b-color': '컬러 탐정 채도',
  'funground-b-next': '진로 탐험가 나래',
  'funground-quest': '모험 길잡이 아린',
  'funground-mvp': '스포츠 캐스터 강슛',
  'funground-theme': '테마파크 안내원 롤리',
  'funground-later': '타임캡슐 조종사 시온',
}

/** 같은 기획(A안 · B안)이라 그림을 같이 쓰는 카드 */
const SHARE: Record<string, string> = {
  'funground-b-fortune': 'funground-a-fortune',
  'funground-b-news': 'funground-a-news',
}

/** 그 카드의 준비 중 영상판 — 없으면 null */
export function videoSoon(key: string): { guide: string; screen: string } | null {
  const img = SHARE[key] ?? key
  const guide = VIDEO_SOON_GUIDE[img]
  return guide ? { guide, screen: `/assets/demo-video-soon/${img}.webp` } : null
}

/** 카드 설명 */
export const videoSoonDesc = (guide: string) => `길잡이 ${guide}의 안내로 같은 체험을 영상 속에서 하는 영상판을 준비하고 있어요. 그림은 첫 장면 예시예요.`
