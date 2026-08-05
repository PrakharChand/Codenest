/**
 * client/src/components/organisms/MarkdownView.jsx
 *
 * Renders markdown content with:
 *  - GFM (tables, task lists, strikethrough)
 *  - Syntax-highlighted code fences (highlight.js github-dark theme)
 *  - Preserved whitespace, paragraph spacing, line breaks
 *
 * Usage: <MarkdownView source={post.content} />
 *        <MarkdownView content={post.content} />  ← both props work
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export default function MarkdownView({ source, content, className = '' }) {
  const text = source ?? content ?? '';
  if (!text) return null;

  return (
    <div className={`markdown-body prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ node, ...props }) => (
            <p className="text-sm text-muted leading-relaxed mb-3 last:mb-0" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold text-main mt-5 mb-3" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold text-main mt-4 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-semibold text-main mt-3 mb-2" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre
              className="rounded-lg overflow-x-auto text-xs my-4 border border-[var(--border-main)]"
              style={{
                backgroundColor: '#0d1117',
                whiteSpace: 'pre',
                overflowX: 'auto',
                wordBreak: 'normal',
                wordWrap: 'normal',
                tabSize: 4,
              }}
              {...props}
            />
          ),
          code: ({ node, inline, className: langClass, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className="rounded px-1.5 py-0.5 text-xs font-mono"
                  style={{
                    backgroundColor: 'var(--bg-surface-hover)',
                    color: 'var(--color-primary)',
                    border: '1px solid var(--border-main)',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`${langClass || ''} block p-4 text-xs font-mono leading-relaxed`}
                style={{
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                  wordBreak: 'normal',
                  wordWrap: 'normal',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary pl-4 my-4 text-muted text-sm italic"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-muted" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-muted" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-sm text-muted leading-relaxed" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-main my-4" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm border-collapse" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-main px-3 py-2 text-left font-semibold text-main bg-surface-hover" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-main px-3 py-2 text-muted" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-main" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-muted" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
