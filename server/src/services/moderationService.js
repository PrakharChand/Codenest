/**
 * server/src/services/moderationService.js
 *
 * AI Content Moderation & 5-Strike Progressive Enforcement Engine.
 *
 * Checks text for inappropriate content:
 *  - Bullying / Harassment
 *  - Sexual abuse / Explicit material
 *  - Hate speech / Severe profanity / Threats
 *
 * Enforces progressive penalties:
 *  - Strike 1 & 2: Instant removal + warning modal flash
 *  - Strike 3: Instant removal + warning modal flash + automated warning email
 *  - Strike 4: Instant removal + 24-hour account suspension
 *  - Strike 5+: Instant removal + permanent ban across Email, GitHub, and Google IDs
 */

const { query } = require('../config/db');
const { genAI, GEMINI_MODEL } = require('../config/gemini');
const { sendViolationWarningEmail } = require('./emailService');

// Quick local keyword check for instant zero-latency moderation fallback
const INAPPROPRIATE_KEYWORDS = [
  'sexual abuse', 'explicit sexual', 'pornography', 'rape',
  'kill yourself', 'die bitch', 'fuck you bitch', 'nigger', 'faggot',
  'child abuse', 'cyberbullying'
];

async function checkContentWithAI(text) {
  if (!text || !text.trim()) return { safe: true };

  const lower = text.toLowerCase();
  for (const keyword of INAPPROPRIATE_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        safe: false,
        reason: `Inappropriate content detected: contains prohibited terms (${keyword}).`,
      };
    }
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.0,
      },
    });

    const prompt = `Analyze the following user content for safety violations on a developer platform.
Identify if it contains ANY of the following inappropriate content:
1. Bullying, harassment, personal attacks, or severe toxicity
2. Sexual abuse, explicit sexual content, or non-consensual material
3. Hate speech, racism, slurs, or violent threats

Return JSON strictly in this format:
{
  "safe": boolean,
  "reason": "short explanation of violation if safe is false, else empty"
}

Content to analyze:
"${text.replace(/"/g, '\\"').slice(0, 2000)}"`;

    const result = await model.generateContent(prompt);
    const textRes = result.response.text().replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(textRes);

    return {
      safe: Boolean(parsed.safe),
      reason: parsed.reason || 'Inappropriate content violating community safety policies.',
    };
  } catch (err) {
    // Fail-safe fallback if AI API is down
    return { safe: true };
  }
}

async function moderateText(text, contentType, userId) {
  if (!userId || !text) return { safe: true };

  const check = await checkContentWithAI(text);
  if (check.safe) return { safe: true };

  // Content is inappropriate — handle 5-Strike Progressive Enforcement!
  const { rows: userRows } = await query(
    `SELECT id, name, email, github_id, google_id, violation_count
     FROM users WHERE id = $1`,
    [userId]
  );

  if (!userRows.length) return { safe: false, reason: check.reason };

  const user = userRows[0];
  const newViolationCount = (user.violation_count || 0) + 1;

  // 1. Log violation to content_violations table
  await query(
    `INSERT INTO content_violations (user_id, content_type, flagged_reason, content_snippet, violation_number)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, contentType, check.reason, text.slice(0, 200), newViolationCount]
  );

  let action = 'warn';

  if (newViolationCount === 1 || newViolationCount === 2) {
    // Strike 1 & 2: Update violation_count, return warning
    await query('UPDATE users SET violation_count = $1 WHERE id = $2', [newViolationCount, userId]);
    action = 'warn';
  } else if (newViolationCount === 3) {
    // Strike 3: Update violation_count + send Warning Email!
    await query('UPDATE users SET violation_count = $1 WHERE id = $2', [newViolationCount, userId]);
    action = 'email_warn';

    try {
      await sendViolationWarningEmail({
        email: user.email,
        name: user.name,
        violationCount: 3,
        reason: check.reason,
        contentSnippet: text,
      });
    } catch (err) {
      console.error('[moderation] email dispatch error:', err.message);
    }
  } else if (newViolationCount === 4) {
    // Strike 4: 24-Hour Account Suspension!
    await query(
      `UPDATE users
       SET violation_count = $1,
           suspended_until = NOW() + INTERVAL '24 hours'
       WHERE id = $2`,
      [newViolationCount, userId]
    );
    action = 'suspend';
  } else {
    // Strike 5+: Permanent Account & OAuth Ban!
    await query(
      `UPDATE users
       SET violation_count = $1,
           is_banned = true
       WHERE id = $2`,
      [newViolationCount, userId]
    );
    action = 'ban';

    // Blacklist all associated identifiers in banned_identifiers table
    const identifiersToBan = [];
    if (user.email) identifiersToBan.push({ type: 'email', val: user.email.toLowerCase() });
    if (user.github_id) identifiersToBan.push({ type: 'github', val: String(user.github_id) });
    if (user.google_id) identifiersToBan.push({ type: 'google', val: String(user.google_id) });

    for (const item of identifiersToBan) {
      await query(
        `INSERT INTO banned_identifiers (identifier_type, identifier_value, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT (identifier_value) DO NOTHING`,
        [item.type, item.val, `Permanent ban after ${newViolationCount} content violations`]
      );
    }
  }

  return {
    safe: false,
    reason: check.reason,
    violationCount: newViolationCount,
    action,
  };
}

module.exports = {
  checkContentWithAI,
  moderateText,
};
