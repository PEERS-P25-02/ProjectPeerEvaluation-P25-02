import { afterAll, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { createRequire } from 'node:module';

const smtpEnvironment = vi.hoisted(() => {
  const names = ['SMTP_AUTH_REQUIRED', 'SMTP_USER', 'SMTP_PASS'];
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  process.env.SMTP_AUTH_REQUIRED = 'false';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  return original;
});

// Use Node's native loader for these CommonJS modules; ESM transforms can
// mis-map their V8 function hits.
const require = createRequire(import.meta.url);
const { login, register } = require('../controllers/authController.js');
const {
  createCourse,
  getCourse,
} = require('../controllers/courseController.js');
const {
  addStudentToTeam,
  autoAssignTeams,
} = require('../controllers/teamController.js');
const {
  addStudent,
  listStudents,
  updateStudent,
  uploadRoster,
  deleteAllStudents,
  resetEvaluationState,
} = require('../controllers/studentController.js');
const { getCourseReport } = require('../controllers/reportController.js');

const Professor = mongoose.model('Professor');

afterAll(() => {
  vi.restoreAllMocks();
  Object.entries(smtpEnvironment).forEach(([name, value]) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  });
});

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

describe('backend controller validation contracts', () => {
  it('logs in with valid credentials and returns an access token', async () => {
    const professor = {
      _id: 'professor-1',
      email: 'professor@example.com',
      password: 'hashed-password',
      name: 'Professor',
      department: 'Computer Science',
      mfa_enabled: false,
      save: vi.fn().mockResolvedValue(),
    };
    vi.spyOn(Professor, 'findOne').mockResolvedValue(professor);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = response();

    await login(
      {
        body: { email: professor.email, password: 'password' },
      },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: expect.any(String),
        professor: expect.objectContaining({ email: professor.email }),
      }),
    );
    expect(professor.save).toHaveBeenCalledOnce();
  });

  it('rejects login requests without both credentials', async () => {
    const next = vi.fn();

    await login({ body: { email: 'professor@example.com' } }, response(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Email and password are required.',
      }),
    );
  });

  it('rejects registration requests with missing fields', async () => {
    const next = vi.fn();

    await register(
      {
        body: { email: 'professor@example.com', password: 'password' },
      },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'All fields are required.',
      }),
    );
  });

  it('rejects course creation requests with missing fields', async () => {
    const next = vi.fn();

    await createCourse(
      {
        user: { id: 'professor-1' },
        body: { course_name: 'Software Engineering' },
      },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Course name, number, section, and semester are required.',
      }),
    );
  });

  it('rejects course lookup requests with an invalid ID', async () => {
    const next = vi.fn();

    await getCourse(
      { params: { course_id: 'not-an-object-id' } },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Invalid course ID.',
      }),
    );
  });

  it('rejects team membership requests with invalid IDs', async () => {
    const next = vi.fn();

    await addStudentToTeam(
      {
        params: {
          course_id: 'bad-course',
          team_id: 'bad-team',
          student_id: 'bad-student',
        },
      },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Invalid course, team, or student ID.',
      }),
    );
  });

  it('exposes the current auto-assignment placeholder contract', async () => {
    const next = vi.fn();

    await autoAssignTeams({}, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'NOT_IMPLEMENTED',
        status: 501,
        message: 'Auto-assign not implemented.',
      }),
    );
  });

  it('rejects student operations with invalid identifiers', async () => {
    const next = vi.fn();

    await addStudent(
      {
        params: { course_id: 'bad-course' },
        body: {
          student_id: 'S001',
          name: 'Student',
          email: 'student@example.com',
        },
      },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Invalid course ID.',
      }),
    );
  });

  it('rejects student creation when required fields are missing', async () => {
    const next = vi.fn();

    await addStudent(
      {
        params: { course_id: '507f1f77bcf86cd799439011' },
        body: { student_id: 'S001', name: 'Student' },
      },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Missing required fields: student_id, name, email.',
      }),
    );
  });

  it('rejects student lookup and update requests with invalid IDs', async () => {
    const listNext = vi.fn();
    const updateNext = vi.fn();

    await listStudents(
      { params: { course_id: 'bad-course' } },
      response(),
      listNext,
    );
    await updateStudent(
      {
        params: { course_id: 'course-1', student_id: 'bad-student' },
        body: {},
      },
      response(),
      updateNext,
    );

    expect(listNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
      }),
    );
    expect(updateNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Invalid student ID.',
      }),
    );
  });

  it('rejects reports with an invalid course ID', async () => {
    const next = vi.fn();

    await getCourseReport(
      { params: { course_id: 'bad-course' }, query: {} },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Invalid course ID.',
      }),
    );
  });

  it('rejects roster uploads without a file', async () => {
    const next = vi.fn();

    await uploadRoster({ params: { course_id: 'course-1' } }, response(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'No file uploaded.',
      }),
    );
  });

  it('rejects destructive student operations with invalid course IDs', async () => {
    const deleteNext = vi.fn();
    const resetNext = vi.fn();

    await deleteAllStudents(
      { params: { course_id: 'bad-course' } },
      response(),
      deleteNext,
    );
    await resetEvaluationState(
      { params: { course_id: 'bad-course' } },
      response(),
      resetNext,
    );

    expect(deleteNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Invalid course ID.',
      }),
    );
    expect(resetNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Invalid course ID.',
      }),
    );
  });
});
