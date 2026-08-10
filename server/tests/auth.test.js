/**
 * server/tests/auth.test.js
 * 
 * Automated Test Suite for CodeNest Authentication & Dual-Token Security.
 */

const { generateAccessToken, generateRefreshToken, hashToken, verifyAccessToken } = require('../src/utils/tokens');

describe('CodeNest Auth & Security Test Suite', () => {
  const mockUserId = 42;

  test('Should generate and verify valid JWT access tokens', () => {
    const token = generateAccessToken(mockUserId);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded.sub).toBe(mockUserId);
  });

  test('Should generate 64-character SHA-256 token hashes', () => {
    const rawToken = generateRefreshToken(mockUserId);
    const hashed = hashToken(rawToken);

    expect(typeof hashed).toBe('string');
    expect(hashed).toHaveLength(64); // SHA-256 hex string length
  });

  test('Should reject invalid or tampered JWT access tokens', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.tampered';
    const decoded = verifyAccessToken(invalidToken);
    expect(decoded).toBeNull();
  });
});
