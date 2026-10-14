// 터치 전시 네 가지(빛 실험·조명·궁궐·비전 월)가 사진에서 고르는 첫 설정 — 손님은 그 뒤 마음대로 바꾼다.
// 무엇을 읽어 무엇을 골랐는지(reasons)를 화면과 결과에 그대로 적는다.

import { EXHIBIT_COLORS, type HeritageConfig, type ProductConfig, type WallDraft } from './exhibit'
import { colorDistance, expression, hexToLab, labToRgb, lightLabel, outfitLook, PHOTO_PLANS, readingLine, type PhotoReading } from './photo'
import type { ExpansionId, ResultSection } from './types'

export interface PhotoPick<T> { patch: Partial<T>; reasons: string[] }
export const WALL_COLOR_NAMES = ['햇살', '코럴', '세이지', '라벤더', '라일락', '아이보리'] as const
const PRODUCT_NAMES: Record<string, string> = { '#E8DCC7': '샌드', '#627D71': '세이지', '#BA715F': '테라코타' }

/** 조명 — 사진 속 공간이 어두울수록 밝게, 옷 색의 온도로 갓 색 */
export function photoProduct(photo: PhotoReading): PhotoPick<ProductConfig> {
  const brightness = photo.scene.brightness >= 70 ? 55 : photo.scene.brightness >= 45 ? 70 : 85
  const look = outfitLook(photo)
  const color = look?.tone === 'warm' ? '#BA715F' : look?.tone === 'cool' ? '#627D71' : '#E8DCC7'
  return {
    patch: { brightness, color, on: true },
    reasons: [
      `사진 속 빛(${lightLabel(photo.scene)}) → 밝기 ${brightness}%`,
      look ? `옷 색 ${look.main.name}(${look.tone === 'warm' ? '따뜻한 색' : look.tone === 'cool' ? '시원한 색' : '차분한 색'}) → ${PRODUCT_NAMES[color]} 갓` : `옷 색을 읽지 못해 기본 ${PRODUCT_NAMES[color]} 갓`,
    ],
  }
}

/** 궁궐 — 사진 속 빛의 밝기·온도로 시간대, 옷 색의 온도로 첫 장면 */
export function photoHeritage(photo: PhotoReading): PhotoPick<HeritageConfig> {
  const light: HeritageConfig['light'] = photo.scene.brightness < 40 ? 'night' : photo.scene.warmth >= 9 ? 'dusk' : 'day'
  const look = outfitLook(photo)
  const scene: HeritageConfig['scene'] = look?.tone === 'cool' ? 'pond' : 'court'
  return {
    patch: { light, scene },
    reasons: [
      `사진 속 빛(${lightLabel(photo.scene)}) → ${light === 'night' ? '고요한 밤' : light === 'dusk' ? '해 질 녘' : '맑은 낮'}`,
      look ? `옷 색 ${look.main.name}(${look.tone === 'cool' ? '물빛을 닮은 시원한 색' : '따뜻하거나 차분한 색'}) → ${scene === 'pond' ? '연못 정자' : '궁궐 마당'}` : `옷 색을 읽지 못해 기본 ${scene === 'pond' ? '연못 정자' : '궁궐 마당'}`,
    ],
  }
}

/** 비전 월 — 옷 색과 가장 닮은 카드 색, 표정에 어울리는 카드 모양 */
export function photoWall(photo: PhotoReading): PhotoPick<WallDraft> {
  const look = outfitLook(photo), face = expression(photo)
  const color = look ? [...EXHIBIT_COLORS].sort((p, q) => colorDistance(hexToLab(p), look.main.lab) - colorDistance(hexToLab(q), look.main.lab))[0] : undefined
  const shape: WallDraft['shape'] = face?.bright ? 'circle' : face?.calm ? 'note' : 'arch'
  const shapeName = { circle: '원', note: '메모', arch: '아치' }[shape]
  return {
    patch: { ...(color ? { color } : {}), shape },
    reasons: [
      ...(look && color ? [`옷 색 ${look.main.name} → 닮은 ${WALL_COLOR_NAMES[EXHIBIT_COLORS.indexOf(color as (typeof EXHIBIT_COLORS)[number])]} 카드`] : ['옷 색을 읽지 못해 기본 카드 색']),
      face ? `${face.label} → ${shapeName} 모양` : `기본 ${shapeName} 모양`,
    ],
  }
}

export interface PhotoMission { name: string; target: [number, number, number]; hint: string; from: string; color: string }
/** 빛 실험 — 옷에서 가장 많이 보인 색을 빛으로 다시 만드는 미션 */
export function photoMission(photo: PhotoReading): PhotoMission | null {
  const main = photo.outfit[0]
  if (!main) return null
  const target = labToRgb(main.lab)
  const pct = (v: number) => Math.round(v / 255 * 10) * 10
  return { name: `내 옷 색 · ${main.name}`, color: main.name, target, from: main.hex, hint: `빨강 약 ${pct(target[0])}%, 초록 약 ${pct(target[1])}%, 파랑 약 ${pct(target[2])}%에서 시작해 조금씩 맞춰 보세요.` }
}

/** 결과에 붙이는 '사진으로 고른 첫 설정' */
export function photoPickSection(id: ExpansionId, photo: PhotoReading, reasons: string[], after = '처음 설정만 사진으로 골랐어요. 그 뒤 직접 바꾼 설정이 결과에 남아요.'): ResultSection {
  return { title: '사진에서 읽은 것', body: `${readingLine(photo, PHOTO_PLANS[id])}. 기기에서 잰 값으로 고른 첫 설정이에요.`, items: [...reasons, after] }
}
