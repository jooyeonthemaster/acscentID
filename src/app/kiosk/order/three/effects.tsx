'use client'

// AR 3D 메뉴 보기 — 화면 효과: 'AI 3D 생성' 점구름·스캔 면, 김, 지름 표시선.
// 모두 레이어 1 에만 올린다 → ContactShadows(레이어 0 카메라)의 그림자에 찍히지 않는다.
// 매 프레임 새 객체를 만들지 않는다(유니폼 값만 바꾼다).

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import type { DishModel } from './dishes'
import { mulberry32 } from './kit'

export const FX_LAYER = 1

export function setLayerDeep(obj: THREE.Object3D, layer: number) {
  obj.traverse((o) => o.layers.set(layer))
}

// ───────────────────────── 스캔(점구름 + 빛나는 면) ─────────────────────────

export interface ScanState {
  /** 0..1 점구름 모이기 */
  converge: number
  /** 점구름 불투명도 */
  cloudOpacity: number
  /** 스캔 면 불투명도 */
  planeOpacity: number
  /** 스캔 면 높이(세계 y) — 모형 드러내기 경계와 같다 */
  scanY: number
}

const CLOUD_VERT = /* glsl */ `
attribute float aRand;
attribute vec3 aDir;
uniform float uTime;
uniform float uConverge;
uniform float uScan;
uniform float uOpacity;
uniform float uScale;
varying float vAlpha;
varying float vHot;
void main() {
  vec3 p = position + aDir * ( 1.0 - uConverge ) * 6.0;
  p += aDir * sin( uTime * 3.1 + aRand * 40.0 ) * 0.06;
  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  gl_Position = projectionMatrix * mv;
  float above = smoothstep( -0.4, 0.5, position.y - uScan );
  float near = 1.0 - smoothstep( 0.0, 1.6, abs( position.y - uScan ) );
  vHot = near;
  vAlpha = uOpacity * above * ( 0.35 + 0.65 * fract( aRand * 7.31 ) );
  gl_PointSize = uScale * ( 0.07 + 0.05 * aRand + 0.07 * near ) / max( 1.0, - mv.z );
}`

const CLOUD_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
varying float vAlpha;
varying float vHot;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length( c );
  float a = smoothstep( 0.5, 0.1, d ) * vAlpha;
  if ( a < 0.01 ) discard;
  vec3 col = mix( uColor, uHot, vHot );
  gl_FragColor = vec4( col * a, a );
}`

const PLANE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`

const PLANE_FRAG = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float r = length( c ) * 2.0;
  float fill = 0.085 * ( 1.0 - r * 0.55 );
  float rim = smoothstep( 0.94, 0.982, r ) * ( 1.0 - smoothstep( 0.988, 1.0, r ) );
  float rings = smoothstep( 0.9, 1.0, fract( r * 8.0 - uTime * 1.4 ) ) * 0.1 * ( 1.0 - r );
  float a = ( fill + rim * 0.65 + rings ) * uOpacity;
  gl_FragColor = vec4( uColor * a, a );
}`

/** 모형 겉면에서 뽑은 점구름이 모였다가, 스캔 면이 지나가면 실체로 바뀐다. */
export function ScanEffect({ model, state }: { model: DishModel; state: React.RefObject<ScanState> }) {
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const pointsRef = useRef<THREE.Points>(null)
  const planeRef = useRef<THREE.Mesh>(null)

  const res = useMemo(() => {
    const n = model.info.cloud.length / 3
    const rng = mulberry32(4242)
    const pointsGeo = new THREE.BufferGeometry()
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(model.info.cloud, 3))
    const rnd = new Float32Array(n)
    const dir = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      rnd[i] = rng()
      // 바깥쪽·위쪽으로 흩어진 자리에서 모여든다
      const u = rng() * 2 - 1, th = rng() * Math.PI * 2
      const sq = Math.sqrt(1 - u * u)
      dir[i * 3] = sq * Math.cos(th)
      dir[i * 3 + 1] = Math.abs(u) * 0.8 + 0.2
      dir[i * 3 + 2] = sq * Math.sin(th)
    }
    pointsGeo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1))
    pointsGeo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
    pointsGeo.computeBoundingSphere()
    const pointsMat = new THREE.ShaderMaterial({
      vertexShader: CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uConverge: { value: 0 },
        uScan: { value: -10 },
        uOpacity: { value: 0 },
        uScale: { value: 1000 },
        uColor: { value: new THREE.Color('#ffcf94') },
        uHot: { value: new THREE.Color('#fff4e2') },
      },
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
      toneMapped: false,
    })
    const fp = model.info.footprint
    const planeGeo = new THREE.CircleGeometry(fp.r * 1.02 + 0.8, 72)
    planeGeo.rotateX(-Math.PI / 2)
    const planeMat = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: PLANE_FRAG,
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffb15c') } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      premultipliedAlpha: true,
      toneMapped: false,
    })
    return { pointsGeo, pointsMat, planeGeo, planeMat, fx: fp.x, fz: fp.z }
  }, [model])

  useEffect(
    () => () => {
      res.pointsGeo.dispose()
      res.pointsMat.dispose()
      res.planeGeo.dispose()
      res.planeMat.dispose()
    },
    [res],
  )
  useLayoutEffect(() => {
    pointsRef.current?.layers.set(FX_LAYER)
    planeRef.current?.layers.set(FX_LAYER)
  }, [res])

  useFrame((st) => {
    const s = state.current
    const pts = pointsRef.current
    const plane = planeRef.current
    if (!s || !pts || !plane) return
    const pu = (pts.material as THREE.ShaderMaterial).uniforms
    const t = st.clock.elapsedTime
    pu.uTime.value = t
    pu.uConverge.value = s.converge
    pu.uScan.value = s.scanY
    pu.uOpacity.value = s.cloudOpacity
    // 화면 픽셀 크기: 버퍼 높이 / (2·tan(fov/2))
    pu.uScale.value = (size.height * st.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
    pts.visible = s.cloudOpacity > 0.002
    const plu = (plane.material as THREE.ShaderMaterial).uniforms
    plu.uOpacity.value = s.planeOpacity
    plu.uTime.value = t
    plane.position.y = s.scanY
    plane.visible = s.planeOpacity > 0.002
  })

  return (
    <>
      <points ref={pointsRef} geometry={res.pointsGeo} material={res.pointsMat} frustumCulled={false} renderOrder={5} visible={false} />
      <mesh ref={planeRef} geometry={res.planeGeo} material={res.planeMat} position={[res.fx, -10, res.fz]} renderOrder={4} visible={false} />
    </>
  )
}

// ───────────────────────── 김 ─────────────────────────

const STEAM_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uRadius;
uniform float uRise;
uniform float uIntensity;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
void main() {
  float life = fract( uTime * aSeed.w + aSeed.z );
  vec3 base = vec3( aSeed.x * uRadius, 0.0, aSeed.y * uRadius );
  base.y += life * uRise;
  base.x += sin( life * 3.2 + aSeed.z * 6.283 ) * 1.6 * life;
  base.z += cos( life * 2.6 + aSeed.z * 4.1 ) * 1.2 * life;
  vec4 mv = modelViewMatrix * vec4( base, 1.0 );
  float size = mix( 2.6, 9.5, life );
  float rot = aSeed.z * 6.283 + life * 0.8;
  vec2 q = vec2( cos( rot ) * position.x - sin( rot ) * position.y, sin( rot ) * position.x + cos( rot ) * position.y );
  mv.xy += q * size;
  gl_Position = projectionMatrix * mv;
  vAlpha = smoothstep( 0.0, 0.22, life ) * ( 1.0 - smoothstep( 0.45, 1.0, life ) ) * uIntensity;
  vUv = uv;
  vSeed = aSeed.z;
}`

const STEAM_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
float h21( vec2 p ) { return fract( sin( dot( p, vec2( 41.3, 289.1 ) ) ) * 43758.5453 ); }
float vnoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( h21( i ), h21( i + vec2( 1.0, 0.0 ) ), f.x ), mix( h21( i + vec2( 0.0, 1.0 ) ), h21( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
void main() {
  vec2 c = vUv - 0.5;
  float d = length( c ) * 2.0;
  vec2 p = vUv * 3.0 + vec2( vSeed * 17.0, - uTime * 0.25 );
  float n = vnoise( p ) * 0.6 + vnoise( p * 2.3 ) * 0.4;
  float a = smoothstep( 1.0, 0.15, d ) * smoothstep( 0.25, 0.75, n ) * vAlpha * 0.16;
  if ( a < 0.002 ) discard;
  gl_FragColor = vec4( vec3( 1.0, 0.985, 0.96 ) * a, a );
}`

/** 뜨거운 음식 위로 피어오르는 김(빌보드 사각형 몇 장, 셰이더로만 움직인다). */
export function Steam({
  spec,
  intensity,
}: {
  spec: NonNullable<DishModel['steam']>
  intensity: React.RefObject<number>
}) {
  const ref = useRef<THREE.Mesh>(null)
  const res = useMemo(() => {
    const COUNT = 14
    const base = new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = base.index
    geo.setAttribute('position', base.getAttribute('position'))
    geo.setAttribute('uv', base.getAttribute('uv'))
    const seeds = new Float32Array(COUNT * 4)
    const rng = mulberry32(777)
    for (let i = 0; i < COUNT; i++) {
      const r = Math.sqrt(rng()) * 0.85
      const a = rng() * Math.PI * 2
      seeds[i * 4] = r * Math.cos(a)
      seeds[i * 4 + 1] = r * Math.sin(a)
      seeds[i * 4 + 2] = i / COUNT + rng() * 0.05
      seeds[i * 4 + 3] = 0.2 + rng() * 0.1
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    geo.instanceCount = COUNT
    const mat = new THREE.ShaderMaterial({
      vertexShader: STEAM_VERT,
      fragmentShader: STEAM_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: spec.radius },
        uRise: { value: 16 },
        uIntensity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
      toneMapped: false,
    })
    return { geo, mat, base }
  }, [spec])

  useEffect(
    () => () => {
      res.geo.dispose()
      res.base.dispose()
      res.mat.dispose()
    },
    [res],
  )
  useLayoutEffect(() => {
    ref.current?.layers.set(FX_LAYER)
  }, [res])

  useFrame((st) => {
    const m = ref.current
    if (!m) return
    const u = (m.material as THREE.ShaderMaterial).uniforms
    u.uTime.value = st.clock.elapsedTime
    const k = (intensity.current ?? 0) * spec.strength
    u.uIntensity.value = k
    m.visible = k > 0.002
  })

  return (
    <mesh
      ref={ref}
      geometry={res.geo}
      material={res.mat}
      position={[spec.x, spec.y, spec.z]}
      frustumCulled={false}
      renderOrder={6}
      visible={false}
    />
  )
}

// ───────────────────────── 바닥 빛 웅덩이 ─────────────────────────

const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`

const GLOW_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = length( vUv - 0.5 ) * 2.0;
  float a = pow( 1.0 - smoothstep( 0.0, 1.0, d ), 2.2 ) * uOpacity;
  gl_FragColor = vec4( vec3( 1.0, 0.8, 0.62 ) * a, a );
}`

/**
 * 접시 아래 은은한 따뜻한 빛 웅덩이 — 어두운 화면 위에서도 접촉 그림자가 읽히게 한다.
 * 위치·크기는 화면 맞춤 원을 부드럽게 따라간다(휴대폰이 들어오면 함께 넓어진다).
 */
export function FloorGlow({
  target,
  fade,
}: {
  target: { x: number; z: number; r: number }
  fade: React.RefObject<number>
}) {
  const ref = useRef<THREE.Mesh>(null)
  const res = useMemo(() => {
    const geo = new THREE.CircleGeometry(1, 48)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: { uOpacity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
      toneMapped: false,
    })
    return { geo, mat }
  }, [])
  useEffect(
    () => () => {
      res.geo.dispose()
      res.mat.dispose()
    },
    [res],
  )
  useLayoutEffect(() => {
    ref.current?.layers.set(FX_LAYER)
  }, [res])
  const inited = useRef(false)
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    const r = target.r * 1.5 + 4
    if (!inited.current) {
      inited.current = true
      m.position.set(target.x, 0.004, target.z)
      m.scale.setScalar(r)
    }
    const k = Math.min(1, dt * 4)
    m.position.x += (target.x - m.position.x) * k
    m.position.z += (target.z - m.position.z) * k
    m.scale.setScalar(m.scale.x + (r - m.scale.x) * k)
    ;(m.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.17 * (fade.current ?? 0)
  })
  return <mesh ref={ref} geometry={res.geo} material={res.mat} renderOrder={-1} />
}

// ───────────────────────── 지름 표시선 ─────────────────────────

const PILL_STYLE: React.CSSProperties = {
  color: '#fff',
  background: 'rgba(255,255,255,0.14)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: '.02em',
  padding: '6px 11px',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
}

/**
 * 그릇 지름: 테두리를 따라 도는 옅은 고리 + 손님 쪽(카메라 쪽) 바닥에 늘 보이는 치수선과 라벨.
 * 치수선 묶음은 카메라 방위각을 따라 돈다 — 보조선이 테두리의 가장 넓은 양 끝에서 내려온다.
 * drei Line 은 points 배열이 바뀌면 재질까지 dispose 하므로 점 배열을 모두 메모해 둔다.
 */
export function MeasureGuide({
  radius,
  rimY,
  front,
  label,
  visible,
}: {
  radius: number
  /** 가장 넓은 테두리의 높이(cm) */
  rimY: number
  /** 바닥 치수선까지의 앞쪽 거리(cm) */
  front: number
  label: string
  /** 0..1 — 드러내기가 끝나면 1 */
  visible: React.RefObject<number>
}) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null
  const billboard = useRef<THREE.Group>(null)
  const ringGroup = useRef<THREE.Group>(null)
  const pill = useRef<HTMLDivElement>(null)
  const lastOpacity = useRef(-1)
  const mats = useRef<{ m: THREE.Material; a: number }[]>([])
  const Y = 0.06
  const Z = front
  const pts = useMemo(() => {
    const ring: [number, number, number][] = []
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2
      ring.push([Math.cos(a) * (radius + 0.1), rimY, Math.sin(a) * (radius + 0.1)])
    }
    const v = (x: number, y: number, z: number) => [x, y, z] as [number, number, number]
    return {
      ring,
      main: [v(-radius, Y, Z), v(radius, Y, Z)],
      tickL: [v(-radius, Y, Z - 0.7), v(-radius, Y, Z + 0.7)],
      tickR: [v(radius, Y, Z - 0.7), v(radius, Y, Z + 0.7)],
      extL: [v(-radius - 0.1, rimY, 0), v(-radius, Y, Z + 0.7)],
      extR: [v(radius + 0.1, rimY, 0), v(radius, Y, Z + 0.7)],
    }
  }, [radius, rimY, Z])

  // 선 재질을 한 번만 모아 둔다(매 프레임 순회하지 않게)
  useEffect(() => {
    const list: { m: THREE.Material; a: number }[] = []
    const collect = (root: THREE.Object3D | null, base: number) => {
      if (!root) return
      setLayerDeep(root, FX_LAYER)
      root.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | undefined
        if (mat && !Array.isArray(mat)) list.push({ m: mat, a: base * ((o.userData.alpha as number) ?? 1) })
      })
    }
    collect(ringGroup.current, 0.55)
    collect(billboard.current, 1)
    mats.current = list
  }, [pts])

  useFrame(() => {
    const v = visible.current ?? 0
    const g = billboard.current
    if (g) {
      const tx = controls?.target?.x ?? 0
      const tz = controls?.target?.z ?? 0
      g.rotation.y = Math.atan2(camera.position.x - tx, camera.position.z - tz)
      g.visible = v > 0.002
    }
    if (ringGroup.current) ringGroup.current.visible = v > 0.002
    const list = mats.current
    for (let i = 0; i < list.length; i++) list[i].m.opacity = v * list[i].a
    if (pill.current && Math.abs(lastOpacity.current - v) > 0.01) {
      pill.current.style.opacity = String(v)
      lastOpacity.current = v
    }
    // 카메라(−0.5) 다음, Html 라벨 위치 계산(0) 앞
  }, -0.25)

  return (
    <>
      <group ref={ringGroup}>
        <Line points={pts.ring} lineWidth={1.3} color="#ffffff" transparent depthWrite={false} toneMapped={false} opacity={0} />
      </group>
      <group ref={billboard}>
        <Line points={pts.main} lineWidth={1.6} color="#ffffff" transparent depthWrite={false} depthTest={false} renderOrder={10} toneMapped={false} opacity={0} userData={{ alpha: 0.9 }} />
        <Line points={pts.tickL} lineWidth={1.6} color="#ffffff" transparent depthWrite={false} depthTest={false} renderOrder={10} toneMapped={false} opacity={0} userData={{ alpha: 0.9 }} />
        <Line points={pts.tickR} lineWidth={1.6} color="#ffffff" transparent depthWrite={false} depthTest={false} renderOrder={10} toneMapped={false} opacity={0} userData={{ alpha: 0.9 }} />
        <Line points={pts.extL} lineWidth={1} dashed dashSize={0.4} gapSize={0.35} color="#ffffff" transparent depthWrite={false} depthTest={false} renderOrder={10} toneMapped={false} opacity={0} userData={{ alpha: 0.55 }} />
        <Line points={pts.extR} lineWidth={1} dashed dashSize={0.4} gapSize={0.35} color="#ffffff" transparent depthWrite={false} depthTest={false} renderOrder={10} toneMapped={false} opacity={0} userData={{ alpha: 0.55 }} />
        <Html position={[0, Y, Z]} center zIndexRange={[3, 0]} pointerEvents="none">
          <div ref={pill} style={{ ...PILL_STYLE, opacity: 0 }}>
            {label}
          </div>
        </Html>
      </group>
    </>
  )
}
