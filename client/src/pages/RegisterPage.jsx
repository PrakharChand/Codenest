import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';

// ── SVG marks ─────────────────────────────────────────────────────────────

const GitHubMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ── Brand Panel ───────────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full relative overflow-hidden bg-[var(--color-primary)] text-white p-10 rounded-l-2xl">
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="relative space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">CN</div>
          <span className="text-xl font-bold tracking-tight">CodeNest</span>
        </div>
      </div>

      <div className="relative space-y-4">
        <h2 className="text-3xl font-extrabold leading-tight">
          Join 1,200+<br />developers.
        </h2>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          Create your free account and get access to public developer feed,
          anonymous code reviews, AI tools, and a community that grows with you.
        </p>

        <div className="space-y-3 pt-2">
          {[
            { icon: '✅', text: 'Free forever — no credit card' },
            { icon: '🔒', text: 'Your anonymous identity stays secret' },
            { icon: '⚡', text: 'Up and running in under a minute' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-sm text-white/80">
              <span>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-white/40 text-xs">© {new Date().getFullYear()} CodeNest</p>
    </div>
  );
}

// ── Main RegisterPage ─────────────────────────────────────────────────────

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

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required.';
    if (!formData.email.trim()) errors.email = 'Valid email is required.';
    if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4 py-12">
      <div className="w-full max-w-4xl shadow-[var(--shadow-lg)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full min-h-[580px]">

          {/* Left — violet brand panel */}
          <BrandPanel />

          {/* Right — form */}
          <div className="bg-[var(--bg-surface)] flex flex-col justify-center px-8 py-10 space-y-6 rounded-r-2xl rounded-l-2xl lg:rounded-l-none">
            <div className="space-y-1">
              {/* Mobile logo */}
              <div className="flex items-center gap-2 mb-4 lg:hidden">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center font-bold text-white text-sm">CN</div>
                <span className="text-base font-bold text-[var(--text-main)]">CodeNest</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Create your account</h1>
              <p className="text-sm text-[var(--text-muted)]">Join the dual-identity developer community</p>
            </div>

            {generalError && (
              <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 p-3 text-sm text-[var(--color-danger)] font-medium text-center">
                {generalError}
              </div>
            )}

            {/* OAuth */}
            <div className="space-y-2.5">
              <a
                href={authApi.getOAuthGitHubUrl()}
                className="flex items-center justify-center gap-3 w-full rounded-xl border-2 border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--text-subtle)] transition-all"
              >
                <GitHubMark /> Register with GitHub
              </a>
              <a
                href={authApi.getOAuthGoogleUrl()}
                className="flex items-center justify-center gap-3 w-full rounded-xl border-2 border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--text-subtle)] transition-all"
              >
                <GoogleMark /> Register with Google
              </a>
            </div>

            {/* Divider */}
            <div className="relative flex items-center">
              <div className="flex-1 border-t border-[var(--border-main)]" />
              <span className="px-3 text-xs text-[var(--text-subtle)] bg-[var(--bg-surface)]">or with email</span>
              <div className="flex-1 border-t border-[var(--border-main)]" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={fieldErrors.name}
                required
                placeholder="Jane Smith"
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                required
                placeholder="you@example.com"
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={fieldErrors.password}
                required
                placeholder="8+ characters"
                hint="At least 8 characters"
              />
              <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
                Create Account — it's free
              </Button>
            </form>

            <p className="text-center text-sm text-[var(--text-muted)]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
