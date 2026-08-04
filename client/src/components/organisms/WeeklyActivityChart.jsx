/**
 * client/src/components/organisms/WeeklyActivityChart.jsx
 *
 * Real-time Weekly Activity Chart (Recharts) with:
 *  - Real API integration (usersApi.getActivity)
 *  - 7-day daily activity breakdown (posts, comments, reviews)
 *  - Consecutive daily streak & total activity count badges
 *  - Automatic refresh on window focus & activity events
 *  - Loading skeleton, error state with retry, & empty state handling
 *  - Duplication avoidance for in-flight requests
 *  - Exact preservation of existing chart design tokens & UI styling
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { usersApi } from '../../api/usersApi';
import Card from '../atoms/Card';
import Button from '../atoms/Button';
import Skeleton from '../atoms/Skeleton';

// Custom Tooltip component for Recharts showing detailed breakdown
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-3 shadow-md text-xs text-[var(--text-main)] space-y-1.5 min-w-[120px]">
        <p className="font-bold text-[var(--color-primary)] border-b border-[var(--border-main)] pb-1">
          {label} ({data.date})
        </p>
        <div className="space-y-0.5 text-[var(--text-muted)] font-medium">
          <p className="flex justify-between gap-3">
            <span>Posts:</span> <strong className="text-[var(--text-main)]">{data.posts || 0}</strong>
          </p>
          <p className="flex justify-between gap-3">
            <span>Comments:</span> <strong className="text-[var(--text-main)]">{data.comments || 0}</strong>
          </p>
          <p className="flex justify-between gap-3">
            <span>Reviews:</span> <strong className="text-[var(--text-main)]">{data.reviews || 0}</strong>
          </p>
          <p className="flex justify-between gap-3 border-t border-[var(--border-main)] pt-1 font-bold text-[var(--text-main)]">
            <span>Total:</span> <span>{data.activity || 0}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export default function WeeklyActivityChart({ className = '' }) {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // In-flight request ref to prevent duplicate concurrent API calls
  const isFetchingRef = useRef(false);

  const loadActivity = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);

    try {
      const data = await usersApi.getActivity();
      setActivityData(data);
    } catch (err) {
      setError(err.message || 'Failed to load activity data.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadActivity();

    // Auto-update chart when window regains focus or after user actions
    const handleRefetch = () => {
      loadActivity();
    };

    window.addEventListener('focus', handleRefetch);
    window.addEventListener('activityUpdated', handleRefetch);
    window.addEventListener('postCreated', handleRefetch);

    return () => {
      window.removeEventListener('focus', handleRefetch);
      window.removeEventListener('activityUpdated', handleRefetch);
      window.removeEventListener('postCreated', handleRefetch);
    };
  }, [loadActivity]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className={`p-4 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton height="18px" width="120px" />
          <Skeleton height="18px" width="80px" rounded="rounded-full" />
        </div>
        <Skeleton height="160px" className="w-full rounded-xl" />
      </Card>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className={`p-4 space-y-3 ${className}`}>
        <h4 className="text-sm font-semibold text-main">Weekly Activity</h4>
        <div className="rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 p-4 text-center space-y-2">
          <p className="text-xs text-[var(--color-danger)] font-medium">{error}</p>
          <Button size="sm" variant="secondary" onClick={loadActivity}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const daily = activityData?.daily || [];
  const streak = activityData?.streak || 0;
  const totalActivity = activityData?.activityCount || 0;
  const isEmpty = totalActivity === 0;

  return (
    <Card className={`space-y-3 ${className}`}>
      {/* Header — Title, Streak badge & Total count */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-main">Weekly Activity</h4>

        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20"
              title={`${streak} consecutive active day${streak !== 1 ? 's' : ''}`}
            >
              🔥 {streak}d streak
            </span>
          )}
          <span className="text-xs text-muted font-medium">
            {totalActivity} act{totalActivity !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Recharts AreaChart UI */}
      <div className="h-40 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis
              dataKey="day"
              stroke="var(--text-subtle)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-subtle)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="likes" // Maintained for existing UI compatibility (mapped to activity count)
              stroke="var(--color-primary)"
              fill="var(--color-primary-light)"
              strokeWidth={2}
              activeDot={{ r: 4, stroke: 'var(--color-primary)', strokeWidth: 2, fill: 'var(--bg-surface)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Empty State Banner */}
      {isEmpty && (
        <div className="border-t border-[var(--border-main)] pt-2.5 text-center">
          <p className="text-xs text-[var(--text-muted)] italic">
            No activity recorded this week yet. Share a post or comment to start your streak! 🚀
          </p>
        </div>
      )}
    </Card>
  );
}
