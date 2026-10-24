import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture } from './api.js';
import { fixtureAccount } from './fixtures.js';

const state = useIntegrationFixture({ login: false });

describe('professor login API and database interactions', () => {
  it('OP-33-01 persists last_login and returns a usable token for the stored identity', async () => {
    const { Professor } = state.context.models;
    const before = await Professor.findById(state.fixture.professor._id).lean();
    const started = Date.now();
    const response = await jsonRequest(
      'POST',
      '/api/auth/login',
      fixtureAccount,
    );
    const finished = Date.now();
    expect(response.status).toBe(200);
    expect(response.body.professor).toMatchObject({
      id: before._id.toString(),
      email: before.email,
      name: before.name,
      department: before.department,
    });
    expect(response.body.access_token).toEqual(expect.any(String));
    const stored = await Professor.findById(before._id).lean();
    expect(stored.last_login.getTime()).toBeGreaterThanOrEqual(started);
    expect(stored.last_login.getTime()).toBeLessThanOrEqual(finished);
    expect(stored.last_login.toISOString()).toBe(
      response.body.professor.last_login,
    );
    expect(stored.password).toBe(before.password);
    const courses = await jsonRequest(
      'GET',
      '/api/courses',
      undefined,
      response.body.access_token,
    );
    expect(courses.status).toBe(200);
    expect(courses.body.map((course) => course._id)).toEqual([
      state.fixture.course.id,
    ]);
  });

  it.each([
    [
      'wrong password',
      { ...fixtureAccount, password: 'WrongPassword123!' },
      401,
      'AUTH_ERROR',
    ],
    [
      'unknown email',
      { ...fixtureAccount, email: 'unknown@example.com' },
      401,
      'AUTH_ERROR',
    ],
    ['missing credentials', {}, 400, 'VALIDATION_ERROR'],
  ])(
    'OP-33-01 rejects %s without stored mutations or a token',
    async (_label, input, status, code) => {
      const { Professor } = state.context.models;
      const before = await Professor.find().sort('_id').lean();
      const response = await jsonRequest('POST', '/api/auth/login', input);
      expect(response.status).toBe(status);
      expect(response.body.error).toMatchObject({ code });
      expect(response.body.access_token).toBeUndefined();
      expect(response.body.professor).toBeUndefined();
      expect(await Professor.find().sort('_id').lean()).toEqual(before);
    },
  );
});
