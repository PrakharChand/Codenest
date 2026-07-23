import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side validation
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required.';
    if (!formData.email.trim()) errors.email = 'Valid email is required.';
    if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const data = await authApi.register(formData);
      login(data.user, data.accessToken);
      navigate('/feed', { replace: true });
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setGeneralError(err.message || 'Registration failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 bg-base">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-main">Create your CodeNest account</h1>
          <p className="text-sm text-muted">Join the dual-identity developer community</p>
        </div>

        {generalError && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium text-center">
            {generalError}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <a
            href={authApi.getOAuthGitHubUrl()}
            className="flex items-center justify-center gap-3 w-full rounded-md border border-main bg-surface px-4 py-2.5 text-sm font-medium text-main hover:bg-surface-hover transition-colors"
          >
            <span>🐱</span> Register with GitHub
          </a>
          <a
            href={authApi.getOAuthGoogleUrl()}
            className="flex items-center justify-center gap-3 w-full rounded-md border border-main bg-surface px-4 py-2.5 text-sm font-medium text-main hover:bg-surface-hover transition-colors"
          >
            <span>🌐</span> Register with Google
          </a>
        </div>

        <div className="relative flex items-center justify-center border-t border-main my-4">
          <span className="bg-surface px-3 text-xs text-subtle absolute">or with email</span>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={fieldErrors.name}
            required
          />
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
          />
          <Input
            label="Password (min 8 chars)"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-xs text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
