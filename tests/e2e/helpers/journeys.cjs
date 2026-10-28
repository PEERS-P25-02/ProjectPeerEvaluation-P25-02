const { expect } = require('@playwright/test');

async function loginAsOwner(page, fixture) {
  await page.goto('/');
  await page.getByLabel('Email:').fill(fixture.accounts.owner.email);
  await page.getByLabel('Password:').fill(fixture.accounts.owner.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(
    page.getByText('Course Management Dashboard', { exact: true }),
  ).toBeVisible();
}

async function openEvaluationStatus(page, courseName) {
  const row = page.getByRole('row').filter({ hasText: courseName });
  await row.getByTitle('Evaluation Status').click();
  // The status refresh rebuilds this title from an ID-only course object.
  return page.getByRole('dialog');
}

async function launchFromEvaluationStatus(dialog) {
  await dialog.getByRole('button', { name: 'Send Evaluations Now' }).click();
  await expect(
    dialog.getByText(/Progress: \d+\/\d+ evaluations completed/),
  ).toBeVisible({ timeout: 10000 });
}

async function submitEvaluationFromInvitation(page, link, ratings, feedback) {
  await page.goto(link.issuedEmailUrl);
  await expect(
    page.getByRole('heading', {
      name: `Evaluate: ${link.form.teammates[0].name}`,
    }),
  ).toBeVisible();
  const radios = page.getByRole('radio');
  let radioIndex = 0;
  for (const criterion of link.form.rubric.criteria) {
    const scale = Object.keys(criterion.scaleDescriptions).sort(
      (left, right) => Number(right) - Number(left),
    );
    const chosen = String(ratings[criterion.id]);
    const optionIndex = scale.indexOf(chosen);
    if (optionIndex < 0) throw new Error(`Invalid ${criterion.id} rating`);
    await radios.nth(radioIndex + optionIndex).click();
    radioIndex += scale.length;
  }
  await page
    .getByPlaceholder('Provide constructive feedback for this team member...')
    .fill(feedback);
  await page.getByRole('button', { name: 'Submit Evaluation' }).click();
  await expect(
    page.getByRole('heading', { name: 'Evaluation Completed!' }),
  ).toBeVisible();
}

module.exports = {
  loginAsOwner,
  openEvaluationStatus,
  launchFromEvaluationStatus,
  submitEvaluationFromInvitation,
};
