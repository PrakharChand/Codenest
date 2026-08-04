/**
 * client/src/utils/markdown.js
 *
 * Safely strips markdown formatting syntax from a string to generate clean,
 * plain-text previews without XSS risks or leftover markdown syntax symbols.
 */

export function stripMarkdown(markdownText, maxLen = 300) {
  if (!markdownText || typeof markdownText !== 'string') return '';

  let text = markdownText;

  // 1. Remove Fenced Code Blocks (```lang ... ```)
  text = text.replace(/```[\s\S]*?```/g, '');

  // 2. Remove Inline Code (`code`)
  text = text.replace(/`([^`]+)`/g, '$1');

  // 3. Remove Images (![alt](url))
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // 4. Remove Links ([text](url)) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Remove Headings (# Heading)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 6. Remove Blockquotes (> quote)
  text = text.replace(/^\s*>\s+/gm, '');

  // 7. Remove Bold & Italic (*text*, **text**, _text_, __text__)
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');

  // 8. Remove Strikethrough (~~text~~)
  text = text.replace(/~~(.*?)~~/g, '$1');

  // 9. Remove Horizontal Rules (---, ***, ___)
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');

  // 10. Remove List Bullet / Number Prefixes (*, -, +, 1.)
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // 11. Normalize Whitespace (replace multiple spaces/newlines with a single space)
  text = text.replace(/\s+/g, ' ').trim();

  // 12. Safe Truncation
  if (maxLen && text.length > maxLen) {
    return text.slice(0, maxLen).trim() + '...';
  }

  return text;
}
