import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shadowApi } from '../api/shadowApi';
import { useAuth } from '../context/AuthContext';
import Card from '../components/atoms/Card';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import TextArea from '../components/atoms/TextArea';
import MarkdownView from '../components/organisms/MarkdownView';
import ReviewCard from '../components/organisms/ReviewCard';

export default function ShadowSubmissionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Structured Review Form State
  const [whatGood, setWhatGood] = useState('');
  const [whatImprove, setWhatImprove] = useState('');
  const [resources, setResources] = useState('');
  const [rating, setRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const loadSubmission = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shadowApi.getSubmission(id);
      setSubmission(data);
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err.message || 'Submission not found or unauthorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmission();
  }, [id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError(null);
    setReviewSuccess(false);

    if (!whatGood.trim() || !whatImprove.trim()) {
      setReviewError('Please fill out both "What went well" and "What to improve".');
      return;
    }

    setSubmittingReview(true);
    try {
      const newReview = await shadowApi.submitReview(id, {
        what_good: whatGood.trim(),
        what_improve: whatImprove.trim(),
        resources: resources.trim() || null,
        helpfulness_rating: rating,
      });

      setReviews((prev) => [newReview, ...prev]);
      setWhatGood('');
      setWhatImprove('');
      setResources('');
      setRating(5);
      setReviewSuccess(true);
    } catch (err) {
      if (err.status === 409 || err.code === 'CONFLICT') {
        setReviewError('You have already submitted a review for this code submission.');
      } else {
        setReviewError(err.message || 'Failed to submit review.');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-danger">Submission Not Found</h2>
        <p className="text-sm text-muted">{error}</p>
        <Link to="/shadow/queue">
          <Button variant="secondary" size="sm">
            Back to Queue
          </Button>
        </Link>
      </Card>
    );
  }

  // Check if current user is owner (reviews list contains handles if owner view)
  const isOwner = reviews.some((r) => r.reviewer_anonymous_username !== undefined);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Code Submission Card */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-main pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {submission.language_tag || 'code'}
            </Badge>
            <span className="text-xs text-subtle font-mono">Submission #{submission.id}</span>
          </div>

          <span className="text-xs text-muted">
            💬 {submission.review_count || reviews.length} reviews
          </span>
        </div>

        <h1 className="text-2xl font-bold text-main font-mono">{submission.title}</h1>

        {/* Submitter's Specific Feedback Request Question */}
        {submission.question && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Specific Feedback Request
            </span>
            <p className="text-sm text-main italic">"{submission.question}"</p>
          </div>
        )}

        {/* Code Content in MarkdownView */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-subtle uppercase">Code Content</h4>
          <MarkdownView source={submission.content} />
        </div>
      </Card>

      {/* Structured Review Form (for Non-owners) */}
      {!isOwner && user && (
        <Card className="p-6 md:p-8 space-y-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-main">Submit a Structured Code Review</h3>
            <p className="text-xs text-muted">
              Provide honest, constructive feedback to help your fellow developer grow.
            </p>
          </div>

          {reviewSuccess && (
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success font-medium">
              ✓ Review submitted successfully! Thank you for contributing to bias-free code quality.
            </div>
          )}

          {reviewError && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
              {reviewError}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <TextArea
              label="1. What Went Well? *"
              rows={3}
              value={whatGood}
              onChange={(e) => setWhatGood(e.target.value)}
              placeholder="Highlight clean architecture, algorithms, performance, or good practices..."
              required
            />

            <TextArea
              label="2. What Could Be Improved? *"
              rows={3}
              value={whatImprove}
              onChange={(e) => setWhatImprove(e.target.value)}
              placeholder="Point out code smells, edge cases, potential bugs, or optimization opportunities..."
              required
            />

            <TextArea
              label="3. Recommended Resources & Docs (optional)"
              rows={2}
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              placeholder="Links, patterns, libraries, or articles worth checking out..."
            />

            {/* Helpfulness Rating Dropdown/Stars */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-main">Overall Quality Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value, 10))}
                className="w-full sm:w-48 rounded-md border border-main bg-surface px-3 py-2 text-sm text-main focus-visible:border-focus focus-visible:outline-none"
              >
                <option value={5}>★★★★★ (5/5 Exceptional)</option>
                <option value={4}>★★★★☆ (4/5 Solid Code)</option>
                <option value={3}>★★★☆☆ (3/5 Needs Work)</option>
                <option value={2}>★★☆☆☆ (2/5 Major Issues)</option>
                <option value={1}>★☆☆☆☆ (1/5 Critical Errors)</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="md" isLoading={submittingReview}>
                Submit Anonymous Review
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-main">
          Reviews ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            No reviews submitted for this code yet. Be the first to provide feedback!
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <ReviewCard
                key={rev.id}
                review={rev}
                isOwnerView={isOwner}
                onVoteSuccess={() => loadSubmission()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
