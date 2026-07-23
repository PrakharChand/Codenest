import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../atoms/Card';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import { communitiesApi } from '../../api/communitiesApi';
import { useAuth } from '../../context/AuthContext';

export default function CommunityCard({ community, onJoinToggle }) {
  const { user } = useAuth();
  const [joined, setJoined] = useState(community.is_member || false);
  const [memberCount, setMemberCount] = useState(community.member_count || 0);
  const [loading, setLoading] = useState(false);

  const handleToggleJoin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    setLoading(true);
    try {
      if (joined) {
        setJoined(false);
        setMemberCount((prev) => Math.max(prev - 1, 0));
        await communitiesApi.leave(community.id);
      } else {
        setJoined(true);
        setMemberCount((prev) => prev + 1);
        await communitiesApi.join(community.id);
      }
      if (onJoinToggle) onJoinToggle(community.id, !joined);
    } catch (err) {
      setJoined(!joined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card hoverable className="flex flex-col justify-between space-y-4 p-5">
      <Link to={`/communities/${community.id}`} className="space-y-2 block">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-main hover:text-primary transition-colors">
            {community.name}
          </h3>
          <Badge variant="default" size="sm">
            {memberCount} members
          </Badge>
        </div>
        {community.description && (
          <p className="text-sm text-muted line-clamp-2">{community.description}</p>
        )}
      </Link>

      {user && (
        <div className="flex justify-end pt-2 border-t border-main">
          <Button
            size="sm"
            variant={joined ? 'secondary' : 'primary'}
            onClick={handleToggleJoin}
            isLoading={loading}
          >
            {joined ? 'Joined' : 'Join Community'}
          </Button>
        </div>
      )}
    </Card>
  );
}
