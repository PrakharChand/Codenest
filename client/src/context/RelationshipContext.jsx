/**
 * client/src/context/RelationshipContext.jsx
 *
 * App-wide Relationship State & Event Synchronization Provider.
 * Keeps Follow, Connect, and Community membership states 100% in sync
 * across all pages, cards, sidebars, and recommendation widgets without manual page reloads.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const RelationshipContext = createContext(null);

export function RelationshipProvider({ children }) {
  // Map of userId -> relationship object { isFollowing, followsMe, isConnected, connectionStatus }
  const [userRelationships, setUserRelationships] = useState({});

  // Map of communityId -> { isMember: boolean, memberCount: number }
  const [communityMemberships, setCommunityMemberships] = useState({});

  // Version counter to trigger re-renders in listening components
  const [syncVersion, setSyncVersion] = useState(0);

  /**
   * Update relationship state for a specific user
   */
  const updateUserRelationship = useCallback((userId, relData) => {
    if (!userId) return;
    setUserRelationships((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...relData,
      },
    }));
    setSyncVersion((v) => v + 1);
  }, []);

  /**
   * Update membership state for a specific community
   */
  const updateCommunityMembership = useCallback((communityId, isMember, memberCount) => {
    if (!communityId) return;
    setCommunityMemberships((prev) => ({
      ...prev,
      [communityId]: {
        isMember: Boolean(isMember),
        memberCount: typeof memberCount === 'number' ? memberCount : prev[communityId]?.memberCount,
      },
    }));
    setSyncVersion((v) => v + 1);
  }, []);

  /**
   * Get cached relationship for a user ID
   */
  const getUserRelationshipState = useCallback((userId) => {
    return userRelationships[userId] || null;
  }, [userRelationships]);

  /**
   * Get cached membership for a community ID
   */
  const getCommunityMembershipState = useCallback((communityId) => {
    return communityMemberships[communityId] || null;
  }, [communityMemberships]);

  return (
    <RelationshipContext.Provider
      value={{
        userRelationships,
        communityMemberships,
        syncVersion,
        updateUserRelationship,
        updateCommunityMembership,
        getUserRelationshipState,
        getCommunityMembershipState,
      }}
    >
      {children}
    </RelationshipContext.Provider>
  );
}

export function useRelationship() {
  const context = useContext(RelationshipContext);
  if (!context) {
    // Graceful fallback if component is rendered outside provider
    return {
      userRelationships: {},
      communityMemberships: {},
      syncVersion: 0,
      updateUserRelationship: () => {},
      updateCommunityMembership: () => {},
      getUserRelationshipState: () => null,
      getCommunityMembershipState: () => null,
    };
  }
  return context;
}
