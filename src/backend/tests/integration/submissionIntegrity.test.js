/*
 * Submission integrity checks use the real API and the owned disposable MongoDB
 * database. A valid first peer must never survive a rejected later entry, and
 * simultaneous requests must commit one complete, coherent submission.
 */
import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture } from './api.js';

const state = useIntegrationFixture({ login: false });
const token = 'synthetic-submission-integrity-token';
const ratings = {
  professionalism: 5,
  communication: 4,
  work_ethic: 3,
  content_knowledge_skills: 2,
  overall_contribution: 1,
  participation: 4,
};

function entry(studentId, overrides = {}) {
  return {
    student_id: studentId.toString(),
    ratings: { ...ratings },
    overall_feedback: '  Constructive synthetic submission feedback.  ',
    ...overrides,
  };
}

async function prepareEntries() {
  const { Student, Team } = state.context.models;
  await Student.findByIdAndUpdate(state.fixture.students[0]._id, {
    evaluation_token: token,
  });
  const third = await Student.create({
    student_id: 'TEST003',
    name: 'Third Integrity Peer',
    email: 'third-integrity-peer@example.com',
    course_id: state.fixture.course._id,
    team_id: state.fixture.team._id,
  });
  await Team.findByIdAndUpdate(state.fixture.team._id, {
    $push: { students: third._id },
    $set: { student_count: 3 },
  });
  return [entry(state.fixture.students[1]._id), entry(third._id)];
}

async function snapshot() {
  const { Student, Evaluation } = state.context.models;
  return {
    students: await Student.find().sort('_id').lean(),
    evaluations: await Evaluation.find().sort('_id').lean(),
  };
}

function submit(evaluations) {
  return jsonRequest('POST', `/api/evaluate/${token}`, { evaluations });
}

async function expectSuccessfulSubmission(entries, before) {
  const { Student, Evaluation } = state.context.models;
  const saved = await Evaluation.find().lean();
  expect(saved).toHaveLength(entries.length);
  for (const input of entries) {
    const record = saved.find(
      (evaluation) => evaluation.student_id.toString() === input.student_id,
    );
    expect(record).toBeDefined();
    expect(record.course_id.toString()).toBe(state.fixture.course.id);
    expect(record.evaluator_id.toString()).toBe(state.fixture.students[0].id);
    expect(record).toMatchObject({
      ratings: input.ratings,
      overall_feedback: input.overall_feedback.trim(),
      evaluation_token: token,
    });
  }
  // Only the evaluator's completion and transaction serialization version change.
  const expected = before.students.map((student) =>
    student._id.toString() === state.fixture.students[0].id
      ? {
          ...student,
          evaluation_completed: true,
          __v: student.__v + 1,
        }
      : student,
  );
  expect(await Student.find().sort('_id').lean()).toEqual(expected);
}

async function expectRejectedWithoutWritesThenRetry(invalid, valid, before) {
  const rejected = await submit(invalid);
  expect(rejected.status).toBe(400);
  expect(rejected.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
  expect(await snapshot()).toEqual(before);
  // Rejection must also leave the evaluator able to submit a corrected request.
  const retried = await submit(valid);
  expect(retried.status).toBe(201);
  await expectSuccessfulSubmission(valid, before);
  return retried;
}

describe('public submission atomicity and concurrency', () => {
  it('REG-CW08-04 rejects duplicate recipients without writes and permits a corrected retry', async () => {
    const valid = await prepareEntries();
    const before = await snapshot();
    const retried = await expectRejectedWithoutWritesThenRetry(
      [valid[0], { ...valid[0], ratings: { ...ratings } }],
      valid,
      before,
    );
    expect(retried.body.evaluations_count).toBe(2);
  });

  it.each([
    {
      name: 'missing rating',
      invalidate(input) {
        delete input.ratings.professionalism;
      },
    },
    {
      name: 'rating below its minimum',
      invalidate(input) {
        input.ratings.professionalism = 0;
      },
    },
    {
      name: 'rating above its maximum',
      invalidate(input) {
        input.ratings.professionalism = 6;
      },
    },
    {
      name: 'participation above its distinct maximum',
      invalidate(input) {
        input.ratings.participation = 5;
      },
    },
    {
      name: 'nonnumeric string rating',
      invalidate(input) {
        input.ratings.professionalism = 'invalid';
      },
    },
    {
      name: 'null rating',
      invalidate(input) {
        input.ratings.professionalism = null;
      },
    },
    {
      name: 'short trimmed feedback',
      invalidate(input) {
        input.overall_feedback = ' short ';
      },
    },
    {
      name: 'non-string feedback',
      invalidate(input) {
        input.overall_feedback = 1234567890;
      },
    },
  ])(
    'REG-CW08-07 rejects later $name without writes and permits retry',
    async ({ invalidate }) => {
      const valid = await prepareEntries();
      const invalid = structuredClone(valid);
      invalidate(invalid[1]);
      const before = await snapshot();
      const retried = await expectRejectedWithoutWritesThenRetry(
        invalid,
        valid,
        before,
      );
      expect(retried.body.evaluations_count).toBe(2);
    },
  );

  it.each([false, true])(
    'REG-CW08-06 commits one coherent concurrent submission with initial completion flag %s',
    async (completed) => {
      const valid = await prepareEntries();
      // A stale completed flag must still serialize competing requests: setting an
      // already-true flag alone would not force MongoDB to detect a write conflict.
      await state.context.models.Student.findByIdAndUpdate(
        state.fixture.students[0]._id,
        { evaluation_completed: completed },
      );
      const before = await snapshot();
      // Distinct request markers detect a mixture of recipients from different winners.
      const requests = Array.from({ length: 8 }, (_, requestIndex) =>
        valid.map((input, recipientIndex) =>
          entry(input.student_id, {
            ratings: {
              ...ratings,
              professionalism: (requestIndex % 5) + 1,
              participation: (requestIndex % 4) + 1,
            },
            overall_feedback: `Request ${requestIndex}, peer ${recipientIndex}: coherent synthetic feedback.`,
          }),
        ),
      );
      const responses = await Promise.all(requests.map(submit));
      const winners = responses.flatMap((response, index) =>
        response.status === 201 ? [index] : [],
      );
      expect(winners).toHaveLength(1);
      expect(responses[winners[0]].body.evaluations_count).toBe(2);
      for (const response of responses.filter(({ status }) => status !== 201)) {
        expect(response.status).toBe(409);
        expect(response.body.error).toMatchObject({
          code: 'ALREADY_COMPLETED',
        });
      }
      await expectSuccessfulSubmission(requests[winners[0]], before);
    },
  );

  it('REG-CW08-07 rolls back a later database failure and permits retry', async () => {
    const valid = await prepareEntries();
    const before = await snapshot();
    const { connection, models } = state.context;
    const collectionName = models.Evaluation.collection.collectionName;
    const [collection] = await connection.db
      .listCollections({ name: collectionName })
      .toArray();
    const original = collection.options;
    let rejected;
    try {
      // A disposable collection validator makes MongoDB reject only the second
      // recipient after application validation succeeds; no API mocking is used.
      await connection.db.command({
        collMod: collectionName,
        validator: {
          student_id: {
            $ne: state.context.models.Student.base.Types.ObjectId.createFromHexString(
              valid[1].student_id,
            ),
          },
        },
        validationLevel: 'strict',
        validationAction: 'error',
      });
      rejected = await submit(valid);
    } finally {
      // Always restore database policy, including when the request or assertion fails.
      await connection.db.command({
        collMod: collectionName,
        validator: original.validator ?? {},
        validationLevel: original.validationLevel ?? 'strict',
        validationAction: original.validationAction ?? 'error',
      });
    }
    expect(rejected.status).toBe(500);
    expect(await snapshot()).toEqual(before);
    const retried = await submit(valid);
    expect(retried.status).toBe(201);
    expect(retried.body.evaluations_count).toBe(2);
    await expectSuccessfulSubmission(valid, before);
  });
});
