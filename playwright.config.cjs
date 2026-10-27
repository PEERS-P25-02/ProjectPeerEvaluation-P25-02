const { defineConfig, devices } = require('@playwright/test');

// This suite must only target the disposable Compose frontend, never a deployment.
const baseURL = 'http://frontend';
if (process.env.E2E_BASE_URL && process.env.E2E_BASE_URL !== baseURL) {
  throw new Error(`E2E_BASE_URL must be ${baseURL}`);
}

module.exports = defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/helpers/globalSetup.cjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  reporter: 'list',
  outputDir: './test-results/e2e/playwright',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Services are started explicitly with Docker Compose and health-checked
  // before test execution. Avoid accidentally starting a second environment.
});
