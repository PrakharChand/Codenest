import React from 'react';
import MDEditor from '@uiw/react-md-editor';

export default function MarkdownView({ source = '', className = '' }) {
  return (
    <div className={`prose max-w-none text-main ${className}`} data-color-mode="auto">
      <MDEditor.Markdown source={source} style={{ backgroundColor: 'transparent', color: 'inherit' }} />
    </div>
  );
}
