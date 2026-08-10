import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsApi } from '../api/postsApi';
import { usersApi } from '../api/usersApi';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import AIRoadmapGenerator from '../components/organisms/AIRoadmapGenerator';
import AIConnectionSuggestions from '../components/organisms/AIConnectionSuggestions';
import WeeklyActivityChart from '../components/organisms/WeeklyActivityChart';
import ShadowDiscoveryBanner from '../components/organisms/ShadowDiscoveryBanner';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Avatar from '../components/atoms/Avatar';
import SEO from '../components/atoms/SEO';

// ─── Feed Page Animated Background ─────────────────────────────────────────
// A fixed canvas that covers the full viewport behind all feed content.
// Uses CodeNest's purple/blue/gold palette: stars, nebula glows, aurora waves.
function FeedPageBackground() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const frameRef  = useRef(0);

  // Particle fields
  const starsRef   = useRef([]);
  const dustRef    = useRef([]);
  const glowsRef   = useRef([]);
  const wavesRef   = useRef([]);

  const isDark = useCallback(() =>
    document.documentElement.classList.contains('dark-mode'), []);

  const initScene = useCallback((W, H) => {
    // Fine twinkling stars
    starsRef.current = Array.from({ length: 260 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.007 + 0.002,
      brightness: Math.random() * 0.6 + 0.3,
    }));

    // Slow-drifting dust/pollen particles
    dustRef.current = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2.2 + 0.8,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.14,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.25 + 0.08,
    }));

    // Large atmospheric nebula glows (static radial blobs)
    glowsRef.current = [
      { x: W * 0.15, y: H * 0.22, rx: W * 0.28, ry: H * 0.22, color: '120,80,200', alpha: 0.10 },
      { x: W * 0.78, y: H * 0.55, rx: W * 0.30, ry: H * 0.25, color: '30,90,180',  alpha: 0.09 },
      { x: W * 0.50, y: H * 0.85, rx: W * 0.35, ry: H * 0.18, color: '200,120,30', alpha: 0.08 },
      { x: W * 0.88, y: H * 0.12, rx: W * 0.20, ry: H * 0.16, color: '160,60,210', alpha: 0.07 },
      { x: W * 0.30, y: H * 0.70, rx: W * 0.22, ry: H * 0.14, color: '20,140,200', alpha: 0.07 },
    ];

    // Aurora/wave layers at varying heights
    wavesRef.current = Array.from({ length: 4 }, (_, i) => ({
      offset: Math.random() * Math.PI * 2,
      speed:  0.004 + i * 0.002,
      amp:    18 + i * 12,
      yBase:  0.22 + i * 0.20,
      freq:   0.003 + i * 0.0015,
      alpha:  0.055 - i * 0.010,
      color:  i % 2 === 0 ? '100,60,220' : '30,100,200',
    }));
  }, []);

  const draw = useCallback((ctx, W, H, t) => {
    ctx.clearRect(0, 0, W, H);
    const dark = isDark();

    // ── Base sky gradient ────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (dark) {
      sky.addColorStop(0,    '#080612');
      sky.addColorStop(0.40, '#0D0A1E');
      sky.addColorStop(0.75, '#100C1A');
      sky.addColorStop(1,    '#0A0810');
    } else {
      sky.addColorStop(0,    '#F4EFFF');
      sky.addColorStop(0.35, '#EDE8FF');
      sky.addColorStop(0.70, '#E8F0FF');
      sky.addColorStop(1,    '#EDF4FF');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // ── Nebula atmospheric glows ─────────────────────────────────────────
    glowsRef.current.forEach((g) => {
      const pulse = 1 + 0.06 * Math.sin(t * 0.004 + g.x);
      const rx = g.rx * pulse;
      const ry = g.ry * pulse;
      const a = dark ? g.alpha : g.alpha * 0.45;

      ctx.save();
      // Scale to make the radialGradient appear elliptical
      ctx.translate(g.x, g.y);
      ctx.scale(rx, ry);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      grd.addColorStop(0,   `rgba(${g.color},${(a * 1.6).toFixed(3)})`);
      grd.addColorStop(0.5, `rgba(${g.color},${(a * 0.7).toFixed(3)})`);
      grd.addColorStop(1,   `rgba(${g.color},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ── Twinkling stars ──────────────────────────────────────────────────
    if (dark) {
      starsRef.current.forEach((star) => {
        const twinkle = star.brightness * (0.5 + 0.5 * Math.sin(star.phase + t * star.speed));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        // Colour-tint: amber/white/blue randomly
        const hue = star.phase < 1.0 ? '255,240,200' : star.phase < 2.5 ? '200,210,255' : '255,255,255';
        ctx.fillStyle = `rgba(${hue},${twinkle.toFixed(3)})`;
        ctx.fill();
      });
    }

    // ── Drifting dust/pollen particles ───────────────────────────────────
    dustRef.current.forEach((d) => {
      const pulse = d.alpha * (0.6 + 0.4 * Math.sin(d.phase + t * 0.003));
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      const col = dark ? '180,150,255' : '120,80,200';
      ctx.fillStyle = `rgba(${col},${(pulse * (dark ? 1 : 0.5)).toFixed(3)})`;
      ctx.fill();
    });

    // ── Aurora / flowing wave bands ──────────────────────────────────────
    wavesRef.current.forEach((wave) => {
      const wy = H * wave.yBase;
      ctx.beginPath();
      ctx.moveTo(0, wy);
      for (let x = 0; x <= W; x += 5) {
        const y = wy
          + Math.sin(x * wave.freq + t * wave.speed + wave.offset) * wave.amp
          + Math.sin(x * wave.freq * 1.6 + t * wave.speed * 0.6 + wave.offset + 1.2) * wave.amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();

      const wg = ctx.createLinearGradient(0, wy - wave.amp, 0, wy + wave.amp * 2);
      const a = dark ? wave.alpha : wave.alpha * 0.4;
      wg.addColorStop(0,   `rgba(${wave.color},${(a * 1.8).toFixed(3)})`);
      wg.addColorStop(0.5, `rgba(${wave.color},${(a).toFixed(3)})`);
      wg.addColorStop(1,   `rgba(${wave.color},0)`);
      ctx.fillStyle = wg;
      ctx.fill();
    });

    // ── Subtle golden horizon accent ─────────────────────────────────────
    const horizY = H * 0.72;
    const horizGrd = ctx.createLinearGradient(0, horizY - 60, 0, horizY + 80);
    const hAlpha = dark ? 0.06 : 0.03;
    horizGrd.addColorStop(0,   `rgba(245,158,11,0)`);
    horizGrd.addColorStop(0.4, `rgba(245,158,11,${hAlpha})`);
    horizGrd.addColorStop(1,   `rgba(245,158,11,0)`);
    ctx.fillStyle = horizGrd;
    ctx.fillRect(0, horizY - 60, W, 140);
  }, [isDark]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    draw(ctx, W, H, frameRef.current);

    // Drift dust particles
    dustRef.current.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10;
      if (d.y > H + 10) d.y = -10;
    });

    frameRef.current += 1;
    animRef.current = requestAnimationFrame(animate);
  }, [draw]);

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
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}

// ─── Main Feed Page ─────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileStats, setProfileStats] = useState(null);

  // Fix 10: Default to 'trending' tab if user has < 5 connections, else 'following'
  const [activeTab, setActiveTab] = useState('following');
  const [tabInitialized, setTabInitialized] = useState(false);

  // Mount: directly override AppShell root div background so the fixed canvas is visible.
  // We use inline style (highest specificity) because Tailwind's bg-[var(--bg-base)]
  // cannot be overridden by a CSS class selector.
  useEffect(() => {
    // AppShell root is the first div inside <body> (or first .min-h-screen)
    const shell = document.querySelector('.min-h-screen');
    if (shell) {
      shell.dataset.feedBgSaved = shell.style.background;
      shell.style.background = 'transparent';
    }
    document.body.classList.add('feed-bg-active');
    return () => {
      if (shell) {
        shell.style.background = shell.dataset.feedBgSaved || '';
        delete shell.dataset.feedBgSaved;
      }
      document.body.classList.remove('feed-bg-active');
    };
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        const data = await usersApi.getProfile(user.id);
        setProfileStats(data);
        if (!tabInitialized) {
          const count = data?.followingCount ?? 0;
          setActiveTab(count < 5 ? 'trending' : 'following');
          setTabInitialized(true);
        }
      } catch (err) {
        // Fallback
      }
    }
    loadStats();
  }, [user, tabInitialized]);

  return (
    <>
      {/* ── Full-page fixed animated background canvas ─────────────────── */}
      <FeedPageBackground />

      {/* ── All feed content — sits above the canvas via z-index ──────── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SEO
          title="Public Developer Feed"
          description="Browse the latest developer posts, code snippets, engineering discussions, and technology insights on CodeNest."
        />

        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-main">Your Feed</h1>
            <Link to="/posts/new">
              <Button variant="primary" size="sm">
                + New Post
              </Button>
            </Link>
          </div>

          {/* Fix 11: Shadow Mode Discovery Banner */}
          <ShadowDiscoveryBanner />

          {/* AI Learning Roadmap Generator Component */}
          <AIRoadmapGenerator />

          {/* Fix 10: Following vs Trending Feed Tabs */}
          <div className="flex items-center border-b border-[var(--border-main)] gap-4 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('following')}
              className={`pb-2.5 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'following'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-main'
              }`}
            >
              Following Feed
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trending')}
              className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'trending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-main'
              }`}
            >
              <span>🔥</span>
              <span>Trending (Top 24h)</span>
              {profileStats && profileStats.followingCount < 5 && activeTab === 'trending' && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-light text-primary rounded-full">
                  Recommended
                </span>
              )}
            </button>
          </div>

          {/* Feed List — each card wrapped in a separated container */}
          <PaginatedList
            key={activeTab}
            preset="feed"
            fetchData={(params) =>
              activeTab === 'trending'
                ? postsApi.trending(params)
                : postsApi.list(params)
            }
            renderItem={(post) => (
              <div
                key={post.id}
                className="feed-post-card"
              >
                <PostCard post={post} />
              </div>
            )}
            emptyTitle={activeTab === 'trending' ? 'No trending posts yet' : 'Your feed is empty'}
            emptyDescription={
              activeTab === 'trending'
                ? 'Be the first developer to share an insightful post today!'
                : 'Connect with other developers or switch to the Trending tab to explore posts.'
            }
            emptyActionLabel="Explore Communities"
            onEmptyAction={() => navigate('/communities')}
          />
        </div>

        {/* Sidebar Column: Stats, AI Connection Suggestions, & Real Weekly Activity Chart */}
        <div className="space-y-5">
          {/* User Card Summary */}
          <Card className="p-5 md:p-6 space-y-4 feed-sidebar-card">
            <div className="flex items-center gap-3">
              <Avatar
                src={user?.avatar_url}
                name={user?.name}
                className="w-12 h-12"
              />
              <div>
                <h3 className="font-bold text-main">{user?.name}</h3>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center border-t border-main pt-3 text-xs">
              <div>
                <span className="block font-bold text-main text-base">
                  {profileStats?.postCount ?? 0}
                </span>
                <span className="text-muted">Posts</span>
              </div>
              <div>
                <span className="block font-bold text-main text-base">
                  {profileStats?.followerCount ?? 0}
                </span>
                <span className="text-muted">Followers</span>
              </div>
              <div>
                <span className="block font-bold text-main text-base">
                  {profileStats?.followingCount ?? 0}
                </span>
                <span className="text-muted">Following</span>
              </div>
            </div>
          </Card>

          {/* AI Smart Developer Connection Suggestions (Public Identity Only) */}
          <AIConnectionSuggestions />

          {/* Real-time Weekly Activity Chart (Recharts) */}
          <WeeklyActivityChart />
        </div>
      </div>
    </>
  );
}
