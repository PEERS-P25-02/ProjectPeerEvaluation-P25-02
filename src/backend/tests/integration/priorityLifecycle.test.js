// Priority regression workflows use real invitations and submissions so lifecycle
// assertions cannot pass merely because a hand-built fixture omitted saved state.
import { describe, expect, it } from 'vitest';
import {
  apiRequest,
  jsonRequest,
  useIntegrationFixture,
  waitForMessages,
} from './api.js';

const state = useIntegrationFixture();
const coursePath = () => `/api/courses/${state.fixture.course.id}`;
const request = (method, suffix, body) =>
  jsonRequest(method, `${coursePath()}${suffix}`, body, state.token);
const entry = (student) => ({
  student_id: student.id,
  ratings: {
    professionalism: 5,
    communication: 5,
    work_ethic: 5,
    content_knowledge_skills: 5,
    overall_contribution: 5,
    participation: 4,
  },
  overall_feedback: 'Reliable and constructive synthetic project contribution.',
});

// Include every application model and the legacy report collection: rejected
// requests and computed reports must not make indirect writes either.
async function snapshot() {
  const records = {};
  for (const [name, model] of Object.entries(state.context.models)) {
    records[name] = await model.find().sort('_id').lean();
  }
  records.reports = await state.context.connection.db
    .collection('reports')
    .find({})
    .sort({ _id: 1 })
    .toArray();
  return JSON.parse(JSON.stringify(records));
}

async function launch() {
  const response = await request('POST', '/evaluations/send', {});
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ emails_sent: 2, failed: [] });
  await waitForMessages(2);
  return state.context.models.Student.findById(state.fixture.students[0]._id);
}

async function foreignContext() {
  const { Professor, Course, Team, Student } = state.context.models;
  const professor = await Professor.create({
    name: 'Other Lifecycle Professor',
    email: 'other-lifecycle-professor@example.com',
    password: state.fixture.professor.password,
    department: 'Synthetic Testing',
  });
  const course = await Course.create({
    course_name: 'Preserved Course B',
    course_number: 'LIFE 2000',
    course_section: '02',
    semester: 'Synthetic Semester',
    professor_id: professor._id,
    student_count: 1,
    team_count: 1,
  });
  const team = await Team.create({
    team_name: 'Course B Team',
    course_id: course._id,
    student_count: 1,
  });
  const student = await Student.create({
    student_id: 'LIFE-B-01',
    name: 'Course B Student',
    email: 'lifecycle-b@example.com',
    course_id: course._id,
    team_id: team._id,
    evaluation_token: 'preserved-course-b-token',
    invitation_accepted_at: new Date('2026-01-01T00:00:00Z'),
    evaluation_completed: true,
  });
  team.students = [student._id];
  await team.save();
  await state.context.models.Evaluation.create({
    ...entry(student),
    course_id: course._id,
    evaluator_id: student._id,
    evaluation_token: student.evaluation_token,
  });
  return { course, student };
}

async function assertCancelled(token) {
  for (const [method, suffix, body, code] of [
    ['GET', '', undefined, 'EVALUATION_CANCELLED'],
    [
      'POST',
      '',
      { evaluations: [entry(state.fixture.students[1])] },
      'EVALUATION_CANCELLED',
    ],
    ['GET', '/status', undefined, 'INVALID_TOKEN'],
  ]) {
    const result = await jsonRequest(
      method,
      `/api/evaluate/${token}${suffix}`,
      body,
    );
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe(code);
  }
}

describe('priority evaluation lifecycle regressions', () => {
  it('REG-CW05-02 refuses an empty-roster launch without writes or email', async () => {
    await state.context.models.Student.deleteMany({
      course_id: state.fixture.course._id,
    });
    await state.context.models.Team.findByIdAndUpdate(state.fixture.team._id, {
      students: [],
      student_count: 0,
    });
    await state.context.models.Course.findByIdAndUpdate(
      state.fixture.course._id,
      { student_count: 0 },
    );
    const before = await snapshot();
    const result = await request('POST', '/evaluations/send', {});
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
    const status = await request('GET', '/evaluations/status');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({
      evaluations_sent: false,
      total_count: 0,
    });
    expect(await snapshot()).toEqual(before);
    await waitForMessages(0);
  });

  it('REG-CW05-04 resets a submitted lifecycle and preserves roster, teams, and Course B', async () => {
    const evaluator = await launch();
    await foreignContext();
    const submission = await jsonRequest(
      'POST',
      `/api/evaluate/${evaluator.evaluation_token}`,
      { evaluations: [entry(state.fixture.students[1])] },
    );
    expect(submission.status).toBe(201);
    const before = await snapshot();
    expect(
      before.Student.find((student) => student._id === evaluator.id)
        .evaluation_completed,
    ).toBe(true);
    const result = await request('DELETE', '/evaluations/reset');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      tokens_cleared: 2,
      evaluations_deleted: 1,
    });
    const after = await snapshot();
    const expectedStudents = before.Student.map((student) => {
      if (student.course_id !== state.fixture.course.id) return student;
      const {
        evaluation_token: _token,
        invitation_accepted_at: _accepted,
        ...roster
      } = student;
      return { ...roster, evaluation_completed: false };
    });
    expect.soft(after).toEqual({
      ...before,
      Student: expectedStudents,
      Evaluation: before.Evaluation.filter(
        (evaluation) => evaluation.course_id !== state.fixture.course.id,
      ),
    });
    const readBefore = await snapshot();
    const status = await request('GET', '/evaluations/status');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({
      evaluations_sent: false,
      completed_count: 0,
      total_count: 0,
    });
    await assertCancelled(evaluator.evaluation_token);
    expect(await snapshot()).toEqual(readBefore);
    await waitForMessages(2);
  });

  it('REG-CW06-03 rejects an altered known-good token on every public route', async () => {
    const evaluator = await launch();
    const token = evaluator.evaluation_token;
    const good = await jsonRequest('GET', `/api/evaluate/${token}`);
    expect(good.status).toBe(200);
    const altered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    const before = await snapshot();
    await assertCancelled(altered);
    expect(await snapshot()).toEqual(before);
    const stillValid = await jsonRequest(
      'GET',
      `/api/evaluate/${token}/status`,
    );
    expect(stillValid.body).toMatchObject({ valid: true, completed: false });
  });

  it('REG-CW06-04 limits a valid token to its assigned evaluator and course', async () => {
    const evaluator = await launch();
    const other = await foreignContext();
    const before = await snapshot();
    const form = await jsonRequest(
      'GET',
      `/api/evaluate/${evaluator.evaluation_token}?course_id=${other.course.id}&student_id=${other.student.id}`,
    );
    expect(form.status).toBe(200);
    expect(form.body.evaluator.student_id).toBe(evaluator.student_id);
    expect(form.body.course.name).toBe(state.fixture.course.course_name);
    expect(form.body.teammates.map((student) => student._id)).toEqual([
      state.fixture.students[1].id,
    ]);
    for (const recipient of [other.student, evaluator]) {
      const result = await jsonRequest(
        'POST',
        `/api/evaluate/${evaluator.evaluation_token}`,
        {
          course_id: other.course.id,
          evaluator_id: other.student.id,
          evaluations: [entry(recipient)],
        },
      );
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe('VALIDATION_ERROR');
      expect(await snapshot()).toEqual(before);
    }
    const accepted = await jsonRequest(
      'POST',
      `/api/evaluate/${evaluator.evaluation_token}`,
      {
        course_id: other.course.id,
        evaluator_id: other.student.id,
        evaluations: [entry(state.fixture.students[1])],
      },
    );
    expect(accepted.status).toBe(201);
    const saved = await state.context.models.Evaluation.find({
      evaluation_token: evaluator.evaluation_token,
    }).lean();
    expect(saved).toHaveLength(1);
    expect(saved[0].course_id.toString()).toBe(state.fixture.course.id);
    expect(saved[0].evaluator_id.toString()).toBe(evaluator.id);
    expect(saved[0].student_id.toString()).toBe(state.fixture.students[1].id);
    const after = await snapshot();
    // Submission increments the evaluator version to serialize concurrent requests.
    expect(after.Student).toEqual(
      before.Student.map((student) =>
        student._id === evaluator.id
          ? { ...student, evaluation_completed: true, __v: student.__v + 1 }
          : student,
      ),
    );
    expect(after.Course).toEqual(before.Course);
    expect(after.Team).toEqual(before.Team);
    expect(
      after.Evaluation.filter((record) => record.course_id === other.course.id),
    ).toEqual(before.Evaluation);
  });

  it('REG-CW09-04 reports and exports a missing response without inventing or misattributing it', async () => {
    const evaluator = await launch();
    const recipient = state.fixture.students[1];
    const submitted = await jsonRequest(
      'POST',
      `/api/evaluate/${evaluator.evaluation_token}`,
      { evaluations: [entry(recipient)] },
    );
    expect(submitted.status).toBe(201);
    const saved = await state.context.models.Evaluation.findOne({
      evaluator_id: evaluator._id,
    });
    expect(saved.student_id.toString()).toBe(recipient.id);
    // Simulate lost source data after completion, retaining contradictory flags
    // and an unrelated response to expose fabricated or cross-course values.
    const peer = await state.context.models.Student.findById(recipient._id);
    const reverse = await jsonRequest(
      'POST',
      `/api/evaluate/${peer.evaluation_token}`,
      {
        evaluations: [entry(evaluator)],
      },
    );
    expect(reverse.status).toBe(201);
    await saved.deleteOne();
    await foreignContext();
    const before = await snapshot();
    const report = await request('GET', '/reports');
    expect(report.status).toBe(200);
    expect(report.body.students).toHaveLength(2);
    for (const student of report.body.students) {
      const received = student._id === evaluator.id;
      expect(student).toMatchObject({
        originalScore: received ? 100 : 0,
        finalScore: received ? 100 : 0,
        letterGrade: received ? 'A' : 'No evaluations',
        evaluationsReceived: received ? 1 : 0,
      });
      expect(student.evaluationDetails).toHaveLength(received ? 1 : 0);
      expect(
        student.evaluationDetails.map((record) => record.evaluator_id),
      ).toEqual(received ? [recipient.id] : []);
    }
    expect(report.body.students.map((student) => student._id).sort()).toEqual(
      state.fixture.students.map((student) => student.id).sort(),
    );
    const csv = await apiRequest(
      'GET',
      `${coursePath()}/reports/download`,
      undefined,
      state.token,
    );
    expect(csv.status).toBe(200);
    const [header, ...rows] = (await csv.text()).trim().split('\n');
    expect(header).toBe(
      'Student ID,Name,Email,Team,Original Score,Final Score,Letter Grade,Evaluations Received,Improvement',
    );
    expect(rows.sort()).toEqual(
      state.fixture.students
        .map(
          (student) =>
            `${student.student_id},${student.name},${student.email},${state.fixture.team.team_name},${student.id === evaluator.id ? '100,100,A,1' : '0,0,No evaluations,0'},0`,
        )
        .sort(),
    );
    expect(await snapshot()).toEqual(before);
  });
});
