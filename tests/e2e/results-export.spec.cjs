const fs = require('node:fs/promises');
const { test, expect, api } = require('./helpers/fixtures.cjs');
const {
  loginAsOwner,
  openEvaluationStatus,
  launchFromEvaluationStatus,
  submitEvaluationFromInvitation,
} = require('./helpers/journeys.cjs');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      field += '"';
      index++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ',') {
      row.push(field);
      field = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index++;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

test('instructor reviews independently checked scores and exports quoted CSV fields', async ({
  browser,
  page,
  fixture,
}) => {
  const course = fixture.ownerCourse;
  const specialName = 'Student, "Alpha"';
  const firstStudent = course.students[0];
  const ratingsByTarget = [
    {
      professionalism: 5,
      communication: 4,
      work_ethic: 3,
      content_knowledge_skills: 2,
      overall_contribution: 5,
      participation: 4,
    },
    {
      professionalism: 3,
      communication: 2,
      work_ethic: 4,
      content_knowledge_skills: 5,
      overall_contribution: 2,
      participation: 2,
    },
    {
      professionalism: 1,
      communication: 2,
      work_ethic: 3,
      content_knowledge_skills: 4,
      overall_contribution: 2,
      participation: 1,
    },
    {
      professionalism: 4,
      communication: 4,
      work_ethic: 4,
      content_knowledge_skills: 4,
      overall_contribution: 4,
      participation: 3,
    },
  ];

  // Use a synthetic special-name fixture; the UI edit control is outside this export journey.
  await api(
    fixture.context,
    'PUT',
    `/api/courses/${course.id}/students/${firstStudent._id}`,
    { name: specialName },
    fixture.accounts.owner.token,
  );
  await loginAsOwner(page, fixture);

  const beforeMessages = await fixture.mailpitMessageIds();
  const statusDialog = await openEvaluationStatus(page, course.course_name);
  await launchFromEvaluationStatus(statusDialog);
  await fixture.captureInvitations(course, beforeMessages);
  expect(course.links).toHaveLength(4);

  const expectedScores = new Map();
  for (let index = 0; index < course.links.length; index++) {
    const link = course.links[index];
    const target = link.form.teammates[0];
    const ratings = ratingsByTarget[index];
    const normalizedTotal = Object.entries(ratings).reduce(
      (sum, [criterion, value]) =>
        sum + (criterion === 'participation' ? (value * 5) / 4 : value),
      0,
    );
    expectedScores.set(
      target.name,
      Number(((normalizedTotal / 6) * 20).toFixed(2)),
    );

    const studentContext = await browser.newContext();
    try {
      const studentPage = await studentContext.newPage();
      await submitEvaluationFromInvitation(
        studentPage,
        link,
        ratings,
        `Synthetic feedback for ${target.name}: varied and specific contribution.`,
      );
    } finally {
      await studentContext.close();
    }
  }

  const report = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/reports`,
    undefined,
    fixture.accounts.owner.token,
  );
  for (const [name, expectedScore] of expectedScores) {
    const studentReport = report.students.find(
      (student) => student.name === name,
    );
    expect(studentReport).toBeTruthy();
    expect(studentReport.originalScore).toBe(expectedScore);
  }
  const forbidden = await api(
    fixture.context,
    'GET',
    `/api/courses/${course.id}/reports`,
    undefined,
    fixture.accounts.other.token,
    404,
  );
  expect(forbidden.error.code).toBe('NOT_FOUND');

  await page.reload();
  await expect(
    page.getByText('Course Management Dashboard', { exact: true }),
  ).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: course.course_name });
  await row.getByTitle('View Reports').click();
  await expect(
    page.getByRole('heading', { name: '📊 Evaluation Reports' }),
  ).toBeVisible();
  await expect(page.getByText(specialName, { exact: true })).toBeVisible();
  for (const [name, expectedScore] of expectedScores) {
    const reportRow = page
      .getByRole('cell', { name, exact: true })
      .locator('..');
    await expect(reportRow.getByRole('cell').nth(4)).toHaveText(
      `${expectedScore}%`,
    );
  }
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`course_${course.id}_report.csv`);
  const rows = parseCsv(await fs.readFile(await download.path(), 'utf8'));
  const [headers, ...data] = rows;
  expect(headers).toEqual([
    'Student ID',
    'Name',
    'Email',
    'Team',
    'Original Score',
    'Final Score',
    'Letter Grade',
    'Evaluations Received',
    'Improvement',
  ]);
  const nameColumn = headers.indexOf('Name');
  expect(data.map((record) => record[nameColumn])).toContain(specialName);
  for (const [name, expectedScore] of expectedScores) {
    const csvRow = data.find((record) => record[nameColumn] === name);
    expect(csvRow).toBeTruthy();
    expect(Number(csvRow[headers.indexOf('Original Score')])).toBe(
      expectedScore,
    );
  }
});
