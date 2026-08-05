import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Card from '../atoms/Card';
import Badge from '../atoms/Badge';

export default function SubmissionCard({ submission }) {
  const formattedDate = submission.created_at
    ? formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })
    : 'recently';

  return (
    <Card hoverable className="p-5 space-y-3.5">
      {/* Header — Language Tag + Age (CRITICAL: NO USERNAME OF ANY KIND) */}
      <div className="flex items-center justify-between">
        <Badge variant="primary" size="sm">
          {submission.language_tag || 'code'}
        </Badge>
        <span className="text-xs text-[var(--text-subtle)]">{formattedDate}</span>
      </div>

      {/* Title & Preview */}
      <Link to={`/shadow/submissions/${submission.id}`} className="block space-y-2 py-0.5">
        <h3 className="text-base font-bold text-[var(--text-main)] hover:text-[var(--color-primary)] transition-colors">
          {submission.title}
        </h3>
        {submission.content_preview && (
          <pre className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] p-3 rounded-lg border border-[var(--border-main)] overflow-hidden line-clamp-3">
            {submission.content_preview}
          </pre>
        )}
      </Link>

      {/* Footer — Review Count Only */}
      <div className="flex items-center justify-between border-t border-[var(--border-main)] pt-3.5 mt-3 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-2 px-2.5 py-1 rounded-md font-semibold text-[var(--text-muted)]">
          <span className="text-sm select-none">💬</span>
          <span>{submission.review_count || 0} reviews</span>
        </span>
        <span className="text-xs text-[var(--color-primary)] font-semibold hover:underline px-2 py-1">
          Review Code →
        </span>
      </div>
    </Card>
  );
}
