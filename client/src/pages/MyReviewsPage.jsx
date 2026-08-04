/**
 * client/src/pages/MyReviewsPage.jsx
 *
 * Shows all Shadow submissions the current user has reviewed.
 * Identity rule: reviewer_id never appears in the API response.
 * Only anonymous content (submission title, language, the review itself) is shown.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';
import PaginatedList from '../components/organisms/PaginatedList';
import Card from '../components/atoms/Card';
import Badge from '../components/atoms/Badge';

function ReviewEntry({ item }) {
  return (
    <Card className="p-5 space-y-3">
      {/* Submission header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <Link
            to={`/shadow/submissions/${item.submission_id}`}
            className="text-sm font-bold text-main hover:text-primary transition-colors block truncate"
          >
            {item.submission_title}
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {item.language_tag && (
              <Badge variant="primary" size="sm">{item.language_tag}</Badge>
            )}
            <span className="text-xs text-subtle">
              Reviewed {item.reviewed_at
                ? formatDistanceToNow(new Date(item.reviewed_at), { addSuffix: true })
                : 'recently'}
            </span>
            <span className="text-xs text-subtle">
              {item.review_count} review{item.review_count !== 1 ? 's' : ''} on submission
            </span>
          </div>
        </div>
        {item.helpfulness_rating && (
          <div className="shrink-0 text-center">
            <div className="text-base font-bold text-primary">{item.helpfulness_rating}/5</div>
            <div className="text-[10px] text-subtle">Rating</div>
          </div>
        )}
      </div>

      {/* Review content */}
      <div className="space-y-2 border-t border-main pt-3">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">What went well</p>
          <p className="text-sm text-muted leading-relaxed">{item.what_good}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-warning uppercase tracking-wide mb-1">What to improve</p>
          <p className="text-sm text-muted leading-relaxed">{item.what_improve}</p>
        </div>
        {item.resources && (
          <div>
            <p className="text-[11px] font-semibold text-success uppercase tracking-wide mb-1">Resources</p>
            <p className="text-sm text-muted leading-relaxed">{item.resources}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Link
          to={`/shadow/submissions/${item.submission_id}`}
          className="text-xs text-primary hover:underline font-medium"
        >
          View full submission & all reviews →
        </Link>
      </div>
    </Card>
  );
}

export default function MyReviewsPage() {
  const navigate = useNavigate();

  const fetchMyReviews = async (params) => {
    const { data } = await api.get('/api/shadow/my-reviews', { params });
    return data;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-main font-mono">My Reviews</h1>
        <p className="text-sm text-muted mt-1">
          All submissions you have reviewed — revisit your feedback for learning and reference.
          All identities remain anonymous.
        </p>
      </div>

      <PaginatedList
        fetchData={fetchMyReviews}
        renderItem={(item) => <ReviewEntry key={item.review_id} item={item} />}
        emptyTitle="No reviews given yet"
        emptyDescription="Start reviewing code submissions in the queue to build your reviewer history."
        emptyActionLabel="Go to Queue"
        onEmptyAction={() => navigate('/shadow/queue')}
      />
    </div>
  );
}
