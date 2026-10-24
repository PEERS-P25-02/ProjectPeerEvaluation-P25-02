import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture, waitForMessages } from './api.js';
import { mailpitRequest } from './fixtures.js';

const state = useIntegrationFixture();
const normalized = (value) => JSON.parse(JSON.stringify(value));
const base = () => `/api/courses/${state.fixture.course.id}`;
const request = (method, suffix, body) =>
  jsonRequest(method, `${base()}${suffix}`, body, state.token);

async function snapshot() {
  const { Student, Evaluation } = state.context.models;
  return normalized(
    await Promise.all([
      Student.find().sort('_id').lean(),
      Evaluation.find().sort('_id').lean(),
    ]),
  );
}

async function foreignFixture() {
  const { Course, Team, Student } = state.context.models;
  const course = await Course.create({
    course_name: 'Unrelated Evaluation Course',
    course_number: 'EVAL 9999',
    course_section: '99',
    semester: 'Synthetic Semester',
    professor_id: state.fixture.professor._id,
  });
  const team = await Team.create({
    team_name: 'Unrelated Team',
    course_id: course._id,
  });
  const student = await Student.create({
    student_id: 'OTHER-EVAL-01',
    name: 'Unrelated Evaluator',
    email: 'unrelated-evaluator@example.com',
    course_id: course._id,
    team_id: team._id,
    evaluation_token: 'unrelated-evaluation-token',
  });
  return { course, team, student };
}

async function evaluationFor(course, evaluator, recipient) {
  return state.context.models.Evaluation.create({
    course_id: course._id,
    evaluator_id: evaluator._id,
    student_id: recipient._id,
    ratings: {
      professionalism: 4,
      communication: 4,
      work_ethic: 4,
      content_knowledge_skills: 4,
      overall_contribution: 4,
      participation: 3,
    },
    overall_feedback: 'Consistent collaboration and constructive project work.',
    evaluation_token: evaluator.evaluation_token || 'submitted-fixture-token',
    submitted_at: new Date('2026-01-02T03:04:05.000Z'),
  });
}

async function assignTokens() {
  const { Student } = state.context.models;
  for (const [index, student] of state.fixture.students.entries()) {
    await Student.findByIdAndUpdate(student._id, {
      evaluation_token: `fixture-evaluation-token-${index}`,
    });
  }
}

async function capturedContents(count) {
  const messages = await waitForMessages(count);
  return Promise.all(
    messages.map(async (message) => {
      // Each personalized token must go to exactly one intended recipient.
      if (message.To.length !== 1)
        throw new Error('Expected one recipient per individualized message');
      const detail = await mailpitRequest(
        process.env,
        `/api/v1/message/${message.ID}`,
      );
      return {
        recipient: message.To[0].Address,
        subject: message.Subject,
        detail: await detail.json(),
      };
    }),
  );
}

describe('evaluation management API and MongoDB/SMTP interactions', () => {
  it('EM-01 OP-33-21 persists distinct course tokens and captures exactly the intended invitations', async () => {
    const other = await foreignFixture();
    const sentinel = await state.context.models.Student.findById(
      other.student._id,
    ).lean();
    const result = await request('POST', '/evaluations/send', {
      deadline: '2026-12-01',
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      emails_sent: 2,
      total_students: 2,
      failed: [],
    });
    const stored = await state.context.models.Student.find({
      course_id: state.fixture.course._id,
    }).lean();
    expect(stored).toHaveLength(2);
    expect(
      new Set(stored.map((student) => student.evaluation_token)).size,
    ).toBe(2);
    const messages = await capturedContents(2);
    expect(messages.map((message) => message.recipient).sort()).toEqual(
      stored.map((student) => student.email).sort(),
    );
    for (const student of stored) {
      expect(student.evaluation_token).toEqual(expect.any(String));
      expect(student.evaluation_token.length).toBeGreaterThan(0);
      const message = messages.find(
        (entry) => entry.recipient === student.email,
      );
      expect(message.subject).toBe(
        `Peer Evaluation for ${state.fixture.course.course_name} - ${state.fixture.course.course_number}`,
      );
      expect(message.detail.HTML).toContain(
        `/evaluate/${student.evaluation_token}`,
      );
      expect(message.detail.HTML).toContain(student.name);
    }
    expect(
      await state.context.models.Student.findById(other.student._id).lean(),
    ).toEqual(sentinel);
    expect(await state.context.models.Evaluation.countDocuments()).toBe(0);
  });

  it('EM-02 OP-33-21 reuses an existing token while creating the missing token', async () => {
    const [first] = state.fixture.students;
    await state.context.models.Student.findByIdAndUpdate(first._id, {
      evaluation_token: 'existing-fixture-token',
    });
    const result = await request('POST', '/evaluations/send', {});
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      emails_sent: 2,
      total_students: 2,
      failed: [],
    });
    const stored = await state.context.models.Student.find({
      course_id: state.fixture.course._id,
    })
      .sort('_id')
      .lean();
    expect(
      stored.find((student) => String(student._id) === first.id)
        .evaluation_token,
    ).toBe('existing-fixture-token');
    const messages = await capturedContents(2);
    expect(messages.map((message) => message.recipient).sort()).toEqual(
      stored.map((student) => student.email).sort(),
    );
    for (const student of stored) {
      expect(student.evaluation_token).toEqual(expect.any(String));
      expect(student.evaluation_token.length).toBeGreaterThan(0);
      expect(
        messages.find((message) => message.recipient === student.email).detail
          .HTML,
      ).toContain(`/evaluate/${student.evaluation_token}`);
    }
    expect(await state.context.models.Evaluation.countDocuments()).toBe(0);
  });

  it('EM-03 OP-33-22 invites only students assigned to the requested team', async () => {
    const { Student, Team } = state.context.models;
    const [selected, unselected] = state.fixture.students;
    const secondTeam = await Team.create({
      team_name: 'Second Fixture Team',
      course_id: state.fixture.course._id,
      students: [unselected._id],
      student_count: 1,
    });
    await Student.findByIdAndUpdate(unselected._id, {
      team_id: secondTeam._id,
    });
    await Team.findByIdAndUpdate(state.fixture.team._id, {
      students: [selected._id],
      student_count: 1,
    });
    const before = await Student.findById(unselected._id).lean();
    const result = await request(
      'POST',
      `/teams/${state.fixture.team.id}/evaluations/send`,
      {},
    );
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      emails_sent: 1,
      total_students: 1,
      failed: [],
    });
    const stored = await Student.findById(selected._id).lean();
    expect(stored.evaluation_token).toEqual(expect.any(String));
    expect(stored.evaluation_token.length).toBeGreaterThan(0);
    const messages = await capturedContents(1);
    expect(messages[0].recipient).toBe(selected.email);
    expect(messages[0].detail.HTML).toContain(
      `/evaluate/${stored.evaluation_token}`,
    );
    expect(await Student.findById(unselected._id).lean()).toEqual(before);
    expect(await state.context.models.Evaluation.countDocuments()).toBe(0);
  });

  it('EM-04 OP-33-23 derives scoped status from actual evaluations despite contradictory flags', async () => {
    const { Student } = state.context.models;
    const [completed, pending] = state.fixture.students;
    await assignTokens();
    await Student.findByIdAndUpdate(completed._id, {
      evaluation_completed: false,
    });
    await Student.findByIdAndUpdate(pending._id, {
      evaluation_completed: true,
    });
    const evaluation = await evaluationFor(
      state.fixture.course,
      completed,
      pending,
    );
    const other = await foreignFixture();
    // An unrelated completed evaluator makes a missing course filter observable.
    await evaluationFor(other.course, other.student, other.student);
    const before = await snapshot();
    const result = await request('GET', '/evaluations/status');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      total_count: 2,
      completed_count: 1,
      pending_count: 1,
      completion_rate: 50,
      evaluations_sent: true,
    });
    expect(result.body.students).toHaveLength(2);
    expect(
      result.body.students.find(
        (student) => student.student_id === completed.student_id,
      ),
    ).toMatchObject({
      name: completed.name,
      email: completed.email,
      completed: true,
      last_activity: evaluation.submitted_at.toISOString(),
      evaluation_token: 'fixture-evaluation-token-0',
    });
    expect(
      result.body.students.find(
        (student) => student.student_id === pending.student_id,
      ),
    ).toMatchObject({
      name: pending.name,
      email: pending.email,
      completed: false,
      last_activity: null,
      evaluation_token: 'fixture-evaluation-token-1',
    });
    expect(await snapshot()).toEqual(before);
  });

  it('EM-05 OP-33-24 reminds only pending students in the selected course without data writes', async () => {
    const [completed, pending] = state.fixture.students;
    await assignTokens();
    await evaluationFor(state.fixture.course, completed, pending);
    await foreignFixture();
    const before = await snapshot();
    const result = await request('POST', '/evaluations/remind', {});
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      reminders_sent: 1,
      total_reminded: 1,
      failed: [],
    });
    const messages = await capturedContents(1);
    expect(messages[0].recipient).toBe(pending.email);
    expect(messages[0].subject).toBe(
      `Reminder: Peer Evaluation Due for ${state.fixture.course.course_name}`,
    );
    expect(messages[0].detail.HTML).toContain(
      '/evaluate/fixture-evaluation-token-1',
    );
    expect(await snapshot()).toEqual(before);
  });

  it('EM-06 OP-33-24 excludes completed and unselected students from selected reminders', async () => {
    const [completed, selected] = state.fixture.students;
    await assignTokens();
    await evaluationFor(state.fixture.course, completed, selected);
    await state.context.models.Student.create({
      student_id: 'UNSELECTED-PENDING',
      name: 'Unselected Pending',
      email: 'unselected-pending@example.com',
      course_id: state.fixture.course._id,
      evaluation_token: 'unselected-token',
    });
    const before = await snapshot();
    const result = await request('POST', '/evaluations/remind', {
      student_ids: [completed.id, selected.id],
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      reminders_sent: 1,
      total_reminded: 1,
      failed: [],
    });
    const messages = await capturedContents(1);
    expect(messages[0].recipient).toBe(selected.email);
    expect(messages[0].detail.HTML).toContain(
      '/evaluate/fixture-evaluation-token-1',
    );
    expect(await snapshot()).toEqual(before);
  });

  it('EM-07 OP-33-25 resets selected tokens and evaluations while retaining students and unrelated state', async () => {
    const { Student, Team, Course, Evaluation } = state.context.models;
    const [first, second] = state.fixture.students;
    await assignTokens();
    await evaluationFor(state.fixture.course, first, second);
    const other = await foreignFixture();
    await evaluationFor(other.course, other.student, other.student);
    const foreignBefore = await snapshot();
    const selectedBefore = await Student.find({
      course_id: state.fixture.course._id,
    })
      .sort('_id')
      .lean();
    const relationships = normalized(
      await Promise.all([
        Team.find().sort('_id').lean(),
        Course.find().sort('_id').lean(),
      ]),
    );
    const result = await request('DELETE', '/evaluations/reset');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      tokens_cleared: 2,
      evaluations_deleted: 1,
    });
    // Reset's bounded contract clears tokens/records; completion-flag lifecycle is deferred.
    const expected = selectedBefore.map(
      ({ evaluation_token: _token, ...student }) => student,
    );
    expect(
      await Student.find({ course_id: state.fixture.course._id })
        .sort('_id')
        .lean(),
    ).toEqual(expected);
    expect(
      await Evaluation.countDocuments({ course_id: state.fixture.course._id }),
    ).toBe(0);
    const foreignAfter = await snapshot();
    expect(
      foreignAfter[0].filter(
        (student) => student.course_id === other.course.id,
      ),
    ).toEqual(
      foreignBefore[0].filter(
        (student) => student.course_id === other.course.id,
      ),
    );
    expect(
      foreignAfter[1].filter(
        (evaluation) => evaluation.course_id === other.course.id,
      ),
    ).toEqual(
      foreignBefore[1].filter(
        (evaluation) => evaluation.course_id === other.course.id,
      ),
    );
    expect(
      normalized(
        await Promise.all([
          Team.find().sort('_id').lean(),
          Course.find().sort('_id').lean(),
        ]),
      ),
    ).toEqual(relationships);
  });

  it('EM-08 OP-33-22 rejects another course team without database writes or email', async () => {
    const other = await foreignFixture();
    const before = await snapshot();
    const result = await request(
      'POST',
      `/teams/${other.team.id}/evaluations/send`,
      {},
    );
    expect(result.status).toBe(404);
    expect(result.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(await snapshot()).toEqual(before);
    expect(await waitForMessages(0)).toEqual([]);
  });
});
