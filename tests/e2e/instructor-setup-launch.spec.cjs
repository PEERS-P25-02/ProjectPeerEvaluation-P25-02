const { test, expect, api } = require('./helpers/fixtures.cjs');
const {
  loginAsOwner,
  openEvaluationStatus,
  launchFromEvaluationStatus,
} = require('./helpers/journeys.cjs');

// Keep the public form's sponsor rubric contract local to the E2E test image.
const expectedRubric = {
  title: 'Group Member Evaluation Rubric',
  criteria: [
    ['professionalism', '1-5'],
    ['communication', '1-5'],
    ['work_ethic', '1-5'],
    ['content_knowledge_skills', '1-5'],
    ['overall_contribution', '1-5'],
    ['participation', '1-4'],
  ],
};

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
  const originalCourseId = createdCourse._id;
  const course = {
    ...createdCourse,
    id: createdCourse._id,
    account: fixture.accounts.owner,
    students: [],
    scenario: 'unlaunched',
    links: [],
  };

  const changedCourseFields = {
    course_number: 'E2E 5101',
    course_section: '03',
    semester: 'Synthetic Edited Term',
  };
  await courseRow.getByTitle('Edit Course').click();
  const editDialog = page.getByRole('dialog', { name: 'Edit Course' });
  for (const [label, value] of [
    ['Course Number', changedCourseFields.course_number],
    ['Course Section', changedCourseFields.course_section],
    ['Semester', changedCourseFields.semester],
  ]) {
    await editDialog.getByLabel(label).fill(value);
  }
  await editDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editDialog).toBeHidden();
  const savedCourse = await api(
    fixture.context,
    'GET',
    '/api/courses',
    undefined,
    fixture.accounts.owner.token,
  ).then((courses) =>
    courses.find(({ course_name }) => course_name === courseName),
  );
  expect(savedCourse._id).toBe(originalCourseId);
  expect(savedCourse).toMatchObject(changedCourseFields);
  expect(String(savedCourse.professor_id)).toBe(fixture.accounts.owner.id);
  Object.assign(course, changedCourseFields);

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
  const reloadedCourse = ownedCourses.find(
    ({ course_name }) => course_name === courseName,
  );
  expect(reloadedCourse._id).toBe(originalCourseId);
  expect(reloadedCourse).toMatchObject(changedCourseFields);
  expect(String(reloadedCourse.professor_id)).toBe(fixture.accounts.owner.id);
  const editedCourseInDatabase = await fixture.context.db
    .collection('courses')
    .findOne({ course_name: courseName });
  expect(String(editedCourseInDatabase._id)).toBe(String(originalCourseId));
  expect(String(editedCourseInDatabase.professor_id)).toBe(
    fixture.accounts.owner.id,
  );
  expect(editedCourseInDatabase).toMatchObject(changedCourseFields);
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
  const reloadedCourseRow = page
    .getByRole('row')
    .filter({ hasText: courseName });
  for (const [index, value] of [
    [1, changedCourseFields.course_number],
    [2, changedCourseFields.course_section],
    [3, changedCourseFields.semester],
  ]) {
    await expect(reloadedCourseRow.getByRole('cell').nth(index)).toHaveText(
      value,
    );
  }
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

  const invitedStudents = await fixture.context.db
    .collection('students')
    .find({ course_id: editedCourseInDatabase._id })
    .toArray();
  const otherCourseInDatabase = await fixture.context.db
    .collection('courses')
    .findOne({ course_name: fixture.otherCourse.course_name });
  const otherCourseStudents = await fixture.context.db
    .collection('students')
    .find({ course_id: otherCourseInDatabase._id })
    .toArray();
  const studentById = new Map(
    invitedStudents.map((student) => [student.student_id, student]),
  );
  const teamById = new Map(
    (
      await fixture.context.db
        .collection('teams')
        .find({ course_id: editedCourseInDatabase._id })
        .toArray()
    ).map((team) => [String(team._id), team]),
  );
  for (const link of course.links) {
    const evaluator = studentById.get(link.form.evaluator.student_id);
    expect(evaluator).toBeTruthy();
    expect(link.form.course).toEqual({
      name: course.course_name,
      number: changedCourseFields.course_number,
      section: changedCourseFields.course_section,
      semester: changedCourseFields.semester,
    });
    expect(link.form.evaluator.name).toBe(evaluator.name);
    expect(link.form.evaluator.team).toBe(
      teamById.get(String(evaluator.team_id)).team_name,
    );
    expect(link.form.rubric.title).toBe(expectedRubric.title);
    expect(
      link.form.rubric.criteria.map(({ id, scale }) => [id, scale]),
    ).toEqual(expectedRubric.criteria);
    const expectedPeers = invitedStudents
      .filter(
        (student) =>
          String(student.team_id) === String(evaluator.team_id) &&
          String(student._id) !== String(evaluator._id),
      )
      .map(({ student_id }) => student_id)
      .sort();
    expect(
      link.form.teammates.map(({ student_id }) => student_id).sort(),
    ).toEqual(expectedPeers);
    expect(evaluator.evaluation_token).toBe(link.token);
    expect(String(evaluator.course_id)).toBe(
      String(editedCourseInDatabase._id),
    );
    expect(evaluator.team_id).toBeTruthy();
  }
  expect(invitedStudents).toHaveLength(4);
  expect(otherCourseStudents).toHaveLength(fixture.otherCourse.students.length);
  expect(
    otherCourseStudents.every(({ evaluation_token }) => !evaluation_token),
  ).toBe(true);
});
