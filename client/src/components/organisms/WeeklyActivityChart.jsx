import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { usersApi } from '../../api/usersApi';
import Card from '../atoms/Card';
import Button from '../atoms/Button';
import Skeleton from '../atoms/Skeleton';

// Format time spent: < 60 mins => "XX mins", >= 60 mins => "Xh Ym"
function formatTimeSpent(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0 mins';
  if (totalMinutes < 60) {
    return `${totalMinutes} min${totalMinutes !== 1 ? 's' : ''}`;
  }
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
  return `${hrs}h ${mins}m`;
}

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

  if (loading) {
    return (
      <Card className={`p-4 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton height="18px" width="120px" />
          <Skeleton height="18px" width="80px" rounded="rounded-full" />
        </div>
        <Skeleton height="140px" className="w-full rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 space-y-3 ${className}`}>
        <h4 className="text-sm font-bold text-main font-mono">Weekly Activity</h4>
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
  const timeSpent = activityData?.timeSpentMins || 0;
  const isEmpty = totalActivity === 0;

  return (
    <Card className={`p-4 md:p-5 space-y-4 shadow-sm border border-[var(--border-main)] ${className}`}>
      {/* Top Header Row — Title & Streak Badge */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-main font-mono">Weekly Activity</h4>
        {streak > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs shrink-0"
            title={`${streak} consecutive active day${streak !== 1 ? 's' : ''}`}
          >
            🔥 {streak}d streak
          </span>
        )}
      </div>

      {/* Tidy Metric Summary Grid: Time Spent & Total Activity */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface-subtle)] p-2.5 space-y-0.5">
          <div className="text-[10px] text-subtle font-semibold flex items-center gap-1">
            <span>⏱️</span> <span>Time Spent</span>
          </div>
          <p className="text-sm font-black text-primary font-mono truncate">
            {formatTimeSpent(timeSpent)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface-subtle)] p-2.5 space-y-0.5">
          <div className="text-[10px] text-subtle font-semibold flex items-center gap-1">
            <span>⚡</span> <span>Contributions</span>
          </div>
          <p className="text-sm font-black text-main font-mono truncate">
            {totalActivity} act{totalActivity !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Recharts AreaChart (Clean Padding, no labels cut off) */}
      <div className="h-36 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
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
              dataKey="likes"
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
        <div className="border-t border-[var(--border-main)] pt-2 text-center">
          <p className="text-[11px] text-muted italic">
            No activity recorded this week yet. Start coding or reviewing to build your streak! 🚀
          </p>
        </div>
      )}
    </Card>
  );
}
