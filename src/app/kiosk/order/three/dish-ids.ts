// AR 3D 메뉴 보기 — 3D 모형이 있는 메뉴 id.
// three.js 를 끌어오지 않는 가벼운 파일이라, 부모 화면은 여기서 id·타입만 가져다 쓰고
// DishViewer 자체는 next/dynamic(ssr:false)로 늦게 불러오면 된다.

export const DISH_3D_IDS = [
  'dolsot-bibimbap',
  'kimchi-jjigae',
  'yangnyeom-chicken',
  'haemul-pajeon',
  'tteokbokki',
  'injeolmi-bingsu',
] as const

export type Dish3DId = (typeof DISH_3D_IDS)[number]

export function isDish3DId(id: string): id is Dish3DId {
  return (DISH_3D_IDS as readonly string[]).includes(id)
}
