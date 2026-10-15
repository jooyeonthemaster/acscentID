'use client'

// AR 3D 메뉴 보기 — 절차적 모형 공구함.
// 시드 난수·노이즈·작은 텍스처·격자 곡면·인스턴싱·'AI 생성' 드러내기 셰이더 주입·정리(dispose)를 모은다.
// 단위는 1 = 1 cm. 바닥은 y = 0.
// 이 파일은 three 만 쓰는 순수 모듈이다(React 없음). 'use client' 파일에서만 불러온다.

import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ───────────────────────── 시드 난수 ─────────────────────────

export type Rng = () => number

/** mulberry32 — 작고 빠른 시드 난수. 같은 시드면 늘 같은 모양이 나온다. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rand = (rng: Rng, a: number, b: number) => a + (b - a) * rng()
export const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length) % arr.length]
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
export const TAU = Math.PI * 2

// ───────────────────────── 노이즈 ─────────────────────────

function ihash(x: number, y: number, z: number, seed: number): number {
  let h =
    Math.imul(x | 0, 0x27d4eb2d) ^
    Math.imul(y | 0, 0x165667b1) ^
    Math.imul(z | 0, 0x1b873593) ^
    Math.imul((seed | 0) + 0x3c6ef372, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** 3D 값 노이즈 0..1 */
export function noise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi)
  const c000 = ihash(xi, yi, zi, seed), c100 = ihash(xi + 1, yi, zi, seed)
  const c010 = ihash(xi, yi + 1, zi, seed), c110 = ihash(xi + 1, yi + 1, zi, seed)
  const c001 = ihash(xi, yi, zi + 1, seed), c101 = ihash(xi + 1, yi, zi + 1, seed)
  const c011 = ihash(xi, yi + 1, zi + 1, seed), c111 = ihash(xi + 1, yi + 1, zi + 1, seed)
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u
  const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v
  return y0 + (y1 - y0) * w
}

/** 프랙탈 노이즈 — 대략 -1..1 */
export function fbm3(x: number, y: number, z: number, octaves = 4, seed = 0): number {
  let sum = 0, amp = 1, norm = 0, f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * (noise3(x * f, y * f, z * f, seed + i * 131) * 2 - 1)
    norm += amp
    amp *= 0.5
    f *= 2.03
  }
  return sum / norm
}

/** 이어 붙여도 이음매가 없는 2D 노이즈(텍스처용) 0..1 */
function tnoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const u = fade(x - xi), v = fade(y - yi)
  const x0 = ((xi % period) + period) % period, x1 = (x0 + 1) % period
  const y0 = ((yi % period) + period) % period, y1 = (y0 + 1) % period
  const a = ihash(x0, y0, 0, seed), b = ihash(x1, y0, 0, seed)
  const c = ihash(x0, y1, 0, seed), d = ihash(x1, y1, 0, seed)
  const ab = a + (b - a) * u, cd = c + (d - c) * u
  return ab + (cd - ab) * v
}

/** 이음매 없는 2D 프랙탈 노이즈 — u,v 는 0..1, 결과 대략 -1..1 */
export function tfbm(u: number, v: number, freq: number, octaves: number, seed = 0): number {
  let sum = 0, amp = 1, norm = 0, f = freq
  for (let i = 0; i < octaves; i++) {
    sum += amp * (tnoise(u * f, v * f, f, seed + i * 71) * 2 - 1)
    norm += amp
    amp *= 0.5
    f *= 2
  }
  return sum / norm
}

// ───────────────────────── 색 ─────────────────────────

/** sRGB 헥스 → 선형 작업 색(정점 색에 바로 쓴다) */
export const col = (hex: string) => new THREE.Color(hex)

/** 세 색 사이를 t(0..1)로 잇는다: 0 = a, .5 = b, 1 = c */
export function ramp3(out: THREE.Color, a: THREE.Color, b: THREE.Color, c: THREE.Color, t: number) {
  t = clamp(t, 0, 1)
  if (t < 0.5) return out.copy(a).lerp(b, t * 2)
  return out.copy(b).lerp(c, (t - 0.5) * 2)
}

// ───────────────────────── 작은 텍스처 ─────────────────────────

/** 함수로 채우는 작은 데이터 텍스처. fn 은 0..1 의 [r,g,b] 를 돌려준다. */
export function dataTexture(
  size: number,
  fn: (u: number, v: number, out: [number, number, number]) => void,
  srgb = false,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const px: [number, number, number] = [0, 0, 0]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      fn(x / size, y / size, px)
      const i = (y * size + x) * 4
      data[i] = clamp(px[0], 0, 1) * 255
      data[i + 1] = clamp(px[1], 0, 1) * 255
      data[i + 2] = clamp(px[2], 0, 1) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 4
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** 캔버스로 그리는 작은 텍스처(무늬·잠금화면 등). */
export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  srgb = true,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ───────────────────────── 'AI 생성' 드러내기 셰이더 ─────────────────────────
// 모든 음식·그릇 재질에 같은 조각을 끼운다. uReveal(세계 y) 위쪽은 버리고, 경계 바로 아래는
// 호박색 격자(와이어프레임 느낌)로 빛나게 한다 → 스캔 면이 아래에서 위로 지나가며 모형이 '생성'된다.
// 끝나면 uReveal 을 아주 크게 둬서 아무것도 버리지 않는다.
// 선택: RV_BUMP — 세계 좌표 노이즈로 미세 요철(튀김옷·가루·돌 결), RV_GLASS — 가장자리일수록 불투명한 유리.

export interface RevealUniforms {
  uReveal: { value: number }
  uRevealBand: { value: number }
  uRevealJag: { value: number }
  uRevealColor: { value: THREE.Color }
}

export const REVEAL_DONE = 1e5

export function createRevealUniforms(): RevealUniforms {
  return {
    uReveal: { value: -10 },
    uRevealBand: { value: 2.2 },
    uRevealJag: { value: 0.7 },
    uRevealColor: { value: new THREE.Color('#ffb15c') },
  }
}

/** 드러내기 경계 조절기 — 컴포넌트에서는 값 대입 대신 메서드로만 바꾼다. */
export interface RevealController {
  uniforms: RevealUniforms
  /** 경계 높이(세계 y). 끝나면 REVEAL_DONE */
  set: (y: number) => void
}

export function createReveal(): RevealController {
  const uniforms = createRevealUniforms()
  return {
    uniforms,
    set: (y: number) => {
      uniforms.uReveal.value = y
    },
  }
}

export interface PatchOpts {
  /** 미세 요철: freq = 1cm 당 몇 번, amp = cm */
  bump?: { freq: number; amp: number }
  glass?: boolean
}

const RV_VERT_HEAD = /* glsl */ `#include <common>
varying vec3 vRevealW;`

const RV_VERT_BODY = /* glsl */ `#include <project_vertex>
vec4 rvW = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
rvW = instanceMatrix * rvW;
#endif
vRevealW = ( modelMatrix * rvW ).xyz;`

const RV_FRAG_HEAD = /* glsl */ `#include <common>
varying vec3 vRevealW;
uniform float uReveal;
uniform float uRevealBand;
uniform float uRevealJag;
uniform vec3 uRevealColor;
float rvHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 ); }
#ifdef RV_BUMP
uniform float uBumpFreq;
uniform float uBumpAmp;
float rvHash3( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
float rvNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( mix( rvHash3( i ), rvHash3( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ),
         mix( rvHash3( i + vec3( 0.0, 1.0, 0.0 ) ), rvHash3( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),
    mix( mix( rvHash3( i + vec3( 0.0, 0.0, 1.0 ) ), rvHash3( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ),
         mix( rvHash3( i + vec3( 0.0, 1.0, 1.0 ) ), rvHash3( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ), f.y ), f.z );
}
vec3 rvBumpNormal( vec3 n, vec3 pos, float h ) {
  vec3 dpdx = dFdx( pos );
  vec3 dpdy = dFdy( pos );
  vec3 r1 = cross( dpdy, n );
  vec3 r2 = cross( n, dpdx );
  float det = dot( dpdx, r1 );
  vec3 grad = sign( det ) * ( dFdx( h ) * r1 + dFdy( h ) * r2 );
  vec3 v = abs( det ) * n - grad;
  float l = length( v );
  return l > 1e-12 ? v / l : n;
}
#endif`

const RV_FRAG_DISCARD = /* glsl */ `#include <clipping_planes_fragment>
float rvD = uReveal - vRevealW.y + ( rvHash( floor( vRevealW.xz * 1.4 ) ) - 0.5 ) * uRevealJag;
if ( rvD < 0.0 ) discard;`

const RV_FRAG_BUMP = /* glsl */ `#include <normal_fragment_maps>
#ifdef RV_BUMP
if ( uBumpAmp > 0.0 ) {
  vec3 rvP = vRevealW * uBumpFreq;
  float rvH = ( rvNoise( rvP ) * 0.65 + rvNoise( rvP * 2.7 + 11.0 ) * 0.35 ) * uBumpAmp;
  normal = rvBumpNormal( normal, - vViewPosition, rvH );
}
#endif`

const RV_FRAG_GLOW = /* glsl */ `
#ifdef RV_GLASS
{
  float rvF = pow( 1.0 - clamp( abs( dot( normalize( vViewPosition ), normal ) ), 0.0, 1.0 ), 2.5 );
  float rvLum = dot( outgoingLight, vec3( 0.299, 0.587, 0.114 ) );
  diffuseColor.a = clamp( diffuseColor.a + rvF * 0.45 + rvLum * 0.32, 0.0, 0.85 );
}
#endif
{
  float rvBand = 1.0 - smoothstep( 0.0, uRevealBand, rvD );
  if ( rvBand > 0.001 ) {
    vec3 rvG = abs( fract( vRevealW * 0.8 ) - 0.5 );
    float rvGrid = 1.0 - smoothstep( 0.015, 0.06, min( min( rvG.x, rvG.y ), rvG.z ) );
    outgoingLight = mix( outgoingLight, uRevealColor * ( 0.22 + 1.5 * rvGrid ), rvBand * 0.85 );
    outgoingLight += uRevealColor * pow( rvBand, 10.0 ) * 2.6;
    diffuseColor.a = max( diffuseColor.a, rvBand * 0.9 );
  }
}
#include <opaque_fragment>`

/** 재질에 드러내기(+선택 요철·유리) 셰이더 조각을 끼운다. 같은 조합끼리는 프로그램을 나눠 쓴다. */
export function patchMaterial<T extends THREE.Material>(m: T, u: RevealUniforms, opts: PatchOpts = {}): T {
  const bump = opts.bump
  const glass = !!opts.glass
  const anyM = m as unknown as { defines?: Record<string, string> }
  const defines: Record<string, string> = { ...(anyM.defines ?? {}) }
  if (bump) defines.RV_BUMP = ''
  if (glass) defines.RV_GLASS = ''
  anyM.defines = defines
  const key = `rv2${bump ? 'b' : ''}${glass ? 'g' : ''}`
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = u.uReveal
    shader.uniforms.uRevealBand = u.uRevealBand
    shader.uniforms.uRevealJag = u.uRevealJag
    shader.uniforms.uRevealColor = u.uRevealColor
    if (bump) {
      shader.uniforms.uBumpFreq = { value: bump.freq }
      shader.uniforms.uBumpAmp = { value: bump.amp }
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', RV_VERT_HEAD)
      .replace('#include <project_vertex>', RV_VERT_BODY)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', RV_FRAG_HEAD)
      .replace('#include <clipping_planes_fragment>', RV_FRAG_DISCARD)
      .replace('#include <normal_fragment_maps>', RV_FRAG_BUMP)
      .replace('#include <opaque_fragment>', RV_FRAG_GLOW)
  }
  m.customProgramCacheKey = () => key
  return m
}

// ───────────────────────── 기하 도우미 ─────────────────────────

/** 조종점을 부드럽게 이은 옆모습(r, y) — 선반(lathe)용 */
export function smoothProfile(ctrl: [number, number][], samples: number): THREE.Vector2[] {
  const curve = new THREE.CatmullRomCurve3(
    ctrl.map(([r, y]) => new THREE.Vector3(r, y, 0)),
    false,
    'centripetal',
  )
  return curve.getSpacedPoints(samples).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y))
}

/** 선반 기하 + 이음매 법선 맞춤(정점을 움직인 뒤 법선을 다시 낼 때) */
export function fixLatheSeam(geo: THREE.BufferGeometry, nPoints: number, segments: number) {
  const n = geo.getAttribute('normal') as THREE.BufferAttribute
  const v = new THREE.Vector3(), w = new THREE.Vector3()
  for (let j = 0; j < nPoints; j++) {
    const a = j, b = segments * nPoints + j
    v.fromBufferAttribute(n, a)
    w.fromBufferAttribute(n, b)
    v.add(w).normalize()
    n.setXYZ(a, v.x, v.y, v.z)
    n.setXYZ(b, v.x, v.y, v.z)
  }
  n.needsUpdate = true
}

export interface GridOpts {
  wrapU?: boolean
  /** 첫 줄(v=0)이 한 점으로 모이는 극 — 법선을 평균 낸다 */
  pole0?: boolean
  pole1?: boolean
  /** 감는 방향을 뒤집는다(법선이 반대로 나올 때) */
  flip?: boolean
  colors?: boolean
}

/**
 * (u, v) 격자 곡면. fn 이 각 점의 위치(와 색)를 채운다. u 는 0..1(wrapU 면 마지막 열이 첫 열로 이어진다).
 * 기본 감김: 법선 = ∂p/∂u × ∂p/∂v.
 */
export function gridSurface(
  nu: number,
  nv: number,
  opts: GridOpts,
  fn: (u: number, v: number, p: THREE.Vector3, c: THREE.Color) => void,
): THREE.BufferGeometry {
  const wrap = !!opts.wrapU
  const cols = wrap ? nu : nu + 1
  const rows = nv + 1
  const pos = new Float32Array(cols * rows * 3)
  const uvs = new Float32Array(cols * rows * 2)
  const colors = opts.colors !== false ? new Float32Array(cols * rows * 3) : null
  const p = new THREE.Vector3()
  const c = new THREE.Color(1, 1, 1)
  for (let j = 0; j < rows; j++) {
    const v = j / nv
    for (let i = 0; i < cols; i++) {
      const u = i / nu
      c.setRGB(1, 1, 1)
      fn(u, v, p, c)
      const k = j * cols + i
      pos[k * 3] = p.x
      pos[k * 3 + 1] = p.y
      pos[k * 3 + 2] = p.z
      uvs[k * 2] = u
      uvs[k * 2 + 1] = v
      if (colors) {
        colors[k * 3] = c.r
        colors[k * 3 + 1] = c.g
        colors[k * 3 + 2] = c.b
      }
    }
  }
  const idx: number[] = []
  const quadsU = wrap ? cols : cols - 1
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < quadsU; i++) {
      const i1 = (i + 1) % cols
      const a = j * cols + i, b = j * cols + i1
      const cc = (j + 1) * cols + i, d = (j + 1) * cols + i1
      if (opts.flip) idx.push(a, cc, b, b, cc, d)
      else idx.push(a, b, cc, b, d, cc)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const nAttr = geo.getAttribute('normal') as THREE.BufferAttribute
  const avgRow = (row: number) => {
    const s = new THREE.Vector3(), t = new THREE.Vector3()
    for (let i = 0; i < cols; i++) s.add(t.fromBufferAttribute(nAttr, row * cols + i))
    s.normalize()
    for (let i = 0; i < cols; i++) nAttr.setXYZ(row * cols + i, s.x, s.y, s.z)
  }
  if (opts.pole0) avgRow(0)
  if (opts.pole1) avgRow(rows - 1)
  if (!wrap) {
    // 열린 격자는 그대로
  } else {
    // 감긴 격자는 이음매가 없으므로 따로 할 일 없음
  }
  nAttr.needsUpdate = true
  geo.computeBoundingSphere()
  return geo
}

/** 정이십면체를 잘게 나눠 매끈하게 이은 덩어리. fn(방향, 출력위치, 색)으로 모양을 빚는다. */
export function blob(
  detail: number,
  fn: (dir: THREE.Vector3, out: THREE.Vector3, c: THREE.Color) => void,
  withColor = true,
): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail)
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  const merged = mergeVertices(geo, 1e-4)
  geo.dispose()
  geo = merged
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const colors = withColor ? new Float32Array(pos.count * 3) : null
  const d = new THREE.Vector3(), o = new THREE.Vector3(), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize()
    o.copy(d)
    c.setRGB(1, 1, 1)
    fn(d, o, c)
    pos.setXYZ(i, o.x, o.y, o.z)
    if (colors) {
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
  }
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/** 기존 기하에 정점 색을 칠한다(로컬 위치·법선 기준). */
export function paintVertices(
  geo: THREE.BufferGeometry,
  fn: (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, i: number) => void,
): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute | undefined
  const colors = new Float32Array(pos.count * 3)
  const p = new THREE.Vector3(), n = new THREE.Vector3(0, 1, 0), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    if (nor) n.fromBufferAttribute(nor, i)
    c.setRGB(1, 1, 1)
    fn(p, n, c, i)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

// 행렬 조립(매 프레임이 아니라 만들 때만 쓰지만, 그래도 임시 객체를 재사용한다)
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _n = new THREE.Vector3()

export function composeTRS(
  m: THREE.Matrix4,
  px: number, py: number, pz: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number,
  order: THREE.EulerOrder = 'YXZ',
): THREE.Matrix4 {
  _e.set(rx, ry, rz, order)
  _q.setFromEuler(_e)
  return m.compose(_p.set(px, py, pz), _q, _s.set(sx, sy, sz))
}

/** 로컬 +y 를 법선에 맞추고 그 둘레로 spin 만큼 돌린다(표면 위 토핑 얹기). */
export function composeOnNormal(
  m: THREE.Matrix4,
  pos: THREE.Vector3,
  normal: THREE.Vector3,
  spin: number,
  sx: number, sy: number, sz: number,
  tiltX = 0,
): THREE.Matrix4 {
  _n.copy(normal).normalize()
  _q.setFromUnitVectors(_up, _n)
  _e.set(tiltX, spin, 0, 'YXZ')
  _q2.setFromEuler(_e)
  _q.multiply(_q2)
  return m.compose(pos, _q, _s.set(sx, sy, sz))
}

/** 색 속성이 없으면 흰색으로 채운다(정점 색을 켠 재질이 검게 나오지 않게). */
export function ensureColor(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geo.getAttribute('color')) return geo
  const n = (geo.getAttribute('position') as THREE.BufferAttribute).count
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3))
  return geo
}

/**
 * 인스턴스 메시 — setter 가 i 번째 행렬(과 색)을 채운다.
 * 셰이더 변종을 줄이려고 instanceColor 는 늘 둔다(기본 흰색).
 */
export function instanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
  setter: (i: number, m: THREE.Matrix4, c: THREE.Color) => void,
  withColor = true,
): THREE.InstancedMesh {
  ensureColor(geo)
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const m = new THREE.Matrix4()
  const c = new THREE.Color(1, 1, 1)
  for (let i = 0; i < count; i++) {
    m.identity()
    c.setRGB(1, 1, 1)
    setter(i, m, c)
    mesh.setMatrixAt(i, m)
    if (withColor) mesh.setColorAt(i, c)
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  return mesh
}

// ───────────────────────── 분석·정리 ─────────────────────────

export interface ModelInfo {
  /** 'AI 점구름' — 겉면에서 고르게 뽑은 점(세계 좌표) */
  cloud: Float32Array
  /** 바닥에서 본 외접원 */
  footprint: { x: number; z: number; r: number }
  minY: number
  maxY: number
  triangles: number
}

/** 모형을 훑어 점구름(면적 가중)·외접원·높이·삼각형 수를 낸다. userData.noCloud 인 메시는 점구름에서 뺀다. */
export function analyzeModel(root: THREE.Object3D, cloudCount: number, rng: Rng): ModelInfo {
  root.updateMatrixWorld(true)
  const triVerts: number[] = []
  const cloudable: boolean[] = []
  let triangles = 0
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  let minY = Infinity, maxY = -Infinity
  const m = new THREE.Matrix4(), im = new THREE.Matrix4()
  const v = new THREE.Vector3()
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return
    const geo = mesh.geometry
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    if (!pos) return
    const index = geo.getIndex()
    const triCount = index ? index.count / 3 : pos.count / 3
    const inst = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null
    const instances = inst ? inst.count : 1
    const noCloud = !!mesh.userData.noCloud
    triangles += triCount * instances
    const world = new Float32Array(pos.count * 3)
    for (let k = 0; k < instances; k++) {
      if (inst) {
        inst.getMatrixAt(k, im)
        m.multiplyMatrices(mesh.matrixWorld, im)
      } else m.copy(mesh.matrixWorld)
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m)
        world[i * 3] = v.x
        world[i * 3 + 1] = v.y
        world[i * 3 + 2] = v.z
        if (v.x < minX) minX = v.x
        if (v.x > maxX) maxX = v.x
        if (v.z < minZ) minZ = v.z
        if (v.z > maxZ) maxZ = v.z
        if (v.y < minY) minY = v.y
        if (v.y > maxY) maxY = v.y
      }
      for (let t = 0; t < triCount; t++) {
        for (let c = 0; c < 3; c++) {
          const vi = index ? index.getX(t * 3 + c) : t * 3 + c
          triVerts.push(world[vi * 3], world[vi * 3 + 1], world[vi * 3 + 2])
        }
        cloudable.push(!noCloud)
      }
    }
  })
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2
  let r = 0
  for (let i = 0; i < triVerts.length; i += 3) {
    const dx = triVerts[i] - cx, dz = triVerts[i + 2] - cz
    const d = dx * dx + dz * dz
    if (d > r) r = d
  }
  r = Math.sqrt(r)

  // 면적 가중 표본
  const nTri = triVerts.length / 9
  const cdf = new Float64Array(nTri)
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  let acc = 0
  for (let t = 0; t < nTri; t++) {
    if (cloudable[t]) {
      a.fromArray(triVerts, t * 9)
      b.fromArray(triVerts, t * 9 + 3)
      c.fromArray(triVerts, t * 9 + 6)
      b.sub(a)
      c.sub(a)
      acc += b.cross(c).length() * 0.5
    }
    cdf[t] = acc
  }
  const cloud = new Float32Array(cloudCount * 3)
  for (let s = 0; s < cloudCount; s++) {
    const target = rng() * acc
    let lo = 0, hi = nTri - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cdf[mid] < target) lo = mid + 1
      else hi = mid
    }
    let u1 = rng(), u2 = rng()
    if (u1 + u2 > 1) {
      u1 = 1 - u1
      u2 = 1 - u2
    }
    const o = lo * 9
    for (let k = 0; k < 3; k++) {
      const p0 = triVerts[o + k], p1 = triVerts[o + 3 + k], p2 = triVerts[o + 6 + k]
      cloud[s * 3 + k] = p0 + (p1 - p0) * u1 + (p2 - p0) * u2
    }
  }
  return {
    cloud,
    footprint: { x: cx, z: cz, r },
    minY: Number.isFinite(minY) ? minY : 0,
    maxY: Number.isFinite(maxY) ? maxY : 1,
    triangles: Math.round(triangles),
  }
}

/** 하위 객체의 기하·재질·텍스처를 모두 풀어 준다. */
export function disposeObject(root: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>()
  const mats = new Set<THREE.Material>()
  const texs = new Set<THREE.Texture>()
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry) geos.add(mesh.geometry)
    const mm = mesh.material
    if (mm) (Array.isArray(mm) ? mm : [mm]).forEach((x) => mats.add(x))
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) (mesh as THREE.InstancedMesh).dispose()
  })
  mats.forEach((mat) => {
    for (const key of Object.keys(mat)) {
      const val = (mat as unknown as Record<string, unknown>)[key]
      if (val && (val as THREE.Texture).isTexture) texs.add(val as THREE.Texture)
    }
  })
  geos.forEach((g) => g.dispose())
  mats.forEach((x) => x.dispose())
  texs.forEach((t) => t.dispose())
}
