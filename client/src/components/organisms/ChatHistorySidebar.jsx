import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Button from '../atoms/Button';

/**
 * ChatHistorySidebar — Manages active conversations for CodeNest Guide / Shadow Mentor.
 */
export default function ChatHistorySidebar({
  mode = 'feed',
  conversations = [],
  activeId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = async (id, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-full lg:w-72 flex-shrink-0 flex flex-col rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] overflow-hidden h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-main)] space-y-3 bg-[var(--bg-surface-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none">{mode === 'shadow' ? '🥷' : '🤖'}</span>
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              {mode === 'shadow' ? 'Shadow History' : 'Guide History'}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface-hover)] text-[var(--text-muted)] border border-[var(--border-main)]">
            {conversations.length}/5
          </span>
        </div>

        <Button variant="primary" size="sm" className="w-full" onClick={onNewChat}>
          + New Conversation
        </Button>

        {/* Search */}
        {conversations.length > 0 && (
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] italic">
            {conversations.length === 0 ? 'No saved chats yet. Start a new conversation!' : 'No matching chats found.'}
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeId;
            const isEditing = conv.id === editingId;
            const age = conv.created_at
              ? formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })
              : 'recently';

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 border ${
                  isActive
                    ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)] text-[var(--color-primary)] font-semibold shadow-sm'
                    : 'bg-[var(--bg-surface-subtle)] border-transparent hover:border-[var(--border-main)] text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename(conv.id, e)}
                      onBlur={(e) => saveRename(conv.id, e)}
                      autoFocus
                      className="w-full px-2 py-0.5 rounded border border-[var(--color-primary)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] focus:outline-none"
                    />
                  ) : (
                    <>
                      <h4 className="text-xs font-semibold truncate leading-snug">
                        {conv.title}
                      </h4>
                      <span className="text-[10px] text-[var(--text-subtle)] block mt-0.5">
                        {age}
                      </span>
                    </>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => startRename(conv, e)}
                      className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs"
                      title="Rename conversation"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1 rounded hover:bg-rose-500/10 text-rose-500 text-xs"
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
