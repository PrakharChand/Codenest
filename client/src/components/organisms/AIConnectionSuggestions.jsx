import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import { useConnection } from '../../context/ConnectionContext';
import Card from '../atoms/Card';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

export default function AIConnectionSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isFollowing, isActionLoading, toggleFollow } = useConnection();

  const loadSuggestions = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await aiApi.suggestConnections({ refresh });
      setSuggestions(res.suggestions || []);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleConnect = async (item) => {
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
          <h4 className="text-xs font-bold text-[var(--text-main)]">Developers You Should Meet</h4>
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
                    className="text-[11px] text-[var(--color-primary)] truncate italic mt-0.5"
                    title={item.reason}
                  >
                    {item.reason}
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
