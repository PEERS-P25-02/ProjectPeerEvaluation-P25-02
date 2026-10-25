/*
 * These helpers connect environment checks to the running API and captured
 * email inbox using the temporary test data.
 *
 * They manage request and fixture lifecycles; the individual test files decide
 * which application behavior is checked.
 *
 * TLDR: provides JSON/multipart requests, fixture login, per-test database
 * reset and seeding, cleanup hooks, and bounded Mailpit inbox polling.
 */
import { setTimeout } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import {
  fixtureAccount,
  mailpitRequest,
  openTestDatabase,
  resetTestData,
  seedTestData,
} from './fixtures.js';

// Send JSON or multipart requests to the configured API, with authentication when supplied.
export async function apiRequest(method, path, body, token) {
  const multipart = body instanceof FormData;
  return fetch(`${process.env.API_BASE_URL}${path}`, {
    method,
    headers: {
      // Fetch supplies the multipart boundary; overriding it breaks real uploads.
      ...(body !== undefined && !multipart
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined
      ? {}
      : { body: multipart ? body : JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  });
}

export async function jsonRequest(method, path, body, token) {
  const response = await apiRequest(method, path, body, token);
  return { status: response.status, body: await response.json() };
}

// Sign in with the seeded account and fail early if the API does not return a token.
export async function loginFixture() {
  const response = await jsonRequest('POST', '/api/auth/login', fixtureAccount);
  const token = response.body.access_token;
  if (response.status !== 200 || typeof token !== 'string' || !token) {
    throw new Error('Fixture login requires HTTP 200 and an access token');
  }
  return token;
}

// Set up the owned database once, then reseed and optionally authenticate each test.
export function useIntegrationFixture({ login = true } = {}) {
  const state = {};
  beforeAll(async () => {
    // Validate exact run ownership before issuing requests or clearing any data.
    state.context = await openTestDatabase(process.env);
  });
  beforeEach(async () => {
    state.fixture = await seedTestData(state.context);
    state.token = login ? await loginFixture() : undefined;
  });
  afterAll(async () => {
    if (state.context) {
      try {
        await resetTestData(state.context);
      } finally {
        await state.context.connection.close();
      }
    }
  });
  return state;
}

export async function waitForMessages(expectedCount) {
  // SMTP acknowledgement can precede visibility in Mailpit's HTTP inbox.
  for (let attempt = 0; attempt < 40; attempt++) {
    const inbox = await mailpitRequest(process.env, '/api/v1/messages');
    const { messages } = await inbox.json();
    if (messages.length === expectedCount) return messages;
    await setTimeout(100);
  }
  throw new Error(`Expected ${expectedCount} captured messages`);
}
