/*
 * These tests check that common requests complete successfully and return the
 * expected information.
 *
 * TLDR: exercises controller contracts with mocked models and email delivery
 * across course, roster, team, evaluation, and report success paths.
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createRequire } from 'node:module';

// emailUtils validates these settings when controllers load; use credential-free
// test values before require(), then restore the original values after the suite.
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

vi.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message' }),
  }),
}));

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const emailUtils = require('../utils/emailUtils.js');
const Course = require('../models/Course.js');
const Student = require('../models/Student.js');
const Team = require('../models/Team.js');
const Evaluation = require('../models/Evaluation.js');
const invitationSpy = vi.spyOn(emailUtils, 'sendEvaluationInvitation');
const reminderSpy = vi.spyOn(emailUtils, 'sendEvaluationReminder');
// Use Node's native loader for these CommonJS modules; ESM transforms can
// mis-map their V8 function hits.
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
  send: vi.fn(),
});
beforeEach(() => {
  invitationSpy.mockResolvedValue({ success: true });
  reminderSpy.mockResolvedValue({ success: true });
});
afterEach(() => vi.resetAllMocks());
afterAll(() => {
  Object.entries(smtpEnvironment).forEach(([name, value]) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  });
});

describe('course controller success paths', () => {
  it('creates, lists, gets, updates, and deletes courses', async () => {
    const courseId = id();
    const professorId = id();
    const saved = {
      _id: courseId,
      toObject: () => ({ _id: courseId, course_name: 'SE' }),
      save: vi.fn(),
    };
    vi.spyOn(Course, 'findOne').mockResolvedValue(null);
    vi.spyOn(Course.prototype, 'save').mockResolvedValue();
    vi.spyOn(Course, 'find').mockResolvedValue([saved]);
    vi.spyOn(Team, 'aggregate').mockResolvedValue([
      { _id: courseId, count: 2 },
    ]);
    vi.spyOn(Course, 'findById').mockResolvedValue(saved);
    vi.spyOn(Student, 'countDocuments').mockResolvedValue(3);
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue(saved);
    let res = response();
    await courseController.createCourse(
      {
        user: { id: professorId.toString() },
        body: {
          course_name: 'SE',
          course_number: '301',
          course_section: '01',
          semester: 'Fall',
        },
      },
      res,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: expect.anything(),
      message: 'Course created.',
    });
    expect(Course.prototype.save).toHaveBeenCalledOnce();
    expect(Course.prototype.save.mock.instances[0]).toMatchObject({
      course_name: 'SE',
      course_number: '301',
      course_section: '01',
      semester: 'Fall',
      professor_id: professorId,
      course_status: 'Active',
    });
    res = response();
    await courseController.listCourses(
      { user: { id: professorId.toString() }, query: {} },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ team_count: 2 })]),
    );
    res = response();
    await courseController.getCourse(
      { params: { course_id: courseId.toString() } },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ student_count: 3 }),
    );
    res = response();
    await courseController.updateCourse(
      {
        params: { course_id: courseId.toString() },
        body: { semester: 'Spring' },
      },
      res,
      vi.fn(),
    );
    expect(Course.findByIdAndUpdate).toHaveBeenCalledWith(
      courseId.toString(),
      { semester: 'Spring' },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Course updated.' });
    res = response();
    await courseController.deleteCourse(
      { params: { course_id: courseId.toString() } },
      res,
      vi.fn(),
    );
    expect(Course.findByIdAndUpdate).toHaveBeenLastCalledWith(
      courseId,
      { course_status: 'Inactive' },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith({
      message: 'Course deleted successfully.',
    });
  });
});

describe('student and team controller success paths', () => {
  it('adds, lists, updates, deletes, and bulk deletes students', async () => {
    const courseId = id();
    const studentId = id();
    const student = { _id: studentId, team_id: null, save: vi.fn() };
    vi.spyOn(Student, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValue(student);
    vi.spyOn(Student.prototype, 'save').mockResolvedValue();
    vi.spyOn(Student, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Student, 'find').mockResolvedValue([student]);
    vi.spyOn(Student, 'findOneAndUpdate').mockResolvedValue(student);
    vi.spyOn(Student, 'findOneAndDelete').mockResolvedValue(student);
    vi.spyOn(Student, 'deleteMany').mockResolvedValue({ deletedCount: 1 });
    vi.spyOn(Evaluation, 'deleteMany').mockResolvedValue({ deletedCount: 1 });
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({});
    vi.spyOn(Course, 'findById').mockResolvedValue({});
    let res = response();
    await studentController.addStudent(
      {
        params: { course_id: courseId.toString() },
        body: { student_id: 'S1', name: 'One', email: 'one@example.com' },
      },
      res,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Student added.',
        student: expect.anything(),
      }),
    );
    res = response();
    await studentController.listStudents(
      { params: { course_id: courseId.toString() } },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith([student]);
    res = response();
    await studentController.updateStudent(
      {
        params: {
          course_id: courseId.toString(),
          student_id: studentId.toString(),
        },
        body: { name: 'Updated' },
      },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Student updated.' });
    expect(Student.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: studentId.toString(), course_id: courseId.toString() },
      { name: 'Updated' },
      { new: true },
    );
    res = response();
    await studentController.deleteStudent(
      {
        params: {
          course_id: courseId.toString(),
          student_id: studentId.toString(),
        },
      },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Student deleted.' });
    expect(Student.findOneAndDelete).toHaveBeenCalledWith({
      _id: studentId.toString(),
      course_id: courseId.toString(),
    });
    res = response();
    await studentController.bulkDeleteStudents(
      {
        params: { course_id: courseId.toString() },
        body: { student_ids: [studentId.toString()] },
      },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_count: 1 }),
    );
    expect(Student.deleteMany).toHaveBeenCalledWith({
      _id: { $in: [studentId.toString()] },
      course_id: courseId.toString(),
    });
  });

  it('creates, lists, adds/removes members, updates, and deletes teams', async () => {
    const courseId = id();
    const teamId = id();
    const studentId = id();
    const team = {
      _id: teamId,
      course_id: courseId,
      team_name: 'A',
      team_status: 'Active',
      students: [],
      student_count: 0,
      save: vi.fn(),
    };
    vi.spyOn(Team, 'insertMany').mockResolvedValue([team]);
    const teamFind = [team];
    teamFind.populate = vi.fn().mockResolvedValue([team]);
    vi.spyOn(Team, 'find').mockReturnValue(teamFind);
    vi.spyOn(Team, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Team, 'findOne').mockResolvedValue(team);
    vi.spyOn(Team, 'findOneAndUpdate').mockResolvedValue(team);
    vi.spyOn(Team, 'findOneAndDelete').mockResolvedValue(team);
    vi.spyOn(Team, 'updateMany').mockResolvedValue({});
    vi.spyOn(Student, 'findOne').mockResolvedValue({
      _id: studentId,
      name: 'One',
      save: vi.fn(),
    });
    vi.spyOn(Student, 'updateMany').mockResolvedValue({});
    vi.spyOn(Course, 'findByIdAndUpdate').mockResolvedValue({});
    let res = response();
    await teamController.createTeams(
      {
        params: { course_id: courseId.toString() },
        body: { teams: [{ team_name: 'A' }] },
      },
      res,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Teams created.',
      teams: [teamId],
    });
    res = response();
    await teamController.listTeams(
      { params: { course_id: courseId.toString() } },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith([team]);
    res = response();
    const addNext = vi.fn();
    await teamController.addStudentToTeam(
      {
        params: {
          course_id: courseId.toString(),
          team_id: teamId.toString(),
          student_id: studentId.toString(),
        },
      },
      res,
      addNext,
    );
    if (addNext.mock.calls.length) throw addNext.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(team.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        student: expect.objectContaining({ team_id: teamId }),
      }),
    );
    team.students = [{ toString: () => studentId.toString() }];
    team.students.includes = () => true;
    team.students.pull = vi.fn();
    res = response();
    await teamController.removeStudentFromTeam(
      {
        params: {
          course_id: courseId.toString(),
          team_id: teamId.toString(),
          student_id: studentId.toString(),
        },
      },
      res,
      vi.fn(),
    );
    expect(team.students.pull).toHaveBeenCalledWith(studentId);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('removed'),
        student: expect.objectContaining({
          team_id: null,
          group_assignment: '',
        }),
      }),
    );
    res = response();
    await teamController.updateTeam(
      {
        params: { course_id: courseId.toString(), team_id: teamId.toString() },
        body: { team_name: 'B' },
      },
      res,
      vi.fn(),
    );
    expect(Team.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: teamId.toString(), course_id: courseId.toString() },
      { team_name: 'B' },
      { new: true },
    );
    expect(Student.updateMany).toHaveBeenCalledWith(
      { team_id: teamId.toString() },
      { group_assignment: 'B' },
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('updated'),
        team: team,
      }),
    );
    team.students = [];
    res = response();
    await teamController.deleteTeam(
      {
        params: { course_id: courseId.toString(), team_id: teamId.toString() },
      },
      res,
      vi.fn(),
    );
    expect(Team.findOneAndDelete).toHaveBeenCalledWith({
      _id: teamId.toString(),
      course_id: courseId.toString(),
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('evaluation controller success paths', () => {
  const courseId = id();
  const student = {
    _id: id(),
    name: 'One',
    student_id: 'S1',
    email: 'one@example.com',
    evaluation_token: 'token',
    course_id: courseId,
    team_id: null,
  };
  const course = {
    _id: courseId,
    course_name: 'SE',
    course_number: '301',
    course_section: '01',
    semester: 'Fall',
  };
  it('sends course and team invitations and reminders', async () => {
    vi.spyOn(Course, 'findById').mockResolvedValue(course);
    vi.spyOn(Student, 'find')
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([student]) })
      .mockReturnValue([student]);
    vi.spyOn(Team, 'findById').mockResolvedValue({ course_id: courseId });
    vi.spyOn(Student, 'findByIdAndUpdate').mockResolvedValue(student);
    vi.spyOn(Evaluation, 'find').mockReturnValue({
      distinct: vi.fn().mockResolvedValue([]),
    });
    let res = response();
    await evaluationController.sendEvaluations(
      {
        params: { course_id: courseId.toString() },
        body: { deadline: 'tomorrow' },
      },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ emails_sent: 1, total_students: 1 }),
    );
    res = response();
    await evaluationController.sendTeamEvaluations(
      {
        params: { course_id: courseId.toString(), team_id: id().toString() },
        body: {},
      },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ emails_sent: 1, total_students: 1 }),
    );
    res = response();
    await evaluationController.remindEvaluations(
      { params: { course_id: courseId.toString() }, body: {} },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ reminders_sent: 1, total_reminded: 1 }),
    );
  });

  it('gets forms, token status, submits evaluations, and reports status', async () => {
    const populated = {
      ...student,
      course_id: course,
      team_id: null,
      populate: vi.fn().mockReturnThis(),
    };
    vi.spyOn(Student, 'findOne').mockReturnValue(populated);
    vi.spyOn(Evaluation, 'findOne').mockResolvedValue(null);
    const studentFindSpy = vi.spyOn(Student, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    vi.spyOn(Evaluation, 'exists').mockResolvedValue(null);
    let res = response();
    await evaluationController.getEvaluationForm(
      { params: { token: 'token' } },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token',
        evaluator: expect.objectContaining({ name: 'One' }),
        course: expect.objectContaining({ name: 'SE' }),
      }),
    );
    res = response();
    await evaluationController.evaluationTokenStatus(
      { params: { token: 'token' } },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ valid: true, completed: false }),
    );
    const saveSpy = vi.spyOn(Evaluation.prototype, 'save').mockResolvedValue();
    const recipientId = id();
    const eligiblePeersQuery = {
      select: vi.fn().mockResolvedValue([{ _id: recipientId }]),
    };
    studentFindSpy.mockReturnValue(eligiblePeersQuery);
    vi.spyOn(Student, 'findByIdAndUpdate').mockResolvedValue(student);
    const ratings = {
      professionalism: 4,
      communication: 4,
      work_ethic: 4,
      content_knowledge_skills: 4,
      overall_contribution: 4,
      participation: 4,
    };
    res = response();
    await evaluationController.submitEvaluation(
      {
        params: { token: 'token' },
        body: {
          evaluations: [
            {
              student_id: recipientId,
              ratings,
              overall_feedback: 'Excellent contribution',
            },
          ],
        },
      },
      res,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ evaluations_count: 1 }),
    );
    expect(Student.findByIdAndUpdate).toHaveBeenCalledWith(student._id, {
      evaluation_completed: true,
    });
    expect(Student.find).toHaveBeenLastCalledWith({
      course_id: courseId,
      _id: { $ne: student._id },
    });
    expect(eligiblePeersQuery.select).toHaveBeenCalledWith('_id');
    expect(saveSpy).toHaveBeenCalledOnce();
    // Check the document being saved while keeping MongoDB mocked.
    expect(saveSpy.mock.instances[0].toObject()).toMatchObject({
      course_id: courseId,
      student_id: recipientId,
      evaluator_id: student._id,
      ratings,
      overall_feedback: 'Excellent contribution',
      evaluation_token: 'token',
    });
    vi.spyOn(Student, 'find').mockResolvedValue([{ ...student }]);
    vi.spyOn(Evaluation, 'find').mockReturnValue({
      distinct: vi.fn().mockResolvedValue([student._id]),
      findOne: undefined,
    });
    vi.spyOn(Evaluation, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue({ submitted_at: new Date() }),
    });
    res = response();
    await evaluationController.evaluationStatus(
      { params: { course_id: courseId.toString() } },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total_count: 1,
        completed_count: 1,
        evaluations_sent: true,
      }),
    );
  });
});

describe('report success paths', () => {
  it('applies curved grading and downloads a CSV report', async () => {
    const courseId = id();
    const first = {
      _id: id(),
      name: 'One',
      email: 'one@example.com',
      team_id: null,
    };
    const second = {
      _id: id(),
      name: 'Two',
      email: 'two@example.com',
      team_id: null,
    };
    first.toObject = () => ({
      _id: first._id,
      name: first.name,
      email: first.email,
      team_id: null,
    });
    second.toObject = () => ({
      _id: second._id,
      name: second.name,
      email: second.email,
      team_id: null,
    });
    const ratings = {
      professionalism: 4,
      communication: 4,
      work_ethic: 4,
      content_knowledge_skills: 4,
      overall_contribution: 4,
      participation: 4,
    };
    vi.spyOn(Course, 'findById').mockResolvedValue({ course_name: 'SE' });
    vi.spyOn(Student, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue([first, second]),
    });
    vi.spyOn(Evaluation, 'find').mockResolvedValue([
      {
        student_id: first._id,
        evaluator_id: id(),
        ratings,
        toObject: () => ({}),
      },
      {
        student_id: second._id,
        evaluator_id: id(),
        ratings: { ...ratings, professionalism: 2 },
        toObject: () => ({}),
      },
    ]);
    vi.spyOn(Team, 'find').mockResolvedValue([]);
    let res = response();
    await reportController.getCourseReport(
      {
        params: { course_id: courseId.toString() },
        query: { gradingMethod: 'curved', boostFactor: 0.5 },
      },
      res,
      vi.fn(),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        gradingMethod: 'curved',
        students: expect.arrayContaining([
          expect.objectContaining({
            letterGrade: expect.any(String),
            improvement: expect.any(Number),
          }),
        ]),
        gradingSettings: expect.objectContaining({
          classStats: expect.objectContaining({ mean: expect.any(Number) }),
        }),
      }),
    );
    const curvedReport = res.json.mock.calls[0][0];
    expect(
      curvedReport.students.some((student) => student.improvement > 0),
    ).toBe(true);
    res = response();
    await reportController.downloadReport(
      { params: { course_id: courseId.toString() }, query: {} },
      res,
      vi.fn(),
    );
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('Student ID'),
    );
    expect(res.setHeader).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('One'));
  });
});
