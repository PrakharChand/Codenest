import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Card from '../atoms/Card';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import { communitiesApi } from '../../api/communitiesApi';
import { useAuth } from '../../context/AuthContext';
import { useRelationship } from '../../context/RelationshipContext';

export default function CommunityCard({ community, onJoinToggle }) {
  const { user } = useAuth();
  const { getCommunityMembershipState, updateCommunityMembership } = useRelationship();
  const [loading, setLoading] = useState(false);

  const cachedMembership = getCommunityMembershipState(community.id);
  const joined = cachedMembership
    ? Boolean(cachedMembership.isMember)
    : Boolean(community.is_member || community.isMember);

  const memberCount = cachedMembership && typeof cachedMembership.memberCount === 'number'
    ? cachedMembership.memberCount
    : (community.member_count || 0);

  const handleToggleJoin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    setLoading(true);
    const nextJoined = !joined;
    const nextCount = nextJoined ? memberCount + 1 : Math.max(memberCount - 1, 0);

    // Optimistic update
    updateCommunityMembership(community.id, nextJoined, nextCount);

    try {
      let res;
      if (joined) {
        res = await communitiesApi.leave(community.id);
        toast.success(`Left ${community.name}`);
      } else {
        res = await communitiesApi.join(community.id);
        toast.success(`Joined ${community.name}`);
      }
      if (res && res.isMember !== undefined) {
        updateCommunityMembership(community.id, res.isMember, res.member_count);
      }
      if (onJoinToggle) onJoinToggle(community.id, nextJoined);
    } catch (err) {
      updateCommunityMembership(community.id, joined, memberCount);
      toast.error(err.message || 'Failed to update community membership');
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
