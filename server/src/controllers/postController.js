/**
 * server/src/controllers/postController.js
 *
 * Business logic for /api/posts routes.
 *
 * Conventions inherited from Phase 2 (do not reinvent):
 *   - asyncHandler wraps every function (in routes file)
 *   - ApiError for all errors
 *   - query() from db.js for single statements
 *   - withTransaction() for counter + row pairs
 *   - parsePagination / buildPaginatedResponse for every list
 *   - Ownership: WHERE id=$1 AND user_id=$2, zero rows → ApiError.forbidden
 *
 * Content limits (recorded in CODENEST_REFERENCE.md):
 *   Post title:   max 200 characters
 *   Post content: max 50,000 characters
 *   Tag name:     max 50 characters
 */

const { query }                                    = require('../config/db');
const withTransaction                              = require('../utils/withTransaction');
const ApiError                                     = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse }  = require('../utils/paginate');
const createNotification                           = require('../utils/createNotification');

// ── Author public card — reused in every post/comment query ──────────────
// Only these public fields from the users table are ever returned.
// Never name, bio, github_url, twitter_url in the author card.
const AUTHOR_CARD = `
  u.id   AS author_id,
  u.name AS author_name,
  u.avatar_url AS author_avatar_url
`;

// ── Helpers ───────────────────────────────────────────────────────────────

async function getPostTags(postId) {
  const { rows } = await query(
    `SELECT t.name FROM tags t
     JOIN post_tags pt ON pt.tag_id = t.id
     WHERE pt.post_id = $1
     ORDER BY t.name`,
    [postId]
  );
  return rows.map((r) => r.name);
}

// ── GET /api/posts — public feed ─────────────────────────────────────────

async function listPosts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const { tag, search, sort, author_id } = req.query;

  const params = [];
  const where  = [`p.visibility = 'public'`];

  if (author_id) {
    const authId = parseInt(author_id, 10);
    params.push(authId);
    const authParamIdx = params.length;

    // Fetch author name to also include posts where this user is tagged by name
    const { rows: uRows } = await query('SELECT name FROM users WHERE id = $1', [authId]);
    const uName = uRows[0]?.name ? uRows[0].name.toLowerCase().trim() : null;

    if (uName) {
      params.push(uName);
      const nameParamIdx = params.length;
      where.push(`(
        p.user_id = $${authParamIdx}
        OR EXISTS (
          SELECT 1 FROM post_tags pt
          JOIN tags t ON t.id = pt.tag_id
          WHERE pt.post_id = p.id AND LOWER(t.name) = $${nameParamIdx}
        )
      )`);
    } else {
      where.push(`p.user_id = $${authParamIdx}`);
    }
  }

  if (tag) {
    params.push(tag.toLowerCase());
    where.push(`EXISTS (
      SELECT 1 FROM post_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id AND LOWER(t.name) = $${params.length}
    )`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.title ILIKE $${params.length} OR p.content ILIKE $${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderClause = sort === 'top' ? 'ORDER BY p.like_count DESC, p.created_at DESC'
                                     : 'ORDER BY p.created_at DESC';

  // Count query (uses same WHERE, no pagination)
  const countResult = await query(
    `SELECT COUNT(*) FROM posts p ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Data query
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT p.id, p.title, p.content, p.visibility, p.like_count, p.comment_count,
            p.share_count, p.image_url, p.shared_from_post_id, p.created_at,
            ${AUTHOR_CARD}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ${whereClause}
     ${orderClause}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Attach tags to each post
  const data = await Promise.all(
    rows.map(async (post) => ({ ...post, tags: await getPostTags(post.id) }))
  );

  return res.json(buildPaginatedResponse(data, total, page, limit));
}

// ── GET /api/posts/:id — single post ─────────────────────────────────────

async function getPost(req, res) {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user?.id ?? null; // null if public (unauthenticated) request

  const { rows } = await query(
    `SELECT p.id, p.title, p.content, p.visibility, p.like_count, p.comment_count,
            p.share_count, p.image_url, p.shared_from_post_id, p.user_id, p.created_at,
            ${AUTHOR_CARD}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [postId]
  );

  const post = rows[0];
  if (!post) throw ApiError.notFound('Post not found.');

  // Non-public posts are invisible to non-owners
  if (post.visibility !== 'public' && post.user_id !== userId) {
    throw ApiError.notFound('Post not found.');
  }

  const tags = await getPostTags(postId);
  return res.json({ ...post, tags });
}

// ── POST /api/posts — create post ────────────────────────────────────────

async function createPost(req, res) {
  const { title, content, visibility = 'public', image_url, tags = [] } = req.body;
  const userId = req.user.id;

  const { moderateText } = require('../services/moderationService');
  const modResult = await moderateText(`${title || ''} ${content || ''}`, 'post', userId);
  if (!modResult.safe) {
    return res.status(400).json({
      error: {
        code: 'CONTENT_MODERATION_VIOLATION',
        message: modResult.reason,
        violationCount: modResult.violationCount,
        action: modResult.action,
      },
    });
  }

  const post = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO posts (user_id, title, content, visibility, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, content, visibility, image_url, like_count,
                 comment_count, share_count, created_at`,
      [userId, title, content, visibility, image_url || null]
    );
    const newPost = rows[0];

    // Upsert tags + link them
    for (const tagName of tags) {
      const normalised = tagName.toLowerCase().trim().slice(0, 50);
      if (!normalised) continue;
      const { rows: tagRows } = await client.query(
        `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [normalised]
      );
      await client.query(
        `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [newPost.id, tagRows[0].id]
      );
    }
    return newPost;
  });

  const savedTags = await getPostTags(post.id);
  return res.status(201).json({ ...post, tags: savedTags });
}

// ── PUT /api/posts/:id — update post (owner only) ────────────────────────

async function updatePost(req, res) {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const { title, content, visibility, image_url, tags } = req.body;

  const post = await withTransaction(async (client) => {
    // Ownership enforced at query level — 0 rows = forbidden, not 404
    const { rows } = await client.query(
      `UPDATE posts
       SET title      = COALESCE($1, title),
           content    = COALESCE($2, content),
           visibility = COALESCE($3, visibility),
           image_url  = COALESCE($4, image_url)
       WHERE id = $5 AND user_id = $6
       RETURNING id, title, content, visibility, image_url, like_count,
                 comment_count, share_count, created_at`,
      [title ?? null, content ?? null, visibility ?? null, image_url ?? null, postId, userId]
    );

    if (!rows.length) throw ApiError.forbidden('You do not own this post.');
    const updated = rows[0];

    // Re-sync tags if provided
    if (Array.isArray(tags)) {
      await client.query('DELETE FROM post_tags WHERE post_id = $1', [postId]);
      for (const tagName of tags) {
        const normalised = tagName.toLowerCase().trim().slice(0, 50);
        if (!normalised) continue;
        const { rows: tagRows } = await client.query(
          `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [normalised]
        );
        await client.query(
          `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [postId, tagRows[0].id]
        );
      }
    }
    return updated;
  });

  const savedTags = await getPostTags(post.id);
  return res.json({ ...post, tags: savedTags });
}

// ── DELETE /api/posts/:id — delete post (owner only) ─────────────────────

async function deletePost(req, res) {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  // Comments, likes, post_tags cascade via Phase 1 FKs
  const { rowCount } = await query(
    'DELETE FROM posts WHERE id = $1 AND user_id = $2',
    [postId, userId]
  );

  if (!rowCount) throw ApiError.forbidden('You do not own this post.');
  return res.json({ message: 'Post deleted.' });
}

// ── POST /api/posts/:id/like — like a post ───────────────────────────────
// Duplicate like → idempotent success (not 409).
// Recorded in CODENEST_REFERENCE.md: duplicate like/join = idempotent success.

async function likePost(req, res) {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  // Confirm post exists and get owner for notification
  const { rows: postRows } = await query('SELECT id, user_id, title FROM posts WHERE id = $1', [postId]);
  if (!postRows.length) throw ApiError.notFound('Post not found.');

  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, postId]
    );
    // Only bump counter and notify if a new like was actually inserted
    if (rowCount > 0) {
      await client.query(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = $1',
        [postId]
      );
      // Notify post owner — never notify a user about their own action
      const ownerId = postRows[0].user_id;
      if (ownerId !== userId) {
        await createNotification({
          userId: ownerId,
          type: 'like',
          message: 'Someone liked your post.',
          referenceId: postId,
          identityContext: 'public',
          client,
        });
      }
    }
  });

  return res.json({ message: 'Post liked.' });
}

// ── DELETE /api/posts/:id/like — unlike a post ───────────────────────────
// Un-liking a not-liked post is a no-op success. Counter never goes negative.

async function unlikePost(req, res) {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
    // Only decrement if a row was actually deleted — counter never negative
    if (rowCount > 0) {
      await client.query(
        'UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
        [postId]
      );
    }
  });

  return res.json({ message: 'Post unliked.' });
}

// ── POST /api/posts/:id/share — reshare a post ───────────────────────────
// Creates a new post row referencing the original via shared_from_post_id.
// Original's share_count is bumped transactionally.

async function sharePost(req, res) {
  const originalId = parseInt(req.params.id, 10);
  const userId     = req.user.id;
  const { note }   = req.body;

  const { rows: origRows } = await query(
    'SELECT id, title FROM posts WHERE id = $1 AND visibility = $2',
    [originalId, 'public']
  );
  if (!origRows.length) throw ApiError.notFound('Original post not found or is not public.');

  const originalOwnerId = await (async () => {
    const { rows } = await query('SELECT user_id FROM posts WHERE id = $1', [originalId]);
    return rows[0]?.user_id;
  })();

  const reshare = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO posts (user_id, title, content, visibility, shared_from_post_id)
       VALUES ($1, $2, $3, 'public', $4)
       RETURNING id, title, content, visibility, shared_from_post_id, created_at`,
      [userId, `Shared: ${origRows[0].title}`, note || '', originalId]
    );
    await client.query(
      'UPDATE posts SET share_count = share_count + 1 WHERE id = $1',
      [originalId]
    );
    // Notify original author — never notify about own action
    if (originalOwnerId && originalOwnerId !== userId) {
      await createNotification({
        userId: originalOwnerId,
        type: 'share',
        message: 'Someone shared your post.',
        referenceId: originalId,
        identityContext: 'public',
        client,
      });
    }
    return rows[0];
  });

  return res.status(201).json(reshare);
}

// ── GET /api/posts/trending — trending posts ──────────────────────────────

async function getTrendingPosts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const userId = req.user ? req.user.id : 0;

  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM posts WHERE visibility = 'public' AND created_at >= NOW() - INTERVAL '7 days'`
  );
  const total = countRes.rows[0]?.count || 0;

  const { rows } = await query(
    `SELECT p.id, p.title, p.content, p.visibility, p.created_at,
            ${AUTHOR_CARD},
            (SELECT COUNT(*)::int FROM likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*)::int FROM comments WHERE post_id = p.id) AS comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) AS "isLiked"
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.visibility = 'public'
       AND p.created_at >= NOW() - INTERVAL '7 days'
     ORDER BY (
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) * 2 +
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 3
     ) DESC, p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  for (const post of rows) {
    post.tags = await getPostTags(post.id);
  }

  return res.json(buildPaginatedResponse(rows, page, limit, total));
}

module.exports = {
  listPosts, getPost, createPost, updatePost, deletePost,
  likePost, unlikePost, sharePost, getTrendingPosts,
};
