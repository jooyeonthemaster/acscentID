// 키오스크 영상판 — COLOR! 서하 · DRAW! 모루 · MAKEUP! 이안(2026-11-18). 영상 계획(KxVideoPlan)과 미리보기 흐름(단계 · 대사 · 버튼).
// 영상 · 그림: public/assets/kiosk-video/<프로그램>/(원본 design-review/kiosk-cast, 만든 도구 tools/make-specs.mjs · kiosk-video-flow 스킬).
// 이동 영상 out · in 은 0.5초 간격 밀착 인화로 잰 값. 걷지 않는 이동(같은 자리에서 자세만 바꿈)은 out = in = len.

import type { KxRect, KxVideoPlan } from './stage'

export type KxVideoProgram = 'color' | 'draw' | 'makeup'

export interface FlowStep {
  scene: string
  /** 대사 — 도착한 뒤 단어씩 떠오른다 */
  line: string
  note?: string
  choices?: { label: string; go: string; main?: boolean; pick?: string }[]
  cols?: 2 | 3
  /** AI 기다림 — 대사 아래 점 세 개, ms 뒤 go 로 */
  wait?: { ms: number; go: string }
}

export interface VideoProgram {
  id: KxVideoProgram
  tag: string
  name: string
  guide: string
  tone: string
  toneLight: string
  plan: KxVideoPlan
  places: Record<string, string>
  first: string
  steps: Record<string, FlowStep>
  /** 영상 속 다른 자리(거울 등) */
  mirror?: KxRect
  /** 결과 면에 얹을 견본 — pick(고른 것)별로 다를 수 있다 */
  art: (pick: string | null) => string
}

const base = (p: KxVideoProgram) => `/assets/kiosk-video/${p}`
const walk = (src: string, out: number, inn: number) => ({ src, out, in: inn, len: 8 })
const pose = (src: string) => ({ src, out: 4, in: 4, len: 4 })

export const VIDEO_PROGRAMS: Record<KxVideoProgram, VideoProgram> = {
  color: {
    id: 'color', tag: 'COLOR!', name: 'AI 퍼스널 컬러', guide: '컬러리스트 서하', tone: '#26307a', toneLight: '#c9d1ff',
    plan: {
      base: base('color'), scenes: ['door', 'desk', 'window', 'drape', 'mirror'], idles: 2,
      moves: {
        'door>desk': walk('move-desk', 2.5, 5), 'desk>window': walk('move-window', 3, 5), 'window>drape': walk('move-drape', 3, 5),
        'drape>mirror': walk('move-mirror', 4, 5), 'mirror>door': walk('move-mirror-door', 3, 4.5),
      },
      surface: { scene: 'mirror', x: 338, y: 361, w: 260, h: 873 },
    },
    places: { door: 'COLOR ATELIER', desk: 'CONSULTATION', window: 'NORTH WINDOW', drape: 'DRAPING', mirror: 'THE MIRROR' },
    first: 'door',
    steps: {
      door: { scene: 'door', line: '어서 오세요! 오늘 당신한테 어울리는 색을 찾아 드릴게요.', choices: [{ label: '시작하기', go: 'desk', main: true }] },
      desk: { scene: 'desk', line: '먼저 하나만 여쭤볼게요. 어떻게 불러 드릴까요?', note: '실제 화면에서는 이름도 입력해요', cols: 3, choices: [{ label: '여성', go: 'window' }, { label: '남성', go: 'window' }, { label: '밝히지 않음', go: 'window' }] },
      window: { scene: 'window', line: '빛이 고른 창가예요. 여기 보세요 — 하나, 둘, 셋!', note: '미리보기라 카메라는 켜지 않아요', choices: [{ label: '촬영하기', go: 'drape', main: true }] },
      drape: { scene: 'drape', line: '천을 대 보면서 얼굴빛을 읽고 있어요…', wait: { ms: 6000, go: 'mirror' } },
      mirror: { scene: 'mirror', line: '이 색이에요. 봄 웜 브라이트 — 코럴이 얼굴을 환하게 밝혀 줘요.', note: '거울 속 사진은 가상 인물 견본이에요', choices: [{ label: '다음 손님', go: 'door', main: true }] },
    },
    art: () => '/assets/kiosk-video/color/sample.webp',
  },
  draw: {
    id: 'draw', tag: 'DRAW!', name: '캐리커처', guide: '거리 화가 모루', tone: '#d9472e', toneLight: '#ffd2c4',
    plan: {
      base: base('draw'), scenes: ['steps', 'frame', 'measure', 'tools', 'paint', 'reveal'], idles: 2,
      moves: {
        'steps>frame': walk('move-frame', 3, 4.5), 'frame>measure': pose('move-measure'), 'measure>tools': pose('move-tools'),
        'tools>paint': pose('move-paint'), 'paint>reveal': pose('move-reveal'),
        'measure>frame': pose('move-measure-frame'), 'reveal>tools': pose('move-reveal-tools'), 'reveal>steps': walk('move-reveal-steps', 2.5, 5),
        'paint>tools': pose('move-paint-tools'),
      },
      surface: { scene: 'reveal', x: 50, y: 268, w: 276, h: 362 },
    },
    places: { steps: 'ARTIST ALLEY', frame: 'HILLTOP STUDIO', measure: 'HILLTOP STUDIO', tools: 'PICK A STYLE', paint: 'DRAWING…', reveal: 'TA-DA!' },
    first: 'steps',
    steps: {
      steps: { scene: 'steps', line: '올라와요! 한 장 그려 줄게요.', choices: [{ label: '시작하기', go: 'frame', main: true }] },
      frame: { scene: 'frame', line: '혼자예요, 여럿이에요? 거기 서 봐요 — 좋아요!', note: '미리보기라 카메라는 켜지 않아요', cols: 2, choices: [{ label: '혼자 찍기', go: 'measure', main: true }, { label: '여럿이 찍기', go: 'measure' }] },
      measure: { scene: 'measure', line: '이 얼굴이면 그릴 맛 나겠는데요!', cols: 2, choices: [{ label: '다시 찍기', go: 'frame' }, { label: '이 사진으로', go: 'tools', main: true }] },
      tools: { scene: 'tools', line: '어떤 걸로 그릴까요?', cols: 3, choices: [{ label: '펜 선화', go: 'paint', pick: 'line' }, { label: '수채화', go: 'paint', pick: 'water' }, { label: '코믹', go: 'paint', pick: 'comic' }] },
      paint: { scene: 'paint', line: '잠깐만요, 슥슥… 거의 다 됐어요!', wait: { ms: 12000, go: 'reveal' } },
      reveal: { scene: 'reveal', line: '짜잔! 어때요, 닮았죠?', note: '캔버스 그림은 기존 화풍 견본이에요', cols: 2, choices: [{ label: '한 장 더', go: 'tools' }, { label: '다음 손님', go: 'steps', main: true }] },
    },
    art: (pick) => `/assets/kiosk-experiences/draw-style-${pick ?? 'comic'}.webp`,
  },
  makeup: {
    id: 'makeup', tag: 'MAKEUP!', name: '버추얼 메이크업', guide: '메이크업 아티스트 이안', tone: '#754f70', toneLight: '#f0cfe9',
    plan: {
      base: base('makeup'), scenes: ['curtain', 'vanity', 'palette', 'hair', 'runway'], idles: 2,
      moves: {
        'curtain>vanity': walk('move-vanity', 2.5, 5), 'vanity>palette': pose('move-palette'), 'palette>hair': walk('move-hair', 2, 4.5),
        'hair>runway': walk('move-runway', 3, 5), 'palette>runway': walk('move-palette-runway', 3, 5), 'runway>curtain': walk('move-runway-curtain', 3, 5),
        'hair>vanity': walk('move-hair-vanity', 3, 5), 'runway>vanity': walk('move-runway-vanity', 2.5, 4.8),
      },
      surface: { scene: 'runway', x: 362, y: 460, w: 273, h: 254 },
    },
    /** 화장대 거울 유리(이안 앞쪽) — 촬영 카메라 · 편집 화면이 이 자리에 든다 */
    mirror: { x: 127, y: 300, w: 340, h: 453 },
    places: { curtain: 'BACKSTAGE', vanity: 'THE VANITY', palette: 'MAKEUP', hair: 'HAIR STATION', runway: 'RUNWAY' },
    first: 'curtain',
    steps: {
      curtain: { scene: 'curtain', line: '쇼 30분 전이에요, 빨리 들어와요!', choices: [{ label: '시작하기', go: 'vanity', main: true }] },
      vanity: { scene: 'vanity', line: '여기 앉아요. 거울 보고 — 찰칵!', note: '실제 화면에서는 이 거울이 카메라가 돼요', choices: [{ label: '촬영하기', go: 'palette', main: true }] },
      palette: { scene: 'palette', line: '뭐부터 해 볼까요? 립 · 블러셔 · 섀도 · 라인 · 눈썹까지 다 해 줄게요.', note: '실제 화면에서는 여기서 얼굴 위에 직접 발라 봐요', cols: 2, choices: [{ label: '머리 모양도 바꾸기', go: 'hair' }, { label: '완성!', go: 'runway', main: true }] },
      hair: { scene: 'hair', line: '머리 모양 바꾸는 중… 고데기 데우는 중이에요!', wait: { ms: 9000, go: 'runway' } },
      runway: { scene: 'runway', line: '무대 나갈 준비 끝! 진짜 예쁘다.', note: '사진은 가상 인물 견본이에요', choices: [{ label: '다음 손님', go: 'curtain', main: true }] },
    },
    art: () => '/assets/kiosk-video/makeup/sample.webp',
  },
}
