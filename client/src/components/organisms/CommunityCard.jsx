import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Card from '../atoms/Card';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import { communitiesApi } from '../../api/communitiesApi';
import { useAuth } from '../../context/AuthContext';
import { useRelationship } from '../../context/RelationshipContext';

export default function CommunityCard({ community, onJoinToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getCommunityMembershipState, updateCommunityMembership } = useRelationship();
  const [loading, setLoading] = useState(false);

  const cachedMembership = getCommunityMembershipState(community.id);
  const joined = cachedMembership
    ? Boolean(cachedMembership.isMember)
    : Boolean(community.is_member || community.isMember);

  const memberCount = cachedMembership && typeof cachedMembership.memberCount === 'number'
    ? cachedMembership.memberCount
    : (community.member_count || 0);

  const isPrivate = community.type === 'private';
  const isPending = community.join_status === 'pending';

  const handleToggleJoin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (joined) {
      // Navigate to community if already joined
      navigate(`/communities/${community.id}`);
      return;
    }

    setLoading(true);
    try {
      const res = await communitiesApi.join(community.id);
      if (res.join_status === 'pending') {
        toast.success('Request to join sent! An admin will review your application.');
      } else {
        toast.success(`Joined ${community.name}!`);
        updateCommunityMembership(community.id, true, memberCount + 1);
      }
      if (onJoinToggle) onJoinToggle(community.id, res.is_member);
    } catch (err) {
      toast.error(err.message || 'Failed to update community membership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card hoverable className="flex flex-col justify-between space-y-4 p-5">
      <Link to={`/communities/${community.id}`} className="space-y-3 block">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-main hover:text-primary transition-colors truncate">
                {community.name}
              </h3>
              <Badge variant={isPrivate ? 'warning' : 'secondary'} size="sm">
                {isPrivate ? '🔒 Private' : '🌐 Public'}
              </Badge>
            </div>
            {community.author_name && (
              <p className="text-[11px] text-subtle">By {community.author_name}</p>
            )}
          </div>
          <Badge variant="default" size="sm" className="shrink-0">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {community.description && (
          <p className="text-sm text-muted line-clamp-2">{community.description}</p>
        )}
      </Link>

      <div className="flex items-center justify-between pt-3 border-t border-main">
        <div className="text-xs text-subtle flex items-center gap-2">
          <span>💬 {community.topic_count || 1} topics</span>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {joined ? (
              <Link to={`/communities/${community.id}`}>
                <Button size="sm" variant="primary">
                  Enter Community →
                </Button>
              </Link>
            ) : isPending ? (
              <Button size="sm" variant="secondary" disabled>
                Pending Approval ⏳
              </Button>
            ) : (
              <Button
                size="sm"
                variant={isPrivate ? 'secondary' : 'primary'}
                onClick={handleToggleJoin}
                isLoading={loading}
              >
                {isPrivate ? 'Request to Join' : 'Join Community'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
