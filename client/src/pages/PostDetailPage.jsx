import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { postsApi } from '../api/postsApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/atoms/Avatar';
import Badge from '../components/atoms/Badge';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import Modal from '../components/molecules/Modal';
import MarkdownView from '../components/organisms/MarkdownView';
import CommentThread from '../components/organisms/CommentThread';

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadPost() {
      setLoading(true);
      setError(null);
      try {
        const data = await postsApi.get(id);
        setPost(data);
        setLiked(data.isLiked || false);
        setLikeCount(data.like_count || 0);
      } catch (err) {
        setError(err.message || 'Failed to load post.');
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id]);

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      if (liked) {
        setLiked(false);
        setLikeCount((prev) => Math.max(prev - 1, 0));
        await postsApi.unlike(id);
      } else {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        await postsApi.like(id);
      }
    } catch (err) {
      setLiked(!liked);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await postsApi.remove(id);
      toast.success('Post deleted');
      setShowDeleteModal(false);
      navigate('/feed');
    } catch (err) {
      toast.error(err.message || 'Could not delete post.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-danger">Post Not Found</h2>
        <p className="text-sm text-muted">{error || 'This post could not be loaded.'}</p>
        <Link to="/feed">
          <Button variant="secondary" size="sm">
            Back to Feed
          </Button>
        </Link>
      </Card>
    );
  }

  const isOwner = user && user.id === post.user_id;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="p-6 md:p-8 space-y-6">
        {/* Author Header */}
        <div className="flex items-center justify-between border-b border-main pb-4">
          <Link to={`/users/${post.author_id}`} className="flex items-center gap-3">
            <Avatar src={post.author_avatar_url} name={post.author_name} size="lg" />
            <div>
              <h3 className="font-bold text-main hover:text-primary transition-colors">
                {post.author_name}
              </h3>
              <span className="text-xs text-subtle">
                {post.created_at
                  ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
                  : 'recently'}
              </span>
            </div>
          </Link>

          {isOwner && (
            <div className="flex items-center gap-2">
              <Link to={`/posts/${post.id}/edit`}>
                <Button variant="secondary" size="sm">
                  Edit
                </Button>
              </Link>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-main">{post.title}</h1>

        {/* Optional Uploaded Image */}
        {post.image_url && (
          <div className="rounded-lg overflow-hidden border border-main">
            <img src={post.image_url} alt={post.title} className="w-full max-h-96 object-cover" />
          </div>
        )}

        {/* Markdown Rendered Body */}
        <MarkdownView source={post.content} />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-main">
            {post.tags.map((tag, idx) => (
              <Badge key={idx} variant="primary" size="md">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-main">
          <Button variant={liked ? 'primary' : 'secondary'} size="sm" onClick={handleLike}>
            {liked ? '❤️ Liked' : '🤍 Like'} ({likeCount})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await postsApi.share(post.id);
                toast.success('Post reshared!');
              } catch (err) {
                toast.error(err.message || 'Could not reshare post.');
              }
            }}
          >
            🔁 Share ({post.share_count || 0})
          </Button>
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

      {/* Comments Thread Section */}
      <CommentThread postId={post.id} />
    </div>
  );
}
