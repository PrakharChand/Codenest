/**
 * client/src/components/organisms/CommentThread.jsx
 *
 * Comment thread with date group labels.
 * Comments are grouped by day: "Today", "Yesterday", or "Month Day, Year".
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';
import TextArea from '../atoms/TextArea';
import Spinner from '../atoms/Spinner';
import { commentsApi } from '../../api/commentsApi';
import { useAuth } from '../../context/AuthContext';

// ── Date label helpers ─────────────────────────────────────────────────────

/** Returns a friendly day label for a Date object */
function getDayLabel(date) {
  if (isToday(date))     return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

/** Returns the date key (YYYY-MM-DD) for grouping */
function getDayKey(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

/** Groups an array of comments into ordered day buckets */
function groupCommentsByDay(comments) {
  const groups = [];
  const seen   = {};

  for (const comment of comments) {
    const key = getDayKey(comment.created_at);
    if (!seen[key]) {
      seen[key] = true;
      groups.push({ key, label: getDayLabel(new Date(comment.created_at)), comments: [] });
    }
    groups[groups.length - 1].comments.push(comment);
  }

  return groups;
}

// ── Date Divider ──────────────────────────────────────────────────────────

function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-[var(--border-main)]" />
      <span className="text-[10px] font-semibold tracking-widest uppercase text-subtle px-2 rounded-full border border-[var(--border-main)] py-0.5">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border-main)]" />
    </div>
  );
}

// ── Single Comment ─────────────────────────────────────────────────────────

function CommentItem({ comment, currentUser, onDelete }) {
  const isOwner = currentUser && currentUser.id === comment.author_id;
  const timeAgo = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
    : 'recently';

  return (
    <div className="flex gap-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 transition-colors hover:bg-[var(--bg-surface-hover)]">
      <Link to={`/users/${comment.author_id}`} className="shrink-0">
        <Avatar src={comment.author_avatar_url} name={comment.author_name} size="sm" />
      </Link>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Link
              to={`/users/${comment.author_id}`}
              className="text-sm font-semibold text-main hover:text-primary transition-colors truncate"
            >
              {comment.author_name}
            </Link>
            <span className="text-xs text-subtle shrink-0">{timeAgo}</span>
          </div>
          {isOwner && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-danger hover:underline shrink-0"
            >
              Delete
            </button>
          )}
        </div>
        <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CommentThread({ postId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [content,  setContent]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    async function loadComments() {
      try {
        const res = await commentsApi.list(postId);
        // API may return { data: [...] } or [...] directly
        const list = Array.isArray(res) ? res : (res.data || []);
        // Sort oldest → newest so day groups read chronologically
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setComments(list);
      } catch {
        setComments([]);
      } finally {
        setLoading(false);
      }
    }
    loadComments();
  }, [postId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const newComment = await commentsApi.create(postId, { content: content.trim() });
      // Append at end (chronological order)
      setComments((prev) => [...prev, newComment]);
      setContent('');
    } catch (err) {
      setError(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (confirm('Delete this comment?')) {
      const original = [...comments];
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      try {
        await commentsApi.remove(commentId);
      } catch (err) {
        setComments(original);
        alert(err.message || 'Could not delete comment.');
      }
    }
  };

  const groups = groupCommentsByDay(comments);

  return (
    <div className="space-y-6 pt-6 border-t border-[var(--border-main)]">
      <h3 className="text-lg font-bold text-main">
        Comments {comments.length > 0 && <span className="text-muted font-normal text-base">({comments.length})</span>}
      </h3>

      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleAddComment} className="space-y-3">
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a constructive comment..."
            rows={3}
            error={error}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Post Comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface-subtle)] p-4 text-center text-sm text-muted">
          Please{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            sign in
          </Link>{' '}
          to join the discussion.
        </div>
      )}

      {/* Comment List with Date Groups */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-subtle py-4 text-center">
          No comments yet. Be the first to start the conversation!
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <DateDivider label={group.label} />
              {group.comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUser={user}
                  onDelete={handleDeleteComment}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
