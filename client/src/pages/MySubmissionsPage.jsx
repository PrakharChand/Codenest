import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shadowApi } from '../api/shadowApi';
import PaginatedList from '../components/organisms/PaginatedList';
import SubmissionCard from '../components/organisms/SubmissionCard';
import Button from '../components/atoms/Button';

export default function MySubmissionsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main font-mono">My Shadow Submissions</h1>
          <p className="text-sm text-muted">
            Track code reviews and feedback received on your submissions.
          </p>
        </div>

        <Link to="/shadow/submissions/new">
          <Button variant="primary" size="sm">
            + New Code Request
          </Button>
        </Link>
      </div>

      <PaginatedList
        fetchData={(params) => shadowApi.getMySubmissions(params)}
        renderItem={(submission) => (
          <SubmissionCard key={submission.id} submission={submission} />
        )}
        emptyTitle="You haven't submitted any code for review yet"
        emptyDescription="Submit a code snippet to get constructive, bias-free feedback from developers!"
        emptyActionLabel="Submit Code Now"
        onEmptyAction={() => navigate('/shadow/submissions/new')}
      />
    </div>
  );
}
