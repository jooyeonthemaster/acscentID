'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'

interface CustomDetailRendererProps {
  html: string
}

export function CustomDetailRenderer({ html }: CustomDetailRendererProps) {
  const sanitizedHtml = useMemo(() => {
    if (typeof window === 'undefined') return html
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ['img', 'mark'],
      ADD_ATTR: ['style', 'class', 'data-color', 'target', 'rel'],
      ALLOW_DATA_ATTR: true,
    })
  }, [html])

  return (
    <section className="py-8 px-4 bg-white">
      <div className="w-full max-w-[455px] mx-auto">
        <div
          className="custom-detail-content"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>

      <style jsx global>{`
        .custom-detail-content {
          font-family: inherit;
          color: #1a1a1a;
          line-height: 1.7;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        /* Headings */
        .custom-detail-content h1 {
          font-size: 1.75rem;
          font-weight: 900;
          margin: 1.5rem 0 0.75rem;
          line-height: 1.3;
          color: #000;
        }

        .custom-detail-content h2 {
          font-size: 1.375rem;
          font-weight: 900;
          margin: 1.25rem 0 0.625rem;
          line-height: 1.3;
          color: #000;
        }

        .custom-detail-content h3 {
          font-size: 1.125rem;
          font-weight: 800;
          margin: 1rem 0 0.5rem;
          line-height: 1.4;
          color: #000;
        }

        /* Paragraphs */
        .custom-detail-content p {
          margin: 0.5rem 0;
          font-size: 0.9375rem;
          line-height: 1.7;
        }

        .custom-detail-content p:empty {
          min-height: 1rem;
        }

        /* Bold, Italic, Underline, Strikethrough */
        .custom-detail-content strong {
          font-weight: 800;
        }

        .custom-detail-content em {
          font-style: italic;
        }

        .custom-detail-content u {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .custom-detail-content s {
          text-decoration: line-through;
        }

        /* Images - responsive */
        .custom-detail-content img {
          max-width: 100%;
          height: auto !important;
          margin: 1rem 0;
          display: block;
        }

        /* GIFs and images with explicit width from editor */
        .custom-detail-content img[style*="width"] {
          max-width: 100%;
        }

        /* Links */
        .custom-detail-content a {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.15s;
        }

        .custom-detail-content a:hover {
          color: #1d4ed8;
        }

        /* Lists */
        .custom-detail-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        .custom-detail-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        .custom-detail-content li {
          margin: 0.375rem 0;
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .custom-detail-content li p {
          margin: 0;
        }

        /* Horizontal rule */
        .custom-detail-content hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1.5rem 0;
        }

        /* Highlighted text (TipTap mark) */
        .custom-detail-content mark,
        .custom-detail-content mark[data-color] {
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          background-color: #fef08a;
        }

        /* Colored text - inline styles from TipTap handle this,
           but ensure spans with color styles are visible */
        .custom-detail-content span[style*="color"] {
          /* let inline style take effect */
        }

        /* Text alignment - inline styles from TipTap */
        .custom-detail-content p[style*="text-align: center"],
        .custom-detail-content h1[style*="text-align: center"],
        .custom-detail-content h2[style*="text-align: center"],
        .custom-detail-content h3[style*="text-align: center"] {
          text-align: center;
        }

        .custom-detail-content p[style*="text-align: right"],
        .custom-detail-content h1[style*="text-align: right"],
        .custom-detail-content h2[style*="text-align: right"],
        .custom-detail-content h3[style*="text-align: right"] {
          text-align: right;
        }

        /* Blockquote if used */
        .custom-detail-content blockquote {
          border-left: 4px solid #000;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #4b5563;
        }

        /* Code if used */
        .custom-detail-content code {
          background-color: #f1f5f9;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-family: ui-monospace, monospace;
        }

        .custom-detail-content pre {
          background-color: #1e293b;
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .custom-detail-content pre code {
          background: none;
          padding: 0;
          color: inherit;
        }

        /* Table if used */
        .custom-detail-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .custom-detail-content th,
        .custom-detail-content td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-size: 0.875rem;
        }

        .custom-detail-content th {
          background-color: #f8fafc;
          font-weight: 700;
        }

        /* First and last child margin cleanup */
        .custom-detail-content > *:first-child {
          margin-top: 0;
        }

        .custom-detail-content > *:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </section>
  )
}
