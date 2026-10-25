// These tests check course and team reports built from saved evaluations.
// TLDR: compare results with synthetic expectations and database snapshots to
//       confirm reports do not change records.

import { beforeEach, describe, expect, it } from 'vitest';
import { apiRequest, jsonRequest, useIntegrationFixture } from './api.js';

const state = useIntegrationFixture();
let unscored;
let received;
let before;

const ids = (records) => records.map((record) => String(record._id)).sort();
const rating = (score, participation) => ({
  professionalism: score,
  communication: score,
  work_ethic: score,
  content_knowledge_skills: score,
  overall_contribution: score,
  participation,
});

// Report endpoints should derive output without inserting or modifying application records.
async function databaseSnapshot() {
  const data = {};
  for (const [name, model] of Object.entries(state.context.models)) {
    data[name] = await model.find({}).sort({ _id: 1 }).lean();
  }
  // Reporting is computed from source records; even the legacy collection must
  // remain untouched by reads and the generate alias.
  data.reports = await state.context.connection.db
    .collection('reports')
    .find({})
    .sort({ _id: 1 })
    .toArray();
  return JSON.parse(JSON.stringify(data));
}

beforeEach(async () => {
  const { Course, Student, Evaluation } = state.context.models;
  const {
    course,
    professor,
    students: [a, b],
  } = state.fixture;
  unscored = await Student.create({
    student_id: 'REPORT003',
    name: 'Unscored Student',
    email: 'report-unscored@example.com',
    course_id: course._id,
  });
  const evaluation = (evaluator, recipient, ratings, token) => ({
    course_id: course._id,
    evaluator_id: evaluator._id,
    student_id: recipient._id,
    ratings,
    overall_feedback: 'Consistent collaboration on the project.',
    evaluation_token: token,
  });
  // These independently chosen scores yield A=75 and B=100, with C ungraded.
  received = await Evaluation.create([
    evaluation(b, a, rating(5, 4), 'report-b-a'),
    evaluation(unscored, a, rating(2.5, 2), 'report-c-a'),
    evaluation(a, b, rating(5, 4), 'report-a-b'),
  ]);
  const otherCourse = await Course.create({
    course_name: 'Unrelated Report Course',
    course_number: 'REPORT 9999',
    course_section: '99',
    semester: course.semester,
    professor_id: professor._id,
  });
  const outsiders = await Student.create([
    {
      student_id: a.student_id,
      name: 'Duplicate Business ID',
      email: 'report-other-a@example.com',
      course_id: otherCourse._id,
    },
    {
      student_id: 'REPORT999',
      name: 'Other Evaluator',
      email: 'report-other-b@example.com',
      course_id: otherCourse._id,
    },
  ]);
  await Evaluation.create({
    course_id: otherCourse._id,
    student_id: outsiders[0]._id,
    evaluator_id: outsiders[1]._id,
    ratings: rating(1, 1),
    overall_feedback: 'Unrelated course feedback remains separate.',
    evaluation_token: 'report-other-course',
  });
  before = await databaseSnapshot();
});

function courseView(body) {
  return {
    course: body.course._id,
    students: body.students
      .map((student) => ({
        id: student._id,
        original: student.originalScore,
        final: student.finalScore,
        grade: student.letterGrade,
        count: student.evaluationsReceived,
        evaluations: ids(student.evaluationDetails),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    teams: body.teams.map((team) => ({
      id: team._id,
      students: ids(team.students),
      average: team.averageScore,
      grade: team.letterGrade,
    })),
    summary: body.summary,
    method: body.gradingMethod,
    settings: body.gradingSettings,
  };
}

function expectedCourse() {
  const {
    course,
    team,
    students: [a, b],
  } = state.fixture;
  return {
    course: course.id,
    students: [
      {
        id: a.id,
        original: 75,
        final: 75,
        grade: 'C',
        count: 2,
        evaluations: ids(received.slice(0, 2)),
      },
      {
        id: b.id,
        original: 100,
        final: 100,
        grade: 'A',
        count: 1,
        evaluations: ids(received.slice(2)),
      },
      {
        id: unscored.id,
        original: 0,
        final: 0,
        grade: 'No evaluations',
        count: 0,
        evaluations: [],
      },
    ].sort((left, right) => left.id.localeCompare(right.id)),
    teams: [
      { id: team.id, students: [a.id, b.id].sort(), average: 87.5, grade: 'B' },
    ],
    summary: {
      totalStudents: 3,
      studentsWithEvaluations: 2,
      averageScore: 87.5,
      gradeDistribution: { A: 1, B: 0, C: 1, D: 0, F: 0 },
    },
    method: 'mean',
    settings: null,
  };
}

const reportsPath = () => `/api/courses/${state.fixture.course.id}/reports`;

describe('report API and MongoDB interactions', () => {
  it('OP-33-29 computes scoped course and populated-team mean reports without writes', async () => {
    const response = await jsonRequest(
      'GET',
      reportsPath(),
      undefined,
      state.token,
    );
    expect(response.status).toBe(200);
    expect(courseView(response.body)).toEqual(expectedCourse());
    expect(await databaseSnapshot()).toEqual(before);
  });

  it('OP-33-29 applies an explicit curve and protects high scores without writes', async () => {
    const response = await jsonRequest(
      'GET',
      `${reportsPath()}?gradingMethod=curved&boostFactor=0.5&protectionThreshold=80`,
      undefined,
      state.token,
    );
    expect(response.status).toBe(200);
    const expected = expectedCourse();
    expected.students.find(
      (student) => student.id === state.fixture.students[0].id,
    ).final = 81.25;
    expected.students.find(
      (student) => student.id === state.fixture.students[0].id,
    ).grade = 'B';
    expected.teams[0].average = 90.63;
    expected.teams[0].grade = 'A';
    expected.summary.averageScore = 90.63;
    expected.summary.gradeDistribution = { A: 1, B: 1, C: 0, D: 0, F: 0 };
    expected.method = 'curved';
    expected.settings = {
      boostFactor: 0.5,
      protectionThreshold: 80,
      classStats: {
        mean: 87.5,
        standardDeviation: 12.5,
        boostFactor: 0.5,
        protectionThreshold: 80,
      },
    };
    expect(courseView(response.body)).toEqual(expected);
    expect(
      response.body.students.find(
        (student) => student._id === state.fixture.students[0].id,
      ).improvement,
    ).toBe(6.25);
    expect(await databaseSnapshot()).toEqual(before);
  });

  it('OP-33-30 downloads exact CSV identities and grades without writes', async () => {
    const response = await apiRequest(
      'GET',
      `${reportsPath()}/download`,
      undefined,
      state.token,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename="course_${state.fixture.course.id}_report.csv"`,
    );
    const [header, ...rows] = (await response.text()).trim().split('\n');
    expect(header).toBe(
      'Student ID,Name,Email,Team,Original Score,Final Score,Letter Grade,Evaluations Received,Improvement',
    );
    const [a, b] = state.fixture.students;
    expect(rows.sort()).toEqual(
      [
        `${a.student_id},${a.name},${a.email},${state.fixture.team.team_name},75,75,C,2,0`,
        `${b.student_id},${b.name},${b.email},${state.fixture.team.team_name},100,100,A,1,0`,
        `${unscored.student_id},${unscored.name},${unscored.email},No Team,0,0,No evaluations,0,0`,
      ].sort(),
    );
    expect(await databaseSnapshot()).toEqual(before);
  });

  it('OP-33-31 selects a business student ID within its course and counts both directions', async () => {
    const a = state.fixture.students[0];
    const response = await jsonRequest(
      'GET',
      `${reportsPath()}/student/${a.student_id}`,
      undefined,
      state.token,
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      student: {
        _id: a.id,
        course_id: state.fixture.course.id,
        student_id: a.student_id,
      },
      meanScore: 75,
      letterGrade: 'C',
      evaluationsReceived: 2,
      evaluationsGiven: 1,
    });
    expect(ids(response.body.detailedEvaluations)).toEqual(
      ids(received.slice(0, 2)),
    );
    expect(await databaseSnapshot()).toEqual(before);
  });

  it('OP-33-32 computes only the requested team members and aggregate without writes', async () => {
    const response = await jsonRequest(
      'GET',
      `${reportsPath()}/team/${state.fixture.team.id}`,
      undefined,
      state.token,
    );
    expect(response.status).toBe(200);
    expect(response.body.team._id).toBe(state.fixture.team.id);
    expect(
      response.body.members
        .map((member) => ({
          id: member._id,
          meanScore: member.meanScore,
          grade: member.letterGrade,
          received: member.evaluationsReceived,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual(
      [
        {
          id: state.fixture.students[0].id,
          meanScore: 75,
          grade: 'C',
          received: 2,
        },
        {
          id: state.fixture.students[1].id,
          meanScore: 100,
          grade: 'A',
          received: 1,
        },
      ].sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(response.body).toMatchObject({
      teamAverage: 87.5,
      teamLetterGrade: 'B',
    });
    expect(await databaseSnapshot()).toEqual(before);
  });

  it('OP-33-33 generates the expected report without persisting derived documents', async () => {
    const response = await jsonRequest(
      'POST',
      `${reportsPath()}/generate`,
      {},
      state.token,
    );
    expect(response.status).toBe(200);
    expect(courseView(response.body)).toEqual(expectedCourse());
    expect(await databaseSnapshot()).toEqual(before);
  });

  it('OP-33-29 returns 404 for a nonexistent course without writes', async () => {
    const response = await jsonRequest(
      'GET',
      '/api/courses/000000000000000000000001/reports',
      undefined,
      state.token,
    );
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(await databaseSnapshot()).toEqual(before);
  });
});
