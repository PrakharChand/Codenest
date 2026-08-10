import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import { useConnection } from '../../context/ConnectionContext';
import { useRelationship } from '../../context/RelationshipContext';
import Card from '../atoms/Card';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

const DEFAULT_DEVELOPERS = [
  { user_id: 101, name: 'Ayush', role: 'Full Stack Developer', initials: 'AY', color: '#D97706' },
  { user_id: 102, name: 'Shreya Sharma', role: 'Frontend Developer', initials: 'SS', color: '#059669' },
  { user_id: 103, name: 'Bhavik Patel', role: 'AI/ML Engineer', initials: 'BP', color: '#7C3AED' },
  { user_id: 104, name: 'Sourabh Patil', role: 'Backend Developer', initials: 'SP', color: '#DB2777' },
  { user_id: 105, name: 'Neha Verma', role: 'Data Scientist', initials: 'NV', color: '#2563EB' },
];

export default function AIConnectionSuggestions() {
  const [suggestions, setSuggestions] = useState(DEFAULT_DEVELOPERS);
  const [loading, setLoading] = useState(false);
  const { isFollowing, isActionLoading, toggleFollow } = useConnection();
  const { userRelationships } = useRelationship();

  const loadSuggestions = async (refresh = false) => {
    try {
      const res = await aiApi.suggestConnections({ refresh });
      if (res.suggestions && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }
    } catch (err) {
      // Keep default developers list on error/offline
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  // Filter out any candidates that become followed or connected anywhere in app
  useEffect(() => {
    setSuggestions((prev) =>
      prev.filter((item) => {
        const rel = userRelationships[item.user_id];
        if (!rel) return true;
        return !(rel.isFollowing || rel.isConnected || rel.connectionStatus === 'following' || rel.connectionStatus === 'connected' || rel.connectionStatus === 'pending_outgoing');
      })
    );
  }, [userRelationships]);

  const handleConnect = async (item) => {
    // Immediately filter out candidate from UI
    setSuggestions((prev) => prev.filter((s) => s.user_id !== item.user_id));
    await toggleFollow({ id: item.user_id, name: item.name });
  };

  const handleDismiss = async (userId) => {
    // Optimistically remove from current list
    setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
    try {
      const res = await aiApi.dismissSuggestion(userId);
      if (res.suggestions && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }
    } catch (_) {
      // Fallback already filtered out locally
    }
  };

  if (loading) {
    return (
      <Card className="p-4 text-center text-xs text-muted">
        Finding developer suggestions...
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null; // Fail-open: hide section entirely if no suggestions available
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🤝</span>
          <h4 className="text-xs font-extrabold text-[var(--text-main)]">Developers You Can't Miss! 🔥</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadSuggestions(true)}
          title="Refresh AI Suggestions"
        >
          🔄
        </Button>
      </div>

      <div className="space-y-3">
        {suggestions.map((item) => {
          const isConnected = isFollowing(item.user_id);
          const isBusy = isActionLoading(item.user_id);
          return (
            <div
              key={item.user_id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-subtle)]"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Avatar src={item.avatar_url} name={item.name} size="sm" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                  <p
                    className="text-[11px] text-[var(--text-muted)] truncate mt-0.5"
                    title={item.reason || item.role}
                  >
                    {item.reason || item.role || 'Software Engineer'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isConnected ? (
                  <Badge variant="success" size="sm">✓ Connected</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={isBusy}
                    onClick={() => handleConnect(item)}
                  >
                    Connect
                  </Button>
                )}
                <button
                  onClick={() => handleDismiss(item.user_id)}
                  className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded transition-colors"
                  title="Dismiss recommendation"
                  aria-label={`Dismiss suggestion for ${item.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
