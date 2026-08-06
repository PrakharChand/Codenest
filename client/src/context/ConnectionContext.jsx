import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usersApi } from '../api/usersApi';
import { useAuth } from './AuthContext';
import { useRelationship } from './RelationshipContext';

const ConnectionContext = createContext(null);

export function ConnectionProvider({ children }) {
  const { user } = useAuth();
  const { updateUserRelationship } = useRelationship();

  // Primary reactive relationship stores
  const [followingSet, setFollowingSet] = useState(new Set());
  const [mutualSet, setMutualSet] = useState(new Set());
  const [requestMap, setRequestMap] = useState(new Map()); // userId -> 'pending' | 'incoming' | 'none'
  const [inFlightIds, setInFlightIds] = useState(new Set()); // userIds with active API calls
  const [initialized, setInitialized] = useState(false);

  // ── 1. Rehydrate current user's connection relationships on mount/login ──────
  const refreshConnections = useCallback(async () => {
    if (!user) {
      setFollowingSet(new Set());
      setMutualSet(new Set());
      setRequestMap(new Map());
      setInitialized(false);
      return;
    }

    try {
      // Fetch followed users, incoming/outgoing requests in parallel
      const [followingRes, mutualRes, outgoingRes, incomingRes] = await Promise.all([
        usersApi.listFollowing(user.id, { limit: 500 }).catch(() => ({ data: [] })),
        usersApi.listMutual(user.id, { limit: 500 }).catch(() => ({ data: [] })),
        usersApi.listOutgoingRequests().catch(() => ({ data: [] })),
        usersApi.listIncomingRequests().catch(() => ({ data: [] })),
      ]);

      const followingRows = followingRes.data || [];
      const mutualRows = mutualRes.data || [];
      const outgoingRows = outgoingRes.data || outgoingRes.results || [];
      const incomingRows = incomingRes.data || incomingRes.results || [];

      const newFollowingSet = new Set(followingRows.map((u) => u.id));
      const newMutualSet = new Set(mutualRows.map((u) => u.id));

      const newReqMap = new Map();
      outgoingRows.forEach((r) => newReqMap.set(r.id || r.user_id, 'outgoing'));
      incomingRows.forEach((r) => newReqMap.set(r.id || r.user_id, 'incoming'));

      setFollowingSet(newFollowingSet);
      setMutualSet(newMutualSet);
      setRequestMap(newReqMap);
    } catch (err) {
      // Silently swallow background sync errors
    } finally {
      setInitialized(true);
    }
  }, [user]);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  // ── 2. Register initial user status from list API responses ─────────────────
  const registerUserStatus = useCallback((userObj) => {
    if (!userObj || !userObj.id) return;
    const targetId = userObj.id;

    setFollowingSet((prev) => {
      // If we already explicitly tracked this user, don't overwrite
      if (userObj.isFollowing === undefined && userObj.isConnected === undefined) return prev;
      const shouldFollow = Boolean(userObj.isFollowing || userObj.isConnected);
      if (prev.has(targetId) === shouldFollow) return prev;
      const next = new Set(prev);
      if (shouldFollow) next.add(targetId);
      else next.delete(targetId);
      return next;
    });

    if (userObj.isMutual !== undefined) {
      setMutualSet((prev) => {
        if (prev.has(targetId) === userObj.isMutual) return prev;
        const next = new Set(prev);
        if (userObj.isMutual) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
    }

    if (userObj.connectionStatus) {
      updateUserRelationship(targetId, {
        isFollowing: Boolean(userObj.isFollowing),
        followsMe: Boolean(userObj.followsMe),
        isConnected: Boolean(userObj.isConnected),
        connectionStatus: userObj.connectionStatus,
      });
    }
  }, [updateUserRelationship]);

  // ── 3. Helper status queries ─────────────────────────────────────────────
  const isFollowing = useCallback((userId, fallback = false) => {
    if (!userId) return false;
    if (followingSet.has(userId)) return true;
    return fallback && !initialized ? fallback : followingSet.has(userId);
  }, [followingSet, initialized]);

  const isMutual = useCallback((userId, fallback = false) => {
    if (!userId) return false;
    if (mutualSet.has(userId)) return true;
    return fallback && !initialized ? fallback : mutualSet.has(userId);
  }, [mutualSet, initialized]);

  const getRequestStatus = useCallback((userId) => {
    if (!userId) return null;
    return requestMap.get(userId) || null;
  }, [requestMap]);

  const isActionLoading = useCallback((userId) => {
    return inFlightIds.has(userId);
  }, [inFlightIds]);

  // ── 4. Action: Toggle Follow/Unfollow ────────────────────────────────────
  const toggleFollow = useCallback(async (target) => {
    const targetId = typeof target === 'object' ? target.id : target;
    const targetName = typeof target === 'object' ? target.name : 'user';
    if (!targetId || !user || user.id === targetId) return;

    if (inFlightIds.has(targetId)) return; // Prevent duplicate clicks

    // Mark target as in-flight
    setInFlightIds((prev) => new Set(prev).add(targetId));

    const currentlyFollowing = followingSet.has(targetId);
    const nextFollowingState = !currentlyFollowing;

    // Optimistic UI update
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (nextFollowingState) next.add(targetId);
      else next.delete(targetId);
      return next;
    });

    if (!nextFollowingState) {
      setMutualSet((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }

    try {
      let res;
      if (currentlyFollowing) {
        res = await usersApi.disconnect(targetId);
        toast.success(`Unfollowed ${targetName}`);
      } else {
        res = await usersApi.connect(targetId);
        toast.success(`Followed ${targetName}`);
      }

      if (res?.relationship || res?.connectionStatus !== undefined) {
        updateUserRelationship(targetId, res.relationship || res);
      } else {
        updateUserRelationship(targetId, {
          isFollowing: nextFollowingState,
          connectionStatus: nextFollowingState ? 'following' : 'none',
        });
      }
    } catch (err) {
      // Revert optimistic update on error
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (currentlyFollowing) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
      toast.error(err.message || 'Failed to update follow status');
    } finally {
      setInFlightIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [user, followingSet, inFlightIds, updateUserRelationship]);

  // ── 5. Action: Connection Request ───────────────────────────────────────
  const sendConnectionRequest = useCallback(async (target) => {
    const targetId = typeof target === 'object' ? target.id : target;
    const targetName = typeof target === 'object' ? target.name : 'user';
    if (!targetId || !user || user.id === targetId) return;

    if (inFlightIds.has(targetId)) return;

    setInFlightIds((prev) => new Set(prev).add(targetId));

    // Optimistic update
    setRequestMap((prev) => new Map(prev).set(targetId, 'outgoing'));

    try {
      const res = await usersApi.sendRequest(targetId);
      toast.success(`Connection request sent to ${targetName}`);
      if (res?.relationship || res?.connectionStatus !== undefined) {
        updateUserRelationship(targetId, res.relationship || res);
      } else {
        updateUserRelationship(targetId, {
          connectionStatus: 'pending_outgoing',
        });
      }
    } catch (err) {
      // Rollback on failure
      setRequestMap((prev) => {
        const next = new Map(prev);
        next.delete(targetId);
        return next;
      });
      toast.error(err.message || 'Failed to send connection request');
    } finally {
      setInFlightIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [user, inFlightIds, updateUserRelationship]);

  // ── 6. Action: Accept Request ────────────────────────────────────────────
  const acceptConnectionRequest = useCallback(async (targetId, targetName = 'user') => {
    if (!targetId || !user) return;
    if (inFlightIds.has(targetId)) return;

    setInFlightIds((prev) => new Set(prev).add(targetId));

    // Optimistic update
    setFollowingSet((prev) => new Set(prev).add(targetId));
    setMutualSet((prev) => new Set(prev).add(targetId));
    setRequestMap((prev) => {
      const next = new Map(prev);
      next.delete(targetId);
      return next;
    });

    try {
      const res = await usersApi.acceptRequest(targetId);
      toast.success(`Connected with ${targetName}`);
      if (res?.relationship || res?.connectionStatus !== undefined) {
        updateUserRelationship(targetId, res.relationship || res);
      } else {
        updateUserRelationship(targetId, {
          isFollowing: true,
          followsMe: true,
          isConnected: true,
          connectionStatus: 'connected',
        });
      }
    } catch (err) {
      refreshConnections();
      toast.error(err.message || 'Failed to accept connection request');
    } finally {
      setInFlightIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [user, inFlightIds, refreshConnections, updateUserRelationship]);

  // ── 7. Action: Decline Request ───────────────────────────────────────────
  const declineConnectionRequest = useCallback(async (targetId) => {
    if (!targetId || !user) return;
    if (inFlightIds.has(targetId)) return;

    setInFlightIds((prev) => new Set(prev).add(targetId));

    setRequestMap((prev) => {
      const next = new Map(prev);
      next.delete(targetId);
      return next;
    });

    try {
      const res = await usersApi.declineRequest(targetId);
      toast.success('Connection request declined');
      if (res?.relationship || res?.connectionStatus !== undefined) {
        updateUserRelationship(targetId, res.relationship || res);
      } else {
        updateUserRelationship(targetId, {
          connectionStatus: 'none',
        });
      }
    } catch (err) {
      refreshConnections();
      toast.error(err.message || 'Failed to decline connection request');
    } finally {
      setInFlightIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [user, inFlightIds, refreshConnections, updateUserRelationship]);

  const value = {
    followingSet,
    mutualSet,
    requestMap,
    isFollowing,
    isMutual,
    getRequestStatus,
    isActionLoading,
    toggleFollow,
    sendConnectionRequest,
    acceptConnectionRequest,
    declineConnectionRequest,
    registerUserStatus,
    refreshConnections,
  };

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
