import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';

export default function MarkdownEditor({ value = '', onChange, placeholder = 'Write in markdown...', height = 300 }) {
  const [tab, setTab] = useState('write'); // 'write' | 'preview' for small screens

  return (
    <div className="w-full space-y-2">
      {/* Mobile Tab Toggle Bar */}
      <div className="flex md:hidden border-b border-main pb-2 gap-2">
        <button
          type="button"
          onClick={() => setTab('write')}
          className={`px-3 py-1 text-xs font-medium rounded-md ${
            tab === 'write' ? 'bg-primary text-white' : 'text-muted hover:text-main'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-3 py-1 text-xs font-medium rounded-md ${
            tab === 'preview' ? 'bg-primary text-white' : 'text-muted hover:text-main'
          }`}
        >
          Preview
        </button>
      </div>

      <div className="rounded-md border border-main bg-surface text-main overflow-hidden">
        <MDEditor
          value={value}
          onChange={onChange}
          height={height}
          preview={tab === 'preview' ? 'preview' : 'live'}
          textareaProps={{
            placeholder,
          }}
          style={{ backgroundColor: 'transparent', color: 'inherit' }}
        />
      </div>
    </div>
  );
}
