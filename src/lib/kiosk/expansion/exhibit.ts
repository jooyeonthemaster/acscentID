/** Shared exhibit protocol. Never put a controller credential in a viewer URL. */
export const EXHIBIT_KINDS = ['product', 'heritage', 'vision-wall'] as const
export type ExhibitKind = (typeof EXHIBIT_KINDS)[number]
export const EXHIBIT_TTL_MS = 60 * 60 * 1000
export const EXHIBIT_LIVE_MS = 16_000
export const EXHIBIT_COLORS = ['#F1D481', '#CF6B63', '#80AEA0', '#7C86BE', '#D7ABD1', '#F2E9D7'] as const
export const PRODUCT_COLORS = ['#E8DCC7', '#627D71', '#BA715F'] as const
export interface ProductConfig { model: 'frame' | 'column'; color: string; brightness: number; rotation: number; zoom: number; on: boolean }
export interface HeritageConfig { scene: 'court' | 'pond'; era: 'past' | 'present'; light: 'day' | 'dusk' | 'night'; comparison: number | null }
export interface WallDraft { text: string; color: string; shape: 'note' | 'circle' | 'arch'; x: number; y: number }
export interface WallMessage extends WallDraft { id: string; createdAt: string }
export type ExhibitCommand = { kind: 'product'; config: ProductConfig } | { kind: 'heritage'; config: HeritageConfig } | { kind: 'vision-wall'; message: WallDraft }
export type ExhibitContent = Exclude<ExhibitCommand, { kind: 'vision-wall' }> | { kind: 'vision-wall'; messages: WallMessage[] }
export interface ExhibitState { id: string; kind: ExhibitKind; expiresAt: number; sequence: number; acknowledgedSequence: number; acknowledgedAt: number | null; connected: boolean; content: ExhibitContent | null }
export interface ExhibitConnection { id: string; kind: ExhibitKind; controllerToken: string; viewerUrl: string; expiresAt: number }
export class ExhibitError extends Error { constructor(message: string, public status = 400) { super(message); this.name = 'ExhibitError' } }
export const isExhibitKind = (value: unknown): value is ExhibitKind => EXHIBIT_KINDS.includes(value as ExhibitKind)
export const validRoomId = (value: string) => /^[a-f0-9]{32}$/.test(value)
export const validExhibitToken = (value: string) => /^[a-f0-9]{64}$/.test(value)
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const number = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

export function parseExhibitCommand(value: unknown): ExhibitCommand {
  if (!record(value)) throw new ExhibitError('전시 내용을 확인해 주세요.')
  if (value.kind === 'product' && record(value.config)) {
    const c = value.config
    if (!['frame', 'column'].includes(String(c.model)) || !(PRODUCT_COLORS as readonly unknown[]).includes(c.color) || !number(c.brightness, 0, 100) || !number(c.rotation, 0, 360) || !number(c.zoom, 60, 140) || typeof c.on !== 'boolean') throw new ExhibitError('제품 설정을 확인해 주세요.')
    return { kind: 'product', config: { model: c.model as ProductConfig['model'], color: c.color as string, brightness: c.brightness, rotation: c.rotation, zoom: c.zoom, on: c.on } }
  }
  if (value.kind === 'heritage' && record(value.config)) {
    const c = value.config
    if (!['court', 'pond'].includes(String(c.scene)) || !['past', 'present'].includes(String(c.era)) || !['day', 'dusk', 'night'].includes(String(c.light)) || !(c.comparison === null || number(c.comparison, 0, 100))) throw new ExhibitError('탐험 장면을 확인해 주세요.')
    return { kind: 'heritage', config: { scene: c.scene as HeritageConfig['scene'], era: c.era as HeritageConfig['era'], light: c.light as HeritageConfig['light'], comparison: c.comparison } }
  }
  if (value.kind === 'vision-wall' && record(value.message)) {
    const m = value.message
    const text = typeof m.text === 'string' ? m.text.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').trim() : ''
    if (!text || [...text].length > 60 || !(EXHIBIT_COLORS as readonly unknown[]).includes(m.color) || !['note', 'circle', 'arch'].includes(String(m.shape)) || !number(m.x, 10, 90) || !number(m.y, 15, 85)) throw new ExhibitError('60자 이내의 메시지와 배치를 확인해 주세요.')
    return { kind: 'vision-wall', message: { text, color: m.color as string, shape: m.shape as WallDraft['shape'], x: m.x, y: m.y } }
  }
  throw new ExhibitError('지원하지 않는 전시 내용입니다.')
}

export function nextExhibitContent(current: ExhibitContent | null, command: ExhibitCommand, messageId: string, now: number): ExhibitContent {
  if (command.kind !== 'vision-wall') return command
  const previous = current?.kind === 'vision-wall' ? current.messages : []
  return { kind: 'vision-wall', messages: [...previous.slice(-29), { ...command.message, id: messageId, createdAt: new Date(now).toISOString() }] }
}

export function isViewerLive(lastSeen: number | null, now = Date.now()): boolean { return lastSeen !== null && now >= lastSeen && now - lastSeen < EXHIBIT_LIVE_MS }
