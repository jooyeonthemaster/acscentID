'use client'

export default function EditorStyles() {
  return (
    <style jsx global>{`
      .tiptap {
        outline: none;
      }
      .tiptap p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        float: left;
        color: #94a3b8;
        pointer-events: none;
        height: 0;
        font-style: italic;
      }
      .tiptap img {
        max-width: 100%;
        height: auto;
        cursor: default;
      }
      .tiptap img.ProseMirror-selectednode {
        outline: 3px solid #FCD34D;
        outline-offset: 2px;
      }
      .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; }
      .tiptap h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
      .tiptap h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
      .tiptap p { margin-bottom: 0.5rem; line-height: 1.7; }
      .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
      .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
      .tiptap li { margin-bottom: 0.25rem; }
      .tiptap hr { border-color: #e2e8f0; margin: 1rem 0; }
      .tiptap a { color: #2563eb; text-decoration: underline; }
      .tiptap mark { padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
      .tiptap blockquote {
        border-left: 3px solid #e2e8f0;
        padding-left: 1rem;
        color: #64748b;
        font-style: italic;
      }

      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
  )
}
