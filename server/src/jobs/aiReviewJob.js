/**
 * server/src/jobs/aiReviewJob.js
 *
 * Hourly cron: auto-review Shadow submissions that have been waiting
 * 24+ hours with no human review.
 *
 * Schema notes:
 *   - is_ai_review = true, reviewer_id = NULL (Phase 4 partial-unique
 *     index allows this: WHERE reviewer_id IS NOT NULL — Phase 4's
 *     forward-reservation pays off here with zero schema change).
 *   - The review goes through withTransaction: insert + review_count bump
 *     + identity-free shadow notification in one atomic operation.
 *
 * Started from server.js (not app.js) guarded by NODE_ENV !== 'test'
 * so the cron never runs during the test suite.
 *
 * Decision: helpful votes are NOT emitted for AI-generated reviews
 * (they're labeled on the frontend and de-emphasized). Only the identity-free
 * shadow notification is sent.
 */

const cron             = require('node-cron');
const { query }        = require('../config/db');
const withTransaction  = require('../utils/withTransaction');
const createNotification = require('../utils/createNotification');
const { generateAIReview } = require('../services/aiService');

/**
 * runAIReviewJob()
 *
 * Exported so it can be called once manually in tests/verification scripts
 * without triggering the cron schedule.
 */
async function runAIReviewJob() {
  console.log('[aiReviewJob] Running AI review pass...');

  // Find submissions older than 24h with zero reviews
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

      if (!aiResult) {
        console.warn(`[aiReviewJob] AI returned null for submission ${submission.id}. Skipping.`);
        continue;
      }

      await withTransaction(async (client) => {
        // Insert AI review — reviewer_id = NULL (partial-unique index allows this)
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

        // Counter integrity: review_count must match actual rows
        await client.query(
          'UPDATE shadow_submissions SET review_count = review_count + 1 WHERE id = $1',
          [submission.id]
        );

        // Identity-free shadow notification to submission owner
        // IDENTITY RULE: no name, no username in the message
        await createNotification({
          userId:          submission.user_id,
          type:            'review',
          message:         'Your submission received a new review.',
          referenceId:     submission.id,
          identityContext: 'shadow',
          client,
        });
      });

      console.log(`[aiReviewJob] AI review inserted for submission ${submission.id}.`);
    } catch (err) {
      // Log and continue — one failed submission does not abort the whole run
      console.error(`[aiReviewJob] Failed for submission ${submission.id}:`, err.message);
    }
  }

  console.log('[aiReviewJob] Pass complete.');
}

/**
 * startAIReviewCron()
 *
 * Registers the hourly cron schedule.
 * Call from server.js, guarded by NODE_ENV !== 'test'.
 */
function startAIReviewCron() {
  // '0 * * * *' = at minute 0 of every hour
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
