const { defineConfig, devices } = require('@playwright/test');
const { readStagingSmokeConfig } = require('./tests/staging/config.cjs');

const staging = readStagingSmokeConfig(process.env);

module.exports = defineConfig({
  testDir: './tests/staging',
  testMatch: '**/smoke.spec.cjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: [['./tests/staging/safe-reporter.cjs']],
  outputDir: './test-results/staging/playwright',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: staging.frontendUrl,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: { args: ['--disable-dev-shm-usage'] },
  },
});
