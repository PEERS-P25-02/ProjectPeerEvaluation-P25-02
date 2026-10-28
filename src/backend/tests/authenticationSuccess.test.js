// CW-01: successful authentication must issue a signed expiring token without leaking hashes.
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const originalEnvironment = vi.hoisted(() => {
  const original = Object.fromEntries(
    ['JWT_SECRET', 'SMTP_AUTH_REQUIRED', 'SMTP_USER', 'SMTP_PASS'].map(
      (key) => [key, process.env[key]],
    ),
  );
  process.env.JWT_SECRET = 'synthetic-unit-test-signing-secret';
  process.env.SMTP_AUTH_REQUIRED = 'false';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  return original;
});
const require = createRequire(import.meta.url);
const Professor = require('../models/Professor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../controllers/authController');
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
afterEach(() => vi.restoreAllMocks());
afterAll(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
describe('professor authentication success and persistence failures', () => {
  it('issues a one-hour token for the authenticated professor and persists last login', async () => {
    const professor = {
      _id: 'synthetic-professor',
      email: 'professor@example.invalid',
      name: 'Professor',
      department: 'Computing',
      password: 'synthetic-hash',
      mfa_enabled: false,
      save: vi.fn().mockResolvedValue(),
    };
    vi.spyOn(Professor, 'findOne').mockResolvedValue(professor);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = response();
    const next = vi.fn();
    await auth.login(
      { body: { email: professor.email, password: 'synthetic-password' } },
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalledExactlyOnceWith(
      'synthetic-password',
      professor.password,
    );
    expect(professor.save).toHaveBeenCalledOnce();
    expect(professor.last_login).toBeInstanceOf(Date);
    const result = res.json.mock.calls[0][0];
    const decoded = jwt.verify(result.access_token, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({
      id: professor._id,
      email: professor.email,
      name: professor.name,
    });
    expect(decoded.exp - decoded.iat).toBe(3600);
    expect(result.professor).not.toHaveProperty('password');
    expect(result.professor.last_login).toBe(professor.last_login);
  });
  it('does not return a usable token when saving the login state fails', async () => {
    const error = new Error('Synthetic save failure');
    vi.spyOn(Professor, 'findOne').mockResolvedValue({
      _id: 'synthetic-professor',
      password: 'synthetic-hash',
      save: vi.fn().mockRejectedValue(error),
    });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = response();
    const next = vi.fn();
    await auth.login(
      {
        body: {
          email: 'professor@example.invalid',
          password: 'synthetic-password',
        },
      },
      res,
      next,
    );
    expect(next).toHaveBeenCalledExactlyOnceWith(error);
    expect(error).toMatchObject({ status: 500, code: 'SERVER_ERROR' });
    expect(res.json).not.toHaveBeenCalled();
  });
  it('hashes registration passwords and saves only the derived hash', async () => {
    vi.spyOn(Professor, 'findOne').mockResolvedValue(null);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('synthetic-derived-hash');
    const save = vi.spyOn(Professor.prototype, 'save').mockResolvedValue();
    const res = response();
    const next = vi.fn();
    await auth.register(
      {
        body: {
          email: 'new@example.invalid',
          password: 'synthetic-password',
          name: 'New Professor',
          department: 'Computing',
        },
      },
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledExactlyOnceWith(
      'synthetic-password',
      10,
    );
    expect(save.mock.instances[0].password).toBe('synthetic-derived-hash');
    expect(save.mock.instances[0].email).toBe('new@example.invalid');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Registration successful.',
      professor_id: save.mock.instances[0]._id,
    });
  });
});
