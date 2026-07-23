import React, { useState, useEffect, useCallback } from 'react';
import Skeleton from '../atoms/Skeleton';
import Button from '../atoms/Button';
import EmptyState from '../molecules/EmptyState';

export default function PaginatedList({
  fetchData,
  renderItem,
  emptyTitle = 'No items found',
  emptyDescription = 'There are no items to display right now.',
  emptyActionLabel,
  onEmptyAction,
  limit = 20,
  className = '',
  refreshTrigger = 0,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 1, hasNext: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchData({ page: pageToLoad, limit });
        setData(response.data || []);
        setPagination(response.pagination || { page: pageToLoad, limit, total: 0, totalPages: 1, hasNext: false });
      } catch (err) {
        setError(err.message || 'Failed to load items.');
      } finally {
        setLoading(false);
      }
    },
    [fetchData, limit]
  );

  useEffect(() => {
    loadData(1);
  }, [loadData, refreshTrigger]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadData(newPage);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((n) => (
          <div key={n} className="rounded-lg border border-main bg-surface p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-10 h-10" />
              <div className="space-y-1.5 flex-1">
                <Skeleton variant="text" className="w-32 h-4" />
                <Skeleton variant="text" className="w-20 h-3" />
              </div>
            </div>
            <Skeleton variant="text" className="w-3/4 h-5" />
            <Skeleton variant="text" className="w-full h-12" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-center space-y-3">
        <p className="text-sm font-medium text-danger">{error}</p>
        <Button size="sm" variant="secondary" onClick={() => loadData(pagination.page)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        {data.map((item, index) => renderItem(item, index))}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-main pt-4 text-sm text-muted">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!pagination.hasNext}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
