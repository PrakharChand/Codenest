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

// ── Full Page Background Canvas (Sunset Sky + Ocean) ─────────────────────
function PageBackground() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const frameRef  = useRef(0);

  const starsRef        = useRef([]);
  const shootingStarRef = useRef({ active: false, timer: 0 });
  const waveLayersRef   = useRef([]);

  const initScene = useCallback((W, H) => {
    starsRef.current = Array.from({ length: 280 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.45,
      r: Math.random() * 1.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.009 + 0.003,
      brightness: Math.random() * 0.7 + 0.3,
    }));

    waveLayersRef.current = Array.from({ length: 18 }, (_, i) => {
      const progress = (i + 1) / 18;
      return {
        progress,
        speed: 0.005 + progress * 0.004,
        amp: 3 + progress * 10,
        freq: 0.004 + progress * 0.002,
        offset: Math.random() * Math.PI * 2,
        color: i % 3 === 0
          ? `rgba(168, 85, 247, ${(0.18 + progress * 0.30).toFixed(2)})`
          : i % 3 === 1
          ? `rgba(59, 130, 246, ${(0.15 + progress * 0.28).toFixed(2)})`
          : `rgba(245, 158, 11, ${(0.10 + progress * 0.22).toFixed(2)})`,
      };
    });
  }, []);

  const updateShootingStar = useCallback((W, H) => {
    const star = shootingStarRef.current;
    if (!star.active) {
      star.timer = (star.timer || 0) + 1;
      if (star.timer > 280 + Math.random() * 80) {
        star.active = true;
        star.timer = 0;
        star.x = Math.random() * W * 0.7 + W * 0.1;
        star.y = Math.random() * H * 0.2 + H * 0.05;
        const angle = (Math.random() * 15 + 25) * (Math.PI / 180);
        const speed = 12 + Math.random() * 6;
        star.vx = Math.cos(angle) * speed;
        star.vy = Math.sin(angle) * speed;
        star.len = 90 + Math.random() * 40;
        star.life = 0;
        star.maxLife = 70;
      }
    } else {
      star.x += star.vx;
      star.y += star.vy;
      star.life += 1;
      if (star.life >= star.maxLife || star.x > W || star.y > H) {
        star.active = false;
        star.timer = 0;
      }
    }
  }, []);

  const draw = useCallback((ctx, W, H, t) => {
    ctx.clearRect(0, 0, W, H);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animTime = prefersReducedMotion ? 0 : t;
    const horizonY = H * 0.32;

    // 1. SKY BASE GRADIENT
    const skyGrd = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
    skyGrd.addColorStop(0.0, '#040209');
    skyGrd.addColorStop(0.4, '#0D061A');
    skyGrd.addColorStop(0.8, '#1A0B2B');
    skyGrd.addColorStop(1.0, '#290E38');
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, W, horizonY + 40);

    // 2. STARRY SKY & TWINKLING
    starsRef.current.forEach((s) => {
      const twinkle = s.brightness * (0.45 + 0.55 * Math.sin(s.phase + animTime * s.speed));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      const hue = s.phase < 1.2 ? '255,240,210' : s.phase < 2.5 ? '210,225,255' : '255,255,255';
      ctx.fillStyle = `rgba(${hue}, ${twinkle.toFixed(3)})`;
      ctx.fill();
    });

    // 3. SHOOTING STAR
    const sStar = shootingStarRef.current;
    if (sStar.active && !prefersReducedMotion) {
      const alpha = Math.sin((sStar.life / sStar.maxLife) * Math.PI);
      const headX = sStar.x;
      const headY = sStar.y;
      const tailX = headX - (sStar.vx / 12) * sStar.len;
      const tailY = headY - (sStar.vy / 12) * sStar.len;

      const starGrd = ctx.createLinearGradient(tailX, tailY, headX, headY);
      starGrd.addColorStop(0, 'rgba(168, 85, 247, 0)');
      starGrd.addColorStop(0.6, `rgba(245, 158, 11, ${(alpha * 0.7).toFixed(2)})`);
      starGrd.addColorStop(1, `rgba(255, 255, 255, ${alpha.toFixed(2)})`);

      ctx.strokeStyle = starGrd;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(headX, headY, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.fill();
    }

    // 4. HORIZON SUNSET BACKLIGHT GLOW
    const glowX = W * 0.5;
    const glowY = horizonY - 10;
    const glowRadius = Math.max(W * 0.45, 320);
    const horizonGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);

    horizonGlow.addColorStop(0.0, 'rgba(255, 130, 0, 0.68)');
    horizonGlow.addColorStop(0.35, 'rgba(225, 29, 72, 0.48)');
    horizonGlow.addColorStop(0.70, 'rgba(147, 51, 234, 0.28)');
    horizonGlow.addColorStop(1.0, 'rgba(10, 5, 20, 0)');

    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - glowRadius * 0.6, W, glowRadius * 1.2);

    // 5. MOUNTAINS
    ctx.fillStyle = '#130926';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= W; x += 15) {
      const peak = Math.sin(x * 0.005) * 25 + Math.sin(x * 0.012) * 15 + Math.cos(x * 0.003) * 35;
      ctx.lineTo(x, horizonY - 20 - Math.abs(peak));
    }
    ctx.lineTo(W, horizonY + 10);
    ctx.lineTo(0, horizonY + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#06030C';
    ctx.beginPath();
    const mountainPoints = [
      { x: 0, y: horizonY - 15 },
      { x: W * 0.08, y: horizonY - 45 },
      { x: W * 0.16, y: horizonY - 18 },
      { x: W * 0.24, y: horizonY - 70 },
      { x: W * 0.32, y: horizonY - 35 },
      { x: W * 0.42, y: horizonY - 95 },
      { x: W * 0.52, y: horizonY - 40 },
      { x: W * 0.62, y: horizonY - 80 },
      { x: W * 0.72, y: horizonY - 30 },
      { x: W * 0.82, y: horizonY - 65 },
      { x: W * 0.91, y: horizonY - 20 },
      { x: W, y: horizonY - 40 },
    ];
    ctx.moveTo(0, horizonY + 5);
    mountainPoints.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(W, horizonY + 15);
    ctx.lineTo(0, horizonY + 15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    mountainPoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 6. OCEAN BASE
    const oceanHeight = H - horizonY;
    const oceanGrd = ctx.createLinearGradient(0, horizonY, 0, H);
    oceanGrd.addColorStop(0.0, '#0E071D');
    oceanGrd.addColorStop(0.3, '#090414');
    oceanGrd.addColorStop(0.7, '#05020B');
    oceanGrd.addColorStop(1.0, '#030107');
    ctx.fillStyle = oceanGrd;
    ctx.fillRect(0, horizonY, W, oceanHeight);

    const reflGrd = ctx.createLinearGradient(0, horizonY, 0, horizonY + 70);
    reflGrd.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    reflGrd.addColorStop(0.5, 'rgba(168, 85, 247, 0.16)');
    reflGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = reflGrd;
    ctx.fillRect(0, horizonY, W, 70);

    // 7. FLOWING 3D OCEAN WAVE LINES & SYNTHWAVE GRID
    waveLayersRef.current.forEach((wave) => {
      const y = horizonY + Math.pow(wave.progress, 1.8) * oceanHeight;
      const waveAmp = wave.amp * (0.3 + wave.progress * 0.7);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 8) {
        const waveY = y
          + Math.sin(x * wave.freq + animTime * wave.speed + wave.offset) * waveAmp
          + Math.sin(x * wave.freq * 2.2 + animTime * wave.speed * 0.7) * (waveAmp * 0.4);
        ctx.lineTo(x, waveY);
      }
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 1 + wave.progress * 1.5;
      ctx.stroke();
    });

    const centerX = W * 0.5;
    const lineCount = 18;
    ctx.lineWidth = 1.0;
    for (let i = 0; i <= lineCount; i++) {
      const factor = (i / lineCount - 0.5) * 2;
      const bottomX = centerX + factor * W * 1.2;
      const gridGrd = ctx.createLinearGradient(centerX, horizonY, bottomX, H);
      gridGrd.addColorStop(0, 'rgba(168, 85, 247, 0)');
      gridGrd.addColorStop(0.2, 'rgba(168, 85, 247, 0.12)');
      gridGrd.addColorStop(1, 'rgba(59, 130, 246, 0.25)');
      ctx.strokeStyle = gridGrd;
      ctx.beginPath();
      ctx.moveTo(centerX, horizonY);
      ctx.lineTo(bottomX, H);
      ctx.stroke();
    }
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    updateShootingStar(W, H);
    draw(ctx, W, H, frameRef.current);

    frameRef.current += 1;
    animRef.current = requestAnimationFrame(animate);
  }, [draw, updateShootingStar]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      initScene(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [animate, initScene]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
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
    <div className="w-full page-enter">
      <SEO
        title="Build Public Reputation & Get Honest Code Reviews"
        description="CodeNest is a dual-identity developer platform. Share tech insights publicly on Nest Feed or get 100% anonymous, bias-free code reviews on Nest Shadow."
      />

      {/* ── Top Nav (Centered Max-Width Container) ───────────────────────── */}
      <header className="w-full border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-4">
          <nav className="flex items-center justify-between">
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
        </div>
      </header>

      {/* ── FULL-WIDTH HERO SECTION (Edge-to-Edge 100% Screen Width) ─────── */}
      {!user && (
        <section
          className="relative w-full overflow-hidden bg-[var(--bg-base)]"
          style={{ minHeight: '65vh' }}
        >
          {/* 100% Full-Width Canvas Background */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 pointer-events-none"
          >
            <PageBackground isDark={isDark} />
          </div>

          {/* Dark gradient overlay across full width for maximum text contrast */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-1 pointer-events-none"
            style={{
              background: isDark
                ? 'linear-gradient(105deg, rgba(10,8,16,0.85) 0%, rgba(10,8,16,0.65) 55%, rgba(10,8,16,0.20) 100%)'
                : 'linear-gradient(105deg, rgba(28,20,10,0.75) 0%, rgba(28,20,10,0.50) 55%, rgba(28,20,10,0.15) 100%)',
            }}
          />

          {/* Centered Content Container */}
          <div
            className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24 flex items-center justify-between"
            style={{ minHeight: '65vh' }}
          >
            {/* Left: Text Content */}
            <div className="flex flex-col justify-center max-w-2xl space-y-6">
              {/* Pill Badge */}
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold w-fit"
                style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.35)', color: '#FCD34D' }}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                🚀 The Dual-Identity Platform for Developers
              </div>

              {/* Main Headline */}
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12]"
                style={{ color: '#F5F0FF', textShadow: '0 2px 32px rgba(0,0,0,0.8)' }}
              >
                Build your profile.{' '}
                <span className="gradient-text">Get honest</span>{' '}
                code reviews.
              </h1>

              {/* Subheading / Description */}
              <p
                className="text-base sm:text-lg leading-relaxed max-w-lg"
                style={{ color: '#D4C4B0', textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}
              >
                One account. Two worlds. Share publicly on{' '}
                <strong style={{ color: '#FDE68A' }}>Nest Feed</strong>, or switch to{' '}
                <strong style={{ color: '#FDE68A' }}>Nest Shadow</strong>{' '}
                for completely anonymous, bias-free code reviews.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-md hover:shadow-lg">
                    Get Started — it's free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    className="!bg-amber-500 hover:!bg-amber-400 !text-black !border-0 shadow-md hover:shadow-amber-500/40 hover:shadow-lg font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                  >
                    Sign In →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Floating Code Snippet Card (Desktop Only) */}
            <div className="hidden lg:block select-none max-w-xs">
              <div
                className="p-5 rounded-2xl shadow-2xl"
                style={{ background: 'rgba(10,8,16,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <pre className="font-mono text-[12px] leading-relaxed" style={{ color: '#FCD34D' }}>
{`// Submit anonymously
const review = await shadow.submit({
  code: myCode,
  identity: 'hidden',
  bias: false,
});`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Page Content Below Hero ──────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-10 space-y-10">
        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        {!user && (
          <section className="rounded-2xl border border-white/10 shadow-[var(--shadow-sm)] px-6 py-6" style={{ background: 'rgba(14,12,20,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
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
          <section className="rounded-2xl border border-white/10 shadow-[var(--shadow-sm)] p-6 sm:p-8 space-y-6" style={{ background: 'rgba(14,12,20,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
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
        <section className="rounded-2xl border border-white/10 shadow-[var(--shadow-sm)] p-5 sm:p-7 space-y-5" style={{ background: 'rgba(14,12,20,0.60)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
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
          <section className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[var(--shadow-md)] p-8 sm:p-10 text-center space-y-4" style={{ background: 'rgba(14,12,20,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
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
    </div>
  );
}
