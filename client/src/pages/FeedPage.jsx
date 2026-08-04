import React, { useState, useEffect } from 'react';
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
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import Avatar from '../atoms/Avatar';
import SEO from '../atoms/SEO';

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileStats, setProfileStats] = useState(null);

  // Fix 10: Default to 'trending' tab if user has < 5 connections, else 'following'
  const [activeTab, setActiveTab] = useState('following');
  const [tabInitialized, setTabInitialized] = useState(false);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <SEO
        title="Public Developer Feed"
        description="Browse the latest developer posts, code snippets, engineering discussions, and technology insights on CodeNest."
      />
      {/* Main Feed Column */}
      <div className="lg:col-span-2 space-y-6">
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

        {/* Feed List */}
        <PaginatedList
          key={activeTab}
          preset="feed"
          fetchData={(params) =>
            activeTab === 'trending'
              ? postsApi.trending(params)
              : postsApi.list(params)
          }
          renderItem={(post) => <PostCard key={post.id} post={post} />}
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
      <div className="space-y-6">
        {/* User Card Summary */}
        <Card className="space-y-4">
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
  );
}
