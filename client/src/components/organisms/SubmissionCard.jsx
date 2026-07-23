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
    <Card hoverable className="space-y-3">
      {/* Header — Language Tag + Age (CRITICAL: NO USERNAME OF ANY KIND) */}
      <div className="flex items-center justify-between">
        <Badge variant="primary" size="sm">
          {submission.language_tag || 'code'}
        </Badge>
        <span className="text-xs text-subtle">{formattedDate}</span>
      </div>

      {/* Title & Preview */}
      <Link to={`/shadow/submissions/${submission.id}`} className="block space-y-1.5">
        <h3 className="text-base font-bold text-main hover:text-primary transition-colors">
          {submission.title}
        </h3>
        {submission.content_preview && (
          <pre className="text-xs font-mono text-muted bg-surface-subtle p-2.5 rounded-md overflow-hidden line-clamp-3">
            {submission.content_preview}
          </pre>
        )}
      </Link>

      {/* Footer — Review Count Only */}
      <div className="flex items-center justify-between border-t border-main pt-2 text-xs text-muted">
        <span className="flex items-center gap-1.5 font-medium">
          <span>💬</span>
          <span>{submission.review_count || 0} reviews</span>
        </span>
        <span className="text-xs text-primary font-medium">Review Code →</span>
      </div>
    </Card>
  );
}
