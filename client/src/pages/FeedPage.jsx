import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { postsApi } from '../api/postsApi';
import { usersApi } from '../api/usersApi';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';

export default function FeedPage() {
  const { user } = useAuth();
  const [profileStats, setProfileStats] = useState(null);

  // Mocked activity data for Recharts contribution visualization
  const activityData = [
    { day: 'Mon', posts: 1, likes: 4 },
    { day: 'Tue', posts: 2, likes: 7 },
    { day: 'Wed', posts: 0, likes: 2 },
    { day: 'Thu', posts: 3, likes: 9 },
    { day: 'Fri', posts: 1, likes: 5 },
    { day: 'Sat', posts: 4, likes: 12 },
    { day: 'Sun', posts: 2, likes: 8 },
  ];

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        const data = await usersApi.getProfile(user.id);
        setProfileStats(data);
      } catch (err) {
        // Fallback
      }
    }
    loadStats();
  }, [user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

        <PaginatedList
          fetchData={(params) => postsApi.list(params)}
          renderItem={(post) => <PostCard key={post.id} post={post} />}
          emptyTitle="Your feed is empty"
          emptyDescription="Connect with other developers or explore public posts to see content here."
          emptyActionLabel="Explore Communities"
          onEmptyAction={() => {}}
        />
      </div>

      {/* Sidebar Column: Stats & Activity Chart */}
      <div className="space-y-6">
        {/* User Card Summary */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar_url || 'https://via.placeholder.com/40'}
              alt={user?.name}
              className="w-12 h-12 rounded-full object-cover border border-main"
            />
            <div>
              <h3 className="font-bold text-main">{user?.name}</h3>
              <p className="text-xs text-muted">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center border-t border-main pt-3 text-xs">
            <div>
              <span className="block font-bold text-main text-base">
                {profileStats?.post_count || 0}
              </span>
              <span className="text-muted">Posts</span>
            </div>
            <div>
              <span className="block font-bold text-main text-base">
                {profileStats?.connection_count || 0}
              </span>
              <span className="text-muted">Connections</span>
            </div>
          </div>
        </Card>

        {/* Weekly Activity Chart (Recharts) */}
        <Card className="space-y-3">
          <h4 className="text-sm font-semibold text-main">Weekly Activity</h4>
          <div className="h-40 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <XAxis dataKey="day" stroke="var(--text-subtle)" fontSize={10} />
                <YAxis stroke="var(--text-subtle)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="likes" stroke="var(--color-primary)" fill="var(--color-primary-light)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
