import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsApi } from '../api/postsApi';
import { statsApi } from '../api/statsApi';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import Button from '../components/atoms/Button';
import Skeleton from '../components/atoms/Skeleton';
import ThemeToggle from '../components/atoms/ThemeToggle';
import SEO from '../components/atoms/SEO';

// ── Feature data ──────────────────────────────────────────────────────────

const features = [
  {
    icon: '🌐',
    title: 'Public Nest Feed',
    description: 'Share insights, code snippets, and articles with your real developer identity. Build your public reputation.',
    color: 'from-violet-500/10 via-purple-500/5 to-transparent',
    borderColor: 'group-hover:border-violet-500/40',
  },
  {
    icon: '👤',
    title: 'Anonymous Shadow',
    description: 'Submit code for review under a permanent alias. Zero real-identity leakage. 100% honest, bias-free feedback.',
    color: 'from-cyan-500/10 via-sky-500/5 to-transparent',
    borderColor: 'group-hover:border-cyan-500/40',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Tools',
    description: 'Smart tag suggestions, anonymity guard, personalised learning roadmaps, and AI connection recommendations.',
    color: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    borderColor: 'group-hover:border-emerald-500/40',
  },
];

function formatStatNumber(val, fallbackStr) {
  if (val === undefined || val === null || isNaN(val)) return fallbackStr;
  if (val === 0) return fallbackStr; // Graceful fallback if database is empty
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M+`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k+`;
  return `${val.toLocaleString()}+`;
}

// ── Main Component ────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [statsData, setStatsData]       = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const data = await statsApi.getPublicStats();
        if (!cancelled) setStatsData(data);
      } catch (err) {
        // Fallback gracefully on error
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, []);

  const statsItems = [
    {
      label: 'Developers',
      value: formatStatNumber(statsData?.totalUsers ?? statsData?.total_users, '1,200+'),
    },
    {
      label: 'Code Reviews',
      value: formatStatNumber(statsData?.totalReviews ?? statsData?.total_reviews, '3,400+'),
    },
    {
      label: 'Submissions',
      value: formatStatNumber(statsData?.totalCodeSubmissions ?? statsData?.total_code_submissions, '650+'),
    },
  ];

  return (
    <div className="space-y-16 page-enter">
      <SEO
        title="Build Public Reputation & Get Honest Code Reviews"
        description="CodeNest is a dual-identity developer platform. Share tech insights publicly on Nest Feed or get 100% anonymous, bias-free code reviews on Nest Shadow."
      />
      {/* ── Top nav bar for logged-out visitors ───────────────────── */}
      {!user && (
        <nav className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]/50">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
              <span className="text-white font-bold text-xs tracking-tight">CN</span>
            </div>
            <span className="text-base font-bold text-[var(--text-main)] transition-colors duration-200 group-hover:text-[var(--color-primary)]">
              Code<span className="text-[var(--color-primary)]">Nest</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="secondary" size="sm" className="transition-all duration-200 hover:scale-[1.02] active:scale-95">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm" className="transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-xs hover:shadow-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      )}

      {/* ── Hero Section (logged-out only) ─────────────────────────────── */}
      {!user && (
        <section className="relative overflow-hidden rounded-2xl hero-gradient border border-[var(--border-main)] shadow-[var(--shadow-md)] transition-all duration-300 hover:shadow-[var(--shadow-lg)]">
          {/* Dot grid background decoration */}
          <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

          {/* Glowing ambient background blob */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Floating code decoration */}
          <div className="absolute right-8 top-10 hidden lg:block pointer-events-none select-none">
            <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]/60 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-[var(--color-primary)]/40 hover:-translate-y-1">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <pre className="font-mono text-[11px] text-[var(--color-primary)] leading-relaxed">
{`// Submit anonymously
const review = await shadow.submit({
  code: myCode,
  identity: 'hidden',
  bias: false,
});`}
              </pre>
            </div>
          </div>

          <div className="relative px-6 py-12 sm:px-10 md:px-16 md:py-20 space-y-8 max-w-3xl">
            {/* Pill label */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary-dim)] px-4 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-transform duration-200 hover:scale-105">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              🚀 The Dual-Identity Platform for Developers
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.15]">
              Build your profile.{' '}
              <span className="gradient-text">Get honest</span>{' '}
              code reviews.
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-xl leading-relaxed">
              One account. Two worlds. Share publicly on{' '}
              <strong className="text-[var(--text-main)] font-semibold">Nest Feed</strong>, or switch to{' '}
              <strong className="text-[var(--text-main)] font-semibold">Nest Shadow</strong> for completely
              anonymous, bias-free code reviews.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link to="/register">
                <Button variant="primary" size="lg" className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-sm hover:shadow-md">
                  Get Started — it's free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg" className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 max-w-lg">
              {statsItems.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]/70 backdrop-blur-xs p-3 sm:p-4 text-center transition-all duration-200 hover:border-[var(--color-primary)]/40 hover:shadow-sm hover:-translate-y-0.5"
                >
                  <div className="text-xl sm:text-2xl font-extrabold text-[var(--color-primary)] tracking-tight h-8 flex items-center justify-center">
                    {loadingStats ? (
                      <Skeleton height="24px" width="60px" rounded="rounded-md" />
                    ) : (
                      s.value
                    )}
                  </div>
                  <div className="text-[11px] sm:text-xs font-medium text-[var(--text-muted)] mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Feature grid (logged-out only) ─────────────────────────────── */}
      {!user && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)]">
              Why CodeNest
            </span>
            <div className="flex-1 h-px bg-[var(--border-main)]/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl bg-gradient-to-br ${f.color} border border-[var(--border-main)] p-6 space-y-4 shadow-xs transition-all duration-300 hover:shadow-[var(--shadow-md)] hover:-translate-y-1 ${f.borderColor}`}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-main)] flex items-center justify-center text-2xl shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:border-[var(--color-primary)]/30">
                  {f.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-[var(--color-primary)] transition-colors duration-200">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Public Feed ────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border-main)]/50 pb-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">
              {user ? 'Your Feed' : 'Community Feed'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Latest posts from the developer community
            </p>
          </div>
          {user && (
            <Link to="/posts/new">
              <Button variant="primary" size="sm" className="transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-xs">
                + New Post
              </Button>
            </Link>
          )}
        </div>

        <PaginatedList
          fetchData={(params) => postsApi.list(params)}
          renderItem={(post) => <PostCard key={post.id} post={post} />}
          emptyTitle="No public posts yet"
          emptyDescription="Be the first to share something with the community!"
          emptyActionLabel={user ? 'Write First Post' : 'Join to Post'}
          onEmptyAction={() => navigate(user ? '/posts/new' : '/register')}
        />
      </section>
    </div>
  );
}
