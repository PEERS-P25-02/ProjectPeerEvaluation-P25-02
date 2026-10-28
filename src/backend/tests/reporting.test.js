/*
 * These tests check that course reports show the expected scores and grades
 * when students have submitted evaluations or have none.
 *
 * TLDR: exercises report preparation with mocked course, student, evaluation,
 * and team queries.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const { getCourseReport } = require('../controllers/reportController.js');
const Course = require('../models/Course.js');
const Student = require('../models/Student.js');
const Evaluation = require('../models/Evaluation.js');
const Team = require('../models/Team.js');

const courseId = new mongoose.Types.ObjectId();

afterEach(() => vi.restoreAllMocks());

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

function student(id, name) {
  return {
    _id: id,
    name,
    team_id: null,
    toObject: () => ({ _id: id, name }),
  };
}

describe('report preparation', () => {
  it('prepares student scores and letter grades from stored evaluations', async () => {
    const first = student(new mongoose.Types.ObjectId(), 'Student One');
    const second = student(new mongoose.Types.ObjectId(), 'Student Two');
    vi.spyOn(Course, 'findById').mockResolvedValue({ course_name: 'Course' });
    vi.spyOn(Student, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue([first, second]),
    });
    vi.spyOn(Evaluation, 'find').mockResolvedValue([
      {
        student_id: first._id,
        toObject: () => ({ student_id: first._id }),
        ratings: {
          professionalism: 4,
          communication: 4,
          work_ethic: 4,
          content_knowledge_skills: 4,
          overall_contribution: 4,
          participation: 4,
        },
      },
    ]);
    vi.spyOn(Team, 'find').mockResolvedValue([]);

    const res = response();
    await getCourseReport(
      {
        params: { course_id: courseId.toString() },
        query: { gradingMethod: 'mean' },
      },
      res,
      vi.fn(),
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        students: expect.arrayContaining([
          expect.objectContaining({
            name: 'Student One',
            originalScore: 83.33,
            finalScore: 83.33,
            letterGrade: 'B',
            evaluationsReceived: 1,
          }),
          expect.objectContaining({
            name: 'Student Two',
            originalScore: 0,
            finalScore: 0,
            letterGrade: 'No evaluations',
          }),
        ]),
      }),
    );
  });
});

// CW-09: assert numeric outputs at grade boundaries and across curve settings.
const criteria = [
  'professionalism',
  'communication',
  'work_ethic',
  'content_knowledge_skills',
  'overall_contribution',
];
function evaluationFor(member, score, feedback = '') {
  const data = {
    student_id: member._id,
    ratings: Object.fromEntries([
      ...criteria.map((key) => [key, score / 20]),
      ['participation', score / 25],
    ]),
    overall_feedback: feedback,
  };
  return { ...data, toObject: () => data };
}
function mockReportData(scores) {
  const members = scores.map((_, i) =>
    student(new mongoose.Types.ObjectId(), `Student ${i + 1}`),
  );
  const evaluations = members.map((member, i) =>
    evaluationFor(member, scores[i]),
  );
  vi.spyOn(Course, 'findById').mockResolvedValue({
    course_name: 'Synthetic Course',
  });
  vi.spyOn(Student, 'find').mockReturnValue({
    populate: vi.fn().mockResolvedValue(members),
  });
  vi.spyOn(Evaluation, 'find').mockResolvedValue(evaluations);
  vi.spyOn(Team, 'find').mockResolvedValue([]);
  return { members, evaluations };
}
async function courseReport(query = {}) {
  const res = response();
  const next = vi.fn();
  await getCourseReport(
    { params: { course_id: courseId.toString() }, query },
    res,
    next,
  );
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
  return res.json.mock.calls[0][0];
}
describe('report calculations and boundaries', () => {
  it.each([
    [90, 'A'],
    [89.99, 'B'],
    [80, 'B'],
    [79.99, 'C'],
    [70, 'C'],
    [69.99, 'D'],
    [60, 'D'],
    [59.99, 'F'],
  ])('assigns %s to grade %s without curving', async (score, grade) => {
    mockReportData([score]);
    const report = await courseReport({ gradingMethod: 'mean' });
    expect(report.students[0]).toMatchObject({
      originalScore: score,
      finalScore: score,
      letterGrade: grade,
      improvement: 0,
    });
    expect(report.summary.gradeDistribution[grade]).toBe(1);
    expect(report.summary.averageScore).toBe(score);
    expect(report.gradingSettings).toBeNull();
  });
  it('boosts low scores while protecting scores at the threshold and excluding unevaluated students', async () => {
    const { evaluations } = mockReportData([40, 60, 80, 0]);
    evaluations.pop();
    const report = await courseReport({
      gradingMethod: 'curved',
      boostFactor: '0.5',
      protectionThreshold: '80',
    });
    expect(report.students.map(({ finalScore }) => finalScore)).toEqual([
      50, 60, 80, 0,
    ]);
    expect(report.students.map(({ improvement }) => improvement)).toEqual([
      10, 0, 0, 0,
    ]);
    expect(report.students[3]).toMatchObject({
      letterGrade: 'No evaluations',
      evaluationsReceived: 0,
    });
    expect(report.gradingSettings).toMatchObject({
      boostFactor: 0.5,
      protectionThreshold: 80,
      classStats: { mean: 60, standardDeviation: 16.33 },
    });
    expect(report.summary).toMatchObject({
      totalStudents: 4,
      studentsWithEvaluations: 3,
      averageScore: 63.33,
      gradeDistribution: { A: 0, B: 1, C: 0, D: 1, F: 1 },
    });
  });
  it('leaves a single evaluated score unchanged when a curve cannot be computed', async () => {
    mockReportData([60]);
    const report = await courseReport({ gradingMethod: 'curved' });
    expect(report.students[0]).toMatchObject({
      originalScore: 60,
      finalScore: 60,
      improvement: 0,
    });
    expect(report.gradingSettings.classStats).toBeUndefined();
  });
  it('caps a boosted grade at 100', async () => {
    mockReportData([40, 100]);
    const report = await courseReport({
      gradingMethod: 'curved',
      boostFactor: '3',
      protectionThreshold: '100',
    });
    expect(report.students.map(({ finalScore }) => finalScore)).toEqual([
      100, 100,
    ]);
    expect(report.summary.gradeDistribution.A).toBe(2);
  });
  it('normalizes participation to the five-point scale before averaging criteria', async () => {
    const { evaluations } = mockReportData([80]);
    evaluations[0].ratings = {
      professionalism: 5,
      communication: 4,
      work_ethic: 3,
      content_knowledge_skills: 2,
      overall_contribution: 1,
      participation: 4,
    };
    const report = await courseReport();
    expect(report.students[0].finalScore).toBe(66.67);
  });
  it('averages all received ratings rather than taking only the first evaluation', async () => {
    const { members, evaluations } = mockReportData([40]);
    evaluations.push(evaluationFor(members[0], 100));
    const report = await courseReport();
    expect(report.students[0]).toMatchObject({
      finalScore: 70,
      evaluationsReceived: 2,
      letterGrade: 'C',
    });
  });
  it('computes team means from populated references and leaves empty teams unevaluated', async () => {
    const { members } = mockReportData([60, 80]);
    const teamId = new mongoose.Types.ObjectId();
    members.forEach((member) => {
      member.toObject = () => ({
        _id: member._id,
        name: member.name,
        team_id: { _id: teamId, team_name: 'Alpha' },
      });
    });
    Team.find.mockResolvedValue([
      { _id: teamId, toObject: () => ({ _id: teamId, team_name: 'Alpha' }) },
      {
        _id: new mongoose.Types.ObjectId(),
        toObject: () => ({ team_name: 'Empty' }),
      },
    ]);
    const report = await courseReport();
    expect(report.teams[0]).toMatchObject({
      averageScore: 70,
      letterGrade: 'C',
    });
    expect(report.teams[0].students).toHaveLength(2);
    expect(report.teams[1]).toMatchObject({
      students: [],
      averageScore: 0,
      letterGrade: 'No evaluations',
    });
  });
  it('forwards query failures without producing a successful report', async () => {
    const error = new Error('Synthetic report query failure');
    vi.spyOn(Course, 'findById').mockRejectedValue(error);
    const res = response();
    const next = vi.fn();
    await getCourseReport(
      { params: { course_id: courseId.toString() }, query: {} },
      res,
      next,
    );
    expect(next).toHaveBeenCalledExactlyOnceWith(error);
    expect(error).toMatchObject({ status: 500, code: 'SERVER_ERROR' });
    expect(res.json).not.toHaveBeenCalled();
  });
});

// CW-09: individual and team reports must use scoped records and numeric results.
describe('individual and team report contracts', () => {
  const controller = require('../controllers/reportController.js');
  it('returns a student score, authored count, and received details in the selected course', async () => {
    const member = student(new mongoose.Types.ObjectId(), 'Synthetic Student');
    const received = [evaluationFor(member, 80), evaluationFor(member, 100)];
    vi.spyOn(Student, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(member),
    });
    vi.spyOn(Evaluation, 'find')
      .mockResolvedValueOnce(received)
      .mockResolvedValueOnce([{}, {}, {}]);
    const res = response();
    const next = vi.fn();
    await controller.getStudentReport(
      { params: { course_id: String(courseId), student_id: 'S001' } },
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(Student.findOne).toHaveBeenCalledWith({
      course_id: courseId,
      student_id: 'S001',
    });
    expect(Evaluation.find).toHaveBeenNthCalledWith(1, {
      course_id: courseId,
      student_id: member._id,
    });
    expect(Evaluation.find).toHaveBeenNthCalledWith(2, {
      course_id: courseId,
      evaluator_id: member._id,
    });
    expect(res.json).toHaveBeenCalledWith({
      student: member,
      meanScore: 90,
      letterGrade: 'A',
      evaluationsReceived: 2,
      evaluationsGiven: 3,
      detailedEvaluations: received,
    });
  });
  it('distinguishes a student without evaluations from a failing grade', async () => {
    const member = student(new mongoose.Types.ObjectId(), 'Unreviewed');
    vi.spyOn(Student, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(member),
    });
    vi.spyOn(Evaluation, 'find').mockResolvedValue([]);
    const res = response();
    const next = vi.fn();
    await controller.getStudentReport(
      { params: { course_id: String(courseId), student_id: 'S001' } },
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        meanScore: 0,
        letterGrade: 'No evaluations',
        evaluationsReceived: 0,
        evaluationsGiven: 0,
      }),
    );
  });
  it('calculates the team average only from evaluated members', async () => {
    const teamId = new mongoose.Types.ObjectId();
    const members = [
      student(new mongoose.Types.ObjectId(), 'One'),
      student(new mongoose.Types.ObjectId(), 'Two'),
      student(new mongoose.Types.ObjectId(), 'Unreviewed'),
    ];
    const team = { _id: teamId, team_name: 'Alpha' };
    vi.spyOn(Team, 'findOne').mockResolvedValue(team);
    vi.spyOn(Student, 'find').mockResolvedValue(members);
    vi.spyOn(Evaluation, 'find').mockResolvedValue([
      evaluationFor(members[0], 60),
      evaluationFor(members[1], 80),
    ]);
    const res = response();
    const next = vi.fn();
    await controller.getTeamReport(
      { params: { course_id: String(courseId), team_id: String(teamId) } },
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(Team.findOne).toHaveBeenCalledWith({
      _id: teamId,
      course_id: courseId,
    });
    expect(Student.find).toHaveBeenCalledWith({
      course_id: courseId,
      team_id: teamId,
    });
    expect(Evaluation.find).toHaveBeenCalledWith({
      course_id: courseId,
      student_id: { $in: members.map((member) => member._id) },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        team,
        teamAverage: 70,
        teamLetterGrade: 'C',
        members: [
          expect.objectContaining({ meanScore: 60 }),
          expect.objectContaining({ meanScore: 80 }),
          expect.objectContaining({
            meanScore: 0,
            letterGrade: 'No evaluations',
          }),
        ],
      }),
    );
  });
  it('reports an empty team without dividing by zero', async () => {
    const teamId = new mongoose.Types.ObjectId();
    vi.spyOn(Team, 'findOne').mockResolvedValue({ _id: teamId });
    vi.spyOn(Student, 'find').mockResolvedValue([]);
    vi.spyOn(Evaluation, 'find').mockResolvedValue([]);
    const res = response();
    const next = vi.fn();
    await controller.getTeamReport(
      { params: { course_id: String(courseId), team_id: String(teamId) } },
      res,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        members: [],
        teamAverage: 0,
        teamLetterGrade: 'No evaluations',
      }),
    );
  });
  it.each(['getStudentReport', 'getTeamReport'])(
    'returns a missing-record error for %s without a success response',
    async (handler) => {
      const teamId = new mongoose.Types.ObjectId();
      vi.spyOn(Team, 'findOne').mockResolvedValue(null);
      vi.spyOn(Student, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });
      const res = response();
      const next = vi.fn();
      await controller[handler](
        {
          params: {
            course_id: String(courseId),
            student_id: 'S001',
            team_id: String(teamId),
          },
        },
        res,
        next,
      );
      expect(next).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ status: 404, code: 'NOT_FOUND' }),
      );
      expect(res.json).not.toHaveBeenCalled();
    },
  );
});
