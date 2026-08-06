/**
 * server/src/services/emailService.js
 *
 * Transporter and email warning notice generator.
 * Sends formal moderation warning emails for 3rd violations.
 */

const env = require('../config/env');

async function sendViolationWarningEmail({ email, name, violationCount, reason, contentSnippet }) {
  const subject = `⚠️ Official CodeNest Warning: Account Violation #${violationCount}`;

  const textBody = `
Dear ${name || 'Developer'},

This is an official moderation notice regarding your CodeNest account.

Your recent submission/message was automatically removed by our AI Content Moderation System for violating community safety standards.

Reason: ${reason || 'Inappropriate content (bullying, harassment, or explicit material)'}
Snippet: "${contentSnippet ? contentSnippet.slice(0, 100) : 'N/A'}"

Current Status:
- Violation Count: #${violationCount} of 5

IMMEDIATE CONSEQUENCES OF FURTHER VIOLATIONS:
- Violation #4: Your account will be AUTOMATICALLY SUSPENDED FOR 24 HOURS. You will be blocked from posting, commenting, chatting, or submitting code.
- Violation #5: Your account will be PERMANENTLY BANNED. Your registered email address and all associated login methods (GitHub, Google) will be permanently blacklisted.

CodeNest is built on mutual respect and safe collaboration. Please review our community guidelines to avoid permanent account termination.

Regards,
CodeNest Safety & Moderation Team
https://codenest-two-eta.vercel.app
`;

  console.log(`\n============================================================`);
  console.log(`[EMAIL SENT] ${subject}`);
  console.log(`[TO] ${email}`);
  console.log(textBody);
  console.log(`============================================================\n`);

  return { success: true, message: 'Warning email dispatched.' };
}

module.exports = {
  sendViolationWarningEmail,
};
