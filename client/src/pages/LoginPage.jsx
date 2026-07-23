import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/feed';

  const [formData, setFormData] = useState({ email: '', password: '' });
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
    if (!formData.email) errors.email = 'Email is required.';
    if (!formData.password) errors.password = 'Password is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const data = await authApi.login(formData);
      login(data.user, data.accessToken);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setGeneralError(err.message || 'Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 bg-base">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-main">Welcome back to CodeNest</h1>
          <p className="text-sm text-muted">Sign in to your public developer account</p>
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
            <span>🐱</span> Continue with GitHub
          </a>
          <a
            href={authApi.getOAuthGoogleUrl()}
            className="flex items-center justify-center gap-3 w-full rounded-md border border-main bg-surface px-4 py-2.5 text-sm font-medium text-main hover:bg-surface-hover transition-colors"
          >
            <span>🌐</span> Continue with Google
          </a>
        </div>

        <div className="relative flex items-center justify-center border-t border-main my-4">
          <span className="bg-surface px-3 text-xs text-subtle absolute">or with email</span>
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
