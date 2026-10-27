/*
 * These checks exercise the authentication boundary on the live API. They use
 * only synthetic fixture records and compare persisted state around rejected
 * requests so an HTTP error cannot hide an accidental mutation.
 *
 * TLDR: representative malformed credentials and every mounted course,
 * roster, team, evaluation-management, and report route reject unauthenticated
 * requests before returning data or changing records.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { jsonRequest, loginFixture, useIntegrationFixture } from './api.js';
import { mailpitRequest } from './fixtures.js';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const state = useIntegrationFixture({ login: false });

async function rawRequest(method, path, authorization, body) {
  return fetch(`${process.env.API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(authorization === undefined ? {} : { Authorization: authorization }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  });
}

async function responseDetails(response) {
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  return { status: response.status, body };
}

async function databaseSnapshot() {
  const models = state.context.models;
  const modelsSnapshot = Object.fromEntries(
    await Promise.all(
      Object.entries(models).map(async ([name, model]) => [
        name,
        await model.find().sort('_id').lean(),
      ]),
    ),
  );
  // Reports are not currently registered as a Mongoose fixture model.
  modelsSnapshot.reports = await state.context.connection.db
    .collection('reports')
    .find()
    .sort({ _id: 1 })
    .toArray();
  return modelsSnapshot;
}

async function inboxSnapshot() {
  const response = await mailpitRequest(process.env, '/api/v1/messages');
  return (await response.json()).messages;
}

function expectUnauthorized(result) {
  expect(result.status).toBe(401);
  expect(result.body).toMatchObject({
    error: { code: 'UNAUTHORIZED' },
  });
}

const courseId = () => state.fixture.course.id;
const teamId = () => state.fixture.team.id;
const studentId = () => state.fixture.students[0].id;

// Exercise every mounted route in the core protected course subresources.
const protectedRequests = [
  ['GET', () => '/api/courses'],
  ['POST', () => '/api/courses'],
  ['POST', () => '/api/courses/migrate'],
  ['GET', () => `/api/courses/${courseId()}`],
  ['PUT', () => `/api/courses/${courseId()}`],
  ['DELETE', () => `/api/courses/${courseId()}`],
  ['POST', () => `/api/courses/${courseId()}/roster`],
  ['GET', () => `/api/courses/${courseId()}/students`],
  ['POST', () => `/api/courses/${courseId()}/students`],
  ['PUT', () => `/api/courses/${courseId()}/students/${studentId()}`],
  ['DELETE', () => `/api/courses/${courseId()}/students/${studentId()}`],
  ['POST', () => `/api/courses/${courseId()}/students/bulk-delete`],
  ['DELETE', () => `/api/courses/${courseId()}/students`],
  ['GET', () => `/api/courses/${courseId()}/reports`],
  ['GET', () => `/api/courses/${courseId()}/reports/download`],
  ['GET', () => `/api/courses/${courseId()}/reports/student/${studentId()}`],
  ['GET', () => `/api/courses/${courseId()}/reports/team/${teamId()}`],
  ['POST', () => `/api/courses/${courseId()}/reports/generate`],
  ['POST', () => `/api/courses/${courseId()}/evaluations/send`],
  [
    'POST',
    () => `/api/courses/${courseId()}/teams/${teamId()}/evaluations/send`,
  ],
  ['GET', () => `/api/courses/${courseId()}/evaluations/status`],
  ['POST', () => `/api/courses/${courseId()}/evaluations/remind`],
  ['DELETE', () => `/api/courses/${courseId()}/evaluations/reset`],
  ['GET', () => `/api/courses/${courseId()}/teams`],
  ['POST', () => `/api/courses/${courseId()}/teams`],
  ['PUT', () => `/api/courses/${courseId()}/teams/${teamId()}`],
  ['DELETE', () => `/api/courses/${courseId()}/teams/${teamId()}`],
  ['DELETE', () => `/api/courses/${courseId()}/teams`],
  ['POST', () => `/api/courses/${courseId()}/teams/auto-assign`],
  [
    'POST',
    () =>
      `/api/courses/${courseId()}/teams/${teamId()}/students/${studentId()}`,
  ],
  [
    'DELETE',
    () =>
      `/api/courses/${courseId()}/teams/${teamId()}/students/${studentId()}`,
  ],
  ['POST', () => '/api/auth/logout'],
  ['GET', () => '/api/professor/ai-words'],
  ['POST', () => '/api/professor/ai-words'],
  ['POST', () => '/api/ai/summarize'],
  ['POST', () => '/api/ai/red-flags'],
  ['POST', () => '/api/ai/sentiment'],
];

describe('authentication access control over the live API', () => {
  it.each([
    'missing header',
    'empty bearer credential',
    'malformed bearer credential',
    'wrong authorization scheme',
    'tampered JWT',
    'expired JWT',
    'wrong-signature JWT',
  ])(
    'rejects %s on protected reads and writes without side effects',
    async (label) => {
      const secret = process.env.TEST_JWT_SECRET;
      if (!secret)
        throw new Error(
          'TEST_JWT_SECRET must be configured for integration tests',
        );
      const claims = {
        id: state.fixture.professor.id,
        email: state.fixture.professor.email,
      };
      const signed = jwt.sign(claims, secret, { expiresIn: '1h' });
      const expired = jwt.sign(claims, secret, { expiresIn: -1 });
      const wrongSignature = jwt.sign(claims, 'synthetic-unrelated-secret');
      const signature = signed.split('.');
      const firstSignatureCharacter = signature[2][0];
      signature[2] = `${firstSignatureCharacter === 'a' ? 'b' : 'a'}${signature[2].slice(1)}`;
      const tampered = signature.join('.');
      const authorizationByCase = {
        'missing header': undefined,
        'empty bearer credential': 'Bearer ',
        'malformed bearer credential': 'Bearer not-a-jwt',
        'wrong authorization scheme': `Basic ${signed}`,
        'tampered JWT': `Bearer ${tampered}`,
        'expired JWT': `Bearer ${expired}`,
        'wrong-signature JWT': `Bearer ${wrongSignature}`,
      };
      const authorization = authorizationByCase[label];
      const before = await databaseSnapshot();
      const inboxBefore = await inboxSnapshot();
      const readResult = await responseDetails(
        await rawRequest('GET', `/api/courses/${courseId()}`, authorization),
      );
      expectUnauthorized(readResult);
      expect(JSON.stringify(readResult.body)).not.toContain(
        state.fixture.course.course_name,
      );
      const writeResult = await responseDetails(
        await rawRequest('PUT', `/api/courses/${courseId()}`, authorization, {
          course_name: 'Forbidden change',
        }),
      );
      expectUnauthorized(writeResult);
      expect(JSON.stringify(writeResult.body)).not.toContain(
        state.fixture.course.course_name,
      );
      expect(await databaseSnapshot()).toEqual(before);
      expect(await inboxSnapshot()).toEqual(inboxBefore);
    },
  );

  it('accepts a manually signed, unexpired JWT created with the configured test secret', async () => {
    const secret = process.env.TEST_JWT_SECRET;
    if (!secret)
      throw new Error(
        'TEST_JWT_SECRET must be configured for integration tests',
      );
    const token = jwt.sign(
      { id: state.fixture.professor.id, email: state.fixture.professor.email },
      secret,
      { expiresIn: '1h' },
    );
    const result = await responseDetails(
      await rawRequest('GET', `/api/courses/${courseId()}`, `Bearer ${token}`),
    );
    expect(result.status).toBe(200);
    expect(result.body._id).toBe(courseId());
  });

  it('does not treat a professor JWT as a public student evaluation link', async () => {
    const secret = process.env.TEST_JWT_SECRET;
    if (!secret)
      throw new Error(
        'TEST_JWT_SECRET must be configured for integration tests',
      );
    const professorToken = jwt.sign(
      { id: state.fixture.professor.id, email: state.fixture.professor.email },
      secret,
      { expiresIn: '1h' },
    );
    const before = await databaseSnapshot();
    const inboxBefore = await inboxSnapshot();
    const evaluationRequests = [
      ['GET', `/api/evaluate/${professorToken}`],
      ['GET', `/api/evaluate/${professorToken}/status`],
      ['POST', `/api/evaluate/${professorToken}`, { evaluations: [] }],
    ];
    for (const [method, path, body] of evaluationRequests) {
      const result = await responseDetails(
        await rawRequest(method, path, undefined, body),
      );
      expect(result.status).toBe(404);
    }
    expect(await databaseSnapshot()).toEqual(before);
    expect(await inboxSnapshot()).toEqual(inboxBefore);
  });

  it.each(protectedRequests)(
    'rejects missing credentials before handling %s %s',
    async (method, pathFactory) => {
      const before = await databaseSnapshot();
      const inboxBefore = await inboxSnapshot();
      const result = await responseDetails(
        await rawRequest(method, pathFactory()),
      );
      expectUnauthorized(result);
      expect(JSON.stringify(result.body)).not.toContain(
        state.fixture.course.course_name,
      );
      expect(await databaseSnapshot()).toEqual(before);
      expect(await inboxSnapshot()).toEqual(inboxBefore);
    },
  );

  it('accepts a login-issued JWT, and logout does not imply server-side token revocation', async () => {
    const token = await loginFixture();
    const before = await databaseSnapshot();
    const inboxBefore = await inboxSnapshot();
    const accepted = await jsonRequest(
      'GET',
      `/api/courses/${courseId()}`,
      undefined,
      token,
    );
    expect(accepted.status).toBe(200);
    expect(accepted.body._id).toBe(courseId());

    const logout = await jsonRequest(
      'POST',
      '/api/auth/logout',
      undefined,
      token,
    );
    expect(logout.status).toBe(200);
    const stillAccepted = await jsonRequest(
      'GET',
      `/api/courses/${courseId()}`,
      undefined,
      token,
    );
    expect(stillAccepted.status).toBe(200);
    expect(await databaseSnapshot()).toEqual(before);
    expect(await inboxSnapshot()).toEqual(inboxBefore);
  });

  it('does not treat a public student evaluation link as a professor JWT', async () => {
    const linkToken = 'synthetic-student-link-token';
    await state.context.models.Student.findByIdAndUpdate(studentId(), {
      evaluation_token: linkToken,
    });
    const before = await databaseSnapshot();
    const inboxBefore = await inboxSnapshot();
    const result = await responseDetails(
      await rawRequest(
        'GET',
        `/api/courses/${courseId()}`,
        `Bearer ${linkToken}`,
      ),
    );
    expectUnauthorized(result);
    expect(await databaseSnapshot()).toEqual(before);
    expect(await inboxSnapshot()).toEqual(inboxBefore);
  });
});
