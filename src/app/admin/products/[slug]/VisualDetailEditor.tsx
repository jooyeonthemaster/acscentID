'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import NextImage from 'next/image'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Box,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Heading1,
  ImageIcon,
  ListChecks,
  Loader2,
  Minus,
  MousePointerClick,
  MoveDown,
  MoveUp,
  Palette,
  Plus,
  Quote,
  Rows3,
  Trash2,
  Type,
} from 'lucide-react'
import {
  extractProductPageContent,
  serializeProductPageContentConfig,
} from '@/lib/products/page-content'

type Align = 'left' | 'center' | 'right'
type BlockType = 'hero' | 'heading' | 'text' | 'image' | 'features' | 'quote' | 'button' | 'freebox' | 'divider' | 'spacer' | 'legacy'

interface BaseBlock {
  id: string
  type: BlockType
  width?: number
  height?: number
}

interface HeroBlock extends BaseBlock {
  type: 'hero'
  title: string
  subtitle: string
  align: Align
  bgColor: string
  accentColor: string
}

interface HeadingBlock extends BaseBlock {
  type: 'heading'
  text: string
  level: 'h2' | 'h3'
  align: Align
  color: string
}

interface TextBlock extends BaseBlock {
  type: 'text'
  text: string
  align: Align
}

interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string
  alt: string
  caption: string
  fit: 'cover' | 'contain'
  radius: number
}

interface FeaturesBlock extends BaseBlock {
  type: 'features'
  title: string
  items: string[]
  accentColor: string
}

interface QuoteBlock extends BaseBlock {
  type: 'quote'
  text: string
  author: string
}

interface ButtonBlock extends BaseBlock {
  type: 'button'
  label: string
  href: string
  align: Align
  bgColor: string
  textColor: string
}

interface FreeBoxBlock extends BaseBlock {
  type: 'freebox'
  icon: string
  title: string
  subtitle: string
  x: number
  y: number
  width: number
  height: number
  radius: number
  bgColor: string
  textColor: string
  borderColor: string
}

interface DividerBlock extends BaseBlock {
  type: 'divider'
  label: string
}

interface SpacerBlock extends BaseBlock {
  type: 'spacer'
  height: number
}

interface LegacyBlock extends BaseBlock {
  type: 'legacy'
  html: string
}

type DetailBlock =
  | HeroBlock
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | FeaturesBlock
  | QuoteBlock
  | ButtonBlock
  | FreeBoxBlock
  | DividerBlock
  | SpacerBlock
  | LegacyBlock

interface VisualDetailEditorProps {
  value: string
  onChange: (html: string) => void
  onImageUpload: (file: File) => Promise<string>
  selectedBlockId?: string
  previewPatch?: {
    id: string
    patch: Partial<DetailBlock>
    nonce: number
  } | null
  focusToken?: number
  onPreviewTargetChange?: (id: string | null) => void
  onSelectedBlockChange?: (id: string) => void
}

const BLOCK_LABELS: Record<BlockType, string> = {
  hero: '히어로',
  heading: '제목',
  text: '본문',
  image: '이미지',
  features: '리스트',
  quote: '인용',
  button: '버튼',
  freebox: '박스',
  divider: '구분선',
  spacer: '여백',
  legacy: '기존',
}

const QUICK_COLORS = ['#111827', '#FACC15', '#F472B6', '#8B5CF6', '#22D3EE', '#34D399', '#FB7185', '#F97316']

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/\n/g, '&#10;')
}

function linesToHtml(value: string) {
  return escapeHtml(value)
    .split('\n')
    .map((line) => line || '&nbsp;')
    .join('<br />')
}

function jsonAttr(value: unknown) {
  return escapeAttr(JSON.stringify(value))
}

function readJsonAttr<T>(element: Element, name: string, fallback: T): T {
  const raw = element.getAttribute(name)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readElementText(element: Element | null, fallback = '') {
  if (!element) return fallback
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n')
  })
  const text = (clone.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text || fallback
}

function readAttrOrText(element: Element, attrName: string, targetSelector?: string) {
  const textTarget = targetSelector ? element.querySelector(targetSelector) : element
  return readElementText(textTarget, element.getAttribute(attrName) || '')
}

function readFeatureItems(element: Element) {
  const domItems = Array.from(element.querySelectorAll('li'))
    .map((item) => readElementText(item.lastElementChild || item))
    .filter(Boolean)

  return domItems.length > 0 ? domItems : readJsonAttr<string[]>(element, 'data-items', [])
}

function readNumberAttr(element: Element, name: string) {
  const raw = element.getAttribute(name)
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function readBlockSize(element: Element) {
  return {
    width: readNumberAttr(element, 'data-width'),
    height: readNumberAttr(element, 'data-height'),
  }
}

function blockSizeAttrs(block: DetailBlock) {
  const attrs = []
  if (block.width) attrs.push(`data-width="${block.width}"`)
  if (block.height) attrs.push(`data-height="${block.height}"`)
  return attrs.length ? ` ${attrs.join(' ')}` : ''
}

function blockSizeStyle(block: DetailBlock, options: { heightMode?: 'min' | 'exact' } = {}) {
  const styles = []
  if (block.width) {
    styles.push(`width: min(${block.width}px, 100%)`)
    styles.push('max-width: 100%')
  }
  if (block.height) {
    styles.push(`${options.heightMode === 'exact' ? 'height' : 'min-height'}: ${block.height}px`)
  }
  if (styles.length) styles.push('box-sizing: border-box')
  return styles.length ? ` ${styles.join('; ')};` : ''
}

function blockResizeDefaults(block: DetailBlock) {
  switch (block.type) {
    case 'hero':
      return { width: 455, height: 150, minHeight: 88, maxHeight: 520 }
    case 'heading':
      return { width: 455, height: 52, minHeight: 28, maxHeight: 240 }
    case 'text':
      return { width: 455, height: 104, minHeight: 48, maxHeight: 720 }
    case 'image':
      return { width: 455, height: 220, minHeight: 80, maxHeight: 720 }
    case 'features':
      return { width: 455, height: 180, minHeight: 96, maxHeight: 900 }
    case 'quote':
      return { width: 455, height: 116, minHeight: 56, maxHeight: 520 }
    case 'button':
      return { width: 455, height: 64, minHeight: 44, maxHeight: 180 }
    case 'freebox':
      return { width: block.width, height: block.height, minHeight: 64, maxHeight: 360 }
    case 'divider':
      return { width: 455, height: 40, minHeight: 24, maxHeight: 160 }
    case 'spacer':
      return { width: block.width || 455, height: block.height, minHeight: 8, maxHeight: 240 }
    case 'legacy':
      return { width: 455, height: 160, minHeight: 80, maxHeight: 1200 }
  }
}

function defaultBlock(type: BlockType): DetailBlock {
  const id = uid()
  switch (type) {
    case 'hero':
      return {
        id,
        type,
        title: '상품의 특별함을 한 문장으로 보여주세요',
        subtitle: '고객이 바로 이해할 수 있는 설명을 입력하세요.',
        align: 'center',
        bgColor: '#FFF7ED',
        accentColor: '#FACC15',
      }
    case 'heading':
      return { id, type, text: '새로운 섹션 제목', level: 'h2', align: 'left', color: '#111827' }
    case 'text':
      return { id, type, text: '본문을 입력하세요. 줄바꿈도 그대로 반영됩니다.', align: 'left' }
    case 'image':
      return { id, type, src: '', alt: '', caption: '', fit: 'cover', radius: 16 }
    case 'features':
      return {
        id,
        type,
        title: '포인트',
        items: ['첫 번째 특징', '두 번째 특징', '세 번째 특징'],
        accentColor: '#8B5CF6',
      }
    case 'quote':
      return { id, type, text: '강조하고 싶은 문장을 입력하세요.', author: '' }
    case 'button':
      return {
        id,
        type,
        label: '자세히 보기',
        href: '#',
        align: 'center',
        bgColor: '#111827',
        textColor: '#FFFFFF',
      }
    case 'freebox':
      return {
        id,
        type,
        icon: '✦',
        title: '새 박스',
        subtitle: '설명을 입력하세요',
        x: 24,
        y: 160,
        width: 144,
        height: 112,
        radius: 18,
        bgColor: '#FACC15',
        textColor: '#111827',
        borderColor: '#111827',
      }
    case 'divider':
      return { id, type, label: '' }
    case 'spacer':
      return { id, type, height: 32 }
    case 'legacy':
      return { id, type, html: '' }
  }
}

function htmlToBlocks(html: string): DetailBlock[] {
  if (typeof window === 'undefined' || !html.trim()) {
    return [
      defaultBlock('hero'),
      defaultBlock('text'),
      defaultBlock('image'),
      defaultBlock('features'),
    ]
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const generatedBlocks = Array.from(doc.querySelectorAll('[data-ac-block]'))

  if (generatedBlocks.length === 0) {
    return [{ id: 'legacy-detail', type: 'legacy', html }]
  }

  return generatedBlocks.map((element) => {
    const type = element.getAttribute('data-ac-block') as BlockType | null
    const id = element.getAttribute('data-ac-block-id') || uid()

    switch (type) {
      case 'hero':
        return {
          id,
          type,
          ...readBlockSize(element),
          title: readAttrOrText(element, 'data-title', 'h1,h2,h3'),
          subtitle: readAttrOrText(element, 'data-subtitle', 'p'),
          align: (element.getAttribute('data-align') as Align | null) || 'center',
          bgColor: element.getAttribute('data-bg') || '#FFF7ED',
          accentColor: element.getAttribute('data-accent') || '#FACC15',
        }
      case 'heading':
        return {
          id,
          type,
          ...readBlockSize(element),
          text: readAttrOrText(element, 'data-text', 'h1,h2,h3'),
          level: (element.getAttribute('data-level') as 'h2' | 'h3' | null) || 'h2',
          align: (element.getAttribute('data-align') as Align | null) || 'left',
          color: element.getAttribute('data-color') || '#111827',
        }
      case 'text':
        return {
          id,
          type,
          ...readBlockSize(element),
          text: readAttrOrText(element, 'data-text', 'p'),
          align: (element.getAttribute('data-align') as Align | null) || 'left',
        }
      case 'image':
        return {
          id,
          type,
          ...readBlockSize(element),
          src: element.getAttribute('data-src') || '',
          alt: element.getAttribute('data-alt') || '',
          caption: readAttrOrText(element, 'data-caption', 'figcaption'),
          fit: (element.getAttribute('data-fit') as 'cover' | 'contain' | null) || 'cover',
          radius: Number(element.getAttribute('data-radius') || 16),
        }
      case 'features':
        return {
          id,
          type,
          ...readBlockSize(element),
          title: readAttrOrText(element, 'data-title', 'h1,h2,h3') || '포인트',
          items: readFeatureItems(element),
          accentColor: element.getAttribute('data-accent') || '#8B5CF6',
        }
      case 'quote': {
        const quoteParagraphs = Array.from(element.querySelectorAll('p'))
        return {
          id,
          type,
          ...readBlockSize(element),
          text: readElementText(quoteParagraphs[0], element.getAttribute('data-text') || ''),
          author: readElementText(quoteParagraphs[1], element.getAttribute('data-author') || ''),
        }
      }
      case 'button':
        return {
          id,
          type,
          ...readBlockSize(element),
          label: readAttrOrText(element, 'data-label', 'a,button'),
          href: element.getAttribute('data-href') || '#',
          align: (element.getAttribute('data-align') as Align | null) || 'center',
          bgColor: element.getAttribute('data-bg') || '#111827',
          textColor: element.getAttribute('data-color') || '#FFFFFF',
        }
      case 'freebox':
        return {
          id,
          type,
          icon: readElementText(element.querySelector(':scope > div'), element.getAttribute('data-icon') || '✦'),
          title: readElementText(element.querySelector(':scope > strong'), element.getAttribute('data-title') || '새 박스'),
          subtitle: readElementText(element.querySelector(':scope > span'), element.getAttribute('data-subtitle') || ''),
          x: Number(element.getAttribute('data-x') || 24),
          y: Number(element.getAttribute('data-y') || 160),
          width: Number(element.getAttribute('data-width') || 140),
          height: Number(element.getAttribute('data-height') || 116),
          radius: Number(element.getAttribute('data-radius') || 18),
          bgColor: element.getAttribute('data-bg') || '#FACC15',
          textColor: element.getAttribute('data-color') || '#111827',
          borderColor: element.getAttribute('data-border') || '#111827',
        }
      case 'divider':
        return { id, type, ...readBlockSize(element), label: readAttrOrText(element, 'data-label', 'span') }
      case 'spacer':
        return { id, type, width: readNumberAttr(element, 'data-width'), height: Number(element.getAttribute('data-height') || 32) }
      case 'legacy':
        return { id, type, ...readBlockSize(element), html: element.innerHTML }
      default:
        return { id, type: 'legacy', html: element.outerHTML }
    }
  })
}

function blockToHtml(block: DetailBlock) {
  switch (block.type) {
    case 'hero':
      return `
        <section data-ac-block="hero" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-title="${escapeAttr(block.title)}" data-subtitle="${escapeAttr(block.subtitle)}" data-align="${block.align}" data-bg="${escapeAttr(block.bgColor)}" data-accent="${escapeAttr(block.accentColor)}" style="margin: 0 0 28px; padding: 34px 24px; border-radius: 22px; background: ${escapeAttr(block.bgColor)}; text-align: ${block.align}; border: 2px solid #111827; box-shadow: 4px 4px 0 #111827;${blockSizeStyle(block)}">
          <div style="width: 44px; height: 6px; border-radius: 999px; background: ${escapeAttr(block.accentColor)}; margin: ${block.align === 'center' ? '0 auto 16px' : block.align === 'right' ? '0 0 16px auto' : '0 0 16px'};"></div>
          <h2 style="margin: 0 0 10px; font-size: 28px; line-height: 1.2; font-weight: 900; color: #111827;">${escapeHtml(block.title)}</h2>
          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">${linesToHtml(block.subtitle)}</p>
        </section>
      `
    case 'heading':
      return `
        <section data-ac-block="heading" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-text="${escapeAttr(block.text)}" data-level="${block.level}" data-align="${block.align}" data-color="${escapeAttr(block.color)}" style="margin: 28px 0 12px; text-align: ${block.align};${blockSizeStyle(block)}">
          <${block.level} style="margin: 0; font-size: ${block.level === 'h2' ? '24px' : '19px'}; line-height: 1.28; font-weight: 900; color: ${escapeAttr(block.color)};">${escapeHtml(block.text)}</${block.level}>
        </section>
      `
    case 'text':
      return `
        <section data-ac-block="text" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-text="${escapeAttr(block.text)}" data-align="${block.align}" style="margin: 14px 0; text-align: ${block.align};${blockSizeStyle(block)}">
          <p style="margin: 0; font-size: 15px; line-height: 1.82; color: #334155;">${linesToHtml(block.text)}</p>
        </section>
      `
    case 'image':
      return `
        <figure data-ac-block="image" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-src="${escapeAttr(block.src)}" data-alt="${escapeAttr(block.alt)}" data-caption="${escapeAttr(block.caption)}" data-fit="${block.fit}" data-radius="${block.radius}" style="margin: 22px 0;${blockSizeStyle(block)}">
          ${block.src ? `<img src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt)}" style="display: block; width: 100%; ${block.height ? `height: ${block.height}px;` : 'aspect-ratio: 1 / 1;'} object-fit: ${block.fit}; border-radius: ${block.radius}px; border: 2px solid #111827; box-sizing: border-box;" />` : `<div style="height: ${block.height || 220}px; display: flex; align-items: center; justify-content: center; border-radius: ${block.radius}px; border: 2px dashed #cbd5e1; color: #94a3b8; font-weight: 800; box-sizing: border-box;">이미지를 추가하세요</div>`}
          ${block.caption ? `<figcaption style="margin-top: 8px; font-size: 12px; line-height: 1.5; text-align: center; color: #64748b;">${escapeHtml(block.caption)}</figcaption>` : ''}
        </figure>
      `
    case 'features':
      return `
        <section data-ac-block="features" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-title="${escapeAttr(block.title)}" data-items="${jsonAttr(block.items)}" data-accent="${escapeAttr(block.accentColor)}" style="margin: 22px 0; padding: 18px; border-radius: 18px; background: #ffffff; border: 2px solid #111827; box-shadow: 3px 3px 0 #111827;${blockSizeStyle(block)}">
          <h3 style="margin: 0 0 12px; font-size: 17px; font-weight: 900; color: #111827;">${escapeHtml(block.title)}</h3>
          <ul style="margin: 0; padding: 0; list-style: none;">
            ${block.items.filter(Boolean).map((item) => `<li style="display: flex; gap: 10px; align-items: flex-start; margin: 10px 0; font-size: 14px; line-height: 1.62; color: #334155;"><span style="margin-top: 7px; width: 8px; height: 8px; border-radius: 999px; background: ${escapeAttr(block.accentColor)}; flex: 0 0 auto;"></span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </section>
      `
    case 'quote':
      return `
        <section data-ac-block="quote" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-text="${escapeAttr(block.text)}" data-author="${escapeAttr(block.author)}" style="margin: 24px 0; padding: 20px; border-left: 5px solid #111827; background: #f8fafc; border-radius: 0 18px 18px 0;${blockSizeStyle(block)}">
          <p style="margin: 0; font-size: 18px; line-height: 1.65; font-weight: 800; color: #111827;">${linesToHtml(block.text)}</p>
          ${block.author ? `<p style="margin: 10px 0 0; font-size: 12px; color: #64748b;">${escapeHtml(block.author)}</p>` : ''}
        </section>
      `
    case 'button':
      return `
        <section data-ac-block="button" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-label="${escapeAttr(block.label)}" data-href="${escapeAttr(block.href)}" data-align="${block.align}" data-bg="${escapeAttr(block.bgColor)}" data-color="${escapeAttr(block.textColor)}" style="margin: 24px 0; text-align: ${block.align};${blockSizeStyle(block)}">
          <a href="${escapeAttr(block.href || '#')}" style="display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px; border-radius: 14px; background: ${escapeAttr(block.bgColor)}; color: ${escapeAttr(block.textColor)}; border: 2px solid #111827; box-shadow: 3px 3px 0 #111827; font-size: 15px; font-weight: 900; text-decoration: none;">${escapeHtml(block.label)}</a>
        </section>
      `
    case 'freebox':
      return `
        <div data-ac-block="freebox" data-ac-block-id="${block.id}" data-icon="${escapeAttr(block.icon)}" data-title="${escapeAttr(block.title)}" data-subtitle="${escapeAttr(block.subtitle)}" data-x="${block.x}" data-y="${block.y}" data-width="${block.width}" data-height="${block.height}" data-radius="${block.radius}" data-bg="${escapeAttr(block.bgColor)}" data-color="${escapeAttr(block.textColor)}" data-border="${escapeAttr(block.borderColor)}" style="position: absolute; left: ${block.x}px; top: ${block.y}px; z-index: 30; width: ${block.width}px; height: ${block.height}px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: ${block.radius}px; border: 3px solid ${escapeAttr(block.borderColor)}; background: ${escapeAttr(block.bgColor)}; color: ${escapeAttr(block.textColor)}; box-shadow: 4px 4px 0 ${escapeAttr(block.borderColor)}; text-align: center;">
          <div style="font-size: 24px; line-height: 1;">${escapeHtml(block.icon)}</div>
          <strong style="display: block; font-size: 15px; line-height: 1.2; font-weight: 900;">${escapeHtml(block.title)}</strong>
          ${block.subtitle ? `<span style="display: block; font-size: 11px; line-height: 1.35; font-weight: 700; opacity: 0.78;">${linesToHtml(block.subtitle)}</span>` : ''}
        </div>
      `
    case 'divider':
      return `
        <section data-ac-block="divider" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} data-label="${escapeAttr(block.label)}" style="margin: 28px 0; display: flex; align-items: center; gap: 12px;${blockSizeStyle(block)}">
          <div style="height: 2px; flex: 1; background: #111827;"></div>
          ${block.label ? `<span style="font-size: 12px; font-weight: 900; color: #64748b;">${escapeHtml(block.label)}</span><div style="height: 2px; flex: 1; background: #111827;"></div>` : ''}
        </section>
      `
    case 'spacer':
      return `<div data-ac-block="spacer" data-ac-block-id="${block.id}"${block.width ? ` data-width="${block.width}"` : ''} data-height="${block.height}" style="height: ${block.height}px;${block.width ? ` width: min(${block.width}px, 100%); max-width: 100%; box-sizing: border-box;` : ''}"></div>`
    case 'legacy':
      return `<section data-ac-block="legacy" data-ac-block-id="${block.id}"${blockSizeAttrs(block)} style="${blockSizeStyle(block)}">${block.html}</section>`
  }
}

function blocksToHtml(blocks: DetailBlock[], pageConfigHtml = '') {
  const minHeight = blocks.reduce((height, block) => {
    if (block.type !== 'freebox') return height
    return Math.max(height, block.y + block.height + 24)
  }, 0)

  const builderHtml = `<div data-ac-detail-builder="1" style="position: relative; width: 100%; max-width: 455px; margin: 0 auto;${minHeight ? ` min-height: ${minHeight}px;` : ''}">${blocks.map(blockToHtml).join('')}</div>`

  return pageConfigHtml ? `${pageConfigHtml}\n${builderHtml}` : builderHtml
}

function blockSummary(block: DetailBlock) {
  switch (block.type) {
    case 'hero':
      return block.title
    case 'heading':
    case 'text':
    case 'quote':
      return block.text
    case 'image':
      return block.caption || block.alt || (block.src ? '이미지' : '이미지 없음')
    case 'features':
      return block.title
    case 'button':
      return block.label
    case 'freebox':
      return `${block.title} (${block.x}, ${block.y})`
    case 'divider':
      return block.label || '구분선'
    case 'spacer':
      return `${block.height}px`
    case 'legacy':
      return '기존 HTML 상세'
  }
}

function InlineEditableText({
  value,
  onChange,
  className = '',
  style,
  multiline = false,
  placeholder = '내용 입력',
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  style?: CSSProperties
  multiline?: boolean
  placeholder?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const focusedRef = useRef(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || focusedRef.current) return
    if (element.textContent !== value) {
      element.textContent = value
    }
  }, [value])

  const readValue = useCallback(() => {
    return ref.current?.innerText.replace(/\n\n/g, '\n') ?? ''
  }, [])

  const handleInput = useCallback(() => {
    onChange(readValue())
  }, [onChange, readValue])

  return (
    <span
      ref={ref}
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      aria-label={placeholder}
      className={`inline-block min-w-[1em] rounded outline outline-1 outline-dashed outline-sky-300 outline-offset-2 transition-colors focus:bg-sky-100 focus:outline-2 focus:outline-sky-500 ${className}`}
      style={style}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        handleInput()
      }}
      onInput={handleInput}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (!multiline && event.key === 'Enter') {
          event.preventDefault()
          ref.current?.blur()
        }
      }}
    />
  )
}

function BlockPreview({
  block,
  onPatch,
}: {
  block: DetailBlock
  onPatch: (patch: Partial<DetailBlock>) => void
}) {
  switch (block.type) {
    case 'hero':
      return (
        <div
          className="rounded-lg border-2 border-slate-900 p-4 shadow-[2px_2px_0_0_#111827]"
          style={{ backgroundColor: block.bgColor, textAlign: block.align }}
        >
          <div
            className={`mb-2 h-1.5 w-10 rounded-full ${block.align === 'center' ? 'mx-auto' : block.align === 'right' ? 'ml-auto' : ''}`}
            style={{ backgroundColor: block.accentColor }}
          />
          <InlineEditableText
            value={block.title}
            onChange={(title) => onPatch({ title } as Partial<DetailBlock>)}
            className="text-base font-black leading-tight text-slate-950"
            placeholder="히어로 제목"
          />
          <InlineEditableText
            value={block.subtitle}
            onChange={(subtitle) => onPatch({ subtitle } as Partial<DetailBlock>)}
            className="mt-1 whitespace-pre-line text-xs font-medium leading-relaxed text-slate-600"
            multiline
            placeholder="히어로 설명"
          />
        </div>
      )
    case 'heading':
      return (
        <div style={{ textAlign: block.align }}>
          <InlineEditableText
            value={block.text}
            onChange={(text) => onPatch({ text } as Partial<DetailBlock>)}
            className={`${block.level === 'h2' ? 'text-lg' : 'text-base'} font-black leading-tight`}
            style={{ color: block.color }}
            placeholder="제목"
          />
        </div>
      )
    case 'text':
      return (
        <InlineEditableText
          value={block.text}
          onChange={(text) => onPatch({ text } as Partial<DetailBlock>)}
          className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700"
          style={{ textAlign: block.align, width: '100%' }}
          multiline
          placeholder="본문"
        />
      )
    case 'image':
      return (
        <div>
          {block.src ? (
            <div className="relative aspect-[4/3] overflow-hidden border-2 border-slate-900 bg-slate-100" style={{ borderRadius: block.radius }}>
              <NextImage src={block.src} alt={block.alt || ''} fill className="object-cover" style={{ objectFit: block.fit }} sizes="320px" unoptimized />
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-xs font-black text-slate-400">
              이미지 없음
            </div>
          )}
          <InlineEditableText
            value={block.caption}
            onChange={(caption) => onPatch({ caption } as Partial<DetailBlock>)}
            className="mt-1 w-full text-center text-xs font-medium text-slate-500"
            placeholder="이미지 설명"
          />
        </div>
      )
    case 'features': {
      const featureItems = block.items.length > 0 ? block.items : ['']
      return (
        <div className="rounded-lg border-2 border-slate-900 bg-white p-3 shadow-[2px_2px_0_0_#111827]">
          <InlineEditableText
            value={block.title}
            onChange={(title) => onPatch({ title } as Partial<DetailBlock>)}
            className="mb-2 text-sm font-black text-slate-950"
            placeholder="리스트 제목"
          />
          <div className="space-y-1.5">
            {featureItems.slice(0, 4).map((item, index) => (
              <div key={`feature-${index}`} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: block.accentColor }} />
                <InlineEditableText
                  value={item}
                  onChange={(nextItem) => {
                    const nextItems = [...featureItems]
                    nextItems[index] = nextItem
                    onPatch({ items: nextItems } as Partial<DetailBlock>)
                  }}
                  className="flex-1"
                  multiline
                  placeholder="리스트 항목"
                />
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'quote':
      return (
        <div className="rounded-r-lg border-l-4 border-slate-900 bg-slate-50 p-3">
          <InlineEditableText
            value={block.text}
            onChange={(text) => onPatch({ text } as Partial<DetailBlock>)}
            className="whitespace-pre-line text-sm font-black leading-relaxed text-slate-900"
            multiline
            placeholder="인용 문장"
          />
          <InlineEditableText
            value={block.author}
            onChange={(author) => onPatch({ author } as Partial<DetailBlock>)}
            className="mt-1 text-xs text-slate-500"
            placeholder="출처"
          />
        </div>
      )
    case 'button':
      return (
        <div style={{ textAlign: block.align }}>
          <InlineEditableText
            value={block.label}
            onChange={(label) => onPatch({ label } as Partial<DetailBlock>)}
            className="inline-flex min-h-10 items-center rounded-lg border-2 border-slate-900 px-4 text-sm font-black shadow-[2px_2px_0_0_#111827]"
            style={{ backgroundColor: block.bgColor, color: block.textColor }}
            placeholder="버튼 문구"
          />
        </div>
      )
    case 'freebox':
      return (
        <div className="relative h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50">
          <div
            className="absolute flex flex-col items-center justify-center gap-1 border-2 text-center shadow-[2px_2px_0_0_currentColor]"
            style={{
              left: Math.min(block.x / 3, 120),
              top: Math.min(block.y / 8, 58),
              width: Math.min(block.width / 1.7, 120),
              height: Math.min(block.height / 1.7, 82),
              borderRadius: Math.min(block.radius, 18),
              backgroundColor: block.bgColor,
              color: block.textColor,
              borderColor: block.borderColor,
            }}
          >
            <InlineEditableText
              value={block.icon}
              onChange={(icon) => onPatch({ icon } as Partial<DetailBlock>)}
              className="text-base leading-none"
              placeholder="아이콘"
            />
            <InlineEditableText
              value={block.title}
              onChange={(title) => onPatch({ title } as Partial<DetailBlock>)}
              className="max-w-full truncate px-1 text-xs font-black"
              placeholder="박스 제목"
            />
          </div>
        </div>
      )
    case 'divider':
      return (
        <div className="flex items-center gap-2 py-2">
          <div className="h-0.5 flex-1 bg-slate-900" />
          <InlineEditableText
            value={block.label}
            onChange={(label) => onPatch({ label } as Partial<DetailBlock>)}
            className="text-xs font-black text-slate-500"
            placeholder="구분선 라벨"
          />
          <div className="h-0.5 flex-1 bg-slate-900" />
        </div>
      )
    case 'spacer':
      return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs font-black text-slate-400" style={{ height: block.height }}>
          <span className="leading-[32px]">여백 {block.height}px</span>
        </div>
      )
    case 'legacy':
      return (
        <div className="max-h-32 overflow-hidden rounded-lg bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-700">
          기존 상세 내용
        </div>
      )
  }
}

function ColorControl({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-full border-2 ${value === color ? 'border-slate-950' : 'border-white'} ring-1 ring-slate-200`}
          style={{ backgroundColor: color }}
          aria-label={color}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-10 rounded border border-slate-200 bg-white"
      />
    </div>
  )
}

function AlignControl({
  value,
  onChange,
}: {
  value: Align
  onChange: (value: Align) => void
}) {
  const options = [
    { value: 'left' as const, icon: AlignLeft, label: '왼쪽' },
    { value: 'center' as const, icon: AlignCenter, label: '가운데' },
    { value: 'right' as const, icon: AlignRight, label: '오른쪽' },
  ]

  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
      {options.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex h-8 items-center justify-center rounded-md ${value === option.value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
            aria-label={option.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

export function VisualDetailEditor({
  value,
  onChange,
  onImageUpload,
  selectedBlockId: externalSelectedBlockId,
  previewPatch,
  focusToken,
  onPreviewTargetChange,
  onSelectedBlockChange,
}: VisualDetailEditorProps) {
  const lastGeneratedHtml = useRef('')
  const lastPreviewPatchNonce = useRef<number | null>(null)
  const hasDraggedCanvasBlockRef = useRef(false)
  const selectedSettingsRef = useRef<HTMLDivElement>(null)
  const canvasListRef = useRef<HTMLDivElement>(null)
  const lastAutoScrolledBlockIdRef = useRef('')
  const [blocks, setBlocks] = useState<DetailBlock[]>(() => htmlToBlocks(value))
  const [pageConfigHtml, setPageConfigHtml] = useState(() => (
    serializeProductPageContentConfig(extractProductPageContent(value))
  ))
  const [selectedBlockId, setSelectedBlockId] = useState(() => blocks[0]?.id || '')
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(() => new Set(blocks.map((block) => block.id)))
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  useEffect(() => {
    if (value === lastGeneratedHtml.current) return
    const nextBlocks = htmlToBlocks(value)
    setBlocks(nextBlocks)
    setExpandedBlockIds((current) => {
      const validIds = new Set(nextBlocks.map((block) => block.id))
      const next = new Set([...current].filter((id) => validIds.has(id)))
      nextBlocks.forEach((block) => {
        if (!current.has(block.id)) next.add(block.id)
      })
      return next
    })
    setPageConfigHtml(serializeProductPageContentConfig(extractProductPageContent(value)))
    setSelectedBlockId((current) => (
      nextBlocks.some((block) => block.id === current) ? current : nextBlocks[0]?.id || ''
    ))

  }, [onChange, value])

  useEffect(() => {
    if (!externalSelectedBlockId || externalSelectedBlockId === selectedBlockId) return
    if (!blocks.some((block) => block.id === externalSelectedBlockId)) return
    setExpandedBlockIds((current) => {
      const next = new Set(current)
      next.add(externalSelectedBlockId)
      return next
    })
    setSelectedBlockId(externalSelectedBlockId)
  }, [blocks, externalSelectedBlockId, selectedBlockId])

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || blocks[0] || null,
    [blocks, selectedBlockId],
  )

  useEffect(() => {
    const scrollKey = `${selectedBlockId}:${focusToken ?? 0}`
    if (!selectedBlockId || scrollKey === lastAutoScrolledBlockIdRef.current) return
    lastAutoScrolledBlockIdRef.current = scrollKey

    const timer = window.setTimeout(() => {
      selectedSettingsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })

      const canvasList = canvasListRef.current
      const selectedCanvasCard = Array.from(canvasListRef.current?.querySelectorAll<HTMLElement>('[data-detail-block-card-id]') || [])
        .find((element) => element.dataset.detailBlockCardId === selectedBlockId)
      if (!canvasList || !selectedCanvasCard) return

      const listRect = canvasList.getBoundingClientRect()
      const cardRect = selectedCanvasCard.getBoundingClientRect()
      const padding = 12
      let nextScrollTop = canvasList.scrollTop

      if (cardRect.top < listRect.top + padding) {
        nextScrollTop += cardRect.top - listRect.top - padding
      } else if (cardRect.bottom > listRect.bottom - padding) {
        nextScrollTop += cardRect.bottom - listRect.bottom + padding
      }

      const maxScrollTop = Math.max(canvasList.scrollHeight - canvasList.clientHeight, 0)
      const clampedScrollTop = Math.min(Math.max(nextScrollTop, 0), maxScrollTop)
      if (Math.abs(clampedScrollTop - canvasList.scrollTop) < 1) return

      canvasList.scrollTo({
        top: clampedScrollTop,
        behavior: 'smooth',
      })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [focusToken, selectedBlockId])

  const commitBlocks = useCallback((nextBlocks: DetailBlock[]) => {
    setBlocks(nextBlocks)
    const html = blocksToHtml(nextBlocks, pageConfigHtml)
    lastGeneratedHtml.current = html
    onChange(html)
  }, [onChange, pageConfigHtml])

  const selectBlock = useCallback((id: string) => {
    setSelectedBlockId(id)
    if (id) {
      setExpandedBlockIds((current) => {
        const next = new Set(current)
        next.add(id)
        return next
      })
    }
    onSelectedBlockChange?.(id)
    onPreviewTargetChange?.(id)
  }, [onPreviewTargetChange, onSelectedBlockChange])

  const toggleBlockExpanded = useCallback((id: string) => {
    setExpandedBlockIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!previewPatch || previewPatch.nonce === lastPreviewPatchNonce.current) return
    lastPreviewPatchNonce.current = previewPatch.nonce
    if (!blocks.some((block) => block.id === previewPatch.id)) return
    commitBlocks(blocks.map((block) => (
      block.id === previewPatch.id ? ({ ...block, ...previewPatch.patch } as DetailBlock) : block
    )))
    selectBlock(previewPatch.id)
  }, [blocks, commitBlocks, previewPatch, selectBlock])

  const addBlock = (type: BlockType) => {
    const block = defaultBlock(type)
    const index = blocks.findIndex((item) => item.id === selectedBlockId)
    const nextBlocks = [...blocks]
    nextBlocks.splice(index >= 0 ? index + 1 : nextBlocks.length, 0, block)
    selectBlock(block.id)
    commitBlocks(nextBlocks)
  }

  const updateBlock = (id: string, patch: Partial<DetailBlock>) => {
    commitBlocks(blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as DetailBlock) : block)))
  }

  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = blocks.findIndex((block) => block.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return
    const nextBlocks = [...blocks]
    const [block] = nextBlocks.splice(index, 1)
    nextBlocks.splice(nextIndex, 0, block)
    commitBlocks(nextBlocks)
  }

  const moveBlockToTarget = useCallback((dragBlockId: string, targetBlockId: string) => {
    if (dragBlockId === targetBlockId) return

    setBlocks((currentBlocks) => {
      const fromIndex = currentBlocks.findIndex((block) => block.id === dragBlockId)
      const toIndex = currentBlocks.findIndex((block) => block.id === targetBlockId)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return currentBlocks

      const nextBlocks = [...currentBlocks]
      const [draggedBlock] = nextBlocks.splice(fromIndex, 1)
      nextBlocks.splice(toIndex, 0, draggedBlock)
      hasDraggedCanvasBlockRef.current = true
      blocksRef.current = nextBlocks
      return nextBlocks
    })
    selectBlock(dragBlockId)
  }, [selectBlock])

  const finishCanvasDrag = useCallback(() => {
    const shouldCommit = hasDraggedCanvasBlockRef.current
    hasDraggedCanvasBlockRef.current = false
    setDraggingBlockId(null)
    if (shouldCommit) {
      commitBlocks(blocksRef.current)
    }
  }, [commitBlocks])

  const duplicateBlock = (id: string) => {
    const index = blocks.findIndex((block) => block.id === id)
    if (index < 0) return
    const copy = { ...blocks[index], id: uid() } as DetailBlock
    const nextBlocks = [...blocks]
    nextBlocks.splice(index + 1, 0, copy)
    selectBlock(copy.id)
    commitBlocks(nextBlocks)
  }

  const deleteBlock = (id: string) => {
    const nextBlocks = blocks.filter((block) => block.id !== id)
    selectBlock(nextBlocks[0]?.id || '')
    commitBlocks(nextBlocks)
  }

  const requestDeleteBlock = (id: string) => {
    const block = blocks.find((item) => item.id === id)
    const label = block ? BLOCK_LABELS[block.type] : '블록'
    if (!window.confirm(`${label} 블록을 삭제하시겠습니까?`)) return
    deleteBlock(id)
  }

  const uploadImageForBlock = async (block: ImageBlock, file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploadingBlockId(block.id)
    try {
      const src = await onImageUpload(file)
      updateBlock(block.id, { src, alt: block.alt || '상세페이지 이미지' } as Partial<DetailBlock>)
    } finally {
      setUploadingBlockId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="order-2">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
          <Plus className="h-3.5 w-3.5" />
          블록 추가
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { type: 'hero' as const, icon: Rows3 },
            { type: 'heading' as const, icon: Heading1 },
            { type: 'text' as const, icon: Type },
            { type: 'image' as const, icon: ImageIcon },
            { type: 'features' as const, icon: ListChecks },
            { type: 'quote' as const, icon: Quote },
            { type: 'button' as const, icon: MousePointerClick },
            { type: 'freebox' as const, icon: Box },
            { type: 'divider' as const, icon: Minus },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => addBlock(item.type)}
                className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-[11px] font-black text-slate-700 hover:border-slate-900 hover:bg-yellow-50"
              >
                <Icon className="h-4 w-4" />
                {BLOCK_LABELS[item.type]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="order-3 rounded-xl border border-slate-200 bg-slate-100 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-black text-slate-500">편집 캔버스</span>
          <button
            type="button"
            onClick={() => addBlock('spacer')}
            className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200"
          >
            여백 추가
          </button>
        </div>
        <div ref={canvasListRef} className="max-h-[460px] space-y-2 overflow-y-auto rounded-lg bg-white p-2">
          {blocks.length === 0 ? (
            <button
              type="button"
              onClick={() => addBlock('hero')}
              className="flex h-40 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm font-bold text-slate-400"
            >
              첫 블록 추가
            </button>
          ) : (
            blocks.map((block, index) => {
              const isExpanded = expandedBlockIds.has(block.id)
              const summary = blockSummary(block) || '내용 없음'

              return (
                <div
                  key={block.id}
                  data-detail-block-card-id={block.id}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => onPreviewTargetChange?.(block.id)}
                  onMouseLeave={() => onPreviewTargetChange?.(selectedBlockId || null)}
                  onFocus={() => onPreviewTargetChange?.(block.id)}
                  onBlur={() => onPreviewTargetChange?.(selectedBlockId || null)}
                  onClick={() => selectBlock(block.id)}
                  onKeyDown={(event) => {
                    if ((event.target as HTMLElement | null)?.isContentEditable) return
                    if (event.key === 'Enter' || event.key === ' ') selectBlock(block.id)
                  }}
                  onDragOver={(event) => {
                    if (!draggingBlockId || draggingBlockId === block.id) return
                    event.preventDefault()
                    moveBlockToTarget(draggingBlockId, block.id)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    finishCanvasDrag()
                  }}
                  className={`group relative rounded-lg border-2 p-3 text-left transition ${
                    selectedBlockId === block.id ? 'border-slate-950 bg-yellow-50' : 'border-slate-200 bg-white hover:border-slate-400'
                  } ${draggingBlockId === block.id ? 'opacity-55 ring-2 ring-sky-300' : ''
                  }`}
                >
                  <div className={`flex items-center justify-between gap-2 ${isExpanded ? 'mb-2' : ''}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleBlockExpanded(block.id)
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? '블록 접기' : '블록 펼치기'}
                        title={isExpanded ? '블록 접기' : '블록 펼치기'}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-black text-white">
                        {index + 1}. {BLOCK_LABELS[block.type]}
                      </span>
                      {!isExpanded && (
                        <span className="truncate text-[11px] font-bold text-slate-400">{summary}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        draggable
                        onClick={(event) => {
                          event.stopPropagation()
                          selectBlock(block.id)
                        }}
                        onDragStart={(event) => {
                          event.stopPropagation()
                          setDraggingBlockId(block.id)
                          hasDraggedCanvasBlockRef.current = false
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', block.id)
                          selectBlock(block.id)
                        }}
                        onDragEnd={(event) => {
                          event.stopPropagation()
                          finishCanvasDrag()
                        }}
                        className="cursor-grab rounded bg-white p-1 text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                        aria-label="블록 드래그 이동"
                        title="블록 드래그 이동"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(block.id, -1) }} className="rounded bg-white p-1 ring-1 ring-slate-200">
                        <MoveUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(block.id, 1) }} className="rounded bg-white p-1 ring-1 ring-slate-200">
                        <MoveDown className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); duplicateBlock(block.id) }} className="rounded bg-white p-1 ring-1 ring-slate-200">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          requestDeleteBlock(block.id)
                        }}
                        className="rounded bg-red-50 p-1 text-red-600 ring-1 ring-red-100 hover:bg-red-100"
                        aria-label="블록 삭제"
                        title="블록 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <>
                      <BlockPreview
                        block={block}
                        onPatch={(patch) => updateBlock(block.id, patch)}
                      />
                      <div className="mt-2 truncate text-[11px] font-bold text-slate-400">{summary}</div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {selectedBlock && (
        <div
          ref={selectedSettingsRef}
          className="order-1 scroll-mt-4 rounded-xl border-2 border-sky-200 bg-sky-50/40 p-3"
          onClick={() => selectBlock(selectedBlock.id)}
          onFocusCapture={() => selectBlock(selectedBlock.id)}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">{BLOCK_LABELS[selectedBlock.type]} 설정</h3>
              <span className="text-[11px] font-bold text-slate-400">{blocks.findIndex((block) => block.id === selectedBlock.id) + 1}번째 블록</span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                requestDeleteBlock(selectedBlock.id)
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-2 text-xs font-black text-red-600 ring-1 ring-red-100 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </button>
          </div>

          {selectedBlock.type !== 'freebox' && selectedBlock.type !== 'spacer' && (
            <div className="mb-3 rounded-lg border border-sky-200 bg-white p-3">
              <div className="mb-2 text-xs font-black text-slate-500">크기</div>
              <div className="grid grid-cols-2 gap-3">
                <RangeInput
                  label="너비"
                  min={80}
                  max={455}
                  step={8}
                  value={selectedBlock.width || blockResizeDefaults(selectedBlock).width}
                  onChange={(width) => updateBlock(selectedBlock.id, { width } as Partial<DetailBlock>)}
                />
                <RangeInput
                  label="높이"
                  min={blockResizeDefaults(selectedBlock).minHeight}
                  max={blockResizeDefaults(selectedBlock).maxHeight}
                  step={8}
                  value={selectedBlock.height || blockResizeDefaults(selectedBlock).height}
                  onChange={(height) => updateBlock(selectedBlock.id, { height } as Partial<DetailBlock>)}
                />
              </div>
            </div>
          )}

          {selectedBlock.type === 'legacy' && (
            <div className="rounded-lg bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-700">
              기존 상세는 실제 배포 화면 그대로 왼쪽 미리보기에 유지됩니다. 왼쪽 미리보기에서 수정할 영역을 클릭하고 텍스트를 직접 수정하세요.
            </div>
          )}

          {selectedBlock.type === 'hero' && (
            <div className="space-y-3">
              <TextInput label="제목" value={selectedBlock.title} onChange={(title) => updateBlock(selectedBlock.id, { title } as Partial<DetailBlock>)} />
              <TextArea label="설명" value={selectedBlock.subtitle} onChange={(subtitle) => updateBlock(selectedBlock.id, { subtitle } as Partial<DetailBlock>)} />
              <AlignControl value={selectedBlock.align} onChange={(align) => updateBlock(selectedBlock.id, { align } as Partial<DetailBlock>)} />
              <ColorField label="배경색" value={selectedBlock.bgColor} onChange={(bgColor) => updateBlock(selectedBlock.id, { bgColor } as Partial<DetailBlock>)} />
              <ColorField label="포인트색" value={selectedBlock.accentColor} onChange={(accentColor) => updateBlock(selectedBlock.id, { accentColor } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'heading' && (
            <div className="space-y-3">
              <TextInput label="제목" value={selectedBlock.text} onChange={(text) => updateBlock(selectedBlock.id, { text } as Partial<DetailBlock>)} />
              <select
                value={selectedBlock.level}
                onChange={(event) => updateBlock(selectedBlock.id, { level: event.target.value as 'h2' | 'h3' } as Partial<DetailBlock>)}
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-slate-900"
              >
                <option value="h2">큰 제목</option>
                <option value="h3">작은 제목</option>
              </select>
              <AlignControl value={selectedBlock.align} onChange={(align) => updateBlock(selectedBlock.id, { align } as Partial<DetailBlock>)} />
              <ColorField label="글자색" value={selectedBlock.color} onChange={(color) => updateBlock(selectedBlock.id, { color } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'text' && (
            <div className="space-y-3">
              <TextArea label="본문" value={selectedBlock.text} rows={6} onChange={(text) => updateBlock(selectedBlock.id, { text } as Partial<DetailBlock>)} />
              <AlignControl value={selectedBlock.align} onChange={(align) => updateBlock(selectedBlock.id, { align } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'image' && (
            <div className="space-y-3">
              <label className="flex h-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-black text-slate-500 hover:border-slate-900">
                {uploadingBlockId === selectedBlock.id ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    업로드 중
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    이미지 업로드
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) uploadImageForBlock(selectedBlock, file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <TextInput label="이미지 주소" value={selectedBlock.src} onChange={(src) => updateBlock(selectedBlock.id, { src } as Partial<DetailBlock>)} />
              <TextInput label="설명 문구" value={selectedBlock.caption} onChange={(caption) => updateBlock(selectedBlock.id, { caption } as Partial<DetailBlock>)} />
              <select
                value={selectedBlock.fit}
                onChange={(event) => updateBlock(selectedBlock.id, { fit: event.target.value as 'cover' | 'contain' } as Partial<DetailBlock>)}
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-slate-900"
              >
                <option value="cover">꽉 채우기</option>
                <option value="contain">전체 보이기</option>
              </select>
              <RangeInput label="모서리" min={0} max={32} value={selectedBlock.radius} onChange={(radius) => updateBlock(selectedBlock.id, { radius } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'features' && (
            <div className="space-y-3">
              <TextInput label="제목" value={selectedBlock.title} onChange={(title) => updateBlock(selectedBlock.id, { title } as Partial<DetailBlock>)} />
              <TextArea
                label="항목"
                value={selectedBlock.items.join('\n')}
                rows={5}
                onChange={(value) => updateBlock(selectedBlock.id, { items: value.split('\n') } as Partial<DetailBlock>)}
              />
              <ColorField label="포인트색" value={selectedBlock.accentColor} onChange={(accentColor) => updateBlock(selectedBlock.id, { accentColor } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'quote' && (
            <div className="space-y-3">
              <TextArea label="문장" value={selectedBlock.text} onChange={(text) => updateBlock(selectedBlock.id, { text } as Partial<DetailBlock>)} />
              <TextInput label="출처" value={selectedBlock.author} onChange={(author) => updateBlock(selectedBlock.id, { author } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'button' && (
            <div className="space-y-3">
              <TextInput label="버튼 문구" value={selectedBlock.label} onChange={(label) => updateBlock(selectedBlock.id, { label } as Partial<DetailBlock>)} />
              <TextInput label="이동 주소" value={selectedBlock.href} onChange={(href) => updateBlock(selectedBlock.id, { href } as Partial<DetailBlock>)} />
              <AlignControl value={selectedBlock.align} onChange={(align) => updateBlock(selectedBlock.id, { align } as Partial<DetailBlock>)} />
              <ColorField label="배경색" value={selectedBlock.bgColor} onChange={(bgColor) => updateBlock(selectedBlock.id, { bgColor } as Partial<DetailBlock>)} />
              <ColorField label="글자색" value={selectedBlock.textColor} onChange={(textColor) => updateBlock(selectedBlock.id, { textColor } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'freebox' && (
            <div className="space-y-3">
              <div className="grid grid-cols-[72px,1fr] gap-2">
                <TextInput label="아이콘" value={selectedBlock.icon} onChange={(icon) => updateBlock(selectedBlock.id, { icon } as Partial<DetailBlock>)} />
                <TextInput label="제목" value={selectedBlock.title} onChange={(title) => updateBlock(selectedBlock.id, { title } as Partial<DetailBlock>)} />
              </div>
              <TextArea label="설명" value={selectedBlock.subtitle} rows={3} onChange={(subtitle) => updateBlock(selectedBlock.id, { subtitle } as Partial<DetailBlock>)} />
              <div className="grid grid-cols-2 gap-3">
                <RangeInput label="X" min={0} max={360} step={8} value={selectedBlock.x} onChange={(x) => updateBlock(selectedBlock.id, { x } as Partial<DetailBlock>)} />
                <RangeInput label="Y" min={0} max={1800} step={8} value={selectedBlock.y} onChange={(y) => updateBlock(selectedBlock.id, { y } as Partial<DetailBlock>)} />
                <RangeInput label="너비" min={72} max={344} step={8} value={selectedBlock.width} onChange={(width) => updateBlock(selectedBlock.id, { width } as Partial<DetailBlock>)} />
                <RangeInput label="높이" min={64} max={264} step={8} value={selectedBlock.height} onChange={(height) => updateBlock(selectedBlock.id, { height } as Partial<DetailBlock>)} />
              </div>
              <RangeInput label="모서리" min={0} max={36} value={selectedBlock.radius} onChange={(radius) => updateBlock(selectedBlock.id, { radius } as Partial<DetailBlock>)} />
              <ColorField label="배경색" value={selectedBlock.bgColor} onChange={(bgColor) => updateBlock(selectedBlock.id, { bgColor } as Partial<DetailBlock>)} />
              <ColorField label="글자색" value={selectedBlock.textColor} onChange={(textColor) => updateBlock(selectedBlock.id, { textColor } as Partial<DetailBlock>)} />
              <ColorField label="테두리" value={selectedBlock.borderColor} onChange={(borderColor) => updateBlock(selectedBlock.id, { borderColor } as Partial<DetailBlock>)} />
            </div>
          )}

          {selectedBlock.type === 'divider' && (
            <TextInput label="라벨" value={selectedBlock.label} onChange={(label) => updateBlock(selectedBlock.id, { label } as Partial<DetailBlock>)} />
          )}

          {selectedBlock.type === 'spacer' && (
            <RangeInput label="높이" min={8} max={120} value={selectedBlock.height} onChange={(height) => updateBlock(selectedBlock.id, { height } as Partial<DetailBlock>)} />
          )}
        </div>
      )}
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-black text-slate-500">
        <Palette className="h-3 w-3" />
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-slate-900"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-medium leading-relaxed outline-none focus:border-slate-900"
      />
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
      <ColorControl value={value} onChange={onChange} />
    </div>
  )
}

function RangeInput({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
        {label}
        <span>{value}px</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  )
}
