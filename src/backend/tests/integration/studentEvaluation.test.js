/*
 * These checks cover students opening an evaluation link and submitting their work.
 * Public evaluation routes use the actual API and a separate MongoDB connection.
 * Each case restores synthetic fixtures. Recipient authorization, later-entry
 * partial writes and concurrent submissions remain separate integrity concerns.
 *
 * TLDR: real requests and an independent database connection verify token
 * identity, rubric data, saved submissions, completion, and rejected writes.
 */
import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture } from './api.js';

const state = useIntegrationFixture({ login: false });
const token = 'synthetic-student-evaluation-token';
const ratings = {
  professionalism: 5,
  communication: 4,
  work_ethic: 3,
  content_knowledge_skills: 2,
  overall_contribution: 1,
  participation: 4,
};

async function assignToken() {
  await state.context.models.Student.findByIdAndUpdate(
    state.fixture.students[0]._id,
    { evaluation_token: token },
  );
}

function entry(studentId, overrides = {}) {
  return {
    student_id: studentId.toString(),
    ratings: { ...ratings },
    overall_feedback: '  Thoughtful and constructive synthetic feedback.  ',
    ...overrides,
  };
}

// Failed submissions must leave all relevant records untouched, not merely return an error.
async function snapshot() {
  const { Student, Evaluation } = state.context.models;
  return {
    students: await Student.find().sort('_id').lean(),
    evaluations: await Evaluation.find().sort('_id').lean(),
  };
}

async function foreignStudent() {
  const { Course, Student } = state.context.models;
  const course = await Course.create({
    course_name: 'Foreign Synthetic Course',
    course_number: 'OTHER 3300',
    course_section: '02',
    semester: 'Synthetic Semester',
    professor_id: state.fixture.professor._id,
  });
  return Student.create({
    student_id: 'OTHER001',
    name: 'Foreign Synthetic Student',
    email: 'foreign-student@example.com',
    course_id: course._id,
  });
}

describe('public student evaluation API and database interactions', () => {
  it('OP-33-26 resolves stored identity, exact teammates and the six-criterion rubric', async () => {
    await assignToken();
    await foreignStudent();
    const { Team, Student } = state.context.models;
    const otherTeam = await Team.create({
      team_name: 'Other Synthetic Team',
      course_id: state.fixture.course._id,
    });
    await Student.create({
      student_id: 'OTHERTEAM001',
      name: 'Other Team Student',
      email: 'other-team@example.com',
      course_id: state.fixture.course._id,
      team_id: otherTeam._id,
    });
    const before = await snapshot();
    const response = await jsonRequest('GET', `/api/evaluate/${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token,
      evaluator: {
        name: state.fixture.students[0].name,
        student_id: state.fixture.students[0].student_id,
        team: state.fixture.team.team_name,
      },
      course: {
        name: state.fixture.course.course_name,
        number: state.fixture.course.course_number,
        section: state.fixture.course.course_section,
        semester: state.fixture.course.semester,
      },
    });
    expect(response.body.teammates).toEqual([
      {
        _id: state.fixture.students[1].id,
        name: state.fixture.students[1].name,
        student_id: state.fixture.students[1].student_id,
      },
    ]);
    expect(
      response.body.rubric.criteria.map(({ id, scale, required }) => ({
        id,
        scale,
        required,
      })),
    ).toEqual([
      { id: 'professionalism', scale: '1-5', required: true },
      { id: 'communication', scale: '1-5', required: true },
      { id: 'work_ethic', scale: '1-5', required: true },
      { id: 'content_knowledge_skills', scale: '1-5', required: true },
      { id: 'overall_contribution', scale: '1-5', required: true },
      { id: 'participation', scale: '1-4', required: true },
    ]);
    expect(response.body.rubric.overallFeedback).toMatchObject({
      required: true,
      minLength: 10,
    });
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-26 falls back to course peers for a student without a team', async () => {
    await assignToken();
    await foreignStudent();
    const { Student, Team } = state.context.models;
    await Student.findByIdAndUpdate(state.fixture.students[0]._id, {
      team_id: null,
      group_assignment: null,
    });
    await Team.findByIdAndUpdate(state.fixture.team._id, {
      $pull: { students: state.fixture.students[0]._id },
      $set: { student_count: 1 },
    });
    const before = await snapshot();
    const response = await jsonRequest('GET', `/api/evaluate/${token}`);
    expect(response.status).toBe(200);
    expect(response.body.evaluator.team).toBe('No Team');
    expect(response.body.teammates.map((student) => student._id)).toEqual([
      state.fixture.students[1].id,
    ]);
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-27 persists two distinct peer entries and completes only their evaluator', async () => {
    await assignToken();
    const { Student, Team, Evaluation } = state.context.models;
    const third = await Student.create({
      student_id: 'TEST003',
      name: 'Third Synthetic Peer',
      email: 'third-peer@example.com',
      course_id: state.fixture.course._id,
      team_id: state.fixture.team._id,
    });
    await Team.findByIdAndUpdate(state.fixture.team._id, {
      $push: { students: third._id },
      $set: { student_count: 3 },
    });
    const entries = [
      entry(state.fixture.students[1]._id),
      entry(third._id, {
        ratings: {
          professionalism: 2,
          communication: 3,
          work_ethic: 4,
          content_knowledge_skills: 5,
          overall_contribution: 3,
          participation: 2,
        },
        overall_feedback: '  Distinct feedback for the third synthetic peer.  ',
      }),
    ];
    const before = await Student.find().sort('_id').lean();
    const started = Date.now();
    const response = await jsonRequest('POST', `/api/evaluate/${token}`, {
      evaluations: entries,
    });
    const finished = Date.now();
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      evaluations_count: 2,
      message: 'Evaluation submitted successfully.',
    });
    const saved = await Evaluation.find().lean();
    expect(saved).toHaveLength(2);
    for (const input of entries) {
      const evaluation = saved.find(
        (record) => record.student_id.toString() === input.student_id,
      );
      expect(evaluation).toBeDefined();
      expect(evaluation.course_id.toString()).toBe(state.fixture.course.id);
      expect(evaluation.evaluator_id.toString()).toBe(
        state.fixture.students[0].id,
      );
      expect(evaluation).toMatchObject({
        ratings: input.ratings,
        overall_feedback: input.overall_feedback.trim(),
        evaluation_token: token,
      });
      expect(evaluation.submitted_at.getTime()).toBeGreaterThanOrEqual(started);
      expect(evaluation.submitted_at.getTime()).toBeLessThanOrEqual(finished);
    }
    // Comparing all students detects accidental completion of recipients too.
    const expected = before.map((student) =>
      student._id.toString() === state.fixture.students[0].id
        ? { ...student, evaluation_completed: true }
        : student,
    );
    expect(await Student.find().sort('_id').lean()).toEqual(expected);
  });

  it('OP-33-27 rejects a repeat submission without overwriting the saved feedback', async () => {
    await assignToken();
    const first = await jsonRequest('POST', `/api/evaluate/${token}`, {
      evaluations: [entry(state.fixture.students[1]._id)],
    });
    expect(first.status).toBe(201);
    const before = await snapshot();
    const response = await jsonRequest('POST', `/api/evaluate/${token}`, {
      evaluations: [
        entry(state.fixture.students[1]._id, {
          overall_feedback:
            'Changed feedback must not overwrite prior records.',
        }),
      ],
    });
    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: 'ALREADY_COMPLETED' });
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-27 rejects an empty submission without persisting records or completion', async () => {
    await assignToken();
    const before = await snapshot();
    const response = await jsonRequest('POST', `/api/evaluate/${token}`, {
      evaluations: [],
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-27 rejects a missing first-entry rating before any write', async () => {
    await assignToken();
    const input = entry(state.fixture.students[1]._id);
    delete input.ratings.professionalism;
    const before = await snapshot();
    const response = await jsonRequest('POST', `/api/evaluate/${token}`, {
      evaluations: [input],
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-27 rejects short first-entry feedback before any write', async () => {
    await assignToken();
    const before = await snapshot();
    const response = await jsonRequest('POST', `/api/evaluate/${token}`, {
      evaluations: [
        entry(state.fixture.students[1]._id, { overall_feedback: ' short ' }),
      ],
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-26 OP-33-27 OP-33-28 rejects unassigned tokens on all public routes without writes', async () => {
    const before = await snapshot();
    const form = await jsonRequest(
      'GET',
      '/api/evaluate/unassigned-synthetic-token',
    );
    const submitted = await jsonRequest(
      'POST',
      '/api/evaluate/unassigned-synthetic-token',
      { evaluations: [entry(state.fixture.students[1]._id)] },
    );
    const status = await jsonRequest(
      'GET',
      '/api/evaluate/unassigned-synthetic-token/status',
    );
    expect(form.status).toBe(404);
    expect(form.body.error).toMatchObject({ code: 'EVALUATION_CANCELLED' });
    expect(submitted.status).toBe(404);
    expect(submitted.body.error).toMatchObject({
      code: 'EVALUATION_CANCELLED',
    });
    expect(status.status).toBe(404);
    expect(status.body.error).toMatchObject({ code: 'INVALID_TOKEN' });
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-28 reports pending from the absence of evaluations despite a stale completion flag', async () => {
    await assignToken();
    await state.context.models.Student.findByIdAndUpdate(
      state.fixture.students[0]._id,
      { evaluation_completed: true },
    );
    const before = await snapshot();
    const response = await jsonRequest('GET', `/api/evaluate/${token}/status`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      valid: true,
      completed: false,
      student_name: state.fixture.students[0].name,
      course_name: state.fixture.course.course_name,
    });
    expect(await snapshot()).toEqual(before);
  });

  it('OP-33-26 OP-33-28 reports stored submission completion even with an unset completion flag', async () => {
    await assignToken();
    const submittedAt = new Date('2026-01-02T03:04:05.000Z');
    await state.context.models.Evaluation.create({
      course_id: state.fixture.course._id,
      student_id: state.fixture.students[1]._id,
      evaluator_id: state.fixture.students[0]._id,
      ratings,
      overall_feedback: 'Previously submitted synthetic feedback.',
      evaluation_token: token,
      submitted_at: submittedAt,
    });
    const before = await snapshot();
    const status = await jsonRequest('GET', `/api/evaluate/${token}/status`);
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ valid: true, completed: true });
    const form = await jsonRequest('GET', `/api/evaluate/${token}`);
    expect(form.status).toBe(200);
    expect(form.body).toEqual({
      message: 'Evaluation already completed.',
      completed: true,
      submitted_at: submittedAt.toISOString(),
    });
    expect(await snapshot()).toEqual(before);
  });
});
