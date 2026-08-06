import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { communitiesApi } from '../api/communitiesApi';
import { useAuth } from '../context/AuthContext';
import { useRelationship } from '../context/RelationshipContext';
import Card from '../components/atoms/Card';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import CommunityTopicCard from '../components/organisms/CommunityTopicCard';
import SEO from '../components/atoms/SEO';

export default function CommunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { getCommunityMembershipState, updateCommunityMembership } = useRelationship();

  const [community, setCommunity] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null); // null = all topics
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Composer State
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postTopicId, setPostTopicId] = useState('');
  const [posting, setPosting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const numericId = parseInt(id, 10);
  const cachedMembership = getCommunityMembershipState(numericId);

  const isMember = cachedMembership
    ? Boolean(cachedMembership.isMember)
    : Boolean(community?.is_member || community?.isMember);

  const memberCount = cachedMembership && typeof cachedMembership.memberCount === 'number'
    ? cachedMembership.memberCount
    : (community?.member_count || 0);

  const isPrivate = community?.type === 'private';
  const isPending = community?.join_status === 'pending';
  const isAdmin = community?.is_admin || community?.viewer_role === 'owner' || community?.viewer_role === 'admin';

  useEffect(() => {
    async function loadCommunityAndTopics() {
      setLoading(true);
      setError(null);
      try {
        const [commData, topicsData] = await Promise.all([
          communitiesApi.get(id),
          communitiesApi.listTopics(id).catch(() => ({ data: [] })),
        ]);
        setCommunity(commData);
        setTopics(topicsData.data || []);
        updateCommunityMembership(commData.id, commData.is_member || commData.isMember, commData.member_count);
      } catch (err) {
        setError(err.message || 'Community not found.');
      } finally {
        setLoading(false);
      }
    }
    loadCommunityAndTopics();
  }, [id, updateCommunityMembership, refreshTrigger]);

  const handleToggleJoin = async () => {
    if (!user || !community) return;

    try {
      const res = await communitiesApi.join(id);
      if (res.join_status === 'pending') {
        toast.success('Request to join sent! An admin will review your application.');
        setCommunity((prev) => ({ ...prev, join_status: 'pending' }));
      } else {
        toast.success(`Joined ${community.name}!`);
        updateCommunityMembership(community.id, true, memberCount + 1);
        setCommunity((prev) => ({ ...prev, is_member: true, isMember: true, join_status: 'member' }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to join community');
    }
  };

  const handleLeaveCommunity = async () => {
    if (!window.confirm(`Leave ${community.name}?`)) return;
    try {
      await communitiesApi.leave(id);
      toast.success(`Left ${community.name}`);
      updateCommunityMembership(community.id, false, Math.max(memberCount - 1, 0));
      setCommunity((prev) => ({ ...prev, is_member: false, isMember: false, join_status: 'none' }));
    } catch (err) {
      toast.error(err.message || 'Failed to leave community');
    }
  };

  const handlePostInCommunity = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    setPosting(true);
    try {
      await communitiesApi.postInCommunity(id, {
        title: postTitle.trim(),
        content: postContent.trim(),
        topic_id: postTopicId ? parseInt(postTopicId, 10) : null,
      });
      setPostTitle('');
      setPostContent('');
      setPostTopicId('');
      setRefreshTrigger((prev) => prev + 1);
      toast.success('Post published to community!');
    } catch (err) {
      toast.error(err.message || 'Failed to post in community.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-danger">Community Not Found</h2>
        <p className="text-sm text-muted">{error}</p>
        <Link to="/communities">
          <Button variant="secondary" size="sm">
            ← Back to Communities
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <SEO title={community.name} description={community.description} />

      {/* ── Breadcrumb & Navigation Header ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link to="/communities" className="hover:text-primary transition-colors">
            Communities
          </Link>
          <span>›</span>
          <span className="text-main font-bold">{community.name}</span>
        </nav>

        <Link to="/communities">
          <Button variant="secondary" size="sm">
            ← Back to Communities
          </Button>
        </Link>
      </div>

      {/* ── Community Header Card ─────────────────────────────────────── */}
      <Card className="p-6 md:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-main">{community.name}</h1>
              <Badge variant={isPrivate ? 'warning' : 'secondary'} size="sm">
                {isPrivate ? '🔒 Private' : '🌐 Public'}
              </Badge>
              {community.viewer_role && (
                <Badge variant={community.viewer_role === 'owner' ? 'warning' : community.viewer_role === 'admin' ? 'primary' : 'default'} size="sm">
                  {community.viewer_role === 'owner' ? 'Owner ★' : community.viewer_role === 'admin' ? 'Admin ⚡' : 'Member'}
                </Badge>
              )}
            </div>

            {community.author_name && (
              <p className="text-xs text-subtle">Created by {community.author_name}</p>
            )}

            {community.description && <p className="text-sm text-muted">{community.description}</p>}
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Badge variant="default" size="sm">
              👥 {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="default" size="sm">
              💬 {topics.length || community.topic_count || 1} topics
            </Badge>

            {isAdmin && (
              <Link to={`/communities/${id}/admin`}>
                <Button variant="secondary" size="sm">
                  ⚙️ Manage Community
                </Button>
              </Link>
            )}

            {user && (
              isMember ? (
                <Button variant="secondary" size="sm" onClick={handleLeaveCommunity} title="Leave community">
                  Leave
                </Button>
              ) : isPending ? (
                <Button variant="secondary" size="sm" disabled>
                  Pending Approval ⏳
                </Button>
              ) : (
                <Button variant={isPrivate ? 'secondary' : 'primary'} size="sm" onClick={handleToggleJoin}>
                  {isPrivate ? 'Request to Join' : 'Join Community'}
                </Button>
              )
            )}
          </div>
        </div>
      </Card>

      {/* ── Private Community Access Guard ─────────────────────────────── */}
      {isPrivate && !isMember ? (
        <Card className="p-8 text-center space-y-3 bg-surface-subtle">
          <span className="text-3xl">🔒</span>
          <h3 className="text-base font-bold text-main">This Community is Private</h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Content, discussions, and topics in <strong>{community.name}</strong> are restricted to approved members.
          </p>
          {user ? (
            isPending ? (
              <Button variant="secondary" size="sm" disabled className="mt-2">
                Join Request Pending Approval ⏳
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleToggleJoin} className="mt-2">
                Request to Join Community
              </Button>
            )
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm" className="mt-2">
                Sign in to Request Access
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          {/* ── Structured Topics Section ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-main">Discussion Topics</h2>
              {isAdmin && (
                <Link to={`/communities/${id}/admin`}>
                  <Button size="sm" variant="ghost">
                    + Add Topic
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topics.map((topic) => (
                <CommunityTopicCard
                  key={topic.id}
                  communityId={id}
                  topic={topic}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>

          {/* ── Post Composer (Members Only) ──────────────────────────── */}
          {user ? (
            isMember ? (
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-main">Post in {community.name}</h3>
                <form onSubmit={handlePostInCommunity} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Post Title"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <select
                        value={postTopicId}
                        onChange={(e) => setPostTopicId(e.target.value)}
                        className="w-full h-10 px-3 text-xs bg-surface border border-main rounded-lg text-main focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value=""># General Topic</option>
                        {topics.map((t) => (
                          <option key={t.id} value={t.id}>
                            #{t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <TextArea
                    placeholder="What do you want to share with this community?"
                    rows={3}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    required
                  />

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="sm" isLoading={posting}>
                      Publish Post
                    </Button>
                  </div>
                </form>
              </Card>
            ) : null
          ) : null}

          {/* ── Community Feed & Topic Filter ─────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-main pb-2 flex-wrap gap-2">
              <h2 className="text-xl font-bold text-main">Community Discussions</h2>

              {/* Topic Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setSelectedTopicId(null)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all shrink-0 ${
                    selectedTopicId === null
                      ? 'bg-primary text-white'
                      : 'bg-surface-subtle text-muted hover:text-main'
                  }`}
                >
                  All Posts
                </button>
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopicId(t.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all shrink-0 ${
                      selectedTopicId === t.id
                        ? 'bg-primary text-white'
                        : 'bg-surface-subtle text-muted hover:text-main'
                    }`}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
            </div>

            <PaginatedList
              key={`${selectedTopicId}-${refreshTrigger}`}
              refreshTrigger={refreshTrigger}
              fetchData={(params) =>
                selectedTopicId
                  ? communitiesApi.listTopicPosts(id, selectedTopicId, params)
                  : communitiesApi.listPosts(id, params)
              }
              renderItem={(post) => <PostCard key={post.id} post={post} />}
              emptyTitle="No discussions here yet"
              emptyDescription="Be the first member to start a discussion in this channel!"
            />
          </div>
        </>
      )}
    </div>
  );
}
