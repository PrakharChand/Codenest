import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../atoms/Card';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';

export default function JoinRequestCard({ request, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(request.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(request.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation="flat" className="flex items-center justify-between p-4 gap-4">
      <Link to={`/users/${request.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={request.user_avatar_url} name={request.user_name} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-main truncate">{request.user_name}</h4>
          {request.user_bio && <p className="text-xs text-muted truncate">{request.user_bio}</p>}
          <span className="text-[11px] text-subtle">
            Requested on {new Date(request.requested_at).toLocaleDateString()}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="secondary" onClick={handleReject} isLoading={loading}>
          Decline
        </Button>
        <Button size="sm" variant="primary" onClick={handleApprove} isLoading={loading}>
          Approve
        </Button>
      </div>
    </Card>
  );
}
