'use client'

// AR 3D 메뉴 보기 — 메뉴 여섯 가지의 절차적 모형.
// 사업계획서의 '사진 → AI 3D 생성(NeRF/3DGS)'을 흉내 낸 손 모형이다. 텍스처 파일·네트워크 없이
// 정점 색·작은 노이즈 텍스처·인스턴싱만 쓴다. 시드가 고정이라 매번 같은 모양이 나온다.
// 단위 1 = 1 cm, 바닥 y = 0. 그릇은 메뉴 사진(public/assets/kiosk-order/food/<id>.webp)의 구도를 따른다.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Dish3DId } from './dish-ids'
import {
  type Rng, type RevealUniforms, type PatchOpts, type ModelInfo,
  mulberry32, rand, pick, clamp, lerp, smoothstep, TAU,
  fbm3, tfbm, col, ramp3, dataTexture,
  patchMaterial, ensureColor, smoothProfile, fixLatheSeam, gridSurface, blob, paintVertices,
  composeTRS, composeOnNormal, instanced, analyzeModel, disposeObject,
} from './kit'

// ───────────────────────── 공용 ─────────────────────────

interface Ctx {
  rng: Rng
  u: RevealUniforms
}

interface DishSpec {
  group: THREE.Group
  /** 모형을 만든 기준 지름(cm) — sizeCm 과 다르면 통째로 비례 확대 */
  nominal: number
  /** 그릇 테두리 반지름(cm, 기준 크기) — 지름 표시선 */
  rimRadius: number
  /** 가장 넓은 테두리의 높이(cm, 기준 크기) */
  rimY: number
  /** 바닥 치수선을 둘 앞쪽 거리(기본: 테두리 + 2.6) */
  measureZ?: number
  /** 참고용 휴대폰을 눕힐 자리(기준 크기) */
  phone: { x: number; z: number; yaw: number }
  /** 김(뜨거운 음식만) */
  steam: null | { x: number; y: number; z: number; radius: number; strength: number }
}

export interface DishModel {
  group: THREE.Group
  info: ModelInfo
  rimRadius: number
  rimY: number
  measureZ: number
  phone: { x: number; z: number; yaw: number }
  steam: DishSpec['steam']
  dispose: () => void
}

// 셰이더 프로그램 수를 줄이려고 재질을 몇 가지 '원형'으로만 만든다:
// 모두 정점 색 + 미세 요철(RV_BUMP, 필요 없으면 amp 0) — 광택이 필요한 것만 Physical(clearcoat > 0).
// 모든 기하에는 색 속성이, 모든 인스턴스 메시에는 instanceColor 가 있다(없으면 흰색).
const NO_BUMP = { freq: 3, amp: 0 }
function std(ctx: Ctx, p: THREE.MeshStandardMaterialParameters, o?: PatchOpts) {
  return patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, ...p }), ctx.u, {
    bump: o?.bump ?? NO_BUMP,
    glass: o?.glass,
  })
}
function phys(ctx: Ctx, p: THREE.MeshPhysicalMaterialParameters, o?: PatchOpts) {
  const q: THREE.MeshPhysicalMaterialParameters = { vertexColors: true, ...p }
  if (!q.clearcoat) q.clearcoat = 0.1
  return patchMaterial(new THREE.MeshPhysicalMaterial(q), ctx.u, { bump: o?.bump ?? NO_BUMP, glass: o?.glass })
}
function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material) {
  ensureColor(geo)
  const m = new THREE.Mesh(geo, mat)
  parent.add(m)
  return m
}

const tmpV = new THREE.Vector3()
const tmpN = new THREE.Vector3()
const tmpNM = new THREE.Matrix3()

/** 덩어리(치킨 등) 윗면 정점을 골라 토핑을 얹을 자리·법선을 낸다. */
function topSurfacePoints(geo: THREE.BufferGeometry, world: THREE.Matrix4, minNy: number) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute
  tmpNM.getNormalMatrix(world)
  const out: { p: THREE.Vector3; n: THREE.Vector3 }[] = []
  for (let i = 0; i < pos.count; i++) {
    tmpN.fromBufferAttribute(nor, i).applyMatrix3(tmpNM).normalize()
    if (tmpN.y < minNy) continue
    tmpV.fromBufferAttribute(pos, i).applyMatrix4(world)
    out.push({ p: tmpV.clone(), n: tmpN.clone() })
  }
  return out
}

/** 참깨 한 알(아주 작은 납작 타원) */
const seedGeo = () => new THREE.IcosahedronGeometry(1, 0)

// ───────────────────────── 1. 돌솥비빔밥 (Ø18 돌솥) ─────────────────────────

function buildBibimbap(ctx: Ctx): DishSpec {
  const { rng } = ctx
  const g = new THREE.Group()

  // 돌솥 — 두꺼운 벽, 둥근 테두리, 무광 돌
  const pot = smoothProfile(
    [
      [0, 0.3], [4.8, 0.3], [5.5, 0.05], [6.1, 0.12],
      [7.5, 1.3], [8.5, 3.4], [8.98, 5.8], [9.05, 7.5],
      [8.95, 8.2], [8.62, 8.55], [8.22, 8.42],
      [8.02, 7.7], [7.75, 5.4], [6.85, 3.1], [5.0, 1.75], [2.5, 1.42], [0, 1.4],
    ],
    44,
  )
  const potMat = std(
    ctx,
    { color: '#302d2b', roughness: 0.7, metalness: 0.0, envMapIntensity: 1.4 },
    { bump: { freq: 1.7, amp: 0.06 } },
  )
  add(g, new THREE.LatheGeometry(pot, 64), potMat)

  // 밥 위 나물 — 8 구역(정면 +z = θ 90°)
  type Kind = 'spinach' | 'gosari' | 'sprouts' | 'zucchini' | 'carrot' | 'greens' | 'mushroom'
  const kinds: Kind[] = ['spinach', 'gosari', 'sprouts', 'zucchini', 'carrot', 'greens', 'mushroom', 'sprouts']
  const bedColor: Record<Kind, [string, string]> = {
    spinach: ['#1d3a12', '#2f5a1c'],
    greens: ['#2c5a18', '#4c8a2a'],
    gosari: ['#4a2c16', '#6e4526'],
    sprouts: ['#d8c99a', '#f1e7c6'],
    zucchini: ['#8fae55', '#c6d98e'],
    carrot: ['#d4581a', '#f08a2a'],
    mushroom: ['#33200f', '#5a3a22'],
  }
  const SECT = kinds.length
  const sectorOf = (theta: number) => {
    const a = (((theta - Math.PI / 2 + Math.PI / SECT) % TAU) + TAU) % TAU
    const s = Math.floor(a / (TAU / SECT))
    const local = (a - s * (TAU / SECT)) / (TAU / SECT)
    return { s, local }
  }
  const sectorCenter = (s: number) => Math.PI / 2 + s * (TAU / SECT)
  const BED_R = 8.06
  const bedH = (r: number, theta: number) => {
    const x = r * Math.cos(theta), z = r * Math.sin(theta)
    const { local } = sectorOf(theta)
    let h = 7.22 + 1.0 * (1 - (r / BED_R) ** 2)
    h += 0.55 * Math.pow(Math.sin(Math.PI * local), 0.7) * smoothstep(BED_R, 6.6, r) * smoothstep(2.7, 3.7, r)
    h += 0.12 * fbm3(x * 0.9, 0.3, z * 0.9, 3, 5)
    if (r < 3.6) h += 1.2 * Math.pow(Math.max(0, 1 - (r / 3.5) ** 2), 0.8) + 0.16 * fbm3(x * 2.6, 1, z * 2.6, 2, 6) * (1 - r / 3.6)
    return h
  }
  const beefA = col('#3e2012'), beefB = col('#6e4029'), beefC = col('#8a5636')
  const cTmp = new THREE.Color(), cTmp2 = new THREE.Color()
  const bed = gridSurface(120, 24, { wrapU: true, pole0: true }, (u, v, p, c) => {
    const theta = u * TAU
    const r = v * BED_R
    p.set(r * Math.cos(theta), bedH(r, theta), r * Math.sin(theta))
    const { s } = sectorOf(theta)
    const [a, b] = bedColor[kinds[s]]
    const n = 0.5 + 0.5 * fbm3(p.x * 1.3, 2, p.z * 1.3, 3, 9)
    cTmp.set(a).lerp(cTmp2.set(b), n)
    const beef = 1 - smoothstep(2.9, 3.7, r)
    if (beef > 0) {
      ramp3(cTmp2, beefA, beefB, beefC, 0.5 + 0.6 * fbm3(p.x * 3, 4, p.z * 3, 2, 10))
      cTmp.lerp(cTmp2, beef)
    }
    c.copy(cTmp)
  })
  const bedMat = std(ctx, { vertexColors: true, roughness: 0.55 }, { bump: { freq: 2.6, amp: 0.05 } })
  add(g, bed, bedMat)

  // 조각 배치 도우미
  const glossyVeg = phys(ctx, { vertexColors: true, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 })
  const placeInSector = (s: number, rMin = 3.4, rMax = 7.5) => {
    const c = sectorCenter(s)
    const theta = c + (rng() - 0.5) * (TAU / SECT) * 0.82
    const r = rand(rng, rMin, rMax)
    return { theta, r, x: r * Math.cos(theta), z: r * Math.sin(theta), h: bedH(r, theta) }
  }

  // 시금치·나물 잎 — 둥글게 오므린 잎
  const leafGeo = gridSurface(5, 8, {}, (u, v, p, c) => {
    const w = Math.pow(Math.sin(Math.PI * clamp(v, 0.03, 0.97)), 0.75) * 0.62
    const crumple = 0.16 * fbm3(u * 3.1, v * 4.3, 0.5, 2, 7)
    p.set((u - 0.5) * 2 * w, 0.18 * Math.sin(Math.PI * v) + 0.45 * (u - 0.5) ** 2 * 4 * w + crumple, (v - 0.5) * 2.6)
    const vein = 1 - Math.min(1, Math.abs(u - 0.5) * 7)
    c.setRGB(1, 1, 1).multiplyScalar(0.78 + 0.3 * Math.abs(u - 0.5) * 2 + 0.22 * vein)
  })
  leafGeo.computeVertexNormals()
  const leafMat = phys(ctx, {
    vertexColors: true, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3, side: THREE.DoubleSide,
  })
  const leafSpots: { s: number; palette: string[] }[] = []
  kinds.forEach((k, s) => {
    if (k === 'spinach') leafSpots.push({ s, palette: ['#1a3a10', '#224713', '#163210', '#2b5418'] })
    if (k === 'greens') leafSpots.push({ s, palette: ['#2f5f1a', '#3c7022', '#28541a', '#477c28'] })
  })
  const LEAVES_PER = 30
  g.add(
    instanced(leafGeo, leafMat, leafSpots.length * LEAVES_PER, (i, m, c) => {
      const spot = leafSpots[Math.floor(i / LEAVES_PER)]
      const q = placeInSector(spot.s)
      const yaw = -q.theta + Math.PI / 2 + rand(rng, -0.6, 0.6)
      const sc = rand(rng, 0.7, 1.05)
      composeTRS(m, q.x, q.h + rand(rng, 0.1, 0.5), q.z, rand(rng, -0.4, 0.4), yaw, rand(rng, -0.5, 0.5), sc, sc, sc)
      c.set(pick(rng, spot.palette))
    }, true),
  )

  // 고사리 — 살짝 휜 갈색 줄기
  const gosariGeo = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, -0.5), new THREE.Vector3(0.7, 0.12, 0), new THREE.Vector3(0, 0, 0.5)),
    8, 0.12, 5, false,
  )
  const strandMat = phys(ctx, { roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 })
  const gosariS = kinds.indexOf('gosari')
  g.add(
    instanced(gosariGeo, strandMat, 30, (i, m, c) => {
      const L = rand(rng, 3.2, 5.2)
      const q = placeInSector(gosariS, 3.4, 7.6 - L / 2)
      const flip = rng() < 0.5 ? Math.PI : 0
      composeTRS(m, q.x, q.h + rand(rng, 0.12, 0.45), q.z, rand(rng, -0.15, 0.15), -q.theta + Math.PI / 2 + flip + rand(rng, -0.35, 0.35), rand(rng, -0.6, 0.6), 1, 1, L)
      c.set(pick(rng, ['#5e3d1c', '#6f4a24', '#4e3216', '#7d5a2e']))
    }, true),
  )

  // 콩나물 — 가는 줄기 + 노란 머리
  const stemGeo = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, -0.5), new THREE.Vector3(0.55, 0.14, 0), new THREE.Vector3(0, 0, 0.5)),
    6, 0.105, 4, false,
  )
  const headGeo = new THREE.IcosahedronGeometry(1, 1)
  const sproutSectors = kinds.map((k, s) => (k === 'sprouts' ? s : -1)).filter((s) => s >= 0)
  const SPROUTS = 34
  const heads: THREE.Matrix4[] = []
  g.add(
    instanced(stemGeo, strandMat, sproutSectors.length * SPROUTS, (i, m, c) => {
      const L = rand(rng, 3.0, 4.6)
      const q = placeInSector(sproutSectors[Math.floor(i / SPROUTS)], 3.4, 7.5 - L / 2)
      const yaw = -q.theta + Math.PI / 2 + (rng() < 0.5 ? Math.PI : 0) + rand(rng, -0.5, 0.5)
      const pitch = rand(rng, -0.25, 0.25)
      const y = q.h + rand(rng, 0.12, 0.5)
      composeTRS(m, q.x, y, q.z, pitch, yaw, 0, 1, 1, L)
      c.set(pick(rng, ['#f4eedb', '#efe6cc', '#f7f2e4', '#e9dfc0']))
      // 머리(콩) — 절반 남짓만, 줄기 끝에
      if (rng() < 0.6) {
        const dir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
        const hm = new THREE.Matrix4()
        const hp = new THREE.Vector3(q.x, y, q.z).addScaledVector(dir, L / 2)
        composeTRS(hm, hp.x, hp.y, hp.z, pitch, yaw, 0, 0.16, 0.14, 0.27)
        heads.push(hm)
      }
    }, true),
  )
  g.add(
    instanced(headGeo, strandMat, heads.length, (i, m, c) => {
      m.copy(heads[i])
      c.set(pick(rng, ['#e8d68a', '#efe0a0', '#e2cc78']))
    }, true),
  )

  // 당근 채
  const juliGeo = new THREE.BoxGeometry(1, 1, 1)
  const carrotMat = phys(ctx, { roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25 })
  const carrotS = kinds.indexOf('carrot')
  g.add(
    instanced(juliGeo, carrotMat, 34, (i, m, c) => {
      const L = rand(rng, 3.2, 4.8)
      const q = placeInSector(carrotS, 3.4, 7.6 - L / 2)
      composeTRS(m, q.x, q.h + rand(rng, 0.15, 0.55), q.z, rand(rng, -0.2, 0.2), -q.theta + Math.PI / 2 + rand(rng, -0.45, 0.45), rand(rng, -0.5, 0.5), 0.26, 0.24, L)
      c.set(pick(rng, ['#f07a1e', '#e8641a', '#f59a3a', '#ec6f16']))
    }, true),
  )

  // 애호박 반달
  const zucGeo = paintVertices(new THREE.CylinderGeometry(1, 1, 1, 14, 1, false, 0, Math.PI), (p, n, c) => {
    if (Math.abs(n.y) > 0.5) {
      const r = Math.hypot(p.x, p.z)
      c.copy(col('#e6efbf')).lerp(col('#86ab45'), smoothstep(0.35, 1.0, r))
    } else c.set('#3c6a1e')
  })
  const zucS = kinds.indexOf('zucchini')
  g.add(
    instanced(zucGeo, glossyVeg, 11, (i, m) => {
      const q = placeInSector(zucS, 3.6, 7.2)
      const sc = rand(rng, 1.1, 1.45)
      composeTRS(m, q.x, q.h + rand(rng, 0.15, 0.4), q.z, rand(rng, -0.3, 0.3), rand(rng, 0, TAU), rand(rng, -0.25, 0.25), sc, 0.26, sc)
    }),
  )

  // 표고 볶음 — 휘어진 갈색 띠
  const mushGeo = new THREE.BoxGeometry(0.7, 0.3, 3, 1, 1, 6)
  {
    const pos = mushGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + 0.3 * Math.cos((pos.getZ(i) / 3) * Math.PI))
    mushGeo.computeVertexNormals()
    paintVertices(mushGeo, (p, n, c) => c.set(n.y > 0.3 ? '#3a2112' : '#8a6648'))
  }
  const mushS = kinds.indexOf('mushroom')
  g.add(
    instanced(mushGeo, glossyVeg, 16, (i, m, c) => {
      const q = placeInSector(mushS, 3.4, 6.0)
      composeTRS(m, q.x, q.h + rand(rng, 0.15, 0.5), q.z, rand(rng, -0.25, 0.25), -q.theta + Math.PI / 2 + rand(rng, -0.6, 0.6), rand(rng, -0.4, 0.4), 1, 1, rand(rng, 0.8, 1.2))
      c.setRGB(1, 1, 1).multiplyScalar(rand(rng, 0.8, 1.1))
    }, true),
  )

  // 소고기 볶음 알갱이
  const crumbGeo = new THREE.IcosahedronGeometry(1, 0)
  const beefMat = std(ctx, { roughness: 0.62 }, { bump: { freq: 4, amp: 0.04 } })
  g.add(
    instanced(crumbGeo, beefMat, 60, (i, m, c) => {
      const r = Math.sqrt(rng()) * 3.3
      const th = rng() * TAU
      const sc = rand(rng, 0.22, 0.4)
      composeTRS(m, r * Math.cos(th), bedH(r, th) + sc * 0.4, r * Math.sin(th), rng() * 3, rng() * 3, rng() * 3, sc, sc * 0.8, sc)
      c.set(pick(rng, ['#4a2816', '#5e341e', '#3a1e10', '#6b3e24']))
    }, true),
  )

  // 노른자 — 윤기 + 속이 비치는 듯한 주황 발광
  const yolkMat = phys(ctx, {
    color: '#ffa31a', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.03,
    emissive: new THREE.Color('#ff6a00'), emissiveIntensity: 0.22,
  })
  const yolk = add(g, new THREE.SphereGeometry(1, 32, 18), yolkMat)
  yolk.scale.set(2.05, 1.2, 2.05)
  yolk.position.set(0.15, bedH(0, 0) + 0.45, 0.2)

  // 참깨
  const sesameMat = std(ctx, { color: '#f2e2bd', roughness: 0.5 })
  g.add(
    instanced(seedGeo(), sesameMat, 140, (i, m) => {
      const r = Math.sqrt(rng()) * 7.4
      const th = rng() * TAU
      composeTRS(m, r * Math.cos(th), bedH(r, th) + rand(rng, 0.3, 0.7), r * Math.sin(th), rand(rng, -0.4, 0.4), rng() * TAU, rand(rng, -0.4, 0.4), 0.17, 0.075, 0.11)
    }),
  )

  return {
    group: g,
    nominal: 18,
    rimRadius: 9.05,
    rimY: 7.6,
    phone: { x: 15.4, z: 0.6, yaw: -0.14 },
    steam: { x: 0, y: 9.4, z: 0, radius: 4.8, strength: 1 },
  }
}

// ───────────────────────── 2. 김치찌개 (Ø14 뚝배기 + 나무 받침) ─────────────────────────

function buildKimchiJjigae(ctx: Ctx): DishSpec {
  const { rng } = ctx
  const g = new THREE.Group()

  // 나무 받침 — 둥근 모서리 사각판
  const TS = 17.5, TR = 3.2
  const shape = new THREE.Shape()
  {
    const h = TS / 2
    shape.moveTo(-h + TR, -h)
    shape.lineTo(h - TR, -h)
    shape.quadraticCurveTo(h, -h, h, -h + TR)
    shape.lineTo(h, h - TR)
    shape.quadraticCurveTo(h, h, h - TR, h)
    shape.lineTo(-h + TR, h)
    shape.quadraticCurveTo(-h, h, -h, h - TR)
    shape.lineTo(-h, -h + TR)
    shape.quadraticCurveTo(-h, -h, -h + TR, -h)
  }
  const trivetGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.0, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.3, bevelSegments: 2, curveSegments: 6,
  })
  trivetGeo.rotateX(-Math.PI / 2)
  trivetGeo.translate(0, 0.25, 0)
  const woodTex = dataTexture(256, (u, v, o) => {
    const warp = 0.25 * tfbm(u, v, 2, 3, 21)
    const ring = (v * 24 + warp * 3) % 1
    const grain = Math.pow(0.5 + 0.5 * Math.sin(ring * TAU), 3)
    const fine = 0.5 + 0.5 * tfbm(u, v, 64, 1, 22)
    const t = clamp(0.55 + grain * 0.25 + (fine - 0.5) * 0.35 + 0.25 * tfbm(u, v, 4, 2, 23), 0, 1)
    o[0] = lerp(0.14, 0.34, t)
    o[1] = lerp(0.08, 0.19, t)
    o[2] = lerp(0.045, 0.1, t)
  }, true)
  woodTex.repeat.set(1 / 18, 1 / 18)
  const woodMat = std(ctx, { map: woodTex, roughness: 0.55 })
  const trivet = add(g, trivetGeo, woodMat)
  trivet.rotation.y = 0.0

  // 뚝배기 — 유약 바른 검은 질그릇
  const potY = 1.5
  const potProfile = smoothProfile(
    [
      [0, 0.3], [4.2, 0.3], [4.9, 0.0], [5.45, 0.25],
      [6.45, 1.6], [7.05, 3.8], [7.2, 5.6], [7.1, 7.1],
      [6.97, 7.72], [6.72, 7.95], [6.44, 7.8],
      [6.33, 7.2], [6.45, 5.6], [6.2, 3.6], [5.2, 1.9], [3, 1.2], [0, 1.15],
    ],
    40,
  )
  const potMat = phys(
    ctx,
    {
      color: '#15110f', roughness: 0.38,
      clearcoat: 0.7, clearcoatRoughness: 0.22,
    },
    { bump: { freq: 3, amp: 0.012 } },
  )
  const pot = add(g, new THREE.LatheGeometry(potProfile, 60), potMat)
  pot.position.y = potY

  // 국물 — 붉은 기름 국물
  const SY = potY + 6.72, SR = 6.42
  const souA = col('#86200e'), souB = col('#b02e16'), souC = col('#d8501f')
  const soup = gridSurface(84, 16, { wrapU: true, pole0: true }, (u, v, p, c) => {
    const th = u * TAU, r = v * SR
    const x = r * Math.cos(th), z = r * Math.sin(th)
    const y = SY + 0.06 * fbm3(x * 0.6, 0, z * 0.6, 3, 33) + 0.16 * smoothstep(5.8, SR, r)
    p.set(x, y, z)
    ramp3(c, souA, souB, souC, 0.5 + 0.7 * fbm3(x * 0.45, 1, z * 0.45, 3, 34) + 0.25 * smoothstep(4.5, 6.3, r))
  })
  const soupMat = phys(ctx, { vertexColors: true, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04, emissive: new THREE.Color('#2a0600'), emissiveIntensity: 0.35 })
  add(g, soup, soupMat)

  // 기름 방울
  const dropGeo = new THREE.CylinderGeometry(1, 1, 0.03, 12)
  const dropMat = phys(ctx, { color: '#f59a3a', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, transparent: false, emissive: new THREE.Color('#c8460a'), emissiveIntensity: 0.25 })
  g.add(
    instanced(dropGeo, dropMat, 30, (i, m) => {
      const r = Math.sqrt(rng()) * 5.8
      const th = rng() * TAU
      const sc = rand(rng, 0.1, 0.38)
      composeTRS(m, r * Math.cos(th), SY + 0.1 + 0.16 * smoothstep(5.8, SR, r), r * Math.sin(th), 0, 0, 0, sc, 1, sc)
    }),
  )

  // 두부
  const tofuGeo = paintVertices(new RoundedBoxGeometry(2.3, 1.3, 2.3, 2, 0.18), (p, n, c) => {
    c.copy(col('#f1e8d4')).lerp(col('#e08a58'), smoothstep(0.0, -0.6, p.y))
  })
  const tofuMat = std(ctx, { vertexColors: true, roughness: 0.5 }, { bump: { freq: 3, amp: 0.02 } })
  const tofuSpots: [number, number, number][] = [[-2.7, 1.9, 0.35], [2.9, -0.9, -0.2], [0.9, 3.5, 0.75], [-1.3, -3.5, 1.2]]
  g.add(
    instanced(tofuGeo, tofuMat, tofuSpots.length, (i, m) => {
      const [x, z, yaw] = tofuSpots[i]
      composeTRS(m, x, SY + 0.12, z, rand(rng, -0.12, 0.12), yaw, rand(rng, -0.12, 0.12), 1, 1, 1)
    }),
  )

  // 돼지고기 — 비계·살 결이 보이는 얇은 판
  const porkGeo = new THREE.BoxGeometry(3.8, 0.4, 2.0, 6, 1, 8)
  {
    const pos = porkGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + 0.22 * Math.sin((pos.getX(i) / 4.2) * Math.PI + 0.5))
    porkGeo.computeVertexNormals()
    const bands = ['#c98e6a', '#f2e4d2', '#d9b39a', '#f4e8d8', '#cfa184', '#ead2bc']
    paintVertices(porkGeo, (p, n, c) => {
      const t = clamp((p.z + 1.0) / 2.0, 0, 0.999)
      c.set(bands[Math.floor(t * bands.length)]).lerp(col('#e2865a'), 0.2)
    })
  }
  const porkMat = phys(ctx, { vertexColors: true, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25 })
  const porkSpots: [number, number, number, number][] = [[-3.4, -0.6, 1.3, 0.2], [3.4, 2.5, -0.6, 0.18], [2.4, -3.4, 0.35, -0.15]]
  g.add(
    instanced(porkGeo, porkMat, porkSpots.length, (i, m) => {
      const [x, z, yaw, tilt] = porkSpots[i]
      composeTRS(m, x, SY + 0.2, z, tilt, yaw, rand(rng, -0.1, 0.1), 1, 1, 1)
    }),
  )

  // 김치 — 주름진 잎(줄기는 연하게)
  const kimchiGeo = gridSurface(6, 8, {}, (u, v, p, c) => {
    const x = (u - 0.5) * 4.0, z = (v - 0.5) * 5.2
    const y = 0.38 * fbm3(u * 3, 0, v * 3, 3, 41) + 0.35 * Math.sin(Math.PI * u) - 0.25 * Math.sin(Math.PI * v)
    p.set(x, y, z)
    c.copy(col('#f2b98e')).lerp(col('#c43a1a'), smoothstep(0.15, 0.55, u)).multiplyScalar(0.85 + 0.25 * (0.5 + 0.5 * fbm3(u * 6, 1, v * 6, 2, 42)))
  })
  const kimchiMat = phys(ctx, { vertexColors: true, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.15, side: THREE.DoubleSide })
  const kimchiSpots: [number, number, number][] = [[-0.6, 1.0, 0.3], [1.5, 0.6, 2.0], [-3.9, 3.0, 1.1], [4.4, 0.6, -0.9], [-0.4, -1.7, 2.6], [-4.3, -2.6, 0.2], [1.6, -1.6, 1.0]]
  g.add(
    instanced(kimchiGeo, kimchiMat, kimchiSpots.length, (i, m) => {
      const [x, z, yaw] = kimchiSpots[i]
      composeTRS(m, x, SY + 0.22, z, rand(rng, -0.3, 0.3), yaw, rand(rng, -0.3, 0.3), 0.9, 1, 0.9)
    }),
  )

  // 대파 — 가운데 어슷 썬 흰·초록 조각 + 송송 썬 고리
  const sliverGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 7).rotateX(Math.PI / 2)
  const scallionMat = phys(ctx, { roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 })
  g.add(
    instanced(sliverGeo, scallionMat, 22, (i, m, c) => {
      const r = Math.sqrt(rng()) * 1.9
      const th = rng() * TAU
      const kind = i % 3
      composeTRS(m, r * Math.cos(th), SY + 0.45 + rand(rng, 0, 0.75), r * Math.sin(th), rand(rng, -0.35, 0.35), rng() * TAU, rand(rng, -0.4, 0.4), 0.3, 0.1, rand(rng, 3.0, 4.8))
      c.set(kind === 0 ? pick(rng, ['#f1f4e4', '#e8efd6']) : kind === 1 ? pick(rng, ['#b8dc7a', '#c8e490']) : pick(rng, ['#5fb032', '#6cb83a', '#4c9a26']))
    }, true),
  )
  const ringGeo = new THREE.TorusGeometry(0.42, 0.1, 5, 12).rotateX(Math.PI / 2)
  g.add(
    instanced(ringGeo, scallionMat, 16, (i, m, c) => {
      const r = Math.sqrt(rng()) * 5
      const th = rng() * TAU
      composeTRS(m, r * Math.cos(th), SY + 0.14 + (r < 2 ? 0.7 : 0), r * Math.sin(th), rand(rng, -0.3, 0.3), 0, rand(rng, -0.3, 0.3), 1, 0.8, 1)
      c.set(pick(rng, ['#6cbb3a', '#88cf52', '#58a82c']))
    }, true),
  )

  // 고춧가루
  const flakeGeo = new THREE.BoxGeometry(1, 1, 1)
  const flakeMat = std(ctx, { color: '#8e160c', roughness: 0.6 })
  g.add(
    instanced(flakeGeo, flakeMat, 70, (i, m) => {
      const r = Math.sqrt(rng()) * 6.1
      const th = rng() * TAU
      composeTRS(m, r * Math.cos(th), SY + 0.08 + 0.16 * smoothstep(5.8, SR, r), r * Math.sin(th), 0, rng() * TAU, 0, rand(rng, 0.12, 0.24), 0.04, rand(rng, 0.08, 0.16))
    }),
  )

  return {
    group: g,
    nominal: 14,
    rimRadius: 7.2,
    rimY: 7.0,
    measureZ: 10.6,
    phone: { x: 14.6, z: 0.4, yaw: -0.12 },
    steam: { x: 0, y: SY + 0.4, z: 0, radius: 4.2, strength: 1.15 },
  }
}

// ───────────────────────── 3. 양념반반 치킨 (Ø26 바구니 + 종이) ─────────────────────────

function buildChicken(ctx: Ctx): DishSpec {
  const { rng } = ctx
  const g = new THREE.Group()

  // 대나무 바구니 — 안쪽 바닥 곡선을 함수로 정해 종이·치킨이 그 위에 앉게 한다
  const IN_R = 12.6
  const yIn = (d: number) => 0.5 + 4.4 * Math.pow(clamp(d / IN_R, 0, 1), 2.4)
  const ctrl: [number, number][] = []
  for (let k = 0; k <= 8; k++) {
    const d = 13.05 * (k / 8)
    ctrl.push([d, Math.max(0.02, yIn(d * (IN_R / 13.05)) - 0.48)])
  }
  ctrl.push([13.15, 5.0], [12.85, 5.2])
  for (let k = 0; k <= 8; k++) {
    const d = IN_R * (1 - k / 8)
    ctrl.push([d, yIn(d)])
  }
  const weave = dataTexture(128, (u, v, o) => {
    const U = u * 8, V = v * 8
    const parity = (Math.floor(U) + Math.floor(V)) % 2
    const s = parity ? (V * 3) % 1 : (U * 3) % 1
    const prof = Math.pow(Math.sin(Math.PI * s), 0.6)
    const n = 0.5 + 0.5 * tfbm(u, v, 16, 2, 51)
    const t = prof * (0.75 + 0.25 * n)
    o[0] = lerp(0.24, 0.86, t)
    o[1] = lerp(0.15, 0.66, t)
    o[2] = lerp(0.07, 0.38, t)
  }, true)
  weave.repeat.set(22, 3)
  const basketMat = std(ctx, { map: weave, roughness: 0.75 })
  add(g, new THREE.LatheGeometry(smoothProfile(ctrl, 32), 56), basketMat)
  const rimTex = weave.clone()
  rimTex.repeat.set(60, 1)
  rimTex.needsUpdate = true
  const rimMat = std(ctx, { map: rimTex, roughness: 0.7 })
  const rim = add(g, new THREE.TorusGeometry(12.92, 0.42, 8, 72), rimMat)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 5.0

  // 기름종이 — 바구니 안쪽을 따라 깔리고 테두리 너머로 늘어진다
  const PAPER = 25
  const paper = gridSurface(38, 38, { flip: true }, (u, v, p, c) => {
    const x0 = (u - 0.5) * PAPER, z0 = (v - 0.5) * PAPER
    const ca = Math.cos(0.12), sa = Math.sin(0.12)
    const x = x0 * ca - z0 * sa, z = x0 * sa + z0 * ca
    const d = Math.hypot(x, z)
    const th = Math.atan2(z, x)
    const R0 = 12.35
    let y: number
    if (d <= R0) y = yIn(d) + 0.12 + 0.06 * fbm3(x * 0.5, 0, z * 0.5, 2, 52)
    else {
      // 테두리를 넘어 바깥·위로 살짝 서는 꽃잎 모양(바구니가 보이게)
      const e = d - R0
      const rise = 1.35 * Math.sin((Math.min(e, 1.1) / 1.1) * (Math.PI / 2))
      const ee = Math.max(0, e - 1.1)
      const up = 0.55 * ee - 0.02 * ee * ee
      const wave = 0.4 * Math.sin(th * 5 + 0.7) * smoothstep(0, 4, e) + 0.5 * fbm3(Math.cos(th) * 2.2, 0.5, Math.sin(th) * 2.2, 3, 53) * smoothstep(0, 3, e)
      y = yIn(R0) + 0.12 + rise + up + wave
    }
    p.set(x, y, z)
    const grease = smoothstep(0.1, 0.6, fbm3(x * 0.35, 3, z * 0.35, 3, 54)) * (1 - smoothstep(10, 14, d))
    c.copy(col('#f7f3ea')).lerp(col('#e6cf9c'), grease * 0.5)
  })
  const paperMat = std(ctx, { vertexColors: true, roughness: 0.88, side: THREE.DoubleSide }, { bump: { freq: 1.2, amp: 0.04 } })
  const paperMesh = add(g, paper, paperMat)
  paperMesh.userData.noCloud = false

  // 치킨 조각 — 바삭(왼쪽 반) / 양념(오른쪽 반)
  const crispyMat = phys(ctx, { vertexColors: true, roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.45 }, { bump: { freq: 2.4, amp: 0.16 } })
  const glazedMat = phys(ctx, {
    vertexColors: true, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12,
    emissive: new THREE.Color('#260500'), emissiveIntensity: 0.5,
  }, { bump: { freq: 4.5, amp: 0.025 } })
  const crA = col('#7e4214'), crB = col('#c98636'), crC = col('#f0c271')
  const glA = col('#5a1205'), glB = col('#a3320f'), glC = col('#da6422')
  const makePiece = (crispy: boolean, seed: number) => {
    const sx = rand(rng, 3.1, 3.7) * (crispy ? 1 : 1.04), sy = rand(rng, 2.0, 2.5), sz = rand(rng, 2.4, 2.9)
    const o = seed * 3.17
    return blob(crispy ? 7 : 5, (d, out, c) => {
      const low = fbm3(d.x * 1.15 + o, d.y * 1.15, d.z * 1.15, 3, seed) * (crispy ? 0.26 : 0.3)
      if (crispy) {
        // 능선 노이즈 → 튀김옷의 날카로운 굴곡
        const rg = 1 - Math.abs(fbm3(d.x * 3.8 + o, d.y * 3.8, d.z * 3.8, 3, seed + 5))
        const crag = Math.pow(rg, 3) * 0.24 - 0.06
        const fine = fbm3(d.x * 9.5 + o, d.y * 9.5, d.z * 9.5, 2, seed + 9) * 0.04
        const r = 1 + low + crag + fine
        out.set(d.x * r * sx, d.y * r * sy, d.z * r * sz)
        ramp3(c, crA, crB, crC, 0.12 + Math.pow(rg, 3) * 0.95 + fine * 5 + low * 0.5)
      } else {
        const b = fbm3(d.x * 3.4 + o, d.y * 3.4, d.z * 3.4, 2, seed + 7) * 0.1 + Math.max(0, fbm3(d.x * 7 + o, d.y * 7, d.z * 7, 2, seed + 8)) * 0.04
        const r = 1 + low + b
        out.set(d.x * r * sx, d.y * r * sy, d.z * r * sz)
        ramp3(c, glA, glB, glC, 0.5 + b * 5 + low * 1.1)
      }
    })
  }
  type Spot = { x: number; z: number; crispy: boolean }
  const spots: Spot[] = [
    { x: -7.6, z: 3.4, crispy: true }, { x: -8.0, z: -3.2, crispy: true }, { x: -3.4, z: 7.3, crispy: true },
    { x: -3.6, z: -7.3, crispy: true }, { x: -3.0, z: 0.1, crispy: true },
    { x: -6.0, z: 0.2, crispy: true }, { x: -4.8, z: 4.0, crispy: true }, { x: -4.9, z: -3.8, crispy: true },
    { x: 7.6, z: -3.4, crispy: false }, { x: 8.0, z: 3.2, crispy: false }, { x: 3.4, z: -7.3, crispy: false },
    { x: 3.6, z: 7.3, crispy: false }, { x: 2.9, z: -0.1, crispy: false },
    { x: 6.0, z: -0.2, crispy: false }, { x: 4.8, z: -4.0, crispy: false }, { x: 4.9, z: 3.8, crispy: false },
  ]
  const placed: { x: number; y: number; z: number }[] = []
  const glazedPieces: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = []
  spots.forEach((s, i) => {
    const geo = makePiece(s.crispy, 100 + i * 17)
    const d = Math.hypot(s.x, s.z)
    let y = yIn(d) + 0.12 + 2.1
    for (const q of placed) {
      const dx = s.x - q.x, dz = s.z - q.z
      const need = 5.2 * 5.2 * 0.62 - (dx * dx + dz * dz)
      if (need > 0) y = Math.max(y, q.y + Math.sqrt(need))
    }
    placed.push({ x: s.x, y, z: s.z })
    const m = add(g, geo, s.crispy ? crispyMat : glazedMat)
    m.position.set(s.x, y, s.z)
    m.rotation.set(rand(rng, -0.35, 0.35), rand(rng, 0, TAU), rand(rng, -0.35, 0.35))
    m.updateMatrix()
    if (!s.crispy) glazedPieces.push({ geo, matrix: m.matrix.clone() })
  })

  // 양념 위 땅콩 부스러기·참깨
  const peanutGeo = new THREE.IcosahedronGeometry(1, 0)
  const peanutMat = std(ctx, { roughness: 0.6 })
  const sesameMat = std(ctx, { color: '#f4e6c4', roughness: 0.45 })
  const toppingSpots: { p: THREE.Vector3; n: THREE.Vector3 }[] = []
  for (const piece of glazedPieces) {
    const pts = topSurfacePoints(piece.geo, piece.matrix, 0.3)
    for (let k = 0; k < 34 && pts.length; k++) toppingSpots.push(pts[Math.floor(rng() * pts.length)])
  }
  const nPeanut = Math.floor(toppingSpots.length * 0.45)
  g.add(
    instanced(peanutGeo, peanutMat, nPeanut, (i, m, c) => {
      const s = toppingSpots[i]
      const sc = rand(rng, 0.7, 1.3)
      composeOnNormal(m, tmpV.copy(s.p).addScaledVector(s.n, 0.1), s.n, rng() * TAU, 0.34 * sc, 0.2 * sc, 0.27 * sc, rand(rng, -0.4, 0.4))
      c.set(pick(rng, ['#e2bd86', '#d4a86c', '#efd3a6', '#c99a5e']))
    }, true),
  )
  g.add(
    instanced(seedGeo(), sesameMat, toppingSpots.length - nPeanut, (i, m) => {
      const s = toppingSpots[nPeanut + i]
      composeOnNormal(m, tmpV.copy(s.p).addScaledVector(s.n, 0.06), s.n, rng() * TAU, 0.17, 0.075, 0.11, rand(rng, -0.3, 0.3))
    }),
  )

  // 치킨무
  const muGeo = new RoundedBoxGeometry(1.8, 1.8, 1.8, 2, 0.22)
  const muMat = phys(ctx, { color: '#f6f4ea', roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.15, emissive: new THREE.Color('#1c1c16'), emissiveIntensity: 1 })
  const muSpots: [number, number][] = [[-1.0, 10.6], [1.6, 10.9], [4.6, 10.0], [10.4, 5.4], [-10.0, 6.0]]
  g.add(
    instanced(muGeo, muMat, muSpots.length, (i, m) => {
      const [x, z] = muSpots[i]
      composeTRS(m, x, yIn(Math.hypot(x, z)) + 1.0, z, rand(rng, -0.4, 0.4), rng() * TAU, rand(rng, -0.4, 0.4), 1, 1, 1)
    }),
  )

  return {
    group: g,
    nominal: 26,
    rimRadius: 13.2,
    rimY: 5.0,
    phone: { x: 21.0, z: 1.0, yaw: -0.1 },
    steam: null,
  }
}

// ───────────────────────── 4. 해물파전 (Ø26 접시 + 초간장) ─────────────────────────

function buildPajeon(ctx: Ctx): DishSpec {
  const { rng } = ctx
  const g = new THREE.Group()

  // 짙은 유약 접시
  const plateMat = phys(
    ctx,
    { color: '#24211f', roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 },
    { bump: { freq: 2.6, amp: 0.012 } },
  )
  add(
    g,
    new THREE.LatheGeometry(
      smoothProfile(
        [
          [0, 0.0], [9.8, 0.0], [10.4, 0.08], [11.6, 0.5], [12.5, 1.3], [13.0, 1.95],
          [12.96, 2.12], [12.76, 2.15], [12.55, 1.98],
          [11.9, 1.35], [11.0, 0.88], [10, 0.72], [0, 0.7],
        ],
        34,
      ),
      72,
    ),
    plateMat,
  )

  // 전 — 바삭한 가장자리, 8 조각 칼집
  const FLOOR = 0.7
  const PHI0 = 0.18
  const cutDist = (x: number, z: number) => {
    let best = Infinity
    for (let k = 0; k < 4; k++) {
      const a = PHI0 + (k * Math.PI) / 4
      best = Math.min(best, Math.abs(x * Math.sin(a) - z * Math.cos(a)))
    }
    return best
  }
  const edgeR = (th: number) =>
    11.0 + 0.32 * fbm3(Math.cos(th) * 1.6, 0.2, Math.sin(th) * 1.6, 3, 71) + 0.2 * fbm3(Math.cos(th) * 6, 1.3, Math.sin(th) * 6, 2, 72)
  const topY = (x: number, z: number, rn: number) => {
    const thick = 0.95 * (1 - 0.55 * smoothstep(0.8, 1.0, rn))
    const bumps = 0.13 * fbm3(x * 0.33, 0, z * 0.33, 3, 73) + 0.05 * fbm3(x * 1.2, 3, z * 1.2, 2, 74)
    const groove = 0.45 * Math.exp(-((cutDist(x, z) / 0.17) ** 2)) * smoothstep(0.4, 1.2, Math.hypot(x, z))
    return FLOOR + thick + bumps * (1 - 0.5 * smoothstep(0.85, 1, rn)) + 0.1 * smoothstep(0.9, 1.0, rn) - groove
  }
  const pjA = col('#f4d890'), pjB = col('#e2a64a'), pjC = col('#bf7a2e'), pjCrisp = col('#a45a1c')
  const pjEdge = col('#9a561c'), pjIn = col('#ecd394')
  const NV = 26
  const pancake = gridSurface(128, NV, { wrapU: true, pole0: true }, (u, v, p, c) => {
    const th = u * TAU
    const j = Math.round(v * NV)
    const er = edgeR(th)
    if (j === NV) {
      p.set((er + 0.05) * Math.cos(th), FLOOR + 0.02, (er + 0.05) * Math.sin(th))
      c.copy(pjEdge)
      return
    }
    const rn = j / (NV - 1)
    const r = Math.pow(rn, 0.85) * er
    const x = r * Math.cos(th), z = r * Math.sin(th)
    p.set(x, topY(x, z, rn), z)
    const t = 0.5 + 0.65 * fbm3(x * 0.42, 7, z * 0.42, 3, 75) + 0.2 * fbm3(x * 1.4, 8, z * 1.4, 2, 76)
    ramp3(c, pjA, pjB, pjC, t)
    c.lerp(pjCrisp, smoothstep(0.28, 0.62, fbm3(x * 0.7, 9, z * 0.7, 3, 77)) * 0.55)
    c.lerp(pjEdge, smoothstep(0.84, 1.0, rn) * 0.85)
    const gr = Math.exp(-((cutDist(x, z) / 0.22) ** 2)) * smoothstep(0.4, 1.2, r)
    c.lerp(pjIn, gr * 0.7)
  })
  const pancakeMat = phys(ctx, { vertexColors: true, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 }, { bump: { freq: 1.5, amp: 0.06 } })
  add(g, pancake, pancakeMat)

  // 바삭한 가장자리 부스러기
  const bitsGeo = new THREE.IcosahedronGeometry(1, 0)
  const bitsMat = std(ctx, { roughness: 0.55 }, { bump: { freq: 4, amp: 0.03 } })
  g.add(
    instanced(bitsGeo, bitsMat, 46, (i, m, c) => {
      const th = rng() * TAU
      const r = edgeR(th) + rand(rng, -0.5, 0.25)
      const sc = rand(rng, 0.25, 0.5)
      composeTRS(m, r * Math.cos(th), FLOOR + 0.25, r * Math.sin(th), rng() * 3, rng() * 3, rng() * 3, sc * 1.4, sc * 0.6, sc)
      c.set(pick(rng, ['#c27a2c', '#a8621e', '#d89440']))
    }, true),
  )

  // 쪽파 — 한 방향으로 길게, 칼집에서 끊긴다
  const wedgeOf = (x: number, z: number) => {
    const a = ((Math.atan2(z, x) - PHI0) % TAU + TAU) % TAU
    return Math.floor(a / (Math.PI / 4))
  }
  const inside = (x: number, z: number, w: number) => {
    const r = Math.hypot(x, z)
    if (r > edgeR(Math.atan2(z, x)) - 0.7) return false
    if (wedgeOf(x, z) !== w) return false
    return cutDist(x, z) > 0.38
  }
  type Strip = { x: number; z: number; L: number; yaw: number; y: number; pitch: number; w: number }
  const strips: Strip[] = []
  for (let w = 0; w < 8; w++) {
    let tries = 0, made = 0
    while (made < 8 && tries++ < 120) {
      const a = PHI0 + (w + rand(rng, 0.15, 0.85)) * (Math.PI / 4)
      const r = rand(rng, 1.8, 9.6)
      const cx = r * Math.cos(a), cz = r * Math.sin(a)
      if (!inside(cx, cz, w)) continue
      const dir = -0.5 + rand(rng, -0.16, 0.16)
      const dx = Math.cos(dir), dz = Math.sin(dir)
      const L0 = rand(rng, 5, 12)
      let t0 = 0, t1 = 0
      const step = L0 / 40
      while (t1 < L0 / 2 && inside(cx + dx * (t1 + step), cz + dz * (t1 + step), w)) t1 += step
      while (t0 > -L0 / 2 && inside(cx + dx * (t0 - step), cz + dz * (t0 - step), w)) t0 -= step
      const L = t1 - t0
      if (L < 1.6) continue
      const mx = cx + dx * (t0 + t1) / 2, mz = cz + dz * (t0 + t1) / 2
      const ax = cx + dx * t0, az = cz + dz * t0, bx = cx + dx * t1, bz = cz + dz * t1
      const rnOf = (x: number, z: number) => Math.hypot(x, z) / edgeR(Math.atan2(z, x))
      const ya = topY(ax, az, rnOf(ax, az)), yb = topY(bx, bz, rnOf(bx, bz)), ym = topY(mx, mz, rnOf(mx, mz))
      strips.push({ x: mx, z: mz, L, yaw: -dir + Math.PI / 2, y: (ya + yb + ym) / 3 - 0.07, pitch: -Math.atan2(yb - ya, L), w })
      made++
    }
  }
  const stripGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6).rotateX(Math.PI / 2)
  const stripMat = phys(ctx, { roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25 })
  g.add(
    instanced(stripGeo, stripMat, strips.length, (i, m, c) => {
      const s = strips[i]
      composeTRS(m, s.x, s.y, s.z, s.pitch, s.yaw, rand(rng, -0.1, 0.1), rand(rng, 0.38, 0.62), 0.13, s.L)
      c.set(pick(rng, ['#2f6b1a', '#3f7d22', '#4f8f2a', '#5f9a34', '#6f9a3a', '#86a84a', '#2a5c16']))
    }, true),
  )

  // 새우 — 둥글게 말린, 주황·흰 줄무늬
  const ARC = Math.PI * 1.3
  const shrimpGeo = new THREE.TorusGeometry(1.05, 0.5, 8, 18, ARC)
  {
    const pos = shrimpGeo.getAttribute('position') as THREE.BufferAttribute
    const v = new THREE.Vector3(), ctr = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      let a = Math.atan2(v.y, v.x)
      if (a < -0.01) a += TAU
      const t = clamp(a / ARC, 0, 1)
      ctr.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0)
      const taper = lerp(1.0, 0.45, Math.pow(t, 1.3))
      v.sub(ctr).multiplyScalar(taper).add(ctr)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    shrimpGeo.computeVertexNormals()
    const orange = col('#f0885a'), white = col('#fde8dc')
    paintVertices(shrimpGeo, (p, n, c) => {
      let a = Math.atan2(p.y, p.x)
      if (a < -0.01) a += TAU
      const band = 0.5 + 0.5 * Math.cos((a / ARC) * Math.PI * 9)
      const outer = smoothstep(0.9, 1.5, Math.hypot(p.x, p.y))
      c.copy(white).lerp(orange, clamp(band * 0.55 + outer * 0.6, 0, 1))
    })
    shrimpGeo.rotateX(-Math.PI / 2)
    shrimpGeo.scale(1, 0.6, 1)
  }
  const shrimpMat = phys(ctx, { vertexColors: true, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.15 })
  const shrimpSpots: { x: number; z: number }[] = []
  {
    let tries = 0
    while (shrimpSpots.length < 8 && tries++ < 400) {
      const r = rand(rng, 2.0, 8.8)
      const a = rng() * TAU
      const x = r * Math.cos(a), z = r * Math.sin(a)
      if (cutDist(x, z) < 1.3) continue
      if (shrimpSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.6)) continue
      shrimpSpots.push({ x, z })
    }
  }
  g.add(
    instanced(shrimpGeo, shrimpMat, shrimpSpots.length, (i, m) => {
      const s = shrimpSpots[i]
      const sc = rand(rng, 0.95, 1.2)
      composeTRS(m, s.x, topY(s.x, s.z, Math.hypot(s.x, s.z) / 11) + 0.08, s.z, rand(rng, -0.08, 0.08), rng() * TAU, 0, sc, sc, sc)
    }),
  )

  // 오징어 고리
  const squidGeo = paintVertices(new THREE.TorusGeometry(0.75, 0.17, 6, 16).rotateX(Math.PI / 2), (p, n, c) => {
    c.copy(col('#fbf3ea')).lerp(col('#e2bcbc'), smoothstep(0.72, 0.92, Math.hypot(p.x, p.z)))
  })
  squidGeo.scale(1, 0.7, 1)
  const squidMat = phys(ctx, { vertexColors: true, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 })
  const squidSpots: { x: number; z: number }[] = []
  {
    let tries = 0
    while (squidSpots.length < 7 && tries++ < 400) {
      const r = rand(rng, 1.5, 9.4)
      const a = rng() * TAU
      const x = r * Math.cos(a), z = r * Math.sin(a)
      if (cutDist(x, z) < 1.0) continue
      if (shrimpSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 2.6)) continue
      if (squidSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 2.2)) continue
      squidSpots.push({ x, z })
    }
  }
  g.add(
    instanced(squidGeo, squidMat, squidSpots.length, (i, m) => {
      const s = squidSpots[i]
      const sc = rand(rng, 0.85, 1.15)
      composeTRS(m, s.x, topY(s.x, s.z, Math.hypot(s.x, s.z) / 11) + 0.06, s.z, rand(rng, -0.1, 0.1), rng() * TAU, rand(rng, -0.1, 0.1), sc * rand(rng, 1, 1.3), sc, sc)
    }),
  )

  // 홍고추·청고추 송송
  const chiliGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10)
  const chiliMat = phys(ctx, { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 })
  g.add(
    instanced(chiliGeo, chiliMat, 16, (i, m, c) => {
      const r = rand(rng, 1, 9.6)
      const a = rng() * TAU
      const x = r * Math.cos(a), z = r * Math.sin(a)
      composeTRS(m, x, topY(x, z, r / 11) + 0.04, z, rand(rng, -0.2, 0.2), 0, rand(rng, -0.2, 0.2), 1, 1, 1)
      c.set(i % 3 === 0 ? '#4f8f24' : '#c8231a')
    }, true),
  )

  // 초간장 종지
  const bowl = new THREE.Group()
  bowl.position.set(14.8, 0, 9.6)
  g.add(bowl)
  const dipMat = phys(ctx, { color: '#2e2a28', roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 }, { bump: { freq: 3, amp: 0.01 } })
  add(
    bowl,
    new THREE.LatheGeometry(
      smoothProfile(
        [[0, 0], [2.2, 0], [2.6, 0.15], [3.4, 1.4], [3.75, 2.8], [3.7, 3.05], [3.5, 3.05], [3.35, 2.7], [3.05, 1.4], [2.2, 0.55], [0, 0.5]],
        26,
      ),
      40,
    ),
    dipMat,
  )
  const sauceMat = phys(ctx, { color: '#2a1206', roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 })
  const sauce = add(bowl, new THREE.CircleGeometry(3.25, 32), sauceMat)
  sauce.rotation.x = -Math.PI / 2
  sauce.position.y = 2.25
  const dipBitsGeo = new THREE.BoxGeometry(1, 1, 1)
  const dipBitsMat = std(ctx, { roughness: 0.4 })
  bowl.add(
    instanced(dipBitsGeo, dipBitsMat, 22, (i, m, c) => {
      const r = Math.sqrt(rng()) * 2.6
      const a = rng() * TAU
      const kind = i % 3
      composeTRS(m, r * Math.cos(a), 2.28, r * Math.sin(a), 0, rng() * TAU, 0, kind === 2 ? 0.17 : 0.24, 0.04, kind === 2 ? 0.11 : 0.18)
      c.set(kind === 0 ? '#c22a18' : kind === 1 ? '#5aa02c' : '#f2e2bd')
    }, true),
  )

  return {
    group: g,
    nominal: 26,
    rimRadius: 13.0,
    rimY: 1.95,
    phone: { x: -19.2, z: -0.5, yaw: 0.12 },
    steam: { x: 0, y: 2.2, z: 0, radius: 7.5, strength: 0.75 },
  }
}

// ───────────────────────── 5. 떡볶이 (Ø24 무쇠 팬) ─────────────────────────

function buildTteokbokki(ctx: Ctx): DishSpec {
  const { rng } = ctx
  const g = new THREE.Group()

  const ironMat = std(
    ctx,
    { color: '#1b1b1d', roughness: 0.55, metalness: 0.35 },
    { bump: { freq: 3.2, amp: 0.02 } },
  )
  add(
    g,
    new THREE.LatheGeometry(
      smoothProfile(
        [
          [0, 0.3], [9.6, 0.3], [10.1, 0.0], [10.6, 0.25], [11.4, 2.0], [11.95, 3.9],
          [12.0, 4.2], [11.82, 4.36], [11.6, 4.22],
          [11.45, 3.9], [10.95, 2.1], [10.3, 1.0], [9.4, 0.85], [0, 0.85],
        ],
        40,
      ),
      64,
    ),
    ironMat,
  )
  // 손잡이(구멍 뚫린 무쇠 손잡이) — 오른쪽 뒤로
  const hs = new THREE.Shape()
  hs.moveTo(10.4, -1.8)
  hs.lineTo(19.5, -1.25)
  hs.absarc(22.6, 0, 1.6, -Math.PI / 2 - 0.35, Math.PI / 2 + 0.35, false)
  hs.lineTo(19.5, 1.25)
  hs.lineTo(10.4, 1.8)
  hs.lineTo(10.4, -1.8)
  const hole = new THREE.Path()
  hole.absarc(22.6, 0, 0.7, 0, TAU, true)
  hs.holes.push(hole)
  const handleGeo = new THREE.ExtrudeGeometry(hs, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2, curveSegments: 12 })
  handleGeo.rotateX(-Math.PI / 2)
  const handle = add(g, handleGeo, ironMat)
  const handleYaw = 0.6
  handle.rotation.set(0, handleYaw, 0)
  const tiltPivot = new THREE.Group()
  g.add(tiltPivot)
  g.remove(handle)
  tiltPivot.add(handle)
  tiltPivot.position.set(0, 3.25, 0)
  handle.rotation.set(0, 0, 0)
  tiltPivot.rotation.set(0, handleYaw, 0)
  handle.rotation.z = 0.1

  // 떡 배치(바닥층 + 위층)
  const SY = 2.35, SR = 11.0
  type Cake = { x: number; z: number; yaw: number; y: number; L: number; pitch: number }
  const cakes: Cake[] = []
  const segDist = (a: Cake, b: Cake) => {
    // 두 선분(떡 축) 사이 거리 — 표본으로 근사
    let best = Infinity
    for (let i = 0; i <= 6; i++) {
      const ta = (i / 6 - 0.5) * a.L
      const ax = a.x + Math.sin(a.yaw) * ta, az = a.z + Math.cos(a.yaw) * ta
      for (let j = 0; j <= 6; j++) {
        const tb = (j / 6 - 0.5) * b.L
        const bx = b.x + Math.sin(b.yaw) * tb, bz = b.z + Math.cos(b.yaw) * tb
        best = Math.min(best, Math.hypot(ax - bx, az - bz))
      }
    }
    return best
  }
  {
    let tries = 0
    while (cakes.length < 13 && tries++ < 3000) {
      const r = Math.sqrt(rng()) * 8.2
      const a = rng() * TAU
      const c: Cake = { x: r * Math.cos(a), z: r * Math.sin(a), yaw: rng() * TAU, y: SY + 0.32, L: rand(rng, 5.0, 5.8), pitch: 0 }
      const endR = Math.max(
        Math.hypot(c.x + Math.sin(c.yaw) * c.L / 2, c.z + Math.cos(c.yaw) * c.L / 2),
        Math.hypot(c.x - Math.sin(c.yaw) * c.L / 2, c.z - Math.cos(c.yaw) * c.L / 2),
      )
      if (endR > 10.0) continue
      if (cakes.some((o) => segDist(o, c) < 1.75)) continue
      cakes.push(c)
    }
    const base = cakes.length
    tries = 0
    while (cakes.length < base + 4 && tries++ < 2000) {
      const r = Math.sqrt(rng()) * 6.5
      const a = rng() * TAU
      const c: Cake = { x: r * Math.cos(a), z: r * Math.sin(a), yaw: rng() * TAU, y: SY + 1.5, L: rand(rng, 5.0, 5.8), pitch: rand(rng, -0.12, 0.12) }
      if (cakes.slice(base).some((o) => segDist(o, c) < 1.9)) continue
      cakes.push(c)
    }
  }
  // 가운데 길이 4.4 + 양끝 반구 = 6.04 cm. 길이 차이는 z 배율(0.9~1.1)로만 준다.
  // 가래떡 — 양끝이 평평하고 모서리만 둥근 원기둥(캡슐이면 소시지처럼 보인다). 길이 5.6 cm, 축은 z.
  const cakeProfile: THREE.Vector2[] = [new THREE.Vector2(0, -2.8)]
  for (let i = 0; i <= 4; i++) {
    const a = -Math.PI / 2 + (i / 4) * (Math.PI / 2)
    cakeProfile.push(new THREE.Vector2(0.58 + 0.22 * Math.cos(a), -2.58 + 0.22 * Math.sin(a)))
  }
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2)
    cakeProfile.push(new THREE.Vector2(0.58 + 0.22 * Math.cos(a), 2.58 + 0.22 * Math.sin(a)))
  }
  cakeProfile.push(new THREE.Vector2(0, 2.8))
  const cakeGeo = new THREE.LatheGeometry(cakeProfile, 14)
  cakeGeo.rotateX(Math.PI / 2)
  paintVertices(cakeGeo, (p, n, c) => {
    c.copy(col('#e8b0a0')).lerp(col('#ffffff'), smoothstep(-0.6, 0.2, n.y)).lerp(col('#fff2ea'), smoothstep(0.4, 0.95, n.y))
  })
  const cakeMat = phys(ctx, { vertexColors: true, roughness: 0.45, clearcoat: 0.55, clearcoatRoughness: 0.28, emissive: new THREE.Color('#300800'), emissiveIntensity: 0.3 }, { bump: { freq: 3, amp: 0.02 } })
  g.add(
    instanced(cakeGeo, cakeMat, cakes.length, (i, m, c) => {
      const k = cakes[i]
      composeTRS(m, k.x, k.y, k.z, k.pitch, k.yaw, 0, 1, 1, k.L / 5.6)
      c.set(pick(rng, ['#ee7650', '#e86a46', '#f2845e', '#e46242', '#f08a64']))
    }, true),
  )

  // 국물 — 떡 둘레로 살짝 올라붙는 걸쭉한 양념
  const sauceA = col('#7c1208'), sauceB = col('#a8200f'), sauceC = col('#d23c1c')
  const sauceGeo = gridSurface(96, 22, { wrapU: true, pole0: true }, (u, v, p, c) => {
    const th = u * TAU, r = v * SR
    const x = r * Math.cos(th), z = r * Math.sin(th)
    let cling = 0
    for (const k of cakes) {
      if (k.y > SY + 1) continue
      const sx = Math.sin(k.yaw), sz = Math.cos(k.yaw)
      const t = clamp((x - k.x) * sx + (z - k.z) * sz, -k.L / 2 + 0.8, k.L / 2 - 0.8)
      const d = Math.hypot(x - (k.x + sx * t), z - (k.z + sz * t))
      cling = Math.max(cling, Math.exp(-(((d - 0.6) / 0.55) ** 2)) * (d > 0.6 ? 1 : 1))
    }
    const y = SY + 0.05 * fbm3(x * 0.5, 0, z * 0.5, 3, 83) + 0.14 * smoothstep(10.4, SR, r) + 0.38 * cling
    p.set(x, y, z)
    ramp3(c, sauceA, sauceB, sauceC, 0.45 + 0.5 * fbm3(x * 0.4, 1, z * 0.4, 3, 84) + 0.35 * cling)
  })
  const sauceMat = phys(ctx, { vertexColors: true, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04, emissive: new THREE.Color('#2a0500'), emissiveIntensity: 0.5 })
  add(g, sauceGeo, sauceMat)

  // 어묵 세모 — 얼룩진 갈색 겉면
  const fishTex = dataTexture(128, (u, v, o) => {
    const n = 0.5 + 0.5 * tfbm(u, v, 4, 3, 91)
    const speck = tfbm(u, v, 48, 1, 92) > 0.62 ? 1 : 0
    const sauce = smoothstep(0.1, 0.5, tfbm(u, v, 3, 2, 93))
    let r = lerp(0.86, 0.95, n), gg = lerp(0.55, 0.66, n), b = lerp(0.28, 0.36, n)
    if (speck) { r *= 0.86; gg *= 0.78; b *= 0.74 }
    r = lerp(r, 0.78, sauce * 0.55); gg = lerp(gg, 0.22, sauce * 0.55); b = lerp(b, 0.1, sauce * 0.55)
    o[0] = r; o[1] = gg; o[2] = b
  }, true)
  fishTex.repeat.set(0.16, 0.16)
  const tri = new THREE.Shape()
  {
    const R = 4.1, cr = 0.75
    const pts = [0, 1, 2].map((k) => new THREE.Vector2(Math.cos(Math.PI / 2 + (k * TAU) / 3) * R, Math.sin(Math.PI / 2 + (k * TAU) / 3) * R))
    for (let k = 0; k < 3; k++) {
      const p = pts[k], prev = pts[(k + 2) % 3], next = pts[(k + 1) % 3]
      const a = p.clone().add(prev.clone().sub(p).setLength(cr))
      const b = p.clone().add(next.clone().sub(p).setLength(cr))
      if (k === 0) tri.moveTo(a.x, a.y)
      else tri.lineTo(a.x, a.y)
      tri.quadraticCurveTo(p.x, p.y, b.x, b.y)
    }
    tri.closePath()
  }
  const fishGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1, curveSegments: 4 })
  fishGeo.rotateX(-Math.PI / 2)
  {
    // 살짝 휜 어묵
    const pos = fishGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) - 0.035 * pos.getX(i) * pos.getX(i))
    fishGeo.computeVertexNormals()
  }
  const fishMat = phys(ctx, { map: fishTex, roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.2 })
  const fishSpots: [number, number, number, number, number][] = [
    [-4.6, 3.6, 0.4, 0.25, 0.1], [0.4, 5.6, -0.5, -0.2, 0.18], [-5.2, -3.0, 1.6, 0.18, -0.2], [2.4, -5.0, 2.6, -0.22, 0.12], [6.4, 0.0, 0.9, 0.12, 0.28],
  ]
  g.add(
    instanced(fishGeo, fishMat, fishSpots.length, (i, m) => {
      const [x, z, yaw, rx, rz] = fishSpots[i]
      composeTRS(m, x, SY + 1.25, z, rx, yaw, rz, 0.92, 1, 0.92)
    }),
  )

  // 삶은 달걀 반쪽 — 단면이 위로
  const egg = new THREE.Group()
  egg.position.set(5.8, SY + 1.0, 2.6)
  egg.rotation.set(0.55, 0.5, -0.1)
  egg.scale.setScalar(1.1)
  g.add(egg)
  const domeGeo = new THREE.SphereGeometry(1, 22, 10, 0, TAU, 0, Math.PI / 2)
  domeGeo.rotateX(Math.PI)
  domeGeo.scale(2.25, 1.9, 2.85)
  paintVertices(domeGeo, (p, n, c) => c.copy(col('#f7f2e8')).lerp(col('#e47a52'), smoothstep(-0.5, -1.7, p.y) * 0.8))
  const whiteMat = phys(ctx, { vertexColors: true, roughness: 0.28, clearcoat: 0.4, clearcoatRoughness: 0.2 })
  add(egg, domeGeo, whiteMat)
  const faceGeo = new THREE.CircleGeometry(1, 30)
  faceGeo.rotateX(-Math.PI / 2)
  faceGeo.scale(2.25, 1, 2.85)
  paintVertices(faceGeo, (p, n, c) => c.set('#fbf8f1'))
  add(egg, faceGeo, whiteMat)
  const yolkGeo = new THREE.SphereGeometry(1, 20, 8, 0, TAU, 0, Math.PI / 2)
  yolkGeo.scale(1.2, 0.32, 1.42)
  const yolkMat = std(ctx, { color: '#f2bf3c', roughness: 0.85, emissive: new THREE.Color('#5a3000'), emissiveIntensity: 0.3 }, { bump: { freq: 5, amp: 0.025 } })
  const eggYolk = add(egg, yolkGeo, yolkMat)
  eggYolk.position.set(0, 0.0, -0.15)

  // 대파 채 — 가운데 수북하게
  // 실처럼 가늘게 썬 파 — 살짝 꼬인 가는 관(길이 1 → z 배율로 늘린다)
  const shredGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -0.5), new THREE.Vector3(0.12, 0.04, -0.2),
      new THREE.Vector3(-0.1, 0.08, 0.15), new THREE.Vector3(0.08, 0.04, 0.5),
    ]),
    10, 0.065, 3, false,
  )
  const shredMat = phys(ctx, { roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.2 })
  g.add(
    instanced(shredGeo, shredMat, 90, (i, m, c) => {
      const r = Math.pow(rng(), 0.7) * 1.7
      const a = rng() * TAU
      const lift = 1.0 - r / 2.2
      composeTRS(m, -0.4 + r * Math.cos(a), SY + 2.0 + lift * rand(rng, 0.2, 1.0), 0.5 + r * Math.sin(a), rand(rng, -0.3, 0.3), rng() * TAU, rand(rng, -0.6, 0.6), 1, 1, rand(rng, 3.4, 6.4))
      c.set(pick(rng, ['#eef1e2', '#e4ecd0', '#cfe5a2', '#a8d672', '#7cc040', '#5aa62c']))
    }, true),
  )

  return {
    group: g,
    nominal: 24,
    rimRadius: 12.0,
    rimY: 4.1,
    phone: { x: -17.0, z: 6.0, yaw: 0.35 },
    steam: { x: 0, y: SY + 1.0, z: 0, radius: 7, strength: 1 },
  }
}

// ───────────────────────── 6. 인절미 빙수 (Ø20 유리 그릇) ─────────────────────────

function buildBingsu(ctx: Ctx): DishSpec {
  const { rng } = ctx
  const g = new THREE.Group()

  // 그릇 안쪽 반지름 함수 — 얼음이 정확히 유리 안에 맞도록
  const Y0 = 2.35, Y1 = 8.3
  const rIn = (y: number) => 3.4 + 6.25 * Math.pow(clamp((y - Y0) / (Y1 - Y0), 0, 1), 0.62)

  // 줄무늬 유리 그릇(받침 포함)
  const prof: THREE.Vector2[] = []
  const P = (r: number, y: number) => prof.push(new THREE.Vector2(r, y))
  P(0, 0.02); P(4.6, 0.02); P(5.3, 0.06); P(5.45, 0.2); P(5.2, 0.42); P(3.6, 0.8); P(2.7, 1.05); P(2.4, 1.5)
  const OUTER_START = prof.length
  for (let k = 0; k <= 12; k++) {
    const y = lerp(1.95, 8.12, k / 12)
    P(rIn(Math.max(Y0, y + 0.3)) + 0.32, y)
  }
  const OUTER_END = prof.length
  P(9.98, 8.3); P(9.88, 8.42); P(9.72, 8.38)
  for (let k = 0; k <= 12; k++) {
    const y = lerp(Y1, Y0, k / 12)
    P(rIn(y), y)
  }
  P(0, Y0)
  const SEG = 72
  const glassGeo = new THREE.LatheGeometry(prof, SEG)
  {
    const pos = glassGeo.getAttribute('position') as THREE.BufferAttribute
    const n = prof.length
    for (let i = 0; i < pos.count; i++) {
      const j = i % n
      if (j < OUTER_START || j >= OUTER_END) continue
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i)
      const phi = Math.atan2(x, z)
      const rib = 0.24 * (0.5 + 0.5 * Math.cos(phi * 18)) * smoothstep(2.3, 3.4, y) * (1 - smoothstep(7.5, 8.1, y))
      const r = Math.hypot(x, z)
      const k = (r + rib) / Math.max(r, 1e-4)
      pos.setX(i, x * k)
      pos.setZ(i, z * k)
    }
    glassGeo.computeVertexNormals()
    fixLatheSeam(glassGeo, n, SEG)
  }
  const glassMat = phys(
    ctx,
    {
      color: '#eef4f6', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.07,
      clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, depthWrite: false,
    },
    { glass: true },
  )
  const glass = add(g, glassGeo, glassMat)
  glass.renderOrder = 2

  // 얼음 산 — 유리 안을 채우고, 테두리 안쪽에서 솟아 둥근 원뿔 봉우리로
  const TOP = 20.6
  const BASE_Y = 9.0
  const BASE_R = 9.25
  const coneR = (y: number) => {
    const t = clamp((y - BASE_Y) / (TOP - BASE_Y), 0, 1)
    return BASE_R * Math.pow(1 - Math.pow(t, 1.25), 0.85)
  }
  const rows: { r: number; y: number }[] = []
  for (let k = 0; k <= 7; k++) {
    const y = lerp(2.6, Y1, k / 7)
    rows.push({ r: rIn(y) - 0.14, y })
  }
  for (let k = 1; k <= 3; k++) {
    const y = lerp(Y1, BASE_Y, k / 3)
    rows.push({ r: lerp(rIn(Y1) - 0.14, BASE_R, k / 3) + 0.25 * Math.sin((k / 3) * Math.PI), y })
  }
  for (let k = 1; k <= 34; k++) {
    const t = k / 34
    const y = lerp(BASE_Y, TOP, Math.pow(t, 0.85))
    rows.push({ r: k === 34 ? 0 : coneR(y), y })
  }
  const NV = rows.length - 1
  const iceA = col('#f6f5f1'), iceB = col('#d9dee2')
  const pwA = col('#a8733a'), pwB = col('#cb9b58'), pwC = col('#e4c184')
  const tmpC = new THREE.Color()
  const amp = (y: number) => (y < Y1 ? 0.05 : lerp(0.62, 0.3, clamp((y - Y1) / (TOP - Y1), 0, 1)))
  // 뭉게뭉게(절댓값 노이즈) — 갈아 낸 얼음 덩이
  const disp = (x: number, y: number, z: number) =>
    (Math.abs(fbm3(x * 0.42, y * 0.42, z * 0.42, 4, 61)) * 2 - 0.45) * amp(y) +
    0.12 * fbm3(x * 1.7, y * 1.7, z * 1.7, 2, 62) * (y < Y1 ? 0.3 : 1)
  const surf = (th: number, j: number, out: THREE.Vector3) => {
    const a = rows[Math.max(0, j - 1)], b = rows[Math.min(NV, j + 1)], row = rows[j]
    const dr = b.r - a.r, dy = b.y - a.y
    const len = Math.hypot(dr, dy) || 1
    const nr = dy / len, ny = -dr / len
    const cx = Math.cos(th), sz = Math.sin(th)
    const bx = row.r * cx, bz = row.r * sz
    const d = j === NV ? 0 : disp(bx, row.y, bz)
    out.set((row.r + nr * d) * cx, row.y + ny * d, (row.r + nr * d) * sz)
  }
  const mound = gridSurface(72, NV, { wrapU: true, pole1: true, flip: true }, (u, v, p, c) => {
    const th = u * TAU
    const j = Math.round(v * NV)
    surf(th, j, p)
    const pw = smoothstep(9.6, 11.4, p.y + 1.4 * fbm3(p.x * 0.4, p.y * 0.4, p.z * 0.4, 3, 71))
    tmpC.copy(iceA).lerp(iceB, clamp(-fbm3(p.x * 0.8, p.y * 0.8, p.z * 0.8, 2, 72), 0, 1) * 0.7)
    ramp3(c, pwA, pwB, pwC, 0.5 + 0.7 * fbm3(p.x * 0.9, p.y * 0.9, p.z * 0.9, 3, 73))
    c.lerp(tmpC, 1 - pw)
  })
  const iceMat = std(ctx, { vertexColors: true, roughness: 0.95 }, { bump: { freq: 3.8, amp: 0.08 } })
  add(g, mound, iceMat)

  // 연유 — 봉우리에서 흘러내리는 줄기(겉면에 반쯤 묻혀 납작해 보이게) + 끝의 작은 방울
  const surfAt = (th: number, y: number, lift: number, out: THREE.Vector3) => {
    const r = coneR(y)
    const cx = Math.cos(th), sz = Math.sin(th)
    const d = disp(r * cx, y, r * sz)
    const r2 = coneR(y + 0.3)
    const dr = r2 - r
    const len = Math.hypot(dr, 0.3)
    const nr = 0.3 / len, ny = -dr / len
    out.set((r + nr * (d + lift)) * cx, y + ny * (d + lift), (r + nr * (d + lift)) * sz)
  }
  const drips: THREE.BufferGeometry[] = []
  const streams: [number, number][] = [[0.5, 13.2], [1.45, 14.6], [2.35, 12.4], [3.3, 15.0], [4.2, 13.6], [5.25, 14.2], [1.0, 16.4], [3.8, 16.8]]
  streams.forEach(([th0, yEnd], k) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 18; i++) {
      const t = i / 18
      const y = lerp(TOP - 1.4, yEnd, t)
      const th = th0 + 0.07 * Math.sin(t * 6 + k) + (1 - t) * 0.05
      const v = new THREE.Vector3()
      surfAt(th, y, 0.1, v)
      pts.push(v)
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const TS = 36, RS = 6
    const tube = new THREE.TubeGeometry(curve, TS, 0.3, RS, false)
    const pos = tube.getAttribute('position') as THREE.BufferAttribute
    const ctr = new THREE.Vector3(), v = new THREE.Vector3()
    for (let i = 0; i <= TS; i++) {
      const t = i / TS
      curve.getPointAt(t, ctr)
      const taper = lerp(1.3, 0.75, t) * (1 + 0.2 * Math.sin(t * 11 + k * 1.7)) * (t > 0.92 ? 1 + (t - 0.92) * 4 : 1)
      for (let j = 0; j <= RS; j++) {
        const idx = i * (RS + 1) + j
        v.fromBufferAttribute(pos, idx).sub(ctr).multiplyScalar(taper).add(ctr)
        pos.setXYZ(idx, v.x, v.y, v.z)
      }
    }
    tube.computeVertexNormals()
    drips.push(tube)
    const end = pts[pts.length - 1]
    const drop = new THREE.SphereGeometry(0.3, 8, 6)
    drop.scale(1, 1.5, 1)
    drop.translate(end.x, end.y - 0.15, end.z)
    drips.push(drop)
  })
  // 꼭대기에 고인 연유 — 대부분 묻혀서 윗면만 보인다
  const pool = new THREE.SphereGeometry(1, 18, 8)
  pool.scale(2.0, 0.42, 2.0)
  pool.translate(0, TOP - 0.75, 0)
  drips.push(pool)
  const milkGeo = mergeGeometries(drips, false)
  drips.forEach((d) => d.dispose())
  const milkMat = phys(ctx, { color: '#f6ecd2', roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.1, emissive: new THREE.Color('#2a2418'), emissiveIntensity: 0.5 })
  if (milkGeo) add(g, milkGeo, milkMat)

  // 인절미 — 콩가루 묻은 말랑한 네모, 봉우리 둘레에 몇 개
  const cubeGeo = new RoundedBoxGeometry(2.2, 1.8, 2.2, 2, 0.34)
  const cubeMat = std(ctx, { color: '#e8c993', roughness: 0.9 }, { bump: { freq: 4.2, amp: 0.05 } })
  const cubeSpots: [number, number][] = [[0.3, TOP - 3.6], [1.5, TOP - 2.6], [2.7, TOP - 3.9], [3.9, TOP - 2.8], [5.1, TOP - 3.4], [0.9, TOP - 1.1]]
  g.add(
    instanced(cubeGeo, cubeMat, cubeSpots.length, (i, m) => {
      const [th, y] = cubeSpots[i]
      const p = new THREE.Vector3()
      surfAt(th, y, 0.2, p)
      const p2 = new THREE.Vector3()
      surfAt(th, y + 0.4, 0.2, p2)
      const out = new THREE.Vector3(Math.cos(th), 0, Math.sin(th))
      const n = new THREE.Vector3().subVectors(p2, p).cross(new THREE.Vector3(-Math.sin(th), 0, Math.cos(th))).normalize()
      if (n.dot(out) < 0) n.negate()
      n.lerp(new THREE.Vector3(0, 1, 0), 0.4).normalize()
      composeOnNormal(m, p.addScaledVector(n, 0.45), n, rng() * TAU, 1, 1, 1, rand(rng, -0.15, 0.15))
    }),
  )

  // 아몬드 슬라이스 — 봉우리에 수북이, 비탈에 몇 장
  const almondGeo = paintVertices(new THREE.CylinderGeometry(1, 1, 1, 14, 1), (p, n, c) => {
    if (Math.abs(n.y) > 0.5) c.copy(col('#f4e4c6')).lerp(col('#cf9c66'), smoothstep(0.55, 1.0, Math.hypot(p.x, p.z)))
    else c.set('#a8703f')
  })
  const almondMat = std(ctx, { vertexColors: true, roughness: 0.55 })
  g.add(
    instanced(almondGeo, almondMat, 40, (i, m) => {
      const top = i < 30
      const a = rng() * TAU
      let x: number, y: number, z: number
      if (top) {
        const r = Math.sqrt(rng()) * 2.2
        x = r * Math.cos(a)
        z = r * Math.sin(a)
        y = TOP - 0.55 - r * 0.45 + rand(rng, 0, 0.9)
      } else {
        const p = new THREE.Vector3()
        surfAt(a, rand(rng, TOP - 5.5, TOP - 2.2), 0.12, p)
        x = p.x
        y = p.y
        z = p.z
      }
      const sc = rand(rng, 0.85, 1.15)
      composeTRS(m, x, y, z, rand(rng, -0.7, 0.7), rng() * TAU, rand(rng, -0.7, 0.7), 0.95 * sc, 0.09, 0.6 * sc)
    }),
  )

  return {
    group: g,
    nominal: 20,
    rimRadius: 10.0,
    rimY: 8.25,
    phone: { x: 16.6, z: 0.6, yaw: -0.12 },
    steam: null,
  }
}

// ───────────────────────── 조립 ─────────────────────────

const BUILDERS: Record<Dish3DId, (ctx: Ctx) => DishSpec> = {
  'dolsot-bibimbap': buildBibimbap,
  'kimchi-jjigae': buildKimchiJjigae,
  'yangnyeom-chicken': buildChicken,
  'haemul-pajeon': buildPajeon,
  tteokbokki: buildTteokbokki,
  'injeolmi-bingsu': buildBingsu,
}

const SEEDS: Record<Dish3DId, number> = {
  'dolsot-bibimbap': 1801,
  'kimchi-jjigae': 1402,
  'yangnyeom-chicken': 2603,
  'haemul-pajeon': 2604,
  tteokbokki: 2405,
  'injeolmi-bingsu': 2006,
}

/** 메뉴 하나의 모형을 실제 크기(sizeCm = 그릇 지름)로 만든다. 다 쓰면 dispose() 를 부른다. */
export function buildDish(id: Dish3DId, sizeCm: number, u: RevealUniforms, cloudCount = 2600): DishModel {
  const rng = mulberry32(SEEDS[id])
  const spec = BUILDERS[id]({ rng, u })
  const k = sizeCm > 0 ? sizeCm / spec.nominal : 1
  const root = new THREE.Group()
  root.name = `dish:${id}`
  // 드러내기 연출이 켤 때까지 숨겨 둔다(셰이더 미리 컴파일 중에도 그려지지 않게)
  root.visible = false
  spec.group.scale.setScalar(k)
  root.add(spec.group)
  const info = analyzeModel(root, cloudCount, mulberry32(SEEDS[id] + 7))
  return {
    group: root,
    info,
    rimRadius: spec.rimRadius * k,
    rimY: spec.rimY * k,
    measureZ: (spec.measureZ ?? spec.rimRadius + 2.6) * k,
    phone: { x: spec.phone.x * k, z: spec.phone.z * k, yaw: spec.phone.yaw },
    steam: spec.steam
      ? { ...spec.steam, x: spec.steam.x * k, y: spec.steam.y * k, z: spec.steam.z * k, radius: spec.steam.radius * k }
      : null,
    dispose: () => disposeObject(root),
  }
}
