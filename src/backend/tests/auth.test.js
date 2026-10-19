import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';

describe('authenticateToken', () => {
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

  it('accepts a valid bearer token and attaches its user payload', () => {
    const user = { id: 'professor-1', email: 'professor@example.com' };
    const req = {
      headers: {
        authorization: `Bearer ${jwt.sign(user, 'dev_secret_key')}`
      }
    };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(req.user).toEqual(expect.objectContaining(user));
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects an invalid token without exposing JWT details', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Invalid or expired token.',
      code: 'UNAUTHORIZED',
      status: 401
    }));
  });

  it('rejects an empty bearer token', () => {
    const req = { headers: { authorization: 'Bearer ' } };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      code: 'UNAUTHORIZED',
      status: 401
    }));
  });
});
