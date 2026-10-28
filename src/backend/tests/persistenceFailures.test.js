// Priority workflow failures must reach error middleware without a success response.
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const originalEnvironment = vi.hoisted(() => {
  const original = Object.fromEntries(
    ['SMTP_AUTH_REQUIRED', 'SMTP_USER', 'SMTP_PASS'].map((key) => [
      key,
      process.env[key],
    ]),
  );
  process.env.SMTP_AUTH_REQUIRED = 'false';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  return original;
});
const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Team = require('../models/Team');
const controllers = {
  course: require('../controllers/courseController'),
  student: require('../controllers/studentController'),
  team: require('../controllers/teamController'),
  evaluation: require('../controllers/evaluationController'),
  report: require('../controllers/reportController'),
};
const courseId = String(new mongoose.Types.ObjectId());
const studentId = String(new mongoose.Types.ObjectId());
const teamId = String(new mongoose.Types.ObjectId());
const req = () => ({
  user: { id: 'owner' },
  params: {
    course_id: courseId,
    student_id: studentId,
    team_id: teamId,
    token: 'synthetic-token',
  },
  query: {},
  body: {
    course_name: 'Testing',
    course_number: '4724',
    course_section: '01',
    semester: 'Fall',
    student_id: 'S001',
    name: 'Student',
    email: 'student@example.invalid',
    teams: [{ team_name: 'Alpha' }],
    student_ids: [studentId],
    evaluations: [{}],
  },
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const cases = [
  ['CW-02', 'course', 'listCourses', Course, 'find'],
  ['CW-02', 'course', 'createCourse', Course, 'findOne'],
  ['CW-02', 'course', 'getCourse', Course, 'findById'],
  ['CW-02', 'course', 'updateCourse', Course, 'findByIdAndUpdate'],
  ['CW-02', 'course', 'deleteCourse', Course, 'findByIdAndUpdate'],
  ['CW-03', 'student', 'addStudent', Student, 'findOne'],
  ['CW-03', 'student', 'listStudents', Student, 'find'],
  ['CW-03', 'student', 'updateStudent', Student, 'findOne'],
  ['CW-03', 'student', 'deleteStudent', Student, 'findOneAndDelete'],
  ['CW-03', 'student', 'bulkDeleteStudents', Student, 'find'],
  ['CW-03', 'student', 'deleteAllStudents', Student, 'countDocuments'],
  ['CW-04', 'team', 'createTeams', Team, 'insertMany'],
  ['CW-04', 'team', 'updateTeam', Team, 'findOne'],
  ['CW-04', 'team', 'deleteTeam', Team, 'findOne'],
  ['CW-04', 'team', 'clearAllTeams', Team, 'deleteMany'],
  ['CW-04', 'team', 'addStudentToTeam', Team, 'findOne'],
  ['CW-04', 'team', 'removeStudentFromTeam', Team, 'findOne'],
  ['CW-05', 'evaluation', 'sendEvaluations', Course, 'findById'],
  ['CW-07', 'evaluation', 'sendTeamEvaluations', Course, 'findById'],
];
describe('priority persistence failure contracts', () => {
  it.each(cases)(
    '%s %s.%s propagates a database error',
    async (_workflow, group, handler, model, method) => {
      const error = new Error('Synthetic database failure');
      vi.spyOn(model, method).mockRejectedValue(error);
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      await controllers[group][handler](req(), res, next);
      expect(next).toHaveBeenCalledExactlyOnceWith(error);
      expect(error).toMatchObject({ status: 500, code: 'SERVER_ERROR' });
      expect(res.json).not.toHaveBeenCalled();
    },
  );
  it.each(['getEvaluationForm', 'submitEvaluation', 'evaluationTokenStatus'])(
    'CW-06/CW-08 %s propagates failed token lookup',
    async (handler) => {
      const error = new Error('Synthetic token lookup failure');
      const query = {
        populate: vi.fn().mockReturnThis(),
        then: (_resolve, reject) => Promise.reject(error).catch(reject),
      };
      vi.spyOn(Student, 'findOne').mockReturnValue(query);
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      await controllers.evaluation[handler](req(), res, next);
      expect(next).toHaveBeenCalledExactlyOnceWith(error);
      expect(error).toMatchObject({ status: 500, code: 'SERVER_ERROR' });
      expect(res.json).not.toHaveBeenCalled();
    },
  );
});
