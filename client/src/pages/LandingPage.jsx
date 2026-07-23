import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsApi } from '../api/postsApi';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Dual Identity Hero Section for Logged-Out Visitors */}
      {!user && (
        <div className="rounded-2xl border border-main bg-gradient-to-br from-surface to-surface-hover p-8 md:p-12 text-center space-y-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            🚀 The Dual-Identity Platform for Developers
          </div>

          <h1 className="text-3xl md:text-5-xl font-extrabold tracking-tight text-main max-w-3xl mx-auto">
            Build your public dev profile. Get <span className="text-primary">bias-free</span> anonymous code reviews.
          </h1>

          <p className="text-base md:text-lg text-muted max-w-2xl mx-auto">
            One account, two worlds: share insights publicly on <strong className="text-main">Nest Feed</strong>, or switch to <strong className="text-main">Nest Shadow</strong> for completely honest, anonymous code reviews with zero bias.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Get Started for Free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Dual Identity Concept Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-6 text-left">
            <Card className="p-4 border-primary/20 space-y-1">
              <div className="font-bold text-main flex items-center gap-2">
                <span>🌐</span> Nest Feed (Public)
              </div>
              <p className="text-xs text-muted">
                Post blogs, share code snippets, connect with devs, and showcase your work with your public profile.
              </p>
            </Card>

            <Card className="p-4 border-primary/20 space-y-1">
              <div className="font-bold text-main flex items-center gap-2">
                <span>👤</span> Nest Shadow (Anonymous)
              </div>
              <p className="text-xs text-muted">
                Submit code anonymously for review. Permanent alias, zero real-identity leakage, 100% focused on code quality.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Public Post Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-main">Public Community Feed</h2>
          {user && (
            <Link to="/posts/new">
              <Button variant="primary" size="sm">
                + Create Post
              </Button>
            </Link>
          )}
        </div>

        <PaginatedList
          fetchData={(params) => postsApi.list(params)}
          renderItem={(post) => <PostCard key={post.id} post={post} />}
          emptyTitle="No public posts yet"
          emptyDescription="Be the first to share an article or snippet with the community!"
          emptyActionLabel={user ? "Write First Post" : "Join to Post"}
          onEmptyAction={() => {}}
        />
      </div>
    </div>
  );
}
