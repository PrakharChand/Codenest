import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../atoms/Card';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';

export default function CommunityTopicCard({ communityId, topic, isAdmin = false, onEdit, onDelete }) {
  return (
    <Card hoverable className="flex items-center justify-between p-4 gap-4 transition-all">
      <Link to={`/communities/${communityId}/topics/${topic.id}`} className="min-w-0 flex-1 space-y-1 group">
        <div className="flex items-center gap-2 flex-wrap">
          {topic.is_pinned && <Badge variant="warning" size="sm">📌 Pinned</Badge>}
          {topic.is_locked && <Badge variant="danger" size="sm">🔒 Locked</Badge>}
          <h4 className="text-sm font-bold text-main group-hover:text-primary transition-colors truncate">
            # {topic.name}
          </h4>
        </div>
        {topic.description && (
          <p className="text-xs text-muted truncate">{topic.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-subtle pt-1">
          <span>💬 {topic.post_count || 0} post{topic.post_count !== 1 ? 's' : ''}</span>
          {topic.last_activity_at && (
            <span>Updated {new Date(topic.last_activity_at).toLocaleDateString()}</span>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <Link to={`/communities/${communityId}/topics/${topic.id}`}>
          <Button size="sm" variant="secondary">
            View Topic →
          </Button>
        </Link>
        {isAdmin && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button size="sm" variant="ghost" onClick={() => onEdit(topic)} title="Edit Topic">
                ✏️
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(topic.id)} title="Delete Topic">
                🗑️
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
