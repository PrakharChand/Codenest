import React from 'react';
import { Link } from 'react-router-dom';
import { shadowApi } from '../api/shadowApi';
import PaginatedList from '../components/organisms/PaginatedList';
import SubmissionCard from '../components/organisms/SubmissionCard';
import Button from '../components/atoms/Button';

export default function ShadowQueuePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-main font-mono">Code Review Queue</h1>
          <p className="text-sm text-muted">
            Review submissions from developers anonymously. Pure code, zero bias.
          </p>
        </div>

        <Link to="/shadow/submissions/new">
          <Button variant="primary" size="sm">
            + Submit Code for Review
          </Button>
        </Link>
      </div>

      {/* Queue List — Uses shadowApi.getQueue only */}
      <PaginatedList
        fetchData={(params) => shadowApi.getQueue(params)}
        renderItem={(submission) => (
          <SubmissionCard key={submission.id} submission={submission} />
        )}
        emptyTitle="The review queue is currently empty!"
        emptyDescription="You've reviewed all available submissions or no new submissions exist. Why not request a code review yourself?"
        emptyActionLabel="Submit Your Code"
        onEmptyAction={() => {}}
      />
    </div>
  );
}
