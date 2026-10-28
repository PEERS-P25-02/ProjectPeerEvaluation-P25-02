const { test: base, expect } = require('@playwright/test');
const { setTimeout } = require('node:timers/promises');
const {
  validateTarget,
  openDatabase,
  resetData,
  mailpitRequest,
} = require('./target.cjs');

async function api(context, method, pathname, body, token, expected = 200) {
  validateTarget(context.environment);
  if (!pathname.startsWith('/api/'))
    throw new Error('Expected a local API path');
  const response = await fetch(
    `${context.environment.E2E_BASE_URL}${pathname}`,
    {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await response.json();
  if (response.status !== expected) {
    throw new Error(
      `${method} ${pathname}: expected ${expected}, received ${response.status}: ${JSON.stringify(result)}`,
    );
  }
  return result;
}

async function registerAccount(context, role) {
  // Fixed credentials are synthetic test inputs, never real professor accounts.
  const account = {
    name: `${role} Professor`,
    email: `${role.toLowerCase()}-professor@example.invalid`,
    password: 'SyntheticE2E123!',
    department: 'Synthetic Testing',
  };
  const registration = await api(
    context,
    'POST',
    '/api/auth/register',
    account,
    undefined,
    201,
  );
  const login = await api(context, 'POST', '/api/auth/login', {
    email: account.email,
    password: account.password,
  });
  if (!login.access_token || login.professor.id !== registration.professor_id) {
    throw new Error('Registered fixture professor could not genuinely log in');
  }
  return {
    ...account,
    id: registration.professor_id,
    token: login.access_token,
  };
}

async function createCourse(context, account, label, studentCount) {
  const input = {
    course_name: `${label}Course${label === 'Owner' ? 'A' : 'B'}`,
    course_number: label === 'Owner' ? 'E2E 4100' : 'E2E 4200',
    course_section: '01',
    semester: 'Synthetic Semester',
  };
  const { id } = await api(
    context,
    'POST',
    '/api/courses',
    input,
    account.token,
    201,
  );
  const route = `/api/courses/${id}`;
  const students = [];
  // Use the supported manual roster operation to create both sides of team
  // membership. No models or synthesized JWTs enter ordinary fixture setup.
  for (let index = 0; index < studentCount; index++) {
    const number = index + 1;
    const { student } = await api(
      context,
      'POST',
      `${route}/students`,
      {
        student_id: `${label.toUpperCase()}00${number}`,
        name: `${label} Student ${number}`,
        email: `${label.toLowerCase()}-student-${number}@example.invalid`,
        group_assignment: `${label} Team ${Math.floor(index / 2) + 1}`,
      },
      account.token,
      201,
    );
    students.push(student);
  }
  const teams = await api(
    context,
    'GET',
    `${route}/teams`,
    undefined,
    account.token,
  );
  return {
    ...input,
    id,
    students,
    teams,
    account,
    scenario: 'unlaunched',
    links: [],
  };
}

async function seedBaseline(context) {
  // Logical records stay stable; server-generated IDs/tokens/timestamps may vary.
  // The manifest exists only in this test's memory and is never saved for reuse.
  await resetData(context);
  const owner = await registerAccount(context, 'Owner');
  const other = await registerAccount(context, 'Other');
  return {
    accounts: { owner, other },
    ownerCourse: await createCourse(context, owner, 'Owner', 4),
    otherCourse: await createCourse(context, other, 'Other', 2),
  };
}

async function mailpitMessageIds(context) {
  const inbox = await (
    await mailpitRequest(context, '/api/v1/messages')
  ).json();
  return inbox.messages.map((message) => message.ID);
}

async function captureCourseInvitations(context, course, priorMessageIds = []) {
  const prior = new Set(priorMessageIds);
  let messages;
  for (let attempt = 0; attempt < 50; attempt++) {
    const inbox = await (
      await mailpitRequest(context, '/api/v1/messages')
    ).json();
    messages = inbox.messages.filter((message) => !prior.has(message.ID));
    if (messages.length === course.students.length) break;
    await setTimeout(100);
  }
  if (messages.length !== course.students.length)
    throw new Error('Expected exactly one invitation per fixture student');
  course.links = await Promise.all(
    course.students.map(async (student) => {
      const matches = messages.filter(
        (message) =>
          message.To.length === 1 && message.To[0].Address === student.email,
      );
      if (matches.length !== 1)
        throw new Error(`Missing personalized invitation for ${student.email}`);
      const message = await (
        await mailpitRequest(context, `/api/v1/message/${matches[0].ID}`)
      ).json();
      const urls = [...message.HTML.matchAll(/href=["']([^"']+)["']/g)].map(
        (match) => match[1].replaceAll('&amp;', '&'),
      );
      const issuedEmailUrl = urls.find((url) => url.includes('/evaluate/'));
      const parsed = new URL(issuedEmailUrl);
      if (
        parsed.origin !== 'http://frontend' ||
        !/^#\/evaluate\/[^/]+$/.test(parsed.hash)
      )
        throw new Error('Invitation does not target the E2E student form');
      const token = decodeURIComponent(parsed.hash.slice('#/evaluate/'.length));
      const form = await api(
        context,
        'GET',
        `/api/evaluate/${encodeURIComponent(token)}`,
      );
      if (
        form.evaluator.student_id !== student.student_id ||
        form.teammates.length !== 1
      )
        throw new Error('Invitation identity/team mismatch');
      return {
        studentId: student._id,
        email: student.email,
        issuedEmailUrl,
        token,
        form,
      };
    }),
  );
  course.scenario = 'invited';
  return course;
}

async function inviteCourse(context, course) {
  if (course.scenario !== 'unlaunched')
    throw new Error('Course has already been invited');
  const priorMessageIds = await mailpitMessageIds(context);
  const result = await api(
    context,
    'POST',
    `/api/courses/${course.id}/evaluations/send`,
    {},
    course.account.token,
  );
  if (result.emails_sent !== course.students.length || result.failed.length)
    throw new Error('Fixture invitations failed');
  return captureCourseInvitations(context, course, priorMessageIds);
}

async function submitCourse(context, course, count = course.students.length) {
  if (!Number.isInteger(count) || count < 1 || count > course.students.length)
    throw new Error('Invalid fixture submission count');
  if (course.scenario === 'unlaunched') await inviteCourse(context, course);
  if (course.scenario !== 'invited')
    throw new Error('Fixture submissions require an invited course');
  for (const link of course.links.slice(0, count)) {
    const ratings = Object.fromEntries(
      link.form.rubric.criteria.map((criterion) => [
        criterion.id,
        Number(criterion.scale.split('-')[1]),
      ]),
    );
    await api(
      context,
      'POST',
      `/api/evaluate/${encodeURIComponent(link.token)}`,
      {
        evaluations: link.form.teammates.map((student) => ({
          student_id: student._id,
          ratings,
          overall_feedback:
            'Synthetic peer contributed clear and constructive project work.',
        })),
      },
      undefined,
      201,
    );
  }
  course.scenario = 'submitted';
  course.submittedCount = count;
  return course;
}

// The finally covers preparation failures as well as assertion failures. Each
// Playwright test receives a new browser context plus this freshly seeded state.
async function withFixture(environment, use, prepare = seedBaseline) {
  const context = await openDatabase(environment);
  try {
    const manifest = await prepare(context);
    return await use({
      ...manifest,
      context,
      invite: (course) => inviteCourse(context, course),
      mailpitMessageIds: () => mailpitMessageIds(context),
      captureInvitations: (course, priorMessageIds) =>
        captureCourseInvitations(context, course, priorMessageIds),
      submit: (course, count) => submitCourse(context, course, count),
    });
  } finally {
    try {
      await resetData(context);
    } finally {
      await context.client.close();
    }
  }
}

const test = base.extend({
  fixture: [
    async ({ browserName: _browserName }, use) => withFixture(process.env, use),
    { auto: true },
  ],
});

module.exports = {
  test,
  expect,
  api,
  seedBaseline,
  inviteCourse,
  submitCourse,
  mailpitMessageIds,
  captureCourseInvitations,
  withFixture,
};
