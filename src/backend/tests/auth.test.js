/*
 * This suite checks missing, expired, and malformed sign-in credentials, and
 * whether an accepted credential identifies the expected user. It runs without
 * starting the website.
 *
 * TLDR: exercises the JWT authentication middleware and its sanitized 401 errors.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';

const testJwtSecret = vi.hoisted(() => {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'unit-test-jwt-secret';
  return { original, value: process.env.JWT_SECRET };
});

beforeEach(() => {
  process.env.JWT_SECRET = testJwtSecret.value;
});

afterEach(() => {
  if (testJwtSecret.original === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = testJwtSecret.original;
  }
});

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
        authorization: `Bearer ${jwt.sign(user, testJwtSecret.value)}`,
      },
    };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(req.user).toEqual(expect.objectContaining(user));
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects an invalid token without exposing JWT details', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid or expired token.',
        code: 'UNAUTHORIZED',
        status: 401,
      }),
    );
    expect(req.user).toBeUndefined();
  });

  it('rejects an expired token without exposing token details', () => {
    const token = jwt.sign({ id: 'expired-professor' }, testJwtSecret.value, {
      expiresIn: -1,
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid or expired token.',
        code: 'UNAUTHORIZED',
        status: 401,
      }),
    );
    expect(req.user).toBeUndefined();
  });

  it('rejects an empty bearer token', () => {
    const req = { headers: { authorization: 'Bearer ' } };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        status: 401,
      }),
    );
  });

  it.each([
    ['a non-Bearer authorization scheme', 'Basic credentials'],
    ['a whitespace-only authorization header', '   '],
  ])('rejects %s as unauthorized', (_description, authorization) => {
    const req = { headers: { authorization } };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        status: 401,
      }),
    );
  });

  it('rejects a valid JWT sent with a non-Bearer scheme', () => {
    const token = jwt.sign({ id: 'professor-1' }, testJwtSecret.value, {
      expiresIn: '1h',
    });
    const req = { headers: { authorization: `Basic ${token}` } };
    const next = vi.fn();

    authenticateToken(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        status: 401,
      }),
    );
    expect(req.user).toBeUndefined();
  });
});
