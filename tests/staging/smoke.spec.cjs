const { test, expect } = require('@playwright/test');
const { readStagingSmokeConfig } = require('./config.cjs');
const { isEvaluationGetForToken } = require('./request-matchers.cjs');
const { REQUIRED_SMOKE_CHECKS } = require('./safe-evidence.cjs');

const { frontendUrl, backendUrl, evaluationToken } = readStagingSmokeConfig(
  process.env,
);

test(REQUIRED_SMOKE_CHECKS[0], async ({ request }) => {
  const response = await request.get(`${backendUrl}/api/health`);
  expect(response.url()).toBe(`${backendUrl}/api/health`);
  expect(response.status()).toBe(200);
  expect((await response.json()).status).toBe('OK');
});

test(REQUIRED_SMOKE_CHECKS[1], async ({ page }) => {
  await page.goto(frontendUrl);
  expect(new URL(page.url()).origin).toBe(frontendUrl);
  await expect(
    page.getByRole('heading', { name: 'Professor Login' }),
  ).toBeVisible();
  await expect(page.getByLabel('Email:')).toBeVisible();
  await expect(page.getByLabel('Password:')).toBeVisible();

  await page.getByLabel('Email:').fill('staging-smoke-invalid@example.invalid');
  await page.getByLabel('Password:').fill('synthetic-invalid-password');
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.origin === backendUrl &&
      url.pathname === '/api/auth/login' &&
      response.request().method() === 'POST'
    );
  });
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe('AUTH_ERROR');
  await expect(
    page.getByRole('heading', { name: 'Professor Login' }),
  ).toBeVisible();
});

test(REQUIRED_SMOKE_CHECKS[2], async ({ page }) => {
  const evaluationResponse = page.waitForResponse((response) => {
    return isEvaluationGetForToken(response, backendUrl, evaluationToken);
  });
  await page.goto(`${frontendUrl}/#/evaluate/${evaluationToken}`);
  expect((await evaluationResponse).status()).toBe(200);
  expect(new URL(page.url()).origin).toBe(frontendUrl);
  await expect(
    page.getByRole('heading', { name: 'Group Member Evaluation Rubric' }),
  ).toBeVisible();
  await expect(page.getByText('Course Information')).toBeVisible();
  await expect(page.getByText(/Course:\s*Staging Smoke Course/)).toBeVisible();
  await expect(
    page.getByText('Evaluate: Staging Smoke Teammate'),
  ).toBeVisible();
  await expect(page.getByText('Communication', { exact: true })).toBeVisible();
  const rating = page.getByRole('radio', {
    name: /Communicated appropriately at all times/,
  });
  await expect(rating).toBeVisible();
  await expect(rating).toBeEnabled();
});
