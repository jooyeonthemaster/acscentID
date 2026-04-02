'use client'

import { useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ImageIcon,
  Link as LinkIcon,
  Minus,
  Undo2,
  Redo2,
  Palette,
  Highlighter,
  Loader2,
  Unlink,
  Maximize2,
} from 'lucide-react'

// ─── Color Palette ──────────────────────────────────────────────────────────

const TEXT_COLORS = [
  { label: '검정', value: '#000000' },
  { label: '흰색', value: '#FFFFFF' },
  { label: '빨강', value: '#EF4444' },
  { label: '파랑', value: '#3B82F6' },
  { label: '초록', value: '#22C55E' },
  { label: '노랑', value: '#EAB308' },
  { label: '보라', value: '#A855F7' },
  { label: '주황', value: '#F97316' },
  { label: '핑크', value: '#EC4899' },
  { label: '회색', value: '#6B7280' },
]

const HIGHLIGHT_COLORS = [
  { label: '없음', value: '' },
  { label: '노랑', value: '#FEF08A' },
  { label: '초록', value: '#BBF7D0' },
  { label: '파랑', value: '#BFDBFE' },
  { label: '핑크', value: '#FBCFE8' },
  { label: '보라', value: '#E9D5FF' },
  { label: '주황', value: '#FED7AA' },
  { label: '빨강', value: '#FECACA' },
]

// ─── Types ──────────────────────────────────────────────────────────────────

interface EditorToolbarProps {
  editor: Editor | null
  onImageUpload: (file: File) => Promise<string>
  uploading: boolean
}

// ─── Toolbar Button ─────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex-shrink-0 p-2 rounded-lg transition-all text-sm
        ${isActive
          ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
          : 'hover:bg-slate-100 text-slate-600 border border-transparent'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-200 flex-shrink-0 mx-1" />
}

// ─── Color Picker Dropdown ──────────────────────────────────────────────────

function ColorPickerDropdown({
  colors,
  activeColor,
  onSelect,
  icon,
  title,
}: {
  colors: { label: string; value: string }[]
  activeColor: string | undefined
  onSelect: (color: string) => void
  icon: React.ReactNode
  title: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }, [])

  return (
    <div className="relative flex-shrink-0" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
        title={title}
        className={`
          flex items-center gap-1 p-2 rounded-lg transition-all text-sm
          ${open
            ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
            : 'hover:bg-slate-100 text-slate-600 border border-transparent'
          }
        `}
      >
        {icon}
        {activeColor && (
          <div
            className="w-3 h-3 rounded-full border border-slate-300"
            style={{ backgroundColor: activeColor }}
          />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg p-2 z-50 grid grid-cols-5 gap-1 min-w-[160px]">
          {colors.map((c) => (
            <button
              key={c.value || 'none'}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(c.value)
                setOpen(false)
              }}
              title={c.label}
              className={`
                w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center
                ${activeColor === c.value ? 'border-yellow-400 scale-110' : 'border-slate-200 hover:border-slate-400'}
              `}
              style={{ backgroundColor: c.value || 'transparent' }}
            >
              {!c.value && (
                <span className="text-xs text-slate-400">X</span>
              )}
              {c.value === '#FFFFFF' && (
                <div className="w-5 h-5 rounded border border-slate-200" style={{ backgroundColor: '#FFFFFF' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Toolbar Component ─────────────────────────────────────────────────

export default function EditorToolbar({ editor, onImageUpload, uploading }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkRef = useRef<HTMLDivElement>(null)

  if (!editor) return null

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      alert('JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하여야 합니다.')
      return
    }

    try {
      const url = await onImageUpload(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch {
      alert('이미지 업로드에 실패했습니다.')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleLinkSubmit = () => {
    if (linkUrl) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
    }
    setLinkUrl('')
    setLinkDialogOpen(false)
  }

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run()
    setLinkDialogOpen(false)
  }

  const openLinkDialog = () => {
    const existing = editor.getAttributes('link').href || ''
    setLinkUrl(existing)
    setLinkDialogOpen(true)
  }

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="flex items-center gap-0.5 p-2 overflow-x-auto scrollbar-hide">
        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="실행취소 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="다시실행 (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="굵게 (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="기울임 (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="밑줄 (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="취소선"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="제목 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="제목 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="제목 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="왼쪽 정렬"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="가운데 정렬"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="오른쪽 정렬"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Colors */}
        <ColorPickerDropdown
          colors={TEXT_COLORS}
          activeColor={editor.getAttributes('textStyle').color}
          onSelect={(color) => editor.chain().focus().setColor(color).run()}
          icon={<Palette className="w-4 h-4" />}
          title="글자 색상"
        />
        <ColorPickerDropdown
          colors={HIGHLIGHT_COLORS}
          activeColor={editor.getAttributes('highlight').color}
          onSelect={(color) => {
            if (color) {
              editor.chain().focus().toggleHighlight({ color }).run()
            } else {
              editor.chain().focus().unsetHighlight().run()
            }
          }}
          icon={<Highlighter className="w-4 h-4" />}
          title="하이라이트"
        />

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="글머리 기호"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="번호 목록"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Image Upload */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="이미지 삽입"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Link */}
        <div className="relative flex-shrink-0" ref={linkRef}>
          <ToolbarButton
            onClick={openLinkDialog}
            isActive={editor.isActive('link')}
            title="링크 삽입"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          {linkDialogOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg p-3 z-50 min-w-[280px]">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLinkSubmit()
                    if (e.key === 'Escape') setLinkDialogOpen(false)
                  }}
                  placeholder="https://example.com"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleLinkSubmit}
                  className="px-3 py-2 bg-yellow-400 text-slate-900 rounded-lg text-sm font-medium hover:bg-yellow-500 transition-colors"
                >
                  확인
                </button>
                {editor.isActive('link') && (
                  <button
                    type="button"
                    onClick={handleUnlink}
                    title="링크 제거"
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Horizontal Rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="구분선"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

      </div>

      {/* ── 2단: 이미지 컨트롤 ──────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 pb-2 pt-0.5 border-t border-slate-100">
        <span className="text-[10px] font-bold text-blue-600 px-1 flex-shrink-0 flex items-center gap-0.5">
          <Maximize2 className="w-3 h-3" />
          IMG
        </span>

        {/* 이미지 정렬 */}
        {[
          { align: 'left', icon: AlignLeft, label: '이미지 왼쪽 정렬' },
          { align: 'center', icon: AlignCenter, label: '이미지 가운데 정렬' },
          { align: 'right', icon: AlignRight, label: '이미지 오른쪽 정렬' },
        ].map(({ align, icon: Icon, label }) => (
          <button
            key={`img-align-${align}`}
            type="button"
            onClick={() => {
              const styleMap: Record<string, string> = {
                left: 'display: block; margin-left: 0; margin-right: auto;',
                center: 'display: block; margin-left: auto; margin-right: auto;',
                right: 'display: block; margin-left: auto; margin-right: 0;',
              }
              editor.chain().focus().updateAttributes('image', { style: styleMap[align] }).run()
            }}
            title={label}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}

        {/* 이미지 크기 */}
        {['25%', '50%', '75%', '100%'].map((size) => (
          <button
            key={`img-size-${size}`}
            type="button"
            onClick={() => {
              editor.chain().focus().updateAttributes('image', {
                style: `width: ${size}; height: auto; display: block; margin-left: auto; margin-right: auto;`,
              }).run()
            }}
            title={`이미지 ${size} 크기`}
            className="flex-shrink-0 px-1.5 py-1 rounded-lg hover:bg-blue-50 text-blue-600 text-[10px] font-bold transition-colors border border-blue-200"
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  )
}
