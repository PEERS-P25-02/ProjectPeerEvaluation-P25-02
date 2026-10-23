/*
 * This file checks that the temporary PEERS test environment works as a whole.
 * Its four checks cover readiness, saving a record through the application,
 * capturing an email, and repeatedly restoring the same starting data.
 *
 * The environment must already be running. These checks use invented accounts
 * and real connections between the parts, but do not open the website or verify
 * every feature. Capturing a password-reset email does not prove that a person
 * can finish resetting a password through the website.
 *
 * Cleanup here clears test records and email and closes the database connection.
 * Removing the temporary environment itself is the run command's responsibility.
 *
 * TLDR: four Vitest integration checks exercise Express HTTP endpoints, MongoDB
 * persistence, Mailpit SMTP capture, and fixture/index preservation, with guarded
 * setup and teardown around the test cases.
 */
import { setTimeout } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  fixtureAccount,
  mailpitRequest,
  openTestDatabase,
  resetTestData,
  seedTestData,
} from './fixtures.js';

const environment = process.env;
let context;
let fixture;

async function apiRequest(path, body, token) {
  return fetch(`${environment.API_BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
}

beforeAll(async () => {
  context = await openTestDatabase(environment);
});

beforeEach(async () => {
  fixture = await seedTestData(context);
});

afterAll(async () => {
  if (context) {
    try {
      await resetTestData(context);
    } finally {
      await context.connection.close();
    }
  }
});

describe('isolated integration environment', () => {
  it('has a ready API connected to this run database', async () => {
    const response = await apiRequest('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'OK' });
    expect(context.connection.name).toBe(
      `peers_test_${environment.TEST_RUN_ID}`,
    );
    expect(await context.connection.db.command({ ping: 1 })).toMatchObject({
      ok: 1,
    });
  });

  it('persists an API-created record in this run database', async () => {
    const login = await apiRequest('/api/auth/login', fixtureAccount);
    expect(login.status).toBe(200);
    const { access_token: token } = await login.json();
    const course = {
      course_name: 'API Environment Check',
      course_number: 'TEST 2000',
      course_section: '02',
      semester: 'Test Semester',
    };
    const response = await apiRequest('/api/courses', course, token);
    expect(response.status).toBe(201);
    const { id } = await response.json();
    const stored = await context.models.Course.findById(id).lean();
    expect(stored).toMatchObject(course);
    expect(stored.professor_id.toString()).toBe(fixture.professor.id);
  });

  it('captures backend SMTP and clears only the isolated inbox', async () => {
    const response = await apiRequest('/api/auth/reset-password', {
      email: fixtureAccount.email,
    });
    expect(response.status).toBe(200);
    let messages = [];
    // SMTP acceptance and inbox visibility may complete at different times.
    for (let attempt = 0; attempt < 30; attempt++) {
      const inbox = await mailpitRequest(environment, '/api/v1/messages');
      messages = (await inbox.json()).messages;
      if (messages.length) break;
      await setTimeout(100);
    }
    expect(messages).toHaveLength(1);
    expect(messages[0].To.map((recipient) => recipient.Address)).toEqual([
      fixtureAccount.email,
    ]);

    // This proves transport and cleanup, not the browser password-reset journey.
    await resetTestData(context);
    const emptyInbox = await mailpitRequest(environment, '/api/v1/messages');
    expect((await emptyInbox.json()).messages).toEqual([]);
    expect(await context.models.Professor.countDocuments()).toBe(0);
  });

  it('repeats fixture reset without duplicates or lost indexes', async () => {
    await seedTestData(context);
    const repeated = await seedTestData(context);
    const counts = await Promise.all(
      Object.values(context.models).map((model) => model.countDocuments()),
    );
    expect(counts).toEqual([1, 1, 2, 1, 0]);
    const team = await context.models.Team.findById(repeated.team._id).lean();
    expect(team.students.map(String)).toEqual(
      repeated.students.map((student) => student.id),
    );
    const indexes = await context.models.Student.collection.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { student_id: 1, course_id: 1 },
          unique: true,
        }),
      ]),
    );
  });
});
