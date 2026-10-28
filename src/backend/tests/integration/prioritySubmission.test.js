/*
 * Priority regression checks exercise real HTTP submissions and inspect MongoDB
 * independently. Invalid requests must preserve both responses and completion;
 * competing requests must leave one complete set of recipient responses.
 */
import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture } from './api.js';

const state = useIntegrationFixture({ login: false });
const token = 'priority-submission-synthetic-token';
const ratings = {
  professionalism: 5,
  communication: 4,
  work_ethic: 3,
  content_knowledge_skills: 2,
  overall_contribution: 1,
  participation: 4,
};

function entry(student, feedback = 'Constructive synthetic peer feedback.') {
  return {
    student_id: student.id,
    ratings: { ...ratings },
    overall_feedback: feedback,
  };
}

async function prepare() {
  const { Student, Team, Course } = state.context.models;
  await Student.findByIdAndUpdate(state.fixture.students[0]._id, {
    evaluation_token: token,
  });
  const third = await Student.create({
    student_id: 'PRIORITY003',
    name: 'Third Synthetic Submission Peer',
    email: 'priority-third@example.com',
    course_id: state.fixture.course._id,
    team_id: state.fixture.team._id,
    group_assignment: state.fixture.team.team_name,
  });
  await Team.findByIdAndUpdate(state.fixture.team._id, {
    $push: { students: third._id },
    $set: { student_count: 3 },
  });
  await Course.findByIdAndUpdate(state.fixture.course._id, {
    student_count: 3,
  });
  return [state.fixture.students[1], third];
}

async function snapshot() {
  const { Evaluation, Student } = state.context.models;
  return {
    evaluations: await Evaluation.find().sort('_id').lean(),
    students: await Student.find().sort('_id').lean(),
  };
}

function submit(evaluations) {
  return jsonRequest('POST', `/api/evaluate/${token}`, { evaluations });
}

async function expectRejectedWithoutWrites(evaluations) {
  const before = await snapshot();
  const response = await submit(evaluations);
  // Soft assertions retain the persistence evidence even when error mapping fails.
  expect.soft(response.status).toBe(400);
  expect.soft(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
  expect.soft(await snapshot()).toEqual(before);
}

describe('priority submission integrity through HTTP and MongoDB', () => {
  it('REG-CW08-04 prevents duplicate responses for a repeated recipient', async () => {
    const [peer] = await prepare();
    const before = await snapshot();
    const response = await submit([entry(peer), entry(peer)]);
    const after = await snapshot();
    // The requirement permits rejecting duplicates or accepting one consistent
    // response, but never saving multiple records for the same recipient.
    expect.soft([201, 400]).toContain(response.status);
    // Both duplicate-handling policies satisfy the requirement; verify the
    // corresponding persistence contract after identifying the API outcome.
    /* eslint-disable vitest/no-conditional-expect */
    if (response.status === 201) {
      expect.soft(response.body.evaluations_count).toBe(1);
      expect.soft(after.evaluations).toHaveLength(1);
      expect.soft(after.evaluations[0]).toMatchObject({
        student_id: peer._id,
        evaluator_id: state.fixture.students[0]._id,
        course_id: state.fixture.course._id,
        ratings,
        overall_feedback: entry(peer).overall_feedback,
      });
      const expected = before.students.map((student) =>
        student._id.toString() === state.fixture.students[0].id
          ? { ...student, evaluation_completed: true }
          : student,
      );
      expect.soft(after.students).toEqual(expected);
    } else {
      expect
        .soft(response.body.error)
        .toMatchObject({ code: 'VALIDATION_ERROR' });
      expect.soft(after).toEqual(before);
    }
    /* eslint-enable vitest/no-conditional-expect */
  });

  it('REG-CW08-06 preserves one complete response set for concurrent submissions', async () => {
    const peers = await prepare();
    const before = await snapshot();
    const inputs = [
      'First concurrent submission.',
      'Second concurrent submission.',
    ].map((feedback) => peers.map((peer) => entry(peer, feedback)));
    // Dispatch together without awaiting either request; distinct feedback reveals
    // a mixed partial result as well as straightforward duplicate insertion.
    const responses = await Promise.all(inputs.map(submit));
    expect
      .soft(responses.map(({ status }) => status).sort())
      .toEqual([201, 409]);
    const winner = responses.findIndex(({ status }) => status === 201);
    for (const response of responses.filter(({ status }) => status === 409)) {
      expect
        .soft(response.body.error)
        .toMatchObject({ code: 'ALREADY_COMPLETED' });
    }
    const after = await snapshot();
    expect.soft(after.evaluations).toHaveLength(peers.length);
    for (const peer of peers) {
      const saved = after.evaluations.filter(
        (record) => record.student_id.toString() === peer.id,
      );
      expect.soft(saved).toHaveLength(1);
      expect.soft(saved[0]).toMatchObject({
        course_id: state.fixture.course._id,
        evaluator_id: state.fixture.students[0]._id,
        ratings,
        evaluation_token: token,
        overall_feedback:
          inputs[winner === -1 ? 0 : winner][0].overall_feedback,
      });
    }
    const expected = before.students.map((student) =>
      student._id.toString() === state.fixture.students[0].id
        ? { ...student, evaluation_completed: true }
        : student,
    );
    expect.soft(after.students).toEqual(expected);
  });

  // Shared helper asserts both rejection and the complete database snapshot.
  // eslint-disable-next-line vitest/expect-expect
  it.each(['rating', 'feedback'])(
    'REG-CW08-07 rejects a later invalid %s without saving the earlier valid entry',
    async (field) => {
      const peers = await prepare();
      const entries = peers.map((peer) => entry(peer));
      if (field === 'rating') delete entries[1].ratings.professionalism;
      else entries[1].overall_feedback = ' short ';
      await expectRejectedWithoutWrites(entries);
    },
  );

  // Shared helper asserts both rejection and the complete database snapshot.
  // eslint-disable-next-line vitest/expect-expect
  it.each([
    ['participation', 5],
    ['participation', 0],
    ['professionalism', 6],
    ['communication', 0],
  ])(
    'REG-CW08-11 rejects %s rating %s without response or completion changes',
    async (criterion, value) => {
      const [peer] = await prepare();
      const input = entry(peer);
      input.ratings[criterion] = value;
      await expectRejectedWithoutWrites([input]);
    },
  );
});
