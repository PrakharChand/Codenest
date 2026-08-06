/**
 * client/src/utils/feedCache.js
 *
 * Intelligent lightweight in-memory feed cache.
 * Provides:
 *  - Instant load from cache on repeat views
 *  - Stale-While-Revalidate (SWR) background refresh
 *  - Query-parameterized cache keys (isolated per author_id, tag, search query)
 *  - Cache invalidation after posting, updating, or deleting
 *  - Optimistic updates for post removal & like/unlike toggles
 *  - Subscriber listener pattern for seamless React UI syncing
 */

const FRESH_TTL_MS = 2 * 60 * 1000; // 2 minutes fresh TTL

class FeedCacheManager {
  constructor() {
    this.cache = new Map(); // key -> { data, pagination, timestamp }
    this.listeners = new Set();
    this.inFlightRequests = new Map(); // key -> Promise
  }

  // Generate deterministic cache key for query params
  // Crucial fix: include author_id, tag, search to prevent profile/feed cache collision!
  getKey(params = {}) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const authorId = params.author_id ? `_auth${params.author_id}` : '';
    const tag = params.tag ? `_tag${params.tag}` : '';
    const search = params.search ? `_q${params.search}` : '';
    return `feed_p${page}_l${limit}${authorId}${tag}${search}`;
  }

  // Get raw cached entry
  get(params = {}) {
    const key = this.getKey(params);
    return this.cache.get(key) || null;
  }

  // Check if cache entry is still fresh
  isFresh(entry) {
    if (!entry || !entry.timestamp) return false;
    return Date.now() - entry.timestamp < FRESH_TTL_MS;
  }

  // Store response in cache and notify subscribers
  set(params, response) {
    const key = this.getKey(params);
    const entry = {
      data: response.data || [],
      pagination: response.pagination || null,
      timestamp: Date.now(),
    };
    this.cache.set(key, entry);
    this.notify(key, entry);
    return entry;
  }

  // Invalidate all feed cache (e.g. after post creation / deletion)
  invalidate() {
    this.cache.clear();
    this.notify();
  }

  // Optimistically remove a post from all cached pages
  removePost(postId) {
    for (const [key, entry] of this.cache.entries()) {
      const filtered = entry.data.filter((post) => post.id !== postId);
      const totalAdjustment = entry.pagination ? Math.max(0, entry.pagination.total - 1) : 0;

      this.cache.set(key, {
        ...entry,
        data: filtered,
        pagination: entry.pagination
          ? { ...entry.pagination, total: totalAdjustment }
          : null,
      });
    }
    this.notify();
  }

  // Optimistically update a post's like status in cached pages
  updatePostLike(postId, isLiked, newLikeCount) {
    for (const [key, entry] of this.cache.entries()) {
      let updated = false;
      const data = entry.data.map((post) => {
        if (post.id === postId) {
          updated = true;
          return {
            ...post,
            isLiked: isLiked,
            is_liked: isLiked,
            like_count: newLikeCount,
            likes_count: newLikeCount,
          };
        }
        return post;
      });
      if (updated) {
        this.cache.set(key, { ...entry, data });
      }
    }
    this.notify();
  }

  // Optimistically prepend a newly created post to Page 1 main feed cache
  prependPost(newPost) {
    const page1Key = 'feed_p1_l20';
    const entry = this.cache.get(page1Key);
    if (entry) {
      const filtered = entry.data.filter((p) => p.id !== newPost.id);
      const newTotal = entry.pagination ? entry.pagination.total + 1 : 1;
      this.cache.set(page1Key, {
        ...entry,
        data: [newPost, ...filtered],
        pagination: entry.pagination ? { ...entry.pagination, total: newTotal } : null,
        timestamp: Date.now(),
      });
    }
    this.notify();
  }

  // Subscribe React components to cache updates
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(key, entry) {
    for (const listener of this.listeners) {
      try {
        listener(key, entry);
      } catch (err) {
        // Prevent subscriber error from crashing cache
      }
    }
  }
}

export const feedCache = new FeedCacheManager();
