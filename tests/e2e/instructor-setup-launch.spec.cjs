const { test, expect, api } = require('./helpers/fixtures.cjs');
const {
  loginAsOwner,
  openEvaluationStatus,
  launchFromEvaluationStatus,
} = require('./helpers/journeys.cjs');

test('instructor creates a course, uploads a roster, organizes teams, and launches evaluations', async ({
  page,
  fixture,
}) => {
  const courseName = 'Journey Course, "Alpha"';
  const teamAName = 'Journey Team A';
  const teamBName = 'Journey Team B';

  await loginAsOwner(page, fixture);
  await page.getByRole('button', { name: /Create Course/ }).click();
  const createDialog = page.getByRole('dialog', { name: 'Create New Course' });
  await createDialog.getByLabel('Course Name').fill(courseName);
  await createDialog.getByLabel('Course Number').fill('E2E 5100');
  await createDialog.getByLabel('Course Section').fill('02');
  await createDialog.getByLabel('Semester').fill('Synthetic Journey Term');
  await createDialog
    .getByRole('button', { name: 'Create', exact: true })
    .click();
  const courseRow = page.getByRole('row').filter({ hasText: courseName });
  await expect(courseRow).toBeVisible();

  const courseResponse = await api(
    fixture.context,
    'GET',
    '/api/courses',
    undefined,
    fixture.accounts.owner.token,
  );
  const createdCourse = courseResponse.find(
    (course) => course.course_name === courseName,
  );
  expect(createdCourse).toBeTruthy();
  const course = {
    ...createdCourse,
    id: createdCourse._id,
    account: fixture.accounts.owner,
    students: [],
    scenario: 'unlaunched',
    links: [],
  };

  await courseRow.getByTitle('Manage Students').click();
  const studentsDialog = page.getByRole('dialog', {
    name: new RegExp(`Manage Students for.*${courseName}`),
  });
  await studentsDialog.getByRole('button', { name: 'Upload CSV' }).click();
  const csvDialog = page.getByRole('dialog', {
    name: 'Upload Student Roster (CSV)',
  });
  const csv = [
    'student_id,name,email,team_name',
    'JOURNEY001,Journey Student 1,journey-student-1@example.invalid,Journey Team A',
    'JOURNEY002,Journey Student 2,journey-student-2@example.invalid,Journey Team A',
    'JOURNEY003,Journey Student 3,journey-student-3@example.invalid,Journey Team B',
    'JOURNEY004,Journey Student 4,journey-student-4@example.invalid,Journey Team B',
  ].join('\n');
  await csvDialog.locator('#csv-file-input').setInputFiles({
    name: 'journey-roster.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await csvDialog.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(csvDialog.getByText('Students added: 4')).toBeVisible();
  await csvDialog.getByRole('button', { name: 'Close' }).click();

  course.students = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/students`,
    undefined,
    fixture.accounts.owner.token,
  );
  expect(course.students).toHaveLength(4);
  await studentsDialog.getByRole('button', { name: 'Close' }).click();

  await courseRow.getByTitle('Manage Teams').click();
  let teamsDialog = page.getByRole('dialog', {
    name: new RegExp(`Manage Teams for.*${courseName}`),
  });
  const teamARow = teamsDialog.getByRole('row').filter({ hasText: teamAName });
  await teamARow.getByTitle('Manage Students').click();
  const teamAMembers = page.getByRole('dialog', {
    name: `Manage Students in ${teamAName}`,
  });
  const movedStudent = course.students.find(
    (student) => student.student_id === 'JOURNEY002',
  );
  const studentMovedBack = course.students.find(
    (student) => student.student_id === 'JOURNEY003',
  );
  expect(movedStudent).toBeTruthy();
  expect(studentMovedBack).toBeTruthy();
  await teamAMembers
    .getByText(movedStudent.name, { exact: true })
    .locator('..')
    .locator('..')
    .getByTitle('Remove from team')
    .click();
  await teamAMembers.getByRole('button', { name: 'Close' }).click();

  const teamBRow = teamsDialog.getByRole('row').filter({ hasText: teamBName });
  await teamBRow.getByTitle('Manage Students').click();
  const teamBMembers = page.getByRole('dialog', {
    name: `Manage Students in ${teamBName}`,
  });
  await teamBMembers
    .getByText(studentMovedBack.name, { exact: true })
    .locator('..')
    .locator('..')
    .getByTitle('Remove from team')
    .click();
  await teamBMembers.getByRole('button', { name: 'Close' }).click();

  await teamARow.getByTitle('Manage Students').click();
  const teamAMembersAgain = page.getByRole('dialog', {
    name: `Manage Students in ${teamAName}`,
  });
  await teamAMembersAgain
    .getByText(studentMovedBack.name, { exact: true })
    .locator('..')
    .locator('..')
    .getByTitle('Add to team')
    .click();
  await teamAMembersAgain.getByRole('button', { name: 'Close' }).click();

  await teamBRow.getByTitle('Manage Students').click();
  const teamBMembersAgain = page.getByRole('dialog', {
    name: `Manage Students in ${teamBName}`,
  });
  await teamBMembersAgain
    .getByText(movedStudent.name, { exact: true })
    .locator('..')
    .locator('..')
    .getByTitle('Add to team')
    .click();
  await teamBMembersAgain.getByRole('button', { name: 'Close' }).click();
  await teamsDialog.getByRole('button', { name: 'Close' }).click();

  await page.reload();
  await expect(
    page.getByText('Course Management Dashboard', { exact: true }),
  ).toBeVisible();
  const ownedCourses = await api(
    fixture.context,
    'GET',
    '/api/courses',
    undefined,
    fixture.accounts.owner.token,
  );
  expect(ownedCourses.map(({ course_name }) => course_name)).toContain(
    courseName,
  );
  const otherCourses = await api(
    fixture.context,
    'GET',
    '/api/courses',
    undefined,
    fixture.accounts.other.token,
  );
  expect(otherCourses.map(({ course_name }) => course_name)).not.toContain(
    courseName,
  );
  await expect(
    page.getByRole('row').filter({ hasText: courseName }),
  ).toBeVisible();
  await courseRow.getByTitle('Manage Students').click();
  const reloadedRosterDialog = page.getByRole('dialog', {
    name: new RegExp(`Manage Students for.*${courseName}`),
  });
  for (const student of course.students) {
    await expect(
      reloadedRosterDialog.getByText(student.name, { exact: true }),
    ).toBeVisible();
  }
  await reloadedRosterDialog.getByRole('button', { name: 'Close' }).click();
  await courseRow.getByTitle('Manage Teams').click();
  teamsDialog = page.getByRole('dialog', {
    name: new RegExp(`Manage Teams for.*${courseName}`),
  });
  for (const [teamName, memberNames] of [
    [teamAName, ['Journey Student 1', 'Journey Student 3']],
    [teamBName, ['Journey Student 2', 'Journey Student 4']],
  ]) {
    const row = teamsDialog.getByRole('row').filter({ hasText: teamName });
    await row.getByTitle('Manage Students').click();
    const members = page.getByRole('dialog', {
      name: `Manage Students in ${teamName}`,
    });
    for (const name of memberNames) {
      await expect(members.getByText(name, { exact: true })).toBeVisible();
    }
    await members.getByRole('button', { name: 'Close' }).click();
  }
  await teamsDialog.getByRole('button', { name: 'Close' }).click();

  const roster = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/students`,
    undefined,
    fixture.accounts.owner.token,
  );
  expect(roster.map(({ student_id }) => student_id).sort()).toEqual([
    'JOURNEY001',
    'JOURNEY002',
    'JOURNEY003',
    'JOURNEY004',
  ]);
  const teams = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/teams`,
    undefined,
    fixture.accounts.owner.token,
  );
  expect(
    teams
      .map((team) => [
        team.team_name,
        team.students.map(({ student_id }) => student_id).sort(),
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  ).toEqual([
    [teamAName, ['JOURNEY001', 'JOURNEY003']],
    [teamBName, ['JOURNEY002', 'JOURNEY004']],
  ]);

  const priorMessageIds = await fixture.mailpitMessageIds();
  const dialog = await openEvaluationStatus(page, courseName);
  await launchFromEvaluationStatus(dialog);
  await fixture.captureInvitations(course, priorMessageIds);
  expect(course.links).toHaveLength(4);
});
