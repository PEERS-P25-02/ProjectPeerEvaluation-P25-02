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

const smtpEnvironment = vi.hoisted(() => {
  const original = process.env.SMTP_AUTH_REQUIRED;
  process.env.SMTP_AUTH_REQUIRED = 'false';
  return original;
});

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const Student = require('../models/Student.js');
const Evaluation = require('../models/Evaluation.js');
const { submitEvaluation } = require('../controllers/evaluationController.js');

const id = () => new mongoose.Types.ObjectId();
const courseId = id();
const student = { _id: id(), course_id: { _id: courseId }, team_id: null };
const peers = [id(), id()];
const session = {};
const validEntry = (studentId) => ({
  student_id: studentId,
  ratings: {
    professionalism: 5,
    communication: 4,
    work_ethic: 3,
    content_knowledge_skills: 2,
    overall_contribution: 1,
    participation: 4,
  },
  overall_feedback: 'Helpful and reliable teammate.',
});
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
const submit = async (evaluations) => {
  const res = response();
  const next = vi.fn();
  await submitEvaluation(
    { params: { token: 'token' }, body: { evaluations } },
    res,
    next,
  );
  return { res, next };
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(Student, 'findOne').mockReturnValue({
    populate: vi.fn().mockResolvedValue(student),
  });
  vi.spyOn(Student, 'find').mockReturnValue({
    select: vi.fn().mockResolvedValue(peers.map((_id) => ({ _id }))),
  });
  // The query supports both the early duplicate check and the session-bound one.
  vi.spyOn(Evaluation, 'findOne').mockReturnValue({
    then: (resolve) => Promise.resolve(null).then(resolve),
    session: vi.fn().mockResolvedValue(null),
  });
  vi.spyOn(Student, 'findOneAndUpdate').mockResolvedValue(student);
  vi.spyOn(Evaluation.prototype, 'save').mockResolvedValue();
  // This seam checks transaction usage; live integration tests verify rollback.
  vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
    async (callback) => callback(session),
  );
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => {
  if (smtpEnvironment === undefined) delete process.env.SMTP_AUTH_REQUIRED;
  else process.env.SMTP_AUTH_REQUIRED = smtpEnvironment;
});

describe('evaluation submission validation and transaction boundary', () => {
  it.each([
    ['missing rating', { ratings: {} }],
    ['short feedback', { overall_feedback: 'short' }],
    ['object feedback', { overall_feedback: {} }],
    ['null feedback', { overall_feedback: null }],
    ['numeric feedback', { overall_feedback: 42 }],
    [
      'rating above schema maximum',
      { ratings: { ...validEntry(peers[1]).ratings, professionalism: 6 } },
    ],
    [
      'participation above its separate maximum',
      { ratings: { ...validEntry(peers[1]).ratings, participation: 5 } },
    ],
    [
      'rating below schema minimum',
      { ratings: { ...validEntry(peers[1]).ratings, communication: 0 } },
    ],
    [
      'null rating',
      { ratings: { ...validEntry(peers[1]).ratings, communication: null } },
    ],
  ])(
    'rejects a later entry with %s before any writes',
    async (_label, invalid) => {
      const { res, next } = await submit([
        validEntry(peers[0]),
        { ...validEntry(peers[1]), ...invalid },
      ]);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'VALIDATION_ERROR', status: 400 }),
      );
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
      expect(Student.findOneAndUpdate).not.toHaveBeenCalled();
      expect(Evaluation.prototype.save).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    },
  );

  it('rejects duplicate eligible recipients before any writes', async () => {
    const { next } = await submit([validEntry(peers[0]), validEntry(peers[0])]);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR', status: 400 }),
    );
    expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    expect(Evaluation.prototype.save).not.toHaveBeenCalled();
  });

  it('saves multiple peers and completion with the same transaction session', async () => {
    const { res, next } = await submit(peers.map(validEntry));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ evaluations_count: 2 }),
    );
    expect(Student.findOneAndUpdate).toHaveBeenCalledExactlyOnceWith(
      { _id: student._id, evaluation_token: 'token' },
      { $set: { evaluation_completed: true }, $inc: { __v: 1 } },
      { session, new: true },
    );
    expect(
      Evaluation.findOne.mock.results[1].value.session,
    ).toHaveBeenCalledWith(session);
    expect(Evaluation.prototype.save).toHaveBeenCalledTimes(2);
    expect(Evaluation.prototype.save).toHaveBeenNthCalledWith(1, { session });
    expect(Evaluation.prototype.save).toHaveBeenNthCalledWith(2, { session });
    expect(Student.findOneAndUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      Evaluation.findOne.mock.invocationCallOrder[1],
    );
  });

  it('rechecks existing rows after the evaluator write even with a stale flag', async () => {
    Student.findOneAndUpdate.mockResolvedValue({
      ...student,
      evaluation_completed: false,
    });
    Evaluation.findOne.mockResolvedValueOnce(null).mockReturnValueOnce({
      session: vi.fn().mockResolvedValue({ _id: id() }),
    });
    const { next } = await submit(peers.map(validEntry));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ALREADY_COMPLETED', status: 409 }),
    );
    expect(Evaluation.prototype.save).not.toHaveBeenCalled();
  });

  it('rejects a token revoked before the transaction without saving evaluations', async () => {
    Student.findOneAndUpdate.mockResolvedValue(null);
    const { next } = await submit(peers.map(validEntry));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'EVALUATION_CANCELLED', status: 404 }),
    );
    expect(Evaluation.prototype.save).not.toHaveBeenCalled();
  });

  it('lets a later save failure reject the transaction and never responds with success', async () => {
    const failure = new Error('Second evaluation save failed');
    Evaluation.prototype.save
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(failure);
    const { res, next } = await submit(peers.map(validEntry));
    await expect(
      mongoose.connection.transaction.mock.results[0].value,
    ).rejects.toBe(failure);
    expect(next).toHaveBeenCalledWith(failure);
    expect(res.status).not.toHaveBeenCalled();
    expect(Evaluation.prototype.save).toHaveBeenNthCalledWith(2, { session });
  });
});
