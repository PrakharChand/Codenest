/**
 * client/src/pages/EditProfilePage.jsx
 *
 * Edit public profile: bio, links, avatar selection.
 * Avatar is chosen from a curated grid — no file upload.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/usersApi';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Avatar from '../components/atoms/Avatar';
import AvatarPicker from '../components/organisms/AvatarPicker';
import { FEED_AVATARS } from '../utils/avatars';

export default function EditProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    bio: '',
    github_url: '',
    twitter_url: '',
    avatar_url: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        github_url: user.github_url || '',
        twitter_url: user.twitter_url || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
  };

  const handleAvatarSelect = (url) => {
    setFormData((prev) => ({ ...prev, avatar_url: url }));
    setShowAvatarPicker(false);
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
      toast.success('Settings saved!');
      setTimeout(() => navigate(`/users/${user.id}`), 1200);
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ general: err.message || 'Failed to update profile.' });
      }
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-main">Edit Public Profile</h1>
        <p className="text-sm text-muted mt-1">
          Update your public identity on Nest Feed.
        </p>
      </div>

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

        {/* Avatar Selection */}
        <div className="flex items-center gap-6 border-b border-main pb-6">
          <Avatar src={formData.avatar_url} name={user?.name} size="lg" />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-main">Public Avatar</label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAvatarPicker((v) => !v)}
            >
              {showAvatarPicker ? 'Close Picker' : 'Choose Avatar'}
            </Button>
            <p className="text-xs text-subtle">Click an avatar below to select it.</p>
          </div>
        </div>

        {/* Avatar Grid Picker */}
        {showAvatarPicker && (
          <div className="border border-main rounded-xl p-4 bg-surface-subtle">
            <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wide">
              Choose your public avatar
            </p>
            <AvatarPicker
              avatars={FEED_AVATARS}
              selected={formData.avatar_url}
              onSelect={handleAvatarSelect}
              columns={5}
            />
          </div>
        )}

        {/* Profile Details Form */}
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
