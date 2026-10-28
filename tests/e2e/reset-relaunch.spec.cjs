const { ObjectId } = require('mongodb');
const { test, expect, api } = require('./helpers/fixtures.cjs');
const {
  loginAsOwner,
  openEvaluationStatus,
  launchFromEvaluationStatus,
  submitEvaluationFromInvitation,
} = require('./helpers/journeys.cjs');

async function courseState(context, courseId) {
  const id = new ObjectId(courseId);
  const course = await context.db.collection('courses').findOne({ _id: id });
  const students = await context.db
    .collection('students')
    .find({ course_id: id })
    .sort({ student_id: 1 })
    .toArray();
  const teams = await context.db
    .collection('teams')
    .find({ course_id: id })
    .sort({ team_name: 1 })
    .toArray();
  return {
    course: {
      name: course.course_name,
      number: course.course_number,
      section: course.course_section,
      semester: course.semester,
      owner: String(course.professor_id),
      studentCount: course.student_count,
      teamCount: course.team_count,
    },
    students: students.map((student) => ({
      id: String(student._id),
      studentId: student.student_id,
      name: student.name,
      email: student.email,
      group: student.group_assignment,
      teamId: student.team_id ? String(student.team_id) : null,
    })),
    teams: teams.map((team) => ({
      name: team.team_name,
      status: team.team_status,
      count: team.student_count,
      students: team.students.map(String).sort(),
    })),
  };
}

async function submitInFreshStudentContext(browser, link, ratings, feedback) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    expect(await context.cookies()).toEqual([]);
    await submitEvaluationFromInvitation(page, link, ratings, feedback);
  } finally {
    await context.close();
  }
}

test('instructor resets completed evaluations, invalidates old links, and relaunches', async ({
  browser,
  page,
  fixture,
}) => {
  const course = fixture.ownerCourse;
  const ratings = {
    professionalism: 4,
    communication: 3,
    work_ethic: 5,
    content_knowledge_skills: 2,
    overall_contribution: 4,
    participation: 3,
  };
  const ownerStateBefore = await courseState(fixture.context, course.id);
  const otherCourseStateBefore = await courseState(
    fixture.context,
    fixture.otherCourse.id,
  );
  const priorMessageIds = await fixture.mailpitMessageIds();

  await loginAsOwner(page, fixture);
  let dialog = await openEvaluationStatus(page, course.course_name);
  await launchFromEvaluationStatus(dialog);
  await fixture.captureInvitations(course, priorMessageIds);
  const oldLink = course.links[0];
  await submitInFreshStudentContext(
    browser,
    oldLink,
    ratings,
    'Synthetic work showed strong planning and thoughtful collaboration.',
  );
  expect(
    await fixture.context.db.collection('evaluations').countDocuments({
      course_id: new ObjectId(course.id),
    }),
  ).toBe(1);

  await page.reload();
  await expect(
    page.getByText('Course Management Dashboard', { exact: true }),
  ).toBeVisible();
  dialog = await openEvaluationStatus(page, course.course_name);
  await expect(
    dialog.getByText(/Progress: 1\/4 evaluations completed/),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Reset Evaluation State' }).click();
  await expect(
    dialog.getByText('No Sent Invitations Recorded', { exact: true }),
  ).toBeVisible({ timeout: 10000 });

  const resetStatus = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/evaluations/status`,
    undefined,
    fixture.accounts.owner.token,
  );
  expect(resetStatus).toMatchObject({
    evaluations_sent: false,
    completed_count: 0,
    pending_count: 0,
    total_count: 0,
  });
  expect(
    await fixture.context.db.collection('evaluations').countDocuments({
      course_id: new ObjectId(course.id),
    }),
  ).toBe(0);
  expect(
    await fixture.context.db.collection('students').countDocuments({
      course_id: new ObjectId(course.id),
      $or: [
        { evaluation_token: { $exists: true } },
        { invitation_accepted_at: { $exists: true } },
      ],
    }),
  ).toBe(0);
  expect(await courseState(fixture.context, course.id)).toEqual(
    ownerStateBefore,
  );
  expect(await courseState(fixture.context, fixture.otherCourse.id)).toEqual(
    otherCourseStateBefore,
  );

  const oldContext = await browser.newContext();
  try {
    const oldPage = await oldContext.newPage();
    await oldPage.goto(oldLink.issuedEmailUrl);
    await expect(oldPage.getByRole('alert')).toBeVisible();
    await expect(
      oldPage.getByRole('heading', {
        name: `Evaluate: ${oldLink.form.teammates[0].name}`,
      }),
    ).toHaveCount(0);
  } finally {
    await oldContext.close();
  }

  const afterResetMessageIds = await fixture.mailpitMessageIds();
  await launchFromEvaluationStatus(dialog);
  await fixture.captureInvitations(course, afterResetMessageIds);
  const freshLink = course.links[0];
  expect(freshLink.token).not.toBe(oldLink.token);
  await submitInFreshStudentContext(
    browser,
    freshLink,
    ratings,
    'Synthetic work showed strong planning and thoughtful collaboration.',
  );

  const saved = await fixture.context.db
    .collection('evaluations')
    .find({ course_id: new ObjectId(course.id) })
    .toArray();
  expect(saved).toHaveLength(1);
  expect(saved[0].ratings).toEqual(ratings);
  expect(saved[0].overall_feedback).toBe(
    'Synthetic work showed strong planning and thoughtful collaboration.',
  );
  const finalStatus = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/evaluations/status`,
    undefined,
    fixture.accounts.owner.token,
  );
  expect(finalStatus.completed_count).toBe(1);
});
