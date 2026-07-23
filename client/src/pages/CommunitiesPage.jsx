import React, { useState } from 'react';
import { communitiesApi } from '../api/communitiesApi';
import { useAuth } from '../context/AuthContext';
import PaginatedList from '../components/organisms/PaginatedList';
import CommunityCard from '../components/organisms/CommunityCard';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Modal from '../components/molecules/Modal';

export default function CommunitiesPage() {
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: 'Community name is required.' });
      return;
    }

    setSubmitting(true);
    try {
      await communitiesApi.create({ name: name.trim(), description: description.trim() });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ name: err.message || 'Failed to create community.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main">Developer Communities</h1>
          <p className="text-sm text-muted">Join interest-based groups to discuss code, architecture, and tools</p>
        </div>

        {user && (
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            + Create Community
          </Button>
        )}
      </div>

      {/* Communities Grid List */}
      <PaginatedList
        refreshTrigger={refreshTrigger}
        fetchData={(params) => communitiesApi.list(params)}
        renderItem={(community) => <CommunityCard key={community.id} community={community} />}
        emptyTitle="No communities yet"
        emptyDescription="Be the first to start a developer community on CodeNest!"
        emptyActionLabel={user ? "Create Community" : undefined}
        onEmptyAction={() => setIsModalOpen(true)}
      />

      {/* Create Community Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Community"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateCommunity} isLoading={submitting}>
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCommunity} className="space-y-4">
          <Input
            label="Community Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            placeholder="e.g. React & Next.js Developers"
            required
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
            placeholder="What is this community about?"
            rows={3}
          />
        </form>
      </Modal>
    </div>
  );
}
