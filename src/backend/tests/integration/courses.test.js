/*
 * These checks send real HTTP requests to PEERS and independently read MongoDB
 * to verify course creation, retrieval, updates, deactivation, and reactivation.
 * Rejected requests must leave the stored courses unchanged.
 *
 * Each case uses #32's guarded synthetic fixtures and real login. The root
 * integration command owns service startup and disposal; this file resets its
 * records and closes its own database connection. Browser behavior, permission
 * restrictions, and other application resources need separate coverage.
 *
 * TLDR: Vitest course API/database tests using fetch and an independent Mongoose
 * connection, with sequential fixture reset and no mocked persistence boundary.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  fixtureAccount,
  openTestDatabase,
  resetTestData,
  seedTestData,
} from './fixtures.js';

let context;
let fixture;
let token;

async function apiRequest(method, path, body) {
  const response = await fetch(`${process.env.API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, body: await response.json() };
}

beforeAll(async () => {
  // Validate the run's destinations before opening a connection or making requests.
  context = await openTestDatabase(process.env);
});

beforeEach(async () => {
  fixture = await seedTestData(context);
  token = undefined;
  const login = await apiRequest('POST', '/api/auth/login', fixtureAccount);
  token = login.body.access_token;
  if (login.status !== 200 || typeof token !== 'string' || !token) {
    throw new Error('Fixture login requires HTTP 200 and an access token');
  }
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

describe('course API and database interactions', () => {
  it('OP-33-03 OP-33-04 creates a course for the logged-in professor and retrieves it', async () => {
    const input = {
      course_name: 'Persistence Check',
      course_number: 'TEST 3300',
      course_section: '03',
      semester: 'Synthetic Semester',
    };
    const created = await apiRequest('POST', '/api/courses', input);
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      message: 'Course created.',
    });

    // A successful response alone cannot establish that the backend saved a record.
    const stored = await context.models.Course.findById(created.body.id).lean();
    expect(stored).toMatchObject({
      ...input,
      course_status: 'Active',
      student_count: 0,
      team_count: 0,
    });
    expect(stored.professor_id.toString()).toBe(fixture.professor.id);
    expect(await context.models.Course.countDocuments()).toBe(2);

    const retrieved = await apiRequest(
      'GET',
      `/api/courses/${created.body.id}`,
    );
    expect(retrieved.status).toBe(200);
    expect(retrieved.body).toMatchObject({
      _id: created.body.id,
      ...input,
      professor_id: fixture.professor.id,
      course_status: 'Active',
    });
  });

  it('OP-33-02 OP-33-04 lists and retrieves stored course details with student and team counts', async () => {
    // Related collections supply these response counts even when cached fields are stale.
    await context.models.Course.findByIdAndUpdate(fixture.course._id, {
      student_count: 99,
      team_count: 99,
    });
    const other = await context.models.Course.create({
      course_name: 'Other Synthetic Course',
      course_number: 'OTHER 2000',
      course_section: '02',
      semester: 'Test Semester',
      professor_id: fixture.professor._id,
    });
    const before = await context.models.Course.find().sort('_id').lean();
    const stored = await context.models.Course.findById(
      fixture.course._id,
    ).lean();
    const studentCount = await context.models.Student.countDocuments({
      course_id: fixture.course._id,
    });
    const teamCount = await context.models.Team.countDocuments({
      course_id: fixture.course._id,
    });
    const listed = await apiRequest('GET', '/api/courses');
    expect(listed.status).toBe(200);
    expect(listed.body.map((course) => course._id).sort()).toEqual(
      [fixture.course.id, other.id].sort(),
    );
    expect(
      listed.body.find((course) => course._id === fixture.course.id),
    ).toMatchObject({
      _id: stored._id.toString(),
      course_name: stored.course_name,
      course_number: stored.course_number,
      course_section: stored.course_section,
      semester: stored.semester,
      professor_id: fixture.professor.id,
      team_count: teamCount,
    });
    const filtered = await apiRequest('GET', '/api/courses?course_number=test');
    expect(filtered.status).toBe(200);
    expect(filtered.body.map((course) => course._id)).toEqual([
      fixture.course.id,
    ]);

    const retrieved = await apiRequest(
      'GET',
      `/api/courses/${fixture.course.id}`,
    );
    expect(retrieved.status).toBe(200);
    expect(retrieved.body).toMatchObject({
      _id: stored._id.toString(),
      course_name: stored.course_name,
      course_number: stored.course_number,
      course_section: stored.course_section,
      semester: stored.semester,
      student_count: studentCount,
    });
    expect(await context.models.Course.find().sort('_id').lean()).toEqual(
      before,
    );
  });

  it('OP-33-05 persists edited course fields and returns them on a later request', async () => {
    const updates = {
      course_name: 'Updated Persistence Check',
      semester: 'Updated Synthetic Semester',
    };
    const updated = await apiRequest(
      'PUT',
      `/api/courses/${fixture.course.id}`,
      updates,
    );
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ message: 'Course updated.' });

    const stored = await context.models.Course.findById(
      fixture.course._id,
    ).lean();
    expect(stored).toMatchObject({
      ...updates,
      course_number: fixture.course.course_number,
      course_section: fixture.course.course_section,
      course_status: 'Active',
    });
    expect(stored.professor_id.toString()).toBe(fixture.professor.id);
    const retrieved = await apiRequest(
      'GET',
      `/api/courses/${fixture.course.id}`,
    );
    expect(retrieved.status).toBe(200);
    expect(retrieved.body).toMatchObject(updates);
  });

  it('OP-33-06 deactivates a course without removing it or its roster and team', async () => {
    const deleted = await apiRequest(
      'DELETE',
      `/api/courses/${fixture.course.id}`,
    );
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ message: 'Course deleted successfully.' });

    // PEERS deletion is a soft delete: the course remains available as Inactive.
    const stored = await context.models.Course.findById(
      fixture.course._id,
    ).lean();
    expect(stored).toMatchObject({
      course_name: fixture.course.course_name,
      course_status: 'Inactive',
    });
    expect(await context.models.Course.countDocuments()).toBe(1);
    expect(
      await context.models.Student.countDocuments({
        course_id: fixture.course._id,
      }),
    ).toBe(2);
    expect(
      await context.models.Team.countDocuments({
        course_id: fixture.course._id,
      }),
    ).toBe(1);

    const active = await apiRequest('GET', '/api/courses');
    expect(active.status).toBe(200);
    expect(active.body).toEqual([]);
    const inactive = await apiRequest(
      'GET',
      '/api/courses?course_status=Inactive',
    );
    expect(inactive.status).toBe(200);
    expect(inactive.body).toHaveLength(1);
    expect(inactive.body[0]).toMatchObject({
      _id: fixture.course.id,
      course_status: 'Inactive',
    });
  });

  it('OP-33-03 reactivates the matching inactive course without creating a duplicate', async () => {
    await context.models.Course.findByIdAndUpdate(fixture.course._id, {
      course_status: 'Inactive',
    });
    const input = {
      course_name: fixture.course.course_name,
      course_number: fixture.course.course_number,
      course_section: fixture.course.course_section,
      semester: fixture.course.semester,
    };
    const reactivated = await apiRequest('POST', '/api/courses', input);
    expect(reactivated.status).toBe(200);
    expect(reactivated.body).toEqual({
      id: fixture.course.id,
      message: 'Course reactivated.',
    });
    const stored = await context.models.Course.findById(
      fixture.course._id,
    ).lean();
    expect(stored).toMatchObject({ ...input, course_status: 'Active' });
    expect(stored.professor_id.toString()).toBe(fixture.professor.id);
    expect(await context.models.Course.countDocuments()).toBe(1);
  });

  it('OP-33-03 rejects an incomplete course without changing stored courses', async () => {
    const before = await context.models.Course.find().lean();
    const rejected = await apiRequest('POST', '/api/courses', {
      course_name: 'Missing Semester',
      course_number: 'TEST 3301',
      course_section: '01',
    });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await context.models.Course.find().lean()).toEqual(before);
  });

  it('OP-33-05 rejects an update to a missing course without inserting or changing records', async () => {
    const before = await context.models.Course.find().lean();
    const rejected = await apiRequest(
      'PUT',
      '/api/courses/000000000000000000000000',
      {
        course_name: 'Missing Course',
      },
    );
    expect(rejected.status).toBe(404);
    expect(rejected.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(await context.models.Course.find().lean()).toEqual(before);
  });
});
