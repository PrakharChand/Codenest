import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Button from '../atoms/Button';

/**
 * ChatLimitModal — Displayed when user reaches the 5 saved conversation limit.
 * Prompts user to select a conversation to delete before creating a new chat.
 */
export default function ChatLimitModal({
  isOpen,
  onClose,
  conversations = [],
  onDeleteConversation,
  onDeleteOldest,
}) {
  const [deletingId, setDeletingId] = useState(null);

  if (!isOpen) return null;

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await onDeleteConversation(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteOldest = async () => {
    setDeletingId('oldest');
    try {
      await onDeleteOldest();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="space-y-1.5 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-base">
            <span className="text-xl">⚠️</span>
            <h3>Conversation Limit Reached</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            You already have <strong>5 saved conversations</strong>. Please select one to delete before creating a new conversation.
          </p>
        </div>

        {/* Conversation List */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {conversations.map((conv) => {
            const age = conv.created_at
              ? formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })
              : 'recently';

            return (
              <div
                key={conv.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface-subtle)] hover:border-[var(--color-primary)] transition-all"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <h4 className="text-sm font-semibold text-[var(--text-main)] truncate">
                    {conv.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)] mt-0.5">
                    <span>{age}</span>
                    <span>•</span>
                    <span>{conv.message_count || 0} messages</span>
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  isLoading={deletingId === conv.id}
                  onClick={() => handleDelete(conv.id)}
                >
                  Delete
                </Button>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-main)]">
          <Button
            variant="secondary"
            size="sm"
            isLoading={deletingId === 'oldest'}
            onClick={handleDeleteOldest}
          >
            🗑️ Delete Oldest
          </Button>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
