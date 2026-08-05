import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import Modal from '../molecules/Modal';
import { postsApi } from '../../api/postsApi';
import { useAuth } from '../../context/AuthContext';
import { stripMarkdown } from '../../utils/markdown';
import { feedCache } from '../../utils/feedCache';

export default function PostCard({ post, onPostDeleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.isLiked || post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? post.likes_count ?? 0);
  const [shared, setShared] = useState(false);
  const [shareCount, setShareCount] = useState(post.share_count || 0);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = user && user.id === post.author_id;

  const handleLikeToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    const nextLiked = !liked;
    const nextCount = nextLiked ? likeCount + 1 : Math.max(likeCount - 1, 0);

    // Optimistic component & cache update
    setLiked(nextLiked);
    setLikeCount(nextCount);
    feedCache.updatePostLike(post.id, nextLiked, nextCount);

    try {
      if (liked) {
        await postsApi.unlike(post.id);
      } else {
        await postsApi.like(post.id);
      }
    } catch (err) {
      // Reconcile / rollback on error
      setLiked(liked);
      setLikeCount(likeCount);
      feedCache.updatePostLike(post.id, liked, likeCount);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (shared) return; // prevent double-share
    try {
      await postsApi.share(post.id);
      setShared(true);
      setShareCount((prev) => prev + 1);
      toast.success('Post reshared!');
      setTimeout(() => setShared(false), 2000);
    } catch (err) {
      toast.error(err.message || 'Could not reshare post.');
    }
  };

  const handleOpenDeleteModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await postsApi.remove(post.id);
      toast.success('Post deleted successfully');
      setShowDeleteModal(false);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err) {
      toast.error(err.message || 'Failed to delete post.');
    } finally {
      setDeleting(false);
    }
  };

  const formattedDate = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : 'recently';

  return (
    <>
      <Card hoverable className="p-5 md:p-6 space-y-4">
        {/* Author Header */}
        <div className="flex items-center justify-between">
          <Link
            to={`/users/${post.author_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar src={post.author_avatar_url} name={post.author_name} size="md" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-main)]">{post.author_name}</h4>
              <span className="text-xs text-[var(--text-subtle)]">{formattedDate}</span>
            </div>
          </Link>

          {isOwner && (
            <div className="flex items-center gap-2">
              <Link
                to={`/posts/${post.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-surface-hover)]"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleOpenDeleteModal}
                className="text-xs font-medium text-[var(--color-danger)] hover:underline px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <Link to={`/posts/${post.id}`} className="block space-y-2 py-0.5">
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] hover:text-[var(--color-primary)] transition-colors leading-snug">
            {post.title}
          </h3>
          {post.content && (
            <p className="text-sm text-[var(--text-muted)] line-clamp-3 leading-relaxed">
              {stripMarkdown(post.content, 220)}
            </p>
          )}
        </Link>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 pb-1">
            {post.tags.map((tag, idx) => (
              <Badge key={idx} variant="primary" size="sm">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer Actions Bar */}
        <div className="flex items-center justify-between border-t border-[var(--border-main)] pt-3.5 mt-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleLikeToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                liked
                  ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)] font-bold'
                  : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              aria-label={liked ? 'Unlike post' : 'Like post'}
            >
              <span className="text-sm select-none">{liked ? '❤️' : '🤍'}</span>
              <span>{likeCount}</span>
            </button>

            <Link
              to={`/posts/${post.id}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all duration-150"
              aria-label="View comments"
            >
              <span className="text-sm select-none">💬</span>
              <span>{post.comment_count || 0}</span>
            </Link>

            <button
              type="button"
              onClick={handleShare}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                shared
                  ? 'bg-emerald-500/10 text-emerald-500 font-bold'
                  : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              aria-label="Share post"
            >
              <span className="text-sm select-none">{shared ? '✅' : '🔁'}</span>
              <span>{shareCount}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Post"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={deleting}
            >
              Delete Post
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
