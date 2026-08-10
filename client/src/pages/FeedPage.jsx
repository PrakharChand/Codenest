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

// ─── Main Feed Page ─────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileStats, setProfileStats] = useState(null);

  // Default to 'trending' tab if user has < 5 connections, else 'following'
  const [activeTab, setActiveTab] = useState('following');
  const [tabInitialized, setTabInitialized] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark-mode');
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-10">
        <SEO
          title="Public Developer Feed"
          description="Browse the latest developer posts, code snippets, engineering discussions, and technology insights on CodeNest."
        />

        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-6">
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
        <div className="lg:col-span-4 space-y-6">
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
  );
}
