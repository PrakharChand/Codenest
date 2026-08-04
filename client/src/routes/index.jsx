import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicRoute from './PublicRoute';
import ProtectedRoute from './ProtectedRoute';
import ShadowRoute from './ShadowRoute';
import Spinner from '../components/atoms/Spinner';
import AppShell from '../components/layout/AppShell';

// Synchronously loaded entry pages (Landing & Login) for instant first paint
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';

// ── Fix 2: Route-based Code Splitting (React.lazy + Suspense) ─────────────
// Public Pages
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const OAuthCallbackPage = lazy(() => import('../pages/OAuthCallbackPage'));

// Feed / Protected Public Pages
const FeedPage = lazy(() => import('../pages/FeedPage'));
const PostDetailPage = lazy(() => import('../pages/PostDetailPage'));
const CreatePostPage = lazy(() => import('../pages/CreatePostPage'));
const EditPostPage = lazy(() => import('../pages/EditPostPage'));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'));
const EditProfilePage = lazy(() => import('../pages/EditProfilePage'));
const CommunitiesPage = lazy(() => import('../pages/CommunitiesPage'));
const CommunityDetailPage = lazy(() => import('../pages/CommunityDetailPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const ConnectionsPage = lazy(() => import('../pages/ConnectionsPage'));
const ExplorePage = lazy(() => import('../pages/ExplorePage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

// Anonymous Setup
const AnonymousCreatePage = lazy(() => import('../pages/AnonymousCreatePage'));

// Shadow Pages (Lazy loaded separately for bundle size reduction)
const ShadowQueuePage = lazy(() => import('../pages/ShadowQueuePage'));
const ShadowSubmissionDetailPage = lazy(() => import('../pages/ShadowSubmissionDetailPage'));
const CreateSubmissionPage = lazy(() => import('../pages/CreateSubmissionPage'));
const MySubmissionsPage = lazy(() => import('../pages/MySubmissionsPage'));
const MyReviewsPage = lazy(() => import('../pages/MyReviewsPage'));
const ShadowProfilePage = lazy(() => import('../pages/ShadowProfilePage'));
const ShadowCommunityPage = lazy(() => import('../pages/ShadowCommunityPage'));

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center bg-[var(--bg-base)] text-main">
    <Spinner size="lg" />
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ─── Public Unprotected Routes ────────────────────────────────────── */}
        <Route path="/" element={<PublicRoute><AppShell><LandingPage /></AppShell></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/oauth-callback" element={<PublicRoute><OAuthCallbackPage /></PublicRoute>} />

        {/* ─── Protected Public / Feed Identity Routes ──────────────────────── */}
        <Route path="/feed" element={<ProtectedRoute><AppShell><FeedPage /></AppShell></ProtectedRoute>} />
        <Route path="/posts/new" element={<ProtectedRoute><AppShell><CreatePostPage /></AppShell></ProtectedRoute>} />
        <Route path="/posts/:id" element={<ProtectedRoute><AppShell><PostDetailPage /></AppShell></ProtectedRoute>} />
        <Route path="/posts/:id/edit" element={<ProtectedRoute><AppShell><EditPostPage /></AppShell></ProtectedRoute>} />
        <Route path="/users/:id" element={<ProtectedRoute><AppShell><UserProfilePage /></AppShell></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AppShell><SettingsPage /></AppShell></ProtectedRoute>} />
        <Route path="/settings/profile" element={<ProtectedRoute><AppShell><EditProfilePage /></AppShell></ProtectedRoute>} />
        <Route path="/communities" element={<ProtectedRoute><AppShell><CommunitiesPage /></AppShell></ProtectedRoute>} />
        <Route path="/communities/:id" element={<ProtectedRoute><AppShell><CommunityDetailPage /></AppShell></ProtectedRoute>} />
        <Route path="/connections" element={<ProtectedRoute><AppShell><ConnectionsPage /></AppShell></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><AppShell><ExplorePage /></AppShell></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><AppShell><NotificationsPage /></AppShell></ProtectedRoute>} />

        {/* ─── Anonymous Identity Setup Route ────────────────────────────────── */}
        <Route path="/anonymous/create" element={<ProtectedRoute><AppShell><AnonymousCreatePage /></AppShell></ProtectedRoute>} />
        <Route path="/shadow/create" element={<ProtectedRoute><AppShell><AnonymousCreatePage /></AppShell></ProtectedRoute>} />

        {/* ─── Nest Shadow Routes (Requires Auth AND Anonymous Identity) ─────── */}
        <Route path="/shadow/queue" element={<ShadowRoute><AppShell><ShadowQueuePage /></AppShell></ShadowRoute>} />
        <Route path="/shadow/submissions/new" element={<ShadowRoute><AppShell><CreateSubmissionPage /></AppShell></ShadowRoute>} />
        <Route path="/shadow/submissions/:id" element={<ShadowRoute><AppShell><ShadowSubmissionDetailPage /></AppShell></ShadowRoute>} />
        <Route path="/shadow/mine" element={<ShadowRoute><AppShell><MySubmissionsPage /></AppShell></ShadowRoute>} />
        <Route path="/shadow/my-reviews" element={<ShadowRoute><AppShell><MyReviewsPage /></AppShell></ShadowRoute>} />
        <Route path="/shadow/me" element={<ShadowRoute><AppShell><ShadowProfilePage /></AppShell></ShadowRoute>} />
        <Route path="/shadow/community" element={<ShadowRoute><AppShell><ShadowCommunityPage /></AppShell></ShadowRoute>} />

        {/* ─── Fallback Catch-All Route ──────────────────────────────────────── */}
        <Route path="*" element={<AppShell><div className="p-8 text-center"><h1 className="text-xl font-bold text-main">404 - Page Not Found</h1></div></AppShell>} />
      </Routes>
    </Suspense>
  );
}
