import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';

export default function AnonymousCreatePage() {
  const { user, setUser, switchMode } = useAuth();
  const navigate = useNavigate();

  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selectedAdjective, setSelectedAdjective] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const [selectedNumber, setSelectedNumber] = useState('42');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // If user already has an anonymous identity, redirect to Shadow queue directly
  useEffect(() => {
    if (user?.has_anonymous_identity) {
      switchMode('shadow');
      navigate('/shadow/queue', { replace: true });
    }
  }, [user, switchMode, navigate]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await authApi.getAnonymousOptions();
        setOptions(data);
        if (data.adjectives?.length) setSelectedAdjective(data.adjectives[0]);
        if (data.animals?.length) setSelectedAnimal(data.animals[0]);
      } catch (err) {
        setFieldErrors({ general: 'Failed to load identity options.' });
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  // Live preview calculation
  const generatedUsername =
    selectedAdjective && selectedAnimal
      ? `${selectedAdjective.toLowerCase()}_${selectedAnimal.toLowerCase()}${selectedNumber}`
      : '...';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (!selectedAdjective || !selectedAnimal || !selectedNumber) {
      setFieldErrors({ general: 'Please make a selection for all three fields.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.createAnonymousIdentity({
        adjective: selectedAdjective,
        animal: selectedAnimal,
        number: parseInt(selectedNumber, 10),
      });

      // Update AuthContext user with anonymous identity fields
      setUser((prev) => ({
        ...prev,
        has_anonymous_identity: true,
        anonymous_username: res.anonymous_username,
        anonymous_avatar_url: res.anonymous_avatar_url,
        anonymous_reputation_score: res.anonymous_reputation_score || 0,
      }));

      // Switch mode and navigate to Shadow Queue
      switchMode('shadow');
      navigate('/shadow/queue', { replace: true });
    } catch (err) {
      if (err.status === 409 || err.code === 'CONFLICT') {
        setFieldErrors({
          number: 'This anonymous handle is already taken. Try picking a different number!',
        });
      } else if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ general: err.message || 'Failed to create anonymous identity.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <Card className="p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-2xl">
            👤
          </div>
          <h1 className="text-2xl font-bold text-main">Create Your Anonymous Identity</h1>
          <p className="text-sm text-muted">
            Choose your permanent anonymous alias for bias-free code reviews on Nest Shadow.
          </p>
        </div>

        {/* Permanent Warning */}
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs text-warning font-medium space-y-1">
          <div className="font-bold text-sm flex items-center gap-1.5">
            ⚠️ Permanent Decision
          </div>
          <p>
            Your anonymous handle is created <strong>once</strong> and <strong>cannot be changed</strong>. This ensures trust and reputation integrity across all code reviews.
          </p>
        </div>

        {fieldErrors.general && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium text-center">
            {fieldErrors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Adjective Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-main">1. Choose an Adjective</label>
            <select
              value={selectedAdjective}
              onChange={(e) => setSelectedAdjective(e.target.value)}
              className="w-full rounded-md border border-main bg-surface px-3 py-2 text-sm text-main focus-visible:border-focus focus-visible:outline-none"
            >
              {options?.adjectives?.map((adj) => (
                <option key={adj} value={adj}>
                  {adj}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Animal Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-main">2. Choose an Animal</label>
            <select
              value={selectedAnimal}
              onChange={(e) => setSelectedAnimal(e.target.value)}
              className="w-full rounded-md border border-main bg-surface px-3 py-2 text-sm text-main focus-visible:border-focus focus-visible:outline-none"
            >
              {options?.animals?.map((an) => (
                <option key={an} value={an}>
                  {an}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Number Select */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-main">3. Pick a Number (1-99)</label>
            <input
              type="number"
              min="1"
              max="99"
              value={selectedNumber}
              onChange={(e) => setSelectedNumber(e.target.value)}
              className="w-full rounded-md border border-main bg-surface px-3 py-2 text-sm text-main focus-visible:border-focus focus-visible:outline-none"
              required
            />
            {fieldErrors.number && (
              <p className="text-xs text-danger font-medium mt-1">{fieldErrors.number}</p>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-1.5 transition-all">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Your Anonymous Username Preview
            </span>
            <div className="text-xl font-bold font-mono text-main tracking-wide">
              {generatedUsername}
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
            Confirm & Claim Permanent Identity
          </Button>
        </form>
      </Card>
    </div>
  );
}
