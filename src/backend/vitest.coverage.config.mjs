/*
 * This configuration shows how much of the backend application the unit suite
 * exercises, while keeping service-dependent integration checks separate.
 *
 * TLDR: uses the backend directory as root, collects V8 coverage for selected
 * application files, and writes text, HTML, LCOV, and JSON reports to coverage/.
 */
import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: backendRoot,
  // Keep service-dependent checks out of this ordinary coverage run.
  test: {
    environment: 'node',
    exclude: [
      ...configDefaults.exclude,
      'tests/integration/**',
      'tests/**/*.integration.test.js',
    ],
    // Measure application modules and omit tests, scripts, and test-only helpers.
    coverage: {
      provider: 'v8',
      include: [
        'index.js',
        'config/**/*.js',
        'controllers/**/*.js',
        'middleware/**/*.js',
        'models/**/*.js',
        'routes/**/*.js',
        'utils/**/*.js',
      ],
      exclude: [
        '**/tests/**',
        '**/*.test.js',
        'routes/testData.js',
        'migrations/**',
        'scripts/**',
        'debug_student.js',
        'test_api.js',
      ],
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});
