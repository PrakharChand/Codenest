import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

/**
 * CodeBlock — Dedicated syntax-highlighted code renderer for CodeNest.
 * Preserves 100% exact whitespace, line breaks, and indentation.
 * Supports horizontal scrolling without unexpected wrapping.
 */
export default function CodeBlock({ code = '', language = 'plaintext', className = '' }) {
  const codeRef = useRef(null);

  const rawCode = typeof code === 'string' ? code : String(code || '');

  useEffect(() => {
    if (codeRef.current && rawCode) {
      delete codeRef.current.dataset.highlighted;
      try {
        if (language && hljs.getLanguage(language.toLowerCase())) {
          codeRef.current.className = `language-${language.toLowerCase()} font-mono text-xs text-[#e6edf3]`;
        } else {
          codeRef.current.className = 'font-mono text-xs text-[#e6edf3]';
        }
        hljs.highlightElement(codeRef.current);
      } catch (err) {
        // Fail-safe: raw rendering
      }
    }
  }, [rawCode, language]);

  if (!rawCode) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    toast.success('Code copied to clipboard!');
  };

  return (
    <div className={`relative group rounded-xl border border-[var(--border-main)] bg-[#0d1117] overflow-hidden ${className}`}>
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="ml-2 font-bold uppercase tracking-wider text-[var(--color-primary)] text-[11px]">
            {language || 'code'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white transition-colors text-[11px] font-semibold"
          title="Copy full source code"
        >
          <span>📋</span>
          <span>Copy</span>
        </button>
      </div>

      {/* Code Content Container with strict CSS rules */}
      <div className="overflow-x-auto p-4 max-w-full bg-[#0d1117]">
        <pre
          className="m-0 font-mono text-xs leading-relaxed"
          style={{
            whiteSpace: 'pre',
            overflowX: 'auto',
            wordBreak: 'normal',
            wordWrap: 'normal',
            tabSize: 4,
          }}
        >
          <code
            ref={codeRef}
            style={{
              whiteSpace: 'pre',
              overflowX: 'auto',
              wordBreak: 'normal',
              wordWrap: 'normal',
              display: 'block',
              padding: 0,
              backgroundColor: 'transparent',
            }}
          >
            {rawCode}
          </code>
        </pre>
      </div>
    </div>
  );
}
