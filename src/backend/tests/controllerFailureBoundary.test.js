import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const smtpEnvironment = vi.hoisted(() => {
  const names = ['SMTP_AUTH_REQUIRED', 'SMTP_USER', 'SMTP_PASS'];
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.SMTP_AUTH_REQUIRED = 'false';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  return original;
});

vi.mock('../utils/emailUtils.js', () => ({
  sendEvaluationInvitation: vi.fn(),
  sendEvaluationReminder: vi.fn()
}));

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Professor = require('../models/Professor.js');
const Course = require('../models/Course.js');
const Student = require('../models/Student.js');
const Team = require('../models/Team.js');
const Evaluation = require('../models/Evaluation.js');
const authController = require('../controllers/authController.js');
const courseController = require('../controllers/courseController.js');
const studentController = require('../controllers/studentController.js');
const teamController = require('../controllers/teamController.js');
const evaluationController = require('../controllers/evaluationController.js');
const reportController = require('../controllers/reportController.js');

const id = () => new mongoose.Types.ObjectId();
const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  setHeader: vi.fn(),
  send: vi.fn()
});
const errorFor = (next, code, status) => {
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ code, status }));
};

afterEach(() => vi.restoreAllMocks());
afterAll(() => {
  Object.entries(smtpEnvironment).forEach(([name, value]) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  });
});

describe('authentication failure and boundary cases', () => {
  it('rejects unknown users, incorrect passwords, and duplicate registrations', async () => {
    const unknownNext = vi.fn();
    vi.spyOn(Professor, 'findOne').mockResolvedValueOnce(null);
    await authController.login({ body: { email: 'missing@example.com', password: 'password' } }, response(), unknownNext);
    errorFor(unknownNext, 'AUTH_ERROR', 401);

    const professor = { password: 'hashed-password' };
    vi.spyOn(Professor, 'findOne').mockResolvedValueOnce(professor);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const passwordNext = vi.fn();
    await authController.login({ body: { email: 'professor@example.com', password: 'wrong' } }, response(), passwordNext);
    errorFor(passwordNext, 'AUTH_ERROR', 401);

    vi.spyOn(Professor, 'findOne').mockResolvedValueOnce({ _id: id() });
    const registerNext = vi.fn();
    await authController.register({
      body: {
        email: 'existing@example.com',
        password: 'password',
        name: 'Professor',
        department: 'Computer Science'
      }
    }, response(), registerNext);
    errorFor(registerNext, 'DUPLICATE', 409);
  });
});

describe('course and student boundary cases', () => {
  it('reports missing courses and duplicate or missing students', async () => {
    const courseId = id();
    vi.spyOn(Course, 'findById').mockResolvedValue(null);
    const courseNext = vi.fn();
    await courseController.getCourse({ params: { course_id: courseId.toString() } }, response(), courseNext);
    errorFor(courseNext, 'NOT_FOUND', 404);

    vi.spyOn(Student, 'findOne')
      .mockResolvedValueOnce({ _id: id() })
      .mockResolvedValueOnce(null);
    const studentNext = vi.fn();
    await studentController.addStudent({
      params: { course_id: courseId.toString() },
      body: { student_id: 'S1', name: 'Student', email: 'student@example.com' }
    }, response(), studentNext);
    errorFor(studentNext, 'DUPLICATE', 409);

    const deleteNext = vi.fn();
    vi.spyOn(Student, 'findOneAndDelete').mockResolvedValue(null);
    await studentController.deleteStudent({
      params: { course_id: courseId.toString(), student_id: id().toString() }
    }, response(), deleteNext);
    errorFor(deleteNext, 'NOT_FOUND', 404);
  });

  it('rejects an empty bulk-delete request', async () => {
    const next = vi.fn();
    await studentController.bulkDeleteStudents({
      params: { course_id: id().toString() },
      body: { student_ids: [] }
    }, response(), next);
    errorFor(next, 'VALIDATION_ERROR', 400);
  });
});

describe('team boundary cases', () => {
  it('prevents duplicate membership and deleting teams that still contain students', async () => {
    const courseId = id();
    const teamId = id();
    const studentId = id();
    const team = {
      _id: teamId,
      students: [studentId],
      team_name: 'Team A'
    };
    team.students.includes = vi.fn().mockReturnValue(true);
    vi.spyOn(Team, 'findOne').mockResolvedValue(team);
    vi.spyOn(Student, 'findOne').mockResolvedValue({ _id: studentId });

    const addNext = vi.fn();
    await teamController.addStudentToTeam({
      params: {
        course_id: courseId.toString(),
        team_id: teamId.toString(),
        student_id: studentId.toString()
      }
    }, response(), addNext);
    errorFor(addNext, 'DUPLICATE', 409);

    const deleteNext = vi.fn();
    await teamController.deleteTeam({
      params: { course_id: courseId.toString(), team_id: teamId.toString() }
    }, response(), deleteNext);
    errorFor(deleteNext, 'CONSTRAINT_ERROR', 409);
  });
});

describe('evaluation and reporting boundary cases', () => {
  it('rejects invalid tokens, repeat submissions, and empty submissions', async () => {
    const invalidNext = vi.fn();
    vi.spyOn(Student, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(null)
    });
    await evaluationController.evaluationTokenStatus({ params: { token: 'invalid' } }, response(), invalidNext);
    errorFor(invalidNext, 'INVALID_TOKEN', 404);

    const course = { _id: id(), course_name: 'Course' };
    const student = { _id: id(), course_id: course };
    vi.spyOn(Student, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(student)
    });
    vi.spyOn(Evaluation, 'findOne').mockResolvedValueOnce({ submitted_at: new Date() });
    const completedNext = vi.fn();
    await evaluationController.submitEvaluation({
      params: { token: 'token' },
      body: { evaluations: [] }
    }, response(), completedNext);
    errorFor(completedNext, 'ALREADY_COMPLETED', 409);

    vi.spyOn(Evaluation, 'findOne').mockResolvedValueOnce(null);
    const emptyNext = vi.fn();
    await evaluationController.submitEvaluation({
      params: { token: 'token' },
      body: { evaluations: [] }
    }, response(), emptyNext);
    errorFor(emptyNext, 'VALIDATION_ERROR', 400);
  });

  it('returns empty states for courses without students or evaluations needing reminders', async () => {
    const courseId = id();
    vi.spyOn(Student, 'find').mockResolvedValue([]);
    const statusRes = response();
    await evaluationController.evaluationStatus({ params: { course_id: courseId.toString() } }, statusRes, vi.fn());
    expect(statusRes.json).toHaveBeenCalledWith(expect.objectContaining({
      total_count: 0,
      evaluations_sent: false
    }));

    vi.spyOn(Course, 'findById').mockResolvedValue({ _id: courseId });
    vi.spyOn(Evaluation, 'find').mockReturnValue({
      distinct: vi.fn().mockResolvedValue([])
    });
    const reminderRes = response();
    await evaluationController.remindEvaluations({ params: { course_id: courseId.toString() }, body: {} }, reminderRes, vi.fn());
    expect(reminderRes.json).toHaveBeenCalledWith({
      message: 'No students need reminders - all evaluations completed.',
      reminders_sent: 0
    });

    vi.spyOn(Course, 'findById').mockResolvedValue({ _id: courseId });
    vi.spyOn(Student, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue([])
    });
    const reportRes = response();
    await reportController.getCourseReport({ params: { course_id: courseId.toString() }, query: {} }, reportRes, vi.fn());
    expect(reportRes.json).toHaveBeenCalledWith(expect.objectContaining({
      students: [],
      message: 'No students found in this course'
    }));
  });
});
