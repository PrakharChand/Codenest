import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
// Features: Starry sky, Shooting stars, Mountain silhouettes, Horizon backlight glow, and Flowing 3D Ocean Waves.
function FeedPageBackground() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const frameRef  = useRef(0);

  // Scene references
  const starsRef        = useRef([]);
  const shootingStarRef = useRef({ active: false, timer: 0 });
  const waveLayersRef   = useRef([]);

  const isDark = useCallback(() =>
    document.documentElement.classList.contains('dark-mode'), []);

  const initScene = useCallback((W, H) => {
    // 1. Natural twinkling stars
    starsRef.current = Array.from({ length: 280 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.45, // Scattered across upper sky
      r: Math.random() * 1.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.009 + 0.003,
      brightness: Math.random() * 0.7 + 0.3,
    }));

    // 2. Animated wave layers for the 3D Ocean
    waveLayersRef.current = Array.from({ length: 18 }, (_, i) => {
      const progress = (i + 1) / 18;
      return {
        progress,
        speed: 0.005 + progress * 0.004,
        amp: 3 + progress * 10,
        freq: 0.004 + progress * 0.002,
        offset: Math.random() * Math.PI * 2,
        color: i % 3 === 0
          ? `rgba(168, 85, 247, ${(0.18 + progress * 0.30).toFixed(2)})`   // Neon Purple
          : i % 3 === 1
          ? `rgba(59, 130, 246, ${(0.15 + progress * 0.28).toFixed(2)})`   // Neon Blue / Cyan
          : `rgba(245, 158, 11, ${(0.10 + progress * 0.22).toFixed(2)})`,  // Sunset Amber
      };
    });
  }, []);

  // Helper to spawn shooting stars every ~5 seconds
  const updateShootingStar = useCallback((W, H) => {
    const star = shootingStarRef.current;
    if (!star.active) {
      star.timer = (star.timer || 0) + 1;
      // Spawn roughly every 280-360 frames (~5 seconds at 60fps)
      if (star.timer > 280 + Math.random() * 80) {
        star.active = true;
        star.timer = 0;
        star.x = Math.random() * W * 0.7 + W * 0.1;
        star.y = Math.random() * H * 0.2 + H * 0.05;
        const angle = (Math.random() * 15 + 25) * (Math.PI / 180); // 25-40 deg diagonal
        const speed = 12 + Math.random() * 6;
        star.vx = Math.cos(angle) * speed;
        star.vy = Math.sin(angle) * speed;
        star.len = 90 + Math.random() * 40;
        star.life = 0;
        star.maxLife = 70; // ~1.15 seconds
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

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animTime = prefersReducedMotion ? 0 : t;

    // Horizon line height (mountain base & ocean origin)
    const horizonY = H * 0.32;

    // ── 1. SKY BASE GRADIENT (Deep Pitch Black to Midnight Violet) ────
    const skyGrd = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
    skyGrd.addColorStop(0.0, '#040209'); // Pitch Space Black
    skyGrd.addColorStop(0.4, '#0D061A'); // Deep Midnight Violet
    skyGrd.addColorStop(0.8, '#1A0B2B'); // Dark Velvet Purple
    skyGrd.addColorStop(1.0, '#290E38'); // Deep Horizon Purple
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, W, horizonY + 40);

    // ── 2. STARRY SKY & TWINKLING ──────────────────────────────────────
    starsRef.current.forEach((s) => {
      const twinkle = s.brightness * (0.45 + 0.55 * Math.sin(s.phase + animTime * s.speed));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      const hue = s.phase < 1.2 ? '255,240,210' : s.phase < 2.5 ? '210,225,255' : '255,255,255';
      ctx.fillStyle = `rgba(${hue}, ${twinkle.toFixed(3)})`;
      ctx.fill();
    });

    // ── 3. SHOOTING STAR ──────────────────────────────────────────────
    const sStar = shootingStarRef.current;
    if (sStar.active && !prefersReducedMotion) {
      const alpha = Math.sin((sStar.life / sStar.maxLife) * Math.PI); // Fade in & out
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

      // Glowing head spark
      ctx.beginPath();
      ctx.arc(headX, headY, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.fill();
    }

    // ── 4. HORIZON SUNSET BACKLIGHT GLOW (behind Mountains) ───────────
    const glowX = W * 0.5;
    const glowY = horizonY - 10;
    const glowRadius = Math.max(W * 0.45, 320);
    const horizonGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);

    horizonGlow.addColorStop(0.0, 'rgba(255, 130, 0, 0.68)'); // Fiery Sun Gold / Orange
    horizonGlow.addColorStop(0.35, 'rgba(225, 29, 72, 0.48)'); // Crimson / Magenta Red
    horizonGlow.addColorStop(0.70, 'rgba(147, 51, 234, 0.28)');// Neon Violet
    horizonGlow.addColorStop(1.0, 'rgba(10, 5, 20, 0)');

    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - glowRadius * 0.6, W, glowRadius * 1.2);

    // ── 5. MULTI-LAYER MOUNTAIN SILHOUETTE ─────────────────────────────

    // Layer A: Distant Low Mountains
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

    // Layer B: Main Prominent Foreground Peaks (Sharp pitch-black alpine ridges)
    ctx.fillStyle = '#06030C';
    ctx.beginPath();

    const mountainPoints = [
      { x: 0, y: horizonY - 15 },
      { x: W * 0.08, y: horizonY - 45 },
      { x: W * 0.16, y: horizonY - 18 },
      { x: W * 0.24, y: horizonY - 70 }, // Peak 1
      { x: W * 0.32, y: horizonY - 35 },
      { x: W * 0.42, y: horizonY - 95 }, // Main Central High Peak
      { x: W * 0.52, y: horizonY - 40 },
      { x: W * 0.62, y: horizonY - 80 }, // Peak 2
      { x: W * 0.72, y: horizonY - 30 },
      { x: W * 0.82, y: horizonY - 65 }, // Peak 3
      { x: W * 0.91, y: horizonY - 20 },
      { x: W, y: horizonY - 40 },
    ];

    ctx.moveTo(0, horizonY + 5);
    mountainPoints.forEach((pt) => {
      ctx.lineTo(pt.x, pt.y);
    });
    ctx.lineTo(W, horizonY + 15);
    ctx.lineTo(0, horizonY + 15);
    ctx.closePath();
    ctx.fill();

    // Golden rim stroke along main mountain ridge
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    mountainPoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // ── 6. OCEAN BASE (Horizon to Bottom of Screen) ────────────────────
    const oceanHeight = H - horizonY;
    const oceanGrd = ctx.createLinearGradient(0, horizonY, 0, H);
    oceanGrd.addColorStop(0.0, '#0E071D');
    oceanGrd.addColorStop(0.3, '#090414');
    oceanGrd.addColorStop(0.7, '#05020B');
    oceanGrd.addColorStop(1.0, '#030107');
    ctx.fillStyle = oceanGrd;
    ctx.fillRect(0, horizonY, W, oceanHeight);

    // Horizon Water Light Reflection
    const reflGrd = ctx.createLinearGradient(0, horizonY, 0, horizonY + 70);
    reflGrd.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    reflGrd.addColorStop(0.5, 'rgba(168, 85, 247, 0.16)');
    reflGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = reflGrd;
    ctx.fillRect(0, horizonY, W, 70);

    // ── 7. FLOWING 3D OCEAN WAVE LINES & SYNTHWAVE GRID ───────────────

    // Horizontal Perspective Wave Lines
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

    // Vertical Perspective Grid Lines fanning out from Horizon Center
    const centerX = W * 0.5;
    const lineCount = 18;
    ctx.lineWidth = 1.0;

    for (let i = 0; i <= lineCount; i++) {
      const factor = (i / lineCount - 0.5) * 2; // -1 to +1
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

  return createPortal(
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
    />,
    document.body
  );
}

// ─── Main Feed Page ─────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileStats, setProfileStats] = useState(null);

  // Default to 'trending' tab if user has < 5 connections, else 'following'
  const [activeTab, setActiveTab] = useState('following');
  const [tabInitialized, setTabInitialized] = useState(false);

  // Mount: make AppShell transparent so the fixed canvas shows through.
  // Tailwind's bg-[var(--bg-base)] sets `background-color` (not `background`),
  // so we override both properties with inline styles (always highest specificity).
  useEffect(() => {
    const shell = document.querySelector('.min-h-screen');
    const savedBg    = shell ? shell.style.background : '';
    const savedBgCol = shell ? shell.style.backgroundColor : '';
    const savedBodyBg = document.body.style.backgroundColor;

    if (shell) {
      shell.style.background = 'transparent';
      shell.style.backgroundColor = 'transparent';
    }
    document.body.style.backgroundColor = 'transparent';
    document.body.classList.add('feed-bg-active');
    document.documentElement.classList.add('dark-mode');

    return () => {
      if (shell) {
        shell.style.background = savedBg;
        shell.style.backgroundColor = savedBgCol;
      }
      document.body.style.backgroundColor = savedBodyBg;
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
          {/* Page Header */}
          <div className="flex items-center justify-between py-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Your Feed</h1>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/posts/new')}
              className="px-4 py-2 font-extrabold bg-[var(--color-primary)] text-black shadow-md hover:scale-[1.02] transition-all"
            >
              + New Post
            </Button>
          </div>

          {/* Shadow Mode Discovery Banner */}
          <ShadowDiscoveryBanner />

          {/* AI Learning Roadmap Generator Component */}
          <AIRoadmapGenerator />

          {/* Feed Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-1.5 pt-2">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('following')}
                className={`pb-2 text-xs font-extrabold transition-colors border-b-2 ${
                  activeTab === 'following'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Showing Feed
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('trending')}
                className={`pb-2 text-xs font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'trending'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <span>🔴</span>
                <span>Trending: 7 Days ▾</span>
              </button>
            </div>
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
                name={user?.name || 'Prakhar'}
                className="w-12 h-12"
              />
              <div className="min-w-0">
                <h3 className="font-bold text-white text-base truncate">{user?.name || 'Prakhar'}</h3>
                <p className="text-xs text-[var(--text-muted)] truncate">@{user?.username || 'prakharChand'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center border-t border-[var(--border-main)] pt-3 text-xs">
              <div>
                <span className="block font-extrabold text-white text-base">
                  {profileStats?.postCount ?? 4}
                </span>
                <span className="text-[var(--text-muted)] font-medium">Posts</span>
              </div>
              <div>
                <span className="block font-extrabold text-white text-base">
                  {profileStats?.followerCount ?? 5}
                </span>
                <span className="text-[var(--text-muted)] font-medium">Followers</span>
              </div>
              <div>
                <span className="block font-extrabold text-white text-base">
                  {profileStats?.followingCount ?? 7}
                </span>
                <span className="text-[var(--text-muted)] font-medium">Following</span>
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
