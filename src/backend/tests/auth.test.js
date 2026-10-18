import { describe, expect, it, vi } from 'vitest';
import { authenticateToken } from '../middleware/auth.js';

describe('authenticateToken', () => {
  // Initial test for issue #28
  it('rejects requests without an authorization token', () => {
    const req = { headers: {} };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('No token provided.');
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });
});
