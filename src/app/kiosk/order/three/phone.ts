'use client'

// AR 3D 메뉴 보기 — 크기 비교용 휴대폰(14.7 × 7.1 × 0.8 cm, 어두운 유리, 둥근 모서리).
// 화면이 위로 오게 바닥에 눕힌다. 잠금화면이 아주 어둡게 비쳐 '휴대폰'으로 바로 읽히게 한다.
// 드러내기 셰이더를 끼우지 않는다(휴대폰은 따로 미끄러져 들어온다). 투명도는 늘 켜 둬서 페이드 때 다시 컴파일하지 않는다.

import * as THREE from 'three'
import { canvasTexture } from './kit'

export const PHONE_W = 7.1
export const PHONE_L = 14.7
export const PHONE_T = 0.8

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

export interface PhoneModel {
  group: THREE.Group
  materials: THREE.Material[]
  setOpacity: (o: number) => void
  dispose: () => void
}

export function buildPhone(): PhoneModel {
  const group = new THREE.Group()
  group.name = 'reference-phone'
  const bevel = 0.14
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(PHONE_W - bevel * 2, PHONE_L - bevel * 2, 1.0), {
    depth: PHONE_T - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  })
  // 모양(XY) → 바닥에 눕힘: 압출 방향(+z)이 위(+y)
  bodyGeo.rotateX(-Math.PI / 2)
  bodyGeo.translate(0, bevel, 0)

  // 세 재질 모두 같은 셰이더 프로그램을 쓰도록 같은 기능(Standard + emissiveMap + 투명)만 쓴다.
  // 몸체·테두리는 emissive 가 검정이라 화면 무늬가 비치지 않는다.
  const glassBack = new THREE.MeshStandardMaterial({
    color: '#0c0d10', roughness: 0.1, metalness: 0.2, envMapIntensity: 1.2,
    emissive: new THREE.Color('#000000'), transparent: true, opacity: 0,
  })
  const frame = new THREE.MeshStandardMaterial({
    color: '#56565c', roughness: 0.28, metalness: 0.95,
    emissive: new THREE.Color('#000000'), transparent: true, opacity: 0,
  })
  // ExtrudeGeometry 그룹: 0 = 앞뒤 면, 1 = 옆면
  const body = new THREE.Mesh(bodyGeo, [glassBack, frame])
  group.add(body)

  // 화면 — 얇은 검은 테두리 안쪽의 잠금화면(아주 어둡게)
  const screenTex = canvasTexture(256, 530, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#0d1018')
    bg.addColorStop(0.55, '#18120f')
    bg.addColorStop(1, '#2a1a10')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    const glow = ctx.createRadialGradient(w * 0.3, h * 0.8, 10, w * 0.3, h * 0.8, w * 0.9)
    glow.addColorStop(0, 'rgba(255,150,70,0.55)')
    glow.addColorStop(1, 'rgba(255,150,70,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)
    const glow2 = ctx.createRadialGradient(w * 0.85, h * 0.25, 10, w * 0.85, h * 0.25, w * 0.7)
    glow2.addColorStop(0, 'rgba(120,140,255,0.28)')
    glow2.addColorStop(1, 'rgba(120,140,255,0)')
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, w, h)
    // 다이내믹 아일랜드
    ctx.fillStyle = '#000'
    const iw = 62, ih = 18
    ctx.beginPath()
    ctx.roundRect((w - iw) / 2, 16, iw, ih, ih / 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.86)'
    ctx.textAlign = 'center'
    ctx.font = '500 15px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText('Wednesday, October 15', w / 2, 82)
    ctx.font = '300 74px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText('12:30', w / 2, 152)
    // 홈 막대
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.roundRect((w - 90) / 2, h - 16, 90, 5, 2.5)
    ctx.fill()
  })
  const sw = PHONE_W - 0.42, sl = PHONE_L - 0.42
  const screenGeo = new THREE.ShapeGeometry(roundedRect(sw, sl, 0.86), 8)
  {
    // 모양 좌표 → 0..1 UV
    const pos = screenGeo.getAttribute('position') as THREE.BufferAttribute
    const uv = screenGeo.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / sw + 0.5, pos.getY(i) / sl + 0.5)
    uv.needsUpdate = true
  }
  screenGeo.rotateX(-Math.PI / 2)
  const screen = new THREE.MeshStandardMaterial({
    color: '#030304', roughness: 0.05, metalness: 0.1, envMapIntensity: 1.3,
    emissive: new THREE.Color('#ffffff'), emissiveMap: screenTex, emissiveIntensity: 0.42,
    transparent: true, opacity: 0,
  })
  glassBack.emissiveMap = screenTex
  frame.emissiveMap = screenTex
  const screenMesh = new THREE.Mesh(screenGeo, screen)
  screenMesh.position.y = PHONE_T + 0.004
  group.add(screenMesh)

  // 옆 버튼
  const btnGeo = new THREE.BoxGeometry(0.12, 0.3, 1)
  const buttons: [number, number, number][] = [[-PHONE_W / 2 - 0.03, -3.6, 1.1], [-PHONE_W / 2 - 0.03, -2.2, 1.1], [PHONE_W / 2 + 0.03, -2.8, 1.8]]
  buttons.forEach(([x, z, len]) => {
    const b = new THREE.Mesh(btnGeo, frame)
    b.position.set(x, PHONE_T / 2, z)
    b.scale.z = len
    group.add(b)
  })

  const materials: THREE.Material[] = [glassBack, frame, screen]
  return {
    group,
    materials,
    setOpacity: (o: number) => {
      for (const m of materials) m.opacity = o
    },
    dispose: () => {
      bodyGeo.dispose()
      screenGeo.dispose()
      btnGeo.dispose()
      screenTex.dispose()
      materials.forEach((m) => m.dispose())
    },
  }
}
