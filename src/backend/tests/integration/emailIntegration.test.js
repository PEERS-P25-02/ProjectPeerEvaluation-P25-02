// REG-CW07-01/02/03/04 invitation delivery through the real API and Mailpit.
// REG-CW06-02 is checked through API token resolution; this is not browser E2E.

import { describe, expect, it } from 'vitest';
import { jsonRequest, useIntegrationFixture, waitForMessages } from './api.js';
import { mailpitRequest } from './fixtures.js';

const state = useIntegrationFixture();
const base = () => `/api/courses/${state.fixture.course.id}`;
const request = (method, suffix, body) =>
  jsonRequest(method, `${base()}${suffix}`, body, state.token);

async function chaosConfiguration() {
  const response = await mailpitRequest(process.env, '/api/v1/chaos');
  return response.json();
}

async function setChaos(configuration) {
  const response = await mailpitRequest(process.env, '/api/v1/chaos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configuration),
  });
  return response.status;
}

async function capturedMessages(expectedCount) {
  const messages = await waitForMessages(expectedCount);
  return Promise.all(
    messages.map(async (message) => {
      const response = await mailpitRequest(
        process.env,
        `/api/v1/message/${message.ID}`,
      );
      return { message, detail: await response.json() };
    }),
  );
}

async function makeForeignCourse() {
  const { Professor, Course, Team, Student } = state.context.models;
  const professor = await Professor.create({
    name: 'Other Email Professor',
    email: 'other-email-professor@example.com',
    password: state.fixture.professor.password,
    department: 'Synthetic Testing',
  });
  const course = await Course.create({
    course_name: 'Unrelated Email Course',
    course_number: 'EMAIL 9999',
    course_section: '99',
    semester: 'Synthetic Semester',
    professor_id: professor._id,
  });
  const team = await Team.create({
    team_name: 'Unrelated Email Team',
    course_id: course._id,
  });
  const student = await Student.create({
    student_id: 'OTHER-EMAIL-01',
    name: 'Unrelated Email Student',
    email: 'unrelated-email-student@example.com',
    course_id: course._id,
    team_id: team._id,
    evaluation_token: 'unrelated-email-token',
  });
  return { professor, course, team, student };
}

async function foreignSnapshot(foreign) {
  const { Professor, Course, Team, Student, Evaluation } = state.context.models;
  const [professor, course, team, student, evaluations] = await Promise.all([
    Professor.findById(foreign.professor._id).lean(),
    Course.findById(foreign.course._id).lean(),
    Team.findById(foreign.team._id).lean(),
    Student.findById(foreign.student._id).lean(),
    Evaluation.find({ course_id: foreign.course._id }).sort('_id').lean(),
  ]);
  return { professor, course, team, student, evaluations };
}

async function splitFixtureTeam() {
  const { Student, Team } = state.context.models;
  const selected = state.fixture.students[0];
  const unselected = state.fixture.students[1];
  const secondTeam = await Team.create({
    team_name: 'Unselected Email Team',
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
  return { selected, unselected };
}

function invitationEndpoint(scope) {
  if (scope === 'course') return '/evaluations/send';
  return `/teams/${state.fixture.team.id}/evaluations/send`;
}

function emailLink(token) {
  return `http://localhost:3000/#/evaluate/${token}`;
}

async function verifyInvitationAndContext(student, detail, course) {
  const { message } = detail;
  const email = detail.detail;
  const token = student.evaluation_token;
  expect(message.To.map(({ Address }) => Address)).toEqual([student.email]);
  expect(message.Cc ?? []).toEqual([]);
  expect(message.Bcc ?? []).toEqual([]);
  expect(message.Subject).toBe(
    `Peer Evaluation for ${course.course_name} - ${course.course_number}`,
  );
  expect(email.From.Address).toBe('peers-test@example.com');
  expect(email.HTML).toContain(`Dear ${student.name},`);
  expect(email.HTML).toContain(course.course_name);
  expect(email.HTML).toContain(course.course_number);
  expect(email.HTML).toContain(course.course_section);
  expect(email.HTML).toContain(course.semester);
  expect(email.HTML).toContain(new Date('2026-12-01').toLocaleDateString());
  expect(email.HTML).toContain(`href="${emailLink(token)}"`);
  expect(email.HTML.split(emailLink(token))).toHaveLength(3);

  const response = await fetch(
    `${process.env.API_BASE_URL}/api/evaluate/${token}`,
    { signal: AbortSignal.timeout(5000) },
  );
  expect(response.status).toBe(200);
  const context = await response.json();
  expect(context).toMatchObject({
    evaluator: { name: student.name, student_id: student.student_id },
    course: {
      name: course.course_name,
      number: course.course_number,
      section: course.course_section,
      semester: course.semester,
    },
    token,
  });
  const expectedTeammates = await state.context.models.Student.find({
    course_id: student.course_id,
    ...(student.team_id ? { team_id: student.team_id } : { team_id: null }),
    _id: { $ne: student._id },
  })
    .select('_id name student_id')
    .sort('_id')
    .lean();
  expect(context.teammates).toEqual(
    expectedTeammates.map(({ _id, name, student_id }) => ({
      _id: String(_id),
      name,
      student_id,
    })),
  );
  return token;
}

describe('evaluation invitation SMTP integration', () => {
  it('REG-CW07-01/02/04 course invitations contain the stored link and resolve to each student context', async () => {
    const other = await makeForeignCourse();
    const otherBefore = await foreignSnapshot(other);
    const deadline = '2026-12-01';
    const result = await request('POST', '/evaluations/send', { deadline });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      emails_sent: state.fixture.students.length,
      total_students: state.fixture.students.length,
      failed: [],
    });
    const students = await state.context.models.Student.find({
      course_id: state.fixture.course._id,
    }).lean();
    const messages = await capturedMessages(students.length);
    expect(messages).toHaveLength(students.length);
    for (const student of students) {
      const captured = messages.find(
        ({ message }) => message.To[0].Address === student.email,
      );
      expect(captured).toBeDefined();
      await verifyInvitationAndContext(student, captured, state.fixture.course);
    }
    expect(await foreignSnapshot(other)).toEqual(otherBefore);
  });

  it('REG-CW07-01/02/04 team invitation contains the stored link and resolves to the selected student context', async () => {
    const other = await makeForeignCourse();
    const otherBefore = await foreignSnapshot(other);
    const { selected, unselected } = await splitFixtureTeam();
    const result = await request('POST', invitationEndpoint('team'), {
      deadline: '2026-12-01',
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      emails_sent: 1,
      total_students: 1,
      failed: [],
    });
    const stored = await state.context.models.Student.findById(
      selected._id,
    ).lean();
    const [captured] = await capturedMessages(1);
    await verifyInvitationAndContext(stored, captured, state.fixture.course);
    expect(captured.message.To.map(({ Address }) => Address)).toEqual([
      selected.email,
    ]);
    expect(captured.message.To.map(({ Address }) => Address)).not.toContain(
      unselected.email,
    );
    expect(captured.message.To.map(({ Address }) => Address)).not.toContain(
      other.student.email,
    );
    expect(await foreignSnapshot(other)).toEqual(otherBefore);
  });

  it.each([
    ['course', 'Sender'],
    ['course', 'Recipient'],
    ['team', 'Sender'],
    ['team', 'Recipient'],
  ])(
    'REG-CW07-03 %s invitations recover after Mailpit %s rejection and reuse persisted tokens',
    async (scope, failingStage) => {
      const other = await makeForeignCourse();
      const teamFixture = scope === 'team' ? await splitFixtureTeam() : null;
      const targeted = teamFixture
        ? [teamFixture.selected]
        : state.fixture.students;
      const students = state.context.models.Student;
      const courseBefore = await students
        .find({ course_id: state.fixture.course._id })
        .sort('_id')
        .lean();
      const otherBefore = await students.findById(other.student._id).lean();
      const foreignBefore = await foreignSnapshot(other);
      const initialContext = await chaosConfiguration();
      const failing = {
        ...initialContext,
        [failingStage]: {
          ...initialContext[failingStage],
          ErrorCode: failingStage === 'Sender' ? 451 : 451,
          Probability: 100,
        },
      };

      let failedResult;
      let restoreError;
      try {
        const applied = await setChaos(failing);
        expect(applied).toBeGreaterThanOrEqual(200);
        expect(applied).toBeLessThan(300);
        expect(await chaosConfiguration()).toEqual(failing);
        failedResult = await request('POST', invitationEndpoint(scope), {
          deadline: '2026-12-01',
        });
      } finally {
        try {
          const restoredStatus = await setChaos(initialContext);
          expect(restoredStatus).toBeGreaterThanOrEqual(200);
          expect(restoredStatus).toBeLessThan(300);
          expect(await chaosConfiguration()).toEqual(initialContext);
        } catch (error) {
          restoreError = error;
        }
      }
      if (restoreError) throw restoreError;

      expect(failedResult.status).toBe(502);
      expect(failedResult.body.emails_sent).toBe(0);
      expect(failedResult.body.total_students).toBe(targeted.length);
      expect(failedResult.body.failed).toHaveLength(targeted.length);
      expect(failedResult.body.message).toMatch(/fail/i);
      expect(failedResult.body.message).not.toMatch(/success/i);
      for (const student of targeted) {
        expect(failedResult.body.failed.join('\n')).toContain(student.email);
        expect(failedResult.body.failed.join('\n')).toMatch(/451/);
      }
      const afterFailure = await students
        .find({ course_id: state.fixture.course._id })
        .sort('_id')
        .lean();
      const targetedIds = new Set(
        targeted.map((student) => String(student._id)),
      );
      const nonEmptyString = expect.any(String);
      const expectedStudentsAfterFailure = courseBefore.map((before) => {
        const { evaluation_token: beforeToken, ...fields } = before;
        return {
          ...fields,
          evaluation_token: targetedIds.has(String(before._id))
            ? beforeToken || nonEmptyString
            : beforeToken,
        };
      });
      expect(afterFailure).toEqual(expectedStudentsAfterFailure);
      const targetedTokens = afterFailure
        .filter((student) => targetedIds.has(String(student._id)))
        .map((student) => student.evaluation_token);
      for (const token of targetedTokens) {
        expect(token).toEqual(nonEmptyString);
        expect(token.length).toBeGreaterThan(0);
      }
      expect(new Set(targetedTokens).size).toBe(targetedTokens.length);
      expect(await students.findById(other.student._id).lean()).toEqual(
        otherBefore,
      );
      expect(await foreignSnapshot(other)).toEqual(foreignBefore);
      expect(await state.context.models.Evaluation.countDocuments()).toBe(0);
      for (const student of targeted) {
        expect(
          afterFailure.find(
            (entry) => String(entry._id) === String(student._id),
          ).invitation_accepted_at,
        ).toBeUndefined();
      }
      const statusAfterFailure = await request('GET', '/evaluations/status');
      expect(statusAfterFailure.status).toBe(200);
      expect(statusAfterFailure.body.evaluations_sent).toBe(false);
      const tokensAfterFailure = new Map(
        afterFailure.map((student) => [
          String(student._id),
          student.evaluation_token,
        ]),
      );
      const failedInbox = await mailpitRequest(process.env, '/api/v1/messages');
      expect((await failedInbox.json()).messages).toHaveLength(0);

      const retryStartedAt = Date.now();
      const retry = await request('POST', invitationEndpoint(scope), {
        deadline: '2026-12-01',
      });
      const retryFinishedAt = Date.now();
      expect(retry.status).toBe(200);
      expect(retry.body).toMatchObject({
        emails_sent: targeted.length,
        total_students: targeted.length,
        failed: [],
      });
      const stored = await students
        .find({ _id: { $in: targeted.map((student) => student._id) } })
        .lean();
      const messages = await capturedMessages(targeted.length);
      expect(messages).toHaveLength(targeted.length);
      for (const student of stored) {
        expect(student.evaluation_token).toBeTruthy();
        expect(student.evaluation_token).toBe(
          tokensAfterFailure.get(String(student._id)),
        );
        const captured = messages.find(
          ({ message }) => message.To[0].Address === student.email,
        );
        expect(captured).toBeDefined();
        await verifyInvitationAndContext(
          student,
          captured,
          state.fixture.course,
        );
        expect(student.invitation_accepted_at).toBeInstanceOf(Date);
        expect(student.invitation_accepted_at.getTime()).toBeGreaterThanOrEqual(
          retryStartedAt,
        );
        expect(student.invitation_accepted_at.getTime()).toBeLessThanOrEqual(
          retryFinishedAt,
        );
      }
      const statusAfterRetry = await request('GET', '/evaluations/status');
      expect(statusAfterRetry.status).toBe(200);
      expect(statusAfterRetry.body.evaluations_sent).toBe(true);
      const statusByEmail = new Map(
        statusAfterRetry.body.students.map((student) => [
          student.email,
          student,
        ]),
      );
      const allCourseStudents = await students
        .find({ course_id: state.fixture.course._id })
        .lean();
      for (const student of allCourseStudents) {
        const status = statusByEmail.get(student.email);
        expect(status).toBeDefined();
        expect(status.evaluation_token).toBe(student.evaluation_token);
        expect(status.invitation_accepted_at).toBe(
          student.invitation_accepted_at
            ? student.invitation_accepted_at.toISOString()
            : null,
        );
      }
      expect(await foreignSnapshot(other)).toEqual(foreignBefore);
      expect(await students.findById(other.student._id).lean()).toEqual(
        otherBefore,
      );
    },
  );

  it('REG-CW07-03 already accepted invitations stay accepted after a failed resend', async () => {
    const initial = await request('POST', '/evaluations/send', {});
    expect(initial.status).toBe(200);
    expect(initial.body.emails_sent).toBe(state.fixture.students.length);
    const initialMessages = await capturedMessages(
      state.fixture.students.length,
    );
    expect(initialMessages).toHaveLength(state.fixture.students.length);

    const { Student } = state.context.models;
    const acceptedBefore = await Student.find({
      course_id: state.fixture.course._id,
    })
      .sort('_id')
      .lean();
    for (const student of acceptedBefore) {
      expect(student.evaluation_token).toEqual(expect.any(String));
      expect(student.invitation_accepted_at).toBeInstanceOf(Date);
    }
    const statusBefore = await request('GET', '/evaluations/status');
    expect(statusBefore.body.evaluations_sent).toBe(true);

    const originalChaos = await chaosConfiguration();
    const rejectedChaos = {
      ...originalChaos,
      Sender: {
        ...originalChaos.Sender,
        ErrorCode: 451,
        Probability: 100,
      },
    };
    let resend;
    let restoreError;
    try {
      const configured = await setChaos(rejectedChaos);
      expect(configured).toBeGreaterThanOrEqual(200);
      expect(configured).toBeLessThan(300);
      expect(await chaosConfiguration()).toEqual(rejectedChaos);
      resend = await request('POST', '/evaluations/send', {});
    } finally {
      try {
        const restored = await setChaos(originalChaos);
        expect(restored).toBeGreaterThanOrEqual(200);
        expect(restored).toBeLessThan(300);
        expect(await chaosConfiguration()).toEqual(originalChaos);
      } catch (error) {
        restoreError = error;
      }
    }
    if (restoreError) throw restoreError;

    expect(resend.status).toBe(502);
    expect(resend.body.emails_sent).toBe(0);
    expect(resend.body.failed).toHaveLength(acceptedBefore.length);
    expect(resend.body.failed.join('\n')).toMatch(/451/);
    const acceptedAfter = await Student.find({
      course_id: state.fixture.course._id,
    })
      .sort('_id')
      .lean();
    expect(acceptedAfter).toEqual(acceptedBefore);
    const statusAfter = await request('GET', '/evaluations/status');
    expect(statusAfter.status).toBe(200);
    expect(statusAfter.body.evaluations_sent).toBe(true);
    for (const student of acceptedBefore) {
      const status = statusAfter.body.students.find(
        (entry) => entry.email === student.email,
      );
      expect(status).toBeDefined();
      expect(status.evaluation_token).toBe(student.evaluation_token);
      expect(status.invitation_accepted_at).toBe(
        student.invitation_accepted_at.toISOString(),
      );
    }
    const inbox = await mailpitRequest(process.env, '/api/v1/messages');
    expect((await inbox.json()).messages).toHaveLength(acceptedBefore.length);
  });
});
