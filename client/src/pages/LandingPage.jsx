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
function PageBackground({ isDark }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const starsRef = useRef([]);
  const birdsRef = useRef([]);
  const cloudsRef = useRef([]);
  const wavesRef = useRef([]);
  const frameRef = useRef(0);

  const initScene = useCallback((W, H) => {
    // Stars
    starsRef.current = Array.from({ length: 220 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.55,
      r: Math.random() * 1.6 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.008 + 0.003,
    }));
    // Birds
    birdsRef.current = Array.from({ length: 16 }, (_, i) => ({
      x: Math.random() * W * 0.7 + W * 0.1,
      y: Math.random() * H * 0.35 + H * 0.05,
      vx: Math.random() * 0.55 + 0.35,
      vy: Math.sin(i * 0.7) * 0.12,
      flap: Math.random() * Math.PI * 2,
      flapSpeed: Math.random() * 0.06 + 0.04,
      size: Math.random() * 3 + 3,
    }));
    // Clouds
    cloudsRef.current = Array.from({ length: 7 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.40 + H * 0.04,
      w: Math.random() * 160 + 80,
      h: Math.random() * 44 + 22,
      speed: Math.random() * 0.18 + 0.06,
      alpha: Math.random() * 0.18 + 0.06,
    }));
    // Ocean waves — multiple layers at different depths
    wavesRef.current = Array.from({ length: 5 }, (_, i) => ({
      offset: Math.random() * Math.PI * 2,
      speed: 0.008 + i * 0.004,
      amp: 10 + i * 6,
      yBase: 0.60 + i * 0.045,
      freq: 0.004 + i * 0.002,
      alpha: 0.55 - i * 0.08,
    }));
  }, []);

  const draw = useCallback((ctx, W, H, t) => {
    ctx.clearRect(0, 0, W, H);

    // ── SKY ZONE (top 65% of page) ─────────────────────────────────
    const skyH = H * 0.65;

    if (isDark) {
      // Sunset sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
      skyGrad.addColorStop(0, '#0A0810');
      skyGrad.addColorStop(0.30, '#16091C');
      skyGrad.addColorStop(0.58, '#2B1108');
      skyGrad.addColorStop(0.78, '#7C2D0A');
      skyGrad.addColorStop(0.92, '#D97706');
      skyGrad.addColorStop(1, '#F59E0B');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, skyH);

      // Sun glow
      const sunX = W * 0.70, sunY = skyH * 0.88;
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 200);
      glow.addColorStop(0, 'rgba(251,191,36,0.55)');
      glow.addColorStop(0.4, 'rgba(245,158,11,0.22)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, skyH);

      // Sun disk
      ctx.beginPath();
      ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
      const sd = ctx.createRadialGradient(sunX, sunY - 4, 4, sunX, sunY, 30);
      sd.addColorStop(0, '#FDE68A');
      sd.addColorStop(0.6, '#F59E0B');
      sd.addColorStop(1, '#D97706');
      ctx.fillStyle = sd;
      ctx.fill();

      // Twinkling stars
      starsRef.current.forEach((star) => {
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(star.phase + t * star.speed));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,200,${twinkle * 0.88})`;
        ctx.fill();
      });

      // Silhouette clouds
      cloudsRef.current.forEach((c) => {
        ctx.save();
        ctx.globalAlpha = c.alpha * 0.5;
        ctx.fillStyle = '#3D1A08';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else {
      // Sunrise sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
      skyGrad.addColorStop(0, '#E8D5B7');
      skyGrad.addColorStop(0.28, '#F5C89A');
      skyGrad.addColorStop(0.55, '#FBBF24');
      skyGrad.addColorStop(0.80, '#F97316');
      skyGrad.addColorStop(1, '#FDE68A');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, skyH);

      const sunX = W * 0.32, sunY = skyH * 0.84;
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 230);
      glow.addColorStop(0, 'rgba(253,230,138,0.70)');
      glow.addColorStop(0.4, 'rgba(251,191,36,0.30)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, skyH);

      ctx.beginPath();
      ctx.arc(sunX, sunY + 6 * Math.sin(t * 0.0003), 26, 0, Math.PI * 2);
      const sd = ctx.createRadialGradient(sunX, sunY - 4, 3, sunX, sunY, 26);
      sd.addColorStop(0, '#FFFBEB');
      sd.addColorStop(0.5, '#FDE68A');
      sd.addColorStop(1, '#FBBF24');
      ctx.fillStyle = sd;
      ctx.fill();

      // Morning clouds
      cloudsRef.current.forEach((c) => {
        ctx.save();
        ctx.globalAlpha = c.alpha + 0.12;
        const cg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w / 2);
        cg.addColorStop(0, 'rgba(255,255,255,0.90)');
        cg.addColorStop(0.6, 'rgba(253,230,138,0.35)');
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Birds
      birdsRef.current.forEach((bird) => {
        const flapAngle = Math.sin(bird.flap + t * bird.flapSpeed * 0.05);
        ctx.save();
        ctx.strokeStyle = 'rgba(92,50,10,0.70)';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        const bx = bird.x;
        const by = bird.y + Math.sin(t * 0.001) * 3;
        const wing = bird.size * (0.6 + 0.4 * Math.abs(flapAngle));
        ctx.beginPath();
        ctx.moveTo(bx - wing, by - flapAngle * wing * 0.5);
        ctx.quadraticCurveTo(bx - wing * 0.5, by + flapAngle * wing * 0.3, bx, by);
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + wing * 0.5, by + flapAngle * wing * 0.3, bx + wing, by - flapAngle * wing * 0.5);
        ctx.stroke();
        ctx.restore();
      });
    }

    // ── DESERT HILLS at the sky/ocean boundary ──────────────────────
    const hillY = skyH - 30;
    const hillGrad = ctx.createLinearGradient(0, hillY * 0.85, 0, skyH + 10);
    if (isDark) {
      hillGrad.addColorStop(0, '#1C0A04');
      hillGrad.addColorStop(1, '#0A0810');
    } else {
      hillGrad.addColorStop(0, '#D97706');
      hillGrad.addColorStop(1, '#78350F');
    }
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, hillY * 0.90);
    ctx.bezierCurveTo(W * 0.10, hillY * 0.75, W * 0.22, hillY * 0.70, W * 0.33, hillY * 0.82);
    ctx.bezierCurveTo(W * 0.44, hillY * 0.94, W * 0.54, hillY * 0.68, W * 0.64, hillY * 0.76);
    ctx.bezierCurveTo(W * 0.74, hillY * 0.84, W * 0.86, hillY * 0.78, W, hillY * 0.86);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // ── OCEAN ZONE (bottom 40% of page) ─────────────────────────────
    const oceanTop = H * 0.62;

    // Ocean base deep water gradient
    const oceanGrad = ctx.createLinearGradient(0, oceanTop, 0, H);
    if (isDark) {
      oceanGrad.addColorStop(0, '#1A0E2A');
      oceanGrad.addColorStop(0.25, '#0C1A3A');
      oceanGrad.addColorStop(0.60, '#062240');
      oceanGrad.addColorStop(1, '#020D1C');
    } else {
      oceanGrad.addColorStop(0, '#0369A1');
      oceanGrad.addColorStop(0.30, '#0C4A6E');
      oceanGrad.addColorStop(0.65, '#083344');
      oceanGrad.addColorStop(1, '#020D1C');
    }
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, oceanTop, W, H - oceanTop);

    // Sun / moon reflection on water
    const reflX = isDark ? W * 0.70 : W * 0.32;
    const reflColor = isDark ? 'rgba(245,158,11,' : 'rgba(253,230,138,';
    for (let i = 0; i < 8; i++) {
      const ry = oceanTop + 20 + i * 22;
      const rw = (70 - i * 7) * (0.7 + 0.3 * Math.sin(t * 0.02 + i));
      const rx = reflX - rw / 2 + Math.sin(t * 0.015 + i * 0.8) * 10;
      ctx.save();
      ctx.globalAlpha = (0.45 - i * 0.045) * (0.8 + 0.2 * Math.sin(t * 0.01 + i));
      ctx.fillStyle = `${reflColor}1)`;
      ctx.beginPath();
      ctx.ellipse(rx + rw / 2, ry, rw / 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Animated wave layers
    wavesRef.current.forEach((wave, idx) => {
      const wy = oceanTop + (H - oceanTop) * (wave.yBase - 0.60) * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, wy);
      for (let x = 0; x <= W; x += 4) {
        const y = wy + Math.sin(x * wave.freq + t * wave.speed + wave.offset) * wave.amp
          + Math.sin(x * wave.freq * 1.7 + t * wave.speed * 0.7 + wave.offset + 1) * wave.amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();

      const wg = ctx.createLinearGradient(0, wy - wave.amp, 0, wy + wave.amp * 2);
      if (isDark) {
        wg.addColorStop(0, `rgba(14,28,60,${wave.alpha + 0.1})`);
        wg.addColorStop(0.5, `rgba(6,30,55,${wave.alpha})`);
        wg.addColorStop(1, `rgba(2,13,28,${wave.alpha + 0.15})`);
      } else {
        wg.addColorStop(0, `rgba(3,105,161,${wave.alpha + 0.1})`);
        wg.addColorStop(0.5, `rgba(12,74,110,${wave.alpha})`);
        wg.addColorStop(1, `rgba(8,51,68,${wave.alpha + 0.15})`);
      }
      ctx.fillStyle = wg;
      ctx.fill();

      // Wave crest foam
      if (idx < 3) {
        ctx.beginPath();
        ctx.moveTo(0, wy);
        for (let x = 0; x <= W; x += 4) {
          const y = wy + Math.sin(x * wave.freq + t * wave.speed + wave.offset) * wave.amp
            + Math.sin(x * wave.freq * 1.7 + t * wave.speed * 0.7 + wave.offset + 1) * wave.amp * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = isDark ? 'rgba(180,150,100,0.18)' : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }, [isDark]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const t = frameRef.current;

    draw(ctx, W, H, t);

    // Move clouds
    cloudsRef.current.forEach((c) => {
      c.x += c.speed;
      if (c.x - c.w / 2 > W) c.x = -c.w / 2;
    });
    // Move birds (light only)
    if (!isDark) {
      birdsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.flap += b.flapSpeed;
        if (b.x > W + 60) {
          b.x = -60;
          b.y = Math.random() * window.innerHeight * 0.35 + window.innerHeight * 0.05;
        }
      });
    }

    frameRef.current += 1;
    animRef.current = requestAnimationFrame(animate);
  }, [draw, isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;

    const resize = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      initScene(canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [animate, initScene]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%' }}
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
