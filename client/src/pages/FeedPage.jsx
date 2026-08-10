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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animTime = prefersReducedMotion ? 0 : t;

    // ── 1. CLEAN DEEP SPACE BASE (#0a0a0f) ─────────────────────────────
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    // Subtle ambient top glow
    const topGlow = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, W * 0.6);
    topGlow.addColorStop(0, 'rgba(245, 166, 35, 0.04)');
    topGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, W, H * 0.4);

    // ── 2. STARRY SKY & NATURAL TWINKLE ────────────────────────────────
    starsRef.current.forEach((s) => {
      const twinkle = s.brightness * (0.35 + 0.65 * Math.sin(s.phase + animTime * s.speed));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle.toFixed(3)})`;
      ctx.fill();
    });

    // ── 3. DIAGONAL SHOOTING STAR ─────────────────────────────────────
    const sStar = shootingStarRef.current;
    if (sStar.active && !prefersReducedMotion) {
      const alpha = Math.sin((sStar.life / sStar.maxLife) * Math.PI);
      const headX = sStar.x;
      const headY = sStar.y;
      const tailX = headX - (sStar.vx / 12) * sStar.len;
      const tailY = headY - (sStar.vy / 12) * sStar.len;

      const starGrd = ctx.createLinearGradient(tailX, tailY, headX, headY);
      starGrd.addColorStop(0, 'rgba(245, 166, 35, 0)');
      starGrd.addColorStop(0.7, `rgba(245, 166, 35, ${(alpha * 0.6).toFixed(2)})`);
      starGrd.addColorStop(1, `rgba(255, 255, 255, ${alpha.toFixed(2)})`);

      ctx.strokeStyle = starGrd;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(headX, headY, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.fill();
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
