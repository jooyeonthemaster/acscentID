// ANSAN 타임캡슐 띠지 프레임 10종 — 원본·생성 스크립트는 저장소 ansan-frames/(manifest.json 에서 옮긴 값). 사진 칸이 뚫린 1200×3600 투명 PNG 라
// 사진 → 프레임 → 연도 이름표·아래 글자 순서로 얹는다(strip-print.ts renderFrameStrip). 프레임 안에는 글자가 없고 colors 가 글자색이다.
// 참고 이미지(인기 네컷 프레임)에서 가져온 것은 구도뿐 — 캐릭터·로고는 쓰지 않았다(ansan-frames/README.md '저작권 메모').

export interface StripFrameColors { title: string; sub: string; foot: string; footSub: string; pill: string; pillText: string; pillYear: string }

export interface StripFrameDef {
  id: string
  name: string
  tone: 'light' | 'dark'
  background: string
  file: string
  thumb: string
  colors: StripFrameColors
}

const frame = (name: string) => `/assets/booth-programs/ansan/frames/${name}.png`
const thumb = (name: string) => `/assets/booth-programs/ansan/thumbs/${name}.webp`

export const STRIP_FRAMES: StripFrameDef[] = [
  { id: 'laser-lab', name: '레이저 랩', tone: 'dark', background: '#A72168', file: frame('ansan-frame-01-laser-lab'), thumb: thumb('ansan-frame-01-laser-lab'),
    colors: { title: '#FFFFFF', sub: '#FFE0F1', foot: '#FFFFFF', footSub: '#FFE0F1', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#FFE6A8' } },
  { id: 'robot-friends', name: '로봇 친구', tone: 'light', background: '#F8FCFC', file: frame('ansan-frame-02-robot-friends'), thumb: thumb('ansan-frame-02-robot-friends'),
    colors: { title: '#243B49', sub: '#415765', foot: '#243B49', footSub: '#415765', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#D7F6FF' } },
  { id: 'science-doodles', name: '과학 공책 낙서', tone: 'light', background: '#FBF1D8', file: frame('ansan-frame-03-science-doodles'), thumb: thumb('ansan-frame-03-science-doodles'),
    colors: { title: '#3C342E', sub: '#5C5346', foot: '#3C342E', footSub: '#5C5346', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#D7F6FF' } },
  { id: 'space-explorer', name: '우주 탐험', tone: 'dark', background: '#182A54', file: frame('ansan-frame-04-space-explorer'), thumb: thumb('ansan-frame-04-space-explorer'),
    colors: { title: '#FFFFFF', sub: '#DCEAFE', foot: '#FFFFFF', footSub: '#DCEAFE', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#FFE6A8' } },
  { id: 'lab-stripes', name: '실험 키트 스트라이프', tone: 'light', background: '#FFF0B7', file: frame('ansan-frame-05-lab-stripes'), thumb: thumb('ansan-frame-05-lab-stripes'),
    colors: { title: '#393C3A', sub: '#5B5A46', foot: '#393C3A', footSub: '#5B5A46', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#D7F6FF' } },
  { id: 'green-earth', name: '초록 지구', tone: 'light', background: '#DDF2E7', file: frame('ansan-frame-06-green-earth'), thumb: thumb('ansan-frame-06-green-earth'),
    colors: { title: '#235846', sub: '#3F6556', foot: '#235846', footSub: '#3F6556', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#D7F6FF' } },
  { id: 'drone-garden', name: '드론 정원', tone: 'light', background: '#FFD567', file: frame('ansan-frame-07-drone-garden'), thumb: thumb('ansan-frame-07-drone-garden'),
    colors: { title: '#342E22', sub: '#5E502B', foot: '#342E22', footSub: '#5E502B', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#D7F6FF' } },
  { id: 'time-capsule-film', name: '타임캡슐 필름', tone: 'dark', background: '#121418', file: frame('ansan-frame-08-time-capsule-film'), thumb: thumb('ansan-frame-08-time-capsule-film'),
    colors: { title: '#FFFFFF', sub: '#DADFE6', foot: '#FFFFFF', footSub: '#DADFE6', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#FFE6A8' } },
  { id: 'starlight-observatory', name: '별빛 천문대', tone: 'dark', background: '#302B64', file: frame('ansan-frame-09-starlight-observatory'), thumb: thumb('ansan-frame-09-starlight-observatory'),
    colors: { title: '#FFFFFF', sub: '#E5DEFF', foot: '#FFFFFF', footSub: '#E5DEFF', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#FFE6A8' } },
  { id: 'anniversary-party', name: '40주년 축하 파티', tone: 'light', background: '#FFFCF6', file: frame('ansan-frame-10-anniversary-party'), thumb: thumb('ansan-frame-10-anniversary-party'),
    colors: { title: '#473454', sub: '#68556D', foot: '#473454', footSub: '#68556D', pill: 'rgba(0,0,0,0.78)', pillText: '#FFFFFF', pillYear: '#D7F6FF' } },
]
