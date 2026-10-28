const { ObjectId } = require('mongodb');
const { test, expect, api } = require('./helpers/fixtures.cjs');
const {
  loginAsOwner,
  openEvaluationStatus,
  launchFromEvaluationStatus,
  submitEvaluationFromInvitation,
} = require('./helpers/journeys.cjs');

test('student submits an issued invitation in a fresh browser and completed or invalid links stay safe', async ({
  browser,
  page,
  fixture,
}) => {
  const course = fixture.ownerCourse;
  const ratings = {
    professionalism: 5,
    communication: 4,
    work_ethic: 3,
    content_knowledge_skills: 2,
    overall_contribution: 5,
    participation: 4,
  };
  const feedback =
    'Clear communication and strong project contribution throughout.';
  const priorMessageIds = await fixture.mailpitMessageIds();
  await loginAsOwner(page, fixture);
  const dialog = await openEvaluationStatus(page, course.course_name);
  await launchFromEvaluationStatus(dialog);
  await fixture.captureInvitations(course, priorMessageIds);
  const link = course.links[0];
  const teammate = link.form.teammates[0];

  const studentContext = await browser.newContext();
  try {
    const studentPage = await studentContext.newPage();
    expect(await studentContext.cookies()).toEqual([]);
    await submitEvaluationFromInvitation(studentPage, link, ratings, feedback);
  } finally {
    await studentContext.close();
  }

  const saved = await fixture.context.db
    .collection('evaluations')
    .find({ course_id: new ObjectId(course.id) })
    .toArray();
  expect(saved).toHaveLength(1);
  expect(saved[0].evaluator_id.toString()).toBe(link.studentId);
  expect(saved[0].student_id.toString()).toBe(teammate._id);
  expect(saved[0].ratings).toEqual(ratings);
  expect(saved[0].overall_feedback).toBe(feedback);

  const completedContext = await browser.newContext();
  try {
    const completedPage = await completedContext.newPage();
    await completedPage.goto(link.issuedEmailUrl);
    await expect(
      completedPage.getByRole('heading', { name: 'Evaluation Completed!' }),
    ).toBeVisible();
  } finally {
    await completedContext.close();
  }
  expect(
    await fixture.context.db.collection('evaluations').countDocuments({
      course_id: new ObjectId(course.id),
    }),
  ).toBe(1);

  const invalidContext = await browser.newContext();
  try {
    const invalidPage = await invalidContext.newPage();
    await invalidPage.goto(
      'http://frontend/#/evaluate/invalid-synthetic-token',
    );
    await expect(invalidPage.getByRole('alert')).toBeVisible();
    await expect(
      invalidPage.getByRole('heading', { name: /^Evaluate:/ }),
    ).toHaveCount(0);
  } finally {
    await invalidContext.close();
  }

  const status = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/evaluations/status`,
    undefined,
    fixture.accounts.owner.token,
  );
  expect(status).toMatchObject({
    completed_count: 1,
    pending_count: course.students.length - 1,
    total_count: course.students.length,
  });
});
