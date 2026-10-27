const {
  test,
  expect,
  api,
  seedBaseline,
  withFixture,
} = require('./helpers/fixtures.cjs');
const {
  collections,
  validateTarget,
  assertOwnedDatabase,
  openDatabase,
  resetData,
  mailpitRequest,
} = require('./helpers/target.cjs');

async function logicalState(context) {
  // Read persisted records independently of the in-memory manifest, omitting
  // generated IDs, credentials, tokens, and timestamps that may vary per seed.
  const professors = await context.db
    .collection('professors')
    .find()
    .sort({ email: 1 })
    .toArray();
  const courses = await context.db
    .collection('courses')
    .find()
    .sort({ course_name: 1 })
    .toArray();
  const students = await context.db
    .collection('students')
    .find()
    .sort({ student_id: 1 })
    .toArray();
  const teams = await context.db
    .collection('teams')
    .find()
    .sort({ team_name: 1 })
    .toArray();
  return {
    professors: professors.map(({ name, email }) => ({ name, email })),
    courses: courses.map(
      ({ course_name, student_count, team_count, professor_id }) => ({
        course_name,
        student_count,
        team_count,
        owner: professors.find((professor) =>
          professor._id.equals(professor_id),
        ).email,
      }),
    ),
    students: students.map(({ student_id, email, course_id, team_id }) => ({
      student_id,
      email,
      course: courses.find((course) => course._id.equals(course_id))
        .course_name,
      team: teams.find((team) => team._id.equals(team_id)).team_name,
    })),
    teams: teams.map(({ team_name, student_count, students: members }) => ({
      team_name,
      student_count,
      members: members
        .map(
          (id) => students.find((student) => student._id.equals(id)).student_id,
        )
        .sort(),
    })),
  };
}

test('reset and seed restore the logical baseline twice while preserving indexes', async ({
  fixture,
}) => {
  const { context } = fixture;
  const expected = await logicalState(context);
  expect(expected.professors.map(({ name }) => name)).toEqual([
    'Other Professor',
    'Owner Professor',
  ]);
  expect(expected.courses).toEqual([
    {
      course_name: 'OtherCourseB',
      student_count: 2,
      team_count: 1,
      owner: 'other-professor@example.invalid',
    },
    {
      course_name: 'OwnerCourseA',
      student_count: 4,
      team_count: 2,
      owner: 'owner-professor@example.invalid',
    },
  ]);
  expect(expected.students).toHaveLength(6);
  expect(
    expected.teams.map(({ student_count, members }) => [
      student_count,
      members.length,
    ]),
  ).toEqual([
    [2, 2],
    [2, 2],
    [2, 2],
  ]);
  const indexes = await context.db
    .collection('professors')
    .listIndexes()
    .toArray();
  const studentIndexes = await context.db
    .collection('students')
    .listIndexes()
    .toArray();
  for (let iteration = 0; iteration < 2; iteration++) {
    await fixture.invite(fixture.ownerCourse);
    // A reset must include report records, which public course deletion cannot clear.
    await context.db
      .collection('reports')
      .insertOne({ syntheticResetSentinel: true });
    const reseeded = await seedBaseline(context);
    Object.assign(fixture, reseeded);
    expect(await logicalState(context)).toEqual(expected);
    expect(await context.db.collection('evaluations').countDocuments()).toBe(0);
    expect(await context.db.collection('reports').countDocuments()).toBe(0);
    expect(
      (await (await mailpitRequest(context, '/api/v1/messages')).json())
        .messages,
    ).toEqual([]);
    expect(
      await context.db.collection('professors').listIndexes().toArray(),
    ).toEqual(indexes);
    expect(
      await context.db.collection('students').listIndexes().toArray(),
    ).toEqual(studentIndexes);
  }
});

test('owner genuinely logs in and sees only the owned course in the browser', async ({
  page,
  fixture,
}) => {
  expect(await page.context().cookies()).toEqual([]);
  await page.goto('/');
  await page.getByLabel('Email:').fill(fixture.accounts.owner.email);
  await page.getByLabel('Password:').fill(fixture.accounts.owner.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(
    page.getByText('Course Management Dashboard', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'OwnerCourseA', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'OtherCourseB', exact: true }),
  ).toHaveCount(0);
  const otherCourses = await api(
    fixture.context,
    'GET',
    '/api/courses',
    undefined,
    fixture.accounts.other.token,
  );
  expect(otherCourses.map((course) => course.course_name)).toEqual([
    'OtherCourseB',
  ]);
});

test('captured invitation opens the real student form with the correct teammate', async ({
  page,
  fixture,
}) => {
  await fixture.invite(fixture.ownerCourse);
  const [link] = fixture.ownerCourse.links;
  await page.goto(link.issuedEmailUrl);
  await expect(
    page.getByText('Group Member Evaluation Rubric', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Owner Student 1', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Evaluate: Owner Student 2',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Evaluate:/ })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole('heading', {
      name: 'Evaluate: Owner Student 3',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', {
      name: 'Evaluate: Other Student 1',
      exact: true,
    }),
  ).toHaveCount(0);
  expect(page.url()).toBe(link.issuedEmailUrl);
});

for (const count of [1, 4]) {
  test(`submitted builder creates ${count} real completed evaluations`, async ({
    fixture,
  }) => {
    await fixture.submit(fixture.ownerCourse, count);
    const status = await api(
      fixture.context,
      'GET',
      `/api/courses/${fixture.ownerCourse.id}/evaluations/status`,
      undefined,
      fixture.accounts.owner.token,
    );
    expect(status).toMatchObject({
      completed_count: count,
      pending_count: 4 - count,
      total_count: 4,
    });
    const saved = await fixture.context.db
      .collection('evaluations')
      .find()
      .toArray();
    expect(saved).toHaveLength(count);
    for (const record of saved) {
      expect(record.ratings).toEqual({
        professionalism: 5,
        communication: 5,
        work_ethic: 5,
        content_knowledge_skills: 5,
        overall_contribution: 5,
        participation: 4,
      });
      expect(record.evaluator_id.equals(record.student_id)).toBe(false);
    }
    const other = await api(
      fixture.context,
      'GET',
      `/api/courses/${fixture.otherCourse.id}/evaluations/status`,
      undefined,
      fixture.accounts.other.token,
    );
    expect(other).toMatchObject({ evaluations_sent: false, total_count: 0 });
  });
}

test('guards reject unsafe targets and preserve sentinel records and inbox', async ({
  fixture,
}) => {
  const { context } = fixture;
  await fixture.invite(fixture.ownerCourse);
  const inboxBefore = await (
    await mailpitRequest(context, '/api/v1/messages')
  ).json();
  const sentinel = await context.db
    .collection('reports')
    .insertOne({ guardSentinel: true });
  const invalid = [
    { E2E_RUN_ID: '../development' },
    { E2E_RUN_ID: '0123456789abcdeF' },
    { NODE_ENV: 'development' },
    { MONGODB_URI: 'mongodb://localhost:27017/peers' },
    { MONGODB_URI: `${process.env.MONGODB_URI}?retryWrites=true` },
    { E2E_BASE_URL: 'https://example.invalid' },
    { MAILPIT_API_URL: 'http://localhost:8025' },
  ];
  for (const overrides of invalid) {
    expect(() => validateTarget({ ...process.env, ...overrides })).toThrow();
    await expect(
      resetData({ ...context, environment: { ...process.env, ...overrides } }),
    ).rejects.toThrow();
  }
  await expect(
    assertOwnedDatabase({
      ...context,
      db: context.client.db('wrong_database'),
    }),
  ).rejects.toThrow(/live database/);
  const marker = context.db.collection('__test_run');
  try {
    await marker.updateOne(
      { _id: 'owner' },
      { $set: { runId: 'ffffffffffffffff' } },
    );
    await expect(resetData(context)).rejects.toThrow(/ownership marker/);
    await expect(openDatabase(process.env)).rejects.toThrow(/ownership marker/);
    await marker.deleteOne({ _id: 'owner' });
    await expect(openDatabase(process.env)).rejects.toThrow(
      /nonempty or unknown/,
    );
  } finally {
    await marker.replaceOne(
      { _id: 'owner' },
      { _id: 'owner', runId: process.env.E2E_RUN_ID },
      { upsert: true },
    );
  }
  try {
    await context.db
      .collection('unexpected_guard_probe')
      .insertOne({ guardSentinel: true });
    await expect(resetData(context)).rejects.toThrow(/unknown collections/);
    await marker.deleteOne({ _id: 'owner' });
    await expect(openDatabase(process.env)).rejects.toThrow(
      /nonempty or unknown/,
    );
    expect(
      await context.db.collection('unexpected_guard_probe').countDocuments(),
    ).toBe(1);
  } finally {
    await context.db.collection('unexpected_guard_probe').drop();
    await marker.replaceOne(
      { _id: 'owner' },
      { _id: 'owner', runId: process.env.E2E_RUN_ID },
      { upsert: true },
    );
  }
  expect(
    await context.db
      .collection('reports')
      .findOne({ _id: sentinel.insertedId }),
  ).toMatchObject({ guardSentinel: true });
  const inboxAfter = await (
    await mailpitRequest(context, '/api/v1/messages')
  ).json();
  expect(inboxAfter.messages.map((message) => message.ID).sort()).toEqual(
    inboxBefore.messages.map((message) => message.ID).sort(),
  );
});

test('cleanup runs after failed fixture preparation and failed test work', async ({
  fixture,
}) => {
  const environment = fixture.context.environment;
  // These intentional local errors exercise the same finally used by the
  // Playwright fixture without making the permanent suite intentionally fail.
  await expect(
    withFixture(
      environment,
      async () => {},
      async (context) => {
        await seedBaseline(context);
        throw new Error('Synthetic preparation failure');
      },
    ),
  ).rejects.toThrow('Synthetic preparation failure');
  await expect(
    withFixture(environment, async (prepared) => {
      await prepared.invite(prepared.ownerCourse);
      throw new Error('Synthetic test failure');
    }),
  ).rejects.toThrow('Synthetic test failure');
  for (const name of collections)
    expect(await fixture.context.db.collection(name).countDocuments()).toBe(0);
  expect(
    (await (await mailpitRequest(fixture.context, '/api/v1/messages')).json())
      .messages,
  ).toEqual([]);
  await assertOwnedDatabase(fixture.context);
});
