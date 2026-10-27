const { test, expect } = require('@playwright/test');

test('frontend renders and backend health is reachable through the same origin', async ({
  page,
  request,
}) => {
  const health = await request.get('/api/health');
  expect(health.url()).toBe('http://frontend/api/health');
  expect(health.status()).toBe(200);
  expect((await health.json()).status).toBe('OK');

  await page.goto('/');
  expect(new URL(page.url()).origin).toBe('http://frontend');
  await expect(
    page.getByRole('heading', { name: 'Professor Login' }),
  ).toBeVisible();
  await expect(page.getByLabel('Email:')).toBeVisible();
  await expect(page.getByLabel('Password:')).toBeVisible();
});

test('login form sends a request to the isolated backend', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('Email:')
    .fill('nonexistent-smoke-user@example.invalid');
  await page.getByLabel('Password:').fill('synthetic-invalid-password');

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.origin === 'http://frontend' &&
      url.pathname === '/api/auth/login' &&
      response.request().method() === 'POST'
    );
  });
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  const response = await responsePromise;

  expect(response.url()).toBe('http://frontend/api/auth/login');
  expect(response.request().method()).toBe('POST');
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe('AUTH_ERROR');
  await expect(
    page.getByRole('heading', { name: 'Professor Login' }),
  ).toBeVisible();
});
