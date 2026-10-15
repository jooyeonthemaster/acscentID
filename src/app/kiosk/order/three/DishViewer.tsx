'use client'

// AR 3D 메뉴 보기 — 공개 컴포넌트.
// 사업계획서의 '사진 → AI 3D 모델(NeRF/3DGS) → 주문 전에 실제 크기 확인'을 절차적 모형으로 보여 준다.
//
// 지키는 계약
// - 캔버스는 투명(alpha) — 부모의 어두운 유리 화면 위에 접시만 뜬다. 바닥은 보이지 않고 ContactShadows 만 있다.
// - 네트워크 요청 0: Environment 는 Lightformer 로만 만든다(preset 금지). 텍스처도 전부 코드로 만든다.
// - resize={{ offsetSize: true }}: 키오스크 화면 전체가 transform: scale() 무대 안에 있다.
// - 움직임은 prefers-reduced-motion 을 보지 않는다(매장 PC 가 '줄이기'로 보고하는 함정).
// - 성능 예산: Celeron 3955U / HD 510, 1080×1920. dpr 1~1.5, 실시간 그림자 맵 없음, 후처리 없음,
//   조명 3개 + 환경광, 흩뿌린 토핑은 인스턴싱, 매 프레임 객체 생성 없음, 셰이더는 compileAsync 로 미리 컴파일.
// - 부모는 next/dynamic(() => import('./three/DishViewer'), { ssr: false }) 로 불러온다.
//   id·타입만 필요하면 './three/dish-ids' 에서 가져오면 three 가 첫 화면 묶음에 끼지 않는다.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { DISH_3D_IDS, type Dish3DId } from './dish-ids'
import { buildDish, type DishModel } from './dishes'
import { buildPhone, PHONE_L, PHONE_W } from './phone'
import { clamp, createReveal, lerp, REVEAL_DONE, smoothstep } from './kit'
import { FloorGlow, FX_LAYER, MeasureGuide, ScanEffect, Steam, type ScanState } from './effects'

export { DISH_3D_IDS }
export type { Dish3DId }

export interface DishViewerProps {
  dishId: Dish3DId
  /** real vessel diameter in cm — the model is built to true scale (1 unit = 1 cm) */
  sizeCm: number
  /** show a reference smartphone (14.7 × 7.1 × 0.8 cm, dark glass, rounded) lying next to the dish for scale */
  showReference: boolean
  /** show a thin measurement ring/line with a label like "Ø 18 cm" (pass the text in, the parent localizes) */
  measureLabel?: string
  /** slow turntable; pauses while the user drags and resumes ~3 s later. Default true. */
  autoRotate?: boolean
  /** called once per dish, on the first frame after the 'AI 3D generation' reveal finished (model fully visible) */
  onReady?: () => void
  /** applied to the wrapper; the viewer fills its parent (100% × 100%) */
  className?: string
}

// ───────────────────────── 상수 ─────────────────────────

const FOV = 30
const POLAR0 = THREE.MathUtils.degToRad(55) // 고도 35°
const AZIMUTH0 = 0.32
const MIN_POLAR = THREE.MathUtils.degToRad(20)
const MAX_POLAR = THREE.MathUtils.degToRad(75)
const TURNTABLE = 0.24 // rad/s — 한 바퀴 약 26 초
const RESUME_MS = 3000
const REFRAME_S = 0.9

// 드러내기 연출(초)
const CLOUD_MIN = 0.42
const SCAN_S = 1.12
const TAIL_S = 0.18

const GL: Record<string, unknown> = {
  alpha: true,
  antialias: true,
  premultipliedAlpha: true,
  powerPreference: 'high-performance',
  toneMapping: THREE.NeutralToneMapping,
  toneMappingExposure: 1.0,
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

// ───────────────────────── 화면 맞춤 ─────────────────────────

interface Fit {
  cx: number
  cz: number
  /** 바닥 외접원 반지름 */
  r: number
  y0: number
  y1: number
  /** 카메라 쪽 치수선(있으면): 반폭·앞쪽 거리 */
  front: null | { hw: number; z: number }
}

/** 카메라가 원기둥(+앞쪽 치수선)을 다 담는 거리. 방위각과 무관(원기둥은 대칭, 치수선은 카메라를 따라 돈다). */
function fitDistance(fov: number, aspect: number, polar: number, fit: Fit) {
  const e = Math.PI / 2 - polar
  const se = Math.sin(e), ce = Math.cos(e)
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov) / 2)
  const tanH = tanV * aspect
  const yc = (fit.y0 + fit.y1) / 2
  let d = 0
  const test = (x: number, y: number, z: number) => {
    const depth = y * se + z * ce
    const vy = y * ce - z * se
    d = Math.max(d, depth + Math.abs(vy) / tanV, depth + Math.abs(x) / tanH)
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const x = Math.cos(a) * fit.r, z = Math.sin(a) * fit.r
    test(x, fit.y0 - yc, z)
    test(x, fit.y1 - yc, z)
  }
  if (fit.front) {
    // 치수선 끝과 라벨(아래로 1.5 cm 여유)
    test(-fit.front.hw, -yc - 1.5, fit.front.z)
    test(fit.front.hw, -yc - 1.5, fit.front.z)
  }
  return d * 1.04
}

function CameraRig({
  fit,
  controls,
  autoRotate,
  rotateReady,
  userRef,
}: {
  fit: Fit | null
  controls: React.RefObject<OrbitControlsImpl | null>
  autoRotate: boolean
  rotateReady: React.RefObject<boolean>
  userRef: React.RefObject<{ active: boolean; resumeAt: number }>
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const anim = useRef({ from: new THREE.Vector3(), to: new THREE.Vector3(), fromD: 1, toD: 1, t: 1, inited: false })
  const tmp = useMemo(() => ({ off: new THREE.Vector3(), tgt: new THREE.Vector3(), y: new THREE.Vector3(0, 1, 0) }), [])
  const speed = useRef(0)

  const aspect = size.width / Math.max(1, size.height)
  const key = fit
    ? [fit.cx, fit.cz, fit.r, fit.y0, fit.y1, fit.front?.hw ?? 0, fit.front?.z ?? 0, aspect].map((n) => n.toFixed(2)).join('|')
    : ''

  useEffect(() => {
    const c = controls.current
    if (!fit || !c) return
    const A = anim.current
    const polar = A.inited ? c.getPolarAngle() : POLAR0
    const dist = fitDistance(camera.fov, aspect, polar, fit)
    // 치수선이 있으면 화면 중심을 살짝 앞으로(아래로) 내린다
    const frontShift = fit.front ? (fit.front.z - fit.r) * 0.35 : 0
    A.to.set(fit.cx, (fit.y0 + fit.y1) / 2 - frontShift * 0.4, fit.cz)
    A.toD = dist
    if (!A.inited) {
      A.inited = true
      A.t = 1
      c.target.copy(A.to)
      const s = Math.sin(POLAR0)
      camera.position.set(
        A.to.x + dist * s * Math.sin(AZIMUTH0),
        A.to.y + dist * Math.cos(POLAR0),
        A.to.z + dist * s * Math.cos(AZIMUTH0),
      )
      camera.lookAt(c.target)
      c.minDistance = dist * 0.62
      c.maxDistance = dist * 1.4
      c.update()
    } else {
      A.from.copy(c.target)
      A.fromD = camera.position.distanceTo(c.target)
      A.t = 0
      c.minDistance = 0
      c.maxDistance = Infinity
    }
    // key 가 바뀔 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useFrame((_, rawDt) => {
    const c = controls.current
    if (!c) return
    const dt = Math.min(rawDt, 0.1)
    const A = anim.current
    if (A.t < 1) {
      A.t = Math.min(1, A.t + dt / REFRAME_S)
      const e = easeInOutCubic(A.t)
      tmp.tgt.lerpVectors(A.from, A.to, e)
      const dist = lerp(A.fromD, A.toD, e)
      tmp.off.subVectors(camera.position, c.target).normalize()
      c.target.copy(tmp.tgt)
      camera.position.copy(tmp.tgt).addScaledVector(tmp.off, dist)
      if (A.t >= 1) {
        c.minDistance = A.toD * 0.62
        c.maxDistance = A.toD * 1.4
      }
    }
    // 턴테이블 — 직접 돌린다(프레임률과 무관, 손을 떼고 3초 뒤 천천히 다시)
    const U = userRef.current
    const want = autoRotate && rotateReady.current && !U.active && performance.now() >= U.resumeAt ? 1 : 0
    speed.current += (want - speed.current) * Math.min(1, dt * (want ? 0.8 : 8))
    if (speed.current > 0.0005) {
      tmp.off.subVectors(camera.position, c.target).applyAxisAngle(tmp.y, TURNTABLE * speed.current * dt)
      camera.position.copy(c.target).add(tmp.off)
    }
    camera.lookAt(c.target)
    // 우선순위: OrbitControls(-1) 다음, 치수선·Html 라벨(0) 앞 — 라벨이 한 프레임 늦게 따라오지 않게
  }, -0.5)

  return null
}

// ───────────────────────── 그림자(한 번만 굽기) ─────────────────────────

function ShadowLayer({ version, live, fade }: { version: number; live: boolean; fade: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const mesh = ref.current?.children[0] as THREE.Mesh | undefined
    if (mesh) (mesh.material as THREE.MeshBasicMaterial).opacity = 0.72 * (fade.current ?? 0)
  })
  // ContactShadows 는 다시 렌더될 때마다 frames 를 새로 센다 → version·live 가 바뀌면 다시 굽는다.
  return (
    <ContactShadows
      ref={ref}
      key="contact-shadows"
      frames={live ? Infinity : 2}
      position={[0, 0.01, 0]}
      scale={76}
      resolution={256}
      blur={2.6}
      far={26}
      opacity={0.72}
      color="#0a0604"
      userData={{ version }}
    />
  )
}

// ───────────────────────── 참고용 휴대폰 ─────────────────────────

function ReferencePhone({
  show,
  place,
  onAnimating,
}: {
  show: boolean
  place: DishModel['phone']
  onAnimating: (a: boolean) => void
}) {
  const phone = useMemo(() => buildPhone(), [])
  useEffect(() => () => phone.dispose(), [phone])
  const groupRef = useRef<THREE.Group>(null)
  const p = useRef(0)
  const animating = useRef(false)
  const dir = useMemo(() => {
    const len = Math.hypot(place.x, place.z) || 1
    return { x: place.x / len, z: place.z / len }
  }, [place.x, place.z])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const target = show ? 1 : 0
    const before = p.current
    if (before !== target) {
      p.current = clamp(before + (target > before ? dt : -dt) / 0.7, 0, 1)
    }
    const moving = p.current !== target
    if (moving !== animating.current) {
      animating.current = moving
      onAnimating(moving)
    }
    const e = show ? easeOutCubic(p.current) : easeInOutCubic(p.current)
    const g = groupRef.current
    if (!g) return
    const slide = (1 - e) * 9
    g.position.set(place.x + dir.x * slide, (1 - e) * 1.2, place.z + dir.z * slide)
    g.rotation.y = place.yaw + (1 - e) * 0.35
    phone.setOpacity(e)
    g.visible = e > 0.002
  })

  return <primitive ref={groupRef} object={phone.group} />
}

// ───────────────────────── 장면 ─────────────────────────

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff1df', '#24170f', 0.5]} />
      <directionalLight position={[-30, 48, 30]} intensity={1.9} color="#fff0dc" />
      <directionalLight position={[34, 22, -38]} intensity={1.0} color="#d4e2ff" />
      <Environment resolution={256} frames={1} environmentIntensity={0.85}>
        {/* 왼쪽 위 따뜻한 키 소프트박스 */}
        <Lightformer form="rect" intensity={3.2} color="#ffd8ae" position={[-5, 5, 3.5]} scale={[7, 4.5, 1]} target={[0, 0, 0]} />
        {/* 오른쪽 뒤 차가운 림 */}
        <Lightformer form="rect" intensity={2.4} color="#bcd0ff" position={[5.5, 2.2, -5]} scale={[2.5, 6, 1]} target={[0, 0, 0]} />
        {/* 위 채움 */}
        <Lightformer form="circle" intensity={1.3} color="#fff6ea" position={[0, 8, 0]} scale={6} target={[0, 0, 0]} />
        {/* 앞 아래 은은한 호박색 반사 */}
        <Lightformer form="rect" intensity={0.45} color="#ff9a52" position={[0, -2.5, 6]} scale={[10, 2, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}

interface DirectorState {
  phase: 'cloud' | 'scan' | 'tail' | 'done'
  t: number
  phaseT: number
  compiled: boolean
  tailFrames: number
}

function Scene({
  dishId,
  sizeCm,
  showReference,
  measureLabel,
  autoRotate = true,
  onReady,
}: DishViewerProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const reveal = useMemo(() => createReveal(), [])
  const model = useMemo(() => buildDish(dishId, sizeCm, reveal.uniforms), [dishId, sizeCm, reveal])
  const groupRef = useRef<THREE.Group>(null)
  useEffect(() => () => model.dispose(), [model])

  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  const controls = useRef<OrbitControlsImpl | null>(null)
  const userRef = useRef({ active: false, resumeAt: 0 })
  const rotateReady = useRef(false)
  const scan = useRef<ScanState>({ converge: 0, cloudOpacity: 0, planeOpacity: 0, scanY: -10 })
  const steamK = useRef(0)
  const measureK = useRef(0)
  const shadowFade = useRef(0)
  const [shadowVersion, setShadowVersion] = useState(0)
  const [phoneAnimating, setPhoneAnimating] = useState(false)
  const director = useRef<DirectorState>({ phase: 'cloud', t: 0, phaseT: 0, compiled: false, tailFrames: 0 })

  // 메뉴가 바뀔 때마다: 숨기고 → 셰이더를 비동기로 미리 컴파일 → 점구름 → 스캔
  // (레이아웃 단계에서 되감아야 새 모형이 한 프레임이라도 다 보인 채 그려지지 않는다)
  useLayoutEffect(() => {
    const D = director.current
    D.phase = 'cloud'
    D.t = 0
    D.phaseT = 0
    D.compiled = false
    D.tailFrames = 0
    rotateReady.current = false
    steamK.current = 0
    measureK.current = 0
    shadowFade.current = 0
    reveal.set(model.info.minY - 2)
    if (groupRef.current) groupRef.current.visible = false
    let alive = true
    const done = () => {
      if (alive) D.compiled = true
    }
    const safety = window.setTimeout(done, 6000)
    try {
      // KHR_parallel_shader_compile 가 있으면(매장 PC 의 ANGLE/D3D11) 화면을 멈추지 않고 컴파일한다.
      // 없으면 compileAsync 도 어차피 막히고 경고만 남기므로 바로 compile 한다.
      if (gl.extensions.has('KHR_parallel_shader_compile')) gl.compileAsync(scene, camera).then(done, done)
      else {
        gl.compile(scene, camera)
        done()
      }
    } catch {
      done()
    }
    return () => {
      alive = false
      window.clearTimeout(safety)
    }
  }, [model, gl, scene, camera, reveal])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const D = director.current
    const S = scan.current
    const { minY, maxY } = model.info
    D.t += dt
    D.phaseT += dt
    if (D.phase === 'cloud') {
      S.converge = easeOutCubic(clamp(D.t / CLOUD_MIN, 0, 1))
      S.cloudOpacity = clamp(D.t / 0.25, 0, 1)
      S.scanY = minY - 0.8
      S.planeOpacity = smoothstep(0.15, CLOUD_MIN, D.t)
      if (D.compiled && D.t >= CLOUD_MIN) {
        D.phase = 'scan'
        D.phaseT = 0
        if (groupRef.current) groupRef.current.visible = true
        setShadowVersion((v) => v + 1)
      }
    } else if (D.phase === 'scan') {
      const k = clamp(D.phaseT / SCAN_S, 0, 1)
      const y = lerp(minY - 0.8, maxY + 1.4, easeInOutSine(k))
      S.converge = 1
      S.scanY = y
      reveal.set(y)
      S.planeOpacity = 1 - smoothstep(0.82, 1, k)
      S.cloudOpacity = 1 - smoothstep(0.75, 1, k)
      shadowFade.current = smoothstep(0.05, 0.9, k)
      if (k >= 1) {
        D.phase = 'tail'
        D.phaseT = 0
        reveal.set(REVEAL_DONE)
        S.planeOpacity = 0
        S.cloudOpacity = 0
        shadowFade.current = 1
      }
    } else if (D.phase === 'tail') {
      D.tailFrames++
      // 다 드러난 프레임이 한 번 그려진 뒤에 알린다
      if (D.tailFrames === 2) onReadyRef.current?.()
      if (D.phaseT >= TAIL_S && D.tailFrames >= 2) {
        D.phase = 'done'
        D.phaseT = 0
        rotateReady.current = true
      }
    }
    if (D.phase === 'tail' || D.phase === 'done') {
      steamK.current = Math.min(1, steamK.current + dt / 1.6)
      measureK.current = Math.min(1, measureK.current + dt / 0.5)
    }
  })

  const fit = useMemo<Fit>(() => {
    const fp = model.info.footprint
    let cx = fp.x, cz = fp.z, r = fp.r
    if (showReference) {
      // 접시 외접원과 휴대폰 원(반대각선)을 함께 담는 최소 원
      const pr = Math.hypot(PHONE_W, PHONE_L) / 2
      const px = model.phone.x, pz = model.phone.z
      const d = Math.hypot(px - cx, pz - cz)
      if (d + pr > r) {
        if (d + r <= pr) {
          cx = px
          cz = pz
          r = pr
        } else {
          const R = (d + r + pr) / 2
          const k = (R - r) / Math.max(d, 1e-6)
          cx += (px - cx) * k
          cz += (pz - cz) * k
          r = R
        }
      }
    }
    return {
      cx,
      cz,
      r,
      y0: 0,
      y1: model.info.maxY,
      front: measureLabel ? { hw: model.rimRadius, z: model.measureZ + 1.0 } : null,
    }
  }, [model, showReference, measureLabel])

  const glowTarget = useMemo(() => ({ x: fit.cx, z: fit.cz, r: fit.r }), [fit])

  const onStart = useCallback(() => {
    userRef.current.active = true
  }, [])
  const onEnd = useCallback(() => {
    userRef.current.active = false
    userRef.current.resumeAt = performance.now() + RESUME_MS
  }, [])

  const lights = useMemo(() => <Lights />, [])

  return (
    <>
      {lights}
      <primitive ref={groupRef} key={`${dishId}:${sizeCm}`} object={model.group} />
      <ScanEffect model={model} state={scan} />
      {model.steam ? <Steam key={`steam:${dishId}`} spec={model.steam} intensity={steamK} /> : null}
      {measureLabel ? <MeasureGuide radius={model.rimRadius} rimY={model.rimY} front={model.measureZ} label={measureLabel} visible={measureK} /> : null}
      <ReferencePhone show={showReference} place={model.phone} onAnimating={setPhoneAnimating} />
      <FloorGlow target={glowTarget} fade={shadowFade} />
      <ShadowLayer version={shadowVersion} live={phoneAnimating} fade={shadowFade} />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.6}
        minPolarAngle={MIN_POLAR}
        maxPolarAngle={MAX_POLAR}
        onStart={onStart}
        onEnd={onEnd}
      />
      <CameraRig fit={fit} controls={controls} autoRotate={autoRotate} rotateReady={rotateReady} userRef={userRef} />
    </>
  )
}

// ───────────────────────── 공개 컴포넌트 ─────────────────────────

/** 무대(transform: scale) 배율까지 곱한 픽셀 비율 — 1~1.5 로 묶는다(HD 510 예산). */
function useStageDpr(ref: React.RefObject<HTMLDivElement | null>) {
  const [dpr, setDpr] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth
      const rw = el.getBoundingClientRect().width
      const stage = w > 0 && rw > 0 ? rw / w : 1
      const next = Math.round(clamp((window.devicePixelRatio || 1) * stage, 1, 1.5) * 100) / 100
      setDpr((prev) => (Math.abs(prev - next) > 0.01 ? next : prev))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [ref])
  return dpr
}

export function DishViewer(props: DishViewerProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const dpr = useStageDpr(wrap)
  return (
    <div ref={wrap} className={props.className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        dpr={dpr}
        gl={GL}
        camera={{ fov: FOV, near: 1, far: 900, position: [0, 40, 60] }}
        resize={{ offsetSize: true }}
        frameloop="always"
        onCreated={({ camera }) => {
          camera.layers.enable(FX_LAYER)
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  )
}

export default DishViewer
