/*
 * This file selects the checks that use the running PEERS application, its
 * database, and captured email. It runs test files one at a time so one file's
 * preparation or cleanup does not disturb another file's work.
 *
 * Each check and each preparation or cleanup step has fifteen seconds to finish.
 * This file does not start or remove the test environment; the separate test
 * command handles that work. These checks cover only the behavior their tests
 * describe, rather than every feature of the application.
 *
 * TLDR: selects integration test files in Vitest's Node environment,
 * disables fileParallelism, and sets testTimeout and hookTimeout to 15000 ms.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    environment: 'node',
    // Each stack owns one database and inbox. Resetting cases run sequentially.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
