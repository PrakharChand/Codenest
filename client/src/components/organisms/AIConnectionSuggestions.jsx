import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import { usersApi } from '../../api/usersApi';
import Card from '../atoms/Card';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

export default function AIConnectionSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedIds, setConnectedIds] = useState(new Set());

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await aiApi.suggestConnections();
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

  const handleConnect = async (userId) => {
    try {
      await usersApi.connect(userId);
      setConnectedIds((prev) => new Set([...prev, userId]));
    } catch (err) {
      alert(err.message || 'Failed to connect.');
    }
  };

  const handleDismiss = (userId) => {
    setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
  };

  if (loading) {
    return (
      <Card className="p-4 text-center text-xs text-muted">
        Finding developer suggestions...
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null; // Fail-open: hide section entirely if no suggestions
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-main pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🤝</span>
          <h4 className="text-xs font-bold text-main">Developers You Should Meet</h4>
        </div>
        <Button variant="ghost" size="sm" onClick={loadSuggestions} title="Refresh AI Suggestions">
          🔄
        </Button>
      </div>

      <div className="space-y-3">
        {suggestions.map((item) => {
          const isConnected = connectedIds.has(item.user_id);
          return (
            <div
              key={item.user_id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-main bg-surface-subtle"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={item.avatar_url} name={item.name} size="sm" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-main truncate">{item.name}</div>
                  <p className="text-[11px] text-primary truncate italic">{item.reason}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Badge variant="success" size="sm">✓ Connected</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleConnect(item.user_id)}
                  >
                    Connect
                  </Button>
                )}
                <button
                  onClick={() => handleDismiss(item.user_id)}
                  className="text-xs text-subtle hover:text-main px-1"
                  title="Dismiss"
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
