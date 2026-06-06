'use client'

import { useEffect } from 'react'
import {
  extractProductPageContent,
  type ProductPageContent,
  type ProductPagePositionField,
  type ProductPageTextField,
  normalizeProductPageContent,
} from '@/lib/products/page-content'

interface ProgramAdminBridgeProps {
  productSlug: string
}

type EditableField = 'product_name' | 'detail_html'
type BlockPatch = Record<string, number | string | string[]>
type PageField = ProductPageTextField
const GRID_SIZE = 8

function getFieldPayload(element: HTMLElement, field: EditableField) {
  if (field === 'detail_html') {
    return {
      html: element.innerHTML,
      text: element.textContent ?? '',
    }
  }

  return {
    html: '',
    text: element.textContent?.trim() ?? '',
  }
}

export function ProgramAdminBridge({ productSlug }: ProgramAdminBridgeProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('adminEditing') !== '1') return

    const style = document.createElement('style')
    style.textContent = `
      body[data-admin-preview-editing="true"] {
        --admin-edit-sky: #38bdf8;
        --admin-edit-ink: #111827;
        --admin-edit-muted: #64748b;
      }
      [data-admin-editable] {
        caret-color: #38bdf8;
      }
      [data-admin-field-editable="true"] {
        position: relative;
        z-index: 2147483641;
        cursor: text;
        outline: 2px dashed rgba(56, 189, 248, 0.85);
        outline-offset: 4px;
        transition: outline-color 0.15s ease, box-shadow 0.15s ease;
      }
      [data-admin-locked-block="true"]::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 2147483630;
        border-radius: inherit;
        background: rgba(71, 85, 105, 0.34);
        box-shadow: inset 0 0 0 1px rgba(51, 65, 85, 0.28);
        pointer-events: none;
      }
      [data-admin-locked-animation="true"] {
        position: relative;
        z-index: 2147483642;
        cursor: not-allowed;
      }
      [data-admin-locked-animation="true"]::before {
        content: '애니메이션 · 수정 불가';
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2147483646;
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 10px;
        border: 2px solid #111827;
        border-radius: 999px;
        background: #64748b;
        color: #ffffff;
        font-size: 11px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0;
        box-shadow: 2px 2px 0 rgba(17, 24, 39, 0.9);
        pointer-events: none;
      }
      [data-admin-locked-animation="true"]::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 2147483645;
        border-radius: inherit;
        background:
          repeating-linear-gradient(
            -45deg,
            rgba(15, 23, 42, 0.18) 0,
            rgba(15, 23, 42, 0.18) 8px,
            rgba(15, 23, 42, 0.36) 8px,
            rgba(15, 23, 42, 0.36) 16px
          ),
          rgba(15, 23, 42, 0.44);
        box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.42);
        pointer-events: none;
      }
      [data-admin-field-editable="true"][data-admin-editable-field="product_name"] {
        display: inline-block;
        min-width: 1em;
        color: #111827 !important;
        -webkit-text-fill-color: #111827 !important;
        background: none !important;
      }
      [data-admin-grid-overlay="true"]::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 2147483636;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(56, 189, 248, 0.18) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.18) 1px, transparent 1px);
        background-size: ${GRID_SIZE}px ${GRID_SIZE}px;
      }
      [data-admin-field-editable="true"]::before,
      [data-admin-editable-block="true"]::before {
        content: attr(data-admin-editable-label);
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 2147483646;
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 0 8px;
        border: 2px solid var(--admin-edit-ink);
        border-radius: 999px;
        background: var(--admin-edit-sky);
        color: var(--admin-edit-ink);
        font-size: 11px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0;
        opacity: 0;
        pointer-events: none;
        box-shadow: 2px 2px 0 rgba(17, 24, 39, 0.9);
        transform: translateY(-4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
      }
      [data-admin-field-editable="true"]::before {
        background: var(--admin-edit-sky);
        color: #ffffff;
      }
      [data-admin-field-editable="true"]:hover::before,
      [data-admin-field-editable="true"]:focus::before,
      [data-admin-editable-block="true"]:hover::before,
      [data-admin-editable-block="true"]:focus::before,
      [data-admin-editable-block="true"][data-admin-selected="true"]::before {
        opacity: 1;
        transform: translateY(0);
      }
      [data-admin-editable][contenteditable="true"]:focus {
        outline: 3px solid rgba(56, 189, 248, 0.95);
        outline-offset: 4px;
      }
      [data-ac-block] {
        cursor: pointer;
        transition: outline-color 0.15s ease, box-shadow 0.15s ease;
      }
      [data-ac-block="freebox"] {
        cursor: move;
        touch-action: none;
        user-select: none;
      }
      [data-ac-block="freebox"] *:not([data-admin-inline-editable="true"]) {
        pointer-events: none;
      }
      [data-admin-inline-editable="true"] {
        position: relative;
        z-index: 2147483645;
        display: inline-block;
        min-width: 1em;
        cursor: text;
        caret-color: #0284c7;
        outline: 2px dashed rgba(56, 189, 248, 0.58);
        outline-offset: 3px;
        border-radius: 4px;
        transition: background-color 0.15s ease, outline-color 0.15s ease;
        pointer-events: auto !important;
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      [data-admin-inline-editable="true"]:hover,
      [data-admin-inline-editable="true"]:focus {
        background: rgba(186, 230, 253, 0.55);
        outline-color: rgba(2, 132, 199, 0.95);
      }
      [data-admin-page-editable="true"] {
        position: relative;
        z-index: 2147483645;
        display: inline-block;
        min-width: 1em;
        cursor: text;
        caret-color: #0284c7;
        outline: 2px dashed rgba(56, 189, 248, 0.72);
        outline-offset: 3px;
        border-radius: 4px;
        transition: background-color 0.15s ease, outline-color 0.15s ease;
        pointer-events: auto !important;
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      [data-admin-page-editable="true"]:hover,
      [data-admin-page-editable="true"]:focus {
        background: rgba(186, 230, 253, 0.6);
        outline-color: rgba(2, 132, 199, 0.95);
      }
      .admin-image-replace-button {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2147483646;
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border: 2px solid #111827;
        border-radius: 999px;
        background: #38bdf8;
        color: #111827;
        font-size: 12px;
        line-height: 1;
        font-weight: 900;
        box-shadow: 2px 2px 0 rgba(17, 24, 39, 0.9);
        cursor: pointer;
      }
      .admin-image-replace-button:hover {
        background: #7dd3fc;
      }
      [data-admin-product-image-editable="true"] {
        cursor: pointer;
        outline: 2px dashed rgba(56, 189, 248, 0.55);
        outline-offset: -6px;
        transition: background-color 0.15s ease, outline-color 0.15s ease;
      }
      [data-admin-product-image-editable="true"]:hover,
      [data-admin-product-image-editable="true"][data-admin-product-image-drag-over="true"] {
        background-color: rgba(186, 230, 253, 0.28);
        outline-color: rgba(2, 132, 199, 0.95);
      }
      [data-admin-detail-image-upload-target="true"] {
        cursor: pointer;
        outline: 2px dashed rgba(56, 189, 248, 0.58);
        outline-offset: -6px;
        transition: background-color 0.15s ease, outline-color 0.15s ease, filter 0.15s ease;
      }
      [data-admin-detail-image-upload-target="true"]:hover,
      [data-admin-detail-image-upload-target="true"][data-admin-detail-image-drag-over="true"] {
        background-color: rgba(186, 230, 253, 0.28);
        outline-color: rgba(2, 132, 199, 0.95);
        filter: saturate(1.04);
      }
      .admin-block-drag-handle {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 2147483646;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 34px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #111827;
        font-size: 18px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 1px;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 2px rgba(255, 255, 255, 0.75);
        cursor: grab;
        touch-action: none;
      }
      .admin-block-drag-handle:hover {
        background: rgba(186, 230, 253, 0.55);
      }
      .admin-block-drag-handle:active {
        cursor: grabbing;
      }
      .admin-page-move-handle {
        z-index: 2147483647;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 30px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #0f172a;
        font-size: 16px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 1px;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 2px rgba(255, 255, 255, 0.85);
        cursor: grab;
        touch-action: none;
        opacity: 0.72;
        user-select: none;
        -webkit-user-select: none;
      }
      .admin-page-move-handle[data-admin-floating-handle="true"] {
        position: absolute;
        top: 6px;
        right: 6px;
      }
      .admin-page-move-handle[data-admin-inline-handle="true"] {
        position: relative;
        margin-left: 4px;
        vertical-align: middle;
      }
      .admin-page-move-handle:hover {
        background: rgba(186, 230, 253, 0.55);
        opacity: 1;
      }
      .admin-page-move-handle:active {
        cursor: grabbing;
      }
      [data-admin-page-position-field] {
        will-change: transform;
      }
      [data-admin-editable-block="true"][data-admin-drag-over="true"] {
        outline: 4px solid rgba(14, 165, 233, 0.95);
        outline-offset: 6px;
        box-shadow: 0 0 0 8px rgba(56, 189, 248, 0.22), 3px 3px 0 #111827;
      }
      [data-admin-legacy-block-id] {
        cursor: text;
        transition: outline-color 0.15s ease, box-shadow 0.15s ease;
      }
      [data-admin-legacy-box-id] {
        cursor: grab;
        touch-action: none;
        transition: outline-color 0.15s ease, box-shadow 0.15s ease;
      }
      [data-admin-legacy-box-id]:active {
        cursor: grabbing;
      }
      [data-admin-editable-block="true"] {
        position: relative;
        z-index: 2147483641;
        outline: 2px dashed rgba(56, 189, 248, 0.85);
        outline-offset: -2px;
      }
      [data-ac-block]:hover {
        outline: 3px solid rgba(56, 189, 248, 0.9);
        outline-offset: 4px;
      }
      [data-admin-legacy-block-id]:hover {
        outline: 3px solid rgba(56, 189, 248, 0.9);
        outline-offset: 4px;
      }
      [data-admin-legacy-box-id]:hover {
        outline: 3px solid rgba(56, 189, 248, 0.9);
        outline-offset: 4px;
      }
      [data-ac-block][data-admin-selected="true"],
      [data-admin-legacy-block-id][data-admin-selected="true"],
      [data-admin-legacy-box-id][data-admin-selected="true"] {
        outline: 3px solid #0284c7;
        outline-offset: 4px;
        box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.24), 3px 3px 0 #111827;
      }
      [data-ac-block][data-admin-workbench-highlight="true"],
      [data-admin-legacy-block-id][data-admin-workbench-highlight="true"],
      [data-admin-legacy-box-id][data-admin-workbench-highlight="true"] {
        outline: 4px solid #facc15 !important;
        outline-offset: 7px !important;
        box-shadow:
          0 0 0 11px rgba(250, 204, 21, 0.34),
          4px 4px 0 #111827 !important;
      }
      [data-ac-block][data-admin-workbench-highlight="true"]::after,
      [data-admin-legacy-block-id][data-admin-workbench-highlight="true"]::after,
      [data-admin-legacy-box-id][data-admin-workbench-highlight="true"]::after {
        content: '작업대 선택 영역';
        position: absolute;
        left: 10px;
        bottom: 10px;
        z-index: 230;
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 9px;
        border: 2px solid #111827;
        border-radius: 999px;
        background: #facc15;
        color: #111827;
        font-size: 11px;
        line-height: 1;
        font-weight: 900;
        box-shadow: 2px 2px 0 rgba(17, 24, 39, 0.9);
        pointer-events: none;
      }
      [data-admin-page-workbench-highlight="true"] {
        outline: 4px solid #facc15 !important;
        outline-offset: 7px !important;
        box-shadow:
          0 0 0 11px rgba(250, 204, 21, 0.3),
          4px 4px 0 #111827 !important;
      }
      [data-ac-block][contenteditable="true"]:focus,
      [data-admin-legacy-block-id][contenteditable="true"]:focus,
      [data-admin-legacy-box-id][contenteditable="true"]:focus {
        outline: 3px solid #38bdf8;
        outline-offset: 4px;
      }
      .admin-block-resize-handle {
        position: absolute;
        right: -7px;
        bottom: -7px;
        z-index: 220;
        width: 18px;
        height: 18px;
        border: 2px solid #111827;
        border-radius: 5px;
        background: #38bdf8;
        box-shadow: 2px 2px 0 rgba(17, 24, 39, 0.9);
        cursor: nwse-resize;
        touch-action: none;
      }
      .admin-block-resize-handle::before {
        content: '';
        position: absolute;
        right: 3px;
        bottom: 3px;
        width: 7px;
        height: 7px;
        border-right: 2px solid #111827;
        border-bottom: 2px solid #111827;
      }
      [data-admin-resizing-block="true"] {
        outline: 4px solid rgba(14, 165, 233, 0.95) !important;
        outline-offset: 5px !important;
      }
      body[data-admin-preview-editing="true"] header {
        z-index: 10000 !important;
        isolation: isolate;
      }
      body[data-admin-preview-editing="true"] [data-admin-field-editable="true"],
      body[data-admin-preview-editing="true"] [data-admin-editable-block="true"],
      body[data-admin-preview-editing="true"] [data-admin-inline-editable="true"],
      body[data-admin-preview-editing="true"] [data-admin-page-editable="true"],
      body[data-admin-preview-editing="true"] [data-admin-product-image-editable="true"],
      body[data-admin-preview-editing="true"] [data-admin-detail-image-upload-target="true"] {
        z-index: 100 !important;
      }
      body[data-admin-preview-editing="true"] [data-admin-field-editable="true"]::before,
      body[data-admin-preview-editing="true"] [data-admin-editable-block="true"]::before,
      body[data-admin-preview-editing="true"] [data-admin-workbench-highlight="true"]::after,
      body[data-admin-preview-editing="true"] [data-admin-locked-animation="true"]::before,
      body[data-admin-preview-editing="true"] [data-admin-locked-animation="true"]::after,
      body[data-admin-preview-editing="true"] [data-admin-locked-block="true"]::after {
        z-index: 150 !important;
      }
      body[data-admin-preview-editing="true"] .admin-image-replace-button,
      body[data-admin-preview-editing="true"] .admin-block-drag-handle,
      body[data-admin-preview-editing="true"] .admin-page-move-handle,
      body[data-admin-preview-editing="true"] .admin-block-resize-handle {
        z-index: 220 !important;
      }
      [data-admin-locked-pulse="true"] {
        outline: 3px dashed rgba(100, 116, 139, 0.92) !important;
        outline-offset: -3px !important;
        box-shadow: inset 0 0 0 9999px rgba(148, 163, 184, 0.1) !important;
      }
      .admin-editing-toast {
        position: fixed;
        top: 92px;
        left: 50%;
        z-index: 2147483647;
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 12px;
        border: 2px solid #111827;
        border-radius: 999px;
        background: #ffffff;
        color: #475569;
        font-size: 12px;
        font-weight: 900;
        box-shadow: 3px 3px 0 #111827;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, -8px);
        transition: opacity 0.16s ease, transform 0.16s ease;
      }
      .admin-editing-toast[data-visible="true"] {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    `
    document.head.appendChild(style)
    document.body.dataset.adminPreviewEditing = 'true'

    const cleanups: Array<() => void> = []
    let detailCleanups: Array<() => void> = []
    let pageFieldCleanups: Array<() => void> = []
    let lockedCleanups: Array<() => void> = []
    let lockedTimer: number | null = null
    let lockedElement: HTMLElement | null = null
    let draggingBuilderBlockId: string | null = null
    let didReorderBuilderBlocks = false
    let lastBoundDetailSignature = ''
    let pendingPreviewHtml: string | null = null
    let pendingPreviewReplace = false
    let rebindTimer: number | null = null

    const lockedToast = document.createElement('div')
    lockedToast.className = 'admin-editing-toast'
    lockedToast.dataset.adminEditingUi = 'true'
    lockedToast.textContent = '수정 불가 영역'
    document.body.appendChild(lockedToast)

    const findDetailTarget = () => document.querySelector<HTMLElement>('[data-admin-editable="detail_html"]')

    const postToParent = (payload: Record<string, unknown>) => {
      window.parent.postMessage(
        {
          source: 'acscent-admin-preview',
          slug: productSlug,
          ...payload,
        },
        window.location.origin,
      )
    }

    const focusEditorSection = (
      section: 'basic' | 'page' | 'image' | 'detail',
      extra: Record<string, unknown> = {},
    ) => {
      postToParent({
        type: 'section:focus',
        section,
        ...extra,
      })
    }

    const isBuilderHtml = (html: string) => html.includes('data-ac-detail-builder="1"') || html.includes('data-ac-block')
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
    const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE

    const cleanDetailHtml = () => {
      const detailTarget = findDetailTarget()
      if (!detailTarget) return ''

      const clone = detailTarget.cloneNode(true) as HTMLElement
      clone.querySelectorAll<HTMLElement>('[data-admin-generated-ui="true"]').forEach((element) => {
        element.remove()
      })
      clone.querySelectorAll<HTMLElement>('[contenteditable], [spellcheck], [data-admin-selected], [data-admin-workbench-highlight], [data-admin-page-workbench-highlight], [data-admin-legacy-block-id], [data-admin-legacy-box-id], [data-admin-editable-block], [data-admin-editable-label], [data-admin-inline-editable], [data-admin-inline-field], [data-admin-inline-list-index], [data-admin-locked-block], [data-admin-locked-animation], [data-admin-lock-region], [data-admin-grid-overlay], [data-admin-drag-x], [data-admin-drag-y], [data-admin-drag-over], [data-admin-resizing-block], [data-admin-detail-image-upload-target], [data-admin-detail-image-drag-over]').forEach((element) => {
        element.removeAttribute('contenteditable')
        element.removeAttribute('spellcheck')
        element.removeAttribute('data-admin-selected')
        element.removeAttribute('data-admin-workbench-highlight')
        element.removeAttribute('data-admin-page-workbench-highlight')
        element.removeAttribute('data-admin-legacy-block-id')
        element.removeAttribute('data-admin-legacy-box-id')
        element.removeAttribute('data-admin-editable-block')
        element.removeAttribute('data-admin-editable-label')
        element.removeAttribute('data-admin-inline-editable')
        element.removeAttribute('data-admin-inline-field')
        element.removeAttribute('data-admin-inline-list-index')
        element.removeAttribute('data-admin-locked-block')
        element.removeAttribute('data-admin-locked-animation')
        element.removeAttribute('data-admin-lock-region')
        element.removeAttribute('data-admin-grid-overlay')
        element.removeAttribute('data-admin-drag-x')
        element.removeAttribute('data-admin-drag-y')
        element.removeAttribute('data-admin-drag-over')
        element.removeAttribute('data-admin-resizing-block')
        element.removeAttribute('data-admin-detail-image-upload-target')
        element.removeAttribute('data-admin-detail-image-drag-over')
      })
      clone.removeAttribute('contenteditable')
      clone.removeAttribute('spellcheck')
      clone.removeAttribute('data-admin-selected')
      clone.removeAttribute('data-admin-workbench-highlight')
      clone.removeAttribute('data-admin-page-workbench-highlight')
      clone.removeAttribute('data-admin-legacy-block-id')
      clone.removeAttribute('data-admin-legacy-box-id')
      clone.removeAttribute('data-admin-editable-block')
      clone.removeAttribute('data-admin-editable-label')
      clone.removeAttribute('data-admin-inline-editable')
      clone.removeAttribute('data-admin-inline-field')
      clone.removeAttribute('data-admin-inline-list-index')
      clone.removeAttribute('data-admin-locked-block')
      clone.removeAttribute('data-admin-locked-animation')
      clone.removeAttribute('data-admin-lock-region')
      clone.removeAttribute('data-admin-grid-overlay')
      clone.removeAttribute('data-admin-drag-x')
      clone.removeAttribute('data-admin-drag-y')
      clone.removeAttribute('data-admin-drag-over')
      clone.removeAttribute('data-admin-resizing-block')
      clone.removeAttribute('data-admin-detail-image-upload-target')
      clone.removeAttribute('data-admin-detail-image-drag-over')

      return clone.innerHTML
    }

    const showLockedFeedback = (target: HTMLElement | null) => {
      if (lockedTimer) {
        window.clearTimeout(lockedTimer)
      }
      lockedElement?.removeAttribute('data-admin-locked-pulse')
      lockedElement = target
      lockedElement?.setAttribute('data-admin-locked-pulse', 'true')
      lockedToast.dataset.visible = 'true'

      lockedTimer = window.setTimeout(() => {
        lockedToast.removeAttribute('data-visible')
        lockedElement?.removeAttribute('data-admin-locked-pulse')
        lockedElement = null
        lockedTimer = null
      }, 1200)
    }

    const sendFullDetailUpdate = () => {
      syncAllBuilderBlockAttributes()
      const html = cleanDetailHtml()
      if (!html.trim()) return
      postToParent({
        type: 'detail:update-full',
        html,
      })
    }

    const selectBlock = (blockId: string, notifyParent = true) => {
      document.querySelectorAll<HTMLElement>('[data-admin-selected="true"]').forEach((element) => {
        element.removeAttribute('data-admin-selected')
      })
      const block = document.querySelector<HTMLElement>(
        `[data-ac-block-id="${CSS.escape(blockId)}"], [data-admin-legacy-block-id="${CSS.escape(blockId)}"], [data-admin-legacy-box-id="${CSS.escape(blockId)}"]`,
      )
      block?.setAttribute('data-admin-selected', 'true')
      if (notifyParent) {
        postToParent({ type: 'block:select', blockId })
      }
    }

    const findEditableBlockById = (blockId: string) => document.querySelector<HTMLElement>(
      `[data-ac-block-id="${CSS.escape(blockId)}"], [data-admin-legacy-block-id="${CSS.escape(blockId)}"], [data-admin-legacy-box-id="${CSS.escape(blockId)}"]`,
    )

    const highlightWorkbenchTarget = (blockId: string | null | undefined, shouldScroll = false) => {
      document.querySelectorAll<HTMLElement>('[data-admin-workbench-highlight="true"]').forEach((element) => {
        element.removeAttribute('data-admin-workbench-highlight')
      })
      if (!blockId) return

      const block = findEditableBlockById(blockId)
      if (!block) return
      block.dataset.adminWorkbenchHighlight = 'true'
      if (shouldScroll) {
        block.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      }
    }

    const findPageFocusTarget = (
      pageField?: string,
      pagePositionField?: ProductPagePositionField,
    ) => {
      if (pagePositionField) {
        const positionTarget = document.querySelector<HTMLElement>(
          `[data-admin-page-position-field="${CSS.escape(pagePositionField)}"]`,
        )
        if (positionTarget) return positionTarget
      }

      if (pageField === 'productName') {
        return document.querySelector<HTMLElement>('[data-admin-editable="product_name"]')
      }

      if (pageField) {
        return document.querySelector<HTMLElement>(
          `[data-admin-page-field="${CSS.escape(pageField)}"]`,
        )
      }

      return null
    }

    const focusPageTarget = (
      pageField?: string,
      pagePositionField?: ProductPagePositionField,
      shouldScroll = false,
    ) => {
      document.querySelectorAll<HTMLElement>('[data-admin-page-workbench-highlight="true"]').forEach((element) => {
        element.removeAttribute('data-admin-page-workbench-highlight')
      })

      const target = findPageFocusTarget(pageField, pagePositionField)
      if (!target) return

      target.dataset.adminPageWorkbenchHighlight = 'true'
      if (shouldScroll) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      }
    }

    const sectionForPageField = (): 'page' => 'page'
    const editorFieldForPagePosition = (field: ProductPagePositionField): string | null => {
      switch (field) {
        case 'productImage':
        case 'price':
        case 'included':
          return null
        case 'productName':
          return 'productName'
        case 'infoCard':
          return 'infoTitle'
        case 'ctaButton':
          return 'ctaLabel'
        default:
          return field
      }
    }

    const blockText = (element: Element | null) => (element?.textContent || '').trim()
    const collectPageContent = () => {
      const detailTarget = findDetailTarget()
      const existing = detailTarget ? extractProductPageContent(detailTarget.innerHTML) : normalizeProductPageContent({})
      const patch: Partial<ProductPageContent> = {}
      document.querySelectorAll<HTMLElement>('[data-admin-page-field]').forEach((element) => {
        const field = element.dataset.adminPageField as PageField | undefined
        if (!field) return
        patch[field] = blockText(element)
      })

      const positions = { ...(existing.positions || {}) }
      document.querySelectorAll<HTMLElement>('[data-admin-page-position-field]').forEach((element) => {
        const field = element.dataset.adminPagePositionField as ProductPagePositionField | undefined
        if (!field) return

        const currentTranslate = readTranslate(element)
        const x = Math.round(Number(element.dataset.adminPageMoveX ?? currentTranslate.x ?? 0))
        const y = Math.round(Number(element.dataset.adminPageMoveY ?? currentTranslate.y ?? 0))
        if (x || y) {
          positions[field] = { x, y }
          return
        }

        delete positions[field]
      })

      return normalizeProductPageContent({ ...existing, ...patch, positions })
    }

    const syncPageContentConfig = () => {
      const detailTarget = findDetailTarget()
      if (!detailTarget) return

      const content = collectPageContent()
      let marker = detailTarget.querySelector<HTMLElement>('[data-ac-page-config="1"]')
      if (!marker) {
        marker = document.createElement('div')
        marker.dataset.acPageConfig = '1'
        marker.style.display = 'none'
        detailTarget.prepend(marker)
      }

      marker.setAttribute('data-config', JSON.stringify(content))
      marker.style.display = 'none'
    }

    const sendPageContentSource = () => {
      if (!document.querySelector('[data-admin-page-field], [data-admin-page-position-field]')) return

      syncPageContentConfig()
      postToParent({
        type: 'page:content-source',
        content: collectPageContent(),
      })
    }

    const applyPageContent = (value: Partial<ProductPageContent>) => {
      const content = normalizeProductPageContent(value)

      document.querySelectorAll<HTMLElement>('[data-admin-page-field]').forEach((element) => {
        const field = element.dataset.adminPageField as PageField | undefined
        if (!field) return
        if (element.textContent !== content[field]) {
          element.textContent = content[field]
        }
      })

      // 인라인(형제) 핸들은 대상의 transform 을 공유하지 않으므로 동일 값을 직접 맞춰준다.
      const syncMoveHandleTransform = (element: HTMLElement, transformValue: string) => {
        const sibling = element.nextElementSibling
        if (
          sibling instanceof HTMLElement &&
          sibling.classList.contains('admin-page-move-handle') &&
          sibling.dataset.adminInlineHandle === 'true'
        ) {
          sibling.style.transform = transformValue
        }
      }

      document.querySelectorAll<HTMLElement>('[data-admin-page-position-field]').forEach((element) => {
        const field = element.dataset.adminPagePositionField as ProductPagePositionField | undefined
        if (!field) return
        const position = content.positions[field]
        if (position) {
          const transformValue = `translate(${position.x}px, ${position.y}px)`
          element.dataset.adminPageMoveX = String(position.x)
          element.dataset.adminPageMoveY = String(position.y)
          element.style.transform = transformValue
          syncMoveHandleTransform(element, transformValue)
          return
        }

        element.dataset.adminPageMoveX = '0'
        element.dataset.adminPageMoveY = '0'
        element.style.transform = ''
        syncMoveHandleTransform(element, '')
      })

      const detailTarget = findDetailTarget()
      if (!detailTarget) return
      let marker = detailTarget.querySelector<HTMLElement>('[data-ac-page-config="1"]')
      if (!marker) {
        marker = document.createElement('div')
        marker.dataset.acPageConfig = '1'
        marker.style.display = 'none'
        detailTarget.prepend(marker)
      }
      marker.setAttribute('data-config', JSON.stringify(content))
      marker.style.display = 'none'
    }

    const bindPageMoveHandle = (target: HTMLElement, field: ProductPagePositionField) => {
      if (target.dataset.adminPageMoveBound === 'true') return

      const previousPosition = target.style.position
      const previousTransform = target.style.transform
      const previousTouchAction = target.style.touchAction
      const previousDisplay = target.style.display
      const computedStyle = window.getComputedStyle(target)
      const computedDisplay = computedStyle.display
      const shouldSetPosition = computedStyle.position === 'static'
      // 핸들 배치는 "편집 가능 여부"가 아니라 "실제 display"로 판단해야 한다.
      // 인라인 계열만 핸들을 형제(sibling)로 두고, 블록/flex/absolute 등은 대상 안에 넣어
      // 대상의 transform 을 핸들이 함께 받도록(같이 움직이도록) 한다.
      const isInlineTarget =
        computedDisplay === 'inline' ||
        computedDisplay === 'inline-block' ||
        computedDisplay === 'inline-flex' ||
        computedDisplay === 'inline-grid'
      const currentTranslate = readTranslate(target)

      target.dataset.adminPageMoveBound = 'true'
      target.dataset.adminPageMoveX = String(currentTranslate.x)
      target.dataset.adminPageMoveY = String(currentTranslate.y)
      target.style.touchAction = 'none'
      if (shouldSetPosition && !isInlineTarget) {
        target.style.position = 'relative'
      }
      // 순수 인라인 요소는 transform 이 적용되지 않으므로 inline-block 으로 승격한다.
      if (computedDisplay === 'inline') {
        target.style.display = 'inline-block'
      }

      const handle = document.createElement('span')
      handle.className = 'admin-page-move-handle'
      handle.dataset.adminGeneratedUi = 'true'
      handle.dataset.adminEditingUi = 'true'
      handle.dataset.adminPageMoveHandle = field
      handle.dataset[isInlineTarget ? 'adminInlineHandle' : 'adminFloatingHandle'] = 'true'
      handle.setAttribute('role', 'button')
      handle.setAttribute('aria-label', '요소 위치 이동')
      handle.title = '요소 위치 이동'
      handle.tabIndex = 0
      handle.textContent = '...'

      if (isInlineTarget) {
        target.insertAdjacentElement('afterend', handle)
      } else {
        target.appendChild(handle)
      }

      // 인라인 핸들은 대상의 형제라 대상 transform 을 공유하지 않는다.
      // 동일한 translate 를 핸들에도 적용해 항상 대상과 함께 움직이게 한다.
      const applyTranslate = (x: number, y: number) => {
        target.dataset.adminPageMoveX = String(x)
        target.dataset.adminPageMoveY = String(y)
        target.style.transform = `translate(${x}px, ${y}px)`
        if (isInlineTarget) {
          handle.style.transform = `translate(${x}px, ${y}px)`
        }
      }

      if (isInlineTarget && (currentTranslate.x || currentTranslate.y)) {
        handle.style.transform = `translate(${currentTranslate.x}px, ${currentTranslate.y}px)`
      }

      const moveTarget = (startEvent: PointerEvent) => {
        startEvent.preventDefault()
        startEvent.stopPropagation()

        const startClientX = startEvent.clientX
        const startClientY = startEvent.clientY
        const startX = Number(target.dataset.adminPageMoveX ?? currentTranslate.x ?? 0)
        const startY = Number(target.dataset.adminPageMoveY ?? currentTranslate.y ?? 0)
        let didDrag = false

        const handleMove = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - startClientX
          const deltaY = moveEvent.clientY - startClientY
          if (!didDrag && Math.hypot(deltaX, deltaY) < 4) return

          didDrag = true
          moveEvent.preventDefault()
          moveEvent.stopPropagation()

          const nextX = snapToGrid(startX + deltaX)
          const nextY = snapToGrid(startY + deltaY)
          applyTranslate(nextX, nextY)
        }

        const stopMove = () => {
          window.removeEventListener('pointermove', handleMove)
          window.removeEventListener('pointerup', stopMove)
          window.removeEventListener('pointercancel', stopMove)
          if (!didDrag) return

          syncPageContentConfig()
          sendFullDetailUpdate()
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', stopMove)
        window.addEventListener('pointercancel', stopMove)
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        const step = event.shiftKey ? GRID_SIZE * 2 : GRID_SIZE
        const keyMap: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        }
        const delta = keyMap[event.key]
        if (!delta) return

        event.preventDefault()
        event.stopPropagation()
        const nextX = snapToGrid(Number(target.dataset.adminPageMoveX || 0) + delta[0])
        const nextY = snapToGrid(Number(target.dataset.adminPageMoveY || 0) + delta[1])
        applyTranslate(nextX, nextY)
        syncPageContentConfig()
        sendFullDetailUpdate()
      }

      handle.addEventListener('pointerdown', moveTarget)
      handle.addEventListener('keydown', handleKeyDown)
      pageFieldCleanups.push(() => {
        handle.removeEventListener('pointerdown', moveTarget)
        handle.removeEventListener('keydown', handleKeyDown)
        handle.remove()
        target.removeAttribute('data-admin-page-move-bound')
        target.removeAttribute('data-admin-page-move-x')
        target.removeAttribute('data-admin-page-move-y')
        if (shouldSetPosition && !isInlineTarget) {
          target.style.position = previousPosition
        }
        target.style.transform = previousTransform
        target.style.touchAction = previousTouchAction
        target.style.display = previousDisplay
      })
    }

    const inlineTextSelector = [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'figcaption',
      'blockquote',
      'a',
      'button',
      'li > span:last-child',
      'strong',
      'em',
      'mark',
    ].join(',')

    const extractBlockPatch = (block: HTMLElement): BlockPatch => {
      const type = block.dataset.acBlock
      const sizePatch = readBlockSizePatch(block)
      if (type === 'hero') {
        return {
          ...sizePatch,
          title: blockText(block.querySelector('h1,h2,h3')),
          subtitle: blockText(block.querySelector('p')),
        }
      }
      if (type === 'heading') {
        return { ...sizePatch, text: blockText(block.querySelector('h1,h2,h3')) || blockText(block) }
      }
      if (type === 'text') {
        return { ...sizePatch, text: blockText(block.querySelector('p')) || blockText(block) }
      }
      if (type === 'features') {
        return {
          ...sizePatch,
          title: blockText(block.querySelector('h1,h2,h3')) || '포인트',
          items: Array.from(block.querySelectorAll('li')).map((item) => blockText(item)).filter(Boolean),
        }
      }
      if (type === 'quote') {
        const paragraphs = Array.from(block.querySelectorAll('p'))
        return {
          ...sizePatch,
          text: blockText(paragraphs[0]) || blockText(block),
          author: blockText(paragraphs[1]) || block.dataset.author || '',
        }
      }
      if (type === 'button') {
        return { ...sizePatch, label: blockText(block.querySelector('a,button')) || blockText(block) }
      }
      if (type === 'image') {
        return {
          ...sizePatch,
          caption: blockText(block.querySelector('figcaption')),
        }
      }
      if (type === 'divider') {
        return {
          ...sizePatch,
          label: blockText(block.querySelector('span')),
        }
      }
      if (type === 'spacer') {
        return {
          ...sizePatch,
          height: Number(block.dataset.height || block.style.height.replace('px', '') || 32),
        }
      }
      if (type === 'freebox') {
        return {
          icon: blockText(block.querySelector('[data-admin-inline-field="icon"]')) || block.dataset.icon || '✦',
          title: blockText(block.querySelector('[data-admin-inline-field="title"]')) || block.dataset.title || '새 박스',
          subtitle: blockText(block.querySelector('[data-admin-inline-field="subtitle"]')) || block.dataset.subtitle || '',
          x: Number(block.dataset.x || block.style.left.replace('px', '') || 0),
          y: Number(block.dataset.y || block.style.top.replace('px', '') || 0),
          width: Number(block.dataset.width || block.style.width.replace('px', '') || 144),
          height: Number(block.dataset.height || block.style.height.replace('px', '') || 112),
        }
      }
      return sizePatch
    }

    const syncBuilderBlockAttributes = (block: HTMLElement) => {
      const type = block.dataset.acBlock
      const patch = extractBlockPatch(block)
      syncBlockSizeAttributes(block, patch)

      if (type === 'hero') {
        block.setAttribute('data-title', String(patch.title ?? ''))
        block.setAttribute('data-subtitle', String(patch.subtitle ?? ''))
        return
      }
      if (type === 'heading') {
        block.setAttribute('data-text', String(patch.text ?? ''))
        return
      }
      if (type === 'text') {
        block.setAttribute('data-text', String(patch.text ?? ''))
        return
      }
      if (type === 'features') {
        block.setAttribute('data-title', String(patch.title ?? ''))
        block.setAttribute('data-items', JSON.stringify(Array.isArray(patch.items) ? patch.items : []))
        return
      }
      if (type === 'quote') {
        block.setAttribute('data-text', String(patch.text ?? ''))
        block.setAttribute('data-author', String(patch.author ?? ''))
        return
      }
      if (type === 'button') {
        block.setAttribute('data-label', String(patch.label ?? ''))
        return
      }
      if (type === 'image') {
        const image = block.querySelector<HTMLImageElement>('img')
        if (image) {
          block.setAttribute('data-src', image.getAttribute('src') || '')
          block.setAttribute('data-alt', image.getAttribute('alt') || '')
        }
        block.setAttribute('data-caption', String(patch.caption ?? ''))
        return
      }
      if (type === 'divider') {
        block.setAttribute('data-label', String(patch.label ?? ''))
        return
      }
      if (type === 'freebox') {
        block.setAttribute('data-icon', String(patch.icon ?? ''))
        block.setAttribute('data-title', String(patch.title ?? ''))
        block.setAttribute('data-subtitle', String(patch.subtitle ?? ''))
        block.setAttribute('data-x', String(patch.x ?? 0))
        block.setAttribute('data-y', String(patch.y ?? 0))
      }
    }

    const syncAllBuilderBlockAttributes = () => {
      const detailTarget = findDetailTarget()
      detailTarget?.querySelectorAll<HTMLElement>('[data-ac-block][data-ac-block-id]').forEach(syncBuilderBlockAttributes)
    }

    const classText = (element: Element) => {
      const className = element.getAttribute('class')
      return className || ''
    }

    const readTranslate = (element: HTMLElement) => {
      const match = element.style.transform.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/)
      if (!match) return { x: 0, y: 0 }
      return {
        x: Number(match[1]),
        y: Number(match[2]),
      }
    }

    const readBlockSizePatch = (block: HTMLElement): BlockPatch => {
      const patch: BlockPatch = {}
      const width = Number(block.dataset.width || 0)
      const height = Number(block.dataset.height || 0)
      if (Number.isFinite(width) && width > 0) patch.width = Math.round(width)
      if (Number.isFinite(height) && height > 0) patch.height = Math.round(height)
      return patch
    }

    const syncBlockSizeAttributes = (block: HTMLElement, patch: BlockPatch) => {
      if (typeof patch.width === 'number' && Number.isFinite(patch.width) && patch.width > 0) {
        block.setAttribute('data-width', String(Math.round(patch.width)))
      }
      if (typeof patch.height === 'number' && Number.isFinite(patch.height) && patch.height > 0) {
        block.setAttribute('data-height', String(Math.round(patch.height)))
      }
    }

    const applyResizableBlockSize = (block: HTMLElement, width: number, height: number) => {
      const type = block.dataset.acBlock
      const roundedWidth = Math.round(width)
      const roundedHeight = Math.round(height)

      block.dataset.width = String(roundedWidth)
      block.dataset.height = String(roundedHeight)
      block.style.maxWidth = '100%'
      block.style.boxSizing = 'border-box'

      if (type === 'freebox') {
        block.style.width = `${roundedWidth}px`
        block.style.height = `${roundedHeight}px`
        return
      }

      block.style.width = `min(${roundedWidth}px, 100%)`

      if (type === 'spacer') {
        block.style.height = `${roundedHeight}px`
        return
      }

      if (type === 'image') {
        const surface = block.querySelector<HTMLElement>(':scope > img, :scope > div:not([data-admin-generated-ui="true"])')
        block.style.minHeight = `${roundedHeight}px`
        if (surface) {
          surface.style.height = `${roundedHeight}px`
          surface.style.aspectRatio = 'auto'
          surface.style.boxSizing = 'border-box'
        }
        return
      }

      block.style.minHeight = `${roundedHeight}px`
    }

    const closestLegacyCard = (element: HTMLElement, root: HTMLElement) => {
      let current: HTMLElement | null = element
      for (let depth = 0; current && current !== root && depth < 4; depth += 1) {
        const classes = classText(current)
        if (
          classes.includes('flex') &&
          classes.includes('flex-col') &&
          classes.includes('text-center') &&
          current.textContent?.trim()
        ) {
          return current
        }
        current = current.parentElement
      }
      return element
    }

    const findLegacyBoxTargets = (detailTarget: HTMLElement) => {
      const candidates = Array.from(detailTarget.querySelectorAll<HTMLElement>('[class*="w-14"][class*="h-14"][class*="rounded"], [class*="border-2"][class*="rounded-xl"][class*="shadow"]'))
      const targets = candidates
        .map((element) => closestLegacyCard(element, detailTarget))
        .filter((element) => !element.closest('[data-ac-block], [data-admin-field-editable="true"]'))

      return Array.from(new Set(targets))
    }

    const closestAnimationPreview = (element: HTMLElement, root: HTMLElement) => {
      let current: HTMLElement | null = element
      for (let depth = 0; current && current !== root && depth < 6; depth += 1) {
        const classes = classText(current)
        if (
          classes.includes('overflow-hidden') &&
          classes.includes('border') &&
          classes.includes('shadow')
        ) {
          return current
        }
        current = current.parentElement
      }
      return null
    }

    const findLockedAnimationTargets = (detailTarget: HTMLElement) => {
      const markedTargets = Array.from(detailTarget.querySelectorAll<HTMLElement>('[data-admin-lock-region="analysis-preview-animation"]'))
      if (markedTargets.length > 0) return markedTargets

      const livePreviewTargets = Array.from(detailTarget.querySelectorAll<HTMLElement>('*'))
        .filter((element) => blockText(element) === 'LIVE PREVIEW')
        .map((element) => closestAnimationPreview(element, detailTarget))
        .filter((element): element is HTMLElement => Boolean(element))

      return Array.from(new Set(livePreviewTargets))
    }

    const bindLockedAnimation = (block: HTMLElement) => {
      const previousPosition = block.style.position
      const previousContentEditable = block.getAttribute('contenteditable')
      const shouldPositionBlock = window.getComputedStyle(block).position === 'static'

      if (shouldPositionBlock) {
        block.style.position = 'relative'
      }
      block.dataset.adminLockedAnimation = 'true'
      block.contentEditable = 'false'

      const handleLockedPointer = (event: MouseEvent | PointerEvent) => {
        event.preventDefault()
        event.stopPropagation()
        showLockedFeedback(block)
      }

      block.addEventListener('click', handleLockedPointer)
      block.addEventListener('pointerdown', handleLockedPointer)

      detailCleanups.push(() => {
        block.removeEventListener('click', handleLockedPointer)
        block.removeEventListener('pointerdown', handleLockedPointer)
        block.removeAttribute('data-admin-locked-animation')
        if (previousContentEditable === null) {
          block.removeAttribute('contenteditable')
        } else {
          block.setAttribute('contenteditable', previousContentEditable)
        }
        if (shouldPositionBlock) {
          block.style.position = previousPosition
        }
      })
    }

    const bindInlineEditable = (
      element: HTMLElement | null,
      blockId: string,
      field: string,
      handleUpdate: () => void,
      listIndex?: number,
    ) => {
      if (!element) return

      const previousContentEditable = element.getAttribute('contenteditable')
      const previousSpellcheck = element.getAttribute('spellcheck')
      const previousRole = element.getAttribute('role')
      const previousTabIndex = element.getAttribute('tabindex')
      element.contentEditable = 'true'
      element.spellcheck = false
      element.setAttribute('role', 'textbox')
      element.tabIndex = 0
      element.dataset.adminInlineEditable = 'true'
      element.dataset.adminInlineField = field
      if (typeof listIndex === 'number') {
        element.dataset.adminInlineListIndex = String(listIndex)
      }

      const handlePointerDown = (event: PointerEvent) => {
        event.stopPropagation()
        selectBlock(blockId)
      }
      const handleClick = (event: MouseEvent) => {
        event.stopPropagation()
        selectBlock(blockId)
        window.requestAnimationFrame(() => {
          element.focus()
        })
      }
      const handleKeyDown = (event: KeyboardEvent) => {
        event.stopPropagation()
      }
      const handlePaste = (event: ClipboardEvent) => {
        event.preventDefault()
        event.stopPropagation()
        const text = event.clipboardData?.getData('text/plain') ?? ''
        document.execCommand('insertText', false, text)
      }

      element.addEventListener('pointerdown', handlePointerDown)
      element.addEventListener('click', handleClick)
      element.addEventListener('keydown', handleKeyDown)
      element.addEventListener('paste', handlePaste)
      element.addEventListener('input', handleUpdate)
      element.addEventListener('blur', handleUpdate)

      detailCleanups.push(() => {
        element.removeEventListener('pointerdown', handlePointerDown)
        element.removeEventListener('click', handleClick)
        element.removeEventListener('keydown', handleKeyDown)
        element.removeEventListener('paste', handlePaste)
        element.removeEventListener('input', handleUpdate)
        element.removeEventListener('blur', handleUpdate)
        element.removeAttribute('data-admin-inline-editable')
        element.removeAttribute('data-admin-inline-field')
        element.removeAttribute('data-admin-inline-list-index')
        if (previousContentEditable === null) {
          element.removeAttribute('contenteditable')
        } else {
          element.setAttribute('contenteditable', previousContentEditable)
        }
        if (previousSpellcheck === null) {
          element.removeAttribute('spellcheck')
        } else {
          element.setAttribute('spellcheck', previousSpellcheck)
        }
        if (previousRole === null) {
          element.removeAttribute('role')
        } else {
          element.setAttribute('role', previousRole)
        }
        if (previousTabIndex === null) {
          element.removeAttribute('tabindex')
        } else {
          element.setAttribute('tabindex', previousTabIndex)
        }
      })
    }

    const bindPageFields = () => {
      pageFieldCleanups.forEach((cleanup) => cleanup())
      pageFieldCleanups = []

      const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-admin-page-field]'))
      elements.forEach((element) => {
        const field = element.dataset.adminPageField as PageField | undefined
        if (!field) return

        const previousContentEditable = element.getAttribute('contenteditable')
        const previousSpellcheck = element.getAttribute('spellcheck')
        const previousRole = element.getAttribute('role')
        const previousTabIndex = element.getAttribute('tabindex')

        element.contentEditable = 'true'
        element.spellcheck = false
        element.setAttribute('role', 'textbox')
        element.tabIndex = 0
        element.dataset.adminPageEditable = 'true'

        const handlePointerDown = (event: PointerEvent) => {
          event.stopPropagation()
        }

        const handleClick = (event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
          focusEditorSection(sectionForPageField(), { pageField: field })
          window.requestAnimationFrame(() => {
            element.focus()
          })
        }

        const handleKeyDown = (event: KeyboardEvent) => {
          event.stopPropagation()
          if (event.key === 'Enter' && field !== 'infoBody' && field !== 'subtitle') {
            event.preventDefault()
            element.blur()
          }
        }

        const handlePaste = (event: ClipboardEvent) => {
          event.preventDefault()
          event.stopPropagation()
          const text = event.clipboardData?.getData('text/plain') ?? ''
          document.execCommand('insertText', false, text)
        }

        const handleUpdate = () => {
          syncPageContentConfig()
          sendFullDetailUpdate()
        }

        element.addEventListener('pointerdown', handlePointerDown)
        element.addEventListener('click', handleClick)
        element.addEventListener('keydown', handleKeyDown)
        element.addEventListener('paste', handlePaste)
        element.addEventListener('input', handleUpdate)
        element.addEventListener('blur', handleUpdate)

        pageFieldCleanups.push(() => {
          element.removeEventListener('pointerdown', handlePointerDown)
          element.removeEventListener('click', handleClick)
          element.removeEventListener('keydown', handleKeyDown)
          element.removeEventListener('paste', handlePaste)
          element.removeEventListener('input', handleUpdate)
          element.removeEventListener('blur', handleUpdate)
          element.removeAttribute('data-admin-page-editable')
          if (previousContentEditable === null) {
            element.removeAttribute('contenteditable')
          } else {
            element.setAttribute('contenteditable', previousContentEditable)
          }
          if (previousSpellcheck === null) {
            element.removeAttribute('spellcheck')
          } else {
            element.setAttribute('spellcheck', previousSpellcheck)
          }
          if (previousRole === null) {
            element.removeAttribute('role')
          } else {
            element.setAttribute('role', previousRole)
          }
          if (previousTabIndex === null) {
            element.removeAttribute('tabindex')
          } else {
            element.setAttribute('tabindex', previousTabIndex)
          }
        })
      })

      document.querySelectorAll<HTMLElement>('[data-admin-page-position-field]').forEach((element) => {
        const field = element.dataset.adminPagePositionField as ProductPagePositionField | undefined
        if (!field) return
        bindPageMoveHandle(element, field)

        const handlePositionClick = (event: MouseEvent) => {
          const target = event.target as HTMLElement | null
          if (target?.closest('[data-admin-page-move-handle], [data-admin-page-editable="true"], [contenteditable="true"], [data-admin-generated-ui="true"]')) return

          if (field === 'productImage') {
            focusEditorSection('image')
            return
          }

          const pageField = editorFieldForPagePosition(field)
          if (!pageField) return
          event.preventDefault()
          event.stopPropagation()
          focusEditorSection('page', {
            pageField,
            pagePositionField: field,
          })
        }

        element.addEventListener('click', handlePositionClick)
        pageFieldCleanups.push(() => {
          element.removeEventListener('click', handlePositionClick)
        })
      })

      document.querySelectorAll<HTMLElement>('[data-admin-product-image="true"]').forEach((element) => {
        const previousPosition = element.style.position
        const previousTabIndex = element.getAttribute('tabindex')
        const previousRole = element.getAttribute('role')
        const shouldSetPosition = window.getComputedStyle(element).position === 'static'
        if (shouldSetPosition) {
          element.style.position = 'relative'
        }
        element.dataset.adminProductImageEditable = 'true'
        element.tabIndex = 0
        element.setAttribute('role', 'button')

        const handleClick = (event: MouseEvent) => {
          const target = event.target as HTMLElement | null
          if (target?.closest('[contenteditable="true"], [data-admin-page-editable="true"], [data-admin-generated-ui="true"]')) return
          event.preventDefault()
          event.stopPropagation()
          focusEditorSection('image')
          postToParent({
            type: 'product:image-upload-request',
          })
        }

        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          event.stopPropagation()
          focusEditorSection('image')
          postToParent({
            type: 'product:image-upload-request',
          })
        }

        const handleDragOver = (event: DragEvent) => {
          event.preventDefault()
          event.stopPropagation()
          element.dataset.adminProductImageDragOver = 'true'
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy'
          }
        }

        const handleDragLeave = (event: DragEvent) => {
          event.preventDefault()
          event.stopPropagation()
          element.removeAttribute('data-admin-product-image-drag-over')
        }

        const handleDrop = (event: DragEvent) => {
          event.preventDefault()
          event.stopPropagation()
          element.removeAttribute('data-admin-product-image-drag-over')
          const file = event.dataTransfer?.files?.[0]
          if (!file) return
          focusEditorSection('image')
          postToParent({
            type: 'product:image-upload-file',
            file,
          })
        }

        element.addEventListener('click', handleClick)
        element.addEventListener('keydown', handleKeyDown)
        element.addEventListener('dragover', handleDragOver)
        element.addEventListener('dragleave', handleDragLeave)
        element.addEventListener('drop', handleDrop)

        pageFieldCleanups.push(() => {
          element.removeEventListener('click', handleClick)
          element.removeEventListener('keydown', handleKeyDown)
          element.removeEventListener('dragover', handleDragOver)
          element.removeEventListener('dragleave', handleDragLeave)
          element.removeEventListener('drop', handleDrop)
          element.removeAttribute('data-admin-product-image-editable')
          element.removeAttribute('data-admin-product-image-drag-over')
          if (previousRole === null) {
            element.removeAttribute('role')
          } else {
            element.setAttribute('role', previousRole)
          }
          if (previousTabIndex === null) {
            element.removeAttribute('tabindex')
          } else {
            element.setAttribute('tabindex', previousTabIndex)
          }
          if (shouldSetPosition) {
            element.style.position = previousPosition
          }
        })
      })
    }

    const bindExtraInlineFields = (
      block: HTMLElement,
      blockId: string,
      handleUpdate: () => void,
    ) => {
      const targets = Array.from(block.querySelectorAll<HTMLElement>(inlineTextSelector))
        .filter((element) => {
          if (!blockText(element)) return false
          if (element.dataset.adminInlineEditable === 'true') return false
          if (element.closest('[data-admin-inline-editable="true"], [data-admin-generated-ui="true"], [data-admin-locked-animation="true"]')) return false
          if (element.querySelector('[data-admin-inline-editable="true"]')) return false

          const childTextTarget = element.querySelector(inlineTextSelector)
          if (childTextTarget && childTextTarget.textContent?.trim()) return false

          return true
        })

      targets.forEach((element, index) => {
        bindInlineEditable(element, blockId, `extra-${index}`, handleUpdate)
      })
    }

    const bindGeneratedInlineFields = (
      block: HTMLElement,
      type: string | undefined,
      blockId: string,
      handleUpdate: () => void,
    ) => {
      if (type === 'hero') {
        bindInlineEditable(block.querySelector<HTMLElement>('h1,h2,h3'), blockId, 'title', handleUpdate)
        bindInlineEditable(block.querySelector<HTMLElement>('p'), blockId, 'subtitle', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'heading') {
        bindInlineEditable(block.querySelector<HTMLElement>('h1,h2,h3'), blockId, 'text', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'text') {
        bindInlineEditable(block.querySelector<HTMLElement>('p'), blockId, 'text', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'features') {
        bindInlineEditable(block.querySelector<HTMLElement>('h1,h2,h3'), blockId, 'title', handleUpdate)
        Array.from(block.querySelectorAll<HTMLElement>('li')).forEach((item, index) => {
          bindInlineEditable(item.lastElementChild instanceof HTMLElement ? item.lastElementChild : item, blockId, 'item', handleUpdate, index)
        })
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'quote') {
        const paragraphs = Array.from(block.querySelectorAll<HTMLElement>('p'))
        bindInlineEditable(paragraphs[0], blockId, 'text', handleUpdate)
        bindInlineEditable(paragraphs[1], blockId, 'author', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'button') {
        bindInlineEditable(block.querySelector<HTMLElement>('a,button'), blockId, 'label', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'image') {
        bindInlineEditable(block.querySelector<HTMLElement>('figcaption'), blockId, 'caption', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'divider') {
        bindInlineEditable(block.querySelector<HTMLElement>('span'), blockId, 'label', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
        return
      }
      if (type === 'freebox') {
        bindInlineEditable(block.querySelector<HTMLElement>(':scope > div'), blockId, 'icon', handleUpdate)
        bindInlineEditable(block.querySelector<HTMLElement>(':scope > strong'), blockId, 'title', handleUpdate)
        bindInlineEditable(block.querySelector<HTMLElement>(':scope > span'), blockId, 'subtitle', handleUpdate)
        bindExtraInlineFields(block, blockId, () => {
          syncBuilderBlockAttributes(block)
          sendFullDetailUpdate()
        })
      }
    }

    const bindImageTool = (block: HTMLElement, blockId: string) => {
      const previousPosition = block.style.position
      const shouldSetPosition = window.getComputedStyle(block).position === 'static'
      if (shouldSetPosition) {
        block.style.position = 'relative'
      }
      const imageSurface = block.querySelector<HTMLElement>(':scope > img, :scope > div')
      const previousSurfaceTabIndex = imageSurface?.getAttribute('tabindex') ?? null
      const previousSurfaceRole = imageSurface?.getAttribute('role') ?? null
      if (imageSurface) {
        imageSurface.dataset.adminDetailImageUploadTarget = 'true'
        imageSurface.tabIndex = 0
        imageSurface.setAttribute('role', 'button')
      }

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'admin-image-replace-button'
      button.dataset.adminGeneratedUi = 'true'
      button.dataset.adminEditingUi = 'true'
      button.textContent = block.querySelector('img') ? '이미지 교체' : '이미지 추가'

      const requestUpload = () => {
        selectBlock(blockId)
        postToParent({
          type: 'block:image-upload-request',
          blockId,
        })
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        requestUpload()
      }

      const handleSurfaceClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null
        if (target?.closest('[data-admin-generated-ui="true"], [data-admin-inline-editable="true"], figcaption')) return
        event.preventDefault()
        event.stopPropagation()
        requestUpload()
      }

      const handleSurfaceKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.stopPropagation()
        requestUpload()
      }

      const handleSurfaceDragOver = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        imageSurface?.setAttribute('data-admin-detail-image-drag-over', 'true')
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'copy'
        }
      }

      const handleSurfaceDragLeave = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        imageSurface?.removeAttribute('data-admin-detail-image-drag-over')
      }

      const handleSurfaceDrop = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        imageSurface?.removeAttribute('data-admin-detail-image-drag-over')
        const file = event.dataTransfer?.files?.[0]
        if (!file) return
        selectBlock(blockId)
        postToParent({
          type: 'block:image-upload-file',
          blockId,
          file,
        })
      }

      button.addEventListener('click', handleClick)
      imageSurface?.addEventListener('click', handleSurfaceClick)
      imageSurface?.addEventListener('keydown', handleSurfaceKeyDown)
      imageSurface?.addEventListener('dragover', handleSurfaceDragOver)
      imageSurface?.addEventListener('dragleave', handleSurfaceDragLeave)
      imageSurface?.addEventListener('drop', handleSurfaceDrop)
      block.appendChild(button)

      detailCleanups.push(() => {
        button.removeEventListener('click', handleClick)
        imageSurface?.removeEventListener('click', handleSurfaceClick)
        imageSurface?.removeEventListener('keydown', handleSurfaceKeyDown)
        imageSurface?.removeEventListener('dragover', handleSurfaceDragOver)
        imageSurface?.removeEventListener('dragleave', handleSurfaceDragLeave)
        imageSurface?.removeEventListener('drop', handleSurfaceDrop)
        imageSurface?.removeAttribute('data-admin-detail-image-upload-target')
        imageSurface?.removeAttribute('data-admin-detail-image-drag-over')
        if (imageSurface) {
          if (previousSurfaceRole === null) {
            imageSurface.removeAttribute('role')
          } else {
            imageSurface.setAttribute('role', previousSurfaceRole)
          }
          if (previousSurfaceTabIndex === null) {
            imageSurface.removeAttribute('tabindex')
          } else {
            imageSurface.setAttribute('tabindex', previousSurfaceTabIndex)
          }
        }
        button.remove()
        if (shouldSetPosition) {
          block.style.position = previousPosition
        }
      })
    }

    const bindBuilderBlockReorder = (block: HTMLElement, blockId: string) => {
      if (block.dataset.acBlock === 'freebox') return

      const previousPosition = block.style.position
      const shouldSetPosition = window.getComputedStyle(block).position === 'static'
      if (shouldSetPosition) {
        block.style.position = 'relative'
      }

      const handle = document.createElement('button')
      handle.type = 'button'
      handle.className = 'admin-block-drag-handle'
      handle.dataset.adminGeneratedUi = 'true'
      handle.dataset.adminEditingUi = 'true'
      handle.draggable = true
      handle.setAttribute('aria-label', '블록 위치 이동')
      handle.title = '블록 위치 이동'
      handle.textContent = '...'

      const clearDragMarkers = () => {
        document.querySelectorAll<HTMLElement>('[data-admin-drag-over="true"]').forEach((element) => {
          element.removeAttribute('data-admin-drag-over')
        })
      }

      const handleDragStart = (event: DragEvent) => {
        event.stopPropagation()
        draggingBuilderBlockId = blockId
        didReorderBuilderBlocks = false
        selectBlock(blockId)
        event.dataTransfer?.setData('text/plain', blockId)
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move'
        }
      }

      const handleDragEnd = (event: DragEvent) => {
        event.stopPropagation()
        clearDragMarkers()
        if (didReorderBuilderBlocks) {
          sendFullDetailUpdate()
        }
        draggingBuilderBlockId = null
        didReorderBuilderBlocks = false
      }

      const handleDragOver = (event: DragEvent) => {
        const activeBlockId = draggingBuilderBlockId || event.dataTransfer?.getData('text/plain')
        if (!activeBlockId || activeBlockId === blockId) return
        const detailFrame = block.closest<HTMLElement>('[data-ac-detail-builder="1"]')
        if (!detailFrame) return
        const activeBlock = detailFrame.querySelector<HTMLElement>(`[data-ac-block-id="${CSS.escape(activeBlockId)}"]`)
        if (!activeBlock || activeBlock === block || activeBlock.dataset.acBlock === 'freebox') return

        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move'
        }

        const siblings = Array.from(detailFrame.children).filter((child): child is HTMLElement => (
          child instanceof HTMLElement && child.matches('[data-ac-block][data-ac-block-id]') && child.dataset.acBlock !== 'freebox'
        ))
        const fromIndex = siblings.indexOf(activeBlock)
        const toIndex = siblings.indexOf(block)
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

        clearDragMarkers()
        block.dataset.adminDragOver = 'true'
        detailFrame.insertBefore(activeBlock, fromIndex < toIndex ? block.nextSibling : block)
        didReorderBuilderBlocks = true
        selectBlock(activeBlockId)
      }

      const handleDragLeave = () => {
        block.removeAttribute('data-admin-drag-over')
      }

      const handleDrop = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        clearDragMarkers()
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        selectBlock(blockId)
      }

      handle.addEventListener('dragstart', handleDragStart)
      handle.addEventListener('dragend', handleDragEnd)
      handle.addEventListener('click', handleClick)
      block.addEventListener('dragover', handleDragOver)
      block.addEventListener('dragleave', handleDragLeave)
      block.addEventListener('drop', handleDrop)
      block.appendChild(handle)

      detailCleanups.push(() => {
        handle.removeEventListener('dragstart', handleDragStart)
        handle.removeEventListener('dragend', handleDragEnd)
        handle.removeEventListener('click', handleClick)
        block.removeEventListener('dragover', handleDragOver)
        block.removeEventListener('dragleave', handleDragLeave)
        block.removeEventListener('drop', handleDrop)
        block.removeAttribute('data-admin-drag-over')
        handle.remove()
        if (shouldSetPosition) {
          block.style.position = previousPosition
        }
      })
    }

    const bindBuilderBlockResize = (block: HTMLElement, blockId: string) => {
      const previousPosition = block.style.position
      const shouldSetPosition = window.getComputedStyle(block).position === 'static'
      if (shouldSetPosition) {
        block.style.position = 'relative'
      }

      const handle = document.createElement('span')
      handle.className = 'admin-block-resize-handle'
      handle.dataset.adminGeneratedUi = 'true'
      handle.dataset.adminEditingUi = 'true'
      handle.setAttribute('role', 'button')
      handle.setAttribute('aria-label', '블록 크기 조절')
      handle.title = '블록 크기 조절'

      const readCurrentSize = () => {
        const rect = block.getBoundingClientRect()
        const type = block.dataset.acBlock
        const surface = type === 'image'
          ? block.querySelector<HTMLElement>(':scope > img, :scope > div:not([data-admin-generated-ui="true"])')
          : null
        const surfaceRect = surface?.getBoundingClientRect()

        return {
          width: Number(block.dataset.width || 0) || Math.round(rect.width),
          height: Number(block.dataset.height || 0) || Math.round(surfaceRect?.height || rect.height),
        }
      }

      const handlePointerDown = (event: PointerEvent) => {
        event.preventDefault()
        event.stopPropagation()

        const detailFrame = block.closest<HTMLElement>('[data-ac-detail-builder="1"]') || findDetailTarget()
        if (!detailFrame) return

        const startClientX = event.clientX
        const startClientY = event.clientY
        const startSize = readCurrentSize()
        const type = block.dataset.acBlock
        const minWidth = type === 'divider' ? 48 : 72
        const minHeight = type === 'spacer' ? 8 : type === 'divider' ? 24 : 40
        const maxWidth = Math.max(detailFrame.clientWidth, minWidth)
        const maxHeight = type === 'spacer' ? 320 : 1800
        let didResize = false

        block.dataset.adminResizingBlock = 'true'
        selectBlock(blockId)

        const handleMove = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - startClientX
          const deltaY = moveEvent.clientY - startClientY
          if (!didResize && Math.hypot(deltaX, deltaY) < 4) return

          didResize = true
          moveEvent.preventDefault()
          moveEvent.stopPropagation()

          const nextWidth = clamp(snapToGrid(startSize.width + deltaX), minWidth, maxWidth)
          const nextHeight = clamp(snapToGrid(startSize.height + deltaY), minHeight, maxHeight)
          applyResizableBlockSize(block, nextWidth, nextHeight)
        }

        const stopResize = () => {
          window.removeEventListener('pointermove', handleMove)
          window.removeEventListener('pointerup', stopResize)
          window.removeEventListener('pointercancel', stopResize)
          block.removeAttribute('data-admin-resizing-block')
          if (!didResize) return

          syncBuilderBlockAttributes(block)
          postToParent({
            type: 'block:update',
            blockId,
            patch: extractBlockPatch(block),
          })
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', stopResize)
        window.addEventListener('pointercancel', stopResize)
      }

      handle.addEventListener('pointerdown', handlePointerDown)
      block.appendChild(handle)

      detailCleanups.push(() => {
        handle.removeEventListener('pointerdown', handlePointerDown)
        handle.remove()
        block.removeAttribute('data-admin-resizing-block')
        if (shouldSetPosition) {
          block.style.position = previousPosition
        }
      })
    }

    const bindLegacyBox = (block: HTMLElement, blockId: string) => {
      block.dataset.adminLegacyBoxId = blockId
      block.dataset.adminEditableBlock = 'true'
      block.dataset.adminEditableLabel = '박스 수정'
      block.contentEditable = 'true'
      block.spellcheck = false

      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null
        if (target?.closest('a,button')) {
          event.preventDefault()
        }
        event.stopPropagation()
        selectBlock(blockId)
      }

      const handleInput = () => {
        sendFullDetailUpdate()
      }

      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null
        if (target?.closest('a,button')) {
          event.preventDefault()
        }

        const startClientX = event.clientX
        const startClientY = event.clientY
        const currentTranslate = readTranslate(block)
        const startX = Number(block.dataset.adminDragX || currentTranslate.x || 0)
        const startY = Number(block.dataset.adminDragY || currentTranslate.y || 0)
        let didDrag = false

        const moveBox = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - startClientX
          const deltaY = moveEvent.clientY - startClientY
          if (!didDrag && Math.hypot(deltaX, deltaY) < 5) return

          didDrag = true
          moveEvent.preventDefault()
          block.contentEditable = 'false'
          const nextX = snapToGrid(startX + deltaX)
          const nextY = snapToGrid(startY + deltaY)
          block.dataset.adminDragX = String(nextX)
          block.dataset.adminDragY = String(nextY)
          block.style.transform = `translate(${nextX}px, ${nextY}px)`
        }

        const stopDrag = () => {
          window.removeEventListener('pointermove', moveBox)
          window.removeEventListener('pointerup', stopDrag)
          window.removeEventListener('pointercancel', stopDrag)
          block.contentEditable = 'true'
          if (didDrag) {
            sendFullDetailUpdate()
          }
        }

        selectBlock(blockId)
        window.addEventListener('pointermove', moveBox)
        window.addEventListener('pointerup', stopDrag)
        window.addEventListener('pointercancel', stopDrag)
      }

      block.addEventListener('click', handleClick)
      block.addEventListener('input', handleInput)
      block.addEventListener('blur', handleInput)
      block.addEventListener('pointerdown', handlePointerDown)

      detailCleanups.push(() => {
        block.removeEventListener('click', handleClick)
        block.removeEventListener('input', handleInput)
        block.removeEventListener('blur', handleInput)
        block.removeEventListener('pointerdown', handlePointerDown)
        block.removeAttribute('contenteditable')
        block.removeAttribute('spellcheck')
        block.removeAttribute('data-admin-selected')
        block.removeAttribute('data-admin-workbench-highlight')
        block.removeAttribute('data-admin-legacy-box-id')
        block.removeAttribute('data-admin-editable-block')
        block.removeAttribute('data-admin-editable-label')
      })
    }

    const bindDetailBlocks = () => {
      detailCleanups.forEach((cleanup) => cleanup())
      detailCleanups = []

      const detailTarget = findDetailTarget()
      if (!detailTarget) return

      const previousDetailPosition = detailTarget.style.position
      const shouldPositionDetail = window.getComputedStyle(detailTarget).position === 'static'
      if (shouldPositionDetail) {
        detailTarget.style.position = 'relative'
      }
      detailTarget.dataset.adminGridOverlay = 'true'
      detailCleanups.push(() => {
        detailTarget.removeAttribute('data-admin-grid-overlay')
        if (shouldPositionDetail) {
          detailTarget.style.position = previousDetailPosition
        }
      })

      const lockedAnimationTargets = findLockedAnimationTargets(detailTarget)
      lockedAnimationTargets.forEach(bindLockedAnimation)

      const blocks = Array.from(detailTarget.querySelectorAll<HTMLElement>('[data-ac-block][data-ac-block-id]'))
      blocks.forEach((block) => {
        const type = block.dataset.acBlock
        const blockId = block.dataset.acBlockId || ''
        if (!blockId) return

        block.dataset.adminEditableBlock = 'true'
        block.dataset.adminEditableLabel = '수정 가능'

        const handleClick = (event: MouseEvent) => {
          event.stopPropagation()
          selectBlock(blockId)
        }
        const handleAnchorClick = (event: MouseEvent) => {
          event.preventDefault()
        }
        const handleUpdate = () => {
          syncBuilderBlockAttributes(block)
          postToParent({
            type: 'block:update',
            blockId,
            patch: extractBlockPatch(block),
          })
        }
        const handleFreeBoxDrag = (event: PointerEvent) => {
          if (type !== 'freebox') return
          const target = event.target as HTMLElement | null
          if (target?.closest('[data-admin-inline-editable="true"], [data-admin-generated-ui="true"]')) return
          const detailFrame = block.closest<HTMLElement>('[data-ac-detail-builder="1"]') || findDetailTarget()
          if (!detailFrame) return

          event.preventDefault()
          event.stopPropagation()
          selectBlock(blockId)

          const frameRect = detailFrame.getBoundingClientRect()
          const startX = Number(block.dataset.x || block.style.left.replace('px', '') || 0)
          const startY = Number(block.dataset.y || block.style.top.replace('px', '') || 0)
          const offsetX = event.clientX - frameRect.left - startX
          const offsetY = event.clientY - frameRect.top - startY

          block.setPointerCapture?.(event.pointerId)

          const moveBox = (moveEvent: PointerEvent) => {
            const maxX = Math.max(detailFrame.clientWidth - block.offsetWidth, 0)
            const maxY = Math.max(detailFrame.scrollHeight - block.offsetHeight, 0)
            const nextX = clamp(moveEvent.clientX - frameRect.left - offsetX, 0, maxX)
            const nextY = clamp(moveEvent.clientY - frameRect.top - offsetY, 0, maxY)
            const roundedX = clamp(snapToGrid(nextX), 0, maxX)
            const roundedY = clamp(snapToGrid(nextY), 0, maxY)

            block.dataset.x = String(roundedX)
            block.dataset.y = String(roundedY)
            block.style.left = `${roundedX}px`
            block.style.top = `${roundedY}px`
          }

          const stopDrag = () => {
            block.removeEventListener('pointermove', moveBox)
            block.removeEventListener('pointerup', stopDrag)
            block.removeEventListener('pointercancel', stopDrag)
            postToParent({
              type: 'block:update',
              blockId,
              patch: extractBlockPatch(block),
            })
          }

          block.addEventListener('pointermove', moveBox)
          block.addEventListener('pointerup', stopDrag)
          block.addEventListener('pointercancel', stopDrag)
        }

        block.addEventListener('click', handleClick)
        block.addEventListener('pointerdown', handleFreeBoxDrag)
        block.querySelectorAll('a').forEach((anchor) => anchor.addEventListener('click', handleAnchorClick))
        bindGeneratedInlineFields(block, type, blockId, handleUpdate)
        bindBuilderBlockReorder(block, blockId)
        bindBuilderBlockResize(block, blockId)
        if (type === 'image') {
          bindImageTool(block, blockId)
        }

        detailCleanups.push(() => {
          block.removeEventListener('click', handleClick)
          block.removeEventListener('pointerdown', handleFreeBoxDrag)
          block.removeAttribute('data-admin-selected')
          block.removeAttribute('data-admin-workbench-highlight')
          block.removeAttribute('data-admin-editable-block')
          block.removeAttribute('data-admin-editable-label')
          block.querySelectorAll('a').forEach((anchor) => anchor.removeEventListener('click', handleAnchorClick))
        })
      })

      if (blocks.length > 0) return

      const legacyBoxTargets = findLegacyBoxTargets(detailTarget)
      legacyBoxTargets.forEach((block, index) => {
        bindLegacyBox(block, `legacy-box-${index}`)
      })

      const legacyBlocks = Array.from(detailTarget.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
      const targets = (legacyBlocks.length > 0 ? legacyBlocks : [detailTarget]).filter((block) => (
        !legacyBoxTargets.some((box) => block !== box && block.contains(box))
      ))
      targets.forEach((block, index) => {
        const blockId = `legacy-${index}`
        block.dataset.adminLegacyBlockId = blockId
        block.dataset.adminEditableBlock = 'true'
        block.dataset.adminEditableLabel = '수정 가능'
        block.contentEditable = 'true'
        block.spellcheck = false

        const handleClick = (event: MouseEvent) => {
          const target = event.target as HTMLElement | null
          if (target?.closest('a,button')) {
            event.preventDefault()
          }
          event.stopPropagation()
          selectBlock(blockId)
        }
        const handleInput = () => {
          sendFullDetailUpdate()
        }
        const handleBlur = () => {
          sendFullDetailUpdate()
        }

        block.addEventListener('click', handleClick)
        block.addEventListener('input', handleInput)
        block.addEventListener('blur', handleBlur)

        detailCleanups.push(() => {
          block.removeEventListener('click', handleClick)
          block.removeEventListener('input', handleInput)
          block.removeEventListener('blur', handleBlur)
          block.removeAttribute('contenteditable')
          block.removeAttribute('spellcheck')
          block.removeAttribute('data-admin-selected')
          block.removeAttribute('data-admin-workbench-highlight')
          block.removeAttribute('data-admin-legacy-block-id')
          block.removeAttribute('data-admin-editable-block')
          block.removeAttribute('data-admin-editable-label')
        })
      })
    }

    const bindLockedBlocks = () => {
      lockedCleanups.forEach((cleanup) => cleanup())
      lockedCleanups = []

      const candidates = Array.from(document.querySelectorAll<HTMLElement>(
        'header, footer, main > section, main > article, main > nav, main > aside',
      ))
      const detailTarget = findDetailTarget()

      candidates.forEach((element) => {
        if (element.matches('[data-admin-editable], [data-admin-editable-block="true"], [data-admin-field-editable="true"], [data-admin-product-image-editable="true"], [data-admin-page-editable="true"], [data-admin-page-position-field]')) return
        if (element.closest('[data-admin-editing-ui="true"], [data-admin-editable-block="true"], [data-admin-field-editable="true"], [data-admin-product-image-editable="true"], [data-admin-page-editable="true"], [data-admin-page-position-field]')) return
        if (element.querySelector('[data-admin-editable], [data-admin-editable-block="true"], [data-admin-field-editable="true"], [data-admin-inline-editable="true"], [data-admin-product-image-editable="true"], [data-admin-page-editable="true"], [data-admin-page-position-field]')) return
        if (detailTarget && (element.contains(detailTarget) || detailTarget.contains(element))) return
        if (element.dataset.adminLockedBlock === 'true') return

        const previousPosition = element.style.position
        const shouldSetPosition = window.getComputedStyle(element).position === 'static'
        if (shouldSetPosition) {
          element.style.position = 'relative'
        }
        element.dataset.adminLockedBlock = 'true'
        lockedCleanups.push(() => {
          element.removeAttribute('data-admin-locked-block')
          if (shouldSetPosition) {
            element.style.position = previousPosition
          }
        })
      })
    }

    const sendDetailSource = () => {
      const detailTarget = findDetailTarget()
      if (!detailTarget) return
      postToParent({
        type: 'detail:source',
        html: cleanDetailHtml(),
        hasBuilder: !!detailTarget.querySelector('[data-ac-detail-builder="1"]'),
      })
    }

    const getDetailSignature = () => {
      const detailTarget = findDetailTarget()
      if (!detailTarget) return ''

      const builderBlocks = Array.from(detailTarget.querySelectorAll<HTMLElement>('[data-ac-block][data-ac-block-id]'))
      if (builderBlocks.length > 0) {
        return builderBlocks
          .map((block) => `${block.dataset.acBlockId || ''}:${block.dataset.acBlock || ''}`)
          .join('|')
      }

      return `legacy:${detailTarget.children.length}:${detailTarget.textContent?.length || 0}`
    }

    const applyPendingPreview = () => {
      if (!pendingPreviewHtml) return false
      const detailTarget = findDetailTarget()
      if (!detailTarget) return false

      const html = pendingPreviewHtml
      const replace = pendingPreviewReplace
      pendingPreviewHtml = null
      pendingPreviewReplace = false

      if (replace || isBuilderHtml(html)) {
        detailTarget.innerHTML = html
        return true
      }

      return false
    }

    const bindDetailWhenReady = (force = false) => {
      const detailTarget = findDetailTarget()
      if (!detailTarget) return false

      const didApplyPendingPreview = applyPendingPreview()
      const signature = getDetailSignature()
      if (!signature) return false
      if (!force && !didApplyPendingPreview && signature === lastBoundDetailSignature) return false

      bindDetailBlocks()
      bindLockedBlocks()
      lastBoundDetailSignature = getDetailSignature()
      sendDetailSource()
      return true
    }

    const scheduleDetailRebind = (force = false) => {
      if (rebindTimer) {
        window.clearTimeout(rebindTimer)
      }
      rebindTimer = window.setTimeout(() => {
        rebindTimer = null
        bindDetailWhenReady(force)
      }, 120)
    }

    const detailObserver = new MutationObserver((mutations) => {
      const shouldRebind = mutations.some((mutation) => {
        if (mutation.type !== 'childList') return false
        const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)]
        return nodes.some((node) => {
          if (!(node instanceof HTMLElement)) return false
          if (node.matches('[data-admin-generated-ui="true"], [data-admin-editing-ui="true"]')) return false
          if (node.closest('[data-admin-generated-ui="true"], [data-admin-editing-ui="true"]')) return false
          return Boolean(
            node.matches('[data-admin-editable="detail_html"], [data-ac-block], .custom-detail-content') ||
            node.querySelector('[data-admin-editable="detail_html"], [data-ac-block], .custom-detail-content'),
          )
        })
      })
      const shouldRebindPageFields = mutations.some((mutation) => {
        if (mutation.type !== 'childList') return false
        const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)]
        return nodes.some((node) => {
          if (!(node instanceof HTMLElement)) return false
          if (node.matches('[data-admin-generated-ui="true"], [data-admin-editing-ui="true"]')) return false
          return Boolean(
            node.matches('[data-admin-page-field], [data-admin-page-position-field]') ||
            node.querySelector('[data-admin-page-field], [data-admin-page-position-field]'),
          )
        })
      })
      if (shouldRebind) {
        scheduleDetailRebind()
      }
      if (shouldRebindPageFields) {
        window.setTimeout(bindPageFields, 0)
      }
    })
    detailObserver.observe(document.body, { childList: true, subtree: true })
    cleanups.push(() => {
      detailObserver.disconnect()
      if (rebindTimer) {
        window.clearTimeout(rebindTimer)
      }
    })

    const handleParentMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const message = event.data as {
        source?: string
        type?: string
        slug?: string
        html?: string
        content?: Partial<ProductPageContent>
        name?: string
        pageField?: string
        pagePositionField?: ProductPagePositionField
        blockId?: string
        replace?: boolean
        scroll?: boolean
      }
      if (message?.source !== 'acscent-admin-parent' || message.slug !== productSlug) return

      if (message.type === 'page:content' && message.content) {
        applyPageContent(message.content)
        return
      }

      if (message.type === 'product:name-preview' && typeof message.name === 'string') {
        const nextName = message.name
        document.querySelectorAll<HTMLElement>('[data-admin-editable="product_name"]').forEach((element) => {
          if (element.textContent !== nextName) {
            element.textContent = nextName
          }
        })
        return
      }

      if (message.type === 'page:focus') {
        focusPageTarget(message.pageField, message.pagePositionField, !!message.scroll)
        return
      }

      if (message.type === 'detail:preview') {
        const detailTarget = findDetailTarget()
        if (typeof message.html !== 'string') return
        if (!detailTarget) {
          pendingPreviewHtml = message.html
          pendingPreviewReplace = !!message.replace
          scheduleDetailRebind(true)
          return
        }
        if (!message.replace && !isBuilderHtml(message.html)) {
          bindDetailWhenReady(true)
          return
        }
        detailTarget.innerHTML = message.html
        bindDetailWhenReady(true)
        return
      }

      if (message.type === 'block:select' && message.blockId) {
        selectBlock(message.blockId, false)
        highlightWorkbenchTarget(message.blockId, true)
        return
      }

      if (message.type === 'block:highlight') {
        highlightWorkbenchTarget(message.blockId, !!message.scroll)
      }
    }

    window.addEventListener('message', handleParentMessage)
    cleanups.push(() => window.removeEventListener('message', handleParentMessage))

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target || target.closest('[data-admin-editing-ui="true"]')) return
      if (target.closest('[data-admin-editable-block="true"], [data-admin-field-editable="true"], [data-admin-product-image-editable="true"], [data-admin-page-editable="true"], [data-admin-page-position-field]')) return

      const lockedTarget = target.closest<HTMLElement>('section, header, footer, main, article, nav, aside, div')
      if (!lockedTarget) return
      event.preventDefault()
      event.stopPropagation()
      showLockedFeedback(lockedTarget)
    }

    document.addEventListener('click', handleDocumentClick, true)
    cleanups.push(() => document.removeEventListener('click', handleDocumentClick, true))

    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-admin-editable]'))

    elements.forEach((element) => {
      const field = element.dataset.adminEditable as EditableField | undefined
      if (field !== 'product_name' && field !== 'detail_html') return
      if (field === 'detail_html') return

      element.contentEditable = 'true'
      element.spellcheck = false
      element.setAttribute('role', 'textbox')
      element.dataset.adminFieldEditable = 'true'
      element.dataset.adminEditableField = field
      element.dataset.adminEditableLabel = field === 'product_name' ? '상품명 수정' : '수정 가능'

      const sendUpdate = (commit: boolean) => {
        const payload = getFieldPayload(element, field)
        postToParent({ type: 'field:update', field, commit, ...payload })
      }

      let isDirty = false
      const handleFocusSection = () => {
        if (field === 'product_name') {
          focusEditorSection('page', { pageField: 'productName' })
        }
      }
      const handleInput = () => {
        isDirty = true
      }
      const handleBlur = () => {
        if (!isDirty) return
        isDirty = false
        sendUpdate(true)
      }

      element.addEventListener('click', handleFocusSection)
      element.addEventListener('focus', handleFocusSection)
      element.addEventListener('input', handleInput)
      element.addEventListener('blur', handleBlur)
      cleanups.push(() => {
        element.removeEventListener('click', handleFocusSection)
        element.removeEventListener('focus', handleFocusSection)
        element.removeEventListener('input', handleInput)
        element.removeEventListener('blur', handleBlur)
        element.removeAttribute('contenteditable')
        element.removeAttribute('role')
        element.removeAttribute('data-admin-field-editable')
        element.removeAttribute('data-admin-editable-field')
        element.removeAttribute('data-admin-editable-label')
      })
    })

    window.setTimeout(() => {
      bindPageFields()
      bindDetailWhenReady(true)
      sendPageContentSource()
      postToParent({ type: 'preview:ready' })
    }, 0)

    return () => {
      if (lockedTimer) window.clearTimeout(lockedTimer)
      lockedElement?.removeAttribute('data-admin-locked-pulse')
      document.querySelectorAll<HTMLElement>('[data-admin-workbench-highlight="true"]').forEach((element) => {
        element.removeAttribute('data-admin-workbench-highlight')
      })
      detailCleanups.forEach((cleanup) => cleanup())
      pageFieldCleanups.forEach((cleanup) => cleanup())
      lockedCleanups.forEach((cleanup) => cleanup())
      cleanups.forEach((cleanup) => cleanup())
      lockedToast.remove()
      delete document.body.dataset.adminPreviewEditing
      style.remove()
    }
  }, [productSlug])

  return null
}
