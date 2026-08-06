import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { communitiesApi } from '../api/communitiesApi';
import Card from '../components/atoms/Card';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Spinner from '../components/atoms/Spinner';
import PaginatedList from '../components/organisms/PaginatedList';
import JoinRequestCard from '../components/organisms/JoinRequestCard';
import Modal from '../components/molecules/Modal';
import SEO from '../components/atoms/SEO';

export default function CommunityAdminPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'members' | 'topics' | 'settings'

  // Settings State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('public');
  const [savingSettings, setSavingSettings] = useState(false);

  // Topic Modal State
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicPinned, setTopicPinned] = useState(false);
  const [topicLocked, setTopicLocked] = useState(false);
  const [topicSubmitting, setTopicSubmitting] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadCommunity() {
      setLoading(true);
      try {
        const data = await communitiesApi.get(id);
        setCommunity(data);
        setName(data.name || '');
        setDescription(data.description || '');
        setType(data.type || 'public');
        if (data.type === 'public') setActiveTab('members');
      } catch (err) {
        toast.error(err.message || 'Failed to load community details');
      } finally {
        setLoading(false);
      }
    }
    loadCommunity();
  }, [id]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await communitiesApi.update(id, { name, description, type });
      setCommunity(updated);
      toast.success('Community settings saved!');
    } catch (err) {
      toast.error(err.message || 'Failed to update community settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!window.confirm(`Are you sure you want to delete "${community.name}"? This action is permanent!`)) return;
    try {
      await communitiesApi.delete(id);
      toast.success('Community deleted');
      navigate('/communities');
    } catch (err) {
      toast.error(err.message || 'Failed to delete community');
    }
  };

  // ── Join Requests Actions ─────────────────────────────────────────────────
  const handleApproveRequest = async (requestId) => {
    try {
      await communitiesApi.approveRequest(id, requestId);
      toast.success('Request approved!');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await communitiesApi.rejectRequest(id, requestId);
      toast.success('Request declined');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to decline request');
    }
  };

  // ── Member Management Actions ─────────────────────────────────────────────
  const handleKickMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from the community?`)) return;
    try {
      await communitiesApi.removeMember(id, userId);
      toast.success(`Removed ${userName}`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleToggleAdminRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await communitiesApi.updateMemberRole(id, userId, nextRole);
      toast.success(`Member role updated to ${nextRole}`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to update member role');
    }
  };

  // ── Topic Management Actions ──────────────────────────────────────────────
  const handleOpenCreateTopic = () => {
    setEditingTopic(null);
    setTopicName('');
    setTopicDesc('');
    setTopicPinned(false);
    setTopicLocked(false);
    setIsTopicModalOpen(true);
  };

  const handleOpenEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicName(topic.name);
    setTopicDesc(topic.description || '');
    setTopicPinned(Boolean(topic.is_pinned));
    setTopicLocked(Boolean(topic.is_locked));
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!topicName.trim()) return;

    setTopicSubmitting(true);
    try {
      if (editingTopic) {
        await communitiesApi.updateTopic(id, editingTopic.id, {
          name: topicName.trim(),
          description: topicDesc.trim(),
          is_pinned: topicPinned,
          is_locked: topicLocked,
        });
        toast.success('Topic updated!');
      } else {
        await communitiesApi.createTopic(id, {
          name: topicName.trim(),
          description: topicDesc.trim(),
        });
        toast.success('Topic created!');
      }
      setIsTopicModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to save topic');
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic? Posts in this topic will remain in General.')) return;
    try {
      await communitiesApi.deleteTopic(id, topicId);
      toast.success('Topic deleted');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to delete topic');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="space-y-6">
      <SEO title={`Admin Settings — ${community.name}`} />

      {/* ── Header & Breadcrumbs ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link to="/communities" className="hover:text-primary transition-colors">
            Communities
          </Link>
          <span>›</span>
          <Link to={`/communities/${id}`} className="hover:text-primary transition-colors font-medium">
            {community.name}
          </Link>
          <span>›</span>
          <span className="text-main font-bold">Admin Panel</span>
        </nav>

        <Link to={`/communities/${id}`}>
          <Button variant="secondary" size="sm">
            ← Back to {community.name}
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main">Community Settings</h1>
          <p className="text-sm text-muted">Manage members, join requests, topics, and community options</p>
        </div>
      </div>

      {/* ── Admin Tab Bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-main pb-0">
        {community.type === 'private' && (
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'requests'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            📋 Join Requests
          </button>
        )}
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted hover:text-main'
          }`}
        >
          👥 Members ({community.member_count})
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'topics'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted hover:text-main'
          }`}
        >
          💬 Topics
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted hover:text-main'
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* ── TAB 1: Join Requests ─────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-main">Pending Join Requests</h3>
          <PaginatedList
            key={`requests-${refreshTrigger}`}
            refreshTrigger={refreshTrigger}
            fetchData={(params) => communitiesApi.listRequests(id, params)}
            renderItem={(req) => (
              <JoinRequestCard
                key={req.id}
                request={req}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            )}
            emptyTitle="No pending join requests"
            emptyDescription="All applicant requests have been reviewed."
          />
        </div>
      )}

      {/* ── TAB 2: Member Management ────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-main">Community Members</h3>
          <PaginatedList
            key={`members-${refreshTrigger}`}
            refreshTrigger={refreshTrigger}
            fetchData={(params) => communitiesApi.listMembers(id, params)}
            renderItem={(m) => (
              <Card key={m.user_id} elevation="flat" className="flex items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {m.user_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-main truncate">{m.user_name}</span>
                      <Badge variant={m.role === 'owner' ? 'warning' : m.role === 'admin' ? 'primary' : 'default'} size="sm">
                        {m.role === 'owner' ? 'Owner ★' : m.role === 'admin' ? 'Admin ⚡' : 'Member'}
                      </Badge>
                    </div>
                    {m.user_bio && <p className="text-xs text-muted truncate">{m.user_bio}</p>}
                  </div>
                </div>

                {m.role !== 'owner' && (
                  <div className="flex items-center gap-2 shrink-0">
                    {community.viewer_role === 'owner' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAdminRole(m.user_id, m.role)}
                      >
                        {m.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleKickMember(m.user_id, m.user_name)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </Card>
            )}
            emptyTitle="No members found"
          />
        </div>
      )}

      {/* ── TAB 3: Topic Management ──────────────────────────────────────── */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-main">Discussion Topics</h3>
            <Button size="sm" variant="primary" onClick={handleOpenCreateTopic}>
              + Create Topic
            </Button>
          </div>

          <PaginatedList
            key={`topics-${refreshTrigger}`}
            refreshTrigger={refreshTrigger}
            fetchData={async () => {
              const res = await communitiesApi.listTopics(id);
              return { data: res.data || [], pagination: { total: res.data?.length || 0, page: 1, totalPages: 1 } };
            }}
            renderItem={(t) => (
              <Card key={t.id} elevation="flat" className="flex items-center justify-between p-4 gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-main">#{t.name}</span>
                    {t.is_pinned && <Badge variant="warning" size="sm">📌 Pinned</Badge>}
                    {t.is_locked && <Badge variant="danger" size="sm">🔒 Locked</Badge>}
                  </div>
                  {t.description && <p className="text-xs text-muted truncate">{t.description}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenEditTopic(t)}>
                    ✏️ Edit
                  </Button>
                  {t.name !== 'General' && (
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTopic(t.id)}>
                      🗑️ Delete
                    </Button>
                  )}
                </div>
              </Card>
            )}
          />
        </div>
      )}

      {/* ── TAB 4: Community Settings ────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <Card className="p-6 space-y-6">
          <h3 className="text-base font-bold text-main">General Settings</h3>

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <Input
              label="Community Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-main">Community Access Type</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-3 rounded-lg border cursor-pointer ${type === 'public' ? 'border-primary bg-primary/5' : 'border-main'}`}>
                  <input type="radio" name="type" value="public" checked={type === 'public'} onChange={() => setType('public')} />
                  <span className="font-bold text-xs ml-2">🌐 Public</span>
                </label>
                <label className={`p-3 rounded-lg border cursor-pointer ${type === 'private' ? 'border-primary bg-primary/5' : 'border-main'}`}>
                  <input type="radio" name="type" value="private" checked={type === 'private'} onChange={() => setType('private')} />
                  <span className="font-bold text-xs ml-2">🔒 Private</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={savingSettings}>
                Save Settings
              </Button>
            </div>
          </form>

          {community.viewer_role === 'owner' && (
            <div className="border-t border-main pt-6 space-y-3">
              <h4 className="text-sm font-bold text-danger">Danger Zone</h4>
              <p className="text-xs text-muted">Deleting a community will permanently remove all topics, posts, and member associations.</p>
              <Button variant="secondary" size="sm" onClick={handleDeleteCommunity} className="text-danger border-danger/30 hover:bg-danger/10">
                Delete Community
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* ── Create / Edit Topic Modal ────────────────────────────────────── */}
      <Modal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        title={editingTopic ? `Edit Topic #${editingTopic.name}` : "Create New Topic"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsTopicModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveTopic} isLoading={topicSubmitting}>
              {editingTopic ? "Save Changes" : "Create Topic"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveTopic} className="space-y-4">
          <Input
            label="Topic Name"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g. System Design, React, Node.js"
            required
          />
          <TextArea
            label="Description"
            value={topicDesc}
            onChange={(e) => setTopicDesc(e.target.value)}
            placeholder="What should be discussed in this topic?"
            rows={2}
          />
          {editingTopic && (
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={topicPinned} onChange={(e) => setTopicPinned(e.target.checked)} />
                📌 Pin Topic
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={topicLocked} onChange={(e) => setTopicLocked(e.target.checked)} />
                🔒 Lock Topic
              </label>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
