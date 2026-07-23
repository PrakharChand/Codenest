import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postsApi } from '../api/postsApi';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Spinner from '../components/atoms/Spinner';
import MarkdownEditor from '../components/organisms/MarkdownEditor';

export default function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadPost() {
      try {
        const post = await postsApi.get(id);
        setTitle(post.title || '');
        setContent(post.content || '');
        setTagsInput((post.tags || []).join(', '));
        setImageUrl(post.image_url || '');
        setVisibility(post.visibility || 'public');
      } catch (err) {
        setFieldErrors({ general: 'Failed to load post for editing.' });
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!title.trim()) errors.title = 'Title is required.';
    if (!content.trim()) errors.content = 'Post content cannot be empty.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await postsApi.update(id, {
        title,
        content,
        visibility,
        image_url: imageUrl || null,
        tags,
      });
      navigate(`/posts/${id}`);
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ general: err.message || 'Failed to update post.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-main">Edit Post</h1>

      <Card className="p-6 md:p-8 space-y-6">
        {fieldErrors.general && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
            {fieldErrors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Post Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            required
          />

          <Input
            label="Tags (comma separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-main">Content (Markdown supported) *</label>
            <MarkdownEditor value={content} onChange={setContent} />
            {fieldErrors.content && <p className="text-xs text-danger font-medium">{fieldErrors.content}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-main">
            <Button variant="secondary" size="md" onClick={() => navigate(`/posts/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
