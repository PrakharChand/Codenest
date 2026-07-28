import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsApi } from '../api/postsApi';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import Button from '../components/atoms/Button';

// ── Feature data ──────────────────────────────────────────────────────────

const features = [
  {
    icon: '🌐',
    title: 'Public Nest Feed',
    description: 'Share insights, code snippets, and articles with your real developer identity. Build your public reputation.',
    color: 'from-violet-500/10 to-purple-500/5',
  },
  {
    icon: '👤',
    title: 'Anonymous Shadow',
    description: 'Submit code for review under a permanent alias. Zero real-identity leakage. 100% honest, bias-free feedback.',
    color: 'from-cyan-500/10 to-sky-500/5',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Tools',
    description: 'Smart tag suggestions, anonymity guard, personalised learning roadmaps, and AI connection recommendations.',
    color: 'from-emerald-500/10 to-teal-500/5',
  },
];

const stats = [
  { value: '1,200+', label: 'Developers' },
  { value: '3,400+', label: 'Code Reviews' },
  { value: '100%', label: 'Anonymous' },
];

// ── Main Component ────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-16">

      {/* ── Hero Section (logged-out only) ─────────────────────────────── */}
      {!user && (
        <section className="relative overflow-hidden rounded-2xl hero-gradient border border-[var(--border-main)] shadow-[var(--shadow-md)]">
          {/* Dot grid background decoration */}
          <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

          {/* Floating code decoration */}
          <div className="absolute right-8 top-8 hidden lg:block opacity-20 pointer-events-none select-none">
            <pre className="font-mono text-[10px] text-[var(--color-primary)] leading-relaxed">
{`// Submit anonymously
const review = await shadow.submit({
  code: myCode,
  identity: 'hidden',
  bias: false,
});`}
            </pre>
          </div>

          <div className="relative px-8 py-14 md:px-16 md:py-20 space-y-8 max-w-3xl">
            {/* Pill label */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-4 py-1.5 text-xs font-semibold text-[var(--color-primary)]">
              🚀 The Dual-Identity Platform for Developers
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.1]">
              Build your profile.{' '}
              <span className="gradient-text">Get honest</span>{' '}
              code reviews.
            </h1>

            {/* Subtext */}
            <p className="text-lg text-[var(--text-muted)] max-w-xl leading-relaxed">
              One account. Two worlds. Share publicly on{' '}
              <strong className="text-[var(--text-main)]">Nest Feed</strong>, or switch to{' '}
              <strong className="text-[var(--text-main)]">Nest Shadow</strong> for completely
              anonymous, bias-free code reviews.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/register">
                <Button variant="primary" size="lg">
                  Get Started — it's free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-8 pt-2">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-[var(--color-primary)]">{s.value}</div>
                  <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Feature grid (logged-out only) ─────────────────────────────── */}
      {!user && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-6">
            Why CodeNest
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-2xl bg-gradient-to-br ${f.color} border border-[var(--border-main)] p-6 space-y-3 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200`}
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="font-bold text-[var(--text-main)]">{f.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Public Feed ────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">
              {user ? 'Your Feed' : 'Community Feed'}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Latest posts from the developer community
            </p>
          </div>
          {user && (
            <Link to="/posts/new">
              <Button variant="primary" size="sm">
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
          onEmptyAction={() => {}}
        />
      </section>
    </div>
  );
}
