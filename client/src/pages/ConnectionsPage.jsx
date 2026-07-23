import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/usersApi';
import PaginatedList from '../components/organisms/PaginatedList';
import UserCard from '../components/organisms/UserCard';

export default function ConnectionsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-main">Your Connections</h1>
        <p className="text-sm text-muted">Developers you follow and mutual connections across CodeNest</p>
      </div>

      <PaginatedList
        fetchData={(params) => usersApi.listConnections(user.id, params)}
        renderItem={(connectedUser) => (
          <UserCard key={connectedUser.id} targetUser={{ ...connectedUser, isConnected: true }} />
        )}
        emptyTitle="No connections yet"
        emptyDescription="Explore public posts and profiles to connect with other developers!"
      />
    </div>
  );
}
