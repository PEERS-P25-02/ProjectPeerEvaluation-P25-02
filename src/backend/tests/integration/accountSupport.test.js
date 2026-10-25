// These tests cover account creation and password recovery.
// TLDR: use the shared isolated fixture to check password hashing, reset-token
//       lifecycle, and generic responses for unknown accounts.

import { createRequire } from 'node:module';
import { setTimeout } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture, waitForMessages } from './api.js';
import { fixtureAccount, mailpitRequest } from './fixtures.js';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const state = useIntegrationFixture({ login: false });
const genericResetMessage = {
  message: 'If the email is registered, a reset link will be sent.',
};

async function professors() {
  return state.context.models.Professor.find().sort('_id').lean();
}

describe('account support API and database interactions', () => {
  it('OP-33-34 registers a hashed account whose credentials work through login', async () => {
    const { Professor } = state.context.models;
    const original = await Professor.findById(
      state.fixture.professor._id,
    ).lean();
    const input = {
      email: 'new-professor@example.com',
      password: 'NewProfessor123!',
      name: 'New Synthetic Professor',
      department: 'Synthetic Department',
    };
    const response = await jsonRequest('POST', '/api/auth/register', input);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: 'Registration successful.',
      professor_id: expect.any(String),
    });
    const stored = await Professor.findById(response.body.professor_id).lean();
    expect(stored).toMatchObject({
      email: input.email,
      name: input.name,
      department: input.department,
      mfa_enabled: false,
    });
    expect(stored.password).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, stored.password)).toBe(true);
    expect(await Professor.countDocuments()).toBe(2);
    expect(await Professor.findById(original._id).lean()).toEqual(original);

    const login = await jsonRequest('POST', '/api/auth/login', {
      email: input.email,
      password: input.password,
    });
    expect(login.status).toBe(200);
    expect(login.body.access_token).toEqual(expect.any(String));
    expect(login.body.professor.id).toBe(response.body.professor_id);
  });

  it('OP-33-34 rejects duplicate registration without changing professors', async () => {
    const before = await professors();
    const response = await jsonRequest('POST', '/api/auth/register', {
      ...fixtureAccount,
      name: 'Replacement Identity',
      department: 'Replacement Department',
    });
    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: 'DUPLICATE' });
    expect(await professors()).toEqual(before);
  });

  it('OP-33-34 rejects incomplete registration without inserting an account', async () => {
    const before = await professors();
    const response = await jsonRequest('POST', '/api/auth/register', {
      email: 'incomplete-professor@example.com',
      password: 'Incomplete123!',
      name: 'Incomplete Professor',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await professors()).toEqual(before);
  });

  it('OP-33-35 stores reset credentials only for the requested professor and emails that token', async () => {
    const { Professor } = state.context.models;
    const original = await Professor.findById(
      state.fixture.professor._id,
    ).lean();
    const sentinel = await Professor.create({
      name: 'Other Synthetic Professor',
      email: 'other-professor@example.com',
      department: 'Other Department',
      password: original.password,
      securityToken: 'unrelated-reset-token',
      securityTokenExpires: new Date(Date.now() + 120000),
    });
    const sentinelBefore = await Professor.findById(sentinel._id).lean();
    const started = Date.now();
    const response = await jsonRequest('POST', '/api/auth/reset-password', {
      email: fixtureAccount.email,
    });
    const finished = Date.now();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(genericResetMessage);
    const stored = await Professor.findById(original._id).lean();
    expect(stored.securityToken).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.securityTokenExpires.getTime()).toBeGreaterThanOrEqual(
      started + 3600000,
    );
    expect(stored.securityTokenExpires.getTime()).toBeLessThanOrEqual(
      finished + 3600000,
    );
    expect(stored.password).toBe(original.password);
    expect(await Professor.findById(sentinel._id).lean()).toEqual(
      sentinelBefore,
    );

    // Captured SMTP proves association with the persisted token, not browser navigation.
    const messages = await waitForMessages(1);
    expect(messages).toHaveLength(1);
    expect(messages[0].To.map((recipient) => recipient.Address)).toEqual([
      fixtureAccount.email,
    ]);
    expect(messages[0].Subject).toBe('Password Reset Request');
    const captured = await mailpitRequest(
      process.env,
      `/api/v1/message/${messages[0].ID}`,
    );
    const content = await captured.json();
    expect(content.HTML).toContain(`/reset-password/${stored.securityToken}`);
    expect(content.HTML).not.toContain(sentinelBefore.securityToken);
  });

  it('OP-33-35 responds generically for an unknown email without writes or captured mail', async () => {
    const before = await professors();
    const response = await jsonRequest('POST', '/api/auth/reset-password', {
      email: 'unknown-professor@example.com',
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(genericResetMessage);
    expect(await professors()).toEqual(before);
    // Inspect several settled inbox reads; absence is bounded to this request/window.
    for (let attempt = 0; attempt < 3; attempt++) {
      await setTimeout(100);
      const inbox = await mailpitRequest(process.env, '/api/v1/messages');
      expect((await inbox.json()).messages).toEqual([]);
    }
  });

  it('OP-33-36 replaces the password hash, consumes reset credentials and changes usable login', async () => {
    const { Professor } = state.context.models;
    const original = await Professor.findById(
      state.fixture.professor._id,
    ).lean();
    const reset = await jsonRequest('POST', '/api/auth/reset-password', {
      email: fixtureAccount.email,
    });
    expect(reset.status).toBe(200);
    const resetProfessor = await Professor.findById(original._id).lean();
    expect(resetProfessor.securityToken).toMatch(/^[a-f0-9]{64}$/);
    const password = 'ChangedPassword123!';
    const update = await jsonRequest('POST', '/api/auth/update-password', {
      token: resetProfessor.securityToken,
      password,
    });
    expect(update.status).toBe(200);
    expect(update.body).toEqual({ message: 'Password updated successfully.' });
    const stored = await Professor.findById(original._id).lean();
    expect(stored.password).not.toBe(original.password);
    expect(stored.password).not.toBe(password);
    expect(await bcrypt.compare(password, stored.password)).toBe(true);
    expect(stored.securityToken).toBeUndefined();
    expect(stored.securityTokenExpires).toBeUndefined();
    expect(stored.email).toBe(original.email);

    const oldLogin = await jsonRequest(
      'POST',
      '/api/auth/login',
      fixtureAccount,
    );
    expect(oldLogin.status).toBe(401);
    const newLogin = await jsonRequest('POST', '/api/auth/login', {
      email: fixtureAccount.email,
      password,
    });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.access_token).toEqual(expect.any(String));
    const beforeReuse = await professors();
    const reuse = await jsonRequest('POST', '/api/auth/update-password', {
      token: resetProfessor.securityToken,
      password: 'AnotherPassword123!',
    });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error).toMatchObject({ code: 'TOKEN_ERROR' });
    expect(await professors()).toEqual(beforeReuse);
  });

  it.each(['invalid', 'expired'])(
    'OP-33-36 rejects an %s token without changing password or reset credentials',
    async (kind) => {
      const { Professor } = state.context.models;
      const token = 'synthetic-stored-reset-token';
      await Professor.findByIdAndUpdate(state.fixture.professor._id, {
        securityToken: token,
        securityTokenExpires: new Date(
          Date.now() + (kind === 'expired' ? -60000 : 60000),
        ),
      });
      const before = await professors();
      const response = await jsonRequest('POST', '/api/auth/update-password', {
        token: kind === 'invalid' ? 'unassigned-reset-token' : token,
        password: 'RejectedPassword123!',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({ code: 'TOKEN_ERROR' });
      expect(await professors()).toEqual(before);
    },
  );
});
