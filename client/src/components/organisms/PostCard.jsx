import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Card from '../atoms/Card';
import { postsApi } from '../../api/postsApi';
import { useAuth } from '../../context/AuthContext';

export default function PostCard({ post, onPostDeleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  const isOwner = user && user.id === post.author_id;

  const handleLikeToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (liked) {
        setLiked(false);
        setLikeCount((prev) => Math.max(prev - 1, 0));
        await postsApi.unlike(post.id);
      } else {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        await postsApi.like(post.id);
      }
    } catch (err) {
      // Reconcile on error
      setLiked(!liked);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await postsApi.share(post.id);
      alert('Post reshared successfully!');
    } catch (err) {
      alert(err.message || 'Could not share post.');
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await postsApi.remove(post.id);
        if (onPostDeleted) onPostDeleted(post.id);
      } catch (err) {
        alert(err.message || 'Failed to delete post.');
      }
    }
  };

  const formattedDate = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : 'recently';

  return (
    <Card hoverable className="space-y-4">
      {/* Author Header */}
      <div className="flex items-center justify-between">
        <Link
          to={`/users/${post.author_id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar src={post.author_avatar_url} name={post.author_name} size="md" />
          <div>
            <h4 className="text-sm font-semibold text-main">{post.author_name}</h4>
            <span className="text-xs text-subtle">{formattedDate}</span>
          </div>
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Link
              to={`/posts/${post.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted hover:text-main"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-danger hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Content Body */}
      <Link to={`/posts/${post.id}`} className="block space-y-2">
        <h3 className="text-lg font-bold text-main hover:text-primary transition-colors">
          {post.title}
        </h3>
        {post.content && (
          <p className="text-sm text-muted line-clamp-3">
            {post.content.replace(/[#*`_]/g, '')}
          </p>
        )}
      </Link>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {post.tags.map((tag, idx) => (
            <Badge key={idx} variant="primary" size="sm">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-main pt-3 text-xs text-muted">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLikeToggle}
            className={`flex items-center gap-1.5 font-medium transition-colors ${
              liked ? 'text-primary font-bold' : 'hover:text-main'
            }`}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>

          <Link
            to={`/posts/${post.id}`}
            className="flex items-center gap-1.5 font-medium hover:text-main"
          >
            <span>💬</span>
            <span>{post.comment_count || 0}</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 font-medium hover:text-main"
          >
            <span>🔁</span>
            <span>{post.share_count || 0}</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
