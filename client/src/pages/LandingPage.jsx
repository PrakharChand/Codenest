import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import Footer from '../components/layout/Footer';

// ── Feature data ──────────────────────────────────────────────────────────
const features = [
  {
    icon: '🌐',
    title: 'Public Nest Feed',
    description: 'Share insights, code snippets, and articles with your real developer identity. Build your public reputation.',
    color: 'from-amber-500/10 via-orange-500/5 to-transparent',
    borderColor: 'group-hover:border-amber-500/40',
  },
  {
    icon: '👤',
    title: 'Anonymous Shadow',
    description: 'Submit code for review under a permanent alias. Zero real-identity leakage. 100% honest, bias-free feedback.',
    color: 'from-rose-500/10 via-pink-500/5 to-transparent',
    borderColor: 'group-hover:border-rose-500/40',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Tools',
    description: 'Smart tag suggestions, anonymity guard, personalised learning roadmaps, and AI connection recommendations.',
    color: 'from-orange-500/10 via-amber-500/5 to-transparent',
    borderColor: 'group-hover:border-orange-500/40',
  },
];

function formatStatNumber(val, fallbackStr) {
  if (val === undefined || val === null || isNaN(val)) return fallbackStr;
  if (val === 0) return fallbackStr;
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M+`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k+`;
  return `${val.toLocaleString()}+`;
}

// ── Animated Sky Canvas ────────────────────────────────────────────────────
function SkyCanvas({ isDark }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const starsRef = useRef([]);
  const birdsRef = useRef([]);
  const cloudsRef = useRef([]);
  const frameRef = useRef(0);

  const initScene = useCallback((canvas) => {
    const W = canvas.width;
    const H = canvas.height;

    // Stars (for dark/sunset mode)
    starsRef.current = Array.from({ length: 180 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.65,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.01 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));

    // Birds (for light/sunrise mode) - V-shape flocks
    birdsRef.current = Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * W * 0.6 + W * 0.1,
      y: Math.random() * H * 0.4 + H * 0.05,
      vx: Math.random() * 0.5 + 0.4,
      vy: Math.sin(i * 0.8) * 0.15,
      flap: Math.random() * Math.PI * 2,
      flapSpeed: Math.random() * 0.06 + 0.04,
      size: Math.random() * 3 + 3,
      group: Math.floor(i / 5),
    }));

    // Clouds (both modes, subtle)
    cloudsRef.current = Array.from({ length: 6 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.45 + H * 0.05,
      w: Math.random() * 140 + 80,
      h: Math.random() * 40 + 22,
      speed: Math.random() * 0.15 + 0.06,
      alpha: Math.random() * 0.18 + 0.06,
    }));
  }, []);

  const drawSunset = useCallback((ctx, W, H, t) => {
    // Deep dusk gradient — purple-black → amber horizon → burnt orange
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0E0C14');
    grad.addColorStop(0.35, '#1A0E1F');
    grad.addColorStop(0.62, '#2D1209');
    grad.addColorStop(0.78, '#7C2D0A');
    grad.addColorStop(0.90, '#D97706');
    grad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sun glow on horizon
    const sunX = W * 0.72;
    const sunY = H * 0.82;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 180);
    sunGlow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
    sunGlow.addColorStop(0.4, 'rgba(245, 158, 11, 0.25)');
    sunGlow.addColorStop(0.8, 'rgba(217, 119, 6, 0.08)');
    sunGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, W, H);

    // Sun disk
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    const sunDisk = ctx.createRadialGradient(sunX, sunY - 5, 4, sunX, sunY, 32);
    sunDisk.addColorStop(0, '#FDE68A');
    sunDisk.addColorStop(0.6, '#F59E0B');
    sunDisk.addColorStop(1, '#D97706');
    ctx.fillStyle = sunDisk;
    ctx.fill();

    // Desert silhouette hills
    const hillGrad = ctx.createLinearGradient(0, H * 0.7, 0, H);
    hillGrad.addColorStop(0, '#1C0A04');
    hillGrad.addColorStop(1, '#0E0C14');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H * 0.78);
    ctx.bezierCurveTo(W * 0.08, H * 0.70, W * 0.18, H * 0.68, W * 0.28, H * 0.73);
    ctx.bezierCurveTo(W * 0.38, H * 0.78, W * 0.48, H * 0.65, W * 0.58, H * 0.72);
    ctx.bezierCurveTo(W * 0.68, H * 0.79, W * 0.76, H * 0.74, W * 0.85, H * 0.77);
    ctx.bezierCurveTo(W * 0.92, H * 0.80, W * 0.97, H * 0.78, W, H * 0.80);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Twinkling stars
    starsRef.current.forEach((star) => {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(star.phase + t * star.speed));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 240, 200, ${twinkle * 0.85})`;
      ctx.fill();
    });

    // Clouds — silhouette dark
    cloudsRef.current.forEach((cloud) => {
      ctx.save();
      ctx.globalAlpha = cloud.alpha * 0.6;
      ctx.fillStyle = '#3D1A08';
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const drawSunrise = useCallback((ctx, W, H, t) => {
    // Warm dawn gradient — soft lavender sky → peach → golden horizon
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#E8D5B7');
    grad.addColorStop(0.25, '#F5C89A');
    grad.addColorStop(0.55, '#FBBF24');
    grad.addColorStop(0.75, '#F97316');
    grad.addColorStop(0.90, '#FDE68A');
    grad.addColorStop(1, '#FDFBF7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sunrise sun glow
    const sunX = W * 0.30;
    const sunY = H * 0.78;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 220);
    sunGlow.addColorStop(0, 'rgba(253, 230, 138, 0.70)');
    sunGlow.addColorStop(0.35, 'rgba(251, 191, 36, 0.35)');
    sunGlow.addColorStop(0.70, 'rgba(245, 158, 11, 0.12)');
    sunGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, W, H);

    // Sun disk (partially risen)
    const riseY = sunY + 8 * Math.sin(t * 0.0003);
    ctx.beginPath();
    ctx.arc(sunX, riseY, 26, 0, Math.PI * 2);
    const sunDisk = ctx.createRadialGradient(sunX, riseY - 4, 3, sunX, riseY, 26);
    sunDisk.addColorStop(0, '#FFFBEB');
    sunDisk.addColorStop(0.5, '#FDE68A');
    sunDisk.addColorStop(1, '#FBBF24');
    ctx.fillStyle = sunDisk;
    ctx.fill();

    // Gentle rolling desert sand hills
    const hillGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
    hillGrad.addColorStop(0, '#D97706');
    hillGrad.addColorStop(0.5, '#B45309');
    hillGrad.addColorStop(1, '#78350F');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H * 0.82);
    ctx.bezierCurveTo(W * 0.12, H * 0.74, W * 0.22, H * 0.72, W * 0.35, H * 0.78);
    ctx.bezierCurveTo(W * 0.45, H * 0.83, W * 0.55, H * 0.72, W * 0.65, H * 0.76);
    ctx.bezierCurveTo(W * 0.75, H * 0.80, W * 0.88, H * 0.75, W, H * 0.79);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Soft morning clouds
    cloudsRef.current.forEach((cloud) => {
      ctx.save();
      ctx.globalAlpha = cloud.alpha + 0.10;
      const cg = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.w / 2);
      cg.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
      cg.addColorStop(0.6, 'rgba(253, 230, 138, 0.35)');
      cg.addColorStop(1, 'transparent');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Flying birds in V-formation
    birdsRef.current.forEach((bird) => {
      const flapAngle = Math.sin(bird.flap + t * bird.flapSpeed * 0.05);
      ctx.save();
      ctx.strokeStyle = 'rgba(92, 50, 10, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';

      const bx = bird.x;
      const by = bird.y + Math.sin(t * 0.001 + bird.phase || 0) * 3;
      const wing = bird.size * (0.6 + 0.4 * Math.abs(flapAngle));

      ctx.beginPath();
      ctx.moveTo(bx - wing, by - flapAngle * wing * 0.5);
      ctx.quadraticCurveTo(bx - wing * 0.5, by + flapAngle * wing * 0.3, bx, by);
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + wing * 0.5, by + flapAngle * wing * 0.3, bx + wing, by - flapAngle * wing * 0.5);
      ctx.stroke();
      ctx.restore();
    });
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const t = frameRef.current;

    ctx.clearRect(0, 0, W, H);

    if (isDark) {
      drawSunset(ctx, W, H, t);
    } else {
      drawSunrise(ctx, W, H, t);
    }

    // Move clouds
    cloudsRef.current.forEach((cloud) => {
      cloud.x += cloud.speed;
      if (cloud.x - cloud.w / 2 > W) cloud.x = -cloud.w / 2;
    });

    // Move birds (only in light mode)
    if (!isDark) {
      birdsRef.current.forEach((bird) => {
        bird.x += bird.vx;
        bird.y += bird.vy;
        bird.flap += bird.flapSpeed;
        if (bird.x > W + 60) {
          bird.x = -60;
          bird.y = Math.random() * H * 0.40 + H * 0.05;
        }
      });
    }

    frameRef.current += 1;
    animRef.current = requestAnimationFrame(animate);
  }, [isDark, drawSunset, drawSunrise]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
      initScene(canvas);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [animate, initScene]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [statsData, setStatsData]       = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isDark, setIsDark]             = useState(false);

  // Detect dark mode from the document class
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark-mode'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const data = await statsApi.getPublicStats();
        if (!cancelled) setStatsData(data);
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, []);

  const statsItems = [
    { label: 'Developers',  value: formatStatNumber(statsData?.totalUsers ?? statsData?.total_users, '1,200+') },
    { label: 'Code Reviews', value: formatStatNumber(statsData?.totalReviews ?? statsData?.total_reviews, '3,400+') },
    { label: 'Submissions', value: formatStatNumber(statsData?.totalCodeSubmissions ?? statsData?.total_code_submissions, '650+') },
  ];

  return (
    <div className="space-y-10 page-enter">
      <SEO
        title="Build Public Reputation & Get Honest Code Reviews"
        description="CodeNest is a dual-identity developer platform. Share tech insights publicly on Nest Feed or get 100% anonymous, bias-free code reviews on Nest Shadow."
      />

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]/50">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
            <span className="text-white font-bold text-xs tracking-tight">CN</span>
          </div>
          <span className="text-base font-bold text-[var(--text-main)] transition-colors duration-200 group-hover:text-[var(--color-primary)]">
            Code<span className="text-[var(--color-primary)]">Nest</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Link to="/feed">
              <Button variant="primary" size="sm" className="transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-xs">
                Go to Feed 🚀
              </Button>
            </Link>
          ) : (
            <>
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
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section — Animated Sky Scene ───────────────────────────── */}
      {!user && (
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border-main)] shadow-[var(--shadow-lg)]" style={{ minHeight: '480px' }}>
          {/* Animated Canvas Sky */}
          <SkyCanvas isDark={isDark} />

          {/* Hero Content — layered above canvas */}
          <div className="relative z-10 flex flex-col justify-center h-full px-6 py-14 sm:px-10 md:px-16 md:py-20 max-w-3xl space-y-7">
            {/* Pill label */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-primary)]/40 bg-black/30 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-amber-300 w-fit transition-transform duration-200 hover:scale-105">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              🚀 The Dual-Identity Platform for Developers
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15]"
              style={{ color: isDark ? '#F5F0FF' : '#1C1410', textShadow: isDark ? '0 2px 24px rgba(0,0,0,0.6)' : '0 2px 16px rgba(255,255,255,0.5)' }}>
              Build your profile.{' '}
              <span className="gradient-text">Get honest</span>{' '}
              code reviews.
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg max-w-xl leading-relaxed"
              style={{ color: isDark ? '#C4B5A8' : '#4A3020', textShadow: isDark ? '0 1px 8px rgba(0,0,0,0.5)' : 'none' }}>
              One account. Two worlds. Share publicly on{' '}
              <strong style={{ color: isDark ? '#FDE68A' : '#92400E' }}>Nest Feed</strong>, or switch to{' '}
              <strong style={{ color: isDark ? '#FDE68A' : '#92400E' }}>Nest Shadow</strong>{' '}
              for completely anonymous, bias-free code reviews.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link to="/register">
                <Button variant="primary" size="lg" className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-sm hover:shadow-md">
                  Get Started — it's free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg" className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Floating code card */}
          <div className="absolute right-8 top-10 hidden lg:block pointer-events-none select-none z-10">
            <div className="p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <pre className="font-mono text-[11px] text-amber-300 leading-relaxed">
{`// Submit anonymously
const review = await shadow.submit({
  code: myCode,
  identity: 'hidden',
  bias: false,
});`}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      {!user && (
        <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] px-6 py-6">
          <div className="grid grid-cols-3 gap-4">
            {statsItems.map((s) => (
              <div
                key={s.label}
                className="text-center space-y-1 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-primary)] tracking-tight h-9 flex items-center justify-center">
                  {loadingStats ? (
                    <Skeleton height="28px" width="70px" rounded="rounded-md" />
                  ) : s.value}
                </div>
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Feature Grid ─────────────────────────────────────────────────── */}
      {!user && (
        <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)]">Why CodeNest</span>
            <div className="flex-1 h-px bg-[var(--border-main)]/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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

      {/* ── Community Feed ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] p-5 sm:p-7 space-y-5">
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

      {/* ── Join CTA Banner ──────────────────────────────────────────────── */}
      {!user && (
        <section className="relative overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] p-8 sm:p-10 text-center space-y-4">
          <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Ready to build something great?
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
              Join thousands of developers sharing knowledge publicly and reviewing code anonymously on CodeNest.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link to="/register">
                <Button variant="primary" size="lg" className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-sm">
                  Join CodeNest Free →
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
