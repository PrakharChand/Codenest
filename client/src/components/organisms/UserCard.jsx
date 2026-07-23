import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import { usersApi } from '../../api/usersApi';
import { useAuth } from '../../context/AuthContext';

export default function UserCard({ targetUser, onConnectToggle }) {
  const { user: currentUser } = useAuth();
  const [connected, setConnected] = useState(targetUser.isConnected || false);
  const [isMutual, setIsMutual] = useState(targetUser.isMutual || false);
  const [loading, setLoading] = useState(false);

  const isSelf = currentUser && currentUser.id === targetUser.id;

  const handleToggleConnect = async () => {
    if (isSelf) return;
    setLoading(true);
    try {
      if (connected) {
        await usersApi.disconnect(targetUser.id);
        setConnected(false);
        setIsMutual(false);
      } else {
        await usersApi.connect(targetUser.id);
        setConnected(true);
      }
      if (onConnectToggle) onConnectToggle(targetUser.id, !connected);
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <Link to={`/users/${targetUser.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={targetUser.avatar_url} name={targetUser.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-main truncate">{targetUser.name}</h4>
            {isMutual && <Badge variant="primary" size="sm">Mutual</Badge>}
          </div>
          {targetUser.bio && <p className="text-xs text-muted truncate">{targetUser.bio}</p>}
        </div>
      </Link>

      {!isSelf && currentUser && (
        <Button
          size="sm"
          variant={connected ? 'secondary' : 'primary'}
          onClick={handleToggleConnect}
          isLoading={loading}
        >
          {connected ? 'Connected' : 'Connect'}
        </Button>
      )}
    </Card>
  );
}
