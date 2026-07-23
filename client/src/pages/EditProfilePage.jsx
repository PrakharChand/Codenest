import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/usersApi';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Avatar from '../components/atoms/Avatar';

export default function EditProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    bio: '',
    github_url: '',
    twitter_url: '',
    avatar_url: '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        github_url: user.github_url || '',
        twitter_url: user.twitter_url || '',
        avatar_url: user.avatar_url || '',
      });
      setAvatarPreview(user.avatar_url || '');
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors({ avatar: 'File size must be under 5 MB.' });
      return;
    }

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFieldErrors({ avatar: 'Allowed image types: PNG, JPEG, WebP.' });
      return;
    }

    setAvatarFile(file);
    setUploadingAvatar(true);
    setFieldErrors({});

    try {
      const res = await usersApi.uploadAvatar(user.id, file);
      setAvatarPreview(res.url);
      setFormData((prev) => ({ ...prev, avatar_url: res.url }));
    } catch (err) {
      setFieldErrors({ avatar: err.message || 'Avatar upload failed.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      const updatedUser = await usersApi.updateProfile(user.id, formData);
      setUser(updatedUser);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => navigate(`/users/${user.id}`), 1200);
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ general: err.message || 'Failed to update profile.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-main">Edit Public Profile</h1>

      <Card className="p-6 md:p-8 space-y-6">
        {successMessage && (
          <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success font-medium">
            {successMessage}
          </div>
        )}

        {fieldErrors.general && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
            {fieldErrors.general}
          </div>
        )}

        {/* Avatar Upload Section */}
        <div className="flex items-center gap-6 border-b border-main pb-6">
          <Avatar src={avatarPreview} name={user?.name} size="lg" />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-main">Public Avatar</label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleAvatarFileChange}
              disabled={uploadingAvatar}
              className="text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-surface-hover file:text-main hover:file:bg-primary-light"
            />
            {uploadingAvatar && <p className="text-xs text-primary">Uploading image to Cloudinary...</p>}
            {fieldErrors.avatar && <p className="text-xs text-danger font-medium">{fieldErrors.avatar}</p>}
          </div>
        </div>

        {/* Form Details */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextArea
            label="Bio"
            name="bio"
            rows={3}
            value={formData.bio}
            onChange={handleChange}
            error={fieldErrors.bio}
            placeholder="Tell the community about yourself and your tech stack..."
          />

          <Input
            label="GitHub Profile URL"
            name="github_url"
            type="url"
            value={formData.github_url}
            onChange={handleChange}
            error={fieldErrors.github_url}
            placeholder="https://github.com/username"
          />

          <Input
            label="Twitter / X Profile URL"
            name="twitter_url"
            type="url"
            value={formData.twitter_url}
            onChange={handleChange}
            error={fieldErrors.twitter_url}
            placeholder="https://twitter.com/username"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-main">
            <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={submitting}>
              Save Profile
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
