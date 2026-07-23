import React, { useState, useEffect } from 'react';
import { shadowApi } from '../api/shadowApi';
import AnonProfileCard from '../components/organisms/AnonProfileCard';
import Spinner from '../components/atoms/Spinner';
import Card from '../components/atoms/Card';

export default function ShadowProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadShadowProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await shadowApi.getShadowMe();
        setProfile(data);
      } catch (err) {
        setError(err.message || 'Failed to load shadow profile.');
      } finally {
        setLoading(false);
      }
    }
    loadShadowProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-danger">Shadow Profile Not Found</h2>
        <p className="text-sm text-muted">{error}</p>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-main font-mono">Your Shadow Profile</h1>
      <AnonProfileCard shadowProfile={profile} />
    </div>
  );
}
