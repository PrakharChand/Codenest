/**
 * server/src/jobs/aiReviewJob.js
 *
 * Hourly cron: auto-review Shadow submissions that have been waiting
 * 24+ hours with no human review.
 */

const cron               = require('node-cron');
const { query }          = require('../config/db');
const withTransaction    = require('../utils/withTransaction');
const createNotification = require('../utils/createNotification');
const { generateAIReview } = require('../services/aiService');

/**
 * runAIReviewJob()
 * Single-pass execution (callable manually or via cron).
 */
async function runAIReviewJob() {
  console.log('[aiReviewJob] Running AI review pass...');

  // Find submissions older than 24h with zero human or AI reviews
  const { rows: eligible } = await query(
    `SELECT id, user_id, title, content, language_tag, question
     FROM shadow_submissions
     WHERE review_count = 0
       AND created_at < NOW() - INTERVAL '24 hours'`
  );

  if (!eligible.length) {
    console.log('[aiReviewJob] No eligible submissions. Done.');
    return;
  }

  console.log(`[aiReviewJob] Found ${eligible.length} eligible submission(s).`);

  for (const submission of eligible) {
    try {
      const aiResult = await generateAIReview(submission);

      // Check if AI review returned a valid structure (skip fallback)
      if (!aiResult || aiResult.fallback || !aiResult.what_good) {
        console.warn(`[aiReviewJob] AI review skipped for submission ${submission.id} (fallback returned).`);
        continue;
      }

      await withTransaction(async (client) => {
        // Insert AI review — reviewer_id = NULL (is_ai_review = TRUE)
        await client.query(
          `INSERT INTO shadow_reviews
             (submission_id, reviewer_id, what_good, what_improve, resources, helpfulness_rating, is_ai_review)
           VALUES ($1, NULL, $2, $3, $4, $5, TRUE)`,
          [
            submission.id,
            aiResult.what_good,
            aiResult.what_improve,
            aiResult.resources || null,
            aiResult.helpfulness_rating,
          ]
        );

        // Bump review count
        await client.query(
          'UPDATE shadow_submissions SET review_count = review_count + 1 WHERE id = $1',
          [submission.id]
        );

        // Send identity-free shadow notification
        await createNotification({
          userId:          submission.user_id,
          type:            'review',
          message:         'Your submission received a new review.',
          referenceId:     submission.id,
          identityContext: 'shadow',
          client,
        });
      });

      console.log(`[aiReviewJob] AI review successfully inserted for submission ${submission.id}.`);
    } catch (err) {
      console.error(`[aiReviewJob] Failed for submission ${submission.id}:`, err.message);
    }
  }

  console.log('[aiReviewJob] Pass complete.');
}

/**
 * startAIReviewCron()
 * Registers the hourly cron schedule.
 */
function startAIReviewCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      await runAIReviewJob();
    } catch (err) {
      console.error('[aiReviewJob] Unhandled error in cron run:', err.message);
    }
  });
  console.log('[aiReviewJob] Hourly AI review cron scheduled.');
}

module.exports = { startAIReviewCron, runAIReviewJob };
