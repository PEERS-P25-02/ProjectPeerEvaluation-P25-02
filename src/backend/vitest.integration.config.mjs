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
