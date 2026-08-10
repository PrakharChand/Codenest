/**
 * server/tests/shadow.test.js
 * 
 * Automated Test Suite for Nest Shadow Dual-Identity Isolation (Rule 2).
 * Verifies that zero public identity PII (name, email, avatar_url, bio) leaks into anonymous responses.
 */

const { serializeShadowIdentityResponse, serializeShadowUser } = require('../src/utils/shadowSerializer');

describe('Nest Shadow Dual-Identity Security Test Suite', () => {
  const mockUserRowWithPublicPII = {
    id: 101,
    name: 'Alex Mercer',
    email: 'alex.mercer@gmail.com',
    avatar_url: 'https://cloudinary.com/avatars/alex.jpg',
    bio: 'Senior Staff Software Engineer at TechCorp',
    github_id: 'github_alex_123',
    anonymous_username: 'silent_fox42',
    anonymous_avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=silent_fox42',
    anonymous_reputation_score: 85,
    title: 'How to optimize PostgreSQL indexes for high concurrency?',
    content: 'Here is my SQL query for review...',
    created_at: new Date().toISOString()
  };

  test('Should strictly strip all public identity fields (name, email, avatar_url, bio) from Shadow response', () => {
    const serialized = serializeShadowIdentityResponse(mockUserRowWithPublicPII);

    expect(serialized).not.toHaveProperty('name');
    expect(serialized).not.toHaveProperty('email');
    expect(serialized).not.toHaveProperty('avatar_url');
    expect(serialized).not.toHaveProperty('bio');
    expect(serialized).not.toHaveProperty('github_id');

    expect(serialized.anonymous_username).toBe('silent_fox42');
    expect(serialized.anonymous_avatar_url).toBe('https://api.dicebear.com/7.x/bottts/svg?seed=silent_fox42');
    expect(serialized.anonymous_reputation_score).toBe(85);
  });

  test('Should handle array of shadow submission items and sanitize every item', () => {
    const items = [mockUserRowWithPublicPII, { ...mockUserRowWithPublicPII, id: 102, anonymous_username: 'brave_tiger99' }];
    const serializedList = items.map(serializeShadowIdentityResponse);

    serializedList.forEach(item => {
      expect(item.name).toBeUndefined();
      expect(item.email).toBeUndefined();
      expect(item.avatar_url).toBeUndefined();
    });
  });
});
