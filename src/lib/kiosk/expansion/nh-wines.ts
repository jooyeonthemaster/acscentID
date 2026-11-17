// 연말 시상식 AI 소믈리에(studio-sommelier-nh)의 시음 와인 목록 — 이 파일 하나만 고치면 화면 · AI 후보 · 영수증이 모두 바뀐다.
// 재고에 따라 바뀔 수 있다(행사 전 확정). 번호(no)는 현장 직원이 병을 찾는 번호라 병에 붙인 번호와 같게 둔다.
// 점수는 1~5(고객에게 보낸 카탈로그와 같은 값). 타닌이 없는 와인(스파클링 · 화이트)은 null.
// 병 사진: public/assets/kiosk-expansion/nh-wines/<번호>.webp 처럼 넣고 bottle 에 주소를 적는다(null 이면 종류 색의 병 그림).
// 시험: npm run test:nh-sommelier — 번호가 겹치지 않는지, 추천이 한 병에 몰리지 않는지 본다.

export type NhWineKind = 'sparkling' | 'white' | 'rose' | 'red'

export interface NhWine {
  /** 병 번호 — 화면 · 영수증 맨 위에 크게 */
  no: number
  name: string
  en: string
  kind: NhWineKind
  /** 나라 · 산지 */
  region: string
  grapes: string
  sweet: number
  acid: number
  body: number
  tannin: number | null
  /** 한 줄 설명(카탈로그 문구) */
  line: string
  bottle: string | null
}

export const NH_WINES: NhWine[] = [
  { no: 1, kind: 'sparkling', name: '칸티 모스카토 다스티', en: "Canti Moscato d'Asti DOCG", region: '이탈리아 피에몬테', grapes: '모스카토 비앙코', sweet: 5, acid: 3, body: 1, tannin: null, line: '복숭아·꽃향 가득, 달콤하고 가벼운 약스파클링', bottle: null },
  { no: 2, kind: 'sparkling', name: '쌩 클레어 비카스 초이스 버블스', en: "Saint Clair Vicar's Choice Sauvignon Blanc Bubbles", region: '뉴질랜드 말보로', grapes: '소비뇽 블랑', sweet: 2, acid: 4, body: 2, tannin: null, line: '패션프루트·라임 향, 상큼한 소비뇽 블랑 스파클링', bottle: null },
  { no: 3, kind: 'white', name: '샤토 생 미셸 컬럼비아 밸리 리슬링', en: 'Chateau Ste. Michelle Columbia Valley Riesling', region: '미국 워싱턴', grapes: '리슬링', sweet: 3, acid: 3, body: 2, tannin: null, line: '청사과·백도 향, 은은한 단맛의 상큼한 리슬링', bottle: null },
  { no: 4, kind: 'white', name: '코노 소비뇽 블랑', en: 'Kono Marlborough Sauvignon Blanc', region: '뉴질랜드 말보로', grapes: '소비뇽 블랑', sweet: 1, acid: 5, body: 2, tannin: null, line: '자몽·패션프루트·허브 향, 산뜻한 드라이 화이트', bottle: null },
  { no: 5, kind: 'white', name: '조쉬 셀라 샤도네이', en: 'Josh Cellars Chardonnay', region: '미국 캘리포니아', grapes: '샤르도네', sweet: 2, acid: 3, body: 4, tannin: null, line: '복숭아·꿀·은은한 바닐라, 부드럽고 풍성한 화이트', bottle: null },
  { no: 6, kind: 'rose', name: '로쉐 마제 쌩쏘 그르나슈 로제', en: 'Roche Mazet Cinsault Grenache Rosé', region: '프랑스 랑그독', grapes: '쌩쏘, 그르나슈', sweet: 2, acid: 3, body: 2, tannin: 1, line: '딸기·자몽 향, 산뜻하고 부드러운 프렌치 로제', bottle: null },
  { no: 7, kind: 'red', name: '따발리 베타스 블랑카스 피노누아', en: 'Tabalí Vetas Blancas Pinot Noir', region: '칠레 리마리', grapes: '피노누아', sweet: 1, acid: 4, body: 3, tannin: 2, line: '라즈베리·체리 향, 섬세하고 우아한 피노누아', bottle: null },
  { no: 8, kind: 'red', name: '샤또 몽페라 루즈', en: 'Château Mont-Pérat Rouge', region: '프랑스 보르도', grapes: '메를로, 까베르네 프랑', sweet: 1, acid: 3, body: 4, tannin: 3, line: '체리·제비꽃 향, 부드러운 타닌의 클래식 보르도', bottle: null },
  { no: 9, kind: 'red', name: '1865 셀렉티드 빈야드 까베르네 소비뇽', en: '1865 Selected Vineyards Cabernet Sauvignon', region: '칠레 마이포', grapes: '까베르네 소비뇽', sweet: 1, acid: 3, body: 4, tannin: 4, line: '카시스·민트·오크 향, 묵직하고 탄탄한 칠레 까쇼', bottle: null },
  { no: 10, kind: 'red', name: '몰리두커 더 복서', en: 'Mollydooker The Boxer Shiraz', region: '호주 맥라렌 베일', grapes: '쉬라즈', sweet: 2, acid: 3, body: 5, tannin: 3, line: '블랙베리·초콜릿·바닐라, 진하고 농밀한 쉬라즈', bottle: null },
]
