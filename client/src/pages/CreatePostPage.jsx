import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsApi } from '../api/postsApi';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import MarkdownEditor from '../components/organisms/MarkdownEditor';

export default function CreatePostPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors({ image: 'Image size must be under 5 MB.' });
      return;
    }

    setUploadingImage(true);
    setFieldErrors({});
    try {
      const res = await postsApi.uploadImage(file);
      setImageUrl(res.url);
    } catch (err) {
      setFieldErrors({ image: err.message || 'Image upload failed.' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (visibility = 'public') => {
    setFieldErrors({});

    // Client validation
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
      const newPost = await postsApi.create({
        title,
        content,
        visibility,
        image_url: imageUrl || null,
        tags,
      });
      navigate(`/posts/${newPost.id}`);
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ general: err.message || 'Failed to create post.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-main">Create New Post</h1>
        {/* Phase 12 AI Tag Suggestion Affordance Slot */}
        <Button variant="ghost" size="sm" disabled title="AI Tag Suggestion (Phase 12 feature)">
          ✨ Suggest Tags (AI)
        </Button>
      </div>

      <Card className="p-6 md:p-8 space-y-6">
        {fieldErrors.general && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
            {fieldErrors.general}
          </div>
        )}

        {/* Title */}
        <Input
          label="Post Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fieldErrors.title}
          placeholder="What's on your mind? (max 200 chars)"
          required
        />

        {/* Tags */}
        <Input
          label="Tags (comma separated)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="javascript, react, webdev"
        />

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-main">Cover Image (optional)</label>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleImageUpload}
            disabled={uploadingImage}
            className="text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-surface-hover file:text-main"
          />
          {uploadingImage && <p className="text-xs text-primary">Uploading image...</p>}
          {imageUrl && (
            <div className="mt-2 relative w-48 h-28 rounded-md overflow-hidden border border-main">
              <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
            </div>
          )}
          {fieldErrors.image && <p className="text-xs text-danger font-medium">{fieldErrors.image}</p>}
        </div>

        {/* Markdown Content Editor */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-main">Content (Markdown supported) *</label>
          <MarkdownEditor value={content} onChange={setContent} placeholder="Write your post content here..." />
          {fieldErrors.content && <p className="text-xs text-danger font-medium">{fieldErrors.content}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-main">
          <Button variant="secondary" size="md" onClick={() => handleSubmit('draft')} isLoading={submitting}>
            Save Draft
          </Button>
          <Button variant="primary" size="md" onClick={() => handleSubmit('public')} isLoading={submitting}>
            Publish Post
          </Button>
        </div>
      </Card>
    </div>
  );
}
