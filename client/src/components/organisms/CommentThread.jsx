import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';
import TextArea from '../atoms/TextArea';
import Spinner from '../atoms/Spinner';
import { commentsApi } from '../../api/commentsApi';
import { useAuth } from '../../context/AuthContext';

export default function CommentThread({ postId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadComments() {
      try {
        const res = await commentsApi.list(postId);
        setComments(res.data || []);
      } catch (err) {
        // Fallback to empty list
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
      setComments((prev) => [newComment, ...prev]);
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

  return (
    <div className="space-y-6 pt-6 border-t border-main">
      <h3 className="text-lg font-bold text-main">
        Comments ({comments.length})
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
        <div className="rounded-lg border border-main bg-surface-subtle p-4 text-center text-sm text-muted">
          Please{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            sign in
          </Link>{' '}
          to join the discussion.
        </div>
      )}

      {/* Comment List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-subtle py-4 text-center">No comments yet. Be the first to start the conversation!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 rounded-lg border border-main bg-surface p-4 text-main">
              <Avatar src={comment.author_avatar_url} name={comment.author_name} size="sm" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-main">{comment.author_name}</span>
                    <span className="text-xs text-subtle">
                      {comment.created_at
                        ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
                        : 'recently'}
                    </span>
                  </div>
                  {user && user.id === comment.user_id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted whitespace-pre-line">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
