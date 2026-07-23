import React from 'react';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Card from '../atoms/Card';

export default function AnonProfileCard({ shadowProfile }) {
  if (!shadowProfile) return null;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <Avatar
          src={shadowProfile.anonymous_avatar_url}
          name={shadowProfile.anonymous_username || 'Anonymous'}
          size="lg"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-main font-mono">
              {shadowProfile.anonymous_username}
            </h2>
            <Badge variant="primary" size="sm">
              Shadow Identity
            </Badge>
          </div>
          <p className="text-xs text-subtle">
            Permanent anonymous handle • Zero bias identity
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-main pt-4 text-center">
        <div className="space-y-0.5">
          <span className="block text-xl font-extrabold text-primary">
            {shadowProfile.anonymous_reputation_score || 0}
          </span>
          <span className="text-xs text-muted font-medium">Reputation</span>
        </div>
        <div className="space-y-0.5">
          <span className="block text-xl font-extrabold text-main">
            {shadowProfile.submission_count || 0}
          </span>
          <span className="text-xs text-muted font-medium">Submissions</span>
        </div>
        <div className="space-y-0.5">
          <span className="block text-xl font-extrabold text-main">
            {shadowProfile.review_count || 0}
          </span>
          <span className="text-xs text-muted font-medium">Reviews Given</span>
        </div>
      </div>
    </Card>
  );
}
