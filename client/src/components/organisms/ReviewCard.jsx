import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import { shadowApi } from '../../api/shadowApi';
import { useAuth } from '../../context/AuthContext';

export default function ReviewCard({ review, isOwnerView = false, onVoteSuccess }) {
  const { user } = useAuth();
  const [helpfulVotes, setHelpfulVotes] = useState(review.helpful_vote_count || 0);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  const isAi = !!review.is_ai_review;

  const handleVoteHelpful = async () => {
    if (!user || hasVoted || isAi) return;
    setVoting(true);
    try {
      await shadowApi.voteHelpful(review.id);
      setHelpfulVotes((prev) => prev + 1);
      setHasVoted(true);
      if (onVoteSuccess) onVoteSuccess(review.id);
    } catch (err) {
      alert(err.message || 'Could not register vote.');
    } finally {
      setVoting(false);
    }
  };

  const formattedDate = review.created_at
    ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true })
    : 'recently';

  return (
    <Card
      className={`space-y-4 p-5 transition-all ${
        isAi
          ? 'border-dashed border-primary/40 bg-surface-subtle/60 opacity-90'
          : 'border-main bg-surface'
      }`}
    >
      {/* Header — Reviewer Anon Avatar / Username OR AI Label */}
      <div className="flex items-center justify-between border-b border-main pb-3">
        <div className="flex items-center gap-3">
          {isAi ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <span className="text-sm font-bold text-main">Claude AI Assistant</span>
                <Badge variant="primary" size="sm" className="ml-2">
                  AI Review
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar
                src={review.reviewer_anonymous_avatar_url}
                name={review.reviewer_anonymous_username || 'Anonymous Reviewer'}
                size="sm"
              />
              <div>
                <span className="text-sm font-semibold text-main">
                  {isOwnerView && review.reviewer_anonymous_username
                    ? review.reviewer_anonymous_username
                    : 'Anonymous Reviewer'}
                </span>
                <span className="text-xs text-subtle block">{formattedDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rating Stars */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-sm ${
                star <= (review.helpfulness_rating || 5)
                  ? 'text-warning'
                  : 'text-subtle/30'
              }`}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Structured Feedback Sections */}
      <div className="space-y-3 text-sm">
        {/* 1. What's Good */}
        <div className="space-y-1">
          <h5 className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1">
            <span>✓</span> What went well
          </h5>
          <p className="text-muted leading-relaxed whitespace-pre-line">{review.what_good}</p>
        </div>

        {/* 2. What to Improve */}
        <div className="space-y-1">
          <h5 className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1">
            <span>💡</span> Areas for improvement
          </h5>
          <p className="text-muted leading-relaxed whitespace-pre-line">{review.what_improve}</p>
        </div>

        {/* 3. Recommended Resources */}
        {review.resources && (
          <div className="space-y-1 pt-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <span>📚</span> Recommended resources
            </h5>
            <p className="text-muted leading-relaxed whitespace-pre-line">{review.resources}</p>
          </div>
        )}
      </div>

      {/* Footer — Helpful Vote Action */}
      <div className="flex items-center justify-between border-t border-main pt-3 text-xs">
        <span className="text-muted">
          {helpfulVotes} developer{helpfulVotes === 1 ? '' : 's'} found this helpful
        </span>

        {!isAi && user && (
          <Button
            size="sm"
            variant={hasVoted ? 'secondary' : 'ghost'}
            onClick={handleVoteHelpful}
            isLoading={voting}
            disabled={hasVoted}
          >
            {hasVoted ? '✓ Voted Helpful' : '👍 Mark as Helpful'}
          </Button>
        )}
      </div>
    </Card>
  );
}
